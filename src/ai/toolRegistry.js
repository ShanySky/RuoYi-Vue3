import useUserStore from '@/store/modules/user'

let activePage = null
let activeTools = new Map()
let contextGetter = null

function hasPermission(permission) {
  if (!permission) return true
  const permissions = useUserStore().permissions || []
  return permissions.includes('*:*:*') || permissions.includes(permission)
}

export function registerAiPage(pageId, tools, getContext) {
  activePage = pageId
  activeTools = new Map()
  for (const tool of tools || []) {
    if (!tool?.name || typeof tool.handler !== 'function') continue
    activeTools.set(tool.name, tool)
  }
  contextGetter = typeof getContext === 'function' ? getContext : null
}

export function unregisterAiPage(pageId) {
  if (activePage !== pageId) return
  activePage = null
  activeTools = new Map()
  contextGetter = null
}

export function getFrontendToolDefinitions() {
  return [...activeTools.values()]
    .filter(tool => hasPermission(tool.requiredPermission))
    .map(tool => ({
      name: tool.name,
      description: tool.description || tool.name,
      inputSchema: tool.inputSchema || { type: 'object', properties: {}, additionalProperties: false }
    }))
}

export async function invokeFrontendTool(name, args) {
  const tool = activeTools.get(name)
  if (!tool || !hasPermission(tool.requiredPermission)) {
    throw new Error(`当前页面没有可执行的工具：${name}`)
  }
  return await tool.handler(args || {})
}

export function getCurrentPageContext() {
  if (!contextGetter) return { pageId: activePage }
  try {
    return { pageId: activePage, ...(contextGetter() || {}) }
  } catch (e) {
    console.warn('AI page context failed', e)
    return { pageId: activePage, contextError: true }
  }
}

export function useAiPageTools(pageId, tools, getContext) {
  const activate = () => registerAiPage(pageId, tools, getContext)
  const deactivate = () => unregisterAiPage(pageId)
  onMounted(activate)
  onActivated(activate)
  onDeactivated(deactivate)
  onBeforeUnmount(deactivate)
}
