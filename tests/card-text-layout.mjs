import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const module={exports:{}};
new Function('exports',ts.transpileModule(fs.readFileSync('src/models/cardTextLayout.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(module.exports);
const {fitCardTextLayout}=module.exports;
test('long descriptions reflow to more characters per line instead of uniformly shrinking a narrow block',()=>{
 let calls=0;
 const layout=size=>{calls++;const charsPerLine=Math.floor(130/size),count=Math.ceil(125/charsPerLine);return{height:count*(size+3*Math.min(1,size/10)),charsPerLine,count};};
 const old=layout(10),result=fitCardTextLayout(64,layout);
 assert.ok(result.height<=64);assert.ok(result.fontSize<10);assert.ok(result.charsPerLine>old.charsPerLine);assert.ok(result.count<old.count);
 assert.ok(layout(result.fontSize+.5).height>64);assert.ok(calls<=9);
});
test('short descriptions stay full size and excessive content terminates with a safe lower bound',()=>{
 let calls=0;assert.equal(fitCardTextLayout(64,size=>{calls++;return{height:size};}).fontSize,13);assert.equal(calls,1);
 calls=0;assert.equal(fitCardTextLayout(64,()=>{calls++;return{height:1000};}).fontSize,1);assert.ok(calls<=7);
});
