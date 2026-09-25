import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createServer } from 'vite';
const server = await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
const { PortraitSelection } = await server.ssrLoadModule('/src/models/portraitSelection.ts');
const { PORTRAIT_FACTORS } = await server.ssrLoadModule('/src/data/portraitFactors.ts');
const { portraitIsExposed, bindPortraitHover } = await server.ssrLoadModule('/src/ui/portraitHover.ts');
await server.close();
const id = tags => `Succubus_normal_${tags}_1`;
const context = {playerId:'Succubus', category:'normal', statuses:new Set(['Starvation']), relics:new Set(), hpRatio:1, epRatio:.6};

test('hover adds to the same condition set, including idle, events and percentage tags', () => {
  for (const tags of ['idle', 'Starvation_idle', 'Starvation_EPgte50per', 'Starvation_EPdamage', 'Starvation_peak']) {
    const s = new PortraitSelection([id(tags), id(tags+'_hover'), id('hover')], PORTRAIT_FACTORS);
    const release = s.begin(tags.includes('peak') ? 'peak' : 'EPdamage');
    assert.equal(s.select(context), id(tags));
    assert.equal(s.select({...context, hovered:true}), id(tags+'_hover'));
    assert.equal(s.select({...context, hovered:true}), id(tags+'_hover'));
    assert.equal(s.select(context), id(tags));
    release();
  }
});

test('hover alone cannot displace a higher priority condition; missing variants keep the original image', () => {
  const s = new PortraitSelection([id('idle'),id('hover'),id('Starvation_idle')],PORTRAIT_FACTORS);
  assert.equal(s.select({...context,hovered:true}),id('Starvation_idle'));
  assert.equal(s.select({...context,statuses:new Set(),hovered:true}),id('hover'));
});

test('hover survives event interruption; exiting restores exact image without resurrecting expired conditions', () => {
  const s = new PortraitSelection(['Starvation_idle','Starvation_idle_hover','Starvation_peak','Starvation_peak_hover','idle','idle_hover'].map(id),PORTRAIT_FACTORS);
  const base=s.select(context);
  const hovered={...context,hovered:true};
  assert.equal(s.select(hovered),id('Starvation_idle_hover'));
  const release=s.begin('peak');assert.equal(s.select(hovered),id('Starvation_peak_hover'));
  release();assert.equal(s.select(hovered),id('Starvation_idle_hover'));
  assert.equal(s.select(context),base);
  assert.equal(s.select({...hovered,statuses:new Set()}),id('idle_hover'));
});

const box = (x=0,y=0,width=100,height=100,extra={}) => ({visible:true,alpha:1,getBounds:()=>({contains:(px,py)=>px>=x&&py>=y&&px<x+width&&py<y+height}),...extra});
test('draw-order occlusion includes noninteractive or disabled UI and transparent modal input shields', () => {
  const target=box(), ui=box();
  for (const blocker of [ui,box(0,0,100,100,{input:{enabled:false}}),box(0,0,100,100,{alpha:0,input:{enabled:true}})]) {
    assert.equal(portraitIsExposed([[target,blocker]],target,20,20),false);
    assert.equal(portraitIsExposed([[blocker,target]],target,20,20),true);
  }
  assert.equal(portraitIsExposed([[target,{visible:false,list:[ui]}]],target,20,20),true);
  assert.equal(portraitIsExposed([[target,{alpha:0,list:[ui]}]],target,20,20),true);
  assert.equal(portraitIsExposed([[{visible:false,list:[target]}]],target,20,20),false);
});

test('nested containers do not occlude empty gaps; scenes above and moved reward portraits follow display order', () => {
  const target=box();
  const ui={list:[box(0,0,10,10),box(90,90,10,10)]};
  assert.equal(portraitIsExposed([[{list:[target]},ui]],target,50,50),true);
  assert.equal(portraitIsExposed([[{list:[target]},ui]],target,5,5),false);
  assert.equal(portraitIsExposed([[target],[box()]],target,50,50),false);
  assert.equal(portraitIsExposed([[box()],[{list:[target]}]],target,50,50),true);
});

test('hover observer samples transparency, stationary-pointer occlusion, mouse exit and cleans up listeners', () => {
  const events=new EventEmitter(), gameEvents=new EventEmitter();
  const pointer={x:20,y:20};let pixelAlpha=255;
  const sprite=Object.assign(new EventEmitter(),box(),{active:true,flipX:false,flipY:false,frame:{realWidth:100,realHeight:100,name:'frame'},texture:{key:'portrait'},getLocalPoint:(x,y)=>({x,y})});
  const scene={events,input:{manager:{mousePointer:pointer,isOver:true}},textures:{getPixelAlpha:()=>pixelAlpha},children:{list:[sprite],depthSort(){}},sys:{isVisible:()=>true}};
  scene.game={events:gameEvents,scene:{getScenes:()=>[scene]}};sprite.scene=scene;
  const changes=[];bindPortraitHover(sprite,value=>changes.push(value));
  let now=0;
  const tick=()=>{ gameEvents.emit('poststep',now); now+=100; gameEvents.emit('poststep',now); };
  tick();tick();assert.deepEqual(changes,[true]);
  scene.children.list.push(box());tick();assert.deepEqual(changes,[true,false]);
  scene.children.list.pop();tick();assert.equal(changes.at(-1),true);
  pixelAlpha=0;tick();assert.equal(changes.at(-1),false);
  pixelAlpha=255;tick();scene.input.manager.isOver=false;tick();assert.equal(changes.at(-1),false);
  events.emit('shutdown');assert.equal(gameEvents.listenerCount('poststep'),0);assert.equal(sprite.listenerCount('destroy'),0);
});

test('pre-hover silhouette remains hittable after texture, size and placement change, without accumulating old hover regions', () => {
  const events=new EventEmitter(), gameEvents=new EventEmitter();
  const pointer={x:50,y:50};
  const poses={idle:{x:10,y:10,scale:2,width:100,height:100},hover:{x:300,y:10,scale:3,width:20,height:20}};
  let pose=poses.idle;
  const sprite=Object.assign(new EventEmitter(),{
    visible:true,active:true,alpha:1,flipX:false,flipY:false,
    frame:{realWidth:100,realHeight:100,name:'frame'},texture:{key:'idle'},
    getBounds:()=>({contains:(x,y)=>x>=pose.x&&y>=pose.y&&x<pose.x+pose.width*pose.scale&&y<pose.y+pose.height*pose.scale}),
    getLocalPoint:(x,y)=>({x:(x-pose.x)/pose.scale,y:(y-pose.y)/pose.scale}),
  });
  const scene={events,input:{manager:{mousePointer:pointer,isOver:true}},
    textures:{getPixelAlpha:(x,y,key)=>key==='idle' ? (x>=18&&x<=22&&y>=18&&y<=22?255:0) : 255},
    children:{list:[sprite],depthSort(){}},sys:{isVisible:()=>true}};
  scene.game={events:gameEvents,scene:{getScenes:()=>[scene]}};sprite.scene=scene;
  const changes=[];
  bindPortraitHover(sprite,value=>{
    changes.push(value);const key=value?'hover':'idle';pose=poses[key];
    sprite.texture={key};sprite.frame={realWidth:pose.width,realHeight:pose.height,name:'frame'};
  });
  let now=0;
  const tick=()=>{ gameEvents.emit('poststep',now); now+=100; gameEvents.emit('poststep',now); };
  tick();for(let i=0;i<60;i++)tick();assert.deepEqual(changes,[true]);
  // Current image alone also retains hover; the two regions need not intersect.
  pointer.x=330;tick();assert.deepEqual(changes,[true]);
  pointer.x=50;tick();assert.deepEqual(changes,[true]);
  // The original image's transparent margins are not retained as a bounding rectangle.
  pointer.x=70;tick();assert.deepEqual(changes,[true,false]);
  pointer.x=330;tick();assert.deepEqual(changes,[true,false]);
  pointer.x=50;tick();assert.deepEqual(changes,[true,false,true]);
  // Foreground UI overrides both silhouettes even when only the original is hit.
  scene.children.list.push(box());tick();assert.deepEqual(changes,[true,false,true,false]);
  scene.children.list.pop();tick();assert.equal(changes.at(-1),true);
  scene.input.manager.isOver=false;tick();assert.equal(changes.at(-1),false);
  scene.input.manager.isOver=true;pointer.x=330;tick();assert.equal(changes.at(-1),false);
  events.emit('shutdown');
});

test('both hover transitions require 100 ms continuously, and returning cancels pending changes', () => {
  const events=new EventEmitter(), gameEvents=new EventEmitter();
  const pointer={x:20,y:20};
  const sprite=Object.assign(new EventEmitter(),box(),{active:true,flipX:false,flipY:false,frame:{realWidth:100,realHeight:100,name:'frame'},texture:{key:'portrait'},getLocalPoint:(x,y)=>({x,y})});
  const scene={events,input:{manager:{mousePointer:pointer,isOver:true}},textures:{getPixelAlpha:()=>255},children:{list:[sprite],depthSort(){}},sys:{isVisible:()=>true}};
  scene.game={events:gameEvents,scene:{getScenes:()=>[scene]}};sprite.scene=scene;
  const changes=[];bindPortraitHover(sprite,value=>changes.push(value));
  const sample=(time,inside)=>{pointer.x=inside?20:200;gameEvents.emit('poststep',time);};
  sample(0,true);sample(70,false);assert.deepEqual(changes,[]);
  sample(100,true);sample(149,false);sample(200,true);sample(299,true);
  assert.deepEqual(changes,[]);
  sample(300,true);assert.deepEqual(changes,[true]);
  sample(310,false);sample(350,true);assert.deepEqual(changes,[true]);
  sample(360,false);sample(459,false);assert.deepEqual(changes,[true]);
  sample(460,false);assert.deepEqual(changes,[true,false]);
  // Entry that is interrupted by a foreground UI must restart the full delay.
  sample(500,true);scene.children.list.push(box());sample(550,true);
  scene.children.list.pop();sample(600,true);sample(699,true);assert.deepEqual(changes,[true,false]);
  sample(700,true);assert.deepEqual(changes,[true,false,true]);
  // No queued transition can run after shutdown.
  sample(710,false);events.emit('shutdown');sample(1000,false);
  assert.deepEqual(changes,[true,false,true]);assert.equal(gameEvents.listenerCount('poststep'),0);
});


test('zero-alpha incoming portrait stays hoverable during crossfade without bypassing overlays', () => {
 const target=box(0,0,100,100,{alpha:0}), outgoing=box(), overlay=box();
 assert.equal(portraitIsExposed([[outgoing,target]],target,20,20),true);
 assert.equal(portraitIsExposed([[outgoing,target,overlay]],target,20,20),false);
});
