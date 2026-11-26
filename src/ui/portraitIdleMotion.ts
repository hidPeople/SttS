import type Phaser from 'phaser';
import { PORTRAIT_IDLE_MOTION as motion } from '../data/ui';

type Connection = 'M' | 'V' | 'A';
type Accent = Connection | 'aftershock';
type Clock = { accent: Accent; due: number; rate: number; enemy?: Phaser.GameObjects.Container };
const CONNECTION_DURATION_MS = 320;

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
  layer: Phaser.GameObjects.Container, canMove: () => boolean,
  connectedEnemy: (part: Connection) => Phaser.GameObjects.Container | undefined, aftershockStacks: () => number,
): () => void {
  const events = layer.scene.events;
  const nextInterval = () => Math.max(1, motion.accentMinIntervalMs
    + Math.random() * Math.max(0, motion.accentMaxIntervalMs - motion.accentMinIntervalMs));
  const clocks = new Map<Accent, Clock>();
  let now = 0, breathTime = 0, accentTime = 0, beats = 1;
  let playing: Clock | undefined;
  let running = false;

  const finish = () => {
    if (playing?.enemy?.active) playing.enemy.setPosition(0, 0);
    playing = undefined;
  };
  const sync = () => {
    for (const accent of ['M', 'V', 'A', 'aftershock'] as const) {
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
    if (!canMove()) {
      if (running) {
        layer.setPosition(0, 0);
        breathTime = 0;
        finish();
        running = false;
      }
      return;
    }
    if (!running) sync();
    running = true;
    now += delta;
    const period = Math.max(1, motion.breathPeriodMs);
    breathTime = (breathTime + delta) % period;
    const phase = breathTime / period;
    // Short inhale, longer exhale, then a brief rest at the bottom.
    const lift = phase < .36 ? smoothStep(phase / .36)
      : phase < .91 ? 1 - smoothStep((phase - .36) / .55) : 0;
    let x = 0, y = -motion.breathHeight * lift;
    if (!playing) {
      // An overdue deadline is one pending motion. Oldest first, even when several fall in one frame.
      for (const clock of clocks.values()) {
        if (clock.due <= now && (!playing || clock.due < playing.due)) playing = clock;
      }
      if (playing) {
        accentTime = 0;
        beats = playing.accent === 'aftershock' && Math.random() < .5 ? 2 : 1;
        playing.due = now + nextInterval() / playing.rate;
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
        enemy?.setPosition(-enemyDistance, -enemyDistance);
        const responseTime = accentTime - Math.max(0, motion.connectionLeadMs);
        if (responseTime >= CONNECTION_DURATION_MS) finish();
        else {
          const distance = motion.connectionDistance * connectionReach(responseTime);
          x = accent === 'M' ? -distance : (accent === 'V' ? -1 : 1) * distance * Math.SQRT1_2;
          if (accent !== 'M') y -= distance * Math.SQRT1_2;
        }
      }
    }
    layer.setPosition(x, y);
  };
  events.on('update', update);
  layer.once('destroy', () => { finish(); events.off('update', update); });
  return sync;
}
