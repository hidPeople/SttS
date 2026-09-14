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
    const result = await page.evaluate(async () => {
      const s = testGame.scene.getScene('BattleScene');
      const { STATUS_DESCRIPTIONS } = await import('/src/data/statuses.ts');
      const { localizeGameText } = await import('/src/models/gameText.ts');
      const definition = STATUS_DESCRIPTIONS.Aftershocks;
      const trigger = definition.triggers.find(t => t.consumeRule === 'allWhileEnergy');
      const defaultSize = trigger.stacksPerEnergy;
      // Skip animation time only; run real consumption and energy effects.
      s.pulseStatusIcon = async () => {};
      s.runStatusTriggerVisuals = async () => {};
      s.wait = async () => {};
      const consume = s.player.consumeStatus.bind(s.player), chunks = [];
      s.player.consumeStatus = (status, amount) => { chunks.push(amount); return consume(status, amount); };
      const cases = [];
      for (const [size, stacks, energy] of [[2,5,3],[2,7,2],[2,1,3],[2,0,3],[2,5,0],[3,7,3],[undefined,5,3]]) {
        trigger.stacksPerEnergy = size;
        s.player.statuses.set('Aftershocks', stacks); s.player.energy = energy; chunks.length = 0;
        await s.applyStatusTriggerEffects({ status: 'Aftershocks', definition, trigger, owner: s.player });
        cases.push({ stacks: s.player.statuses.get('Aftershocks') ?? 0, energy: s.player.energy, chunks: [...chunks] });
      }
      trigger.stacksPerEnergy = 4;
      const ja = localizeGameText(definition.description, 'ja'), en = localizeGameText(definition.description, 'en');
      trigger.stacksPerEnergy = defaultSize;
      s.player.statuses.set('Aftershocks', 3); consume('Aftershocks');
      return { defaultSize, cases, ja, en, legacy: s.player.statuses.get('Aftershocks') };
    });
    assert.equal(result.defaultSize, 2);
    assert.deepEqual(result.cases, [
      {stacks:0,energy:0,chunks:[2,2,1]}, {stacks:3,energy:0,chunks:[2,2]},
      {stacks:0,energy:2,chunks:[1]}, {stacks:0,energy:3,chunks:[]},
      {stacks:5,energy:0,chunks:[]}, {stacks:0,energy:0,chunks:[3,3,1]},
      {stacks:2,energy:0,chunks:[1,1,1]},
    ]);
    assert.match(result.ja, /4スタックごとにエナジーを1/);
    assert.match(result.en, /lose 1 energy per 4 stacks/);
    assert.equal(result.legacy, 2);
    console.log('PASS: configurable batches, partial remainder, energy exhaustion, zero stacks, default compatibility and dynamic EN/JA descriptions');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
