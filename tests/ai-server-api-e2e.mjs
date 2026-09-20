import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const app = process.env.APP_URL || 'http://127.0.0.1:5184'
const backend = process.env.BACKEND_URL || 'http://127.0.0.1:28092'
const output = process.env.EVIDENCE_DIR || 'test-results/server-api'
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await context.newPage()
let token
let createdPostId

async function api(path, method = 'GET', body) {
  const response = await fetch(backend + path, {
    method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  })
  const value = await response.json()
  assert.equal(value.code, 200, `${path}: ${value.msg}`)
  return value
}

try {
  await page.goto(app + '/login', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /登\s*录/ }).click()
  await page.waitForURL(url => !url.pathname.includes('/login'))
  token = (await context.cookies()).find(value => value.name === 'Admin-Token').value
  await api('/ai/config/provider', 'POST', { name: '服务端界面验收', baseUrl: 'http://127.0.0.1:18093/v1',
    token: 'isolated-mock-only', enabled: true, timeoutSeconds: 60 })
  const model = (await api('/ai/config/models')).data.find(value => value.modelCode === 'mock-api-model')
  await api(`/ai/config/models/${model.modelId}/default`, 'PUT')
  await page.goto(app + '/ai/apis', { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: '后端接口', exact: true }).waitFor()
  await page.getByPlaceholder('搜索业务对象、权限或接口路径').fill('岗位')
  const row = page.locator('tr').filter({ has: page.getByText('GET /system/post/list', { exact: true }) })
  const control = row.locator('.el-switch')
  await control.waitFor()
  assert.equal(await control.locator('input').getAttribute('aria-checked'), 'true')
  await control.click()
  await row.getByText('未开放', { exact: true }).waitFor()
  const closed = (await api('/ai/admin/apis')).data.find(value => value.method === 'GET' && value.path === '/system/post/list')
  assert.equal(closed.enabled, false)
  await control.click()
  await row.getByText('已开放，执行时重新鉴权', { exact: true }).waitFor()
  await page.screenshot({ path: `${output}/governance.png`, fullPage: true })
  await page.goto(app + '/index', { waitUntil: 'networkidle' })
  await page.locator('.ai-fab').click()
  await page.getByTestId('ai-assistant-new-conversation').click()
  await page.getByPlaceholder('告诉 AI 你想做什么…').fill('SERVER_API_WRITE 新增验收岗位')
  await page.getByRole('button', { name: '发送', exact: true }).click()
  const confirmation = page.getByTestId('ai-write-confirmation')
  await confirmation.waitFor({ timeout: 60000 })
  const parameters = JSON.parse(await confirmation.locator('pre').innerText())
  assert.equal((await api('/system/post/list?postCode=' + parameters.body.postCode)).total, 0)
  await page.screenshot({ path: `${output}/confirmation.png`, fullPage: true })
  await confirmation.getByRole('button', { name: '确认执行', exact: true }).click()
  await page.getByText('WRITE_FINISHED', { exact: true }).waitFor({ timeout: 60000 })
  const actual = await api('/system/post/list?postCode=' + parameters.body.postCode)
  assert.equal(actual.total, 1)
  assert.equal(actual.rows[0].postName, parameters.body.postName)
  createdPostId = actual.rows[0].postId
  await page.screenshot({ path: `${output}/completed.png`, fullPage: true })
  console.log('AI_SERVER_API_BROWSER_ACCEPTANCE_OK')
} catch (error) {
  console.error(error)
  await page.screenshot({ path: `${output}/failure.png`, fullPage: true }).catch(() => {})
  throw error
} finally {
  if (createdPostId) await api('/system/post/' + createdPostId, 'DELETE')
  await browser.close()
}
