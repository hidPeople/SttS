import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createServer } from 'vite';
const server = await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
const { PortraitSelection } = await server.ssrLoadModule('/src/models/portraitSelection.ts');
const { PORTRAIT_FACTORS } = await server.ssrLoadModule('/src/data/portraitFactors.ts');
await server.close();
const source = ts.createSourceFile('BattleScene.ts', fs.readFileSync(new URL('../src/scenes/BattleScene.ts', import.meta.url),'utf8'),ts.ScriptTarget.Latest,true);
const scene = source.statements.find(n=>ts.isClassDeclaration(n)&&n.name.text==='BattleScene');
const names = ['beginPlayerPortraitFactor','applyEffectEpDamage','resolveRegularPlayerOrgasm','resolveContinuousPlayerOrgasm'];
const methods = names.map(name=>scene.members.find(n=>n.name?.getText(source)===name).getText(source)).join('\n');
const code = ts.transpileModule(`class Harness { ${methods} }`,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
const Harness = new Function('Enemy','receivedEpDamage','EFFECT_TIMINGS','ORGASM_FLASH_CYCLE_DURATION','PLAYER_EFFECT_X',`${code}; return Harness;`)(class Enemy {},()=>({cause:undefined}),{PlayerOrgasm:'orgasm',PlayerOrgasmRecovered:'recovered'},160,145);
const prefix = 'Succubus_tutorial_Starvation_';
function fresh() {
 const h=new Harness(), ctx={playerId:'Succubus',category:'tutorial',statuses:new Set(['Starvation']),relics:new Set(),hpRatio:.04,epRatio:0};
 h.portraitSelection=new PortraitSelection(['idle','EPdamage','orgasm'].map(t=>prefix+t+'_1'),PORTRAIT_FACTORS);
 h.refreshPlayerPortrait=()=>{h.current=h.portraitSelection.select(ctx);}; h.refreshPlayerPortrait();
 h.player={ep:1,relicIds:[],recoverFromOrgasm:()=>{}}; h.playerBars={ribbon:{startOverflow:()=>()=>{}}};
 h.queuePlayerOrgasmRelicDamage=()=>{}; h.withOrgasmRelicDamage=task=>task(); h.pulseRelicIcons=()=>{};
 for(const name of ['playDamageEffect','showDamageNumber','addPlayerEpDamageQuote','addEpDamageBattleLog','prepareArousalStatusForPlayerOrgasm','setEpFillImmediate','updateHud']) h[name]=()=>{};
 for(const name of ['registerPlayerOrgasmInCycle','animatePlayerEpReserveTo','runStatusTriggersForTiming','runPlayerOrgasmHooks','animateEpFillTo','flashEpFill']) h[name]=async()=>{};
 h.modifiedPlayerEpDamage=x=>x; h.resolvePlayerEpDamageParts=()=>['C'];
 h.enemyEpAttackMotion=()=>()=>{}; h.playerEffectY=()=>200;
 h.nextPlayerEpRecoveryValue=()=>0; h.playerOrgasmRecoveryValueAfterReserveEffects=x=>x; h.playerEffectiveMaxEp=()=>10;
 h.playerPortraitFlash={orgasm:async()=>{}};
 return h;
}
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};

test('one and multiple flashes run EP flashing alongside portrait and reserve motion before recovery',async()=>{
 for(const count of [1,2,5]){
  const h=fresh(),portrait=deferred(),bar=deferred(),reserve=deferred(),calls=[];
  h.playerPortraitFlash.orgasm=(n,cycle)=>{calls.push(['portrait',n,cycle]);return portrait.promise;};
  h.flashEpFill=(bars,n)=>{assert.equal(bars,h.playerBars);calls.push(['bar',n]);return bar.promise;};
  h.animatePlayerEpReserveTo=(_value,_max,duration)=>{calls.push(['reserve',duration]);return reserve.promise;};
  let recovered=false;h.player.recoverFromOrgasm=()=>{recovered=true;};
  const task=h.resolveRegularPlayerOrgasm(count,1,false);
  await new Promise(r=>setImmediate(r));
  assert.deepEqual(calls,[['portrait',count,160],['bar',count],['reserve',count*160]]);
  portrait.resolve();reserve.resolve();await new Promise(r=>setImmediate(r));assert.equal(recovered,false);
  bar.resolve();await task;assert.equal(recovered,true);
 }
});

test('battle EP effect keeps damage context through orgasm and releases only after the full effect resolves',async()=>{
 const h=fresh(), pulse=deferred(), recovery=deferred();
 h.playerPortraitFlash.orgasm=()=>pulse.promise;
 h.runStatusTriggersForTiming=async timing=>{if(timing==='recovered') await recovery.promise;};
 h.applyPlayerEpDamage=async()=>{
  assert.equal(h.current,prefix+'EPdamage_1');
  await h.resolveRegularPlayerOrgasm(1,1,false);
  assert.equal(h.current,prefix+'EPdamage_1');
  return true;
 };
 const task=h.applyEffectEpDamage({},h.player,1,{source:'enemyIntent'},{messages:[]});
 assert.equal(h.current,prefix+'orgasm_1');
 pulse.resolve(); await new Promise(r=>setImmediate(r));
 assert.equal(h.current,prefix+'orgasm_1');
 recovery.resolve();await task;
 assert.equal(h.current,prefix+'idle_1');
});

test('damage and orgasm scopes restore portraits after early failures, including continuous orgasms',async()=>{
 const h=fresh();
 h.applyPlayerEpDamage=async()=>{throw Error('interrupted');};
 await assert.rejects(h.applyEffectEpDamage({},h.player,1,{source:'enemyIntent'},{messages:[]}),/interrupted/);
 assert.equal(h.current,prefix+'idle_1');
 const release=h.beginPlayerPortraitFactor('EPdamage');
 h.registerPlayerOrgasmInCycle=async()=>{throw Error('interrupted');};
 for(const invoke of [()=>h.resolveRegularPlayerOrgasm(1,1,false),()=>h.resolveContinuousPlayerOrgasm(100)]) {
  await assert.rejects(invoke(),/interrupted/);assert.equal(h.current,prefix+'EPdamage_1');
 }
 release();assert.equal(h.current,prefix+'idle_1');
});
