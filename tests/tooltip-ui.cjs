const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  const browser = await chromium.launch({ ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}), headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.route('**/src/main.ts*', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()).replace('new Phaser.Game(config)', 'window.testGame = new Phaser.Game(config)') });
    });
    await page.goto(process.env.GAME_TEST_URL || 'http://127.0.0.1:5175');
    await page.waitForFunction(() => window.testGame?.scene.isActive('TitleScene'));
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => {
      const s = testGame.scene.getScene('BattleScene');
      return s.canEndTurn && !s.isAnimating && !s.handInputLocked;
    });
    await page.evaluate(() => {
      const s = testGame.scene.getScene('BattleScene');
      s.player.statuses.set('Focused', 1);
      s.enemy.statuses.set('Focused', 1);
      s.updateHud();
    });
    for (const target of ['relic', 'status', 'enemy-status', 'hp', 'ep', 'enemy-hp']) {
      await page.mouse.move(1250, 500);
      await page.waitForTimeout(350);
      const card = await page.evaluate(() => {
        const s = testGame.scene.getScene('BattleScene'), v = s.cardViews.get(s.deck.hand[0].uid), b = v.hitArea.getBounds();
        return { x: b.centerX, y: b.centerY, uid: v.card.uid };
      });
      await page.mouse.move(card.x, card.y);
      await page.waitForTimeout(220);
      assert.equal(await page.evaluate(() => testGame.scene.getScene('BattleScene').hoveredCardUid), card.uid);
      // Leave the card without crossing another navigation target, then enter a HUD.
      await page.mouse.move(1250, 500);
      await page.waitForTimeout(350);
      const point = await page.evaluate(target => {
        const s = testGame.scene.getScene('BattleScene');
        const object = ({ relic: s.relicIcons.list[0].list[0], status: s.playerStatusIcons.list[0].list[0],
          'enemy-status': s.enemyViews[0].statusIcons.list[0].list[0], hp: s.playerBars.hpBg,
          ep: s.playerBars.epBg, 'enemy-hp': s.enemyViews[0].bars.hpBg })[target];
        window.expectedTooltipSource = object;
        const b = object.getBounds();
        return { x: b.centerX, y: b.centerY };
      }, target);
      await page.mouse.move(point.x, point.y);
      await page.waitForTimeout(100);
      assert.equal(await page.evaluate(() => testGame.scene.getScene('BattleScene').statusTooltip.visible), false, `${target}: hover delay`);
      await page.waitForTimeout(280);
      assert.ok(await page.evaluate(() => {
        const s = testGame.scene.getScene('BattleScene');
        return s.statusTooltip.visible && s.tooltipHover.source === expectedTooltipSource;
      }), `${target}: card exit must preserve the new tooltip request`);
      console.log(`PASS card → ${target}`);
    }
    await page.mouse.move(1250, 500);
    await page.waitForTimeout(100);
    assert.ok(await page.evaluate(() => {
      const s = testGame.scene.getScene('BattleScene'), v = s.cardViews.get(s.deck.hand[0].uid);
      const term = s.add.text(0, 0, 'term');
      v.effectText.add(term);
      s.tooltipHover.request(term, () => {});
      v.hitArea.emit('pointerout', s.input.activePointer);
      const cancelled = !s.tooltipHover.source && !s.tooltipHover.timer;
      term.destroy();
      return cancelled;
    }), 'card exit must still cancel its own pending term tooltip');

    const cases = ['HP: 54/54\n現在のHPです。', 'HP: 54/54\nCurrent health.',
      'ブロック\n衣類を強化して、HPへの攻撃を数値の分だけ防ぐ。ターン開始時にリセットされる。',
      'Block\nStrengthens clothing to prevent the indicated amount of HP damage. Resets at the beginning of the turn.',
      '長い説明文です。複数の行に折り返して表示します。'.repeat(80)];
    fs.mkdirSync('.codex-work', { recursive: true });
    for (const sceneName of ['BattleScene', 'RewardScene']) {
      if (sceneName === 'RewardScene') {
        await page.evaluate(() => testGame.scene.getScene('BattleScene').scene.launch('RewardScene'));
        await page.waitForFunction(() => testGame.scene.getScene('RewardScene').tooltip);
      }
      for (let i = 0; i < cases.length; i++) {
        const layout = await page.evaluate(({ sceneName, text }) => {
          const s = testGame.scene.getScene(sceneName), battle = sceneName === 'BattleScene';
          if (battle) s.showStatusTooltipText(text, 640 - 180, 700, true);
          else s.showTooltip(text, 640 - 180, 700, true);
          const bg = battle ? s.statusTooltipBg : s.tooltipBg, label = battle ? s.statusTooltipText : s.tooltipText;
          const root = battle ? s.statusTooltip : s.tooltip;
          return { width: bg.displayWidth, height: bg.displayHeight, textWidth: label.width, textHeight: label.height,
            x: label.x, y: label.y, font: Number.parseFloat(label.style.fontSize), center: root.x + bg.displayWidth / 2,
            top: root.y, bottom: root.y + bg.displayHeight };
        }, { sceneName, text: cases[i] });
        assert.equal(layout.x, 14 + layout.font / 2);
        assert.equal(layout.y, 12 + layout.font / 2);
        assert.ok(Math.abs(layout.width - (layout.textWidth + 2 * layout.x)) < 1.01);
        assert.ok(Math.abs(layout.height - (layout.textHeight + 2 * layout.y)) < 1.01);
        assert.ok(Math.abs(layout.center - 640) < 0.01, 'card term stays centred above its anchor');
        assert.ok(layout.top >= 8 && layout.bottom <= 712, 'long Tips stay inside the screen');
        assert.ok(layout.width <= 375, 'wrapping keeps the established text width');
        if (i < 2) assert.ok(layout.width < 220, 'short text removes the unused right side');
        if (i === 0 || i === 3) await page.screenshot({ path: `.codex-work/tips-${sceneName}-${i}.png` });
      }
      console.log(`PASS ${sceneName}: Japanese/English, tight width, expanded padding, long text and anchor`);
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
