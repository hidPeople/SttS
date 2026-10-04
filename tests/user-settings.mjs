import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createServer } from 'vite';
const server = await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
const {UserSettingsStore, USER_SETTINGS, normalizeUserSettings} = await server.ssrLoadModule('/src/models/userSettings.ts');
const {SETTINGS_STATE, toggleLanguage} = await server.ssrLoadModule('/src/models/localization.ts');
const {cardHoverPose,nextCardHoverLevel} = await server.ssrLoadModule('/src/models/cardHover.ts');
const {CARD_HOVER} = await server.ssrLoadModule('/src/data/ui.ts');
await server.close();

function memory(raw=null) {
 return {raw,writes:[],async read(){return this.raw;},async write(value){this.writes.push(value);this.raw=value;}};
}
test('all user choices persist together and restore independently of a new run',async()=>{
 const storage=memory(),a=new UserSettingsStore();await a.initialize(storage);
 a.update({language:'en'});a.update({conversation:{design:'paper'}});a.update({conversation:{opacity:0}});a.update({cardHoverLevel:2});
 await a.flush();assert.equal(storage.writes.length,1);
 const b=new UserSettingsStore();await b.initialize(storage);
 assert.deepEqual(b.value,{language:'en',cardHoverLevel:2,conversation:{design:'paper',opacity:0}});
 assert.equal(JSON.parse(storage.raw).version,1);
 b.update({conversation:{opacity:1}});await b.flush();assert.equal(b.value.conversation.design,'paper');
});
test('new installs and invalid fields use safe defaults without erasing valid siblings',()=>{
 assert.deepEqual(normalizeUserSettings(null),{language:'ja',cardHoverLevel:0,conversation:{}});
 assert.deepEqual(normalizeUserSettings({language:'xx',cardHoverLevel:99,conversation:{design:'night',opacity:NaN}}),{language:'ja',cardHoverLevel:0,conversation:{design:'night'}});
 assert.equal(normalizeUserSettings({conversation:{opacity:8}}).conversation.opacity,1);
 assert.equal(normalizeUserSettings({conversation:{opacity:-1}}).conversation.opacity,0);
});
test('corrupt or inaccessible storage cannot block startup; failed writes retain settings and can retry',async t=>{
 t.mock.method(console,'warn',()=>{});
 const a=new UserSettingsStore();await a.initialize(memory('{broken'));
 assert.equal(a.value.language,'ja');
 let failing=true,saved;
 const b=new UserSettingsStore();await b.initialize({async read(){throw Error('unavailable');},async write(value){if(failing)throw Error('full');saved=value;}});
 b.update({language:'en'});await b.flush();assert.equal(b.value.language,'en');
 failing=false;await b.flush();assert.equal(JSON.parse(saved).settings.language,'en');
});
test('future settings versions remain untouched',async()=>{
 const storage=memory(JSON.stringify({version:99,settings:{language:'en'}}));
 const a=new UserSettingsStore();await a.initialize(storage);a.update({cardHoverLevel:2});await a.flush();
 assert.equal(storage.writes.length,0);assert.equal(JSON.parse(storage.raw).version,99);
});
test('writes are serialized and rapid updates finish with the newest snapshot',async()=>{
 const storage=memory(),a=new UserSettingsStore();await a.initialize(storage);
 a.update({language:'en'});const first=a.flush();
 a.update({cardHoverLevel:1});const second=a.flush();
 a.update({cardHoverLevel:2});const third=a.flush();await Promise.all([first,second,third]);
 assert.equal(JSON.parse(storage.raw).settings.cardHoverLevel,2);
 assert.deepEqual(storage.writes.map(x=>JSON.parse(x).settings.cardHoverLevel),[0,1,2]);
});
test('language compatibility accessor writes to the shared preferences',()=>{
 SETTINGS_STATE.language='ja';assert.equal(toggleLanguage(),'en');assert.equal(USER_SETTINGS.value.language,'en');
 SETTINGS_STATE.language='ja';assert.equal(USER_SETTINGS.value.language,'ja');
});
test('wheel levels saturate, preserve the small size and crowding grows progressively',()=>{
 assert.equal(nextCardHoverLevel(0,-100),1);assert.equal(nextCardHoverLevel(1,-100),2);assert.equal(nextCardHoverLevel(2,-100),2);
 assert.equal(nextCardHoverLevel(2,100),1);assert.equal(nextCardHoverLevel(0,100),0);assert.equal(nextCardHoverLevel(1,0),1);
 const small=cardHoverPose(500,10,0,232);assert.equal(small.scale,1.12);assert.equal(small.x,500);
 for(let level=0;level<3;level++) {
  const pose=cardHoverPose(500,10,level,232);assert.equal(pose.y+232*pose.scale/2,CARD_HOVER.bottomY+CARD_HOVER.bottomYStep*level);
 }
 const nine=cardHoverPose(500,9,2,232),ten=cardHoverPose(500,10,2,232),medium=cardHoverPose(500,10,1,232);
 assert.ok(ten.x<nine.x && nine.x<500);assert.ok(medium.x>ten.x && medium.x<500);
});
test('rapid hover resizes replace the previous tween with the latest target; shrink uses no bounce',()=>{
 const source=ts.createSourceFile('BattleScene.ts',fs.readFileSync('src/scenes/BattleScene.ts','utf8'),ts.ScriptTarget.Latest,true);
 const cls=source.statements.find(n=>ts.isClassDeclaration(n)&&n.name.text==='BattleScene');
 const method=cls.members.find(n=>n.name?.getText(source)==='moveHoveredCard').getText(source);
 const code=ts.transpileModule(`class Harness {${method}}`,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
 const Harness=new Function('USER_SETTINGS','CARD_HOVER','CARD_HEIGHT','cardHoverPose',code+';return Harness;')(USER_SETTINGS,CARD_HOVER,232,cardHoverPose);
 const h=new Harness(),calls=[],view={baseX:500,container:{scaleX:1.12}};
 h.tweens={killTweensOf(target){calls.push(['cancel',target]);},add(config){calls.push(['add',config]);}};
 USER_SETTINGS.update({cardHoverLevel:1});h.moveHoveredCard(view,10,280,true);
 USER_SETTINGS.update({cardHoverLevel:2});h.moveHoveredCard(view,10,280,true);
 assert.deepEqual(calls.map(x=>x[0]),['cancel','add','cancel','add']);assert.equal(calls.at(-1)[1].scale,CARD_HOVER.scales[2]);assert.equal(calls.at(-1)[1].ease,'Back.easeOut');
 view.container.scaleX=1.7;USER_SETTINGS.update({cardHoverLevel:0});h.moveHoveredCard(view,10,280,true);assert.equal(calls.at(-1)[1].ease,'Cubic.easeOut');
});
