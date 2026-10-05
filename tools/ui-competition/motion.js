import { CONFIG } from './config.js';
export const clamp = n => Math.max(0, Math.min(1, n));
export const ease = n => { const t = clamp(n); return t * t * (3 - 2 * t); };
export const mix = (a, b, t) => t === 0 ? a : t === 1 ? b : a + (b - a) * t;

/** Deterministic timeline shared by every candidate; scrubbing never depends on frame rate. */
export function sampleMotion(action, progress, base) {
  const p = clamp(progress), frame = { ...base, enemyEp: base.ep, hpTrail: base.hp, playerOut: 0, enemyOut: [] };
  if (action === 'damage') {
    frame.hp = mix(base.hp, Math.max(0, base.hp - 0.31), ease(p / 0.35));
    frame.hpTrail = mix(base.hp, frame.hp, ease((p - 0.3) / 0.65));
  } else if (action === 'heal') {
    frame.hp = mix(base.hp, Math.min(1, base.hp + 0.26), ease(p));
    frame.hpTrail = frame.hp;
  } else if (action === 'charge') {
    frame.ep = mix(base.ep, 1, ease(p)); frame.enemyEp = frame.ep;
  } else if (action === 'playerReset') {
    frame.ep = mix(1, base.floor, ease((p - 0.1) / 0.76));
    frame.playerOut = p > 0.1 && p < 0.98 && base.floor < 1 ? (p - 0.1) / 0.88 : 0;
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
