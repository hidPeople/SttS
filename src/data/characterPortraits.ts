import type { CharacterPortraitPlacement } from '../models/types';

export const CHARACTER_IMAGE_DIRECTORY = '../../image/character/';
export const CHARACTER_IMAGE_EXTENSION = '.png';
export const DEFAULT_CHARACTER_PLACEMENT: CharacterPortraitPlacement = { displayHeight: 700, offsetX: 0, offsetY: 0 };

/** ファイル名（拡張子なし）と配置だけを設定。未設定の画像には既定の配置を使用。 */
export const CHARACTER_PORTRAITS: Record<string, CharacterPortraitPlacement> = {
  Succubus_normal_idle_1: { displayHeight: 700, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_idle_1: { displayHeight: 700, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Starvation_idle_1: { displayHeight: 560, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Starvation_EPdamage_1: { displayHeight: 560, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Starvation_EPdamage_2: { displayHeight: 560, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Starvation_peak_1: { displayHeight: 560, offsetX: 0, offsetY: 0 },
};
