import { getAiPreferences, saveAiPreferences } from '@/api/ai/preferences'
import { cancelAiRun, cancelAiRunByClientKey, cancelAllAiRuns, getAiConversation, listAiConversations } from '@/api/ai/chat'
import { listEnabledAiModels } from '@/api/ai/config'

const ACTIVE_KEY = 'ruoyi-ai-active-conversation'
const DRAFT_KEY = 'ruoyi-ai-draft'

function sessionGet(key) {
  try { return sessionStorage.getItem(key) } catch { return null }
}

function sessionSet(key, value) {
  try {
    if (value == null || value === '') sessionStorage.removeItem(key)
    else sessionStorage.setItem(key, String(value))
  } catch {}
}

function normalizeMessages(items = []) {
  return items.flatMap(item => {
    if (item.role === 'USER') return [{ id: `db-${item.messageId}`, role: 'user', text: item.content || '' }]
    if (item.role === 'ASSISTANT' && item.content) return [{ id: `db-${item.messageId}`, role: 'assistant', text: item.content }]
    if (item.role === 'TOOL') {
      let text = item.toolName || '页面操作'
      try {
        const payload = JSON.parse(item.content || '{}')
        text += payload.success === false ? `：${payload.error || '执行失败'}` : '：已执行'
      } catch {
        text += '：已执行'
      }
      return [{ id: `db-${item.messageId}`, role: 'tool', text }]
    }
    return []
  })
}

const useAiStore = defineStore('ai-assistant', {
  state: () => ({
    preferencesLoaded: false,
    preferences: {
      defaultModelId: null,
      defaultReasoningEffort: null,
      chatFontSize: 'standard',
      sendShortcut: 'enter',
      doubleEscEnabled: true,
      historyEntryVisible: false,
      autoRestoreLastConversation: false,
      assistantOpenMode: 'last'
    },
    models: [],
    modelId: undefined,
    reasoningEffort: null,
    conversationId: Number(sessionGet(ACTIVE_KEY)) || undefined,
    messages: [],
    activeRun: null,
    liveClientRunKey: null,
    pendingTools: [],
    checkpoint: null,
    draft: sessionGet(DRAFT_KEY) || '',
    history: [],
    restoring: false,
    modelFallbackNotice: null,
    lifecycleEpoch: 0,
    messageSeq: 0
  }),
  getters: {
    activeModel(state) {
      return state.models.find(item => item.modelId === state.modelId)
    }
  },
  actions: {
    async initialize() {
      await this.loadPreferences()
      await this.loadModels()
      if (this.conversationId) {
        await this.restoreConversation(this.conversationId, { silent: true, safeAfterReload: true }).catch(() => {
          this.newConversation()
        })
      }
    },
    async loadPreferences() {
      const res = await getAiPreferences()
      this.preferences = { ...this.preferences, ...(res.data || {}) }
      this.preferencesLoaded = true
      return this.preferences
    },
    async savePreferences(patch) {
      const previous = { ...this.preferences }
      const optimistic = { ...this.preferences, ...patch }
      this.preferences = optimistic
      try {
        const res = await saveAiPreferences(optimistic)
        this.preferences = { ...optimistic, ...(res.data || {}) }
        return this.preferences
      } catch (error) {
        const patchStillCurrent = Object.entries(patch || {}).every(([key, value]) => this.preferences?.[key] === value)
        if (patchStillCurrent) this.preferences = previous
        throw error
      }
    },
    async loadModels() {
      const res = await listEnabledAiModels()
      this.models = res.data || []
      const valid = this.models.find(item => item.modelId === this.modelId)
      if (!valid) {
        const preferredId = this.preferences?.defaultModelId
        const preferredModel = this.models.find(item => item.modelId === preferredId)
        const preferred = preferredModel
          || this.models.find(item => item.defaultModel === '0')
          || this.models[0]
        this.modelId = preferred?.modelId
        this.reasoningEffort = preferredModel
          ? (this.preferences.defaultReasoningEffort || preferred?.defaultReasoningEffort || null)
          : (preferred?.defaultReasoningEffort || null)
        if (preferredId && !preferredModel && preferred?.modelId) {
          this.modelFallbackNotice = {
            source: 'preference',
            requestedModelId: preferredId,
            actualModelId: preferred.modelId
          }
        }
      }
    },
    consumeModelFallbackNotice() {
      const notice = this.modelFallbackNotice
      this.modelFallbackNotice = null
      return notice
    },
    setDraft(value) {
      this.draft = value || ''
      sessionSet(DRAFT_KEY, this.draft)
    },
    setConversationId(value) {
      this.conversationId = value || undefined
      sessionSet(ACTIVE_KEY, this.conversationId)
    },
    setSelection(modelId, reasoningEffort) {
      this.modelId = modelId
      this.reasoningEffort = reasoningEffort || null
    },
    setLiveRun(runId, clientRunKey = this.liveClientRunKey, status = 'RUNNING') {
      this.liveClientRunKey = clientRunKey || null
      this.activeRun = runId ? { ...(this.activeRun || {}), runId, status } : null
    },
    append(role, text) {
      this.messages.push({ id: `local-${++this.messageSeq}`, role, text: String(text ?? '') })
    },
    newConversation() {
      this.setConversationId(undefined)
      this.setDraft('')
      this.messages = []
      this.activeRun = null
      this.liveClientRunKey = null
      this.pendingTools = []
      this.checkpoint = null
      const preferredId = this.preferences?.defaultModelId
      const preferred = this.models.find(item => item.modelId === preferredId)
        || this.models.find(item => item.defaultModel === '0')
        || this.models[0]
      this.modelId = preferred?.modelId
      this.reasoningEffort = preferred?.modelId === preferredId
        ? (this.preferences.defaultReasoningEffort || preferred?.defaultReasoningEffort || null)
        : (preferred?.defaultReasoningEffort || null)
    },
    async restoreConversation(conversationId, { silent = false, safeAfterReload = false } = {}) {
      this.restoring = true
      try {
        const res = await getAiConversation(conversationId)
        const data = res.data || {}
        const conversation = data.conversation
        if (!conversation?.conversationId) throw new Error('会话不存在')
        this.setConversationId(conversation.conversationId)
        this.messages = normalizeMessages(data.messages || [])
        this.activeRun = data.activeRun || null
        this.pendingTools = data.pendingTools || []
        this.checkpoint = data.checkpoint || null
        const restoredModel = this.models.find(item => item.modelId === conversation.modelId)
        if (restoredModel) {
          this.modelId = restoredModel.modelId
          this.reasoningEffort = conversation.reasoningEffort || restoredModel.defaultReasoningEffort || null
        } else if (conversation.modelId && this.modelId) {
          this.modelFallbackNotice = {
            source: 'conversation',
            requestedModelId: conversation.modelId,
            actualModelId: this.modelId
          }
        }

        const activeStatus = String(this.activeRun?.status || '')
        if (safeAfterReload && this.activeRun?.runId && ['RUNNING', 'WAITING_TOOL', 'COMPACTING', 'CANCEL_REQUESTED'].includes(activeStatus)) {
          try {
            await cancelAiRun(this.activeRun.runId, 'CLIENT_RELOAD')
            this.activeRun = null
            this.pendingTools = []
            this.append('tool', '页面刷新后已安全终止上次未完成执行，可继续当前会话。')
          } catch (error) {
            if (!silent) throw error
          }
        }
        return data
      } finally {
        this.restoring = false
      }
    },
    async prepareLogout() {
      this.lifecycleEpoch += 1
      try {
        await cancelAllAiRuns('USER_LOGOUT')
      } catch (error) {
        console.warn('AI active runs cancel before logout failed', error)
        try {
          if (this.activeRun?.runId) {
            await cancelAiRun(this.activeRun.runId, 'USER_LOGOUT')
          } else if (this.liveClientRunKey) {
            await cancelAiRunByClientKey(this.liveClientRunKey, 'USER_LOGOUT')
          }
        } catch {}
      } finally {
        this.setConversationId(undefined)
        this.setDraft('')
        this.messages = []
        this.activeRun = null
        this.liveClientRunKey = null
        this.pendingTools = []
        this.checkpoint = null
        this.history = []
        this.models = []
        this.modelFallbackNotice = null
        this.modelId = undefined
        this.reasoningEffort = null
        this.preferencesLoaded = false
        this.preferences = {
          defaultModelId: null,
          defaultReasoningEffort: null,
          chatFontSize: 'standard',
          sendShortcut: 'enter',
          doubleEscEnabled: true,
          historyEntryVisible: false,
          autoRestoreLastConversation: false,
          assistantOpenMode: 'last'
        }
      }
    },
    async loadHistory(keyword = '') {
      const res = await listAiConversations(keyword)
      this.history = res.data || []
      return this.history
    }
  }
})

export default useAiStore
