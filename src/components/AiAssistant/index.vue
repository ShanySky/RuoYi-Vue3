<template>
  <div class="ai-assistant-host">
    <el-button data-testid="ai-assistant-open" class="ai-fab" type="primary" circle size="large" title="AI 助手" @click="openDrawer">
      <el-icon><ChatDotRound /></el-icon>
    </el-button>

    <el-drawer v-model="visible" title="AI 助手" size="420px" :append-to-body="true" class="ai-assistant-drawer">
      <div class="assistant-body">
        <div class="assistant-toolbar">
          <el-select data-testid="ai-assistant-model" v-model="modelId" placeholder="选择模型" :disabled="!!conversationId || busy" style="flex: 1" @visible-change="handleModelDropdown">
            <el-option v-for="model in models" :key="model.modelId" :label="model.displayName || model.modelCode" :value="model.modelId">
              <span>{{ model.displayName || model.modelCode }}</span>
              <el-tag v-if="model.defaultModel === '0'" size="small" type="success" style="margin-left: 8px">默认</el-tag>
            </el-option>
          </el-select>
          <el-button :disabled="busy" @click="newConversation">新会话</el-button>
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
            :rows="3"
            resize="none"
            :disabled="busy"
            placeholder="告诉 AI 你想做什么…"
            @keydown.enter.exact.prevent="sendMessage"
          />
          <div class="composer-actions">
            <span class="route-hint">当前：{{ route.path }}</span>
            <el-button data-testid="ai-assistant-send" type="primary" :loading="busy" :disabled="!input.trim() || !modelId" @click="sendMessage">发送</el-button>
          </div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ChatDotRound, Loading } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { listEnabledAiModels } from '@/api/ai/config'
import { sendAiTurn } from '@/api/ai/chat'
import { getCurrentPageContext, getFrontendToolDefinitions, invokeFrontendTool } from '@/ai/toolRegistry'

const route = useRoute()
const visible = ref(false)
const busy = ref(false)
const workingText = ref('AI 正在处理…')
const input = ref('')
const models = ref([])
const modelId = ref(undefined)
const conversationId = ref(undefined)
const messages = ref([])
const messagePane = ref(null)
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
    if (!conversationId.value) {
      const preferred = models.value.find(item => item.defaultModel === '0') || models.value[0]
      if (preferred && !models.value.some(item => item.modelId === modelId.value)) modelId.value = preferred.modelId
    }
  } catch (e) {
    models.value = []
  }
}

async function openDrawer() {
  visible.value = true
  await loadModels()
}

function handleModelDropdown(opened) {
  if (opened) loadModels()
}

function newConversation() {
  conversationId.value = undefined
  messages.value = []
  loadModels()
}

async function sendMessage() {
  const text = input.value.trim()
  if (!text || !modelId.value || busy.value) return
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
  return {
    conversationId: conversationId.value,
    modelId: conversationId.value ? undefined : modelId.value,
    route: route.path,
    pageContext: getCurrentPageContext(),
    frontendTools: getFrontendToolDefinitions(),
    ...extra
  }
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

onMounted(loadModels)
</script>

<style scoped>
.ai-fab {
  position: fixed;
  right: 24px;
  bottom: 28px;
  z-index: 2000;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
}
.assistant-body { height: calc(100vh - 90px); display: flex; flex-direction: column; gap: 12px; }
.assistant-toolbar { display: flex; gap: 8px; }
.message-pane { flex: 1; overflow-y: auto; padding: 8px 4px; background: var(--el-fill-color-lighter); border-radius: 8px; }
.empty-tip { color: var(--el-text-color-secondary); text-align: center; padding: 48px 20px; line-height: 1.8; }
.message-row { display: flex; margin: 10px 8px; }
.message-row.user { justify-content: flex-end; }
.message-bubble { max-width: 88%; border-radius: 10px; padding: 9px 11px; background: var(--el-bg-color); word-break: break-word; }
.message-row.user .message-bubble { background: var(--el-color-primary-light-8); }
.message-row.tool .message-bubble { background: var(--el-color-warning-light-9); font-size: 13px; }
.message-label { font-size: 11px; color: var(--el-text-color-secondary); margin-bottom: 4px; }
.message-text { white-space: pre-wrap; line-height: 1.6; }
.working-line { padding: 8px 12px; color: var(--el-text-color-secondary); font-size: 13px; }
.composer { display: flex; flex-direction: column; gap: 8px; }
.composer-actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.route-hint { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--el-text-color-secondary); font-size: 12px; }
</style>
