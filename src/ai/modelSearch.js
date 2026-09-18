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
