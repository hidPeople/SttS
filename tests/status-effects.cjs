// Browser is only a module host for Phaser-dependent combat logic. No UI operations or visual assertions.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}), headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(process.env.GAME_TEST_URL || 'http://127.0.0.1:5175');
    const result = await page.evaluate(async () => {
      const { BattleScene } = await import('/src/scenes/BattleScene.ts');
      const { Enemy, Player } = await import('/src/models/Combatants.ts');
      const { ENEMY_DEFINITIONS } = await import('/src/data/enemies.ts');
      const { PLAYER_DEFINITION } = await import('/src/data/player.ts');
      const { effect } = await import('/src/data/effectBuilders.ts');
      const { StatusRuntime } = await import('/src/models/statusRuntime.ts');
      const { EFFECT_TIMINGS } = await import('/src/models/types.ts');
      const s = new BattleScene();
      // Stub presentation boundaries, leaving target resolution, chance, damage and status hooks real.
      for (const key of ['updateHud', 'playStatusAppliedMotion', 'syncPlayerFaintedPose', 'refreshHandCardUsabilities', 'addGlobalFlavorEvent', 'playDamageEffect', 'showDamageNumber', 'addPlayerEpDamageQuote', 'addEpDamageBattleLog', 'playerEpDamageMotion']) s[key] = () => {};
      s.addFlavorEvent = () => new Set();
      for (const key of ['pulseStatusIcon', 'addStatusApplicationLog', 'runStatusTriggerVisuals', 'wait', 'runEnemyReactionsForPlayerSelfEpDamage']) s[key] = async () => {};
      s.addEffectCardsToHand = async () => ({ count: 0 });
      s.relicTriggersForTiming = () => [];
      s.playerEffectY = () => 0;
      const fresh = (definitions = [ENEMY_DEFINITIONS.grunt]) => {
        s.player = new Player(PLAYER_DEFINITION); s.player.statuses.clear();
        s.enemies = definitions.map(d => new Enemy(d)); s.enemy = s.enemies[0];
        s.enemyViews = s.enemies.map(enemy => ({ enemy }));
        s.statusRuntime = new StatusRuntime(); s.isPlayerTurn = true;
        s.statusRuntime.advance(s.player, s.enemies, 0);
      };
      const apply = (target, status) => s.applyStatusToCombatantWithTriggers(target, status, 1);
      const state = 'Aphrodisiac', connected = [], contacts = [], slimeContacts = [], rolls = [], idle = [];
      for (const contact of ['InsertA', 'InsertV', 'InsertM', 'IntrudedA', 'IntrudedV', 'IntrudedM']) {
        fresh(); await apply(s.player, state); await apply(s.enemy, contact);
        contacts.push([s.enemy.hasStatus(contact), s.enemy.statuses.get(state)]);
      }
      for (const [part, amount, source, chance] of [['M', .1, 'card', 1], ['V', .1, 'card', 1], ['A', .1, 'card', 1], ['B', .1, 'card', 1], ['C', .1, 'card', 1], ['M', 0, 'card', 1], ['M', .1, 'status', 1], ['M', .1, 'card', 0]]) {
        fresh([ENEMY_DEFINITIONS.grunt, ENEMY_DEFINITIONS.grunt, ...['softBody', 'sexToy'].map(trait => ({ ...ENEMY_DEFINITIONS.grunt, traits: [trait] })), { ...ENEMY_DEFINITIONS.grunt, maxEp: 0 }]);
        for (const [i, enemy] of s.enemies.entries()) if (i !== 1) enemy.statuses.set('IntrudedV', 1);
        await apply(s.player, state);
        await s.executeEffects([effect('epDamage', 'player', amount, { epDamageParts: [part], chance })], s.battleEventContext({ source, actor: s.player }));
        connected.push(s.enemies.map(e => e.hasStatus(state)));
      }
      fresh(); await apply(s.player, state); await apply(s.enemy, state);
      const multipliers = [s.playerNonArousalEpDamageMultiplier(), s.modifiedEnemyEpDamage(4, s.enemy, false)];
      for (const contact of ['IntrudedA', 'IntrudedV', 'IntrudedM']) {
        fresh([ENEMY_DEFINITIONS.aphrodisiacSlime]);
        await apply(s.enemy, contact);
        const immediate = s.player.statuses.get(state);
        s.statusRuntime.advance(s.player, s.enemies, 0);
        await s.runStatusTriggersForTiming(EFFECT_TIMINGS.TurnStart, {}, { skipEffectKinds: new Set(['hpDamage', 'epDamage', 'addCardToHand']) });
        slimeContacts.push([immediate, s.player.statuses.get(state), s.enemy.hasStatus(state)]);
      }
      for (const part of ['A', 'V']) for (const roll of [.149, .15, .99]) {
        fresh(); const damage = [];
        s.applyPlayerEpDamage = async amount => { damage.push(amount); return false; };
        s.player.statuses.set(`Infested${part}_AphrodisiacSlime`, 2);
        const random = Math.random; Math.random = () => roll;
        try { await s.runStatusTriggersForTiming(EFFECT_TIMINGS.PlayerActionStart); }
        finally { Math.random = random; }
        rolls.push([damage, s.player.hasStatus(state)]);
      }
      for (const history of [[0, 0], [0, 1], [1, 0]]) {
        fresh(); await apply(s.player, state);
        s.statusRuntime.advance(s.player, s.enemies, history[0]);
        await s.runTurnStartHooks(); const first = s.player.hasStatus('Horny');
        s.statusRuntime.advance(s.player, s.enemies, history[1]);
        await s.runTurnStartHooks(); idle.push([first, s.player.hasStatus('Horny')]);
      }
      return { contacts, connected, multipliers, slimeContacts, rolls, idle };
    });
    assert.deepEqual(result.contacts, Array(6).fill([true, 3]));
    assert.deepEqual(result.connected, [...Array(3).fill([true, false, false, false, false]), ...Array(5).fill(Array(5).fill(false))]);
    assert.deepEqual(result.multipliers, [1.5, 6]);
    assert.deepEqual(result.slimeContacts, Array(3).fill([3, 3, false]));
    assert.deepEqual(result.rolls, Array(2).fill([[[2], true], [[2], false], [[2], false]]).flat());
    assert.deepEqual(result.idle, [[false, true], [false, false], [false, false]]);
    console.log('PASS combat hooks: connected-only transfer, immunity, multipliers, contact refresh, additive 15% chance, two-turn history');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
