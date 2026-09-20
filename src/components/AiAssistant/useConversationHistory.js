import { computed, nextTick, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  archiveAiConversation,
  getLastAiConversation,
  renameAiConversation
} from '@/api/ai/chat'

function parseHistoryDate(value) {
  if (!value) return null
  const date = new Date(String(value).replace(' ', 'T'))
  return Number.isNaN(date.getTime()) ? null : date
}

export function useConversationHistory(aiStore, { scrollToBottom } = {}) {
  const historyQuery = ref('')
  const historyLoading = ref(false)
  const historyPopoverVisible = ref(false)
  const restoreUndo = ref(null)
  let restoreUndoTimer = null

  function clearRestoreUndo() {
    restoreUndo.value = null
    if (restoreUndoTimer) {
      clearTimeout(restoreUndoTimer)
      restoreUndoTimer = null
    }
  }

  function captureConversationSnapshot() {
    return {
      conversationId: aiStore.conversationId,
      draft: aiStore.draft,
      modelId: aiStore.modelId,
      reasoningEffort: aiStore.reasoningEffort,
      messages: aiStore.messages.map(item => ({ ...item }))
    }
  }

  async function continueConversationWithUndo(targetConversationId) {
    if (!targetConversationId || targetConversationId === aiStore.conversationId) return
    const previous = captureConversationSnapshot()
    await aiStore.restoreConversation(targetConversationId)
    restoreUndo.value = previous
    if (restoreUndoTimer) clearTimeout(restoreUndoTimer)
    restoreUndoTimer = setTimeout(clearRestoreUndo, 10000)
    historyPopoverVisible.value = false
    await nextTick()
    scrollToBottom?.()
  }

  async function continueLastConversation({ silent = false } = {}) {
    try {
      const res = await getLastAiConversation()
      const last = res.data
      if (!last?.conversationId) {
        if (!silent) ElMessage.info('暂无可继续的历史会话')
        return
      }
      await continueConversationWithUndo(last.conversationId)
    } catch (error) {
      if (!silent) ElMessage.error(error?.message || '继续上次会话失败')
    }
  }

  async function undoRestore() {
    const snapshot = restoreUndo.value
    if (!snapshot) return
    clearRestoreUndo()
    if (snapshot.conversationId) {
      await aiStore.restoreConversation(snapshot.conversationId)
      aiStore.setDraft(snapshot.draft)
      return
    }
    aiStore.newConversation()
    aiStore.messages = snapshot.messages || []
    aiStore.modelId = snapshot.modelId
    aiStore.reasoningEffort = snapshot.reasoningEffort || null
    aiStore.setDraft(snapshot.draft)
  }

  async function loadHistory() {
    historyLoading.value = true
    try {
      await aiStore.loadHistory(historyQuery.value)
    } finally {
      historyLoading.value = false
    }
  }

  function formatHistoryTime(value) {
    const date = parseHistoryDate(value)
    if (!date) return ''
    return date.toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  const historyGroups = computed(() => {
    const today = new Date()
    const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
    const startYesterday = startToday - 86400000
    const groups = new Map()
    for (const item of aiStore.history || []) {
      const date = parseHistoryDate(item.updateTime || item.createTime)
      const time = date?.getTime() || 0
      const label = time >= startToday ? '今天' : (time >= startYesterday ? '昨天' : (date ? date.toLocaleDateString() : '更早'))
      if (!groups.has(label)) groups.set(label, [])
      groups.get(label).push(item)
    }
    return [...groups.entries()].map(([label, items]) => ({ label, items }))
  })

  async function continueConversationFromHistory(id) {
    await continueConversationWithUndo(id)
  }

  async function renameHistoryConversation(item) {
    const { value } = await ElMessageBox.prompt('请输入新的会话标题', '重命名会话', {
      inputValue: item.title || '',
      confirmButtonText: '保存',
      cancelButtonText: '取消',
      inputValidator: value => !!String(value || '').trim() || '标题不能为空'
    })
    await renameAiConversation(item.conversationId, String(value).trim())
    await loadHistory()
  }

  async function archiveHistoryConversation(item) {
    await ElMessageBox.confirm('归档后仍保留历史数据，可由系统策略后续清理。确认归档？', '归档会话', {
      confirmButtonText: '归档',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await archiveAiConversation(item.conversationId)
    if (item.conversationId === aiStore.conversationId) aiStore.newConversation()
    await loadHistory()
  }

  function newConversation() {
    clearRestoreUndo()
    aiStore.newConversation()
  }

  function disposeConversationHistory() {
    clearRestoreUndo()
  }

  return {
    historyQuery,
    historyLoading,
    historyPopoverVisible,
    restoreUndo,
    historyGroups,
    clearRestoreUndo,
    continueLastConversation,
    undoRestore,
    loadHistory,
    formatHistoryTime,
    continueConversationFromHistory,
    renameHistoryConversation,
    archiveHistoryConversation,
    newConversation,
    disposeConversationHistory
  }
}
