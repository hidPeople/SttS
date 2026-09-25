import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import EventEmitter from 'eventemitter3';
const source=ts.createSourceFile('playerPortrait.ts',fs.readFileSync('src/ui/playerPortrait.ts','utf8'),ts.ScriptTarget.Latest,true);
const node=source.statements.find(n=>ts.isClassDeclaration(n)&&n.name.text==='PortraitTransition');
const code=ts.transpileModule(node.getText(source).replace('export class','class'),{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
const config={transitionDuration:200};
const apply=(s,id)=>{s.texture={key:id};s.x=id==='B'?30:0;s.scaleX=id==='B'?2:1;};
const Transition=new Function('PLAYER_PORTRAIT_RENDERING','applyPlayerPortrait','smoothPortrait',code+';return PortraitTransition;')(config,apply,()=>{});
function harness(){
 const tweens=[],parent={list:[],getIndex(o){return this.list.indexOf(o);},addAt(o,i){this.list.splice(i,0,o);o.parentContainer=this;}};
 const scene={events:new EventEmitter(),tweens:{add(c){const t={duration:c.duration,removed:false,step(p){c.targets.progress=p;c.onUpdate();},complete(){this.step(1);c.onComplete();},remove(){this.removed=true;}};tweens.push(t);return t;}}};
 class Sprite extends EventEmitter {
  constructor(x=0,y=0,key='A'){super();Object.assign(this,{scene,active:true,visible:true,x,y,texture:{key},frame:{name:0},alpha:1,scaleX:1,scaleY:1,rotation:0,originX:.5,originY:0});this.setTint(0xffffff);}
  setOrigin(x,y){this.originX=x;this.originY=y;return this;}
  setScale(x,y){this.scaleX=x;this.scaleY=y;return this;}
  setRotation(v){this.rotation=v;return this;}
  setFlip(x,y){this.flipX=x;this.flipY=y;return this;}
  setAlpha(v){this.alpha=v;return this;}
  setVisible(v){this.visible=v;return this;}
  setTint(a,b=a,c=a,d=a){Object.assign(this,{tintTopLeft:a,tintTopRight:b,tintBottomLeft:c,tintBottomRight:d});return this;}
  destroy(){this.emit('destroy');this.active=false;const p=this.parentContainer;if(p)p.list.splice(p.list.indexOf(this),1);}
 }
 scene.add={sprite:(x,y,key)=>new Sprite(x,y,key)};
 const body=new Sprite();parent.addAt(body,0);
 return {body,parent,scene,tweens,transition:new Transition(body)};
}
test('new foreground fades in for 100 ms before the old portrait fades out for 100 ms',()=>{
 const h=harness();h.transition.show('B');assert.equal(h.tweens[0].duration,200);
 const old=h.parent.list[0];assert.equal(old.texture.key,'A');assert.equal(old.x,0);assert.equal(old.scaleX,1);
 assert.equal(h.body.x,30);assert.equal(h.body.scaleX,2);assert.equal(h.body.alpha,0);
 assert.equal(h.parent.list.at(-1),h.body);
 h.body.setTint(0xffc9e3);h.tweens[0].step(.25);
 assert.equal(old.alpha,1);assert.equal(h.body.alpha,.5);assert.equal(old.tintTopLeft,0xffc9e3);
 h.tweens[0].step(.5);assert.equal(old.alpha,1);assert.equal(h.body.alpha,1);
 h.tweens[0].step(.75);assert.equal(old.alpha,.5);assert.equal(h.body.alpha,1);
 h.tweens[0].complete();assert.equal(old.active,false);assert.deepEqual(h.parent.list,[h.body]);assert.equal(h.body.alpha,1);
});
test('interrupted crossfades continue from current opacities and scene shutdown disposes outgoing images',()=>{
 const h=harness();h.transition.show('B');h.tweens[0].step(.25);h.transition.show('C');
 assert.equal(h.tweens[0].removed,true);assert.deepEqual(h.parent.list.map(o=>o.alpha),[1,.5,0]);
 h.tweens[1].step(.25);assert.deepEqual(h.parent.list.map(o=>o.alpha),[1,.5,.5]);
 h.tweens[1].step(.75);assert.deepEqual(h.parent.list.map(o=>o.alpha),[.5,.25,1]);
 h.scene.events.emit('shutdown');assert.equal(h.tweens[1].removed,true);assert.deepEqual(h.parent.list,[h.body]);
 assert.equal(h.body.listenerCount('destroy'),0);
});
test('missing portrait fades out, zero duration switches immediately, body destruction cleans up',()=>{
 const h=harness();h.transition.show(undefined);assert.equal(h.body.visible,false);h.tweens[0].complete();assert.deepEqual(h.parent.list,[h.body]);
 config.transitionDuration=0;h.transition.show('B');assert.equal(h.body.alpha,1);assert.equal(h.body.visible,true);assert.equal(h.tweens.length,1);
 config.transitionDuration=200;h.transition.show('C');h.body.destroy();assert.deepEqual(h.parent.list,[]);assert.equal(h.scene.events.listenerCount('shutdown'),0);
});
