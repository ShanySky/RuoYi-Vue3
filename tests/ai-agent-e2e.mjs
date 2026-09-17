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

try {
  console.log('1. Login through Vue UI using the test form defaults')
  await page.goto(`${APP_URL}/login`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /登\s*录/ }).click()
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 30000 })

  console.log('2. Configure OpenAI-compatible provider through UI')
  await page.goto(`${APP_URL}/system/aiConfig`, { waitUntil: 'networkidle' })
  await page.getByText('AI 服务配置', { exact: true }).first().waitFor({ timeout: 30000 })
  await page.getByPlaceholder('例如：https://api.example.com/v1').fill(PROVIDER_URL)
  await page.getByPlaceholder(/API Token|已保存 Token/).fill(PROVIDER_TOKEN)

  const enabledSwitch = page.getByRole('switch').first()
  if ((await enabledSwitch.getAttribute('aria-checked')) !== 'true') {
    await enabledSwitch.click()
  }

  await page.locator('[data-testid="ai-config-save"]').click()
  await page.getByText('AI 服务配置已保存').waitFor({ timeout: 20000 })

  await page.locator('[data-testid="ai-config-sync"]').click()
  await page.getByText('mock-agent-model', { exact: true }).first().waitFor({ timeout: 20000 })

  const defaultButton = page.getByRole('button', { name: '设为默认' })
  if (await defaultButton.count()) {
    await defaultButton.first().click()
    await page.getByText('默认模型已更新').waitFor({ timeout: 10000 })
  }

  console.log('3. Verify model Tool Calling capability through UI')
  const modelRow = page.locator('.el-table__row').filter({ hasText: 'mock-agent-model' }).first()
  await modelRow.getByRole('button', { name: '工具' }).click()
  await page.getByText('Tool Calling：SUPPORTED').waitFor({ timeout: 20000 })

  console.log('4. Open user management and start AI assistant')
  await page.goto(`${APP_URL}/system/user`, { waitUntil: 'networkidle' })
  await page.getByPlaceholder('请输入用户名称').waitFor({ timeout: 30000 })
  await page.locator('[data-testid="ai-assistant-open"]').click()
  await page.getByText('mock-agent-model', { exact: true }).first().waitFor({ timeout: 15000 })

  console.log('5. Ask AI to search, open edit, change form, and save')
  await page.locator('[data-testid="ai-assistant-input"] textarea').fill(
    `请查找用户 ry，打开这个用户，把昵称改成 ${TEST_NICKNAME}，然后保存。`
  )
  await page.locator('[data-testid="ai-assistant-send"]').click()

  await page.getByText('AI 操作确认').waitFor({ timeout: 60000 })

  const nicknameInput = page.getByPlaceholder('请输入用户昵称')
  await nicknameInput.waitFor({ timeout: 15000 })
  assert.equal(await nicknameInput.inputValue(), TEST_NICKNAME, 'AI did not populate edit form before submit')

  const token = await getToken()
  const before = await getUser(token, 2)
  assert.equal(before.nickName, '若依', 'WRITE occurred before user confirmation')

  console.log('6. Confirm WRITE and wait for Agent final answer')
  await page.getByRole('button', { name: '确认执行' }).click()
  await page.locator('[data-testid="ai-assistant-messages"]').getByText('E2E_DONE', { exact: true })
    .waitFor({ timeout: 60000 })

  const after = await getUser(token, 2)
  assert.equal(after.nickName, TEST_NICKNAME, 'Backend user data was not persisted after confirmation')

  await screenshot('ai-agent-e2e-success')
  console.log('AI_AGENT_E2E_OK')
}
catch (error) {
  console.error(error)
  await screenshot('ai-agent-e2e-failure').catch(() => {})
  throw error
}
finally {
  await browser.close()
}
