import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { analyze, programFor, diagnostics } from '../schema.mjs';
import { spriteValues } from '../public/sprite-values.js';
import { beginPortraitAnchorDrag, movePortraitAnchors, snapshotPortraitAnchors, copyPortraitAnchors, pastedPortraitAnchors, previousPortraitAnchors, portraitDetailRect, zoomPortraitDetail, portraitAnchorPositions, pointInImage, snapshotPlacement, updatePortraitSource, validatePortraitPoints } from '../public/portrait-anchors.js';
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

test('detail zoom preserves the image point beneath the cursor and placement coordinates',()=>{
  const image={width:1000,height:2000},canvas={width:600,height:800},view={zoom:1,x:0,y:0},pointer={x:340,y:250};
  const before=portraitDetailRect(image,canvas,view);
  assert.equal(before.height,776);assert.equal(before.width,388);
  const next=zoomPortraitDetail(image,canvas,view,pointer,-240);
  const after=portraitDetailRect(image,canvas,next);
  assert.ok(next.zoom>1);
  for(const axis of ['x','y']) {
    const length=axis==='x'?'width':'height';
    assert.ok(Math.abs((pointer[axis]-before[axis])/before[length]-(pointer[axis]-after[axis])/after[length])<1e-12);
  }
  const bounds={left:0,top:0,width:600,height:800};
  assert.deepEqual(pointInImage(pointer.x,pointer.y,bounds,canvas,before),pointInImage(pointer.x,pointer.y,bounds,canvas,after));
  assert.deepEqual(view,{zoom:1,x:0,y:0});
  assert.equal(zoomPortraitDetail(image,canvas,{zoom:8,x:0,y:0},pointer,-300).zoom,8);
  assert.equal(zoomPortraitDetail(image,canvas,{zoom:.5,x:0,y:0},pointer,300).zoom,.5);
  const panned=portraitDetailRect(image,canvas,{...next,x:next.x+40,y:next.y-30});
  assert.deepEqual(pointInImage(pointer.x+40,pointer.y-30,bounds,canvas,panned),pointInImage(pointer.x,pointer.y,bounds,canvas,after));
});
test('preview shows image points in both views and screen defaults only in the game view',()=>{
  const defaults={M:{x:.5,y:.2},B:{x:.5,y:.5},V:{x:.5,y:.667}};
  const values={epPoints:{M:{x:.3,y:.6}},sigilPoint:{x:.5,y:.8}};
  const image={x:50,y:25,width:100,height:250};
  const screen={x:0,y:134,width:290,height:586};
  assert.deepEqual(portraitAnchorPositions(values,defaults,image),{M:{x:80,y:175},sigil:{x:100,y:225}});
  const before=portraitAnchorPositions(values,defaults,image,screen);
  const after=portraitAnchorPositions(values,defaults,{x:-250,y:-50,width:1000,height:2000},screen);
  assert.deepEqual(before.B,{x:145,y:427});assert.deepEqual(after.B,before.B);assert.deepEqual(after.V,before.V);
  assert.notDeepEqual(after.M,before.M);assert.notDeepEqual(after.sigil,before.sigil);
});

test('per-portrait cache copies nested points and keeps explicit clearing',()=>{
  const a={displayHeight:700,epPoints:{M:{x:.2,y:.1}},sigilPoint:undefined};
  const snapshot=snapshotPlacement(a);a.epPoints.M.x=.9;
  assert.equal(snapshot.epPoints.M.x,.2);assert.ok('sigilPoint' in snapshot);
});

test('marker drag keeps overlapping parts together without adding unset parts or snapping the grab offset',()=>{
  const values={displayHeight:800,offsetX:12,epPoints:{M:{x:.3,y:.2},C:{x:.5,y:.7},V:{x:.5,y:.7},A:{x:.6,y:.7}},sigilPoint:{x:.5,y:.7}};
  const rect={x:20,y:40,width:200,height:400},at={x:124,y:323};
  const drag=beginPortraitAnchorDrag(values,at,rect);
  assert.deepEqual(drag.keys,['C','V','sigil']);
  movePortraitAnchors(values,drag,{x:144,y:363});
  for(const p of [values.epPoints.C,values.epPoints.V,values.sigilPoint])assert.deepEqual(p,{x:.6,y:.8});
  assert.deepEqual(values.epPoints.A,{x:.6,y:.7});assert.deepEqual(values.epPoints.M,{x:.3,y:.2});
  assert.equal(values.epPoints.B,undefined);assert.equal(values.displayHeight,800);assert.equal(values.offsetX,12);
  // A drag never recruits other markers it passes through, and is relative to its start, not the last event.
  movePortraitAnchors(values,drag,{x:154,y:383});
  assert.deepEqual(values.epPoints.V,{x:.65,y:.85});assert.deepEqual(values.epPoints.A,{x:.6,y:.7});
  movePortraitAnchors(values,drag,{x:-1000,y:2000});
  assert.deepEqual(values.sigilPoint,{x:0,y:1});
});

test('marker hit testing handles scaled canvas radius and ignores unset locations and empty space',()=>{
  const values={epPoints:{M:{x:.5,y:.5}}},rect={x:-100,y:20,width:400,height:800};
  assert.equal(beginPortraitAnchorDrag(values,{x:119,y:420},rect),undefined);
  assert.deepEqual(beginPortraitAnchorDrag(values,{x:119,y:420},rect,{x:24,y:24}).keys,['M']);
  assert.equal(beginPortraitAnchorDrag({}, {x:100,y:420},rect),undefined);
  assert.equal(beginPortraitAnchorDrag(values,{x:300,y:500},rect),undefined);
  assert.equal(beginPortraitAnchorDrag(values,{x:100,y:420},undefined),undefined);
});

test('anchor clipboard copies all points deeply and preserves absence without copying placement',()=>{
  const source={displayHeight:900,offsetX:50,epPoints:{M:{x:.3,y:.2},V:{x:.4,y:.7}},sigilPoint:{x:.5,y:.6}};
  copyPortraitAnchors(source,'A');source.epPoints.M.x=.9;
  const copy=pastedPortraitAnchors();assert.equal(copy.id,'A');assert.equal(copy.values.epPoints.M.x,.3);
  assert.equal('displayHeight' in copy.values,false);assert.equal('offsetX' in copy.values,false);
  copy.values.epPoints.M.x=0;assert.equal(pastedPortraitAnchors().values.epPoints.M.x,.3);
  const destination={displayHeight:600,offsetX:20,epPoints:{B:{x:.5,y:.5}},sigilPoint:{x:.2,y:.3}};
  Object.assign(destination,snapshotPortraitAnchors({}));
  assert.equal(destination.epPoints,undefined);assert.equal(destination.sigilPoint,undefined);
  assert.equal(destination.displayHeight,600);assert.equal(destination.offsetX,20);
  copyPortraitAnchors({},'Empty');assert.ok(pastedPortraitAnchors());
  assert.equal(pastedPortraitAnchors().values.epPoints,undefined);
});

test('previous portrait uses source order, resolves aliases, and prefers per-image preview edits',()=>{
  const node=value=>typeof value==='object'?{kind:'object',entries:Object.entries(value).map(([key,v])=>({key,node:node(v)}))}:{kind:typeof value,value};
  const m={declarations:[{name:'CHARACTER_PORTRAITS',node:{entries:[
    {key:'Z',node:node({displayHeight:700,epPoints:{M:{x:.2,y:.3}},sigilPoint:{x:.5,y:.6}})},
    {key:'Alias',node:node('Z')},
    {key:'A',node:node({displayHeight:800})},
  ]}}]};
  assert.equal(previousPortraitAnchors('Z',m),undefined);
  assert.equal(previousPortraitAnchors('missing',m),undefined);
  const saved=previousPortraitAnchors('A',m);assert.equal(saved.id,'Alias');assert.equal(saved.values.epPoints.M.x,.2);
  const edits=new Map([['Z',{epPoints:{C:{x:.7,y:.8}},sigilPoint:undefined}]]);
  const pending=previousPortraitAnchors('A',m,edits);
  assert.equal(pending.values.epPoints.M,undefined);assert.equal(pending.values.epPoints.C.x,.7);assert.equal(pending.values.sigilPoint,undefined);
  pending.values.epPoints.C.x=0;assert.equal(edits.get('Z').epPoints.C.x,.7);
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
  for(const key of ['singlePartMaxCount','multiPartMaxCount'])assert.deepEqual(numericPolicy(key,{declaration:'EP_HEART_EFFECT'}),{step:1,min:0,integer:true});
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
