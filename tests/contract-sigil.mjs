import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const modules = {};
try {
  for (const path of ['models/Combatants', 'models/RunState', 'models/statusRuntime', 'models/relicRules', 'models/types', 'models/localization', 'models/gameText', 'data/player', 'data/enemies', 'data/relics', 'data/statuses', 'data/effectBuilders']) {
    Object.assign(modules, await server.ssrLoadModule('/src/' + path + '.ts'));
  }
} finally { await server.close(); }
const { Player, Enemy, PLAYER_DEFINITION, ENEMY_DEFINITIONS, RELIC_DEFINITIONS, STATUS_DESCRIPTIONS, StatusRuntime, statusTargetAllowed,
  EFFECT_TIMINGS, RUN_STATE, resetRunState, startEventBattle, saveRunVitals, advanceRunBattle,
  relicEpDamageTakenMultiplier, relicTextReplacements, localizeGameText, idleOrgasmRelicApplications, statusTriggersForTiming, localize, effect: makeEffect } = modules;
const source = ts.createSourceFile('BattleScene.ts', fs.readFileSync(new URL('../src/scenes/BattleScene.ts', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true);
const scene = source.statements.find(n => ts.isClassDeclaration(n) && n.name.text === 'BattleScene');
const names = ['runTurnStartHooks', 'applyStatusToCombatant', 'removeStatusByEffect', 'remainingPlayerStatuses', 'playerNonArousalEpDamageMultiplier'];
const methods = names.map(name => scene.members.find(n => n.name?.getText(source) === name).getText(source)).join(' ');
const code = ts.transpileModule('class Harness {' + methods + '}', { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
const dependencies = { Enemy, STATUS_DESCRIPTIONS, statusTargetAllowed, EFFECT_TIMINGS, localize, makeEffect, idleOrgasmRelicApplications, relicEpDamageTakenMultiplier, statusTriggersForTiming };
const Harness = new Function(...Object.keys(dependencies), code + '; return Harness;')(...Object.values(dependencies));
function fresh() {
  const s = new Harness();
  s.player = new Player(PLAYER_DEFINITION); s.statusRuntime = new StatusRuntime();
  s.isArousalStatus = id => STATUS_DESCRIPTIONS[id]?.exclusiveGroup === 'arousal';
  s.battleEventContext = context => context;
  s.relicTriggersForTiming = () => [];
  return s;
}

test('default order, tutorial exclusion, retry and normal-new-game restoration', () => {
  resetRunState();
  const index = RUN_STATE.relicIds.indexOf('succubusBlood');
  assert.equal(RUN_STATE.relicIds[index + 1], 'contractSigil');
  assert.equal(RELIC_DEFINITIONS.contractSigil.rarity, 'event');
  startEventBattle('tutorial');
  assert.deepEqual(RUN_STATE.relicIds, PLAYER_DEFINITION.relics.filter(id => id !== 'contractSigil'));
  startEventBattle('tutorial'); assert.ok(!RUN_STATE.relicIds.includes('contractSigil'));
  resetRunState(); assert.deepEqual(RUN_STATE.relicIds, PLAYER_DEFINITION.relics);
});

test('run orgasm total compounds once per orgasm and previews do not mutate it', () => {
  const s = fresh(), p = s.player;
  assert.equal(relicEpDamageTakenMultiplier(p), 1, 'part-specific initial progress is unrelated');
  for (let i = 0; i < 3; i++) p.recoverFromOrgasm(0);
  assert.equal(p.orgasmCount, 3);
  const expected = 1.001 ** 3;
  assert.equal(relicEpDamageTakenMultiplier(p), expected);
  assert.equal(relicEpDamageTakenMultiplier(p), expected);
  assert.equal(s.playerNonArousalEpDamageMultiplier(), expected);
  p.addStatus('Aphrodisiac');
  assert.equal(s.playerNonArousalEpDamageMultiplier(), expected * 1.5);
  assert.equal(relicEpDamageTakenMultiplier({ relicIds: ['succubusBlood'], orgasmCount: 200 }), 1);
});

test('three completed non-orgasm turns apply before status hooks; orgasm interrupts the wait', async () => {
  const s = fresh(); let applied = 0;
  s.applyRelicTriggerBatch = async entries => {
    for (const { relic, trigger } of entries) {
      assert.equal(relic.id, 'contractSigil'); applied++;
      for (const effect of trigger.effects) s.applyStatusToCombatant(s.player, effect.status, effect.amount);
    }
    return [];
  };
  s.runStatusTriggersForTiming = async timing => {
    assert.equal(timing, EFFECT_TIMINGS.TurnStart);
    if (s.statusRuntime.turn === 4) assert.ok(s.player.hasStatus('Estrus'), 'available to the current turn-start hook');
  };
  for (let turn = 1; turn <= 3; turn++) { s.statusRuntime.advance(s.player, [], 0); await s.runTurnStartHooks(); assert.equal(applied, 0); }
  s.statusRuntime.advance(s.player, [], 0); await s.runTurnStartHooks(); assert.equal(applied, 1);
  s.statusRuntime.advance(s.player, [], 0); await s.runTurnStartHooks(); assert.equal(applied, 1, 'do not repeatedly reapply');
  s.player.statuses.delete('Estrus');
  s.statusRuntime.advance(s.player, [], 1); assert.equal(idleOrgasmRelicApplications(s.player, s.statusRuntime).length, 0);
  for (let i = 0; i < 2; i++) { s.statusRuntime.advance(s.player, [], 0); assert.equal(idleOrgasmRelicApplications(s.player, s.statusRuntime).length, 0); }
  s.statusRuntime.advance(s.player, [], 0); assert.equal(idleOrgasmRelicApplications(s.player, s.statusRuntime).length, 1);
  assert.equal(idleOrgasmRelicApplications(s.player, new StatusRuntime()).length, 0, 'battle-local history');
});

test('Estrus is player-only, non-stacking, persistent, and removed by own orgasm', () => {
  const s = fresh(), p = s.player;
  assert.equal(s.applyStatusToCombatant(new Enemy(ENEMY_DEFINITIONS.grunt), 'Estrus', 1).changed, false);
  assert.equal(s.applyStatusToCombatant(p, 'Estrus', 1).changed, true);
  assert.equal(s.applyStatusToCombatant(p, 'Estrus', 1).changed, false);
  for (let i = 0; i < 6; i++) s.statusRuntime.advance(p, [], 0);
  assert.equal(p.statuses.get('Estrus'), 1); assert.equal(STATUS_DESCRIPTIONS.Estrus.consumeEachTurn, 0);
  const turn = statusTriggersForTiming('Estrus', EFFECT_TIMINGS.TurnStart);
  assert.deepEqual(turn[0].effects.map(e => [e.kind, e.target, e.amount, e.status]), [['status', 'player', 1, 'Horny']]);
  assert.equal(statusTriggersForTiming('Estrus', EFFECT_TIMINGS.EnemyOrgasm).length, 0);
  p.orgasmCount = 123;
  saveRunVitals(p.hp, p.ep, p.orgasmCount, 0, p.epDamageByPart, p.orgasmByPart, p.recentOrgasmByPart, s.remainingPlayerStatuses());
  advanceRunBattle(); assert.equal(RUN_STATE.playerOrgasmCount, 123);
  assert.ok(RUN_STATE.playerStatuses.some(s => s.effect === 'Estrus' && s.stacks === 1));
  const restored = new Player({ ...PLAYER_DEFINITION, relics: RUN_STATE.relicIds });
  restored.orgasmCount = RUN_STATE.playerOrgasmCount;
  assert.equal(relicEpDamageTakenMultiplier(restored), 1.001 ** 123);
  const orgasm = statusTriggersForTiming('Estrus', EFFECT_TIMINGS.PlayerOrgasm);
  assert.equal(orgasm[0].effects[0].kind, 'removeStatus');
  assert.equal(orgasm[0].effects[0].target, 'player');
  assert.deepEqual(s.removeStatusByEffect(p, orgasm[0].effects[0], 'Estrus'), ['Estrus']);
  assert.equal(p.hasStatus('Estrus'), false);
  resetRunState(); assert.equal(RUN_STATE.playerOrgasmCount, 0);
});


test('relic description shows its name before the current multiplier without rounding actual damage', () => {
  const relic = RELIC_DEFINITIONS.contractSigil;
  const describe = (count, language) => localizeGameText(relic.description, language, () => relicTextReplacements(relic, count));
  assert.equal(describe(0, 'ja').split('\n')[0], '契約の淫紋');
  assert.equal(describe(0, 'en').split('\n')[0], 'Contract Sigil');
  assert.equal(describe(0, 'ja').split('\n')[1], '感度：1倍');
  assert.equal(describe(1, 'ja').split('\n')[1], '感度：1.001倍');
  assert.equal(describe(1000, 'ja').split('\n')[1], '感度：2.717倍');
  assert.equal(describe(1000, 'en').split('\n')[1], 'Sensitivity: 2.717×');
  assert.ok(!describe(1000, 'ja').includes('{relicEpDamageMultiplier}'));
  const player = new Player(PLAYER_DEFINITION);
  for (const part of Object.keys(player.orgasmByPart)) player.orgasmByPart[part] = 1000;
  assert.equal(relicEpDamageTakenMultiplier(player), 1, 'part counts do not change the run counter');
  player.orgasmCount = 1000;
  assert.equal(relicEpDamageTakenMultiplier(player), 1.001 ** 1000);
  assert.notEqual(relicEpDamageTakenMultiplier(player), 2.717, 'only the text is rounded');
});
