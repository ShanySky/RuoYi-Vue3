import router from '@/router'
import useUserStore from '@/store/modules/user'
import {
  RUOYI_SEMANTIC_PAGE_PROTOCOL, isCompleteSemanticPageRuntime, sameSemanticPageRuntime
} from './capabilityProtocol'

let activePage = null
let activeTools = new Map()
let contextGetter = null
let registrationVersion = 0
const pageWaiters = new Set()

function hasPermission(permission) {
  if (!permission) return true
  const permissions = useUserStore().permissions || []
  return permissions.includes('*:*:*') || permissions.includes(permission)
}

function createPageInstanceId(pageId) {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${pageId || 'page'}:${random}`
}

function normalizePath(path) {
  const value = String(path || '').trim()
  if (!value) return ''
  try {
    return router.resolve(value).path
  } catch {
    return value
  }
}

function availablePages() {
  const current = router.currentRoute.value
  const unique = new Map()
  for (const route of router.getRoutes()) {
    const path = route.path
    if (!path || path.includes(':') || path.includes('*') || path === current.path) continue
    const title = route.meta?.title
    if (!title) continue
    if (!unique.has(path)) unique.set(path, { path, title })
  }
  return [...unique.values()].sort((a, b) => a.path.localeCompare(b.path))
}

function notifyPageRegistered() {
  for (const resolve of [...pageWaiters]) resolve()
  pageWaiters.clear()
}

function waitForPageRegistration(previousInstanceId, targetPath, timeout = 8000) {
  const normalizedTarget = normalizePath(targetPath)
  if (activePage?.instanceId !== previousInstanceId && normalizePath(activePage?.route) === normalizedTarget) {
    return Promise.resolve(activePage)
  }
  return new Promise((resolve, reject) => {
    let timer
    const check = () => {
      if (activePage?.instanceId !== previousInstanceId && normalizePath(activePage?.route) === normalizedTarget) {
        cleanup()
        resolve(activePage)
      }
    }
    const wake = () => check()
    const cleanup = () => {
      clearTimeout(timer)
      pageWaiters.delete(wake)
    }
    pageWaiters.add(wake)
    timer = setTimeout(() => {
      cleanup()
      reject(new Error(`目标页面已打开，但 AI 页面能力未在 ${timeout / 1000} 秒内就绪：${normalizedTarget}`))
    }, timeout)
    check()
  })
}

function normalizePageRegistration(pageOrId, options = {}) {
  if (pageOrId && typeof pageOrId === 'object') {
    return {
      capabilityProtocol: pageOrId.capabilityProtocol || RUOYI_SEMANTIC_PAGE_PROTOCOL,
      pageId: pageOrId.pageId,
      pageName: options.pageName || pageOrId.pageName || pageOrId.pageId,
      route: options.route || pageOrId.route || router.currentRoute.value.path
    }
  }
  return {
    capabilityProtocol: RUOYI_SEMANTIC_PAGE_PROTOCOL,
    pageId: pageOrId,
    pageName: options.pageName || router.currentRoute.value.meta?.title || pageOrId,
    route: options.route || router.currentRoute.value.path
  }
}

export function registerAiPage(pageOrId, tools, getContext, options = {}) {
  const registration = normalizePageRegistration(pageOrId, options)
  if (!registration.pageId) throw new Error('AI Page Capability 缺少 pageId')
  activePage = {
    capabilityProtocol: registration.capabilityProtocol,
    pageId: registration.pageId,
    pageName: registration.pageName,
    route: registration.route,
    instanceId: createPageInstanceId(registration.pageId),
    version: ++registrationVersion
  }
  activeTools = new Map()
  for (const tool of tools || []) {
    if (!tool?.name || typeof tool.handler !== 'function') continue
    activeTools.set(tool.name, tool)
  }
  contextGetter = typeof getContext === 'function' ? getContext : null
  notifyPageRegistered()
  return activePage
}

export function unregisterAiPage(pageOrId) {
  const pageId = typeof pageOrId === 'object' ? pageOrId?.pageId : pageOrId
  if (activePage?.pageId !== pageId) return
  activePage = null
  activeTools = new Map()
  contextGetter = null
}

export function getCurrentPageRuntime() {
  return activePage ? {
    capabilityProtocol: activePage.capabilityProtocol,
    pageId: activePage.pageId,
    pageName: activePage.pageName,
    route: activePage.route,
    pageInstanceId: activePage.instanceId,
    pageVersion: activePage.version
  } : {
    capabilityProtocol: null,
    pageId: null,
    pageName: router.currentRoute.value.meta?.title || '',
    route: router.currentRoute.value.path,
    pageInstanceId: null,
    pageVersion: null
  }
}

function navigationDefinition() {
  return {
    name: 'app_navigate',
    description: '导航到当前登录用户有权访问的 RuoYi 页面。导航完成后会返回新页面的 AI 能力实例；跨页面任务必须先导航再使用新页面能力。',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '目标页面绝对路径，例如 /system/role' }
      },
      required: ['path'],
      additionalProperties: false
    }
  }
}

export function getFrontendToolDefinitions() {
  const definitions = [...activeTools.values()]
    .filter(tool => hasPermission(tool.requiredPermission))
    .map(tool => ({
      name: tool.name,
      description: tool.description || tool.name,
      inputSchema: (typeof tool.inputSchema === 'function' ? tool.inputSchema() : tool.inputSchema)
        || { type: 'object', properties: {}, additionalProperties: false }
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
  definitions.unshift(navigationDefinition())
  return definitions
}

async function invokeNavigation(args) {
  const path = normalizePath(args?.path)
  if (!path || !path.startsWith('/')) throw new Error('缺少有效的目标页面 path')
  const resolved = router.resolve(path)
  const matched = resolved.matched.filter(item => item.path !== '/:pathMatch(.*)*')
  if (!matched.length || resolved.name == null && resolved.path === path && resolved.matched.some(item => item.path.includes(':pathMatch'))) {
    throw new Error(`当前用户无权访问或不存在页面：${path}`)
  }

  const previousInstanceId = activePage?.instanceId
  await router.push(path)
  if (normalizePath(activePage?.route) !== path || activePage?.instanceId === previousInstanceId) {
    await waitForPageRegistration(previousInstanceId, path)
  }
  return {
    navigated: true,
    ...getCurrentPageRuntime(),
    pageContext: getCurrentPageContext()
  }
}

function assertCurrentPageRuntime(expectedRuntime) {
  const current = getCurrentPageRuntime()
  const expected = expectedRuntime ? { ...expectedRuntime, route: normalizePath(expectedRuntime.route) } : null
  const normalizedCurrent = { ...current, route: normalizePath(current.route) }
  if (!isCompleteSemanticPageRuntime(expected) || !sameSemanticPageRuntime(expected, normalizedCurrent)) {
    throw new Error('页面已经切换或页面能力实例已刷新，旧页面工具已失效')
  }
}

export async function invokeFrontendTool(name, args, expectedRuntime) {
  if (name === 'app_navigate') return await invokeNavigation(args)
  assertCurrentPageRuntime(expectedRuntime)

  const tool = activeTools.get(name)
  if (!tool || !hasPermission(tool.requiredPermission)) {
    throw new Error(`当前页面没有可执行的工具：${name}`)
  }
  return await tool.handler(args || {})
}

export function getCurrentPageContext() {
  const runtime = getCurrentPageRuntime()
  let pageContext = {}
  if (contextGetter) {
    try {
      pageContext = contextGetter() || {}
    } catch (e) {
      console.warn('AI page context failed', e)
      pageContext = { contextError: true }
    }
  }
  return {
    ...runtime,
    ...pageContext,
    availablePages: availablePages()
  }
}

export function useAiPageTools(pageOrId, tools, getContext, options = {}) {
  const activate = () => registerAiPage(pageOrId, tools, getContext, options)
  const deactivate = () => unregisterAiPage(pageOrId)
  onMounted(activate)
  onActivated(activate)
  onDeactivated(deactivate)
  onBeforeUnmount(deactivate)
}
