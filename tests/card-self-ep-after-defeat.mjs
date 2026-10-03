import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createServer } from 'vite';
const server=await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
const {Player,Enemy}=await server.ssrLoadModule('/src/models/Combatants.ts');
const {PLAYER_DEFINITION}=await server.ssrLoadModule('/src/data/player.ts');
const {ENEMY_DEFINITIONS}=await server.ssrLoadModule('/src/data/enemies.ts');
const {CARD_DEFINITIONS}=await server.ssrLoadModule('/src/data/cards.ts');
const {FLAVOR_EVENTS,EP_DAMAGE_PARTS}=await server.ssrLoadModule('/src/models/types.ts');
const {evaluateConditions}=await server.ssrLoadModule('/src/models/conditions.ts');
await server.close();
const source=ts.createSourceFile('BattleScene.ts',fs.readFileSync('src/scenes/BattleScene.ts','utf8'),ts.ScriptTarget.Latest,true);
const cls=source.statements.find(n=>ts.isClassDeclaration(n)&&n.name.text==='BattleScene');
const names=['applyCardEffect','executeEffects','executeEffect','effectTargets','effectRepeatCount','effectRepeatContext','resolvePlayerEpDamageParts','normalizedEpDamageParts','cardEffectsInExecutionOrder','effectsByPriority','isEnemyTargetEffect','cowgirlEffectTargets','cowgirlInsertedTargets','cowgirlInsertedParts','enemyWithStatus','uniqueEnemies'];
const code=ts.transpileModule(`class Harness {${names.map(name=>cls.members.find(n=>n.name?.getText(source)===name).getText(source)).join('\n')}}`,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
const Harness=new Function('Enemy','FLAVOR_EVENTS','EP_DAMAGE_PARTS','evaluateConditions','localize',code+';return Harness;')(Enemy,FLAVOR_EVENTS,EP_DAMAGE_PARTS,evaluateConditions,x=>x);
function setup(statuses){
 const h=new Harness();h.player=new Player(PLAYER_DEFINITION);h.enemyOrgasmsThisBattle=0;
 h.enemies=statuses.map(status=>{const e=new Enemy(ENEMY_DEFINITIONS.grunt);if(status)e.addStatus(status);return e;});h.enemy=h.enemies[0];
 h.battleEventContext=c=>({player:h.player,enemies:h.enemies,actor:h.player,source:'card',...c});
 h.counterCardTargetEnemy=()=>undefined;h.cardDisplayName=()=>'';h.cardPlayerEpDamagePreview=()=>0;h.cardWillCauseEnemyOrgasm=()=>false;h.playerEffectiveMaxEp=()=>h.player.maxEp;
 h.runEnemyReactionsForCardSelfEpDamageTiming=async()=>{};h.updateHud=()=>{};h.addFlavorEvent=()=>{};h.addRandomAmountFlavors=()=>{};
 h.mergeEffectExecutionResult=(target,result)=>{target.damagedEnemies=result.damagedEnemies;};h.effectAmountForContext=e=>e.amount;
 h.applyEffectStatus=async()=>{};h.events=[];
 h.applyEffectEpDamage=async(effect,target,amount,context,result)=>{
  if(target instanceof Enemy){target.hp=0;result.damagedEnemies.set(target,amount);h.events.push('enemy defeated');}
  else {h.events.push({amount,parts:h.resolvePlayerEpDamageParts(effect,context)});}
 };
 h.defeatEnemy=async()=>{h.events.push('victory check');};
 return h;
}
test('fixed EP self damage executes after the last enemy dies, before victory handling',async()=>{
 for(const id of ['blowjob','Titjob']){
  const h=setup([undefined]);await h.applyCardEffect({definition:CARD_DEFINITIONS[id]},h.enemy);
  assert.equal(h.events[0],'enemy defeated');
  assert.deepEqual(h.events[1],{amount:.5,parts:[id==='blowjob'?'M':'B']});
  assert.equal(h.events.at(-1),'victory check');
 }
});
test('cowgirl retains both self hits and their parts when one or both connected enemies die',async()=>{
 for(const killedCount of [1,2]){
  const h=setup(['InsertV','InsertA']);let hits=0;
  const original=h.applyEffectEpDamage;
  h.applyEffectEpDamage=async(...args)=>{if(args[1] instanceof Enemy&&++hits>killedCount)return;await original(...args);};
  await h.applyCardEffect({definition:CARD_DEFINITIONS.cowgirlRiding},h.enemy);
  assert.deepEqual(h.events.filter(e=>typeof e==='object'),[{amount:5,parts:['V']},{amount:5,parts:['A']}]);
  assert.equal(h.events.at(-1),'victory check');
 }
});
test('an A-only connection keeps A self damage after its enemy dies',async()=>{
 const h=setup(['InsertA']);await h.applyCardEffect({definition:CARD_DEFINITIONS.cowgirlRiding},h.enemy);
 assert.deepEqual(h.events.filter(e=>typeof e==='object'),[{amount:5,parts:['A']}]);
});
