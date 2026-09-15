import Phaser from 'phaser';
import { CRAYON_ANIMATION } from '../data/ui';

// Colour choices are shared; every generated patch has its own random strokes.
export const CRAYON_COLORS = {
  player: 0x244e83,
  enemy: 0x852d42,
  hpIntent: 0x171a24,
  epIntent: 0x552b72,
  button: 0x344860,
  hover: 0x526b86,
  tooltip: 0x141b26,
};

interface CrayonPatchOptions {
  pattern?: 'swipe' | 'diagonal';
  animateChanges?: boolean;
}

type CrayonStroke = { path: Path2D; left: number; right: number; center: number };
type CrayonArtwork = { canvas: HTMLCanvasElement; coverage: HTMLCanvasElement; strokes: CrayonStroke[] };
let nextPatchId = 0;

function canvas(width: number, height: number): HTMLCanvasElement {
  const result = document.createElement('canvas');
  result.width = Math.max(8, Math.ceil(width));
  result.height = Math.max(8, Math.ceil(height));
  return result;
}

function crayonArtwork(width: number, height: number, pattern: CrayonPatchOptions['pattern'] = 'swipe'): CrayonArtwork {
  const w = Math.max(8, Math.ceil(width)), h = Math.max(8, Math.ceil(height));
  const artwork = canvas(w, h);
  const ctx = artwork.getContext('2d')!;
  const strokes: CrayonStroke[] = [];
  // Independent of the game's combat/reward random stream.
  let seed = globalThis.crypto.getRandomValues(new Uint32Array(1))[0];
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  // Roughen each stroke before compositing it. Erasing from the finished patch
  // would also erase underlying strokes and create pale bands in the middle.
  const strokeCanvas = document.createElement('canvas');
  strokeCanvas.width = w;
  strokeCanvas.height = h;
  const strokeCtx = strokeCanvas.getContext('2d')!;
  const coveredCanvas = document.createElement('canvas');
  const overlapCanvas = document.createElement('canvas');
  coveredCanvas.width = overlapCanvas.width = w;
  coveredCanvas.height = overlapCanvas.height = h;
  const coveredCtx = coveredCanvas.getContext('2d')!;
  const overlapCtx = overlapCanvas.getContext('2d')!;
  const paintStroke = (left: number, right: number, startY: number, endY: number, half: number, alpha: number) => {
    if (right <= left) return;
    const originalLeft = left, originalRight = right, center = (startY + endY) / 2;
    let strokeTransform: DOMMatrix | undefined;
    if (pattern === 'diagonal') {
      const length = Math.hypot(right - left, endY - startY);
      const alongX = (right - left) / length, alongY = (endY - startY) / length;
      strokeTransform = new DOMMatrix([alongX, alongY, -alongY, alongX, left, startY]);
      // Preserve the distance between the existing long edges, but construct
      // caps and their grain in brush coordinates, perpendicular to its axis.
      half *= alongX;
      left = startY = endY = 0;
      right = length;
    }
    let path = new Path2D();
    path.moveTo(left, startY - half);
    path.lineTo(right, endY - half);
    // Change the number, depth and placement of the cuts on each end only.
    // The upper and lower edges remain straight.
    const rightSteps = 2 + Math.floor(random() * 4);
    const leftSteps = 2 + Math.floor(random() * 4);
    const cutDepth = Math.min(4, half * 0.6);
    for (let j = 1; j < rightSteps; j++) {
      const t = (j + (random() - 0.5) * 0.5) / rightSteps;
      path.lineTo(right + (random() - 0.5) * cutDepth * 2, endY - half + t * half * 2);
    }
    path.lineTo(right, endY + half);
    path.lineTo(left, startY + half);
    for (let j = 1; j < leftSteps; j++) {
      const t = (j + (random() - 0.5) * 0.5) / leftSteps;
      path.lineTo(left + (random() - 0.5) * cutDepth * 2, startY + half - t * half * 2);
    }
    path.closePath();
    if (strokeTransform) {
      const brushPath = path;
      path = new Path2D();
      path.addPath(brushPath, strokeTransform);
    }
    const endReach = strokeTransform ? Math.abs(strokeTransform.c) * half + strokeTransform.a * cutDepth : cutDepth;
    strokes.push({ path, left: originalLeft - endReach, right: originalRight + endReach, center });
    // Track geometric coverage before grain: existing transparent specks must
    // not turn a genuine overlap into a supposedly single-stroke region.
    strokeCtx.clearRect(0, 0, w, h);
    strokeCtx.fillStyle = '#fff';
    strokeCtx.fill(path);
    strokeCtx.globalCompositeOperation = 'destination-in';
    strokeCtx.drawImage(coveredCanvas, 0, 0);
    overlapCtx.drawImage(strokeCanvas, 0, 0);
    strokeCtx.globalCompositeOperation = 'source-over';
    coveredCtx.fillStyle = '#fff';
    coveredCtx.fill(path);
    strokeCtx.clearRect(0, 0, w, h);
    strokeCtx.fillStyle = `rgba(255,255,255,${alpha})`;
    strokeCtx.fill(path);
    strokeCtx.save();
    strokeCtx.clip(path);
    if (strokeTransform) strokeCtx.transform(strokeTransform.a, strokeTransform.b, strokeTransform.c, strokeTransform.d, strokeTransform.e, strokeTransform.f);
    strokeCtx.globalCompositeOperation = 'destination-out';
    const edgeOverlap = 2;
    for (let layer = 0; layer < 2; layer++) {
      const endZone = layer === 0
        ? Math.min((right - left) * 0.24, 7 + half * 1.5)
        : Math.min((right - left) * 0.2, 6 + half * 1.2);
      for (const atStart of [true, false]) {
        for (let j = 0; j < endZone * half * 1.6; j++) {
          const distance = random() * endZone;
          // More of the existing small paper gaps near the end; no opacity fade.
          if (random() > (1 - distance / endZone) ** 1.5) continue;
          const x = atStart
            ? left - edgeOverlap + distance
            : right + edgeOverlap - distance;
          const y = startY + (endY - startY) * (x - left) / (right - left) + (random() * 2 - 1) * half;
          strokeCtx.fillStyle = `rgba(0,0,0,${0.2 + random() * 0.4})`;
          strokeCtx.fillRect(x - 0.8, y - 0.5, 0.6 + random() * 2, 0.4 + random() * 1.2);
        }
      }
    }
    for (let j = 0; j < (right - left) / 3; j++) {
      const t = random(), top = random() < 0.5;
      const inset = random() * Math.min(1.5, half * 0.4);
      const y = startY + (endY - startY) * t + (top ? -half + inset : half - inset);
      strokeCtx.fillStyle = `rgba(0,0,0,${0.15 + random() * 0.3})`;
      strokeCtx.fillRect(left + (right - left) * t - 0.6, y - 0.5, 0.6 + random() * 1.8, 0.4 + random());
    }
    strokeCtx.restore();
    ctx.drawImage(strokeCanvas, 0, 0);
  };
  const diagonal = pattern === 'diagonal';
  const thinLabel = !diagonal && h <= 30;
  if (diagonal) {
    // Parallel rising strokes fill the whole paragraph, including its corners.
    // Intersect each centreline with the inset area instead of rotating/cropping
    // a finished rectangle, which would leave bare text or hard cut-off edges.
    const half = Math.min(12, Math.max(2, (h - 8) / 3));
    const slope = 0.6;
    // Leave room for the tilted cap and its rough cuts so the canvas does not
    // trim them back into a vertical edge.
    const capReach = half * slope / (1 + slope * slope) + Math.min(4, half * 0.6) / Math.sqrt(1 + slope * slope);
    const leftEdge = 2 + capReach, rightEdge = w - leftEdge;
    const top = half + 2, bottom = h - half - 2;
    const first = top + slope * leftEdge, last = bottom + slope * rightEdge;
    const count = Math.max(2, Math.ceil((last - first) / half));
    for (let i = 0; i <= count; i++) {
      const intercept = first + (last - first) * i / count;
      const left = Math.max(leftEdge, (intercept - bottom) / slope) + random() * 2;
      const right = Math.min(rightEdge, (intercept - top) / slope) - random() * 2;
      paintStroke(left, right, intercept - slope * left, intercept - slope * right,
        half * (0.94 + random() * 0.06), 0.97 + random() * 0.03);
    }
  } else if (thinLabel) {
    // Keep the existing fine grain and stroke width for narrow name labels.
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.beginPath();
    ctx.moveTo(8, 6);
    for (let x = 8; x < w - 7; x += 7) ctx.lineTo(x, 3 + random() * 4);
    ctx.lineTo(w - 5, h - 8);
    for (let x = w - 8; x > 7; x -= 7) ctx.lineTo(x, h - 3 - random() * 4);
    ctx.closePath();
    ctx.fill();
    for (let y = 5; y < h - 3; y += 2.1) {
      paintStroke(2 + random() * 9, w - 2 - random() * 10,
        Math.min(h - 3, y + 2), Math.max(2, y - 2), 1 + random() * 1.5, 0.45 + random() * 0.4);
    }
  } else {
    // Taller surfaces use broad, overlapping wax strokes. Each end varies
    // independently, without a rectangular undercoat filling in the variation.
    const thickness = Math.min(30, 4 + (h - 30) * 0.55);
    const endSpread = Math.min(w * 0.13, 10 + thickness * 0.65);
    const count = Math.max(3, Math.ceil((h - 7) / (thickness * 0.6)));
    for (let i = 0; i < count; i++) {
      const y = 3 + thickness / 2 + i * (h - 6 - thickness) / (count - 1);
      const half = thickness * (0.46 + random() * 0.14);
      const left = 2 + random() * endSpread;
      const right = w - 2 - random() * endSpread;
      const rise = 1 + random() * Math.min(4, thickness * 0.3);
      paintStroke(left, right, y, y - rise, half, 0.92 + random() * 0.07);
    }
  }
  // Small paper-coloured gaps and fine diagonal wax streaks, not a flat rectangle.
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < w * h / 9; i++) {
    ctx.fillStyle = `rgba(0,0,0,${(0.12 + random() * 0.38) * (diagonal ? 0.6 : 1)})`;
    ctx.fillRect(random() * w, random() * h, 0.5 + random() * 1.8, 0.4 + random());
  }
  for (let i = 0; i < h / 4; i++) {
    const x = random() * w, y = random() * h;
    ctx.strokeStyle = 'rgba(0,0,0,0.13)';
    ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 10 + random() * 28, y - 2); ctx.stroke();
  }
  // Taper the swipe on a slight diagonal instead of leaving horizontal edges.
  if (thinLabel) {
    const slant = Math.min(7, h * 0.15);
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w, 0); ctx.lineTo(0, slant); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w, h); ctx.lineTo(0, h); ctx.lineTo(w, h - slant); ctx.closePath(); ctx.fill();
  }
  // Add small paper gaps only where exactly one stroke was painted. Retain
  // overlaps (including triple overlaps), so they read as slightly denser wax.
  strokeCtx.clearRect(0, 0, w, h);
  for (let i = 0; i < w * h / 12; i++) {
    strokeCtx.fillStyle = `rgba(0,0,0,${0.12 + random() * 0.28})`;
    strokeCtx.fillRect(random() * w, random() * h, 0.5 + random() * 1.8, 0.4 + random());
  }
  strokeCtx.globalCompositeOperation = 'destination-in';
  strokeCtx.drawImage(coveredCanvas, 0, 0);
  strokeCtx.globalCompositeOperation = 'destination-out';
  strokeCtx.drawImage(overlapCanvas, 0, 0);
  ctx.drawImage(strokeCanvas, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  return { canvas: artwork, coverage: coveredCanvas, strokes };
}

/** Painted surface with the same colour controls used by existing button states. */
export class CrayonPatch extends Phaser.GameObjects.Image {
  private paintColor: number;
  private accentColor = 0;
  private accentAmount = 0;
  private targetColor?: number;
  private artwork?: CrayonArtwork;
  private canvasTexture: Phaser.Textures.CanvasTexture;
  private redrawTween?: Phaser.Tweens.Tween;
  private hoverColor?: number;
  private renderFrame?: () => void;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number, color: number, alpha = 1,
    private readonly paintOptions: CrayonPatchOptions = {}) {
    const key = `crayon-patch-${nextPatchId++}`;
    const texture = scene.textures.createCanvas(key, Math.max(8, Math.ceil(width)), Math.max(8, Math.ceil(height)))!;
    super(scene, x, y, key);
    this.canvasTexture = texture;
    this.paintColor = color;
    scene.add.existing(this);
    this.setName('crayon-patch').setDisplaySize(width, height).setAlpha(alpha);
    this.redraw(false);
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      this.redrawTween?.stop();
      this.renderFrame = undefined;
      this.artwork = undefined;
      scene.textures.remove(key);
    });
  }

  setFillStyle(color: number, alpha = 1): this {
    this.paintColor = color;
    this.setAlpha(alpha);
    return this.refreshPaint();
  }

  // Old border highlights become a lighter pigment instead of a geometric outline.
  setStrokeStyle(width: number, color = 0xffffff, alpha = 1): this {
    this.accentColor = color;
    this.accentAmount = Math.min(0.22, width * 0.04) * alpha;
    return this.refreshPaint();
  }

  private refreshPaint(): this {
    if (this.targetColor !== this.resolvedColor()) this.redraw(true);
    return this;
  }

  /** Hover only recolours the current frame; it never regenerates or restarts a wipe. */
  setHoverColor(color?: number): this {
    if (this.hoverColor !== color) {
      this.hoverColor = color;
      this.renderFrame?.();
    }
    return this;
  }

  private applyHoverPaint(output: CanvasRenderingContext2D): void {
    if (this.hoverColor === undefined) return;
    output.globalCompositeOperation = 'source-in';
    output.fillStyle = `#${this.resolvedColor(this.hoverColor).toString(16).padStart(6, '0')}`;
    output.fillRect(0, 0, output.canvas.width, output.canvas.height);
    output.globalCompositeOperation = 'source-over';
  }

  private resolvedColor(color = this.paintColor): number {
    const mix = (shift: number) => Math.round(((color >> shift) & 255) * (1 - this.accentAmount) + ((this.accentColor >> shift) & 255) * this.accentAmount);
    return (mix(16) << 16) | (mix(8) << 8) | mix(0);
  }

  /** Force a fresh shape, including when only the associated intent changed. */
  regenerate(width = this.displayWidth, height = this.displayHeight, color = this.paintColor): this {
    this.paintColor = color;
    this.redraw(true, width, height);
    return this;
  }

  fit(width: number, height: number): this {
    if (Math.abs(this.displayWidth - width) > 0.01 || Math.abs(this.displayHeight - height) > 0.01) this.regenerate(width, height);
    return this;
  }

  private redraw(animate: boolean, width = this.displayWidth, height = this.displayHeight): void {
    this.redrawTween?.stop();
    this.redrawTween = undefined;
    const previousArtwork = this.artwork;
    const previous = canvas(width, height);
    // Keep hover out of the snapshot so pointerout also restores an interrupted wipe.
    const hover = this.hoverColor;
    this.hoverColor = undefined;
    this.renderFrame?.();
    previous.getContext('2d')!.drawImage(this.canvasTexture.canvas, 0, 0, previous.width, previous.height);
    this.hoverColor = hover;
    this.artwork = crayonArtwork(width, height, this.paintOptions.pattern);
    this.targetColor = this.resolvedColor();
    const next = this.artwork.canvas;
    const nextCtx = next.getContext('2d')!;
    nextCtx.globalCompositeOperation = 'source-in';
    nextCtx.fillStyle = `#${this.targetColor.toString(16).padStart(6, '0')}`;
    nextCtx.fillRect(0, 0, next.width, next.height);
    nextCtx.globalCompositeOperation = 'source-over';

    if (this.canvasTexture.canvas.width !== next.width || this.canvasTexture.canvas.height !== next.height) {
      this.canvasTexture.setSize(next.width, next.height);
      this.setTexture(this.canvasTexture.key);
    }
    this.setDisplaySize(width, height);
    const output = this.canvasTexture.context;
    const finish = () => {
      output.globalCompositeOperation = 'source-over';
      output.clearRect(0, 0, next.width, next.height);
      output.drawImage(next, 0, 0);
      this.applyHoverPaint(output);
      this.canvasTexture.refresh();
    };
    const seconds = CRAYON_ANIMATION.redrawDuration;
    const duration = (Number.isFinite(seconds) ? Math.max(0, seconds) : 0.25) * 1000;
    this.renderFrame = finish;
    if (!animate || !previousArtwork || duration === 0 || this.paintOptions.animateChanges === false) { finish(); return; }

    const mask = canvas(width, height), revealed = canvas(width, height);
    const maskCtx = mask.getContext('2d')!, revealedCtx = revealed.getContext('2d')!;
    const nextArtwork = this.artwork;
    const state = { progress: 0 };
    // Scan the actual stroke shapes, top-to-bottom and left-to-right. A narrow
    // fallback outside their union also clears remnants of an interrupted wipe.
    const sweep = (artwork: CrayonArtwork) => {
      maskCtx.clearRect(0, 0, mask.width, mask.height);
      maskCtx.save();
      maskCtx.scale(mask.width / artwork.canvas.width, mask.height / artwork.canvas.height);
      maskCtx.fillStyle = '#fff';
      const { width: w, height: h } = artwork.canvas;
      const rows = artwork.strokes.length ? artwork.strokes.map(stroke => stroke.center) : [h / 2];
      const progressAt = (index: number) => Phaser.Math.Clamp((state.progress * (rows.length - 1 + 1.35) - index) / 1.35, 0, 1);
      rows.forEach((center, index) => {
        const top = index === 0 ? 0 : Math.round((rows[index - 1] + center) / 2);
        const bottom = index === rows.length - 1 ? h : Math.round((center + rows[index + 1]) / 2);
        maskCtx.fillRect(0, top, w * progressAt(index), bottom - top);
      });
      maskCtx.globalCompositeOperation = 'destination-out';
      maskCtx.drawImage(artwork.coverage, 0, 0);
      maskCtx.globalCompositeOperation = 'source-over';
      artwork.strokes.forEach((stroke, index) => {
        maskCtx.save();
        maskCtx.clip(stroke.path);
        maskCtx.fillRect(stroke.left, 0, (stroke.right - stroke.left) * progressAt(index), h);
        maskCtx.restore();
      });
      maskCtx.restore();
    };
    const draw = () => {
      output.globalCompositeOperation = 'source-over';
      output.clearRect(0, 0, next.width, next.height);
      output.drawImage(previous, 0, 0);
      sweep(previousArtwork);
      output.globalCompositeOperation = 'destination-out';
      output.drawImage(mask, 0, 0);
      output.globalCompositeOperation = 'source-over';
      sweep(nextArtwork);
      revealedCtx.globalCompositeOperation = 'source-over';
      revealedCtx.clearRect(0, 0, next.width, next.height);
      revealedCtx.drawImage(next, 0, 0);
      revealedCtx.globalCompositeOperation = 'destination-in';
      revealedCtx.drawImage(mask, 0, 0);
      output.drawImage(revealed, 0, 0);
      this.applyHoverPaint(output);
      this.canvasTexture.refresh();
    };
    this.renderFrame = draw;
    draw();
    this.redrawTween = this.scene.tweens.add({
      targets: state, progress: 1, duration, ease: 'Linear', onUpdate: draw,
      onComplete: () => { this.renderFrame = finish; finish(); this.redrawTween = undefined; },
    });
  }
}

/** Tooltip text keeps its existing padding and layout; only the painted surface changes. */
export function createTooltipPaint(scene: Phaser.Scene, width: number): CrayonPatch {
  return new CrayonPatch(scene, 0, 0, width, 40, CRAYON_COLORS.tooltip, 1, {
    pattern: 'diagonal', animateChanges: false,
  }).setOrigin(0, 0).setName('tooltip-paint');
}

/** Root HUD labels keep their original coordinates, bounds, hit areas and lifetime. */
export function paintBehindLabel(text: Phaser.GameObjects.Text, color: number, paddingX = 10, paddingY = 4): CrayonPatch {
  const scene = text.scene;
  text.setStroke('#141a25', 2).setResolution(2);
  const patch = new CrayonPatch(scene, text.x, text.y,
    Math.max(8, text.width + paddingX * 2), Math.max(8, text.height + paddingY * 2), color);
  scene.children.moveBelow(patch, text);
  const sync = () => {
    const width = Math.max(8, text.width + paddingX * 2), height = Math.max(8, text.height + paddingY * 2);
    if (patch.displayWidth !== width || patch.displayHeight !== height) patch.fit(width, height);
    patch.setPosition(text.x + (0.5 - text.originX) * text.width, text.y + (0.5 - text.originY) * text.height);
    if (patch.depth !== text.depth) patch.setDepth(text.depth);
    patch.setVisible(text.visible && Boolean(text.text)).setAlpha(text.alpha);
  };
  sync();
  scene.events.on(Phaser.Scenes.Events.POST_UPDATE, sync);
  text.once(Phaser.GameObjects.Events.DESTROY, () => {
    scene.events.off(Phaser.Scenes.Events.POST_UPDATE, sync);
    patch.destroy();
  });
  return patch;
}
