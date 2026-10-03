import test from 'node:test';
import assert from 'node:assert/strict';
import EventEmitter from 'eventemitter3';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const { CardInspection } = await server.ssrLoadModule('/src/ui/cardInspection.ts');
const { CARD_INSPECTION: config } = await server.ssrLoadModule('/src/data/ui.ts');
await server.close();

class Node extends EventEmitter {
  active = true; visible = true; list = [];
  setDepth() { return this; } setInteractive() { return this; }
  setVisible(value) { this.visible = value; return this; }
  setPosition(x,y) { Object.assign(this,{x,y}); return this; }
  setScale(scale) { this.scale = scale; return this; }
  setFillStyle(color,alpha) { Object.assign(this,{color,alpha}); return this; }
  clear() { return this; } lineStyle() { return this; } beginPath() { return this; }
  arc(x,y,r,start,end) { this.arcEnd=end; return this; } strokePath() { return this; }
  add(nodes) { this.list.push(...nodes); return this; } get first() { return this.list[0]; }
  destroy() { this.active=false; this.emit('destroy'); this.list.forEach(x=>x.destroy()); this.removeAllListeners(); }
}
function setup(t) {
  let now=0, uses=0, enabled=true, held=true;
  t.mock.method(performance,'now',()=>now);
  const previous=globalThis.window;globalThis.window=new EventTarget();
  const scene={events:new EventEmitter(),input:new EventEmitter(),add:{graphics:()=>new Node(),container:()=>new Node(),rectangle:()=>new Node()}};
  const inspector=new CardInspection(scene,()=>{}), card=new Node();
  const pointer={button:0,event:{},x:100,y:200,leftButtonDown:()=>held};
  inspector.bind(card,()=>enabled,()=>uses++,()=>new Node());
  const down=()=>{held=true;card.emit('pointerdown',pointer);};
  const tick=value=>{now=value;scene.events.emit('postupdate');};
  const release=(object=card,button=0)=>{
    pointer.button=button;if(button===0)held=false;
    let stopped=false;object.emit('pointerup',pointer,0,0,{stopPropagation(){stopped=true;}});
    if(!stopped)scene.input.emit('pointerup',pointer);
  };
  const key=(name)=>{const event=new Event('keydown',{cancelable:true});Object.assign(event,{key:name,repeat:false});window.dispatchEvent(event);return event;};
  t.after(()=>{scene.events.emit('shutdown');globalThis.window=previous;});
  return {inspector,scene,card,pointer,down,tick,release,key,uses:()=>uses,disable:()=>{enabled=false;}};
}

test('short primary release plays once; keyboard confirmation still activates directly',t=>{
 const h=setup(t);h.down();h.tick(config.progressStartMs-1);h.release();assert.equal(h.uses(),1);assert.equal(h.inspector.active,false);
 h.card.emit('pointerup',{button:0,event:undefined});assert.equal(h.uses(),2);
 h.pointer.button=2;h.card.emit('pointerdown',h.pointer);h.release(h.card,2);assert.equal(h.uses(),2);
});
test('progress begins at the elapsed fraction and a partial long press never uses the card',t=>{
 const h=setup(t);h.down();h.tick(config.progressStartMs-1);assert.equal(h.inspector.progress.visible,false);
 h.tick(config.progressStartMs);assert.equal(h.inspector.progress.visible,true);
 assert.equal(h.inspector.progress.arcEnd,-Math.PI/2+config.progressStartMs/config.openMs*Math.PI*2);
 assert.equal(h.inspector.progress.x,h.pointer.x);
 h.release();assert.equal(h.uses(),0);assert.equal(h.inspector.active,false);assert.equal(h.inspector.progress.visible,false);
});
test('full hold opens at the shared scale; opening release stays open and next right click only closes',t=>{
 const h=setup(t);h.down();h.tick(config.openMs);assert.equal(h.inspector.active,true);assert.equal(h.uses(),0);
 assert.equal(h.inspector.root.list[1].scale,config.detailScale);
 h.release(h.inspector.root.first);assert.equal(h.inspector.active,true);
 h.release(h.inspector.root.first,2);assert.equal(h.inspector.active,false);assert.equal(h.uses(),0);
});
test('threshold is honored even when release occurs before the next rendered frame',t=>{
 const h=setup(t);h.down();t.mock.method(performance,'now',()=>config.openMs);h.release();
 assert.equal(h.inspector.active,true);assert.equal(h.uses(),0);
 h.key('Control');assert.equal(h.inspector.active,false);
});
test('key dismiss while still held leaves an invisible input shield until release',t=>{
 const h=setup(t);h.down();h.tick(config.openMs);const root=h.inspector.root;
 assert.equal(h.key('Escape').defaultPrevented,true);assert.equal(root.list[1].visible,false);assert.equal(root.first.alpha,0);
 h.key('z');assert.equal(h.inspector.root,root);
 h.release(root.first);assert.equal(h.inspector.active,false);assert.equal(h.uses(),0);
});
test('leaving card, input locks and key input cancel pending holds without playing',t=>{
 const h=setup(t);h.down();h.card.emit('pointerout');h.tick(config.openMs);h.release();assert.equal(h.inspector.active,false);assert.equal(h.uses(),0);
 h.down();h.key('Control');h.tick(config.openMs*2);h.release();assert.equal(h.uses(),0);
 h.down();h.disable();h.tick(config.openMs*3);assert.equal(h.inspector.active,false);
 h.scene.events.emit('shutdown');assert.equal(h.scene.events.listenerCount('postupdate'),0);assert.equal(h.scene.input.listenerCount('pointerup'),0);
});
