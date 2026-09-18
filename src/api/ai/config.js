import request from '@/utils/request'

export function getAiProvider() {
  return request({ url: '/ai/config/provider', method: 'get' })
}

export function saveAiProvider(data) {
  return request({ url: '/ai/config/provider', method: 'post', data, headers: { repeatSubmit: false } })
}

export function testAiModelLoad(data) {
  return request({ url: '/ai/config/provider/test-model-load', method: 'post', data, headers: { repeatSubmit: false } })
}

export function discoverAiModels() {
  return request({ url: '/ai/config/models/discover', method: 'post', headers: { repeatSubmit: false } })
}

export function addAiModels(modelCodes) {
  return request({
    url: '/ai/config/models',
    method: 'post',
    data: { modelCodes },
    headers: { repeatSubmit: false }
  })
}

export function removeAiModel(modelId) {
  return request({
    url: `/ai/config/models/${modelId}`,
    method: 'delete',
    headers: { repeatSubmit: false }
  })
}

export function listAiModels() {
  return request({ url: '/ai/config/models', method: 'get' })
}

export function listEnabledAiModels() {
  return request({ url: '/ai/config/models/enabled', method: 'get' })
}

export function setAiModelEnabled(modelId, enabled) {
  return request({ url: `/ai/config/models/${modelId}/enabled`, method: 'put', data: { enabled }, headers: { repeatSubmit: false } })
}

export function setDefaultAiModel(modelId) {
  return request({ url: `/ai/config/models/${modelId}/default`, method: 'put', headers: { repeatSubmit: false } })
}

export function testAiModelChat(modelId) {
  return request({ url: `/ai/config/models/${modelId}/test-chat`, method: 'post', headers: { repeatSubmit: false } })
}

export function testAiModelTools(modelId) {
  return request({ url: `/ai/config/models/${modelId}/test-tools`, method: 'post', headers: { repeatSubmit: false } })
}

export function detectAiModelCapabilities(modelId) {
  return request({
    url: `/ai/config/models/${modelId}/detect-capabilities`,
    method: 'post',
    headers: { repeatSubmit: false }
  })
}

export function setDefaultAiReasoning(modelId, reasoningEffort) {
  return request({
    url: `/ai/config/models/${modelId}/default-reasoning`,
    method: 'put',
    data: { reasoningEffort: reasoningEffort || null },
    headers: { repeatSubmit: false }
  })
}

export function testAiModelReasoning(modelId) {
  return request({
    url: `/ai/config/models/${modelId}/test-reasoning`,
    method: 'post',
    headers: { repeatSubmit: false }
  })
}
