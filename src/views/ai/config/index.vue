<template>
  <div class="app-container ai-config-page">
    <div class="page-heading">
      <div>
        <div class="page-title">AI 服务配置</div>
        <div class="page-subtitle">配置 OpenAI-compatible 服务，并只把真正需要使用的模型加入系统。</div>
      </div>
      <el-tag v-if="provider.enabled" type="success" effect="plain">服务已启用</el-tag>
      <el-tag v-else type="info" effect="plain">服务未启用</el-tag>
    </div>

    <el-card shadow="never" class="config-card">
      <template #header>
        <div class="section-heading">
          <div class="section-icon"><el-icon><Connection /></el-icon></div>
          <div>
            <div class="section-title">AI 服务连接</div>
            <div class="section-subtitle">这里只保存 Provider 连接信息，不负责选择系统模型。</div>
          </div>
        </div>
      </template>

      <el-form ref="providerRef" :model="form" :rules="rules" label-width="112px" class="provider-form">
        <el-form-item label="服务名称" prop="name">
          <el-input v-model="form.name" maxlength="64" />
        </el-form-item>
        <el-form-item label="Base URL" prop="baseUrl">
          <el-input
            data-testid="ai-config-base-url"
            v-model="form.baseUrl"
            placeholder="例如：https://api.example.com/v1"
            @input="clearRemoteCatalog"
          />
        </el-form-item>
        <el-form-item label="Token">
          <el-input
            data-testid="ai-config-token"
            v-model="form.token"
            type="password"
            show-password
            autocomplete="new-password"
            :placeholder="provider.hasToken ? '已保存 Token；留空表示不修改' : '请输入 API Token'"
            @input="clearRemoteCatalog"
          />
          <div v-if="provider.hasToken" class="field-tip">已保存：{{ provider.tokenMask }}</div>
        </el-form-item>
        <el-form-item label="启用服务">
          <el-switch data-testid="ai-config-enabled" v-model="form.enabled" />
        </el-form-item>
        <el-form-item class="form-actions">
          <el-button data-testid="ai-config-save" type="primary" :loading="saving" @click="save">
            保存连接配置
          </el-button>
          <el-button :loading="testingLoad" @click="testModelLoad">
            测试模型加载
          </el-button>
          <el-button :disabled="!remoteModels.length" @click="pickerVisible = true">
            选择模型
          </el-button>
        </el-form-item>
      </el-form>

      <el-alert
        v-if="loadMessage"
        :title="loadMessage"
        :type="loadStatus"
        :closable="false"
        show-icon
        class="load-result"
      />
    </el-card>

    <el-card shadow="never" class="config-card model-card">
      <template #header>
        <div class="model-card-header">
          <div class="section-heading">
            <div class="section-icon"><el-icon><Grid /></el-icon></div>
            <div>
              <div class="section-title">系统模型</div>
              <div class="section-subtitle">这里只显示你主动加入系统的模型。新模型加入后会自动检测 Tool Calling 与思考能力。</div>
            </div>
          </div>
          <div class="model-header-actions">
            <el-input
              v-model="systemQuery"
              clearable
              :prefix-icon="Search"
              placeholder="搜索系统模型"
              class="system-search"
            />
            <el-button type="primary" plain @click="openPicker">
              <el-icon><Plus /></el-icon>
              添加模型
            </el-button>
          </div>
        </div>
      </template>

      <el-table v-if="filteredSystemModels.length" :data="filteredSystemModels" v-loading="modelLoading" class="system-model-table">
        <el-table-column label="模型" min-width="220">
          <template #default="{ row }">
            <div class="system-model-name">{{ row.displayName || row.modelCode }}</div>
            <div class="system-model-code">{{ row.modelCode }}</div>
          </template>
        </el-table-column>

        <el-table-column label="Tool Calling" width="138">
          <template #default="{ row }">
            <span v-if="detecting[row.modelId]" class="inline-status">
              <el-icon class="is-loading"><Loading /></el-icon> 检测中
            </span>
            <el-tag v-else-if="row.toolCapability === 'SUPPORTED'" size="small" type="success" effect="plain">支持</el-tag>
            <el-tag v-else-if="row.toolCapability === 'UNSUPPORTED'" size="small" type="info" effect="plain">不支持</el-tag>
            <el-button v-else link type="primary" size="small" @click="detectModel(row)">重新检测</el-button>
          </template>
        </el-table-column>

        <el-table-column label="默认思考档位" min-width="200">
          <template #default="{ row }">
            <span v-if="detecting[row.modelId]" class="inline-status">
              <el-icon class="is-loading"><Loading /></el-icon> 检测中
            </span>
            <el-select
              v-else-if="row.reasoningCapability === 'SUPPORTED'"
              :model-value="row.defaultReasoningEffort || ''"
              size="small"
              class="reasoning-select"
              @change="value => changeDefaultReasoning(row, value)"
            >
              <el-option label="Provider 默认" value="" />
              <el-option
                v-for="effort in reasoningOptions(row)"
                :key="effort"
                :label="effortLabel(effort)"
                :value="effort"
              />
            </el-select>
            <el-tag v-else-if="row.reasoningCapability === 'UNSUPPORTED'" size="small" type="info" effect="plain">不支持思考档位</el-tag>
            <el-button v-else link type="primary" size="small" @click="detectModel(row)">重新检测</el-button>
          </template>
        </el-table-column>

        <el-table-column label="启用" width="86" align="center">
          <template #default="{ row }">
            <el-switch :model-value="row.enabled === '0'" size="small" @change="value => changeEnabled(row, value)" />
          </template>
        </el-table-column>

        <el-table-column label="默认" width="76" align="center">
          <template #default="{ row }">
            <el-tooltip :content="row.defaultModel === '0' ? '当前默认模型' : '设为默认模型'" placement="top">
              <button class="default-star" type="button" @click="makeDefault(row)">
                <el-icon v-if="row.defaultModel === '0'" class="active"><StarFilled /></el-icon>
                <el-icon v-else><Star /></el-icon>
              </button>
            </el-tooltip>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="236" align="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openAdvanced(row)">高级设置</el-button>
            <el-button
              link
              type="primary"
              :loading="testingModel[row.modelId]"
              @click="testConnection(row)"
            >
              测试连接
            </el-button>
            <el-button link type="danger" @click="removeModel(row)">移除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-else :image-size="86" description="暂未添加系统模型">
        <el-button type="primary" plain @click="openPicker">选择模型</el-button>
      </el-empty>
    </el-card>

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

<script setup name="AiConfig">
import { refDebounced } from '@vueuse/core'
import { Connection, Grid, Loading, Plus, Search, Star, StarFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AiRemoteModelPicker from '@/components/AiRemoteModelPicker/index.vue'
import AiModelRuntimeSettingsDialog from '@/components/AiModelRuntimeSettingsDialog/index.vue'
import { filterAiModelsByQuery } from '@/ai/modelSearch'
import {
  addAiModels, detectAiModelCapabilities, getAiProvider, listAiModels, removeAiModel,
  saveAiProvider, setAiModelEnabled, setDefaultAiModel, setDefaultAiReasoning,
  testAiModelChat, testAiModelLoad
} from '@/api/ai/config'

const providerRef = ref(null)
const provider = reactive({})
const form = reactive({ name: '默认 AI 服务', baseUrl: '', token: '', enabled: false, timeoutSeconds: 30 })
const rules = {
  baseUrl: [{ required: true, message: 'Base URL 不能为空', trigger: 'blur' }]
}

const models = ref([])
const remoteModels = ref([])
const pickerVisible = ref(false)
const advancedVisible = ref(false)
const advancedModel = ref(null)
const systemQuery = ref('')
const debouncedSystemQuery = refDebounced(systemQuery, 180)
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
  return form.name.trim() !== String(provider.name || '默认 AI 服务').trim()
    || form.baseUrl.trim() !== String(provider.baseUrl || '').trim()
    || !!form.token
    || form.enabled !== !!provider.enabled
})

const filteredSystemModels = computed(() => {
  if (!debouncedSystemQuery.value.trim()) return models.value
  return filterAiModelsByQuery(models.value, debouncedSystemQuery.value, 50)
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
  form.timeoutSeconds = provider.timeoutSeconds || 30
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

async function save() {
  await providerRef.value.validate()
  saving.value = true
  try {
    const res = await saveAiProvider({ ...form, token: form.token || undefined, timeoutSeconds: 30 })
    Object.assign(provider, res.data || {})
    form.token = ''
    form.timeoutSeconds = 30
    ElMessage.success({ message: '连接配置已保存', duration: 2200 })
  } finally {
    saving.value = false
  }
}

async function testModelLoad() {
  await providerRef.value.validate()
  testingLoad.value = true
  try {
    const res = await testAiModelLoad({ ...form, token: form.token || undefined, timeoutSeconds: 30 })
    remoteModels.value = Array.isArray(res.data) ? res.data : []
    loadStatus.value = 'success'
    loadMessage.value = `模型加载成功：发现 ${remoteModels.value.length} 个远端模型。请选择需要加入系统的模型。`
  } catch (error) {
    remoteModels.value = []
    loadStatus.value = 'error'
    loadMessage.value = '模型加载失败，请检查 Base URL 和 Token。'
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
    ElMessage.success({ message: `已添加 ${added.length} 个模型，正在自动检测能力`, duration: 2200 })
    await Promise.allSettled(added.map(model => detectModel(model, false)))
    await loadModels()
  } finally {
    addingModels.value = false
  }
}

async function detectModel(row, showMessage = true) {
  detecting[row.modelId] = true
  try {
    const res = await detectAiModelCapabilities(row.modelId)
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
    detecting[row.modelId] = false
  }
}

async function changeEnabled(row, enabled) {
  await setAiModelEnabled(row.modelId, enabled)
  await loadModels()
}

async function makeDefault(row) {
  if (row.defaultModel === '0') return
  await setDefaultAiModel(row.modelId)
  await loadModels()
  ElMessage.success({ message: `默认模型已设为 ${row.displayName || row.modelCode}`, duration: 2200 })
}

async function changeDefaultReasoning(row, value) {
  await setDefaultAiReasoning(row.modelId, value || null)
  await loadModels()
  ElMessage.success({ message: '默认思考档位已更新', duration: 2000 })
}

function openAdvanced(row) {
  advancedModel.value = row
  advancedVisible.value = true
}

async function handleAdvancedSaved() {
  await loadModels()
  advancedModel.value = models.value.find(item => item.modelId === advancedModel.value?.modelId) || null
}

async function testConnection(row) {
  testingModel[row.modelId] = true
  try {
    await testAiModelChat(row.modelId)
    ElMessage.success({ message: `${row.displayName || row.modelCode} 测试连接成功`, duration: 2600 })
  } finally {
    testingModel[row.modelId] = false
  }
}

async function removeModel(row) {
  await ElMessageBox.confirm(
    `确认从系统模型中移除“${row.displayName || row.modelCode}”吗？历史会话记录不会被删除。`,
    '移除模型',
    { confirmButtonText: '确认移除', cancelButtonText: '取消', type: 'warning' }
  )
  await removeAiModel(row.modelId)
  await loadModels()
  ElMessage.success({ message: '模型已移除', duration: 2000 })
}

onMounted(async () => {
  await Promise.all([loadProvider(), loadModels()])
})
</script>

<style scoped>
.ai-config-page { max-width: 1260px; margin: 0 auto; }
.page-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; margin-bottom: 16px; }
.page-title { color: var(--el-text-color-primary); font-size: 20px; font-weight: 600; line-height: 1.45; }
.page-subtitle { margin-top: 5px; color: var(--el-text-color-secondary); font-size: 13px; }
.config-card { border-color: var(--el-border-color-lighter); border-radius: 8px; }
.config-card + .config-card { margin-top: 16px; }
.section-heading { display: flex; align-items: center; gap: 10px; }
.section-icon {
  display: flex; align-items: center; justify-content: center; width: 30px; height: 30px;
  color: var(--el-color-primary); background: var(--el-color-primary-light-9); border-radius: 7px;
}
.section-title { color: var(--el-text-color-primary); font-size: 15px; font-weight: 600; }
.section-subtitle { margin-top: 3px; color: var(--el-text-color-secondary); font-size: 12px; }
.provider-form { max-width: 760px; }
.field-tip { margin-top: 4px; color: var(--el-text-color-secondary); font-size: 12px; }
.form-actions :deep(.el-form-item__content) { gap: 8px; }
.load-result { margin-top: 2px; max-width: 760px; }
.model-card-header { display: flex; align-items: center; justify-content: space-between; gap: 18px; }
.model-header-actions { display: flex; align-items: center; gap: 8px; }
.system-search { width: 230px; }
.system-model-table :deep(.el-table__cell) { padding: 11px 0; }
.system-model-name { overflow: hidden; color: var(--el-text-color-primary); font-size: 13px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.system-model-code { overflow: hidden; margin-top: 3px; color: var(--el-text-color-secondary); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.inline-status { display: inline-flex; align-items: center; gap: 5px; color: var(--el-text-color-secondary); font-size: 12px; }
.reasoning-select { width: 150px; }
.default-star { border: 0; background: transparent; color: var(--el-text-color-placeholder); cursor: pointer; font-size: 19px; padding: 4px; line-height: 1; }
.default-star:hover { color: var(--el-color-warning); }
.default-star .active { color: var(--el-color-warning); }
@media (max-width: 900px) {
  .model-card-header { align-items: stretch; flex-direction: column; }
  .model-header-actions { justify-content: flex-end; }
  .system-search { flex: 1; width: auto; }
}
</style>
