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
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
    await page.waitForFunction(() => { const s = testGame.scene.getScene('BattleScene'); return s.canEndTurn && !s.isAnimating && !s.handInputLocked; });
    const actual = await page.evaluate(async () => {
      const s = testGame.scene.getScene('BattleScene');
      const { effect } = await import('/src/data/effectBuilders.ts');
      const { CARD_DEFINITIONS } = await import('/src/data/cards.ts');
      const { SETTINGS_STATE } = await import('/src/models/localization.ts');
      // Keep the real setters/HUD; skip only animation waiting and set a controlled effective maximum.
      s.playerEffectiveMaxEp = () => 11;
      s.animateEpFillTo = async () => {};
      const events = [];
      s.addGlobalFlavorEvent = (event, context) => events.push([event, context.flavorValues?.amount]);
      const snapshots = [], progress = JSON.stringify([s.player.epDamageByPart, s.player.epPeakByPart]);
      const run = async (kind, amount, options = {}, source = 'system') => {
        await s.executeEffects([effect(kind, 'player', amount, options)], s.battleEventContext({ source, sourceName: 'test', actor: s.player, statusStacks: 2 }));
        snapshots.push([s.player.ep, s.playerEpReserveValue]);
      };
      s.player.ep = 8; s.playerEpReserveValue = 2;
      await run('setEpRatio', 0.5);
      await run('setEpReserve', 3.2);
      await run('setEpReserve', 99);
      await run('setEpReserve', 0);
      await run('setEpReserve', 3);
      await run('setEpRatio', 1);
      await run('setEpRatio', 0);
      await run('setEpRatio', -0.5);
      await run('setEpRatio', 2);
      await run('setEpReserve', -1);
      await run('setEpReserve', 2, { perStack: true }, 'status');
      await run('setEpReserveRatio', 0.5);
      await run('setEp', 0);
      await run('setEpRatio', 0.5, { chance: 0 });
      await run('setEpReserve', 8, { chance: 0 });
      const synchronized = [];
      for (const [kind, amount, ep, reserve] of [
        ['setEp', 3, 8, 6], ['setEp', 6, 8, 4], ['setEp', 6, 8, 6],
        ['epHeal', 5, 8, 6], ['epHeal', 99, 8, 6], ['epHeal', 1, 8, 6],
        ['setEpReserveRatio', 0.5, 2, 1], ['setEpReserveRatio', 1, 2, 1],
        ['setEpReserve', 1, 8, 6], ['epReserveHeal', 5, 8, 6],
      ]) {
        s.player.ep = ep; s.playerEpReserveValue = reserve;
        await s.executeEffects([effect(kind, 'player', amount)], s.battleEventContext({ source: 'system', sourceName: 'test', actor: s.player }));
        synchronized.push([s.player.ep, s.playerEpReserveValue]);
      }
      const relative = [];
      for (const kind of ['setEpRatio', 'setEpReserveRatio']) {
        for (const ratioBase of ['playerMaxEp', 'playerCurrentEp', 'playerEpReserve']) {
          s.player.ep = 8; s.playerEpReserveValue = 6;
          await s.executeEffects([effect(kind, 'player', 1 / 3, { ratioBase })], s.battleEventContext({ source: 'system', sourceName: 'test', actor: s.player }));
          relative.push([s.player.ep, s.playerEpReserveValue]);
        }
      }
      s.player.ep = 8;
      await s.executeEffects([effect('setEpRatio', 'player', 0.5, { ratioBase: 'playerCurrentEp', times: 2 })], s.battleEventContext({ source: 'system', sourceName: 'test', actor: s.player }));
      const repeated = s.player.ep;
      const faintEffect = CARD_DEFINITIONS.faint.effects.find(e => e.kind === 'setEpRatio');
      s.player.ep = 8;
      await s.executeEffects([faintEffect], s.battleEventContext({ source: 'card', sourceName: 'Faint', actor: s.player, card: CARD_DEFINITIONS.faint }));
      const faint = { ep: s.player.ep, ratioBase: faintEffect.ratioBase, amount: faintEffect.amount };
      const descriptions = {};
      s.player.ep = 8; s.playerEpReserveValue = 6;
      for (const lang of ['ja', 'en']) {
        SETTINGS_STATE.language = lang;
        for (const [kind, amount] of [['setEpRatio', 0.5], ['setEpReserve', 3], ['epHeal', 5]]) {
          const card = { ...CARD_DEFINITIONS.strike, effects: [effect(kind, 'player', amount)] };
          descriptions[`${lang}:${kind}`] = s.cardEffectDisplay(card).lines.flat().map(p => p.text).join('');
        }
        for (const kind of ['setEpRatio', 'setEpReserveRatio']) {
          for (const ratioBase of ['playerCurrentEp', 'playerEpReserve']) {
            const card = { ...CARD_DEFINITIONS.strike, effects: [effect(kind, 'player', 1 / 3, { ratioBase })] };
            descriptions[`${lang}:${kind}:${ratioBase}`] = s.cardEffectDisplay(card).lines.flat().map(p => p.text).join('');
          }
        }
      }
      const order = s.cardEffectsInExecutionOrder({ ...CARD_DEFINITIONS.strike, effects: [effect('epDamage', 'player', 1), effect('setEpRatio', 'player', 0.5)] }).map(e => e.kind);
      return { snapshots, synchronized, relative, repeated, faint, events, descriptions, order, progressUnchanged: progress === JSON.stringify([s.player.epDamageByPart, s.player.epPeakByPart]) };
    });
    assert.deepEqual(actual.snapshots, [[5,2],[5,4],[11,11],[11,0],[11,3],[11,3],[0,0],[0,0],[11,0],[11,0],[11,4],[11,5],[0,0],[0,0],[0,0]]);
    assert.deepEqual(actual.synchronized, [[3,3],[6,4],[6,6],[3,3],[0,0],[7,6],[5,5],[11,11],[8,1],[8,1]]);
    assert.match(actual.descriptions['ja:epHeal'], /EPを5回復/);
    assert.match(actual.descriptions['en:epHeal'], /Recover 5 EP/);
    assert.ok(actual.events.some(([event, amount]) => event === 'effect.setEpRatio' && amount === 5));
    assert.ok(actual.events.some(([event, amount]) => event === 'effect.setEpReserve' && amount === 4));
    assert.match(actual.descriptions['ja:setEpRatio'], /50%/);
    assert.match(actual.descriptions['en:setEpRatio'], /50%/);
    assert.match(actual.descriptions['ja:setEpReserve'], /下限を3/);
    assert.match(actual.descriptions['en:setEpReserve'], /reserve to 3/);
    assert.deepEqual(actual.order, ['setEpRatio', 'epDamage']);
    assert.ok(actual.progressUnchanged);
    assert.deepEqual(actual.relative, [[3,3],[2,2],[2,2],[8,3],[8,2],[8,2]]);
    assert.equal(actual.repeated, 2);
    assert.deepEqual(actual.faint, { ep: 2, ratioBase: 'playerCurrentEp', amount: 1 / 3 });
    for (const kind of ['setEpRatio', 'setEpReserveRatio']) {
      assert.match(actual.descriptions[`ja:${kind}:playerCurrentEp`], /現在EPの33.33%/);
      assert.match(actual.descriptions[`ja:${kind}:playerEpReserve`], /現在のEPリセット下限の33.33%/);
      assert.match(actual.descriptions[`en:${kind}:playerCurrentEp`], /33.33% of current EP/i);
      assert.match(actual.descriptions[`en:${kind}:playerEpReserve`], /33.33% of current EP reserve/i);
    }
    console.log('PASS: EP/reserve setters, zero, ratio rounding, limits, stack/chance options, logs, bilingual previews and card ordering');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
