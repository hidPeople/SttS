import type { CharacterPortraitPlacement } from '../models/types';

export const CHARACTER_IMAGE_DIRECTORY = '../../image/character/';
export const CHARACTER_IMAGE_EXTENSION = '.png';
/** フォルダから自動検出した、CHARACTER_PORTRAITSに行が未登録の画像に使う配置。ツールの新規登録の初期値にも使用。登録済みの配置オブジェクトはdisplayHeight必須。 */
export const DEFAULT_CHARACTER_PLACEMENT: CharacterPortraitPlacement = { displayHeight: 700, offsetX: 0, offsetY: 0 };

/** ファイル名（拡張子なし）と配置。文字列なら参照先の画像・配置を共有する。未設定の画像には既定配置を使用。 */
export const CHARACTER_PORTRAITS: Record<string, CharacterPortraitPlacement | string> = {
  Succubus_normal_idle_1: { displayHeight: 700, offsetX: 0, offsetY: 0 },
  Succubus_normal_hover_1: { displayHeight: 700, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_idle_1: { displayHeight: 700, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_hover_1: { displayHeight: 700, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Starvation_idle_1: { displayHeight: 560, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Starvation_hover_1: { displayHeight: 557, offsetX: 0, offsetY: 3 },
  Succubus_tutorial_Starvation_EPdamage_1: { displayHeight: 560, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Starvation_EPgte50per_1: { displayHeight: 560, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Starvation_peak_1: { displayHeight: 560, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Starvation_Horny_1: { displayHeight: 560, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Starvation_Horny_hover_1: { displayHeight: 560, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Starvation_Horny_EPdamage_1: 'Succubus_tutorial_Starvation_EPgte50per_1',
  Succubus_tutorial_Starvation_Horny_peak_1: 'Succubus_tutorial_Starvation_peak_1',
  Succubus_tutorial_Starvation_InHeat_1: { displayHeight: 590, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Starvation_InHeat_hover_1: { displayHeight: 590, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Starvation_InHeat_peak_1: { displayHeight: 590, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Starvation_Frustrated_1: { displayHeight: 590, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Starvation_Frustrated_rubOneOut_1: { displayHeight: 590, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Starvation_Frustrated_rubOne_1: 'Succubus_tutorial_Starvation_Frustrated_rubOneOut_1',
  Succubus_tutorial_Starvation_Frustrated_peak_1: 'Succubus_tutorial_Starvation_Frustrated_rubOneOut_1',
  Succubus_tutorial_Starvation_DesperateToPeak_1: { displayHeight: 590, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Starvation_DesperateToPeak_EPdamage_1: { displayHeight: 590, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Starvation_DesperateToPeak_peak_1: { displayHeight: 590, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Starvation_seduction_1: { displayHeight: 530, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Starvation_seduction_EPdamage_1: 'Succubus_tutorial_Starvation_seduction_1',
  Succubus_tutorial_Starvation_hasInserted_1: { displayHeight: 530, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Starvation_hasInserted_hover_1: { displayHeight: 530, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Starvation_hasInserted_EPdamage_1: { displayHeight: 530, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Starvation_hasInserted_EPdamage_2: { displayHeight: 530, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Starvation_hasInserted_peak_1: { displayHeight: 530, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Faintedgte1_1: { displayHeight: 560, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Faintedgte2_1: { displayHeight: 640, offsetX: 0, offsetY: 0 },
  Succubus_Death_1: 'Succubus_tutorial_Faintedgte2_1',
};
