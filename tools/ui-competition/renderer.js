import { CONFIG } from './config.js';
import { clamp, mix } from './motion.js';
import { combatName, hudLayout, sampleStatuses, counterText } from './game-ui.ts';
import { BATTLE_TIMING } from './battle-motion.js';
const W = 190, H = 16;
const pink = ['#b43b9c', '#e975c0', '#ffc4e9'];
const green = ['#168b70', '#53ce9f', '#c2f3d4'];
function round(ctx,x,y,w,h,r=4) { ctx.beginPath();ctx.roundRect(x,y,Math.max(0,w),h,r); }
function gradient(ctx,x,y,w,h,colors,vertical=true) {
  const g=ctx.createLinearGradient(x,y,vertical?x:x+w,vertical?y+h:y);
  colors.forEach((c,i)=>g.addColorStop(i/(colors.length-1),c));return g;
}
function label(ctx,text,x,y,size=12,color='#f8f0f5',align='left') {
  ctx.font=`500 ${size}px Game, 'Segoe UI', sans-serif`;ctx.textAlign=align;ctx.textBaseline='middle';
  ctx.lineJoin='round';ctx.lineWidth=3;ctx.strokeStyle='rgba(16,14,25,.8)';ctx.strokeText(text,x,y);ctx.fillStyle=color;ctx.fillText(text,x,y);
}
function polygon(ctx,points) {ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();}
function vessel(ctx,kind,x,y,w,h) {
  if(kind==='classic') polygon(ctx,[[x+6,y],[x+w-6,y],[x+w,y+6],[x+w,y+h-6],[x+w-6,y+h],[x+6,y+h],[x,y+h-6],[x,y+6]]);
  else if(kind==='ribbon') {ctx.beginPath();ctx.moveTo(x,y+2);ctx.bezierCurveTo(x+w*.35,y-2,x+w*.7,y+3,x+w,y);ctx.lineTo(x+w-3,y+h);ctx.bezierCurveTo(x+w*.7,y+h-1,x+w*.35,y+h+3,x+2,y+h);ctx.closePath();}
  else round(ctx,x,y,w,h,kind==='glass'?h/2:kind==='cells'?3:3);
}
function shell(ctx,kind,x,y,w,h) {
  ctx.save();ctx.shadowColor='#08070dcc';ctx.shadowBlur=5;ctx.shadowOffsetY=2;
  vessel(ctx,kind,x-4,y-4,w+8,h+8);ctx.fillStyle=kind==='classic'?'#171e2b':kind==='glass'?'#2b253a':'#161721';ctx.fill();ctx.restore();
  if(kind==='classic') {
    vessel(ctx,kind,x-4,y-4,w+8,h+8);ctx.strokeStyle=gradient(ctx,x,y,w,h,['#e4e9ed','#607281','#242d3b','#8b9ba7']);ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle='#c9b785';for(const at of [x-2,x+w+2]) {polygon(ctx,[[at-2,y+h/2],[at,y+h/2-3],[at+2,y+h/2],[at,y+h/2+3]]);ctx.fill();}
  } else if(kind==='glass') {
    vessel(ctx,kind,x-3,y-3,w+6,h+6);ctx.strokeStyle='#d7cfed99';ctx.lineWidth=1;ctx.stroke();
    for(const at of [x+6,x+w-10]) {ctx.fillStyle=gradient(ctx,at,y,4,h,['#e9d6a0','#766b59','#d5bd8a']);ctx.fillRect(at,y-4,3,h+8);}
  } else if(kind==='graphite') {
    // Deterministic short strokes; computed vector geometry, no expensive procedural texture regeneration.
    for(let i=0;i<3;i++){ctx.strokeStyle=['#a89aab88','#d0c3d050','#070a16'][i];ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-4-i,y-3+i);ctx.lineTo(x+w+3-i*2,y-3+i);ctx.moveTo(x-2+i,y+h+3-i);ctx.lineTo(x+w+5-i,y+h+3-i);ctx.stroke();}
    for(let i=0;i<12;i++){ctx.fillStyle=i%2?'#d1c3ce50':'#0c0e13';ctx.fillRect(x+(i*41)%w,y+(i%2?-3:h+2),2+(i%3),1);}
  } else if(kind==='ribbon') {
    ctx.beginPath();ctx.moveTo(x-4,y+h+5);ctx.quadraticCurveTo(x+w/2,y+h+9,x+w+4,y+h+4);ctx.strokeStyle='#c5a5c16b';ctx.lineWidth=1;ctx.stroke();
  }
}
function fillLiquid(ctx,kind,x,y,w,h,value,time,colors,liquid,rightAligned=false) {
  const filled=w*clamp(value);
  if(filled<=0) return;
  ctx.save();vessel(ctx,kind,x,y,w,h);ctx.clip();
  // Mirror only the contents: the frame stays fixed while the empty region advances from 0 to MAX.
  if(rightAligned){ctx.translate(x*2+w,0);ctx.scale(-1,1);}
  ctx.fillStyle=gradient(ctx,x,y,w,h,[colors[1],colors[0],colors[1]]);
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+filled,y);
  for(let n=0;n<=8;n++){const yy=y+n*h/8;const wave=liquid&&value<.998?Math.sin(time*3.4+n*.55)*1.4:0;ctx.lineTo(Math.max(x,Math.min(x+w,x+filled+wave)),yy);}
  ctx.lineTo(x,y+h);ctx.closePath();ctx.fill();
  ctx.fillStyle=gradient(ctx,x,y,w,h,['#ffffff6b','#ffffff00']);ctx.fillRect(x+2,y+1,Math.max(0,filled-4),h*.45);
  if(liquid){
    for(let i=0;i<7;i++){
      const xx=x+((i*29+11)%w), yy=y+h-((time*(3+i%3)+i*7)%h);
      if(xx>x+filled-4)continue;
      ctx.beginPath();ctx.arc(xx,yy,.55+(i%3)*.3,0,Math.PI*2);ctx.strokeStyle='#ffe7f29c';ctx.lineWidth=.65;ctx.stroke();
    }
    if(value<.99){ctx.beginPath();ctx.ellipse(x+filled-1,y+h/2,2,h*.44,0,0,Math.PI*2);ctx.strokeStyle=colors[2]+'c0';ctx.lineWidth=1;ctx.stroke();}
  }
  ctx.restore();
}
function floorRegion(ctx,kind,x,y,w,h,floor) {
  if(floor<=0)return;
  ctx.save();vessel(ctx,kind,x,y,w,h);ctx.clip();
  ctx.fillStyle=gradient(ctx,x,y,w,h,['#9476ae','#423453','#6a497e']);ctx.fillRect(x,y,w*floor,h);
  ctx.beginPath();ctx.rect(x,y,w*floor,h);ctx.clip();
  ctx.strokeStyle='#d6b8e040';ctx.lineWidth=.8;
  for(let i=-h;i<w*floor;i+=7){ctx.beginPath();ctx.moveTo(x+i,y+h);ctx.lineTo(x+i+h*.55,y);ctx.stroke();}
  ctx.restore();
}
function marker(ctx,kind,x,y,w,h,floor,language,maxEp=100) {
  const xx=x+w*floor;
  ctx.save();ctx.shadowBlur=3;ctx.shadowColor='#171022';ctx.strokeStyle='#ffedd4';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(xx,y-3);ctx.lineTo(xx,y+h+3);ctx.stroke();
  polygon(ctx,[[xx,y+h+7],[xx-3,y+h+3],[xx+3,y+h+3]]);ctx.fillStyle='#ffedd4';ctx.fill();ctx.restore();
  // The label is anchored to the gauge, not to the threshold, so 0%/100% never run outside it.
  label(ctx,language==='ja'?`下限 ${formatValue(floor*maxEp)}`:`FLOOR ${formatValue(floor*maxEp)}`,x,y+h+18,10,'#f1d4f5');
  ctx.beginPath();ctx.moveTo(x+56,y+h+18);ctx.lineTo(x+w,y+h+18);ctx.strokeStyle='#ccb5d738';ctx.lineWidth=.6;ctx.stroke();
}
function gauge(ctx,design,x,y,value,type,state,time,language,enemy=false) {
  const kind=design.kind,colors=type==='hp'?green:pink,h=H,w=W;
  const owner=enemy?'enemy':'player',stat=type==='hp'?'Hp':'Ep';
  const maximum=state.stats?.[`${owner}Max${stat}`]??100;
  shell(ctx,kind,x,y,w,h);
  vessel(ctx,kind,x,y,w,h);ctx.fillStyle='#101621d9';ctx.fill();
  if(type==='hp'&&state.hpTrail>value){ctx.save();vessel(ctx,kind,x,y,w,h);ctx.clip();ctx.fillStyle='#e4bd7a';ctx.fillRect(x,y,w*state.hpTrail,h);ctx.restore();}
  ctx.save();if(type==='ep'&&!enemy)ctx.globalAlpha=state.playerEpAlpha??1;
  fillLiquid(ctx,kind,x,y,w,h,value,time,type==='ep'&&state.phase==='playerPeak'&&!enemy?['#ffc0e0','#ffd1ea','#fff1f9']:colors,type==='ep'&&design.liquid,type==='ep'&&enemy&&state.enemyEpFromMax);
  ctx.restore();
  if(type==='ep'&&!enemy) floorRegion(ctx,kind,x,y,w,h,state.floor);
  if(kind==='cells'){
    for(let i=0;i<10;i++) {round(ctx,x+i*w/10+.5,y+.5,w/10-1,h-1,3);ctx.strokeStyle='#d6c0e57a';ctx.lineWidth=.7;ctx.stroke();if(i){ctx.fillStyle='#171825';ctx.fillRect(x+i*w/10-1,y,2,h);}}
    ctx.beginPath();ctx.moveTo(x,y-3);ctx.lineTo(x+w,y-3);ctx.strokeStyle='#b6abc473';ctx.stroke();
  } else if(kind==='classic'){
    for(let i=1;i<10;i++){ctx.fillStyle='#111b3566';ctx.fillRect(x+i*w/10,y+h-4,1,4);}
  } else if(kind==='glass'){
    round(ctx,x+11,y+1,w-22,3,2);ctx.fillStyle='#fff9ff36';ctx.fill();
    ctx.beginPath();ctx.moveTo(x+12,y+h-1);ctx.lineTo(x+w-12,y+h-1);ctx.strokeStyle='#eaddff44';ctx.lineWidth=.6;ctx.stroke();
  }
  if(type==='ep'&&enemy) enemyEjection(ctx,x,y,w,h,state.enemyOut,design.liquid);
  if(type==='ep'&&!enemy&&state.playerOut>0) playerDrain(ctx,x,y,w,h,state.playerOut,state.floor,design.liquid,state.playerOutlets);
  // Keep the threshold readable above falling droplets.
  if(type==='ep'&&!enemy) marker(ctx,kind,x,y,w,h,state.floor,language,maximum);
  // Numbers must remain above the moving reserve boundary, including thresholds near the center.
  label(ctx,type.toUpperCase(),x-12,y+h/2,10,type==='hp'?'#9eeac7':'#ffc9eb','right');
  label(ctx,`${formatValue(state.numbers?.[`${owner}${stat}`]??value*maximum)} / ${maximum}`,x+w/2,y+h/2+.5,13,'#fffafa','center');
}
const formatValue=value=>Number(value.toFixed(1));

function statusRow(ctx,owner,x,y,gameUi,count){
  const size=owner==='player'?hudLayout.playerSize:hudLayout.enemySize;
  sampleStatuses[owner].slice(0,count).forEach(({id,count:stacks},i)=>{
    const icon=gameUi?.icons[id],xx=x+i*(size+hudLayout.gap);
    if(!icon)return;
    const scale=size/Math.max(icon.width,icon.height);
    ctx.drawImage(icon,xx+(size-icon.width*scale)/2,y+(size-icon.height*scale)/2,icon.width*scale,icon.height*scale);
    const counter=counterText(id,stacks);
    if(counter)label(ctx,counter,xx+size+hudLayout.counter.offsetX,y+hudLayout.counter.offsetY,hudLayout.counter.fontSize,'#fff','right');
  });
}

function drainOverlay(ctx,state){
  if(state.drainProgress<0||state.drainProgress===undefined)return;
  const t=BATTLE_TIMING;
  for(let i=0;i<t.drainParticles;i++){
    const p=(state.drainProgress-i*t.drainStagger)/t.drainParticle;
    if(p<0||p>1)continue;
    const eased=(1-Math.cos(p*Math.PI))/2;
    ctx.save();ctx.globalAlpha=1-p;
    label(ctx,'+',mix(430,145,eased),92-Math.sin(p*Math.PI)*26+(i%3-1)*9,19,'#70f29a','center');ctx.restore();
  }
  const chip=state.enemyHpChip;
  if(chip&&chip.elapsed<620){
    const lift=Math.sin(clamp(chip.elapsed/120)*Math.PI/2),shrink=clamp((chip.elapsed-120)/500);
    ctx.save();ctx.globalAlpha=.9*(1-shrink);
    ctx.fillStyle='#ffd166';ctx.fillRect(337+W*chip.to+14*lift,90-12*lift,W*(chip.from-chip.to)*(1-shrink),H);ctx.restore();
  }
  if(state.drainProgress<900){
    ctx.save();ctx.globalAlpha=1-clamp((state.drainProgress-500)/400);
    label(ctx,`−${state.drainAmount}`,535,95,16,'#ff7886');
    if(state.healAmount>0)label(ctx,`+${state.healAmount}`,245,95,16,'#70f29a');ctx.restore();
  }
}
function droplet(ctx,x,y,r,color,stretch=1){ctx.beginPath();ctx.ellipse(x,y,r,r*stretch,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
function playerDrain(ctx,x,y,w,h,p,floor,liquid,outlets) {
  const opacity=Math.min(1,p*8,(1-p)*7);if(opacity<=0)return;
  const effect=CONFIG.playerDrain, minX=x+w*clamp(floor), maxX=x+w;
  if(minX>=maxX)return;
  ctx.save();
  ctx.beginPath();ctx.rect(minX,y+h-1,maxX-minX,effect.fallDistance+40);ctx.clip();
  // Playback-specific outlets keep scrubbing deterministic. Each pool grows, stretches a
  // thinning neck, then breaks free and accelerates, rather than spraying continuously.
  for(const outlet of outlets){
    if(p<outlet.delay)continue;
    const phase=((p-outlet.delay)/outlet.cycle)%1;
    const grow=clamp(phase/.45), stretch=clamp((phase-.45)/.23);
    const detached=phase>=.68, fall=clamp((phase-.68)/.32);
    const radius=Math.min(outlet.radius,(maxX-minX)/3)*(liquid?1:.85);
    const margin=Math.min(radius*1.6,(maxX-minX)/2);
    const xx=mix(minX+margin,maxX-margin,outlet.position), yy=y+h-1;
    const bulbRadius=radius*(.35+.65*grow);
    const length=2+grow*6+stretch*stretch*12;
    const bend=outlet.drift*(detached?1+fall:stretch);
    const bulbX=xx+bend, bulbY=yy+length+effect.fallDistance*fall*fall;
    const poolWidth=radius*(1.2+.35*Math.sin(grow*Math.PI));
    ctx.globalAlpha=opacity;
    // A shallow meniscus remains attached to the lower lip even after a drop separates.
    ctx.fillStyle='#f69cd5';ctx.beginPath();
    ctx.ellipse(xx,yy,poolWidth,1.3+(detached?(1-fall):grow)*1.4,0,0,Math.PI);ctx.fill();
    const paint=gradient(ctx,xx,yy,1,Math.max(10,bulbY-yy+bulbRadius),['#ed8ecb','#f4a5dc','#ffd1eb']);
    if(!detached){
      const neck=radius*(.55*(1-stretch)+.035);
      ctx.fillStyle=paint;ctx.beginPath();ctx.moveTo(xx-poolWidth,yy);
      ctx.bezierCurveTo(xx-neck,yy+2,bulbX-neck,bulbY-bulbRadius*1.8,bulbX-bulbRadius*.7,bulbY);
      ctx.lineTo(bulbX+bulbRadius*.7,bulbY);
      ctx.bezierCurveTo(bulbX+neck,bulbY-bulbRadius*1.8,xx+neck,yy+2,xx+poolWidth,yy);
      ctx.closePath();ctx.fill();
    }
    ctx.globalAlpha=opacity*(1-fall*.75);
    droplet(ctx,bulbX,bulbY,bulbRadius,paint,1+stretch*.25-fall*.15);
    droplet(ctx,bulbX-bulbRadius*.25,bulbY-bulbRadius*.3,bulbRadius*.22,'#fff0f899',.6);
    if(detached&&fall<.65){
      // A small satellite follows a broken neck; no evenly spaced particle curtain.
      droplet(ctx,xx+bend*.4,yy+12+effect.fallDistance*fall*fall*.6,radius*.24,'#f5b0dc',1.5);
    }
  }
  ctx.restore();
}
function enemyEjection(ctx,x,y,w,h,pulses,liquid) {
  const effect=CONFIG.enemyEjection;
  for(const pulse of pulses){
    const p=clamp(pulse.progress),fade=Math.sin(Math.PI*p);
    ctx.save();ctx.globalAlpha=fade;
    const startX=x+w+4, startY=y+h/2;
    ctx.lineCap='round';
    // A continuous broad stream plus staggered droplets makes both bursts feel abundant.
    for(let i=0;i<effect.streamCount;i++){
      const lane=i/(effect.streamCount-1)-.5;
      const reach=effect.reach*(.65+.35*Math.sin(i*2.4)**2)*Math.min(1,p*4);
      const yy=startY+lane*effect.spread+14*p*p;
      ctx.strokeStyle=gradient(ctx,startX,startY,reach,0,['#f394d2','#ffc5e7cc','#ef7bc000'],false);
      ctx.lineWidth=effect.streamWidth*(liquid?1:.85)*(1-Math.abs(lane));
      ctx.beginPath();ctx.moveTo(startX,startY+lane*5);
      ctx.bezierCurveTo(startX+reach*.35,startY+lane*8-3,startX+reach*.7,yy-5,startX+reach,yy);ctx.stroke();
    }
    for(let i=0;i<effect.dropletCount;i++){
      const age=(p-(i/effect.dropletCount)*.58)/.42;
      if(age<=0||age>=1)continue;
      const lane=Math.sin(i*2.399);
      const xx=startX+effect.reach*(.7+.3*Math.cos(i*1.7)**2)*age;
      const yy=startY+lane*effect.spread*age+23*age*age;
      ctx.globalAlpha=fade*Math.min(1,(1-age)*5);
      const radius=effect.dropletRadius*(.65+(i%4)*.2);
      ctx.strokeStyle='#f69ad7';ctx.lineWidth=radius;
      ctx.beginPath();ctx.moveTo(xx-4,yy-1.5);ctx.lineTo(xx,yy);ctx.stroke();
      droplet(ctx,xx,yy,radius,i%3?'#ffb8e2':'#ffe1f2',liquid?.8:1);
    }
    ctx.globalAlpha=fade;
    droplet(ctx,startX,startY,3+fade*2,'#ffe2f4',1.2);
    ctx.restore();
  }
}

export function drawStudy(canvas,design,state,{time=0,background,backgroundKind='dungeon',language='ja',action='',progress=0,gameUi,statusCount=3}={}) {
  const ctx=canvas.getContext('2d');ctx.setTransform(canvas.width/CONFIG.canvas.width,0,0,canvas.height/CONFIG.canvas.height,0,0);
  ctx.clearRect(0,0,600,282);
  if(backgroundKind==='dungeon'&&background?.complete&&background.naturalWidth){
    const z=Math.max(600/background.naturalWidth,282/background.naturalHeight);ctx.drawImage(background,(600-background.naturalWidth*z)/2,(282-background.naturalHeight*z)/2,background.naturalWidth*z,background.naturalHeight*z);
    ctx.fillStyle='#17142342';ctx.fillRect(0,0,600,282);
  } else {ctx.fillStyle=backgroundKind==='paper'?'#d8d4ce':'#10131d';ctx.fillRect(0,0,600,282);}
  const wash=ctx.createLinearGradient(0,0,0,282);wash.addColorStop(0,'#10101a32');wash.addColorStop(1,'#10101a88');ctx.fillStyle=wash;ctx.fillRect(0,0,600,282);
  label(ctx,language==='ja'?'プレイヤー':'PLAYER',51,33,13,'#d3e2ff');label(ctx,language==='ja'?'敵 / EPあり':'ENEMY / WITH EP',337,33,13,'#ffe0d4');
  ctx.strokeStyle='#f3e3f024';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(289,26);ctx.lineTo(289,238);ctx.stroke();
  for(const [owner,x] of [['player',51],['enemy',337]]){
    const name=combatName(owner==='enemy',language);
    ctx.font=`500 15px Game, sans-serif`;
    const patch=gameUi?.patches[owner];
    if(patch)ctx.drawImage(patch,x-10,49,ctx.measureText(name).width+20,29);
    label(ctx,name,x,63,15);
  }
  gauge(ctx,design,51,90,state.hp,'hp',state,time,language);gauge(ctx,design,337,90,state.enemyHp??state.hp,'hp',{...state,hpTrail:state.enemyHpTrail??state.hpTrail},time,language,true);
  gauge(ctx,design,51,117,state.ep,'ep',state,time,language);gauge(ctx,design,337,117,state.enemyEp,'ep',state,time,language,true);
  drainOverlay(ctx,state);
  statusRow(ctx,'player',51,176,gameUi,statusCount);statusRow(ctx,'enemy',337,176,gameUi,statusCount);
  // Independent description strip stays below the longest droplets.
  ctx.fillStyle='#10101966';ctx.fillRect(0,238,600,44);
  const text = language==='ja' ? '残るEP' : 'RETAINED';
  const maxEp=state.stats?.playerMaxEp??100;
  label(ctx,`${text} ${formatValue(state.floor*maxEp)}  /  ${language==='ja'?'排出されるEP':'RELEASED'} ${formatValue(Math.max(0,state.ep-state.floor)*maxEp)}`,24,257,11,'#e6c4e0');
  let stage=language==='ja'?'待機':'IDLE';
  if(action==='enemyReset')stage=progress<.13?'MAX':progress<.46?(language==='ja'?'1回目 →':'PULSE 1 →'):progress<.59?(language==='ja'?'一拍':'PAUSE'):progress<.99?(language==='ja'?'2回目 →':'PULSE 2 →'):'EP 0';
  else if(action==='playerReset')stage=progress<1?(language==='ja'?'満タンから溢れる ↓':'FULL / OVERFLOW ↓'):(language==='ja'?'下限へ復帰':'RESET TO FLOOR');
  else if(action)stage=progress>=1?(language==='ja'?'完了':'DONE'):action.toUpperCase();
  if(state.phase){
    const phases={playerFill:['EP上昇','EP RISING'],playerPeak:['MAX・右から溢れる','MAX / OVERFLOW'],playerRecovered:['下限へ一括復帰','RESET TO FLOOR'],enemyFill:['敵EP上昇','ENEMY EP RISING'],enemyRelease:['MAX・2段排出','MAX / TWO BURSTS'],hpDrain:['HPドレイン（放出と並行）','HP DRAIN / PARALLEL'],enemyRecovered:['排出・ドレイン完了','RELEASE COMPLETE']};
    phases.enemyDefeated=['敵HP 0・攻撃対象外','ENEMY DEFEATED'];
    stage=phases[state.phase][language==='ja'?0:1];
  }
  label(ctx,stage,578,257,11,'#f3ebda','right');
}
