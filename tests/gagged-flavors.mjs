import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createServer} from 'vite';
const server=await createServer({resolve:{preserveSymlinks:true},optimizeDeps:{noDiscovery:true},server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
const m={};
try{for(const path of ['models/Combatants','models/conditions','models/localization','models/types','data/cards','data/player','data/enemies','data/statuses','data/flavorCatalog'])Object.assign(m,await server.ssrLoadModule('/src/'+path+'.ts'));}finally{await server.close();}
const {Player,Enemy,PLAYER_DEFINITION,ENEMY_DEFINITIONS,CARD_DEFINITIONS:cards,STATUS_DESCRIPTIONS:statuses,GLOBAL_FLAVORS:global}=m;
const sf=ts.createSourceFile('BattleScene.ts',fs.readFileSync('src/scenes/BattleScene.ts','utf8'),99,true);
const cls=sf.statements.find(n=>ts.isClassDeclaration(n)&&n.name.text==='BattleScene');
const names=['resolveFlavorLines','purgeCardPlayFlavors','pulloutCardPlayFlavors','isBattleLogKindBlockedByPlayerStatus'];
const code=ts.transpileModule('class Harness {'+names.map(name=>cls.members.find(n=>n.name?.getText(sf)===name).getText(sf)).join('\n')+'}',{compilerOptions:{target:99}}).outputText;
const deps={...m,l:m.text};const Harness=new Function(...Object.keys(deps),code+';return Harness;')(...Object.values(deps));
const h=new Harness();h.battleEventContext=c=>c;
function fresh(occupied='IntrudedM'){
 const player=new Player(PLAYER_DEFINITION),enemy=new Enemy(ENEMY_DEFINITIONS.grunt),other=new Enemy(ENEMY_DEFINITIONS.grunt);
 if(occupied)other.addStatus(occupied);
 return {source:'card',player,actor:player,selectedEnemy:enemy,triggerEnemy:enemy,enemies:[enemy,other],flavorValues:{statusTargetIsPlayer:true,playerSelfEpDamage:1,playerCummed:true,enemyCummed:false}};
}
const resolve=(entries,c)=>h.resolveFlavorLines(entries,c);
const quotes=lines=>lines.filter(l=>l.kind==='quote');
const narr=lines=>lines.filter(l=>l.kind==='narration');
const thought=l=>/^"\(/.test(l.text.en)&&/^「[（(]/.test(l.text.ja);
function safe(lines){for(const l of quotes(lines)){
 if(thought(l))continue;
 // Approved short utterances, including pre-existing M-specific sound effects.
 const ja=l.text.ja.replace(/[（(][^）)]*[）)]/g,'').replace(/もっと|いや/g,'').replace(/[「」んむぐぶぅうっじゅぼちるぢはぁげほがー～…♡！？、。\s!?]/g,'');
 assert.equal(ja,'','unexpected fluent Gagged quote: '+l.text.ja);
 assert.doesNotMatch(l.text.en,/phew|pwah|puha|take a breath/i);
}}
function checkWithAndWithout(entries,c,{sameNarration=true}={}){
 const actual=resolve(entries,c);safe(actual);
 const ordinary=entries.filter(e=>!e.conditions?.some(k=>k.kind==='playerState'&&k.playerState==='Gagged'));
 if(sameNarration)assert.deepEqual(narr(actual),narr(resolve(ordinary,c)));
 return actual;
}
const states=[undefined,'ExtremeFatigue','Starvation','Horny','DesperateToCum','MultipleOrgasms','OrgasmsHell','MultipleOrgasmsTorture','Horny+MultipleOrgasms','ExtremeFatigue+Starvation','Bound+Horny'];
function eventsOf(root){const events=[];function walk(value,path=''){if(!value||typeof value!=='object')return;for(const [key,item]of Object.entries(value)){if(key==='flavors')for(const [event,entries]of Object.entries(item??{}))events.push({event,entries,path});else walk(item,path+'.'+key);}}walk(root);return events;}

test('G01: defend remains silent without its relic, including Gagged',()=>{
 const c=fresh();const entries=cards.defend.flavors['card.play'];assert.equal(quotes(resolve(entries,c)).length,0);
 c.player.relicIds.push('livingClothes');const lines=checkWithAndWithout(entries,c);assert.equal(quotes(lines).length,1);assert.ok(thought(quotes(lines)[0]));
});
test('G02: failed seduction stays silent, and fatigue/M-owner/other-M priorities are valid',()=>{
 const entries=cards.seduction.flavors['card.play'];
 for(const mouth of ['InsertM','IntrudedM'])for(const state of states)for(const owner of [0,1]){
  const c=fresh();c.enemies[1].statuses.clear();c.enemies[owner].addStatus(mouth);if(state)for(const part of state.split('+'))c.player.addStatus(part);
  safe(resolve(entries,c));
  c.selectedEnemy.definition={...c.selectedEnemy.definition,intents_E:[]};assert.equal(quotes(resolve(entries,c)).length,0);
 }
});
test('G03-G07: card Play/Resolved/EnemyOrgasm handle all spoken alternatives and retain narration',()=>{
 for(const id of ['handjob','blowjob','Titjob','cowgirlRiding','rubOneOut','rubOne'])for(const event of ['card.play','card.resolved','battle.enemyOrgasm']){
  const entries=cards[id].flavors?.[event];if(!entries)continue;
  for(const mouth of ['InsertM','IntrudedM'])for(const state of states)for(const result of [false,true]){
   const c=fresh(mouth);if(state)for(const part of state.split('+'))c.player.addStatus(part);c.flavorValues.enemyCummed=result;c.flavorValues.playerWillOrgasm=result;
   checkWithAndWithout(entries,c,{sameNarration:!(id==='blowjob'&&event==='battle.enemyOrgasm')});
  }
 }
 const c=fresh();assert.equal(quotes(resolve(cards.handjob.flavors['card.resolved'],c)).length,0,'Gagged alone must not add an unrequested completion line');
});
test('G08: unrelated M occupancy overrides V/A and arousal quotes without erasing their narration',()=>{
 for(const part of ['V','A',undefined])for(const state of states){const c=fresh();if(part)c.selectedEnemy.addStatus('Insert'+part);if(state)for(const part of state.split('+'))c.player.addStatus(part);
  const lines=checkWithAndWithout(cards.reflexCaress.flavors['card.play'],c);assert.ok(narr(lines).length);}
 for(const state of states){const c=fresh();c.enemies[1].statuses.clear();c.selectedEnemy.addStatus('InsertM');if(state)for(const part of state.split('+'))c.player.addStatus(part);safe(resolve(cards.reflexCaress.flavors['card.play'],c));}
});
test('G09: dynamically generated A/V removal and pre-removal M quotes respect occupancy',()=>{
 for(const [method,ids]of [['purgeCardPlayFlavors',['IntrudedV','IntrudedA']],['pulloutCardPlayFlavors',['InsertV','InsertA','InsertM']]])for(const status of ids)for(const predict of [false,true]){
  const entries=h[method](status),c=fresh();c.purgeWillCauseOrgasm=predict;
  const lines=checkWithAndWithout(entries,c);assert.ok(quotes(lines).length);assert.ok(narr(lines).length);
 }
 // IntrudedM success text is evaluated after removal, so it must remain ordinary speech.
 const entries=statuses.IntrudedM.triggers.flatMap(t=>t.flavors?.['status.trigger']??[]);
 const c=fresh(undefined);c.enemies[1].statuses.clear();c.purgeCausedOrgasm=false;
 assert.ok(quotes(resolve(entries,c)).some(l=>!thought(l)));
});
test('G10-G11: damage bands, exhaustion, first and all repeat stages retain distinct reactions',()=>{
 const signatures=new Set();for(const value of [5,20,60,100,200,300,600]){
  const c=fresh();c.flavorValues.epDamagePercentOfRange=value;const lines=checkWithAndWithout(global['battle.playerEpDamageQuote'],c);assert.ok(quotes(lines).length);signatures.add(JSON.stringify(quotes(lines)));}
 assert.equal(signatures.size,7);
 for(const status of ['ExtremeFatigue','Starvation']){const c=fresh();c.player.addStatus(status);c.flavorValues.epDamagePercentOfRange=600;checkWithAndWithout(global['battle.playerEpDamageQuote'],c);}
 const stages=new Set();for(const flashCount of [0,1,2,3,4]){const c=fresh();c.flavorValues.flashCount=flashCount;const lines=checkWithAndWithout(global['battle.playerOrgasmRepeatQuote'],c);assert.ok(quotes(lines).length);stages.add(JSON.stringify(quotes(lines)));}assert.equal(stages.size,5);
 const c=fresh();assert.ok(quotes(checkWithAndWithout(global['battle.playerOrgasmFirstQuote'],c)).length>1);
 h.player=c.player;h.player.addStatus('Fainted');assert.equal(h.isBattleLogKindBlockedByPlayerStatus('quote'),true);
});
test('G12: status apply/trigger and nested chance outcomes preserve conditions and narrative kinds',()=>{
 let eventCount=0;
 for(const id of ['Starvation','Hunger','Aphrodisiac','MultipleOrgasms','OrgasmsHell','MultipleOrgasmsTorture','Escaping'])for(const {entries}of eventsOf(statuses[id])){
  if(!entries.some(e=>(e.lines??[e]).some(l=>l.kind==='quote')))continue;eventCount++;
  const c=fresh();c.statusOwner=c.player;checkWithAndWithout(entries,c);
 }
 assert.equal(eventCount,10);
 const c=fresh();c.flavorValues={statusTargetIsEnemy:true,statusTargetIsPlayer:false};assert.equal(quotes(resolve(statuses.Aphrodisiac.flavors['status.apply'],c)).length,0);
});
test('G13: all listed enemy actions and reactions consider another enemy occupying M',()=>{
 let eventCount=0;
 for(const id of ['ForcedOrgasmMachine','slime','aphrodisiacSlime'])for(const {event,entries}of eventsOf(ENEMY_DEFINITIONS[id])){
  if(event!=='enemy.intent'||!entries.some(e=>(e.lines??[e]).some(l=>l.kind==='quote')))continue;eventCount++;
  for(const mouth of ['InsertM','IntrudedM'])for(const state of states){const c=fresh(mouth);c.actor=c.selectedEnemy;if(state)for(const part of state.split('+'))c.player.addStatus(part);c.player.addStatus('Aftershocks',10);checkWithAndWithout(entries,c);}
 }
 assert.equal(eventCount,16);
});
test('G14: sigil counts and debilitated body/head touch do not override Gagged',()=>{
 for(const event of ['battle.portraitSigilTouch','battle.portraitBodyTouch','battle.portraitHeadTouch'])for(const touchCount of [1,2,3,4,5])for(const debilitated of [false,true])for(const aroused of [false,true])for(const mouthTouch of [false,true]){
  const c=fresh();c.flavorValues={touchCount,prologueTouchDebilitated:debilitated,prologueBeforeTurn3:false,sigilAroused:aroused,touchPartIsM:mouthTouch};safe(resolve(global[event],c));
 }
});
