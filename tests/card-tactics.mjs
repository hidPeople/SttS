import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createServer } from 'vite';

const server = await createServer({ optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const m = {};
try {
  for (const path of ['models/Deck', 'models/cardTactics', 'models/Combatants', 'models/conditions', 'models/statusRuntime', 'models/cardDescription', 'models/localization', 'models/types', 'models/RunState', 'models/saveCompatibility', 'data/cards', 'data/enemies', 'data/player', 'data/statuses', 'data/cardCategories', 'data/effectBuilders']) {
    Object.assign(m, await server.ssrLoadModule(`/src/${path}.ts`));
  }
} finally { await server.close(); }
const { Deck, CARD_DEFINITIONS: cards, DeckInspectionSelection, choiceEffects, growUnchosenEffects, cardInstanceDefinition, Player, Enemy, PLAYER_DEFINITION, ENEMY_DEFINITIONS, StatusRuntime } = m;
const player = () => new Player(PLAYER_DEFINITION);
const enemy = () => new Enemy(ENEMY_DEFINITIONS.grunt);
const source = ts.createSourceFile('BattleScene.ts', fs.readFileSync('src/scenes/BattleScene.ts', 'utf8'), 99, true);
const cls = source.statements.find(n => ts.isClassDeclaration(n) && n.name.text === 'BattleScene');
const methods = ['cardPlayBlockReason', 'rejectCardPlay', 'cardEffectsInExecutionOrder', 'effectsByPriority', 'isEnemyTargetEffect', 'executeEffects', 'executeEffect', 'executeCardTactic', 'effectTargets'];
const js = ts.transpileModule(`class Harness { ${methods.map(name => cls.members.find(n => n.name?.getText(source) === name).getText(source)).join('\n')} }`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
const deps = { ...m, localize: m.localize, l: m.text, makeEffect: m.effect };
const Harness = new Function(...Object.keys(deps), js + '; return Harness;')(...Object.values(deps));
function fresh() {
  const s = new Harness(); s.player = player(); s.enemies = [enemy(), enemy()]; s.enemy = s.enemies[0];
  s.deck = new Deck([]); s.cardsPlayedThisTurn = 0; s.exitingCardUids = new Set(); s.isPlayerTurn = true; s.events = []; s.logs = [];
  s.battleEventContext = c => ({ player: s.player, enemies: s.enemies, actor: s.player, source: 'card', selectedEnemy: s.enemy, cardsPlayedThisTurn: s.cardsPlayedThisTurn, ...c });
  s.cowgirlEffectTargets = () => []; s.effectRepeatCount = e => e.times; s.effectRepeatContext = (_e, c) => c; s.effectAmountForContext = e => e.amount;
  s.updateHud = s.addFlavorEvent = s.addRandomAmountFlavors = () => {};
  s.addGlobalFlavorEvent = id => s.logs.push(id); s.addBattleLog = (_kind, text) => s.logs.push(m.localize(text, 'ja'));
  s.tweens = { add() {} }; s.counterCardTargetEnemy = def => def.linked;
  s.notifyAutomaticStatusChanges = async () => {};
  s.applyEffectHpDamage = async (_e, target, amount) => { s.events.push(['hp', s.enemies.indexOf(target), amount]); target.takeHpDamage(amount); };
  s.removeTacticCards = async removed => { s.events.push(['remove', removed.length]); s.deck.removeCards(removed); };
  s.applyEffectStatus = async (e, target, amount) => { s.events.push(['status', e.status, amount]); target.addStatus(e.status, amount); if (e.status === 'Fainted') s.deck.discardHand(); };
  return s;
}

test('inspection remains reversible after every card has been assigned; only commit mutates the deck', () => {
  const deck = new Deck([]); deck.drawPile = ['strike', 'defend', 'preparation', 'bite', 'adapt'].map((id, i) => ({ uid: String(i), definition: cards[id] }));
  const original = [...deck.drawPile], selection = new DeckInspectionSelection(original, 1);
  original.forEach(card => selection.toggle(card.uid));
  assert.equal(selection.valid, true); assert.equal(selection.discard.size, 4); assert.deepEqual(deck.drawPile, original);
  selection.toggle('0'); assert.equal(selection.valid, false);
  selection.toggle('2'); selection.toggle('2'); selection.toggle('3');
  assert.equal(selection.valid, true);
  const drawn = deck.resolveInspection(original, selection.hand, selection.discard, 10);
  assert.deepEqual(drawn.map(c => c.uid), ['2']);
  assert.deepEqual(deck.drawPile.map(c => c.uid), ['0', '3']);
  assert.deepEqual(deck.discardPile.map(c => c.uid), ['1', '4']);
});

test('inspection uses only remaining draw pile, preserves capacity and does not reshuffle', () => {
  const deck = new Deck([]); const card = deck.addToHand(cards.strike); deck.discard(card.uid);
  assert.equal(new DeckInspectionSelection(deck.drawPile.slice(0, 5), 1).required, 0);
  deck.drawPile = [deck.discardPile.pop()]; deck.hand = Array.from({ length: 10 }, (_, i) => ({ uid: 'h' + i, definition: cards.defend }));
  assert.equal(deck.resolveInspection([...deck.drawPile], new Set([card.uid]), new Set(), 10).length, 0);
  assert.equal(deck.discardPile[0], card);
});

test('generated provenance distinguishes identical IDs, follows transformations and round trips', () => {
  const deck = new Deck([cards.strike], () => 0); const initial = deck.drawPile[0];
  const generated = deck.addToHand(cards.strike); assert.equal(initial.generated, false); assert.equal(generated.generated, true);
  generated.definition = { ...cards.strike, purgeStatus: 'InsertV' };
  deck.transform(generated, cards.projectileX);
  assert.equal(generated.generated, true); assert.equal(generated.definition.purgeStatus, undefined);
  const restored = new Deck([]); restored.restore(deck.snapshot(), cards);
  assert.equal(restored.hand[0].generated, true); assert.equal(restored.drawPile[0].generated, false);
});

test('free count removal replaces only chosen cards and draw uses normal reshuffle', () => {
  const deck = new Deck([]); const a = deck.addToHand(cards.strike), b = deck.addToHand(cards.defend);
  const c = deck.addToHand(cards.preparation); deck.discard(c.uid);
  deck.removeCards([a]); assert.deepEqual(deck.hand, [b]);
  assert.deepEqual(deck.draw(1), [c]); assert.equal(deck.drawPile.includes(a), false);
});

test('adaptive growth matches both examples, freezes after two uses, is individual and serializable', () => {
  for (const second of [0, 1]) {
    const deck = new Deck([]), card = deck.addToHand(cards.adapt), other = deck.addToHand(cards.adapt), effect = cards.adapt.effects[0];
    growUnchosenEffects(card, effect, 0); assert.deepEqual(choiceEffects(card, effect).map(e => e.amount), [1, 16, 2]);
    growUnchosenEffects(card, effect, second); const expected = second === 0 ? [1, 24, 3] : [2, 16, 3];
    assert.deepEqual(choiceEffects(card, effect).map(e => e.amount), expected);
    growUnchosenEffects(card, effect, 2); assert.deepEqual(choiceEffects(card, effect).map(e => e.amount), expected);
    assert.deepEqual(choiceEffects(other, effect).map(e => e.amount), [1, 8, 1]);
    const copy = new Deck([]); copy.restore(deck.snapshot(), cards);
    assert.deepEqual(choiceEffects(copy.hand[0], effect).map(e => e.amount), expected);
    assert.deepEqual(cardInstanceDefinition(copy.hand[0]).effects[0].choices.map(e => e.amount), expected);
    const text = m.cardDescriptionLines(cardInstanceDefinition(copy.hand[0]), 'ja').flat();
    assert.ok(text.some(segment => segment.bold && segment.text === String(expected[1])));
    copy.hand[0].choiceGrowth.adapt.levels[0] = 0;
    assert.deepEqual(choiceEffects(card, effect).map(e => e.amount), expected);
  }
});

test('status growth starts at next turn, additional stacks accelerate future growth only; save and removal work', () => {
  const p = player(), a = enemy(), b = enemy(), runtime = new StatusRuntime();
  runtime.advance(p, [a, b], 0); a.addStatus('SuccubusFluid');
  assert.equal(runtime.growthMultiplier(a), 1);
  runtime.advance(p, [a, b], 0); assert.ok(Math.abs(runtime.growthMultiplier(a) - 1.1) < 1e-9);
  a.addStatus('SuccubusFluid'); assert.ok(Math.abs(runtime.growthMultiplier(a) - 1.1) < 1e-9);
  runtime.advance(p, [a, b], 0); assert.ok(Math.abs(runtime.growthMultiplier(a) - 1.1 ** 3) < 1e-9);
  assert.equal(runtime.growthMultiplier(b), 1);
  const loaded = new StatusRuntime(); loaded.restore(runtime.snapshot([p, a, b]), [p, a, b]);
  assert.equal(loaded.growthMultiplier(a), runtime.growthMultiplier(a));
  a.statuses.delete('SuccubusFluid'); assert.equal(loaded.growthMultiplier(a), 1);
  loaded.resetGrowth(a, 'SuccubusFluid'); a.addStatus('SuccubusFluid'); assert.equal(loaded.growthMultiplier(a), 1);
});

test('availability and rejection messages cover empty decks, turn-only cards, selected targets and generated hands', () => {
  const s = fresh();
  assert.equal(s.cardPlayBlockReason(cards.shrewd), 'condition'); s.rejectCardPlay({}, 'condition', cards.shrewd); assert.match(s.logs.pop(), /山札/);
  s.deck.drawPile.push({ uid: 'd', definition: cards.strike }); assert.equal(s.cardPlayBlockReason(cards.shrewd), undefined);
  s.cardsPlayedThisTurn = 1; assert.equal(s.cardPlayBlockReason(cards.dozeOff), 'condition'); s.cardsPlayedThisTurn = 0; assert.equal(s.cardPlayBlockReason(cards.dozeOff), undefined);
  assert.equal(s.cardPlayBlockReason(cards.thrash), 'condition'); s.enemies[1].addStatus('InsertA'); assert.equal(s.cardPlayBlockReason(cards.thrash), undefined);
  assert.equal(s.cardPlayBlockReason(cards.bite), 'condition'); s.enemy = s.enemies[1]; assert.equal(s.cardPlayBlockReason(cards.bite), undefined);
  const thrower = s.deck.addToHand(cards.throwCards); assert.equal(s.cardPlayBlockReason(cards.throwCards, thrower), 'condition');
  s.deck.addToHand(cards.throwCards); assert.equal(s.cardPlayBlockReason(cards.throwCards, thrower), undefined, 'another generated copy is a valid target');
  s.deck.hand = [thrower]; s.deck.addToHand(cards.projectileX); assert.equal(s.cardPlayBlockReason(cards.throwCards, thrower), 'condition');
});

test('doze clears generated cards across piles before applying Fainted; original cards survive in discard', async () => {
  const s = fresh(); const original = { uid: 'o', definition: cards.strike, generated: false };
  s.deck.hand = [original]; s.deck.addToHand(cards.rubOne);
  const c = s.deck.addToHand(cards.rubOne); s.deck.discard(c.uid); s.deck.drawPile.push(s.deck.addToHand(cards.faint)); s.deck.hand.pop();
  await s.executeEffects(s.cardEffectsInExecutionOrder(cards.dozeOff), s.battleEventContext({ card: cards.dozeOff }));
  assert.deepEqual(s.events, [['remove', 3], ['status', 'Fainted', 1]]);
  assert.deepEqual(s.deck.discardPile, [original]); assert.equal(s.deck.hand.length, 0); assert.equal(s.player.statuses.get('Fainted'), 1);
});

test('thrash hits each connected enemy once and removes its matching counter cards from every pile', async () => {
  const s = fresh(); s.enemies[0].addStatus('InsertV'); s.enemies[0].addStatus('IntrudedA'); s.enemies[1].addStatus('InsertM');
  const linked = s.deck.addToHand({ ...cards.pullout, linked: s.enemies[0], purgeStatus: 'InsertV' }); s.deck.discard(linked.uid);
  await s.executeEffects(s.cardEffectsInExecutionOrder(cards.thrash), s.battleEventContext({ card: cards.thrash }));
  assert.deepEqual(s.events.filter(e => e[0] === 'hp'), [['hp', 0, 6], ['hp', 1, 6]]);
  assert.equal(s.enemies[0].statuses.size, 0); assert.equal(s.enemies[1].statuses.size, 0); assert.equal(s.deck.discardPile.length, 0);
});

test('bite adds one 8-damage hit for either/both M connections and clears only M, leaving other enemies intact', async () => {
  for (const mouth of [false, true]) {
    const s = fresh(); s.enemy.addStatus('InsertV'); s.enemies[1].addStatus('InsertM');
    if (mouth) { s.enemy.addStatus('InsertM'); s.enemy.addStatus('IntrudedM'); }
    await s.executeEffects(s.cardEffectsInExecutionOrder(cards.bite), s.battleEventContext({ card: cards.bite }));
    assert.equal(s.events.filter(e => e[0] === 'hp').length, mouth ? 2 : 1);
    assert.equal(s.enemy.hasStatus('InsertV'), true); assert.equal(s.enemy.hasStatus('InsertM'), false); assert.equal(s.enemy.hasStatus('IntrudedM'), false);
    assert.equal(s.enemies[1].hasStatus('InsertM'), true);
  }
});
