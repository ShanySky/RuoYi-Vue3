import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const account = process.env.SCOPE_TEST_ACCOUNT
const scenario = process.env.SCOPE_TEST_SCENARIO
assert.ok(account?.startsWith('scope_') && scenario?.startsWith('scope_'), '仅用于专用归属验收夹具')
const output = process.env.EVIDENCE_DIR
assert.ok(output)
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await context.newPage()
let turns = 0
page.on('request', request => { if (new URL(request.url()).pathname.endsWith('/ai/chat/turn')) turns++ })
try {
  await page.goto('http://127.0.0.1:5184/login', { waitUntil: 'networkidle' })
  await page.getByPlaceholder('账号').fill(account)
  await page.getByPlaceholder('密码', { exact: true }).fill('TestOnly_123!')
  await page.getByRole('button', { name: /登\s*录/ }).click()
  await page.waitForURL(url => !url.pathname.includes('/login'))
  const passwordNotice = page.getByRole('dialog').filter({ hasText: '您的密码还是初始密码' })
  if (await passwordNotice.count()) await passwordNotice.getByRole('button', { name: '取消', exact: true }).click()
  await page.locator('.ai-fab').click()
  await page.getByTestId('ai-assistant-new-conversation').click()
  await page.getByPlaceholder('告诉 AI 你想做什么…').fill(scenario)
  await page.getByRole('button', { name: '发送', exact: true }).click()
  const confirmation = page.getByTestId('ai-write-confirmation')
  await confirmation.waitFor({ timeout: 60000 })
  await confirmation.getByRole('button', { name: '确认执行', exact: true }).click()
  await page.getByText(/原业务已确认操作完成。结果因授权或保存限制无法继续交付/).last().waitFor({ timeout: 30000 })
  assert.equal(turns, 1, '授权变化后不应提交结果继续调用模型')
  await page.screenshot({ path: output + '/known-write-stopped.png', fullPage: true })
  console.log('AI_SCOPE_CHANGE_BROWSER_OK')
} catch (error) {
  console.error(error)
  await page.screenshot({ path: output + '/failure.png', fullPage: true }).catch(() => {})
  throw error
} finally {
  await browser.close()
}
