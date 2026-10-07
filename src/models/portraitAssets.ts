import { CHARACTER_IMAGE_DIRECTORY, CHARACTER_IMAGE_EXTENSION, CHARACTER_PORTRAITS, DEFAULT_CHARACTER_PLACEMENT } from '../data/characterPortraits';
import { resolvePortraitRegistry } from './portraitRegistry';
import type { CharacterPortraitDefinition } from './types';

// Vite needs a literal glob. Keep its directory/extension in sync with characterPortraits.ts.
// Bundled URLs also work in a desktop WebView; no absolute OS paths or runtime filesystem access.
const discovered = import.meta.glob('../../image/character/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
// Release時に生成済みの定数マニフェストへ置換できる境界。ファイル名とURLの取得のみを交換する。
export let characterPortraitFiles: string[] = Object.keys(discovered).map(path => path.slice(CHARACTER_IMAGE_DIRECTORY.length)).sort();

const sources = Object.fromEntries(
  characterPortraitFiles.filter(file => /_\d+\.png$/.test(file)).map(file => {
    const id = file.slice(0, -CHARACTER_IMAGE_EXTENSION.length);
    return [id, discovered[CHARACTER_IMAGE_DIRECTORY + file]];
  }),
);
export const { assets: characterPortraitAssets, issues: characterPortraitIssues } = resolvePortraitRegistry(sources, CHARACTER_PORTRAITS, DEFAULT_CHARACTER_PLACEMENT);

const thumbnailSources = import.meta.glob('../../image/gallery-thumbnails/character/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export const characterPortraitThumbnailAssets: Record<string, CharacterPortraitDefinition> = Object.fromEntries(
  characterPortraitFiles.flatMap(file => {
    const id = file.slice(0, -CHARACTER_IMAGE_EXTENSION.length);
    const source = thumbnailSources[`../../image/gallery-thumbnails/character/${id}.webp`];
    return source ? [[id, { textureKey: `portrait-gallery-thumb:${id}`, source, displayHeight: 1 }]] : [];
  }),
);

const physicalIdByTexture = new Map<string, string>();
for (const file of characterPortraitFiles) {
  const id = file.slice(0, -CHARACTER_IMAGE_EXTENSION.length);
  const key = characterPortraitAssets[id]?.textureKey;
  if (key && !physicalIdByTexture.has(key)) physicalIdByTexture.set(key, id);
}

/** Alias lookup is constant-time; no gallery-wide scan during carousel animation. */
export function portraitGalleryId(id: string): string {
  return physicalIdByTexture.get(characterPortraitAssets[id]?.textureKey) ?? id;
}
