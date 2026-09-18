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
      title="上下文窗口是 RuoYi Agent Runtime 的工作预算，不等同于 Provider 模型的物理最大上下文。"
    />

    <el-form label-position="top" class="runtime-form">
      <div class="runtime-grid">
        <el-form-item label="工作上下文窗口">
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

      <el-form-item label="默认思考档位">
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

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  model: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue', 'saved'])
const saving = ref(false)
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

function resetForm() {
  const tokens = Number(props.model?.contextWindowTokens || 65536)
  form.contextWindowK = Math.max(8, Math.round(tokens / 1024))
  form.autoCompaction = props.model?.autoCompaction !== '1'
  form.compactionThresholdPercent = Number(props.model?.compactionThresholdPercent || 75)
  form.defaultReasoningEffort = props.model?.defaultReasoningEffort || ''
}

async function save() {
  if (!props.model?.modelId) return
  saving.value = true
  try {
    await setAiModelRuntimeSettings(props.model.modelId, {
      contextWindowTokens: Math.round(form.contextWindowK * 1024),
      autoCompaction: !!form.autoCompaction,
      compactionThresholdPercent: form.compactionThresholdPercent
    })
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
.runtime-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.runtime-grid :deep(.el-input-number) { width: 150px; }
.unit { margin-left: 8px; color: var(--el-text-color-secondary); font-size: 12px; }
.switch-line { display: flex; align-items: center; gap: 10px; }
.field-tip { color: var(--el-text-color-secondary); font-size: 12px; line-height: 1.5; }
.reasoning-select { width: 220px; }
@media (max-width: 640px) {
  .runtime-grid { grid-template-columns: 1fr; gap: 0; }
}
</style>
