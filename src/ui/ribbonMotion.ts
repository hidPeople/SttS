import { RIBBON_HUD } from '../data/ui';
export const clamp=(n: number): number=>Math.max(0,Math.min(1,n));
export const mix=(a: number,b: number,t: number): number=>a+(b-a)*t;
const ease=(n: number): number=>{const t=clamp(n);return t*t*(3-2*t);};
export interface Outlet { position: number; delay: number; cycle: number; radius: number; drift: number }
export function createPlayerOverflow(random=Math.random): Outlet[] {
  const s=RIBBON_HUD.playerDrain,between=(r: number[])=>mix(r[0],r[1],random());
  return Array.from({length:Math.max(1,Math.floor(s.outletCount))},(_,i)=>({
    position:1-(1-(i+random())/s.outletCount)**s.rightBias,
    delay:between(s.delay),cycle:Math.max(.01,between(s.cycle)),radius:between(s.radius),drift:between(s.drift),
  }));
}
export function enemyRelease(elapsed: number): { value: number; pulses: {progress: number}[]; complete: boolean } {
  const p=clamp(RIBBON_HUD.enemyPulses[0].start+elapsed/Math.max(1,RIBBON_HUD.enemyReleaseDuration));
  let value=1,previous=1;
  const pulses: {progress: number}[]=[];
  for(const pulse of RIBBON_HUD.enemyPulses){
    value-=(previous-pulse.remaining)*ease((p-pulse.start)/Math.max(.001,pulse.end-pulse.start));
    if(p>=pulse.start&&p<pulse.end+.11)pulses.push({progress:(p-pulse.start)/(pulse.end-pulse.start+.11)});
    previous=pulse.remaining;
  }
  return {value:clamp(value),pulses,complete:p>=1};
}
