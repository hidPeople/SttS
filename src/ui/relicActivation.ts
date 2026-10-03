import type Phaser from 'phaser';
import { ICON_APPEARANCE } from '../data/ui';
import { setRelicIconGlowPulse } from './dataIcon';

type Activation = { stop: (reset?: boolean) => void };
const active = new WeakMap<Phaser.GameObjects.Container, Activation>();

/** Start immediately without blocking combat. Each icon owns only its latest activation. */
export function playRelicActivation(scene: Phaser.Scene, targets: Phaser.GameObjects.Container[]): void {
  if (!scene.sys.isActive()) return;
  for (const icon of new Set(targets)) {
    if (!icon.active) continue;
    // Keep the current size; cancel the old flash/shrink instead of queuing events.
    active.get(icon)?.stop(false);
    animate(scene, icon);
  }
}

function animate(scene: Phaser.Scene, icon: Phaser.GameObjects.Container): void {
  const config = ICON_APPEARANCE.relicActivation;
  const state = { scale: icon.scaleX, glow: 0 };
  const update = () => {
    if (!icon.active) return;
    icon.setScale(state.scale);
    setRelicIconGlowPulse(icon, state.glow);
  };
  // A retrigger must visibly end the previous flash, even if it was at its peak.
  update();
  let done = false;
  let chain: Phaser.Tweens.TweenChain | undefined;
  const finish = () => stop();
  const stop = (reset = true) => {
    if (done) return;
    done = true;
    scene.events.off('shutdown', finish);
    icon.off('destroy', finish);
    chain?.stop();
    if (reset) { state.scale = 1; state.glow = 0; update(); }
    if (active.get(icon) === activation) active.delete(icon);
  };
  const activation = { stop };
  active.set(icon, activation);
  scene.events.once('shutdown', finish);
  icon.once('destroy', finish);

  const tweens: Phaser.Types.Tweens.TweenBuilderConfig[] = [];
  if (state.scale < config.scale) {
    // Finish only the remaining enlargement when retriggered during grow/shrink.
    const remaining = Math.min(1, (config.scale - state.scale) / Math.max(Number.EPSILON, config.scale - 1));
    tweens.push({ targets: state, scale: config.scale, duration: config.growDuration * remaining, ease: 'Sine.easeOut', onUpdate: update });
  }
  tweens.push(
    { targets: state, glow: 1, duration: config.glowRiseDuration, hold: config.glowHoldDuration, ease: 'Sine.easeOut', onUpdate: update },
    { targets: state, glow: 0, duration: config.glowFadeDuration, ease: 'Sine.easeInOut', onUpdate: update },
    { targets: state, scale: 1, duration: config.shrinkDuration, ease: 'Sine.easeIn', onUpdate: update },
  );
  chain = scene.tweens.chain({ targets: state, tweens, onComplete: finish, onStop: finish });
}
