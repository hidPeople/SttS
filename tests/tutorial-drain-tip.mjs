import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {EventEmitter} from 'node:events';
import {createServer} from 'vite';
const server=await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
const {TutorialTipRuntime}=await server.ssrLoadModule('/src/models/tutorialTips.ts');
const {TUTORIAL_TIPS}=await server.ssrLoadModule('/src/data/tutorialTips.ts');
await server.close();
const definition=TUTORIAL_TIPS.find(t=>t.id==='firstEnemyPeakDrain');
const snapshot={battleId:'tutorial',turn:2,ready:true,cards:[],enemies:[]};

test('drain event is never polled and is shown once per tutorial with the triggering enemy',()=>{
 const r=new TutorialTipRuntime([definition]);
 assert.equal(r.next(snapshot,0),undefined);assert.equal(r.next(snapshot,999999),undefined);
 assert.equal(r.eventMatch('enemyPeakDrain',{...snapshot,battleId:'normal'},1),undefined);
 const match=r.eventMatch('enemyPeakDrain',snapshot,2);
 assert.equal(match.enemyIndex,2);assert.equal(match.page.position.anchor,'enemy');
 r.markShown(match.definition.id);assert.equal(r.eventMatch('enemyPeakDrain',snapshot,1),undefined);
});
const source=ts.createSourceFile('BattleScene.ts',fs.readFileSync('src/scenes/BattleScene.ts','utf8'),ts.ScriptTarget.Latest,true);
const scene=source.statements.find(n=>ts.isClassDeclaration(n)&&n.name.text==='BattleScene');
const methods=['runEnemyEpPeakHooks','hpDrainEffect'].map(name=>scene.members.find(n=>n.name?.getText(source)===name).getText(source)).join('\n');
const code=ts.transpileModule(`class Harness {${methods}}`,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
const Harness=new Function('EFFECT_TIMINGS','localize','Phaser','GAME_FONT',`${code};return Harness;`)({EnemyEpPeak:'peak'},x=>x,{Math:{Between:()=>0}},'font');
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};

test('drain animation waits for the last staggered particle and releases on scene shutdown',async()=>{
 const h=new Harness(),tweens=[];h.events=new EventEmitter();
 h.add={text:()=>({setOrigin(){},setDepth(){},destroy(){}})};h.tweens={add:c=>tweens.push(c)};
 let done=false;const motion=h.hpDrainEffect(0,0,1,1).then(()=>done=true);
 assert.equal(tweens.length,7);assert.deepEqual(tweens.map(t=>t.delay),[0,70,140,210,280,350,420]);
 for(const t of tweens.slice(0,6))t.onComplete();await Promise.resolve();assert.equal(done,false);
 tweens[6].onComplete();await motion;assert.equal(done,true);assert.equal(h.events.listenerCount('shutdown'),0);
 const aborted=h.hpDrainEffect(0,0,1,1);h.events.emit('shutdown');await aborted;
});

test('Peak hook waits for drain completion and Tip dismissal, including a defeated target',async()=>{
 const h=new Harness(),enemy={isDefeated:true},animation=deferred(),dismissal=deferred();
 h.player={};h.enemyViews=[{enemy:{other:true}},{enemy}];h.sys={isActive:()=>true};
 h.battleEventContext=c=>c;h.beginHpDrainLogBatch=()=>{};h.flushHpDrainLogBatch=()=>{};
 h.relicTriggersForTiming=()=>[{relic:{name:'blood'}}];
 h.applyRelicTriggerEffects=async()=>{h.enemyPeakDrains?.push({enemy,animation:animation.promise});return [];};
 let shown=0;h.tutorialTips={hasEvent:()=>true,showEvent:(event,index)=>{shown++;assert.equal(event,'enemyPeakDrain');assert.equal(index,1);return dismissal.promise;}};
 let done=false;const action=h.runEnemyEpPeakHooks({triggerEnemy:enemy}).then(()=>done=true);
 await new Promise(r=>setImmediate(r));assert.equal(shown,0);assert.equal(done,false);
 animation.resolve();await new Promise(r=>setImmediate(r));assert.equal(shown,1);assert.equal(done,false);
 dismissal.resolve();await action;assert.equal(done,true);assert.equal(h.enemyPeakDrains,undefined);
 h.applyRelicTriggerEffects=async()=>[];await h.runEnemyEpPeakHooks({triggerEnemy:enemy});assert.equal(shown,1);
 h.tutorialTips.hasEvent=()=>false;await h.runEnemyEpPeakHooks({triggerEnemy:enemy});assert.equal(shown,1);
});
