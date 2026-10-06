import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { EditorSession } from '../public/editor-session.js';
const source=fs.readFileSync('tools/data-editor/public/app.js','utf8');
const ast=ts.createSourceFile('app.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const code=names=>names.map(name=>ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name.text===name).getText(ast)).join('\n');
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const model=(file,source='old')=>({file,source,sourceHash:source,base:'old',declarations:[{name:'DATA',exported:true,node:{}}],issues:[]});
function fixture(names=['saveSource','saveLiteral','load']) {
 const session=new EditorSession(),a=model('a'),b=model('b');session.remember(a);session.remember(b);
 const calls=[],requests=[],renders=[];
 const context=vm.createContext({session,model:a,file:'a',declaration:'DATA',entry:'first',focused:null,fullFile:false,codeNeedsRefresh:false,
  catalog:{files:[{file:'a'},{file:'b'}]},api:(...args)=>{calls.push(args);const req=deferred();requests.push(req);return req.promise;},
  notice:()=>{},render:()=>renders.push(context.file+':'+context.entry),renderTabs:()=>{},sourceLiteral:v=>String(v),
  updateLiteralModel:(m,n,replacement,value,hash)=>{m.source=replacement;m.sourceHash=hash;n.value=value;},
 });
 vm.runInContext(code(names),context);
 return {session,a,b,calls,requests,renders,context};
}
test('saving a draft while navigating never replaces the destination model or selection',async()=>{
 const f=fixture();const save=vm.runInContext("saveSource('new',1)",f.context);
 f.session.navigate();await vm.runInContext("load('b')",f.context);f.context.entry='second';
 f.requests[0].resolve({...model('a','new')});await save;
 assert.equal(f.calls[0][1].file,'a');assert.equal(f.context.model,f.b);assert.equal(f.context.entry,'second');
 assert.equal(f.session.models.get('a').source,'new');assert.equal(f.context.catalog.files[0].dirty,true);
 await vm.runInContext("load('a')",f.context);assert.equal(f.context.model.source,'new');
});
test('completion in the same tab preserves the newly selected item',async()=>{
 const f=fixture();const save=vm.runInContext("saveSource('new')",f.context);
 f.session.navigate();f.context.entry='other';f.requests[0].resolve(model('a','new'));await save;
 assert.equal(f.context.entry,'other');assert.equal(f.context.model.source,'new');
 assert.deepEqual(f.renders,['a:other']);
});
test('queued scalar saves use their captured file after navigation and use its latest hash',async()=>{
 const f=fixture();f.context.target=f.a;f.context.node={source:'old',start:0,end:3};
 f.context.model=f.b;f.context.file='b';
 const save=vm.runInContext("saveLiteral(node,12,{},'value',{},target)",f.context);
 assert.equal(f.calls[0][1].file,'a');f.requests[0].resolve({sourceHash:'12',dirty:true});await save;
 assert.equal(f.context.model,f.b);assert.equal(f.a.source,'12');
});
test('out-of-order tab loads only show the last requested tab',async()=>{
 const f=fixture();f.session.models.clear();
 f.session.navigate();const first=vm.runInContext("load('a')",f.context);
 f.session.navigate();const second=vm.runInContext("load('b')",f.context);
 f.requests[1].resolve(f.b);await second;f.requests[0].resolve(f.a);assert.equal(await first,false);
 assert.equal(f.context.file,'b');assert.equal(f.renders.length,1);
});
test('a late read cannot overwrite a newer saved model',async()=>{
 const session=new EditorSession(),request=deferred();
 const reading=session.read('a',()=>request.promise);const latest=model('a','new');session.remember(latest);
 request.resolve(model('a'));assert.equal(await reading,latest);
});
test('failed save leaves destination and previous cached data intact',async()=>{
 const f=fixture();const save=vm.runInContext("saveSource('bad')",f.context);
 f.context.model=f.b;f.context.file='b';f.requests[0].reject(Error('invalid'));
 await assert.rejects(save,/invalid/);assert.equal(f.context.model,f.b);assert.equal(f.session.models.get('a'),f.a);
});
test('navigation proceeds while a guarded save is awaiting its response',async()=>{
 const saving=deferred(),session=new EditorSession(),locked={dataset:{},closest:()=>null},nav={dataset:{navigation:'true'}};
 const context=vm.createContext({session,busy:false,codeNeedsRefresh:false,codeDirty:false,preparation:undefined,releasePreparation:undefined,writeLocked:new Set(),literalQueue:Promise.resolve(),failedLiterals:new Map(),
  document:{activeElement:null,body:{classList:{add(){},remove(){}}},querySelectorAll:()=>[locked,nav],querySelector:()=>null},
  $:()=>({querySelector:()=>null}),confirmCodeNavigation(){},notice(){},dialog(){},cancelledOperation:Symbol(),saving,
 });
 vm.runInContext(code(['updateWriteLock','guard','navigate']),context);
 const task=vm.runInContext('guard(() => saving.promise)',context);await Promise.resolve();
 assert.equal(locked.inert,true);assert.notEqual(nav.inert,true);
 await vm.runInContext('navigate(() => { navigated = true; })',context);
 assert.equal(context.navigated,true);assert.equal(context.busy,true);
 saving.resolve();await task;assert.equal(locked.inert,false);assert.equal(context.busy,false);
});
