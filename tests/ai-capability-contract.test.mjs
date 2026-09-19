import fs from 'node:fs'
import assert from 'node:assert/strict'
import {
  RUOYI_SEMANTIC_PAGE_PROTOCOL, isCompleteSemanticPageRuntime, sameSemanticPageRuntime,
  shouldPreserveToolExecutionRuntime
} from '../src/ai/capabilityProtocol.js'
import { definePageCapabilityContract } from '../src/ai/pageCapabilityContract.js'
import { createAiCrudPageCapabilities } from '../src/ai/crudPageCapabilities.js'
import { systemUserPageContract } from '../src/ai/pages/systemUserPageCapability.js'

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

const legacyCapabilities = createAiCrudPageCapabilities({
  pageName: 'Legacy',
  toolPrefix: 'page_system_legacy',
  queryFields: [],
  formFields: [],
  getContext: () => ({ marker: 'LEGACY_CONTEXT_MUST_NOT_OVERRIDE_RUNTIME_PAGE_ID' })
})
const legacyContext = legacyCapabilities.getContext()
assert.equal(Object.prototype.hasOwnProperty.call(legacyContext, 'pageId'), false,
  'Legacy flat-options context must not overwrite Tool Registry runtime pageId with null')
assert.equal(legacyContext.capabilityProtocol, RUOYI_SEMANTIC_PAGE_PROTOCOL)

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

console.log('AI_CAPABILITY_CONTRACT_TEST_OK')
