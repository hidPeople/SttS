import { clamp, mix, sampleMotion } from './motion.js';
import { CONFIG } from './config.js';

// Release runs independently across MAX and HP drain; no extra release wait is added.
// animateEpFillTo / flashEpFill / nextPlayerEpRecoveryValue / updateBars / hpDrainEffect.
export const BATTLE_TIMING = { fill: 320, flashStep: 80, flashes: 5, hpChange: 500, drainParticle: 700, drainStagger: 70, drainParticles: 7, endHold: 700 };
export const isBattleAction = action => action === 'playerBattle' || action === 'enemyBattle';
function fillDuration(action, base, stats) {
  const maximum=action==='enemyBattle'?stats?.enemyMaxEp:stats?.playerMaxEp;
  return maximum && Math.round(base.ep*maximum)>=maximum ? 0 : BATTLE_TIMING.fill;
}
export function battleDuration(action, base, stats) {
  const t = BATTLE_TIMING;
  const drain = action === 'enemyBattle' ? Math.max(t.drainParticle + t.drainStagger * (t.drainParticles - 1),t.hpChange) : 0;
  return fillDuration(action,base,stats) + t.flashStep * 2 * t.flashes + drain + t.endHold;
}
const sineOut = t => Math.sin(clamp(t) * Math.PI / 2);
const sineInOut = t => (1 - Math.cos(clamp(t) * Math.PI)) / 2;

export function sampleBattleMotion(action, progress, base, stats) {
  const t = BATTLE_TIMING, ms = clamp(progress) * battleDuration(action,base,stats);
  const peakStart = fillDuration(action,base,stats), resetAt = peakStart + t.flashStep * 2 * t.flashes;
  const pHp = Math.round(base.hp * stats.playerMaxHp), eHp = Math.round(base.hp * stats.enemyMaxHp);
  const pEp = Math.round(base.ep * stats.playerMaxEp), eEp = Math.round(base.ep * stats.enemyMaxEp);
  const floor = Math.min(pEp, Math.round(base.floor * stats.playerMaxEp));
  const frame = { ...base, hp: pHp / stats.playerMaxHp, enemyHp: eHp / stats.enemyMaxHp,
    ep: pEp / stats.playerMaxEp, enemyEp: eEp / stats.enemyMaxEp, floor: floor / stats.playerMaxEp,
    hpTrail: 0, enemyHpTrail: 0, playerOut: 0, enemyOut: [], enemyEpFromMax: false,
    playerEpAlpha: 1, enemyPeakAlpha: 1, drainProgress: -1, phase: '', stats,
    numbers: { playerHp: pHp, enemyHp: eHp, playerEp: pEp, enemyEp: eEp },
  };
  if(action==='enemyBattle'&&eHp<=0){frame.phase='enemyDefeated';return frame;}
  if (action === 'playerBattle') {
    const nextFloor = Math.min(Math.floor(stats.playerMaxEp * .9), floor + Math.max(1, Math.floor(stats.playerMaxEp * .1)));
    if (ms < peakStart) {
      frame.ep = mix(pEp / stats.playerMaxEp, 1, sineOut(ms / t.fill));
      frame.numbers.playerEp = stats.playerMaxEp; frame.phase = 'playerFill';
    } else if (ms < resetAt) {
      frame.ep = 1; frame.numbers.playerEp = stats.playerMaxEp;
      frame.floor = mix(floor, nextFloor, sineInOut((ms - peakStart) / (resetAt - peakStart))) / stats.playerMaxEp;
      const cycle = ((ms - peakStart) / t.flashStep) % 2;
      frame.playerEpAlpha = 1 - .65 * (cycle <= 1 ? cycle : 2 - cycle);
      frame.playerOut=(ms-peakStart)/(resetAt-peakStart);
      frame.phase = 'playerPeak';
    } else {
      frame.ep=frame.floor=nextFloor/stats.playerMaxEp;
      frame.numbers.playerEp=nextFloor;
      frame.phase='playerRecovered';
    }
  } else {
    if (ms < peakStart) {
      frame.enemyEp = mix(eEp / stats.enemyMaxEp, 1, sineOut(ms / t.fill));
      frame.numbers.enemyEp = stats.enemyMaxEp; frame.phase = 'enemyFill';
    } else {
      // Keep the standalone burst speed, starting immediately at MAX. HP drain can overlap.
      const releaseProgress=clamp(CONFIG.enemyPulses[0].start+(ms-peakStart)/CONFIG.durations.enemyReset);
      const release=sampleMotion('enemyReset',releaseProgress,base);
      frame.enemyEp=release.enemyEp;frame.enemyOut=release.enemyOut;frame.enemyEpFromMax=true;
      frame.numbers.enemyEp=Math.round(frame.enemyEp*stats.enemyMaxEp);
      frame.phase='enemyRelease';
      if (ms >= resetAt) {
        const elapsed = ms - resetAt, drain = Math.round(stats.enemyMaxEp * stats.drainRatio);
        // The model values change together; the two HP fills catch up over 500ms.
        const healedHp = Math.min(stats.playerMaxHp, pHp + drain), damagedHp = Math.max(0, eHp - drain);
        frame.hp = mix(pHp, healedHp, sineOut(elapsed / t.hpChange)) / stats.playerMaxHp;
        frame.enemyHp = mix(eHp, damagedHp, sineOut(elapsed / t.hpChange)) / stats.enemyMaxHp;
        frame.numbers = { playerHp: healedHp, enemyHp: damagedHp, playerEp: pEp, enemyEp: frame.numbers.enemyEp };
        frame.drainProgress = elapsed; frame.drainAmount = drain; frame.healAmount = healedHp - pHp;
        frame.enemyHpChip = { from: eHp / stats.enemyMaxHp, to: damagedHp / stats.enemyMaxHp, elapsed };
        frame.phase = elapsed < t.drainParticle + t.drainStagger * (t.drainParticles - 1) ? 'hpDrain' : 'enemyRecovered';
      }
    }
  }
  return frame;
}
