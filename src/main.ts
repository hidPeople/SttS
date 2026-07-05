import Phaser from 'phaser';
import './styles.css';
import { BattleScene } from './scenes/BattleScene';
import { DefeatEventScene } from './scenes/DefeatEventScene';
import { RewardScene } from './scenes/RewardScene';
import { TitleScene } from './scenes/TitleScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: 1280,
  height: 720,
  backgroundColor: '#171a1f',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [TitleScene, BattleScene, RewardScene, DefeatEventScene],
};

new Phaser.Game(config);
