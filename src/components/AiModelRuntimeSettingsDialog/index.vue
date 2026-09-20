<template>
  <el-dialog
    :model-value="modelValue"
    :title="`${modelLabel} · 高级设置`"
    width="560px"
    append-to-body
    destroy-on-close
    @update:model-value="value => emit('update:modelValue', value)"
    @open="resetForm"
  >
    <el-alert
      type="info"
      :closable="false"
      show-icon
      class="runtime-tip"
      title="Agent 工作上下文预算是 RuoYi Agent Runtime 的运行预算，不等同于 Provider 模型的物理最大上下文。"
    />

    <el-form label-position="top" class="runtime-form">
      <el-form-item label="Agent 工作上下文预算">
        <div class="runtime-mode">
          <el-radio-group v-model="runtimeMode">
            <el-radio-button value="recommended">自动（推荐）</el-radio-button>
            <el-radio-button value="custom">自定义</el-radio-button>
          </el-radio-group>
          <span class="field-tip">推荐值与当前后端运行时默认保持一致。</span>
        </div>
      </el-form-item>

      <div v-if="runtimeMode === 'recommended'" class="recommended-summary" data-testid="ai-runtime-recommended-summary">
        <div><strong>64K tokens</strong><span>Agent 工作预算</span></div>
        <div><strong>自动</strong><span>上下文压缩</span></div>
        <div><strong>75%</strong><span>压缩阈值</span></div>
      </div>

      <template v-else>
        <div class="runtime-grid" data-testid="ai-runtime-custom-settings">
          <el-form-item label="Agent 工作上下文预算">
            <el-input-number v-model="form.contextWindowK" :min="8" :max="2000" :step="8" controls-position="right" />
            <span class="unit">K tokens</span>
          </el-form-item>

          <el-form-item label="自动压缩阈值">
            <el-input-number v-model="form.compactionThresholdPercent" :min="50" :max="95" :step="5" controls-position="right" />
            <span class="unit">%</span>
          </el-form-item>
        </div>

        <el-form-item label="自动上下文压缩">
          <div class="switch-line">
            <el-switch v-model="form.autoCompaction" />
            <span class="field-tip">
              达到阈值后生成 Checkpoint，并在安全边界自动继续当前任务。
            </span>
          </div>
        </el-form-item>

        <el-button link type="primary" data-testid="ai-runtime-restore-recommended" @click="restoreRecommended">
          恢复推荐设置
        </el-button>
      </template>

      <el-form-item label="默认思考档位" class="reasoning-item">
        <el-select
          v-if="model?.reasoningCapability === 'SUPPORTED'"
          v-model="form.defaultReasoningEffort"
          clearable
          placeholder="Provider 默认"
          class="reasoning-select"
        >
          <el-option label="Provider 默认" value="" />
          <el-option
            v-for="effort in reasoningOptions"
            :key="effort"
            :label="effortLabel(effort)"
            :value="effort"
          />
        </el-select>
        <el-tag v-else size="small" type="info" effect="plain">当前模型不支持或尚未确认思考档位</el-tag>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="save">保存设置</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ElMessage } from 'element-plus'
import { setAiModelRuntimeSettings, setDefaultAiReasoning } from '@/api/ai/config'
import {
  AI_RECOMMENDED_MODEL_RUNTIME_SETTINGS,
  isRecommendedModelRuntimeSettings,
  recommendedRuntimeSettingsPayload,
  runtimeSettingsFromModel
} from '@/ai/modelRuntimeSettings'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  model: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue', 'saved'])
const saving = ref(false)
const runtimeMode = ref('recommended')
const form = reactive({
  contextWindowK: 64,
  autoCompaction: true,
  compactionThresholdPercent: 75,
  defaultReasoningEffort: ''
})

const modelLabel = computed(() => props.model?.displayName || props.model?.modelCode || '模型')
const reasoningOptions = computed(() => {
  if (props.model?.reasoningCapability !== 'SUPPORTED' || !props.model?.reasoningEfforts) return []
  return String(props.model.reasoningEfforts).split(',').map(item => item.trim()).filter(Boolean)
})

function effortLabel(value) {
  const labels = { none: '无', minimal: '最低', low: '低', medium: '中', high: '高', xhigh: '极高', max: '最高' }
  return labels[value] || value
}

function applyRuntimeSettings(value) {
  form.contextWindowK = Math.max(8, Math.round(Number(value.contextWindowTokens) / 1024))
  form.autoCompaction = !!value.autoCompaction
  form.compactionThresholdPercent = Number(value.compactionThresholdPercent)
}

function resetForm() {
  applyRuntimeSettings(runtimeSettingsFromModel(props.model))
  runtimeMode.value = isRecommendedModelRuntimeSettings(props.model) ? 'recommended' : 'custom'
  form.defaultReasoningEffort = props.model?.defaultReasoningEffort || ''
}

function restoreRecommended() {
  applyRuntimeSettings(AI_RECOMMENDED_MODEL_RUNTIME_SETTINGS)
  runtimeMode.value = 'recommended'
}

async function save() {
  if (!props.model?.modelId) return
  saving.value = true
  try {
    const runtimePayload = runtimeMode.value === 'recommended'
      ? recommendedRuntimeSettingsPayload()
      : {
          contextWindowTokens: Math.round(form.contextWindowK * 1024),
          autoCompaction: !!form.autoCompaction,
          compactionThresholdPercent: form.compactionThresholdPercent
        }
    await setAiModelRuntimeSettings(props.model.modelId, runtimePayload)
    if (props.model.reasoningCapability === 'SUPPORTED') {
      await setDefaultAiReasoning(props.model.modelId, form.defaultReasoningEffort || null)
    }
    ElMessage.success({ message: '模型高级设置已保存', duration: 2200 })
    emit('saved')
    emit('update:modelValue', false)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.runtime-tip { margin-bottom: 16px; }
.runtime-form { padding-top: 2px; }
.runtime-mode { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
.recommended-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 18px;
}
.recommended-summary > div {
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-light);
}
.recommended-summary strong,
.recommended-summary span { display: block; }
.recommended-summary strong { font-size: 14px; margin-bottom: 4px; }
.recommended-summary span { color: var(--el-text-color-secondary); font-size: 12px; }
.runtime-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.runtime-grid :deep(.el-input-number) { width: 150px; }
.unit { margin-left: 8px; color: var(--el-text-color-secondary); font-size: 12px; }
.switch-line { display: flex; align-items: center; gap: 10px; }
.field-tip { color: var(--el-text-color-secondary); font-size: 12px; line-height: 1.5; }
.reasoning-item { margin-top: 18px; }
.reasoning-select { width: 220px; }
@media (max-width: 640px) {
  .runtime-grid,
  .recommended-summary { grid-template-columns: 1fr; gap: 0; }
  .recommended-summary { gap: 8px; }
}
</style>
