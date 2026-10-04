import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createServer} from 'vite';
const server=await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
const {Player,Enemy}=await server.ssrLoadModule('/src/models/Combatants.ts');
const {PLAYER_DEFINITION}=await server.ssrLoadModule('/src/data/player.ts');
const {ENEMY_DEFINITIONS,ENEMY_ORGASM_AFTERSHOCKS_INTENT}=await server.ssrLoadModule('/src/data/enemies.ts');
const {CARD_DEFINITIONS}=await server.ssrLoadModule('/src/data/cards.ts');
const {FLAVOR_EVENTS}=await server.ssrLoadModule('/src/models/types.ts');
const {evaluateConditions}=await server.ssrLoadModule('/src/models/conditions.ts');
const {receivedEpDamage}=await server.ssrLoadModule('/src/models/statusRestrictions.ts');
await server.close();
const source=ts.createSourceFile('BattleScene.ts',fs.readFileSync('src/scenes/BattleScene.ts','utf8'),ts.ScriptTarget.Latest,true);
const cls=source.statements.find(n=>ts.isClassDeclaration(n)&&n.name.text==='BattleScene');
const methods=['resolveFlavorLines','applyCardEffect','cardPlayerEpDamagePreview','cardWillCausePlayerOrgasm','cardWillCauseEnemyOrgasm','addEnemyOrgasmLog','applyEnemyEpDamage','resolveEnemyOrgasm'].map(name=>cls.members.find(n=>n.name?.getText(source)===name).getText(source)).join('\n');
const code=ts.transpileModule(`class Harness {${methods}}`,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
const Harness=new Function('evaluateConditions','FLAVOR_EVENTS','receivedEpDamage','localize',`${code};return Harness;`)(evaluateConditions,FLAVOR_EVENTS,receivedEpDamage,x=>x);
const ids=['handjob','blowjob','Titjob','cowgirlRiding'];
function setup(id='handjob'){
 const h=new Harness(),player=new Player(PLAYER_DEFINITION),enemy=new Enemy(ENEMY_DEFINITIONS.grunt);
 h.player=player;h.enemyOrgasmsThisBattle=0;h.battleEventContext=c=>c;
 const context={source:'card',actor:player,player,enemies:[enemy],selectedEnemy:enemy,card:CARD_DEFINITIONS[id]};
 return {h,player,enemy,context};
}
test('four cards select conditions in requested order and keep original fallback',()=>{
 for(const id of ids){
  const {h,player,enemy,context}=setup(id),entries=context.card.flavors[FLAVOR_EVENTS.Card.Play];
  const scenarios=[()=>{enemy.definition={...enemy.definition,traits:['sexToy']};},()=>{enemy.definition={...enemy.definition,traits:['softBody']};},()=>{context.flavorValues={enemyWillOrgasm:true};},()=>{enemy.inOrgasmAftershocks=true;},()=>{player.addStatus('DesperateToCum');},()=>{player.addStatus('InHeat');}];
  scenarios.splice(2,0,...(id==='handjob' ? [] : [()=>{player.addStatus('MultipleOrgasms');context.flavorValues={playerSelfEpDamage:1};}]),
   ()=>{player.addStatus('MultipleOrgasms');context.flavorValues={playerSelfEpDamage:0};});
  if(id!=='handjob') scenarios.splice(2,0,
   ()=>{context.flavorValues={enemyWillOrgasm:true,playerWillOrgasm:true};},
   ()=>{context.flavorValues={enemyWillOrgasm:false,playerWillOrgasm:true};});
  for(let i=0;i<scenarios.length;i++){
   player.statuses.clear();enemy.definition={...enemy.definition,traits:[]};enemy.inOrgasmAftershocks=false;context.flavorValues={enemyWillOrgasm:false};scenarios[i]();
   assert.deepEqual(h.resolveFlavorLines(entries,context),entries[i].lines,`${id} condition ${i}`);
  }
  player.statuses.clear();context.flavorValues={enemyWillOrgasm:false};
  assert.ok(h.resolveFlavorLines(entries,context).every(l=>l.text.en!=='...'));
  enemy.definition={...enemy.definition,traits:['sexToy','softBody']};context.flavorValues={enemyWillOrgasm:true};
  assert.deepEqual(h.resolveFlavorLines(entries,context),entries[0].lines);
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

test('enemy orgasm flavor inherits playerWillOrgasm and keeps original lines as the fallback',()=>{
 for(const id of ids){
  const {h,enemy,context}=setup(id),entries=context.card.flavors[FLAVOR_EVENTS.Battle.EnemyOrgasm];
  const [branch,...fallback]=entries;
  assert.deepEqual(branch.conditions.map(({kind,operator,valueKey,value})=>({kind,operator,valueKey,value})),[{kind:'flavorValue',operator:'eq',valueKey:'playerWillOrgasm',value:true}]);
  const fallbackLines=h.resolveFlavorLines(fallback,context);
  assert.deepEqual(new Set(branch.lines.map(line=>line.kind)),new Set(fallbackLines.map(line=>line.kind)));
  for(const predicted of [true,false,undefined]){
   context.flavorValues=predicted===undefined?{}:{playerWillOrgasm:predicted};
   let emitted;
   h.addGlobalFlavorEvent=()=>{};
   h.addFlavorEvent=(flavors,event,eventContext)=>{
    assert.equal(event,FLAVOR_EVENTS.Battle.EnemyOrgasm);
    assert.equal(eventContext.flavorValues.playerWillOrgasm,predicted);
    emitted=h.resolveFlavorLines(flavors[event],eventContext);
   };
   h.addEnemyOrgasmLog(enemy,context);
   assert.deepEqual(emitted,predicted===true?branch.lines:fallbackLines,id);
  }
 }
});
test('EP damage forwards its context through every orgasm resolution',async()=>{
 const {h,enemy,context}=setup(),seen=[];h.enemyViewFor=()=>({bars:{}});h.updateHud=()=>{};h.animateEpFillTo=async()=>{};h.wait=async()=>{};
 h.resolveEnemyOrgasm=async(e,c)=>{seen.push(c);e.resetEpAfterOrgasm();};
 enemy.ep=enemy.maxEp-1;
 assert.equal(await h.applyEnemyEpDamage(1,enemy,context),true);assert.deepEqual(seen,[context]);
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

test('every authored playerCummed condition also requires no enemy orgasm',()=>{
 let checked=0;
 for(const card of Object.values(CARD_DEFINITIONS)) for(const entries of Object.values(card.flavors??{})) for(const entry of entries){
  if(!entry.conditions?.some(c=>c.kind==='flavorValue'&&c.valueKey==='playerCummed')) continue;
  checked++;
  assert.ok(entry.conditions.some(c=>c.kind==='flavorValue'&&c.valueKey==='enemyCummed'&&c.operator==='eq'&&c.value===false),card.id);
  const {h,player,context}=setup();player.statuses.clear();
  for(const playerCummed of [false,true]) for(const enemyCummed of [false,true]){
   context.flavorValues={playerCummed,enemyCummed};
   assert.equal(evaluateConditions(entry.conditions,context),playerCummed&&!enemyCummed,card.id);
   const selected=h.resolveFlavorLines([entry],context);
   assert.equal(selected.length>0,playerCummed&&!enemyCummed,card.id);
  }
 }
 assert.ok(checked>0);
});
test('card completion waits for all effects and purge, and measures only Orgasms during this card',async()=>{
 for(const causedOrgasm of [false,true]) for(const enemyOrgasmStage of ['none','reaction','effects','purge']){
  const {h,player,enemy,context}=setup('blowjob'),events=[];player.orgasmsThisBattle=9;
  h.enemyOrgasmsThisBattle=7; // Earlier cards' Orgasms must not affect this result.
  const otherEnemy=new Enemy(ENEMY_DEFINITIONS.grunt);
  h.enemyViewFor=()=>({area:{},body:{},bars:{}});
  h.flashOrgasm=async()=>{};h.addEnemyOrgasmLog=()=>{};
  h.runEnemyOrgasmHooks=async()=>{otherEnemy.hp=0;}; // Still counts if the orgasm's drain defeats it.
  h.resolveMaleEnemyOrgasmAftershocks=async()=>{};h.setEpFillImmediate=()=>{};
  const orgasmAt=async stage=>{if(enemyOrgasmStage===stage) await h.resolveEnemyOrgasm(otherEnemy,{source:'relic'});};
  const definition={...context.card,purgeStatus:'Aftershocks'};
  let finish;const pending=new Promise(r=>{finish=r;});
  h.enemy=enemy;h.counterCardTargetEnemy=()=>undefined;h.cardDisplayName=()=>'';
  h.cardWillCausePlayerOrgasm=()=>false;h.cardPlayerEpDamagePreview=()=>0;h.cardWillCauseEnemyOrgasm=()=>false;
  h.runEnemyReactionsForCardSelfEpDamageTiming=async()=>{await orgasmAt('reaction');};h.cardEffectsInExecutionOrder=()=>[];
  h.executeEffects=async()=>{await pending;await orgasmAt('effects');if(causedOrgasm){player.orgasmsThisBattle++;player.addStatus('MultipleOrgasms');}return {};};
  h.mergeEffectExecutionResult=()=>{};h.applyPurgeEffect=async()=>{await orgasmAt('purge');events.push('purge');};
  h.updateHud=()=>{};h.addFlavorEvent=(f,event,c)=>events.push({event,context:c});
  const task=h.applyCardEffect({definition},enemy);
  await Promise.resolve();await Promise.resolve();
  assert.equal(events.filter(e=>e.event===FLAVOR_EVENTS.Card.Resolved).length,0);
  finish();await task;
  const completed=events.find(e=>e.event===FLAVOR_EVENTS.Card.Resolved);
  assert.equal(completed.context.flavorValues.playerCummed,causedOrgasm);
  assert.equal(completed.context.flavorValues.enemyCummed,enemyOrgasmStage!=='none');
  assert.equal(completed.context.causedOrgasm,causedOrgasm);
  assert.ok(events.indexOf('purge')<events.indexOf(completed));
  assert.equal(events.filter(e=>e.event===FLAVOR_EVENTS.Card.Resolved).length,1);
 }
});
