import type Phaser from 'phaser';

/** Scale the scene simulation once. Phaser 3.90 tweens use their own wall clock. */
export function installGameSpeed(game: Phaser.Game): void {
  const controls = new Set<string>();
  let simulationTime = 0;
  const tweenFactors = new WeakMap<Phaser.Tweens.TweenManager, number>();
  const keyDown = (event: KeyboardEvent) => {
    if (event.key === 'Control') controls.add(event.code);
  };
  const keyUp = (event: KeyboardEvent) => {
    if (event.key === 'Control') controls.delete(event.code);
    if (!event.ctrlKey) controls.clear();
  };
  const reset = () => controls.clear();
  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  window.addEventListener('blur', reset);
  document.addEventListener('visibilitychange', reset);
  const original = game.scene.update;
  game.scene.update = function (time: number, delta: number): void {
    const speed = controls.size ? 2 : 1;
    simulationTime += delta * speed;
    for (const scene of this.getScenes(true)) {
      if (!tweenFactors.has(scene.tweens)) {
        const manager = scene.tweens;
        // TweenManager.start resets timeScale on scene restart.
        scene.events.once('shutdown', () => tweenFactors.delete(manager));
      }
      const previous = tweenFactors.get(scene.tweens) ?? 1;
      scene.tweens.timeScale = scene.tweens.timeScale / previous * speed;
      tweenFactors.set(scene.tweens, speed);
    }
    // Includes animation states (and their individual attack multipliers), timers,
    // cameras, particles and any future scene updates using delta.
    original.call(this, simulationTime, delta * speed);
  };
  game.events.once('destroy', () => {
    game.scene.update = original;
    window.removeEventListener('keydown', keyDown);
    window.removeEventListener('keyup', keyUp);
    window.removeEventListener('blur', reset);
    document.removeEventListener('visibilitychange', reset);
  });
}
