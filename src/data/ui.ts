export interface CrayonAnimationConfig {
  redrawDuration: number; // 描き替え全体の秒数。0で即時切替、0以上。Ctrl早送りの対象。
}

export const CRAYON_ANIMATION: CrayonAnimationConfig = {
  redrawDuration: 0.25,
};
