import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createServer } from 'vite';
const server = await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
const { BATTLE_ENTRANCE } = await server.ssrLoadModule('/src/data/battlePresentation.ts');
const { battleBackgroundFile, entranceSchedule, entranceProgress } = await server.ssrLoadModule('/src/models/battlePresentation.ts');
const { playBattleEntrance } = await server.ssrLoadModule('/src/ui/battleEntrance.ts');
const { RUN_STATE, resetRunState, startEventBattle } = await server.ssrLoadModule('/src/models/RunState.ts');
const { preloadBattleBackgrounds, addBattleBackground } = await server.ssrLoadModule('/src/ui/battleBackground.ts');
await server.close();

test('background resolution uses event, stage, then fallback and new runs reset stage to 1',()=>{
 assert.equal(battleBackgroundFile(1),'Prison.png');assert.equal(battleBackgroundFile(1,'tutorial'),'Prison_cell.png');
 const config={fallback:'Fallback.png',stages:{2:'Second.png'},events:{event:'Event.png'}};
 assert.equal(battleBackgroundFile(2,undefined,config),'Second.png');assert.equal(battleBackgroundFile(2,'event',config),'Event.png');assert.equal(battleBackgroundFile(3,'unknown',config),'Fallback.png');
 RUN_STATE.stage=2;resetRunState();assert.equal(RUN_STATE.stage,1);startEventBattle('tutorial');assert.equal(RUN_STATE.stage,1);resetRunState();
});

test('moved background files are loaded once and chosen for the arena',()=>{
 const loaded=[],scene={textures:{exists:()=>false},load:{image:(key,url)=>loaded.push({key,url})}};
 preloadBattleBackgrounds(scene);assert.equal(loaded.length,2);assert.ok(loaded.every(x=>x.url.includes('/image/background/')));
 let chosen;scene.textures.exists=key=>loaded.some(x=>x.key===key);
 scene.add={image:(x,y,key)=>{chosen=key;return {setDisplaySize(){return this;},setDepth(){return this;}};}};
 addBattleBackground(scene,1,'tutorial',1280,720);assert.equal(chosen,'battle-background:Prison_cell.png');
 addBattleBackground(scene,1,undefined,1280,720);assert.equal(chosen,'battle-background:Prison.png');
});

test('configured entry order and half-overlap timing cover 1, 2, 3 and larger encounters',()=>{
 assert.deepEqual(entranceSchedule(1).map(x=>x.index),[0]);assert.deepEqual(entranceSchedule(2).map(x=>x.index),[0,1]);assert.deepEqual(entranceSchedule(3).map(x=>x.index),[1,0,2]);
 assert.deepEqual(entranceSchedule(3).map(x=>x.delay),[0,150,300]);assert.deepEqual(entranceSchedule(4).map(x=>x.index),[0,1,2,3]);
 assert.equal(entranceProgress(400,800),.5);assert.equal(entranceProgress(400,800,400),0);
 assert.equal(entranceProgress(0,0),1);assert.equal(entranceProgress(1000,100),1);
 const config={...BATTLE_ENTRANCE,enemyOrder:{2:[1,0]},nextEnemyProgress:1};assert.deepEqual(entranceSchedule(2,config).map(x=>[x.index,x.delay]),[[1,0],[0,300]]);
});

function mock() {
 const graphics=[],tweens=[],events=new EventEmitter();
 const scene={events,add:{graphics:()=>{
  const g={rect:undefined,setVisible(){return this;},clear(){assert.ok(!this.destroyed);this.rect=undefined;return this;},fillStyle(){return this;},fillRect(...rect){this.rect=rect;return this;},createGeometryMask(){return {destroy(){this.destroyed=true;}};},destroy(){this.destroyed=true;}};graphics.push(g);return g;
 }},tweens:{add:config=>{const t={...config,remove(){this.removed=true;}};tweens.push(t);return t;}}};
 const player={active:true,scaleX:2,scaleY:3,alpha:.8,setScale(x,y){this.scaleX=x;this.scaleY=y;return this;},setAlpha(a){this.alpha=a;return this;}};
 const enemies=[900,700,800].map(x=>({area:{x,active:true,mask:null,getBounds:()=>({left:x-60,bottom:310,width:120}),setMask(mask){this.mask=mask;},clearMask(){this.mask=null;}},hitArea:{getBounds:()=>({bottom:280,height:160})}}));
 const advance=elapsed=>{tweens[0].targets.elapsed=elapsed;tweens[0].onUpdate();};
 return {scene,player,enemies,graphics,tweens,advance};
}

test('entry uses one scene tween, releases completed masks, and restores original transform/opacity',async()=>{
 const m=mock(),promise=playBattleEntrance(m.scene,m.player,m.enemies);
 assert.equal(m.player.alpha,0);assert.equal(m.tweens.length,1);assert.equal(m.tweens[0].duration,600);
 m.advance(150);assert.equal(m.graphics[0].rect[1],200);assert.equal(m.graphics[1].rect,undefined);
 m.advance(200);assert.equal(m.player.scaleX,-2);assert.equal(m.player.alpha,.4);assert.equal(m.player.scaleY,3);
 m.advance(300);assert.equal(m.enemies[2].area.mask,null);assert.equal(m.graphics[1].rect[1],200);
 m.advance(600);m.tweens[0].onComplete();assert.equal(await promise,true);
 assert.equal(m.player.scaleX,2);assert.equal(m.player.alpha,.8);assert.deepEqual(m.enemies.map(e=>e.area.x),[900,700,800]);
 assert.ok(m.graphics.every(g=>g.destroyed));assert.equal(m.scene.events.listenerCount('shutdown'),0);
});

test('shutdown cancellation and zero-duration entries release their resources and settle the promise',async()=>{
 const m=mock(),promise=playBattleEntrance(m.scene,m.player,m.enemies);m.advance(200);m.scene.events.emit('shutdown');
 assert.equal(await promise,false);assert.equal(m.player.scaleX,2);assert.equal(m.player.alpha,.8);assert.ok(m.tweens[0].removed);assert.ok(m.enemies.every(e=>e.area.mask===null));
 const instant=mock();assert.equal(await playBattleEntrance(instant.scene,instant.player,instant.enemies,{...BATTLE_ENTRANCE,playerDuration:0,enemyDuration:0}),true);assert.equal(instant.tweens.length,0);
});
