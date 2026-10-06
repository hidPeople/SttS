import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { analyze, programFor, diagnostics } from '../schema.mjs';
import { spriteValues } from '../public/sprite-values.js';
import { pointInImage, snapshotPlacement, updatePortraitSource, validatePortraitPoints } from '../public/portrait-anchors.js';
import { implementationPortraitPlacement } from '../portrait-preview-config.mjs';
import { numericPolicy } from '../public/field-policy.js';
import { referenceFieldRule } from '../public/reference-fields.js';
const root=process.cwd(),file='src/data/characterPortraits.ts',source=fs.readFileSync(file,'utf8');
const model=analyze(programFor(root),root,file),node=model.declarations.find(d=>d.name==='CHARACTER_PORTRAITS').node.entries[0].node;
test('EP presentation config opens without errors with static image sources',()=>{
  const m=analyze(programFor(root),root,'src/data/epPresentation.ts');
  assert.deepEqual(m.issues,[]);
});
test('full image click accounts for CSS scale and rejects padding',()=>{
  const bounds={left:100,top:50,width:110,height:150},canvas={width:220,height:300},rect={x:50,y:25,width:100,height:250};
  assert.deepEqual(pointInImage(150,125,bounds,canvas,rect),{x:.5,y:.5});
  assert.equal(pointInImage(110,60,bounds,canvas,rect),undefined);
});
test('per-portrait cache copies nested points and keeps explicit clearing',()=>{
  const a={displayHeight:700,epPoints:{M:{x:.2,y:.1}},sigilPoint:undefined};
  const snapshot=snapshotPlacement(a);a.epPoints.M.x=.9;
  assert.equal(snapshot.epPoints.M.x,.2);assert.ok('sigilPoint' in snapshot);
});
test('preview roundtrip preserves inline TS style, aliases and unset sigil',()=>{
  const before=spriteValues(node,model),after={...before,epPoints:{M:{x:.2,y:.3},V:{x:.4,y:.6}},sigilPoint:undefined};
  const changed=updatePortraitSource(node,before,after);
  assert.ok(!changed.includes('\n'));assert.ok(!changed.includes('"x"'));assert.ok(!changed.includes('sigilPoint'));
  const draft=source.slice(0,node.start)+changed+source.slice(node.end);
  assert.deepEqual(diagnostics(programFor(root,{[file]:draft}),root),[]);
  assert.deepEqual(implementationPortraitPlacement(draft,'Succubus_normal_idle_1').epPoints,after.epPoints);
  assert.equal(implementationPortraitPlacement(draft,'Succubus_normal_idle_1').sigilPoint,undefined);
  const aliasSource="const DEFAULT_CHARACTER_PLACEMENT={displayHeight:700};const CHARACTER_PORTRAITS={A:{displayHeight:600,sigilPoint:{x:.4,y:.5}},B:'A'};";
  assert.deepEqual(implementationPortraitPlacement(aliasSource,'B').sigilPoint,{x:.4,y:.5});
});
test('point limits and effect references agree with the form',()=>{
  for(const bad of [{x:2,y:.5},{x:NaN,y:0},{x:0},{x:0,y:-1}])assert.throws(()=>validatePortraitPoints({sigilPoint:bad}));
  validatePortraitPoints({epPoints:{C:{x:0,y:1}}});
  assert.deepEqual(numericPolicy('x',{declaration:'CHARACTER_PORTRAITS'}),{step:.001,min:0,max:1});
  assert.deepEqual(numericPolicy('travelDuration',{declaration:'EP_HEART_EFFECT'}),{step:10,min:0,exclusiveMin:true});
  assert.deepEqual(referenceFieldRule('requiredRelic','PORTRAIT_SIGIL_EFFECT'),['relics','id']);
});

 test('status application visuals expose required effect/count and optional owner filtering',()=>{
   const m=analyze(programFor(root),root,'src/data/statuses.ts');
   const input=m.declarations.find(d=>d.name==='STATUS_DESCRIPTIONS').node.entries.find(e=>e.key==='Charm').node.args[0];
   const applied=input.entries.find(e=>e.key==='visuals').node.entries[0].node;
   const schema=m.schemas[applied.schema];
   const objects=s=>s.properties?[s]:(s.variants??[]).flatMap(id=>objects(m.schemas[id]));
   const props=objects(schema).flatMap(s=>s.properties);
   assert.equal(props.find(p=>p.name==='effect').optional,false);
   assert.equal(props.find(p=>p.name==='count').optional,false);
   assert.equal(props.find(p=>p.name==='owners').optional,true);
   const leaves=s=>s.variants?s.variants.flatMap(id=>leaves(m.schemas[id])):[s];
   const kinds=leaves(m.schemas[props.find(p=>p.name==='count').schema]);
   assert.ok(kinds.some(s=>s.kind==='number'));
   const values=kinds.flatMap(s=>s.values??[]);assert.ok(values.includes('addedStacks'));assert.ok(values.includes('groupRank'));
 });
