import type { CharacterPortraitPlacement, EpDamagePart, PortraitPoint } from '../models/types';

/** 画面の立ち絵領域（状態異常欄下端～画面下端、X中央は立ち絵基準位置）内の比率。個別のepPointsは画像基準で上書きします。 */
export const DEFAULT_PORTRAIT_EP_POINTS: Record<EpDamagePart, PortraitPoint> = {
  M: { x: 0.5, y: 0.2 },
  B: { x: 0.5, y: 0.5 },
  C: { x: 0.5, y: 0.667 },
  V: { x: 0.5, y: 0.667 },
  A: { x: 0.5, y: 0.667 },
};

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
  Succubus_normal_idle_1: { displayHeight: 700, offsetX: 0, offsetY: 0, sigilPoint: { x: 0.4509, y: 0.4396 }, epPoints: { M: { x: 0.5091, y: 0.186 }, B: { x: 0.4945, y: 0.2811 }, C: { x: 0.4582, y: 0.5031 }, V: { x: 0.4582, y: 0.5031 }, A: { x: 0.4582, y: 0.5031 } } },
  Succubus_normal_hover_1: { displayHeight: 700, offsetX: 0, offsetY: 0, sigilPoint: { x: 0.4953, y: 0.4333 }, epPoints: { M: { x: 0.5392, y: 0.1764 }, B: { x: 0.6209, y: 0.2874 }, C: { x: 0.4827, y: 0.4967 }, V: { x: 0.4827, y: 0.4967 }, A: { x: 0.4827, y: 0.4967 } } },
  Succubus_tutorial_idle_1: { displayHeight: 700, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.6275, y: 0.186 }, B: { x: 0.7437, y: 0.3258 }, C: { x: 0.5146, y: 0.4956 }, V: { x: 0.5146, y: 0.4956 }, A: { x: 0.4409, y: 0.4768 } } },
  Succubus_tutorial_hover_1: { displayHeight: 700, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.6888, y: 0.2113 }, B: { x: 0.6138, y: 0.3731 }, C: { x: 0.5281, y: 0.5126 }, V: { x: 0.5281, y: 0.5126 }, A: { x: 0.4371, y: 0.4777 } } },
  Succubus_tutorial_hover_2: { displayHeight: 700, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.7047, y: 0.2335 }, B: { x: 0.6181, y: 0.3784 }, C: { x: 0.4988, y: 0.5124 }, V: { x: 0.4988, y: 0.5124 }, A: { x: 0.417, y: 0.4888 } } },
  Succubus_tutorial_Hunger_idle_1: { displayHeight: 700, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.7042, y: 0.2184 }, B: { x: 0.585, y: 0.3524 }, C: { x: 0.5232, y: 0.5025 }, V: { x: 0.5232, y: 0.5025 }, A: { x: 0.4548, y: 0.4801 } } },
  Succubus_tutorial_Hunger_hover_1: { displayHeight: 700, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.6731, y: 0.2382 }, B: { x: 0.5826, y: 0.3821 }, C: { x: 0.4649, y: 0.5012 }, V: { x: 0.4649, y: 0.5012 }, A: { x: 0.4061, y: 0.4727 } } },
  Succubus_tutorial_Hunger_EPdamage_1: { displayHeight: 740, offsetX: -34.6, offsetY: -15, epPoints: { M: { x: 0.729, y: 0.1886 }, B: { x: 0.6969, y: 0.3127 }, C: { x: 0.6053, y: 0.5174 }, V: { x: 0.6053, y: 0.5174 }, A: { x: 0.5481, y: 0.4975 } } },
  Succubus_tutorial_Aftershocks_1: { displayHeight: 670, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.6846, y: 0.2395 }, B: { x: 0.6686, y: 0.3908 }, C: { x: 0.4779, y: 0.4578 }, V: { x: 0.4779, y: 0.4578 }, A: { x: 0.4237, y: 0.4442 } } },
  Succubus_tutorial_Aftershocks_hover_1: { displayHeight: 700, offsetX: -26.6, offsetY: 0, epPoints: { M: { x: 0.7129, y: 0.2035 }, B: { x: 0.7763, y: 0.3362 }, C: { x: 0.5566, y: 0.4888 }, V: { x: 0.5566, y: 0.4888 }, A: { x: 0.5113, y: 0.4777 } } },
  Succubus_tutorial_Aftershocksgte2_1: { displayHeight: 670, offsetX: 3.2, offsetY: 33.6, epPoints: { M: { x: 0.7378, y: 0.2494 }, B: { x: 0.6899, y: 0.4194 }, C: { x: 0.4241, y: 0.469 }, V: { x: 0.4121, y: 0.4504 }, A: { x: 0.3641, y: 0.4355 } } },
  Succubus_tutorial_Aftershocksgte2_hover_1: { displayHeight: 700, offsetX: -4.8, offsetY: 20.8, epPoints: { M: { x: 0.7249, y: 0.2395 }, B: { x: 0.6922, y: 0.4032 }, C: { x: 0.4264, y: 0.4541 }, V: { x: 0.41, y: 0.4442 }, A: { x: 0.3916, y: 0.4268 } } },
  Succubus_tutorial_Aftershocksgte2_hover_novel_1: { displayHeight: 700, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.7311, y: 0.237 }, B: { x: 0.6881, y: 0.4007 }, C: { x: 0.4284, y: 0.4529 }, V: { x: 0.4059, y: 0.438 }, A: { x: 0.3834, y: 0.4256 } } },
  Succubus_tutorial_Starvation_idle_1: { displayHeight: 560, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.6664, y: 0.3077 }, B: { x: 0.6973, y: 0.5521 }, C: { x: 0.4749, y: 0.7494 }, V: { x: 0.4497, y: 0.7568 }, A: { x: 0.3704, y: 0.727 } } },
  Succubus_tutorial_Starvation_hover_1: { displayHeight: 557, offsetX: 0, offsetY: 3, epPoints: { M: { x: 0.6591, y: 0.3002 }, B: { x: 0.7036, y: 0.545 }, C: { x: 0.4749, y: 0.7494 }, V: { x: 0.4434, y: 0.7456 }, A: { x: 0.3704, y: 0.727 } } },
  Succubus_tutorial_Starvation_Aftershocks_1: { displayHeight: 570, offsetX: -6.4, offsetY: 28.8, epPoints: { M: { x: 0.7, y: 0.2518 }, B: { x: 0.6716, y: 0.4743 }, C: { x: 0.4749, y: 0.6191 }, V: { x: 0.4523, y: 0.6116 }, A: { x: 0.4166, y: 0.5893 } } },
  Succubus_tutorial_Starvation_Aftershocks_hover_1: { displayHeight: 570, offsetX: -6.4, offsetY: 28.8, epPoints: { M: { x: 0.5445, y: 0.2467 }, B: { x: 0.7223, y: 0.4743 }, C: { x: 0.4913, y: 0.6506 }, V: { x: 0.4638, y: 0.64 }, A: { x: 0.4395, y: 0.6208 } } },
  Succubus_tutorial_Starvation_EPdamage_1: { displayHeight: 560, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.6098, y: 0.3014 }, B: { x: 0.6918, y: 0.545 }, C: { x: 0.4749, y: 0.7494 }, V: { x: 0.4434, y: 0.7456 }, A: { x: 0.3941, y: 0.727 } } },
  Succubus_tutorial_Starvation_EPgte50per_1: { displayHeight: 560, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.6405, y: 0.3088 }, B: { x: 0.6995, y: 0.5462 }, C: { x: 0.4749, y: 0.7494 }, V: { x: 0.4549, y: 0.7493 }, A: { x: 0.4094, y: 0.7307 } } },
  Succubus_tutorial_Starvation_orgasm_1: { displayHeight: 560, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.6386, y: 0.2629 }, B: { x: 0.6995, y: 0.5462 }, C: { x: 0.4749, y: 0.7494 }, V: { x: 0.4549, y: 0.7493 }, A: { x: 0.4094, y: 0.7307 } } },
  Succubus_tutorial_Starvation_rubOneOut_1: { displayHeight: 557, offsetX: 0, offsetY: 3, epPoints: { M: { x: 0.6561, y: 0.3113 }, B: { x: 0.6391, y: 0.5338 }, C: { x: 0.508, y: 0.7593 }, V: { x: 0.4958, y: 0.794 }, A: { x: 0.4795, y: 0.825 } } },
  Succubus_tutorial_Starvation_rubOneOut_Horny_1: 'Succubus_tutorial_Starvation_rubOneOut_1',
  Succubus_tutorial_Starvation_rubOneOut_EPdamage_1: { displayHeight: 560, offsetX: -9.6, offsetY: 33.6, epPoints: { M: { x: 0.6955, y: 0.2766 }, B: { x: 0.671, y: 0.4718 }, C: { x: 0.5587, y: 0.7308 }, V: { x: 0.5483, y: 0.763 }, A: { x: 0.5264, y: 0.7754 } } },
  Succubus_tutorial_Starvation_rubOneOut_Horny_EPdamage_1: 'Succubus_tutorial_Starvation_rubOneOut_EPdamage_1',
  Succubus_tutorial_Starvation_rubOneOut_orgasm_1: { displayHeight: 577, offsetX: -10.6, offsetY: 10, epPoints: { M: { x: 0.6564, y: 0.2133 }, B: { x: 0.6866, y: 0.4842 }, C: { x: 0.5567, y: 0.7481 }, V: { x: 0.5542, y: 0.7742 }, A: { x: 0.5381, y: 0.7853 } } },
  Succubus_tutorial_Starvation_rubOneOut_Horny_orgasm_1: 'Succubus_tutorial_Starvation_rubOneOut_orgasm_1',
  Succubus_tutorial_Starvation_Horny_1: { displayHeight: 560, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.6679, y: 0.3162 }, B: { x: 0.7092, y: 0.5496 }, C: { x: 0.4781, y: 0.7501 }, V: { x: 0.4721, y: 0.7663 }, A: { x: 0.4287, y: 0.743 } } },
  Succubus_tutorial_Starvation_Horny_hover_1: { displayHeight: 560, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.6679, y: 0.3162 }, B: { x: 0.7092, y: 0.5496 }, C: { x: 0.4781, y: 0.7501 }, V: { x: 0.4721, y: 0.7663 }, A: { x: 0.4287, y: 0.743 } } },
  Succubus_tutorial_Starvation_Horny_EPdamage_1: 'Succubus_tutorial_Starvation_EPgte50per_1',
  Succubus_tutorial_Starvation_Horny_orgasm_1: 'Succubus_tutorial_Starvation_orgasm_1',
  Succubus_tutorial_Starvation_InHeat_1: { displayHeight: 590, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.6465, y: 0.2567 }, B: { x: 0.7469, y: 0.4792 }, C: { x: 0.5006, y: 0.7143 }, V: { x: 0.4815, y: 0.7242 }, A: { x: 0.4404, y: 0.7078 } } },
  Succubus_tutorial_Starvation_Horny_rubOneOut_1: 'Succubus_tutorial_Starvation_InHeat_1',
  Succubus_tutorial_Starvation_InHeat_hover_1: { displayHeight: 590, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.6372, y: 0.2784 }, B: { x: 0.7613, y: 0.5048 }, C: { x: 0.5379, y: 0.7357 }, V: { x: 0.5239, y: 0.7527 }, A: { x: 0.4637, y: 0.732 } } },
  Succubus_tutorial_Starvation_InHeat_orgasm_1: { displayHeight: 540, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.6604, y: 0.2976 }, B: { x: 0.5535, y: 0.5295 }, C: { x: 0.4998, y: 0.7405 }, V: { x: 0.4788, y: 0.7477 }, A: { x: 0.414, y: 0.739 } } },
  Succubus_tutorial_Starvation_Frustrated_1: { displayHeight: 590, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.7563, y: 0.305 }, B: { x: 0.708, y: 0.5518 }, C: { x: 0.507, y: 0.7651 }, V: { x: 0.4918, y: 0.7746 }, A: { x: 0.4219, y: 0.7627 } } },
  Succubus_tutorial_Starvation_Frustrated_rubOneOut_1: { displayHeight: 590, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.5771, y: 0.286 }, B: { x: 0.6809, y: 0.4823 }, C: { x: 0.5536, y: 0.7372 }, V: { x: 0.5525, y: 0.7671 }, A: { x: 0.5237, y: 0.7784 } } },
  Succubus_tutorial_Starvation_Frustrated_orgasm_1: 'Succubus_tutorial_Starvation_Frustrated_rubOneOut_1',
  Succubus_tutorial_Starvation_DesperateToCum_1: { displayHeight: 590, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.6183, y: 0.3133 }, B: { x: 0.5836, y: 0.4885 }, C: { x: 0.4747, y: 0.7127 }, V: { x: 0.4653, y: 0.727 }, A: { x: 0.4389, y: 0.7139 } } },
  Succubus_tutorial_Starvation_DesperateToCum_EPdamage_1: { displayHeight: 590, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.5655, y: 0.2057 }, B: { x: 0.6047, y: 0.4935 }, C: { x: 0.4729, y: 0.7172 }, V: { x: 0.4659, y: 0.739 }, A: { x: 0.4377, y: 0.7188 } } },
  Succubus_tutorial_Starvation_DesperateToCum_orgasm_1: { displayHeight: 590, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.5492, y: 0.1879 }, B: { x: 0.5797, y: 0.4894 }, C: { x: 0.4729, y: 0.7172 }, V: { x: 0.4659, y: 0.739 }, A: { x: 0.4377, y: 0.7188 } } },
  Succubus_tutorial_Starvation_seduction_1: { displayHeight: 530, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.5961, y: 0.2803 }, B: { x: 0.6523, y: 0.4538 }, C: { x: 0.5033, y: 0.6798 }, V: { x: 0.4821, y: 0.6834 }, A: { x: 0.4497, y: 0.6556 } } },
  Succubus_tutorial_Starvation_seduction_EPdamage_1: 'Succubus_tutorial_Starvation_seduction_1',
  Succubus_tutorial_Starvation_hasInserted_1: { displayHeight: 530, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.5961, y: 0.2803 }, B: { x: 0.6523, y: 0.4538 }, C: { x: 0.5033, y: 0.6798 }, V: { x: 0.4821, y: 0.6834 }, A: { x: 0.4497, y: 0.6556 } } },
  Succubus_tutorial_Starvation_hasInserted_hover_1: { displayHeight: 530, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.5961, y: 0.2803 }, B: { x: 0.6523, y: 0.4538 }, C: { x: 0.5033, y: 0.6798 }, V: { x: 0.4821, y: 0.6834 }, A: { x: 0.4497, y: 0.6556 } } },
  Succubus_tutorial_Starvation_hasInserted_EPdamage_1: { displayHeight: 530, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.5961, y: 0.2803 }, B: { x: 0.6523, y: 0.4538 }, C: { x: 0.5033, y: 0.6798 }, V: { x: 0.4821, y: 0.6834 }, A: { x: 0.4497, y: 0.6556 } } },
  Succubus_tutorial_Starvation_hasInserted_EPdamage_2: { displayHeight: 530, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.5727, y: 0.2803 }, B: { x: 0.6527, y: 0.4475 }, C: { x: 0.5033, y: 0.6798 }, V: { x: 0.4821, y: 0.6834 }, A: { x: 0.4497, y: 0.6556 } } },
  Succubus_tutorial_Starvation_hasInserted_orgasm_1: { displayHeight: 530, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.555, y: 0.181 }, B: { x: 0.6603, y: 0.4489 }, C: { x: 0.5122, y: 0.6914 }, V: { x: 0.4863, y: 0.6916 }, A: { x: 0.4532, y: 0.6649 } } },
  Succubus_tutorial_Faintedgte1_1: { displayHeight: 560, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.6693, y: 0.2804 }, B: { x: 0.7812, y: 0.4769 }, C: { x: 0.5038, y: 0.6861 }, V: { x: 0.4802, y: 0.699 }, A: { x: 0.4018, y: 0.6701 } } },
  Succubus_tutorial_Faintedgte2_1: { displayHeight: 640, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.4782, y: 0.2111 }, B: { x: 0.4855, y: 0.3172 }, C: { x: 0.5768, y: 0.5401 }, V: { x: 0.5768, y: 0.5401 }, A: { x: 0.5037, y: 0.5236 } } },
  Succubus_Death_1: 'Succubus_tutorial_Faintedgte2_1',
};
