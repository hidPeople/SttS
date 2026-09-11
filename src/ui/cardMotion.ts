import Phaser from 'phaser';

export const HAND_REST_Y = 660;

export function handPose(x: number, centerX: number) {
  const offset = Phaser.Math.Clamp((x - centerX) / 345, -1, 1);
  return { y: HAND_REST_Y + offset * offset * 12, angle: offset * 5 };
}

/** Quadratic flight, with the container as tween target so existing cancellation works. */
export function flyCard(scene: Phaser.Scene, card: Phaser.GameObjects.Container,
  destination: { x: number; y: number; scale: number; angle: number; alpha?: number },
  options: { duration: number; delay?: number; arc?: number; onComplete: () => void }) {
  scene.tweens.killTweensOf(card);
  const start = { x: card.x, y: card.y, scale: card.scaleX, angle: card.angle, alpha: card.alpha };
  // Tween a numeric property on the container; x/y remain controlled by the curve.
  const moving = card as Phaser.GameObjects.Container & { flightProgress: number };
  moving.flightProgress = 0;
  scene.tweens.add({
    targets: moving, flightProgress: 1, duration: options.duration, delay: options.delay ?? 0, ease: 'Cubic.easeInOut',
    onUpdate: () => {
      const t = moving.flightProgress;
      card.setPosition(Phaser.Math.Linear(start.x, destination.x, t), Phaser.Math.Linear(start.y, destination.y, t) - 4 * (options.arc ?? 60) * t * (1 - t));
      card.setScale(Phaser.Math.Linear(start.scale, destination.scale, t));
      card.setAngle(Phaser.Math.Linear(start.angle, destination.angle, t));
      card.setAlpha(Phaser.Math.Linear(start.alpha, destination.alpha ?? 1, t));
    }, onComplete: options.onComplete,
  });
}

export function cardBurst(scene: Phaser.Scene, x: number, y: number, color: number, depth = 2100): void {
  const ring = scene.add.circle(x, y, 30).setStrokeStyle(2, color, 0.8).setDepth(depth);
  scene.tweens.add({ targets: ring, scale: 2.4, alpha: 0, duration: 360, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
  for (let i = 0; i < 10; i++) {
    const angle = i * Math.PI * 2 / 10;
    const spark = scene.add.rectangle(x + Math.cos(angle) * 20, y + Math.sin(angle) * 20, 3, 7, color).setAngle(i * 36).setDepth(depth);
    scene.tweens.add({ targets: spark, x: x + Math.cos(angle) * 80, y: y + Math.sin(angle) * 60 - 20, alpha: 0, scale: 0.2, angle: i * 36 + 80, duration: 420 + i * 12, ease: 'Cubic.easeOut', onComplete: () => spark.destroy() });
  }
}
