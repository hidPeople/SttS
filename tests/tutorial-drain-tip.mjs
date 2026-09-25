import test from 'node:test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const moveBelow = require('phaser/src/utils/array/MoveBelow.js');
const moveAbove = require('phaser/src/utils/array/MoveAbove.js');
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
const methods=['runEnemyEpPeakHooks','hpDrainEffect','tutorialBarHighlights'].map(name=>scene.members.find(n=>n.name?.getText(source)===name).getText(source)).join('\n');
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


test('drain Tip highlights player HP and only the triggering enemy HP/EP, including bar layers',()=>{
 const page=definition.pages[0];
 assert.deepEqual(page.highlightPlayerBars,['hp']);
 assert.deepEqual(page.highlightEnemyBars,['hp','ep']);
 const h=new Harness();
 const keys=['hpBg','hpFill','hpText','blockFill','blockShield','blockText','epBg','epFill','epReserveFill','epReserveStripes','epText','epMaxText'];
 const bars={hasEp:true,...Object.fromEntries(keys.map(k=>[k,{key:k}]))};
 assert.deepEqual(new Set(h.tutorialBarHighlights(bars,page.highlightPlayerBars).map(o=>o.key)),new Set(keys.slice(0,6)));
 assert.deepEqual(new Set(h.tutorialBarHighlights(bars,page.highlightEnemyBars).map(o=>o.key)),new Set(keys));
 assert.deepEqual(h.tutorialBarHighlights({...bars,hasEp:false},['ep']),[]);
 assert.deepEqual(h.tutorialBarHighlights(undefined,['hp']),[]);
 assert.deepEqual(h.tutorialBarHighlights(bars),[]);
});

test('highlight layers retain ordering and restore their original depths on page change',()=>{
 const ui=ts.createSourceFile('tutorialTips.ts',fs.readFileSync('src/ui/tutorialTips.ts','utf8'),ts.ScriptTarget.Latest,true);
 const cls=ui.statements.find(n=>ts.isClassDeclaration(n));
 const method=['syncHighlights','restoreHighlight','dismiss'].map(name=>cls.members.find(n=>n.name?.getText(ui)===name).getText(ui)).join('\n');
 const js=ts.transpileModule('class Layers {'+method+'}',{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
 const Layers=new Function(js+';return Layers;')();
 const h=new Layers();h.highlighted=new Map();
 const obj=depth=>({depth,active:true,setDepth(n){this.depth=n;}});
 const shadow=obj(0),name=obj(0),bg=obj(0),fill=obj(0),overlay=obj(2),text=obj(4);
 const original=[shadow,name,bg,fill,overlay,text];let display=[...original];
 const move=(object,peer,after)=>(after ? moveAbove : moveBelow)(display,object,peer);
 h.scene={children:{depthSort:()=>display.sort((a,b)=>a.depth-b.depth),getChildren:()=>display,exists:o=>display.includes(o),moveBelow:(o,p)=>move(o,p,false),moveAbove:(o,p)=>move(o,p,true)},time:{now:0}};
 let selected=[text,bg,fill,overlay,shadow];h.host={highlights:()=>selected};
 h.syncHighlights({});
 assert.ok(10000<bg.depth && bg.depth<fill.depth && fill.depth<overlay.depth && overlay.depth<text.depth && text.depth<10002);
 h.scene.children.depthSort();
 assert.ok(display.indexOf(shadow)>display.indexOf(name));
 selected=[text,bg,fill,overlay,shadow];h.syncHighlights({});
 assert.ok(overlay.depth<text.depth);
 selected=[];h.syncHighlights({});
 assert.deepEqual([bg.depth,fill.depth,overlay.depth,text.depth],[0,0,2,4]);
 h.scene.children.depthSort();assert.deepEqual(display,original);
 // Closing the Tip follows the same restoration path, including shared highlights.
 selected=[shadow,bg,fill,text];h.syncHighlights({});h.scene.children.depthSort();
 h.restore=[];h.dismiss(true);h.scene.children.depthSort();
 assert.deepEqual(display,original);assert.equal(h.originalDisplayOrder,undefined);
});
