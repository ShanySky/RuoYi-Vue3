export const RUOYI_SEMANTIC_PAGE_PROTOCOL = 'ruoyi-semantic-page-v1'

function present(value) {
  return typeof value === 'string' ? value.trim().length > 0 : value !== null && value !== undefined
}

export function isCompleteSemanticPageRuntime(runtime) {
  return !!runtime
    && runtime.capabilityProtocol === RUOYI_SEMANTIC_PAGE_PROTOCOL
    && present(runtime.pageId)
    && present(runtime.route)
    && present(runtime.pageInstanceId)
    && Number.isInteger(Number(runtime.pageVersion))
    && Number(runtime.pageVersion) > 0
}

export function sameSemanticPageRuntime(expected, current) {
  if (!isCompleteSemanticPageRuntime(expected) || !isCompleteSemanticPageRuntime(current)) return false
  return expected.capabilityProtocol === current.capabilityProtocol
    && expected.pageId === current.pageId
    && expected.route === current.route
    && expected.pageInstanceId === current.pageInstanceId
    && Number(expected.pageVersion) === Number(current.pageVersion)
}
