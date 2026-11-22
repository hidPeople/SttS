import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, optimizeDeps: { noDiscovery: true }, appType: 'custom' });
const load = name => server.ssrLoadModule('/src/' + name + '.ts');
const [{ normalDefeatConversation }, { ENEMY_DEFINITIONS }, { CONVERSATION_EVENTS, CONVERSATIONS }, { galleryEvents }] =
  await Promise.all(['models/defeatConversation', 'data/enemies', 'data/conversations', 'models/gallery'].map(load)).finally(() => server.close());
const enemy = (id, isDefeated = false) => ({ definition: ENEMY_DEFINITIONS[id], isDefeated, statuses: new Map() });
const encounter = (...enemies) => ({ enemies, player: { statuses: new Map() } });

test('every regular enemy resolves to its own playable Extra event; event-only enemies use their battle rules', () => {
  const entries = galleryEvents();
  for (const [id, definition] of Object.entries(ENEMY_DEFINITIONS)) {
    const conversation = normalDefeatConversation(encounter(enemy(id)), false);
    if (!definition.stages.length) { assert.equal(conversation, 'defeatDefault'); continue; }
    assert.equal(CONVERSATION_EVENTS[conversation].defeatEnemyId, id);
    assert.ok(CONVERSATIONS[conversation].every(page => page.text.en && page.text.ja));
    assert.ok(entries.find(e => e.conversationId === conversation)?.thumbnail);
    assert.deepEqual(entries.find(e => e.conversationId === conversation).condition,
      { en: `Lose to ${definition.name.en}`, ja: `${definition.name.ja}に敗北` });
  }
  for (const id of ['prologueDefeat1', 'prologueDefeat2']) {
    assert.equal(entries.find(e => e.conversationId === id).condition.ja, '当直の下級兵に敗北');
  }
});

test('highest surviving threat wins regardless of order; ties honor formation order', () => {
  const grunt = enemy('grunt'), slime = enemy('slime'), dead = enemy('slimeColony', true);
  for (const group of [[grunt, slime, dead], [dead, slime, grunt]]) {
    assert.equal(normalDefeatConversation(encounter(...group), false), 'defeatSlime');
  }
  const tied = { ...grunt, definition: { ...grunt.definition, threat: slime.definition.threat } };
  assert.equal(normalDefeatConversation(encounter(tied, slime), false), 'defeatGrunt');
  assert.equal(normalDefeatConversation(encounter(dead), false), 'defeatDefault');
});

test('ordered overrides can match a mixed formation, individual enemy status, player status and lethal self-damage', () => {
  const grunt = enemy('grunt'), slime = enemy('slime'), context = encounter(grunt, slime);
  const rule = { category: 'normal', defeatWhen: { enemyIds: ['slime', 'grunt'], cardSelfDamage: true, conditions: [
    {kind: 'status', operator: 'has', target: 'player', status: 'InfestedA_Slime'},
    {kind: 'status', operator: 'has', target: 'selectedEnemy', status: 'IntrudedV'},
  ] } };
  const events = { ...CONVERSATION_EVENTS, pair: rule, later: rule };
  context.player.statuses.set('InfestedA_Slime', 1);
  slime.statuses.set('IntrudedV', 1);
  assert.equal(normalDefeatConversation(context, true, events), 'pair');
  assert.equal(normalDefeatConversation(context, false, events), 'defeatSlime');
  grunt.isDefeated = true;
  assert.equal(normalDefeatConversation(context, true, events), 'defeatSlime');
});
