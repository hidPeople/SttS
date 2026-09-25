import type Phaser from 'phaser';
import { BATTLE_ENTRANCE, type BattleEntranceConfig } from '../data/battlePresentation';
import { entranceProgress, entranceSchedule } from '../models/battlePresentation';

type EntranceEnemy = { area: Phaser.GameObjects.Container; hitArea: Phaser.GameObjects.Rectangle };

/** Uses the scene tween clock, including Ctrl speed. Player is a dedicated entrance layer, not the portrait itself. */
export function playBattleEntrance(scene: Phaser.Scene, player: Phaser.GameObjects.Container, enemies: EntranceEnemy[], config: BattleEntranceConfig = BATTLE_ENTRANCE): Promise<boolean> {
  const ordered = [...enemies].sort((a, b) => a.area.x - b.area.x);
  const schedule = entranceSchedule(ordered.length, config);
  const original = { scaleX: player.scaleX, alpha: player.alpha };
  const views = schedule.map(timing => {
    const view = ordered[timing.index];
    const graphics = scene.add.graphics().setVisible(false);
    const mask = graphics.createGeometryMask(), previous = view.area.mask;
    view.area.setMask(mask);
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      if (view.area.active) { view.area.clearMask(false); if (previous) view.area.setMask(previous); }
      mask.destroy(); graphics.destroy();
    };
    return { ...timing, view, graphics, release };
  });
  const duration = Math.max(0, config.playerDuration, ...schedule.map(t => t.delay + t.duration));
  const clock = { elapsed: 0 };
  const render = () => {
    const p = entranceProgress(clock.elapsed, config.playerDuration);
    if (player.active) player.setScale(original.scaleX * Math.cos(p * Math.PI * 2), player.scaleY).setAlpha(original.alpha * p);
    for (const view of views) {
      const progress = entranceProgress(clock.elapsed, view.duration, view.delay);
      if (progress >= 1 || !view.view.area.active) { view.release(); continue; }
      view.graphics.clear();
      if (progress > 0) {
        // Startup effects may move the enemy or replace its sprite while it is appearing.
        const bounds = view.view.area.getBounds(), visible = view.view.hitArea.getBounds();
        const top = visible.bottom - visible.height * progress;
        view.graphics.fillStyle(0xffffff).fillRect(bounds.left - 1, top, bounds.width + 2, Math.max(0, bounds.bottom - top + 1));
      }
    }
  };
  render(); // Hide before the first rendered frame.
  return new Promise(resolve => {
    let done = false;
    let tween: Phaser.Tweens.Tween | undefined;
    const finish = (completed: boolean) => {
      if (done) return;
      done = true;
      scene.events.off('shutdown', cancel);
      tween?.remove();
      if (player.active) player.setScale(original.scaleX, player.scaleY).setAlpha(original.alpha);
      views.forEach(view => view.release());
      resolve(completed);
    };
    const cancel = () => finish(false);
    scene.events.once('shutdown', cancel);
    if (duration === 0) { finish(true); return; }
    tween = scene.tweens.add({ targets: clock, elapsed: duration, duration, ease: 'Linear', onUpdate: render, onComplete: () => finish(true) });
  });
}
