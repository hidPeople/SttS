import { CHARACTER_IMAGE_DIRECTORY, CHARACTER_IMAGE_EXTENSION, CHARACTER_PORTRAITS, DEFAULT_CHARACTER_PLACEMENT } from '../data/characterPortraits';
import type { CharacterPortraitDefinition } from './types';

// Vite needs a literal glob. Keep its directory/extension in sync with characterPortraits.ts.
// Bundled URLs also work in a desktop WebView; no absolute OS paths or runtime filesystem access.
const discovered = import.meta.glob('../../image/character/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
// Release時に生成済みの定数マニフェストへ置換できる境界。ファイル名とURLの取得のみを交換する。
export let characterPortraitFiles: string[] = Object.keys(discovered).map(path => path.slice(CHARACTER_IMAGE_DIRECTORY.length)).sort();

export const characterPortraitAssets: Record<string, CharacterPortraitDefinition> = Object.fromEntries(
  characterPortraitFiles.filter(file => /_\d+\.png$/.test(file)).map(file => {
    const id = file.slice(0, -CHARACTER_IMAGE_EXTENSION.length);
    return [id, {
      textureKey: `character:${id}`, source: discovered[CHARACTER_IMAGE_DIRECTORY + file],
      ...DEFAULT_CHARACTER_PLACEMENT, ...CHARACTER_PORTRAITS[id],
    }];
  }),
);
