export interface BattleBackgroundConfig {
  fallback: string; // image/background内のファイル名。未設定のステージで使用。
  stages: Record<number, string>; // ステージ番号 → 背景ファイル名。
  events: Record<string, string>; // イベント戦闘ID → 背景ファイル名。ステージ設定より優先。
}
export const BATTLE_BACKGROUNDS: BattleBackgroundConfig = {
  fallback: 'Prison.png',
  stages: { 1: 'Prison.png' },
  events: { tutorial: 'Prison_cell.png' },
};

export interface BattleEntranceConfig {
  playerDuration: number; // 横方向に1回転しながらフェードインする時間ms。0で即時。
  enemyDuration: number; // 敵1体を下から描画する時間ms。0で即時。
  nextEnemyProgress: number; // 前の敵がこの割合まで現れたら次を開始。0〜1。
  enemyOrder: Record<number, number[]>; // 敵数 → 左から数えた0始まりの登場順。未設定は左から順。
}
export const BATTLE_ENTRANCE: BattleEntranceConfig = {
  playerDuration: 400,
  enemyDuration: 300,
  nextEnemyProgress: 0.5,
  enemyOrder: { 1: [0], 2: [0, 1], 3: [1, 0, 2] },
};
