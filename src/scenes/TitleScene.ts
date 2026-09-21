import { GAME_FONT } from '../ui/fonts';
import { CrayonPatch, CRAYON_COLORS } from '../ui/crayon';
import { KeyboardNavigation } from '../ui/keyboardNavigation';
import Phaser from 'phaser';
// DEBUG_MODE_START
import { installTitleDebugSequence } from '../debug/debugMode';
// DEBUG_MODE_END
import { resetRunState, startEventBattle } from '../models/RunState';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create(): void {
    KeyboardNavigation.for(this);
    // DEBUG_MODE_START
    installTitleDebugSequence(this);
    // DEBUG_MODE_END

    this.add.rectangle(640, 360, 1280, 720, 0x12161d);
    this.add.rectangle(640, 430, 1280, 280, 0x202631, 0.9);

    const title = this.add.text(640, 230, 'Slave to the Succubus', {
      fontFamily: GAME_FONT,
      fontSize: '46px',
      fontStyle: 'bold',
      color: '#f8fafc',
    });
    title.setOrigin(0.5);

    const subtitle = this.add.text(640, 286, 'Deckbuilder Roguelike Prototype', {
      fontFamily: GAME_FONT,
      fontSize: '22px',
      color: '#91a4bd',
    });
    subtitle.setOrigin(0.5);

    this.createButton(640, 365, 280, 58, 'Tutorial', () => {
      startEventBattle('tutorial');
      this.scene.start('BattleScene');
    });
    this.createButton(640, 445, 280, 58, 'New Game', () => {
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
    const bg = new CrayonPatch(this, 0, 0, width, height, CRAYON_COLORS.button, 1);
    bg.setStrokeStyle(2, 0xaeb8c8, 0.95);
    const label = this.add.text(0, 0, labelText, {
      fontFamily: GAME_FONT,
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#f8fafc',
    });
    label.setOrigin(0.5);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setHoverColor(CRAYON_COLORS.hover));
    bg.on('pointerout', () => bg.setHoverColor());
    bg.on('pointerup', onClick);
    KeyboardNavigation.for(this).register(bg);
    button.add([bg, label]);
  }
}
