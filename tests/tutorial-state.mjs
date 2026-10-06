import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import fs from 'node:fs';
import ts from 'typescript';

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const { Player, Enemy } = await server.ssrLoadModule('/src/models/Combatants.ts');
const { PLAYER_DEFINITION } = await server.ssrLoadModule('/src/data/player.ts');
const { STATUS_DESCRIPTIONS } = await server.ssrLoadModule('/src/data/statuses.ts');
const { ENEMY_DEFINITIONS } = await server.ssrLoadModule('/src/data/enemies.ts');
const { EVENT_BATTLES } = await server.ssrLoadModule('/src/data/eventBattles.ts');
const { CONVERSATIONS } = await server.ssrLoadModule('/src/data/conversations.ts');
const { RUN_STATE, startEventBattle, resetRunState } = await server.ssrLoadModule('/src/models/RunState.ts');
const { energyRecovery, receivedEpDamage, recordHpDrain, turnStartDrawAllowed } = await server.ssrLoadModule('/src/models/statusRestrictions.ts');
const { effect: makeEffect } = await server.ssrLoadModule('/src/data/effectBuilders.ts');
const { EFFECT_TIMINGS } = await server.ssrLoadModule('/src/models/types.ts');
await server.close();

// Exercise the actual scene coordinator without loading Phaser or evaluating appearance.
function eventCoordinator(ConversationWindow, definitions = EVENT_BATTLES) {
  const source = ts.createSourceFile('BattleScene.ts', fs.readFileSync(new URL('../src/scenes/BattleScene.ts', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true);
  const battle = source.statements.find(n => ts.isClassDeclaration(n) && n.name.text === 'BattleScene');
  const method = ['runBattleConversation', 'runBeforeDrawEvents'].map(name => battle.members.find(n => n.name?.getText(source) === name).getText(source)).join('\n');
  const code = ts.transpileModule(`class Coordinator { ${method} }`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  const Coordinator = new Function('EVENT_BATTLES', 'RUN_STATE', 'ConversationWindow', 'makeEffect', 'EFFECT_TIMINGS', `${code}; return Coordinator;`)(definitions, RUN_STATE, ConversationWindow, makeEffect, EFFECT_TIMINGS);
  const calls = [], scene = new Coordinator();
  Object.assign(scene, { completedTurnEvents: new Map(), player: new Player(PLAYER_DEFINITION), statusRuntime: { turn: 3 }, modalOverlay: { visible: false },
    sys: { isActive: () => true }, hideStatusTooltip() {}, battleEventContext: c => c,
    executeEffects: async (effects, context) => { calls.push({ effects, context }); } });
  return { scene, calls };
}

test('turn events wait for dialogue, add cards once via the special route, and stop after cancellation', async () => {
  startEventBattle('tutorial');
  let close, shows = 0;
  class Dialogue {
    constructor(_scene, id) { assert.equal(id, 'tutorialTurn3'); shows++; this.finished = new Promise(resolve => { close = resolve; }); }
  }
  const { scene, calls } = eventCoordinator(Dialogue);
  const pending = scene.runBeforeDrawEvents();
  assert.equal(shows, 1); assert.equal(calls.length, 0);
  close(true); assert.equal(await pending, true);
  assert.equal(calls.length, 1); assert.equal(calls[0].effects[0].cardId, 'seduction');
  assert.deepEqual(calls[0].context.statusTrigger.visuals, ['addCardFromPlayerFadeIn']);
  await scene.runBeforeDrawEvents(); assert.equal(shows, 1); assert.equal(calls.length, 1);
  const cancelled = eventCoordinator(Dialogue), interrupted = cancelled.scene.runBeforeDrawEvents();
  close(false); assert.equal(await interrupted, false); assert.equal(cancelled.calls.length, 0);
  const otherTurn = eventCoordinator(Dialogue); otherTurn.scene.statusRuntime.turn = 2;
  assert.equal(await otherTurn.scene.runBeforeDrawEvents(), true); assert.equal(shows, 2);
  resetRunState();
});

test('tutorial setup is isolated and a fresh run restores all standard starting data', () => {
  startEventBattle('tutorial');
  assert.equal(RUN_STATE.eventBattleId, 'tutorial'); assert.equal(RUN_STATE.playerHp, 2);
  assert.deepEqual(RUN_STATE.deckIds, EVENT_BATTLES.tutorial.deckIds);
  assert.notEqual(RUN_STATE.deckIds, EVENT_BATTLES.tutorial.deckIds);
  assert.deepEqual(RUN_STATE.encounterEnemyIds, ['tutorialGrunt', 'tutorialGrunt', 'tutorialGrunt']);
  assert.deepEqual(RUN_STATE.playerStatuses.map(s => s.effect), ['Starvation', 'ExtremeFatigue']);
  assert.deepEqual(RUN_STATE.relicIds, PLAYER_DEFINITION.relics.filter(id => !EVENT_BATTLES.tutorial.excludedRelicIds?.includes(id)));
  const originalDeckSize = EVENT_BATTLES.tutorial.deckIds.length;
  RUN_STATE.deckIds.pop(); assert.equal(EVENT_BATTLES.tutorial.deckIds.length, originalDeckSize);
  const event = EVENT_BATTLES.tutorial.beforeDrawEvents.find(event => event.turn === 3);
  assert.equal(event.turn, 3); assert.deepEqual(event.cardIds, ['seduction']);
  assert.ok(CONVERSATIONS[event.conversationId]?.length > 0, 'configured dialogue exists');
  resetRunState();
  assert.equal(RUN_STATE.eventBattleId, undefined); assert.equal(RUN_STATE.battleIndex, 0);
  assert.equal(RUN_STATE.playerHp, PLAYER_DEFINITION.maxHp); assert.deepEqual(RUN_STATE.deckIds, PLAYER_DEFINITION.startingDeckIds);
  assert.deepEqual(RUN_STATE.playerStatuses, []); assert.deepEqual(RUN_STATE.encounterEnemyIds, []);
});

test('energy starts at zero and each restriction applies only to the specified recovery routes', () => {
  const player = new Player(PLAYER_DEFINITION);
  assert.equal(player.energy, 0); player.startTurn(); assert.equal(player.energy, player.maxEnergy);
  player.addStatus('Starvation'); assert.equal(player.startTurn(), 'Starvation'); assert.equal(player.energy, 0);
  assert.deepEqual(energyRecovery(player, 2), { amount: 0, cause: 'Starvation' });
  assert.deepEqual(energyRecovery(player, -1), { amount: -1 });
  recordHpDrain(player); assert.equal(player.hasStatus('Starvation'), true);
  recordHpDrain(player); assert.equal(player.hasStatus('Starvation'), false); assert.equal(player.hasStatus('Hunger'), true);
  assert.equal(player.statusDrainCounts.get('Hunger'), undefined);
  assert.equal(player.startTurn(), 'Hunger'); assert.equal(player.energy, 1);
  assert.deepEqual(energyRecovery(player, 2), { amount: 2 });
  recordHpDrain(player); assert.equal(player.hasStatus('Hunger'), true);
  recordHpDrain(player); assert.equal(player.hasStatus('Hunger'), false);
  player.startTurn(); assert.equal(player.energy, player.maxEnergy);
  assert.equal(STATUS_DESCRIPTIONS.Starvation.triggers[0].effects[0].amount, 1);
});

test('fatigue blocks start draws and overrides positive EP hits until HP strictly exceeds a quarter', () => {
  const player = new Player({ ...PLAYER_DEFINITION, maxHp: 40 }); player.hp = 2;
  player.addStatus('ExtremeFatigue');
  assert.equal(turnStartDrawAllowed(player), false);
  for (const amount of [0.1, 1, 15, 100]) assert.deepEqual(receivedEpDamage(player, amount), { amount: 1, cause: 'ExtremeFatigue' });
  assert.deepEqual(receivedEpDamage(player, 0), { amount: 0 });
  player.healHp(8); assert.equal(player.hp, 10); assert.equal(player.hasStatus('ExtremeFatigue'), true);
  player.healHp(1); assert.equal(player.hasStatus('ExtremeFatigue'), false); assert.equal(turnStartDrawAllowed(player), true);
  assert.equal(receivedEpDamage(player, 15).amount, 15);
  for (const status of ['Starvation', 'Hunger', 'ExtremeFatigue']) assert.equal(STATUS_DESCRIPTIONS[status].remain, 0);
});

test('event enemy shares grunt behavior except HP and requested intent pools and cannot spawn normally', () => {
  const base = ENEMY_DEFINITIONS.grunt, tutorial = ENEMY_DEFINITIONS.tutorialGrunt;
  assert.equal(tutorial.maxHp, 24); assert.equal(base.maxHp, 54); assert.deepEqual(tutorial.stages, []);
  assert.equal(tutorial.sprite, base.sprite); assert.equal(tutorial.maxEp, base.maxEp);
  assert.equal(tutorial.intents.length, 2); assert.equal(tutorial.intents_E.length, base.intents_E.length - 1);
  const player = new Player(PLAYER_DEFINITION), enemy = new Enemy(tutorial);
  assert.equal(enemy.currentIntent(player).id, 'fingering');
  enemy.addStatus('InsertV'); assert.equal(enemy.currentIntent(player).id, 'inOut');
  enemy.addStatus('Charm'); assert.notEqual(enemy.currentIntent(player).id, 'fingering');
});

test('tutorial repeats the card from turn four only while fatigued, at most once per turn', async () => {
  startEventBattle('tutorial');
  const { scene, calls } = eventCoordinator(class { constructor() { assert.fail('Repeated additions must not open dialogue'); } });
  scene.player.hp = 2;
  scene.player.addStatus('ExtremeFatigue');
  scene.statusRuntime.turn = 2;
  await scene.runBeforeDrawEvents(); assert.equal(calls.length, 0);
  for (const turn of [4, 5]) {
    scene.statusRuntime.turn = turn;
    await scene.runBeforeDrawEvents();
    await scene.runBeforeDrawEvents();
    assert.equal(calls.length, turn - 3);
  }
  assert.ok(calls.every(c => c.effects[0].cardId === 'seduction' && c.context.statusTrigger.visuals.includes('addCardFromPlayerFadeIn')));
  scene.player.healHp(scene.player.maxHp);
  scene.statusRuntime.turn = 6;
  await scene.runBeforeDrawEvents(); assert.equal(calls.length, 2);
  resetRunState();
  scene.player.hp = 2; scene.player.addStatus('ExtremeFatigue');
  scene.statusRuntime.turn = 7;
  await scene.runBeforeDrawEvents(); assert.equal(calls.length, 2);
});


test('dialogue-only turn events resume after closing, run once, and continue to following events', async () => {
  startEventBattle('tutorial');
  try {
    for (const cards of [undefined, []]) {
      let close, shows = 0;
      class Dialogue {
        constructor(_scene, id) {
          assert.equal(id, 'tutorialTurn1');shows++;
          this.finished = new Promise(resolve => { close = resolve; });
        }
      }
      const event = { turn: 1, conversationId: 'tutorialTurn1', ...(cards ? { cardIds: cards } : {}) };
      const definitions = { tutorial: { beforeDrawEvents: [event, { turn: 1, cardIds: ['seduction'] }] } };
      const { scene, calls } = eventCoordinator(Dialogue, definitions);
      scene.statusRuntime.turn = 1;
      const pending = scene.runBeforeDrawEvents();
      assert.equal(shows, 1);assert.equal(calls.length, 0);
      close(true);assert.equal(await pending, true);
      assert.equal(calls.length, 1);assert.equal(calls[0].effects[0].cardId, 'seduction');
      await scene.runBeforeDrawEvents();assert.equal(shows, 1);assert.equal(calls.length, 1);
      const cancelled = eventCoordinator(Dialogue, definitions);cancelled.scene.statusRuntime.turn = 1;
      const interrupted = cancelled.scene.runBeforeDrawEvents();close(false);
      assert.equal(await interrupted, false);assert.equal(cancelled.calls.length, 0);
    }
  } finally { resetRunState(); }
});


test('energy gains can exceed the baseline, costs preserve overflow, and turn start resets it',()=>{
  const source=ts.createSourceFile('BattleScene.ts',fs.readFileSync(new URL('../src/scenes/BattleScene.ts',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true);
  const battle=source.statements.find(n=>ts.isClassDeclaration(n)&&n.name.text==='BattleScene');
  const method=battle.members.find(n=>n.name?.getText(source)==='applyEffectEnergyGain').getText(source);
  const code=ts.transpileModule('class Harness { '+method+' }',{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
  const Harness=new Function('energyRecovery','FLAVOR_EVENTS',code+';return Harness;')(energyRecovery,{Effect:{EnergyChange:'energy'}});
  const h=new Harness(),player=new Player({...PLAYER_DEFINITION,maxEnergy:3});h.player=player;
  h.showEnergyRecoveryBlocked=()=>{};h.addGlobalFlavorEvent=()=>{};h.refreshHandCardUsabilities=()=>{};
  const result={messages:[]},context={sourceName:'test'};
  player.startTurn();h.applyEffectEnergyGain(1,context,result);assert.equal(player.energy,4);assert.match(result.messages.at(-1),/\+1 energy/);
  h.applyEffectEnergyGain(2,context,result);assert.equal(player.energy,6);
  h.applyEffectEnergyGain(-1,context,result);assert.equal(player.energy,5);
  player.startTurn();assert.equal(player.energy,3);
  player.energy=7;player.addStatus('Starvation',1);h.applyEffectEnergyGain(1,context,result);assert.equal(player.energy,7);
  player.startTurn();assert.equal(player.energy,0);
  player.statuses.delete('Starvation');player.addStatus('Hunger',1);player.energy=7;player.startTurn();assert.equal(player.energy,1);
  h.applyEffectEnergyGain(-10,context,result);assert.equal(player.energy,0);
});


test('battle-start dialogue follows status announcements/hooks and gates the first turn', async()=>{
 const source=ts.createSourceFile('BattleScene.ts',fs.readFileSync('src/scenes/BattleScene.ts','utf8'),ts.ScriptTarget.Latest,true);
 const battle=source.statements.find(n=>ts.isClassDeclaration(n)&&n.name.text==='BattleScene');
 const methods=['startInitialTurn','runBattleConversation'].map(name=>battle.members.find(n=>n.name?.getText(source)===name).getText(source)).join('\n');
 const code=ts.transpileModule('class Harness {'+methods+'}',{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
 startEventBattle('tutorial');
 try {
  assert.equal(EVENT_BATTLES.tutorial.battleStartConversationId,'tutorialTurn1');
  assert.ok(!EVENT_BATTLES.tutorial.beforeDrawEvents.some(e=>e.conversationId==='tutorialTurn1'));
  for(const result of [true,false]){
   const calls=[];let close,opened;
   const opening=new Promise(resolve=>opened=resolve);
   class Dialogue{constructor(_scene,id){assert.equal(id,'tutorialTurn1');calls.push('conversation');this.finished=new Promise(resolve=>close=resolve);opened();}}
   const Harness=new Function('RUN_STATE','EVENT_BATTLES','ConversationWindow','playBattleEntrance','FLAVOR_EVENTS','blocksTurnStartEpRecovery','turnStartDrawAllowed',code+';return Harness;')(RUN_STATE,EVENT_BATTLES,Dialogue,async()=>true,{Battle:{PlayerTurnStart:'turn'}},()=>false,()=>true);
   const h=new Harness();Object.assign(h,{player:{statuses:new Map([['Starvation',1],['ExtremeFatigue',1]]),startTurn(){calls.push('recovery');}},reticle:{active:true,setVisible(){}},sys:{isActive:()=>true},modalOverlay:{visible:false}});
   for(const name of ['updateHud','setTurnOverlayColor','setEndTurnEnabled','addBattleLogSpacing','addGlobalFlavorEvent','resetRecentOrgasmsIfNoAftershocksAtTurnStart','showEnergyRecoveryBlocked','syncPlayerEpReserveAfterTurnRecovery','clearPlayerBlockAfterTurnStartHooks','addBindingIntentWarnings','addPlayerActionReadySpacing','hideStatusTooltip'])h[name]=()=>{};
   for(const name of ['runBattleStartHooks','startTurnCounters','runTurnStartHooks','drawCards','runPlayerActionStartHooks'])h[name]=async()=>{calls.push(name);};
   h.runBeforeDrawEvents=async()=>{calls.push('beforeDraw');return true;};
   h.notifyAutomaticStatusChanges=async(_player,before)=>{if(!calls.length)assert.equal(before.size,0);calls.push('statuses');};
   const pending=h.startInitialTurn();await opening;
   assert.deepEqual(calls,['statuses','runBattleStartHooks','conversation']);
   close(result);await pending;
   if(result)assert.deepEqual(calls,['statuses','runBattleStartHooks','conversation','startTurnCounters','recovery','statuses','runTurnStartHooks','beforeDraw','drawCards','runPlayerActionStartHooks']);
   else assert.deepEqual(calls,['statuses','runBattleStartHooks','conversation']);
  }
 }finally{resetRunState();}
});
