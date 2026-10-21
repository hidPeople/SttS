import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createServer } from 'vite';
const server = await createServer({ resolve: { preserveSymlinks: true }, optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
const m = {};
try { for (const name of ['models/Deck','models/Combatants','models/comboRules','models/turnEpEffects','models/cardTactics','models/conditions','models/statusRuntime','models/types','models/localization','models/RunState','models/saveCompatibility','data/cards','data/relics','data/player','data/enemies','data/statuses','data/effectBuilders']) Object.assign(m, await server.ssrLoadModule('/src/'+name+'.ts')); }
finally { await server.close(); }
const { Deck, ComboRelics, TurnEpEffects, Player, Enemy, CARD_DEFINITIONS: cards, RELIC_DEFINITIONS: relics, PLAYER_DEFINITION, ENEMY_DEFINITIONS } = m;
const source = ts.createSourceFile('battle.ts',fs.readFileSync('src/scenes/BattleScene.ts','utf8'),99,true);
const cls = source.statements.find(n=>ts.isClassDeclaration(n)&&n.name.text==='BattleScene');
const names = ['applyStatusToCombatant','canApplyEnemyBodyPartStatus','enemyHasBodyPartStatus','bodyPartStatusForKind','enemyBodyPartStatus','drawCards','executeEffect','executeEffects','effectTargets','effectRepeatCount','effectRepeatContext','resolvePlayerEpDamageParts','normalizedEpDamageParts','cardPlayBlockReason','cardPrimaryTargetEnemy','selectEnemy','cardTargetOccupancyMessage','rejectCardPlay','playCard','resolveFlavorLines','cardEffectsInExecutionOrder','effectsByPriority','isEnemyTargetEffect','queueComboEvent','flushComboActions','applyCardEffect','applyExclusiveStatus','highestStatusInGroup','nextStatusForGroup','maxStatusGroupRank','statusForGroupRank'];
const js = ts.transpileModule('class Harness {'+names.map(name=>cls.members.find(n=>n.name?.getText(source)===name).getText(source)).join('\n')+'}',{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
const deps = {...m, makeEffect:m.effect, MAX_HAND_SIZE:10, localize:m.localize, l:m.text};
const Harness = new Function(...Object.keys(deps),js+';return Harness;')(...Object.values(deps));
function fresh(ids=[]) {
 const h=new Harness();h.player=new Player({...PLAYER_DEFINITION,relics:ids,maxHp:100});h.player.hp=100;
 h.enemies=[new Enemy(ENEMY_DEFINITIONS.grunt),new Enemy(ENEMY_DEFINITIONS.grunt)];h.enemy=h.enemies[0];
 h.deck=new Deck([]);h.comboRelics=new ComboRelics();h.comboActions=[];h.events=[];h.flavors=[];h.exitingCardUids=new Set();
 h.deck.onDiscard=cards=>h.queueComboEvent({kind:'discard',count:cards.length});
 h.sys={isActive:()=>true};h.isPlayerTurn=true;h.cardsPlayedThisTurn=0;h.enemyOrgasmsThisBattle=0;
 h.battleRandom=()=>0;h.playerEpReserveValue=0;h.playerEffectiveMaxEp=()=>100;
 h.battleEventContext=c=>({source:'card',sourceName:'test',actor:h.player,player:h.player,enemies:h.enemies,selectedEnemy:h.enemy,...c});
 h.updateHud=h.addRandomAmountFlavors=()=>{};h.pulseRelicIcons=ids=>h.events.push(['pulse',...ids]);
 h.addFlavorEvent=(f,id,c)=>{if(f?.[id]?.length)h.flavors.push({id,context:c,hp:h.player.hp,low:m.evaluateConditions(f[id][0].conditions,h.battleEventContext(c))});};
 h.addGlobalFlavorEvent=()=>{};
 h.effectAmountForContext=e=>e.percentOf==='playerMaxEp'?100*e.amount:e.amount;
 h.mergeEffectExecutionResult=(a,b)=>{a.messages.push(...b.messages);for(const [k,v]of b.damagedEnemies)a.damagedEnemies.set(k,v);};
 h.counterCardTargetEnemy=()=>undefined;h.cardDisplayName=()=>'';h.cardPlayerEpDamagePreview=()=>0;h.cardWillCauseEnemyOrgasm=()=>false;
 h.runEnemyReactionsForCardSelfEpDamageTiming=async()=>{};
 h.applyEffectHpDamage=async(_e,target,amount,_c,r)=>{h.events.push(['hp',amount]);target.takeHpDamage(amount);r.damagedEnemies.set(target,amount);};
 h.applyEffectEpDamage=async(e,target,amount,c,r)=>{r.onApplied?.(c);h.events.push(['ep',target===h.player?'player':'enemy',amount,target===h.player?h.resolvePlayerEpDamageParts(e,c):[]]);if(h.cardEpTotals&&(c.damageOrigin??c.source)!=='relic')h.cardEpTotals[target===h.player?'player':'enemy']+=amount;};
 h.applyEffectStatus=async(e,target,amount)=>{h.events.push(['status',e.status]);target.addStatus(e.status,amount);};
 h.applyEffectEnergyGain=amount=>{h.player.energy+=amount;};h.renderHand=async()=>{};h.defeatEnemy=async()=>{};
 h.setPlayerEpReserveValue=value=>{h.playerEpReserveValue=value;};h.setPlayerEpByEffect=async value=>{h.player.ep=value;};
 return h;
}
const context=(h,card)=>h.battleEventContext({card,cardOrgasmStart:h.player.orgasmsThisBattle});

test('shared connection rules choose V/A/M, preserve data order, reject intrusion and require connection only without fallback',()=>{
 const h=fresh();h.enemy.addStatus('InsertM');h.enemies[1].addStatus('InsertV');
 assert.deepEqual(m.connectedParts(cards.hazyPiston,h.enemies),['V','M']);
 assert.equal(m.connectedTargets(cards.hazyPiston,h.enemies).length,2);
 assert.deepEqual(m.connectedTargets(cards.feverPiston,h.enemies),[h.enemies[1]]);
 h.enemy.statuses.clear();h.enemies[1].statuses.clear();h.enemy.addStatus('IntrudedV');h.player.addStatus('Aftershocks',2);
 assert.equal(h.cardPlayBlockReason(cards.hazyPiston),'condition');
 h.player.addStatus('TurnedOn');assert.equal(h.cardPlayBlockReason(cards.feverPiston),undefined);
});
test('sequence checks HP and stacks before every cycle, calls pre-payment flavor, and caps cycles',async()=>{
 const h=fresh();h.enemy.addStatus('InsertM');h.player.hp=6;h.player.addStatus('Aftershocks',20);
 await h.executeEffects(cards.hazyPiston.effects,context(h,cards.hazyPiston));
 assert.equal(h.player.hp,2);assert.equal(h.player.statuses.get('Aftershocks'),16);
 assert.deepEqual(h.flavors.map(f=>[f.hp,f.low]),[[6,false],[4,true]]);
 assert.deepEqual(h.events.filter(e=>e[1]==='player').map(e=>e[3]),[['M'],['M']]);
 const capped=fresh();capped.enemy.addStatus('InsertV');capped.player.addStatus('Aftershocks',20);
 await capped.executeEffects(cards.hazyPiston.effects,context(capped,cards.hazyPiston));assert.equal(capped.player.hp,90);
 const insufficient=fresh();insufficient.enemy.addStatus('InsertA');insufficient.player.addStatus('Aftershocks',1);
 await insufficient.executeEffects(cards.hazyPiston.effects,context(insufficient,cards.hazyPiston));assert.deepEqual(insufficient.events,[]);
});
test('sequence pays once per cycle for several targets and finishes self hits after last enemy dies',async()=>{
 const h=fresh();h.enemy.addStatus('InsertV');h.enemies[1].addStatus('InsertA');h.player.addStatus('Aftershocks',20);
 const hit=h.applyEffectEpDamage;h.applyEffectEpDamage=async(...args)=>{await hit(...args);if(args[1]!==h.player)args[1].hp=0;};
 await h.executeEffects(cards.hazyPiston.effects,context(h,cards.hazyPiston));
 assert.equal(h.player.hp,98);assert.equal(h.player.statuses.get('Aftershocks'),18);
 assert.deepEqual(h.events.filter(e=>e[1]==='player').map(e=>e[3]),[['V'],['A']]);
});
test('rounded block conversion spends once and enemy block still absorbs the ordinary HP hit',async()=>{
 for(const block of [1,3,8]){const h=fresh();h.player.block=block;h.enemy.block=1;const hp=h.enemy.hp;
 await h.executeEffects(cards.thornArmor.effects,context(h,cards.thornArmor));const amount=Math.ceil(block/2);
 assert.equal(h.player.block,block-amount);assert.equal(h.enemy.hp,hp-Math.max(0,amount-1));}
});
test('reserve gain raises current EP without damage and rejects insufficient cap room',async()=>{
 const h=fresh();h.playerEpReserveValue=80;h.player.ep=50;
 assert.equal(h.cardPlayBlockReason(cards.sensitization),undefined);
 await h.executeEffects(cards.sensitization.effects,context(h,cards.sensitization));assert.equal(h.playerEpReserveValue,90);assert.equal(h.player.ep,90);
 assert.equal(h.events.filter(e=>e[0]==='ep').length,0);assert.equal(h.cardPlayBlockReason(cards.sensitization),'condition');
 assert.ok(cards.sensitization.categories.includes('utility'));assert.ok(!cards.sensitization.categories.includes('lust'));
});
test('conditional final status checks whole card resolution and runs after self damage',async()=>{
 for(const orgasm of [false,true]){const h=fresh();const hit=h.applyEffectEpDamage;
 h.applyEffectEpDamage=async(...args)=>{await hit(...args);if(orgasm&&args[1]===h.player)h.player.orgasmsThisBattle++;};
 await h.applyCardEffect({definition:cards.feverPiston},h.enemy);
 assert.equal(h.player.hasStatus('Horny'),!orgasm);if(!orgasm)assert.equal(h.events.at(-1)[0],'status');}
});
test('discard recall excludes in-use cards, respects capacity, and preserves instances',()=>{
 const deck=new Deck([]);const a=deck.addToHand(cards.reflexCaress),b=deck.addToHand(cards.reflexCaress);deck.addToDiscard(deck.removeFromHand(a.uid));
 assert.deepEqual(deck.recallFromDiscard(1),[]);assert.deepEqual(deck.recallFromDiscard(2),[a]);assert.ok(deck.hand.includes(b));
 assert.equal(cards.reflexCaress.effects.length,1);assert.equal(cards.reflexCaress.effects[0].amount,3);assert.equal(cards.reflexCaress.effects[0].target,'selectedEnemy');
});
test('copy preserves growth, overrides and provenance through serialization; cannot copy itself',()=>{
 const deck=new Deck([]);const source=deck.addToHand({...cards.adapt,categories:['caress']});m.growUnchosenEffects(source,source.definition.effects[0],0);
 const copy=deck.copyToHand(source,'professionalism',10);assert.equal(copy.definition.cost,0);assert.equal(copy.definition.temporary,true);
 assert.deepEqual(copy.choiceGrowth,source.choiceGrowth);assert.notEqual(copy.choiceGrowth,source.choiceGrowth);
 assert.equal(m.canCopyCard(source,relics.professionalism),true);assert.equal(m.canCopyCard(copy,relics.professionalism),false);
 const restored=new Deck([]);restored.restore(deck.snapshot(),cards);assert.equal(restored.hand[1].definition.cost,0);assert.equal(restored.hand[1].definition.temporary,true);assert.equal(restored.hand[1].copiedByRelic,'professionalism');
 assert.equal(deck.copyToHand(source,'professionalism',2),undefined);
});
test('discard counters include inspection and normal end turn, exclude played/temporary/retained cards, preserve remainder',()=>{
 const h=fresh(['burusera']);const a=h.deck.addToHand(cards.strike),b=h.deck.addToHand(cards.defend),t=h.deck.addToHand(cards.projectileX);
 h.deck.addToDiscard(h.deck.removeFromHand(a.uid));assert.equal(h.comboActions.length,0);
 h.deck.discardHand(new Set([b.uid,t.uid]));assert.deepEqual(h.deck.hand,[b]);assert.ok(h.deck.exhaustedPile.includes(t));assert.equal(h.comboActions.length,0);
 h.deck.drawPile=[a];h.deck.discardPile=[];h.deck.resolveInspection([a],new Set(),new Set([a.uid]),10);
 h.deck.discardHand();assert.equal(h.comboActions.length,0);const snap=h.comboRelics.snapshot();
 const restored=new ComboRelics();restored.restore(snap);assert.equal(restored.dispatch({kind:'discard',count:1},[relics.burusera]).length,1);
});
test('combo rules round per event and exclude first/same status application by group transition',async()=>{
 const runtime=new ComboRelics();assert.equal(runtime.dispatch({kind:'overheal',amount:1},[relics.reciprocity])[0].effect.amount,1);
 assert.equal(runtime.dispatch({kind:'overheal',amount:0},[relics.reciprocity]).length,0);
 assert.equal(runtime.dispatch({kind:'exhaustGenerated',count:3},[relics.todaysTreat]).length,3);
 const h=fresh(['heroicAppetite']);h.applyExclusiveStatus(h.player,'Horny','arousal');assert.equal(h.comboActions.length,0);
 h.applyExclusiveStatus(h.player,'Horny','arousal');assert.equal(h.comboActions.length,1);
 h.player.statuses.clear();h.player.addStatus('DesperateToCum');h.comboActions=[];h.applyExclusiveStatus(h.player,'Horny','arousal');assert.equal(h.comboActions.length,0);
});
test('self-only card activation occurs once, excludes relic damage to both sides, and excludes shared/card counter enemy damage',async()=>{
 for(const [enemyOrigin,expected]of[[undefined,true],['relic',true],['card',false]]){
  const h=fresh(['provocateur']);const hit=h.applyEffectEpDamage;
  h.applyEffectEpDamage=async(...args)=>{await hit(...args);if(args[1]===h.player&&enemyOrigin)await hit(m.effect('epDamage','selectedEnemy',2),h.enemy,2,{source:enemyOrigin},args[4]);};
  const card={...cards.reflexCaress,effects:[m.effect('epDamage','player',1)]};await h.applyCardEffect({definition:card},h.enemy);
  assert.equal(h.events.some(e=>e[0]==='pulse'&&e[1]==='provocateur'),expected);
 }
});
test('retaliation stacks independently, serializes enemy indices, and expires together at next turn',()=>{
 const h=fresh(),links=new TurnEpEffects();links.retaliate(h.enemy,4,2);links.retaliate(h.enemy,4,2);
 const restored=new TurnEpEffects();restored.restore(links.snapshot(h.enemies),h.enemies);assert.equal(restored.retaliations(h.enemy).length,2);restored.clear();assert.deepEqual(restored.retaliations(h.enemy),[]);
});


test('automatic draw overflow resolves discard relics even with a full hand and no card effect',async()=>{
 const h=fresh(['burusera']);h.deck.onDiscard=cards=>h.queueComboEvent({kind:'discard',count:cards.length});
 for(let i=0;i<10;i++)h.deck.addToHand(cards.strike);
 h.deck.drawPile=new Deck([cards.strike,cards.strike,cards.strike]).drawPile;
 h.runCardDrawnHooks=()=>assert.fail('no cards entered hand');
 const drawn=await h.drawCards(3,true);
 assert.equal(drawn.length,0);assert.equal(h.comboActions.length,0);
 assert.equal(h.events.filter(e=>e[0]==='ep'&&e[1]==='enemy').length,1);
});

test('reprisal can be played against an EP-less enemy and uses the ordinary zero EP damage presentation',async()=>{
 const h=fresh();h.turnEpEffects=new TurnEpEffects();h.enemy=new Enemy(ENEMY_DEFINITIONS.slime);h.enemies=[h.enemy];
 assert.equal(h.cardPlayBlockReason(cards.reprisal),undefined);
 await h.executeEffects(cards.reprisal.effects,context(h,cards.reprisal));
 assert.deepEqual(h.turnEpEffects.retaliations(h.enemy),[]);
 assert.ok(h.events.some(e=>e[0]==='ep'&&e[1]==='enemy'&&e[2]===0));
});

test('combo flavor fires once per applied action, preserves random target and never runs without an application', async () => {
 const all=fresh(['provocateur']);all.queueComboEvent({kind:'selfOnlyEp'});
 await all.flushComboActions({messages:[],damagedEnemies:new Map()});
 assert.equal(all.events.filter(e=>e[0]==='ep').length,2);
 assert.equal(all.flavors.length,1);
 assert.equal(all.flavors[0].id,m.FLAVOR_EVENTS.Relic.Trigger);
 assert.equal(all.flavors[0].context.selectedEnemy,undefined,'all-enemy flavor must not imply a single target');
 assert.equal(all.events.filter(e=>e[0]==='pulse').length,1);
 const random=fresh(['todaysTreat']);random.queueComboEvent({kind:'exhaustGenerated',count:2});
 await random.flushComboActions({messages:[],damagedEnemies:new Map()});
 assert.equal(random.events.filter(e=>e[0]==='ep').length,2,'damage still applies per removed card');
 assert.equal(random.flavors.length,1,'one removal operation announces once');
 assert.ok(random.flavors.every(f=>f.context.selectedEnemy===random.enemy&&f.context.relic.id==='todaysTreat'));
 const noTarget=fresh(['burusera']);noTarget.enemies=[];noTarget.queueComboEvent({kind:'discard',count:3});
 await noTarget.flushComboActions({messages:[],damagedEnemies:new Map()});assert.equal(noTarget.flavors.length,0);
 const unapplied=fresh(['provocateur']);unapplied.queueComboEvent({kind:'selfOnlyEp'});
 unapplied.executeEffects=async()=>({messages:[],damagedEnemies:new Map()});
 await unapplied.flushComboActions({messages:[],damagedEnemies:new Map()});assert.equal(unapplied.flavors.length,0);
});

test('nested callbacks from another source cannot announce a combo relic', async () => {
 const h=fresh(['provocateur']);h.queueComboEvent({kind:'selfOnlyEp'});
 h.executeEffects=async (_effects,c,onApplied)=>{
  onApplied({...c,source:'card'});onApplied({...c,relic:relics.burusera});
  assert.equal(h.flavors.length,0);onApplied(c);onApplied(c);
  return {messages:[],damagedEnemies:new Map()};
 };
 await h.flushComboActions({messages:[],damagedEnemies:new Map()});assert.equal(h.flavors.length,1);
});

test('removal flavor batches are separate per operation and use the first applied target', async () => {
 const h=fresh(['todaysTreat']);
 h.queueComboEvent({kind:'exhaustGenerated',count:3});
 h.queueComboEvent({kind:'exhaustGenerated',count:2});
 let calls=0;
 h.battleRandom=()=>calls===0?0:0.99;
 h.executeEffects=async (_effects,c,onApplied)=>{
  calls++;
  if(calls!==1) onApplied(c);
  return {messages:[],damagedEnemies:new Map()};
 };
 await h.flushComboActions({messages:[],damagedEnemies:new Map()});
 assert.equal(calls,5);
 assert.equal(h.flavors.length,2,'separate removal operations each announce even in one flush');
 assert.ok(h.flavors.every(f=>f.context.selectedEnemy===h.enemies[1]),'an unapplied first action does not consume the batch');
 h.queueComboEvent({kind:'exhaustGenerated',count:0});
 await h.flushComboActions({messages:[],damagedEnemies:new Map()});assert.equal(h.flavors.length,2);
 h.queueComboEvent({kind:'exhaustGenerated',count:1});
 await h.flushComboActions({messages:[],damagedEnemies:new Map()});assert.equal(h.flavors.length,3);
});


test('oral target restriction recognizes insertion/intrusion, permits its owner and ignores defeated owners',()=>{
 for(const status of ['InsertM','IntrudedM']){
  const h=fresh();h.enemies[1].addStatus(status);
  assert.equal(h.cardPlayBlockReason(cards.blowjob),'condition');
  const failure=m.targetOccupancyFailure(cards.blowjob,h.enemy,h.enemies);
  assert.equal(failure.enemy,h.enemies[1]);assert.equal(failure.part,'M');
  assert.equal(failure.occupancy,status==='InsertM'?'insert':'intruded');
  h.enemy=h.enemies[1];assert.equal(h.cardPlayBlockReason(cards.blowjob),undefined);
  h.enemy=h.enemies[0];h.enemies[1].hp=0;assert.equal(h.cardPlayBlockReason(cards.blowjob),undefined);
 }
});
test('riding cards reject unrelated targets, retain both connected effects, and block only fully intruded free routes',()=>{
 for(const id of ['cowgirlRiding','feverPiston']){
  const h=fresh();h.player.addStatus('TurnedOn');const card=cards[id];
  h.enemies[1].addStatus('InsertA');
  assert.equal(h.cardPlayBlockReason(card),'condition');
  h.enemy=h.enemies[1];assert.equal(h.cardPlayBlockReason(card),undefined);
  assert.equal(h.cardPrimaryTargetEnemy(card,h.enemy),h.enemy);
  h.enemies[0].addStatus('InsertV');
  assert.deepEqual(h.effectTargets(card.effects[0],context(h,card)),[h.enemies[0],h.enemies[1]]);
  assert.equal(h.cardPrimaryTargetEnemy(card,h.enemy),h.enemies[1]);
  h.enemies.forEach(e=>e.statuses.clear());h.enemies[0].addStatus('IntrudedV');
  assert.equal(h.cardPlayBlockReason(card),undefined);
  h.enemy=h.enemies[0];assert.equal(h.cardPlayBlockReason(card),undefined);
  h.enemies[1].addStatus('IntrudedA');assert.equal(h.cardPlayBlockReason(card),'condition');
  assert.equal(m.targetOccupancyFailure(card,h.enemy,h.enemies).kind,'full');
  h.enemies[1].hp=0;assert.equal(h.cardPlayBlockReason(card),undefined);
 }
});
test('riding self damage follows the A fallback created before effects',async()=>{
 for(const id of ['cowgirlRiding','feverPiston']){
  const h=fresh();h.enemies[1].addStatus('IntrudedV');
  h.runEnemyReactionsForCardSelfEpDamageTiming=async()=>h.enemy.addStatus('InsertA');
  await h.applyCardEffect({definition:cards[id]},h.enemy);
  assert.deepEqual(h.events.filter(e=>e[1]==='player').map(e=>e[3]),[['A']]);
 }
});
test('target rejection precedes card removal and energy spending and logs the occupying enemy',()=>{
 for(const id of ['blowjob','bite']) {
 const h=fresh();h.enemies[1].addStatus('IntrudedM');h.player.energy=5;
 const card={uid:123,definition:cards[id]},container={x:10};
 h.isModalOpen=()=>false;h.cardViews=new Map([[123,{}]]);h.isHandCardReady=()=>true;
 h.tweens={add:()=>{}};h.deck.hand=[card];const logs=[];h.addBattleLog=(kind,text)=>logs.push({kind,text});
 h.interpolateFlavorText=(text,c)=>({en:text.en.replace('{enemy}',c?.triggerEnemy===h.enemies[1]?'Grunt 2':'').replace('{defaultM}','mouth'),ja:text.ja.replace('{enemy}',c?.triggerEnemy===h.enemies[1]?'下級兵2':'').replace('{defaultM}','口')});
 h.playCard(card,container,{});
 assert.equal(h.player.energy,5);assert.deepEqual(h.deck.hand,[card]);assert.equal(h.cardsPlayedThisTurn,0);
 assert.equal(logs[0].text.ja,'口は下級兵2に侵入されている。');assert.match(logs[0].text.en,/Grunt 2.*intruded/);
 }
});
test('intruded riding quotes respect state priority and Gagged without replacing narration',()=>{
 for(const id of ['cowgirlRiding','feverPiston'])for(const part of ['V','A']){
  const h=fresh();h.enemy.addStatus('Intruded'+part);const entries=cards[id].flavors[m.FLAVOR_EVENTS.Card.Play];
  const quote=()=>h.resolveFlavorLines(entries,context(h,cards[id])).find(l=>l.kind==='quote').text.ja;
  assert.match(quote(),/ほんとに/);h.player.addStatus('Horny');assert.match(quote(),/だめなのに/);
  h.player.addStatus('MultipleOrgasms');assert.match(quote(),/ダメだって/);
  h.enemies[1].addStatus('IntrudedM');assert.match(quote(),/んぐ/);
  assert.ok(h.resolveFlavorLines(entries,context(h,cards[id])).some(l=>l.kind==='narration'));
 }
});

test('riding refusal logs identify the actual part or both full parts and preserve card resources',()=>{
 for(const id of ['cowgirlRiding','feverPiston'])for(const blocked of ['InsertV','InsertA','full']){
  const h=fresh();h.player.addStatus('TurnedOn');h.player.energy=5;
  if(blocked==='full'){h.enemy.addStatus('IntrudedV');h.enemies[1].addStatus('IntrudedA');}
  else h.enemies[1].addStatus(blocked);
  h.isModalOpen=()=>false;h.cardViews=new Map([[123,{}]]);h.isHandCardReady=()=>true;h.tweens={add:()=>{}};
  const card={uid:123,definition:cards[id]};h.deck.hand=[card];let logged;
  h.addBattleLog=(_kind,text)=>{logged=text;};
  h.interpolateFlavorText=(text,c)=>({en:text.en,ja:text.ja.replace('{defaultV}','V部位').replace('{defaultA}','A部位').replace('{enemy}',c?.triggerEnemy===h.enemies[1]?'下級兵2':'')});
  h.playCard(card,{x:10},{});
  assert.equal(logged.ja,blocked==='full'?'V部位とA部位が両方埋まっていて挿入できない。':blocked.slice(-1)+'部位は下級兵2に挿入されている。');
  assert.equal(h.player.energy,5);assert.deepEqual(h.deck.hand,[card]);assert.equal(h.cardsPlayedThisTurn,0);
 }
});

test('selecting a different enemy immediately refreshes card usability',()=>{
 const h=fresh();h.enemies[1].addStatus('InsertM');h.isModalOpen=()=>false;
 h.enemyViews=h.enemies.map(enemy=>({enemy}));h.updateReticlePosition=h.updateCardEffectTexts=()=>{};
 const reasons=[];h.refreshHandCardUsabilities=()=>reasons.push(h.cardPlayBlockReason(cards.blowjob));
 h.selectEnemy(1);h.selectEnemy(0);assert.deepEqual(reasons,[undefined,'condition']);
});

test('actual enemy reaction conditions retain the free A fallback and reject occupied A',()=>{
 const h=fresh();h.enemies[1].addStatus('IntrudedV');
 const rules=h.enemy.definition.reactionRules;
 const direct=rules.find(r=>r.id==='maleInsertV'),fallback=rules.find(r=>r.id==='maleInsertAWhenVOccupied');
 const c={...context(h,cards.cowgirlRiding),actor:h.enemy};
 assert.equal(m.evaluateConditions(direct.conditions,c),false);
 assert.equal(m.evaluateConditions(fallback.conditions,c),true);
 h.enemies[1].addStatus('IntrudedA');assert.equal(m.evaluateConditions(fallback.conditions,c),false);
});

test('one enemy cannot receive two insertions; separate enemies and intrusion rules are preserved',()=>{
 for(const from of ['InsertM','InsertV','InsertA'])for(const to of ['InsertM','InsertV','InsertA']){
  const h=fresh();h.statusRuntime=new m.StatusRuntime();
  assert.equal(h.applyStatusToCombatant(h.enemy,from,1).changed,true);
  assert.equal(h.applyStatusToCombatant(h.enemy,to,1).changed,false);
  assert.deepEqual([...h.enemy.statuses.keys()],[from]);
  assert.equal(h.applyStatusToCombatant(h.enemies[1],to,1).changed,from!==to);
  h.enemy.statuses.delete(from);
  if(from===to)assert.equal(h.applyStatusToCombatant(h.enemy,to,1).changed,true);
 }
 const h=fresh();h.statusRuntime=new m.StatusRuntime();
 assert.equal(h.applyStatusToCombatant(h.enemy,'IntrudedV',1).changed,true);
 assert.equal(h.applyStatusToCombatant(h.enemy,'IntrudedA',1).changed,true,'intrusion may span parts');
 assert.equal(h.applyStatusToCombatant(h.enemies[1],'InsertV',1).changed,false,'occupied part stays blocked');
 assert.equal(h.applyStatusToCombatant(h.enemies[1],'InsertM',1).changed,true);
});

test('cards reject an existing insertion outside their parts before spending resources',()=>{
 for(const [id,part] of [['blowjob','V'],['blowjob','A'],['cowgirlRiding','M'],['feverPiston','M']]){
  const h=fresh();h.enemy.addStatus('Insert'+part);h.player.addStatus('TurnedOn');h.player.energy=5;
  assert.deepEqual(m.targetOccupancyFailure(cards[id],h.enemy,h.enemies),{kind:'occupied',part,enemy:h.enemy,occupancy:'insert'});
  h.isModalOpen=()=>false;h.cardViews=new Map([[123,{}]]);h.isHandCardReady=()=>true;h.tweens={add:()=>{}};
  const card={uid:123,definition:cards[id]};h.deck.hand=[card];let logged;
  h.addBattleLog=(_kind,text)=>{logged=text;};
  h.interpolateFlavorText=(text,c)=>({en:text.en,ja:text.ja.replace(`{default${part}}`,part+'部位').replace('{enemy}',c?.triggerEnemy===h.enemy?'対象の敵':'')});
  h.playCard(card,{x:10},{});
  assert.equal(logged.ja,part+'部位は対象の敵に挿入されている。');
  assert.equal(h.player.energy,5);assert.deepEqual(h.deck.hand,[card]);assert.equal(h.cardsPlayedThisTurn,0);
 }
});

test('caress narration follows the selected connection and Gagged takes quote priority',()=>{
 for(const id of ['handjob','blowjob','titjob']){
  const h=fresh(),entries=cards[id].flavors[m.FLAVOR_EVENTS.Card.Play];
  const choose=()=>h.resolveFlavorLines(entries,context(h,cards[id]));
  const narration=()=>choose().find(l=>l.kind==='narration').text.ja;
  h.enemy.addStatus('InsertM');
  const expected=id==='handjob'?/姿勢を変えず/:id==='blowjob'?/そのまま続ける/:/顔の位置を変えず/;
  assert.match(narration(),expected);
  assert.equal(choose().find(l=>l.kind==='quote').text.ja,'「んぐっ……っ！」');
  h.enemy.statuses.clear();h.enemies[1].addStatus('InsertM');
  assert.doesNotMatch(narration(),expected,'another enemy occupying M must not select this narration');
  h.enemies[1].statuses.clear();
  for(const part of ['V','A']){
   h.enemy.statuses.clear();h.enemy.addStatus('Insert'+part);
   if(id==='handjob')assert.match(narration(),expected);
   if(id==='titjob')assert.match(narration(),/からかうように/);
  }
 }
});
