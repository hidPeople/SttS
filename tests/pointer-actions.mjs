import test from 'node:test';
import assert from 'node:assert/strict';
import EventEmitter from 'eventemitter3';
import fs from 'node:fs';
import ts from 'typescript';
import {createServer} from 'vite';
const server=await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
const {onPrimaryClick,emitPrimaryClick,installPointerBack,pointerActionHandled}=await server.ssrLoadModule('/src/ui/pointerActions.ts');
await server.close();

test('only left clicks activate controls; keyboard confirmation ignores the last physical button',()=>{
 const object=new EventEmitter(),calls=[];
 onPrimaryClick(object,p=>calls.push([p.button,p.x,p.event]));
 for(const button of [1,2,3,4])object.emit('pointerup',{button});
 assert.deepEqual(calls,[]);
 object.emit('pointerup',{button:0,x:20});
 const actual={button:2,x:80,event:{}};emitPrimaryClick(object,actual);
 assert.deepEqual(calls,[[0,20,undefined],[0,80,undefined]]);assert.equal(actual.button,2);assert.ok(actual.event);
});

test('right click runs one back action, delegates novel input and removes listeners on shutdown',()=>{
 const canvas=new EventTarget(),scene={input:new EventEmitter(),events:new EventEmitter(),game:{canvas,scene:{getScenes:()=>[scene]}}};
 let backs=0,delegate=false;
 installPointerBack(scene,()=>{if(delegate)return false;backs++;return true;});
 for(const button of [0,1,3,4])scene.input.emit('pointerup',{button,event:{}});
 assert.equal(backs,0);
 const pointer={button:2,event:{}};scene.input.emit('pointerup',pointer);
 assert.equal(backs,1);assert.equal(pointerActionHandled(pointer),true);
 scene.input.emit('pointerup',pointer);assert.equal(backs,1);
 delegate=true;const novel={button:2,event:{}};scene.input.emit('pointerup',novel);
 assert.equal(pointerActionHandled(novel),false);assert.equal(backs,1);
 delegate=false;scene.game.scene.getScenes=()=>[scene,{}];scene.input.emit('pointerup',{button:2,event:{}});assert.equal(backs,1);
 scene.game.scene.getScenes=()=>[scene];
 const context=new Event('contextmenu',{cancelable:true});canvas.dispatchEvent(context);assert.equal(context.defaultPrevented,true);
 scene.events.emit('shutdown');assert.equal(scene.input.listenerCount('pointerup'),0);
 const after=new Event('contextmenu',{cancelable:true});canvas.dispatchEvent(after);assert.equal(after.defaultPrevented,false);
});

function sceneClass(name) {
 const file=`src/scenes/${name}.ts`,source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
 const cls=source.statements.find(n=>ts.isClassDeclaration(n)&&n.name.text===name);
 const goBack=cls.members.find(n=>n.name?.getText(source)==='goBack').getText(source);
 const code=ts.transpileModule(`class Harness {${goBack}}`,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
 return {Harness:new Function(code+';return Harness;')(),cls,source};
}

test('Escape and right-click back follow the modal cancel action before closing menus',()=>{
 for(const name of ['BattleScene','RewardScene','DefeatEventScene']) {
  const {Harness,cls,source}=sceneClass(name),h=new Harness(),calls=[];
  Object.assign(h,{modalOverlay:{visible:true},modalBack:()=>calls.push('no'),hideModal:()=>calls.push('close'),showSettingsMenu:()=>calls.push('settings')});
  h.goBack();assert.deepEqual(calls,['no']);
  h.modalBack=()=>h.hideModal();h.goBack();assert.deepEqual(calls,['no','close']);
  h.modalOverlay.visible=false;h.goBack();assert.equal(calls.at(-1),'settings');
  for(const method of ['showConfirmDialog','showHelpPage']) {
   const body=cls.members.find(n=>n.name?.getText(source)===method).getText(source);
   assert.match(body,/this\.modalBack = \(\) => this\.showSettingsMenu\(\)/);
  }
 }
});
