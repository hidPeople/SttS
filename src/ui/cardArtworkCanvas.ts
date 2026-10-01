import type { CardArtwork, CardRarityFinish, CARD_FRAME } from '../data/cardAppearance';
import type { cardArtworkPlacement } from '../models/cardArtworkGeometry';

const css = (color: number) => `#${color.toString(16).padStart(6, '0')}`;
type Frame = typeof CARD_FRAME;

/** Pure canvas drawing shared by Phaser's baked textures and the external editor. */
export function drawCardFrame(ctx: CanvasRenderingContext2D, width: number, height: number, frame: Frame, finish: CardRarityFinish): void {
  ctx.save();
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  for (const [stop, color] of [[0, finish.shadow], [0.18, finish.base], [0.32, finish.highlight], [0.44, finish.base], [0.7, finish.shadow], [0.86, finish.highlight], [1, finish.base]]) gradient.addColorStop(stop, css(color));
  ctx.fillStyle = gradient;
  ctx.beginPath(); ctx.roundRect(0, 0, width, height, frame.cornerRadius); ctx.fill();
  const inset = frame.rimWidth;
  ctx.fillStyle = css(frame.background);
  ctx.beginPath(); ctx.roundRect(inset, inset, width - inset * 2, height - inset * 2, frame.cornerRadius); ctx.fill();
  ctx.restore();
}

export function drawCardArtwork(ctx: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number, frame: Frame, art: CardArtwork, pose: ReturnType<typeof cardArtworkPlacement>): void {
  ctx.save();
  const inset = frame.rimWidth + frame.decorationWidth / 2;
  ctx.beginPath();
  ctx.roundRect(inset, inset, width - inset * 2, height - inset * 2, Math.max(0, frame.cornerRadius - frame.decorationWidth / 2));
  ctx.clip();
  ctx.translate(width / 2 + pose.x, height / 2 + pose.y);
  ctx.rotate(pose.radians); ctx.scale(pose.scale, pose.scale); ctx.translate(-pose.focusX, -pose.focusY);
  const w = image.naturalWidth, h = image.naturalHeight;
  ctx.drawImage(image, 0, 0);
  const fade = Math.min(w / 2, h / 2, Math.max(0, art.edgeFade ?? frame.imageEdgeFade) / pose.scale);
  if (fade > 0) {
    ctx.globalCompositeOperation = 'destination-out';
    for (const [x1, y1, x2, y2, x, y, fw, fh] of [
      [0, 0, fade, 0, 0, 0, fade, h], [w, 0, w - fade, 0, w - fade, 0, fade, h],
      [0, 0, 0, fade, 0, 0, w, fade], [0, h, 0, h - fade, 0, h - fade, w, fade],
    ]) {
      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      gradient.addColorStop(0, 'rgba(0,0,0,1)'); gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient; ctx.fillRect(x, y, fw, fh);
    }
  }
  ctx.restore();
}
