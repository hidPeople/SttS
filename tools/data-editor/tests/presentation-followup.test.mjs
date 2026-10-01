import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { analyze, programFor, contracts, contractChanges } from '../schema.mjs';
import { literal } from '../public/sprite-values.js';
import { help } from '../public/help.js';
import { numericPolicy, numericWarnings, isColorField } from '../public/field-policy.js';
import { glowPreviewState } from '../public/selection-glow-preview.js';
import { cardArtworkPreviewConfig } from '../card-artwork-preview.mjs';
import { cardTextPreview } from '../card-text-preview.mjs';

const root=process.cwd(),program=programFor(root);
test('reviewed source contracts and new editable declarations match the baseline',()=>{
 assert.deepEqual(contractChanges(JSON.parse(fs.readFileSync('tools/data-editor/schema-baseline.json','utf8')),contracts(program,root)),[]);
 for(const [file,names] of [['ui',['SELECTION_GLOW']],['cardText',['CARD_TEXT_PHRASES']],['cardAppearance',['CARD_ARTWORK','CARD_FRAME','CARD_RARITY_FINISH']]]) {
  const model=analyze(program,root,`src/data/${file}.ts`);
  for(const name of names){const decl=model.declarations.find(d=>d.name===name);assert.equal(decl.node.kind,'object');assert.ok(help[name]);}
 }
 const types=analyze(program,root,'src/models/types.ts');
 assert.ok(!types.declarations.some(d=>d.name==='BattleEventContext'&&!d.typeDefinition));
 const tips=analyze(program,root,'src/data/tutorialTips.ts');
 const walk=n=>[n,...[...(n.entries??[]).map(e=>e.node),...(n.items??[]),...(n.args??[])].flatMap(walk)];
 const arrays=tips.declarations.flatMap(d=>walk(d.node)).filter(n=>n.kind==='array'&&n.items.some(v=>v.value==='ExtremeFatigue'));
 assert.ok(arrays.length);assert.ok(help.highlightPlayerStatuses);
});

test('glow/color/frame numeric guidance respects fractions, limits and declaration scope',()=>{
 const ctx={declaration:'SELECTION_GLOW',maxAlpha:0.6};
 assert.equal(numericPolicy('minAlpha',ctx).step,0.01);
 for(const [key,value] of [['minAlpha',0.7],['maxAlpha',1.1],['dimmedMultiplier',-1],['pulseDuration',0],['spread',-1],['strength',-1],['usableColor',0x1000000]])assert.ok(numericWarnings(value,numericPolicy(key,ctx)).length,key);
 assert.deepEqual(numericWarnings(0,numericPolicy('strength',ctx)),[]);
 for(const key of ['base','shadow','highlight'])assert.equal(isColorField(key,'CARD_RARITY_FINISH'),true);
 assert.equal(isColorField('background','CARD_FRAME'),true);
 assert.equal(isColorField('base','CARD_ARTWORK'),false);
 assert.ok(numericWarnings(0,numericPolicy('textureResolution',{declaration:'CARD_FRAME'})).length);
});

test('glow preview uses current config for pulse extremes, dimming and one-shot enemy fade',()=>{
 const config=literal(analyze(program,root,'src/data/ui.ts').declarations.find(d=>d.name==='SELECTION_GLOW').node);
 const {card:c,enemy:e}=config;
 assert.equal(glowPreviewState(config,0).cardAlpha,c.maxAlpha);
 assert.equal(glowPreviewState(config,c.pulseDuration/2).cardAlpha,c.minAlpha);
 assert.equal(glowPreviewState(config,0,true).cardAlpha,c.maxAlpha*c.dimmedMultiplier);
 assert.equal(glowPreviewState(config,e.riseDuration).enemyStrength,e.strength);
 assert.equal(glowPreviewState(config,e.riseDuration+e.fadeDuration).enemyStrength,0);
});

test('card previews pick up draft rarity colors and repetition phrases',()=>{
 const artwork='src/data/cardAppearance.ts',phrases='src/data/cardText.ts',cards='src/data/cards.ts';
 const art=fs.readFileSync(artwork,'utf8');
 const draft=programFor(root,{[artwork]:art.replace(/base: 0x[0-9a-f]+/g,'base: 0x123456'),
  [phrases]:fs.readFileSync(phrases,'utf8').replace("repeat: l(' ×{value}', '×{value}')","repeat: l(' repeat:{value}', '回数:{value}')"),
  [cards]:fs.readFileSync(cards,'utf8').replace("effect('hpDamage', 'selectedEnemy', 6, { attackAttribute: 'strike' })","effect('hpDamage', 'selectedEnemy', 6, { attackAttribute: 'strike', times: 2 })")});
 assert.equal(cardArtworkPreviewConfig(draft,root,'strike').finish.base,0x123456);
 const text=cardTextPreview(draft,root,'strike');
 assert.match(text.ja.flat().map(s=>s.text).join(''),/回数:2/);
 assert.match(text.en.flat().map(s=>s.text).join(''),/repeat:2/);
});
