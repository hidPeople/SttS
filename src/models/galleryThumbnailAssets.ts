import type { CharacterPortraitDefinition } from './types';

const sources = import.meta.glob([
  '../../image/gallery-thumbnails/event/*.webp',
  '../../image/gallery-thumbnails/background/*.webp',
], { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

export function galleryThumbnailAsset(file?: string): CharacterPortraitDefinition | undefined {
  if (!file) return undefined;
  const match = /^(event|background)\/([^/]+)\.[^.]+$/i.exec(file);
  if (!match) return undefined;
  const folder = match[1].toLowerCase();
  const stem = match[2];
  const source = sources[`../../image/gallery-thumbnails/${folder}/${stem}.webp`];
  return source ? { textureKey: `gallery-thumbnail:${folder}/${stem}`, source, displayHeight: 1 } : undefined;
}
