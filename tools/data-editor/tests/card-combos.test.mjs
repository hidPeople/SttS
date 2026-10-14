import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { programFor, analyze } from '../schema.mjs';
import { ensureRequirements } from '../semantics.mjs';
import { cardTextPreview } from '../card-text-preview.mjs';
import { numericPolicy } from '../public/field-policy.js';
const root=path.resolve('.'), file='src/data/cards.ts';
const source=fs.readFileSync(file,'utf8');
const original="effect('hpDamage', 'selectedEnemy', 6, { attackAttribute: 'strike' })";
function model(expression){return analyze(programFor(root,{[file]:source.replace(original,expression)}),root,file);}
function firstEffect(m){return m.declarations.find(d=>d.name==='CARD_DEFINITIONS').node.entries.find(e=>e.key==='strike').node.args[0].entries.find(e=>e.key==='effects').node.items[0];}
test('new data fields expose typed forms and card text previews without unresolved tokens',()=>{
 const p=programFor(root),m=analyze(p,root,file);assert.deepEqual(m.issues,[]);
 for(const id of ['feverPiston','reprisal','reflexCaress','hazyPiston','thornArmor','sensitization']){
  const preview=cardTextPreview(p,root,id);assert.deepEqual(preview.issues,[]);
  for(const lang of ['ja','en'])assert.doesNotMatch(preview[lang].flat().map(s=>s.text).join(''),/\{[^}]+\}/);
 }
 for(const key of ['connection','recallFromDiscard','sequence','hpCost','statusCost','selfAmount','unlessPlayerOrgasm','reserveRoomRatio'])assert.ok(Object.values(m.schemas).some(s=>s.properties?.some(p=>p.name===key)),key);
 const relic=analyze(p,root,'src/data/relics.ts');assert.deepEqual(relic.issues,[]);
 assert.ok(Object.values(relic.schemas).some(s=>s.properties?.some(p=>p.name==='comboRules')));
});
test('switching to repeat/retaliation adds required options; invalid quantities and target choices are rejected',()=>{
 for(const [kind,target,required]of[['repeatSequence','player','sequence'],['retaliation','selectedEnemy','selfAmount']]){
  const m=model(`effect('${kind}','${target}',2)`);assert.ok(m.issues.some(i=>i.path.endsWith('.'+required)));
  assert.match(ensureRequirements(m,firstEffect(m).start),new RegExp(required+':'));
 }
 for(const expression of ["effect('repeatSequence','player',0,{sequence:[]})","effect('retaliation','player',4,{selfAmount:-1})","effect('blockToHpDamage','selectedEnemy',2)"]){assert.ok(model(expression).issues.length,expression);}
 assert.equal(numericPolicy('reserveRoomRatio').max,1);assert.equal(numericPolicy('hpCost').min,0);
});
