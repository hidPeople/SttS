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
const names = ['beginPlayerPortraitFactor','applyEffectEpDamage','resolveRegularPlayerEpPeak','resolveContinuousPlayerEpPeak'];
const methods = names.map(name=>scene.members.find(n=>n.name?.getText(source)===name).getText(source)).join('\n');
const code = ts.transpileModule(`class Harness { ${methods} }`,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
const Harness = new Function('Enemy','receivedEpDamage','EFFECT_TIMINGS','EP_PEAK_FLASH_CYCLE_DURATION','PLAYER_EFFECT_X',`${code}; return Harness;`)(class Enemy {},()=>({cause:undefined}),{PlayerEpPeak:'peak',PlayerEpPeakRecovered:'recovered'},160,145);
const prefix = 'Succubus_tutorial_Starvation_';
function fresh() {
 const h=new Harness(), ctx={playerId:'Succubus',category:'tutorial',statuses:new Set(['Starvation']),relics:new Set(),hpRatio:.04,epRatio:0};
 h.portraitSelection=new PortraitSelection(['idle','EPdamage','peak'].map(t=>prefix+t+'_1'),PORTRAIT_FACTORS);
 h.refreshPlayerPortrait=()=>{h.current=h.portraitSelection.select(ctx);}; h.refreshPlayerPortrait();
 h.player={ep:1,recoverFromEpPeak:()=>{}}; h.playerBars={};
 for(const name of ['playDamageEffect','showDamageNumber','addPlayerEpDamageQuote','addEpDamageBattleLog','prepareArousalStatusForPlayerEpPeak','setEpFillImmediate','updateHud']) h[name]=()=>{};
 for(const name of ['registerPlayerEpPeakInCycle','animatePlayerEpReserveTo','runStatusTriggersForTiming','runPlayerEpPeakHooks','animateEpFillTo']) h[name]=async()=>{};
 h.modifiedPlayerEpDamage=x=>x; h.resolvePlayerEpDamageParts=()=>['C'];
 h.enemyEpAttackMotion=()=>()=>{}; h.playerEffectY=()=>200;
 h.nextPlayerEpRecoveryValue=()=>0; h.playerEpPeakRecoveryValueAfterReserveEffects=x=>x; h.playerEffectiveMaxEp=()=>10;
 h.playerPortraitFlash={peak:async()=>{}};
 return h;
}
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};

test('battle EP effect keeps damage context through peak and releases only after the full effect resolves',async()=>{
 const h=fresh(), pulse=deferred(), recovery=deferred();
 h.playerPortraitFlash.peak=()=>pulse.promise;
 h.runStatusTriggersForTiming=async timing=>{if(timing==='recovered') await recovery.promise;};
 h.applyPlayerEpDamage=async()=>{
  assert.equal(h.current,prefix+'EPdamage_1');
  await h.resolveRegularPlayerEpPeak(1,1,false);
  assert.equal(h.current,prefix+'EPdamage_1');
  return true;
 };
 const task=h.applyEffectEpDamage({},h.player,1,{source:'enemyIntent'},{messages:[]});
 assert.equal(h.current,prefix+'peak_1');
 pulse.resolve(); await new Promise(r=>setImmediate(r));
 assert.equal(h.current,prefix+'peak_1');
 recovery.resolve();await task;
 assert.equal(h.current,prefix+'idle_1');
});

test('damage and peak scopes restore portraits after early failures, including continuous peaks',async()=>{
 const h=fresh();
 h.applyPlayerEpDamage=async()=>{throw Error('interrupted');};
 await assert.rejects(h.applyEffectEpDamage({},h.player,1,{source:'enemyIntent'},{messages:[]}),/interrupted/);
 assert.equal(h.current,prefix+'idle_1');
 const release=h.beginPlayerPortraitFactor('EPdamage');
 h.registerPlayerEpPeakInCycle=async()=>{throw Error('interrupted');};
 for(const invoke of [()=>h.resolveRegularPlayerEpPeak(1,1,false),()=>h.resolveContinuousPlayerEpPeak(100)]) {
  await assert.rejects(invoke(),/interrupted/);assert.equal(h.current,prefix+'EPdamage_1');
 }
 release();assert.equal(h.current,prefix+'idle_1');
});
