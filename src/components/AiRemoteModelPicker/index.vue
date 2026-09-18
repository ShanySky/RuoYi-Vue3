<template>
  <el-dialog
    :model-value="modelValue"
    width="min(760px, calc(100vw - 32px))"
    top="8vh"
    append-to-body
    class="ai-remote-model-dialog"
    @close="close"
  >
    <template #header>
      <div class="dialog-heading">
        <div>
          <div class="dialog-title">选择要加入系统的模型</div>
          <div class="dialog-subtitle">远端目录只用于选择；确认后，只有勾选的模型才会加入系统。</div>
        </div>
        <el-tag size="small" type="info" effect="plain">{{ remoteModels.length }} 个远端模型</el-tag>
      </div>
    </template>

    <div class="picker-toolbar">
      <el-input
        v-model="query"
        clearable
        :prefix-icon="Search"
        placeholder="输入 gpt、5.6、sol、deepseek 等实时筛选"
      />
      <el-button :loading="refreshing" @click="$emit('refresh')">
        <el-icon><Refresh /></el-icon>
        刷新远端模型
      </el-button>
    </div>

    <div class="picker-summary">
      <span>{{ query.trim() ? '匹配 ' + filteredModels.length + ' 个' : '当前显示 ' + filteredModels.length + ' 个' }}</span>
      <span v-if="selectedCodes.length">已选择 {{ selectedCodes.length }} 个</span>
    </div>

    <el-scrollbar class="model-scroll">
      <div v-if="filteredModels.length" class="remote-model-list">
        <label
          v-for="model in filteredModels"
          :key="model.modelCode"
          :class="['remote-model-row', { existing: model.existing }]"
        >
          <el-checkbox
            :model-value="selectedCodes.includes(model.modelCode)"
            :disabled="model.existing"
            @change="value => toggle(model.modelCode, value)"
          />
          <div class="remote-model-main">
            <div class="remote-model-name">{{ model.modelCode }}</div>
            <div class="remote-model-meta">{{ familyLabel(model.modelCode) }}</div>
          </div>
          <el-tag v-if="model.existing" size="small" type="success" effect="plain">已在系统中</el-tag>
          <el-tag v-else size="small" type="info" effect="plain">可添加</el-tag>
        </label>
      </div>
      <el-empty v-else :image-size="72" description="没有匹配的远端模型" />
    </el-scrollbar>

    <template #footer>
      <div class="dialog-footer">
        <div class="footer-note">
          <el-icon><InfoFilled /></el-icon>
          添加后会自动检测 Tool Calling 与思考档位。
        </div>
        <div class="footer-actions">
          <el-button @click="close">取消</el-button>
          <el-button type="primary" :loading="adding" :disabled="!selectedCodes.length" @click="confirm">
            添加所选模型
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { refDebounced } from '@vueuse/core'
import { InfoFilled, Refresh, Search } from '@element-plus/icons-vue'
import { filterAiModelsByQuery } from '@/ai/modelSearch'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  remoteModels: { type: Array, default: () => [] },
  systemModels: { type: Array, default: () => [] },
  refreshing: { type: Boolean, default: false },
  adding: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue', 'refresh', 'confirm'])

const query = ref('')
const debouncedQuery = refDebounced(query, 180)
const selectedCodes = ref([])

const existingCodes = computed(() => new Set(props.systemModels.map(item => String(item.modelCode || ''))))
const normalizedModels = computed(() => props.remoteModels.map(code => ({
  modelCode: String(code),
  displayName: String(code),
  existing: existingCodes.value.has(String(code))
})))

const filteredModels = computed(() => {
  if (!debouncedQuery.value.trim()) return normalizedModels.value.slice(0, 80)
  return filterAiModelsByQuery(normalizedModels.value, debouncedQuery.value, 80)
})

function familyLabel(code) {
  const value = String(code || '').toLowerCase()
  if (value.startsWith('gpt') || value.startsWith('o')) return 'OpenAI-compatible · GPT / o 系列'
  if (value.includes('deepseek')) return 'OpenAI-compatible · DeepSeek 系列'
  if (value.includes('claude')) return 'OpenAI-compatible · Claude 系列'
  if (value.includes('gemini')) return 'OpenAI-compatible · Gemini 系列'
  return 'OpenAI-compatible 模型'
}

function toggle(code, value) {
  if (value) {
    if (!selectedCodes.value.includes(code)) selectedCodes.value.push(code)
    return
  }
  selectedCodes.value = selectedCodes.value.filter(item => item !== code)
}

function close() {
  emit('update:modelValue', false)
}

function confirm() {
  emit('confirm', [...selectedCodes.value])
}

watch(() => props.modelValue, visible => {
  if (!visible) {
    query.value = ''
    selectedCodes.value = []
  }
})
</script>

<style scoped>
.dialog-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding-right: 22px; }
.dialog-title { color: var(--el-text-color-primary); font-size: 16px; font-weight: 600; line-height: 1.45; }
.dialog-subtitle { margin-top: 4px; color: var(--el-text-color-secondary); font-size: 12px; line-height: 1.6; }
.picker-toolbar { display: flex; align-items: center; gap: 10px; }
.picker-toolbar :deep(.el-input) { flex: 1; }
.picker-summary { display: flex; justify-content: space-between; padding: 11px 2px 7px; color: var(--el-text-color-secondary); font-size: 12px; }
.model-scroll { height: min(430px, 54vh); border: 1px solid var(--el-border-color-lighter); border-radius: 8px; }
.remote-model-list { padding: 4px; }
.remote-model-row {
  display: flex; align-items: center; gap: 12px; min-height: 58px; padding: 9px 12px;
  border-radius: 6px; cursor: pointer; transition: background-color .15s ease;
}
.remote-model-row:hover { background: var(--el-fill-color-light); }
.remote-model-row.existing { cursor: default; }
.remote-model-main { flex: 1; min-width: 0; }
.remote-model-name { overflow: hidden; color: var(--el-text-color-primary); font-size: 13px; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
.remote-model-meta { margin-top: 3px; color: var(--el-text-color-secondary); font-size: 11px; }
.dialog-footer { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.footer-note { display: flex; align-items: center; gap: 5px; color: var(--el-text-color-secondary); font-size: 12px; }
.footer-actions { display: flex; gap: 8px; }
@media (max-width: 680px) {
  .picker-toolbar, .dialog-footer { align-items: stretch; flex-direction: column; }
  .footer-actions { justify-content: flex-end; }
}
</style>
