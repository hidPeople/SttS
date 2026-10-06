import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze, programFor } from '../schema.mjs';
import { fieldsOf, inspectModel } from '../semantics.mjs';
import { numericPolicy, numericWarnings } from '../public/field-policy.js';
import { REFERENCE_FIELDS } from '../public/reference-fields.js';
import { help } from '../public/help.js';

const root=process.cwd(),model=analyze(programFor(root),root,'src/data/ui.ts');
const definition=m=>fieldsOf(m.declarations.find(d=>d.name==='RIBBON_HUD').node);
test('ribbon configuration is editable with relic references and parameter guidance',()=>{
 const config=definition(model);
 assert.equal(config.hpColors.kind,'array');assert.equal(config.enemyPulses.kind,'array');
 assert.equal(config.playerDrain.kind,'object');assert.ok(help.RIBBON_HUD);
 assert.deepEqual(REFERENCE_FIELDS.retainedBlockRelicIds,['relics','id']);
 assert.deepEqual(inspectModel(model).filter(e=>e.path.startsWith('RIBBON_HUD')),[]);
 const policy=key=>numericPolicy(key,{declaration:'RIBBON_HUD'});
 for(const [key,value] of [['resolution',0],['fps',0],['outletCount',1.5],['remaining',1.1],['blockDuration',0]])assert.ok(numericWarnings(value,policy(key)).length,key);
 assert.deepEqual(numericWarnings(-15,policy('shieldOffsetX')),[]);
 assert.deepEqual(numericWarnings(.25,policy('delay')),[]);
});
test('invalid palettes, reversed random ranges and incomplete release sequences have located diagnostics',()=>{
 const draft=structuredClone(model),config=definition(draft);
 config.hpColors.items.pop();fieldsOf(config.playerDrain).radius.items.reverse();
 fieldsOf(config.enemyPulses.items.at(-1)).remaining.value=.2;
 const paths=inspectModel(draft).map(e=>e.path);
 for(const path of ['RIBBON_HUD.hpColors','RIBBON_HUD.playerDrain.radius','RIBBON_HUD.enemyPulses'])assert.ok(paths.includes(path),path);
 config.enemyPulses.items=[];
 assert.ok(inspectModel(draft).some(e=>e.path==='RIBBON_HUD.enemyPulses'));
});
