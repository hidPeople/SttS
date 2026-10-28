import type { Rarity, EpDamagePart } from '../models/types';

export interface CardArtwork {
  focusX?: number; // カード中心に合わせる元画像のX座標px。省略時は画像中央。
  focusY?: number; // カード中心に合わせる元画像のY座標px。省略時は画像中央。
  scale?: number; // 元画像1pxをカード等倍時の何pxで描くか。正の値。省略時は領域を覆う倍率。
  offsetX?: number; // カード中心からの位置補正px。省略時0、反転前の右が正。flipX時は描画上の符号を反転。
  offsetY?: number; // カード中心からの位置補正px。省略時0、下が正。
  rotation?: number; // 時計回りの角度（度）。focus位置を回転中心とする。省略時0。
  flipX?: boolean; // 左右反転。省略時false。offsetXは描画時に符号反転。現在の切り抜きを鏡映する操作ではrotationも反転する。
  edgeFade?: number; // 画像の端を透明にする幅。カード等倍時px。省略時CARD_FRAME.imageEdgeFade、0で無効。
}

export type CardArtworkSet = Record<string, CardArtwork>; // キーは戦闘ID、または戦闘ID+部位（normalV/prologueA等）。配置省略時は画像中央・自動倍率。
export type CardArtworkEntry = CardArtworkSet | string; // 配置一覧、または画像・全戦闘区分の配置を共有するCARD_ARTWORKの登録キー。

/** 部位別画像を使うカード。配列順は同じ戦闘区分内の代替画像の優先順。 */
export const CARD_ARTWORK_VARIANTS: Record<string, EpDamagePart[]> = {
  pullout: ['V', 'A', 'M'],
  purge: ['V', 'A', 'M'],
};

/** カードID → 戦闘ID → 配置。image/card/カードID_戦闘ID.pngを自動検出。
 * 特殊戦闘用がなければnormal画像とnormal配置へ戻る。画像がなければ黒い背景。
 * プロローグ欄は初期デッキ・会話追加・敵との接続・状態異常による追加カードを含む。
 */
export const CARD_ARTWORK: Record<string, CardArtworkEntry> = {
  feverPiston: { normal: { offsetX: 0, offsetY: 0, rotation: 0 } },
  reprisal: { normal: { offsetX: 0, offsetY: 0, rotation: 0 } },
  reflexCaress: { normal: { offsetX: 0, offsetY: 0, rotation: 0 } },
  hazyPiston: { normal: { offsetX: 0, offsetY: 0, rotation: 0 } },
  thornArmor: { normal: { offsetX: 3.5, offsetY: -6.5, rotation: -10.7, scale: 0.172, edgeFade: 3 } },
  sensitization: { normal: { offsetX: 0, offsetY: 0, rotation: 0 } },

  shrewd: { normal: { offsetX: 0, offsetY: -28.5, rotation: 0, scale: 0.171, edgeFade: 0 } },
  tidyUp: { normal: { offsetX: 0, offsetY: -31, rotation: 0, scale: 0.161 } },
  dozeOff: { normal: { offsetX: 4.5, offsetY: -21.5, rotation: -15.8, scale: 0.21 } },
  thrash: { normal: { offsetX: 0, offsetY: 0, rotation: 0 } },
  bite: { normal: { offsetX: 0, offsetY: 0, rotation: 0 } },
  succubusFluid: { normal: { offsetX: 9, offsetY: 6.5, rotation: 0, scale: 0.253 } },
  adapt: { normal: { offsetX: 3, offsetY: -17, rotation: 0, scale: 0.189 } },
  throwCards: { normal: { offsetX: -10, offsetY: -15, rotation: 0, scale: 0.202, edgeFade: 6 } },
  projectileX: { normal: { offsetX: 0, offsetY: -29, rotation: 0, scale: 0.171 } },

  strike: { normal: { offsetX: -1.5, offsetY: -10, rotation: 12, scale: 0.201 }, prologue: { offsetX: 1, offsetY: -3.5, rotation: 0, scale: 0.171 } },
  crescentSlash: { normal: { offsetX: -13, offsetY: 13.5, rotation: -32.9, scale: 0.24 } },
  defend: { normal: { offsetX: -21, offsetY: -14.5, rotation: -27.8, scale: 0.278, flipX: true } },
  seduction: { normal: { offsetX: 1.5, offsetY: -21, rotation: -20.5, scale: 0.18 }, prologue: { offsetX: -1.5, offsetY: -24.5, rotation: 17, scale: 0.171 } },
  handjob: { normal: { offsetX: -8, offsetY: -23.5, rotation: -14, scale: 0.18 }, prologue: { offsetX: -2, offsetY: 21, rotation: 13, scale: 0.251 } },
  blowjob: { normal: { offsetX: -1.5, offsetY: -17.5, rotation: 10.7, scale: 0.185 } },
  titjob: { normal: { offsetX: 0.5, offsetY: -42.5, rotation: 0, scale: 0.172 } },
  cowgirlRiding: { normal: { offsetX: 2.5, offsetY: -33.5, rotation: 18.3, scale: 0.151 }, prologue: { offsetX: 0.5, offsetY: -35, rotation: -4, scale: 0.151, edgeFade: 4 } },
  preparation: { normal: { offsetX: 0, offsetY: -31, rotation: 0, scale: 0.161 } },
  rubOneOut: { normal: { offsetX: -2, offsetY: -25, rotation: -32.5, scale: 0.18 }, prologue: { focusX: 500, focusY: 500, scale: 0.25, offsetX: 0, offsetY: -32.5, rotation: -22 } },
  rubOne: 'rubOneOut',
  meditation: { normal: { offsetX: -1, offsetY: -29, rotation: 0, scale: 0.171 } },
  purge: {
    normal: { offsetX: 0, offsetY: 0, rotation: 0 },
    normalV: { offsetX: 0, offsetY: 0, rotation: 0 }, normalA: { offsetX: 0, offsetY: 0, rotation: 0 }, normalM: { offsetX: 0, offsetY: 0, rotation: 0 },
  },
  pullout: {
    normal: { offsetX: 0, offsetY: 0, rotation: 0 },
    normalV: { offsetX: 2, offsetY: -34, rotation: 6, scale: 0.172 }, normalA: { offsetX: -5, offsetY: -13.5, rotation: 14.7, scale: 0.223 }, normalM: { offsetX: -15.5, offsetY: 17.5, rotation: -4.9, scale: 0.236 },
    prologue: { offsetX: 0, offsetY: 0, rotation: 0 },
    prologueV: { offsetX: 0.5, offsetY: -24, rotation: -14, scale: 0.181 }, prologueA: { offsetX: 0, offsetY: -11, rotation: 3, scale: 0.181, edgeFade: 6 },
  },
  wriggleFree: { normal: { offsetX: 0, offsetY: 0, rotation: 0 } },
  faint: { normal: { offsetX: 2, offsetY: -13.5, rotation: 1.3, scale: 0.168, edgeFade: 5 }, prologue: { offsetX: 38, offsetY: 19, rotation: -7, scale: 0.281 } },
  sharedSensation: { normal: { offsetX: 0, offsetY: 0, rotation: 0 } },
  sensitivityTransfer: { normal: { offsetX: 0, offsetY: 0, rotation: 0 } },
};

/** 枠の形状。幅はカード等倍時px。画像と外枠飾りは同じ中心を使う。 */
export const CARD_FRAME = {
  cornerRadius: 7,
  rimWidth: 5,
  decorationWidth: 2,
  background: 0x151923,
  imageEdgeFade: 12,
  textureResolution: 3, // 枠・画像用の内部描画倍率。正の整数。文字の解像度設定とは独立。
};

export interface CardRarityFinish {
  base: number; // 0xRRGGBB。
  shadow: number; // 暗い部分。0xRRGGBB。
  highlight: number; // 光沢部分。0xRRGGBB。同色にすると単色になる。
}

export const CARD_RARITY_FINISH: Record<Rarity, CardRarityFinish> = {
  starter: { base: 0x343840, shadow: 0x252830, highlight: 0x444952 },
  common: { base: 0x343840, shadow: 0x252830, highlight: 0x444952 },
  uncommon: { base: 0x899bb6, shadow: 0x4e617f, highlight: 0xd9e6f7 },
  rare: { base: 0xc39b45, shadow: 0x7d591e, highlight: 0xffeab3 },
  event: { base: 0xd4d5d8, shadow: 0xb0b3b9, highlight: 0xf0f0f1 },
};
