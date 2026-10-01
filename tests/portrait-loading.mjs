import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import fs from 'node:fs';
import ts from 'typescript';
const server=await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
const m={};
try {for (const file of ['models/portraitSelection','models/portraitLoading','models/portraitPreload','data/portraitFactors','data/effectBuilders','models/portraitAssets','models/Combatants','models/statusRuntime','models/RunState','models/sceneAssets','data/player','data/enemies','data/statuses','data/eventBattles','models/types']) Object.assign(m,await server.ssrLoadModule('/src/'+file+'.ts'));} finally {await server.close();}
const {PortraitSelection,PortraitLoading,portraitEffectPreloadIds,PORTRAIT_FACTORS,effect,characterPortraitAssets}=m;
const ctx=(overrides={})=>({playerId:'P',category:'tutorial',statuses:new Set(['Starvation']),statusStacks:new Map([['Starvation',1]]),relics:new Set(),hpRatio:.5,epRatio:0,...overrides});
const names=['Starvation_idle','Starvation_hover','Starvation_EPdamage','Starvation_EPdamage_hover','Starvation_orgasm','Starvation_HPdamage','Starvation_EPgte50per','Starvation_EPgte50per_hover','Faintedgte2','idle','hover','seduction','seduction_hover','InHeat','InHeat_hover','hasInserted','hasInserted_EPdamage'];
const ids=names.map(name=>'P_tutorial_'+name+'_1');
const selection=()=>new PortraitSelection([...ids,'P_normal_idle_1','Q_tutorial_idle_1','P_other_idle_1'],PORTRAIT_FACTORS,()=>0);
const named=name=>'P_tutorial_'+name+'_1';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('initial prefetch includes only current and hover, including actual tutorial state',()=>{
 const s=selection();assert.deepEqual(new Set(s.preloadIds(ctx())),new Set([named('Starvation_idle'),named('Starvation_hover')]));
 assert.deepEqual(new Set(s.preloadIds(ctx({epRatio:.6}))),new Set([named('Starvation_EPgte50per'),named('Starvation_EPgte50per_hover')]));
 const actual=new PortraitSelection(Object.keys(characterPortraitAssets),PORTRAIT_FACTORS);
 const initial=actual.preloadIds({...ctx(),playerId:'Succubus'});
 assert.deepEqual(new Set(initial),new Set(['Succubus_tutorial_Starvation_idle_1','Succubus_tutorial_Starvation_hover_1']));
});

test('forecast does not consume randomness, mutate status state or change restoration history',()=>{
 let draws=0;const s=new PortraitSelection([...ids,named('Starvation_idle').replace('_1','_2')],PORTRAIT_FACTORS,()=>{draws++;return 0;});
 const c=ctx(),original=s.select(c),before=draws;
 const effects=[effect('epDamage','player',1),effect('status','player',2,{status:'Fainted'})];
 const expected=portraitEffectPreloadIds(s,c,effects,false);
 assert.ok(expected.includes(named('Starvation_EPdamage')));assert.ok(expected.includes(named('Starvation_orgasm')));assert.ok(expected.includes(named('Faintedgte2')));
 assert.equal(draws,before);assert.deepEqual([...c.statusStacks],[['Starvation',1]]);assert.deepEqual([...c.statuses],['Starvation']);assert.equal(s.select(c),original);
 const release=s.begin('EPdamage');const current=s.select(c);s.preloadIds(c,['orgasm']);assert.equal(s.select(c),current);release();assert.equal(s.select(c),original);
});

test('card effect forecast includes card/hover, status upgrades and enemy connection before damage',()=>{
 const c=ctx({statuses:new Set(['Horny']),statusStacks:new Map([['Horny',1]]),lastCardId:'seduction'}),s=selection();
 const plans=portraitEffectPreloadIds(s,c,[effect('status','player',1,{status:'Horny'})],true);
 for(const name of ['seduction','seduction_hover','InHeat','InHeat_hover']) assert.ok(plans.includes(named(name)),name);
 const connected=portraitEffectPreloadIds(s,ctx({statuses:new Set(),statusStacks:new Map()}),[effect('status','self',1,{status:'InsertV'}),effect('epDamage','player',1)],false);
 assert.ok(connected.includes(named('hasInserted')));assert.ok(connected.includes(named('hasInserted_EPdamage')));
 const enemyOnly=portraitEffectPreloadIds(s,ctx(),[effect('epDamage','self',100)],false);
 assert.ok(!enemyOnly.includes(named('Starvation_EPdamage')));
});

test('status removal prefetches return state, and overlapping event scope remains active',()=>{
 const s=selection(),c=ctx();const end=s.begin('EPdamage');
 assert.ok(s.preloadIds(c).includes(named('Starvation_EPdamage_hover')));
 const removed=portraitEffectPreloadIds(s,c,[effect('removeStatus','player',0,{status:'Starvation'})],true);
 assert.ok(removed.includes(named('idle')));assert.ok(removed.includes(named('hover')));end();
});

function loader() {
 const ready=new Set(['idle']),jobs=[],shown=[];
 const loading=new PortraitLoading(id=>ready.has(id),ids=>{const d=deferred();jobs.push({ids,...d});return d.promise;},id=>shown.push(id),'idle');
 const finish=async(index,success=true)=>{if(success)jobs[index].ids.forEach(id=>ready.add(id));jobs[index].resolve(success);await tick();};
 return {loading,ready,jobs,shown,finish};
}

test('foreground loads without hiding old art or waiting for hover, and cached return is immediate',async()=>{
 const {loading,jobs,shown,finish}=loader();
 loading.show('damage',['damage','damageHover']);
 assert.deepEqual(shown,[]);assert.deepEqual(jobs.map(j=>j.ids),[['damageHover'],['damage']]);
 await finish(1);assert.deepEqual(shown,['damage']);
 loading.show('idle');assert.deepEqual(shown,['damage','idle']);
 await finish(0);assert.deepEqual(shown,['damage','idle']);
});

test('out-of-order completion, released transient state and scene shutdown never show stale images',async()=>{
 const a=loader();a.loading.show('damage');a.loading.show('orgasm');
 await a.finish(1);await a.finish(0);assert.deepEqual(a.shown,['orgasm']);
 const b=loader();b.loading.show('damage');b.loading.show('idle');await b.finish(0);assert.deepEqual(b.shown,[]);
 const c=loader();c.loading.show('damage');c.loading.dispose();await c.finish(0);assert.deepEqual(c.shown,[]);
});

test('repeated HUD refreshes do not requeue loads; failures keep old image and allow a later visit to retry',async()=>{
 const a=loader();for(let i=0;i<5;i++)a.loading.show('damage',['damageHover']);
 assert.equal(a.jobs.length,2);await a.finish(1,false);assert.deepEqual(a.shown,[]);
 a.loading.show('idle');a.loading.show('damage');assert.equal(a.jobs.length,3);await a.finish(2);assert.deepEqual(a.shown,['damage']);
 await a.finish(0);
});

test('battle preload restores vitals/statuses before selecting art and only loads the current pools',()=>{
 const source=ts.createSourceFile('BattleScene.ts',fs.readFileSync('src/scenes/BattleScene.ts','utf8'),ts.ScriptTarget.Latest,true);
 const cls=source.statements.find(n=>ts.isClassDeclaration(n)&&n.name.text==='BattleScene');
 const names=['preload','restorePlayerForBattle','playerPortraitContext','setPlayerSensitivityLevel','clearPlayerSensitivityStatusesForPart','sensitivityLevelForProgress','playerEffectiveMaxEp','enemyHasBodyPartStatus','bodyPartStatusForKind'];
 const code=ts.transpileModule('class Harness {'+names.map(name=>cls.members.find(n=>n.name?.getText(source)===name).getText(source)).join('\n')+'}',{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
 const state={...m.RUN_STATE,eventBattleId:'tutorial',playerHp:2,playerEp:0,playerStatuses:[{effect:'Starvation',stacks:1},{effect:'ExtremeFatigue',stacks:1}],playerOrgasmCount:123};
 const requests=[],deps={...m,RUN_STATE:state,Phaser:{Math:{Clamp:(value,min,max)=>Math.max(min,Math.min(max,value))}},currentEncounterThreat:()=>5,debugEncounterThreat:x=>x,preloadConversationAssets:()=>{},preloadBattleBackgrounds:()=>{},preloadSprites:(_scene,assets)=>requests.push(...assets)};
 const Harness=new Function(...Object.keys(deps),code+';return Harness;')(...Object.values(deps));
 const h=new Harness();let encounters=0;
 h.createEncounterEnemies=()=>{encounters++;return [new m.Enemy(m.ENEMY_DEFINITIONS.grunt)];};
 h.preload();
 assert.equal(encounters,1);assert.equal(h.player.orgasmCount,123);assert.equal(h.player.hp,2);assert.ok(h.player.hasStatus('Starvation'));
 const portraitKeys=requests.filter(a=>a.textureKey.startsWith('character:')).map(a=>a.textureKey);
 assert.deepEqual(new Set(portraitKeys),new Set(['character:Succubus_tutorial_Starvation_idle_1','character:Succubus_tutorial_Starvation_hover_1']));
 assert.equal(h.currentPortraitId,'Succubus_tutorial_Starvation_idle_1');
 assert.notEqual(h.player.statuses,state.playerStatuses);
 assert.deepEqual(state.playerStatuses,[{effect:'Starvation',stacks:1},{effect:'ExtremeFatigue',stacks:1}]);
});
