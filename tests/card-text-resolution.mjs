import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createServer } from 'vite';
import { numericPolicy, numericWarnings } from '../tools/data-editor/public/field-policy.js';
const server=await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
const {cardTextResolution}=await server.ssrLoadModule('/src/models/cardTextResolution.ts');
const {bindCardTextResolution}=await server.ssrLoadModule('/src/ui/cardTextResolution.ts');
await server.close();

test('size selection preserves all four calibrated values and uses nearest endpoints elsewhere',()=>{
 for(const [scale,resolution] of [[0.74,1],[1,1.4],[1.12,1.5],[1.48,3],[0.2,1],[0.98,1.4],[1.04,1.4],[1.11,1.5],[2,3],[-1.12,1.5]])assert.equal(cardTextResolution(scale),resolution);
 const reordered=[{cardScale:2,resolution:4},{cardScale:0.5,resolution:1}];
 assert.equal(cardTextResolution(1.8,reordered),4);
 assert.equal(cardTextResolution(0.7,reordered),1);
 assert.equal(cardTextResolution(1,[]),1);
 assert.equal(cardTextResolution(1,[{cardScale:0,resolution:2},{cardScale:1,resolution:0.5}]),1);
});

function text() { return {type:'Text',style:{resolution:0},updates:0,setResolution(value){this.style.resolution=value;this.updates++;}}; }
function container(list=[]) { return Object.assign(new EventEmitter(),{type:'Container',list,active:true,visible:true,parentContainer:null,scaleX:1,angle:0,
 getWorldTransformMatrix(matrix={destroy(){this.destroyed=true;}}){let scale=this.scaleX;for(let p=this.parentContainer;p;p=p.parentContainer)scale*=p.scaleX;Object.assign(matrix,{a:scale*Math.cos(this.angle),b:scale*Math.sin(this.angle)});return matrix;},
 getLocalTransformMatrix(){return {destroy(){this.destroyed=true;}};}}); }

test('shared card binding follows hover and parent scale without redrawing stable text, and handles regenerated descriptions',()=>{
 const scene={events:new EventEmitter()},name=text(),description=text(),body=container([description]),root=container([name,body]);
 bindCardTextResolution(scene,root);
 assert.equal(name.style.resolution,1.4);assert.equal(description.style.resolution,1.4);
 for(let i=0;i<10;i++)scene.events.emit('postupdate');
 assert.equal(name.updates,1);assert.equal(description.updates,1);
 root.scaleX=1.12;root.angle=0.23;scene.events.emit('postupdate');
 assert.equal(name.style.resolution,1.5);assert.equal(description.style.resolution,1.5);
 root.scaleX=1;scene.events.emit('postupdate');assert.equal(name.style.resolution,1.4);
 root.scaleX=0.74;scene.events.emit('postupdate');assert.equal(name.style.resolution,1);
 root.parentContainer=container();root.parentContainer.scaleX=2;scene.events.emit('postupdate');assert.equal(name.style.resolution,3);
 const replacement=text();body.list=[replacement];const updates=name.updates;
 scene.events.emit('postupdate');assert.equal(replacement.style.resolution,3);assert.equal(name.updates,updates);
 root.parentContainer.visible=false;root.scaleX=0.5;scene.events.emit('postupdate');assert.equal(name.style.resolution,3);
 root.parentContainer.visible=true;scene.events.emit('postupdate');assert.equal(name.style.resolution,1.4);
 root.emit('destroy');assert.equal(scene.events.listenerCount('postupdate'),0);assert.equal(scene.events.listenerCount('shutdown'),0);
});

test('scene shutdown also releases card observers and decimal settings are accepted',()=>{
 const scene={events:new EventEmitter()},root=container([text()]);
 bindCardTextResolution(scene,root);scene.events.emit('shutdown');
 assert.equal(scene.events.listenerCount('postupdate'),0);assert.equal(root.listenerCount('destroy'),0);
 for(const value of [1,1.4,1.5,3])assert.deepEqual(numericWarnings(value,numericPolicy('resolution')),[]);
 assert.ok(numericWarnings(0.9,numericPolicy('resolution')).length);
 assert.ok(numericWarnings(0,numericPolicy('cardScale')).length);
 assert.deepEqual(numericWarnings(0.74,numericPolicy('cardScale')),[]);
});
