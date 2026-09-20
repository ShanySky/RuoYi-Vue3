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

      <div class="section-divider" />

      <section class="settings-section">
        <div class="section-heading">
          <div>
            <div class="section-title">AI 服务连接</div>
            <div class="section-subtitle">保存 Provider 连接信息，再选择真正需要使用的模型。</div>
          </div>
          <el-tag v-if="provider.enabled" size="small" type="success" effect="plain">已启用</el-tag>
          <el-tag v-else size="small" type="info" effect="plain">未启用</el-tag>
        </div>

        <el-form label-position="top" size="small" class="compact-form">
          <el-form-item label="Base URL">
            <el-input v-model="form.baseUrl" placeholder="https://api.example.com/v1" @input="clearRemoteCatalog" />
          </el-form-item>
          <el-form-item label="Token">
            <el-input
              v-model="form.token"
              type="password"
              show-password
              autocomplete="new-password"
              :placeholder="provider.hasToken ? '已保存 Token；留空不修改' : '请输入 API Token'"
              @input="clearRemoteCatalog"
            />
          </el-form-item>
          <div class="compact-row">
            <el-checkbox v-model="form.enabled">启用服务</el-checkbox>
          </div>
          <div class="button-row">
            <el-button type="primary" size="small" :loading="saving" @click="saveProvider">保存连接配置</el-button>
            <el-button size="small" :loading="testingLoad" @click="testModelLoad">测试模型加载</el-button>
            <el-button size="small" :disabled="!remoteModels.length" @click="pickerVisible = true">选择模型</el-button>
          </div>
        </el-form>

        <el-alert
          v-if="loadMessage"
          :title="loadMessage"
          :type="loadStatus"
          :closable="false"
          show-icon
          class="load-result"
        />
      </section>

      <div class="section-divider" />

      <section class="settings-section">
        <div class="section-heading models-heading">
          <div>
            <div class="section-title">系统模型</div>
            <div class="section-subtitle">只显示已经加入系统的模型。</div>
          </div>
          <el-button text size="small" @click="openPicker">
            <el-icon><Plus /></el-icon>
            添加
          </el-button>
        </div>

        <el-input
          v-if="models.length > 5"
          v-model="systemQuery"
          clearable
          :prefix-icon="Search"
          size="small"
          placeholder="搜索系统模型"
          class="system-search"
        />

        <div v-if="filteredModels.length" class="system-model-list" v-loading="modelLoading">
          <article v-for="model in filteredModels" :key="model.modelId" class="system-model-card">
            <div class="model-card-top">
              <div class="model-name-wrap">
                <div class="model-name" :title="model.modelCode">{{ model.displayName || model.modelCode }}</div>
                <div class="model-code">{{ model.modelCode }}</div>
              </div>
              <div class="model-state-actions">
                <el-tooltip :content="model.defaultModel === '0' ? '当前默认模型' : '设为默认模型'" placement="top">
                  <button class="default-star" type="button" @click="makeDefault(model)">
                    <el-icon v-if="model.defaultModel === '0'" class="active"><StarFilled /></el-icon>
                    <el-icon v-else><Star /></el-icon>
                  </button>
                </el-tooltip>
                <el-switch
                  :model-value="model.enabled === '0'"
                  size="small"
                  @change="value => changeEnabled(model, value)"
                />
              </div>
            </div>

            <div class="capability-row">
              <span class="capability-label">Tool</span>
              <span v-if="detecting[model.modelId]" class="inline-status">
                <el-icon class="is-loading"><Loading /></el-icon> 检测中
              </span>
              <el-tag v-else-if="model.toolCapability === 'SUPPORTED'" size="small" type="success" effect="plain">支持</el-tag>
              <el-tag v-else-if="model.toolCapability === 'UNSUPPORTED'" size="small" type="info" effect="plain">不支持</el-tag>
              <el-button v-else link size="small" type="primary" @click="detectModel(model)">重新检测</el-button>
            </div>

            <div class="capability-row">
              <span class="capability-label">思考档位</span>
              <span v-if="detecting[model.modelId]" class="inline-status">
                <el-icon class="is-loading"><Loading /></el-icon> 检测中
              </span>
              <el-select
                v-else-if="model.reasoningCapability === 'SUPPORTED'"
                :model-value="model.defaultReasoningEffort || ''"
                size="small"
                class="reasoning-select"
                @change="value => changeDefaultReasoning(model, value)"
              >
                <el-option label="Provider 默认" value="" />
                <el-option v-for="effort in reasoningOptions(model)" :key="effort" :label="effortLabel(effort)" :value="effort" />
              </el-select>
              <el-tag v-else-if="model.reasoningCapability === 'UNSUPPORTED'" size="small" type="info" effect="plain">不支持</el-tag>
              <el-button v-else link size="small" type="primary" @click="detectModel(model)">重新检测</el-button>
            </div>

            <div class="model-card-footer">
              <el-button link type="primary" size="small" @click="openAdvanced(model)">高级设置</el-button>
              <el-button
                link
                type="primary"
                size="small"
                :loading="testingModel[model.modelId]"
                @click="testConnection(model)"
              >
                测试连接
              </el-button>
              <el-button link type="danger" size="small" @click="removeModel(model)">移除</el-button>
            </div>
          </article>
        </div>

        <div v-else class="empty-models">
          <el-icon><Grid /></el-icon>
          <span>暂未添加系统模型</span>
          <el-button link type="primary" size="small" @click="openPicker">选择模型</el-button>
        </div>
      </section>
    </el-scrollbar>

    <div v-else class="initial-loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      正在加载 AI 配置…
    </div>

    <ai-model-runtime-settings-dialog
      v-model="advancedVisible"
      :model="advancedModel"
      @saved="handleAdvancedSaved"
    />

    <ai-remote-model-picker
      v-model="pickerVisible"
      :remote-models="remoteModels"
      :system-models="models"
      :refreshing="testingLoad"
      :adding="addingModels"
      @refresh="testModelLoad"
      @confirm="addSelectedModels"
    />
  </div>
</template>

<script setup>
import { refDebounced } from '@vueuse/core'
import { Grid, Loading, Plus, Search, Star, StarFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AiRemoteModelPicker from '@/components/AiRemoteModelPicker/index.vue'
import AiModelRuntimeSettingsDialog from '@/components/AiModelRuntimeSettingsDialog/index.vue'
import { filterAiModelsByQuery } from '@/ai/modelSearch'
import useAiStore from '@/store/modules/ai'
import {
  addAiModels, detectAiModelCapabilities, getAiProvider, listAiModels, removeAiModel,
  saveAiProvider, setAiModelEnabled, setDefaultAiModel, setDefaultAiReasoning,
  testAiModelChat, testAiModelLoad
} from '@/api/ai/config'

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
const provider = reactive({})
const form = reactive({ name: '默认 AI 服务', baseUrl: '', token: '', enabled: false, timeoutSeconds: 30 })
const models = ref([])
const remoteModels = ref([])
const pickerVisible = ref(false)
const advancedVisible = ref(false)
const advancedModel = ref(null)
const systemQuery = ref('')
const debouncedSystemQuery = refDebounced(systemQuery, 180)
const initialized = ref(false)
const saving = ref(false)
const testingLoad = ref(false)
const addingModels = ref(false)
const modelLoading = ref(false)
const loadMessage = ref('')
const loadStatus = ref('success')
const detecting = reactive({})
const testingModel = reactive({})

const providerDirty = computed(() => {
  if (!provider.providerId) return true
  return form.baseUrl.trim() !== String(provider.baseUrl || '').trim()
    || !!form.token
    || form.enabled !== !!provider.enabled
})

const filteredModels = computed(() => {
  if (!debouncedSystemQuery.value.trim()) return models.value
  return filterAiModelsByQuery(models.value, debouncedSystemQuery.value, 30)
})

function reasoningOptions(model) {
  if (model?.reasoningCapability !== 'SUPPORTED' || !model?.reasoningEfforts) return []
  return String(model.reasoningEfforts).split(',').map(item => item.trim()).filter(Boolean)
}

function effortLabel(value) {
  const labels = { none: '无', minimal: '最低', low: '低', medium: '中', high: '高', xhigh: '极高', max: '最高' }
  return labels[value] || value
}

function clearRemoteCatalog() {
  remoteModels.value = []
  loadMessage.value = ''
}

async function loadProvider() {
  const res = await getAiProvider()
  Object.assign(provider, res.data || {})
  form.name = provider.name || '默认 AI 服务'
  form.baseUrl = provider.baseUrl || ''
  form.token = ''
  form.enabled = !!provider.enabled
  form.timeoutSeconds = 30
}

async function loadModels() {
  modelLoading.value = true
  try {
    const res = await listAiModels()
    models.value = res.data || []
  } finally {
    modelLoading.value = false
  }
}

async function reload() {
  initialized.value = false
  try {
    await Promise.all([loadProvider(), loadModels(), aiStore.loadPreferences(), aiStore.loadModels()])
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

async function saveProvider() {
  if (!form.baseUrl.trim()) {
    ElMessage.warning('请填写 Base URL')
    return
  }
  saving.value = true
  try {
    const res = await saveAiProvider({ ...form, token: form.token || undefined, timeoutSeconds: 30 })
    Object.assign(provider, res.data || {})
    form.token = ''
    form.timeoutSeconds = 30
    ElMessage.success({ message: '连接配置已保存', duration: 2200 })
    emit('updated')
  } finally {
    saving.value = false
  }
}

async function testModelLoad() {
  if (!form.baseUrl.trim()) {
    ElMessage.warning('请填写 Base URL')
    return
  }
  testingLoad.value = true
  try {
    const res = await testAiModelLoad({ ...form, token: form.token || undefined, timeoutSeconds: 30 })
    remoteModels.value = Array.isArray(res.data) ? res.data : []
    loadStatus.value = 'success'
    loadMessage.value = `模型加载成功：发现 ${remoteModels.value.length} 个远端模型`
  } catch (error) {
    remoteModels.value = []
    loadStatus.value = 'error'
    loadMessage.value = '模型加载失败，请检查 Base URL 和 Token'
    throw error
  } finally {
    testingLoad.value = false
  }
}

async function openPicker() {
  if (!remoteModels.value.length) await testModelLoad()
  if (remoteModels.value.length) pickerVisible.value = true
}

async function addSelectedModels(codes) {
  if (providerDirty.value) {
    ElMessage.warning('连接配置已修改，请先保存连接配置，再添加模型')
    return
  }
  addingModels.value = true
  try {
    const res = await addAiModels(codes)
    const added = res.data || []
    pickerVisible.value = false
    await loadModels()
    emit('updated')
    ElMessage.success({ message: `已添加 ${added.length} 个模型，正在自动检测能力`, duration: 2200 })
    await Promise.allSettled(added.map(model => detectModel(model, false)))
    await loadModels()
    emit('updated')
  } finally {
    addingModels.value = false
  }
}

async function detectModel(model, showMessage = true) {
  detecting[model.modelId] = true
  try {
    const res = await detectAiModelCapabilities(model.modelId)
    if (showMessage) {
      const data = res.data || {}
      const partial = data.toolError || data.reasoningError
      ElMessage({
        type: partial ? 'warning' : 'success',
        message: partial ? '能力检测已完成，部分能力暂未确认' : '模型能力检测完成',
        duration: 2400
      })
    }
    await loadModels()
  } finally {
    detecting[model.modelId] = false
  }
}

async function changeEnabled(model, enabled) {
  await setAiModelEnabled(model.modelId, enabled)
  await loadModels()
  emit('updated')
}

async function makeDefault(model) {
  if (model.defaultModel === '0') return
  await setDefaultAiModel(model.modelId)
  await loadModels()
  emit('updated')
  ElMessage.success({ message: `默认模型已设为 ${model.displayName || model.modelCode}`, duration: 2200 })
}

async function changeDefaultReasoning(model, value) {
  await setDefaultAiReasoning(model.modelId, value || null)
  await loadModels()
  emit('updated')
  ElMessage.success({ message: '默认思考档位已更新', duration: 2000 })
}

function openAdvanced(model) {
  advancedModel.value = model
  advancedVisible.value = true
}

async function handleAdvancedSaved() {
  await loadModels()
  advancedModel.value = models.value.find(item => item.modelId === advancedModel.value?.modelId) || null
  emit('updated')
}

async function testConnection(model) {
  testingModel[model.modelId] = true
  try {
    await testAiModelChat(model.modelId)
    ElMessage.success({ message: `${model.displayName || model.modelCode} 测试连接成功`, duration: 2600 })
  } finally {
    testingModel[model.modelId] = false
  }
}

async function removeModel(model) {
  await ElMessageBox.confirm(
    `确认从系统模型中移除“${model.displayName || model.modelCode}”吗？`,
    '移除模型',
    { confirmButtonText: '确认移除', cancelButtonText: '取消', type: 'warning' }
  )
  await removeAiModel(model.modelId)
  await loadModels()
  emit('updated')
  ElMessage.success({ message: '模型已移除', duration: 2000 })
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
.compact-form :deep(.el-form-item) { margin-bottom: 12px; }
.compact-form :deep(.el-form-item__label) { padding-bottom: 4px; color: var(--el-text-color-secondary); font-size: 12px; }
.compact-row { display: flex; align-items: center; min-height: 28px; }
.button-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.load-result { margin-top: 12px; }
.section-divider { height: 1px; margin: 4px 0 14px; background: var(--el-border-color-lighter); }
.models-heading { align-items: center; }
.system-search { margin-bottom: 9px; }
.system-model-list { display: flex; flex-direction: column; gap: 8px; }
.system-model-card {
  padding: 10px 11px; border: 1px solid var(--el-border-color-lighter); border-radius: 8px;
  background: var(--el-bg-color); transition: border-color .15s ease, box-shadow .15s ease;
}
.system-model-card:hover { border-color: var(--el-border-color); box-shadow: 0 2px 7px rgba(0,0,0,.035); }
.model-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.model-name-wrap { min-width: 0; }
.model-name { overflow: hidden; color: var(--el-text-color-primary); font-size: 13px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.model-code { overflow: hidden; margin-top: 2px; color: var(--el-text-color-secondary); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.model-state-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.default-star { display: flex; border: 0; background: transparent; color: var(--el-text-color-placeholder); cursor: pointer; font-size: 17px; padding: 2px; }
.default-star:hover { color: var(--el-color-warning); }
.default-star .active { color: var(--el-color-warning); }
.capability-row { display: flex; align-items: center; min-height: 30px; margin-top: 4px; gap: 8px; }
.capability-label { width: 64px; flex: 0 0 64px; color: var(--el-text-color-secondary); font-size: 11px; }
.inline-status { display: inline-flex; align-items: center; gap: 4px; color: var(--el-text-color-secondary); font-size: 11px; }
.reasoning-select { width: 142px; }
.model-card-footer { display: flex; justify-content: flex-end; gap: 4px; margin-top: 4px; padding-top: 5px; border-top: 1px solid var(--el-border-color-lighter); }
.empty-models { display: flex; align-items: center; justify-content: center; gap: 6px; min-height: 90px; color: var(--el-text-color-secondary); font-size: 12px; }
.initial-loading { height: 100%; display: flex; align-items: center; justify-content: center; gap: 7px; color: var(--el-text-color-secondary); font-size: 13px; }
</style>
