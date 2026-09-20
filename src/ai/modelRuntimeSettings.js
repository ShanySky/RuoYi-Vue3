export const AI_RECOMMENDED_MODEL_RUNTIME_SETTINGS = Object.freeze({
  contextWindowTokens: 65536,
  autoCompaction: true,
  compactionThresholdPercent: 75
})

export function runtimeSettingsFromModel(model = {}) {
  return {
    contextWindowTokens: Number(model?.contextWindowTokens || AI_RECOMMENDED_MODEL_RUNTIME_SETTINGS.contextWindowTokens),
    autoCompaction: model?.autoCompaction !== '1',
    compactionThresholdPercent: Number(
      model?.compactionThresholdPercent || AI_RECOMMENDED_MODEL_RUNTIME_SETTINGS.compactionThresholdPercent
    )
  }
}

export function isRecommendedModelRuntimeSettings(model = {}) {
  const value = runtimeSettingsFromModel(model)
  return value.contextWindowTokens === AI_RECOMMENDED_MODEL_RUNTIME_SETTINGS.contextWindowTokens
    && value.autoCompaction === AI_RECOMMENDED_MODEL_RUNTIME_SETTINGS.autoCompaction
    && value.compactionThresholdPercent === AI_RECOMMENDED_MODEL_RUNTIME_SETTINGS.compactionThresholdPercent
}

export function recommendedRuntimeSettingsPayload() {
  return { ...AI_RECOMMENDED_MODEL_RUNTIME_SETTINGS }
}
