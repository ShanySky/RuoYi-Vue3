<template>
  <el-config-provider :z-index="3100">
    <div class="ai-assistant-host">
    <el-tooltip v-if="mode === 'closed'" content="AI 助手" placement="left">
      <el-button
        data-testid="ai-assistant-open"
        class="ai-fab"
        type="primary"
        circle
        @click="openFloating"
      >
        <el-icon><ChatDotRound /></el-icon>
      </el-button>
    </el-tooltip>

    <section
      v-else
      ref="panelRef"
      data-testid="ai-assistant-panel"
      :class="['ai-panel', mode]"
      :style="panelStyle"
      tabindex="-1"
    >
      <div v-if="mode === 'dock'" class="dock-resizer" @pointerdown="startResize" />

      <header class="panel-header">
        <div class="assistant-brand">
          <div class="assistant-logo"><el-icon><MagicStick /></el-icon></div>
          <div class="brand-copy">
            <div class="brand-title">AI 助手</div>
            <div class="brand-subtitle">
              <span class="status-dot" />
              {{ settingsOpen ? 'AI 配置' : (conversationId ? '当前会话进行中' : '随时可以开始') }}
            </div>
          </div>
        </div>

        <div class="panel-actions">
          <el-tooltip :content="settingsOpen ? '返回聊天' : 'AI 设置'" placement="bottom">
            <el-button
              text
              circle
              size="small"
              data-testid="ai-assistant-settings"
              :aria-label="settingsOpen ? '返回聊天' : 'AI 设置'"
              @click="toggleSettings"
            >
              <el-icon><ChatLineRound v-if="settingsOpen" /><Setting v-else /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip :content="mode === 'dock' ? '切换为小窗' : '展开到右侧'" placement="bottom">
            <el-button
              text
              circle
              size="small"
              data-testid="ai-assistant-toggle-mode"
              :aria-label="mode === 'dock' ? '切换为小窗' : '展开到右侧'"
              @click="toggleMode"
            >
              <el-icon><ScaleToOriginal v-if="mode === 'dock'" /><FullScreen v-else /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="关闭" placement="bottom">
            <el-button text circle size="small" data-testid="ai-assistant-close" aria-label="关闭 AI 助手" @click="closePanel">
              <el-icon><Close /></el-icon>
            </el-button>
          </el-tooltip>
        </div>
      </header>

      <div class="panel-content">
        <quick-settings
          v-if="settingsOpen"
          class="settings-view"
          @updated="handleSettingsUpdated"
        />

        <div v-else class="assistant-body">
          <div class="conversation-bar">
            <div class="conversation-context">
              <span class="context-label">{{ conversationId ? `会话 #${conversationId}` : '新会话' }}</span>
              <span class="context-route" :title="route.path">{{ route.path }}</span>
            </div>
            <div class="conversation-actions">
              <el-popover
                v-if="aiStore.preferences.historyEntryVisible"
                v-model:visible="historyPopoverVisible"
                placement="bottom-end"
                :width="340"
                trigger="click"
                popper-class="ai-history-popover"
                @show="loadHistory"
              >
                <template #reference>
                  <el-button data-testid="ai-assistant-history" aria-label="会话历史" text circle size="small" :disabled="busy">
                    <el-icon><Clock /></el-icon>
                  </el-button>
                </template>
                <div class="history-panel">
                  <div class="history-header">
                    <strong>我的会话</strong>
                    <el-button link size="small" :loading="historyLoading" @click="loadHistory">刷新</el-button>
                  </div>
                  <el-input
                    v-model="historyQuery"
                    size="small"
                    clearable
                    placeholder="搜索会话标题"
                    @keyup.enter="loadHistory"
                    @clear="loadHistory"
                  />
                  <div v-if="historyLoading" class="history-empty">正在加载…</div>
                  <div v-else-if="historyGroups.length === 0" class="history-empty">暂无历史会话</div>
                  <div v-else class="history-groups">
                    <section v-for="group in historyGroups" :key="group.label" class="history-group">
                      <div class="history-group-label">{{ group.label }}</div>
                      <article v-for="item in group.items" :key="item.conversationId" class="history-item" :data-conversation-id="item.conversationId">
                        <button class="history-main" type="button" @click="restoreConversationFromHistory(item.conversationId)">
                          <span class="history-title">{{ item.title || `会话 #${item.conversationId}` }}</span>
                          <span class="history-time">{{ formatHistoryTime(item.updateTime || item.createTime) }}</span>
                        </button>
                        <div class="history-item-actions">
                          <el-button link size="small" @click.stop="renameHistoryConversation(item)">重命名</el-button>
                          <el-button link size="small" type="danger" @click.stop="archiveHistoryConversation(item)">归档</el-button>
                        </div>
                      </article>
                    </section>
                  </div>
                </div>
              </el-popover>
              <el-tooltip content="新建会话" placement="bottom">
                <el-button data-testid="ai-assistant-new-conversation" aria-label="新会话" text circle size="small" :disabled="busy" @click="newConversation">
                  <el-icon><EditPen /></el-icon>
                </el-button>
              </el-tooltip>
            </div>
          </div>
          <div v-if="restoreUndo" class="restore-undo-banner" data-testid="ai-restore-undo">
            <span>已恢复历史会话</span>
            <el-button link size="small" @click="undoRestore">撤销恢复</el-button>
          </div>

          <div ref="messagePane" data-testid="ai-assistant-messages" class="message-pane">
            <div v-if="messages.length === 0" class="empty-state">
              <div class="empty-icon"><el-icon><MagicStick /></el-icon></div>
              <div class="empty-title">有什么可以帮你？</div>
              <div class="empty-description">可以直接聊天，也可以让我操作当前页面支持的功能。</div>
              <div class="empty-hints">
                <span>查询当前页面数据</span>
                <span>打开并填写表单</span>
              </div>
              <el-button link size="small" class="restore-last-button" @click="restoreLastConversation()">
                恢复上次会话
              </el-button>
            </div>

            <template v-for="item in messages" :key="item.id">
              <div v-if="item.role === 'tool'" class="tool-status">
                <el-icon><CircleCheck /></el-icon>
                <span>{{ item.text }}</span>
              </div>

              <div v-else :class="['message-row', item.role]">
                <div v-if="item.role === 'assistant'" class="message-avatar assistant-avatar">
                  <el-icon><MagicStick /></el-icon>
                </div>
                <div class="message-content">
                  <div class="message-label">{{ item.role === 'user' ? '你' : 'AI 助手' }}</div>
                  <div class="message-bubble">
                    <div class="message-text">{{ item.text }}</div>
                  </div>
                </div>
              </div>
            </template>

            <div v-if="pendingConfirmation" class="write-confirm-card" data-testid="ai-write-confirmation">
              <div class="write-confirm-title">需要确认写入操作</div>
              <div class="write-confirm-description">{{ pendingConfirmation.description }}</div>
              <div class="write-confirm-actions">
                <el-button size="small" @click="resolveWriteConfirmation(false)">取消</el-button>
                <el-button size="small" type="warning" @click="resolveWriteConfirmation(true)">确认执行</el-button>
              </div>
            </div>

            <div v-if="busy" class="working-line">
              <div class="message-avatar assistant-avatar"><el-icon><MagicStick /></el-icon></div>
              <div class="working-card">
                <span class="typing-dots"><i></i><i></i><i></i></span>
                <span>{{ workingText }}</span>
              </div>
            </div>
          </div>

          <div class="composer-shell">
            <div v-if="escArmed && busy" class="esc-stop-hint">再按一次 <kbd>Esc</kbd> 停止当前执行</div>
            <el-input
              data-testid="ai-assistant-input"
              v-model="input"
              class="composer-input"
              type="textarea"
              :autosize="{ minRows: mode === 'dock' ? 3 : 2, maxRows: mode === 'dock' ? 7 : 5 }"
              resize="none"
              placeholder="告诉 AI 你想做什么…"
              @keydown="handleComposerKeydown"
            />

            <div class="composer-footer">
              <div class="composer-left">
                <ai-model-picker
                  ref="modelPickerRef"
                  data-testid="ai-assistant-model"
                  v-model="modelId"
                  v-model:reasoning-effort="reasoningEffort"
                  :models="models"
                />
                <el-dropdown trigger="click" @command="setSendShortcut">
                  <button class="shortcut-button" type="button">
                    {{ sendShortcut === 'enter' ? 'Enter 发送' : 'Ctrl+Enter 发送' }}
                  </button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="enter" :disabled="sendShortcut === 'enter'">Enter 发送 · Shift+Enter 换行</el-dropdown-item>
                      <el-dropdown-item command="ctrl-enter" :disabled="sendShortcut === 'ctrl-enter'">Ctrl+Enter 发送 · Enter 换行</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>

              <div class="composer-actions">
                <el-button
                  v-if="busy && input.trim()"
                  data-testid="ai-assistant-steer"
                  text
                  type="primary"
                  size="small"
                  @click="sendMessage"
                >
                  发送补充
                </el-button>
                <el-button
                  data-testid="ai-assistant-send"
                  :type="busy ? 'danger' : 'primary'"
                  size="small"
                  :loading="stopping"
                  :disabled="busy ? stopping : (!input.trim() || !modelId)"
                  @click="busy ? stopCurrentRun() : sendMessage()"
                >
                  {{ busy ? '停止' : '发送' }}
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
    </div>
  </el-config-provider>
</template>

<script setup>
import {
  ChatDotRound, ChatLineRound, CircleCheck, Clock, Close, EditPen, FullScreen,
  MagicStick, ScaleToOriginal, Setting
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AiModelPicker from '@/components/AiModelPicker/index.vue'
import QuickSettings from './QuickSettings.vue'
import {
  archiveAiConversation, cancelAiRun, cancelAiRunByClientKey, createAiConversation,
  getLastAiConversation, renameAiConversation, sendAiTurn
} from '@/api/ai/chat'
import {
  getCurrentPageContext, getCurrentPageRuntime, getFrontendToolDefinitions, invokeFrontendTool
} from '@/ai/toolRegistry'
import useAiStore from '@/store/modules/ai'

const emit = defineEmits(['dock-change'])
const route = useRoute()
const aiStore = useAiStore()
const chatFontSize = computed(() => ({
  small: '12px',
  standard: '13px',
  large: '14px',
  xlarge: '15px'
}[aiStore.preferences.chatFontSize] || '13px'))
const panelStyle = computed(() => ({
  ...(mode.value === 'dock' ? { width: dockWidth.value + 'px' } : {}),
  '--ai-chat-font-size': chatFontSize.value
}))
const mode = ref('closed')
const settingsOpen = ref(false)
const dockWidth = ref(Number(localStorage.getItem('ai-dock-width')) || 560)
const busy = ref(false)
const stopping = ref(false)
const pendingConfirmation = ref(null)
const escArmed = ref(false)
const panelRef = ref(null)
const modelPickerRef = ref(null)
const workingText = ref('AI 正在处理…')
const input = computed({
  get: () => aiStore.draft,
  set: value => aiStore.setDraft(value)
})
const models = computed(() => aiStore.models)
const modelId = computed({
  get: () => aiStore.modelId,
  set: value => { aiStore.modelId = value }
})
const reasoningEffort = computed({
  get: () => aiStore.reasoningEffort,
  set: value => { aiStore.reasoningEffort = value || null }
})
const conversationId = computed({
  get: () => aiStore.conversationId,
  set: value => aiStore.setConversationId(value)
})
const messages = computed(() => aiStore.messages)
const messagePane = ref(null)
const sendShortcut = computed(() => aiStore.preferences.sendShortcut || 'enter')
const historyQuery = ref('')
const historyLoading = ref(false)
const historyPopoverVisible = ref(false)
const restoreUndo = ref(null)
let runGeneration = 0
let activeRunId = null
let activeClientRunKey = null
let activeAbortController = null
let conversationCreationPromise = null
let escArmedAt = 0
let escTimer = null
let restoreUndoTimer = null
let pendingConfirmationResolve = null

function append(role, text) {
  aiStore.append(role, text)
  nextTick(() => {
    if (messagePane.value) messagePane.value.scrollTop = messagePane.value.scrollHeight
  })
}

async function loadModels() {
  try {
    await aiStore.loadModels()
  } catch {
    aiStore.models = []
    aiStore.modelId = undefined
    aiStore.reasoningEffort = null
  }
}

async function openFloating() {
  await loadModels()
  let target = aiStore.preferences.assistantOpenMode || 'last'
  if (target === 'last') target = localStorage.getItem('ai-last-assistant-mode') || 'floating'
  if (target === 'dock' && window.innerWidth < 980) target = 'floating'
  mode.value = target === 'dock' ? 'dock' : 'floating'
}

function closePanel() {
  mode.value = 'closed'
  settingsOpen.value = false
}

function toggleMode() {
  if (mode.value === 'dock') {
    mode.value = 'floating'
    return
  }
  if (window.innerWidth < 980) {
    ElMessage.info('当前窗口较窄，保持小窗模式')
    return
  }
  mode.value = 'dock'
}

function toggleSettings() {
  settingsOpen.value = !settingsOpen.value
}

async function handleSettingsUpdated() {
  await Promise.all([loadModels(), aiStore.loadPreferences()])
}

function clearRestoreUndo() {
  restoreUndo.value = null
  if (restoreUndoTimer) {
    clearTimeout(restoreUndoTimer)
    restoreUndoTimer = null
  }
}

function captureConversationSnapshot() {
  return {
    conversationId: conversationId.value,
    draft: input.value,
    modelId: modelId.value,
    reasoningEffort: reasoningEffort.value,
    messages: messages.value.map(item => ({ ...item }))
  }
}

async function restoreConversationWithUndo(targetConversationId) {
  if (!targetConversationId || targetConversationId === conversationId.value) return
  const previous = captureConversationSnapshot()
  await aiStore.restoreConversation(targetConversationId)
  restoreUndo.value = previous
  if (restoreUndoTimer) clearTimeout(restoreUndoTimer)
  restoreUndoTimer = setTimeout(clearRestoreUndo, 10000)
  historyPopoverVisible.value = false
  nextTick(() => {
    if (messagePane.value) messagePane.value.scrollTop = messagePane.value.scrollHeight
  })
}

async function restoreLastConversation({ silent = false } = {}) {
  try {
    const res = await getLastAiConversation()
    const last = res.data
    if (!last?.conversationId) {
      if (!silent) ElMessage.info('暂无可恢复的历史会话')
      return
    }
    await restoreConversationWithUndo(last.conversationId)
  } catch (error) {
    if (!silent) ElMessage.error(error?.message || '恢复上次会话失败')
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

function parseHistoryDate(value) {
  if (!value) return null
  const date = new Date(String(value).replace(' ', 'T'))
  return Number.isNaN(date.getTime()) ? null : date
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

async function restoreConversationFromHistory(id) {
  await restoreConversationWithUndo(id)
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
  if (item.conversationId === conversationId.value) aiStore.newConversation()
  await loadHistory()
}

function newConversation() {
  clearRestoreUndo()
  aiStore.newConversation()
}

async function setSendShortcut(value) {
  const previous = aiStore.preferences.sendShortcut
  aiStore.preferences.sendShortcut = value
  localStorage.setItem('ai-send-shortcut', value)
  try {
    await aiStore.savePreferences({ sendShortcut: value })
  } catch (error) {
    aiStore.preferences.sendShortcut = previous
    localStorage.setItem('ai-send-shortcut', previous || 'enter')
    ElMessage.error(error?.message || '发送快捷键保存失败')
  }
}

function handleComposerKeydown(event) {
  if (event.key !== 'Enter' || event.isComposing || event.shiftKey) return
  if (sendShortcut.value === 'ctrl-enter') {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault()
      sendMessage()
    }
    return
  }
  if (!event.ctrlKey && !event.metaKey) {
    event.preventDefault()
    sendMessage()
  }
}

async function ensureConversation() {
  if (conversationId.value) return conversationId.value
  if (!conversationCreationPromise) {
    conversationCreationPromise = createAiConversation({
      modelId: modelId.value,
      reasoningEffort: reasoningEffort.value || null,
      route: route.path
    }).then(res => {
      const id = res.data?.conversationId
      if (!id) throw new Error('创建 AI 会话失败')
      conversationId.value = id
      return id
    }).finally(() => {
      conversationCreationPromise = null
    })
  }
  return await conversationCreationPromise
}

function createClientRunKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `run-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function isAbortError(error) {
  return error?.name === 'AbortError'
    || error?.name === 'CanceledError'
    || error?.code === 'ERR_CANCELED'
    || /canceled|cancelled|aborted/i.test(String(error?.message || ''))
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function cancelByClientKeyWithRetry(clientRunKey, reason) {
  let lastError
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      return await cancelAiRunByClientKey(clientRunKey, reason)
    } catch (error) {
      lastError = error
      await delay(80 + attempt * 40)
    }
  }
  throw lastError
}

function requestWriteConfirmation(call) {
  cancelPendingConfirmation()
  pendingConfirmation.value = {
    callId: call.callId,
    description: call.description || call.name,
    riskLevel: call.riskLevel
  }
  return new Promise(resolve => {
    pendingConfirmationResolve = resolve
  })
}

function resolveWriteConfirmation(confirmed) {
  const resolve = pendingConfirmationResolve
  pendingConfirmationResolve = null
  pendingConfirmation.value = null
  if (resolve) resolve(!!confirmed)
}

function cancelPendingConfirmation() {
  if (!pendingConfirmationResolve && !pendingConfirmation.value) return
  resolveWriteConfirmation(false)
}

async function sendMessage() {
  const text = input.value.trim()
  if (!text) return
  clearRestoreUndo()
  if (!modelId.value) {
    ElMessage.warning('请先配置并选择一个已启用模型')
    return
  }

  const steering = busy.value
  if (steering) cancelPendingConfirmation()
  try {
    await ensureConversation()
  } catch (error) {
    ElMessage.error(error?.message || '创建 AI 会话失败')
    return
  }

  input.value = ''
  append('user', text)
  if (steering) {
    append('tool', '已收到补充指令：旧规划将在安全边界停止，并按最新要求继续')
  }

  const generation = ++runGeneration
  activeAbortController?.abort()
  const controller = new AbortController()
  activeAbortController = controller
  activeRunId = null
  activeClientRunKey = createClientRunKey()
  const clientRunKey = activeClientRunKey
  aiStore.setLiveRun(null, clientRunKey, 'RUNNING')

  resetEscArmed()
  busy.value = true
  stopping.value = false
  workingText.value = steering ? '正在根据最新补充重新规划…' : 'AI 正在理解你的请求…'

  try {
    await driveTurn({ userMessage: text, clientRunKey }, generation, controller.signal)
  } catch (error) {
    if (generation !== runGeneration || isAbortError(error)) return
    append('assistant', `执行失败：${error?.message || error}`)
  } finally {
    if (generation === runGeneration) {
      busy.value = false
      stopping.value = false
      activeAbortController = null
      activeRunId = null
      activeClientRunKey = null
      aiStore.setLiveRun(null, null)
      resetEscArmed()
      workingText.value = 'AI 正在处理…'
    }
  }
}

async function stopCurrentRun(reason = 'USER_STOP') {
  if (!busy.value || stopping.value) return

  const runId = activeRunId
  const clientRunKey = activeClientRunKey
  ++runGeneration
  stopping.value = true
  busy.value = false
  cancelPendingConfirmation()
  resetEscArmed()
  activeAbortController?.abort()
  activeAbortController = null

  try {
    if (runId) {
      await cancelAiRun(runId, reason)
    } else if (clientRunKey) {
      await cancelByClientKeyWithRetry(clientRunKey, reason)
    }
    append('tool', reason === 'DOUBLE_ESC' ? '已通过双击 Esc 停止当前 AI 执行' : '当前 AI 执行已停止')
  } catch (error) {
    append('tool', '停止请求未得到后端确认；前端已丢弃旧响应，不会继续执行页面操作')
    console.warn('AI run cancel failed', error)
  } finally {
    stopping.value = false
    activeRunId = null
    activeClientRunKey = null
    aiStore.setLiveRun(null, null)
    workingText.value = 'AI 正在处理…'
  }
}

function buildRequest(extra) {
  const runtime = getCurrentPageRuntime()
  const payload = {
    conversationId: conversationId.value,
    route: runtime.route || route.path,
    pageInstanceId: runtime.pageInstanceId || null,
    pageVersion: runtime.pageVersion || null,
    pageContext: getCurrentPageContext(),
    frontendTools: getFrontendToolDefinitions(),
    ...extra
  }
  if (extra?.userMessage != null) {
    payload.modelId = modelId.value
    payload.reasoningEffort = reasoningEffort.value || null
  }
  return payload
}

async function driveTurn(extra, generation, signal) {
  const clientRunKey = extra?.clientRunKey || activeClientRunKey
  let payload = buildRequest(extra)
  for (let i = 0; i < 16; i++) {
    const res = await sendAiTurn(payload, { signal })
    if (generation !== runGeneration) return

    const data = res.data || {}
    if (data.conversationId) conversationId.value = data.conversationId
    if (data.runId) {
      activeRunId = data.runId
      aiStore.setLiveRun(data.runId, clientRunKey, data.type === 'TOOL_CALL' ? 'WAITING_TOOL' : 'RUNNING')
    }

    if (data.type === 'RUN_STATE') {
      return
    }
    if (data.type === 'MESSAGE') {
      append('assistant', data.message || '')
      return
    }
    if (data.type !== 'TOOL_CALL' || !data.toolCall) {
      throw new Error('AI 返回了无法识别的状态')
    }

    const call = data.toolCall
    workingText.value = `准备执行：${call.description || call.name}`
    let success = true
    let result = null
    let error = null
    try {
      if (call.riskLevel === 'WRITE' || call.riskLevel === 'DANGEROUS_WRITE') {
        const confirmed = await requestWriteConfirmation(call)
        if (generation !== runGeneration) return
        if (!confirmed) throw 'cancel'
      }
      if (generation !== runGeneration) return
      const args = call.arguments ? JSON.parse(call.arguments) : {}
      result = await invokeFrontendTool(call.name, args, {
        route: payload.route,
        pageInstanceId: payload.pageInstanceId,
        pageVersion: payload.pageVersion
      })
      if (generation !== runGeneration) return
      append('tool', `${call.description || call.name}：已执行`)
    } catch (e) {
      if (generation !== runGeneration) return
      success = false
      error = e === 'cancel' || e === 'close' ? '用户取消了操作' : (e?.message || String(e))
      append('tool', `${call.description || call.name}：${error}`)
    }

    if (generation !== runGeneration) return
    workingText.value = 'AI 正在读取页面执行结果…'
    payload = buildRequest({ toolResult: { callId: call.callId, success, result, error } })
  }
  throw new Error('本轮页面工具调用次数超过限制')
}

function isVisibleElement(element) {
  if (!element) return false
  const style = getComputedStyle(element)
  const rect = element.getBoundingClientRect()
  return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
}

function hasVisibleAiOverlay() {
  const selectors = ['.ai-model-picker-popper', '.el-select-dropdown', '.ai-remote-model-dialog', '.el-message-box']
  return selectors.some(selector => [...document.querySelectorAll(selector)].some(isVisibleElement))
}

function resetEscArmed() {
  escArmed.value = false
  escArmedAt = 0
  if (escTimer) {
    clearTimeout(escTimer)
    escTimer = null
  }
}

function isAiFocusActive() {
  const active = document.activeElement
  if (panelRef.value?.contains(active)) return true
  if (!(active instanceof Element)) return false
  return !!active.closest('.ai-model-picker-popper, .ai-remote-model-dialog, .el-message-box, .el-select-dropdown')
}

function handleGlobalKeydown(event) {
  if (event.key !== 'Escape' || event.isComposing || !busy.value || !aiStore.preferences.doubleEscEnabled) return
  if (!isAiFocusActive()) return

  // A manually-controlled model popover does not close itself on Escape, so close it explicitly.
  // This Escape is intentionally not counted as the first stop gesture.
  if (modelPickerRef.value?.closeIfOpen?.()) {
    event.preventDefault()
    event.stopPropagation()
    resetEscArmed()
    return
  }

  // Other Element Plus overlays may close themselves later in the same Escape event.
  // Clear the stop sequence and let the event continue to the owning overlay.
  if (hasVisibleAiOverlay()) {
    resetEscArmed()
    return
  }

  const now = Date.now()
  if (escArmed.value && now - escArmedAt <= 700) {
    event.preventDefault()
    resetEscArmed()
    void stopCurrentRun('DOUBLE_ESC')
    return
  }

  escArmed.value = true
  escArmedAt = now
  escTimer = setTimeout(resetEscArmed, 720)
}

function emitDockState() {
  emit('dock-change', { open: mode.value === 'dock', width: dockWidth.value })
}

function startResize(event) {
  if (mode.value !== 'dock') return
  event.preventDefault()
  const startX = event.clientX
  const startWidth = dockWidth.value

  const move = e => {
    const maxWidth = Math.min(760, window.innerWidth - 420)
    dockWidth.value = Math.max(440, Math.min(maxWidth, startWidth + startX - e.clientX))
    localStorage.setItem('ai-dock-width', String(dockWidth.value))
    emitDockState()
  }
  const stop = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', stop)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', stop)
}

watch([mode, dockWidth], emitDockState, { immediate: true })
watch(mode, value => {
  if (value === 'floating' || value === 'dock') localStorage.setItem('ai-last-assistant-mode', value)
})
onMounted(async () => {
  window.addEventListener('keydown', handleGlobalKeydown, true)
  const hadSessionConversation = !!aiStore.conversationId
  await aiStore.initialize()
  if (!hadSessionConversation && !aiStore.conversationId && aiStore.preferences.autoRestoreLastConversation) {
    await restoreLastConversation({ silent: true })
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeydown, true)
  resetEscArmed()
  clearRestoreUndo()
  cancelPendingConfirmation()
  activeAbortController?.abort()
})
</script>

<style scoped>
.ai-fab {
  position: fixed;
  right: 24px;
  bottom: 28px;
  z-index: 3000;
  width: 44px;
  height: 44px;
  font-size: 19px;
  box-shadow: 0 5px 16px color-mix(in srgb, var(--el-color-primary) 28%, transparent);
}

.ai-panel {
  position: fixed;
  z-index: 3000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  box-shadow: var(--el-box-shadow-light);
}

.ai-panel.floating {
  right: 20px;
  bottom: 20px;
  width: min(420px, calc(100vw - 32px));
  height: min(620px, calc(100vh - 46px));
  border-radius: 10px;
}

.ai-panel.dock {
  top: 0;
  right: 0;
  bottom: 0;
  height: 100vh;
  border-top: 0;
  border-right: 0;
  border-bottom: 0;
  box-shadow: -4px 0 16px rgba(0, 0, 0, .06);
}

.dock-resizer {
  position: absolute;
  top: 0;
  bottom: 0;
  left: -3px;
  z-index: 3;
  width: 7px;
  cursor: col-resize;
}
.dock-resizer::after {
  position: absolute;
  top: 42%;
  left: 3px;
  width: 1px;
  height: 52px;
  background: var(--el-border-color);
  content: "";
  opacity: 0;
  transition: opacity .15s ease;
}
.dock-resizer:hover::after { opacity: 1; }

.panel-header {
  height: 54px;
  flex: 0 0 54px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 9px 0 14px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.assistant-brand { display: flex; align-items: center; min-width: 0; gap: 9px; }
.assistant-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 31px;
  height: 31px;
  flex: 0 0 31px;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-radius: 8px;
  font-size: 16px;
}
.brand-copy { min-width: 0; }
.brand-title { color: var(--el-text-color-primary); font-size: 14px; font-weight: 600; line-height: 1.3; }
.brand-subtitle { display: flex; align-items: center; gap: 5px; margin-top: 2px; color: var(--el-text-color-secondary); font-size: 10px; }
.status-dot { width: 6px; height: 6px; flex: 0 0 6px; border-radius: 50%; background: var(--el-color-success); }
.panel-actions { display: flex; align-items: center; gap: 1px; }
.panel-actions :deep(.el-button) { color: var(--el-text-color-secondary); }
.panel-actions :deep(.el-button:hover) { color: var(--el-color-primary); background: var(--el-fill-color-light); }

.panel-content { flex: 1; min-height: 0; padding: 0; }
.settings-view { height: 100%; padding: 12px 10px 10px; }
.assistant-body { height: 100%; min-height: 0; display: flex; flex-direction: column; }

.conversation-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 38px;
  padding: 4px 10px 4px 14px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.conversation-context { display: flex; min-width: 0; align-items: center; gap: 8px; }
.conversation-actions { display: flex; align-items: center; gap: 2px; flex-shrink: 0; }
.restore-undo-banner {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 6px 12px; border-bottom: 1px solid var(--el-border-color-lighter);
  background: var(--el-color-primary-light-9); color: var(--el-text-color-regular); font-size: 11px;
}
.restore-last-button { margin-top: 8px; }
:global(.ai-history-popover) { padding: 10px !important; }
.history-panel { display: flex; flex-direction: column; gap: 8px; }
.history-header { display: flex; align-items: center; justify-content: space-between; }
.history-groups { max-height: 350px; overflow: auto; }
.history-group + .history-group { margin-top: 9px; }
.history-group-label { margin-bottom: 4px; color: var(--el-text-color-secondary); font-size: 10px; }
.history-item { padding: 6px 0; border-top: 1px solid var(--el-border-color-lighter); }
.history-main { width: 100%; border: 0; padding: 0; background: transparent; text-align: left; cursor: pointer; }
.history-title { display: block; overflow: hidden; color: var(--el-text-color-primary); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.history-time { display: block; margin-top: 2px; color: var(--el-text-color-secondary); font-size: 10px; }
.history-item-actions { display: flex; justify-content: flex-end; gap: 4px; margin-top: 2px; }
.history-empty { padding: 20px 4px; text-align: center; color: var(--el-text-color-secondary); font-size: 11px; }
.context-label { flex: 0 0 auto; color: var(--el-text-color-secondary); font-size: 11px; }
.context-route {
  overflow: hidden;
  color: var(--el-text-color-placeholder);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.message-pane {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 13px 10px;
  background: var(--el-bg-color-page);
  scroll-behavior: smooth;
}

.empty-state {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 28px 20px 54px;
  text-align: center;
}
.empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-radius: 12px;
  font-size: 22px;
}
.empty-title { margin-top: 13px; color: var(--el-text-color-primary); font-size: 15px; font-weight: 600; }
.empty-description { max-width: 280px; margin-top: 6px; color: var(--el-text-color-secondary); font-size: 12px; line-height: 1.65; }
.empty-hints { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; margin-top: 13px; }
.empty-hints span {
  padding: 4px 8px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 5px;
  font-size: 10px;
}

.message-row { display: flex; align-items: flex-start; gap: 8px; margin: 0 0 15px; }
.message-row.user { justify-content: flex-end; }
.message-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 27px;
  height: 27px;
  flex: 0 0 27px;
  border-radius: 7px;
  font-size: 13px;
}
.assistant-avatar { color: var(--el-color-primary); background: var(--el-color-primary-light-9); }
.message-content { max-width: 86%; min-width: 0; }
.message-row.user .message-content { display: flex; flex-direction: column; align-items: flex-end; }
.message-label { margin: 0 2px 4px; color: var(--el-text-color-placeholder); font-size: 9px; }
.message-bubble {
  padding: 9px 11px;
  color: var(--el-text-color-primary);
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 7px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, .025);
  word-break: break-word;
}
.message-row.user .message-bubble {
  color: var(--el-text-color-primary);
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-8);
}
.message-text { white-space: pre-wrap; font-size: var(--ai-chat-font-size, 13px); line-height: 1.65; }

.tool-status {
  display: flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  max-width: 90%;
  margin: -5px 0 12px 35px;
  padding: 5px 8px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-light);
  border-radius: 5px;
  font-size: calc(var(--ai-chat-font-size, 13px) - 3px);
}
.tool-status .el-icon { color: var(--el-color-success); }

.write-confirm-card {
  margin: 0 0 12px 35px;
  padding: 10px 11px;
  color: var(--el-text-color-primary);
  background: var(--el-color-warning-light-9);
  border: 1px solid var(--el-color-warning-light-7);
  border-radius: 7px;
}
.write-confirm-title { color: var(--el-color-warning-dark-2); font-size: 12px; font-weight: 600; }
.write-confirm-description { margin-top: 4px; font-size: var(--ai-chat-font-size, 13px); line-height: 1.55; }
.write-confirm-actions { display: flex; justify-content: flex-end; gap: 5px; margin-top: 8px; }
.write-confirm-actions :deep(.el-button + .el-button) { margin-left: 0; }

.working-line { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
.working-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  color: var(--el-text-color-secondary);
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 7px;
  font-size: calc(var(--ai-chat-font-size, 13px) - 2px);
}
.typing-dots { display: inline-flex; gap: 3px; }
.typing-dots i { width: 4px; height: 4px; border-radius: 50%; background: var(--el-text-color-placeholder); animation: ai-dot 1.2s infinite ease-in-out; }
.typing-dots i:nth-child(2) { animation-delay: .15s; }
.typing-dots i:nth-child(3) { animation-delay: .3s; }
@keyframes ai-dot { 0%, 60%, 100% { opacity: .35; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-2px); } }

.composer-shell {
  flex: 0 0 auto;
  margin: 9px 10px 10px;
  padding: 7px 8px 7px 10px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 9px;
  transition: border-color .15s ease, box-shadow .15s ease;
}
.composer-shell:focus-within {
  border-color: var(--el-color-primary-light-5);
  box-shadow: 0 0 0 2px var(--el-color-primary-light-9);
}
.composer-input :deep(.el-textarea__inner) {
  min-height: 48px !important;
  padding: 5px 2px 7px;
  background: transparent;
  border: 0;
  box-shadow: none;
  font-size: var(--ai-chat-font-size, 13px);
  line-height: 1.6;
}
.esc-stop-hint {
  margin: 0 0 5px;
  color: var(--el-color-warning);
  font-size: 10px;
  line-height: 1.5;
}
.esc-stop-hint kbd {
  padding: 1px 4px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color);
  border-bottom-width: 2px;
  border-radius: 3px;
  font-size: 9px;
}
.composer-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 30px; }
.composer-left { display: flex; min-width: 0; align-items: center; gap: 4px; }
.composer-actions { display: flex; align-items: center; gap: 4px; }
.composer-actions :deep(.el-button + .el-button) { margin-left: 0; }
.shortcut-button {
  border: 0;
  background: transparent;
  color: var(--el-text-color-placeholder);
  cursor: pointer;
  font-size: 9px;
  padding: 4px 5px;
}
.shortcut-button:hover { color: var(--el-text-color-secondary); }

@media (max-width: 640px) {
  .ai-panel.floating {
    right: 8px;
    bottom: 8px;
    width: calc(100vw - 16px);
    height: calc(100vh - 16px);
  }
  .empty-hints { display: none; }
}
</style>
