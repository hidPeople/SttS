/** 敵の行動予告のダメージ数値色。プレイヤーへの攻撃・敵自身への自傷で共通。 */
export const ENEMY_INTENT_COLORS = {
  hpDamage: '#f5715f', // HPダメージ（赤）。#RRGGBB形式。
  epDamage: '#ec7af0', // EPダメージ（ピンク）。#RRGGBB形式。
};

/** 敵の行動予告。行動名・区切りとダメージ数値のサイズを別々に指定。 */
export const ENEMY_INTENT_TEXT = {
  fontSize: 20,
  numberFontSize: 28, // 数値だけ1.4倍。px単位。
};

export interface CrayonAnimationConfig {
  redrawDuration: number; // 描き替え全体の秒数。0で即時切替、0以上。Ctrl早送りの対象。
}

export const CRAYON_ANIMATION: CrayonAnimationConfig = {
  redrawDuration: 0.25,
};

/** 表示時だけの軽い平滑化。元画像や配置は変更しない。 */
export const PLAYER_PORTRAIT_RENDERING = {
  transitionDuration: 200, // 立ち絵切替の合計時間ms。前半で新画像をフェードイン、後半で旧画像をフェードアウト。ホバー安定待ち後に開始。0で即時。Ctrl早送り対象。
  smoothingPixels: 0.1, // WebGL表示時の平滑化幅px。0で無効。大きいほどぼける。
};

export interface CardTextResolutionPoint {
  cardScale: number; // カードの表示倍率。通常手札の160×232を1とする。
  resolution: number; // 文字の内部描画倍率。1以上、小数可。
}

export interface CardTextRenderingConfig {
  scaleResolutions: CardTextResolutionPoint[]; // 最も近いcardScaleの解像度を使用。配列順は不問。
}

export const CARD_TEXT_RENDERING: CardTextRenderingConfig = {
  scaleResolutions: [
    { cardScale: 0.74, resolution: 1 }, // 山札・捨て札の一覧。
    { cardScale: 1, resolution: 1.4 }, // 通常手札。
    { cardScale: 1.12, resolution: 1.5 }, // ホバー中の手札。
    { cardScale: 1.48, resolution: 3 }, // 一覧右側の拡大表示。
  ],
};

/** Relic row placement. */
export const RELIC_HUD_LAYOUT: { x: number; y: number; iconSize: number } = {
  x: 386, y: 24, iconSize: 34,
};

/** The player portrait starts at the bottom of this status icon row. */
export const PLAYER_STATUS_HUD_LAYOUT: { x: number; y: number; iconSize: number } = {
  x: 30, y: 118, iconSize: 32,
};

/** Portrait-only tint pulses. Durations are milliseconds; opacity is never changed. */
export const PLAYER_PORTRAIT_FLASH = {
  damageColor: 0xffdddd, // 通常の乗算Tint。白塗りにはしない。
  damageCycleDuration: 160, // 被ダメージの点滅1周期（ms）。
  damageFlashCount: 2, // 被ダメージの点滅回数。
  peakColor: 0xffc9e3, // Peak時の淡いピンク。
  tintRatio: 0.45, // 1周期のうち色を付ける割合（0より大きく1未満）。残りは元の画像。
  maxTintDuration: 72, // 色を付ける時間の上限（ms）。連続Peakでは周期に比例して短縮。
};

/** マウス操作の安定待ち。Ctrl早送りでは短縮しない。 */
export const PLAYER_PORTRAIT_HOVER = {
  delayMs: 100, // ホバー開始・解除の判定が連続して続く必要がある実時間ms。0で即時。
};

/** 自動Tipsの初回表示。ページ送り時には繰り返さない。 */
export const TUTORIAL_TIP_PRESENTATION = {
  fadeInDuration: 500, // 暗転とTipsが徐々に現れる時間ms。Ctrl早送り対象。0で即時。
  inputLockDuration: 500, // 表示後のページ送り・終了を禁止する実時間ms。Ctrlでは短縮しない。
};
