import { CONFIG } from './config.js';
export const clamp = n => Math.max(0, Math.min(1, n));
export const ease = n => { const t = clamp(n); return t * t * (3 - 2 * t); };
export const mix = (a, b, t) => t === 0 ? a : t === 1 ? b : a + (b - a) * t;

/** Deterministic timeline shared by every candidate; scrubbing never depends on frame rate. */
export function sampleMotion(action, progress, base, stats = { playerMaxHp: 100 }) {
  const p = clamp(progress), frame = { ...base, enemyEp: base.ep, enemyEpFromMax: action === 'enemyReset', hpTrail: base.hp, playerOut: 0, enemyOut: [] };
  if (action === 'damage') {
    const timing=CONFIG.damagePreview, hit=base.damage??timing.amount, block=Math.max(0,base.block??0);
    const absorbed=Math.min(block,hit), remainder=hit-absorbed, broken=block>0&&hit>=block;
    const hpStart=block>0?timing.absorbEnd+(broken?timing.breakDuration:0):0;
    const hpEnd=Math.max(0,base.hp-remainder/stats.playerMaxHp);
    frame.block=mix(block,block-absorbed,ease(p/timing.absorbEnd));
    frame.blockImpact=block>0?Math.sin(Math.PI*clamp(p/timing.absorbEnd)):0;
    frame.blockBreak=broken&&p>=timing.absorbEnd?clamp((p-timing.absorbEnd)/timing.breakDuration):-1;
    frame.blockVisibility=block>0?(broken?1-ease((p-hpStart)/.16):1):0;
    frame.hp=mix(base.hp,hpEnd,ease((p-hpStart)/timing.hpDuration));
    frame.hpTrail=mix(base.hp,hpEnd,ease((p-hpStart-timing.trailDelay)/timing.trailDuration));
    frame.hpImpact=remainder>0?Math.sin(Math.PI*clamp((p-hpStart)/timing.hpDuration)):0;
    frame.damagePhase=block>0&&p<timing.absorbEnd?'absorb':frame.blockBreak>=0&&frame.blockBreak<1?'break':remainder>0?'hpDamage':'blocked';
    frame.absorbed=absorbed;frame.hpDamage=Math.min(base.hp*stats.playerMaxHp,remainder);
    frame.enemyHp=base.hp;frame.enemyHpTrail=base.hp;
  } else if (action === 'heal') {
    frame.hp = mix(base.hp, Math.min(1, base.hp + 0.26), ease(p));
    frame.hpTrail = frame.hp;
  } else if (action === 'charge') {
    frame.ep = mix(base.ep, 1, ease(p)); frame.enemyEp = frame.ep;
  } else if (action === 'playerReset') {
    frame.ep = p < 1 ? 1 : base.floor;
    frame.playerOut = p > 0 && p < 1 ? p : 0;
  } else if (action === 'enemyReset') {
    frame.enemyEp = 1;
    let previous = 1;
    for (const pulse of CONFIG.enemyPulses) {
      const t = clamp((p - pulse.start) / (pulse.end - pulse.start));
      frame.enemyEp -= (previous - pulse.remaining) * ease(t);
      if (p >= pulse.start && p < pulse.end + 0.11) frame.enemyOut.push({ progress: (p - pulse.start) / (pulse.end - pulse.start + 0.11), index: frame.enemyOut.length, start: pulse.start });
      previous = pulse.remaining;
    }
    frame.enemyEp = clamp(frame.enemyEp);
  }
  frame.ep = Math.max(base.floor, frame.ep);
  return frame;
}
