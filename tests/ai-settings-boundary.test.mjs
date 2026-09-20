import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

const quickSettings = readFileSync(resolve(root, 'src/components/AiAssistant/QuickSettings.vue'), 'utf8')
const aiStore = readFileSync(resolve(root, 'src/store/modules/ai.js'), 'utf8')
const aiConfigPage = readFileSync(resolve(root, 'src/views/ai/config/index.vue'), 'utf8')

for (const expected of [
  '我的聊天偏好',
  '聊天字体大小',
  '双击 ESC 中断',
  '发送快捷键',
  '会话历史入口',
  '登录后自动继续上次会话',
  'AI 默认打开方式',
  '我的默认模型',
  '我的默认思考档位',
  'aiStore.loadPreferences()',
  'aiStore.loadModels()'
]) {
  assert.ok(quickSettings.includes(expected), `QuickSettings must keep personal preference capability: ${expected}`)
}

for (const forbidden of [
  'AI 服务连接',
  '系统模型',
  'Base URL',
  'Token',
  '保存连接配置',
  '测试模型加载',
  '选择模型',
  'getAiProvider',
  'saveAiProvider',
  'listAiModels',
  'addAiModels',
  'removeAiModel',
  'setAiModelEnabled',
  'setDefaultAiModel',
  'setDefaultAiReasoning',
  'detectAiModelCapabilities',
  'testAiModelChat',
  'testAiModelLoad',
  'AiRemoteModelPicker',
  'AiModelRuntimeSettingsDialog',
  'providerDirty',
  'loadProvider()'
]) {
  assert.ok(!quickSettings.includes(forbidden), `QuickSettings must not retain system AI management responsibility: ${forbidden}`)
}

assert.match(
  quickSettings,
  /Promise\.all\(\[aiStore\.loadPreferences\(\),\s*aiStore\.loadModels\(\)\]\)/,
  'QuickSettings reload must request only user preferences and enabled user models'
)

assert.match(aiStore, /import\s+\{\s*listEnabledAiModels\s*\}\s+from\s+['"]@\/api\/ai\/config['"]/)
assert.match(aiStore, /async loadModels\(\)[\s\S]*?await listEnabledAiModels\(\)/)
assert.ok(!/async loadModels\(\)[\s\S]*?await listAiModels\(\)/.test(aiStore))

for (const expected of [
  'AI 服务连接',
  '系统模型',
  '保存连接配置',
  '测试模型加载',
  '高级设置',
  '测试连接',
  '移除'
]) {
  assert.ok(aiConfigPage.includes(expected), `Formal AI management page must retain system management capability: ${expected}`)
}

assert.ok(!/userName\s*===?\s*['"]admin['"]/.test(quickSettings), 'QuickSettings must not hard-code admin identity')
assert.ok(!/username\s*===?\s*['"]admin['"]/.test(quickSettings), 'QuickSettings must not hard-code admin identity')

console.log('AI_SETTINGS_BOUNDARY_OK')
