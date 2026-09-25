import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { analyze, programFor } from '../schema.mjs';
import { validateBattlePresentation } from '../battle-presentation-validation.mjs';
const root=process.cwd(),file='src/data/battlePresentation.ts',source=fs.readFileSync(file,'utf8');
const validate=(text=source)=>{const p=programFor(root,{[file]:text}),model=analyze(p,root,file);return [...model.issues,...validateBattlePresentation(root,model,analyze(p,root,'src/data/eventBattles.ts'))];};
test('background and entry configuration accepts defaults and rejects invalid files, stages, events or timings',()=>{
 assert.deepEqual(validate(),[]);
 const invalid=source.replaceAll('Prison.png','Missing.png').replace('stages: { 1:', 'stages: { 0:').replace('tutorial:', 'missingEvent:').replace('playerDuration: 400','playerDuration: -1').replace('nextEnemyProgress: 0.5','nextEnemyProgress: 1.5').replace('3: [1, 0, 2]','3: [0, 0, 2]');
 const issues=validate(invalid);for(const keyword of ['背景画像','ステージ','イベント戦闘ID','playerDuration','nextEnemyProgress','enemyOrder']) assert.ok(issues.some(i=>i.message.includes(keyword)),keyword);
});
