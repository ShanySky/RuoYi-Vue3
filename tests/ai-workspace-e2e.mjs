import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright'

// 治理入口和真实任务成果分开复验，失败重跑不需要再次调用收费模型。
const fixturePath = process.env.WORKSPACE_FIXTURE
const fixture = fixturePath ? JSON.parse(readFileSync(fixturePath, 'utf8')) : null
const output = resolve(process.env.WORKSPACE_BROWSER_OUTPUT || 'test-results/workspace')
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true })
const page = await context.newPage()
const errors = []
page.on('pageerror', error => errors.push(error.message))
try {
  await page.goto(`${process.env.APP_URL || 'http://127.0.0.1:5184'}/login`, { waitUntil: 'networkidle' })
  await page.getByPlaceholder('账号').fill(fixture?.username || 'admin')
  await page.getByPlaceholder('密码').fill(fixture ? 'TestOnly_123!' : 'admin123')
  await page.getByRole('button', { name: /登\s*录/ }).click()
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 30000 })
  if (fixture) {
    const initialPassword = page.locator('.el-message-box').filter({ hasText: '您的密码还是初始密码' })
    await initialPassword.waitFor({ timeout: 10000 })
    await initialPassword.getByRole('button', { name: '取消', exact: true }).click()
  }
  if (!fixture) {
    await page.goto(`${process.env.APP_URL || 'http://127.0.0.1:5184'}/ai/workspace`, { waitUntil: 'networkidle' })
    await page.getByText('隔离环境可用', { exact: true }).waitFor()
    const toggle = page.getByRole('switch')
    assert.equal(await toggle.getAttribute('aria-checked'), 'true')
    for (const expected of [false, true]) {
      const [saved] = await Promise.all([
        page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/ai/admin/workspace') && response.request().method() === 'PUT'),
        page.locator('.workspace-policy .el-switch').click()
      ])
      assert.equal((await saved.json()).code, 200)
      await page.waitForFunction(value => document.querySelector('[role="switch"]')?.getAttribute('aria-checked') === String(value), expected)
      await page.getByRole('button', { name: '刷新状态', exact: true }).click()
      await page.getByText('隔离环境可用', { exact: true }).waitFor()
    }
    assert.ok((await page.locator('.workspace-policy').innerText()).includes('256.0 MiB'))
    await page.screenshot({ path: join(output, 'workspace-governance.png'), fullPage: true })
  } else {
    await page.locator('.ai-fab').click()
    await page.getByRole('button', { name: '继续上次会话', exact: true }).click()
    await page.locator('.context-label').filter({ hasText: `会话 #${fixture.conversationId}` }).waitFor({ timeout: 15000 })
    const artifacts = page.getByTestId('ai-artifacts')
    await artifacts.waitFor({ timeout: 15000 })
    assert.equal(await artifacts.locator('.artifact-row').count(), 3)
    assert.equal((await artifacts.innerText()).includes('Invalid Date'), false)
    for (const file of fixture.artifacts) {
      const row = artifacts.locator('.artifact-row').filter({ hasText: file.name })
      const waiting = page.waitForEvent('download')
      await row.getByRole('button', { name: '下载', exact: true }).click()
      const download = await waiting
      assert.equal(download.suggestedFilename(), file.name)
      const target = join(output, file.name)
      await download.saveAs(target)
      assert.equal(createHash('sha256').update(readFileSync(target)).digest('hex'), file.sha256)
    }
    await artifacts.scrollIntoViewIfNeeded()
    await page.screenshot({ path: join(output, 'workspace-artifacts.png'), fullPage: true })
    await page.reload({ waitUntil: 'networkidle' })
    if (await page.locator('.ai-fab').isVisible()) await page.locator('.ai-fab').click()
    await page.getByTestId('ai-artifacts').waitFor({ timeout: 15000 })
    assert.equal(await page.getByTestId('ai-artifacts').locator('.artifact-row').count(), 3)
  }
  assert.deepEqual(errors, [])
  console.log(fixture ? 'AI_WORKSPACE_ARTIFACT_BROWSER_OK' : 'AI_WORKSPACE_GOVERNANCE_BROWSER_OK')
} catch (error) {
  await page.screenshot({ path: join(output, 'workspace-failure.png'), fullPage: true })
  throw error
} finally {
  await context.close()
  await browser.close()
}
