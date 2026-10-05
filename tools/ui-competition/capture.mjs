// Optional visual check: npm package is supplied externally, not a game dependency.
// PLAYWRIGHT_MODULE points to playwright/index.mjs; BROWSER_CHANNEL defaults to msedge.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const modulePath = process.env.PLAYWRIGHT_MODULE;
const { chromium } = await import(modulePath ? pathToFileURL(modulePath).href : 'playwright');
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true });
const errors = [];
const output = new URL('./screenshots/', import.meta.url);
await mkdir(output, { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  await page.goto(process.env.COMPETITION_URL || 'http://127.0.0.1:5188/tools/ui-competition/index.html', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.images].every(image => image.complete));
  await page.waitForTimeout(300);
  await page.screenshot({ path: fileURLToPath(new URL('overview.png', output)), fullPage: true });
  const range = async (id, value) => {
    await page.locator(`#${id}`).evaluate((el, value) => { el.value = value; el.dispatchEvent(new Event('input', { bubbles: true })); }, String(value));
    await page.waitForTimeout(80);
  };
  const snapshot = async name => page.locator('#large').screenshot({ path: fileURLToPath(new URL(`${name}.png`, output)) });
  for (const floor of [0, 32, 95, 100]) {
    await range('floor', floor);
    await snapshot(`floor-${floor}`);
  }
  await range('floor', 32);
  for (const [action, phases] of [['playerReset', [450, 1000]], ['enemyReset', [270, 500, 760, 1000]]]) {
    await page.locator(`[data-action="${action}"]`).click();
    for (const phase of phases) { await range('timeline', phase); await snapshot(`${action}-${phase}`); }
  }
  await page.locator('#language').selectOption('en');
  await page.locator('#background').selectOption('paper');
  await range('floor', 100);
  await snapshot('english-light-floor-100');
  await page.locator('[data-design="B"] .choose').click();
  await page.locator('[data-design="B"] .memo').fill('verification');
  await page.reload();
  assert.equal(await page.locator('[data-design="B"] .choose').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('[data-design="B"] .memo').inputValue(), 'verification');
  const downloadEvent = page.waitForEvent('download');
  await page.locator('#export').click();
  const download = await downloadEvent;
  assert.equal(download.suggestedFilename(), 'hp-ep-selection.json');
  assert.deepEqual(errors, []);
  console.log('Screenshots, page errors, asset responses, selection persistence and export: OK');
} finally { await browser.close(); }
