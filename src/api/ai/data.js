import request from '@/utils/request'

export function listDataPolicies() {
  return request({ url: '/ai/admin/data', method: 'get' })
}

export function setDataPolicy(key, data) {
  return request({ url: `/ai/admin/data/${encodeURIComponent(key)}`, method: 'put', data, headers: { repeatSubmit: false } })
}
