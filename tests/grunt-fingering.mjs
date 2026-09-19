import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createServer } from 'vite';
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const { Player, Enemy } = await server.ssrLoadModule('/src/models/Combatants.ts');
const { PLAYER_DEFINITION } = await server.ssrLoadModule('/src/data/player.ts');
const { ENEMY_DEFINITIONS } = await server.ssrLoadModule('/src/data/enemies.ts');
const { evaluateConditions } = await server.ssrLoadModule('/src/models/conditions.ts');
const { EP_DAMAGE_PARTS } = await server.ssrLoadModule('/src/models/types.ts');
await server.close();
const source = ts.createSourceFile('BattleScene.ts', fs.readFileSync(new URL('../src/scenes/BattleScene.ts', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true);
const scene = source.statements.find(n => ts.isClassDeclaration(n) && n.name.text === 'BattleScene');
const methods = ['resolveFlavorLines', 'resolvePlayerEpDamageParts', 'normalizedEpDamageParts'].map(name => scene.members.find(n => n.name?.getText(source) === name).getText(source)).join('\n');
const code = ts.transpileModule(`class Resolver { ${methods} }`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
const Resolver = new Function('evaluateConditions', 'Enemy', 'EP_DAMAGE_PARTS', `${code}; return Resolver;`)(evaluateConditions, Enemy, EP_DAMAGE_PARTS);
const resolver = new Resolver(); resolver.battleEventContext = c => c;
const intent = ENEMY_DEFINITIONS.grunt.intents_E.find(i => i.id === 'fingering');
const variants = intent.flavors['enemy.intent'];
function fresh() {
 const player = new Player(PLAYER_DEFINITION), actor = new Enemy(ENEMY_DEFINITIONS.grunt), other = new Enemy(ENEMY_DEFINITIONS.grunt);
 resolver.player = player;
 return { player, actor, selectedEnemy: actor, enemies: [actor, other], source: 'enemyIntent', intent };
}
const resolvePart = c => resolver.resolvePlayerEpDamageParts(intent.effects[0], c);
const resolveLine = c => resolver.resolveFlavorLines(variants, c)[0];
test('fingering defaults to V and switches to C only for a living enemy with InsertV', () => {
 const c = fresh();
 assert.deepEqual(resolvePart(c), ['V']);
 c.enemies[1].addStatus('IntrudedV'); assert.deepEqual(resolvePart(c), ['V']);
 c.enemies[1].addStatus('InsertV'); assert.deepEqual(resolvePart(c), ['C']);
 c.enemies[1].hp = 0; assert.deepEqual(resolvePart(c), ['V']);
 c.enemies[1].hp = 1; assert.deepEqual(resolvePart(c), ['C']);
 c.enemies[1].statuses.delete('InsertV'); assert.deepEqual(resolvePart(c), ['V']);
 assert.equal(intent.effects.length, 1); assert.equal(intent.effects[0].amount, 5);
 assert.equal(ENEMY_DEFINITIONS.tutorialGrunt.intents.find(i => i.id === 'fingering'), intent);
});
test('each part has normal and two starvation branches, including the 50% boundary', () => {
 for (const [part, offset] of [['C', 0], ['V', 3]]) {
  const c = fresh();
  if (part === 'C') c.enemies[1].addStatus('InsertV');
  assert.equal(resolveLine(c), variants[offset + 2].lines[0]);
  c.player.addStatus('Starvation'); c.player.ep = 0;
  assert.equal(resolveLine(c), variants[offset].lines[0]);
  c.player.ep = c.player.maxEp / 2;
  assert.equal(resolveLine(c), variants[offset].lines[0]);
  c.player.ep += 0.1;
  assert.equal(resolveLine(c), variants[offset + 1].lines[0]);
  c.player.ep = 0; c.player.recoverFromEpPeak(0);
  assert.equal(resolveLine(c), variants[offset + 1].lines[0]);
  c.player.statuses.delete('Starvation');
  assert.equal(resolveLine(c), variants[offset + 2].lines[0]);
 }
});
test('battle Peak count is independent of carried totals, survives turns and resets with a new battle', () => {
 const c = fresh(); c.player.epPeakCount = 99;
 assert.equal(c.player.epPeaksThisBattle, 0);
 c.player.recoverFromEpPeak(0); c.player.recoverFromEpPeak(0);
 assert.equal(c.player.epPeaksThisBattle, 2); assert.equal(c.player.epPeakCount, 101);
 c.player.startTurn(); assert.equal(c.player.epPeaksThisBattle, 2);
 const next = new Player(PLAYER_DEFINITION); next.epPeakCount = c.player.epPeakCount;
 assert.equal(next.epPeaksThisBattle, 0);
});
test('EP ratio conditions follow effective maximum EP', () => {
 const c = fresh(); c.player.addStatus('Starvation'); c.player.addStatus('Focused');
 c.player.ep = c.player.effectiveMaxEp / 2;
 assert.equal(resolveLine(c), variants[3].lines[0]);
 c.player.ep += 0.1;
 assert.equal(resolveLine(c), variants[4].lines[0]);
});
