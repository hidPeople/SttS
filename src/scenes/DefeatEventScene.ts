import Phaser from 'phaser';
import { resetRunState } from '../models/RunState';

const LINES = Array.from({ length: 10 }, (_, index) => `仮テキスト${index + 1}`);

export class DefeatEventScene extends Phaser.Scene {
  private lineIndex = 0;
  private textWindow!: Phaser.GameObjects.Container;
  private bodyText!: Phaser.GameObjects.Text;
  private namePlate!: Phaser.GameObjects.Container;
  private logOverlay!: Phaser.GameObjects.Container;
  private modalOverlay!: Phaser.GameObjects.Container;
  private autoTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super('DefeatEventScene');
  }

  create(): void {
    this.add.rectangle(640, 360, 1280, 720, 0x030406);
    this.add.rectangle(640, 330, 1280, 520, 0x0b0d12, 1);
    this.add.rectangle(640, 330, 1280, 520, 0x1a101a, 0.32);

    const shadow = this.add.ellipse(640, 495, 280, 46, 0x000000, 0.72);
    const body = this.add.rectangle(640, 335, 190, 280, 0x467fb1, 1);
    body.setStrokeStyle(4, 0xb4d8f5, 0.75);
    const head = this.add.circle(640, 160, 48, 0x76b1df);
    this.add.text(640, 520, 'PLACEHOLDER EVENT IMAGE', {
      fontFamily: 'Arial',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#596779',
    }).setOrigin(0.5);
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
    const nameText = this.add.text(0, 0, 'Succubus', {
      fontFamily: 'Arial',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#f8fafc',
    });
    nameText.setOrigin(0.5);
    this.namePlate.add([nameBg, nameText]);

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
      { x: 880, label: 'LOG', action: () => this.showLog() },
      { x: 948, label: 'HIDE', action: () => this.toggleWindow() },
      { x: 1028, label: 'AUTO', action: () => this.toggleAuto() },
      { x: 1112, label: 'SKIP', action: () => this.skipToEnd() },
    ];

    controls.forEach((control) => {
      const button = this.add.container(control.x, 676);
      button.setDepth(150);
      const bg = this.add.rectangle(0, 0, 58, 32, 0x2d3644, 1);
      bg.setStrokeStyle(2, 0x8fa0b8, 0.85);
      const label = this.add.text(0, 0, control.label, {
        fontFamily: 'Arial',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#f8fafc',
      });
      label.setOrigin(0.5);
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => bg.setFillStyle(0x465366));
      bg.on('pointerout', () => bg.setFillStyle(0x2d3644));
      bg.on('pointerup', control.action);
      button.add([bg, label]);
    });
  }

  private showCurrentLine(): void {
    this.bodyText.setText(LINES[this.lineIndex] ?? 'END');
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
    const panel = this.add.rectangle(640, 360, 780, 500, 0x242a33, 0.98);
    panel.setStrokeStyle(3, 0x758195, 0.9);
    const title = this.add.text(640, 145, 'Message Log', this.centerStyle(28));
    title.setOrigin(0.5);
    const logText = this.add.text(310, 190, LINES.slice(0, this.lineIndex + 1).join('\n'), {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#e5edf7',
      lineSpacing: 8,
    });
    const close = this.createButton(640, 570, 180, 42, 'Close', () => this.hideLog());
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
    const label = this.add.text(0, 0, 'Settings', this.centerStyle(16));
    label.setOrigin(0.5);
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
    const panel = this.add.rectangle(640, 360, 460, 360, 0x242a33, 0.98);
    panel.setStrokeStyle(3, 0x758195, 0.9);
    const title = this.add.text(640, 225, 'Settings', this.centerStyle(30));
    title.setOrigin(0.5);
    const retry = this.createButton(640, 290, 330, 46, 'Retry Previous Battle', () => this.scene.start('BattleScene'));
    const help = this.createButton(640, 348, 330, 46, 'Help', () => this.showHelpPage());
    const titleButton = this.createButton(640, 406, 330, 46, 'Return to Title', () => this.returnToTitle());
    const close = this.createButton(640, 464, 180, 40, 'Close', () => this.hideModal());
    this.modalOverlay.add([shade, panel, title, retry, help, titleButton, close]);
    this.modalOverlay.setVisible(true);
  }

  private showHelpPage(): void {
    this.modalOverlay.removeAll(true);
    const shade = this.add.rectangle(640, 360, 1280, 720, 0x050607, 0.58);
    const panel = this.add.rectangle(640, 360, 820, 520, 0x242a33, 0.98);
    panel.setStrokeStyle(3, 0x758195, 0.9);
    const title = this.add.text(640, 135, 'Help', this.centerStyle(32));
    title.setOrigin(0.5);
    const text = this.add.text(275, 180, [
      'This is a placeholder defeat event scene.',
      'Click the text window or screen to advance lines.',
      'LOG opens read text, HIDE toggles the window, AUTO advances automatically, and SKIP jumps to the final line.',
      'Retry Previous Battle starts the same battle again.',
    ], {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#e5edf7',
      wordWrap: { width: 730 },
      lineSpacing: 8,
    });
    const back = this.createButton(640, 590, 220, 42, 'Back', () => this.showSettingsMenu());
    this.modalOverlay.add([shade, panel, title, text, back]);
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    labelText: string,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const button = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, width, height, 0x3c4654, 1);
    bg.setStrokeStyle(2, 0x9ba8ba, 0.9);
    const label = this.add.text(0, 0, labelText, this.centerStyle(17));
    label.setOrigin(0.5);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(0x526075));
    bg.on('pointerout', () => bg.setFillStyle(0x3c4654));
    bg.on('pointerup', onClick);
    button.add([bg, label]);
    return button;
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
}
