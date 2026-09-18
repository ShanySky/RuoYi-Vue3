import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const APP_URL = process.env.APP_URL || 'http://127.0.0.1:5173'
const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8080'
const PROVIDER_URL = process.env.PROVIDER_URL || 'http://127.0.0.1:18080/v1'
const PROVIDER_TOKEN = process.env.PROVIDER_TOKEN
const TEST_NICKNAME = process.env.TEST_NICKNAME || 'AI闭环测试'
assert.ok(PROVIDER_TOKEN, 'PROVIDER_TOKEN is required')

mkdirSync('test-results', { recursive: true })

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await context.newPage()

page.on('console', msg => {
  if (msg.type() === 'error') console.error('[browser console]', msg.text())
})
page.on('pageerror', err => console.error('[browser pageerror]', err))

async function getToken() {
  const cookies = await context.cookies()
  const token = cookies.find(item => item.name === 'Admin-Token')?.value
  assert.ok(token, 'Admin-Token cookie not found')
  return token
}

async function getUser(token, userId) {
  const response = await fetch(`${BACKEND_URL}/system/user/${userId}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.equal(body.code, 200)
  return body.data
}

async function apiJson(token, path, method = 'GET', body = undefined) {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  })
  assert.equal(response.status, 200, `Unexpected HTTP status for ${path}`)
  const payload = await response.json()
  assert.equal(payload.code, 200, `Unexpected API code for ${path}: ${JSON.stringify(payload)}`)
  return payload.data
}

async function screenshot(name) {
  await page.screenshot({ path: `test-results/${name}.png`, fullPage: true })
}

function modelRow(name) {
  return page.locator('.system-model-table .el-table__row').filter({ hasText: name }).first()
}

async function assistantPanel() {
  const panel = page.locator('[data-testid="ai-assistant-panel"]')
  await panel.waitFor({ timeout: 15000 })
  return panel
}

async function sendByButton(text) {
  const input = page.getByPlaceholder('告诉 AI 你想做什么…')
  await input.fill(text)
  await page.getByRole('button', { name: '发送', exact: true }).click()
}

async function selectRemoteModel(dialog, name) {
  const row = dialog.locator('.remote-model-row').filter({ hasText: name }).first()
  await row.waitFor({ timeout: 10000 })
  await row.locator('.el-checkbox').first().click()
}

try {
  console.log('1. Login through Vue UI')
  await page.goto(`${APP_URL}/login`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /登\s*录/ }).click()
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 30000 })

  console.log('2. Quick settings can test model loading without adding every remote model')
  await page.goto(`${APP_URL}/index`, { waitUntil: 'networkidle' })
  await page.locator('.ai-fab').click()
  await assistantPanel()
  await page.getByTestId('ai-assistant-settings').click()
  const quickSettings = page.locator('.quick-settings')
  await quickSettings.getByPlaceholder('https://api.example.com/v1').fill(PROVIDER_URL)
  await quickSettings.getByPlaceholder(/API Token|请输入 API Token/).fill(PROVIDER_TOKEN)
  await quickSettings.getByRole('button', { name: '测试模型加载', exact: true }).click()
  await quickSettings.getByText(/模型加载成功：发现 2 个远端模型/).waitFor({ timeout: 20000 })
  assert.equal(await quickSettings.locator('.system-model-card').count(), 0, 'Remote discovery must not auto-add system models')
  await quickSettings.locator('.compact-form').getByRole('button', { name: '选择模型', exact: true }).click()
  let remoteDialog = page.locator('.ai-remote-model-dialog:visible')
  await remoteDialog.getByText('选择要加入系统的模型', { exact: true }).waitFor()
  const quickRemoteSearch = remoteDialog.getByPlaceholder(/输入 gpt、5.6、sol/)
  await quickRemoteSearch.fill('secondary')
  await page.waitForTimeout(250)
  await remoteDialog.getByText('mock-secondary-model', { exact: true }).waitFor()
  assert.equal(await remoteDialog.getByText('mock-agent-model', { exact: true }).count(), 0,
    'Remote catalog search should filter without persisting models')
  await remoteDialog.getByRole('button', { name: '取消', exact: true }).click()
  await page.getByTestId('ai-assistant-close').click()

  console.log('3. Save Provider connection, load remote catalog and add only selected models')
  await page.goto(`${APP_URL}/system/aiConfig`, { waitUntil: 'networkidle' })
  await page.getByText('AI 服务配置', { exact: true }).first().waitFor({ timeout: 30000 })
  await page.getByPlaceholder('例如：https://api.example.com/v1').fill(PROVIDER_URL)
  await page.getByPlaceholder(/API Token|已保存 Token/).fill(PROVIDER_TOKEN)

  const enabledSwitch = page.locator('.provider-form .el-switch').first()
  if (!(await enabledSwitch.getAttribute('class') || '').includes('is-checked')) {
    await enabledSwitch.click()
  }

  await page.getByRole('button', { name: '保存连接配置', exact: true }).click()
  await page.getByText('连接配置已保存', { exact: true }).waitFor({ timeout: 15000 })

  await page.getByRole('button', { name: '测试模型加载', exact: true }).click()
  await page.getByText(/模型加载成功：发现 2 个远端模型/).waitFor({ timeout: 20000 })

  const token = await getToken()
  const beforeAdd = await apiJson(token, '/ai/config/models')
  assert.equal(beforeAdd.length, 0, 'Testing model load must not persist the remote catalog')

  await page.getByRole('button', { name: '选择模型', exact: true }).first().click()
  remoteDialog = page.locator('.ai-remote-model-dialog:visible')
  await remoteDialog.getByText('选择要加入系统的模型', { exact: true }).waitFor()
  await selectRemoteModel(remoteDialog, 'mock-agent-model')
  await selectRemoteModel(remoteDialog, 'mock-secondary-model')
  await remoteDialog.getByRole('button', { name: '添加所选模型', exact: true }).click()

  await modelRow('mock-agent-model').waitFor({ timeout: 30000 })
  await modelRow('mock-secondary-model').waitFor({ timeout: 30000 })
  const afterAdd = await apiJson(token, '/ai/config/models')
  assert.equal(afterAdd.length, 2, 'Only selected models should enter the system model list')

  console.log('4. Newly added models auto-detect Tool Calling and reasoning capabilities')
  const primaryRow = modelRow('mock-agent-model')
  const secondaryRowConfig = modelRow('mock-secondary-model')
  await primaryRow.locator('.reasoning-select').waitFor({ timeout: 60000 })
  await secondaryRowConfig.locator('.reasoning-select').waitFor({ timeout: 60000 })
  await primaryRow.getByText('支持', { exact: true }).waitFor()

  const defaultStar = primaryRow.locator('.default-star .active')
  assert.equal(await defaultStar.count(), 1, 'First selected model should become the default automatically')

  const reasoningSelect = primaryRow.locator('.reasoning-select')
  await reasoningSelect.click()
  await page.locator('.el-select-dropdown:visible').getByText('高', { exact: true }).click()
  await page.getByText('默认思考档位已更新', { exact: true }).waitFor({ timeout: 10000 })

  console.log('5. Single-model test connection uses a short toast and does not expand the row')
  const primaryHeightBefore = (await primaryRow.boundingBox()).height
  await primaryRow.getByRole('button', { name: '测试连接', exact: true }).click()
  await page.getByText('mock-agent-model 测试连接成功', { exact: true }).waitFor({ timeout: 20000 })
  const primaryHeightAfter = (await primaryRow.boundingBox()).height
  assert.ok(Math.abs(primaryHeightAfter - primaryHeightBefore) < 3, 'Test result should not occupy persistent row space')

  console.log('5a. Model advanced settings persist context budget and compaction threshold')
  await primaryRow.getByRole('button', { name: '高级设置', exact: true }).click()
  let runtimeDialog = page.locator('.el-dialog:visible').filter({ hasText: '高级设置' }).first()
  await runtimeDialog.waitFor()
  let runtimeInputs = runtimeDialog.locator('.el-input-number input')
  assert.equal(await runtimeInputs.nth(0).inputValue(), '64')
  assert.equal(await runtimeInputs.nth(1).inputValue(), '75')
  const autoCompactionSwitch = runtimeDialog.locator('.el-switch').first()
  assert.ok((await autoCompactionSwitch.getAttribute('class') || '').includes('is-checked'))

  await runtimeInputs.nth(0).fill('72')
  await runtimeInputs.nth(1).fill('70')
  await runtimeDialog.getByRole('button', { name: '保存设置', exact: true }).click()
  await page.getByText('模型高级设置已保存', { exact: true }).waitFor({ timeout: 10000 })
  let persistedModels = await apiJson(token, '/ai/config/models')
  let persistedPrimary = persistedModels.find(item => item.modelCode === 'mock-agent-model')
  assert.equal(persistedPrimary.contextWindowTokens, 72 * 1024)
  assert.equal(persistedPrimary.compactionThresholdPercent, 70)
  assert.equal(persistedPrimary.autoCompaction, '0')

  await modelRow('mock-agent-model').getByRole('button', { name: '高级设置', exact: true }).click()
  runtimeDialog = page.locator('.el-dialog:visible').filter({ hasText: '高级设置' }).first()
  await runtimeDialog.waitFor()
  runtimeInputs = runtimeDialog.locator('.el-input-number input')
  await runtimeInputs.nth(0).fill('64')
  await runtimeInputs.nth(1).fill('75')
  await runtimeDialog.getByRole('button', { name: '保存设置', exact: true }).click()
  await page.getByText('模型高级设置已保存', { exact: true }).waitFor({ timeout: 10000 })

  console.log('6. Verify pending Tool Result keeps its original model and reasoning')
  const runtimeToken = token
  const enabledModels = await apiJson(runtimeToken, '/ai/config/models/enabled')
  const primaryModel = enabledModels.find(item => item.modelCode === 'mock-agent-model')
  const secondaryModel = enabledModels.find(item => item.modelCode === 'mock-secondary-model')
  assert.ok(primaryModel && secondaryModel, 'Expected both selected models to be enabled')

  const frontendTools = [{
    name: 'page_system_user_search',
    description: '查询用户',
    inputSchema: {
      type: 'object',
      properties: { userName: { type: 'string' } },
      additionalProperties: false
    }
  }]
  const isolationStart = await apiJson(runtimeToken, '/ai/chat/turn', 'POST', {
    modelId: primaryModel.modelId,
    reasoningEffort: 'high',
    userMessage: 'RUNTIME_ISOLATION',
    route: '/system/user',
    pageContext: { pageName: '用户管理' },
    frontendTools
  })
  assert.equal(isolationStart.type, 'TOOL_CALL')

  const isolationResume = await apiJson(runtimeToken, '/ai/chat/turn', 'POST', {
    conversationId: isolationStart.conversationId,
    modelId: secondaryModel.modelId,
    reasoningEffort: 'low',
    toolResult: {
      callId: isolationStart.toolCall.callId,
      success: true,
      result: { total: 1, rows: [{ userId: 2, userName: 'ry', nickName: '若依' }] }
    },
    route: '/system/user',
    pageContext: { pageName: '用户管理', total: 1 },
    frontendTools
  })
  assert.equal(isolationResume.type, 'MESSAGE')
  assert.equal(isolationResume.message, 'ISOLATION:mock-agent-model:high')

  console.log('7. Verify refined non-modal floating window and quick settings')
  await page.goto(`${APP_URL}/index`, { waitUntil: 'networkidle' })
  await page.locator('.ai-fab').click()
  let panel = await assistantPanel()
  assert.ok((await panel.getAttribute('class') || '').includes('floating'), 'AI should open as floating window')
  assert.equal(await page.locator('.el-overlay:visible').count(), 0, 'Floating AI window must not add a page mask')
  await page.getByTestId('ai-assistant-settings').click()
  await page.getByPlaceholder('https://api.example.com/v1').waitFor({ timeout: 15000 })
  await page.getByTestId('ai-assistant-settings').click()
  await page.getByPlaceholder('告诉 AI 你想做什么…').waitFor({ timeout: 15000 })

  console.log('8. Verify Shift+Enter newline and default Enter send')
  const composer = page.getByPlaceholder('告诉 AI 你想做什么…')
  await composer.fill('第一行')
  await composer.press('Shift+Enter')
  await composer.type('第二行')
  assert.ok((await composer.inputValue()).includes('\n'), 'Shift+Enter should insert newline')
  await composer.fill('普通聊天测试')
  await composer.press('Enter')
  await page.getByText('AI_OK:mock-agent-model:high', { exact: true }).waitFor({ timeout: 30000 })

  console.log('9. Expand to real Dock without losing conversation')
  await page.getByTestId('ai-assistant-toggle-mode').click()
  panel = await assistantPanel()
  assert.ok((await panel.getAttribute('class') || '').includes('dock'), 'AI should switch to dock mode')
  await page.waitForTimeout(350)
  const layout = await page.evaluate(() => {
    const main = document.querySelector('.main-container')
    const dock = document.querySelector('[data-testid="ai-assistant-panel"]')
    const header = document.querySelector('.fixed-header')
    return {
      marginRight: parseFloat(getComputedStyle(main).marginRight || '0'),
      dockWidth: dock?.getBoundingClientRect().width || 0,
      headerRight: header ? parseFloat(getComputedStyle(header).right || '0') : 0
    }
  })
  assert.ok(layout.marginRight >= 400)
  assert.ok(layout.dockWidth >= 440)
  assert.ok(layout.headerRight >= 400)
  assert.equal(await page.locator('.el-overlay:visible').count(), 0)

  const resizer = page.locator('.dock-resizer')
  const resizeBox = await resizer.boundingBox()
  assert.ok(resizeBox)
  await page.mouse.move(resizeBox.x + resizeBox.width / 2, resizeBox.y + 100)
  await page.mouse.down()
  await page.mouse.move(resizeBox.x - 60, resizeBox.y + 100, { steps: 5 })
  await page.mouse.up()
  const resizedWidth = await panel.evaluate(el => el.getBoundingClientRect().width)
  assert.ok(resizedWidth >= layout.dockWidth + 40)

  console.log('10. Switch model and reasoning within the same conversation')
  await page.getByTestId('ai-model-picker-trigger').click()
  const picker = page.locator('.ai-model-picker-popper:visible')
  const pickerSearch = picker.getByPlaceholder('输入模型名称，如 gpt、5.6、sol')
  await pickerSearch.fill('secondary')
  await page.waitForTimeout(250)
  const secondaryRow = picker.locator('.model-row').filter({ hasText: 'mock-secondary-model' }).first()
  await secondaryRow.waitFor()
  await secondaryRow.getByRole('button', { name: /档位/ }).click()
  await picker.getByRole('button', { name: '低', exact: true }).click()

  await sendByButton('同会话切换模型测试')
  await page.getByText('AI_OK:mock-secondary-model:low', { exact: true }).waitFor({ timeout: 30000 })

  console.log('11. Ctrl+Enter mode persists')
  await page.locator('.shortcut-button').click()
  await page.getByText('Ctrl+Enter 发送 · Enter 换行', { exact: true }).click()
  await composer.fill('快捷键测试')
  await composer.press('Enter')
  assert.ok((await composer.inputValue()).includes('\n'))
  const assistantCount = await page.locator('.message-row.assistant').count()
  await composer.press('Control+Enter')
  await page.waitForFunction(
    count => document.querySelectorAll('.message-row.assistant').length > count,
    assistantCount,
    { timeout: 30000 }
  )
  assert.equal(await page.evaluate(() => localStorage.getItem('ai-send-shortcut')), 'ctrl-enter')

  await page.getByTestId('ai-assistant-toggle-mode').click()
  panel = await assistantPanel()
  assert.ok((await panel.getAttribute('class') || '').includes('floating'))

  console.log('12. Verify login-account semantic boundary on user page')
  await page.goto(`${APP_URL}/system/user`, { waitUntil: 'networkidle' })
  await page.getByPlaceholder('请输入用户名称').waitFor({ timeout: 30000 })
  await page.locator('.ai-fab').click()
  await assistantPanel()
  assert.match(await page.locator('.shortcut-button').innerText(), /Ctrl\+Enter 发送/)
  await sendByButton('请把用户 ry 的用户名称改为 ry001')
  await page.getByText(/不支持修改已有用户的登录账号 userName/).waitFor({ timeout: 30000 })
  assert.equal(await page.locator('.el-dialog:visible').count(), 0)

  console.log('13. Run real user-page Tool loop with WRITE confirmation')
  await page.getByTestId('ai-assistant-new-conversation').click()
  await sendByButton(`请查找用户 ry，打开这个用户，把昵称改成 ${TEST_NICKNAME}，然后保存。`)
  const writeConfirmation = page.getByTestId('ai-write-confirmation')
  await writeConfirmation.waitFor({ timeout: 60000 })

  const nicknameInput = page.getByPlaceholder('请输入用户昵称')
  await nicknameInput.waitFor({ timeout: 15000 })
  assert.equal(await nicknameInput.inputValue(), TEST_NICKNAME)

  const before = await getUser(token, 2)
  assert.equal(before.nickName, '若依', 'WRITE occurred before user confirmation')

  await writeConfirmation.getByRole('button', { name: '确认执行', exact: true }).click()
  await page.locator('[data-testid="ai-assistant-messages"]').getByText('E2E_DONE', { exact: true })
    .waitFor({ timeout: 60000 })

  const after = await getUser(token, 2)
  assert.equal(after.nickName, TEST_NICKNAME)

  console.log('14. Chat font preference applies to floating, dock and reload')
  await page.getByTestId('ai-assistant-settings').click()
  const currentQuickSettings = page.locator('.quick-settings')
  await currentQuickSettings.getByRole('button', { name: '大', exact: true }).click()
  await page.getByTestId('ai-assistant-settings').click()
  const fontInput = page.getByTestId('ai-assistant-input')
  await fontInput.waitFor()
  assert.equal(await fontInput.evaluate(el => getComputedStyle(el).fontSize), '14px')

  await page.getByTestId('ai-assistant-toggle-mode').click()
  assert.equal(await fontInput.evaluate(el => getComputedStyle(el).fontSize), '14px')
  await page.getByTestId('ai-assistant-toggle-mode').click()

  await page.reload({ waitUntil: 'networkidle' })
  await page.locator('.ai-fab').click()
  await assistantPanel()
  const reloadedFontInput = page.getByTestId('ai-assistant-input')
  await reloadedFontInput.waitFor()
  assert.equal(await reloadedFontInput.evaluate(el => getComputedStyle(el).fontSize), '14px')
  await page.getByTestId('ai-assistant-settings').click()
  await page.locator('.quick-settings').getByRole('button', { name: '标准', exact: true }).click()
  await page.getByTestId('ai-assistant-settings').click()

  console.log('15. Stop cancels a slow run and discards late response')
  await page.getByTestId('ai-assistant-new-conversation').click()
  await sendByButton('SLOW_STOP_TEST')
  await page.getByRole('button', { name: '停止', exact: true }).waitFor({ timeout: 10000 })
  await page.waitForTimeout(350)
  await page.getByRole('button', { name: '停止', exact: true }).click()
  await page.getByText('当前 AI 执行已停止', { exact: true }).waitFor({ timeout: 10000 })
  await page.waitForTimeout(4500)
  assert.equal(await page.getByText('SLOW_STOP_DONE', { exact: true }).count(), 0,
    'A cancelled run must not append its late model response')

  console.log('16. Double Escape stops only after the AI internal popup Escape is consumed')
  await page.getByTestId('ai-assistant-new-conversation').click()
  await sendByButton('SLOW_ESC_TEST')
  await page.getByRole('button', { name: '停止', exact: true }).waitFor({ timeout: 10000 })
  await page.waitForTimeout(350)

  const businessUserNameInput = page.getByPlaceholder('请输入用户名称')
  await businessUserNameInput.focus()
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(850)
  assert.equal(await page.getByRole('button', { name: '停止', exact: true }).count(), 1,
    'Double Escape outside the AI assistant must not stop the active run')

  await page.getByTestId('ai-model-picker-trigger').click()
  const openPicker = page.locator('.ai-model-picker-popper:visible')
  await openPicker.waitFor()
  await page.keyboard.press('Escape')
  await openPicker.waitFor({ state: 'hidden' })

  await page.keyboard.press('Escape')
  await page.getByText(/再按一次.*Esc.*停止当前执行/).waitFor({ timeout: 3000 })
  assert.equal(await page.getByRole('button', { name: '停止', exact: true }).count(), 1,
    'The Escape that closes an internal popup must not count as the first stop Escape')
  await page.keyboard.press('Escape')
  await page.getByText('已通过双击 Esc 停止当前 AI 执行', { exact: true }).waitFor({ timeout: 10000 })
  await page.waitForTimeout(4500)
  assert.equal(await page.getByText('SLOW_ESC_DONE', { exact: true }).count(), 0)

  console.log('17. Steering supersedes an unfinished run and follows the latest instruction')
  await page.getByTestId('ai-assistant-new-conversation').click()
  await sendByButton('STEER_OLD')
  await page.getByRole('button', { name: '停止', exact: true }).waitFor({ timeout: 10000 })
  await page.waitForTimeout(350)
  const steeringInput = page.getByPlaceholder('告诉 AI 你想做什么…')
  await steeringInput.fill('STEER_NEW')
  await page.getByRole('button', { name: '发送补充', exact: true }).click()
  await page.getByText('STEER_NEW_OK', { exact: true }).waitFor({ timeout: 15000 })
  await page.waitForTimeout(4500)
  assert.equal(await page.getByText('STEER_OLD_DONE', { exact: true }).count(), 0,
    'Superseded run response must not be rendered after steering')
  await page.getByText(/旧规划将在安全边界停止/).waitFor()

  console.log('18. Steering cancels a pending WRITE confirmation without persisting it')
  await page.getByTestId('ai-assistant-new-conversation').click()
  await sendByButton('STEER_WRITE_OLD')
  const pendingWrite = page.getByTestId('ai-write-confirmation')
  await pendingWrite.waitFor({ timeout: 60000 })
  await nicknameInput.waitFor({ timeout: 15000 })
  assert.equal(await nicknameInput.inputValue(), 'SHOULD_NOT_SAVE')
  const beforeSteerWrite = await getUser(token, 2)
  assert.equal(beforeSteerWrite.nickName, TEST_NICKNAME)

  const steeringWriteInput = page.getByPlaceholder('告诉 AI 你想做什么…')
  await steeringWriteInput.fill('STEER_CANCEL_WRITE')
  await page.getByRole('button', { name: '发送补充', exact: true }).click()
  await pendingWrite.waitFor({ state: 'hidden', timeout: 10000 })
  await page.getByText('WRITE_CANCELLED_BY_STEERING', { exact: true }).waitFor({ timeout: 15000 })
  const afterSteerWrite = await getUser(token, 2)
  assert.equal(afterSteerWrite.nickName, TEST_NICKNAME, 'Pending WRITE was persisted after steering')

  console.log('19. Cross-page Agent creates a role and assigns it to ry in one conversation')
  await page.goto(`${APP_URL}/system/user`, { waitUntil: 'networkidle' })
  await page.getByPlaceholder('请输入用户名称').waitFor({ timeout: 30000 })
  await page.locator('.ai-fab').click()
  await assistantPanel()
  await page.getByTestId('ai-assistant-new-conversation').click()
  await sendByButton('CROSS_PAGE_ROLE_ASSIGN')

  let crossPageConfirm = page.getByTestId('ai-write-confirmation')
  await crossPageConfirm.waitFor({ timeout: 60000 })
  await page.waitForURL(url => url.pathname === '/system/role', { timeout: 30000 })
  await crossPageConfirm.getByRole('button', { name: '确认执行', exact: true }).click()

  await page.waitForURL(url => url.pathname === '/system/user-auth/role/2', { timeout: 60000 })
  crossPageConfirm = page.getByTestId('ai-write-confirmation')
  await crossPageConfirm.waitFor({ timeout: 60000 })
  await crossPageConfirm.getByRole('button', { name: '确认执行', exact: true }).click()
  await page.getByText('CROSS_PAGE_ROLE_ASSIGN_DONE', { exact: true }).waitFor({ timeout: 60000 })

  const authRoleResponse = await fetch(`${BACKEND_URL}/system/user/authRole/2`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  assert.equal(authRoleResponse.status, 200)
  const authRolePayload = await authRoleResponse.json()
  assert.equal(authRolePayload.code, 200)
  const crossRole = (authRolePayload.roles || []).find(item => item.roleKey === 'e2e_cross_page')
  assert.ok(crossRole, 'Cross-page flow did not create the expected role')
  assert.equal(crossRole.flag, true, 'Cross-page flow did not assign the new role to ry')

  const restoreRoleIds = (authRolePayload.roles || [])
    .filter(item => item.flag && item.roleId !== crossRole.roleId)
    .map(item => item.roleId)
    .join(',')
  const restoreResponse = await fetch(
    `${BACKEND_URL}/system/user/authRole?userId=2&roleIds=${encodeURIComponent(restoreRoleIds)}`,
    { method: 'PUT', headers: { Authorization: `Bearer ${token}` } }
  )
  assert.equal(restoreResponse.status, 200)
  const restorePayload = await restoreResponse.json()
  assert.equal(restorePayload.code, 200)

  const deleteRoleResponse = await fetch(`${BACKEND_URL}/system/role/${crossRole.roleId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  })
  assert.equal(deleteRoleResponse.status, 200)
  const deleteRolePayload = await deleteRoleResponse.json()
  assert.equal(deleteRolePayload.code, 200)

  await screenshot('ai-agent-model-selection-e2e-success')
  console.log('AI_AGENT_MODEL_SELECTION_E2E_OK')
}
catch (error) {
  console.error(error)
  await screenshot('ai-agent-model-selection-e2e-failure').catch(() => {})
  throw error
}
finally {
  await browser.close()
}
