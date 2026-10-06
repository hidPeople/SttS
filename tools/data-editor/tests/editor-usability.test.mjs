import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { sourceLiteral,propertyKey,sourceValue,objectSource,arraySource,definitionEntry,portraitChoices } from '../public/source-format.js';
import { diagnosticLinks,diagnosticRange,diagnosticNode } from '../public/diagnostic-navigation.js';
import { formatSource,mergeProperties } from '../schema.mjs';
function parse(source) {
    const f=ts.createSourceFile('x.ts',source,ts.ScriptTarget.Latest,true);
    assert.equal(f.parseDiagnostics.length,0);
    const visit=n=>({start:n.getStart(f),end:n.end,source:n.getText(f),
        ...(ts.isObjectLiteralExpression(n)?{kind:'object',entries:n.properties.map(p=>({key:p.name?.text,keySource:p.name?.getText(f),node:visit(p.initializer??p),start:p.getFullStart(),end:p.end,raw:p.getFullText(f)}))}:{}),
        ...(ts.isArrayLiteralExpression(n)?{kind:'array',items:n.elements.map(visit)}:{})});
    return visit(f.statements[0].declarationList.declarations[0].initializer);
}
const code=n=>'const value = '+n+';';
test('portrait options use extensionless IDs, preserve aliases and deduplicate legacy choices',()=>{
    assert.deepEqual(portraitChoices([{key:'normal_1',assetFile:'normal_1.png'},{key:'Death_1',assetFile:'normal_1.png'},{assetFile:'normal_1.png'}],'normal_1.png'),['','normal_1','Death_1']);
});
test('TypeScript literals preserve single/double quotes and round-trip all escaped text',()=>{
    for(const value of ["a'b",'a"b','a\\"b',"a\\'b",'line\nnext\r\t','\0','日本語']) {
        for(const reference of ["''",'""']) {
            const source=sourceLiteral(value,reference);const file=ts.createSourceFile('value.ts',code(source),ts.ScriptTarget.Latest,true);
            assert.equal(file.parseDiagnostics.length,0);assert.equal(file.statements[0].declarationList.declarations[0].initializer.text,value);
            assert.equal(source[0],reference[0]);
        }
    }
    assert.equal(propertyKey('displayHeight'),'displayHeight');assert.equal(propertyKey('file-name'),"'file-name'");
    assert.equal(sourceValue({displayHeight:700,offsetX:0,offsetY:0}),'{ displayHeight: 700, offsetX: 0, offsetY: 0 }');
});
test('adding portrait entries keeps placements on a single line with bare keys',()=>{
    const source="const value = {\n  A: { displayHeight: 560, offsetX: 0, offsetY: 0 },\n};";
    const node=parse(source),value=sourceValue({displayHeight:700,offsetX:0,offsetY:0});
    const result=formatSource(code(objectSource(node,[...node.entries,{key:'B',keySource:'B',node:{source:value}}])));
    assert.match(result,/A: \{ displayHeight: 560, offsetX: 0, offsetY: 0 \}/);
    assert.match(result,/B: \{ displayHeight: 700, offsetX: 0, offsetY: 0 \}/);assert.doesNotMatch(result,/"displayHeight"/);parse(result);
});
test('new card, relic and status entries retain unindented definition separators',()=>{
    const source="defineCard({\n  name: l('Sample', '例'),\n  rarity: 'common',\n})";
    const entry=definitionEntry('CARD_DEFINITIONS','sample',source);
    assert.match(entry.raw,/^\n\/\/ =+\n  sample: defineCard/);
    assert.match(entry.node.source,/name: .*\n\/\/ =+\n/);
    const formatted=formatSource('const value = {'+entry.raw+'\n};');
    assert.equal((formatted.match(/^\/\/ =+$/gm)??[]).length,2);
    assert.doesNotMatch(formatted,/^\s+\/\/ =+$/gm);
    assert.equal(definitionEntry('OTHER','sample','{}').raw,undefined);
});
test('inline object property additions, deletion and TS property merges keep inline layout',()=>{
    const source=code("{ height: 560, offset: 0 }");const n=parse(source);
    const result=objectSource(n,[...n.entries,{key:'width',keySource:'width',node:{source:'80'}}]);
    assert.ok(!result.includes('\n'));parse(code(result));
    parse(code(objectSource(n,[])));
    assert.equal(mergeProperties("{ height: 560, offset: 0 }",'offset: 1,'),'{ height: 560, offset: 1 }');
});
test('array add and reorder preserve quotes and comments without forcing line breaks',()=>{
    const source=code("['a', 'b']"),n=parse(source);
    const result=formatSource(code(arraySource([...n.items,"'c'"],n,source)));assert.match(result,/\['a', 'b', 'c'\]/);
    const comments=code("[\n  // first\n  'a',\n  'b', // trailing\n]");const m=parse(comments);
    const reordered=arraySource([m.items[1],m.items[0]],m,comments);parse(code(reordered));assert.match(reordered,/first/);assert.match(reordered,/trailing/);
    const object=parse(code("{\n  a: 1, // tail\n}"));const added=objectSource(object,[...object.entries,{key:'b',keySource:'b',node:{source:'2'}}]);parse(code(added));assert.match(added,/tail/);
});
test('build errors support tsc, Vite, Windows paths, file-only errors, and out-of-scope files',()=>{
    const files=['src/data/cards.ts','src/data/conversations.ts'];
    const messages=['src/data/cards.ts(12,4): error TS2322: invalid','C:\\Game\\src\\data\\conversations.ts:30:8 invalid','[vite] failed to load src/data/cards.ts','src/scenes/BattleScene.ts(4,1): error TS1'];
    const results=diagnosticLinks(messages.join('\n'),[],files);assert.equal(results.length,3);
    assert.equal(results[0].destination,files[0]);assert.equal(results[0].column,4);
    assert.equal(results[1].destination,files[1]);assert.equal(results[1].line,30);assert.equal(results[2].destination,undefined);
    assert.equal(diagnosticLinks(messages[2],[],files)[0].destination,files[0]);
    assert.equal(diagnosticLinks('',[{message:'global error'}],files).length,1);
});
test('line and column errors locate the smallest setting, including errors on property names',()=>{
    const source="const value = {\r\n  a: { height: 'bad' },\r\n};";const n=parse(source);const model={declarations:[{node:n}]};
    const pos=source.indexOf("'bad'");assert.equal(diagnosticRange(source,{start:pos,length:5}).start,pos);
    const range=diagnosticRange(source,{line:2,column:16});assert.equal(range.start,pos);
    assert.equal(diagnosticNode(model,range).source,"'bad'");
    const key=source.indexOf('height');assert.equal(diagnosticNode(model,{start:key,end:key+6}).source,"'bad'");
});
