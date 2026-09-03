import Phaser from 'phaser';
import { PLAYER_DEFINITION } from '../data/player';
import { localize, SETTINGS_STATE, text as l, toggleLanguage, type LocalizedText } from '../models/localization';
import { resetRunState } from '../models/RunState';

const LINES = Array.from(
  { length: 10 },
  (_, index) => l(`Placeholder text ${index + 1}`, `仮テキスト${index + 1}`),
);

type LocalizedTextBinding = {
  text: Phaser.GameObjects.Text;
  getText: () => string;
};

export class DefeatEventScene extends Phaser.Scene {
  private lineIndex = 0;
  private textWindow!: Phaser.GameObjects.Container;
  private bodyText!: Phaser.GameObjects.Text;
  private namePlate!: Phaser.GameObjects.Container;
  private nameText!: Phaser.GameObjects.Text;
  private logOverlay!: Phaser.GameObjects.Container;
  private modalOverlay!: Phaser.GameObjects.Container;
  private autoTimer?: Phaser.Time.TimerEvent;
  private localizedTextBindings: LocalizedTextBinding[] = [];

  constructor() {
    super('DefeatEventScene');
  }

  create(): void {
    this.localizedTextBindings = [];
    this.add.rectangle(640, 360, 1280, 720, 0x030406);
    this.add.rectangle(640, 330, 1280, 520, 0x0b0d12, 1);
    this.add.rectangle(640, 330, 1280, 520, 0x1a101a, 0.32);

    const shadow = this.add.ellipse(640, 495, 280, 46, 0x000000, 0.72);
    const body = this.add.rectangle(640, 335, 190, 280, 0x467fb1, 1);
    body.setStrokeStyle(4, 0xb4d8f5, 0.75);
    const head = this.add.circle(640, 160, 48, 0x76b1df);
    const placeholderLabel = this.add.text(640, 520, this.uiText('PLACEHOLDER EVENT IMAGE', '仮イベント画像'), {
      fontFamily: 'Arial',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#596779',
    }).setOrigin(0.5);
    this.bindLocalizedText(placeholderLabel, () => this.uiText('PLACEHOLDER EVENT IMAGE', '仮イベント画像'));
    shadow.setDepth(1);
    body.setDepth(2);
    head.setDepth(3);

    this.createTextWindow();
    this.createSettingsButton();
    this.createLogOverlay();
    this.createModalOverlay();
    this.showCurrentLine();

    this.input.on('pointerup', (_pointer: Phaser.Input.Pointer, targets: Phaser.GameObjects.GameObject[]) => {
      if (targets.length > 0 || !this.textWindow.visible || this.modalOverlay.visible || this.logOverlay.visible) {
        return;
      }
      this.nextLine();
    });
  }

  private createTextWindow(): void {
    this.textWindow = this.add.container(0, 0);
    this.textWindow.setDepth(100);

    const bg = this.add.rectangle(640, 612, 1100, 165, 0x101419, 0.94);
    bg.setStrokeStyle(3, 0xaeb8c8, 0.9);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerup', () => this.nextLine());

    this.namePlate = this.add.container(210, 505);
    const nameBg = this.add.rectangle(0, 0, 190, 40, 0x242a33, 1);
    nameBg.setStrokeStyle(2, 0xaeb8c8, 0.9);
    this.nameText = this.add.text(0, 0, localize(PLAYER_DEFINITION.name), {
      fontFamily: 'Arial',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#f8fafc',
    });
    this.nameText.setOrigin(0.5);
    this.bindLocalizedText(this.nameText, () => localize(PLAYER_DEFINITION.name));
    this.namePlate.add([nameBg, this.nameText]);

    this.bodyText = this.add.text(125, 560, '', {
      fontFamily: 'Arial',
      fontSize: '26px',
      color: '#f8fafc',
      wordWrap: { width: 940 },
      lineSpacing: 8,
    });

    this.textWindow.add([bg, this.namePlate, this.bodyText]);
    this.createAdvControls();
  }

  private createAdvControls(): void {
    const controls = [
      { x: 880, label: () => this.uiText('LOG', 'ログ'), action: () => this.showLog() },
      { x: 948, label: () => this.uiText('HIDE', '隠す'), action: () => this.toggleWindow() },
      { x: 1028, label: () => this.uiText('AUTO', 'オート'), action: () => this.toggleAuto() },
      { x: 1112, label: () => this.uiText('SKIP', 'スキップ'), action: () => this.skipToEnd() },
    ];

    controls.forEach((control) => {
      const button = this.add.container(control.x, 676);
      button.setDepth(150);
      const bg = this.add.rectangle(0, 0, 58, 32, 0x2d3644, 1);
      bg.setStrokeStyle(2, 0x8fa0b8, 0.85);
      const label = this.add.text(0, 0, control.label(), {
        fontFamily: 'Arial',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#f8fafc',
      });
      label.setOrigin(0.5);
      this.bindLocalizedText(label, control.label);
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => bg.setFillStyle(0x465366));
      bg.on('pointerout', () => bg.setFillStyle(0x2d3644));
      bg.on('pointerup', control.action);
      button.add([bg, label]);
    });
  }

  private showCurrentLine(): void {
    this.bodyText.setText(localize(LINES[this.lineIndex] ?? l('END', '終わり')));
  }

  private nextLine(): void {
    if (this.lineIndex >= LINES.length - 1) {
      this.returnToTitle();
      return;
    }

    this.lineIndex += 1;
    this.showCurrentLine();
  }

  private skipToEnd(): void {
    this.lineIndex = LINES.length - 1;
    this.showCurrentLine();
  }

  private toggleWindow(): void {
    this.textWindow.setVisible(!this.textWindow.visible);
    this.namePlate.setVisible(this.textWindow.visible);
  }

  private toggleAuto(): void {
    if (this.autoTimer) {
      this.autoTimer.remove(false);
      this.autoTimer = undefined;
      return;
    }

    this.autoTimer = this.time.addEvent({
      delay: 1200,
      loop: true,
      callback: () => this.nextLine(),
    });
  }

  private createLogOverlay(): void {
    this.logOverlay = this.add.container(0, 0);
    this.logOverlay.setDepth(4000);
    this.logOverlay.setVisible(false);
  }

  private showLog(): void {
    this.logOverlay.removeAll(true);
    const shade = this.add.rectangle(640, 360, 1280, 720, 0x050607, 0.62);
    shade.setInteractive();
    const panel = this.add.rectangle(640, 360, 780, 500, 0x242a33, 0.98);
    panel.setStrokeStyle(3, 0x758195, 0.9);
    panel.setInteractive();
    const title = this.add.text(640, 145, this.uiText('Message Log', 'メッセージログ'), this.centerStyle(28));
    title.setOrigin(0.5);
    const logText = this.add.text(310, 190, LINES.slice(0, this.lineIndex + 1).map((line) => localize(line)).join('\n'), {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#e5edf7',
      lineSpacing: 8,
    });
    const close = this.createButton(640, 570, 180, 42, () => this.uiText('Close', '閉じる'), () => this.hideLog());
    this.logOverlay.add([shade, panel, title, logText, close]);
    this.logOverlay.setVisible(true);
  }

  private hideLog(): void {
    this.logOverlay.removeAll(true);
    this.logOverlay.setVisible(false);
  }

  private createSettingsButton(): void {
    const button = this.add.container(1220, 28);
    button.setDepth(6000);
    const bg = this.add.rectangle(0, 0, 100, 36, 0x333b47, 1);
    bg.setStrokeStyle(2, 0x7d8ba0, 0.85);
    const label = this.add.text(0, 0, this.uiText('Settings', '設定'), this.centerStyle(16));
    label.setOrigin(0.5);
    this.bindLocalizedText(label, () => this.uiText('Settings', '設定'));
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(0x455164));
    bg.on('pointerout', () => bg.setFillStyle(0x333b47));
    bg.on('pointerup', () => this.showSettingsMenu());
    button.add([bg, label]);
  }

  private createModalOverlay(): void {
    this.modalOverlay = this.add.container(0, 0);
    this.modalOverlay.setDepth(5000);
    this.modalOverlay.setVisible(false);
  }

  private showSettingsMenu(): void {
    this.modalOverlay.removeAll(true);
    const shade = this.add.rectangle(640, 360, 1280, 720, 0x050607, 0.55);
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
    const shade = this.add.rectangle(640, 360, 1280, 720, 0x050607, 0.58);
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
          'ログは既読文章を表示し、隠すはウィンドウ表示を切り替え、オートは自動送り、スキップは最後の文章へ進みます。',
          '直前の戦闘に再挑戦すると、同じ戦闘をもう一度開始します。',
        ]
      : [
          'This is a placeholder defeat event scene.',
          'Click the text window or screen to advance lines.',
          'LOG opens read text, HIDE toggles the window, AUTO advances automatically, and SKIP jumps to the final line.',
          'Retry Previous Battle starts the same battle again.',
        ], {
      fontFamily: 'Arial',
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
    const bg = this.add.rectangle(0, 0, width, height, 0x3c4654, 1);
    bg.setStrokeStyle(2, 0x9ba8ba, 0.9);
    const getLabelText = typeof labelText === 'function' ? labelText : () => labelText;
    const label = this.add.text(0, 0, getLabelText(), this.centerStyle(17));
    label.setOrigin(0.5);
    if (typeof labelText === 'function') {
      this.bindLocalizedText(label, getLabelText);
    }
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(0x526075));
    bg.on('pointerout', () => bg.setFillStyle(0x3c4654));
    bg.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      pointer.event?.stopPropagation();
      onClick();
    });
    button.add([bg, label]);
    return button;
  }

  private showConfirmDialog(message: LocalizedText, onConfirm: () => void): void {
    this.modalOverlay.removeAll(true);
    const shade = this.add.rectangle(640, 360, 1280, 720, 0x050607, 0.58);
    shade.setInteractive();
    const panel = this.add.rectangle(640, 360, 560, 240, 0x242a33, 0.98);
    panel.setStrokeStyle(3, 0x758195, 0.9);
    panel.setInteractive();
    panel.on('pointerup', (pointer: Phaser.Input.Pointer) => pointer.event?.stopPropagation());
    const title = this.add.text(640, 285, this.uiText('Confirm', '確認'), this.centerStyle(28));
    title.setOrigin(0.5);
    const body = this.add.text(640, 350, localize(message), {
      fontFamily: 'Arial',
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
      fontFamily: 'Arial',
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
    this.showCurrentLine();
  }
}
