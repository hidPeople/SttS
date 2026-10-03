import type Phaser from 'phaser';
import { iconHaloPixels } from '../models/iconHalo';
import { ICON_APPEARANCE } from '../data/ui';

/** TextureManager owns the cache across scenes and releases it with the game. */
export function iconHaloTexture(textures: Phaser.Textures.TextureManager, image: Phaser.GameObjects.Image): string | undefined {
  const c = ICON_APPEARANCE.relicGlow;
  const strength = Math.max(c.idleStrength, c.activeStrength);
  if (c.spread <= 0 || strength <= 0) return undefined;
  const width = Math.ceil(image.displayWidth), height = Math.ceil(image.displayHeight);
  const padding = Math.max(1, Math.round(c.spread)) + 1;
  const frame = image.frame;
  const key = `icon-halo:${JSON.stringify([image.texture.key, frame.name, width, height, c.spread, c.angularSamples, c.color, strength])}`;
  if (textures.exists(key)) return key;
  const texture = textures.createCanvas(key, width + padding * 2, height + padding * 2);
  if (!texture) return undefined;
  try {
    const ctx = texture.context;
    ctx.drawImage(frame.source.image as CanvasImageSource, frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight,
      padding, padding, width, height);
    const pixels = ctx.getImageData(0, 0, texture.width, texture.height);
    pixels.data.set(iconHaloPixels(pixels.data, texture.width, texture.height, c.spread, c.angularSamples, c.color, strength));
    ctx.putImageData(pixels, 0, 0);
    texture.refresh();
    return key;
  } catch {
    textures.remove(key);
    return undefined;
  }
}
