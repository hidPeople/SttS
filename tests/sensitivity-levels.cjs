const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}), headless: true });
  const page = await browser.newPage();
  try {
    await page.route('**/src/main.ts*', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()).replace('new Phaser.Game(config)', 'window.testGame = new Phaser.Game(config)') });
    });
    await page.goto(process.env.GAME_TEST_URL || 'http://127.0.0.1:5175');
    await page.waitForFunction(() => window.testGame?.scene.isActive('TitleScene'));
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => { const s = testGame.scene.getScene('BattleScene'); return s.canEndTurn && !s.isAnimating && !s.handInputLocked; });
    const result = await page.evaluate(async () => {
      const { PART_SENSITIVITY_LEVELS } = await import('/src/data/statuses.ts');
      const s = testGame.scene.getScene('BattleScene');
      const rows = Object.entries(PART_SENSITIVITY_LEVELS);
      const boundaries = rows.map(([key, config]) => ({
        level: Number(key),
        results: [[config.requiredPeakCount - 1, 0], [config.requiredPeakCount, 0], [0, config.requiredEpDamage - 1], [0, config.requiredEpDamage]].map(([p, d]) => s.sensitivityLevelForProgress(p, d)),
      }));
      const original = { ...PART_SENSITIVITY_LEVELS[1] };
      const config = PART_SENSITIVITY_LEVELS[1];
      config.conditionMode = 'and';
      const and = [[20, 0], [0, 100], [19, 100], [20, 99], [20, 100]].map(([p, d]) => s.sensitivityLevelForProgress(p, d));
      Object.assign(config, { requiredPeakCount: 3, requiredEpDamage: 10, conditionMode: 'or' });
      const adjusted = [[2, 9], [3, 0], [0, 10]].map(([p, d]) => s.sensitivityLevelForProgress(p, d));
      Object.assign(config, original);
      for (const part of ['A', 'B']) {
        s.clearPlayerSensitivityStatusesForPart(part);
        s.player.epPeakByPart[part] = 0;
        s.player.epDamageByPart[part] = 0;
      }
      await s.recordPlayerEpDamage(99, ['A'], false);
      const beforeDamage = s.currentPlayerSensitivityLevel('A');
      await s.recordPlayerEpDamage(1, ['A'], false);
      const damageOnly = { level: s.currentPlayerSensitivityLevel('A'), peaks: s.player.epPeakByPart.A, total: s.player.epDamageByPart.A, otherPartLevel: s.currentPlayerSensitivityLevel('B') };
      const multiplier = s.playerSensitivityEpDamageMultiplier(['A']);
      config.epDamageMultiplier = 2.5;
      const changedMultiplier = s.playerSensitivityEpDamageMultiplier(['A']);
      const mixedMultiplier = s.playerSensitivityEpDamageMultiplier(['A', 'B']);
      config.conditionMode = 'and';
      await s.recordPlayerEpDamage(100, ['B'], false);
      const andDamageOnly = s.currentPlayerSensitivityLevel('B');
      s.player.epPeakByPart.B = 19;
      await s.recordPlayerEpDamage(1, ['B'], true);
      const andBoth = s.currentPlayerSensitivityLevel('B');
      Object.assign(config, original);
      return { boundaries, and, adjusted, beforeDamage, damageOnly, multiplier, changedMultiplier, mixedMultiplier, andDamageOnly, andBoth };
    });
    for (const { level, results } of result.boundaries) assert.deepEqual(results, [level - 1, level, level - 1, level]);
    assert.deepEqual(result.and, [0, 0, 0, 0, 1]);
    assert.deepEqual(result.adjusted, [0, 1, 1]);
    assert.equal(result.beforeDamage, 0);
    assert.deepEqual(result.damageOnly, { level: 1, peaks: 0, total: 100, otherPartLevel: 0 });
    assert.equal(result.multiplier, 1.2);
    assert.equal(result.changedMultiplier, 2.5);
    assert.equal(result.mixedMultiplier, 1.75);
    assert.equal(result.andDamageOnly, 0);
    assert.equal(result.andBoth, 1);
    console.log('PASS: OR/AND boundaries, damage without Peak, per-part accumulation, configurable and averaged multipliers');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
