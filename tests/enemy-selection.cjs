const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}), headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.route('**/src/main.ts*', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()).replace('new Phaser.Game(config)', 'window.testGame = new Phaser.Game(config)') });
    });
    await page.route('**/src/ui/keyboardNavigation.ts*', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()) + '\nwindow.Nav = KeyboardNavigation;' });
    });
    await page.route('**/src/debug/debugMode.ts*', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()) + '\nwindow.rebuildDebugEnemies = rebuildEnemyViews;' });
    });
    await page.goto(process.env.GAME_TEST_URL || 'http://127.0.0.1:5175');
    await page.waitForFunction(() => window.testGame?.scene.isActive('TitleScene'));
    await page.evaluate(async () => {
      const { RUN_STATE, resetRunState } = await import('/src/models/RunState.ts');
      resetRunState(); RUN_STATE.encounterEnemyIds = ['grunt', 'slime', 'slime'];
      testGame.scene.getScene('TitleScene').scene.start('BattleScene');
    });
    await page.waitForFunction(() => {
      const s = testGame.scene.getScene('BattleScene');
      return s.enemyViews.length === 3 && s.canEndTurn && !s.isAnimating && !s.handInputLocked;
    });
    const measurements = await page.evaluate(() => {
      const s = testGame.scene.getScene('BattleScene');
      s.tweens.killTweensOf(s.reticlePulse); // Freeze only the intentional pulse.
      return s.enemyViews.map((v, index) => {
        s.selectEnemy(index);
        const original = [...s.reticle.commandBuffer];
        const oldBounds = v.hitArea.getBounds();
        const hud = [v.hudText, v.intentText, v.bars.hpBg, v.bars.epBg].map(o => [o.x, o.y]);
        const x = v.area.x, y = v.area.y;
        v.area.setPosition(x + 24, y - 18);
        s.updateReticlePosition();
        const stationary = JSON.stringify(original) === JSON.stringify(s.reticle.commandBuffer);
        v.area.setPosition(x, y);
        const hudUnchanged = JSON.stringify(hud) === JSON.stringify([v.hudText, v.intentText, v.bars.hpBg, v.bars.epBg].map(o => [o.x, o.y]));
        const b = v.clickArea.getBounds(), bar = v.bars.hasEp ? v.bars.epBg : v.bars.hpBg;
        return { stationary, hudUnchanged, width: b.width, expectedWidth: Math.max(v.bars.hpBg.width, oldBounds.width),
          top: b.top, expectedTop: Math.min(oldBounds.top, v.intentText.getBounds().top),
          bottom: b.bottom, expectedBottom: Math.max(oldBounds.bottom, bar.getBounds().bottom),
          outlineWidth: oldBounds.width, hasEp: v.bars.hasEp,
          points: [[b.centerX, b.top + 2], [b.left + 2, oldBounds.centerY], [b.right - 2, oldBounds.centerY], [b.centerX, b.bottom - 2]] };
      });
    });
    assert.ok(measurements.some(m => m.hasEp) && measurements.some(m => !m.hasEp));
    for (let index = 0; index < measurements.length; index++) {
      const m = measurements[index];
      assert.ok(m.stationary, 'damage/attack movement must not move the reticle');
      assert.ok(m.hudUnchanged);
      for (const [actual, expected] of [[m.width, m.expectedWidth], [m.top, m.expectedTop], [m.bottom, m.expectedBottom]]) assert.ok(Math.abs(actual - expected) < 0.01, JSON.stringify(m));
      assert.ok(m.width > m.outlineWidth, 'pointer width expands independently');
      for (const [x, y] of m.points) {
        await page.evaluate(i => testGame.scene.getScene('BattleScene').selectEnemy((i + 1) % 3), index);
        await page.mouse.move(x, y);
        assert.equal(await page.evaluate(() => testGame.scene.getScene('BattleScene').selectedEnemyIndex), (index + 1) % 3, 'hover must not select');
        await page.mouse.click(x, y);
        assert.equal(await page.evaluate(() => testGame.scene.getScene('BattleScene').selectedEnemyIndex), index, 'expanded boundary click selects owner');
      }
    }
    // Reproduce the reported empty space above the middle slime. Test actual
    // input hits and clicks with a different target selected, not just bounds.
    const emptyPoints = await page.evaluate(() => {
      const s = testGame.scene.getScene('BattleScene'), v = s.enemyViews[1];
      const left = v.bars.hpBg.getBounds().left, right = v.bars.hpBg.getBounds().right;
      const top = s.enemyViews[0].intentText.getBounds().bottom + 8;
      const bottom = v.intentText.getBounds().top - 8;
      const points = [];
      for (let x = left + 5; x < right; x += 35) for (let y = top; y < bottom; y += 35) {
        const hits = s.input.manager.hitTest({x, y}, s.enemyViews.flatMap(w => [w.hitArea, w.clickArea, w.bars.hpBg, w.bars.epBg]), s.cameras.main);
        points.push({ x, y, hits: hits.length });
      }
      s.selectEnemy(2);
      return points;
    });
    assert.ok(emptyPoints.length > 0);
    for (const { x, y, hits } of emptyPoints) {
      assert.equal(hits, 0, `empty background must not target any enemy at ${x},${y}`);
      await page.mouse.click(x, y);
      assert.equal(await page.evaluate(() => testGame.scene.getScene('BattleScene').selectedEnemyIndex), 2);
    }
    const bar = await page.evaluate(() => {
      const b = testGame.scene.getScene('BattleScene').enemyViews[0].bars.hpBg.getBounds();
      return { x: b.centerX, y: b.centerY };
    });
    await page.mouse.move(bar.x, bar.y);
    await page.waitForTimeout(400);
    assert.ok(await page.evaluate(() => testGame.scene.getScene('BattleScene').statusTooltip.visible), 'expanded click target must not obscure bar Tips');
    await page.keyboard.press('ArrowRight');
    assert.ok(await page.evaluate(() => {
      const s = testGame.scene.getScene('BattleScene');
      return Nav.for(s).current.object === s.currentEnemyView().hitArea && s.children.getByName('keyboard-selection').commandBuffer.length > 0;
    }), 'keyboard outline still uses original sprite hitArea');
    // Use the debug panel's actual rebuild path. Retained enemies move when
    // the count changes; their old pointer targets must not remain clickable.
    const rebuilt = await page.evaluate(() => {
      const s = testGame.scene.getScene('BattleScene');
      const oldViews = [...s.enemyViews], pulse = s.reticlePulse, reticle = s.reticle;
      const b = oldViews[0].clickArea.getBounds(), point = { x: b.left + 4, y: b.centerY };
      s.enemies.splice(1, 1);
      rebuildDebugEnemies(s, 1);
      return {
        point,
        removed: oldViews.every(v => !v.clickArea.scene && !v.area.scene),
        pulseStopped: s.tweens.getTweensOf(pulse).length === 0,
        oldReticleRemoved: !reticle.scene,
        noOldHit: s.input.manager.hitTest(point, s.enemyViews.flatMap(v => [v.clickArea, v.hitArea]), s.cameras.main).length === 0,
        selected: s.selectedEnemyIndex,
      };
    });
    assert.ok(rebuilt.removed && rebuilt.pulseStopped && rebuilt.oldReticleRemoved && rebuilt.noOldHit, JSON.stringify(rebuilt));
    await page.mouse.click(rebuilt.point.x, rebuilt.point.y);
    assert.equal(await page.evaluate(() => testGame.scene.getScene('BattleScene').selectedEnemyIndex), rebuilt.selected, 'old debug enemy position must not change the target');
    // Repeat rebuilding through addition, removal, and replacement.
    assert.ok(await page.evaluate(async () => {
      const s = testGame.scene.getScene('BattleScene');
      const { Enemy } = await import('/src/models/Combatants.ts');
      const { ENEMY_DEFINITIONS } = await import('/src/data/enemies.ts');
      for (const id of ['grunt', 'slimeColony', 'slime']) {
        const old = [...s.enemyViews], pulse = s.reticlePulse;
        if (id === 'grunt') s.enemies.push(new Enemy(ENEMY_DEFINITIONS[id]));
        else s.enemies.splice(0, s.enemies.length, new Enemy(ENEMY_DEFINITIONS[id]));
        rebuildDebugEnemies(s, 0);
        if (old.some(v => v.clickArea.scene) || s.tweens.getTweensOf(pulse).length || s.tweens.getTweensOf(s.reticlePulse).length !== 1) return false;
      }
      return true;
    }), 'debug rebuilds must not accumulate pointer targets or reticle tweens');
    await page.evaluate(() => { const s = testGame.scene.getScene('BattleScene'); s.enemyViews[0].enemy.hp = 0; s.updateHud(); });
    assert.equal(await page.evaluate(() => testGame.scene.getScene('BattleScene').enemyViews[0].clickArea.visible), false);
    // The colony is wider than the HP bar; it must use opaque bounds, too.
    await page.evaluate(async () => {
      const { RUN_STATE, resetRunState } = await import('/src/models/RunState.ts');
      resetRunState(); RUN_STATE.encounterEnemyIds = ['slimeColony'];
      testGame.scene.getScene('BattleScene').scene.restart();
    });
    await page.waitForFunction(() => { const s = testGame.scene.getScene('BattleScene'); return s.enemyViews.length === 1 && s.enemyViews[0].enemy.definition.id === 'slimeColony' && s.canEndTurn && !s.isAnimating && !s.handInputLocked; });
    assert.ok(await page.evaluate(() => {
      const v = testGame.scene.getScene('BattleScene').enemyViews[0], b = v.clickArea.getBounds(), opaque = v.hitArea.getBounds();
      return opaque.width > v.bars.hpBg.width && Math.abs(b.width - opaque.width) < 0.01 && Math.abs(b.centerX - opaque.centerX) < 0.01 && b.width < v.body.displayWidth;
    }), 'colony click width must match opaque bounds, excluding transparent padding');
    assert.deepEqual(errors, []);
    console.log('PASS: stationary reticle, click boundaries, bar Tips, keyboard bounds, debug rebuild cleanup, no-EP and defeated enemies');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
