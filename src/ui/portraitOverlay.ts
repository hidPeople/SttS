import type Phaser from 'phaser';
import { PORTRAIT_OVERLAY_RULES, PORTRAIT_OVERLAY_STYLE as style, type PortraitOverlayRule } from '../data/epPresentation';
import { DEFAULT_PORTRAIT_EP_POINTS } from '../data/characterPortraits';
import { characterPortraitAssets } from '../models/portraitAssets';
import { ActionOverlayHits, chooseOverlayFiles, portraitMarkStrength, savedPortraitMarks, type OverlayPlacement, type PortraitMark } from '../models/portraitOverlay';
import type { EpDamagePart, PortraitPoint } from '../models/types';
import { ignorePortraitHoverOcclusion } from './portraitHover';

const sources = new Map<string, string>();
const families = new Map<string, string[]>();
for (const [path, url] of Object.entries(import.meta.glob('../../image/overlay/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>)) {
  const file = path.slice(path.lastIndexOf('/') + 1);
  const family = /^(.*)_\d+\.png$/i.exec(file)?.[1];
  if (!family) continue;
  sources.set(file, url);
  if (!families.has(family)) families.set(family, []);
  families.get(family)!.push(file);
}

type Stamp = {
  mark: PortraitMark; rule: PortraitOverlayRule; art?: HTMLImageElement;
  image?: Phaser.GameObjects.Image; texture?: Phaser.Textures.CanvasTexture;
  clipped?: HTMLCanvasElement; tween?: Phaser.Tweens.Tween;
  from: number; to: number; progress: number;
};
let nextStamp = 0;

/** Only the small stamp area is rasterized. Idle marks are ordinary, static textures. */
export class PortraitOverlay {
  private stamps: Stamp[] = [];
  readonly layer: Phaser.GameObjects.Container;
  private images = new Map<string, Promise<HTMLImageElement>>();

  constructor(private body: Phaser.GameObjects.Sprite, private pose: () => string | undefined,
    private fallback: (point: PortraitPoint) => PortraitPoint) {
    this.layer = ignorePortraitHoverOcclusion(body.scene.add.container());
    body.parentContainer.add(this.layer);
    body.scene.events.once('shutdown', () => {
      for (const stamp of [...this.stamps]) this.remove(stamp);
      this.images.clear();
    });
  }

  add(placements: OverlayPlacement[]): void {
    const previous = new Map<EpDamagePart, string>();
    for (const { mark } of this.stamps) previous.set(mark.part, mark.file);
    const byMaterial = new Map<string, OverlayPlacement[]>();
    for (const placement of placements) {
      const material = placement.rule.material;
      if (!byMaterial.has(material)) byMaterial.set(material, []);
      byMaterial.get(material)!.push(placement);
    }
    const selected = new Map<OverlayPlacement, string>();
    for (const [material, group] of byMaterial) {
      const files = chooseOverlayFiles(families.get(material) ?? [], group.map(p => p.part), previous);
      files.forEach((file, i) => selected.set(group[i], file));
    }
    for (const placement of placements) {
      const file = selected.get(placement);
      if (!file) continue;
      const { rule, part, besideM } = placement;
      this.attach(rule, { material: rule.material, file, part,
        blend: Math.random(), dx: Math.random(), dy: Math.random(), size: Math.random(), age: 0, ...(besideM ? { besideM } : {}) }, true);
    }
  }

  actionHits(): ActionOverlayHits {
    return new ActionOverlayHits(placements => this.add(placements));
  }

  snapshot(): PortraitMark[] {
    return this.stamps.filter(s => portraitMarkStrength(s.mark.age) > 0).map(s => ({ ...s.mark }));
  }

  restore(value: unknown): void {
    for (const mark of savedPortraitMarks(value)) {
      const rule = PORTRAIT_OVERLAY_RULES.find(r => r.material === mark.material);
      if (rule && families.get(rule.material)?.includes(mark.file)) this.attach(rule, { ...mark }, false);
    }
  }

  private attach(rule: PortraitOverlayRule, mark: PortraitMark, reveal: boolean): void {
    if (style.maxMarks <= 0 || style.turns <= 0) return;
    if (this.stamps.length >= style.maxMarks) this.remove(this.stamps[0]);
    const stamp: Stamp = { rule, mark, from: 0, to: style.opacity * portraitMarkStrength(mark.age), progress: 1 };
    this.stamps.push(stamp);
    let ready = this.images.get(mark.file);
    if (!ready) {
      const image = new Image();
      image.src = sources.get(mark.file)!;
      ready = image.decode().then(() => image);
      this.images.set(mark.file, ready);
    }
    void ready.then(art => {
      if (!this.stamps.includes(stamp)) return;
      stamp.art = art;
      this.place(stamp);
      if (reveal && !mark.age) this.fade(stamp, 0, stamp.to);
    }).catch(() => {
      if (this.images.get(mark.file) === ready) this.images.delete(mark.file);
      this.remove(stamp);
    });
  }

  /** Hand the already clipped images to the outgoing pose before the live stamps are repositioned. */
  detachPose(): Phaser.GameObjects.Container | undefined {
    if (!this.layer.length) return undefined;
    const outgoing = ignorePortraitHoverOcclusion(this.body.scene.add.container());
    for (const stamp of this.stamps) {
      if (!stamp.image) continue;
      outgoing.add(stamp.image);
      stamp.image = undefined;
      stamp.texture = undefined;
    }
    return outgoing;
  }

  changePose(): void {
    this.layer.setVisible(Boolean(this.pose()));
    if (this.layer.visible) for (const stamp of this.stamps) this.place(stamp);
  }

  private place(stamp: Stamp): void {
    const id = this.pose(), art = stamp.art, body = this.body;
    if (!id || !art) return;
    const { mark, rule } = stamp;
    const points = characterPortraitAssets[id]?.epPoints;
    const width = body.displayWidth, height = body.displayHeight;
    const left = body.x - body.originX * width, top = body.y - body.originY * height;
    const anchor = (point?: PortraitPoint) => point
      ? { x: left + point.x * width, y: top + point.y * height }
      : this.fallback(DEFAULT_PORTRAIT_EP_POINTS[mark.part]);
    const a = anchor(mark.part === 'B' ? points?.B1 ?? points?.B : points?.[mark.part]);
    const b = mark.part === 'B' ? anchor(points?.B2 ?? points?.B) : a;
    const stampH = Math.max(1, height * rule.heightRatio * style.partScale[mark.part] * (0.8 + 0.4 * mark.size));
    const stampW = stampH * art.naturalWidth / art.naturalHeight;
    const spread = mark.part === 'M' ? 0 : height * style.spreadRatio;
    const sideOffset = mark.besideM === true ? height * (rule.unconnectedMOffsetRatio ?? 0) * (mark.dx < 0.5 ? -1 : 1) : 0;
    const x = a.x + (b.x - a.x) * mark.blend + (2 * mark.dx - 1) * spread + sideOffset - stampW / 2;
    const y = a.y + (b.y - a.y) * mark.blend + (2 * mark.dy - 1) * spread - stampH * (mark.part === 'B' ? style.bAnchorY : style.anchorY);

    // Limit uploads to the visible detail level, even for unusually large portrait definitions.
    const rasterScale = Math.min(1, 192 / Math.max(stampW, stampH));
    const w = Math.max(1, Math.ceil(stampW * rasterScale)), h = Math.max(1, Math.ceil(stampH * rasterScale));
    const clipped = stamp.clipped ??= document.createElement('canvas');
    clipped.width = w; clipped.height = h;
    const ctx = clipped.getContext('2d')!;
    ctx.drawImage(art, 0, 0, w, h);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(body.frame.source.image as CanvasImageSource, (left - x) * w / stampW, (top - y) * h / stampH,
      width * w / stampW, height * h / stampH);
    if (!stamp.texture) {
      const texture = body.scene.textures.createCanvas('portrait-overlay-' + ++nextStamp, w, h);
      if (!texture) return;
      stamp.texture = texture;
      stamp.image = body.scene.add.image(0, 0, texture.key).setOrigin(0);
      stamp.image.once('destroy', () => texture.manager?.remove(texture.key));
      this.layer.addAt(stamp.image, this.stamps.slice(0, this.stamps.indexOf(stamp)).filter(s => s.image).length);
    } else if (stamp.texture.width !== w || stamp.texture.height !== h) {
      stamp.texture.setSize(w, h);
      stamp.image!.setTexture(stamp.texture.key);
    }
    stamp.image!.setPosition(x, y).setDisplaySize(stampW, stampH);
    this.paint(stamp);
  }

  advanceTurn(): void {
    for (const stamp of [...this.stamps]) {
      stamp.mark.age++;
      if (stamp.mark.age > 1) this.fade(stamp, stamp.to, style.opacity * portraitMarkStrength(stamp.mark.age));
    }
  }

  private fade(s: Stamp, from: number, to: number): void {
    s.tween?.remove();
    s.from = from; s.to = to; s.progress = 0;
    this.paint(s);
    s.tween = this.body.scene.tweens.add({ targets: s, progress: 1, duration: Math.max(1, style.fadeMs),
      onUpdate: () => this.paint(s), onComplete: () => { if (portraitMarkStrength(s.mark.age) === 0) this.remove(s); } });
  }

  private paint(s: Stamp): void {
    if (!s.texture || !s.clipped) return;
    const ctx = s.texture.context, { width: w, height: h } = s.clipped;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(s.clipped, 0, 0);
    const gradient = s.rule.fade === 'centerOut'
      ? ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.hypot(w, h) / 2)
      : ctx.createLinearGradient(0, 0, 0, h);
    for (let i = 0; i <= 8; i++) {
      const t = Math.min(1, Math.max(0, 2 * s.progress - i / 8));
      gradient.addColorStop(i / 8, 'rgba(0,0,0,' + (s.from + (s.to - s.from) * t) + ')');
    }
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    s.texture.refresh();
  }

  private remove(s: Stamp): void {
    const index = this.stamps.indexOf(s);
    if (index < 0) return;
    this.stamps.splice(index, 1);
    s.tween?.remove();
    s.image?.destroy();
  }
}
