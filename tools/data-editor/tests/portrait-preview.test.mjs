import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { programFor } from '../schema.mjs';
import { portraitPreviewConfig } from '../portrait-preview-config.mjs';
import { portraitGameRect, handPreviewRects, drawPortraitGame } from '../public/portrait-preview.js';
const root=process.cwd();
const config=portraitPreviewConfig(programFor(root),root);

test('game coordinates come from source, including draft scale and status row changes',()=>{
    assert.deepEqual([config.width,config.height],[1280,720]);
    assert.deepEqual(config.log,{x:300,y:150,width:280,height:348});
    assert.equal(config.player.y,config.statuses.y+config.statuses.iconSize/2);
    const player=fs.readFileSync('src/data/player.ts','utf8').replace(/battleScale:\s*[\d.]+/,'battleScale: 1.75');
    const ui=fs.readFileSync('src/data/ui.ts','utf8').replace('x: 30, y: 118, iconSize: 32','x: 30, y: 180, iconSize: 40');
    const draft=portraitPreviewConfig(programFor(root,{'src/data/player.ts':player,'src/data/ui.ts':ui}),root);
    assert.equal(draft.player.scale,1.75);assert.equal(draft.player.y,200);
});
test('portrait geometry scales size and offsets about the top centre; faint displacement stays in screen coordinates',()=>{
    const c={...config,player:{x:145,y:134,scale:2,faintOffset:38}};
    const image={naturalWidth:1000,naturalHeight:2000};
    assert.deepEqual(portraitGameRect(image,{displayHeight:700,offsetX:10,offsetY:-5},c),{x:-185,y:124,width:700,height:1400});
    assert.equal(portraitGameRect(image,{displayHeight:700,offsetY:-5},c,true).y,162);
    assert.deepEqual(portraitGameRect(image,{displayHeight:400},config),{x:config.player.x-100*config.player.scale,y:config.player.y,width:200*config.player.scale,height:400*config.player.scale});
});
test('hand layout matches the game spread and curvature for zero, one and ten cards',()=>{
    assert.deepEqual(handPreviewRects(config,0),[]);
    const one=handPreviewRects(config,1)[0];assert.equal(one.x,config.hand.centerX);assert.equal(one.y,config.hand.y);assert.equal(one.angle,0);
    const many=handPreviewRects(config,10);assert.equal(many[0].x,config.hand.minX);assert.equal(many.at(-1).x,config.hand.maxX);
    assert.equal(many[0].y,config.hand.y+config.hand.bendY);assert.equal(many[0].angle,-config.hand.bendAngle);
});
test('rendering clips to the logical game viewport before drawing the portrait',()=>{
    const calls=[];
    const context=new Proxy({canvas:{width:440,height:300}},{get:(o,key)=>key in o?o[key]:(...args)=>calls.push([key,...args])});
    const image={complete:true,naturalWidth:1000,naturalHeight:2000};
    drawPortraitGame(context,image,{displayHeight:1200},config,{hud:false});
    assert.ok(calls.findIndex(c=>c[0]==='clip')<calls.findIndex(c=>c[0]==='drawImage'));
    assert.deepEqual(calls.find(c=>c[0]==='rect'),['rect',0,0,config.width,config.height]);
});
test('unsupported placement expressions are reported instead of silently using stale defaults',()=>{
    const source=fs.readFileSync('src/data/player.ts','utf8').replace(/battleScale:\s*[\d.]+/,'battleScale: customScale()');
    assert.throws(()=>portraitPreviewConfig(programFor(root,{'src/data/player.ts':source}),root),/player.scale/);
});
