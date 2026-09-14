const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}), headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.route('**/src/main.ts*', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()).replace('new Phaser.Game(config)', 'window.testGame = new Phaser.Game(config)') });
    });
    await page.route('**/src/data/player.ts*', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()) + '\nPLAYER_DEFINITION.initialEpProgress = { A: {epDamage:100,peakCount:0}, B: {epDamage:0,peakCount:20}, C: {epDamage:450,peakCount:0}, V: {epDamage:450,peakCount:90}, M: {epDamage:5000,peakCount:1000} };' });
    });
    await page.route('**/src/data/statuses.ts*', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()) + '\nPART_SENSITIVITY_LEVELS[2].conditionMode = "and";' });
    });
    await page.route('**/src/scenes/BattleScene.ts*', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()) + '\nconst originalStartHooks = BattleScene.prototype.runBattleStartHooks; BattleScene.prototype.runBattleStartHooks = function (...args) { window.startLevels = ["A","B","C","V","M"].map(p => this.currentPlayerSensitivityLevel(p)); return originalStartHooks.apply(this,args); };' });
    });
    await page.goto(process.env.GAME_TEST_URL || 'http://127.0.0.1:5175');
    await page.waitForFunction(() => window.testGame?.scene.isActive('TitleScene'));
    const initial = await page.evaluate(async () => {
      const { RUN_STATE } = await import('/src/models/RunState.ts');
      const { PLAYER_DEFINITION } = await import('/src/data/player.ts');
      const { Player } = await import('/src/models/Combatants.ts');
      const p = new Player(PLAYER_DEFINITION);
      p.epDamageByPart.A += 1;
      return { damage: RUN_STATE.playerEpDamageByPart, peaks: RUN_STATE.playerEpPeakByPart, independent: PLAYER_DEFINITION.initialEpProgress.A.epDamage === 100, recent: RUN_STATE.playerRecentEpPeakByPart };
    });
    assert.deepEqual(initial.damage, { A:100, B:0, C:450, V:450, M:5000 });
    assert.deepEqual(initial.peaks, { A:0, B:20, C:0, V:90, M:1000 });
    assert.ok(initial.independent); assert.ok(Object.values(initial.recent).every(v => v === 0));
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
    const ready = () => page.waitForFunction(() => { const s = testGame.scene.getScene('BattleScene'); return s.canEndTurn && !s.isAnimating && !s.handInputLocked; });
    await ready();
    assert.deepEqual(await page.evaluate(() => window.startLevels), [1,1,1,2,5], 'levels must exist before battle-start hooks, including OR and AND thresholds');
    assert.equal(await page.evaluate(() => testGame.scene.getScene('BattleScene').playerSensitivityEpDamageMultiplier(['M'])), 5);
    await page.evaluate(() => {
      const s = testGame.scene.getScene('BattleScene');
      s.player.epDamageByPart.A = 1600;
      s.persistRunVitals();
      s.scene.restart();
    });
    await page.waitForFunction(() => window.startLevels?.[0] === 3);
    await ready();
    assert.equal(await page.evaluate(() => testGame.scene.getScene('BattleScene').player.epDamageByPart.A), 1600, 'next battle must keep accumulated totals instead of reapplying defaults');
    const reset = await page.evaluate(async () => {
      const { RUN_STATE, resetRunState } = await import('/src/models/RunState.ts');
      const { PLAYER_DEFINITION } = await import('/src/data/player.ts');
      resetRunState();
      const configured = RUN_STATE.playerEpDamageByPart.A;
      PLAYER_DEFINITION.initialEpProgress = undefined;
      resetRunState();
      return { configured, damage: RUN_STATE.playerEpDamageByPart, peaks: RUN_STATE.playerEpPeakByPart };
    });
    assert.equal(reset.configured, 100);
    assert.ok([...Object.values(reset.damage), ...Object.values(reset.peaks)].every(v => v === 0));
    assert.deepEqual(errors, []);
    console.log('PASS: initial counters, pre-hook levels and multipliers, OR/AND, battle carryover, new-run reset, omitted defaults');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
