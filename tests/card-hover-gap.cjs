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
    await page.goto(process.env.GAME_TEST_URL || 'http://127.0.0.1:5175');
    await page.waitForFunction(() => window.testGame?.scene.isActive('TitleScene'));
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => {
      const s = testGame.scene.getScene('BattleScene');
      return s.canEndTurn && !s.isAnimating && !s.handInputLocked;
    });
    await page.mouse.move(0, 0);
    await page.waitForTimeout(350);
    await page.evaluate(() => {
      const s = testGame.scene.getScene('BattleScene');
      window.restPoses = [...s.cardViews.values()].map(v => ({ uid: v.card.uid, x: v.container.x, y: v.container.y, scale: v.container.scaleX, angle: v.container.angle }));
    });
    const hoverMiddle = async () => {
      const p = await page.evaluate(() => {
        const s = testGame.scene.getScene('BattleScene'), v = s.cardViews.get(s.deck.hand[2].uid), b = v.hitArea.getBounds();
        return { x: b.centerX, y: b.centerY, uid: v.card.uid };
      });
      await page.mouse.move(p.x, p.y);
      await page.waitForTimeout(280);
      assert.equal(await page.evaluate(() => testGame.scene.getScene('BattleScene').hoveredCardUid), p.uid);
      return p.uid;
    };
    const findGap = async () => page.evaluate(() => {
      const s = testGame.scene.getScene('BattleScene'), excluded = s.hoveredCardUid;
      const views = [...s.cardViews.values()], objects = views.map(v => v.hitArea);
      const current = views.map(v => ({ x: v.container.x, y: v.container.y, scale: v.container.scaleX, angle: v.container.angle }));
      const hits = (x, y) => s.input.manager.hitTest({ x, y }, objects, s.cameras.main).map(o => views.find(v => v.hitArea === o).card.uid);
      // Search actual transformed hit areas, not axis-aligned bounding boxes.
      const gaps = [];
      for (let y = 470; y < 712; y += 3) for (let x = 240; x < 1010; x += 3) if (!hits(x, y).length) gaps.push({ x, y });
      views.forEach((v, i) => { const p = restPoses[i]; v.container.setPosition(p.x, p.y).setScale(p.scale).setAngle(p.angle); });
      let result;
      for (const p of gaps) {
        const under = hits(p.x, p.y);
        if (under.some(uid => uid !== excluded)) {
          result = { ...p, excluded, under }; break;
        }
      }
      views.forEach((v, i) => { const p = current[i]; v.container.setPosition(p.x, p.y).setScale(p.scale).setAngle(p.angle); });
      return result;
    });

    const first = await hoverMiddle();
    const gap = await findGap();
    assert.ok(gap, 'a real gap should cover a different card after restoration');
    await page.mouse.move(gap.x, gap.y);
    await page.waitForTimeout(700);
    const resumed = await page.evaluate(() => testGame.scene.getScene('BattleScene').hoveredCardUid);
    assert.ok(resumed && resumed !== first && gap.under.includes(resumed), JSON.stringify({ gap, resumed }));
    await page.waitForTimeout(750);
    assert.equal(await page.evaluate(() => testGame.scene.getScene('BattleScene').hoveredCardUid), resumed, 'stationary pointer must not start a hover loop');
    await page.mouse.move(0, 0);
    await page.waitForTimeout(450);
    assert.equal(await page.evaluate(() => testGame.scene.getScene('BattleScene').hoveredCardUid), undefined, 'transferred hover releases on mouseout');

    // With a single restored card under the pointer, exclude that card itself.
    await page.evaluate(async () => {
      const s = testGame.scene.getScene('BattleScene');
      s.deck.hand.splice(1);
      await s.renderHand();
    });
    await page.waitForTimeout(350);
    const selfCheck = await page.evaluate(() => {
      const s = testGame.scene.getScene('BattleScene'), v = s.cardViews.get(s.deck.hand[0].uid);
      const b = v.hitArea.getBounds();
      s.input.activePointer.position.set(b.centerX, Math.min(710, b.centerY));
      const hit = s.input.hitTestPointer(s.input.activePointer).includes(v.hitArea);
      s.resumeHandHover(v.card.uid);
      const excludedResult = s.hoveredCardUid;
      s.resumeHandHover('a-different-card');
      return { hit, excludedResult, includedResult: s.hoveredCardUid, uid: v.card.uid };
    });
    assert.ok(selfCheck.hit);
    assert.equal(selfCheck.excludedResult, undefined);
    assert.equal(selfCheck.includedResult, selfCheck.uid);
    assert.deepEqual(errors, []);
    console.log('PASS stationary gap handoff, stable hover, subsequent mouseout and self exclusion');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
