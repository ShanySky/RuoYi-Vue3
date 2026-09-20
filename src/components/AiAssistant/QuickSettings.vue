<template>
  <div class="quick-settings">
    <el-scrollbar v-if="initialized" class="settings-scroll">
      <section class="settings-section">
        <div class="section-heading">
          <div>
            <div class="section-title">我的聊天偏好</div>
            <div class="section-subtitle">个人偏好跟随当前账号，不影响其他用户。</div>
          </div>
        </div>

        <div class="preference-row">
          <div>
            <div class="preference-label">聊天字体大小</div>
            <div class="preference-tip">只调整消息正文、输入框和运行状态文字。</div>
          </div>
          <div class="font-options">
            <el-button
              v-for="option in fontOptions"
              :key="option.value"
              size="small"
              :type="preferences.chatFontSize === option.value ? 'primary' : 'default'"
              :plain="preferences.chatFontSize !== option.value"
              @click="changeChatFontSize(option.value)"
            >
              {{ option.label }}
            </el-button>
          </div>
        </div>

        <div class="preference-row preference-row-separated">
          <div>
            <div class="preference-label">双击 ESC 中断</div>
            <div class="preference-tip">仅 AI 窗口内有焦点时生效；700ms 内连续两次。</div>
          </div>
          <el-switch
            :model-value="preferences.doubleEscEnabled"
            size="small"
            @change="changeDoubleEsc"
          />
        </div>

        <div class="preference-row preference-row-separated">
          <div>
            <div class="preference-label">发送快捷键</div>
            <div class="preference-tip">账号级偏好；换设备登录后继续生效。</div>
          </div>
          <el-select :model-value="preferences.sendShortcut" size="small" class="preference-select" @change="changeSendShortcut">
            <el-option label="Enter 发送" value="enter" />
            <el-option label="Ctrl+Enter 发送" value="ctrl-enter" />
          </el-select>
        </div>

        <div class="preference-row preference-row-separated">
          <div>
            <div class="preference-label">会话历史入口</div>
            <div class="preference-tip">默认隐藏；开启后聊天标题区显示低干扰历史入口。</div>
          </div>
          <el-switch :model-value="preferences.historyEntryVisible" size="small" @change="changeHistoryEntry" />
        </div>

        <div class="preference-row preference-row-separated">
          <div>
            <div class="preference-label">登录后自动继续上次会话</div>
            <div class="preference-tip">默认关闭；继续后仍可短时撤销。</div>
          </div>
          <el-switch :model-value="preferences.autoRestoreLastConversation" size="small" @change="changeAutoRestore" />
        </div>

        <div class="preference-row preference-row-separated">
          <div>
            <div class="preference-label">AI 默认打开方式</div>
            <div class="preference-tip">可固定小窗、Dock，或恢复本机上次使用模式。</div>
          </div>
          <el-select :model-value="preferences.assistantOpenMode" size="small" class="preference-select" @change="changeOpenMode">
            <el-option label="小窗" value="floating" />
            <el-option label="Dock" value="dock" />
            <el-option label="恢复上次模式" value="last" />
          </el-select>
        </div>

        <div class="preference-row preference-row-separated">
          <div>
            <div class="preference-label">我的默认模型</div>
            <div class="preference-tip">只可选择管理员已开放且当前启用的模型。</div>
          </div>
          <el-select :model-value="preferences.defaultModelId" size="small" class="preference-select" clearable @change="changePreferredModel">
            <el-option
              v-for="model in enabledPreferenceModels"
              :key="model.modelId"
              :label="model.displayName || model.modelCode"
              :value="model.modelId"
            />
          </el-select>
        </div>

        <div v-if="preferredModel?.reasoningCapability === 'SUPPORTED'" class="preference-row preference-row-separated">
          <div>
            <div class="preference-label">我的默认思考档位</div>
            <div class="preference-tip">仅显示当前默认模型真实支持的档位。</div>
          </div>
          <el-select :model-value="preferences.defaultReasoningEffort || ''" size="small" class="preference-select" @change="changePreferredReasoning">
            <el-option label="模型默认" value="" />
            <el-option
              v-for="effort in reasoningOptions(preferredModel)"
              :key="effort"
              :label="effortLabel(effort)"
              :value="effort"
            />
          </el-select>
        </div>
      </section>
    </el-scrollbar>

    <div v-else class="initial-loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      正在加载个人 AI 设置…
    </div>
  </div>
</template>

<script setup>
import { Loading } from '@element-plus/icons-vue'
import useAiStore from '@/store/modules/ai'

const emit = defineEmits(['updated'])
const aiStore = useAiStore()
const preferences = computed(() => aiStore.preferences)
const enabledPreferenceModels = computed(() => aiStore.models || [])
const preferredModel = computed(() => enabledPreferenceModels.value.find(item => item.modelId === preferences.value.defaultModelId) || null)
const fontOptions = [
  { value: 'small', label: '小' },
  { value: 'standard', label: '标准' },
  { value: 'large', label: '大' },
  { value: 'xlarge', label: '特大' }
]
const initialized = ref(false)

function reasoningOptions(model) {
  if (model?.reasoningCapability !== 'SUPPORTED' || !model?.reasoningEfforts) return []
  return String(model.reasoningEfforts).split(',').map(item => item.trim()).filter(Boolean)
}

function effortLabel(value) {
  const labels = { none: '无', minimal: '最低', low: '低', medium: '中', high: '高', xhigh: '极高', max: '最高' }
  return labels[value] || value
}

async function reload() {
  initialized.value = false
  try {
    await Promise.all([aiStore.loadPreferences(), aiStore.loadModels()])
  } finally {
    initialized.value = true
  }
}

async function changeChatFontSize(value) {
  if (preferences.value.chatFontSize === value) return
  await aiStore.savePreferences({ chatFontSize: value })
  emit('updated')
}

async function changeDoubleEsc(value) {
  await aiStore.savePreferences({ doubleEscEnabled: !!value })
  emit('updated')
}

async function changeSendShortcut(value) {
  await aiStore.savePreferences({ sendShortcut: value })
  try { localStorage.setItem('ai-send-shortcut', value) } catch {}
  emit('updated')
}

async function changeHistoryEntry(value) {
  await aiStore.savePreferences({ historyEntryVisible: !!value })
  emit('updated')
}

async function changeAutoRestore(value) {
  await aiStore.savePreferences({ autoRestoreLastConversation: !!value })
  emit('updated')
}

async function changeOpenMode(value) {
  await aiStore.savePreferences({ assistantOpenMode: value })
  emit('updated')
}

async function changePreferredModel(value) {
  if (!value) return
  await aiStore.savePreferences({ defaultModelId: value, defaultReasoningEffort: null })
  await aiStore.loadModels()
  emit('updated')
}

async function changePreferredReasoning(value) {
  await aiStore.savePreferences({ defaultReasoningEffort: value || null })
  emit('updated')
}

onMounted(reload)
defineExpose({ reload })
</script>

<style scoped>
.quick-settings { height: 100%; min-height: 0; }
.settings-scroll { height: 100%; }
.settings-section { padding: 4px 4px 10px; }
.preference-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.preference-row-separated { margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--el-border-color-lighter); }
.preference-label { color: var(--el-text-color-primary); font-size: 12px; }
.preference-tip { margin-top: 3px; color: var(--el-text-color-secondary); font-size: 10px; line-height: 1.5; }
.font-options { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 4px; }
.font-options :deep(.el-button + .el-button) { margin-left: 0; }
.preference-select { width: 150px; flex: 0 0 150px; }
.section-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
.section-title { color: var(--el-text-color-primary); font-size: 14px; font-weight: 600; }
.section-subtitle { margin-top: 3px; color: var(--el-text-color-secondary); font-size: 11px; line-height: 1.55; }
.initial-loading { height: 100%; display: flex; align-items: center; justify-content: center; gap: 7px; color: var(--el-text-color-secondary); font-size: 13px; }
</style>
