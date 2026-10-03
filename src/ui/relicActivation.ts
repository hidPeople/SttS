import type Phaser from 'phaser';
import { ICON_APPEARANCE } from '../data/ui';
import { setRelicIconGlowPulse } from './dataIcon';

const pending = new WeakMap<Phaser.GameObjects.Container, Promise<void>>();

/** One shared timeline keeps every relic in this event exactly in phase. */
export function playRelicActivation(scene: Phaser.Scene, targets: Phaser.GameObjects.Container[]): Promise<void> {
  const icons = [...new Set(targets)].filter(icon => icon.active);
  if (!icons.length) return Promise.resolve();
  // Distinct events may arrive during a draw batch; do not let their timelines
  // fight over the same icon or leave a previous caller waiting indefinitely.
  const previous = icons.flatMap(icon => pending.has(icon) ? [pending.get(icon)!] : []);
  const task = Promise.all(previous).then(() => scene.sys.isActive() ? animate(scene, icons) : undefined);
  for (const icon of icons) pending.set(icon, task);
  return task.finally(() => {
    for (const icon of icons) if (pending.get(icon) === task) pending.delete(icon);
  });
}

function animate(scene: Phaser.Scene, icons: Phaser.GameObjects.Container[]): Promise<void> {
  const config = ICON_APPEARANCE.relicActivation;
  const state = { scale: 1, glow: 0 };
  const update = () => {
    for (const icon of icons) if (icon.active) {
      icon.setScale(state.scale);
      setRelicIconGlowPulse(icon, state.glow);
    }
  };
  update();
  return new Promise(resolve => {
    let done = false;
    let chain: Phaser.Tweens.TweenChain | undefined;
    const finish = () => {
      if (done) return;
      done = true;
      scene.events.off('shutdown', finish);
      // TweenChain.remove removes a child tween and requires an argument.
      // stop safely ends the whole chain; completed chains are already pending removal.
      chain?.stop();
      state.scale = 1; state.glow = 0; update();
      resolve();
    };
    scene.events.once('shutdown', finish);
    chain = scene.tweens.chain({
      targets: state,
      tweens: [
        { scale: config.scale, duration: config.growDuration, ease: 'Sine.easeOut', onUpdate: update },
        { glow: 1, duration: config.glowRiseDuration, hold: config.glowHoldDuration, ease: 'Sine.easeOut', onUpdate: update },
        { glow: 0, duration: config.glowFadeDuration, ease: 'Sine.easeInOut', onUpdate: update },
        { scale: 1, duration: config.shrinkDuration, ease: 'Sine.easeIn', onUpdate: update },
      ],
      onComplete: finish,
      onStop: finish,
    });
  });
}
