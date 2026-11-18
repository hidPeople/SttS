import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createServer } from 'vite';

const server = await createServer({ resolve: { preserveSymlinks: true }, optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const modules = {};
try {
  for (const file of ['models/Combatants', 'models/conditions', 'models/statusRuntime', 'models/statusRestrictions', 'models/types', 'models/localization', 'models/cardDescription', 'models/comboRules', 'models/relicRules', 'data/cards', 'data/player', 'data/enemies', 'data/statuses', 'data/effectBuilders']) {
    Object.assign(modules, await server.ssrLoadModule(`/src/${file}.ts`));
  }
} finally { await server.close(); }
const { Player, Enemy, CARD_DEFINITIONS: cards, STATUS_DESCRIPTIONS, PLAYER_DEFINITION, ENEMY_DEFINITIONS, effect, condition } = modules;
const source = ts.createSourceFile('battle.ts', fs.readFileSync('src/scenes/BattleScene.ts', 'utf8'), 99, true);
const cls = source.statements.find(n => ts.isClassDeclaration(n) && n.name.text === 'BattleScene');
const methods = ['modifiedPlayerEpDamageForCard', 'roundModifiedPlayerEpDamage', 'currentPlayerArousalStatus', 'highestStatusInGroup', 'nextArousalStatus', 'nextStatusForGroup', 'statusForGroupRank', 'maxStatusGroupRank', 'isArousalStatus', 'cardEffectsInExecutionOrder', 'effectsByPriority', 'isEnemyTargetEffect', 'cardPlayerEpDamagePreview', 'cardWillCausePlayerOrgasm', 'cardEffectDisplay', 'cardPreviewEffectAmount', 'cardPreviewEffectTimes', 'effectRepeatCount', 'effectRepeatContext', 'epDamageMultiplierForArousal', 'effectTargets', 'playerNonArousalEpDamageMultiplier', 'effectChance', 'chanceBonusFromStatus', 'chanceBonusTarget'];
const code = ts.transpileModule(`class Harness {${methods.map(name => cls.members.find(n => n.name?.getText(source) === name).getText(source)).join('\n')}}`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
const dependencies = { ...modules, Phaser: { Math: { Clamp: (value, min, max) => Math.max(min, Math.min(max, value)) } }, SETTINGS_STATE: { language: 'ja' }, localize: modules.localize };
const Harness = new Function(...Object.keys(dependencies), `${code};return Harness;`)(...Object.values(dependencies));

function setup() {
  const h = new Harness();
  h.player = new Player({ ...PLAYER_DEFINITION, relics: [], maxEp: 100 });
  h.player.statuses.clear();
  h.enemies = [new Enemy(ENEMY_DEFINITIONS.grunt)]; h.enemy = h.enemies[0];
  h.isPlayerTurn = true;
  h.battleEventContext = context => ({ sourceName: 'test', player: h.player, actor: h.player, enemies: h.enemies, selectedEnemy: h.enemy, ...context });
  h.cardPrimaryTargetEnemy = () => h.enemy;
  h.effectBaseAmountForContext = e => e.percentOf === 'playerMaxEp' ? e.amount * 100 : e.amount;
  h.resolvePlayerEpDamageParts = e => e.epDamageParts ?? ['V'];
  h.playerEffectiveMaxEp = () => 100;
  h.statusRuntime = { growthMultiplier: () => 1 };
  h.playerSensitivityEpDamageMultiplier = () => 1;
  h.modifiedEnemyEpDamage = amount => amount;
  h.battleRandom = () => { throw new Error('Preview must not roll RNG'); };
  return h;
}
function selfSegments(h, card) {
  return h.cardEffectDisplay(card).lines.find(row => row.map(s => s.text).join('').startsWith('自身のEPに'));
}

test('unusable Fever Drive displays 4 without bold and predicts the same orgasm boundary; Cowgirl remains 5', () => {
  const h = setup(), before = [...h.player.statuses];
  assert.equal(modules.evaluateConditions(cards.feverPiston.conditions, h.battleEventContext({})), false);
  const segments = selfSegments(h, cards.feverPiston);
  assert.equal(segments.map(s => s.text).join(''), '自身のEPに4ダメージ。');
  assert.ok(segments.filter(s => s.text === '4').every(s => !s.bold));
  assert.equal(h.cardPlayerEpDamagePreview(cards.feverPiston), 4);
  assert.equal(h.cardPlayerEpDamagePreview(cards.cowgirlRiding), 5);
  h.player.ep = 95; assert.equal(h.cardWillCausePlayerOrgasm(cards.feverPiston), false);
  h.player.ep = 96; assert.equal(h.cardWillCausePlayerOrgasm(cards.feverPiston), true);
  h.player.addStatus('TurnedOn');
  assert.equal(h.cardPlayerEpDamagePreview(cards.feverPiston), 4);
  h.player.statuses.delete('TurnedOn');
  assert.deepEqual([...h.player.statuses], before);
});

test('existing arousal affects both display and flavor prediction without anticipating the later promotion', () => {
  const h = setup(); h.player.addStatus('Horny');
  const segments = selfSegments(h, cards.feverPiston);
  assert.ok(segments.some(s => s.text === '6' && s.bold));
  assert.equal(h.cardPlayerEpDamagePreview(cards.feverPiston), 6);
  h.player.ep = 93; assert.equal(h.cardWillCausePlayerOrgasm(cards.feverPiston), false);
  h.player.ep = 94; assert.equal(h.cardWillCausePlayerOrgasm(cards.feverPiston), true);
  assert.deepEqual([...h.player.statuses], [['Horny', 1]]);
});

test('ordinary pre-damage promotion still applies in execution order, regardless of definition order', () => {
  const h = setup();
  assert.equal(h.cardPlayerEpDamagePreview(cards.rubOneOut), 30);
  h.player.addStatus('Horny');
  assert.equal(h.cardPlayerEpDamagePreview(cards.rubOneOut), 40);
  const reordered = { ...cards.rubOneOut, effects: [...cards.rubOneOut.effects].reverse() };
  assert.equal(h.cardPlayerEpDamagePreview(reordered), 40);
  assert.deepEqual([...h.player.statuses], [['Horny', 1]]);
});

test('blocked, probabilistic, off-turn and zero-stack applications do not pre-apply a multiplier', () => {
  const h = setup(), damage = effect('epDamage', 'player', 4);
  const card = status => ({ ...cards.feverPiston, effects: [damage, status], connection: undefined });
  for (const options of [
    { chance: 0 }, { chance: 0.5 }, { stacks: 0 },
    { targetConditions: [condition('status', 'has', { target: 'player', status: 'TurnedOn' })] },
  ]) {
    const definition = card(effect('status', 'player', 1, { status: 'Horny', ...options }));
    assert.equal(h.cardPlayerEpDamagePreview(definition), 4);
    assert.match(selfSegments(h, definition).map(s => s.text).join(''), /EPに4ダメージ/);
  }
  h.isPlayerTurn = false;
  assert.equal(h.cardPlayerEpDamagePreview(card(effect('status', 'player', 1, { status: 'Horny', onlyDuringPlayerTurn: true }))), 4);
  h.isPlayerTurn = true; h.player.addStatus('Fainted');
  assert.equal(h.cardPlayerEpDamagePreview(card(effect('status', 'player', 1, { status: 'Horny' }))), 4, 'status applyConditions reject Horny during Fainted');
  assert.deepEqual([...h.player.statuses], [['Fainted', 1]]);
});

test('each hit stops projecting at its own execution position; successive status conditions see projected promotions', () => {
  const h = setup();
  const first = effect('epDamage', 'player', 4);
  const buff = effect('status', 'player', 1, { status: 'Horny', unlessPlayerOrgasm: true });
  const last = effect('epDamage', 'player', 4, { unlessPlayerOrgasm: true });
  const card = { ...cards.feverPiston, connection: undefined, effects: [first, buff, last] };
  const context = h.battleEventContext({ card });
  assert.equal(h.modifiedPlayerEpDamageForCard(card, 4, ['V'], first, context), 4);
  assert.equal(h.modifiedPlayerEpDamageForCard(card, 4, ['V'], last, context), 6);
  const promoted = { ...card, effects: [
    effect('status', 'player', 1, { status: 'Horny' }),
    effect('status', 'player', 1, { status: 'Horny', targetConditions: [condition('status', 'has', { target: 'player', status: 'Horny' })] }), first,
  ] };
  assert.equal(h.cardPlayerEpDamagePreview(promoted), 8);
  assert.equal(h.player.statuses.size, 0);
});

test('chance bonuses use the projected player and known earlier orgasms suppress conditional applications', () => {
  const h = setup(), damage = effect('epDamage', 'player', 4);
  const card = { ...cards.feverPiston, connection: undefined, effects: [
    effect('status', 'player', 1, { status: 'Horny' }),
    effect('status', 'player', 1, { status: 'Horny', chance: 0, chanceBonusStatus: 'Horny', chanceBonusPerStack: 1 }), damage,
  ] };
  assert.equal(h.cardPlayerEpDamagePreview(card), 8);
  const conditional = { ...card, effects: [
    effect('status', 'player', 1, { status: 'Horny', unlessPlayerOrgasm: true }),
    { ...damage, unlessPlayerOrgasm: true },
  ] };
  const context = h.battleEventContext({ card: conditional, cardOrgasmStart: h.player.orgasmsThisBattle - 1 });
  assert.equal(h.modifiedPlayerEpDamageForCard(conditional, 4, ['V'], conditional.effects[1], context), 4);
  assert.equal(h.player.statuses.size, 0);
});

test('connected targets repeat the corrected value without pre-applying the late status', () => {
  const h = setup(); h.enemy.addStatus('InsertV');
  const second = new Enemy(ENEMY_DEFINITIONS.grunt); second.addStatus('InsertA'); h.enemies.push(second);
  assert.equal(h.cardPlayerEpDamagePreview(cards.feverPiston), 8);
  assert.equal(selfSegments(h, cards.feverPiston).map(s => s.text).join(''), '自身のEPに4×2ダメージ。');
  assert.equal(h.player.statuses.size, 0);
});
