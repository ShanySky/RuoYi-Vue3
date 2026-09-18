export function filterAiModelsByQuery(models, query, limit = 20) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return []

  return [...(models || [])]
    .map(model => {
      const code = String(model?.modelCode || '').toLowerCase()
      const label = String(model?.displayName || model?.modelCode || '').toLowerCase()
      const prefix = code.startsWith(q) || label.startsWith(q)
      const contains = code.includes(q) || label.includes(q)
      return { model, rank: prefix ? 0 : contains ? 1 : 9 }
    })
    .filter(item => item.rank < 9)
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank
      const aLabel = String(a.model?.displayName || a.model?.modelCode || '')
      const bLabel = String(b.model?.displayName || b.model?.modelCode || '')
      return aLabel.localeCompare(bLabel)
    })
    .slice(0, limit)
    .map(item => item.model)
}

export function getRecentAiModelIds() {
  try {
    const value = JSON.parse(localStorage.getItem('ai-recent-models') || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

export function rememberAiModel(modelId) {
  if (modelId == null) return
  const next = [modelId, ...getRecentAiModelIds().filter(id => id !== modelId)].slice(0, 5)
  localStorage.setItem('ai-recent-models', JSON.stringify(next))
}

export function suggestAiModels(models, preferredIds = [], limit = 8) {
  const list = [...(models || [])]
  const result = []
  const seen = new Set()

  const add = model => {
    if (!model || seen.has(model.modelId) || result.length >= limit) return
    seen.add(model.modelId)
    result.push(model)
  }

  list.filter(model => model.defaultModel === '0').forEach(add)
  for (const id of preferredIds || []) add(list.find(model => model.modelId === id))
  list.filter(model => model.enabled === '0').forEach(add)

  // First-time sync may leave every model disabled. Show only a small sample rather
  // than an empty list or the complete catalog.
  list.forEach(add)
  return result.slice(0, limit)
}


export function mergeDiscoveredAiModels(models, discoveredCodes) {
  const result = [...(models || [])]
  const knownCodes = new Set(result.map(model => String(model?.modelCode || '')))

  for (const rawCode of discoveredCodes || []) {
    const code = String(rawCode || '').trim()
    if (!code || knownCodes.has(code)) continue
    knownCodes.add(code)
    result.push({
      modelId: `discovered:${code}`,
      modelCode: code,
      displayName: code,
      enabled: '1',
      defaultModel: '1',
      toolCapability: 'UNKNOWN',
      reasoningCapability: 'UNKNOWN',
      discoveredOnly: true
    })
  }

  return result
}
