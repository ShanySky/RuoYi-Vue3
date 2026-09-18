import request from '@/utils/request'

export function listAiPageConfigs() { return request({ url: '/ai/admin/pages', method: 'get' }) }
export function setAiPageEnabled(pageId, enabled) { return request({ url: `/ai/admin/pages/${pageId}/enabled`, method: 'put', data: { enabled }, headers: { repeatSubmit: false } }) }
export function getAiConversationPolicy() { return request({ url: '/ai/admin/policy', method: 'get' }) }
export function saveAiConversationPolicy(data) { return request({ url: '/ai/admin/policy', method: 'put', data, headers: { repeatSubmit: false } }) }
export function cleanupAiConversations() { return request({ url: '/ai/admin/policy/cleanup', method: 'post', headers: { repeatSubmit: false } }) }
export function listAiConversationAudit(params) { return request({ url: '/ai/admin/audit', method: 'get', params }) }
export function getAiConversationAudit(id) { return request({ url: `/ai/admin/audit/${id}`, method: 'get' }) }
