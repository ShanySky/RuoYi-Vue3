<template>
  <div class="ai-assistant-host">
    <el-button
      v-if="mode === 'closed'"
      data-testid="ai-assistant-open"
      class="ai-fab"
      type="primary"
      circle
      size="large"
      title="AI 助手"
      @click="openFloating"
    >
      <el-icon><ChatDotRound /></el-icon>
    </el-button>

    <section
      v-else
      data-testid="ai-assistant-panel"
      :class="['ai-panel', mode]"
      :style="mode === 'dock' ? { width: dockWidth + 'px' } : undefined"
    >
      <div v-if="mode === 'dock'" class="dock-resizer" @pointerdown="startResize" />

      <header class="panel-header">
        <div class="panel-title">
          <span class="status-dot" />
          <span>AI 助手</span>
        </div>
        <div class="panel-actions">
          <el-button text size="small" data-testid="ai-assistant-settings" @click="toggleSettings">
            {{ settingsOpen ? '聊天' : '设置' }}
          </el-button>
          <el-button text size="small" data-testid="ai-assistant-toggle-mode" @click="toggleMode">
            {{ mode === 'dock' ? '小窗' : '展开' }}
          </el-button>
          <el-button text size="small" data-testid="ai-assistant-close" @click="closePanel">关闭</el-button>
        </div>
      </header>

      <div class="panel-content">
        <quick-settings
          v-if="settingsOpen"
          ref="quickSettingsRef"
          class="settings-view"
          @updated="handleSettingsUpdated"
        />

        <div v-else class="assistant-body">
          <div class="assistant-toolbar">
            <span class="conversation-tip">
              {{ conversationId ? `会话 #${conversationId}` : '新会话' }}
            </span>
            <el-button text size="small" :disabled="busy" @click="newConversation">新会话</el-button>
          </div>

          <div ref="messagePane" data-testid="ai-assistant-messages" class="message-pane">
            <div v-if="messages.length === 0" class="empty-tip">
              可以直接聊天，也可以让我操作当前支持 AI 工具的页面。
            </div>
            <div v-for="item in messages" :key="item.id" :class="['message-row', item.role]">
              <div class="message-bubble">
                <div class="message-label">{{ item.role === 'user' ? '你' : item.role === 'tool' ? '工具' : 'AI' }}</div>
                <div class="message-text">{{ item.text }}</div>
              </div>
            </div>
            <div v-if="busy" class="working-line">
              <el-icon class="is-loading"><Loading /></el-icon>
              {{ workingText }}
            </div>
          </div>

          <div class="composer">
            <el-input
              data-testid="ai-assistant-input"
              v-model="input"
              type="textarea"
              :rows="mode === 'dock' ? 4 : 3"
              resize="none"
              :disabled="busy"
              placeholder="告诉 AI 你想做什么…"
              @keydown="handleComposerKeydown"
            />
            <div class="composer-meta">
              <span class="route-hint">当前：{{ route.path }}</span>
              <el-dropdown trigger="click" @command="setSendShortcut">
                <button class="shortcut-button" type="button">
                  {{ sendShortcut === 'enter' ? 'Enter 发送' : 'Ctrl+Enter 发送' }} ▾
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
              <ai-model-picker
                data-testid="ai-assistant-model"
                v-model="modelId"
                v-model:reasoning-effort="reasoningEffort"
                :models="models"
                :disabled="busy"
              />
              <el-button
                data-testid="ai-assistant-send"
                type="primary"
                :loading="busy"
                :disabled="!input.trim() || !modelId"
                @click="sendMessage"
              >
                发送
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ChatDotRound, Loading } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AiModelPicker from '@/components/AiModelPicker/index.vue'
import QuickSettings from './QuickSettings.vue'
import { listEnabledAiModels } from '@/api/ai/config'
import { sendAiTurn } from '@/api/ai/chat'
import { getCurrentPageContext, getFrontendToolDefinitions, invokeFrontendTool } from '@/ai/toolRegistry'

const emit = defineEmits(['dock-change'])
const route = useRoute()
const mode = ref('closed')
const settingsOpen = ref(false)
const dockWidth = ref(Number(localStorage.getItem('ai-dock-width')) || 560)
const busy = ref(false)
const workingText = ref('AI 正在处理…')
const input = ref('')
const models = ref([])
const modelId = ref(undefined)
const reasoningEffort = ref(null)
const conversationId = ref(undefined)
const messages = ref([])
const messagePane = ref(null)
const quickSettingsRef = ref(null)
const sendShortcut = ref(localStorage.getItem('ai-send-shortcut') === 'ctrl-enter' ? 'ctrl-enter' : 'enter')
let seq = 0

function append(role, text) {
  messages.value.push({ id: ++seq, role, text: String(text ?? '') })
  nextTick(() => {
    if (messagePane.value) messagePane.value.scrollTop = messagePane.value.scrollHeight
  })
}

async function loadModels() {
  try {
    const res = await listEnabledAiModels()
    models.value = res.data || []
    const current = models.value.find(item => item.modelId === modelId.value)
    if (!current) {
      const preferred = models.value.find(item => item.defaultModel === '0') || models.value[0]
      modelId.value = preferred?.modelId
      reasoningEffort.value = preferred?.defaultReasoningEffort || null
    }
  } catch {
    models.value = []
    modelId.value = undefined
    reasoningEffort.value = null
  }
}

async function openFloating() {
  mode.value = 'floating'
  await loadModels()
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

async function toggleSettings() {
  settingsOpen.value = !settingsOpen.value
  if (settingsOpen.value) {
    await nextTick()
    await quickSettingsRef.value?.reload?.()
  }
}

async function handleSettingsUpdated() {
  await loadModels()
}

function newConversation() {
  conversationId.value = undefined
  messages.value = []
  const preferred = models.value.find(item => item.defaultModel === '0') || models.value[0]
  modelId.value = preferred?.modelId
  reasoningEffort.value = preferred?.defaultReasoningEffort || null
}

function setSendShortcut(value) {
  sendShortcut.value = value
  localStorage.setItem('ai-send-shortcut', value)
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

async function sendMessage() {
  const text = input.value.trim()
  if (!text || busy.value) return
  if (!modelId.value) {
    ElMessage.warning('请先配置并选择一个已启用模型')
    return
  }

  input.value = ''
  append('user', text)
  busy.value = true
  workingText.value = 'AI 正在理解你的请求…'
  try {
    await driveTurn({ userMessage: text })
  } catch (e) {
    append('assistant', `执行失败：${e?.message || e}`)
  } finally {
    busy.value = false
    workingText.value = 'AI 正在处理…'
  }
}

function buildRequest(extra) {
  const payload = {
    conversationId: conversationId.value,
    route: route.path,
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

async function driveTurn(extra) {
  let payload = buildRequest(extra)
  for (let i = 0; i < 8; i++) {
    const res = await sendAiTurn(payload)
    const data = res.data
    conversationId.value = data.conversationId

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
        await ElMessageBox.confirm(
          `AI 准备执行“${call.description || call.name}”。此操作会写入系统数据，是否继续？`,
          'AI 操作确认',
          { confirmButtonText: '确认执行', cancelButtonText: '取消', type: 'warning', closeOnClickModal: false }
        )
      }
      const args = call.arguments ? JSON.parse(call.arguments) : {}
      result = await invokeFrontendTool(call.name, args)
      append('tool', `${call.description || call.name}：已执行`)
    } catch (e) {
      success = false
      error = e === 'cancel' || e === 'close' ? '用户取消了操作' : (e?.message || String(e))
      append('tool', `${call.description || call.name}：${error}`)
    }

    workingText.value = 'AI 正在读取页面执行结果…'
    payload = buildRequest({ toolResult: { callId: call.callId, success, result, error } })
  }
  throw new Error('本轮页面工具调用次数超过限制')
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
onMounted(loadModels)
</script>

<style scoped>
.ai-fab {
  position: fixed;
  right: 24px;
  bottom: 28px;
  z-index: 2000;
  box-shadow: 0 6px 20px rgba(0, 0, 0, .2);
}

.ai-panel {
  position: fixed;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  box-shadow: 0 10px 35px rgba(0, 0, 0, .16);
  overflow: hidden;
}

.ai-panel.floating {
  right: 20px;
  bottom: 20px;
  width: min(410px, calc(100vw - 32px));
  height: min(600px, calc(100vh - 52px));
  border-radius: 12px;
}

.ai-panel.dock {
  top: 0;
  right: 0;
  bottom: 0;
  height: 100vh;
  border-top: 0;
  border-right: 0;
  border-bottom: 0;
  box-shadow: -5px 0 18px rgba(0, 0, 0, .08);
}

.dock-resizer {
  position: absolute;
  top: 0;
  bottom: 0;
  left: -3px;
  width: 7px;
  cursor: col-resize;
  z-index: 2;
}

.panel-header {
  height: 48px;
  flex: 0 0 48px;
  padding: 0 10px 0 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.panel-title { display: flex; align-items: center; gap: 8px; font-weight: 600; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--el-color-success); }
.panel-actions { display: flex; align-items: center; gap: 0; }
.panel-content { flex: 1; min-height: 0; padding: 10px; }
.settings-view { height: 100%; }
.assistant-body { height: 100%; display: flex; flex-direction: column; gap: 8px; min-height: 0; }
.assistant-toolbar { min-height: 28px; display: flex; align-items: center; justify-content: space-between; }
.conversation-tip { color: var(--el-text-color-secondary); font-size: 12px; }

.message-pane {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 7px 3px;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
}
.empty-tip { color: var(--el-text-color-secondary); text-align: center; padding: 44px 18px; line-height: 1.8; }
.message-row { display: flex; margin: 9px 7px; }
.message-row.user { justify-content: flex-end; }
.message-bubble { max-width: 88%; border-radius: 10px; padding: 9px 11px; background: var(--el-bg-color); word-break: break-word; }
.message-row.user .message-bubble { background: var(--el-color-primary-light-8); }
.message-row.tool .message-bubble { background: var(--el-color-warning-light-9); font-size: 13px; }
.message-label { font-size: 11px; color: var(--el-text-color-secondary); margin-bottom: 4px; }
.message-text { white-space: pre-wrap; line-height: 1.6; }
.working-line { padding: 8px 12px; color: var(--el-text-color-secondary); font-size: 13px; }

.composer { display: flex; flex-direction: column; gap: 6px; }
.composer-meta, .composer-actions { display: flex; align-items: center; gap: 8px; }
.composer-meta { justify-content: space-between; }
.composer-actions { justify-content: flex-end; min-height: 30px; }
.route-hint { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--el-text-color-secondary); font-size: 11px; }
.shortcut-button { border: 0; background: transparent; color: var(--el-text-color-secondary); font-size: 11px; cursor: pointer; padding: 2px; }

@media (max-width: 640px) {
  .ai-panel.floating {
    right: 8px;
    bottom: 8px;
    width: calc(100vw - 16px);
    height: calc(100vh - 16px);
  }
}
</style>
