export const RUOYI_SEMANTIC_PAGE_PROTOCOL = 'ruoyi-semantic-page-v1'

function validText(value, maxLength) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength
}

export function isCompleteSemanticPageRuntime(runtime) {
  return !!runtime
    && runtime.capabilityProtocol === RUOYI_SEMANTIC_PAGE_PROTOCOL
    && validText(runtime.pageId, 128)
    && validText(runtime.route, 255)
    && runtime.route.startsWith('/')
    && validText(runtime.pageInstanceId, 64)
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


export function shouldPreserveToolExecutionRuntime(sourceRuntime, currentRuntime, toolName, success, result) {
  if (!success || toolName === 'app_navigate' || result?.navigated !== true
    || !isCompleteSemanticPageRuntime(sourceRuntime)) return false
  return !sameSemanticPageRuntime(sourceRuntime, currentRuntime)
}
