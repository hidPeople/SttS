import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Transactions, atomicWrite, safeFile, runBuild } from '../transaction.mjs';
import { hash } from '../schema.mjs';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'stts-editor-test-'));
  t.after(async () => { await fs.rm(root, { recursive: true, force: true }); });
  const file = 'src/data/cards.ts', base = 'export const card = 1;\n';
  await atomicWrite(path.join(root, file), base);
  return { root, file, base, source: 'export const card = 2;\n' };
}
test('successful transaction keeps source and original backup', async t => {
  const {root,file,base,source}=await fixture(t);
  const tx=new Transactions(root,path.join(root,'tool'),async()=>({ok:true,log:'built in 1s'}));
  const result=await tx.apply({[file]:{base,source}});
  assert.equal(result.ok,true); assert.equal(await fs.readFile(path.join(root,file),'utf8'),source);
  assert.equal(await fs.readFile(path.join(result.backup,file),'utf8'),base);
  assert.equal(JSON.parse(await fs.readFile(path.join(result.backup,'journal.json'))).status,'committed');
});
test('build failure restores every changed file and preserves draft object', async t => {
  const {root,file,base,source}=await fixture(t), second='src/data/enemies.ts';
  await atomicWrite(path.join(root,second),base);
  const drafts={[file]:{base,source},[second]:{base,source}};
  const tx=new Transactions(root,path.join(root,'tool'),async()=>({ok:false,log:'TS2322 invalid type'}));
  const result=await tx.apply(drafts);assert.equal(result.restored,true);assert.match(result.log,/TS2322/);
  for(const f of [file,second])assert.equal(await fs.readFile(path.join(root,f),'utf8'),base);
  assert.equal(drafts[file].source,source);
});
test('external edits block stale apply and are preserved during rollback', async t => {
  const {root,file,base,source}=await fixture(t);
  await atomicWrite(path.join(root,file),'external');
  const tx=new Transactions(root,path.join(root,'tool'),async()=>({ok:true,log:''}));
  await assert.rejects(tx.apply({[file]:{base,source}}),/外部変更/);
  await atomicWrite(path.join(root,file),base);
  tx.build=async()=>{await atomicWrite(path.join(root,file),'external-during-build');return{ok:false,log:'failed'};};
  const result=await tx.apply({[file]:{base,source}});assert.deepEqual(result.conflicts,[file]);
  assert.equal(await fs.readFile(path.join(root,file),'utf8'),'external-during-build');
});
test('unfinished transaction is recovered on next startup', async t => {
  const {root,file,base,source}=await fixture(t),tool=path.join(root,'tool'),backup=path.join(tool,'backups','interrupted');
  await atomicWrite(path.join(backup,file),base);await atomicWrite(path.join(root,file),source);
  await atomicWrite(path.join(backup,'journal.json'),JSON.stringify({status:'building',files:[{file,originalHash:hash(base),appliedHash:hash(source)}]}));
  const tx=new Transactions(root,tool);const reports=await tx.recover();assert.equal(reports.length,1);assert.equal(await fs.readFile(path.join(root,file),'utf8'),base);
});
test('externally removed files become explicit restore conflicts', async t => {
  const {root,file,base,source}=await fixture(t);
  const tx=new Transactions(root,path.join(root,'tool'),async()=>{
    await fs.unlink(path.join(root,file));return {ok:false,log:'external deletion during build'};
  });
  const result=await tx.apply({[file]:{base,source}});
  assert.deepEqual(result.conflicts,[file]);assert.equal(result.restored,false);
  await assert.rejects(tx.apply({[file]:{base,source}}),/復元時に外部変更/);
});
test('out of scope files and overlapping apply requests are rejected', async t => {
  const {root,file,base,source}=await fixture(t);
  await assert.rejects(safeFile(root,'../outside.ts'));await assert.rejects(safeFile(root,'src/scenes/BattleScene.ts'));
  let finish;const tx=new Transactions(root,path.join(root,'tool'),()=>new Promise(resolve=>finish=resolve));
  const pending=tx.apply({[file]:{base,source}});
  await assert.rejects(tx.apply({[file]:{base,source}}),/進行中/);
  while(!finish)await new Promise(r=>setTimeout(r,10));finish({ok:true,log:'done'});await pending;
});
test('exit zero without expected build words is treated as failure', async t => {
  const {root}=await fixture(t);
  await atomicWrite(path.join(root,'package.json'),JSON.stringify({scripts:{build:'node -e "console.log(123)"'}}));
  const result=await runBuild(root);assert.equal(result.ok,false);assert.match(result.log,/完了ワード/);
});
