import Phaser from 'phaser';
// DEBUG_MODE_START
import { installTitleDebugSequence } from '../debug/debugMode';
// DEBUG_MODE_END
import { resetRunState } from '../models/RunState';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create(): void {
    // DEBUG_MODE_START
    installTitleDebugSequence(this);
    // DEBUG_MODE_END

    this.add.rectangle(640, 360, 1280, 720, 0x12161d);
    this.add.rectangle(640, 430, 1280, 280, 0x202631, 0.9);

    const title = this.add.text(640, 230, 'Slave to the Succubus', {
      fontFamily: 'Arial',
      fontSize: '46px',
      fontStyle: 'bold',
      color: '#f8fafc',
    });
    title.setOrigin(0.5);

    const subtitle = this.add.text(640, 286, 'Deckbuilder Roguelike Prototype', {
      fontFamily: 'Arial',
      fontSize: '22px',
      color: '#91a4bd',
    });
    subtitle.setOrigin(0.5);

    this.createButton(640, 390, 280, 58, 'New Game', () => {
      resetRunState();
      this.scene.start('BattleScene');
    });
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    labelText: string,
    onClick: () => void,
  ): void {
    const button = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, width, height, 0x3c4654, 1);
    bg.setStrokeStyle(2, 0xaeb8c8, 0.95);
    const label = this.add.text(0, 0, labelText, {
      fontFamily: 'Arial',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#f8fafc',
    });
    label.setOrigin(0.5);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(0x526075));
    bg.on('pointerout', () => bg.setFillStyle(0x3c4654));
    bg.on('pointerup', onClick);
    button.add([bg, label]);
  }
}
