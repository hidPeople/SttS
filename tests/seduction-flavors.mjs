import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createServer } from 'vite';
import { playerState as state, enemyTrait as trait, status, bodyPart, branchLines, kindLines } from './helpers/flavor-branches.mjs';

const server = await createServer({ resolve: { preserveSymlinks: true }, optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
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
const expectQuotes = (context, conditions) => assert.deepEqual(kindLines(resolve(context)), branchLines(variants, conditions));
const binding = { kind: 'enemyHasBindingAction', operator: 'eq', target: 'selectedEnemy', value: true };
const otherM = [state('Gagged'), bodyPart(['M'], 'selectedEnemy', 'notHas')];
const targetVA = [bodyPart(['V','A'], 'selectedEnemy')];
const otherVA = [bodyPart(['V','A']), bodyPart(['V','A'], 'selectedEnemy', 'notHas')];

test('seduction priority covers fatigue, M occupancy, species, binding and exhaustion combinations', () => {
  const scenarios = [
    [[bodyPart(['M'], 'selectedEnemy')], () => { const c = fresh(); c.selectedEnemy.addStatus('IntrudedM'); return c; }],
    [otherM, () => { const c = fresh(); const other = new Enemy(ENEMY_DEFINITIONS.grunt); other.addStatus('IntrudedM'); c.enemies.push(other); return c; }],
    [[trait('softBody'), binding], () => fresh({ traits: ['softBody'], bindPool: 'intents' })],
    [[trait('sexToy'), binding], () => fresh({ traits: ['sexToy'], bindPool: 'intents_E' })],
    [[status('Bound')], () => { const c = fresh(); c.player.addStatus('Bound'); return c; }],
    ...['softBody','sexToy'].map(t => [[trait(t)], () => fresh({ traits: [t] })]),
    ...['MultipleOrgasmsTorture', 'OrgasmsHell', 'MultipleOrgasms'].map(s => [[status(s)], () => { const c = fresh(); c.player.addStatus(s); return c; }]),
    [[status('Aftershocks', 'player', 'gte', 5)], () => { const c = fresh(); c.player.addStatus('Aftershocks', 5); return c; }],
    ...['Horny', 'InHeat', 'Frustrated', 'DesperateToCum'].map(s => [[status(s)], () => { const c = fresh(); c.player.addStatus(s); return c; }]),
  ];
  for (const [conditions, make] of scenarios) expectQuotes(make(), conditions);
  const overlap = fresh({ traits: ['softBody'], bindPool: 'intents_B' });
  overlap.player.addStatus('Bound'); overlap.player.addStatus('ExtremeFatigue');
  expectQuotes(overlap, [status('ExtremeFatigue')]);
  overlap.selectedEnemy.addStatus('InsertM');
  expectQuotes(overlap, [status('ExtremeFatigue'),state('Gagged')]);
  overlap.player.statuses.delete('ExtremeFatigue');
  expectQuotes(overlap,[bodyPart(['M'],'selectedEnemy')]);
  overlap.selectedEnemy.statuses.clear();
  expectQuotes(overlap,[trait('softBody'),binding]);
  for(const exhaustion of ['MultipleOrgasmsTorture','OrgasmsHell','MultipleOrgasms']) {
    overlap.player.statuses.clear();overlap.player.addStatus(exhaustion);
    const condition=status(exhaustion==='MultipleOrgasmsTorture'?exhaustion:['OrgasmsHell','MultipleOrgasms']);
    expectQuotes(overlap,[trait('softBody'),binding,condition]);
  }
});

test('arousal takes precedence over Aftershocks even at high stacks', () => {
  for(const arousal of ['Horny','InHeat','Frustrated','DesperateToCum']) for(const stacks of [5,50]) {
    const c=fresh();c.player.addStatus('Aftershocks',stacks);c.player.addStatus(arousal);
    expectQuotes(c,[status(arousal)]);
    c.selectedEnemy.definition={...c.selectedEnemy.definition,traits:['softBody']};
    expectQuotes(c,[trait('softBody'),status(arousal)]);
  }
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
  expectQuotes(c, []);
  c.player.addStatus('Aftershocks'); expectQuotes(c,[status('Aftershocks','player','gte',5)]);
  c.player.statuses.clear();
  const other = fresh({ traits: ['softBody'], bindPool: 'intents' }).selectedEnemy;
  c.enemies.push(other); expectQuotes(c, []);
  for (const mouthStatus of ['InsertM', 'IntrudedM']) {
    other.statuses.clear(); other.addStatus(mouthStatus); other.hp = 1;
    expectQuotes(c, otherM);
    c.selectedEnemy.addStatus(mouthStatus); expectQuotes(c, [bodyPart(['M'],'selectedEnemy')]);
    c.selectedEnemy.statuses.clear();
    other.hp = 0; expectQuotes(c, []);
    c.selectedEnemy.addStatus(mouthStatus); expectQuotes(c, [bodyPart(['M'],'selectedEnemy')]);
    c.selectedEnemy.statuses.clear();
  }
  assert.equal(evaluateConditions([{ kind: 'enemyHasEIntents', operator: 'eq', value: false }], { ...c, selectedEnemy: undefined }), false);
});

test('generic body-part branches distinguish the target and other enemies before Aftershocks', () => {
  for (const status of ['InsertV', 'IntrudedV', 'InsertA', 'IntrudedA']) {
    const c = fresh(), other = new Enemy(ENEMY_DEFINITIONS.grunt);
    c.enemies.push(other); other.addStatus(status);
    expectQuotes(c, otherVA);
    c.selectedEnemy.addStatus(status); expectQuotes(c, targetVA);
    c.player.addStatus('Aftershocks', 5); expectQuotes(c, targetVA);
    c.player.statuses.clear(); c.selectedEnemy.statuses.clear(); other.hp = 0;
    expectQuotes(c, []);
  }

});
