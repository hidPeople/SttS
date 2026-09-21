import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { REFERENCE_FIELDS } from '../public/reference-fields.js';

const parse=file=>ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
test('editor reference map serves the same dropdown and validation fields',()=>{
 const server=parse('tools/data-editor/server.mjs'),app=parse('tools/data-editor/public/app.js');
 for(const source of [server,app]) {
  assert.ok(source.statements.some(node=>ts.isImportDeclaration(node)&&node.importClause?.namedBindings?.elements?.some(e=>e.name.text==='REFERENCE_FIELDS')));
 }
 assert.ok(Object.values(REFERENCE_FIELDS).every(([group,field])=>group&&['key','id'].includes(field)));
});
test('every browser module dependency, including shared reference fields, has a static server route',()=>{
 const source=parse('tools/data-editor/server.mjs');let allowed;
 const visit=node=>{if(ts.isVariableDeclaration(node)&&node.name.getText(source)==='allowed')allowed=new Function('return '+node.initializer.getText(source))();ts.forEachChild(node,visit);};
 visit(source);assert.ok(allowed);
 const visited=new Set();
 const walk=route=>{
  if(visited.has(route))return;visited.add(route);
  assert.ok(allowed[route],route+' is served');
  const [file,mime]=allowed[route];assert.equal(mime,'text/javascript');
  const module=parse(path.join('tools/data-editor/public',file));
  for(const node of module.statements)if(ts.isImportDeclaration(node)&&node.moduleSpecifier.text.startsWith('.'))walk(path.posix.resolve(path.posix.dirname(route),node.moduleSpecifier.text));
 };
 walk('/app.js');assert.ok(visited.has('/reference-fields.js'));
});
