import { onPrimaryClick, installPointerBack } from '../ui/pointerActions';
import { SCREEN_WIDTH, SCREEN_HEIGHT, SCREEN_CENTER_X, SCREEN_CENTER_Y } from '../ui/layout';
import { GAME_FONT } from '../ui/fonts';
import { CrayonPatch, CRAYON_COLORS } from '../ui/crayon';
import { KeyboardNavigation } from '../ui/keyboardNavigation';
import { ConversationWindow, preloadConversationAssets } from '../ui/conversation';
import { DEFEAT_CONVERSATIONS, NOVEL_PRESENTATION } from '../data/conversations';
import Phaser from 'phaser';
import { localizeGameText as localize } from '../models/gameText';
import { SETTINGS_STATE, text as l, toggleLanguage, type LocalizedText } from '../models/localization';
import { resetRunState, startEventBattle } from '../models/RunState';
import { snapshotRunState, restoreRunState, RUN_STATE } from '../models/RunState';
import { retryableBattleAutoSave, RUN_SAVES } from '../models/runSaves';
import { USER_SETTINGS } from '../models/userSettings';
import { openSaveLoad } from './SaveLoadScene';
import { PLAYER_DEFINITION } from '../data/player';

type LocalizedTextBinding = { text: Phaser.GameObjects.Text; getText: () => string };

export class DefeatEventScene extends Phaser.Scene {
  private modalOverlay!: Phaser.GameObjects.Container;
  private modalBack?: () => void;
  private conversation?: ConversationWindow;
  private localizedTextBindings: LocalizedTextBinding[] = [];
  private eventBattleId?: string;
  private nextAction?: 'newGame';
  private completion?: 'battle' | 'newGame' | 'title' | 'extra';
  private initialPage = 0;

  constructor() { super('DefeatEventScene'); }

  private conversationId = '';

  public canShowStorageFailure(): boolean { return !this.conversation?.transitioning; }

  init(data: { cause?: string; conversationId?: string; pageIndex?: number } = {}): void {
    this.conversationId = data.conversationId ?? DEFEAT_CONVERSATIONS[data.cause ?? 'default'] ?? DEFEAT_CONVERSATIONS.default;
    this.initialPage = data.pageIndex ?? 0;
  }

  preload(): void { preloadConversationAssets(this, [this.conversationId]); }

  create(data: { cause?: string; conversationId?: string; eventBattleId?: string; nextAction?: 'newGame'; completion?: 'battle' | 'newGame' | 'title' | 'extra'; pageIndex?: number } = {}): void {
    this.eventBattleId = data.eventBattleId;
    this.nextAction = data.nextAction;
    this.completion = data.completion ?? (data.nextAction === 'newGame' ? 'newGame' : data.eventBattleId ? 'battle' : 'title');
    this.modalBack = undefined;
    installPointerBack(this, () => {
      if (!this.modalOverlay?.visible) return false;
      this.goBack(); return true;
    });
    KeyboardNavigation.for(this).configure({
      filter: () => !this.conversation?.transitioning && !this.conversation?.logActive,
      scope: () => this.modalOverlay?.visible ? this.modalOverlay : undefined,
      escape: () => this.goBack(),
    });
    this.localizedTextBindings = [];
    this.add.rectangle(SCREEN_CENTER_X, SCREEN_CENTER_Y, SCREEN_WIDTH, SCREEN_HEIGHT, 0x030406);
    this.createSettingsButton();
    this.createModalOverlay();
    const id = this.conversationId;
    this.conversation = new ConversationWindow(this, id, () => this.modalOverlay.visible, undefined, (this.eventBattleId || this.nextAction) ? NOVEL_PRESENTATION : undefined, this.initialPage);
    const releaseSaveCapture = RUN_SAVES.setCaptureProvider(() => this.captureRunSave());
    this.events.once('shutdown', releaseSaveCapture);
    void this.conversation.finished.then(completed => {
      if (!completed || !this.sys.isActive()) return;
      USER_SETTINGS.markConversationSeen(this.conversationId);
      if (this.completion === 'battle' || this.completion === 'newGame') this.startBattle();
      else if (this.completion === 'extra') this.scene.start('ExtraScene', { tab: 'events' });
      else this.returnToTitle();
    });
  }

  private captureRunSave() {
    const snapshot = this.conversation?.snapshot();
    return {
      floor: RUN_STATE.stage, scene: 'novel' as const, run: snapshotRunState(),
      sceneState: {
        conversationId: this.conversationId, pageIndex: snapshot?.pageIndex ?? 0,
        eventBattleId: this.eventBattleId, nextAction: this.nextAction, completion: this.completion,
      },
      preview: {
        kind: 'novel' as const, hp: RUN_STATE.playerHp, maxHp: PLAYER_DEFINITION.maxHp,
        ep: RUN_STATE.playerEp, maxEp: PLAYER_DEFINITION.maxEp,
      },
    };
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
    onPrimaryClick(bg, () => this.showSettingsMenu());
    KeyboardNavigation.for(this).register(bg, { group: 'settings' });
    button.add([bg, label]);
  }

  private createModalOverlay(): void {
    this.modalOverlay = this.add.container(0, 0);
    this.modalOverlay.setDepth(7000);
    this.modalOverlay.setVisible(false);
  }

  private showSettingsMenu(): void {
    this.modalBack = () => this.hideModal();
    if (this.conversation?.transitioning) return;
    this.modalOverlay.removeAll(true);
    const shade = this.add.rectangle(SCREEN_CENTER_X, SCREEN_CENTER_Y, SCREEN_WIDTH, SCREEN_HEIGHT, 0x050607, 0.55);
    shade.setInteractive();
    onPrimaryClick(shade, () => this.hideModal());
    const panel = this.add.rectangle(640, 360, 500, 610, 0x242a33, 0.98);
    panel.setStrokeStyle(3, 0x758195, 0.9);
    panel.setInteractive();
    onPrimaryClick(panel, (pointer: Phaser.Input.Pointer) => pointer.event?.stopPropagation());
    const title = this.add.text(640, 86, this.uiText('Settings', '設定'), this.centerStyle(30));
    title.setOrigin(0.5);
    const language = this.createButton(640, 148, 360, 42, () => this.languageButtonText(), () => {
      toggleLanguage();
      this.refreshLocalizedText();
      this.showSettingsMenu();
    });
    const save = this.createButton(640, 198, 360, 42, () => this.uiText('Save', 'セーブ'), () => { this.hideModal(); openSaveLoad(this, { mode: 'save' }); });
    const saveQuit = this.createButton(640, 248, 360, 42, () => this.uiText('Save and Quit', 'セーブして終了'), () => { this.hideModal(); openSaveLoad(this, { mode: 'save', exitAfterSave: true }); });
    const load = this.createButton(640, 298, 360, 42, () => this.uiText('Load', 'ロード'), () => { this.hideModal(); openSaveLoad(this, { mode: 'load' }); });
    const retry = this.createButton(640, 348, 360, 42, () => this.uiText('Retry Previous Battle', '直前の戦闘に再挑戦'), () => {
      this.showConfirmDialog(l('Retry the previous battle?', '直前の戦闘に再挑戦します。よろしいですか？'), () => this.retryBattle());
    }, this.canRetryAutoSave());
    const help = this.createButton(640, 398, 360, 42, () => this.uiText('Help', 'ヘルプ'), () => this.showHelpPage());
    const titleButton = this.createButton(640, 448, 360, 42, () => this.uiText('Return to Title', 'タイトルに戻る'), () => {
      this.showConfirmDialog(l('Return to title?', 'タイトルに戻ります。よろしいですか？'), () => this.returnToTitle());
    });
    const close = this.createButton(640, 510, 180, 38, () => this.uiText('Close', '閉じる'), () => this.hideModal());
    this.modalOverlay.add([shade, panel, title, language, save, saveQuit, load, retry, help, titleButton, close]);
    this.modalOverlay.setVisible(true);
  }

  private showHelpPage(): void {
    this.modalBack = () => this.showSettingsMenu();
    this.modalOverlay.removeAll(true);
    const shade = this.add.rectangle(SCREEN_CENTER_X, SCREEN_CENTER_Y, SCREEN_WIDTH, SCREEN_HEIGHT, 0x050607, 0.58);
    shade.setInteractive();
    onPrimaryClick(shade, () => this.showSettingsMenu());
    const panel = this.add.rectangle(640, 360, 820, 520, 0x242a33, 0.98);
    panel.setStrokeStyle(3, 0x758195, 0.9);
    panel.setInteractive();
    onPrimaryClick(panel, (pointer: Phaser.Input.Pointer) => pointer.event?.stopPropagation());
    const title = this.add.text(640, 135, this.uiText('Help', 'ヘルプ'), this.centerStyle(32));
    title.setOrigin(0.5);
    const text = this.add.text(275, 180, SETTINGS_STATE.language === 'ja'
      ? [
          '会話の操作方法',
          '左クリック・ホイール下・進むボタン・Z・Enterで次へ。',
          'Ctrlを押している間はスキップします。',
          'ホイール上・戻るボタン・Lでログ。右上の×で閉じます。',
          '右クリック・Space・Xで窓を隠す／戻す（ログ中はログを閉じる）。',
          '直前の戦闘に再挑戦すると、同じ戦闘をもう一度開始します。',
        ]
      : [
          'Conversation controls',
          'Advance: left click, wheel down, forward mouse button, Z or Enter.',
          'Hold Ctrl to skip.',
          'Log: wheel up, back mouse button or L. Close with the top-right X.',
          'Hide/restore window (or close log): right click, Space or X.',
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
    enabled = true,
  ): Phaser.GameObjects.Container {
    const button = this.add.container(x, y);
    const bg = new CrayonPatch(this, 0, 0, width, height, CRAYON_COLORS.button, 1);
    bg.setStrokeStyle(2, 0x9ba8ba, enabled ? 0.9 : 0.4);
    const getLabelText = typeof labelText === 'function' ? labelText : () => labelText;
    const label = this.add.text(0, 0, getLabelText(), this.centerStyle(17));
    label.setOrigin(0.5);
    if (typeof labelText === 'function') {
      this.bindLocalizedText(label, getLabelText);
    }
    if (enabled) {
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => bg.setHoverColor(CRAYON_COLORS.hover));
      bg.on('pointerout', () => bg.setHoverColor());
      onPrimaryClick(bg, (pointer: Phaser.Input.Pointer) => {
        pointer.event?.stopPropagation();
        onClick();
      });
      KeyboardNavigation.for(this).register(bg);
    } else {
      bg.setFillStyle(0x454b55);
      label.setColor('#7a828d');
      button.setAlpha(0.72);
    }
    button.add([bg, label]);
    return button;
  }

  private showConfirmDialog(message: LocalizedText, onConfirm: () => void): void {
    this.modalBack = () => this.showSettingsMenu();
    this.modalOverlay.removeAll(true);
    const shade = this.add.rectangle(SCREEN_CENTER_X, SCREEN_CENTER_Y, SCREEN_WIDTH, SCREEN_HEIGHT, 0x050607, 0.58);
    shade.setInteractive();
    const panel = this.add.rectangle(640, 360, 560, 240, 0x242a33, 0.98);
    panel.setStrokeStyle(3, 0x758195, 0.9);
    panel.setInteractive();
    onPrimaryClick(panel, (pointer: Phaser.Input.Pointer) => pointer.event?.stopPropagation());
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

  private goBack(): void {
    if (this.conversation?.transitioning) return;
    if (this.modalOverlay?.visible) (this.modalBack ?? (() => this.hideModal()))();
    else this.showSettingsMenu();
  }

  private hideModal(): void {
    this.modalBack = undefined;
    this.modalOverlay.removeAll(true);
    this.modalOverlay.setVisible(false);
  }

  private returnToTitle(): void {
    resetRunState();
    this.scene.start('TitleScene');
  }

  private startBattle(): void {
    if (this.completion === 'newGame' || this.nextAction === 'newGame') resetRunState();
    else if (this.eventBattleId) startEventBattle(this.eventBattleId);
    this.scene.start('BattleScene', { freshRun: false });
  }

  private retryBattle(): void {
    const autoSave = retryableBattleAutoSave(RUN_STATE);
    if (!autoSave) return;
    restoreRunState(autoSave.run);
    this.scene.start('BattleScene', { resumeState: autoSave.sceneState });
  }

  private canRetryAutoSave(): boolean {
    return Boolean(retryableBattleAutoSave(RUN_STATE));
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
