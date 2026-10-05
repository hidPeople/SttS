import { CONFIG } from './config.js';
import { clamp, mix } from './motion.js';
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
function fillLiquid(ctx,kind,x,y,w,h,value,time,colors,liquid) {
  const filled=w*clamp(value);
  if(filled<=0) return;
  ctx.save();vessel(ctx,kind,x,y,w,h);ctx.clip();
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
function marker(ctx,kind,x,y,w,h,floor,language) {
  const xx=x+w*floor;
  ctx.save();ctx.shadowBlur=3;ctx.shadowColor='#171022';ctx.strokeStyle='#ffedd4';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(xx,y-3);ctx.lineTo(xx,y+h+3);ctx.stroke();
  polygon(ctx,[[xx,y+h+7],[xx-3,y+h+3],[xx+3,y+h+3]]);ctx.fillStyle='#ffedd4';ctx.fill();ctx.restore();
  // The label is anchored to the gauge, not to the threshold, so 0%/100% never run outside it.
  label(ctx,language==='ja'?`下限 ${Math.round(floor*100)}`:`FLOOR ${Math.round(floor*100)}`,x,y+h+18,10,'#f1d4f5');
  ctx.beginPath();ctx.moveTo(x+56,y+h+18);ctx.lineTo(x+w,y+h+18);ctx.strokeStyle='#ccb5d738';ctx.lineWidth=.6;ctx.stroke();
}
function gauge(ctx,design,x,y,value,type,state,time,language,enemy=false) {
  const kind=design.kind,colors=type==='hp'?green:pink,h=H,w=W;
  shell(ctx,kind,x,y,w,h);
  vessel(ctx,kind,x,y,w,h);ctx.fillStyle='#101621d9';ctx.fill();
  if(type==='hp'&&state.hpTrail>value){ctx.save();vessel(ctx,kind,x,y,w,h);ctx.clip();ctx.fillStyle='#e4bd7a';ctx.fillRect(x,y,w*state.hpTrail,h);ctx.restore();}
  fillLiquid(ctx,kind,x,y,w,h,value,time,colors,type==='ep'&&design.liquid);
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
  label(ctx,type.toUpperCase(),x-12,y+h/2,10,type==='hp'?'#9eeac7':'#ffc9eb','right');
  label(ctx,`${Math.round(value*100)} / 100`,x+w/2,y+h/2+.5,13,'#fffafa','center');
  if(type==='ep'&&enemy) enemyEjection(ctx,x,y,w,h,state.enemyOut,design.liquid);
  if(type==='ep'&&!enemy&&state.playerOut>0) playerDrain(ctx,kind,x,y,w,h,state.playerOut,state.floor,design.liquid);
  // Keep the threshold readable above falling droplets.
  if(type==='ep'&&!enemy) marker(ctx,kind,x,y,w,h,state.floor,language);
}
function droplet(ctx,x,y,r,color,stretch=1){ctx.beginPath();ctx.ellipse(x,y,r,r*stretch,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
function playerDrain(ctx,kind,x,y,w,h,p,floor,liquid) {
  const opacity=Math.min(1,p*8,(1-p)*7);if(opacity<=0)return;
  ctx.save();ctx.globalAlpha=opacity;
  const minX=x+w*floor+3;
  for(let i=0;i<(kind==='ribbon'?5:3);i++){
    const xx=mix(minX,x+w-4,(i+.5)/(kind==='ribbon'?5:3));
    if(xx>x+w-2)continue;
    const fall=((p*1.7+i*.23)%1), dropY=y+h+5+fall*57;
    ctx.strokeStyle=gradient(ctx,xx,y+h,1,50,['#ffa7debb','#ee75c088','#d558b000']);ctx.lineWidth=liquid?1.5:1;
    ctx.beginPath();ctx.moveTo(xx,y+h+1);ctx.bezierCurveTo(xx-1,y+h+12,xx+Math.sin(i+p*10)*3,dropY-8,xx,dropY);ctx.stroke();
    droplet(ctx,xx,dropY,liquid?1.8:1.1,'#ffaee3',liquid?1.7:1);
  }
  ctx.restore();
}
function enemyEjection(ctx,x,y,w,h,pulses,liquid) {
  for(const pulse of pulses){
    const p=clamp(pulse.progress),fade=Math.sin(Math.PI*p);
    ctx.save();ctx.globalAlpha=fade;
    const startX=x+w+4, startY=y+h/2;
    for(let i=0;i<7;i++){
      const speed=32+i*5,xx=startX+speed*p,yy=startY+(i-3)*p*2.5+14*p*p;
      ctx.strokeStyle=i%2?'#ffd6ee':'#ed7fc7';ctx.lineWidth=liquid?2-i*.18:1;
      ctx.beginPath();ctx.moveTo(startX,startY);ctx.quadraticCurveTo(startX+speed*p*.5,startY-5+(i-3),xx,yy);ctx.stroke();
      droplet(ctx,xx,yy,liquid?1.3+(i%3)*.4:1,'#ffb4e0',.8);
    }
    // Visible nozzle pulse, independent of the shrinking fill's right edge.
    droplet(ctx,startX,startY,2+fade*2,'#ffe2f4',1.3);
    ctx.restore();
  }
}

export function drawStudy(canvas,design,state,{time=0,background,backgroundKind='dungeon',language='ja',action='',progress=0}={}) {
  const ctx=canvas.getContext('2d');ctx.setTransform(canvas.width/CONFIG.canvas.width,0,0,canvas.height/CONFIG.canvas.height,0,0);
  ctx.clearRect(0,0,600,282);
  if(backgroundKind==='dungeon'&&background?.complete&&background.naturalWidth){
    const z=Math.max(600/background.naturalWidth,282/background.naturalHeight);ctx.drawImage(background,(600-background.naturalWidth*z)/2,(282-background.naturalHeight*z)/2,background.naturalWidth*z,background.naturalHeight*z);
    ctx.fillStyle='#17142342';ctx.fillRect(0,0,600,282);
  } else {ctx.fillStyle=backgroundKind==='paper'?'#d8d4ce':'#10131d';ctx.fillRect(0,0,600,282);}
  const wash=ctx.createLinearGradient(0,0,0,282);wash.addColorStop(0,'#10101a32');wash.addColorStop(1,'#10101a88');ctx.fillStyle=wash;ctx.fillRect(0,0,600,282);
  label(ctx,language==='ja'?'プレイヤー':'PLAYER',51,33,13,'#d3e2ff');label(ctx,language==='ja'?'敵 / EPあり':'ENEMY / WITH EP',337,33,13,'#ffe0d4');
  ctx.strokeStyle='#f3e3f024';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(289,26);ctx.lineTo(289,238);ctx.stroke();
  label(ctx,language==='ja'?'サキュバス':'Succubus',51,63,20);label(ctx,language==='ja'?'下級兵':'Grunt',337,63,20);
  gauge(ctx,design,51,90,state.hp,'hp',state,time,language);gauge(ctx,design,337,90,state.hp,'hp',state,time,language,true);
  gauge(ctx,design,51,135,state.ep,'ep',state,time,language);gauge(ctx,design,337,135,state.enemyEp,'ep',state,time,language,true);
  // Independent description strip stays below the longest droplets.
  ctx.fillStyle='#10101966';ctx.fillRect(0,238,600,44);
  const text = language==='ja' ? '残るEP' : 'RETAINED';
  label(ctx,`${text} ${Math.round(state.floor*100)}  /  ${language==='ja'?'排出されるEP':'RELEASED'} ${Math.round(Math.max(0,state.ep-state.floor)*100)}`,24,257,11,'#e6c4e0');
  let stage=language==='ja'?'待機':'IDLE';
  if(action==='enemyReset')stage=progress<.13?'MAX':progress<.46?(language==='ja'?'1回目 →':'PULSE 1 →'):progress<.59?(language==='ja'?'一拍':'PAUSE'):progress<.99?(language==='ja'?'2回目 →':'PULSE 2 →'):'EP 0';
  else if(action==='playerReset')stage=progress<.1?'MAX':progress<.98?(language==='ja'?'排出中 ↓':'DRAINING ↓'):(language==='ja'?'下限で停止':'FLOOR REACHED');
  else if(action)stage=progress>=1?(language==='ja'?'完了':'DONE'):action.toUpperCase();
  label(ctx,stage,578,257,11,'#f3ebda','right');
}
