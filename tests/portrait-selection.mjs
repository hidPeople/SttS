import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
const server = await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
const { PortraitSelection, parsePortraitTags } = await server.ssrLoadModule('/src/models/portraitSelection.ts');
const { PORTRAIT_FACTORS } = await server.ssrLoadModule('/src/data/portraitFactors.ts');
const { characterPortraitAssets, characterPortraitFiles } = await server.ssrLoadModule('/src/models/portraitAssets.ts');
await server.close();
const context = (changes={}) => ({playerId:'Succubus',category:'tutorial',statuses:new Set(['Starvation']),relics:new Set(),hpRatio:.04,epRatio:0,...changes});
const id = suffix => 'Succubus_tutorial_'+suffix;
const ids = Object.keys(characterPortraitAssets);
const selector = (files=ids,rules=PORTRAIT_FACTORS) => new PortraitSelection(files,rules,()=>0);
test('discovery supplies all provided tutorial states, with default-sized independent assets',()=>{
 for(const suffix of ['idle_1','Starvation_idle_1','Starvation_EPdamage_1','Starvation_peak_1']) {
  assert.ok(ids.includes(id(suffix))); assert.ok(characterPortraitFiles.includes(id(suffix)+'.png'));
  assert.equal(characterPortraitAssets[id(suffix)].displayHeight,700);
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
test('later status takes priority, combinations are conjunctive, and active event counters unwind independently',()=>{
 const rules={...PORTRAIT_FACTORS,statuses:['Starvation','Fainted']};
 const s=selector([...ids,id('Fainted_idle_1'),id('Starvation_Fainted_peak_1')],rules),c=context();
 s.select(c);const damage1=s.begin('EPdamage'),damage2=s.begin('EPdamage');s.select(c);damage1();assert.equal(s.select(c),id('Starvation_EPdamage_1'));
 c.statuses.add('Fainted');assert.equal(s.select(c),id('Fainted_idle_1'));
 const peak=s.begin('peak');assert.equal(s.select(c),id('Starvation_Fainted_peak_1'));
 c.statuses.delete('Starvation');assert.equal(s.select(c),id('Fainted_idle_1'));
 peak();damage2();assert.equal(s.select(c),id('Fainted_idle_1'));
});
test('card, relic and inclusive ratio tags can be added entirely through data',()=>{
 const rules={...PORTRAIT_FACTORS,statuses:[],relics:['testRelic'],cards:['testCard'],hpRatios:[{tag:'lowHP',max:.25}],epRatios:[{tag:'highEP',min:.5}]};
 const s=selector([id('idle_1'),id('lowHP_highEP_idle_1'),id('testRelic_idle_1'),id('testRelic_testCard_idle_1')],rules),c=context({statuses:new Set(),hpRatio:.25,epRatio:.5});
 assert.equal(s.select(c),id('lowHP_highEP_idle_1'));c.hpRatio=.26;assert.equal(s.select(c),id('idle_1'));
 c.relics.add('testRelic');assert.equal(s.select(c),id('testRelic_idle_1'));
 const end=s.begin('testCard');assert.equal(s.select(c),id('testRelic_testCard_idle_1'));end();assert.equal(s.select(c),id('testRelic_idle_1'));
});
test('underscores in registered IDs are parsed, ambiguous/unknown tags never silently match',()=>{
 assert.deepEqual(parsePortraitTags('InfestedA_Slime_idle',['InfestedA_Slime','idle']),['InfestedA_Slime','idle']);
 assert.equal(parsePortraitTags('A_B',['A','B','A_B']),undefined);
 const s=selector([...ids,id('unknown_idle_1'),id('Starvation_peak_idle_1')]);s.select(context());
 assert.ok(s.issues.has(id('unknown_idle_1')));assert.ok(s.issues.has(id('Starvation_peak_idle_1')));
});
