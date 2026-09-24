import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
const server = await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
const { PortraitSelection, parsePortraitTags } = await server.ssrLoadModule('/src/models/portraitSelection.ts');
const { PORTRAIT_FACTORS } = await server.ssrLoadModule('/src/data/portraitFactors.ts');
const { characterPortraitAssets, characterPortraitFiles } = await server.ssrLoadModule('/src/models/portraitAssets.ts');
const { CHARACTER_PORTRAITS, DEFAULT_CHARACTER_PLACEMENT } = await server.ssrLoadModule('/src/data/characterPortraits.ts');
const { resolvePortraitRegistry } = await server.ssrLoadModule('/src/models/portraitRegistry.ts');
await server.close();
const context = (changes={}) => ({playerId:'Succubus',category:'tutorial',statuses:new Set(['Starvation']),relics:new Set(),hpRatio:.04,epRatio:0,...changes});
const id = suffix => 'Succubus_tutorial_'+suffix;
// Selection fixtures remain independent of user-added/deleted artwork.
const ids = [...new Set([...Object.keys(characterPortraitAssets), id('idle_1')])];
const selector = (files=ids,rules=PORTRAIT_FACTORS) => new PortraitSelection(files,rules,()=>0);
test('discovery supplies all provided tutorial states, with default-sized independent assets',()=>{
 for(const suffix of ['Starvation_idle_1','Starvation_EPdamage_1','Starvation_peak_1']) {
  assert.ok(ids.includes(id(suffix))); assert.ok(characterPortraitFiles.includes(id(suffix)+'.png'));
  assert.equal(characterPortraitAssets[id(suffix)].displayHeight,(CHARACTER_PORTRAITS[id(suffix)] ?? DEFAULT_CHARACTER_PLACEMENT).displayHeight);
 }
 assert.ok(ids.every(name=>/_[1-9]\d*$/.test(name)));
});
test('tutorial moves idle -> EPdamage -> peak and restores the exact interrupted image',()=>{
 const s=selector(), c=context();
 assert.equal(s.select(c),id('Starvation_idle_1'));
 const damage=s.begin('EPdamage'); assert.equal(s.select(c),id('Starvation_EPdamage_1'));
 const peak=s.begin('peak'); assert.equal(s.select(c),id('Starvation_peak_1'));
 peak(); assert.equal(s.select(c),id('Starvation_EPdamage_1'));
 damage(); assert.equal(s.select(c),id('Starvation_idle_1'));
});
test('resolved status cannot be restored by unwinding an interrupted animation',()=>{
 const s=selector(),c=context();s.select(c); const damage=s.begin('EPdamage');s.select(c);const peak=s.begin('peak');s.select(c);
 c.statuses.clear(); assert.equal(s.select(c),id('idle_1'));
 peak();damage(); assert.equal(s.select(c),id('idle_1'));
 const again=s.begin('EPdamage');assert.equal(s.select(c),id('idle_1'));again();
});
test('normal and missing event variants use stable idle or normal fallback',()=>{
 const s=selector(),normal=context({category:'normal',statuses:new Set()});
 assert.equal(s.select(normal),'Succubus_normal_idle_1');
 const damage=s.begin('EPdamage'),peak=s.begin('peak');assert.equal(s.select(normal),'Succubus_normal_idle_1');peak();damage();
 assert.equal(s.select({...normal,category:'futureEvent'}),'Succubus_normal_idle_1');
 assert.equal(s.select({...normal,playerId:'Missing'}),undefined);
});
test('repeated visits vary when two images exist, but HUD refresh and restoration never redraw randomly',()=>{
 const s=selector([...ids,id('Starvation_idle_2'),id('Starvation_EPdamage_2')]),c=context();
 const idle=s.select(c);assert.equal(s.select(c),idle);
 let end=s.begin('EPdamage');const first=s.select(c);assert.equal(s.select(c),first);
 end();assert.equal(s.select(c),idle);
 end=s.begin('EPdamage');assert.notEqual(s.select(c),first);
 const peak=s.begin('peak');s.select(c);peak();const second=s.select(c);assert.notEqual(second,first);
 end();assert.equal(s.select(c),idle);
});
test('earlier status takes priority, combinations are conjunctive, and active event counters unwind independently',()=>{
 const rules={...PORTRAIT_FACTORS,statuses:['Fainted','Starvation']};
 const s=selector([...ids,id('Fainted_idle_1'),id('Starvation_Fainted_peak_1')],rules),c=context();
 s.select(c);const damage1=s.begin('EPdamage'),damage2=s.begin('EPdamage');s.select(c);damage1();assert.equal(s.select(c),id('Starvation_EPdamage_1'));
 c.statuses.add('Fainted');assert.equal(s.select(c),id('Fainted_idle_1'));
 const peak=s.begin('peak');assert.equal(s.select(c),id('Starvation_Fainted_peak_1'));
 c.statuses.delete('Starvation');assert.equal(s.select(c),id('Fainted_idle_1'));
 peak();damage2();assert.equal(s.select(c),id('Fainted_idle_1'));
});
test('card, relic and inclusive ratio tags can be added entirely through data',()=>{
 const rules={...PORTRAIT_FACTORS,statuses:[],relics:['testRelic'],cards:['testCard'],};
 const s=selector([id('idle_1'),id('HPlte25per_EPgte50per_idle_1'),id('testRelic_idle_1'),id('testRelic_testCard_idle_1')],rules),c=context({statuses:new Set(),hpRatio:.25,epRatio:.5});
 assert.equal(s.select(c),id('HPlte25per_EPgte50per_idle_1'));c.hpRatio=.26;assert.equal(s.select(c),id('idle_1'));
 c.relics.add('testRelic');assert.equal(s.select(c),id('testRelic_idle_1'));
 c.lastCardId='testCard';assert.equal(s.select(c),id('testRelic_testCard_idle_1'));c.lastCardId=undefined;assert.equal(s.select(c),id('testRelic_idle_1'));
});
test('underscores in registered IDs are parsed, ambiguous/unknown tags never silently match',()=>{
 assert.deepEqual(parsePortraitTags('InfestedA_Slime_idle',['InfestedA_Slime','idle']),['InfestedA_Slime','idle']);
 assert.equal(parsePortraitTags('A_B',['A','B','A_B']),undefined);
 const s=selector([...ids,id('unknown_idle_1'),id('Starvation_peak_idle_1')]);s.select(context());
 assert.ok(s.issues.has(id('unknown_idle_1')));assert.ok(s.issues.has(id('Starvation_peak_idle_1')));
});

test('all eight percent comparisons distinguish strict/inclusive boundaries and read decimal percentages',()=>{
 for(const stat of ['HP','EP']) for(const [op,results] of Object.entries({gt:[false,false,true],gte:[false,true,true],lt:[true,false,false],lte:[true,true,false]})) {
  const pose=id(`${stat}${op}12.5per_idle_1`),s=selector([id('idle_1'),pose]);
  [.124,.125,.126].forEach((ratio,i)=>{
   const c=context({hpRatio:0,epRatio:0,[stat==='HP'?'hpRatio':'epRatio']:ratio});
   assert.equal(s.select(c),results[i]?pose:id('idle_1'),`${stat}${op} at ${ratio}`);
  });
 }
});

test('provided EPgte50per art requires 50% EP and yields to damage and peak',()=>{
 const special=id('Starvation_EPgte50per_1');assert.ok(ids.includes(special));
 const s=selector(),c=context({epRatio:.49});s.select(c);
 c.epRatio=.5;assert.equal(s.select(c),special);assert.equal(s.select(c),special);
 const end=s.begin('EPdamage');assert.equal(s.select(c),id('Starvation_EPdamage_1'));
 c.epRatio=1;const peak=s.begin('peak');assert.equal(s.select(c),id('Starvation_peak_1'));
 c.epRatio=.2;peak();assert.equal(s.select(c),id('Starvation_EPdamage_1'));
 end();c.epRatio=.8;assert.equal(s.select(c),special);
});

test('percent tags are conjunctive and lower priority than statuses, relics, cards and damage',()=>{
 const pair=id('HPgt25per_EPlte50per_idle_1');
 const files=[id('idle_1'),pair,id('Starvation_idle_1'),id('testRelic_idle_1'),id('testCard_idle_1'),id('EPdamage_1')];
 const s=selector(files,{...PORTRAIT_FACTORS,relics:['testRelic'],cards:['testCard']}),c=context({statuses:new Set(),hpRatio:.26,epRatio:.5});
 assert.equal(s.select(c),pair);c.hpRatio=.25;assert.equal(s.select(c),id('idle_1'));
 c.hpRatio=.26;c.epRatio=.51;assert.equal(s.select(c),id('idle_1'));c.epRatio=.5;
 c.statuses.add('Starvation');assert.equal(s.select(c),id('Starvation_idle_1'));c.statuses.clear();
 c.relics.add('testRelic');assert.equal(s.select(c),id('testRelic_idle_1'));c.relics.clear();
 c.lastCardId='testCard';assert.equal(s.select(c),id('testCard_idle_1'));
 const damage=s.begin('EPdamage');assert.equal(s.select(c),id('EPdamage_1'));damage();c.lastCardId=undefined;assert.equal(s.select(c),pair);
});

test('same comparison prefers tighter thresholds, supports zero/100%, and ignores disabled or malformed forms',()=>{
 for(const [op,value,expected] of [['gte',.8,75],['lte',.2,25]]) {
  const s=selector([id('idle_1'),...[25,50,75].map(n=>id(`EP${op}${n}per_idle_1`))]);
  assert.equal(s.select(context({epRatio:value})),id(`EP${op}${expected}per_idle_1`));
 }
 const zero=selector([id('idle_1'),id('HPgte0per_idle_1')]);assert.equal(zero.select(context({hpRatio:0})),id('HPgte0per_idle_1'));
 const full=selector([id('idle_1'),id('EPgte100per_idle_1')]);assert.equal(full.select(context({epRatio:1})),id('EPgte100per_idle_1'));
 const malformed=['EPeq50per','EPgte-1per','EPgteNaNper','EPgte50.5.5per'];
 const s=selector([id('idle_1'),...malformed.map(t=>id(`${t}_idle_1`))]);assert.equal(s.select(context({epRatio:.5})),id('idle_1'));
 for(const tag of malformed) assert.ok(s.issues.has(id(`${tag}_idle_1`)));
 const disabled=selector([id('idle_1'),id('EPgte50per_idle_1')],{...PORTRAIT_FACTORS,percentComparisons:[]});
 assert.equal(disabled.select(context({epRatio:1})),id('idle_1'));
});

test('Death shares image/placement and overrides status, peak and percentage art in every battle category',()=>{
 assert.equal(characterPortraitAssets.Succubus_Death_1,characterPortraitAssets[id('Starvation_EPdamage_1')]);
 assert.ok(!characterPortraitFiles.includes('Succubus_Death_1.png'));
 for(const category of ['normal','tutorial','otherEvent']) {
  const s=selector([...ids,'Succubus_HPlte0per_1']),c=context({category,hpRatio:0});
  const release=s.begin('peak');assert.equal(s.select(c),'Succubus_Death_1');
  c.hpRatio=-.01;assert.equal(s.select(c),'Succubus_Death_1');
  c.hpRatio=.1;assert.notEqual(s.select(c),'Succubus_Death_1');release();
 }
});

test('data ordering can lower Death below statuses and change threshold preference',()=>{
 const {states,...otherFactors}=PORTRAIT_FACTORS;
 const rules={...otherFactors,states};
 assert.equal(selector(ids,rules).select(context({hpRatio:0})),id('Starvation_idle_1'));
 const files=[id('idle_1'),id('EPgte50per_1'),id('EPgte75per_1')];
 assert.equal(selector(files,{...PORTRAIT_FACTORS,ThresholdOrder:'looser'}).select(context({epRatio:.8})),id('EPgte50per_1'));
});

test('object property order and first array entry control all factor priorities',()=>{
 const files=[id('Starvation_idle_1'),id('testCard_1'),id('peak_1'),id('EPdamage_1'),id('HPgte25per_1'),id('EPgte50per_1')];
 const {percentComparisons,...rest}=PORTRAIT_FACTORS;
 // A non-array setting at the top has no priority; percentages above other arrays do.
 const rules={ThresholdOrder:'stricter',percentComparisons:['HP','EP'],...rest,cards:['testCard']};
 const c=context({hpRatio:.5,epRatio:.8}),s=selector(files,rules);s.begin('peak');c.lastCardId='testCard';
 assert.equal(s.select(c),id('HPgte25per_1'));
 assert.equal(selector(files,{...rules,percentComparisons:['EP','HP']}).select(c),id('EPgte50per_1'));
 const eventsFirst={events:['EPdamage','peak'],...Object.fromEntries(Object.entries(PORTRAIT_FACTORS).filter(([key])=>key!=='events'))};
 const eventSelector=selector(files,eventsFirst);eventSelector.begin('peak');eventSelector.begin('EPdamage');
 assert.equal(eventSelector.select(c),id('EPdamage_1'));
});

test('registry supports forward/chained references and rejects missing images or cycles without affecting valid entries',()=>{
 const sources={real:'image.png',unconfigured:'other.png'},definitions={alias:'chain',chain:'real',real:{displayHeight:321,offsetX:-9,offsetY:12},cycleA:'cycleB',cycleB:'cycleA',missing:'absent'};
 const {assets,issues}=resolvePortraitRegistry(sources,definitions,DEFAULT_CHARACTER_PLACEMENT);
 assert.equal(assets.alias,assets.real);assert.equal(assets.chain,assets.real);
 assert.deepEqual(assets.alias,{textureKey:'character:real',source:'image.png',displayHeight:321,offsetX:-9,offsetY:12});
 assert.equal(assets.unconfigured.displayHeight,DEFAULT_CHARACTER_PLACEMENT.displayHeight);
 for(const id of ['cycleA','cycleB','missing']) {assert.ok(issues[id]);assert.equal(assets[id],undefined);}
});

test('status suffixes compare current stacks/remaining turns, while bare names only require presence',()=>{
 for (const [op,expected] of Object.entries({gt:[false,false,true],gte:[false,true,true],lt:[true,false,false],lte:[true,true,false]})) for (const separator of ['', '_']) {
  const pose=id('Aftershocks'+separator+op+'5_1'),s=selector([id('idle_1'),id('Aftershocks_1'),pose]);
  for(const [i,count] of [4,5,6].entries()) {
   const c=context({statuses:new Set(['Aftershocks']),statusStacks:new Map([['Aftershocks',count]])});
   assert.equal(s.select(c),expected[i]?pose:id('Aftershocks_1'));
  }
  assert.equal(s.select(context({statuses:new Set(),statusStacks:new Map()})),id('idle_1'));
 }
});
test('attached/separate HP/EP comparisons support percentages with or without per',()=>{
 for(const stat of ['HP','EP'])for(const op of ['gt','gte','lt','lte'])for(const separator of ['', '_'])for(const unit of ['', 'per']) {
  const pose=id(stat+separator+op+'3'+unit+'_1'),s=selector([id('idle_1'),pose]);
  for(const ratio of [.02,.03,.04]) {
   const match={gt:ratio>.03,gte:ratio>=.03,lt:ratio<.03,lte:ratio<=.03}[op];
   assert.equal(s.select(context({statuses:new Set(),[stat==='HP'?'hpRatio':'epRatio']:ratio})),match?pose:id('idle_1'));
  }
 }
});
test('status thresholds honor shared ThresholdOrder, base priority, and restore on stack decrease',()=>{
 const files=[id('idle_1'),id('Aftershocks_1'),id('Aftershocksgte3_1'),id('Aftershocks_gte5_1')];
 const c=context({statuses:new Set(['Aftershocks']),statusStacks:new Map([['Aftershocks',5]])});
 const s=selector(files);assert.equal(s.select(c),id('Aftershocks_gte5_1'));
 c.statusStacks.set('Aftershocks',4);assert.equal(s.select(c),id('Aftershocksgte3_1'));
 c.statusStacks.set('Aftershocks',1);assert.equal(s.select(c),id('Aftershocks_1'));
 c.statusStacks.set('Aftershocks',5);
 assert.equal(selector(files,{...PORTRAIT_FACTORS,ThresholdOrder:'looser'}).select(c),id('Aftershocksgte3_1'));
 c.statuses.add('Starvation');assert.equal(selector([...files,id('Starvation_1')]).select(c),id('Starvation_1'));
 const less=[id('idle_1'),id('Aftershockslt5_1'),id('Aftershockslte3_1')];c.statuses.delete('Starvation');c.statusStacks.set('Aftershocks',2);
 assert.equal(selector(less).select(c),id('Aftershockslte3_1'));
 assert.equal(selector(less,{...PORTRAIT_FACTORS,ThresholdOrder:'looser'}).select(c),id('Aftershockslt5_1'));
});
test('equivalent suffix spellings share random/history pool and underscore IDs still parse',()=>{
 const a=id('Aftershocksgte5_1'),b=id('Aftershocks_gte5_2'),s=selector([id('idle_1'),a,b]);
 const c=context({statuses:new Set(['Aftershocks']),statusStacks:new Map([['Aftershocks',5]])});
 assert.equal(s.select(c),a);assert.equal(s.select(c),a);
 c.statuses.clear();s.select(c);c.statuses.add('Aftershocks');assert.equal(s.select(c),b);
 const name='InfestedA_Slime',pose=id(name+'_gte2_1'),rule={...PORTRAIT_FACTORS,statuses:[name]};
 assert.equal(selector([id('idle_1'),pose],rule).select(context({statuses:new Set([name]),statusStacks:new Map([[name,2]])})),pose);
 const repeated=id('Aftershocksgte5_Aftershocks_gte5_1'),invalid=selector([id('idle_1'),repeated]);
 assert.equal(invalid.select(c),id('idle_1'));assert.ok(invalid.issues.has(repeated));
});
