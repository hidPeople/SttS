import { SCREEN_WIDTH, SCREEN_HEIGHT } from './ui/layout';
import Phaser from 'phaser';
import './styles.css';
import { loadGameFont } from './ui/fonts';
import { installGameSpeed } from './ui/gameSpeed';
import { SELECTION_GLOW } from './data/ui';
import { BattleScene } from './scenes/BattleScene';
import { DefeatEventScene } from './scenes/DefeatEventScene';
import { RewardScene } from './scenes/RewardScene';
import { TitleScene } from './scenes/TitleScene';

// Phaser 3.90 reads fx.glow in Core.Config but omits it from GameConfig's declaration.
const config: Phaser.Types.Core.GameConfig & { fx: { glow: { quality: number; distance: number } } } = {
  type: Phaser.AUTO,
  callbacks: { postBoot: installGameSpeed },
  parent: 'app',
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  backgroundColor: '#171a1f',
  // Enemy selection uses a shared sprite-local PreFX shader instead of per-enemy PostFX.
  fx: { glow: { quality: 0.1, distance: Math.max(1, Math.round(SELECTION_GLOW.enemy.spread)) } },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [TitleScene, BattleScene, RewardScene, DefeatEventScene],
};

void loadGameFont().catch(error => {
  console.error('ゲーム用フォントの読み込みに失敗しました。代替フォントを使用します。', error);
}).then(() => new Phaser.Game(config));
