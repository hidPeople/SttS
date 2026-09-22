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
const {FLAVOR_EVENTS}=await server.ssrLoadModule('/src/models/types.ts');
await server.close();
const source=ts.createSourceFile('BattleScene.ts',fs.readFileSync('src/scenes/BattleScene.ts','utf8'),ts.ScriptTarget.Latest,true);
const cls=source.statements.find(n=>ts.isClassDeclaration(n)&&n.name.text==='BattleScene');
const methods=['beginPlayerPortraitFactor','applyStatusTriggerEffects','executeStatusTriggerEffects','runStatusTriggerVisuals'].map(name=>cls.members.find(n=>n.name?.getText(source)===name).getText(source)).join('\n');
const code=ts.transpileModule(`class Harness {${methods}}`,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
const Harness=new Function('Enemy','statusStacksPerEnergy','FLAVOR_EVENTS',code+';return Harness;')(class Enemy {},statusStacksPerEnergy,FLAVOR_EVENTS);
const pause=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {resolve,promise};};
const tick=()=>new Promise(r=>setImmediate(r));
function setup(stacks,energy=3){
 const h=new Harness(),status='Aftershocks',definition=STATUS_DESCRIPTIONS[status],trigger=definition.triggers.find(t=>t.consumeRule==='allWhileEnergy');
 h.player={energy,statuses:new Map([[status,stacks]]),hasStatus(id){return (this.statuses.get(id)??0)>0;}};
 const context=()=>({playerId:'Succubus',category:'tutorial',statuses:new Set([...h.player.statuses].filter(([,n])=>n>0).map(([id])=>id)),statusStacks:h.player.statuses,relics:new Set(),hpRatio:1,epRatio:0});
 h.portraitSelection=new PortraitSelection(['Succubus_tutorial_idle_1','Succubus_tutorial_AftershockBreath_1'],PORTRAIT_FACTORS);
 h.refreshPlayerPortrait=()=>{h.current=h.portraitSelection.select(context());};h.refreshPlayerPortrait();
 const motions=[];let starts=0;
 const begin=h.beginPlayerPortraitFactor.bind(h);h.beginPlayerPortraitFactor=tag=>{starts++;return begin(tag);};
 Object.assign(h,{battleEventContext:c=>c,statusDisplayName:s=>s,bindingEnemyForContext:()=>undefined,
 consumeStatusWithNotice:async(owner,id,n)=>{assert.equal(h.current,'Succubus_tutorial_AftershockBreath_1');owner.statuses.set(id,owner.statuses.get(id)-n);h.refreshPlayerPortrait();},
 pulseStatusIcon:async()=>{},statusTriggerEffectsForRun:t=>t.effects,
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
