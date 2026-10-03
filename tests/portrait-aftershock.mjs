import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createServer} from 'vite';
const server=await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
const {STATUS_DESCRIPTIONS}=await server.ssrLoadModule('/src/data/statuses.ts');
const {PORTRAIT_FACTORS}=await server.ssrLoadModule('/src/data/portraitFactors.ts');
const {PortraitSelection}=await server.ssrLoadModule('/src/models/portraitSelection.ts');
const {statusStacksPerEnergy}=await server.ssrLoadModule('/src/models/statusConsumption.ts');
const {relicStatusConsumptionBonus}=await server.ssrLoadModule('/src/models/relicRules.ts');
const {FLAVOR_EVENTS}=await server.ssrLoadModule('/src/models/types.ts');
await server.close();
const source=ts.createSourceFile('BattleScene.ts',fs.readFileSync('src/scenes/BattleScene.ts','utf8'),ts.ScriptTarget.Latest,true);
const cls=source.statements.find(n=>ts.isClassDeclaration(n)&&n.name.text==='BattleScene');
const methods=['beginPlayerPortraitFactor','applyStatusTriggerEffects','executeStatusTriggerEffects','runStatusTriggerVisuals'].map(name=>cls.members.find(n=>n.name?.getText(source)===name).getText(source)).join('\n');
const code=ts.transpileModule(`class Harness {${methods}}`,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
const Harness=new Function('Enemy','statusStacksPerEnergy','FLAVOR_EVENTS','relicStatusConsumptionBonus',code+';return Harness;')(class Enemy {},statusStacksPerEnergy,FLAVOR_EVENTS,relicStatusConsumptionBonus);
const pause=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {resolve,promise};};
const tick=()=>new Promise(r=>setImmediate(r));
const id=suffix=>'Succubus_tutorial_'+suffix;
function setup(stacks,energy=3,extra=[]){
 const h=new Harness(),status='Aftershocks',definition=STATUS_DESCRIPTIONS[status],trigger=definition.triggers.find(t=>t.consumeRule==='allWhileEnergy');
 h.player={energy,relicIds:[],statuses:new Map([[status,stacks]]),hasStatus(id){return (this.statuses.get(id)??0)>0;}};
 const context=()=>({playerId:'Succubus',category:'tutorial',statuses:new Set([...h.player.statuses].filter(([,n])=>n>0).map(([id])=>id)),statusStacks:h.player.statuses,relics:new Set(),hpRatio:1,epRatio:0});
 h.playerPortraitContext=context;
 h.portraitSelection=new PortraitSelection(['idle_1','AftershockBreath_1',...extra].map(id),PORTRAIT_FACTORS);
 h.refreshPlayerPortrait=()=>{h.current=h.currentPortraitId=h.portraitSelection.select(context());};h.refreshPlayerPortrait();
 const motions=[];let starts=0;
 const begin=h.beginPlayerPortraitFactor.bind(h);h.beginPlayerPortraitFactor=tag=>{starts++;return begin(tag);};
 Object.assign(h,{battleEventContext:c=>c,statusDisplayName:s=>s,bindingEnemyForContext:()=>undefined,
 consumeStatusWithNotice:async(owner,id,n)=>{owner.statuses.set(id,owner.statuses.get(id)-n);h.refreshPlayerPortrait();},
 pulseRelicIcons:()=>{},pulseStatusIcon:async()=>{},statusTriggerEffectsForRun:t=>t.effects,
 executeEffects:async()=>{h.player.energy--;return {messages:[]};},
 addFlavorEvent(){},updateHud(){},wait:async()=>{},addAftershocksAfterConsumptionFlavor(){},
 breathingRecoveryMotion:()=>{const p=pause();motions.push(p);return p.promise;},pulseEnergyPanel:async()=>{}});
 return {h,motions,entry:{status,definition,trigger,owner:h.player},starts:()=>starts};
}
test('AftershockBreath spans all 1–3 consumption/motion cycles, including the last stack being removed',async()=>{
 for(const cycles of [1,2,3]) {
  const f=setup(cycles*2-1),task=f.h.applyStatusTriggerEffects(f.entry);
  assert.equal(f.starts(),1);assert.equal(f.h.current,'Succubus_tutorial_AftershockBreath_1');
  for(let i=0;i<cycles;i++) {
   await tick();assert.equal(f.motions.length,i+1);assert.equal(f.h.current,'Succubus_tutorial_AftershockBreath_1');
   f.h.refreshPlayerPortrait();assert.equal(f.h.current,'Succubus_tutorial_AftershockBreath_1');f.motions[i].resolve();
  }
  await task;assert.equal(f.h.current,'Succubus_tutorial_idle_1');assert.equal(f.starts(),1);
 }
});
test('no consumption means no event, and failed animation always releases its event',async()=>{
 for(const [stacks,energy] of [[0,3],[6,0]]){const f=setup(stacks,energy);await f.h.applyStatusTriggerEffects(f.entry);assert.equal(f.starts(),0);}
 const f=setup(1);f.h.breathingRecoveryMotion=async()=>{throw Error('interrupted');};
 await assert.rejects(f.h.applyStatusTriggerEffects(f.entry),/interrupted/);assert.equal(f.h.current,'Succubus_tutorial_idle_1');
});

test('presence and attached/separate stack thresholds remain until every consumption motion completes',async()=>{
 for(const tag of ['Aftershocks','Aftershocksgte5','Aftershocks_gte5']) {
  const f=setup(5,3,[`${tag}_1`,`${tag}_2`]),before=f.h.current;
  const task=f.h.applyStatusTriggerEffects(f.entry);
  for(let i=0;i<3;i++) {
   await tick();assert.equal(f.h.current,before);
   assert.equal(f.h.player.statuses.get('Aftershocks'),Math.max(0,5-(i+1)*2));
   const preload=f.h.portraitSelection.preloadIds(f.h.playerPortraitContext());
   assert.ok(preload.includes(before));assert.ok(!preload.includes(id('idle_1')));
   f.motions[i].resolve();
  }
  await task;assert.equal(f.h.current,id('idle_1'));
 }
});

test('after consumption, remaining stacks select the lower threshold; failed motion also releases the snapshot',async()=>{
 const images=['Aftershocksgte5_1','Aftershocksgte1_1'];
 const f=setup(5,1,images),task=f.h.applyStatusTriggerEffects(f.entry);
 await tick();assert.equal(f.h.current,id(images[0]));f.motions[0].resolve();
 await task;assert.equal(f.h.current,id(images[1]));
 const failed=setup(5,1,images);failed.h.breathingRecoveryMotion=async()=>{throw Error('interrupted');};
 await assert.rejects(failed.h.applyStatusTriggerEffects(failed.entry),/interrupted/);
 assert.equal(failed.h.current,id(images[1]));
});

test('status retention preserves event and higher-priority selection, and clear removes retained state',()=>{
 const f=setup(5,3,['Aftershocksgte5_1','Aftershocksgte5_AftershockBreath_1','Death_1']);
 const s=f.h.portraitSelection,c=f.h.playerPortraitContext();
 const release=s.retainStatus('Aftershocks',f.h.current,c),event=s.begin('AftershockBreath');
 f.h.player.statuses.clear();
 assert.equal(s.select(f.h.playerPortraitContext()),id('Aftershocksgte5_AftershockBreath_1'));
 assert.equal(s.select({...f.h.playerPortraitContext(),hpRatio:0}),id('Death_1'));
 event();assert.equal(s.select(f.h.playerPortraitContext()),id('Aftershocksgte5_1'));
 s.clear();assert.equal(s.select(f.h.playerPortraitContext()),id('idle_1'));release();
});

test('portraits without an Aftershocks condition do not retain it',()=>{
 const f=setup(5),s=f.h.portraitSelection;
 const release=s.retainStatus('Aftershocks',f.h.current,f.h.playerPortraitContext());
 assert.equal(s.retainedStatuses.size,0);release();
});
