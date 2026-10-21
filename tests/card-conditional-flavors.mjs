import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createServer} from 'vite';
import { playerState as state, enemyTrait as trait, flavorValue as flag, status, branchLines, kindLines } from './helpers/flavor-branches.mjs';
const server=await createServer({resolve:{preserveSymlinks:true},optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
const {Player,Enemy}=await server.ssrLoadModule('/src/models/Combatants.ts');
const {PLAYER_DEFINITION}=await server.ssrLoadModule('/src/data/player.ts');
const {ENEMY_DEFINITIONS,ENEMY_ORGASM_AFTERSHOCKS_INTENT}=await server.ssrLoadModule('/src/data/enemies.ts');
const {CARD_DEFINITIONS}=await server.ssrLoadModule('/src/data/cards.ts');
const {FLAVOR_EVENTS}=await server.ssrLoadModule('/src/models/types.ts');
const {evaluateConditions}=await server.ssrLoadModule('/src/models/conditions.ts');
const {receivedEpDamage}=await server.ssrLoadModule('/src/models/statusRestrictions.ts');
const {EpHeartBudget}=await server.ssrLoadModule('/src/models/epHeartMotion.ts');
await server.close();
const source=ts.createSourceFile('BattleScene.ts',fs.readFileSync('src/scenes/BattleScene.ts','utf8'),ts.ScriptTarget.Latest,true);
const cls=source.statements.find(n=>ts.isClassDeclaration(n)&&n.name.text==='BattleScene');
const methods=['resolveFlavorLines','applyCardEffect','cardPlayerEpDamagePreview','cardWillCausePlayerOrgasm','cardWillCauseEnemyOrgasm','addEnemyOrgasmLog','applyEnemyEpDamage','resolveEnemyOrgasm'].map(name=>cls.members.find(n=>n.name?.getText(source)===name).getText(source)).join('\n');
const code=ts.transpileModule(`class Harness {${methods}}`,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
const Harness=new Function('evaluateConditions','FLAVOR_EVENTS','receivedEpDamage','localize','EpHeartBudget',`${code};return Harness;`)(evaluateConditions,FLAVOR_EVENTS,receivedEpDamage,x=>x,EpHeartBudget);
const ids=['handjob','blowjob','titjob','cowgirlRiding'];
function setup(id='handjob'){
 const h=new Harness(),player=new Player(PLAYER_DEFINITION),enemy=new Enemy(ENEMY_DEFINITIONS.grunt);
 h.player=player;h.enemy=enemy;h.enemies=[enemy];h.enemyOrgasmsThisBattle=0;h.battleEventContext=c=>c;
 const context={source:'card',actor:player,player,enemies:[enemy],selectedEnemy:enemy,card:CARD_DEFINITIONS[id]};
 return {h,player,enemy,context};
}
test('card Play prioritizes species/exhaustion/Gagged and prediction without relying on branch indices',()=>{
 for(const id of ids){
  const cases = [
   { expected: [] },
   { states:['InHeat'], expected:[status(['Horny','InHeat','Frustrated'])] },
   { states:['DesperateToCum'], expected:id==='handjob'?[]:[status('DesperateToCum')] },
   { gagged:true, states:['InHeat'], expected:[state('Gagged')] },
   { states:['MultipleOrgasms'], values:{playerSelfEpDamage:1}, expected:id==='handjob'?[state('Breathless')]:[state('Breathless'),flag('playerSelfEpDamage',1,'gte')] },
   { states:['MultipleOrgasms'], values:{playerSelfEpDamage:0}, expected:id==='cowgirlRiding'?[]:[state('Breathless')] },
   { values:{enemyWillOrgasm:true}, expected:[flag('enemyWillOrgasm',true)] },
   { values:{enemyWillOrgasm:true,playerWillOrgasm:true}, expected:id==='handjob'?[flag('enemyWillOrgasm',true)]:[flag('enemyWillOrgasm',true),flag('playerWillOrgasm',true)] },
   { aftershocks:true, states:['InHeat'], expected:[{kind:'enemyOrgasmAftershocks',operator:'eq',target:'selectedEnemy',value:true}] },
  ];
  if(id!=='handjob') cases.push(
   {values:{playerWillOrgasm:true},expected:[flag('playerWillOrgasm',true)]},
   {states:['InHeat'],values:{playerWillOrgasm:true},expected:[flag('playerWillOrgasm',true),state('Aroused')]},
  );
  for(const species of ['sexToy','softBody']) for(const exhausted of [false,true]) for(const gagged of [false,true]) {
   cases.push({species, gagged, states:exhausted?['MultipleOrgasms','Bound']:[],values:{enemyWillOrgasm:true},
    expected:exhausted?[state('Breathless'),trait(species),...(gagged?[state('Gagged')]:[])]:gagged?[state('Gagged')]:[trait(species)]});
  }
  for(const scenario of cases) {
   const {h,player,enemy,context}=setup(id),entries=context.card.flavors[FLAVOR_EVENTS.Card.Play];
   for(const s of scenario.states??[])player.addStatus(s);
   if(scenario.species)enemy.definition={...enemy.definition,traits:[scenario.species]};
   if(scenario.gagged){const other=new Enemy(ENEMY_DEFINITIONS.grunt);other.addStatus('IntrudedM');context.enemies.push(other);}
   enemy.inOrgasmAftershocks=!!scenario.aftershocks;
   context.flavorValues={enemyWillOrgasm:false,playerWillOrgasm:false,...scenario.values};
   const selected=h.resolveFlavorLines(entries,context);
   assert.deepEqual(kindLines(selected),branchLines(entries,scenario.expected),`${id}: ${JSON.stringify(scenario)}`);
   assert.ok(kindLines(selected,'narration').length,`${id}: narration survives quote replacement`);
   if(id==='cowgirlRiding'&&scenario.states?.includes('MultipleOrgasms'))
    assert.deepEqual(kindLines(selected,'narration'),branchLines(entries,[state('Breathless')],'narration'));
  }
 }
});
test('aftershocks flavor state survives Charm but ends after that action',()=>{
 const {player,enemy,context}=setup();const condition=[{kind:'enemyOrgasmAftershocks',operator:'eq',value:true}];
 enemy.setOrgasmAftershocksIntent(ENEMY_ORGASM_AFTERSHOCKS_INTENT);
 assert.equal(evaluateConditions(condition,context),true);
 enemy.addStatus('Charm');const intent=enemy.currentIntent(player,[enemy]);
 assert.equal(enemy.hasOrgasmAftershocksIntent(),false);
 assert.equal(evaluateConditions(condition,context),true);
 enemy.advanceIntent(intent,player,[enemy]);assert.equal(evaluateConditions(condition,context),false);
 enemy.statuses.clear();enemy.setOrgasmAftershocksIntent(ENEMY_ORGASM_AFTERSHOCKS_INTENT);
 enemy.advanceIntent(enemy.currentIntent(player,[enemy]),player,[enemy]);
 assert.equal(evaluateConditions(condition,context),false);
});
test('Orgasm prediction uses target, modified damage and repetitions without rolling random damage',()=>{
 const {h,enemy,context}=setup();h.isPlayerTurn=true;
 h.cardEffectsInExecutionOrder=d=>d.effects;h.effectTargets=e=>e.target==='selectedEnemy'?[enemy]:[h.player];
 h.effectRepeatCount=e=>e.times??1;h.effectRepeatContext=(e,c)=>c;h.effectChance=e=>e.chance??1;
 h.effectBaseAmountForContext=e=>e.amount;h.modifiedEnemyEpDamage=n=>Math.ceil(n*1.5);
 const def={effects:[{kind:'epDamage',target:'selectedEnemy',amount:3}]};
 enemy.ep=enemy.maxEp-5;assert.equal(h.cardWillCauseEnemyOrgasm(def,enemy,context),true);
 enemy.ep--;assert.equal(h.cardWillCauseEnemyOrgasm(def,enemy,context),false);
 def.effects[0].times=2;assert.equal(h.cardWillCauseEnemyOrgasm(def,enemy,context),true);
 def.effects[0].chance=0.5;assert.equal(h.cardWillCauseEnemyOrgasm(def,enemy,context),false);
 def.effects[0].chance=1;def.effects[0].randomAmount={min:0,max:100};assert.equal(h.cardWillCauseEnemyOrgasm(def,enemy,context),false);
 enemy.maxEp=0;assert.equal(h.cardWillCauseEnemyOrgasm(def,enemy,context),false);
});
test('Orgasm dialogue uses the actual cause card and target, excluding other sources',()=>{
 for(const id of ids){
  const {h,enemy,context}=setup(id),logs=[];
  h.addGlobalFlavorEvent=()=>{};h.addFlavorEvent=(f,e,c)=>logs.push({f,e,c});
  h.addEnemyOrgasmLog(enemy,context);assert.equal(logs.length,1);assert.equal(logs[0].f,CARD_DEFINITIONS[id].flavors);assert.equal(logs[0].c.triggerEnemy,enemy);
  assert.equal(logs[0].e,FLAVOR_EVENTS.Battle.EnemyOrgasm);
  h.addEnemyOrgasmLog(enemy,{...context,source:'enemyIntent'});h.addEnemyOrgasmLog(enemy,{...context,source:'relic'});h.addEnemyOrgasmLog(enemy);
  assert.equal(logs.length,1);
 }
});

test('enemy orgasm forwards the prediction and independently selects Gagged and ordinary quotes',()=>{
 for(const id of ids){
  for(const predicted of [true,false,undefined])for(const gagged of [false,true]){
   const {h,enemy,context}=setup(id),entries=context.card.flavors[FLAVOR_EVENTS.Battle.EnemyOrgasm];
   if(gagged){const other=new Enemy(ENEMY_DEFINITIONS.grunt);other.addStatus('InsertM');context.enemies.push(other);}
   context.flavorValues=predicted===undefined?{}:{playerWillOrgasm:predicted};
   let emitted;
   h.addGlobalFlavorEvent=()=>{};
   h.addFlavorEvent=(flavors,event,eventContext)=>{
    assert.equal(event,FLAVOR_EVENTS.Battle.EnemyOrgasm);
    assert.equal(eventContext.flavorValues.playerWillOrgasm,predicted);
    emitted=h.resolveFlavorLines(flavors[event],eventContext);
   };
   h.addEnemyOrgasmLog(enemy,context);
   const expected=[...(predicted===true&&id!=='handjob'?[flag('playerWillOrgasm',true)]:[]),...(gagged?[state('Gagged')]:[])];
   assert.deepEqual(kindLines(emitted),branchLines(entries,expected),id);
   // titjob only supplies narration for the predicted-player-result branch.
   const hasNarration=id!=='titjob'||predicted===true;
   assert.equal(kindLines(emitted,'narration').length>0,hasNarration,`${id}: event narration availability`);
  }
 }
});
test('EP damage forwards its context through every orgasm resolution',async()=>{
 const {h,enemy,context}=setup(),seen=[];h.enemyViewFor=()=>({bars:{}});h.updateHud=()=>{};h.animateEpFillTo=async()=>{};h.wait=async()=>{};
 h.enemyEffectX=()=>0;h.enemyEffectY=()=>0;
 h.resolveEnemyOrgasm=async(e,c)=>{seen.push(c);e.resetEpAfterOrgasm();};
 enemy.ep=enemy.maxEp-1;
 const received={amount:0},amount=enemy.maxEp+1;
 assert.equal(await h.applyEnemyEpDamage(amount,enemy,context,received),true);
 assert.equal(seen.length,2);assert.ok(seen.every(c=>c===context));
 assert.equal(received.amount,amount);
});

test('player orgasm prediction respects fractional damage, restrictions, repetitions and guaranteed damage',()=>{
 const {h,player,context}=setup('blowjob');h.isPlayerTurn=true;
 h.cardEffectsInExecutionOrder=d=>d.effects;h.effectTargets=e=>e.target==='player'?[player]:[];
 h.cardPreviewEffectAmount=(d,e)=>e.amount;h.effectRepeatCount=e=>e.times??1;h.effectRepeatContext=(e,c)=>c;
 h.resolvePlayerEpDamageParts=e=>e.epDamageParts??['M'];h.effectChance=e=>e.chance??1;h.playerEffectiveMaxEp=()=>12;
 let multiplier=1;
 h.modifiedPlayerEpDamageForCard=(d,n)=>Number.isInteger(n)?Math.ceil(n*multiplier):Math.floor(n*multiplier);
 const def={effects:[{kind:'epDamage',target:'player',amount:0.5}]};
 player.ep=11;
 assert.equal(h.cardWillCausePlayerOrgasm(def,context),false,'fractional damage rounds to zero');
 multiplier=2;assert.equal(h.cardWillCausePlayerOrgasm(def,context),true);
 multiplier=1;def.effects[0].amount=5;player.ep=10;player.addStatus('ExtremeFatigue');
 assert.equal(h.cardWillCausePlayerOrgasm(def,context),false,'fixed damage is only 1');
 player.ep=11;assert.equal(h.cardWillCausePlayerOrgasm(def,context),true);
 player.ep=10;def.effects[0].times=2;assert.equal(h.cardWillCausePlayerOrgasm(def,context),true);
 def.effects[0].chance=0.5;assert.equal(h.cardWillCausePlayerOrgasm(def,context),false);
 def.effects[0].chance=1;def.effects[0].randomAmount={min:0,max:100};assert.equal(h.cardWillCausePlayerOrgasm(def,context),false);
 player.ep=12;assert.equal(h.cardWillCausePlayerOrgasm({effects:[]},context),false,'no self damage is not a orgasm');
});

test('completion quotes support player-only, both-result and enemy-independent branches with their extra conditions',()=>{
 for(const id of ['blowjob','titjob','cowgirlRiding','feverPiston','hazyPiston'])
  for(const playerCummed of [false,true])for(const enemyCummed of [false,true])
   for(const gagged of [false,true])for(const exhausted of [false,true]){
   const {h,player,enemy,context}=setup(id),entries=context.card.flavors[FLAVOR_EVENTS.Card.Resolved];
   if(gagged){const other=new Enemy(ENEMY_DEFINITIONS.grunt);other.addStatus('IntrudedM');context.enemies.push(other);}
   if(exhausted)player.addStatus('MultipleOrgasms');
   context.flavorValues={playerCummed,enemyCummed};
   const mouth=gagged?[state('Gagged')]:[];
   let expected;
   if(id==='feverPiston')expected=gagged?mouth:exhausted?[state('Breathless'),...(playerCummed?[flag('playerCummed',true)]:[])]:playerCummed?[flag('playerCummed',true)]:undefined;
   else if(id==='hazyPiston')expected=playerCummed?[...mouth,flag('playerCummed',true)]:undefined;
   else expected=exhausted?[state('Breathless'),...mouth]:playerCummed?[flag('playerCummed',true),flag('enemyCummed',enemyCummed),trait('male'),...mouth]:undefined;
   const actual=kindLines(h.resolveFlavorLines(entries,context));
   assert.deepEqual(actual,expected?branchLines(entries,expected):[],`${id}: ${JSON.stringify({playerCummed,enemyCummed,gagged,exhausted})}`);
   // Male-only completion lines must not become a universal result reaction.
   if(!['feverPiston','hazyPiston'].includes(id)&&!exhausted){
    enemy.definition={...enemy.definition,traits:[]};
    assert.deepEqual(kindLines(h.resolveFlavorLines(entries,context)),[]);
   }
  }
});
test('card completion waits for effects, purge and combos and measures only results during this card',async()=>{
 for(const turnOrgasms of [0,2]) for(const causedOrgasm of [false,true]) for(const enemyOrgasmStage of ['none','reaction','effects','purge','combo']){
  const {h,player,enemy,context}=setup('blowjob'),events=[];player.orgasmsThisBattle=9;
  h.playerOrgasmsThisCycle=turnOrgasms;
  h.enemyOrgasmsThisBattle=7; // Earlier cards' Orgasms must not affect this result.
  const otherEnemy=new Enemy(ENEMY_DEFINITIONS.grunt);
  h.enemies.push(otherEnemy);player.relicIds=[];
  h.enemyViewFor=()=>({area:{},body:{},bars:{ribbon:{startEnemyRelease(){}}}});
  h.flashOrgasm=async()=>{};h.addEnemyOrgasmLog=()=>{};
  h.runEnemyOrgasmHooks=async()=>{otherEnemy.hp=0;}; // Still counts if the orgasm's drain defeats it.
  h.resolveMaleEnemyOrgasmAftershocks=async()=>{};h.setEpFillImmediate=()=>{};
  const orgasmAt=async stage=>{if(enemyOrgasmStage===stage) await h.resolveEnemyOrgasm(otherEnemy,{source:'relic'});};
  const definition={...context.card,purgeStatus:'Aftershocks'};
  let finish,finishCombo,enteredCombo;
  const pending=new Promise(r=>{finish=r;}),pendingCombo=new Promise(r=>{finishCombo=r;}),comboEntered=new Promise(r=>{enteredCombo=r;});
  h.enemy=enemy;h.counterCardTargetEnemy=()=>undefined;h.cardDisplayName=()=>'';
  h.cardWillCausePlayerOrgasm=()=>false;h.cardPlayerEpDamagePreview=()=>0;h.cardWillCauseEnemyOrgasm=()=>false;
  h.runEnemyReactionsForCardSelfEpDamageTiming=async()=>{await orgasmAt('reaction');};h.cardEffectsInExecutionOrder=()=>[];
  h.executeEffects=async()=>{await pending;await orgasmAt('effects');if(causedOrgasm){player.orgasmsThisBattle++;h.playerOrgasmsThisCycle++;player.addStatus('MultipleOrgasms');}return {};};
  h.mergeEffectExecutionResult=()=>{};h.applyPurgeEffect=async()=>{await orgasmAt('purge');events.push('purge');};
  h.flushComboActions=async()=>{enteredCombo();await pendingCombo;await orgasmAt('combo');events.push('combo');};
  h.defeatEnemy=async()=>{};
  h.updateHud=()=>{};h.addFlavorEvent=(f,event,c)=>events.push({event,context:c});
  const task=h.applyCardEffect({definition},enemy);
  await Promise.resolve();await Promise.resolve();
  assert.equal(events.filter(e=>e.event===FLAVOR_EVENTS.Card.Resolved).length,0);
  finish();await comboEntered;
  assert.equal(events.filter(e=>e.event===FLAVOR_EVENTS.Card.Resolved).length,0,'must wait for combos');
  finishCombo();await task;
  const completed=events.find(e=>e.event===FLAVOR_EVENTS.Card.Resolved);
  assert.equal(events.find(e=>e.event===FLAVOR_EVENTS.Card.Play).context.flavorValues.playerOrgasmsThisTurn,turnOrgasms);
  assert.equal(completed.context.flavorValues.playerOrgasmsThisTurn,turnOrgasms,'later events retain the Play-time count');
  assert.equal(completed.context.flavorValues.playerCummed,causedOrgasm);
  assert.equal(completed.context.flavorValues.enemyCummed,enemyOrgasmStage!=='none');
  assert.equal(completed.context.causedOrgasm,causedOrgasm);
  assert.ok(events.indexOf('purge')<events.indexOf(completed));
  assert.ok(events.indexOf('purge')<events.indexOf('combo'));
  assert.ok(events.indexOf('combo')<events.indexOf(completed));
  assert.equal(events.filter(e=>e.event===FLAVOR_EVENTS.Card.Resolved).length,1);
 }
});
