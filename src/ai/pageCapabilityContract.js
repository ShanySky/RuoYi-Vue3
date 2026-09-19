import { RUOYI_SEMANTIC_PAGE_PROTOCOL } from './capabilityProtocol.js'

function requireText(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Page Capability Contract 缺少 ${name}`)
  return value.trim()
}

function normalizeFields(fields = [], group) {
  const seen = new Set()
  return fields.map(field => {
    if (!field || typeof field !== 'object') throw new Error(`${group} 字段声明无效`)
    const key = requireText(field.key, `${group}.key`)
    if (seen.has(key)) throw new Error(`${group} 存在重复字段：${key}`)
    seen.add(key)
    return Object.freeze({ ...field, key })
  })
}

function normalizeActions(actions = []) {
  const seen = new Set()
  return actions.map(action => {
    if (!action || typeof action !== 'object') throw new Error('Action 声明无效')
    const suffix = requireText(action.suffix, 'actions.suffix')
    if (!/^[a-z0-9_]+$/.test(suffix)) throw new Error(`Action suffix 无效：${suffix}`)
    if (seen.has(suffix)) throw new Error(`Action suffix 重复：${suffix}`)
    seen.add(suffix)
    return Object.freeze({ ...action, suffix })
  })
}

export function definePageCapabilityContract(definition) {
  if (!definition || typeof definition !== 'object') throw new Error('Page Capability Contract 不能为空')
  const pageId = requireText(definition.pageId, 'pageId')
  const pageName = requireText(definition.pageName, 'pageName')
  const route = requireText(definition.route, 'route')
  const toolPrefix = requireText(definition.toolPrefix, 'toolPrefix')
  if (!route.startsWith('/')) throw new Error('Page Capability Contract route 必须为绝对路径')
  if (!toolPrefix.startsWith('page_')) throw new Error('Page Capability Contract toolPrefix 必须以 page_ 开头')

  const normalized = {
    capabilityProtocol: RUOYI_SEMANTIC_PAGE_PROTOCOL,
    pageId,
    pageName,
    route,
    toolPrefix,
    queryFields: Object.freeze(normalizeFields(definition.queryFields, 'queryFields')),
    formFields: Object.freeze(normalizeFields(definition.formFields, 'formFields')),
    query: definition.query ? Object.freeze({ ...definition.query }) : undefined,
    form: definition.form ? Object.freeze({ ...definition.form }) : undefined,
    actions: Object.freeze(normalizeActions(definition.actions))
  }
  return Object.freeze(normalized)
}
