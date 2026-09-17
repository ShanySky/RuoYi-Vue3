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
          <el-input v-model="form.baseUrl" placeholder="例如：https://api.example.com/v1" />
        </el-form-item>
        <el-form-item label="Token">
          <el-input v-model="form.token" type="password" show-password autocomplete="new-password" :placeholder="provider.hasToken ? '已保存 Token；留空表示不修改' : '请输入 API Token'" />
          <div v-if="provider.hasToken" class="token-tip">已保存：{{ provider.tokenMask }}</div>
        </el-form-item>
        <el-form-item label="超时">
          <el-input-number v-model="form.timeoutSeconds" :min="3" :max="300" />
          <span class="suffix">秒</span>
        </el-form-item>
        <el-form-item label="启用服务">
          <el-switch v-model="form.enabled" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" @click="save">保存</el-button>
          <el-button :loading="testing" @click="testConnection">测试连接</el-button>
          <el-button type="success" :loading="syncing" :disabled="!provider.providerId" @click="syncModels">同步模型</el-button>
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
          <el-button @click="loadModels">刷新</el-button>
        </div>
      </template>

      <el-table :data="models" v-loading="modelLoading">
        <el-table-column prop="modelCode" label="模型" min-width="240" />
        <el-table-column label="Tool Calling" width="140">
          <template #default="scope">
            <el-tag :type="scope.row.toolCapability === 'SUPPORTED' ? 'success' : scope.row.toolCapability === 'UNSUPPORTED' ? 'danger' : 'info'">
              {{ scope.row.toolCapability || 'UNKNOWN' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="启用" width="100" align="center">
          <template #default="scope">
            <el-switch :model-value="scope.row.enabled === '0'" @change="value => changeEnabled(scope.row, value)" />
          </template>
        </el-table-column>
        <el-table-column label="默认" width="120" align="center">
          <template #default="scope">
            <el-tag v-if="scope.row.defaultModel === '0'" type="success">默认</el-tag>
            <el-button v-else link type="primary" @click="makeDefault(scope.row)">设为默认</el-button>
          </template>
        </el-table-column>
        <el-table-column label="测试" width="180" align="center">
          <template #default="scope">
            <el-button link type="primary" :disabled="scope.row.enabled !== '0'" @click="testChat(scope.row)">聊天</el-button>
            <el-button link type="primary" :disabled="scope.row.enabled !== '0'" @click="testTools(scope.row)">工具</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup name="AiConfig">
import { ElMessage } from 'element-plus'
import {
  getAiProvider, saveAiProvider, testAiProvider, syncAiModels, listAiModels,
  setAiModelEnabled, setDefaultAiModel, testAiModelChat, testAiModelTools
} from '@/api/ai/config'

const providerRef = ref(null)
const provider = reactive({})
const form = reactive({ name: '默认 AI 服务', baseUrl: '', token: '', enabled: false, timeoutSeconds: 30 })
const rules = { baseUrl: [{ required: true, message: 'Base URL 不能为空', trigger: 'blur' }] }
const models = ref([])
const saving = ref(false)
const testing = ref(false)
const syncing = ref(false)
const modelLoading = ref(false)

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
    const count = Array.isArray(res.data) ? res.data.length : 0
    ElMessage.success(`连接成功，发现 ${count} 个模型`)
  } finally {
    testing.value = false
  }
}

async function syncModels() {
  syncing.value = true
  try {
    const res = await syncAiModels()
    models.value = res.data || []
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

onMounted(async () => {
  await loadProvider()
  await loadModels()
})
</script>

<style scoped>
.card-header { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.title { font-size: 16px; font-weight: 600; }
.subtitle { margin-top: 4px; color: var(--el-text-color-secondary); font-size: 13px; }
.token-tip { margin-top: 4px; color: var(--el-text-color-secondary); font-size: 12px; }
.suffix { margin-left: 8px; color: var(--el-text-color-secondary); }
</style>
