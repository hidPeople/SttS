import fs from 'node:fs';
import ts from 'typescript';
import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createServer } from 'vite';
const server = await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
const { EpHeartBudget, portraitLocalPoint, heartPosition, heartBurst } = await server.ssrLoadModule('/src/models/epHeartMotion.ts');
const { epHeartCountsByOrigin, flyEpHearts, portraitEpOrigin, portraitEpOriginKeys, portraitEpOrigins, PortraitSigil } = await server.ssrLoadModule('/src/ui/epHeartEffect.ts');
const { characterPortraitAssets } = await server.ssrLoadModule('/src/models/portraitAssets.ts');
const { EP_HEART_EFFECT } = await server.ssrLoadModule('/src/data/epPresentation.ts');
const { statusApplicationVisual } = await server.ssrLoadModule('/src/models/statusApplicationVisual.ts');
const { STATUS_DESCRIPTIONS } = await server.ssrLoadModule('/src/data/statuses.ts');
await server.close();

function sceneFixture(loaded=true) {
  const images=[],tweens=[];
  const scene={events:new EventEmitter(),textures:{exists:()=>loaded},add:{image:(x,y,texture,frame)=>{
    const image={x,y,texture,frame,width:200,height:100,active:true,destroy(){this.active=false;}};
    for(const method of ['setDisplaySize','setDepth','setPosition','setRotation','setAlpha','setVisible'])image[method]=(...args)=>{image[method+'Args']=args;return image;};
    images.push(image);return image;
  }},tweens:{add:config=>{const tween={config,removed:false,remove(){this.removed=true;},step(t){for(const key of ['progress','t'])if(key in config.targets)config.targets[key]=t;config.onUpdate?.();},complete(){this.step(1);config.onComplete?.();}};tweens.push(tween);return tween;}}};
  return {scene,images,tweens};
}

test('heart count uses ceil per unique part across MAX splits, not per chunk',()=>{
  const dual=new EpHeartBudget(2);
  assert.equal(dual.take(3),2);
  const split=new EpHeartBudget(2);
  assert.deepEqual([split.take(1),split.take(1),split.take(1)],[1,0,1]);
  const enemy=new EpHeartBudget(1);
  assert.equal(enemy.take(3),3);assert.equal(enemy.take(0),0);
});
test('each emission caps single-part and multi-part hearts without changing flight time',async()=>{
  for(const [parts,damage,perPart] of [[1,100,20],[1,3,3],[2,100,10],[3,100,10],[2,2,2]]){
    const {scene,images,tweens}=sceneFixture();
    // Coincident part positions must still count as multiple parts.
    const origins=Array.from({length:parts},()=>({x:100,y:200}));
    const task=flyEpHearts(scene,{origins,countPerOrigin:damage,destination:()=>({x:10,y:10})});
    assert.equal(images.length,parts*perPart);
    assert.equal(tweens[0].config.duration,EP_HEART_EFFECT.travelDuration);
    tweens[0].complete();await task;
  }
});
test('B heart count is split evenly between B1 and B2, with an odd extra at B1',()=>{
  assert.deepEqual(epHeartCountsByOrigin(['B'],5),[3,2]);
  assert.deepEqual(epHeartCountsByOrigin(['M','B','A'],4),[4,2,2,4]);
  assert.deepEqual(epHeartCountsByOrigin(['B'],100,20),[10,10]);
  assert.deepEqual(epHeartCountsByOrigin(['B'],1,20,0),[1,0]);
  assert.deepEqual(epHeartCountsByOrigin(['B'],1,20,1),[0,1]);
  assert.deepEqual(epHeartCountsByOrigin(['B'],1,20,2),[1,0]);
});
test('touch B hearts use only the touched B1 or B2 origin',()=>{
  assert.deepEqual(portraitEpOriginKeys(['B'], 'B1'), ['B1']);
  assert.deepEqual(portraitEpOriginKeys(['B'], 'B2'), ['B2']);
  assert.deepEqual(portraitEpOriginKeys(['B']), ['B1', 'B2']);
});

test('normalized point transforms with image size, origin, flip and actual world transform',()=>{
  const body={width:1000,height:2000,originX:.5,originY:0,flipX:false,flipY:false,getWorldTransformMatrix:()=>({transformPoint:(x,y)=>({x:x*.7+145,y:y*.7+130})})};
  assert.deepEqual(portraitLocalPoint({x:.3,y:.6},body),{x:-200,y:1200});
  const previous=characterPortraitAssets.anchorTest;
  characterPortraitAssets.anchorTest={epPoints:{M:{x:.3,y:.6}}};
  assert.deepEqual(portraitEpOrigin(body,'anchorTest','M', {x:0,y:134,width:290,height:586}),{x:5,y:970});
  body.flipX=true;
  const p=portraitEpOrigin(body,'anchorTest','M', {x:0,y:134,width:290,height:586});assert.ok(Math.abs(p.x-285)<1e-9);
  if(previous)characterPortraitAssets.anchorTest=previous;else delete characterPortraitAssets.anchorTest;
});
test('unset parts use the screen region without reading portrait transforms',()=>{
  const region={x:0,y:134,width:290,height:586};
  const body={getWorldTransformMatrix(){throw Error('screen defaults must not use the image transform');}};
  const previous=characterPortraitAssets.anchorTest;
  characterPortraitAssets.anchorTest={epPoints:{M:{x:.3,y:.6}}};
  try {
    assert.deepEqual(portraitEpOrigin(body,undefined,'M',region),{x:145,y:251.2});
    assert.deepEqual(portraitEpOrigin(body,'anchorTest','B',region),{x:145,y:427});
    for(const part of ['C','V','A']) {
      const p=portraitEpOrigin(body,'missingPortrait',part,region);
      assert.equal(p.x,145);assert.ok(Math.abs(p.y-524.862)<1e-9);
    }
  } finally {if(previous)characterPortraitAssets.anchorTest=previous;else delete characterPortraitAssets.anchorTest;}
});
test('B resolves two independently configurable portrait origins and supports legacy B coordinates',()=>{
  const region={x:0,y:134,width:290,height:586};
  const body={width:100,height:200,originX:0,originY:0,flipX:false,flipY:false,getWorldTransformMatrix:()=>({transformPoint:(x,y)=>({x,y})})};
  const previous=characterPortraitAssets.anchorTest;
  try {
    characterPortraitAssets.anchorTest={epPoints:{B1:{x:.2,y:.3},B2:{x:.8,y:.4}}};
    assert.deepEqual(portraitEpOrigins(body,'anchorTest','B',region),[{x:20,y:60},{x:80,y:80}]);
    characterPortraitAssets.anchorTest={epPoints:{B:{x:.4,y:.5}}};
    assert.deepEqual(portraitEpOrigins(body,'anchorTest','B',region),[{x:40,y:100},{x:40,y:100}]);
  } finally {if(previous)characterPortraitAssets.anchorTest=previous;else delete characterPortraitAssets.anchorTest;}
});

test('static hearts choose supplied textures, retain aspect ratio and finish after travelDuration',async()=>{
  const {scene,images,tweens}=sceneFixture();
  const original=Math.random;let seed=71;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  let task;
  try { task=flyEpHearts(scene,{origins:[{x:10,y:100},{x:50,y:200}],countPerOrigin:4,destination:()=>({x:100,y:20})}); }
  finally {Math.random=original;}
  assert.equal(images.length,8);assert.ok(images.every(i=>/^ep-heart-image-[0-5]$/.test(i.texture)));
  assert.ok(new Set(images.map(i=>i.texture)).size>1);
  assert.deepEqual(images[0].setDisplaySizeArgs,[EP_HEART_EFFECT.size,EP_HEART_EFFECT.size/2]);
  assert.equal(tweens.length,1);assert.equal(tweens[0].config.duration,EP_HEART_EFFECT.travelDuration);
  tweens[0].step(EP_HEART_EFFECT.burstEnd);assert.notDeepEqual(images[0].setPositionArgs,[100,20]);
  tweens[0].complete();await task;
  assert.ok(Math.abs(images[0].setPositionArgs[0]-100)<1e-9);assert.ok(Math.abs(images[0].setPositionArgs[1]-20)<1e-9);assert.ok(images.every(i=>!i.active));assert.equal(scene.events.listenerCount('shutdown'),0);
  assert.deepEqual(heartPosition({x:0,y:0},{x:20,y:30},{x:100,y:50},1,1,.25),{x:100,y:50});
});

test('missing texture, zero-particle fractional chunk and shutdown settle cleanly',async()=>{
  for(const count of [0,1]){
    const {scene,tweens}=sceneFixture(false);
    const task=flyEpHearts(scene,{origins:[{x:0,y:0}],countPerOrigin:count,destination:()=>({x:10,y:10})});
    tweens[0].complete();await task;
  }
  const {scene,images,tweens}=sceneFixture();const task=flyEpHearts(scene,{origins:[{x:0,y:0}],countPerOrigin:3,destination:()=>({x:1,y:2})});
  scene.events.emit('shutdown');await task;assert.ok(tweens[0].removed);assert.ok(images.every(i=>!i.active));
});

test('status hearts use actual added stacks or destination rank, restricted by owner',()=>{
  const result=(id,owner='player',added=1)=>statusApplicationVisual(STATUS_DESCRIPTIONS[id],owner,added);
  assert.deepEqual(result('Charm','enemy',2),{effect:'love',count:2});
  assert.equal(result('Charm','player'),undefined);assert.equal(result('Charm','enemy',0),undefined);
  ['Horny','InHeat','Frustrated','DesperateToCum'].forEach((id,i)=>{
    assert.deepEqual(result(id),{effect:'love',count:i+1});assert.equal(result(id,'enemy'),undefined);
  });
  assert.deepEqual(result('TurnedOn'),{effect:'love',count:1});
  assert.equal(result('TurnedOn','player',0),undefined);assert.equal(result('Aftershocks'),undefined);
});

test('sigil is optional, follows portrait changes, and repeated activation replaces the running visual',()=>{
  const {scene,images,tweens}=sceneFixture();let id='anchorSigil';
  characterPortraitAssets[id]={sigilPoint:{x:.5,y:.6}};
  const body={width:1000,height:2000,originX:.5,originY:0,flipX:false,flipY:false,displayWidth:500,rotation:0,visible:true,parentContainer:{add:()=>{}},getLocalTransformMatrix:()=>({transformPoint:(x,y)=>({x:x*.5,y:y*.5})})};
  const sigil=new PortraitSigil(scene,body,()=>id);sigil.play();tweens[0].step(.2);
  assert.deepEqual(images[0].setPositionArgs,[0,600]);assert.ok(images[0].setAlphaArgs[0]>0);
  sigil.play();assert.equal(images[0].active,false);assert.equal(tweens[0].removed,true);
  id='absent';tweens[1].step(.5);assert.deepEqual(images[1].setVisibleArgs,[false]);
  sigil.play();assert.equal(images.length,2);assert.ok(images.every(i=>!i.active));
  delete characterPortraitAssets.anchorSigil;
});

 test('EP coordinator keeps original easing/duration and never waits for heart flight',async()=>{
   const source=ts.createSourceFile('BattleScene.ts',fs.readFileSync('src/scenes/BattleScene.ts','utf8'),ts.ScriptTarget.Latest,true);
   const scene=source.statements.find(n=>ts.isClassDeclaration(n)&&n.name.text==='BattleScene');
   const method=scene.members.find(n=>n.name?.getText(source)==='animateEpFillTo').getText(source);
   const code=ts.transpileModule('class Harness {'+method+'}',{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
   let flights=0;const pendingFlight=()=>{flights++;return new Promise(()=>{});};
   const Harness=new Function('flyEpHearts','BAR_WIDTH','Phaser',code+';return Harness;')(pendingFlight,190,{Math:{Clamp:(x,a,b)=>Math.max(a,Math.min(b,x))}});
   for(const duration of [320,45]){
     const h=new Harness();let tween;h.tweens={killTweensOf:()=>{},add:c=>tween=c};
     const bars={epFill:{displayWidth:20},ribbon:{cancelEnemyRelease:()=>{}}};
     const result=h.animateEpFillTo(bars,7,10,'player',duration,false,{});
     assert.equal(tween.duration,duration);assert.equal(tween.ease,'Sine.easeOut');assert.equal(tween.displayWidth,133);
     assert.equal(h.playerOrgasmBarOverride,true);tween.onComplete();await result;assert.equal(h.playerOrgasmBarOverride,false);
   }
   assert.equal(flights,2);
 });

 test('fan launches upward across distinct sectors and curves with overlapping launch and accelerating absorption',()=>{
   const origin={x:300,y:400};const bursts=Array.from({length:5},(_,i)=>heartBurst(origin,i,5,120,140,()=>.5));
   assert.ok(bursts.every(b=>b.y<origin.y));assert.ok(bursts[0].x<origin.x-70);assert.ok(bursts[4].x>origin.x+70);
   const b=bursts[1],end={x:40,y:100},pos=t=>heartPosition(origin,b,end,t,1,.44,60,-.8);
   assert.deepEqual(pos(0),origin);assert.deepEqual(pos(1),end);
   const turn=.44*.7,epsilon=.00001;
   const velocity=t=>({x:(pos(t+epsilon).x-pos(t-epsilon).x)/(2*epsilon),y:(pos(t+epsilon).y-pos(t-epsilon).y)/(2*epsilon)});
   for(const boundary of [turn,.44]){
     const before=velocity(boundary-epsilon*2),after=velocity(boundary+epsilon*2);
     assert.ok(Math.hypot(before.x,before.y)>10,'keeps moving through transition');
     assert.ok(Math.hypot(before.x-after.x,before.y-after.y)<1,'no abrupt velocity change');
   }
   assert.ok(Math.hypot(pos(.44).x-b.x,pos(.44).y-b.y)>1,'homing has already started at the former stopping point');
   assert.ok(Math.hypot(pos(.440001).x-pos(.439999).x,pos(.440001).y-pos(.439999).y)<.001);
   const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
   assert.ok(distance(pos(.54),pos(.44))<distance(pos(.94),pos(.84)),'accelerates into the bar');
   const mid=pos(.75),cross=(end.x-b.x)*(mid.y-b.y)-(end.y-b.y)*(mid.x-b.x);
   assert.ok(Math.abs(cross)>100,'homing route is not a straight segment');
 });
