import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {analyze, programFor, diagnostics} from '../schema.mjs';
import {updateSpriteSource} from '../public/sprite-edit.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..'),file='src/data/enemySprites.ts';
const base=fs.readFileSync(path.join(root,file),'utf8');
function entry(source,key='grunt'){return analyze(programFor(root,{[file]:source}),root,file).declarations.find(d=>d.name==='ENEMY_SPRITES').node.entries.find(e=>e.key===key).node;}
const bounds={left:42,right:155,top:11,bottom:190};
const before={displayWidth:230,displayHeight:230,frameWidth:200,frameHeight:200,frameCount:16,frameRate:1000/120,bodyOffsetY:0,opaqueBounds:bounds};
test('bounds edits keep helper calls and change only the selected coordinate',()=>{
 const n=entry(base);assert.equal(updateSpriteSource(n,before,before),n.source);
 const source=updateSpriteSource(n,before,{...before,opaqueBounds:{...bounds,top:14}});
 assert.equal(source,n.source.replace('top: 11','top: 14'));
});
test('spread helper edits preserve unrelated properties and source comments',()=>{
 const source=base.replace('top: 32','top: 32 /* measured */');const n=entry(source,'PeakMachine');const b={...before,displayWidth:210,displayHeight:210,opaqueBounds:{left:33,right:167,top:32,bottom:189}};
 const result=updateSpriteSource(n,b,{...b,opaqueBounds:{...b.opaqueBounds,top:40}});
 assert.equal(result,n.source.replace('top: 32','top: 40'));
 assert.match(result,/attackAnimationTimeScale: 6/);
});
test('helper size/offset stay arguments; custom playback creates only necessary overrides',()=>{
 const n=entry(base);
 const sized=updateSpriteSource(n,before,{...before,displayWidth:250,displayHeight:250,bodyOffsetY:-10});
 assert.ok(sized.startsWith('sprite('));assert.match(sized,/250,/);assert.match(sized,/-10\)$/);
 const changed=updateSpriteSource(n,before,{...before,frameRate:12});assert.match(changed,/\.\.\.sprite\(/);assert.match(changed,/frameRate: 12/);assert.doesNotMatch(changed,/frameWidth:|opaqueBounds:/);
 const next=base.slice(0,n.start)+changed+base.slice(n.end),node=entry(next);
 const second=updateSpriteSource(node,{...before,frameRate:12},{...before,frameRate:15});
 assert.equal(second,changed.replace('frameRate: 12','frameRate: 15'));assert.equal((second.match(/\.\.\./g)||[]).length,1);
 assert.deepEqual(diagnostics(programFor(root,{[file]:next}),root),[]);
});
test('explicit object fields are edited in place without growing wrappers',()=>{
 const n=entry(base);const obj=`{...${n.source},opaqueBounds:{left:42,right:155,top:11,bottom:190}}`;
 const source=base.slice(0,n.start)+obj+base.slice(n.end),node=entry(source);
 const result=updateSpriteSource(node,before,{...before,opaqueBounds:{...bounds,top:20},frameRate:10});
 assert.match(result,/top:20/);assert.equal((result.match(/\.\.\./g)||[]).length,1);
 assert.deepEqual(diagnostics(programFor(root,{[file]:source.slice(0,node.start)+result+source.slice(node.end)}),root),[]);
});
