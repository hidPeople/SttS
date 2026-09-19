import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createServer } from 'vite';
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const modules = {};
for (const name of ['Combatants', 'statusChanges', 'statusRestrictions', 'conditions', 'localization', 'types', 'statusRuntime']) Object.assign(modules, await server.ssrLoadModule(`/src/models/${name}.ts`));
for (const name of ['player', 'enemies', 'statuses', 'flavorCatalog', 'effectBuilders', 'eventBattles']) Object.assign(modules, await server.ssrLoadModule(`/src/data/${name}.ts`));
await server.close();
const { Player, Enemy, PLAYER_DEFINITION, ENEMY_DEFINITIONS, STATUS_DESCRIPTIONS, GLOBAL_FLAVORS, statusChanges, statusNoticeKind, recordHpDrain, receivedEpDamage, evaluateConditions, effect: makeEffect, text: l, FLAVOR_EVENTS, StatusRuntime } = modules;
const source = ts.createSourceFile('BattleScene.ts', fs.readFileSync(new URL('../src/scenes/BattleScene.ts', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true);
const scene = source.statements.find(n => ts.isClassDeclaration(n) && n.name.text === 'BattleScene');
const names = ['executeEffect', 'notifyAutomaticStatusChanges', 'consumeStatusWithNotice', 'addStatusApplicationLog', 'shouldLogStatusApplication', 'statusApplicationCoveredByRemovalTransition', 'statusApplicationLogKind', 'addStatusApplicationFlavorEvent', 'addStatusRemovalFlavorEvent', 'statusTransitionTargetForRemoval', 'statusRemovalLogKind', 'resolveFlavorLines', 'startTurnCounters'];
const methods = names.map(name => scene.members.find(n => n.name?.getText(source) === name).getText(source)).join('\n');
const code = ts.transpileModule(`class Harness { ${methods} }`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
const Harness = new Function('statusChanges', 'statusNoticeKind', 'makeEffect', 'l', 'FLAVOR_EVENTS', 'evaluateConditions', 'Enemy', 'IMPORTANT_LOG_PAUSE_MS', 'STATUS_REMOVAL_TRANSITIONS', 'EP_PEAK_BASE_FLASH_COUNT', `${code};return Harness;`)(statusChanges, statusNoticeKind, makeEffect, l, FLAVOR_EVENTS, evaluateConditions, Enemy, 1000, { MultiplePeak: 'PeakHell', PeakHell: 'MultiplePeaksTorture' }, 3);
function fresh() {
 const s = new Harness();
 s.player = new Player({ ...PLAYER_DEFINITION, maxHp: 40 }); s.player.hp = 2;
 s.enemies = [new Enemy(ENEMY_DEFINITIONS.grunt)]; s.events = []; s.waits = []; s.statusRuntime = new StatusRuntime();
 for (const key of ['updateHud', 'syncPlayerFaintedPose', 'refreshHandCardUsabilities', 'playStatusAppliedMotion', 'playStatusRemovedMotion', 'addRandomAmountFlavors']) s[key] = () => {};
 s.contextEnemyForStatusLog = s.infestedSlimePart = () => undefined;
 s.wait = async ms => s.waits.push(ms);
 s.statusDisplayNameForLanguage = (status, language) => STATUS_DESCRIPTIONS[status].name[language];
 s.statusDisplayName = status => s.statusDisplayNameForLanguage(status, 'ja');
 s.sourceDisplayNameForLanguage = (c, lang) => c.status ? s.statusDisplayNameForLanguage(c.status, lang) : c.sourceName;
 s.combatantDisplayNames = target => target.definition.name;
 s.battleEventContext = c => ({ player: s.player, enemies: s.enemies, actor: s.player, sourceName: 'System', ...c });
 s.addGlobalFlavorEvent = (event, context) => { for (const line of s.resolveFlavorLines(GLOBAL_FLAVORS[event], context)) s.events.push({ event, kind: line.kind, context }); };
 s.addFlavorEvent = () => new Set();
 s.effectTargets = e => [e.target === 'player' ? s.player : s.enemies[0]];
 s.effectRepeatCount = () => 1; s.effectRepeatContext = (_e,c) => c; s.effectAmountForContext = e => e.amount;
 s.applyEffectHpHeal = (target, amount) => target.healHp(amount);
 s.applyEffectHpDrain = (_effect, _target, amount) => { s.player.healHp(amount); recordHpDrain(s.player); };
 s.removeStatusByEffect = (target, effect) => { if (!target.hasStatus(effect.status)) return []; target.statuses.delete(effect.status); return [effect.status]; };
 return s;
}
const run = (s, kind, amount = 1, options = {}) => s.executeEffect(makeEffect(kind, kind === 'hpDrain' ? 'selectedEnemy' : 'player', amount, options), s.battleEventContext({source:'system'}), {messages:[]});
test('all three configured initial statuses generate important applications without adding stacks', async () => {
 const s=fresh();
 for(const status of ['Starvation','Hunger','ExtremeFatigue']) s.player.addStatus(status);
 await s.notifyAutomaticStatusChanges(s.player,new Map());
 assert.deepEqual(s.events.map(e=>[e.event,e.kind]),Array.from({length:3},()=>[FLAVOR_EVENTS.Status.ApplyImportant,'important']));
 assert.deepEqual(s.waits,[1000,1000,1000]);
 assert.deepEqual([...s.player.statuses.values()],[1,1,1]);
});
test('drain execution reports one Starvation to Hunger change and one eventual Hunger removal', async () => {
 const s=fresh(); s.player.addStatus('Starvation');
 await run(s,'hpDrain'); assert.equal(s.events.length,0);
 await run(s,'hpDrain');
 assert.equal(s.events.length,1); assert.equal(s.events[0].event,FLAVOR_EVENTS.Status.ChangeImportant);
 assert.equal(s.events[0].context.flavorValues.fromStatus.ja,'飢餓');
 assert.equal(s.events[0].context.flavorValues.toStatus.ja,'空腹');
 await run(s,'hpDrain'); assert.equal(s.events.length,1);
 await run(s,'hpDrain'); assert.equal(s.events.length,2);
 assert.equal(s.events[1].event,FLAVOR_EVENTS.Status.Remove); assert.equal(s.events[1].kind,'important');
 assert.deepEqual(s.waits,[1000,1000]);
});
test('fatigue recovery reports only when HP exceeds the threshold, including simultaneous drain changes', async () => {
 const s=fresh(); s.player.addStatus('ExtremeFatigue');
 await run(s,'hpHeal',8); assert.equal(s.events.length,0);
 await run(s,'hpHeal',1); assert.equal(s.events.length,1); assert.equal(s.events[0].kind,'important');
 await run(s,'hpHeal',1); assert.equal(s.events.length,1);
 const t=fresh(); t.player.addStatus('Starvation'); t.player.addStatus('ExtremeFatigue');
 await run(t,'hpDrain',1); await run(t,'hpDrain',8);
 assert.deepEqual(t.events.map(e=>e.event),[FLAVOR_EVENTS.Status.ChangeImportant,FLAVOR_EVENTS.Status.Remove]);
 assert.ok(t.events.every(e=>e.kind==='important')); assert.equal(t.player.statusDrainCounts.get('Hunger'),undefined);
});
test('explicit removals and final stack consumption honor noticeLevel and do not repeat', async () => {
 const s=fresh(); s.player.addStatus('Hunger');
 await run(s,'removeStatus',0,{status:'Hunger'}); await run(s,'removeStatus',0,{status:'Hunger'});
 assert.equal(s.events.length,1); assert.equal(s.events[0].kind,'important');
 s.player.addStatus('ExtremeFatigue',2);
 await s.consumeStatusWithNotice(s.player,'ExtremeFatigue'); assert.equal(s.events.length,1);
 await s.consumeStatusWithNotice(s.player,'ExtremeFatigue'); assert.equal(s.events.length,2);
 s.player.addStatus('Charm'); await run(s,'removeStatus',0,{status:'Charm'});
 assert.equal(s.events[2].kind,'status'); assert.deepEqual(s.waits,[1000,1000]);
});
test('duration expiry respects a data-configured important flag', async () => {
 const s=fresh(), def=STATUS_DESCRIPTIONS.Aphrodisiac, old=def.noticeLevel;
 try {
  def.noticeLevel='important'; s.player.addStatus('Aphrodisiac',1);
  await s.startTurnCounters(); assert.equal(s.events.length,0);
  await s.startTurnCounters(); assert.equal(s.events.length,1); assert.equal(s.events[0].kind,'important');
  await s.startTurnCounters(); assert.equal(s.events.length,1);
 } finally { def.noticeLevel=old; }
});
test('either side of a transition can request importance and Starvation EP override is documented', () => {
 assert.equal(statusNoticeKind('Starvation','Charm'),'important');
 assert.equal(statusNoticeKind('Charm','Hunger'),'important');
 const s=fresh(); s.player.addStatus('Starvation');
 assert.deepEqual(receivedEpDamage(s.player,12),{amount:1,cause:'Starvation'});
 assert.match(STATUS_DESCRIPTIONS.Starvation.description.en,/Incoming EP damage becomes 1/);
 assert.match(STATUS_DESCRIPTIONS.Starvation.description.ja,/受けるEPダメージが1になる/);
});
