import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createServer} from 'vite';
const server=await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
const {canPlayCardDuringCraving,canPlayCardWhileBound}=await server.ssrLoadModule('/src/data/cardCategories.ts');
const {evaluateConditions}=await server.ssrLoadModule('/src/models/conditions.ts');
await server.close();
const source=ts.createSourceFile('BattleScene.ts',fs.readFileSync('src/scenes/BattleScene.ts','utf8'),ts.ScriptTarget.Latest,true);
const cls=source.statements.find(n=>ts.isClassDeclaration(n)&&n.name.text==='BattleScene');
const names=['updateHud','cardPlayBlockReason','canPlayCardNow','refreshHandCardUsability','refreshHandCardUsabilities','setHandInputLocked'];
const methods=names.map(name=>cls.members.find(n=>n.name?.getText(source)===name).getText(source)).join('\n');
const code=ts.transpileModule(`class Harness {${methods}}`,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
const Harness=new Function('canPlayCardDuringCraving','canPlayCardWhileBound','evaluateConditions','localize','MAX_HAND_SIZE',code+';return Harness;')(canPlayCardDuringCraving,canPlayCardWhileBound,evaluateConditions,x=>x,10);
function setup(){
 const h=new Harness(),statuses=new Set(),text=()=>({setText(){}});
 Object.assign(h,{player:{definition:{name:'player'},hasStatus:id=>statuses.has(id),statuses,energy:2,hp:20,maxHp:30,block:0,ep:0},
 playerHud:text(),enemyHud:text(),energyText:text(),deckPileText:text(),handPileText:text(),discardPileText:text(),
 deck:{drawPile:[],hand:[],discardPile:[]},cardViews:new Map(),exitingCardUids:new Set(),handInputLocked:false,deferCardPreviewUpdates:true,
 refreshPlayerPortrait(){},updateBars(){},updateEnemyHuds(){},renderStatusIcons(){},playerEffectiveMaxEp:()=>100,isPlayerMaxEpModified:()=>false,uiText:x=>x,battleEventContext:x=>x,
 previewUpdates:0,updateCardEffectTexts(){this.previewUpdates++;}});
 const add=(uid,categories,cost=1)=>{
  const view={card:{uid,definition:{id:uid,name:uid,categories,cost,conditions:[]}},ready:true,
   container:{alpha:1,setAlpha(value){this.alpha=value;}},costText:{color:'',setColor(value){this.color=value;}},hitArea:{enabled:true,setInteractive(){this.enabled=true;},disableInteractive(){this.enabled=false;}}};
  h.cardViews.set(uid,view);h.deck.hand.push(view.card);return view;
 };
 return {h,statuses,attack:add('attack',['attack']),selfEp:add('selfEp',['lust']),add};
}
test('mid-turn craving updates existing cards while numerical previews remain deferred, and clears on removal',()=>{
 const {h,statuses,attack,selfEp}=setup();h.updateHud();assert.equal(attack.container.alpha,1);
 statuses.add('DesperateToPeak');assert.equal(h.canPlayCardNow(attack.card.definition),false);h.updateHud();
 assert.equal(attack.container.alpha,0.45);assert.equal(selfEp.container.alpha,1);assert.equal(h.previewUpdates,0);
 statuses.delete('DesperateToPeak');h.updateHud();assert.equal(attack.container.alpha,1);assert.equal(h.canPlayCardNow(attack.card.definition),true);
});
test('HUD refresh retains animation input locks, restores appearance on unlock and leaves exiting cards untouched',()=>{
 const {h,statuses,attack,selfEp}=setup();statuses.add('DesperateToPeak');h.handInputLocked=true;
 h.exitingCardUids.add(selfEp.card.uid);selfEp.container.alpha=0.2;h.updateHud();
 assert.equal(attack.hitArea.enabled,false);assert.equal(selfEp.hitArea.enabled,false);assert.equal(selfEp.container.alpha,0.2);
 h.setHandInputLocked(false);assert.equal(attack.container.alpha,0.45);assert.equal(attack.hitArea.enabled,true);assert.equal(selfEp.container.alpha,0.2);
});
test('other status restrictions and energy cost colors also stay synchronized',()=>{
 const {h,statuses,attack,add}=setup(),noMotion=add('noMotion',['utility','noMotion'],3);
 statuses.add('Bound');h.updateHud();assert.equal(attack.container.alpha,0.45);assert.equal(noMotion.container.alpha,1);assert.equal(noMotion.costText.color,'#ff4d4d');
 statuses.delete('Bound');h.player.energy=3;h.updateHud();assert.equal(attack.container.alpha,1);assert.equal(noMotion.costText.color,'#ffffff');
});
