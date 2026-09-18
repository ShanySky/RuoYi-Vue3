import request from '@/utils/request'

export function getAiPreferences() {
  return request({ url: '/ai/preferences', method: 'get' })
}

export function saveAiPreferences(data) {
  return request({
    url: '/ai/preferences',
    method: 'put',
    data,
    headers: { repeatSubmit: false }
  })
}
