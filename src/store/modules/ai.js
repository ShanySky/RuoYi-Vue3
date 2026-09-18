import { getAiPreferences, saveAiPreferences } from '@/api/ai/preferences'
import { getAiConversation, listAiConversations } from '@/api/ai/chat'
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
    pendingTools: [],
    checkpoint: null,
    draft: sessionGet(DRAFT_KEY) || '',
    history: [],
    restoring: false,
    messageSeq: 0
  }),
  getters: {
    activeModel(state) {
      return state.models.find(item => item.modelId === state.modelId)
    }
  },
  actions: {
    async initialize() {
      await Promise.all([this.loadPreferences(), this.loadModels()])
      if (this.conversationId) {
        await this.restoreConversation(this.conversationId, { silent: true }).catch(() => {
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
      const res = await saveAiPreferences({ ...this.preferences, ...patch })
      this.preferences = { ...this.preferences, ...(res.data || {}) }
      return this.preferences
    },
    async loadModels() {
      const res = await listEnabledAiModels()
      this.models = res.data || []
      const valid = this.models.find(item => item.modelId === this.modelId)
      if (!valid) {
        const preferredId = this.preferences?.defaultModelId
        const preferred = this.models.find(item => item.modelId === preferredId)
          || this.models.find(item => item.defaultModel === '0')
          || this.models[0]
        this.modelId = preferred?.modelId
        this.reasoningEffort = preferred?.modelId === preferredId
          ? (this.preferences.defaultReasoningEffort || preferred?.defaultReasoningEffort || null)
          : (preferred?.defaultReasoningEffort || null)
      }
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
    append(role, text) {
      this.messages.push({ id: `local-${++this.messageSeq}`, role, text: String(text ?? '') })
    },
    newConversation() {
      this.setConversationId(undefined)
      this.messages = []
      this.activeRun = null
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
    async restoreConversation(conversationId, { silent = false } = {}) {
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
        this.modelId = conversation.modelId || this.modelId
        this.reasoningEffort = conversation.reasoningEffort || null
        return data
      } finally {
        this.restoring = false
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
