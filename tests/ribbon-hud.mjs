import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import EventEmitter from 'eventemitter3';

const load=(file,names,dependencies={})=>{
 const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
 const code=source.statements.filter(n=>!ts.isImportDeclaration(n)).map(n=>n.getText(source).replace(/^export\s+/, '')).join('\n');
 const js=ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
 return new Function(...Object.keys(dependencies),js+';return {'+names.join(',')+'};')(...Object.values(dependencies));
};
const {RIBBON_HUD:STYLE}=load('src/data/ui.ts',['RIBBON_HUD']);
const motion=load('src/ui/ribbonMotion.ts',['enemyRelease','createPlayerOverflow','clamp','mix'],{RIBBON_HUD:STYLE});

test('enemy release starts at MAX, has two separated stages and overlaps the original drain start',()=>{
 const {enemyRelease:release}=motion;
 const elapsed=progress=>(progress-STYLE.enemyPulses[0].start)*STYLE.enemyReleaseDuration;
 assert.equal(release(0).value,1);assert.equal(release(0).pulses.length,1);
 assert.ok(release(200).value<1);
 assert.equal(release(elapsed(.45)).value,.48);
 assert.ok(release(elapsed(.7)).value<.48);assert.ok(release(elapsed(.7)).value>0);
 assert.equal(release(STYLE.enemyReleaseDuration).value,0);assert.equal(release(STYLE.enemyReleaseDuration).complete,true);
 let last=1;for(let t=0;t<2000;t+=10){const value=release(t).value;assert.ok(value<=last);last=value;}
});

test('random overflow plans stay within their configurable ranges and vary between cycles',()=>{
 const a=motion.createPlayerOverflow(()=>.1),b=motion.createPlayerOverflow(()=>.9),s=STYLE.playerDrain;
 assert.notDeepEqual(a,b);assert.equal(a.length,s.outletCount);
 for(const plan of [a,b]) for(const outlet of plan){
  assert.ok(outlet.position>=0&&outlet.position<=1);
  for(const key of ['delay','cycle','radius','drift'])assert.ok(outlet[key]>=s[key][0]&&outlet[key]<=s[key][1]);
 }
 assert.ok(a.reduce((n,o)=>n+o.position,0)/a.length>.5);
});

class Shape extends EventEmitter {
 visible=true; active=true; width=190; height=16; displayWidth=190; scaleX=0; alpha=1; fillColor=0;
 constructor(x=28,y=52){super();this.x=x;this.y=y;}
 setVisible(v){this.visible=v;return this;}
 setOrigin(){return this;} setScale(){return this;} setDepth(){return this;}
 destroy(){if(!this.active)return;this.active=false;this.emit('destroy');}
}
const noop=()=>{};
const fills=[];
const context=new Proxy({},{get:(_o,key)=>key==='createLinearGradient'?()=>({addColorStop:noop}):noop,set:(_o,key,value)=>{if(key==='fillStyle')fills.push(value);return true;}});
const calls=[];
const ejections=[];
const drawing={ribbon:(...args)=>calls.push(args),ribbonPath:noop,reserve:noop,reserveMarker:noop,shield:noop,gradient:()=>'',playerDrain:noop,enemyEjection:(...args)=>ejections.push(args)};
const {RibbonHud}=load('src/ui/ribbonHud.ts',['RibbonHud'],{STYLE,GAME_FONT:'sans-serif',...motion,...drawing});
function fresh(){
 const events=new EventEmitter(),textures=new Map(),tweens=[];
 const scene={events,add:{image:()=>new Shape()},textures:{createCanvas(key,width,height){const t={key,width,height,context,refresh:noop};textures.set(key,t);return t;},remove:key=>textures.delete(key)},tweens:{killTweensOf:noop,add:t=>tweens.push(t)}};
 const sources={hpBg:new Shape(),hpFill:new Shape(),epBg:new Shape(28,79),epFill:new Shape(),epReserveFill:new Shape()};
 const hud=new RibbonHud(scene,sources);
 return {hud,scene,sources,textures,tweens,tick:delta=>events.emit('update',0,delta)};
}

test('presentation clock drains independently, never changes model fills and holds empty through a delayed hook',()=>{
 const {hud,sources,tick}=fresh();hud.startEnemyRelease();tick(200);
 assert.equal(sources.epFill.displayWidth,190);
 assert.ok(calls.at(-1)[3]<1);assert.equal(calls.at(-1)[7],true,'remaining liquid is right-aligned');
 tick(1800);assert.equal(calls.at(-1)[3],0);tick(1000);assert.equal(calls.at(-1)[3],0);
 sources.epFill.displayWidth=0;tick(40);assert.equal(hud.releaseElapsed,undefined);
 hud.startEnemyRelease();hud.cancelEnemyRelease();sources.epFill.displayWidth=95;tick(40);
 assert.equal(calls.at(-1)[3],.5);hud.destroy();
});

test('ending repeated overflow finishes the current cycle and is token-safe; full guard does not fracture',()=>{
 const {hud,tick}=fresh();const stopFirst=hud.startOverflow(400,true);
 const stopSecond=hud.startOverflow(600,true);stopFirst();assert.ok(hud.overflow);
 tick(STYLE.playerDrain.minDuration+50);assert.equal(hud.overflow.elapsed,50);stopSecond();assert.ok(hud.overflow);
 tick(STYLE.playerDrain.minDuration);assert.equal(hud.overflow,undefined);
 hud.impactBlock(5,0,false);assert.equal(hud.blockHit.broken,false);
 tick(STYLE.blockDuration+STYLE.blockBreakDuration);assert.equal(hud.block,0);assert.equal(hud.blockHit,undefined);
 hud.impactBlock(5,0,true);assert.equal(hud.blockHit.broken,true);hud.destroy();
});

test('a one-flash overflow outlives the flash and EP reset without blocking; next climax replaces it',()=>{
 const {hud,sources,tick}=fresh();hud.startOverflow(160);
 const first=hud.overflow;assert.equal(first.duration,STYLE.playerDrain.minDuration);
 tick(160);sources.epFill.displayWidth=95;tick(40);assert.equal(hud.overflow,first);
 hud.startOverflow(160);assert.notEqual(hud.overflow,first);assert.equal(hud.overflow.elapsed,0);
 tick(STYLE.playerDrain.minDuration-1);assert.ok(hud.overflow);
 tick(1);assert.equal(hud.overflow,undefined);assert.equal(sources.epFill.displayWidth,95);hud.destroy();
});

test('healing grows in HP colors without a damage trail, including during an unfinished damage tween',()=>{
 const {hud,sources,tick}=fresh();sources.hpFill.displayWidth=76;hud.setVitals(20,50,0,false,false);
 fills.length=0;hud.setVitals(40,50,0,false,true);sources.hpFill.displayWidth=110;tick(40);
 assert.ok(!fills.includes('#e4bd7a'));assert.ok(!fills.includes('#ff656e'));
 hud.setVitals(10,50,0,false,true);sources.hpFill.displayWidth=90;tick(40);assert.ok(fills.includes('#e4bd7a'));
 fills.length=0;hud.setVitals(15,50,0,false,true);tick(40);
 assert.ok(!fills.includes('#e4bd7a'));assert.ok(!fills.includes('#ff656e'));hud.destroy();
});

test('new EP hits and defeat do not cut off the second ejection; no delay is added to the gauge',()=>{
 const {hud,sources,tick}=fresh();hud.startEnemyRelease();tick(500);
 hud.cancelEnemyRelease();sources.epFill.displayWidth=95;tick(200);
 assert.equal(calls.at(-1)[3],.5);assert.equal(calls.at(-1)[7],false);
 assert.ok(ejections.at(-1)[5].length>0,'second ejection is still active');
 sources.epBg.visible=false;const count=calls.length;tick(40);
 assert.equal(hud.ep.visible,true);assert.equal(calls.length,count,'only particles remain after defeat');
 tick(STYLE.enemyReleaseDuration);assert.equal(hud.releaseElapsed,undefined);assert.equal(hud.ep.visible,false);
 hud.destroy();
});

test('debug removal and scene shutdown release textures, detached tween targets and update listeners exactly once',()=>{
 for(const event of ['remove','shutdown']){
  const {hud,scene,sources,textures}=fresh();assert.equal(textures.size,2);
  if(event==='remove')sources.hpBg.destroy();else scene.events.emit('shutdown');
  hud.destroy();assert.equal(textures.size,0);assert.equal(scene.events.listenerCount('update'),0);
  assert.equal(scene.events.listenerCount('shutdown'),0);
  for(const key of ['hpFill','epFill','epReserveFill'])assert.equal(sources[key].active,false);
 }
});
