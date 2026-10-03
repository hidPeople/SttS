import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createServer } from 'vite';

const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const { CARD_DEFINITIONS } = await server.ssrLoadModule('/src/data/cards.ts');
const { Deck } = await server.ssrLoadModule('/src/models/Deck.ts');
await server.close();
const source = ts.createSourceFile('BattleScene.ts', fs.readFileSync('src/scenes/BattleScene.ts', 'utf8'), ts.ScriptTarget.Latest, true);
const scene = source.statements.find(n => ts.isClassDeclaration(n) && n.name.text === 'BattleScene');
const names = ['addEffectCardsToHand', 'counterCardTargetEnemy', 'cleanupDefeatedEnemyLinks', 'removeDefeatedEnemyLinks', 'recordEnemyDefeatCauseIfNeeded', 'markCardExiting', 'removeExitingCard'];
const methods = names.map(name => scene.members.find(n => n.name?.getText(source) === name).getText(source)).join('\n');
const code = ts.transpileModule(`class Harness {${methods}}`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
class Enemy {
  hp = 10;
  statuses = new Map();
  get isDefeated() { return this.hp <= 0; }
  hasStatus(id) { return (this.statuses.get(id) ?? 0) > 0; }
}
const Harness = new Function('Enemy', 'CARD_DEFINITIONS', 'MAX_HAND_SIZE', code + ';return Harness;')(Enemy, CARD_DEFINITIONS, 10);

function setup() {
  const h = new Harness();
  h.tooltipHover = { cancelWithin() {} };
  Object.assign(h, {
    deck: new Deck([]), player: { statuses: new Map() }, enemies: [new Enemy(), new Enemy()],
    enemyLinkedCards: new WeakMap(), enemyLinkCleanups: new WeakMap(), enemyDefeatCauses: new Map(),
    cardViews: new Map(), exitingCardUids: new Set(), pendingAnimations: [], notifications: [],
    // Use the same visible name to ensure identity, not text, determines ownership.
    enemyViews: [], updateHud() {}, hideStatusTooltip() {},
    renderHand: async () => {},
    notifyAutomaticStatusChanges: async function (_target, before) { this.notifications.push({ before, after: new Map(this.player.statuses) }); },
    animateCardVanish: function (container, done) { this.pendingAnimations.push({ container, done }); },
  });
  h.enemyViews = h.enemies.map(enemy => ({ enemy, displayName: 'same name' }));
  for (const [method, id] of [['createPurgeCardDefinitionForEnemy', 'purge'], ['createPulloutCardDefinitionForEnemy', 'pullout'], ['createResistBindingCardDefinitionForEnemy', 'wriggleFree']]) {
    h[method] = () => ({ ...CARD_DEFINITIONS[id], relatedEnemyName: { en: 'same name', ja: 'same name' } });
  }
  const add = async (enemy, cardId, cardAddVariant) => {
    const existing = new Set([...h.deck.hand, ...h.deck.discardPile].map(card => card.uid));
    await h.addEffectCardsToHand({ cardId, cardAddVariant }, { actor: enemy }, 1);
    return [...h.deck.hand, ...h.deck.discardPile].find(card => !existing.has(card.uid));
  };
  const view = card => {
    const v = { ready: true, hitArea: { disableInteractive() { this.disabled = true; } }, selectionGlow: { set() {} }, container: { destroy() { this.destroyed = true; } } };
    h.cardViews.set(card.uid, v);
    return v;
  };
  const finish = () => h.pendingAnimations.splice(0).forEach(animation => animation.done());
  return { h, add, view, finish };
}

test('defeat removes only the owner’s generated cards, using the normal vanish lifecycle once', async () => {
  const { h, add, view, finish } = setup();
  const [dead, alive] = h.enemies;
  const owned = [];
  for (const [id, variant] of [['purge', 'purgeForStatusOwner'], ['pullout', 'pulloutForStatusOwner'], ['wriggleFree', 'wriggleFreeForStatusOwner']]) {
    owned.push(await add(dead, id, variant));
    await add(alive, id, variant);
  }
  const ordinary = h.deck.addToHand(CARD_DEFINITIONS.strike);
  const views = owned.map(view);
  h.hoveredCardUid = owned[0].uid;
  dead.hp = 0;
  const cleanup = h.cleanupDefeatedEnemyLinks(dead);
  assert.equal(h.cleanupDefeatedEnemyLinks(dead), cleanup);
  assert.equal(h.deck.hand.length, 4);
  assert.ok(h.deck.hand.includes(ordinary));
  assert.ok(owned.every(card => !h.deck.hand.includes(card) && h.exitingCardUids.has(card.uid)));
  assert.ok(views.every(v => !v.ready && v.hitArea.disabled && !v.container.destroyed));
  assert.equal(h.hoveredCardUid, undefined);
  assert.equal(h.pendingAnimations.length, 3);
  finish(); await cleanup;
  assert.ok(views.every(v => v.container.destroyed));
  assert.equal(h.exitingCardUids.size, 0);
});

test('overflow cards and cards moved to the draw pile cannot reappear after their owner dies', async () => {
  const { h, add } = setup();
  const [dead] = h.enemies;
  for (let i = 0; i < 10; i++) h.deck.addToHand(CARD_DEFINITIONS.strike);
  await add(dead, 'purge', 'purgeForStatusOwner');
  const overflow = h.deck.discardPile[0];
  const drawn = await add(dead, 'pullout', 'pulloutForStatusOwner');
  h.deck.drawPile.push(h.deck.discardPile.pop());
  assert.equal(h.enemyLinkedCards.get(overflow.definition), dead);
  assert.equal(h.enemyLinkedCards.get(drawn.definition), dead);
  dead.hp = 0;
  await h.cleanupDefeatedEnemyLinks(dead);
  assert.equal(h.deck.hand.length, 10);
  assert.equal(h.deck.discardPile.length, 0);
  assert.equal(h.deck.drawPile.length, 0);
  const added = await h.addEffectCardsToHand({ cardId: 'purge', cardAddVariant: 'purgeForStatusOwner' }, { actor: dead }, 1);
  assert.equal(added.count, 0);
  assert.equal(h.deck.discardPile.length, 0);
});

test('HP defeat releases Bound and Escaping, preserves the death snapshot and awaits card vanishing', async () => {
  const { h, add, view, finish } = setup();
  const [dead] = h.enemies;
  dead.statuses.set('Binding', 1);
  h.player.statuses = new Map([['Bound', 1], ['Escaping', 1], ['Horny', 2]]);
  view(await add(dead, 'wriggleFree', 'wriggleFreeForStatusOwner'));
  dead.hp = 0;
  h.recordEnemyDefeatCauseIfNeeded(dead, 10, 'hpDrain', {});
  assert.deepEqual([...h.player.statuses], [['Horny', 2]]);
  assert.equal(dead.hasStatus('Binding'), false);
  assert.deepEqual(h.enemyDefeatCauses.get(dead).statuses, ['Binding']);
  assert.equal(h.notifications.length, 1);
  let complete = false;
  const cleanup = h.cleanupDefeatedEnemyLinks(dead).then(() => { complete = true; });
  await Promise.resolve(); assert.equal(complete, false);
  finish(); await cleanup;
  assert.equal(complete, true);
});

test('another living binder keeps player states; defeating the last binder clears them', async () => {
  const { h } = setup();
  const [first, last] = h.enemies;
  for (const enemy of h.enemies) enemy.statuses.set('Binding', 1);
  h.player.statuses = new Map([['Bound', 1], ['Escaping', 1]]);
  await h.cleanupDefeatedEnemyLinks(first);
  assert.equal(h.player.statuses.size, 2);
  first.hp = 0; await h.cleanupDefeatedEnemyLinks(first);
  assert.equal(h.player.statuses.size, 2);
  last.hp = 0; await h.cleanupDefeatedEnemyLinks(last);
  assert.equal(h.player.statuses.size, 0);
});
