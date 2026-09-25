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
 const invalid=source.replace(/delayMs: \d+/,'delayMs: -1').replace('turn: 1','turn: 0.5').replace("cardId: 'pullout',",'').replace("enemyState: 'peakAftershocks',",'').replace("id: 'useSeduction'","id: 'endFirstTurn'");
 const bad=analyze(programFor(root,{[file]:invalid}),root,file);
 const issues=validateTutorialTips(bad);
 for(const keyword of ['delayMs','turn','cardId','enemyState','id'])assert.ok(issues.some(i=>i.message.includes(keyword)),keyword);
 const position=model.declarations.find(d=>d.name==='TUTORIAL_TIPS').node.items[1].entries.find(e=>e.key==='pages').node.items[0].entries.find(e=>e.key==='position').node;
 assert.ok(requirements(position,model.schemas).required.includes('cardId'));
});

test('normal battle IDs are editable and offered alongside event definitions',async()=>{
 const normal=source.replaceAll("battleId: 'tutorial'", "battleId: 'normal'");
 const program=programFor(root,{[file]:normal}),model=analyze(program,root,file);
 assert.deepEqual([...model.issues,...validateTutorialTips(model)],[]);
 const {default:ts}=await import('typescript');
 const server=ts.createSourceFile('server.mjs',fs.readFileSync('tools/data-editor/server.mjs','utf8'),ts.ScriptTarget.Latest,true);
 const fn=server.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name.text==='referenceOptions').getText(server);
 const options=new Function('analyze','root','readdirSync','path',`${fn};return referenceOptions;`)(analyze,root,fs.readdirSync,await import('node:path'))(program);
 assert.ok(options.battles.some(option=>option.key==='normal'));
 for(const event of options.eventBattles) assert.ok(options.battles.some(option=>option.key===event.key&&option.definition===event.definition));
 assert.ok(!options.battles.some(option=>option.key==='nonexistent'));
});

test('page validation rejects empty sequences and reports missing anchors or enemy conditions on later pages',()=>{
 const head=source.slice(0,source.indexOf('export const TUTORIAL_TIPS'));
 const check=pages=>{
  const draft=head+`export const TUTORIAL_TIPS: TutorialTipDefinition[] = [{id:'pages',battleId:'tutorial',pages:${pages}}];`;
  return validateTutorialTips(analyze(programFor(root,{[file]:draft}),root,file));
 };
 assert.ok(check('[]').some(i=>i.message.includes('1ページ以上')));
 const first="{text:l('A','あ'),position:{anchor:'screen',x:0,y:0}}";
 assert.ok(check(`[${first},{text:l('B','い'),position:{anchor:'card',x:0,y:0}}]`).some(i=>i.message.includes('pages[2]')&&i.message.includes('cardId')));
 assert.ok(check(`[${first},{text:l('B','い'),position:{anchor:'screen',x:0,y:0},highlightEnemy:true}]`).some(i=>i.message.includes('pages[2]')&&i.message.includes('enemyState')));
});
