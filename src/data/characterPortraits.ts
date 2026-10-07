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
  Succubus_normal_idle_1: { displayHeight: 700, offsetX: 0, offsetY: 0, sigilPoint: { x: 0.4584, y: 0.4431 }, epPoints: { M: { x: 0.5091, y: 0.186 }, C: { x: 0.4582, y: 0.5031 }, V: { x: 0.4582, y: 0.5031 }, A: { x: 0.4582, y: 0.5031 }, B1: { x: 0.5911, y: 0.2979 }, B2: { x: 0.3238, y: 0.2992 } } },
  Succubus_normal_hover_1: { displayHeight: 700, offsetX: 0, offsetY: 0, sigilPoint: { x: 0.4948, y: 0.4361 }, epPoints: { M: { x: 0.5392, y: 0.1764 }, C: { x: 0.4827, y: 0.4967 }, V: { x: 0.4827, y: 0.4967 }, A: { x: 0.4827, y: 0.4967 }, B1: { x: 0.6468, y: 0.2898 }, B2: { x: 0.4351, y: 0.2833 } } },
  Succubus_prologue_idle_1: { displayHeight: 700, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.6275, y: 0.186 }, C: { x: 0.5146, y: 0.4956 }, V: { x: 0.5146, y: 0.4956 }, A: { x: 0.4409, y: 0.4768 }, B1: { x: 0.748, y: 0.325 }, B2: { x: 0.5726, y: 0.3334 } } },
  Succubus_prologue_hover_1: { displayHeight: 700, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.6888, y: 0.2113 }, C: { x: 0.5281, y: 0.5126 }, V: { x: 0.5281, y: 0.5126 }, A: { x: 0.4371, y: 0.4777 }, B1: { x: 0.7434, y: 0.3635 }, B2: { x: 0.6085, y: 0.3745 } } },
  Succubus_prologue_hover_2: { displayHeight: 700, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.7047, y: 0.2335 }, C: { x: 0.4988, y: 0.5124 }, V: { x: 0.4988, y: 0.5124 }, A: { x: 0.417, y: 0.4888 }, B1: { x: 0.7776, y: 0.374 }, B2: { x: 0.6137, y: 0.3788 } } },
  Succubus_prologue_Hunger_idle_1: { displayHeight: 700, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.7042, y: 0.2184 }, C: { x: 0.5232, y: 0.5025 }, V: { x: 0.5232, y: 0.5025 }, A: { x: 0.4548, y: 0.4801 }, B1: { x: 0.7149, y: 0.3493 }, B2: { x: 0.5815, y: 0.3496 } } },
  Succubus_prologue_Hunger_hover_1: { displayHeight: 700, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.6731, y: 0.2382 }, C: { x: 0.4649, y: 0.5012 }, V: { x: 0.4649, y: 0.5012 }, A: { x: 0.4061, y: 0.4727 }, B1: { x: 0.6995, y: 0.3591 }, B2: { x: 0.5826, y: 0.3821 } } },
  Succubus_prologue_Hunger_EPdamage_1: { displayHeight: 740, offsetX: -34.6, offsetY: -15, epPoints: { M: { x: 0.729, y: 0.1886 }, C: { x: 0.6053, y: 0.5174 }, V: { x: 0.6053, y: 0.5174 }, A: { x: 0.5481, y: 0.4975 }, B1: { x: 0.8419, y: 0.3032 }, B2: { x: 0.6969, y: 0.3127 } } },
  Succubus_prologue_Aftershocks_1: { displayHeight: 670, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.6846, y: 0.2395 }, C: { x: 0.4779, y: 0.4578 }, V: { x: 0.4779, y: 0.4578 }, A: { x: 0.4237, y: 0.4442 }, B1: { x: 0.6686, y: 0.3908 }, B2: { x: 0.5394, y: 0.3926 } } },
  Succubus_prologue_Aftershocks_hover_1: { displayHeight: 700, offsetX: -26.6, offsetY: 0, epPoints: { M: { x: 0.7129, y: 0.2035 }, C: { x: 0.5566, y: 0.4888 }, V: { x: 0.5566, y: 0.4888 }, A: { x: 0.5113, y: 0.4777 }, B1: { x: 0.7874, y: 0.3455 }, B2: { x: 0.6624, y: 0.3671 } } },
  Succubus_prologue_Aftershocksgte2_1: { displayHeight: 670, offsetX: 3.2, offsetY: 33.6, epPoints: { M: { x: 0.7378, y: 0.2494 }, C: { x: 0.4241, y: 0.469 }, V: { x: 0.4121, y: 0.4504 }, A: { x: 0.3641, y: 0.4355 }, B1: { x: 0.6899, y: 0.4194 }, B2: { x: 0.5485, y: 0.4218 } } },
  Succubus_prologue_Aftershocksgte2_hover_1: { displayHeight: 700, offsetX: -4.8, offsetY: 20.8, epPoints: { M: { x: 0.7249, y: 0.2395 }, C: { x: 0.4264, y: 0.4541 }, V: { x: 0.41, y: 0.4442 }, A: { x: 0.3916, y: 0.4268 }, B1: { x: 0.6922, y: 0.4032 }, B2: { x: 0.562, y: 0.4088 } } },
  Succubus_prologue_Aftershocksgte2_hover_novel_1: { displayHeight: 700, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.7311, y: 0.237 }, C: { x: 0.4284, y: 0.4529 }, V: { x: 0.4059, y: 0.438 }, A: { x: 0.3834, y: 0.4256 }, B1: { x: 0.6943, y: 0.402 }, B2: { x: 0.5626, y: 0.4098 } } },
  Succubus_prologue_Starvation_idle_1: { displayHeight: 560, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.6664, y: 0.3077 }, C: { x: 0.4749, y: 0.7494 }, V: { x: 0.4497, y: 0.7568 }, A: { x: 0.3704, y: 0.727 }, B1: { x: 0.7045, y: 0.548 }, B2: { x: 0.5431, y: 0.563 } } },
  Succubus_prologue_Starvation_hover_1: { displayHeight: 557, offsetX: 0, offsetY: 3, epPoints: { M: { x: 0.6591, y: 0.3002 }, C: { x: 0.4749, y: 0.7494 }, V: { x: 0.4434, y: 0.7456 }, A: { x: 0.3704, y: 0.727 }, B1: { x: 0.7036, y: 0.545 }, B2: { x: 0.5421, y: 0.5609 } } },
  Succubus_prologue_Starvation_Aftershocks_1: { displayHeight: 570, offsetX: -6.4, offsetY: 28.8, epPoints: { M: { x: 0.7, y: 0.2518 }, C: { x: 0.4749, y: 0.6191 }, V: { x: 0.4523, y: 0.6116 }, A: { x: 0.4166, y: 0.5893 }, B1: { x: 0.6706, y: 0.4797 }, B2: { x: 0.5259, y: 0.5098 } } },
  Succubus_prologue_Starvation_Aftershocks_hover_1: { displayHeight: 570, offsetX: -6.4, offsetY: 28.8, epPoints: { M: { x: 0.5445, y: 0.2467 }, C: { x: 0.4913, y: 0.6506 }, V: { x: 0.4638, y: 0.64 }, A: { x: 0.4395, y: 0.6208 }, B1: { x: 0.7283, y: 0.4798 }, B2: { x: 0.5484, y: 0.5272 } } },
  Succubus_prologue_Starvation_EPdamage_1: { displayHeight: 560, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.6098, y: 0.3014 }, C: { x: 0.4749, y: 0.7494 }, V: { x: 0.4434, y: 0.7456 }, A: { x: 0.3941, y: 0.727 }, B1: { x: 0.6964, y: 0.5451 }, B2: { x: 0.5301, y: 0.5616 } } },
  Succubus_prologue_Starvation_EPgte50per_1: { displayHeight: 560, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.6405, y: 0.3088 }, C: { x: 0.4749, y: 0.7494 }, V: { x: 0.4549, y: 0.7493 }, A: { x: 0.4094, y: 0.7307 }, B1: { x: 0.7, y: 0.5488 }, B2: { x: 0.5402, y: 0.5668 } } },
  Succubus_prologue_Starvation_orgasm_1: { displayHeight: 560, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.6386, y: 0.2629 }, C: { x: 0.4749, y: 0.7494 }, V: { x: 0.4549, y: 0.7493 }, A: { x: 0.4094, y: 0.7307 }, B1: { x: 0.7013, y: 0.5424 }, B2: { x: 0.5387, y: 0.5574 } } },
  Succubus_prologue_Starvation_rubOneOut_1: { displayHeight: 557, offsetX: 0, offsetY: 3, epPoints: { M: { x: 0.6561, y: 0.3113 }, C: { x: 0.508, y: 0.7593 }, V: { x: 0.4958, y: 0.794 }, A: { x: 0.4795, y: 0.825 }, B1: { x: 0.6391, y: 0.5338 }, B2: { x: 0.4669, y: 0.5483 } } },
  Succubus_prologue_Starvation_rubOneOut_Horny_1: 'Succubus_prologue_Starvation_rubOneOut_1',
  Succubus_prologue_Starvation_rubOneOut_EPdamage_1: { displayHeight: 560, offsetX: -9.6, offsetY: 33.6, epPoints: { M: { x: 0.6955, y: 0.2766 }, C: { x: 0.5587, y: 0.7308 }, V: { x: 0.5483, y: 0.763 }, A: { x: 0.5264, y: 0.7754 }, B1: { x: 0.671, y: 0.4718 }, B2: { x: 0.526, y: 0.4736 } } },
  Succubus_prologue_Starvation_rubOneOut_Horny_EPdamage_1: 'Succubus_prologue_Starvation_rubOneOut_EPdamage_1',
  Succubus_prologue_Starvation_rubOneOut_orgasm_1: { displayHeight: 577, offsetX: -10.6, offsetY: 10, epPoints: { M: { x: 0.6564, y: 0.2133 }, C: { x: 0.5567, y: 0.7481 }, V: { x: 0.5542, y: 0.7742 }, A: { x: 0.5381, y: 0.7853 }, B1: { x: 0.6866, y: 0.4842 }, B2: { x: 0.5418, y: 0.4879 } } },
  Succubus_prologue_Starvation_rubOneOut_Horny_orgasm_1: 'Succubus_prologue_Starvation_rubOneOut_orgasm_1',
  Succubus_prologue_Starvation_Horny_1: { displayHeight: 560, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.6679, y: 0.3162 }, C: { x: 0.4781, y: 0.7501 }, V: { x: 0.4721, y: 0.7663 }, A: { x: 0.4287, y: 0.743 }, B1: { x: 0.7092, y: 0.5496 }, B2: { x: 0.5485, y: 0.5658 } } },
  Succubus_prologue_Starvation_Horny_hover_1: { displayHeight: 560, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.6679, y: 0.3162 }, C: { x: 0.4781, y: 0.7501 }, V: { x: 0.4721, y: 0.7663 }, A: { x: 0.4287, y: 0.743 }, B1: { x: 0.7092, y: 0.5496 }, B2: { x: 0.5475, y: 0.5676 } } },
  Succubus_prologue_Starvation_Horny_EPdamage_1: 'Succubus_prologue_Starvation_EPgte50per_1',
  Succubus_prologue_Starvation_Horny_orgasm_1: 'Succubus_prologue_Starvation_orgasm_1',
  Succubus_prologue_Starvation_InHeat_1: { displayHeight: 590, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.6465, y: 0.2567 }, C: { x: 0.5006, y: 0.7143 }, V: { x: 0.4815, y: 0.7242 }, A: { x: 0.4404, y: 0.7078 }, B1: { x: 0.7469, y: 0.4792 }, B2: { x: 0.5532, y: 0.5082 } } },
  Succubus_prologue_Starvation_Horny_rubOneOut_1: 'Succubus_prologue_Starvation_InHeat_1',
  Succubus_prologue_Starvation_InHeat_hover_1: { displayHeight: 590, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.6372, y: 0.2784 }, C: { x: 0.5379, y: 0.7357 }, V: { x: 0.5239, y: 0.7527 }, A: { x: 0.4637, y: 0.732 }, B1: { x: 0.7613, y: 0.5048 }, B2: { x: 0.5474, y: 0.5223 } } },
  Succubus_prologue_Starvation_InHeat_orgasm_1: { displayHeight: 540, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.6604, y: 0.2976 }, C: { x: 0.4998, y: 0.7405 }, V: { x: 0.4788, y: 0.7477 }, A: { x: 0.414, y: 0.739 }, B1: { x: 0.5535, y: 0.5295 }, B2: { x: 0.7002, y: 0.5448 } } },
  Succubus_prologue_Starvation_Frustrated_1: { displayHeight: 590, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.7563, y: 0.305 }, C: { x: 0.507, y: 0.7651 }, V: { x: 0.4918, y: 0.7746 }, A: { x: 0.4219, y: 0.7627 }, B1: { x: 0.708, y: 0.5518 }, B2: { x: 0.5737, y: 0.5581 } } },
  Succubus_prologue_Starvation_Frustrated_rubOneOut_1: { displayHeight: 590, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.5771, y: 0.286 }, C: { x: 0.5536, y: 0.7372 }, V: { x: 0.5525, y: 0.7671 }, A: { x: 0.5237, y: 0.7784 }, B1: { x: 0.6809, y: 0.4823 }, B2: { x: 0.5071, y: 0.4985 } } },
  Succubus_prologue_Starvation_Frustrated_orgasm_1: 'Succubus_prologue_Starvation_Frustrated_rubOneOut_1',
  Succubus_prologue_Starvation_DesperateToCum_1: { displayHeight: 590, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.6183, y: 0.3133 }, C: { x: 0.4747, y: 0.7127 }, V: { x: 0.4653, y: 0.727 }, A: { x: 0.4389, y: 0.7139 }, B1: { x: 0.5836, y: 0.4885 }, B2: { x: 0.4362, y: 0.5291 } } },
  Succubus_prologue_Starvation_DesperateToCum_EPdamage_1: { displayHeight: 590, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.5655, y: 0.2057 }, C: { x: 0.4729, y: 0.7172 }, V: { x: 0.4659, y: 0.739 }, A: { x: 0.4377, y: 0.7188 }, B1: { x: 0.6047, y: 0.4935 }, B2: { x: 0.4408, y: 0.5185 } } },
  Succubus_prologue_Starvation_DesperateToCum_orgasm_1: { displayHeight: 590, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.5492, y: 0.1879 }, C: { x: 0.4729, y: 0.7172 }, V: { x: 0.4659, y: 0.739 }, A: { x: 0.4377, y: 0.7188 }, B1: { x: 0.5797, y: 0.4894 }, B2: { x: 0.4236, y: 0.5314 } } },
  Succubus_prologue_Starvation_seduction_1: { displayHeight: 530, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.5961, y: 0.2803 }, C: { x: 0.5033, y: 0.6798 }, V: { x: 0.4821, y: 0.6834 }, A: { x: 0.4497, y: 0.6556 }, B1: { x: 0.6523, y: 0.4538 }, B2: { x: 0.4949, y: 0.4665 } } },
  Succubus_prologue_Starvation_seduction_EPdamage_1: 'Succubus_prologue_Starvation_seduction_1',
  Succubus_prologue_Starvation_hasInserted_1: { displayHeight: 530, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.5961, y: 0.2803 }, C: { x: 0.5033, y: 0.6798 }, V: { x: 0.4821, y: 0.6834 }, A: { x: 0.4497, y: 0.6556 }, B1: { x: 0.6523, y: 0.4538 }, B2: { x: 0.4884, y: 0.4651 } } },
  Succubus_prologue_Starvation_hasInserted_hover_1: { displayHeight: 530, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.5961, y: 0.2803 }, C: { x: 0.5033, y: 0.6798 }, V: { x: 0.4821, y: 0.6834 }, A: { x: 0.4497, y: 0.6556 }, B1: { x: 0.6482, y: 0.4455 }, B2: { x: 0.4919, y: 0.4628 } } },
  Succubus_prologue_Starvation_hasInserted_EPdamage_1: { displayHeight: 530, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.5961, y: 0.2803 }, C: { x: 0.5033, y: 0.6798 }, V: { x: 0.4821, y: 0.6834 }, A: { x: 0.4497, y: 0.6556 }, B1: { x: 0.6523, y: 0.4538 }, B2: { x: 0.4907, y: 0.4699 } } },
  Succubus_prologue_Starvation_hasInserted_EPdamage_2: { displayHeight: 530, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.5727, y: 0.2803 }, C: { x: 0.5033, y: 0.6798 }, V: { x: 0.4821, y: 0.6834 }, A: { x: 0.4497, y: 0.6556 }, B1: { x: 0.6527, y: 0.4475 }, B2: { x: 0.4764, y: 0.4654 } } },
  Succubus_prologue_Starvation_hasInserted_orgasm_1: { displayHeight: 530, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.555, y: 0.181 }, C: { x: 0.5122, y: 0.6914 }, V: { x: 0.4863, y: 0.6916 }, A: { x: 0.4532, y: 0.6649 }, B1: { x: 0.6603, y: 0.4489 }, B2: { x: 0.5039, y: 0.4491 } } },
  Succubus_prologue_Faintedgte1_1: { displayHeight: 560, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.6693, y: 0.2804 }, C: { x: 0.5038, y: 0.6861 }, V: { x: 0.4802, y: 0.699 }, A: { x: 0.4018, y: 0.6701 }, B1: { x: 0.7812, y: 0.4769 }, B2: { x: 0.6173, y: 0.518 } } },
  Succubus_prologue_Faintedgte2_1: { displayHeight: 640, offsetX: 0, offsetY: 0, epPoints: { M: { x: 0.4782, y: 0.2111 }, C: { x: 0.5768, y: 0.5401 }, V: { x: 0.5768, y: 0.5401 }, A: { x: 0.5037, y: 0.5236 }, B1: { x: 0.699, y: 0.3149 }, B2: { x: 0.4855, y: 0.3172 } } },
  Succubus_Death_1: 'Succubus_prologue_Faintedgte2_1',
};
