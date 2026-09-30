import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import ts from 'typescript';
import { createServer } from 'vite';
const server = await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
let m = {};
try {
  for (const name of ['models/sceneAssets','models/portraitSelection','models/portraitAssets','data/portraitFactors','data/enemies','data/enemySprites','data/sprites','ui/sprites']) Object.assign(m, await server.ssrLoadModule('/src/'+name+'.ts'));
} finally {await server.close();}
const { enemySpriteAssets, commonBattleSprites, PortraitSelection, characterPortraitAssets, PORTRAIT_FACTORS, ENEMY_DEFINITIONS, ENEMY_SPRITES, preloadSprites, createSpriteAnimations, ensureSprites} = m;

const battlePortraitAssets = (playerId, category) => new PortraitSelection(Object.keys(characterPortraitAssets), PORTRAIT_FACTORS).availableIds(playerId, category).map(id => characterPortraitAssets[id]);

function mock() {
  const textures=new Set(), requests=[], animations=new Set();
  const load = new EventEmitter();
  let loading=false;
  Object.assign(load,{image:(key,url)=>requests.push({key,url}),spritesheet:(key,url,config)=>requests.push({key,url,config}),isLoading:()=>loading,start:()=>{loading=true;}});
  const scene={load,events:new EventEmitter(),textures:{exists:key=>textures.has(key)},sys:{isActive:()=>true},anims:{exists:key=>animations.has(key),create:config=>animations.add(config.key),generateFrameNumbers:()=>[]}};
  const complete=key=>{textures.add(key);load.emit('filecomplete',key,'spritesheet');};
  return {scene,textures,requests,animations,complete};
}

test('portrait scope includes active category, normal fallback and common aliases without other players or events',()=>{
  const ids=['P_normal_idle_1','P_tutorial_idle_1','P_tutorial_Starvation_1','P_Death_1','P_other_idle_1','Q_normal_idle_1'];
  const selection=new PortraitSelection(ids,PORTRAIT_FACTORS,()=>{throw Error('enumeration must not draw randomness');});
  assert.deepEqual(new Set(selection.availableIds('P','tutorial')),new Set(ids.slice(0,4)));
  assert.deepEqual(new Set(selection.availableIds('P','normal')),new Set([ids[0],ids[3]]));
  const normal=battlePortraitAssets('Succubus','normal');
  assert.ok(normal.length>0);
  assert.ok(!normal.includes(characterPortraitAssets.Succubus_tutorial_Starvation_idle_1));
  assert.ok(normal.includes(characterPortraitAssets.Succubus_Death_1), 'common alias may use a tutorial-named physical file');
  const tut=battlePortraitAssets('Succubus','tutorial');
  assert.ok(tut.includes(characterPortraitAssets.Succubus_normal_idle_1));
});

test('enemy scope includes appearance variants and deduplicates repeated enemy types',()=>{
  const defs=[ENEMY_DEFINITIONS.grunt,ENEMY_DEFINITIONS.grunt];
  const assets=enemySpriteAssets(defs);
  assert.equal(assets.length,new Set(assets.map(v=>v.textureKey)).size);
  assert.ok(assets.includes(ENEMY_SPRITES.grunt));
  for (const rule of ENEMY_DEFINITIONS.grunt.spriteRules??[]) assert.ok(assets.includes(ENEMY_SPRITES[rule.sprite]));
  assert.ok(!assets.includes(ENEMY_SPRITES.slime));
  assert.ok(!commonBattleSprites().some(a=>assets.includes(a)));
});

test('preloading aliases does not queue duplicates, and cached textures/animations are reused',()=>{
  const {scene,requests,textures,animations}=mock();
  const assets=battlePortraitAssets('Succubus','tutorial');
  preloadSprites(scene,assets);
  assert.equal(requests.length,new Set(assets.map(v=>v.textureKey)).size);
  requests.forEach(r=>textures.add(r.key));
  preloadSprites(scene,assets);assert.equal(requests.length,textures.size);
  const visual=ENEMY_SPRITES.grunt;
  createSpriteAnimations(scene,[visual]);assert.equal(animations.size,0);
  textures.add(visual.textureKey);
  createSpriteAnimations(scene,[visual]);createSpriteAnimations(scene,[visual]);assert.equal(animations.size,1);
});

test('concurrent runtime enemy loads wait for all required sheets, share requests and build animations',async()=>{
  const {scene,requests,complete,animations}=mock();
  const assets=enemySpriteAssets([ENEMY_DEFINITIONS.grunt]);
  const one=ensureSprites(scene,assets),two=ensureSprites(scene,assets);
  assert.equal(requests.length,assets.length);
  requests.forEach(r=>complete(r.key));
  assert.equal(await one,true);assert.equal(await two,true);
  assert.equal(animations.size,assets.length);
  await ensureSprites(scene,assets);assert.equal(requests.length,assets.length);
  assert.equal(scene.load.listenerCount('filecomplete'),0);
  assert.equal(scene.events.listenerCount('shutdown'),0);
});

test('runtime load failure and scene shutdown settle without creating missing animations; failure is retryable',async()=>{
  for (const failure of ['loaderror','shutdown']) {
    const {scene,requests,complete,animations}=mock();const assets=[ENEMY_SPRITES.grunt];
    const pending=ensureSprites(scene,assets);
    if(failure==='shutdown')scene.events.emit('shutdown');
    else {const old=console.error;try{console.error=()=>{};scene.load.emit('loaderror',{key:assets[0].textureKey});}finally{console.error=old;}}
    assert.equal(await pending,false);assert.equal(animations.size,0);
    assert.equal(scene.load.listenerCount('filecomplete'),0);
    if(failure==='loaderror') {const retry=ensureSprites(scene,assets);assert.equal(requests.length,2);complete(assets[0].textureKey);assert.equal(await retry,true);}
  }
});

test('conversation preload queues only the requested conversation backgrounds and portraits',()=>{
  const source=ts.createSourceFile('conversation.ts',fs.readFileSync('src/ui/conversation.ts','utf8'),ts.ScriptTarget.Latest,true);
  const fn=source.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name.text==='preloadConversationAssets');
  const code=ts.transpileModule(fn.getText(source).replace('export ',''),{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
  let panels=0;
  const portrait=characterPortraitAssets.Succubus_normal_idle_1;
  const run=new Function('CONVERSATIONS','assets','backgroundKey','characterPortraitAssets','preloadConversationGraphite','preloadSprites',code+';return preloadConversationAssets;')(
    {a:[{background:'a.png',portrait:'Succubus_normal_idle_1'},{background:'a.png'},{background:'b.png'}],b:[{background:'other.png'}]},
    {'../../image/a.png':'a','../../image/b.png':'b','../../image/other.png':'other'},f=>'bg:'+f,characterPortraitAssets,()=>panels++,preloadSprites);
  const {scene,requests}=mock();run(scene,[]);assert.equal(panels,0);
  run(scene,['a','a']);assert.equal(panels,1);
  assert.deepEqual(requests.map(r=>r.key),[portrait.textureKey,'bg:a.png','bg:b.png']);
});

test('runtime portrait loads use image files and share alias textures without creating sprite animations',async()=>{
 const {scene,requests,complete,animations}=mock();
 const alias=characterPortraitAssets.Succubus_Death_1;
 const pending=ensureSprites(scene,[alias,alias]);
 assert.equal(requests.length,1);assert.equal(requests[0].config,undefined);
 complete(alias.textureKey);assert.equal(await pending,true);assert.equal(animations.size,0);
});
