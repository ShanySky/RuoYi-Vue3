<template>
  <div class="app-container ai-config-page">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <div>
            <div class="title">AI 服务配置</div>
            <div class="subtitle">第一阶段使用 OpenAI-compatible API。填写 Base URL 和 Token 后即可同步并选择模型。</div>
          </div>
        </div>
      </template>

      <el-form ref="providerRef" :model="form" :rules="rules" label-width="110px" style="max-width: 780px">
        <el-form-item label="服务名称" prop="name">
          <el-input v-model="form.name" maxlength="64" />
        </el-form-item>
        <el-form-item label="Base URL" prop="baseUrl">
          <el-input data-testid="ai-config-base-url" v-model="form.baseUrl" placeholder="例如：https://api.example.com/v1" @input="clearDiscoveredModels" />
        </el-form-item>
        <el-form-item label="Token">
          <el-input data-testid="ai-config-token" v-model="form.token" type="password" show-password autocomplete="new-password" :placeholder="provider.hasToken ? '已保存 Token；留空表示不修改' : '请输入 API Token'" @input="clearDiscoveredModels" />
          <div v-if="provider.hasToken" class="token-tip">已保存：{{ provider.tokenMask }}</div>
        </el-form-item>
        <el-form-item label="超时">
          <el-input-number v-model="form.timeoutSeconds" :min="3" :max="300" />
          <span class="suffix">秒</span>
        </el-form-item>
        <el-form-item label="启用服务">
          <el-switch data-testid="ai-config-enabled" v-model="form.enabled" />
        </el-form-item>
        <el-form-item>
          <el-button data-testid="ai-config-save" type="primary" :loading="saving" @click="save">保存</el-button>
          <el-button :loading="testing" @click="testConnection">测试连接</el-button>
          <el-button data-testid="ai-config-sync" type="success" :loading="syncing" :disabled="!provider.providerId || providerDirty" @click="syncModels">同步模型</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" style="margin-top: 16px">
      <template #header>
        <div class="card-header">
          <div>
            <div class="title">模型</div>
            <div class="subtitle">只有启用的模型会出现在 AI 助手中。Tool Calling 测试不会执行任何业务操作。</div>
          </div>
          <div class="model-header-actions">
            <el-input v-model="modelQuery" clearable placeholder="输入 gpt、5.6、sol 等实时匹配" style="width: 300px" />
            <el-button @click="loadModels">刷新</el-button>
          </div>
        </div>
      </template>

      <el-table :data="filteredModels" v-loading="modelLoading">
        <el-table-column prop="modelCode" label="模型" min-width="240" />
        <el-table-column label="Tool Calling" width="140">
          <template #default="scope">
            <el-tag v-if="scope.row.discoveredOnly" type="info">已发现</el-tag>
            <el-tag v-else :type="scope.row.toolCapability === 'SUPPORTED' ? 'success' : scope.row.toolCapability === 'UNSUPPORTED' ? 'danger' : 'info'">
              {{ scope.row.toolCapability || 'UNKNOWN' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="思考档位" min-width="190">
          <template #default="scope">
            <div v-if="!scope.row.discoveredOnly && scope.row.reasoningCapability === 'SUPPORTED'" class="reasoning-cell">
              <el-select
                :model-value="scope.row.defaultReasoningEffort || ''"
                size="small"
                style="width: 145px"
                @change="value => changeDefaultReasoning(scope.row, value)"
              >
                <el-option label="Provider 默认" value="" />
                <el-option v-for="effort in reasoningOptions(scope.row)" :key="effort" :label="effortLabel(effort)" :value="effort" />
              </el-select>
              <span class="capability-text">{{ scope.row.reasoningEfforts }}</span>
            </div>
            <el-tag v-else-if="!scope.row.discoveredOnly" type="info">{{ scope.row.reasoningCapability || 'UNKNOWN' }}</el-tag>
            <span v-else class="capability-text">同步后可测试</span>
          </template>
        </el-table-column>
        <el-table-column label="启用" width="100" align="center">
          <template #default="scope">
            <el-tag v-if="scope.row.discoveredOnly" size="small" type="info">未同步</el-tag>
            <el-switch v-else :model-value="scope.row.enabled === '0'" @change="value => changeEnabled(scope.row, value)" />
          </template>
        </el-table-column>
        <el-table-column label="默认" width="120" align="center">
          <template #default="scope">
            <span v-if="scope.row.discoveredOnly" class="capability-text">保存并同步后配置</span>
            <el-tag v-else-if="scope.row.defaultModel === '0'" type="success">默认</el-tag>
            <el-button v-else :data-testid="`ai-model-default-${scope.row.modelId}`" link type="primary" @click="makeDefault(scope.row)">设为默认</el-button>
          </template>
        </el-table-column>
        <el-table-column label="测试" width="230" align="center">
          <template #default="scope">
            <template v-if="!scope.row.discoveredOnly">
              <el-button link type="primary" :disabled="scope.row.enabled !== '0'" @click="testChat(scope.row)">聊天</el-button>
              <el-button link type="primary" :disabled="scope.row.enabled !== '0'" @click="testTools(scope.row)">工具</el-button>
              <el-button link type="primary" :disabled="scope.row.enabled !== '0'" @click="testReasoning(scope.row)">思考</el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup name="AiConfig">
import { refDebounced } from '@vueuse/core'
import { ElMessage } from 'element-plus'
import { filterAiModelsByQuery, getRecentAiModelIds, mergeDiscoveredAiModels, suggestAiModels } from '@/ai/modelSearch'
import {
  getAiProvider, saveAiProvider, testAiProvider, syncAiModels, listAiModels,
  setAiModelEnabled, setDefaultAiModel, testAiModelChat, testAiModelTools,
  setDefaultAiReasoning, testAiModelReasoning
} from '@/api/ai/config'

const providerRef = ref(null)
const provider = reactive({})
const form = reactive({ name: '默认 AI 服务', baseUrl: '', token: '', enabled: false, timeoutSeconds: 30 })
const rules = { baseUrl: [{ required: true, message: 'Base URL 不能为空', trigger: 'blur' }] }
const models = ref([])
const discoveredCodes = ref([])
const modelQuery = ref('')
const debouncedModelQuery = refDebounced(modelQuery, 180)
const saving = ref(false)
const testing = ref(false)
const syncing = ref(false)
const modelLoading = ref(false)

const providerDirty = computed(() => {
  if (!provider.providerId) return true
  return form.baseUrl.trim() !== String(provider.baseUrl || '').trim()
    || !!form.token
    || form.enabled !== !!provider.enabled
    || Number(form.timeoutSeconds || 30) !== Number(provider.timeoutSeconds || 30)
})

const searchableModels = computed(() => mergeDiscoveredAiModels(models.value, discoveredCodes.value))

function modelLabel(model) {
  return model?.displayName || model?.modelCode || ''
}

const filteredModels = computed(() => {
  if (debouncedModelQuery.value.trim()) {
    return filterAiModelsByQuery(searchableModels.value, debouncedModelQuery.value, 30)
  }
  return suggestAiModels(searchableModels.value, getRecentAiModelIds(), 12)
})

function reasoningOptions(model) {
  if (model?.reasoningCapability !== 'SUPPORTED' || !model?.reasoningEfforts) return []
  return String(model.reasoningEfforts).split(',').map(item => item.trim()).filter(Boolean)
}

function effortLabel(value) {
  const labels = { minimal: 'Minimal', low: 'Low', medium: 'Medium', high: 'High', xhigh: 'XHigh' }
  return labels[value] || value
}

function clearDiscoveredModels() {
  discoveredCodes.value = []
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
    const res = await saveAiProvider({ ...form, token: form.token || undefined })
    Object.assign(provider, res.data || {})
    form.token = ''
    ElMessage.success('AI 服务配置已保存')
  } finally {
    saving.value = false
  }
}

async function testConnection() {
  await providerRef.value.validate()
  testing.value = true
  try {
    const res = await testAiProvider({ ...form, token: form.token || undefined })
    discoveredCodes.value = Array.isArray(res.data) ? res.data : []
    ElMessage.success(`连接成功，发现 ${discoveredCodes.value.length} 个模型；现在可以直接搜索`)
  } finally {
    testing.value = false
  }
}

async function syncModels() {
  syncing.value = true
  try {
    const res = await syncAiModels()
    models.value = res.data || []
    discoveredCodes.value = []
    ElMessage.success(`已同步 ${models.value.length} 个模型`)
  } finally {
    syncing.value = false
  }
}

async function changeEnabled(row, enabled) {
  await setAiModelEnabled(row.modelId, enabled)
  await loadModels()
}

async function makeDefault(row) {
  await setDefaultAiModel(row.modelId)
  await loadModels()
  ElMessage.success('默认模型已更新')
}

async function testChat(row) {
  const res = await testAiModelChat(row.modelId)
  ElMessage.success(`模型响应：${res.data || '成功'}`)
}

async function testTools(row) {
  const res = await testAiModelTools(row.modelId)
  await loadModels()
  ElMessage.success(`Tool Calling：${res.data}`)
}

async function testReasoning(row) {
  const res = await testAiModelReasoning(row.modelId)
  await loadModels()
  ElMessage.success(`已验证思考档位：${res.data}`)
}

async function changeDefaultReasoning(row, value) {
  await setDefaultAiReasoning(row.modelId, value || null)
  await loadModels()
  ElMessage.success('默认思考档位已更新')
}

onMounted(async () => {
  await loadProvider()
  await loadModels()
})
</script>

<style scoped>
.card-header { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.model-header-actions { display: flex; align-items: center; gap: 8px; }
.reasoning-cell { display: flex; flex-direction: column; gap: 4px; }
.capability-text { color: var(--el-text-color-secondary); font-size: 11px; }
.title { font-size: 16px; font-weight: 600; }
.subtitle { margin-top: 4px; color: var(--el-text-color-secondary); font-size: 13px; }
.token-tip { margin-top: 4px; color: var(--el-text-color-secondary); font-size: 12px; }
.suffix { margin-left: 8px; color: var(--el-text-color-secondary); }
</style>
