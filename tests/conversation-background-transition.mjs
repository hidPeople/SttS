import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
function load(file, dependencies = {}) {
  const result = {};
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function('require', 'exports', js)(id => { if (!(id in dependencies)) throw Error(id); return dependencies[id]; }, result);
  return result;
}
const data = load('src/data/conversationTransitions.ts');
const logic = load('src/models/conversationTransition.ts', { '../data/conversationTransitions': data });
const { backgroundTransitionSettings: settings, backgroundTransitionFrame: frame, backgroundRevealRadius: radius } = logic;
test('radial center, feather and duration stay bounded; the solid disk reaches every corner', () => {
  const s = settings({ type: 'radial', originX: 1/3, originY: 0.75, feather: 0.16 });
  assert.equal(s.duration, 1800); assert.equal(s.showText, true);
  const r = radius(1280, 720, s.originX, s.originY, s.feather);
  for (const x of [0, 1280]) for (const y of [0,720]) assert.ok(r * (1-s.feather) >= Math.hypot(x-1280*s.originX,y-720*s.originY)-1e-8);
  assert.deepEqual(settings({ type:'flash', duration:-1, originX:-1, originY:2, feather:1, showText:false }), { type:'flash',duration:0,originX:0,originY:1,feather:0.9,showText:false });
});
test('two short flashes precede a pause and a long flash; image swaps only under full cover', () => {
  for (const p of [0,0.12,0.26,0.44,1]) assert.equal(frame('flash',p).alpha,0);
  for (const p of [0.04,0.18,0.66,0.7,0.76]) assert.equal(frame('flash',p).alpha,1);
  assert.equal(frame('flash',0.69).swapped,false); assert.equal(frame('flash',0.7).swapped,true);
  for (const kind of ['fade','blink']) { assert.equal(frame(kind,0.49).alpha,1);assert.equal(frame(kind,0.51).alpha,1);assert.equal(frame(kind,0.49).swapped,false);assert.equal(frame(kind,0.51).swapped,true); }
});
class Node {
  active=true; visible=true; alpha=1;
  setAlpha(v){this.alpha=v;return this;} setVisible(v){this.visible=v;return this;}
  setDisplaySize(w,h){this.width=w;this.height=h;return this;} setOrigin(){return this;} setX(){return this;}
  clear(){return this;} fillStyle(){return this;} fillRect(){return this;}
  setMask(mask){this.mask=mask;return this;} clearMask(){this.mask=undefined;return this;}
  destroy(){this.active=false;}
}
function harness(type, webgl=true) {
  const nodes=[],textures=new Set(),tweens=[];let completions=0;
  const scene={sys:{game:{renderer:{type:webgl?2:1}}},textures:{createCanvas(key){textures.add(key);return {context:{createRadialGradient(){return {addColorStop(){}};},beginPath(){},arc(){},fill(){}},refresh(){}};},remove(key){textures.delete(key);}},make:{image(){const n=new Node();nodes.push(n);return n;}},add:{graphics(){const n=new Node();nodes.push(n);return n;}},tweens:{add(config){const tween={...config,remove(){this.removed=true;}};tweens.push(tween);return tween;}}};
  const previous=new Node(),next=new Node(),root={list:[next,previous],getIndex(n){return this.list.indexOf(n);},moveTo(n,index){this.list.splice(this.getIndex(n),1);this.list.splice(index,0,n);},addAt(n,index){this.list.splice(index,0,n);}};
  const module=load('src/ui/conversationBackgroundTransition.ts',{'phaser':{default:{WEBGL:2,Display:{Masks:{BitmapMask:class {destroy(){this.destroyed=true;}}}}}},'./layout':{SCREEN_WIDTH:1280,SCREEN_HEIGHT:720},'../data/conversationTransitions':data,'../models/conversationTransition':logic});
  const handle=module.transitionConversationBackground(scene,root,previous,next,{type},()=>completions++);
  return {handle,previous,next,root,nodes,textures,tweens,get completions(){return completions;}};
}
test('all transitions keep the previous image until completion and dispose their temporary resources', () => {
  for (const type of ['radial','flash','pageTurn','fade','blink']) {
    const h=harness(type); assert.equal(h.previous.active,true); assert.equal(h.completions,0);
    const t=h.tweens[0];t.targets.progress=0.8;t.onUpdate();t.onComplete();
    assert.equal(h.previous.active,false); assert.equal(h.next.active,true); assert.equal(h.next.alpha,1);assert.equal(h.next.visible,true);
    assert.equal(h.next.mask,undefined);assert.equal(h.textures.size,0);assert.ok(h.nodes.every(n=>!n.active));assert.equal(h.completions,1);
  }
});
test('cancellation releases the radial mask and never completes a disposed conversation', () => {
  const h=harness('radial');assert.equal(h.textures.size,1);
  h.handle.cancel();h.handle.cancel();assert.equal(h.textures.size,0);assert.equal(h.completions,0);assert.ok(h.tweens[0].removed);
  const canvas=harness('radial',false);assert.equal(canvas.textures.size,0);canvas.tweens[0].targets.progress=0.5;canvas.tweens[0].onUpdate();assert.equal(canvas.next.alpha,0.5);canvas.handle.cancel();
});
