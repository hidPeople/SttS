import type Phaser from 'phaser';
import { PORTRAIT_IDLE_MOTION as motion } from '../data/ui';

type Connection = 'M' | 'V' | 'A';
type Accent = Connection | 'aftershock';
type IdleMode = 'paused' | 'reaction' | 'aftershocksOnly' | 'all';
type Clock = { accent: Accent; due: number; rate: number; enemy?: Phaser.GameObjects.Container };
const CONNECTION_DURATION_MS = 320;
const REACTION_BLEND_MS = 140;

function smoothStep(t: number): number {
  return t * t * (3 - 2 * t);
}

function connectionReach(elapsed: number): number {
  const t = elapsed / CONNECTION_DURATION_MS;
  if (t <= 0 || t >= 1) return 0;
  return t < .25 ? smoothStep(t / .25) : 1 - smoothStep((t - .25) / .75);
}

/** Returned callback syncs clocks on status changes, without scanning enemies on every frame. */
export function bindPortraitIdleMotion(
  layer: Phaser.GameObjects.Container, getMode: () => IdleMode,
  connectedEnemy: (part: Connection) => Phaser.GameObjects.Container | undefined, aftershockStacks: () => number,
): () => void {
  const events = layer.scene.events;
  const nextInterval = () => Math.max(1, motion.accentMinIntervalMs
    + Math.random() * Math.max(0, motion.accentMaxIntervalMs - motion.accentMinIntervalMs));
  const clocks = new Map<Accent, Clock>();
  let aftershockTime = 0, connectionTime = 0, breathTime = 0, accentTime = 0, beats = 1;
  let playing: Clock | undefined;
  let strength = 1;
  let running = false;

  const finish = () => {
    if (playing?.enemy?.active) playing.enemy.setPosition(0, 0);
    playing = undefined;
  };
  const sync = () => {
    for (const accent of ['M', 'V', 'A', 'aftershock'] as const) {
      const now = accent === 'aftershock' ? aftershockTime : connectionTime;
      const enemy = accent === 'aftershock' ? undefined : connectedEnemy(accent);
      const stacks = accent === 'aftershock' ? aftershockStacks() : 0;
      const enabled = accent === 'aftershock' ? stacks > 0 : Boolean(enemy?.active);
      const progress = Math.min(1, Math.max(0, stacks - 1) / Math.max(1, motion.aftershockMaxRateStacks - 1));
      const rate = 1 + progress * (Math.max(1, motion.aftershockMaxRate) - 1);
      const clock = clocks.get(accent);
      if (clock && enabled && clock.enemy === enemy) {
        // Preserve the elapsed fraction and the place in the queue for overdue motions.
        if (rate !== clock.rate && clock.due > now) clock.due = now + (clock.due - now) * clock.rate / rate;
        clock.rate = rate;
        continue;
      }
      if (clock && clock === playing) finish();
      if (enabled) clocks.set(accent, { accent, enemy, rate, due: now + nextInterval() / rate });
      else clocks.delete(accent);
    }
  };
  const update = (_time: number, delta: number) => {
    const mode = getMode();
    if (mode === 'paused') {
      if (running) {
        layer.setPosition(0, 0);
        breathTime = 0;
        strength = 1;
        finish();
        running = false;
      }
      return;
    }
    if (!running) sync();
    running = true;
    if (mode === 'reaction') {
      strength = Math.max(0, strength - delta / REACTION_BLEND_MS);
    } else {
      strength = Math.min(1, strength + delta / REACTION_BLEND_MS);
      aftershockTime += delta;
      if (mode === 'all') connectionTime += delta;
    }
    const period = Math.max(1, motion.breathPeriodMs);
    breathTime = (breathTime + delta) % period;
    const phase = breathTime / period;
    // Short inhale, longer exhale, then a brief rest at the bottom.
    const lift = phase < .36 ? smoothStep(phase / .36)
      : phase < .91 ? 1 - smoothStep((phase - .36) / .55) : 0;
    let x = 0, y = -motion.breathHeight * lift;
    if (!playing && mode !== 'reaction' && clocks.size) {
      if (mode === 'aftershocksOnly') {
        const clock = clocks.get('aftershock');
        if (clock && clock.due <= aftershockTime) playing = clock;
      } else {
        // Compare overdue durations because connection clocks pause during enemy turns.
        let longestWait = -1;
        for (const clock of clocks.values()) {
          const wait = (clock.enemy ? connectionTime : aftershockTime) - clock.due;
          if (wait >= 0 && wait > longestWait) { playing = clock; longestWait = wait; }
        }
      }
      if (playing) {
        accentTime = 0;
        beats = playing.accent === 'aftershock' && Math.random() < .5 ? 2 : 1;
        playing.due = (playing.enemy ? connectionTime : aftershockTime) + nextInterval() / playing.rate;
      }
    }
    if (playing) {
      const { accent, enemy } = playing;
      accentTime += delta;
      if (accent === 'aftershock') {
        const beat = accentTime / 140;
        if (beat >= beats) finish();
        else {
          const t = beat % 1;
          y -= motion.aftershockDistance * Math.sin(2 * Math.PI * t) * (1 - t) * (beat >= 1 ? .7 : 1);
        }
      } else {
        const enemyDistance = motion.enemyConnectionDistance * connectionReach(accentTime) * Math.SQRT1_2;
        enemy?.setPosition(-enemyDistance * strength, -enemyDistance * strength);
        const responseTime = accentTime - Math.max(0, motion.connectionLeadMs);
        if (responseTime >= CONNECTION_DURATION_MS) finish();
        else {
          const distance = motion.connectionDistance * connectionReach(responseTime);
          x = accent === 'M' ? -distance : (accent === 'V' ? -1 : 1) * distance * Math.SQRT1_2;
          if (accent !== 'M') y -= distance * Math.SQRT1_2;
        }
      }
    }
    x *= strength;
    y *= strength;
    if (layer.x !== x || layer.y !== y) layer.setPosition(x, y);
  };
  events.on('update', update);
  layer.once('destroy', () => { finish(); events.off('update', update); });
  return sync;
}
