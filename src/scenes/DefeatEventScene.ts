import { SCREEN_WIDTH, SCREEN_HEIGHT, SCREEN_CENTER_X, SCREEN_CENTER_Y } from '../ui/layout';
import { GAME_FONT } from '../ui/fonts';
import { CrayonPatch, CRAYON_COLORS } from '../ui/crayon';
import { KeyboardNavigation } from '../ui/keyboardNavigation';
import { ConversationWindow, preloadConversationAssets } from '../ui/conversation';
import { preloadSprites, createSpriteAnimations } from '../ui/sprites';
import { DEFEAT_CONVERSATIONS } from '../data/conversations';
import Phaser from 'phaser';
import { localizeGameText as localize } from '../models/gameText';
import { SETTINGS_STATE, text as l, toggleLanguage, type LocalizedText } from '../models/localization';
import { resetRunState } from '../models/RunState';

type LocalizedTextBinding = { text: Phaser.GameObjects.Text; getText: () => string };

export class DefeatEventScene extends Phaser.Scene {
  private modalOverlay!: Phaser.GameObjects.Container;
  private conversation?: ConversationWindow;
  private localizedTextBindings: LocalizedTextBinding[] = [];

  constructor() { super('DefeatEventScene'); }

  preload(): void { preloadSprites(this); preloadConversationAssets(this); }

  create(data: { cause?: string; conversationId?: string } = {}): void {
    createSpriteAnimations(this);
    KeyboardNavigation.for(this).configure({
      scope: () => this.modalOverlay?.visible ? this.modalOverlay : undefined,
      escape: () => this.modalOverlay?.visible ? this.hideModal() : this.showSettingsMenu(),
    });
    this.localizedTextBindings = [];
    this.add.rectangle(SCREEN_CENTER_X, SCREEN_CENTER_Y, SCREEN_WIDTH, SCREEN_HEIGHT, 0x030406);
    this.createSettingsButton();
    this.createModalOverlay();
    const id = data.conversationId ?? DEFEAT_CONVERSATIONS[data.cause ?? 'default'] ?? DEFEAT_CONVERSATIONS.default;
    this.conversation = new ConversationWindow(this, id, () => this.modalOverlay.visible);
    void this.conversation.finished.then(completed => { if (completed && this.sys.isActive()) this.returnToTitle(); });
  }

  private createSettingsButton(): void {
    const button = this.add.container(1220, 28);
    button.setDepth(6000);
    const bg = new CrayonPatch(this, 0, 0, 100, 36, CRAYON_COLORS.button, 1);
    bg.setStrokeStyle(2, 0x7d8ba0, 0.85);
    const label = this.add.text(0, 0, this.uiText('Settings', '設定'), this.centerStyle(16));
    label.setOrigin(0.5);
    this.bindLocalizedText(label, () => this.uiText('Settings', '設定'));
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setHoverColor(CRAYON_COLORS.hover));
    bg.on('pointerout', () => bg.setHoverColor());
    bg.on('pointerup', () => this.showSettingsMenu());
    KeyboardNavigation.for(this).register(bg, { group: 'settings' });
    button.add([bg, label]);
  }

  private createModalOverlay(): void {
    this.modalOverlay = this.add.container(0, 0);
    this.modalOverlay.setDepth(7000);
    this.modalOverlay.setVisible(false);
  }

  private showSettingsMenu(): void {
    this.modalOverlay.removeAll(true);
    const shade = this.add.rectangle(SCREEN_CENTER_X, SCREEN_CENTER_Y, SCREEN_WIDTH, SCREEN_HEIGHT, 0x050607, 0.55);
    shade.setInteractive();
    shade.on('pointerup', () => this.hideModal());
    const panel = this.add.rectangle(640, 360, 500, 420, 0x242a33, 0.98);
    panel.setStrokeStyle(3, 0x758195, 0.9);
    panel.setInteractive();
    panel.on('pointerup', (pointer: Phaser.Input.Pointer) => pointer.event?.stopPropagation());
    const title = this.add.text(640, 220, this.uiText('Settings', '設定'), this.centerStyle(30));
    title.setOrigin(0.5);
    const language = this.createButton(640, 290, 360, 46, () => this.languageButtonText(), () => {
      toggleLanguage();
      this.refreshLocalizedText();
      this.showSettingsMenu();
    });
    const retry = this.createButton(640, 348, 360, 46, () => this.uiText('Retry Previous Battle', '直前の戦闘に再挑戦'), () => {
      this.showConfirmDialog(l('Retry the previous battle?', '直前の戦闘に再挑戦します。よろしいですか？'), () => this.scene.start('BattleScene'));
    });
    const help = this.createButton(640, 406, 360, 46, () => this.uiText('Help', 'ヘルプ'), () => this.showHelpPage());
    const titleButton = this.createButton(640, 464, 360, 46, () => this.uiText('Return to Title', 'タイトルに戻る'), () => {
      this.showConfirmDialog(l('Return to title?', 'タイトルに戻ります。よろしいですか？'), () => this.returnToTitle());
    });
    const close = this.createButton(640, 522, 180, 40, () => this.uiText('Close', '閉じる'), () => this.hideModal());
    this.modalOverlay.add([shade, panel, title, language, retry, help, titleButton, close]);
    this.modalOverlay.setVisible(true);
  }

  private showHelpPage(): void {
    this.modalOverlay.removeAll(true);
    const shade = this.add.rectangle(SCREEN_CENTER_X, SCREEN_CENTER_Y, SCREEN_WIDTH, SCREEN_HEIGHT, 0x050607, 0.58);
    shade.setInteractive();
    shade.on('pointerup', () => this.showSettingsMenu());
    const panel = this.add.rectangle(640, 360, 820, 520, 0x242a33, 0.98);
    panel.setStrokeStyle(3, 0x758195, 0.9);
    panel.setInteractive();
    panel.on('pointerup', (pointer: Phaser.Input.Pointer) => pointer.event?.stopPropagation());
    const title = this.add.text(640, 135, this.uiText('Help', 'ヘルプ'), this.centerStyle(32));
    title.setOrigin(0.5);
    const text = this.add.text(275, 180, SETTINGS_STATE.language === 'ja'
      ? [
          'これは仮の敗北イベント画面です。',
          'テキストウィンドウまたは画面クリックで文章を進めます。',
          '会話ウインドウの開閉中はページ送りできません。',
          '直前の戦闘に再挑戦すると、同じ戦闘をもう一度開始します。',
        ]
      : [
          'This is a placeholder defeat event scene.',
          'Click the text window or screen to advance lines.',
          'Page advance is disabled while the dialogue window opens or closes.',
          'Retry Previous Battle starts the same battle again.',
        ], {
      fontFamily: GAME_FONT,
      fontSize: '18px',
      color: '#e5edf7',
      wordWrap: { width: 730, useAdvancedWrap: true },
      lineSpacing: 8,
    });
    const back = this.createButton(640, 590, 220, 42, () => this.uiText('Back', '戻る'), () => this.showSettingsMenu());
    this.modalOverlay.add([shade, panel, title, text, back]);
    this.modalOverlay.setVisible(true);
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    labelText: string | (() => string),
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const button = this.add.container(x, y);
    const bg = new CrayonPatch(this, 0, 0, width, height, CRAYON_COLORS.button, 1);
    bg.setStrokeStyle(2, 0x9ba8ba, 0.9);
    const getLabelText = typeof labelText === 'function' ? labelText : () => labelText;
    const label = this.add.text(0, 0, getLabelText(), this.centerStyle(17));
    label.setOrigin(0.5);
    if (typeof labelText === 'function') {
      this.bindLocalizedText(label, getLabelText);
    }
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setHoverColor(CRAYON_COLORS.hover));
    bg.on('pointerout', () => bg.setHoverColor());
    bg.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      pointer.event?.stopPropagation();
      onClick();
    });
    KeyboardNavigation.for(this).register(bg);
    button.add([bg, label]);
    return button;
  }

  private showConfirmDialog(message: LocalizedText, onConfirm: () => void): void {
    this.modalOverlay.removeAll(true);
    const shade = this.add.rectangle(SCREEN_CENTER_X, SCREEN_CENTER_Y, SCREEN_WIDTH, SCREEN_HEIGHT, 0x050607, 0.58);
    shade.setInteractive();
    const panel = this.add.rectangle(640, 360, 560, 240, 0x242a33, 0.98);
    panel.setStrokeStyle(3, 0x758195, 0.9);
    panel.setInteractive();
    panel.on('pointerup', (pointer: Phaser.Input.Pointer) => pointer.event?.stopPropagation());
    const title = this.add.text(640, 285, this.uiText('Confirm', '確認'), this.centerStyle(28));
    title.setOrigin(0.5);
    const body = this.add.text(640, 350, localize(message), {
      fontFamily: GAME_FONT,
      fontSize: '20px',
      color: '#e5edf7',
      align: 'center',
      wordWrap: { width: 480, useAdvancedWrap: true },
    });
    body.setOrigin(0.5);
    const yes = this.createButton(545, 430, 150, 42, () => this.uiText('Yes', 'はい'), onConfirm);
    const no = this.createButton(735, 430, 150, 42, () => this.uiText('No', 'いいえ'), () => this.showSettingsMenu());
    this.modalOverlay.add([shade, panel, title, body, yes, no]);
    this.modalOverlay.setVisible(true);
  }

  private hideModal(): void {
    this.modalOverlay.removeAll(true);
    this.modalOverlay.setVisible(false);
  }

  private returnToTitle(): void {
    resetRunState();
    this.scene.start('TitleScene');
  }

  private centerStyle(fontSize: number): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: GAME_FONT,
      fontSize: `${fontSize}px`,
      fontStyle: 'bold',
      color: '#f8fafc',
      align: 'center',
    };
  }

  private uiText(en: string, ja: string): string {
    return SETTINGS_STATE.language === 'ja' ? ja : en;
  }

  private languageButtonText(): string {
    return SETTINGS_STATE.language === 'ja' ? 'Language / 表示言語: 日本語' : 'Language / 表示言語: English';
  }

  private bindLocalizedText(text: Phaser.GameObjects.Text, getText: () => string): void {
    this.localizedTextBindings.push({ text, getText });
  }

  private refreshLocalizedText(): void {
    this.localizedTextBindings = this.localizedTextBindings.filter(({ text }) => text.active && text.scene);
    this.localizedTextBindings.forEach(({ text, getText }) => text.setText(getText()));
    this.conversation?.refresh();
  }
}
