import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=ts.createSourceFile('BattleScene.ts',fs.readFileSync('src/scenes/BattleScene.ts','utf8'),ts.ScriptTarget.Latest,true);
const scene=source.statements.find(n=>ts.isClassDeclaration(n)&&n.name.text==='BattleScene');
const method=scene.members.find(n=>n.name?.getText(source)==='updateReticlePosition').getText(source);
const code=ts.transpileModule(`class Harness {${method}}`,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
const Harness=new Function(`${code};return Harness;`)();
test('reticle clears defeated or missing targets on every pulse and redraws for a live target',()=>{
 const h=new Harness();let triangles=0,clears=0;
 h.reticle={clear(){triangles=0;clears++;},fillStyle(){},lineStyle(){},fillTriangle(){triangles++;},strokeTriangle(){}};
 h.enemyArea={};h.reticlePulse={offset:0};let view={enemy:{isDefeated:false}};
 h.currentEnemyView=()=>view;h.enemyRestBounds=()=>({left:0,right:100,top:0,bottom:100});
 h.updateReticlePosition();assert.equal(triangles,4);
 view.enemy.isDefeated=true;
 for(let i=0;i<3;i++){h.updateReticlePosition();assert.equal(triangles,0);}
 view={enemy:{isDefeated:false}};h.updateReticlePosition();assert.equal(triangles,4);
 view=undefined;h.updateReticlePosition();assert.equal(triangles,0);assert.equal(clears,6);
});
