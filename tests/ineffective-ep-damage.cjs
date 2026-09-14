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
    await page.goto(process.env.GAME_TEST_URL || 'http://127.0.0.1:5175');
    await page.waitForFunction(() => window.testGame?.scene.isActive('TitleScene'));
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
    await page.waitForFunction(() => { const s = testGame.scene.getScene('BattleScene'); return s.canEndTurn && !s.isAnimating && !s.handInputLocked; });
    const rows = await page.evaluate(async () => {
      const s = testGame.scene.getScene('BattleScene');
      const { bodyPartDefaultName } = await import('/src/data/bodyParts.ts');
      const { PART_SENSITIVITY_LEVELS } = await import('/src/data/statuses.ts');
      // Keep damage rounding and sensitivity modifiers real; isolate arousal.
      s.epDamageMultiplierForArousal = () => 1;
      s.playerNonArousalEpDamageMultiplier = () => 1;
      const rows = [];
      for (const [source, parts, amount] of [
        ['enemyIntent', ['A'], 0.2], ['relic', ['B'], 0.9], ['status', ['C'], 0.4],
        ['enemyIntent', ['V', 'M'], 0.9], ['status', ['A', 'A'], 0.2],
        ['card', ['A'], 0.4], ['card', ['B', 'C'], 0.4],
        ['enemyIntent', ['A', 'B'], 1.2], ['status', ['A'], 1], ['status', ['A'], 0],
      ]) {
        s.player.statuses.clear(); s.player.ep = 0;
        for (const part of ['A', 'B', 'C', 'V', 'M']) { s.player.epDamageByPart[part] = 0; s.player.epPeakByPart[part] = 0; }
        const start = s.battleLogs.length;
        const result = { messages: [], causedPlayerEpPeak: false, damagedEnemies: new Map() };
        const context = s.battleEventContext({ source, actor: source === 'enemyIntent' ? s.enemy : s.player, sourceName: 'test' });
        await s.applyEffectEpDamage({ kind: 'epDamage', target: 'player', amount, epDamageParts: parts }, s.player, amount, context, result);
        rows.push({ source, parts: [...new Set(parts)], amount, ep: s.player.ep,
          counts: { ...s.player.epDamageByPart }, peaks: { ...s.player.epPeakByPart },
          lastAmount: s.player.epDamageRecords.at(-1)?.amount,
          logs: s.battleLogs.slice(start).filter(e => e.kind === 'narration').map(e => e.text),
          expectedPart: bodyPartDefaultName(parts[0]), player: s.combatantDisplayNameForLanguage(s.player, 'ja') });
      }
      s.player.statuses.clear(); s.player.ep = 0;
      s.player.epDamageByPart.A = PART_SENSITIVITY_LEVELS[1].requiredEpDamage - 1;
      s.player.epPeakByPart.A = 0;
      await s.applyEffectEpDamage({ kind: 'epDamage', target: 'player', epDamageParts: ['A'] }, s.player, 0.2,
        s.battleEventContext({ source: 'status', actor: s.player }), { messages: [], causedPlayerEpPeak: false, damagedEnemies: new Map() });
      return { rows, level: s.currentPlayerSensitivityLevel('A'), ep: s.player.ep, peaks: s.player.epPeakByPart.A };
    });
    for (const row of rows.rows) {
      const ineffective = row.amount > 0 && row.amount < 1;
      assert.equal(row.ep, row.amount >= 1 ? 1 : 0);
      for (const [part, count] of Object.entries(row.counts)) assert.equal(count, row.parts.includes(part) && row.amount > 0 ? 1 : 0);
      assert.ok(Object.values(row.peaks).every(n => n === 0));
      if (ineffective) assert.equal(row.lastAmount, 0, 'damage history must not claim EP increased');
      const logs = row.logs.filter(text => (typeof text === 'string' ? text : text.ja).includes('まだ感じないようだ'));
      assert.equal(logs.length, ineffective && row.source !== 'card' ? 1 : 0);
      if (logs.length) {
        const part = typeof row.expectedPart === 'string' ? row.expectedPart : row.expectedPart.ja;
        assert.equal(logs[0].ja, `${row.player}の${row.parts.length > 1 ? '身体' : part}はまだ感じないようだ`);
        assert.ok(!logs[0].en.includes('{'), 'English placeholders must resolve');
      }
    }
    assert.equal(rows.level, 1); assert.equal(rows.ep, 0); assert.equal(rows.peaks, 0);
    assert.deepEqual(errors, []);
    console.log('PASS: ineffective hits develop parts without EP/Peak, single/multiple-part narration, self/zero exclusions, final damage >=1 and level-up');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
