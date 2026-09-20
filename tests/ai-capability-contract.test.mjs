import fs from 'node:fs'
import assert from 'node:assert/strict'
import {
  RUOYI_SEMANTIC_PAGE_PROTOCOL, isCompleteSemanticPageRuntime, sameSemanticPageRuntime,
  shouldPreserveToolExecutionRuntime
} from '../src/ai/capabilityProtocol.js'
import { definePageCapabilityContract } from '../src/ai/pageCapabilityContract.js'
import { createAiCrudPageCapabilities } from '../src/ai/crudPageCapabilities.js'
import { aiPageCapabilityCatalog, aiPageCapabilityContracts } from '../src/ai/pageCapabilityCatalog.js'
import { systemUserPageContract } from '../src/ai/pages/systemUserPageCapability.js'
import { systemPageContracts } from '../src/ai/pages/systemPageCapabilities.js'
import { monitorPageContracts } from '../src/ai/pages/monitorPageCapabilities.js'
import { toolPageContracts } from '../src/ai/pages/toolPageCapabilities.js'
import { createAiKeyboardController, shouldSubmitComposer } from '../src/ai/keyboardPolicy.js'
import {
  AI_RECOMMENDED_MODEL_RUNTIME_SETTINGS,
  isRecommendedModelRuntimeSettings,
  recommendedRuntimeSettingsPayload
} from '../src/ai/modelRuntimeSettings.js'

assert.equal(RUOYI_SEMANTIC_PAGE_PROTOCOL, 'ruoyi-semantic-page-v1')
assert.throws(() => definePageCapabilityContract({ pageId: 'x' }), /pageName/)

const one = {
  capabilityProtocol: RUOYI_SEMANTIC_PAGE_PROTOCOL,
  pageId: 'system.user',
  route: '/system/user',
  pageInstanceId: 'system.user:one',
  pageVersion: 1
}
assert.equal(isCompleteSemanticPageRuntime(one), true)
assert.equal(sameSemanticPageRuntime(one, { ...one }), true)
assert.equal(sameSemanticPageRuntime(one, { ...one, pageVersion: 2 }), false)
assert.equal(sameSemanticPageRuntime(one, { ...one, pageId: 'system.role' }), false)

assert.equal(systemUserPageContract.capabilityProtocol, RUOYI_SEMANTIC_PAGE_PROTOCOL)
assert.equal(systemUserPageContract.pageId, 'system.user')
assert.equal(systemUserPageContract.route, '/system/user')
assert.equal(systemUserPageContract.toolPrefix, 'page_system_user')
assert.deepEqual(
  systemUserPageContract.actions.map(action => action.suffix),
  ['view', 'delete', 'change_status', 'reset_password', 'auth_role', 'import_open', 'export']
)
const editFields = systemUserPageContract.formFields.filter(field => !field.addOnly).map(field => field.key)
assert.equal(editFields.includes('userName'), false)
assert.equal(editFields.includes('password'), false)
assert.equal(editFields.includes('nickName'), true)


assert.equal(systemPageContracts.length, 10)
const wave1Contracts = [systemUserPageContract, ...systemPageContracts]
assert.equal(new Set(wave1Contracts.map(item => item.pageId)).size, wave1Contracts.length)
assert.equal(new Set(wave1Contracts.map(item => item.route)).size, wave1Contracts.length)
assert.equal(new Set(wave1Contracts.map(item => item.toolPrefix)).size, wave1Contracts.length)
for (const contract of wave1Contracts) {
  assert.equal(contract.capabilityProtocol, RUOYI_SEMANTIC_PAGE_PROTOCOL)
  assert.ok(contract.pageId)
  assert.ok(contract.route.startsWith('/'))
  assert.ok(contract.toolPrefix.startsWith('page_'))
  assert.equal(new Set(contract.actions.map(action => action.suffix)).size, contract.actions.length)
}
for (const route of [
  '/system/user-auth/role/*',
  '/system/role-auth/user/*',
  '/system/dict-data/index/*'
]) {
  assert.ok(systemPageContracts.some(contract => contract.route === route), `missing dynamic system contract ${route}`)
}

const wave1PageRegistrations = [
  ['../src/views/system/user/authRole.vue', 'systemAuthRolePageContract'],
  ['../src/views/system/role/index.vue', 'systemRolePageContract'],
  ['../src/views/system/role/authUser.vue', 'systemRoleAuthUserPageContract'],
  ['../src/views/system/menu/index.vue', 'systemMenuPageContract'],
  ['../src/views/system/dept/index.vue', 'systemDeptPageContract'],
  ['../src/views/system/post/index.vue', 'systemPostPageContract'],
  ['../src/views/system/dict/index.vue', 'systemDictPageContract'],
  ['../src/views/system/dict/data.vue', 'systemDictDataPageContract'],
  ['../src/views/system/notice/index.vue', 'systemNoticePageContract'],
  ['../src/views/system/user/profile/index.vue', 'systemProfilePageContract']
]
for (const [file, contractName] of wave1PageRegistrations) {
  const source = fs.readFileSync(new URL(file, import.meta.url), 'utf8')
  assert.ok(source.includes(`contract: ${contractName}`), `${file} must use contract bindings`)
  assert.ok(source.includes(`useAiPageTools(${contractName}`), `${file} must register the contract object`)
}


const allPageContracts = [systemUserPageContract, ...systemPageContracts, ...monitorPageContracts, ...toolPageContracts]
assert.equal(allPageContracts.length, 24)
assert.equal(aiPageCapabilityContracts.length, 24)
assert.deepEqual(aiPageCapabilityContracts.map(item => item.pageId), allPageContracts.map(item => item.pageId))
assert.equal(aiPageCapabilityCatalog.length, 24)
assert.equal(new Set(aiPageCapabilityCatalog.map(item => item.pageId)).size, 24)
assert.equal(new Set(allPageContracts.map(item => item.pageId)).size, allPageContracts.length)
assert.equal(new Set(allPageContracts.map(item => item.route)).size, allPageContracts.length)
assert.equal(new Set(allPageContracts.map(item => item.toolPrefix)).size, allPageContracts.length)
for (const contract of allPageContracts) {
  assert.equal(new Set(contract.actions.map(action => action.suffix)).size, contract.actions.length)
}
for (const route of [
  '/monitor/job-log/index/*',
  '/tool/gen-edit/index/*'
]) {
  assert.ok(allPageContracts.some(contract => contract.route === route), `missing dynamic contract ${route}`)
}
for (const pageId of ['monitor.druid', 'tool.build', 'tool.swagger']) {
  const contract = allPageContracts.find(item => item.pageId === pageId)
  assert.ok(contract, `missing navigation-only contract ${pageId}`)
  assert.equal(contract.actions.length, 0, `${pageId} must stay navigation-only with zero executable actions`)
}

const wave2PageRegistrations = [
  ['../src/views/monitor/online/index.vue', 'monitorOnlinePageContract'],
  ['../src/views/monitor/job/index.vue', 'monitorJobPageContract'],
  ['../src/views/monitor/job/log.vue', 'monitorJobLogPageContract'],
  ['../src/views/monitor/logininfor/index.vue', 'monitorLogininforPageContract'],
  ['../src/views/monitor/operlog/index.vue', 'monitorOperlogPageContract'],
  ['../src/views/monitor/cache/index.vue', 'monitorCachePageContract'],
  ['../src/views/monitor/cache/list.vue', 'monitorCacheListPageContract'],
  ['../src/views/monitor/server/index.vue', 'monitorServerPageContract'],
  ['../src/views/monitor/druid/index.vue', 'monitorDruidPageContract'],
  ['../src/views/tool/gen/index.vue', 'toolGenPageContract'],
  ['../src/views/tool/gen/editTable.vue', 'toolGenEditPageContract'],
  ['../src/views/tool/build/index.vue', 'toolBuildPageContract'],
  ['../src/views/tool/swagger/index.vue', 'toolSwaggerPageContract']
]
for (const [file, contractName] of wave2PageRegistrations) {
  const source = fs.readFileSync(new URL(file, import.meta.url), 'utf8')
  assert.ok(source.includes(`contract: ${contractName}`), `${file} must use contract bindings`)
  assert.ok(source.includes(`useAiPageTools(${contractName}`), `${file} must register the contract object`)
}

const pageRegistrationFiles = [
  '../src/views/system/user/index.vue',
  ...wave1PageRegistrations.map(([file]) => file),
  ...wave2PageRegistrations.map(([file]) => file)
]
for (const file of pageRegistrationFiles) {
  const source = fs.readFileSync(new URL(file, import.meta.url), 'utf8')
  assert.equal(/createAiCrudPageCapabilities\(\{\s*pageName\s*:/.test(source), false,
    `${file} must not use legacy flat page capability options`)
  assert.equal(/useAiPageTools\(\s*['"]/.test(source), false,
    `${file} must register a formal contract object instead of a legacy pageId string`)
}
const catalogSource = fs.readFileSync(new URL('../src/ai/pageCapabilityCatalog.js', import.meta.url), 'utf8')
assert.equal(catalogSource.includes('legacyPageCapabilities'), false)
const adapterSource = fs.readFileSync(new URL('../src/ai/crudPageCapabilities.js', import.meta.url), 'utf8')
assert.ok(adapterSource.includes('requires a formal contract'))
const profileSource = fs.readFileSync(new URL('../src/views/system/user/profile/index.vue', import.meta.url), 'utf8')
assert.ok(profileSource.includes("sensitiveCapabilitiesExcluded: ['passwordFields', 'avatarBinaryUpload']"))
const genSource = fs.readFileSync(new URL('../src/views/tool/gen/index.vue', import.meta.url), 'utf8')
assert.ok(genSource.includes("action: 'createTable'"))
assert.ok(genSource.includes('不伪造权限标识'))


const userPageSource = fs.readFileSync(new URL('../src/views/system/user/index.vue', import.meta.url), 'utf8')
for (const core of ['deleteUsersCore', 'changeUserStatusCore', 'authRoleCore', 'resetUserPasswordCore']) {
  assert.ok(userPageSource.includes(`async function ${core}(`), `missing shared core ${core}`)
}
assert.ok(userPageSource.includes('delete: args => deleteUsersCore('))
assert.ok(userPageSource.includes('change_status: args => changeUserStatusCore('))
assert.ok(userPageSource.includes('reset_password: args => resetUserPasswordCore('))
assert.ok(userPageSource.includes('auth_role: args => authRoleCore('))

const actionContract = definePageCapabilityContract({
  pageId: 'test.actions',
  pageName: '动作测试',
  route: '/test/actions',
  toolPrefix: 'page_test_actions',
  actions: [{ suffix: 'view', label: '查看' }]
})
let actionExecution = null
const actionCapabilities = createAiCrudPageCapabilities({
  contract: actionContract,
  bindings: {
    actions: {
      view: async args => {
        actionExecution = args
        return { marker: 'ACTION_BINDING_EXECUTED' }
      }
    }
  }
})
const actionTool = actionCapabilities.tools.find(item => item.name === 'page_test_actions_view')
assert.ok(actionTool)
const actionResult = await actionTool.handler({ recordId: 7 })
assert.deepEqual(actionExecution, { recordId: 7 })
assert.equal(actionResult.marker, 'ACTION_BINDING_EXECUTED')

const destination = {
  ...one,
  pageId: 'system.user.authRole',
  route: '/system/user-auth/role/2',
  pageInstanceId: 'system.user.authRole:two',
  pageVersion: 2
}
assert.equal(shouldPreserveToolExecutionRuntime(
  one, destination, 'page_system_user_auth_role', true, { navigated: true }
), true)
assert.equal(shouldPreserveToolExecutionRuntime(
  one, destination, 'app_navigate', true, { navigated: true }
), false)
assert.equal(shouldPreserveToolExecutionRuntime(
  one, destination, 'page_system_user_auth_role', false, { navigated: true }
), false)
assert.equal(shouldPreserveToolExecutionRuntime(
  one, { ...one }, 'page_system_user_view', true, { opened: true }
), false)
assert.equal(shouldPreserveToolExecutionRuntime(
  one, destination, 'page_system_user_search', true, { total: 1 }
), false, 'External navigation during a normal page Tool must remain stale instead of being relabeled as action navigation')

assert.throws(() => createAiCrudPageCapabilities({
  pageName: 'Legacy',
  toolPrefix: 'page_system_legacy'
}), /formal contract/)

assert.throws(() => definePageCapabilityContract({
  pageId: 'x'.repeat(129),
  pageName: 'Too long',
  route: '/too-long',
  toolPrefix: 'page_test_too_long'
}), /pageId 长度超过 128/)
assert.equal(isCompleteSemanticPageRuntime({ ...one, pageInstanceId: 'x'.repeat(65) }), false,
  'Runtime identity length exceeds backend persistence and must be rejected on the client too')
assert.equal(isCompleteSemanticPageRuntime({ ...one, route: 'system/user' }), false,
  'Semantic page route must be absolute on both client and server')


assert.equal(shouldSubmitComposer({ key: 'Enter' }, 'enter'), true)
assert.equal(shouldSubmitComposer({ key: 'Enter', shiftKey: true }, 'enter'), false)
assert.equal(shouldSubmitComposer({ key: 'Enter', ctrlKey: true }, 'enter'), false)
assert.equal(shouldSubmitComposer({ key: 'Enter', ctrlKey: true }, 'ctrl-enter'), true)
assert.equal(shouldSubmitComposer({ key: 'Enter', metaKey: true }, 'ctrl-enter'), true)
assert.equal(shouldSubmitComposer({ key: 'Enter', isComposing: true }, 'ctrl-enter'), false)

let keyboardNow = 1000
let armed = false
let stopReason = null
let sendCount = 0
const keyboard = createAiKeyboardController({
  getBusy: () => true,
  getDoubleEscEnabled: () => true,
  isFocusActive: () => true,
  hasVisibleOverlay: () => false,
  closeModelPicker: () => false,
  onSend: () => { sendCount += 1 },
  onStop: reason => { stopReason = reason },
  onArmedChange: value => { armed = value },
  now: () => keyboardNow,
  setTimer: () => 1,
  clearTimer: () => {}
})
keyboard.handleComposerKeydown({ key: 'Enter', preventDefault() {} }, 'enter')
assert.equal(sendCount, 1)
keyboard.handleGlobalKeydown({ key: 'Escape', preventDefault() {} })
assert.equal(armed, true)
keyboardNow += 300
keyboard.handleGlobalKeydown({ key: 'Escape', preventDefault() {} })
assert.equal(stopReason, 'DOUBLE_ESC')
assert.equal(armed, false)

assert.deepEqual(recommendedRuntimeSettingsPayload(), {
  contextWindowTokens: 65536,
  autoCompaction: true,
  compactionThresholdPercent: 75
})
assert.equal(AI_RECOMMENDED_MODEL_RUNTIME_SETTINGS.contextWindowTokens, 65536)
assert.equal(isRecommendedModelRuntimeSettings({
  contextWindowTokens: 65536,
  autoCompaction: '0',
  compactionThresholdPercent: 75
}), true)
assert.equal(isRecommendedModelRuntimeSettings({
  contextWindowTokens: 131072,
  autoCompaction: '0',
  compactionThresholdPercent: 75
}), false)

const assistantSource = fs.readFileSync(new URL('../src/components/AiAssistant/index.vue', import.meta.url), 'utf8')
assert.ok(assistantSource.includes("useConversationHistory(aiStore"))
assert.ok(assistantSource.includes("createAiKeyboardController({"))
assert.ok(assistantSource.includes('继续上次会话'))
assert.equal(assistantSource.includes('恢复上次会话'), false)
assert.equal(assistantSource.includes('getLastAiConversation'), false)
assert.equal(assistantSource.includes('function parseHistoryDate('), false)

const quickSettingsSource = fs.readFileSync(new URL('../src/components/AiAssistant/QuickSettings.vue', import.meta.url), 'utf8')
assert.ok(quickSettingsSource.includes('登录后自动继续上次会话'))
assert.equal(quickSettingsSource.includes('登录后自动恢复上次会话'), false)

const runtimeDialogSource = fs.readFileSync(new URL('../src/components/AiModelRuntimeSettingsDialog/index.vue', import.meta.url), 'utf8')
assert.ok(runtimeDialogSource.includes('Agent 工作上下文预算'))
assert.ok(runtimeDialogSource.includes('自动（推荐）'))
assert.ok(runtimeDialogSource.includes('恢复推荐设置'))
assert.ok(runtimeDialogSource.includes("runtimeMode.value === 'recommended'"))

console.log('AI_CAPABILITY_CONTRACT_TEST_OK')
