import type Phaser from 'phaser';
import type { Coverage } from './portraitStatsLayout';

const silhouettes = new WeakMap<object, HTMLCanvasElement>();
const STEP = 6;

/** Sample only the menu's portrait column. A summed-area table gives each candidate a constant-time cost. */
export function portraitCoverage(body: Phaser.GameObjects.Sprite, matrix: Phaser.GameObjects.Components.TransformMatrix): Coverage | undefined {
  const image = body.frame.source.image;
  if (!(image instanceof HTMLImageElement || image instanceof HTMLCanvasElement || image instanceof ImageBitmap)) return;
  let mask = silhouettes.get(image);
  if (!mask) {
    mask = document.createElement('canvas');
    mask.width = Math.max(1, Math.round(128 * body.width / Math.max(body.width, body.height)));
    mask.height = Math.max(1, Math.round(128 * body.height / Math.max(body.width, body.height)));
    const ctx = mask.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(image, 0, 0, mask.width, mask.height);
    silhouettes.set(image, mask);
  }
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 120;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;
  const [a,b,c,d,e,f] = matrix.matrix;
  ctx.setTransform(a/STEP,b/STEP,c/STEP,d/STEP,e/STEP,f/STEP);
  ctx.translate(-body.displayOriginX, -body.displayOriginY);
  ctx.translate(body.flipX ? body.width : 0, body.flipY ? body.height : 0);
  ctx.scale(body.flipX ? -1 : 1, body.flipY ? -1 : 1);
  ctx.drawImage(mask, 0, 0, body.width, body.height);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const stride = canvas.width + 1;
  const sums = new Uint32Array(stride * (canvas.height + 1));
  for (let y = 0; y < canvas.height; y++) {
    let sum = 0;
    for (let x = 0; x < canvas.width; x++) {
      sum += data[4*(y*canvas.width+x)+3];
      sums[(y+1)*stride+x+1] = sums[y*stride+x+1] + sum;
    }
  }
  return (x, y, w, h) => {
    const x1 = Math.floor(x/STEP), y1 = Math.floor(y/STEP);
    const x2 = Math.ceil((x+w)/STEP), y2 = Math.ceil((y+h)/STEP);
    return (sums[y2*stride+x2]-sums[y1*stride+x2]-sums[y2*stride+x1]+sums[y1*stride+x1]) / ((x2-x1)*(y2-y1)*255);
  };
}
