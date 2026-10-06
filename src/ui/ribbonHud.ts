import Phaser from 'phaser';
import { PresentationDelay } from '../models/presentationDelay';
import { RIBBON_HUD as STYLE } from '../data/ui';
import { GAME_FONT } from './fonts';
import { clamp, mix, createPlayerOverflow, enemyRelease, type Outlet } from './ribbonMotion';
import { ribbon, ribbonPath, reserve, reserveMarker, shield, gradient, playerDrain, enemyEjection } from './ribbonDrawing';

interface Sources {
  hpBg: Phaser.GameObjects.Rectangle; hpFill: Phaser.GameObjects.Rectangle;
  epBg: Phaser.GameObjects.Rectangle; epFill: Phaser.GameObjects.Rectangle;
  epReserveFill: Phaser.GameObjects.Rectangle;
}
let serial=0;
interface EpFrame {
  visible: boolean; width: number; color: number; alpha: number; floor: number;
  releaseElapsed?: number; releaseFromMax: boolean;
  overflow?: { elapsed: number; duration: number; outlets: Outlet[] };
  text?: { key: string; apply: () => void };
}
/** Presentation only. Existing hidden fill rectangles remain the tween state and the
 * transparent background rectangles remain the real input targets. No game logic waits
 * for these textures; scene delta already includes Ctrl speed. */
export class RibbonHud {
  readonly hp: Phaser.GameObjects.Image;
  readonly ep: Phaser.GameObjects.Image;
  private hpTexture: Phaser.Textures.CanvasTexture;
  private epTexture: Phaser.Textures.CanvasTexture;
  private clock=0; private frame=0; private lastHpPaint='';
  private lastEpPaint='';
  private lastEpOutlets?: Outlet[];
  private maxHp=1; private block=0; private blockTarget=0; private retained=false;
  private hpTarget=1; private trail=1; private trailElapsed=1000;
  private hpDamaged=false;
  private blockHit?: { elapsed: number; before: number; after: number; broken: boolean };
  private releaseElapsed: number | undefined;
  private releaseFromMax=false;
  private overflowStartPauses=0;
  private overflow?: { elapsed: number; duration: number; repeat: boolean; outlets: Outlet[] };
  private dead=false;
  private readonly left=36; private readonly top=16;
  private readonly width: number; private readonly height: number;
  private readonly resolution=Math.max(1,STYLE.resolution);
  private epHistory: PresentationDelay<EpFrame>;
  private epFrame?: EpFrame;
  private epText?: EpFrame['text'];
  private paintedText?: string;

  constructor(private scene: Phaser.Scene,private sources: Sources,private player=false,private overflowBlocked=()=>false,private epDelay=0) {
    this.epHistory=new PresentationDelay(epDelay);
    this.width=sources.hpBg.width;this.height=sources.hpBg.height;
    const id=++serial;
    this.hpTexture=scene.textures.createCanvas(`ribbon-hp-${id}`,(this.width+76)*this.resolution,(this.height+40)*this.resolution)!;
    this.epTexture=scene.textures.createCanvas(`ribbon-ep-${id}`,(this.width+120)*this.resolution,(this.height+110)*this.resolution)!;
    this.hp=scene.add.image(sources.hpBg.x-this.left,sources.hpBg.y-this.height/2-this.top,this.hpTexture).setOrigin(0).setScale(1/this.resolution).setDepth(2);
    this.ep=scene.add.image(sources.epBg.x-this.left,sources.epBg.y-this.height/2-this.top,this.epTexture).setOrigin(0).setScale(1/this.resolution).setDepth(2);
    scene.events.on('update',this.update,this);
    scene.events.once('shutdown',this.destroy,this);
    sources.hpBg.once('destroy',this.destroy,this);
    this.update(0,0);
  }

  setEpText(key: string,apply: () => void): void {
    if(this.epText?.key!==key)this.epText={key,apply};
    if(this.paintedText===undefined||this.epDelay<=0){apply();this.paintedText=key;}
  }
  get epEntryX(): number {return this.sources.epBg.x+(this.epFrame?.floor??clamp(this.sources.epReserveFill.scaleX))*this.width;}
  private sampleEp(): EpFrame {
    const s=this.sources;
    return {visible:s.epBg.visible,width:s.epFill.displayWidth,color:s.epFill.fillColor,alpha:s.epFill.alpha,
      floor:clamp(s.epReserveFill.scaleX),releaseElapsed:this.releaseElapsed,releaseFromMax:this.releaseFromMax,
      overflow:this.overflow?{...this.overflow}:undefined,text:this.epText};
  }

  setVitals(hp: number,maxHp: number,block: number,retained: boolean,animate: boolean): void {
    const target=clamp(hp/Math.max(1,maxHp));
    if(target!==this.hpTarget){
      this.hpDamaged=animate&&target<this.hpTarget;
      this.trail=animate?Math.max(target,this.sources.hpFill.displayWidth/this.width):target;
      this.trailElapsed=animate?0:1000;this.hpTarget=target;
    }
    this.maxHp=Math.max(1,maxHp);this.retained=retained;
    if(block!==this.blockTarget){
      this.blockHit=undefined;
      this.scene.tweens.killTweensOf(this);
      this.blockTarget=Math.max(0,block);
      if(animate)this.scene.tweens.add({targets:this,block:this.blockTarget,duration:STYLE.blockDuration,ease:'Sine.easeOut'});
      else this.block=this.blockTarget;
    }
    this.paint();
  }
  impactBlock(before: number,after: number,broken: boolean): void {
    this.scene.tweens.killTweensOf(this);
    this.blockTarget=Math.max(0,after);this.block=before;
    this.blockHit={elapsed:0,before,after:this.blockTarget,broken};
  }
  startEnemyRelease(): void {this.releaseElapsed=0;this.releaseFromMax=true;}
  // A new EP hit takes over the gauge immediately, but already-emitted liquid finishes.
  cancelEnemyRelease(): void {this.releaseFromMax=false;}
  startOverflow(duration: number,repeat=false): () => void {
    const run={elapsed:0,duration:Math.max(1,duration,STYLE.playerDrain.minDuration),repeat,outlets:createPlayerOverflow()};this.overflow=run;
    // Ending the flash stops repetition, not the in-flight overflow. A newer
    // climax replaces this run; an older stop callback must not affect it.
    return ()=>{if(this.overflow===run)run.repeat=false;};
  }
  pauseOverflowStarts(): () => void {
    this.overflowStartPauses++;
    let released=false;
    return ()=>{if(!released){released=true;this.overflowStartPauses--;}};
  }
  private update(_time: number,delta: number): void {
    if(this.dead)return;
    this.clock+=delta;this.frame+=delta;this.trailElapsed+=delta;
    if(this.releaseElapsed!==undefined){
      this.releaseElapsed+=delta;
      // Hooks or a tutorial may keep the model at MAX for longer. Keep the emptied
      // visual until the model resets; never flash back to full between the two.
      if(enemyRelease(this.releaseElapsed).complete&&(!this.releaseFromMax||this.sources.epFill.displayWidth<.1))this.releaseElapsed=undefined;
    }
    if(this.overflow){
      this.overflow.elapsed+=delta;
      if(this.overflow.elapsed>=this.overflow.duration){
        if(!this.overflow.repeat)this.overflow=undefined;
        else if(this.overflowStartPauses>0||this.overflowBlocked())this.overflow.elapsed=this.overflow.duration;
        else {this.overflow.elapsed=0;this.overflow.outlets=createPlayerOverflow();}
      }
    }
    if(this.blockHit){
      const hit=this.blockHit;hit.elapsed+=delta;
      const t=clamp(hit.elapsed/Math.max(1,STYLE.blockDuration));this.block=mix(hit.before,hit.after,Math.sin(t*Math.PI/2));
      if(hit.elapsed>=STYLE.blockDuration+STYLE.blockBreakDuration)this.blockHit=undefined;
    }
    this.hp.setVisible(this.sources.hpBg.visible);
    this.epFrame=this.epHistory.sample(this.clock,this.sampleEp());
    const frame=this.epFrame;
    if(frame.text&&frame.text.key!==this.paintedText){frame.text.apply();this.paintedText=frame.text.key;}
    this.ep.setVisible(frame.visible||this.hasReleaseParticles(frame));
    if(this.frame<1000/Math.max(1,STYLE.fps))return;this.frame=0;this.paint();
  }
  private prepare(texture: Phaser.Textures.CanvasTexture): CanvasRenderingContext2D {
    const ctx=texture.context;
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,texture.width,texture.height);
    ctx.setTransform(this.resolution,0,0,this.resolution,this.left*this.resolution,this.top*this.resolution);return ctx;
  }
  private hasReleaseParticles(frame: EpFrame): boolean {
    return frame.releaseElapsed!==undefined&&!enemyRelease(frame.releaseElapsed).complete;
  }
  private paint(): void {
    if(this.dead)return;
    const s=this.sources,w=this.width,h=this.height;
    const hp=clamp(s.hpFill.displayWidth/w),trail=mix(this.trail,this.hpTarget,clamp((this.trailElapsed-120)/500));
    const signature=JSON.stringify([hp,trail,this.hpDamaged,this.block,this.blockTarget,this.retained,this.blockHit?.elapsed]);
    if(signature!==this.lastHpPaint){
      this.lastHpPaint=signature;const ctx=this.prepare(this.hpTexture);
      ribbon(ctx,w,h,hp,this.hpTarget<1/3?STYLE.lowHpColors:STYLE.hpColors,this.clock/1000);
      if(this.hpDamaged&&trail>hp){ctx.save();ribbonPath(ctx,0,0,w,h);ctx.clip();ctx.fillStyle='#e4bd7a';ctx.fillRect(w*hp,0,w*(trail-hp),h);ctx.restore();}
      if(this.hpDamaged&&this.trail>this.hpTarget&&this.trailElapsed<250){ctx.save();ribbonPath(ctx,0,0,w,h);ctx.clip();ctx.globalAlpha=Math.sin(Math.PI*this.trailElapsed/250)*.4;ctx.fillStyle='#ff656e';ctx.fillRect(0,0,w,h);ctx.restore();}
      this.paintBlock(ctx);
      if(this.player&&this.block<=0&&this.blockTarget<=0&&!this.blockHit)this.paintLabel(ctx,'HP','#9eeac7');
      this.hpTexture.refresh();
    }
    const frame=this.epDelay>0&&this.epFrame?this.epFrame:this.sampleEp();
    if(!frame.visible&&!this.hasReleaseParticles(frame))return;
    const release=frame.releaseElapsed===undefined?undefined:enemyRelease(frame.releaseElapsed);
    const ep=frame.releaseFromMax&&release?release.value:clamp(frame.width/w);
    const bright=frame.color===0xffd1ea;
    const floor=frame.floor;
    // Empty, unchanged bars have no liquid motion. Repeated HUD updates within
    // the same liquid-animation frame also reuse the uploaded texture.
    const animated=frame.visible&&ep>0;
    const epSignature=JSON.stringify([frame.visible,ep,bright,floor,frame.alpha,frame.releaseFromMax,
      release?.complete?undefined:frame.releaseElapsed,frame.overflow?.elapsed,frame.overflow?.duration,
      animated?Math.floor(this.clock*Math.max(1,STYLE.fps)/1000):0]);
    if(epSignature===this.lastEpPaint&&this.lastEpOutlets===frame.overflow?.outlets)return;
    this.lastEpPaint=epSignature;this.lastEpOutlets=frame.overflow?.outlets;
    const ctx=this.prepare(this.epTexture);
    if(frame.visible){
      ribbon(ctx,w,h,ep,bright?['#ffc0e0','#ffd1ea','#fff1f9']:STYLE.epColors,this.clock/1000,true,Boolean(release)&&frame.releaseFromMax,frame.alpha);
      reserve(ctx,w,h,floor);
      if(this.player)this.paintLabel(ctx,'EP','#ffc9eb');
      if(frame.overflow)playerDrain(ctx,0,0,w,h,frame.overflow.elapsed/frame.overflow.duration,floor,true,frame.overflow.outlets);
    }
    if(release)enemyEjection(ctx,0,0,w,h,release.pulses,true);
    // Keep the boundary above droplets. No floor caption or extra vertical lane.
    if(frame.visible&&this.player)reserveMarker(ctx,w,h,floor);
    this.epTexture.refresh();
  }
  private paintLabel(ctx: CanvasRenderingContext2D,text: string,color: string): void {
    ctx.save();ctx.font=`500 10px ${GAME_FONT}`;ctx.textAlign='right';ctx.textBaseline='middle';
    ctx.lineJoin='round';ctx.lineWidth=3;ctx.strokeStyle='rgba(16,14,25,.8)';ctx.fillStyle=color;
    ctx.strokeText(text,-12,this.height/2);ctx.fillText(text,-12,this.height/2);ctx.restore();
  }
  private paintBlock(ctx: CanvasRenderingContext2D): void {
    const hit=this.blockHit,breaking=Boolean(hit?.broken),fracture=breaking?clamp((hit!.elapsed-STYLE.blockDuration)/Math.max(1,STYLE.blockBreakDuration)):0;
    if(this.block<=0&&(!breaking||fracture>=1))return;
    const colors=this.retained?STYLE.retainedBlockColors:STYLE.blockColors;
    const rows=Math.ceil(this.block/this.maxHp),h=STYLE.blockRowHeight;
    // Very large debug values show two full layers plus their exact total, never spill below HP.
    for(let i=0;i<Math.min(rows,2);i++){
      const width=this.width*clamp((this.block-i*this.maxHp)/this.maxHp),y=STYLE.blockTopOffset+i*(h+STYLE.blockRowGap);
      ctx.beginPath();ctx.moveTo(0,y+1);ctx.lineTo(width,y);ctx.lineTo(Math.max(0,width-2),y+h);ctx.lineTo(Math.min(2,width),y+h-1);ctx.closePath();
      ctx.fillStyle=gradient(ctx,0,y,width,h,colors);ctx.fill();ctx.strokeStyle=colors[0];ctx.lineWidth=.8;ctx.stroke();
      ctx.beginPath();ctx.moveTo(0,y+h*.6);ctx.quadraticCurveTo(width*.5,y+h*.2,width,y+h*.7);ctx.strokeStyle=colors[0]+'99';ctx.stroke();
    }
    if(hit&&hit.elapsed<STYLE.blockDuration){ctx.save();ctx.globalAlpha=Math.sin(Math.PI*hit.elapsed/STYLE.blockDuration)*.8;ctx.fillStyle=colors[0];ctx.fillRect(0,STYLE.blockTopOffset,this.width*clamp(this.block/this.maxHp),h);ctx.restore();}
    const sx=STYLE.shieldOffsetX,sy=this.height/2;
    if(breaking&&hit!.elapsed>=STYLE.blockDuration){
      for(const side of [-1,1]){
        ctx.save();ctx.globalAlpha=1-fracture;ctx.translate(sx+side*fracture*10,sy+fracture*5);ctx.rotate(side*fracture*.3);
        ctx.beginPath();ctx.rect(side<0?-20:0,-20,20,40);ctx.clip();shield(ctx,0,0,colors);ctx.restore();
      }
    }else shield(ctx,sx,sy,colors);
    ctx.save();ctx.globalAlpha=1-fracture;ctx.font=`bold 12px ${GAME_FONT}, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.strokeStyle='#eef8ff';ctx.fillStyle=this.retained?STYLE.retainedBlockTextColor:STYLE.blockTextColor;ctx.lineWidth=2.5;ctx.lineJoin='round';
    const text=String(Math.round(this.block));ctx.strokeText(text,sx,sy);ctx.fillText(text,sx,sy);ctx.restore();
  }
  destroy(): void {
    if(this.dead)return;this.dead=true;
    this.scene.events.off('update',this.update,this);this.scene.events.off('shutdown',this.destroy,this);
    this.sources.hpBg.off('destroy',this.destroy,this);this.scene.tweens.killTweensOf(this);
    this.hp.destroy();this.ep.destroy();
    this.scene.textures.remove(this.hpTexture.key);this.scene.textures.remove(this.epTexture.key);
    for(const state of [this.sources.hpFill,this.sources.epFill,this.sources.epReserveFill]){this.scene.tweens.killTweensOf(state);state.destroy();}
  }
}
