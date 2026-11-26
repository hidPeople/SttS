import type Phaser from 'phaser';
import { PORTRAIT_IDLE_MOTION as motion } from '../data/ui';

export type PortraitIdleAccent = 'M' | 'V' | 'A' | 'aftershock';

function smoothStep(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Only this container moves. The portrait, its crossfade copies and clipped marks travel together. */
export function bindPortraitIdleMotion(
  layer: Phaser.GameObjects.Container, canMove: () => boolean, chooseAccent: () => PortraitIdleAccent | undefined,
): void {
  const events = layer.scene.events;
  const nextInterval = () => Math.max(1, motion.accentMinIntervalMs
    + Math.random() * Math.max(0, motion.accentMaxIntervalMs - motion.accentMinIntervalMs));
  let breathTime = 0, untilAccent = nextInterval(), accentTime = 0, beats = 1;
  let accent: PortraitIdleAccent | undefined;
  let running = false;

  const update = (_time: number, delta: number) => {
    if (!canMove()) {
      if (running) {
        layer.setPosition(0, 0);
        breathTime = 0;
        accent = undefined;
        untilAccent = nextInterval();
        running = false;
      }
      return;
    }
    running = true;
    const period = Math.max(1, motion.breathPeriodMs);
    breathTime = (breathTime + delta) % period;
    const phase = breathTime / period;
    // Short inhale, longer exhale, then a brief rest at the bottom.
    const lift = phase < .36 ? smoothStep(phase / .36)
      : phase < .91 ? 1 - smoothStep((phase - .36) / .55) : 0;
    let x = 0, y = -motion.breathHeight * lift;
    untilAccent -= delta;
    if (!accent && untilAccent <= 0) {
      accent = chooseAccent();
      accentTime = 0;
      beats = accent === 'aftershock' && Math.random() < .5 ? 2 : 1;
      untilAccent = nextInterval();
    }
    if (accent) {
      accentTime += delta;
      if (accent === 'aftershock') {
        const beat = accentTime / 140;
        if (beat >= beats) accent = undefined;
        else {
          const t = beat % 1;
          y -= motion.aftershockDistance * Math.sin(2 * Math.PI * t) * (1 - t) * (beat >= 1 ? .7 : 1);
        }
      } else {
        const t = accentTime / 320;
        if (t >= 1) accent = undefined;
        else {
          const reach = t < .25 ? smoothStep(t / .25) : 1 - smoothStep((t - .25) / .75);
          const distance = motion.connectionDistance * reach;
          x = accent === 'M' ? -distance : (accent === 'V' ? -1 : 1) * distance * Math.SQRT1_2;
          if (accent !== 'M') y -= distance * Math.SQRT1_2;
        }
      }
    }
    layer.setPosition(x, y);
  };
  events.on('update', update);
  layer.once('destroy', () => events.off('update', update));
}
