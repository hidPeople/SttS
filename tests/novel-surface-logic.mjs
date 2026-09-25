import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=ts.createSourceFile('surface.ts',fs.readFileSync('src/ui/conversationSurface.ts','utf8'),ts.ScriptTarget.Latest,true);
const cls=source.statements.find(n=>ts.isClassDeclaration(n));
const methods=cls.members.filter(n=>['update','slide'].includes(n.name?.getText(source))).map(n=>n.getText(source)).join('\n');
const constants=source.statements.filter(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>['OPACITY_SLIDER','CONTROLS_HIDE_TRANSPARENCY'].includes(d.name.getText(source)))).map(n=>n.getText(source)).join('\n');
const js=ts.transpileModule(constants+'\nclass Surface {'+methods+'}',{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
const {Surface,slider}=new Function(js+';return {Surface,slider:OPACITY_SLIDER};')();
function setup(){
 const s=new Surface();s.root={getLocalPoint:(x,y)=>({x,y})};s.scene={input:{activePointer:{x:0,y:0}}};
 const node=()=>({visible:true,setVisible(v){this.visible=v;}});s.toolbar=node();s.closeButton=node();s.prefs={opacity:1};s.syncOpacity=()=>{};
 return s;
}
test('controls hide at 50% transparency, reveal near their own area, and remain visible while dragging',()=>{
 const s=setup();
 for(const mode of ['off','auto','skip']){
  s.mode=mode;s.prefs.opacity=.51;s.update();assert.equal(s.toolbar.visible,true);
  for(const opacity of [.5,.49,0]){s.prefs.opacity=opacity;s.update();assert.equal(s.toolbar.visible,false);assert.equal(s.closeButton.visible,false);}
 }
 s.scene.input.activePointer={x:350,y:77};s.update();assert.equal(s.toolbar.visible,true);assert.equal(s.closeButton.visible,false);
 s.scene.input.activePointer={x:514,y:-73};s.update();assert.equal(s.toolbar.visible,false);assert.equal(s.closeButton.visible,true);
 s.dragging=true;s.scene.input.activePointer={x:0,y:0};s.update();assert.equal(s.toolbar.visible,true);
});
test('expanded slider endpoint hits clamp to exactly 0% and 100%, with unchanged rail length',()=>{
 const s=setup();
 s.slide({x:slider.left-8,y:77});assert.equal(s.prefs.opacity,1);
 s.slide({x:slider.left+slider.width+8,y:77});assert.equal(s.prefs.opacity,0);
 s.slide({x:slider.left+slider.width/2,y:77});assert.equal(s.prefs.opacity,.5);
 assert.ok(slider.hitPadding>=8);assert.ok(slider.hitHeight>=32);
});
