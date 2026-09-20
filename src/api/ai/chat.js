import request from '@/utils/request'

export function sendAiTurn(data, options = {}) {
  return request({
    url: '/ai/chat/turn',
    method: 'post',
    data,
    timeout: 120000,
    headers: { repeatSubmit: false },
    signal: options.signal
  })
}

export function confirmAiServerTool(conversationId, callId, approved, options = {}) {
  return request({
    url: `/ai/chat/conversations/${conversationId}/server-tools/${encodeURIComponent(callId)}/confirm`,
    method: 'post',
    data: { approved },
    timeout: 45000,
    headers: { repeatSubmit: false },
    signal: options.signal
  })
}

export function createAiConversation(data = {}) {
  return request({
    url: '/ai/chat/conversations',
    method: 'post',
    data,
    headers: { repeatSubmit: false }
  })
}

export function cancelAiRunByClientKey(clientRunKey, reason = 'USER_STOP') {
  return request({
    url: `/ai/chat/runs/client/${encodeURIComponent(clientRunKey)}/cancel`,
    method: 'post',
    data: { reason },
    headers: { repeatSubmit: false }
  })
}

export function cancelAiRun(runId, reason = 'USER_STOP') {
  return request({
    url: `/ai/chat/runs/${runId}/cancel`,
    method: 'post',
    data: { reason },
    headers: { repeatSubmit: false }
  })
}

export function cancelAllAiRuns(reason = 'USER_LOGOUT') {
  return request({
    url: '/ai/chat/runs/cancel-all',
    method: 'post',
    data: { reason },
    headers: { repeatSubmit: false }
  })
}

export function getAiRun(runId) {
  return request({ url: `/ai/chat/runs/${runId}`, method: 'get' })
}

export function listAiConversations(keyword) {
  return request({ url: '/ai/chat/conversations', method: 'get', params: { keyword: keyword || undefined } })
}

export function getLastAiConversation() {
  return request({ url: '/ai/chat/conversations/last', method: 'get' })
}

export function getAiConversation(conversationId) {
  return request({ url: `/ai/chat/conversations/${conversationId}`, method: 'get' })
}

export function renameAiConversation(conversationId, title) {
  return request({
    url: `/ai/chat/conversations/${conversationId}/title`,
    method: 'put',
    data: { title },
    headers: { repeatSubmit: false }
  })
}

export function archiveAiConversation(conversationId) {
  return request({
    url: `/ai/chat/conversations/${conversationId}/archive`,
    method: 'put',
    headers: { repeatSubmit: false }
  })
}

export function deleteAiConversation(conversationId) {
  return request({
    url: `/ai/chat/conversations/${conversationId}`,
    method: 'delete',
    headers: { repeatSubmit: false }
  })
}
