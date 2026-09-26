import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createServer } from 'vite';
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const { CARD_DEFINITIONS: cards } = await server.ssrLoadModule('/src/data/cards.ts');
const { defineCard, effect, condition } = await server.ssrLoadModule('/src/data/effectBuilders.ts');
const { cardDescriptionLines: lines, cardDescriptionSegments, cardTextIssues, cardTermDescription } = await server.ssrLoadModule('/src/models/cardDescription.ts');
const { CARD_EFFECT_TEXT, CARD_SYSTEM_TERM_COLOR } = await server.ssrLoadModule('/src/data/cardText.ts');
const { STATUS_DESCRIPTIONS } = await server.ssrLoadModule('/src/data/statuses.ts');
await server.close();
const l = (en, ja = en) => ({ en, ja });
const text = (rows) => rows.flat().map(s => s.text).join('');
const make = (options) => defineCard({ id: 'test', name: l('Test'), rarity: 'common', categories: ['utility'], cost: 0, ...options });

test('all existing cards have valid references; galleries/rewards share base text with the common generator', () => {
  for(const card of Object.values(cards)) for(const lang of ['ja', 'en']) {
    assert.deepEqual(cardTextIssues(card), []);
    assert.equal(cardDescriptionSegments(card, lang).map(s => s.text).join(''), lines(card, lang).map(row => text([row])).join('\n'));
    assert.ok(!text(lines(card, lang)).includes('{'));
  }
});
test('custom damage sentence preserves prose, changes only the referenced value and retains other effects and keywords', () => {
  const card = { ...cards.crescentSlash, effects: [...cards.crescentSlash.effects, effect('drawCards', 'player', 2)] };
  const rows = lines(card, 'ja', { preview: e => ({ amounts: [e.amount === 15 ? 21 : e.amount], baseAmounts: [e.amount] }) });
  assert.match(text(rows), /尻尾で斬りつけ、HPに21ダメージ/);
  assert.match(text(rows), /カードを2枚引く/);
  assert.equal(rows.flat().filter(s => s.bold).map(s => s.text).join(''), '21');
  assert.equal(rows.flat().filter(s => s.text === '21').length, 1);
  assert.ok(rows.flat().some(s => s.term === 'noMotion'));
});
test('faint includes every direct effect, current EP ratio, restriction and temporary keyword', () => {
  const result = text(lines(cards.faint, 'ja'));
  for(const value of ['ターン開始時のみ使用可', '失神×2', 'Peak余韻を全解除', '現在EPの25%', '一時カード', '不動']) assert.ok(result.includes(value), result);
});
test('base percentage remains a formula; battle numbers and promoted status are typed segments with Tips', () => {
  assert.match(text(lines(cards.rubOneOut, 'ja')), /最大EP.*20%/);
  for(const [current, next, label] of [['Horny', 'InHeat', '火照り'], ['InHeat', 'Frustrated', '快楽焦燥'], ['DesperateToPeak', 'DesperateToPeak', '快楽渇望']]) {
    const result = lines(cards.rubOneOut, 'ja', { preview: e => e.kind === 'status' ? { amounts: [1], baseAmounts: [1], fromStatus: current, status: next } : { amounts: [30], baseAmounts: [20] } });
    assert.ok(text(result).includes(label)); assert.ok(result.flat().some(s => s.term === next));
    assert.ok(result.flat().some(s => s.text === '30' && s.bold));
    assert.ok(text(result).includes(current === next ? '既に最大段階' : 'に強化する'));
  }
});
test('repeated effects use stable names, reject ambiguous paths, and can be placed in a custom order', () => {
  const card = make({ description: l('{effect.second.amount} then {effect.first.amount}'), effects: [effect('hpDamage', 'selectedEnemy', 3, { textId: 'first' }), effect('hpDamage', 'selectedEnemy', 7, { textId: 'second' })] });
  assert.equal(text(lines(card, 'en')), '7 then 3');
  assert.deepEqual(card.effects.map(e => e.amount), [3, 7]);
  assert.equal(cardTextIssues({ ...card, description: l('{selectedEnemy.hpDamage.amount}') }).length, 2);
  assert.ok(cardTextIssues({ ...card, description: l('{effect.missing.amount}') }).length);
  assert.ok(cardTextIssues({ ...card, effects: card.effects.map(e => ({ ...e, textId: 'same' })) }).length);
});
test('description section order follows input property order or textOrder without changing effects', () => {
  const effects = [effect('hpDamage', 'selectedEnemy', 3), effect('epDamage', 'selectedEnemy', 4)];
  const a = make({ temporary: true, effects, description: l('Extra') });
  const b = make({ description: l('Extra'), effects, temporary: true });
  assert.match(text(lines(a, 'en')), /ExtraTemporary$/); assert.match(text(lines(b, 'en')), /^Extra/);
  assert.match(text(lines({ ...b, textOrder: ['temporary', 'effects', 'description'] }, 'en')), /ExtraTemporary$/);
  assert.equal(a.effects, effects); assert.equal(b.effects, effects);
});
test('all effect kinds have nonempty descriptions; random damage keeps range, chance and repetitions', () => {
  for(const kind of Object.keys(CARD_EFFECT_TEXT)) {
    const card = make({ effects: [effect(kind, kind === 'hpDrain' ? 'selectedEnemy' : 'player', 2, { status: 'Aftershocks', cardId: 'strike' })] });
    assert.ok(text(lines(card, 'ja')).length); assert.ok(!text(lines(card, 'ja')).includes('{'));
  }
  const card = make({ effects: [effect('hpDamage', 'selectedEnemy', 1, { randomAmount: { min: 2, max: 6 }, times: 3, chance: .25 })] });
  const base = text(lines(card, 'ja')); assert.match(base, /25%の確率/); assert.match(base, /ランダムに2～6/); assert.match(base, /×3/);
  const live = lines(card, 'ja', { preview: () => ({ amounts: [4, 12], baseAmounts: [2, 6], chance: .5, times: 3 }) });
  assert.match(text(live), /50%の確率/); assert.match(text(live), /ランダムに4～12/);
});
test('system terms are blue, status terms keep status styling, and block Tips support carryover', () => {
  const card = make({ categories: ['utility', 'noMotion'], vanish: true, temporary: true, effects: [effect('block', 'player', 5), effect('status', 'player', 1, { status: 'Horny' })] });
  const result = lines(card, 'ja').flat();
  for(const term of ['block', 'noMotion', 'vanish', 'temporary']) assert.equal(result.find(s => s.term === term).color, CARD_SYSTEM_TERM_COLOR);
  assert.equal(result.find(s => s.term === 'Horny').color, undefined);
  assert.equal(text([lines(card, 'ja').at(-1)]), '不動、消滅、一時カード');
  assert.equal(text([lines(card, 'en').at(-1)]), 'Motionless, Vanish, Temporary');
  assert.ok(lines(card, 'ja').at(-1).every(segment => segment.noWrap));
  assert.match(cardTermDescription('block', true, 'ja'), /持ち越せる/);
  assert.match(cardTermDescription('block', false, 'ja'), /リセット/);
});
test('battle arousal projection uses actual group rank rules and leaves live statuses untouched', () => {
  const source = ts.createSourceFile('battle.ts', fs.readFileSync('src/scenes/BattleScene.ts', 'utf8'), ts.ScriptTarget.Latest, true);
  const cls = source.statements.find(n => ts.isClassDeclaration(n) && n.name.text === 'BattleScene');
  const keep = ['cardEffectDisplay', 'highestStatusInGroup', 'nextStatusForGroup', 'statusForGroupRank', 'maxStatusGroupRank', 'isArousalStatus', 'cardEffectsInExecutionOrder', 'effectsByPriority'];
  const code = ts.transpileModule('class Battle {' + cls.members.filter(n => keep.includes(n.name?.getText(source))).map(n => n.getText(source)).join('\n') + '}', { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  class Player { } class Enemy { }
  const Battle = new Function('Player', 'Enemy', 'STATUS_DESCRIPTIONS', 'SETTINGS_STATE', 'cardDescriptionLines', 'statusTargetAllowed', 'evaluateConditions', 'receivedEpDamage', code + ';return Battle;')(Player, Enemy, STATUS_DESCRIPTIONS, { language: 'ja' }, lines, () => true, () => true, (_p, amount) => ({ amount }));
  const b = new Battle(); b.player = new Player(); b.player.statuses = new Map([['Horny', 1]]);
  Object.assign(b, { cardPrimaryTargetEnemy: () => undefined, battleEventContext: c => c, effectTargets: () => [b.player], effectChance: () => 1, cardPreviewEffectTimes: () => 1, effectBaseAmountForContext: e => e.kind === 'status' ? 1 : 20, modifiedPlayerEpDamageForCard: () => 30, resolvePlayerEpDamageParts: () => [], isEnemyTargetEffect: e => e.target === 'selectedEnemy' });
  const result = b.cardEffectDisplay(cards.rubOneOut).lines;
  assert.match(text(result), /自身のムラムラを火照りに強化する/);
  assert.deepEqual([...b.player.statuses], [['Horny', 1]]);
});

test('custom prose retains later added probability and repetitions', () => {
  const card = make({ description: l('Hit {selectedEnemy.hpDamage.amount}.'), effects: [effect('hpDamage', 'selectedEnemy', 4, { chance: .25, times: 3, onlyDuringPlayerTurn: true })] });
  const result = text(lines(card, 'ja'));
  assert.match(result, /25%/); assert.match(result, /3回/); assert.match(result, /自身のターン中/);
});
test('individual display ordering never changes the effect execution input array', () => {
  const effects = [effect('hpDamage', 'selectedEnemy', 3, { textId: 'first' }), effect('hpDamage', 'selectedEnemy', 7, { textId: 'second' })];
  const card = make({ effects, textOrder: ['effect.second', 'effect.first'] });
  const rows = lines(card, 'ja'); assert.match(text([rows[0]]), /7/); assert.match(text([rows[1]]), /3/);
  assert.deepEqual(card.effects.map(e => e.amount), [3, 7]); assert.deepEqual(cardTextIssues(card), []);
});
test('random status stacks remain a range, and generated cards share their localized context', () => {
  const card = make({ effects: [effect('status', 'player', 1, { status: 'Aftershocks', randomAmount: { min: 1, max: 3 } })] });
  assert.match(text(lines(card, 'ja')), /ランダムに1～3/);
  const removal = { ...cards.purge, relatedEnemyName: l('Test enemy', '確認用の敵'), relatedIntrusionPart: l('test part', '確認用の部位') };
  assert.match(text(lines(removal, 'ja')), /確認用の部位を排出/);
  assert.match(text(lines({ ...cards.wriggleFree, relatedEnemyName: l('Test enemy', '確認用の敵') }, 'ja')), /確認用の敵の拘束/);
});
