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

async function screenshot(name) {
  await page.screenshot({ path: `test-results/${name}.png`, fullPage: true })
}

function modelRow(name) {
  return page.locator('.ai-config-page .el-table__row').filter({ hasText: name }).first()
}

async function ensureEnabled(name) {
  const row = modelRow(name)
  await row.waitFor({ timeout: 15000 })
  const toggle = row.locator('.el-switch').first()
  const className = await toggle.getAttribute('class') || ''
  if (!className.includes('is-checked')) {
    await toggle.click()
    await page.waitForTimeout(300)
  }
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

try {
  console.log('1. Login through Vue UI')
  await page.goto(`${APP_URL}/login`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /登\s*录/ }).click()
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 30000 })

  console.log('2. Configure real OpenAI-compatible path and sync multiple models')
  await page.goto(`${APP_URL}/system/aiConfig`, { waitUntil: 'networkidle' })
  await page.getByText('AI 服务配置', { exact: true }).first().waitFor({ timeout: 30000 })
  await page.getByPlaceholder('例如：https://api.example.com/v1').fill(PROVIDER_URL)
  await page.getByPlaceholder(/API Token|已保存 Token/).fill(PROVIDER_TOKEN)

  const enabledSwitch = page.locator('.ai-config-page .el-switch').first()
  if (!(await enabledSwitch.getAttribute('class') || '').includes('is-checked')) {
    await enabledSwitch.click()
  }

  await page.getByRole('button', { name: '保存', exact: true }).click()
  await page.getByText('AI 服务配置已保存').waitFor({ timeout: 20000 })

  await page.getByRole('button', { name: '同步模型', exact: true }).click()
  const modelSearch = page.getByPlaceholder('输入 gpt、5.6、sol 等实时匹配')
  await modelSearch.fill('mock')
  await modelRow('mock-agent-model').waitFor({ timeout: 20000 })
  await modelRow('mock-secondary-model').waitFor({ timeout: 20000 })

  await ensureEnabled('mock-agent-model')
  await ensureEnabled('mock-secondary-model')

  const primaryRow = modelRow('mock-agent-model')
  const defaultButton = primaryRow.getByRole('button', { name: '设为默认' })
  if (await defaultButton.count()) {
    await defaultButton.click()
    await page.getByText('默认模型已更新').waitFor({ timeout: 10000 })
  }

  console.log('3. Verify Tool Calling and reasoning capabilities')
  await modelRow('mock-agent-model').getByRole('button', { name: '工具' }).click()
  await page.getByText('Tool Calling：SUPPORTED').waitFor({ timeout: 20000 })

  await modelRow('mock-agent-model').getByRole('button', { name: '思考' }).click()
  await page.getByText(/已验证思考档位：/).waitFor({ timeout: 30000 })
  await modelRow('mock-secondary-model').getByRole('button', { name: '思考' }).click()
  await page.getByText(/已验证思考档位：/).waitFor({ timeout: 30000 })

  const reasoningSelect = modelRow('mock-agent-model').locator('.el-select').first()
  await reasoningSelect.click()
  await page.locator('.el-select-dropdown:visible').getByText('High', { exact: true }).click()
  await page.getByText('默认思考档位已更新').waitFor({ timeout: 10000 })

  console.log('4. Verify non-modal floating window and quick settings')
  await page.goto(`${APP_URL}/index`, { waitUntil: 'networkidle' })
  await page.locator('.ai-fab').click()
  let panel = await assistantPanel()
  assert.ok((await panel.getAttribute('class') || '').includes('floating'), 'AI should open as floating window')
  assert.equal(await page.locator('.el-overlay:visible').count(), 0, 'Floating AI window must not add a page mask')

  await page.getByTestId('ai-assistant-settings').click()
  await page.getByPlaceholder('https://api.example.com/v1').waitFor({ timeout: 15000 })
  await page.getByTestId('ai-assistant-settings').click()
  await page.getByPlaceholder('告诉 AI 你想做什么…').waitFor({ timeout: 15000 })

  console.log('5. Verify Shift+Enter newline and default Enter send')
  const composer = page.getByPlaceholder('告诉 AI 你想做什么…')
  await composer.fill('第一行')
  await composer.press('Shift+Enter')
  await composer.type('第二行')
  assert.ok((await composer.inputValue()).includes('\n'), 'Shift+Enter should insert newline')
  await composer.fill('普通聊天测试')
  await composer.press('Enter')
  await page.getByText('AI_OK:mock-agent-model:high', { exact: true }).waitFor({ timeout: 30000 })

  console.log('6. Expand to real Dock without losing conversation')
  await page.getByTestId('ai-assistant-toggle-mode').click()
  panel = await assistantPanel()
  assert.ok((await panel.getAttribute('class') || '').includes('dock'), 'AI should switch to dock mode')
  await page.getByText('AI_OK:mock-agent-model:high', { exact: true }).waitFor()
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
  assert.ok(layout.marginRight >= 400, `Dock should reserve layout space, got ${layout.marginRight}`)
  assert.ok(layout.dockWidth >= 440, `Dock width should be usable, got ${layout.dockWidth}`)
  assert.ok(layout.headerRight >= 400, 'Fixed header should also move left for Dock')
  assert.equal(await page.locator('.el-overlay:visible').count(), 0, 'Dock must not add a page mask')

  const resizer = page.locator('.dock-resizer')
  const resizeBox = await resizer.boundingBox()
  assert.ok(resizeBox, 'Dock resizer is not visible')
  await page.mouse.move(resizeBox.x + resizeBox.width / 2, resizeBox.y + 100)
  await page.mouse.down()
  await page.mouse.move(resizeBox.x - 60, resizeBox.y + 100, { steps: 5 })
  await page.mouse.up()
  const resizedWidth = await panel.evaluate(el => el.getBoundingClientRect().width)
  assert.ok(resizedWidth >= layout.dockWidth + 40, `Dock width did not respond to drag: ${layout.dockWidth} -> ${resizedWidth}`)

  await page.getByTestId('ai-assistant-settings').click()
  await page.getByPlaceholder('https://api.example.com/v1').waitFor()
  await page.getByTestId('ai-assistant-settings').click()
  await page.getByText('AI_OK:mock-agent-model:high', { exact: true }).waitFor()

  console.log('7. Use autocomplete model picker and secondary reasoning menu in same conversation')
  await page.getByTestId('ai-model-picker-trigger').click()
  const picker = page.locator('.ai-model-picker-popper:visible')
  const pickerSearch = picker.getByPlaceholder('输入模型名称，如 gpt、5.6、sol')
  await pickerSearch.fill('secondary')
  await picker.getByText('mock-secondary-model', { exact: true }).waitFor()
  await picker.getByRole('button', { name: /档位/ }).click()
  await picker.getByRole('button', { name: 'Low', exact: true }).click()

  await sendByButton('同会话切换模型测试')
  await page.getByText('AI_OK:mock-secondary-model:low', { exact: true }).waitFor({ timeout: 30000 })

  console.log('8. Switch send shortcut to Ctrl+Enter and persist it')
  await page.locator('.shortcut-button').click()
  await page.getByText('Ctrl+Enter 发送 · Enter 换行', { exact: true }).click()
  await composer.fill('快捷键测试')
  await composer.press('Enter')
  assert.ok((await composer.inputValue()).includes('\n'), 'Plain Enter should be newline in Ctrl+Enter mode')
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
  assert.ok((await panel.getAttribute('class') || '').includes('floating'), 'Dock should shrink back to floating mode')
  await page.getByText('AI_OK:mock-secondary-model:low', { exact: true }).first().waitFor()

  console.log('9. Verify login-account semantic boundary on user page')
  await page.goto(`${APP_URL}/system/user`, { waitUntil: 'networkidle' })
  await page.getByPlaceholder('请输入用户名称').waitFor({ timeout: 30000 })
  await page.locator('.ai-fab').click()
  await assistantPanel()
  assert.match(await page.locator('.shortcut-button').innerText(), /Ctrl\+Enter 发送/, 'Send shortcut preference did not survive reload')
  await sendByButton('请把用户 ry 的用户名称改为 ry001')
  await page.getByText(/不支持修改已有用户的登录账号 userName/).waitFor({ timeout: 30000 })
  assert.equal(await page.locator('.el-dialog:visible').count(), 0, 'Login-name request should not open edit dialog')

  console.log('10. Run real user-page Tool loop with WRITE confirmation')
  await page.getByRole('button', { name: '新会话', exact: true }).click()
  await sendByButton(`请查找用户 ry，打开这个用户，把昵称改成 ${TEST_NICKNAME}，然后保存。`)
  await page.getByText('AI 操作确认').waitFor({ timeout: 60000 })

  const nicknameInput = page.getByPlaceholder('请输入用户昵称')
  await nicknameInput.waitFor({ timeout: 15000 })
  assert.equal(await nicknameInput.inputValue(), TEST_NICKNAME, 'AI did not populate edit form before submit')

  const token = await getToken()
  const before = await getUser(token, 2)
  assert.equal(before.nickName, '若依', 'WRITE occurred before user confirmation')

  await page.getByRole('button', { name: '确认执行' }).click()
  await page.locator('[data-testid="ai-assistant-messages"]').getByText('E2E_DONE', { exact: true })
    .waitFor({ timeout: 60000 })

  const after = await getUser(token, 2)
  assert.equal(after.nickName, TEST_NICKNAME, 'Backend user data was not persisted after confirmation')

  await screenshot('ai-agent-phase2-e2e-success')
  console.log('AI_AGENT_PHASE2_E2E_OK')
}
catch (error) {
  console.error(error)
  await screenshot('ai-agent-phase2-e2e-failure').catch(() => {})
  throw error
}
finally {
  await browser.close()
}
