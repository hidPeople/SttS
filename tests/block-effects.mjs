import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { EventEmitter } from 'node:events';
const load=(file,names,dependencies={})=>{
 const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
 const text=source.statements.filter(n=>!ts.isImportDeclaration(n)).map(n=>n.getText(source).replace(/^export\s+/, '')).join('\n');
 const js=ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
 return new Function(...Object.keys(dependencies),js+';return {'+names.join(',')+'};')(...Object.values(dependencies));
};
const {blockImpact}=load('src/models/blockImpact.ts',['blockImpact']);
const {BLOCK_PRESENTATION:STYLE}=load('src/data/blockPresentation.ts',['BLOCK_PRESENTATION']);

test('only consumed block causes presentation; equal damage is a full guard and overflow breaks',()=>{
 assert.equal(blockImpact(5,3,0,true),'guard');
 assert.equal(blockImpact(5,5,0,true),'guard');
 assert.equal(blockImpact(5,7,2,true),'break');
 assert.equal(blockImpact(5,7,7,false),undefined);
 assert.equal(blockImpact(5,7,7,true),undefined);
 assert.equal(blockImpact(0,7,7,true),undefined);
 assert.equal(blockImpact(5,0,0,true),undefined);
});

const source=ts.createSourceFile('battle.ts',fs.readFileSync('src/scenes/BattleScene.ts','utf8'),ts.ScriptTarget.Latest,true);
const cls=source.statements.find(n=>ts.isClassDeclaration(n)&&n.name.text==='BattleScene');
const code=ts.transpileModule('class Battle {'+cls.members.filter(n=>['applyEffectHpDamage','showBlockResultEffect'].includes(n.name?.getText(source))).map(n=>n.getText(source)).join('\n')+'}',{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
class Player { hp=30; maxHp=30; block=5; takeHpDamage(amount){const absorbed=Math.min(this.block,amount);this.block-=absorbed;this.hp-=amount-absorbed;return amount-absorbed;} takeDirectHpDamage(amount){this.hp-=amount;} }
class Enemy extends Player {}
const Battle=new Function('Player','Enemy','blockImpact','PLAYER_EFFECT_X',code+';return Battle;')(Player,Enemy,blockImpact,145);
function battle(){
 const b=new Battle(),events=[];b.player=new Player();
 Object.assign(b,{sys:{isActive:()=>true},playerBody:{},playerEffectY:()=>250,beginPlayerPortraitFactor:()=>()=>events.push('release'),modifiedPlayerHpDamage:n=>n,enemyHpAttackMotion(){},showHpDamageBarChip(){events.push('hpBar');},playDamageEffect(){events.push('hit');},showDamageNumber(){events.push('number');},flashPlayer(){events.push('flash');},addHpDamageBattleLog(){},blockEffects:{guard(){events.push('guard');},break(){events.push('break');return new Promise(resolve=>b.finishBreak=resolve);}}});
 return {b,events};
}
test('overflow awaits the fracture lead-in before the usual HP hit; full guard never flashes player damage',async()=>{
 const {b,events}=battle();const action=b.applyEffectHpDamage({},b.player,7,{source:'enemyIntent',actor:new Enemy()},{messages:[]});
 assert.deepEqual(events,['break']);assert.equal(b.player.hp,28);assert.equal(b.player.block,0);
 b.finishBreak();await action;assert.deepEqual(events,['break','hpBar','hit','number','flash','release']);
 const full=battle();await full.b.applyEffectHpDamage({},full.b.player,5,{source:'enemyIntent',actor:new Enemy()},{messages:[]});
 assert.deepEqual(full.events,['guard','hpBar','hit','number','release']);assert.equal(full.b.player.hp,30);
});
test('self damage bypasses block and scene shutdown cancels the delayed hit safely',async()=>{
 const self=battle();await self.b.applyEffectHpDamage({},self.b.player,2,{source:'card',actor:self.b.player},{messages:[]});
 assert.equal(self.b.player.block,5);assert.ok(!self.events.includes('guard'));
 const stopped=battle();const action=stopped.b.applyEffectHpDamage({},stopped.b.player,7,{source:'enemyIntent',actor:new Enemy()},{messages:[]});
 stopped.b.sys.isActive=()=>false;stopped.b.finishBreak();await action;assert.deepEqual(stopped.events,['break','release']);
});

class Shape extends EventEmitter {
 active=true; x=0; y=0;
 setPosition(x,y){this.x=x;this.y=y;return this;}
 destroy(){this.active=false;this.emit('destroy');}
}
for(const name of ['setDepth','setScale','setStrokeStyle','setRotation','fillStyle','fillPoints','lineStyle','strokePoints','lineBetween']) Shape.prototype[name]=function(){return this;};
const pipelines=new Map();
class Sprite extends Shape {
 postPipelines=[{external:true}];
 setPostPipeline(name){const pipeline=new (pipelines.get(name))({});this.postPipelines.push(pipeline);return this;}
 removePostPipeline(pipeline){this.postPipelines=this.postPipelines.filter(p=>p!==pipeline);return this;}
}
const Phaser={GameObjects:{Sprite,Rectangle:Shape},Math:{Clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),Vector2:class {constructor(x,y){this.x=x;this.y=y;}}},Renderer:{WebGL:{Pipelines:{PostFXPipeline:class {}}}}};
const {BlockEffects}=load('src/ui/blockEffects.ts',['BlockEffects'],{Phaser,STYLE});
function scene(){
 const tweens=[],timers=[];
 const events=new EventEmitter(); // Phaser EventEmitter accepts listener context.
 const bus={once:(event,fn,context)=>events.once(event,fn.bind(context)),emit:(event)=>events.emit(event)};
 return {events:bus,sys:{renderer:{gl:{},pipelines:{addPostPipeline:(name,type)=>pipelines.set(name,type)}}},add:{graphics:()=>new Shape(),ellipse:()=>new Shape(),rectangle:()=>new Shape()},tweens:{add(config){const tween={config,removed:false,remove(){this.removed=true;}};tweens.push(tween);return tween;}},time:{delayedCall(duration,callback){const timer={duration,callback,removed:false,remove(){this.removed=true;}};timers.push(timer);return timer;}},tweenList:tweens,timerList:timers};
}
test('successive metallic effects reuse one pipeline, finish disabled, and preserve unrelated effects',()=>{
 const s=scene(),fx=new BlockEffects(s),body=new Sprite();
 fx.gain(body,0,0);const pipeline=body.postPipelines[1];assert.equal(pipeline.passes,2);assert.equal(pipeline.active,true);
 fx.guard(body,0,0);assert.equal(body.postPipelines.length,2);assert.equal(pipeline.passes,1);
 s.tweenList.findLast(t=>t.config.targets===pipeline).config.onComplete();assert.equal(pipeline.active,false);
 s.events.emit('shutdown');assert.deepEqual(body.postPipelines,[{external:true}]);assert.ok(s.tweenList.every(t=>t.removed));
});
test('shutdown resolves pending fracture without spawning shards; destroying a sprite releases its pipeline',async()=>{
 const s=scene(),fx=new BlockEffects(s),body=new Sprite();fx.gain(body,0,0);body.destroy();assert.deepEqual(body.postPipelines,[{external:true}]);
 const promise=fx.break(undefined,0,0);assert.equal(s.timerList[0].duration,STYLE.breakLeadDuration);
 s.events.emit('shutdown');await promise;assert.equal(s.timerList[0].removed,true);
});
