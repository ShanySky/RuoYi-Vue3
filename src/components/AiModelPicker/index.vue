<template>
  <el-popover v-model:visible="visible" placement="top-start" :width="340" trigger="click" popper-class="ai-model-picker-popper">
    <template #reference>
      <el-button data-testid="ai-model-picker-trigger" class="model-trigger" text :disabled="disabled">
        <span class="model-trigger-label">{{ selectedLabel }}</span>
        <el-icon class="model-trigger-arrow"><ArrowDown /></el-icon>
      </el-button>
    </template>

    <div class="picker">
      <template v-if="advancedModel">
        <button class="back-button" type="button" @click="advancedModel = null">← 返回模型</button>
        <div class="advanced-title">{{ modelLabel(advancedModel) }}</div>
        <div class="advanced-subtitle">思考档位</div>
        <button
          type="button"
          :class="['effort-row', { active: !reasoningEffort }]"
          @click="chooseEffort(null)"
        >
          <span>Provider 默认</span>
          <span v-if="!reasoningEffort">✓</span>
        </button>
        <button
          v-for="effort in reasoningOptions(advancedModel)"
          :key="effort"
          type="button"
          :class="['effort-row', { active: reasoningEffort === effort && modelValue === advancedModel.modelId }]"
          @click="chooseEffort(effort)"
        >
          <span>{{ effortLabel(effort) }}</span>
          <span v-if="reasoningEffort === effort && modelValue === advancedModel.modelId">✓</span>
        </button>
        <div v-if="reasoningOptions(advancedModel).length === 0" class="capability-tip">
          该模型尚未验证思考档位，请在 AI 配置中先运行“思考”能力测试。
        </div>
      </template>

      <template v-else>
        <el-input v-model="query" clearable size="small" placeholder="输入模型名称，如 gpt、5.6、sol" />
        <div class="picker-hint">{{ query ? '实时匹配结果' : '默认 / 最近 / 常用模型' }}</div>
        <div class="model-list">
          <div
            v-for="model in visibleModels"
            :key="model.modelId"
            :class="['model-row', { selected: model.modelId === modelValue }]"
          >
            <button class="model-main" type="button" @click="chooseModel(model)">
              <span class="model-name">{{ modelLabel(model) }}</span>
              <span class="model-meta">
                <span v-if="model.defaultModel === '0'" class="default-mark">默认</span>
                <span v-if="model.modelId === modelValue">✓</span>
              </span>
            </button>
            <button
              v-if="model.reasoningCapability === 'SUPPORTED'"
              class="advanced-button"
              type="button"
              title="思考档位"
              @click.stop="openAdvanced(model)"
            >
              档位 ›
            </button>
          </div>
          <div v-if="visibleModels.length === 0" class="empty-result">没有匹配的已启用模型</div>
        </div>
      </template>
    </div>
  </el-popover>
</template>

<script setup>
import { refDebounced } from '@vueuse/core'
import { ArrowDown } from '@element-plus/icons-vue'
import { filterAiModelsByQuery, getRecentAiModelIds, rememberAiModel, suggestAiModels } from '@/ai/modelSearch'

const props = defineProps({
  models: { type: Array, default: () => [] },
  modelValue: { type: [Number, String], default: undefined },
  reasoningEffort: { type: String, default: null },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'update:reasoningEffort'])
const visible = ref(false)
const query = ref('')
const debouncedQuery = refDebounced(query, 180)
const advancedModel = ref(null)

const selectedModel = computed(() => props.models.find(item => item.modelId === props.modelValue))
const selectedLabel = computed(() => selectedModel.value ? modelLabel(selectedModel.value) : '选择模型')

function modelLabel(model) {
  return model?.displayName || model?.modelCode || '未命名模型'
}

const visibleModels = computed(() => {
  const list = [...props.models]
  if (debouncedQuery.value.trim()) {
    return filterAiModelsByQuery(list, debouncedQuery.value, 20)
  }

  return suggestAiModels(list, [props.modelValue, ...getRecentAiModelIds()], 7)
})

function reasoningOptions(model) {
  if (model?.reasoningCapability !== 'SUPPORTED' || !model?.reasoningEfforts) return []
  return String(model.reasoningEfforts).split(',').map(item => item.trim()).filter(Boolean)
}

function effortLabel(value) {
  const labels = { none: '无', minimal: '最低', low: '低', medium: '中', high: '高', xhigh: '极高', max: '最高' }
  return labels[value] || value
}

function chooseModel(model) {
  emit('update:modelValue', model.modelId)
  emit('update:reasoningEffort', model.defaultReasoningEffort || null)
  rememberAiModel(model.modelId)
  visible.value = false
  query.value = ''
  advancedModel.value = null
}

function openAdvanced(model) {
  advancedModel.value = model
}

function chooseEffort(effort) {
  emit('update:modelValue', advancedModel.value.modelId)
  emit('update:reasoningEffort', effort)
  rememberAiModel(advancedModel.value.modelId)
  visible.value = false
  query.value = ''
  advancedModel.value = null
}

watch(visible, value => {
  if (!value) {
    query.value = ''
    advancedModel.value = null
  }
})
</script>

<style scoped>
.model-trigger { max-width: 210px; padding: 4px 6px; }
.model-trigger-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
.model-trigger-arrow { width: 13px; margin-left: 5px; color: var(--el-text-color-secondary); font-size: 13px; }
.picker { min-height: 120px; }
.picker-hint, .advanced-subtitle { margin: 9px 2px 6px; color: var(--el-text-color-secondary); font-size: 12px; }
.model-list { max-height: 310px; overflow-y: auto; }
.model-row { display: flex; align-items: center; border-radius: 7px; margin: 2px 0; }
.model-row:hover, .model-row.selected { background: var(--el-fill-color-light); }
.model-main { flex: 1; min-width: 0; display: flex; justify-content: space-between; gap: 8px; border: 0; background: transparent; padding: 8px; cursor: pointer; text-align: left; color: var(--el-text-color-primary); }
.model-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.model-meta { display: flex; gap: 6px; flex-shrink: 0; }
.default-mark { color: var(--el-color-success); font-size: 11px; }
.advanced-button, .back-button, .effort-row { border: 0; background: transparent; cursor: pointer; color: var(--el-text-color-primary); }
.advanced-button { padding: 7px; font-size: 12px; color: var(--el-text-color-secondary); }
.back-button { padding: 0 0 8px; color: var(--el-color-primary); }
.advanced-title { font-weight: 600; margin-bottom: 4px; }
.effort-row { width: 100%; display: flex; justify-content: space-between; padding: 9px 8px; border-radius: 7px; text-align: left; }
.effort-row:hover, .effort-row.active { background: var(--el-fill-color-light); }
.capability-tip, .empty-result { color: var(--el-text-color-secondary); font-size: 12px; padding: 14px 8px; line-height: 1.6; }
</style>
