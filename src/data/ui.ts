export interface CrayonAnimationConfig {
  redrawDuration: number; // 描き替え全体の秒数。0で即時切替、0以上。Ctrl早送りの対象。
}

export const CRAYON_ANIMATION: CrayonAnimationConfig = {
  redrawDuration: 0.25,
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
