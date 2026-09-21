import { SCREEN_WIDTH, SCREEN_HEIGHT } from './ui/layout';
import Phaser from 'phaser';
import './styles.css';
import { loadGameFont } from './ui/fonts';
import { installGameSpeed } from './ui/gameSpeed';
import { BattleScene } from './scenes/BattleScene';
import { DefeatEventScene } from './scenes/DefeatEventScene';
import { RewardScene } from './scenes/RewardScene';
import { TitleScene } from './scenes/TitleScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  callbacks: { postBoot: installGameSpeed },
  parent: 'app',
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  backgroundColor: '#171a1f',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [TitleScene, BattleScene, RewardScene, DefeatEventScene],
};

void loadGameFont().catch(error => {
  console.error('ゲーム用フォントの読み込みに失敗しました。代替フォントを使用します。', error);
}).then(() => new Phaser.Game(config));
