import type { CharacterPortraitPlacement } from '../models/types';

export const CHARACTER_IMAGE_DIRECTORY = '../../image/character/';
export const CHARACTER_IMAGE_EXTENSION = '.png';
/** フォルダから自動検出した、CHARACTER_PORTRAITSに行が未登録の画像に使う配置。ツールの新規登録の初期値にも使用。登録済みの配置オブジェクトはdisplayHeight必須。 */
export const DEFAULT_CHARACTER_PLACEMENT: CharacterPortraitPlacement = { displayHeight: 700, offsetX: 0, offsetY: 0 };

/** 立ち絵選択時だけカードIDを読み替える。左のカードでも右のカード名を含む画像・配置・優先度を使う。参照の連鎖は不可。 */
export const CHARACTER_PORTRAIT_CARD_ALIASES: Record<string, string> = {
  rubOne: 'rubOneOut',
};

/** ファイル名（拡張子なし）と配置。文字列なら参照先の画像・配置を共有する。未設定の画像には既定配置を使用。 */
export const CHARACTER_PORTRAITS: Record<string, CharacterPortraitPlacement | string> = {
  Succubus_normal_idle_1: { displayHeight: 700, offsetX: 0, offsetY: 0 },
  Succubus_normal_hover_1: { displayHeight: 700, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_idle_1: { displayHeight: 700, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_hover_1: { displayHeight: 700, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_hover_2: { displayHeight: 700, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Hunger_idle_1: { displayHeight: 700, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Hunger_hover_1: { displayHeight: 700, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Hunger_EPdamage_1: { displayHeight: 740, offsetX: -34.6, offsetY: -15 },
  Succubus_tutorial_Aftershocksgte2_1: { displayHeight: 670, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Aftershocksgte2_hover_1: { displayHeight: 700, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Aftershocksgte2_hover_novel_1: { displayHeight: 700, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Starvation_idle_1: { displayHeight: 560, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Starvation_hover_1: { displayHeight: 557, offsetX: 0, offsetY: 3 },
  Succubus_tutorial_Starvation_EPdamage_1: { displayHeight: 560, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Starvation_EPgte50per_1: { displayHeight: 560, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Starvation_orgasm_1: { displayHeight: 560, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Starvation_rubOneOut_1: { displayHeight: 557, offsetX: 0, offsetY: 3 },
  Succubus_tutorial_Starvation_rubOneOut_Horny_1: 'Succubus_tutorial_Starvation_rubOneOut_1',
  Succubus_tutorial_Starvation_rubOneOut_EPdamage_1: { displayHeight: 560, offsetX: -9.6, offsetY: 33.6 },
  Succubus_tutorial_Starvation_rubOneOut_Horny_EPdamage_1: 'Succubus_tutorial_Starvation_rubOneOut_EPdamage_1',
  Succubus_tutorial_Starvation_rubOneOut_orgasm_1: { displayHeight: 577, offsetX: -10.6, offsetY: 10 },
  Succubus_tutorial_Starvation_rubOneOut_Horny_orgasm_1: 'Succubus_tutorial_Starvation_rubOneOut_orgasm_1',
  Succubus_tutorial_Starvation_Horny_1: { displayHeight: 560, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Starvation_Horny_hover_1: { displayHeight: 560, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Starvation_Horny_EPdamage_1: 'Succubus_tutorial_Starvation_EPgte50per_1',
  Succubus_tutorial_Starvation_Horny_orgasm_1: 'Succubus_tutorial_Starvation_orgasm_1',
  Succubus_tutorial_Starvation_InHeat_1: { displayHeight: 590, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Starvation_Horny_rubOneOut_1: 'Succubus_tutorial_Starvation_InHeat_1',
  Succubus_tutorial_Starvation_InHeat_hover_1: { displayHeight: 590, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Starvation_InHeat_orgasm_1: { displayHeight: 540, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Starvation_Frustrated_1: { displayHeight: 590, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Starvation_Frustrated_rubOneOut_1: { displayHeight: 590, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Starvation_Frustrated_orgasm_1: 'Succubus_tutorial_Starvation_Frustrated_rubOneOut_1',
  Succubus_tutorial_Starvation_DesperateToCum_1: { displayHeight: 590, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Starvation_DesperateToCum_EPdamage_1: { displayHeight: 590, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Starvation_DesperateToCum_orgasm_1: { displayHeight: 590, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Starvation_seduction_1: { displayHeight: 530, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Starvation_seduction_EPdamage_1: 'Succubus_tutorial_Starvation_seduction_1',
  Succubus_tutorial_Starvation_hasInserted_1: { displayHeight: 530, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Starvation_hasInserted_hover_1: { displayHeight: 530, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Starvation_hasInserted_EPdamage_1: { displayHeight: 530, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Starvation_hasInserted_EPdamage_2: { displayHeight: 530, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Starvation_hasInserted_orgasm_1: { displayHeight: 530, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Faintedgte1_1: { displayHeight: 560, offsetX: 0, offsetY: 0 },
  Succubus_tutorial_Faintedgte2_1: { displayHeight: 640, offsetX: 0, offsetY: 0 },
  Succubus_Death_1: 'Succubus_tutorial_Faintedgte2_1',
};
