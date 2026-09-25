import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createServer} from 'vite';
const server=await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
const {ENEMY_INTENT_COLORS:colors}=await server.ssrLoadModule('/src/data/ui.ts');
await server.close();
const source=ts.createSourceFile('BattleScene.ts',fs.readFileSync('src/scenes/BattleScene.ts','utf8'),ts.ScriptTarget.Latest,true);
const cls=source.statements.find(n=>ts.isClassDeclaration(n)&&n.name.text==='BattleScene');
const methods=['enemyIntentDisplay','intentEffectTotal'].map(name=>cls.members.find(n=>n.name?.getText(source)===name).getText(source)).join('\n');
const code=ts.transpileModule(`class Harness {${methods}}`,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
const Harness=new Function('ENEMY_INTENT_COLORS','localize',`${code};return Harness;`)(colors,x=>x);
const h=new Harness();h.player={};h.enemy={};h.effectAmount=e=>e.amount;h.effectRepeatCount=e=>e.times??1;h.modifiedPlayerHpDamage=x=>x*2;
h.intentPlayerEpDamagePreview=()=>({raw:7,modified:9});
const effect=(kind,target,amount,times=1)=>({kind,target,amount,times});

test('HP/EP self damage uses the same configured colors as attacks, without merging amounts',()=>{
 const intent={label:'test',effects:[effect('hpDamage','player',2),effect('hpDamage','self',3,2),effect('epDamage','self',5)]};
 const numbers=h.enemyIntentDisplay(intent).segments.filter(s=>s.color);
 assert.deepEqual(numbers,[{text:'4',bold:true,color:colors.hpDamage},{text:'9',bold:true,color:colors.epDamage},{text:'6',color:colors.hpDamage},{text:'5',color:colors.epDamage}]);
});
test('single self-damage types and zero values keep the correct color and omit empty sections',()=>{
 h.intentPlayerEpDamagePreview=()=>({raw:0,modified:0});
 for(const kind of ['hpDamage','epDamage']) {
  const segments=h.enemyIntentDisplay({label:'self',effects:[effect(kind,'self',3)]}).segments;
  assert.deepEqual(segments.filter(s=>s.color),[{text:'3',color:colors[kind]}]);
 }
 const segments=h.enemyIntentDisplay({label:'empty',effects:[effect('hpDamage','self',0),effect('epDamage','self',0)]}).segments;
 assert.equal(segments.some(s=>s.text.includes(' / self ')),false);
});
