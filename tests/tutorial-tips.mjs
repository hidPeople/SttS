import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
const server=await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
const {TutorialTipRuntime}=await server.ssrLoadModule('/src/models/tutorialTips.ts');
const {TUTORIAL_TIPS}=await server.ssrLoadModule('/src/data/tutorialTips.ts');
await server.close();
const state=(extra={})=>({eventBattleId:'tutorial',turn:1,ready:true,cards:[],enemies:[],...extra});

test('first-turn timeout uses 30 seconds of available time and does not carry into the next turn',()=>{
 const r=new TutorialTipRuntime(TUTORIAL_TIPS);
 assert.equal(r.next(state({ready:false}),0),undefined);
 assert.equal(r.next(state(),10000),undefined);
 assert.equal(r.next(state(),39999),undefined);
 const match=r.next(state(),40000);assert.equal(match.definition.id,'endFirstTurn');
 r.markShown(match.definition.id);assert.equal(r.next(state(),70000),undefined);
 const nextTurn=new TutorialTipRuntime(TUTORIAL_TIPS);
 nextTurn.next(state(),0);nextTurn.next(state(),29999);
 assert.equal(nextTurn.next(state({turn:2}),90000),undefined);
});

test('menus, resolution and visible Tips do not contribute to the timeout',()=>{
 const r=new TutorialTipRuntime(TUTORIAL_TIPS);
 r.next(state(),0);r.next(state(),15000);
 r.next(state({ready:false}),15001);r.next(state({ready:false}),60000);
 assert.equal(r.next(state(),61000),undefined);
 assert.equal(r.next(state(),75999),undefined);
 assert.equal(r.next(state(),76000).definition.id,'endFirstTurn');
});

test('third-turn card tip waits until dialogue/draw/hooks finish and the card is present',()=>{
 const r=new TutorialTipRuntime(TUTORIAL_TIPS);
 assert.equal(r.next(state({turn:3,ready:false,cards:['seduction']}),0),undefined);
 assert.equal(r.next(state({turn:3}),100),undefined);
 assert.equal(r.next(state({turn:2,cards:['seduction']}),200),undefined);
 const match=r.next(state({turn:3,cards:['seduction']}),300);
 assert.equal(match.definition.id,'useSeduction');r.markShown(match.definition.id);
 assert.equal(r.next(state({turn:3,cards:['seduction']}),400),undefined);
});

test('enemy tips select the matching enemy and resolve simultaneous conditions once in data order',()=>{
 const r=new TutorialTipRuntime(TUTORIAL_TIPS);
 const s=state({turn:4,cards:['pullout','seduction'],enemies:[{index:0,states:[]},{index:2,states:['inserted','peakAftershocks']}]});
 assert.equal(r.next({...s,ready:false},0),undefined);
 const inserted=r.next(s,100);assert.equal(inserted.definition.id,'pullout');assert.equal(inserted.enemyIndex,2);
 r.markShown(inserted.definition.id);
 assert.equal(r.next({...s,ready:false},200),undefined);
 const peak=r.next(s,300);assert.equal(peak.definition.id,'enemyAftershocks');assert.equal(peak.enemyIndex,2);
 r.markShown(peak.definition.id);assert.equal(r.next(s,400),undefined);
});

test('missing pullout card does not consume its tip, and a stale enemy condition is rechecked',()=>{
 const r=new TutorialTipRuntime(TUTORIAL_TIPS);
 assert.equal(r.next(state({turn:4,enemies:[{index:1,states:['inserted']}]}),0),undefined);
 assert.equal(r.next(state({turn:4,cards:['pullout']}),100),undefined);
 assert.equal(r.next(state({turn:4,cards:['pullout'],enemies:[{index:1,states:['inserted']}]}),200).definition.id,'pullout');
});

test('normal battles do not show tips and a restarted tutorial gets fresh one-shot state',()=>{
 const s=state({turn:3,cards:['seduction']});
 const r=new TutorialTipRuntime(TUTORIAL_TIPS);
 assert.equal(r.next({...s,eventBattleId:undefined},0),undefined);
 assert.equal(r.next({...s,eventBattleId:'other'},30000),undefined);
 const match=r.next(s,40000);r.markShown(match.definition.id);
 assert.equal(r.next(s,50000),undefined);
 assert.equal(new TutorialTipRuntime(TUTORIAL_TIPS).next(s,0).definition.id,'useSeduction');
});

test('tip coordinator uses the accelerated scene clock for the 30-second timeout',async()=>{
 const fs=await import('node:fs'),{default:ts}=await import('typescript');
 const source=ts.createSourceFile('tutorialTips.ts',fs.readFileSync(new URL('../src/ui/tutorialTips.ts',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true);
 const cls=source.statements.find(n=>ts.isClassDeclaration(n));
 const method=cls.members.find(n=>n.name?.getText(source)==='check').getText(source);
 const code=ts.transpileModule(`class Coordinator { ${method} }`,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
 const Coordinator=new Function(`${code};return Coordinator;`)();
 const controller=new Coordinator(),shown=[];
 Object.assign(controller,{scene:{time:{now:0}},runtime:new TutorialTipRuntime(TUTORIAL_TIPS),host:{snapshot:()=>state(),anchor:()=>({x:0,y:0})},show:match=>shown.push(match.definition.id)});
 controller.check();
 controller.scene.time.now=14999*2;controller.check();assert.deepEqual(shown,[]);
 controller.scene.time.now=15000*2;controller.check();assert.deepEqual(shown,['endFirstTurn']);
});
