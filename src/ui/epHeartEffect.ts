import type Phaser from 'phaser';
import { EP_HEART_EFFECT, PORTRAIT_SIGIL_EFFECT } from '../data/epPresentation';
import { DEFAULT_PORTRAIT_EP_POINTS } from '../data/characterPortraits';
import { characterPortraitAssets } from '../models/portraitAssets';
import { heartBurst, heartPosition, portraitLocalPoint } from '../models/epHeartMotion';
import type { EpDamagePart, PortraitPoint } from '../models/types';

const heartTexture = (index: number) => `ep-heart-image-${index}`;
const SIGIL_TEXTURE = 'portrait-sigil';
export function preloadEpEffects(scene: Phaser.Scene): void {
  EP_HEART_EFFECT.imageSources.forEach((source, index) => {
    if (!scene.textures.exists(heartTexture(index))) scene.load.image(heartTexture(index), source);
  });
  if (!scene.textures.exists(SIGIL_TEXTURE)) scene.load.image(SIGIL_TEXTURE, PORTRAIT_SIGIL_EFFECT.source);
}

export function portraitEpOrigin(body: Phaser.GameObjects.Sprite, id: string | undefined, part: EpDamagePart): PortraitPoint {
  const point = (id && characterPortraitAssets[id]?.epPoints?.[part]) || DEFAULT_PORTRAIT_EP_POINTS[part];
  const local = portraitLocalPoint(point, body);
  const world = body.getWorldTransformMatrix().transformPoint(local.x, local.y);
  return { x: world.x, y: world.y };
}

export interface EpHeartFlight {
  origins: PortraitPoint[];
  countPerOrigin: number;
  destination: () => PortraitPoint;
}

/** ハートだけを駆動。元のゲージTweenは変更せず、RibbonHudの表示遅延で到着と揃える。 */
export function flyEpHearts(scene: Phaser.Scene, flight: EpHeartFlight): Promise<void> {
  const cfg = EP_HEART_EFFECT;
  const burstEnd = Math.max(0.01, Math.min(0.8, cfg.burstEnd));
  const particles = flight.origins.flatMap(start => Array.from({ length: flight.countPerOrigin }, (_, index) => {
    const burst = heartBurst(start, index, flight.countPerOrigin, cfg.burstRadius, cfg.fanAngle);
    const texture = heartTexture(Math.floor(Math.random() * cfg.imageSources.length));
    const image = cfg.imageSources.length && scene.textures.exists(texture) ? scene.add.image(start.x, start.y, texture) : undefined;
    image?.setDisplaySize(cfg.size, cfg.size * image.height / image.width).setDepth(cfg.depth);
    return { start, burst, image,
      burstEnd: Math.max(0.01, Math.min(0.8, burstEnd + (Math.random() * 2 - 1) * cfg.burstEndVariation)),
      curve: cfg.curveHeight * (0.65 + Math.random() * 0.7), bend: Math.random() * 2 - 1 };
  }));
  return new Promise(resolve => {
    const state = { progress: 0 };
    let settled = false;
    let tween: Phaser.Tweens.Tween | undefined;
    const finish = () => {
      if (settled) return;
      settled = true;
      tween?.remove();
      scene.events.off('shutdown', finish);
      particles.forEach(p => p.image?.destroy());
      resolve();
    };
    scene.events.once('shutdown', finish);
    tween = scene.tweens.add({ targets: state, progress: 1, duration: cfg.travelDuration, ease: 'Linear',
      onUpdate: () => {
        const end = flight.destination();
        for (const p of particles) {
          if (p.image) {
            const at = heartPosition(p.start, p.burst, end, state.progress, 1, p.burstEnd, p.curve, p.bend);
            p.image.setPosition(at.x, at.y);
          }
        }
      },
      onComplete: finish, onStop: finish,
    });
  });
}

/** 現在表示中の画像を基準に毎フレーム追従。連続発動は同じオーバーレイを再始動する。 */
export class PortraitSigil {
  private image?: Phaser.GameObjects.Image;
  private tween?: Phaser.Tweens.Tween;
  constructor(private scene: Phaser.Scene, private body: Phaser.GameObjects.Sprite, private portraitId: () => string | undefined) {
    scene.events.once('shutdown', () => this.clear());
  }
  private clear(): void { this.tween?.remove(); this.tween = undefined; this.image?.destroy(); this.image = undefined; }
  play(): void {
    this.clear();
    const body = this.body, cfg = PORTRAIT_SIGIL_EFFECT;
    const id = this.portraitId();
    if (!id || !characterPortraitAssets[id]?.sigilPoint || !body.parentContainer || !this.scene.textures.exists(SIGIL_TEXTURE)) return;
    const image = this.image = this.scene.add.image(0, 0, SIGIL_TEXTURE);
    body.parentContainer.add(image);
    const state = { t: 0 };
    const update = () => {
      const current = this.portraitId(), point = current && characterPortraitAssets[current]?.sigilPoint;
      image.setVisible(Boolean(point) && body.visible);
      if (!point) return;
      const local = portraitLocalPoint(point, body), at = body.getLocalTransformMatrix().transformPoint(local.x, local.y);
      const width = Math.abs(body.displayWidth) * cfg.widthRatio * (1 + (cfg.expansion - 1) * state.t);
      image.setPosition(at.x, at.y).setRotation(body.rotation).setDisplaySize(width, width * image.height / image.width)
        .setAlpha(cfg.alpha * Math.min(1, state.t / 0.15) * (1 - state.t));
    };
    update();
    this.tween = this.scene.tweens.add({ targets: state, t: 1, duration: cfg.duration, onUpdate: update, onComplete: () => this.clear() });
  }
}
