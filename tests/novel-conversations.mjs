import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import EventEmitter from 'eventemitter3';
import { createServer } from 'vite';
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const { CONVERSATIONS, CONVERSATION_WINDOW, NOVEL_PRESENTATION, NOVEL_CONTROLS } = await server.ssrLoadModule('/src/data/conversations.ts');
const { EVENT_BATTLES } = await server.ssrLoadModule('/src/data/eventBattles.ts');
const { evaluateConditions } = await server.ssrLoadModule('/src/models/conditions.ts');
const { RUN_STATE, startEventBattle, resetRunState } = await server.ssrLoadModule('/src/models/RunState.ts');
const {pointerActionHandled}=await server.ssrLoadModule('/src/ui/pointerActions.ts');
await server.close();
function classCode(file, name, members) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const cls = source.statements.find(n => ts.isClassDeclaration(n) && n.name.text === name);
  const text = members ? `class ${name} { ${cls.members.filter(n => members.includes(n.name?.getText(source))).map(n => n.getText(source)).join('\n')} }` : cls.getText(source).replace('export class', 'class');
  return ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
}
class Node extends EventEmitter {
  active = true; visible = true; children = []; height = 26; style = { fontSize: '26px' };
  setDepth() { return this; } setInteractive() { return this; } setScale() { return this; }
  setStrokeStyle() { return this; } setOrigin() { return this; } setColor() { return this; }
  setDisplaySize() { return this; } setFontSize() { return this; }
  setVisible(value) { this.visible = value; return this; }
  setAlpha(value) { this.alpha = value; return this; }
  setText(value) { this.text = value; return this; }
  add(nodes) { this.children.push(...(Array.isArray(nodes) ? nodes : [nodes])); return this; }
  addAt(node, i) { this.children.splice(i, 0, node); return this; }
  get length() { return this.children.length; }
  destroy(recursive) { this.active = false; if (recursive) this.children.forEach(n => n.destroy(true)); }
}
function setup(presentation = NOVEL_PRESENTATION) {
  const deps = { SCREEN_WIDTH:1280, SCREEN_HEIGHT:720, SCREEN_CENTER_X:640, SCREEN_CENTER_Y:360,
    GAME_FONT:'font', CONVERSATIONS, CONVERSATION_WINDOW, CrayonPatch:Node, CRAYON_COLORS:{},
    KeyboardNavigation:{for:()=>({register(){}})}, setPunctuationAwareWordWrap(){},
    localize:t=>t.ja, PLAYER_DEFINITION:{name:{ja:'Player'}}, battleLogColor:()=>'', l:(en,ja)=>({en,ja}),
    backgroundKey:f=>f, CHARACTER_IMAGE_EXTENSION:'.png', characterPortraitAssets:{},
    ConversationControls: class { constructor(_scene,host){this.host=host;} destroy(){this.destroyed=true;} },
    ConversationLog: class { constructor(_scene,entries){this.entries=entries;this.root=new Node();} scroll(delta){this.delta=delta;} destroy(){this.root.destroy(true);} } };
  const Controller = new Function(...Object.keys(deps), classCode('src/ui/conversation.ts','ConversationWindow')+';return ConversationWindow;')(...Object.values(deps));
  const tweens = [], scene = {events:new EventEmitter(),textures:{exists:()=>true},add:{container:()=>new Node(),rectangle:()=>new Node(),text:()=>new Node(),image:()=>new Node()},tweens:{add:config=>{const tween={...config,stop(){this.stopped=true;}};tweens.push(tween);return tween;}}};
  const c = new Controller(scene,'tutorialDefeat1',()=>false,undefined,presentation);
  return {c,scene,tweens,complete:()=>tweens.at(-1).onComplete()};
}
test('novel fades before opening, blocks early/repeated clicks and resolves only after the final fade', async()=>{
  const h=setup();
  assert.equal(h.c.window.visible,false); assert.equal(h.tweens[0].duration,1000);
  h.c.next(); assert.equal(h.c.index,0);
  h.complete(); assert.equal(h.c.window.visible,true); assert.equal(h.tweens[1].duration,CONVERSATION_WINDOW.openDuration);
  h.c.next(); assert.equal(h.c.index,0);
  h.complete(); h.c.next(); h.c.next(); h.c.next(); assert.equal(h.c.index,3);
  assert.equal(h.tweens.length,2);
  h.c.next(); assert.equal(h.tweens.at(-1).duration,2000); assert.equal(h.c.root.active,true);
  h.c.next(); assert.equal(h.tweens.length,3);
  const shade=h.c.shade; h.complete(); assert.equal(await h.c.finished,true); assert.equal(shade.active,false);
});
test('shutdown cancels during either fade and ordinary conversations keep existing open/close behavior',async()=>{
  for(const closing of [false,true]) {
    const h=setup(); if(closing){h.complete();h.complete();for(let i=0;i<4;i++)h.c.next();}
    const shade=h.c.shade;h.scene.events.emit('shutdown');assert.equal(await h.c.finished,false);assert.equal(shade.active,false);assert.equal(h.tweens.at(-1).stopped,true);
  }
  const h=setup(null);assert.equal(h.tweens[0].duration,CONVERSATION_WINDOW.openDuration);
  h.complete();for(let i=0;i<4;i++)h.c.next();assert.equal(h.tweens.at(-1).duration,CONVERSATION_WINDOW.closeDuration);
  h.complete();assert.equal(await h.c.finished,true);
});
test('tutorial pages use specified backgrounds and defeat routing reads current Starvation state',()=>{
  const pre=CONVERSATIONS[EVENT_BATTLES.tutorial.introConversationId];assert.ok(pre.length > 7);
  assert.deepEqual(pre.map(p=>p.background),[...Array(7).fill('event/tutorial_pre1.png'),...Array(pre.length-7).fill('event/tutorial_pre2.png')]);
  for(const [id,bg] of [['tutorialDefeat1','tutorial_badend1'],['tutorialDefeat2','tutorial_badend2']]) {
    const pages=CONVERSATIONS[id];assert.equal(pages.length,4);assert.ok(pages.every(p=>p.background===`event/${bg}.png`&&!p.portrait&&p.text.en&&p.text.ja));
  }
  assert.ok(pre.every(p=>!p.portrait&&p.text.en&&p.text.ja));
  const Battle = new Function('RUN_STATE','EVENT_BATTLES','evaluateConditions',classCode('src/scenes/BattleScene.ts','BattleScene',['defeatPlayer'])+';return BattleScene;')({eventBattleId:'tutorial'},EVENT_BATTLES,evaluateConditions);
  for(const stacks of [1,0]) {
    let destination;const player={statuses:new Map([['Starvation',stacks]])};const b=new Battle();
    Object.assign(b,{player,playerArea:{y:0},refreshPlayerPortrait(){},setEndTurnEnabled(){},showResult(){},tweens:{add:c=>c.onComplete()},time:{delayedCall:(_ms,fn)=>fn()},scene:{start:(...args)=>destination=args},battleEventContext:()=>({player,actor:player,enemies:[]})});
    b.defeatPlayer();assert.deepEqual(destination,['DefeatEventScene',{eventBattleId:'tutorial',conversationId:stacks?'tutorialDefeat1':'tutorialDefeat2'}]);
  }
});

test('novel completion starts a fresh tutorial without replaying the introduction',()=>{
  const Scene = new Function('startEventBattle',classCode('src/scenes/DefeatEventScene.ts','DefeatEventScene',['startBattle'])+';return DefeatEventScene;')(startEventBattle);
  startEventBattle('tutorial'); RUN_STATE.playerHp=0;RUN_STATE.deckIds=[];RUN_STATE.playerStatuses=[];RUN_STATE.battleIndex=9;
  let target;const scene=new Scene();Object.assign(scene,{eventBattleId:'tutorial',scene:{start:id=>target=id}});
  scene.startBattle();assert.equal(target,'BattleScene');assert.equal(RUN_STATE.eventBattleId,'tutorial');
  assert.equal(RUN_STATE.playerHp,EVENT_BATTLES.tutorial.initialHp);assert.equal(RUN_STATE.playerEp,EVENT_BATTLES.tutorial.initialEp);
  assert.deepEqual(RUN_STATE.deckIds,EVENT_BATTLES.tutorial.deckIds);assert.deepEqual(RUN_STATE.playerStatuses,EVENT_BATTLES.tutorial.statuses);assert.equal(RUN_STATE.battleIndex,0);
  resetRunState();
});

test('background dim changes over 500 ms and refresh does not restart the transition',()=>{
 const h=setup(null);h.complete();h.c.pages=CONVERSATIONS.tutorialBeforeBattle;h.c.index=0;h.c.refresh();
 assert.equal(h.c.dimTarget,0.6);assert.equal(h.tweens.at(-1).duration,500);
 const n=h.tweens.length;h.c.next();assert.equal(h.tweens.length,n);
 h.c.next();assert.equal(h.c.dimTarget,0);assert.equal(h.tweens.at(-1).duration,500);
 const last=h.tweens.at(-1);h.c.refresh();assert.equal(h.tweens.at(-1),last);
});
test('hidden window restores without advancing, log contains only reached pages, and hide closes log alone',()=>{
 const h=setup(null);h.complete();h.c.action('hide');assert.equal(h.c.window.visible,false);
 h.c.controls.host.skip();assert.equal(h.c.index,0);
 h.c.action('advance');assert.equal(h.c.window.visible,true);assert.equal(h.c.index,0);
 h.c.action('advance');assert.equal(h.c.index,1);
 h.c.action('hide');h.c.action('log');assert.equal(h.c.window.visible,true);assert.equal(h.c.hidden,false);
 assert.equal(h.c.log.entries.length,2);assert.equal(h.c.logActive,true);
 h.c.action('advance');h.c.controls.host.skip();assert.equal(h.c.index,1);
 const log=h.c.log;h.c.action('hide');assert.equal(log.root.active,false);assert.equal(h.c.logActive,false);assert.equal(h.c.window.visible,true);
 h.c.action('hide');h.c.action('hide');assert.equal(h.c.window.visible,true);assert.equal(h.c.index,1);
 h.scene.events.emit('shutdown');assert.equal(h.c.controls.destroyed,true);
});

test('novel bindings isolate keys, pointer actions, scrolling and held skip, and dispose listeners',()=>{
 class Events { handlers=new Map();addEventListener(k,f){const a=this.handlers.get(k)??[];a.push(f);this.handlers.set(k,a);}removeEventListener(k,f){this.handlers.set(k,(this.handlers.get(k)??[]).filter(x=>x!==f));}send(k,e={}){for(const f of this.handlers.get(k)??[])f(e);} }
 const win=new Events(),doc=new Events(),canvas=new Events(),calls=[];
 const Controller=new Function('NOVEL_CONTROLS','actions','window','document','HTMLElement','pointerActionHandled',classCode('src/ui/conversationControls.ts','ConversationControls')+';return ConversationControls;')(NOVEL_CONTROLS,['advance','log','hide'],win,doc,class {},pointerActionHandled);
 let enabled=true,log=false;const owned={},scene={input:new EventEmitter(),events:new EventEmitter(),game:{canvas,loop:{now:0},scene:{getScenes:()=>[scene]}}};
 const controls=new Controller(scene,{enabled:()=>enabled,owns:o=>o===owned,action:a=>calls.push(a),skip:()=>calls.push('skip'),scrollLog:dy=>{if(log)calls.push(dy);return log;}});
 const key=(code,extra={})=>{let stopped=false;win.send('keydown',{code,preventDefault(){},stopImmediatePropagation(){stopped=true;},...extra});return stopped;};
 for(const code of ['KeyZ','Enter','NumpadEnter'])assert.equal(key(code),true);
 key('KeyL');key('Space');key('KeyX');assert.deepEqual(calls,['advance','advance','advance','log','hide','hide']);
 key('KeyZ',{repeat:true});assert.equal(calls.length,6);
 for(const button of [0,4,3,2])scene.input.emit('pointerup',{button},[owned]);
 assert.deepEqual(calls.slice(-4),['advance','advance','log','hide']);
 scene.input.emit('wheel',{},[owned],0,100);scene.input.emit('wheel',{},[owned],0,-100);assert.deepEqual(calls.slice(-2),['advance','log']);
 log=true;scene.input.emit('wheel',{},[owned],0,-50);assert.equal(calls.at(-1),-50);
 const n=calls.length;scene.input.emit('pointerup',{button:0},[{}]);assert.equal(calls.length,n);
 assert.equal(key('ControlLeft',{key:'Control'}),false);scene.events.emit('update');assert.equal(calls.at(-1),'skip');scene.events.emit('update');assert.equal(calls.length,n+1);
 scene.game.loop.now=60;scene.events.emit('update');assert.equal(calls.length,n+2);
 win.send('keyup',{code:'ControlLeft'});scene.game.loop.now=120;scene.events.emit('update');assert.equal(calls.length,n+2);
 enabled=false;assert.equal(key('KeyZ'),false);scene.input.emit('pointerup',{button:0},[owned]);assert.equal(calls.length,n+2);
 enabled=true;let prevented=false;canvas.send('mousedown',{button:3,preventDefault(){prevented=true;}});assert.equal(prevented,true);
 controls.destroy();assert.equal(scene.input.listenerCount('pointerup'),0);assert.equal(scene.input.listenerCount('wheel'),0);assert.equal(scene.events.listenerCount('update'),0);
 assert.ok([...win.handlers.values(),...doc.handlers.values(),...canvas.handlers.values()].every(a=>!a.length));
});
