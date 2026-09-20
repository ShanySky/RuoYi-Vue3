import request from '@/utils/request'

export function listServerApiPolicies() {
  return request({ url: '/ai/admin/apis', method: 'get' })
}

export function setServerApiPolicy(id, fingerprint, enabled) {
  return request({
    url: `/ai/admin/apis/${encodeURIComponent(id)}`,
    method: 'put',
    data: { fingerprint, enabled },
    headers: { repeatSubmit: false }
  })
}
