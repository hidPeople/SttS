import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import fs from 'node:fs';
import ts from 'typescript';
const server = await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
const {PortraitSelection} = await server.ssrLoadModule('/src/models/portraitSelection.ts');
const {PORTRAIT_FACTORS} = await server.ssrLoadModule('/src/data/portraitFactors.ts');
await server.close();
const id = tag => `P_tutorial_${tag}_1`;
const context = ratio => ({playerId:'P',category:'tutorial',statuses:new Set(),relics:new Set(),hpRatio:1,epRatio:.9,epReserveRatio:ratio});
test('EPReserve supports all comparisons and attached/separate decimal percentage thresholds', () => {
  for (const [op,below,equal,above] of [['gt',false,false,true],['gte',false,true,true],['lt',true,false,false],['lte',true,true,false]]) {
    for (const suffix of [`EPReserve${op}50.5per`, `EPReserve_${op}50.5`]) {
      const s = new PortraitSelection([id('idle'),id(suffix)],PORTRAIT_FACTORS);
      for (const [ratio,expected] of [[.504,below],[.505,equal],[.506,above]]) {
        assert.equal(s.select(context(ratio)),id(expected?suffix:'idle'));
        assert.deepEqual(s.preloadIds(context(ratio)),[id(expected?suffix:'idle')]);
      }
    }
  }
});
test('reserve thresholds retain data priority, threshold ordering, and zero default', () => {
  const ids = ['idle','EPReservegte0','EPReservegte50','EPReservegte75'].map(id);
  assert.equal(new PortraitSelection(ids,PORTRAIT_FACTORS).select(context(.8)),id('EPReservegte75'));
  assert.equal(new PortraitSelection(ids,{...PORTRAIT_FACTORS,ThresholdOrder:'looser'}).select(context(.8)),id('EPReservegte0'));
  assert.equal(new PortraitSelection(ids,PORTRAIT_FACTORS).select(context(undefined)),id('EPReservegte0'));
  assert.equal(new PortraitSelection(ids,{...PORTRAIT_FACTORS,percentComparisons:['EP','HP']}).select(context(.8)),id('idle'));
  const pair = [id('EPgte50'),id('EPReservegte50')];
  assert.equal(new PortraitSelection(pair,PORTRAIT_FACTORS).select(context(.8)),id('EPgte50'));
  assert.equal(new PortraitSelection(pair,{...PORTRAIT_FACTORS,percentComparisons:['EPReserve','EP','HP']}).select(context(.8)),id('EPReservegte50'));
});
test('reserve changes refresh portrait before bar animation finishes', async () => {
  const source = ts.createSourceFile('BattleScene.ts',fs.readFileSync('src/scenes/BattleScene.ts','utf8'),ts.ScriptTarget.Latest,true);
  const cls = source.statements.find(n=>ts.isClassDeclaration(n)&&n.name.text==='BattleScene');
  const code = ts.transpileModule(`class Harness {${['setPlayerEpReserveValue','animatePlayerEpReserveTo'].map(name=>cls.members.find(n=>n.name?.getText(source)===name).getText(source)).join('\n')}}`,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
  const Harness = new Function('Phaser','BAR_WIDTH',code+';return Harness;')({Math:{Clamp:(v,min,max)=>Math.max(min,Math.min(max,v))}},200);
  const h = new Harness(), seen = [], tweens = [];
  h.refreshPlayerPortrait = () => seen.push(h.playerEpReserveValue);
  h.playerBars = {epReserveFill:{scaleX:0}};
  h.setPlayerEpReserveWidth = () => {};
  h.tweens = {add:config=>tweens.push(config)};
  h.setPlayerEpReserveValue(30,100,false); assert.deepEqual(seen,[30]);
  h.setPlayerEpReserveValue(40,100,true); assert.deepEqual(seen,[30,40]);
  const pending = h.animatePlayerEpReserveTo(60,100,1000);
  assert.deepEqual(seen,[30,40,60]); tweens.at(-1).onComplete(); await pending;
});
