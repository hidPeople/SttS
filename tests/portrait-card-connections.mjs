import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createServer } from 'vite';
const server = await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
const { PortraitSelection } = await server.ssrLoadModule('/src/models/portraitSelection.ts');
const { PORTRAIT_FACTORS } = await server.ssrLoadModule('/src/data/portraitFactors.ts');
await server.close();
const source = ts.createSourceFile('BattleScene.ts',fs.readFileSync('src/scenes/BattleScene.ts','utf8'),ts.ScriptTarget.Latest,true);
const scene = source.statements.find(n=>ts.isClassDeclaration(n)&&n.name.text==='BattleScene');
const names=['playCard','startTurnCounters','playerPortraitContext','enemyHasBodyPartStatus','bodyPartStatusForKind'];
const methods=names.map(name=>scene.members.find(n=>n.name?.getText(source)===name).getText(source)).join('\n');
const code=ts.transpileModule(`class Harness { ${methods} }`,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
const flights=[];
const Harness=new Function('RUN_STATE','EP_PEAK_BASE_FLASH_COUNT','flyCard','cardBurst',`${code};return Harness;`)({eventBattleId:'tutorial'},3,(_scene,_container,_target,options)=>flights.push(options.onComplete),()=>{});
const id=tag=>'Succubus_tutorial_'+tag+'_1';
const enemy=(status,count=1,defeated=false)=>({isDefeated:defeated,statuses:new Map(status?[[status,count]]:[]),hasStatus(s){return (this.statuses.get(s)??0)>0;}});
function fresh() {
 const h=new Harness();
 h.player={definition:{id:'Succubus'},statuses:new Map(),relicIds:[],hp:10,maxHp:10,ep:0,energy:3};
 h.enemies=[enemy()];h.enemy=h.enemies[0];h.playerEffectiveMaxEp=()=>100;
 h.portraitSelection=new PortraitSelection(['idle','seduction','EPdamage','hasInserted','hasIntruded'].map(id),PORTRAIT_FACTORS);
 h.refreshPlayerPortrait=()=>{h.current=h.portraitSelection.select(h.playerPortraitContext());};
 h.refreshPlayerPortrait();h.cardViews=new Map();h.exitingCardUids=new Set();h.cardsPlayedThisTurn=0;
 h.isModalOpen=()=>false;h.isHandCardReady=()=>true;h.cardPlayBlockReason=()=>undefined;
 h.deck={removeFromHand:()=>({})};h.targetsEnemy=()=>false;h.cardColor=()=>0;
 for(const name of ['rejectCardPlay','hideStatusTooltip','markCardExiting','renderHand','updateHud','refreshHandCardUsabilities','setPlayerSensitivityLevel']) h[name]=()=>{};
 h.statusRuntime={advance:()=>{}};h.notifyAutomaticStatusChanges=async()=>{};
 return h;
}
function play(h,cardId,cost=0) {
 h.isAnimating=false;h.isGameOver=false;
 const card={uid:cardId,definition:{id:cardId,cost}};
 const hitArea={disableInteractive(){},setInteractive(){}};
 h.cardViews.set(cardId,{card,ready:true,hitArea});
 h.playCard(card,{setDepth(){}},hitArea);
}

test('successful card use survives completed effects, interruptions, and enemy actions; any other card replaces it',async()=>{
 const h=fresh();flights.length=0;
 play(h,'seduction');assert.equal(h.current,id('seduction'));
 h.applyCardEffect=async()=>{};
 h.isGameOver=true; // Stop unrelated discard UI after executing the actual effect completion callback.
 flights.pop()();await new Promise(r=>setImmediate(r));
 h.refreshPlayerPortrait();assert.equal(h.current,id('seduction'));
 const release=h.portraitSelection.begin('EPdamage');h.refreshPlayerPortrait();assert.equal(h.current,id('EPdamage'));
 release();h.refreshPlayerPortrait();assert.equal(h.current,id('seduction'));
 play(h,'unregisteredCard');assert.equal(h.lastPortraitCardId,'unregisteredCard');assert.equal(h.current,id('idle'));
});

test('rejected or missing cards preserve last use; next player turn clears it before status notifications',async()=>{
 const h=fresh();play(h,'seduction');
 play(h,'unregisteredCard',99);assert.equal(h.lastPortraitCardId,'seduction');
 h.cardPlayBlockReason=()=> 'condition';play(h,'unregisteredCard');assert.equal(h.lastPortraitCardId,'seduction');
 h.cardPlayBlockReason=()=>undefined;h.deck.removeFromHand=()=>undefined;
 play(h,'unregisteredCard');assert.equal(h.lastPortraitCardId,'seduction');
 let notifications=0;
 h.notifyAutomaticStatusChanges=async()=>{notifications++;assert.equal(h.lastPortraitCardId,undefined);assert.equal(h.current,id('idle'));};
 await h.startTurnCounters();assert.ok(notifications>0);assert.equal(h.current,id('idle'));
});

test('connections include every live enemy and part, excluding zero stacks and defeated enemies',()=>{
 const h=fresh();
 for(const kind of ['Insert','Intruded']) for(const part of ['M','V','A']) {
  const key=kind==='Insert'?'hasInserted':'hasIntruded';
  h.enemies=[enemy(),enemy(kind+part)]; // Selected enemy is deliberately not connected.
  const c=h.playerPortraitContext();assert.equal(c[key],true);
  h.refreshPlayerPortrait();assert.equal(h.current,id(key));
  h.enemies[1].statuses.set(kind+part,0);assert.equal(h.playerPortraitContext()[key],false);
  h.enemies[1]=enemy(kind+part,1,true);assert.equal(h.playerPortraitContext()[key],false);
 }
 h.enemies=[enemy('InsertV'),enemy('IntrudedM')];
 const c=h.playerPortraitContext();assert.equal(c.hasInserted,true);assert.equal(c.hasIntruded,true);
 h.refreshPlayerPortrait();assert.equal(h.current,id('hasInserted'));
 h.enemies[0].statuses.clear();h.refreshPlayerPortrait();assert.equal(h.current,id('hasIntruded'));
});

test('connection tags combine with statuses and cards, and obey configured priorities',()=>{
 const files=['idle','Starvation','hasInserted','hasIntruded','Starvation_hasInserted_seduction'].map(id);
 const c={playerId:'Succubus',category:'tutorial',statuses:new Set(['Starvation']),relics:new Set(),hpRatio:1,epRatio:0,hasInserted:true,hasIntruded:true,lastCardId:'seduction'};
 const s=new PortraitSelection(files,PORTRAIT_FACTORS);
 assert.equal(s.select(c),id('Starvation_hasInserted_seduction'));
 c.lastCardId='other';assert.equal(s.select(c),id('Starvation'));
 const {connections,...rest}=PORTRAIT_FACTORS;
 const reordered=new PortraitSelection(files,{connections:['hasIntruded','hasInserted'],...rest});
 assert.equal(reordered.select(c),id('hasIntruded'));
 const disabled=new PortraitSelection(files,{...PORTRAIT_FACTORS,connections:[]});
 assert.equal(disabled.select(c),id('Starvation'));
});
