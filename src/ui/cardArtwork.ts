import type Phaser from 'phaser';
import { CARD_FRAME, CARD_RARITY_FINISH, type CardArtwork } from '../data/cardAppearance';
import { cardArtworkPlacement } from '../models/cardArtwork';
import type { Rarity } from '../models/types';
import { drawCardFrame, drawCardArtwork } from './cardArtworkCanvas';

// URL discovery is build-time metadata only; decode only images actually requested.
const sources = import.meta.glob('../../image/card/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export const cardArtworkFiles: ReadonlySet<string> = new Set(Object.keys(sources).map(path => path.slice('../../image/card/'.length)));
const pending = new WeakMap<Phaser.Textures.TextureManager, Map<string, Promise<string | undefined>>>();
const decoded = new Map<string, Promise<HTMLImageElement>>();

function canvas(width: number, height: number) {
  const surface = document.createElement('canvas');
  const resolution = Math.max(1, CARD_FRAME.textureResolution);
  surface.width = Math.ceil(width * resolution);
  surface.height = Math.ceil(height * resolution);
  const ctx = surface.getContext('2d')!;
  ctx.scale(resolution, resolution);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  return { surface, ctx };
}

export function cardFrameTexture(scene: Phaser.Scene, rarity: Rarity, width: number, height: number): string {
  const finish = CARD_RARITY_FINISH[rarity];
  const key = `card-frame:${JSON.stringify([finish, CARD_FRAME, width, height])}`;
  if (scene.textures.exists(key)) return key;
  const { surface, ctx } = canvas(width, height);
  drawCardFrame(ctx, width, height, CARD_FRAME, finish);
  scene.textures.addCanvas(key, surface);
  return key;
}

function imageSource(file: string): Promise<HTMLImageElement> {
  const url = sources[`../../image/card/${file}`];
  if (!url) return Promise.reject(new Error(`Card artwork not found: image/card/${file}`));
  let image = decoded.get(url);
  if (!image) {
    image = new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error(`Card artwork load failed: ${file}`));
      element.src = url;
    });
    decoded.set(url, image);
    void image.catch(() => decoded.delete(url));
  }
  return image;
}

async function artworkTexture(scene: Phaser.Scene, art: CardArtwork & { file: string }, width: number, height: number): Promise<string | undefined> {
  const textures = scene.textures;
  const key = `card-art:${JSON.stringify([art, CARD_FRAME, width, height])}`;
  if (textures.exists(key)) return key;
  let requests = pending.get(textures);
  if (!requests) { requests = new Map(); pending.set(textures, requests); }
  const existing = requests.get(key);
  if (existing) return existing;
  const request = imageSource(art.file).then(image => {
    // A page/game can be destroyed while an image decodes.
    if (!textures.game) return undefined;
    const { surface, ctx } = canvas(width, height);
    const inset = CARD_FRAME.rimWidth + CARD_FRAME.decorationWidth / 2;
    const pose = cardArtworkPlacement(art, image.naturalWidth, image.naturalHeight, width - inset * 2, height - inset * 2);
    drawCardArtwork(ctx, image, width, height, CARD_FRAME, art, pose);
    textures.addCanvas(key, surface);
    return key;
  }).catch(error => { console.error(error); return undefined; }).finally(() => requests!.delete(key));
  requests.set(key, request);
  return request;
}

export function addCardArtwork(scene: Phaser.Scene, host: Phaser.GameObjects.Container, art: (CardArtwork & { file: string }) | undefined, width: number, height: number): void {
  if (!art) return;
  // Capture a child placeholder, rather than the scene, across the asynchronous load.
  // It is destroyed with the card on close/restart, so a late result cannot resurrect it.
  const image = scene.add.image(0, 0, '__WHITE').setVisible(false);
  host.add(image);
  void artworkTexture(scene, art, width, height).then(key => {
    if (key && image.active) image.setTexture(key).setDisplaySize(width, height).setVisible(true);
  });
}
