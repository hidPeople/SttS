import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { analyze, programFor, contracts, contractChanges } from '../schema.mjs';
import { validateTutorialTips } from '../tutorial-tips-validation.mjs';
import { requirements } from '../semantics.mjs';
const root=process.cwd(),file='src/data/tutorialTips.ts',source=fs.readFileSync(file,'utf8');

test('tutorial config is editable, schema is tracked, and invalid timing/anchor dependencies are rejected',()=>{
 const program=programFor(root),model=analyze(program,root,file);
 assert.deepEqual([...model.issues,...validateTutorialTips(model)],[]);
 const baseline=JSON.parse(fs.readFileSync('tools/data-editor/schema-baseline.json','utf8'));
 assert.deepEqual(contractChanges({[file]:baseline[file]},{[file]:contracts(program,root)[file]}),[]);
 const invalid=source.replace('delayMs: 30000','delayMs: -1').replace('turn: 1','turn: 0.5').replace("cardId: 'pullout',",'').replace("enemyState: 'peakAftershocks',",'').replace("id: 'useSeduction'","id: 'endFirstTurn'");
 const bad=analyze(programFor(root,{[file]:invalid}),root,file);
 const issues=validateTutorialTips(bad);
 for(const keyword of ['delayMs','turn','cardId','enemyState','id'])assert.ok(issues.some(i=>i.message.includes(keyword)),keyword);
 const position=model.declarations.find(d=>d.name==='TUTORIAL_TIPS').node.items[1].entries.find(e=>e.key==='position').node;
 assert.ok(requirements(position,model.schemas).required.includes('cardId'));
});
