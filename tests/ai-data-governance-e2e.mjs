import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const output = process.env.EVIDENCE_DIR
assert.ok(output, '需指定本任务证据目录')
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await context.newPage()
try {
  await page.goto('http://127.0.0.1:5184/login', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /登\s*录/ }).click()
  await page.waitForURL(url => !url.pathname.includes('/login'))
  await page.goto('http://127.0.0.1:5184/ai/data', { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: '数据查询', exact: true }).waitFor()
  await page.locator('.el-tree-node__label').filter({ hasText: /sys_user(?: · 已开放)?$/ }).click()
  const policy = page.locator('.policy')
  const password = policy.getByRole('checkbox', { name: /password/ })
  assert.equal(await password.isDisabled(), true, '原业务未提供密码字段，不允许开放')
  const phone = policy.getByRole('checkbox', { name: /phonenumber/ })
  const original = await phone.isChecked()
  const phoneLabel = policy.locator('.el-checkbox').filter({ hasText: 'phonenumber' })
  await phoneLabel.click()
  assert.equal(await phone.isChecked(), !original)
  const saved = page.waitForResponse(response => response.request().method() === 'PUT' && response.url().endsWith('/ai/admin/data/sys_user'))
  await policy.getByRole('button', { name: '保存表策略', exact: true }).click()
  assert.equal((await (await saved).json()).code, 200)
  const token = (await context.cookies()).find(cookie => cookie.name === 'Admin-Token')?.value
  const response = await fetch('http://127.0.0.1:28092/ai/admin/data', { headers: { Authorization: `Bearer ${token}` } })
  const data = await response.json()
  assert.equal(data.code, 200)
  assert.equal(data.data.tables.find(row => row.key === 'sys_user').fields.includes('phonenumber'), !original)
  await page.screenshot({ path: output + '/governance.png', fullPage: true })
  await phoneLabel.click()
  assert.equal(await phone.isChecked(), original)
  const restored = page.waitForResponse(response => response.request().method() === 'PUT' && response.url().endsWith('/ai/admin/data/sys_user'))
  await policy.getByRole('button', { name: '保存表策略', exact: true }).click()
  assert.equal((await (await restored).json()).code, 200)
  console.log('AI_DATA_GOVERNANCE_BROWSER_OK')
} catch (error) {
  await page.screenshot({ path: output + '/failure.png', fullPage: true }).catch(() => {})
  throw error
} finally {
  await browser.close()
}
