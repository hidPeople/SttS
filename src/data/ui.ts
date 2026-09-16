export interface CrayonAnimationConfig {
  redrawDuration: number; // 描き替え全体の秒数。0で即時切替、0以上。Ctrl早送りの対象。
}

export const CRAYON_ANIMATION: CrayonAnimationConfig = {
  redrawDuration: 0.25,
};

/** Shared by the relic row and the top edge of the player portrait. */
export const RELIC_HUD_LAYOUT: { x: number; y: number; iconSize: number } = {
  x: 386, y: 24, iconSize: 34,
};
