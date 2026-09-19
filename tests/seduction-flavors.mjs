import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const { Player, Enemy } = await server.ssrLoadModule('/src/models/Combatants.ts');
const { PLAYER_DEFINITION } = await server.ssrLoadModule('/src/data/player.ts');
const { ENEMY_DEFINITIONS } = await server.ssrLoadModule('/src/data/enemies.ts');
const { CARD_DEFINITIONS } = await server.ssrLoadModule('/src/data/cards.ts');
const { evaluateConditions } = await server.ssrLoadModule('/src/models/conditions.ts');
await server.close();
const source = ts.createSourceFile('BattleScene.ts', fs.readFileSync(new URL('../src/scenes/BattleScene.ts', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true);
const scene = source.statements.find(n => ts.isClassDeclaration(n) && n.name.text === 'BattleScene');
const method = scene.members.find(n => n.name?.getText(source) === 'resolveFlavorLines').getText(source);
const code = ts.transpileModule(`class Resolver { ${method} }`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
const Resolver = new Function('evaluateConditions', `${code}; return Resolver;`)(evaluateConditions);
const resolver = new Resolver(); resolver.battleEventContext = c => c;
const variants = CARD_DEFINITIONS.seduction.flavors['card.play'];
function fresh({ traits = [], bindPool, noE = false } = {}) {
  const definition = { ...ENEMY_DEFINITIONS.grunt, traits };
  if (bindPool) definition[bindPool] = [...(definition[bindPool] ?? []), { ...definition.intents[0], effects: [{ kind: 'status', target: 'player', status: 'Bound', amount: 1 }] }];
  if (noE) definition.intents_E = [];
  const player = new Player(PLAYER_DEFINITION), selectedEnemy = new Enemy(definition);
  return { player, actor: player, selectedEnemy, target: selectedEnemy, enemies: [selectedEnemy], source: 'card', card: CARD_DEFINITIONS.seduction };
}
const resolve = context => resolver.resolveFlavorLines(variants, context);

test('quote branches match the requested order, following ExtremeFatigue', () => {
  assert.equal(variants.length, 18);
  const scenarios = [
    [2, () => { const c = fresh(); c.selectedEnemy.addStatus('IntrudedM'); return c; }],
    [3, () => { const c = fresh(); const other = new Enemy(ENEMY_DEFINITIONS.grunt); other.addStatus('IntrudedM'); c.enemies.push(other); return c; }],
    [4, () => fresh({ traits: ['softBody'], bindPool: 'intents' })],
    [5, () => fresh({ traits: ['sexToy'], bindPool: 'intents_E' })],
    [6, () => { const c = fresh(); c.player.addStatus('Bound'); return c; }],
    [7, () => fresh({ traits: ['softBody'] })],
    [8, () => fresh({ traits: ['sexToy'] })],
    ...['MultiplePeaksTorture', 'PeakHell', 'MultiplePeak'].map((status, i) => [9 + i, () => { const c = fresh(); c.player.addStatus(status); return c; }]),
    [14, () => { const c = fresh(); c.player.addStatus('Aftershocks', 5); return c; }],
    ...['Horny', 'InHeat', 'Frustrated'].map(status => [15, () => { const c = fresh(); c.player.addStatus(status); return c; }]),
    [16, () => { const c = fresh(); c.player.addStatus('DesperateToPeak'); return c; }],
  ];
  for (const [index, make] of scenarios) {
    assert.deepEqual(resolve(make()), variants[index].lines, `branch ${index}`);
  }
  const overlap = fresh({ traits: ['softBody'], bindPool: 'intents_B' });
  overlap.player.addStatus('Bound'); overlap.player.addStatus('ExtremeFatigue');
  assert.deepEqual(resolve(overlap), variants[1].lines);
  overlap.player.statuses.delete('ExtremeFatigue'); assert.deepEqual(resolve(overlap), variants[4].lines);
});

test('ineffective targets suppress every quote, including fatigue, and retain only the requested narration', () => {
  const c = fresh({ noE: true, traits: ['softBody'], bindPool: 'intents' });
  c.player.addStatus('ExtremeFatigue'); c.player.addStatus('Bound');
  const lines = resolve(c);
  assert.equal(lines.length, 1); assert.equal(lines[0].kind, 'narration');
  assert.equal(lines[0].text.ja, '{enemy}に効果は無いようだ……');
});

test('aftershock threshold, both M statuses, and selected versus unrelated enemies use the intended scope', () => {
  const c = fresh(); c.player.addStatus('Aftershocks', 4);
  assert.deepEqual(resolve(c), variants[17].lines);
  c.player.addStatus('Aftershocks'); assert.deepEqual(resolve(c), variants[14].lines);
  c.player.statuses.clear();
  const other = fresh({ traits: ['softBody'], bindPool: 'intents' }).selectedEnemy;
  c.enemies.push(other); assert.deepEqual(resolve(c), variants[17].lines);
  for (const status of ['InsertM', 'IntrudedM']) {
    other.statuses.clear(); other.addStatus(status); other.hp = 1;
    assert.deepEqual(resolve(c), variants[3].lines);
    c.selectedEnemy.addStatus(status); assert.deepEqual(resolve(c), variants[2].lines);
    c.selectedEnemy.statuses.clear();
    other.hp = 0; assert.deepEqual(resolve(c), variants[17].lines);
    c.selectedEnemy.addStatus(status); assert.deepEqual(resolve(c), variants[2].lines);
    c.selectedEnemy.statuses.clear();
  }
  assert.equal(evaluateConditions([{ kind: 'enemyHasEIntents', operator: 'eq', value: false }], { ...c, selectedEnemy: undefined }), false);
});

test('generic body-part branches distinguish the target and other enemies before Aftershocks', () => {
  for (const status of ['InsertV', 'IntrudedV', 'InsertA', 'IntrudedA']) {
    const c = fresh(), other = new Enemy(ENEMY_DEFINITIONS.grunt);
    c.enemies.push(other); other.addStatus(status);
    assert.deepEqual(resolve(c), variants[13].lines);
    c.selectedEnemy.addStatus(status); assert.deepEqual(resolve(c), variants[12].lines);
    c.player.addStatus('Aftershocks', 5); assert.deepEqual(resolve(c), variants[12].lines);
    c.player.statuses.clear(); c.selectedEnemy.statuses.clear(); other.hp = 0;
    assert.deepEqual(resolve(c), variants[17].lines);
  }

});
