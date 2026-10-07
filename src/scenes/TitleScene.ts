import { onPrimaryClick, installPointerBack } from '../ui/pointerActions';
import { SCREEN_WIDTH, SCREEN_HEIGHT, SCREEN_CENTER_X, SCREEN_CENTER_Y } from '../ui/layout';
import { GAME_FONT } from '../ui/fonts';
import { CrayonPatch, CRAYON_COLORS } from '../ui/crayon';
import { KeyboardNavigation } from '../ui/keyboardNavigation';
import Phaser from 'phaser';
// DEBUG_MODE_START
import { installTitleDebugSequence } from '../debug/debugMode';
// DEBUG_MODE_END
import { resetRunState, startEventBattle } from '../models/RunState';
import { EVENT_BATTLES } from '../data/eventBattles';
import { USER_SETTINGS } from '../models/userSettings';
import { RUN_SAVES } from '../models/runSaves';
import { SETTINGS_STATE } from '../models/localization';
import { openSaveLoad } from './SaveLoadScene';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create(): void {
    KeyboardNavigation.for(this);
    installPointerBack(this, () => false);
    // DEBUG_MODE_START
    installTitleDebugSequence(this);
    // DEBUG_MODE_END

    this.add.rectangle(SCREEN_CENTER_X, SCREEN_CENTER_Y, SCREEN_WIDTH, SCREEN_HEIGHT, 0x12161d);
    this.add.rectangle(SCREEN_CENTER_X, 465, SCREEN_WIDTH, 410, 0x202631, 0.9);

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

    this.createButton(640, 340, 320, 52, this.ui('Prologue', 'プロローグ'), () => {
      startEventBattle('prologue');
      const conversationId = EVENT_BATTLES.prologue.introConversationId;
      this.scene.start(conversationId ? 'DefeatEventScene' : 'BattleScene', {
        conversationId, eventBattleId: 'prologue', completion: 'battle',
      });
    });
    this.createPrologueEndStatus();
    this.createButton(640, 430, 320, 52, this.ui('New Game', 'ニューゲーム'), () => this.showNewGameChoice());
    this.createButton(640, 496, 320, 52, this.ui('Continue from Save', 'セーブデータから続ける'), () => openSaveLoad(this, { mode: 'load' }), RUN_SAVES.list().length > 0);
    this.createButton(640, 562, 320, 52, 'Extra', () => this.scene.start('ExtraScene'));
  }

  private createPrologueEndStatus(): void {
    const seen = new Set(USER_SETTINGS.value.gallery.seenConversationIds);
    const entries = [
      { label: 'END', id: 'prologueAfterBattle' },
      { label: 'BAD END 1', id: 'prologueDefeat1' },
      { label: 'BAD END 2', id: 'prologueDefeat2' },
    ];
    const status = this.add.container(0, 383);
    let x = 0;
    entries.forEach((entry, index) => {
      const label = this.add.text(x, 0, entry.label, {
        fontFamily: GAME_FONT, fontSize: '15px', fontStyle: seen.has(entry.id) ? 'bold' : 'normal',
        color: seen.has(entry.id) ? '#f3d27b' : '#697382',
      }).setOrigin(0, 0.5);
      status.add(label);
      x += label.width + 10;
      if (index < entries.length - 1) {
        const separator = this.add.text(x, 0, '/', {
          fontFamily: GAME_FONT, fontSize: '15px', fontStyle: 'bold', color: '#f8fafc',
        }).setOrigin(0, 0.5);
        status.add(separator);
        x += separator.width + 10;
      }
    });
    status.x = 640 - x / 2;
  }

  private showNewGameChoice(): void {
    const overlay = this.add.container(0, 0).setDepth(5000);
    const shade = this.add.rectangle(640, 360, 1280, 720, 0x050607, 0.72).setInteractive();
    const panel = new CrayonPatch(this, 640, 360, 600, 330, 0x242a33, 1); panel.setStrokeStyle(3, 0x758195, 0.9);
    const title = this.add.text(640, 260, this.ui('How would you like to start?', '開始状態を選択してください'), {
      fontFamily: GAME_FONT, fontSize: '24px', fontStyle: 'bold', color: '#f8fafc',
    }).setOrigin(0.5);
    const fresh = this.createButton(640, 330, 390, 48, this.ui('Start Fresh', '初期状態で開始'), () => {
      resetRunState(); this.scene.start('BattleScene', { freshRun: true });
    });
    const body = this.createButton(640, 395, 390, 48, this.ui('Load Body State and Start', 'からだの状態をロードして開始'), () => {
      overlay.destroy(true); openSaveLoad(this, { mode: 'body' });
    }, RUN_SAVES.hasEligibleBodySave());
    const cancel = this.createButton(640, 465, 180, 40, this.ui('Cancel', 'キャンセル'), () => overlay.destroy(true));
    overlay.add([shade, panel, title, fresh, body, cancel]);
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    labelText: string,
    onClick: () => void,
    enabled = true,
  ): Phaser.GameObjects.Container {
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
    if (enabled) {
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => bg.setHoverColor(CRAYON_COLORS.hover));
      bg.on('pointerout', () => bg.setHoverColor());
      onPrimaryClick(bg, onClick);
      KeyboardNavigation.for(this).register(bg);
    } else {
      bg.setFillStyle(0x454b55); label.setColor('#7a828d'); button.setAlpha(0.72);
    }
    button.add([bg, label]);
    return button;
  }

  private ui(en: string, ja: string): string { return SETTINGS_STATE.language === 'ja' ? ja : en; }
}
