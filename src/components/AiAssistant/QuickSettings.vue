<template>
  <div class="quick-settings">
    <el-scrollbar>
      <div class="settings-section">
        <div class="section-title">AI 服务</div>
        <el-form label-position="top" size="small">
          <el-form-item label="Base URL">
            <el-input v-model="form.baseUrl" placeholder="https://api.example.com/v1" />
          </el-form-item>
          <el-form-item label="Token">
            <el-input
              v-model="form.token"
              type="password"
              show-password
              autocomplete="new-password"
              :placeholder="provider.hasToken ? '已保存 Token；留空不修改' : '请输入 API Token'"
            />
          </el-form-item>
          <div class="compact-row">
            <el-checkbox v-model="form.enabled">启用服务</el-checkbox>
            <el-input-number v-model="form.timeoutSeconds" :min="3" :max="300" controls-position="right" size="small" />
          </div>
          <div class="button-row">
            <el-button type="primary" size="small" :loading="saving" @click="saveProvider">保存</el-button>
            <el-button size="small" :loading="testing" @click="testProvider">测试连接</el-button>
            <el-button size="small" :loading="syncing" :disabled="!provider.providerId" @click="syncModels">同步模型</el-button>
          </div>
        </el-form>
      </div>

      <el-divider />

      <div class="settings-section">
        <div class="section-title-row">
          <div class="section-title">模型</div>
          <el-button text size="small" @click="loadModels">刷新</el-button>
        </div>
        <el-input v-model="query" clearable size="small" placeholder="输入 gpt、5.6、sol 等实时匹配" />
        <div class="list-hint">{{ query ? '实时匹配结果' : '默认 / 已启用 / 常用模型' }}</div>

        <div class="model-list" v-loading="modelLoading">
          <div v-for="model in filteredModels" :key="model.modelId" class="model-card">
            <div class="model-top">
              <div class="model-name" :title="model.modelCode">{{ model.displayName || model.modelCode }}</div>
              <el-switch
                :model-value="model.enabled === '0'"
                size="small"
                @change="value => changeEnabled(model, value)"
              />
            </div>
            <div class="model-actions">
              <el-tag v-if="model.defaultModel === '0'" size="small" type="success">默认模型</el-tag>
              <el-button v-else link type="primary" size="small" @click="makeDefault(model)">设为默认</el-button>
              <el-button link size="small" @click="testReasoning(model)">思考能力</el-button>
            </div>
            <div v-if="model.reasoningCapability === 'SUPPORTED'" class="reasoning-row">
              <span>默认档位</span>
              <el-select
                :model-value="model.defaultReasoningEffort || ''"
                size="small"
                style="width: 150px"
                @change="value => changeDefaultReasoning(model, value)"
              >
                <el-option label="Provider 默认" value="" />
                <el-option
                  v-for="effort in reasoningOptions(model)"
                  :key="effort"
                  :label="effortLabel(effort)"
                  :value="effort"
                />
              </el-select>
            </div>
            <div v-else class="capability-note">
              思考档位：{{ model.reasoningCapability === 'UNSUPPORTED' ? '不支持' : '未测试' }}
            </div>
          </div>
          <div v-if="filteredModels.length === 0" class="empty-tip">没有匹配模型。同步后可输入部分名称查找。</div>
        </div>
      </div>
    </el-scrollbar>
  </div>
</template>

<script setup>
import { refDebounced } from '@vueuse/core'
import { ElMessage } from 'element-plus'
import { filterAiModelsByQuery, getRecentAiModelIds, suggestAiModels } from '@/ai/modelSearch'
import {
  getAiProvider, saveAiProvider, testAiProvider, syncAiModels, listAiModels,
  setAiModelEnabled, setDefaultAiModel, setDefaultAiReasoning, testAiModelReasoning
} from '@/api/ai/config'

const emit = defineEmits(['updated'])
const provider = reactive({})
const form = reactive({ name: '默认 AI 服务', baseUrl: '', token: '', enabled: false, timeoutSeconds: 30 })
const models = ref([])
const query = ref('')
const debouncedQuery = refDebounced(query, 180)
const saving = ref(false)
const testing = ref(false)
const syncing = ref(false)
const modelLoading = ref(false)

function modelLabel(model) {
  return model?.displayName || model?.modelCode || ''
}

const filteredModels = computed(() => {
  if (debouncedQuery.value.trim()) {
    return filterAiModelsByQuery(models.value, debouncedQuery.value, 20)
  }

  return suggestAiModels(models.value, getRecentAiModelIds(), 8)
})

function reasoningOptions(model) {
  if (model?.reasoningCapability !== 'SUPPORTED' || !model?.reasoningEfforts) return []
  return String(model.reasoningEfforts).split(',').map(item => item.trim()).filter(Boolean)
}

function effortLabel(value) {
  const labels = { minimal: 'Minimal', low: 'Low', medium: 'Medium', high: 'High', xhigh: 'XHigh' }
  return labels[value] || value
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

async function reload() {
  await Promise.all([loadProvider(), loadModels()])
}

async function saveProvider() {
  if (!form.baseUrl.trim()) {
    ElMessage.warning('请填写 Base URL')
    return
  }
  saving.value = true
  try {
    const res = await saveAiProvider({ ...form, token: form.token || undefined })
    Object.assign(provider, res.data || {})
    form.token = ''
    ElMessage.success('AI 服务配置已保存')
    emit('updated')
  } finally {
    saving.value = false
  }
}

async function testProvider() {
  if (!form.baseUrl.trim()) {
    ElMessage.warning('请填写 Base URL')
    return
  }
  testing.value = true
  try {
    const res = await testAiProvider({ ...form, token: form.token || undefined })
    ElMessage.success(`连接成功，发现 ${Array.isArray(res.data) ? res.data.length : 0} 个模型`)
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
    emit('updated')
  } finally {
    syncing.value = false
  }
}

async function changeEnabled(model, enabled) {
  await setAiModelEnabled(model.modelId, enabled)
  await loadModels()
  emit('updated')
}

async function makeDefault(model) {
  await setDefaultAiModel(model.modelId)
  await loadModels()
  ElMessage.success('默认模型已更新')
  emit('updated')
}

async function testReasoning(model) {
  const res = await testAiModelReasoning(model.modelId)
  await loadModels()
  ElMessage.success(`已验证思考档位：${res.data || 'Provider 默认'}`)
  emit('updated')
}

async function changeDefaultReasoning(model, value) {
  await setDefaultAiReasoning(model.modelId, value || null)
  await loadModels()
  ElMessage.success('默认思考档位已更新')
  emit('updated')
}

onMounted(reload)
defineExpose({ reload })
</script>

<style scoped>
.quick-settings { height: 100%; min-height: 0; }
.settings-section { padding: 2px 4px 8px; }
.section-title { font-weight: 600; font-size: 14px; }
.section-title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.compact-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.button-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.list-hint { margin: 8px 2px 5px; color: var(--el-text-color-secondary); font-size: 12px; }
.model-list { min-height: 80px; }
.model-card { padding: 9px 8px; border-bottom: 1px solid var(--el-border-color-lighter); }
.model-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.model-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
.model-actions { display: flex; align-items: center; gap: 6px; margin-top: 5px; }
.reasoning-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 7px; font-size: 12px; color: var(--el-text-color-secondary); }
.capability-note, .empty-tip { margin-top: 6px; color: var(--el-text-color-secondary); font-size: 12px; }
.empty-tip { padding: 18px 6px; text-align: center; line-height: 1.6; }
</style>
