import { RIBBON_HUD } from '../data/ui';
import { clamp, mix, type Outlet } from './ribbonMotion';

export function gradient(ctx: CanvasRenderingContext2D,x: number,y: number,w: number,h: number,colors: string[],vertical=true): CanvasGradient {
  const g=ctx.createLinearGradient(x,y,vertical?x:x+w,vertical?y+h:y);
  colors.forEach((color,i)=>g.addColorStop(i/(colors.length-1),color));return g;
}
export function ribbonPath(ctx: CanvasRenderingContext2D,x: number,y: number,w: number,h: number): void {
  ctx.beginPath();ctx.moveTo(x,y+2);ctx.bezierCurveTo(x+w*.35,y-2,x+w*.7,y+3,x+w,y);
  ctx.lineTo(x+w-3,y+h);ctx.bezierCurveTo(x+w*.7,y+h-1,x+w*.35,y+h+3,x+2,y+h);ctx.closePath();
}
export function ribbon(ctx: CanvasRenderingContext2D,w: number,h: number,value: number,colors: string[],time: number,liquid=false,fromRight=false,alpha=1): void {
  ribbonPath(ctx,-4,-4,w+8,h+8);ctx.fillStyle='#161721';ctx.fill();
  ctx.beginPath();ctx.moveTo(-4,h+5);ctx.quadraticCurveTo(w/2,h+9,w+4,h+4);ctx.strokeStyle='#c5a5c16b';ctx.lineWidth=1;ctx.stroke();
  if(value<=0)return;
  ctx.save();ribbonPath(ctx,0,0,w,h);ctx.clip();ctx.globalAlpha=alpha;
  if(fromRight){ctx.translate(w,0);ctx.scale(-1,1);}
  const filled=w*clamp(value);
  ctx.fillStyle=gradient(ctx,0,0,w,h,[colors[1],colors[0],colors[1]]);
  ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(filled,0);
  for(let n=0;n<=8;n++)ctx.lineTo(Math.max(0,Math.min(w,filled+(liquid&&value<.998?Math.sin(time*3.4+n*.55)*1.4:0))),n*h/8);
  ctx.lineTo(0,h);ctx.closePath();ctx.fill();
  ctx.fillStyle=gradient(ctx,0,0,w,h,[colors[2]+'a0',colors[2]+'00']);ctx.fillRect(2,1,Math.max(0,filled-4),h*.45);
  if(liquid){for(let i=0;i<7;i++){
    const x=(i*29+11)%w,y=h-((time*(3+i%3)+i*7)%h);if(x>filled-4)continue;
    ctx.beginPath();ctx.arc(x,y,.55+(i%3)*.3,0,Math.PI*2);ctx.strokeStyle='#ffe7f29c';ctx.lineWidth=.65;ctx.stroke();
  }}
  ctx.restore();
}
export function reserve(ctx: CanvasRenderingContext2D,w: number,h: number,value: number): void {
  const width=w*clamp(value);if(width<=0)return;
  ctx.save();ribbonPath(ctx,0,0,w,h);ctx.clip();ctx.beginPath();ctx.rect(0,0,width,h);ctx.clip();
  ctx.fillStyle=gradient(ctx,0,0,w,h,RIBBON_HUD.reserveColors);ctx.fillRect(0,0,width,h);
  ctx.strokeStyle='#d6b8e040';ctx.lineWidth=.8;
  for(let i=-h;i<width;i+=7){ctx.beginPath();ctx.moveTo(i,h);ctx.lineTo(i+h*.55,0);ctx.stroke();}
  ctx.restore();ctx.beginPath();ctx.moveTo(width,-2);ctx.lineTo(width,h+2);ctx.strokeStyle='#ffedd4';ctx.lineWidth=1.5;ctx.stroke();
}
export function shield(ctx: CanvasRenderingContext2D,x: number,y: number,colors: string[]): void {
  ctx.beginPath();ctx.moveTo(x,y-12);ctx.lineTo(x+12,y-8);ctx.lineTo(x+11,y+1);
  ctx.quadraticCurveTo(x+10,y+6,x,y+12);ctx.quadraticCurveTo(x-10,y+6,x-11,y+1);ctx.lineTo(x-12,y-8);ctx.closePath();
  ctx.fillStyle=gradient(ctx,x-12,y-12,24,24,colors);ctx.fill();ctx.strokeStyle=colors[0];ctx.lineWidth=1;ctx.stroke();
}
function droplet(ctx: CanvasRenderingContext2D,x: number,y: number,r: number,color: string | CanvasGradient,stretch=1){ctx.beginPath();ctx.ellipse(x,y,r,r*stretch,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
export function playerDrain(ctx: CanvasRenderingContext2D,x: number,y: number,w: number,h: number,p: number,floor: number,liquid: boolean,outlets: Outlet[]) {
  const opacity=Math.min(1,p*8,(1-p)*7);if(opacity<=0)return;
  const effect=RIBBON_HUD.playerDrain, minX=x+w*clamp(floor), maxX=x+w;
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
export function enemyEjection(ctx: CanvasRenderingContext2D,x: number,y: number,w: number,h: number,pulses: {progress: number}[],liquid: boolean) {
  const effect=RIBBON_HUD.enemyEjection;
  for(const pulse of pulses){
    const p=clamp(pulse.progress),fade=Math.sin(Math.PI*p);
    ctx.save();ctx.globalAlpha=fade;
    const startX=x+w+4, startY=y+h/2;
    ctx.lineCap='round';
    // A continuous broad stream plus staggered droplets makes both bursts feel abundant.
    for(let i=0;i<effect.streamCount;i++){
      const lane=i/Math.max(1,effect.streamCount-1)-.5;
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

