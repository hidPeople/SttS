import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import EventEmitter from 'eventemitter3';
import ts from 'typescript';
import { createServer } from 'vite';
const server=await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
const {TutorialTipRuntime}=await server.ssrLoadModule('/src/models/tutorialTips.ts');
const {TUTORIAL_TIPS}=await server.ssrLoadModule('/src/data/tutorialTips.ts');
const {TUTORIAL_TIP_PRESENTATION}=await server.ssrLoadModule('/src/data/ui.ts');
const {TOOLTIP_LAYOUT}=await server.ssrLoadModule('/src/ui/textLayout.ts');
const {onPrimaryClick}=await server.ssrLoadModule('/src/ui/pointerActions.ts');
await server.close();
const source=ts.createSourceFile('tutorialTips.ts',fs.readFileSync('src/ui/tutorialTips.ts','utf8'),ts.ScriptTarget.Latest,true);
const cls=source.statements.find(n=>ts.isClassDeclaration(n)).getText(source).replace('export class','class');
const code=ts.transpileModule(cls,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;

class Node extends EventEmitter {
 active=true; depth=0; children=[]; depthChanges=[];
 constructor(x=0,y=0,style={fontSize:'15px'}){super();Object.assign(this,{x,y,style});}
 setDepth(depth){this.depth=depth;this.depthChanges.push(depth);return this;}
 setInteractive(){return this;}
 setAlpha(alpha){this.alpha=alpha;return this;}
 setFillStyle(){return this;}
 fit(){return this;}
 setPosition(x,y){Object.assign(this,{x,y});return this;}
 add(nodes){for(const node of Array.isArray(nodes)?nodes:[nodes]){this.children.push(node);node.parent=this;}return this;}
 destroy(recursive){if(recursive)for(const node of [...this.children])node.destroy(true);this.active=false;if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);this.emit('destroy');}
}
function setup(definition, finishOpening=true){
 let registration,registered=0,before=0,paused=0,resumed=0;
 const navigation={register:(node,options)=>{registered++;registration=options;return node;},select:()=>{}};
 const Controller=new Function('TutorialTipRuntime','GAME_FONT','KeyboardNavigation','createTooltipPaint','sizeTooltipText','TUTORIAL_TIP_PRESENTATION','TOOLTIP_LAYOUT','onPrimaryClick',`${code};return TutorialTips;`)(TutorialTipRuntime,'font',{for:()=>navigation},()=>new Node(),()=>({width:120,height:60}),TUTORIAL_TIP_PRESENTATION,TOOLTIP_LAYOUT,onPrimaryClick);
 const scene={events:new EventEmitter(),time:{now:0},scale:{width:1280,height:720},add:{rectangle:(x,y)=>new Node(x,y),text:(x,y,text,style)=>new Node(x,y,style),container:(x,y,children=[])=>new Node(x,y).add(children)}};
 const tweens=[];
 scene.game={loop:{now:0}};
 scene.tweens={add:config=>{const tween={...config,removed:false,remove(){this.removed=true;}};tweens.push(tween);return tween;}};
 const card=new Node(),other=new Node();card.depth=35;other.depth=40;
 const sprite={active:true,anims:{isPlaying:true,isPaused:false,pause:()=>{paused++;},resume:()=>{resumed++;}}};
 const texts=[];
 const host={snapshot:()=>({battleId:'tutorial',turn:5,ready:true,cards:['faint'],enemies:[]}),text:page=>{texts.push(page.text.ja);return page.text.ja;},anchor:()=>({x:500,y:500,centered:false}),highlights:match=>match.page.highlightCardId==='faint'?[card]:match.page.highlightCardId==='other'?[other]:[],sprites:()=>[sprite],beforeShow:()=>{before++;}};
 const c=new Controller(scene,[definition],host);c.check();
 if(finishOpening){scene.game.loop.now=TUTORIAL_TIP_PRESENTATION.inputLockDuration;for(const target of tweens[0]?.targets??[])target.setAlpha(1);}
 return {c,scene,card,other,texts,tweens,confirm:()=>registration.activate(),counts:()=>({registered,before,paused,resumed})};
}
const faint=TUTORIAL_TIPS.find(t=>t.id==='firstFaint');
test('three pages retain shade, shield, same highlight and paused sprites until final dismissal',()=>{
 const h=setup(faint),root=h.c.root,shade=h.c.shade,shield=root.children[0],panel=h.c.panel;
 let stopped=0;
 shield.emit('pointerup',{x:0,y:0,button:0},0,0,{stopPropagation:()=>stopped++});
 assert.equal(stopped,1);assert.equal(h.c.pageIndex,1);assert.equal(h.c.root,root);assert.equal(h.c.shade,shade);assert.equal(root.children[0],shield);
 assert.equal(panel.active,false);assert.deepEqual(h.card.depthChanges,[10001]);
 assert.deepEqual(h.counts(),{registered:1,before:1,paused:1,resumed:0});
 h.confirm();assert.equal(h.c.pageIndex,2);assert.deepEqual(h.texts,faint.pages.map(p=>p.text.ja));
 assert.deepEqual(h.card.depthChanges,[10001]);
 h.confirm();assert.equal(h.c.active,false);assert.equal(root.active,false);assert.equal(shade.active,false);
 assert.deepEqual(h.card.depthChanges,[10001,35]);assert.equal(h.counts().resumed,1);
 h.scene.time.now=1000;h.c.check();assert.equal(h.c.active,false);
});
test('page-specific highlights restore only removed targets and shutdown restores the remaining target',()=>{
 const pages=faint.pages.map((p,i)=>({...p,highlightCardId:i===0?'faint':i===1?'other':undefined}));
 const h=setup({...faint,pages});h.confirm();
 assert.deepEqual(h.card.depthChanges,[10001,35]);assert.deepEqual(h.other.depthChanges,[10001]);
 h.scene.events.emit('shutdown');assert.deepEqual(h.other.depthChanges,[10001,40]);assert.equal(h.counts().resumed,1);
 assert.equal(h.c.active,false);
 const complete=setup({...faint,pages});complete.confirm();complete.confirm();
 assert.deepEqual(complete.other.depthChanges,[10001,40]);assert.equal(complete.c.active,true);
 complete.confirm();assert.equal(complete.c.active,false);
});

test('opening locks click, confirm and dismissal for 500 ms of real time, then permits page changes',()=>{
 const h=setup(faint,false),root=h.c.root,shade=h.c.shade,panel=h.c.panel,shield=root.children[0];
 const click=()=>shield.emit('pointerup',{x:0,y:0,button:0},0,0,{stopPropagation(){}});
 assert.equal(h.tweens[0].duration,500);assert.deepEqual(h.tweens[0].targets,[shade,panel]);
 assert.equal(shade.alpha,0);assert.equal(panel.alpha,0);
 for(const t of [0,100,250,499]) {
  h.scene.game.loop.now=t;h.scene.time.now=t*100;
  click();h.confirm();h.c.dismiss();
  assert.equal(h.c.pageIndex,0);assert.equal(h.c.root,root);assert.equal(h.texts.length,1);
 }
 h.scene.game.loop.now=500;click();assert.equal(h.c.pageIndex,1);
 h.confirm();assert.equal(h.c.pageIndex,2);assert.equal(h.tweens.length,1);
 h.confirm();assert.equal(h.c.active,false);assert.equal(h.tweens[0].removed,true);
});

test('single-page tips also reject early dismissal and shutdown cleans up during the opening lock',()=>{
 const definition={...faint,pages:[faint.pages[0]]};
 const h=setup(definition,false);
 h.c.dismiss();assert.equal(h.c.active,true);
 h.scene.game.loop.now=499;h.confirm();assert.equal(h.c.active,true);
 h.scene.game.loop.now=500;h.confirm();assert.equal(h.c.active,false);
 const interrupted=setup(definition,false),root=interrupted.c.root;
 interrupted.scene.events.emit('shutdown');
 assert.equal(interrupted.c.active,false);assert.equal(root.active,false);
 assert.equal(interrupted.tweens[0].removed,true);assert.equal(interrupted.counts().resumed,1);
 assert.deepEqual(interrupted.card.depthChanges,[10001,35]);
});

test('event Tips interrupt resolution after menus close and release the caller on dismissal or shutdown',async()=>{
 const definition=TUTORIAL_TIPS.find(t=>t.id==='firstEnemyPeakDrain');
 const h=setup(definition);assert.equal(h.c.active,false);
 let eventReady=false;
 h.c.host.snapshot=()=>({battleId:'tutorial',turn:2,ready:false,eventReady,cards:[],enemies:[]});
 let done=false;const waiting=h.c.showEvent('enemyPeakDrain',2).then(()=>done=true);
 assert.equal(h.c.active,false);eventReady=true;h.c.check();assert.equal(h.c.active,true);assert.equal(h.c.match.enemyIndex,2);
 await Promise.resolve();assert.equal(done,false);h.c.dismiss(true);await waiting;assert.equal(done,true);
 assert.equal(h.c.hasEvent('enemyPeakDrain'),false);
 const pending=setup(definition);pending.c.host.snapshot=()=>({battleId:'tutorial',turn:2,ready:false,eventReady:false,cards:[],enemies:[]});
 const cancelled=pending.c.showEvent('enemyPeakDrain',0);pending.scene.events.emit('shutdown');await cancelled;
});
