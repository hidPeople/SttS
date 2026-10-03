import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const m = {};
try {
  for (const name of ['models/Combatants', 'models/types', 'models/localization', 'models/gameText', 'models/conditions', 'models/statusRuntime', 'models/statusRestrictions', 'models/statusConsumption', 'models/relicRules', 'models/turnEpEffects', 'models/cardDescription', 'data/cards', 'data/relics', 'data/player', 'data/enemies', 'data/statuses', 'data/effectBuilders', 'data/bodyParts']) Object.assign(m, await server.ssrLoadModule('/src/' + name + '.ts'));
} finally { await server.close(); }
const { Player, Enemy, PLAYER_DEFINITION, ENEMY_DEFINITIONS, RELIC_DEFINITIONS, CARD_DEFINITIONS, STATUS_DESCRIPTIONS, EFFECT_TIMINGS, FLAVOR_EVENTS, TurnEpEffects, StatusRuntime, effect: makeEffect } = m;
const source = ts.createSourceFile('BattleScene.ts', fs.readFileSync(new URL('../src/scenes/BattleScene.ts', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true);
const scene = source.statements.find(n => ts.isClassDeclaration(n) && n.name.text === 'BattleScene');
const names = ['effectsByPriority', 'enemyIntentEffectsInExecutionOrder', 'isIntrudedStatus', 'applyEffectStatus', 'applyStatusToCombatant', 'applyStatusToCombatantWithTriggers', 'canApplyEnemyBodyPartStatus', 'enemyHasBodyPartStatus', 'bodyPartStatusForKind', 'enemyBodyPartStatus', 'targetsEnemy', 'isEnemyTargetEffect', 'executeEffect', 'executeEffects', 'prepareRelicTrigger', 'applyRelicTriggerBatch', 'applyRelicTriggerEffects', 'runPlayerOrgasmHooks', 'applyEffectEnergyGain', 'applyEffectHpHeal', 'executeStatusTriggerEffects', 'statusTriggerEffectsForRun', 'effectTargets', 'applyEffectEpDamage', 'applyEnemyEpDamage', 'applyPlayerEpDamage', 'flushSharedEpDamage', 'queuePlayerOrgasmRelicDamage', 'withOrgasmRelicDamage', 'modifiedEnemyEpDamage', 'modifiedPlayerEpDamage', 'playerEpDamageMultiplier', 'playerNonArousalEpDamageMultiplier', 'playerSensitivityEpDamageMultiplier', 'roundModifiedPlayerEpDamage', 'epDamageMultiplierForArousal', 'isArousalStatus', 'normalizedEpDamageParts', 'startTurnCounters', 'resolveRegularPlayerOrgasm', 'resolveContinuousPlayerOrgasm', 'runContinuousPlayerOrgasmFinalHooks', 'applyContinuousPlayerOrgasmHpDamage', 'continuousPlayerOrgasmHpDamagePerOrgasm', 'applyEffectHpDamage'];
const methods = names.map(name => scene.members.find(n => n.name?.getText(source) === name).getText(source)).join('\n');
const code = ts.transpileModule('class Harness {' + methods + '}', { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
const deps = { ...m, makeEffect, PLAYER_EFFECT_X: 0, ORGASM_FLASH_CYCLE_DURATION: 120, ORGASM_BASE_FLASH_COUNT: 5, ORGASM_CONTINUOUS_ONE_FLASH_THRESHOLD: 5, ORGASM_CONTINUOUS_SPEED_MULTIPLIER: 1.1 };
const Harness = new Function(...Object.keys(deps), code + ';return Harness;')(...Object.values(deps));

test('same-event relics share one presentation while their effects keep source order', async () => {
  const s = fresh(['succubusBlood', 'lilimBlood']);
  const events = [];
  s.pulseRelicIcons = async ids => { events.push(['pulse', ...ids]); };
  s.executeEffects = async (_effects, context) => { events.push(['effect', context.relic.id]); return { messages: [context.relic.id] }; };
  const entries = ['succubusBlood', 'lilimBlood'].map(id => ({ relic: RELIC_DEFINITIONS[id], trigger: RELIC_DEFINITIONS[id].triggers[0] }));
  const messages = await s.applyRelicTriggerBatch(entries, { triggerEnemy: s.enemies[0] });
  assert.deepEqual(events, [['pulse', 'succubusBlood', 'lilimBlood'], ['effect', 'succubusBlood'], ['effect', 'lilimBlood']]);
  assert.deepEqual(messages, ['succubusBlood', 'lilimBlood']);
});

test('batch chance rolls once per trigger and duplicate relic IDs animate once', async t => {
  const original = Math.random; let rolls = 0;
  Math.random = () => { rolls++; return .25; };
  t.after(() => { Math.random = original; });
  const s = fresh(); const pulses = []; const effects = [];
  s.pulseRelicIcons = async ids => pulses.push(ids);
  s.executeEffects = async (_effects, context) => { effects.push(context.relic.id); return { messages: [] }; };
  const relic = RELIC_DEFINITIONS.succubusBlood;
  const trigger = relic.triggers[0];
  await s.applyRelicTriggerBatch([
    { relic, trigger: { ...trigger, chance: .5 } },
    { relic, trigger: { ...trigger, chance: .5 } },
    { relic: RELIC_DEFINITIONS.lilimBlood, trigger: { ...trigger, chance: .1 } },
  ]);
  assert.equal(rolls, 3);
  assert.deepEqual(pulses, [['succubusBlood']]);
  assert.deepEqual(effects, ['succubusBlood', 'succubusBlood']);
});
test('relic effects proceed without waiting for icon animations in batch and direct hooks', async () => {
  for (const batch of [true, false]) {
    const s = fresh(['succubusBlood', 'lilimBlood']);
    s.pulseRelicIcons = () => new Promise(() => {});
    const applied = [];
    s.executeEffects = async (_effects, context) => { applied.push(context.relic.id); return { messages: [context.relic.id] }; };
    const entries = ['succubusBlood', 'lilimBlood'].map(id => ({ relic: RELIC_DEFINITIONS[id], trigger: RELIC_DEFINITIONS[id].triggers[0] }));
    let completed = false;
    const task = (batch ? s.applyRelicTriggerBatch(entries, { triggerEnemy: s.enemies[0] })
      : s.applyRelicTriggerEffects(entries[0], s.battleEventContext({ relic: entries[0].relic, triggerEnemy: s.enemies[0] })))
      .then(() => { completed = true; });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(completed, true, 'unfinished UI animation must not stall battle effects');
    assert.deepEqual(applied, batch ? ['succubusBlood', 'lilimBlood'] : ['succubusBlood']);
    await task;
  }
});

function fresh(relics = []) {
  const s = new Harness();
  s.player = new Player({ ...PLAYER_DEFINITION, relics, maxHp: 100, maxEp: 1000 });
  s.enemies = [new Enemy({ ...ENEMY_DEFINITIONS.grunt, maxHp: 100, maxEp: 1000 }), new Enemy({ ...ENEMY_DEFINITIONS.grunt, maxHp: 100, maxEp: 1000 })];
  s.enemy = s.enemies[0]; s.turnEpEffects = new TurnEpEffects(); s.statusRuntime = new StatusRuntime();
  s.epDamageDepth = s.sharedEpDamageDepth = 0; s.pendingSharedEpDamage = []; s.pendingOrgasmRelicDamage = [];
  s.isPlayerTurn = true; s.playerOrgasmNextFlashCount = 5; s.playerOrgasmsThisCycle = 0; s.playerBars = {}; s.hits = []; s.misses = 0;
  s.sys = { isActive: () => true };
  for (const name of ['updateHud', 'addFlavorEvent', 'addGlobalFlavorEvent', 'addRandomAmountFlavors', 'addPlayerEpDamageQuote', 'addEpDamageBattleLog', 'runEnemyDamagedHooks', 'playerEpDamageMotion', 'enemyEpDamageMotion', 'refreshHandCardUsabilities', 'refreshPlayerPortrait', 'healingEffect', 'showHealNumber', 'showEnergyRecoveryBlocked', 'addAftershocksAfterConsumptionFlavor']) s[name] = () => {};
  for (const name of ['wait', 'pulseRelicIcons', 'pulseStatusIcon', 'runStatusTriggerVisuals', 'animateEpFillTo', 'recordPlayerEpDamage', 'spreadStatusesForCard', 'runEnemyReactionsForPlayerSelfEpDamage', 'notifyAutomaticStatusChanges']) s[name] = async () => {};
  s.beginPlayerPortraitFactor = () => () => {};
  s.enemyEpAttackMotion = () => () => {};
  s.enemyEffectX = e => s.enemies.indexOf(e) + 1; s.enemyEffectY = s.playerEffectY = () => 0;
  s.playDamageEffect = (_attr, x, _y, amount) => s.hits.push({ x, amount });
  s.showDamageNumber = () => {}; s.showMissEffect = () => { s.misses++; };
  s.combatantDisplayNames = target => target.definition.name;
  s.enemyViewFor = () => ({ bars: {} }); s.cowgirlEffectTargets = () => [];
  s.resolvePlayerEpDamageParts = () => ['M']; s.playerEffectiveMaxEp = () => s.player.maxEp;
  s.currentPlayerSensitivityLevel = part => s.levels?.[part] ?? 0;
  s.currentPlayerArousalStatus = () => ['DesperateToCum', 'Frustrated', 'InHeat', 'Horny'].find(id => s.player.hasStatus(id));
  s.bindingEnemyForContext = () => undefined; s.statusDisplayName = id => id;
  s.battleEventContext = c => ({ player: s.player, enemies: s.enemies, actor: s.player, source: 'system', sourceName: 'test', isPlayerTurn: s.isPlayerTurn, ...c });
  s.relicTriggersForTiming = timing => s.player.relicIds.flatMap(id => RELIC_DEFINITIONS[id].triggers.filter(t => t.timing === timing).map(trigger => ({ relic: RELIC_DEFINITIONS[id], trigger })));
  s.effectRepeatCount = effect => effect.times; s.effectRepeatContext = (_e, c) => c; s.effectAmountForContext = e => e.amount;
  s.addEnemyDamage = (result, enemy, amount) => result.damagedEnemies.set(enemy, amount);
  s.resolveRegularPlayerOrgasm = async () => { s.player.recoverFromOrgasm(0); };
  s.resolveEnemyOrgasm = async enemy => { enemy.ep = 0; };
  s.consumeStatusWithNotice = async (owner, status, count) => owner.consumeStatus(status, count);
  return s;
}
const result = () => ({ messages: [], causedPlayerOrgasm: false, damagedEnemies: new Map() });
const context = (s, extra = {}) => s.battleEventContext(extra);
const hit = (s, target, amount) => s.applyEffectEpDamage(makeEffect('epDamage', target === s.player ? 'player' : 'selectedEnemy', amount), target, amount, context(s), result());

// Exercise real effect dispatch, not just the model's public flags.
test('cards apply to EP enemies, refresh without stacking, persist through enemy turn, and expire at the next player turn', async () => {
  const s = fresh();
  for (const id of ['sharedSensation', 'sensitivityTransfer']) {
    const card = CARD_DEFINITIONS[id];
    await s.executeEffects(card.effects, context(s, { card, source: 'card', selectedEnemy: s.enemy }));
    await s.executeEffects(card.effects, context(s, { card, source: 'card', selectedEnemy: s.enemy }));
    assert.equal(s.targetsEnemy(card), true); assert.equal(card.cost, 1); assert.equal(card.rarity, 'rare');
    for (const lang of ['ja', 'en']) assert.ok(m.cardDescriptionLines(card, lang).flat().every(segment => !segment.text.includes('{')));
  }
  assert.deepEqual(s.turnEpEffects.recipients(s.player, s.player), [s.enemy]);
  assert.equal(s.turnEpEffects.sensitivityPart(s.enemy), 'C');
  s.isPlayerTurn = false;
  assert.equal(s.turnEpEffects.recipients(s.enemy, s.player).length, 1);
  await s.startTurnCounters();
  assert.equal(s.turnEpEffects.recipients(s.player, s.player).length, 0);
  assert.equal(s.turnEpEffects.sensitivityPart(s.enemy), undefined);
  const noEp = new Enemy({ ...ENEMY_DEFINITIONS.grunt, maxEp: 0 });
  for (const id of ['sharedSensation', 'sensitivityTransfer']) {
    const card = CARD_DEFINITIONS[id];
    await s.executeEffects(card.effects, context(s, { card, source: 'card', selectedEnemy: noEp }));
    assert.ok(m.evaluateConditions(card.flavors[FLAVOR_EVENTS.Card.Play][0].conditions, context(s, { selectedEnemy: noEp })));
    assert.ok(!m.evaluateConditions(card.flavors[FLAVOR_EVENTS.Card.Play][1].conditions, context(s, { selectedEnemy: noEp })));
  }
  assert.equal(s.misses, 2);
});

test('shared damage bypasses all receiver multipliers and fixed-damage overrides, with no bounce or cross-link recursion', async () => {
  const s = fresh(['contractSigil']); s.player.orgasmCount = 200;
  s.player.addStatus('Horny'); s.player.addStatus('Aphrodisiac'); s.levels = { M: 5 };
  for (const e of s.enemies) { e.addStatus('Aphrodisiac'); s.turnEpEffects.share(e); }
  const expected = s.modifiedPlayerEpDamage(2, ['M']);
  await hit(s, s.player, 2);
  assert.equal(s.player.ep, expected);
  for (const e of s.enemies) assert.equal(e.ep, expected, 'recipient does not apply its 1.5 multiplier again');
  s.player.addStatus('Starvation');
  await hit(s, s.enemy, 2); // enemy receives 3; player must receive exactly 3 despite Starvation
  assert.equal(s.enemy.ep, expected + 3);
  assert.equal(s.player.ep, expected + 3);
  assert.equal(s.enemies[1].ep, expected, 'shared damage is not relayed to another link');
  assert.equal(s.pendingSharedEpDamage.length, 0); assert.equal(s.epDamageDepth, 0);
});

test('shared damage includes overflow Orgasms and relays only the actually applied amount when an enemy dies', async () => {
  const s = fresh(); s.player.ep = 999; s.turnEpEffects.share(s.enemy);
  await hit(s, s.player, 3);
  assert.equal(s.player.ep, 2); assert.equal(s.enemy.ep, 3); assert.equal(s.player.orgasmCount, 1);
  s.player.ep = 0; s.enemy.ep = 999;
  s.resolveEnemyOrgasm = async enemy => { enemy.hp = 0; };
  await hit(s, s.enemy, 5);
  assert.equal(s.player.ep, 1, 'four unconsumed enemy overkill points are not shared');
});

test('sensitivity transfer reads all player factors live using C, replacing the enemy multiplier', () => {
  const s = fresh(['contractSigil']); s.turnEpEffects.copySensitivity(s.enemy, 'C');
  s.enemy.addStatus('Aphrodisiac'); s.levels = { C: 2, M: 5 };
  s.player.addStatus('Horny'); s.player.addStatus('Aphrodisiac'); s.player.orgasmCount = 100;
  assert.equal(s.modifiedEnemyEpDamage(4, s.enemy, false), Math.ceil(4 * 1.5 * 1.5 * 1.5 * 1.001 ** 100));
  s.player.statuses.delete('Horny'); s.player.orgasmCount = 500; s.levels.C = 3;
  assert.equal(s.modifiedEnemyEpDamage(4, s.enemy, false), Math.ceil(4 * 2 * 1.5 * 1.001 ** 500));
  s.turnEpEffects.clear(); assert.equal(s.modifiedEnemyEpDamage(4, s.enemy, false), 6);
});

test('leg-day damage targets only InsertV, sums rounded skipped hits, and starts at the player hit signal', async () => {
  const s = fresh(['neverSkipPussyDay']); s.enemy.addStatus('InsertV'); s.enemy.addStatus('Aphrodisiac');
  s.enemies[1].addStatus('IntrudedV');
  for (let i = 0; i < 3; i++) s.queuePlayerOrgasmRelicDamage();
  assert.equal(s.hits.length, 0, 'skipped Orgasms have no damage animation');
  let finish;
  const barrier = new Promise(resolve => { finish = resolve; });
  s.animateEpFillTo = () => barrier;
  const phase = s.withOrgasmRelicDamage(async () => {
    assert.equal(s.hits.length, 0);
    s.hits.push({ player: true }); s.startOrgasmRelicDamage();
    assert.deepEqual(s.hits, [{ player: true }, { x: 1, amount: 6 }]);
  });
  await Promise.resolve(); finish(); await phase;
  assert.equal(s.enemy.ep, 6); assert.equal(s.enemies[1].ep, 0); assert.equal(s.pendingOrgasmRelicDamage.length, 0);
  s.queuePlayerOrgasmRelicDamage(); await s.withOrgasmRelicDamage(async () => {});
  assert.equal(s.enemy.ep, 8, 'fires even without player HP damage');
});

test('yoga observes absolute 10-orgasm boundaries, including several skipped intervals and the turn-only energy rule', async () => {
  const s = fresh(['extremeYoga']); s.player.hp = 10; s.player.energy = 3;
  await s.runPlayerOrgasmHooks(1, 8); assert.equal(s.player.hp, 10);
  await s.runPlayerOrgasmHooks(1, 9); assert.equal(s.player.hp, 15); assert.equal(s.player.energy, 4);
  await s.runPlayerOrgasmHooks(25, 9); assert.equal(s.player.hp, 30); assert.equal(s.player.energy, 7);
  s.isPlayerTurn = false;
  await s.runPlayerOrgasmHooks(1, 39); assert.equal(s.player.hp, 35); assert.equal(s.player.energy, 7);
});

test('marathon consumes extra Aftershocks per energy including the final partial batch', async () => {
  const s = fresh(['marathonRunner']); s.player.statuses.set('Aftershocks', 7); s.player.energy = 3;
  const batches = [];
  s.consumeStatusWithNotice = async (owner, status, count) => { batches.push(count); owner.consumeStatus(status, count); };
  const definition = STATUS_DESCRIPTIONS.Aftershocks, trigger = definition.triggers.find(t => t.consumeRule === 'allWhileEnergy');
  await s.executeStatusTriggerEffects({ status: 'Aftershocks', owner: s.player, definition, trigger });
  assert.deepEqual(batches, [3, 3, 1]); assert.equal(s.player.energy, 0); assert.equal(s.player.hasStatus('Aftershocks'), false);
  assert.equal(m.statusStacksPerEnergy(trigger, m.relicStatusConsumptionBonus(s.player, 'Aftershocks')), 3);
});


test('actual regular and continuous orgasm coordinators run leg-day at the HP hit and preserve skipped yoga intervals', async () => {
  const s = fresh(['neverSkipPussyDay', 'extremeYoga']); s.enemy.addStatus('InsertV');
  s.player.hp = 20; s.player.energy = 0; s.player.orgasmCount = 7;
  for (const name of ['animatePlayerEpReserveTo', 'flashEpFill', 'showBlockResultEffect']) s[name] = async () => {};
  for (const name of ['prepareArousalStatusForPlayerOrgasm', 'addPlayerOrgasmLog', 'addPlayerOrgasmRepeatQuote', 'setEpFillImmediate', 'showHpDamageBarChip', 'flashPlayer', 'addHpDamageBattleLog']) s[name] = () => {};
  s.playerPortraitFlash = { orgasm: async () => {} };
  s.registerPlayerOrgasmInCycle = async () => { s.playerOrgasmsThisCycle++; };
  s.nextPlayerEpRecoveryValue = () => 0; s.playerOrgasmRecoveryValueAfterReserveEffects = value => value;
  const damage = makeEffect('hpDamage', 'player', 1, { attackAttribute: 'love' });
  s.statusTriggersForTiming = () => [{ owner: s.player, status: 'Focused', trigger: { effects: [damage] } }];
  s.player.statuses.set('Focused', 1); s.statusEffectAmount = effect => effect.amount;
  s.runStatusTriggersForTiming = async (timing, _context, options = {}) => {
    if (timing === EFFECT_TIMINGS.PlayerOrgasm && !options.skipEffectKinds?.has('hpDamage')) await s.applyEffectHpDamage(damage, s.player, 1, context(s), result());
    return [];
  };
  // Source EP hit owns the depth scope in production.
  s.epDamageDepth = 1;
  await Harness.prototype.resolveRegularPlayerOrgasm.call(s, 2, 1, true);
  assert.deepEqual(s.hits.map(hit => hit.x), [0, 1]);
  assert.equal(s.enemy.ep, 1); assert.equal(s.player.orgasmCount, 8);
  s.hits.length = 0;
  for (let i = 0; i < 3; i++) await s.resolveContinuousPlayerOrgasm(24);
  assert.equal(s.hits.length, 0, 'continuous intermediate steps do not run hit effects');
  await s.runContinuousPlayerOrgasmFinalHooks(3);
  assert.deepEqual(s.hits.map(hit => hit.x), [0, 1]);
  assert.equal(s.hits[1].amount, 3); assert.equal(s.enemy.ep, 4);
  assert.equal(s.player.hp, 21, 'four HP lost, five healed at the tenth orgasm');
  assert.equal(s.player.energy, 1); assert.equal(s.player.orgasmCount, 11);
});

test('shared damage cannot create a feedback loop through an orgasm-triggered relic', async () => {
  const s = fresh(['neverSkipPussyDay']); s.player.maxEp = 1; s.player.ep = 0;
  s.enemy.addStatus('InsertV'); s.turnEpEffects.share(s.enemy);
  s.resolveRegularPlayerOrgasm = async () => {
    s.queuePlayerOrgasmRelicDamage(); await s.withOrgasmRelicDamage(async () => {});
    s.player.recoverFromOrgasm(0);
  };
  await hit(s, s.player, 1);
  assert.equal(s.player.orgasmCount, 2);
  assert.equal(s.enemy.ep, 3);
  assert.equal(s.pendingSharedEpDamage.length, 0);
  assert.equal(s.sharedEpDamageDepth, 0); assert.equal(s.epDamageDepth, 0);
});


test('Orgasm-triggered enemy defeat is returned to the original card damage result', async () => {
  const s = fresh(['neverSkipPussyDay']); s.player.maxEp = 1; s.enemy.maxEp = 1;
  s.enemy.addStatus('InsertV');
  s.resolveRegularPlayerOrgasm = async () => {
    s.queuePlayerOrgasmRelicDamage(); await s.withOrgasmRelicDamage(async () => {});
    s.player.recoverFromOrgasm(0);
  };
  s.resolveEnemyOrgasm = async enemy => { enemy.hp = 0; };
  const outcome = result();
  await s.applyEffectEpDamage(makeEffect('epDamage', 'player', 1), s.player, 1, context(s), outcome);
  assert.equal(s.enemy.isDefeated, true);
  assert.equal(outcome.damagedEnemies.has(s.enemy), true);
  assert.equal(s.epDamageResult, undefined);
});
function enableConnectionStatusEffects(s) {
  s.runStatusTriggersForTiming = async () => [];
  s.addStatusApplicationLog = async () => {};
  s.playStatusAppliedMotion = s.syncPlayerFaintedPose = () => {};
  s.resolveRegularPlayerOrgasm = async () => {
    s.queuePlayerOrgasmRelicDamage();
    await s.withOrgasmRelicDamage(async () => {});
    s.player.recoverFromOrgasm(0);
  };
}

test('all six connection states precede damage, without moving other statuses or removals', async () => {
  for (const status of ['InsertV', 'InsertA', 'InsertM', 'IntrudedV', 'IntrudedA', 'IntrudedM']) {
    const s = fresh(); enableConnectionStatusEffects(s);
    const seen = [];
    s.applyEffectEpDamage = async () => { seen.push(s.enemy.hasStatus(status)); };
    const connection = makeEffect('status', 'self', 1, { status });
    const other = makeEffect('status', 'player', 1, { status: 'Horny' });
    const remove = makeEffect('removeStatus', 'self', 0, { status });
    const effects = [makeEffect('epDamage', 'player', 1), connection, other, remove];
    const actual = [];
    const execute = s.executeEffect.bind(s);
    s.executeEffect = async (e, c, r) => { actual.push(e); if (e !== other && e !== remove) await execute(e, c, r); };
    await s.executeEffects(effects, context(s, { source: 'enemyIntent', actor: s.enemy }));
    assert.deepEqual(seen, [true], status);
    assert.deepEqual(actual, [connection, effects[0], other, remove]);
    assert.deepEqual(effects, [effects[0], connection, other, remove], 'source data is not mutated');
  }
});

test('Grunt V entry orgasm triggers leg-day on that same action; A entry does not', async () => {
  for (const status of ['InsertV', 'InsertA']) {
    const s = fresh(['neverSkipPussyDay']); enableConnectionStatusEffects(s);
    s.player.maxEp = 4;
    const intent = ENEMY_DEFINITIONS.grunt.intents_E.find(i => i.effects.some(e => e.status === status));
    await s.executeEffects(s.enemyIntentEffectsInExecutionOrder(intent.effects), context(s, { source: 'enemyIntent', actor: s.enemy, intent }));
    assert.equal(s.player.orgasmCount, 1);
    assert.equal(s.enemy.hasStatus(status), true);
    assert.equal(s.enemy.ep, status === 'InsertV' ? 7 : 6);
  }
});

test('reaction intrusion is present at damage time; occupied parts still reject insertion', async () => {
  const s = fresh(); enableConnectionStatusEffects(s);
  const rule = ENEMY_DEFINITIONS.slime.reactionRules.find(r => r.effects.some(e => e.status === 'IntrudedV'));
  let connectedAtHit = false;
  s.applyEffectEpDamage = async () => { connectedAtHit = s.enemy.hasStatus('IntrudedV'); };
  await s.executeEffects(rule.effects, context(s, { source: 'enemyIntent', actor: s.enemy }));
  assert.equal(connectedAtHit, true);
  s.enemy.statuses.clear(); s.enemies[1].addStatus('InsertV');
  const intent = ENEMY_DEFINITIONS.grunt.intents_E.find(i => i.effects.some(e => e.status === 'InsertV'));
  await s.executeEffects(s.enemyIntentEffectsInExecutionOrder(intent.effects), context(s, { source: 'enemyIntent', actor: s.enemy, intent }));
  assert.equal(s.enemy.hasStatus('InsertV'), false);
});

test('connection spread occurs before damage and counters can stop a defeated enemy action', async () => {
  const s = fresh(['neverSkipPussyDay']); enableConnectionStatusEffects(s);
  s.player.addStatus('Aphrodisiac');
  const intent = ENEMY_DEFINITIONS.grunt.intents_E.find(i => i.effects.some(e => e.status === 'InsertV'));
  let spreadAtHit = false;
  s.applyEffectEpDamage = async (_e, target) => { if (target === s.player) spreadAtHit = s.enemy.hasStatus('Aphrodisiac'); };
  await s.executeEffects(s.enemyIntentEffectsInExecutionOrder(intent.effects), context(s, { source: 'enemyIntent', actor: s.enemy, intent }));
  assert.equal(spreadAtHit, true);

  const counter = fresh(['neverSkipPussyDay']); enableConnectionStatusEffects(counter);
  counter.player.maxEp = 4; counter.enemy.maxEp = 1;
  counter.resolveEnemyOrgasm = async enemy => { enemy.hp = 0; };
  const outcome = await counter.executeEffects(counter.enemyIntentEffectsInExecutionOrder(intent.effects), context(counter, { source: 'enemyIntent', actor: counter.enemy, intent }));
  assert.equal(counter.enemy.isDefeated, true);
  assert.equal(outcome.damagedEnemies.has(counter.enemy), true);
  assert.equal(counter.hits.filter(h => h.x === 1).length, 1, 'dead actor does not perform its remaining self-damage');
});
