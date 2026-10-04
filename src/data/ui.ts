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

/** 使用可能な手札がない時のEnd Turn背景。画像再生成なしの乗算Tint。 */
export const END_TURN_PROMPT = {
  cycleDuration: 1500, // 元の色→濃い色→元の色の1周期ms。正の値。Ctrl早送り対象。
  minBrightness: 0.75, // 最も濃い時の明るさ。0～1（1で色変化なし）。文字色は変えない。
};

/** 山札・捨て札の詳細と、手札長押しの共通拡大表示。 */
export const CARD_INSPECTION = {
  detailScale: 1.8, // 通常カードに対する倍率。正の値。
  detailX: 1070, detailY: 382, // 一覧右側の詳細カード中心座標px。
  progressStartMs: 400, // 円形進捗の表示開始と短押しの上限。実時間ms。
  openMs: 1000, // 拡大までの長押し時間。progressStartMsより大きい実時間ms。Ctrl非対象。
  progressRadius: 22, progressWidth: 8, // マウス周囲の進捗の半径・線幅px。
  progressColor: 0xffffff, progressAlpha: 0.5, // 進捗色0xRRGGBB、不透明度0～1。
  progressShadow: { color: 0x000000, alpha: 0.35, spread: 0, blur: 3, offsetX: 2, offsetY: 2 }, // 進捗背面の影。色0xRRGGBB、不透明度0～1、線の広がり・ぼかし範囲・位置補正px。
  shadeAlpha: 0.55, // 拡大表示の背面暗転。不透明度0～1。
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

/** 選択時の輪郭の外側への光。時間はms、Ctrl早送り対象。 */
export const SELECTION_GLOW = {
  card: {
    usableColor: 0x65baff, // 使用可能なカード。
    unusableColor: 0xff666f, // エナジー不足・使用条件不成立。
    spread: 14, // カード等倍時の外側への広がりpx。
    maxAlpha: 0.6, // 発光の最も強い時の不透明度（0～1）。
    minAlpha: 0.15, // 脈動の谷の不透明度（0～maxAlpha）。
    dimmedMultiplier: 0.7, // 透過カードの光を追加で弱める倍率（0～1）。カードの透過もそのまま適用。
    pulseDuration: 1400, // 弱まり、再び強まる1周期。正のms。
  },
  enemy: {
    color: 0xffdf91, // レティクルに合わせた淡い金色。
    spread: 6, // 輪郭の外側への広がりpx。正の値。
    strength: 2, // 外側発光の強さ。0で無効。
    riseDuration: 90, // 光が外側へ広がる時間。正のms。
    fadeDuration: 260, // 光が完全に消えるまでの時間。正のms。
  },
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
  orgasmColor: 0xffc9e3, // 絶頂時の淡いピンク。
  tintRatio: 0.45, // 1周期のうち色を付ける割合（0より大きく1未満）。残りは元の画像。
  maxTintDuration: 72, // 色を付ける時間の上限（ms）。連続絶頂では周期に比例して短縮。
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

/** 状態異常とレリック共通の横の隙間。状態異常だけ列数で折り返す。単位px。 */
export const ICON_HUD_LAYOUT = {
  gap: 2,
  statusColumns: 8,
  statusRowGap: 14, // 上にはみ出す個数表示と前の行が重ならない余白。
  enemyStatusSize: 32,
};

/** 状態異常・レリック共通のアイコン描画。個別の文字と背景色は各定義のiconText/iconColorが優先。 */
export const ICON_APPEARANCE = {
  Status: { fallbackColor: 0x526075, borderColor: 0xffffff, borderAlpha: 0.68, fontSize: 15, compactFontSize: 13 },
  Relic: { fallbackColor: 0x6f4f2d, borderColor: 0xf1c27d, borderAlpha: 0.9, fontSize: 13, compactFontSize: 13 },
  borderWidth: 2, // 代替表示の枠線幅px。画像表示時は枠線と背景を隠す。
  textColor: '#ffffff',
  fallbackTextLength: 2, // iconText省略時の文字数。レリックは名称、状態異常はIDから取得。
  compactCountThreshold: 9, // スタック数がこの値を超えるとcompactFontSizeを使用。
  maxDisplayedStacks: 99, // 状態異常のスタック表示上限。
  imageCountStrokeColor: '#000000', imageCountStrokeWidth: 3,
  statusCounter: { offsetX: 0, offsetY: 0, fontSize: 12, stackPrefix: '×', turnPrefix: 'T' }, // 右端をアイコン右端に揃え、上方向に半分はみ出す。補正px。
  relicGlow: { color: 0xffffff, spread: 2, angularSamples: 16, idleStrength: 0.55, activeStrength: 1.2 }, // spreadは通常アイコン表示時のpx（拡大に追従）。angularSamplesはキャッシュ生成時の方向数（8以上、4の倍数へ切上げ）。
  relicActivation: { scale: 1.22, growDuration: 140, glowRiseDuration: 100, glowHoldDuration: 120, glowFadeDuration: 140, shrinkDuration: 140 }, // 拡大→発光→減光→縮小。時間ms、Ctrl早送り対象。
  relicCounter: { offsetX: 12, offsetY: 11, fontSize: 11, textColor: '#ffffff', backgroundColor: '#1f2329' },
  relicRewardSize: 42, relicRewardFontSize: 14, // 報酬候補内のアイコンサイズと代替文字サイズpx。
};
