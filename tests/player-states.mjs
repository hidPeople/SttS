import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const { Player, Enemy } = await server.ssrLoadModule('/src/models/Combatants.ts');
const { PLAYER_DEFINITION } = await server.ssrLoadModule('/src/data/player.ts');
const { ENEMY_DEFINITIONS } = await server.ssrLoadModule('/src/data/enemies.ts');
const { evaluateConditions } = await server.ssrLoadModule('/src/models/conditions.ts');
await server.close();

function setup() {
  const player = new Player(PLAYER_DEFINITION);
  const enemy = new Enemy(ENEMY_DEFINITIONS.grunt);
  const context = { source: 'system', sourceName: 'test', actor: player, player, enemies: [enemy] };
  const state = playerState => evaluateConditions([{ kind: 'playerState', operator: 'has', playerState }], context);
  return { player, enemy, state };
}

test('Breathless combines continuous-orgasm states with high Aftershocks', () => {
  const { player, state } = setup();
  assert.equal(state('Breathless'), false);
  player.addStatus('Aftershocks', 9); assert.equal(state('Breathless'), false);
  player.addStatus('Aftershocks', 1); assert.equal(state('Breathless'), true);
  player.statuses.clear(); player.addStatus('OrgasmsHell'); assert.equal(state('Breathless'), true);
});

test('Aroused accepts EP, arousal statuses, and only Aftershocks 1 through 9', () => {
  const { player, state } = setup();
  player.ep = player.effectiveMaxEp * 0.75; assert.equal(state('Aroused'), true);
  player.ep = 0; player.addStatus('Aftershocks', 1); assert.equal(state('Aroused'), true);
  player.addStatus('Aftershocks', 9); assert.equal(state('Aroused'), false);
  player.statuses.clear(); player.addStatus('DesperateToCum'); assert.equal(state('Aroused'), true);
});

test('Gagged accepts enemy insertion or intrusion at M and supports notHas', () => {
  const { enemy, state } = setup();
  assert.equal(state('Gagged'), false);
  enemy.addStatus('InsertM'); assert.equal(state('Gagged'), true);
  enemy.statuses.clear(); enemy.addStatus('IntrudedM'); assert.equal(state('Gagged'), true);
});
