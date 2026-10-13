import type Phaser from 'phaser';

/** A separate tween target prevents hover/layout killTweensOf(card) from stranding the await. */
export function animateCardTransformation(
  scene: Phaser.Scene, card: Phaser.GameObjects.Container,
  scaleX: number, alpha: number, duration: number, ease: string,
): Promise<boolean> {
  return new Promise(resolve => {
    const phase = { scaleX: card.scaleX, alpha: card.alpha };
    let settled = false;
    let tween: Phaser.Tweens.Tween | undefined;
    const finish = (completed: boolean) => {
      if (settled) return;
      settled = true;
      scene.events.off('shutdown', cancel);
      card.off('destroy', cancel);
      tween?.remove();
      resolve(completed);
    };
    const cancel = () => finish(false);
    scene.events.once('shutdown', cancel);
    card.once('destroy', cancel);
    tween = scene.tweens.add({
      targets: phase, scaleX, alpha, duration, ease,
      onUpdate: () => { if (card.active) card.setScale(phase.scaleX, card.scaleY).setAlpha(phase.alpha); },
      onComplete: () => { card.setScale(scaleX, card.scaleY).setAlpha(alpha); finish(true); },
      onStop: cancel,
    });
  });
}
