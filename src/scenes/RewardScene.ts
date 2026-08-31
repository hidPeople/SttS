import Phaser from 'phaser';
import { CARD_DEFINITIONS } from '../data/cards';
import { RELIC_DEFINITIONS } from '../data/relics';
import { REWARD_RARITY_DROP_RATES } from '../data/rarities';
import { localize, SETTINGS_STATE, text as l, toggleLanguage, type LocalizedText } from '../models/localization';
import { addCardToRun, addRelicToRun, advanceRunBattle, resetRunState, RUN_STATE } from '../models/RunState';
import type { CardDefinition, Rarity, RelicDefinition } from '../models/types';
import { PLAYER_VISUAL_SCALE, PLAYER_VISUAL_X, PLAYER_VISUAL_Y } from './BattleScene';

const SCREEN_WIDTH = 1280;
const SCREEN_HEIGHT = 720;
const TOOLTIP_WIDTH = 360;
const TOOLTIP_HEIGHT = 86;

type LocalizedTextBinding = {
  text: Phaser.GameObjects.Text;
  getText: () => string;
  fit?: {
    initialFontSize: number;
    maxHeight: number;
    minFontSize: number;
  };
};

export class RewardScene extends Phaser.Scene {
  private selectedCardId?: string;
  private selectedRelicId?: string;
  private cardRewardViews: { id: string; container: Phaser.GameObjects.Container; hitArea: Phaser.GameObjects.Rectangle; statusText: Phaser.GameObjects.Text }[] = [];
  private relicRewardViews: { id: string; container: Phaser.GameObjects.Container; hitArea: Phaser.GameObjects.Rectangle; statusText: Phaser.GameObjects.Text }[] = [];
  private modalOverlay!: Phaser.GameObjects.Container;
  private tooltip!: Phaser.GameObjects.Container;
  private tooltipText!: Phaser.GameObjects.Text;
  private relicIcons!: Phaser.GameObjects.Container;
  private localizedTextBindings: LocalizedTextBinding[] = [];

  constructor() {
    super('RewardScene');
  }

  create(): void {
    this.selectedCardId = undefined;
    this.selectedRelicId = undefined;
    this.cardRewardViews = [];
    this.relicRewardViews = [];
    this.localizedTextBindings = [];

    this.add.rectangle(760, 360, 1040, 720, 0x050607, 0.48);
    this.createRelicHud();

    const panel = this.add.rectangle(700, 380, 920, 575, 0x242a33, 0.98);
    panel.setStrokeStyle(3, 0x93a4b8, 0.92);
    panel.setInteractive();

    const title = this.createBoundText(700, 116, () => this.uiText('Battle Rewards', '戦闘報酬'), {
      fontFamily: 'Arial',
      fontSize: '36px',
      fontStyle: 'bold',
      color: '#f8fafc',
    });
    title.setOrigin(0.5);

    this.createBoundText(365, 152, () => this.uiText('Choose a card', 'カードを選択'), this.sectionStyle());
    this.createBoundText(365, 442, () => this.uiText('Choose a relic', 'レリックを選択'), this.sectionStyle());

    const cardChoices = this.pickRewardCards(3);
    cardChoices.forEach((card, index) => this.createCardReward(card, 480 + index * 210, 292));

    const relicChoices = this.pickRewardRelics(2);
    relicChoices.forEach((relic, index) => this.createRelicReward(relic, 585 + index * 260, 540));

    this.createButton(700, 662, 220, 44, () => this.uiText('Next', '次へ'), () => this.nextReward());
    this.createPlayerOverlay();

    this.createSettingsButton();
    this.createTooltip();
    this.game.events.on('battle-tooltip-show', this.showBattleTooltip, this);
    this.game.events.on('battle-tooltip-hide', this.hideTooltip, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('battle-tooltip-show', this.showBattleTooltip, this);
      this.game.events.off('battle-tooltip-hide', this.hideTooltip, this);
    });
    this.modalOverlay = this.add.container(0, 0);
    this.modalOverlay.setDepth(5000);
    this.modalOverlay.setVisible(false);
  }

  private sectionStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'Arial',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#c9d6e6',
    };
  }

  private pickRewardCards(count: number): CardDefinition[] {
    const rewardable = Object.values(CARD_DEFINITIONS).filter((card) => card.rarity !== 'starter' && card.rarity !== 'event');
    return this.pickWeightedUnique(rewardable, count);
  }

  private pickRewardRelics(count: number): RelicDefinition[] {
    const rewardable = Object.values(RELIC_DEFINITIONS).filter(
      (relic) => relic.rarity !== 'starter' && !RUN_STATE.relicIds.includes(relic.id),
    );
    return this.pickWeightedUnique(rewardable, count);
  }

  private pickWeightedUnique<T extends { rarity: Rarity }>(items: T[], count: number): T[] {
    const results: T[] = [];
    const pool = [...items];

    while (results.length < count && pool.length > 0) {
      const rarity = this.rollRewardRarity();
      let rarityPool = pool.filter((item) => item.rarity === rarity);
      if (rarityPool.length === 0) {
        rarityPool = pool;
      }

      const picked = Phaser.Utils.Array.GetRandom(rarityPool);
      results.push(picked);
      pool.splice(pool.indexOf(picked), 1);
    }

    return results;
  }

  private rollRewardRarity(): Rarity {
    const roll = Math.random();
    let cursor = 0;
    for (const rarity of ['common', 'uncommon', 'rare'] as Rarity[]) {
      cursor += REWARD_RARITY_DROP_RATES[rarity] ?? 0;
      if (roll <= cursor) {
        return rarity;
      }
    }

    return 'common';
  }

  private createCardReward(card: CardDefinition, x: number, y: number): void {
    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 165, 215, this.cardColor(card), 1);
    bg.setStrokeStyle(3, 0x38312a, 1);
    bg.setInteractive({ useHandCursor: true });
    const cost = this.add.circle(-58, -78, 22, card.cost === 0 ? 0x5cbf88 : 0x537fc1);
    const costText = this.add.text(-58, -78, String(card.cost), this.centerTextStyle(24, '#ffffff'));
    costText.setOrigin(0.5);
    const name = this.add.text(0, -48, localize(card.name), {
      fontFamily: 'Arial',
      fontSize: '19px',
      fontStyle: 'bold',
      color: '#1e252c',
      align: 'center',
      wordWrap: { width: 138 },
    });
    name.setOrigin(0.5);
    this.bindLocalizedText(name, () => localize(card.name));
    const rarity = this.add.text(0, -18, card.rarity.toUpperCase(), this.centerTextStyle(12, '#41505f'));
    rarity.setOrigin(0.5);
    const description = this.createFittedText(0, 4, localize(card.description), {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#26313c',
      align: 'center',
      wordWrap: { width: 136, useAdvancedWrap: true },
      lineSpacing: 1,
    }, 80, 11);
    description.setOrigin(0.5, 0);
    this.bindLocalizedText(description, () => localize(card.description), {
      initialFontSize: 14,
      maxHeight: 80,
      minFontSize: 11,
    });
    const added = this.add.text(0, 91, '', this.centerTextStyle(16, '#20724a'));
    added.setOrigin(0.5);
    container.add([bg, cost, costText, name, rarity, description, added]);
    this.cardRewardViews.push({ id: card.id, container, hitArea: bg, statusText: added });

    bg.on('pointerover', () => bg.setStrokeStyle(4, 0xfff4bd, 1));
    bg.on('pointerout', () => bg.setStrokeStyle(this.selectedCardId === card.id ? 4 : 3, this.selectedCardId === card.id ? 0x6df090 : 0x38312a, 1));
    bg.on('pointerup', () => {
      this.selectedCardId = this.selectedCardId === card.id ? undefined : card.id;
      this.updateCardRewardSelection();
    });
  }

  private createRelicReward(relic: RelicDefinition, x: number, y: number): void {
    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 255, 104, 0x2f3744, 1);
    bg.setStrokeStyle(2, 0x8fa0b8, 0.9);
    bg.setInteractive({ useHandCursor: true });
    const icon = this.add.rectangle(-96, 0, 42, 42, 0x6f4f2d, 1);
    icon.setStrokeStyle(2, 0xf1c27d, 0.9);
    const iconText = this.add.text(-96, 0, localize(relic.name).slice(0, 2), this.centerTextStyle(14, '#ffffff'));
    iconText.setOrigin(0.5);
    this.bindLocalizedText(iconText, () => localize(relic.name).slice(0, 2));
    const name = this.add.text(-62, -24, localize(relic.name), {
      fontFamily: 'Arial',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#f8fafc',
    });
    name.setOrigin(0, 0.5);
    this.bindLocalizedText(name, () => localize(relic.name));
    const description = this.createFittedText(-62, 0, localize(relic.description), {
      fontFamily: 'Arial',
      fontSize: '13px',
      color: '#c9d6e6',
      wordWrap: { width: 174, useAdvancedWrap: true },
      lineSpacing: 2,
    }, 58, 10);
    description.setOrigin(0, 0);
    this.bindLocalizedText(description, () => localize(relic.description), {
      initialFontSize: 13,
      maxHeight: 58,
      minFontSize: 10,
    });
    const added = this.add.text(92, 40, '', this.centerTextStyle(14, '#6df090'));
    added.setOrigin(0.5);
    container.add([bg, icon, iconText, name, description, added]);
    this.relicRewardViews.push({ id: relic.id, container, hitArea: bg, statusText: added });

    bg.on('pointerover', () => bg.setStrokeStyle(3, 0xfff4bd, 1));
    bg.on('pointerout', () => bg.setStrokeStyle(this.selectedRelicId === relic.id ? 3 : 2, this.selectedRelicId === relic.id ? 0x6df090 : 0x8fa0b8, 0.9));
    bg.on('pointerup', () => {
      this.selectedRelicId = this.selectedRelicId === relic.id ? undefined : relic.id;
      this.updateRelicRewardSelection();
    });
  }

  private updateCardRewardSelection(): void {
    this.cardRewardViews.forEach((view) => {
      if (view.id === this.selectedCardId) {
        view.container.setAlpha(1);
        view.hitArea.setInteractive({ useHandCursor: true });
        view.hitArea.setStrokeStyle(4, 0x6df090, 1);
        view.statusText.setText(this.uiText('Selected', '選択中'));
        return;
      }

      view.container.setAlpha(this.selectedCardId ? 0.35 : 1);
      view.hitArea.setInteractive({ useHandCursor: true });
      view.hitArea.setStrokeStyle(3, 0x38312a, 1);
      view.statusText.setText('');
    });
  }

  private updateRelicRewardSelection(): void {
    this.relicRewardViews.forEach((view) => {
      if (view.id === this.selectedRelicId) {
        view.container.setAlpha(1);
        view.hitArea.setInteractive({ useHandCursor: true });
        view.hitArea.setStrokeStyle(3, 0x6df090, 1);
        view.statusText.setText(this.uiText('Selected', '選択中'));
        return;
      }

      view.container.setAlpha(this.selectedRelicId ? 0.35 : 1);
      view.hitArea.setInteractive({ useHandCursor: true });
      view.hitArea.setStrokeStyle(2, 0x8fa0b8, 0.9);
      view.statusText.setText('');
    });
  }

  private nextReward(): void {
    if (this.hasUnclaimedReward()) {
      this.showSkipRewardConfirm();
      return;
    }

    this.confirmRewardsAndContinue();
  }

  private hasUnclaimedReward(): boolean {
    return (this.cardRewardViews.length > 0 && !this.selectedCardId) || (this.relicRewardViews.length > 0 && !this.selectedRelicId);
  }

  private confirmRewardsAndContinue(): void {
    if (this.selectedCardId) {
      addCardToRun(this.selectedCardId);
    }

    if (this.selectedRelicId) {
      addRelicToRun(this.selectedRelicId);
    }

    this.persistPreviousBattleVitals();
    advanceRunBattle();
    this.scene.stop('RewardScene');
    this.scene.stop('BattleScene');
    this.scene.start('BattleScene');
  }

  private showSkipRewardConfirm(): void {
    this.modalOverlay.removeAll(true);
    const shade = this.add.rectangle(640, 360, 1280, 720, 0x050607, 0.48);
    const panel = this.add.rectangle(700, 360, 470, 220, 0x242a33, 0.98);
    panel.setStrokeStyle(3, 0x758195, 0.9);
    const text = this.add.text(700, 318, this.uiText('Some rewards are not selected.\nContinue without taking them?', '未選択の報酬があります。\n取得せずに進みますか？'), {
      fontFamily: 'Arial',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#f8fafc',
      align: 'center',
      lineSpacing: 6,
    });
    text.setOrigin(0.5);
    const continueButton = this.createButton(600, 405, 160, 42, this.uiText('Continue', '進む'), () => this.confirmRewardsAndContinue());
    const backButton = this.createButton(800, 405, 160, 42, this.uiText('Back', '戻る'), () => this.hideModal());
    this.modalOverlay.add([shade, panel, text, continueButton, backButton]);
    this.modalOverlay.setVisible(true);
  }

  private createPlayerOverlay(): void {
    const player = this.add.container(PLAYER_VISUAL_X, PLAYER_VISUAL_Y);
    player.setScale(PLAYER_VISUAL_SCALE);
    player.setDepth(280);
    const body = this.add.rectangle(0, 20, 185, 260, 0x467fb1, 1);
    body.setStrokeStyle(4, 0xb4d8f5, 0.75);
    const head = this.add.circle(0, -135, 48, 0x76b1df);
    player.add([body, head]);
  }

  private cardColor(card: CardDefinition): number {
    if (card.hpDamage > 0 && card.hpDamageTimes > 0) {
      return 0xe7aeb6;
    }
    if (card.epDamage > 0 && card.epDamageTimes > 0) {
      return 0xf8d6e8;
    }
    if (card.enemyStatuses.some((status) => status.stacks > 0)) {
      return 0xe7f4c8;
    }
    return 0xdceafa;
  }

  private centerTextStyle(fontSize: number, color: string): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'Arial',
      fontSize: `${fontSize}px`,
      fontStyle: 'bold',
      color,
      align: 'center',
    };
  }

  private createFittedText(
    x: number,
    y: number,
    text: string,
    style: Phaser.Types.GameObjects.Text.TextStyle,
    maxHeight: number,
    minFontSize: number,
  ): Phaser.GameObjects.Text {
    const fitted = this.add.text(x, y, text, style);
    const initialFontSize = Number.parseInt(String(style.fontSize ?? '14'), 10);
    let fontSize = Number.isFinite(initialFontSize) ? initialFontSize : 14;

    while (fitted.height > maxHeight && fontSize > minFontSize) {
      fontSize -= 1;
      fitted.setFontSize(fontSize);
    }

    return fitted;
  }

  private createBoundText(
    x: number,
    y: number,
    getText: () => string,
    style: Phaser.Types.GameObjects.Text.TextStyle,
  ): Phaser.GameObjects.Text {
    const textObject = this.add.text(x, y, getText(), style);
    this.bindLocalizedText(textObject, getText);
    return textObject;
  }

  private bindLocalizedText(
    text: Phaser.GameObjects.Text,
    getText: () => string,
    fit?: LocalizedTextBinding['fit'],
  ): void {
    this.localizedTextBindings.push({ text, getText, fit });
  }

  private refreshLocalizedText(): void {
    this.localizedTextBindings = this.localizedTextBindings.filter(({ text }) => text.active && text.scene);
    this.localizedTextBindings.forEach(({ text, getText, fit }) => {
      text.setText(getText());
      if (fit) {
        this.fitTextToHeight(text, fit.initialFontSize, fit.maxHeight, fit.minFontSize);
      }
    });

    this.updateCardRewardSelection();
    this.updateRelicRewardSelection();
    this.hideTooltip();
  }

  private refreshLanguageAcrossScenes(): void {
    this.refreshLocalizedText();
    const battleScene = this.scene.get('BattleScene') as Phaser.Scene & { refreshLanguage?: () => void };
    battleScene.refreshLanguage?.();
  }

  private fitTextToHeight(
    text: Phaser.GameObjects.Text,
    initialFontSize: number,
    maxHeight: number,
    minFontSize: number,
  ): void {
    let fontSize = initialFontSize;
    text.setFontSize(fontSize);
    while (text.height > maxHeight && fontSize > minFontSize) {
      fontSize -= 1;
      text.setFontSize(fontSize);
    }
  }

  private uiText(en: string, ja: string): string {
    return SETTINGS_STATE.language === 'ja' ? ja : en;
  }

  private languageButtonText(): string {
    return SETTINGS_STATE.language === 'ja' ? 'Language / 表示言語: 日本語' : 'Language / 表示言語: English';
  }

  private createRelicHud(): void {
    if (this.relicIcons) {
      this.relicIcons.destroy(true);
    }

    this.relicIcons = this.add.container(386, 24);
    this.relicIcons.setDepth(4500);

    RUN_STATE.relicIds.forEach((relicId, index) => {
      const relic = RELIC_DEFINITIONS[relicId];
      if (!relic) {
        return;
      }

      const x = index * 44;
      const icon = this.add.rectangle(x, 0, 34, 34, 0x6f4f2d, 1);
      icon.setStrokeStyle(2, 0xf1c27d, 0.9);
      icon.setInteractive({ useHandCursor: true });
      const label = this.add.text(x, 0, localize(relic.name).slice(0, 2), this.centerTextStyle(13, '#ffffff'));
      label.setOrigin(0.5);
      this.bindLocalizedText(label, () => localize(relic.name).slice(0, 2));
      icon.on('pointerover', () => this.showTooltip(`${localize(relic.name)}\n${localize(relic.description)}`, this.relicIcons.x + x - 8, this.relicIcons.y + 28));
      icon.on('pointerout', () => this.hideTooltip());
      this.relicIcons.add([icon, label]);
    });
  }

  private createSettingsButton(): void {
    const button = this.add.container(1220, 28);
    button.setDepth(6000);
    const bg = this.add.rectangle(0, 0, 100, 36, 0x333b47, 1);
    bg.setStrokeStyle(2, 0x7d8ba0, 0.85);
    const label = this.add.text(0, 0, this.uiText('Settings', '設定'), this.centerTextStyle(16, '#f8fafc'));
    label.setOrigin(0.5);
    this.bindLocalizedText(label, () => this.uiText('Settings', '設定'));
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(0x455164));
    bg.on('pointerout', () => bg.setFillStyle(0x333b47));
    bg.on('pointerup', () => this.showSettingsMenu());
    button.add([bg, label]);
  }

  private showSettingsMenu(): void {
    this.modalOverlay.removeAll(true);
    const shade = this.add.rectangle(640, 360, 1280, 720, 0x050607, 0.55);
    shade.setInteractive();
    const panel = this.add.rectangle(640, 360, 500, 420, 0x242a33, 0.98);
    panel.setStrokeStyle(3, 0x758195, 0.9);
    panel.setInteractive();
    const title = this.add.text(640, 220, this.uiText('Settings', '設定'), this.centerTextStyle(30, '#f8fafc'));
    title.setOrigin(0.5);
    const language = this.createButton(640, 290, 360, 46, this.languageButtonText(), () => {
      toggleLanguage();
      this.refreshLanguageAcrossScenes();
      this.showSettingsMenu();
    });
    const retry = this.createButton(640, 348, 360, 46, this.uiText('Retry Previous Battle', '直前の戦闘に再挑戦'), () => {
      this.showConfirmDialog(
        l('Retry the previous battle?', '直前の戦闘に再挑戦します。よろしいですか？'),
        () => this.retryBattle(),
      );
    });
    const help = this.createButton(640, 406, 360, 46, this.uiText('Help', 'ヘルプ'), () => this.showHelpPage());
    const titleButton = this.createButton(640, 464, 360, 46, this.uiText('Return to Title', 'タイトルに戻る'), () => {
      this.showConfirmDialog(
        l('Return to title?', 'タイトルに戻ります。よろしいですか？'),
        () => this.returnToTitle(),
      );
    });
    const close = this.createButton(640, 522, 180, 40, this.uiText('Close', '閉じる'), () => this.hideModal());
    this.modalOverlay.add([shade, panel, title, language, retry, help, titleButton, close]);
    this.modalOverlay.setVisible(true);
  }

  private showHelpPage(): void {
    this.modalOverlay.removeAll(true);
    const shade = this.add.rectangle(640, 360, 1280, 720, 0x050607, 0.58);
    shade.setInteractive();
    const panel = this.add.rectangle(640, 360, 820, 520, 0x242a33, 0.98);
    panel.setStrokeStyle(3, 0x758195, 0.9);
    panel.setInteractive();
    const title = this.add.text(640, 135, this.uiText('Help', 'ヘルプ'), this.centerTextStyle(32, '#f8fafc'));
    title.setOrigin(0.5);
    const text = this.add.text(275, 180, SETTINGS_STATE.language === 'ja'
      ? [
          'HPが0になると倒れる。',
          'EPはダメージで上昇し、最大値でPeak効果が発生してreserve値まで下がる。',
          'エナジーはカード使用に消費する。コスト0カードはエナジー0でも使用できる。',
          'BlockはHPダメージを先に防ぎ、ターン開始時にリセットされる。',
          '山札、手札、捨て札でドローループを構成する。山札が空なら捨て札をシャッフルして戻す。',
          '報酬でカードとレリックを現在のランに追加する。',
        ]
      : [
          'HP reaches 0 to defeat a combatant.',
          'EP rises from damage. At max, a Peak effect triggers and EP drops to the reserve value.',
          'Energy is spent to play cards. Cost 0 cards can be played at 0 energy.',
          'Block prevents HP damage first and resets at turn start.',
          'Deck, hand, and discard form the draw loop. If the deck is empty, discard is shuffled back.',
          'Rewards add cards and relics to the current run for later battles.',
        ], {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#e5edf7',
      wordWrap: { width: 730 },
      lineSpacing: 8,
    });
    const back = this.createButton(640, 590, 220, 42, this.uiText('Back', '戻る'), () => this.showSettingsMenu());
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
    const label = this.add.text(0, 0, getLabelText(), this.centerTextStyle(17, '#f8fafc'));
    label.setOrigin(0.5);
    if (typeof labelText === 'function') {
      this.bindLocalizedText(label, getLabelText);
    }
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(0x526075));
    bg.on('pointerout', () => bg.setFillStyle(0x3c4654));
    bg.on('pointerup', onClick);
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
    const title = this.add.text(640, 285, this.uiText('Confirm', '確認'), this.centerTextStyle(28, '#f8fafc'));
    title.setOrigin(0.5);
    const body = this.add.text(640, 350, localize(message), {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#e5edf7',
      align: 'center',
      wordWrap: { width: 480, useAdvancedWrap: true },
    });
    body.setOrigin(0.5);
    const yes = this.createButton(545, 430, 150, 42, this.uiText('Yes', 'はい'), onConfirm);
    const no = this.createButton(735, 430, 150, 42, this.uiText('No', 'いいえ'), () => this.showSettingsMenu());
    this.modalOverlay.add([shade, panel, title, body, yes, no]);
    this.modalOverlay.setVisible(true);
  }

  private retryBattle(): void {
    this.scene.stop('RewardScene');
    this.scene.stop('BattleScene');
    this.scene.start('BattleScene');
  }

  private persistPreviousBattleVitals(): void {
    const battleScene = this.scene.get('BattleScene') as Phaser.Scene & { persistRunVitals?: () => void };
    battleScene.persistRunVitals?.();
  }

  private returnToTitle(): void {
    resetRunState();
    this.scene.stop('RewardScene');
    this.scene.stop('BattleScene');
    this.scene.start('TitleScene');
  }

  private hideModal(): void {
    this.modalOverlay.removeAll(true);
    this.modalOverlay.setVisible(false);
  }

  private createTooltip(): void {
    const bg = this.add.rectangle(0, 0, TOOLTIP_WIDTH, TOOLTIP_HEIGHT, 0x101419, 0.96);
    bg.setOrigin(0, 0);
    bg.setStrokeStyle(2, 0xaeb8c8, 0.9);
    this.tooltipText = this.add.text(14, 12, '', {
      fontFamily: 'Arial',
      fontSize: '15px',
      color: '#f8fafc',
      wordWrap: { width: 332 },
      lineSpacing: 4,
    });
    this.tooltip = this.add.container(0, 0, [bg, this.tooltipText]);
    this.tooltip.setDepth(6500);
    this.tooltip.setVisible(false);
  }

  private showTooltip(text: string, x: number, y: number): void {
    this.tooltipText.setText(text);
    this.tooltip.setPosition(
      Phaser.Math.Clamp(x, 8, SCREEN_WIDTH - TOOLTIP_WIDTH - 8),
      Phaser.Math.Clamp(y, 8, SCREEN_HEIGHT - TOOLTIP_HEIGHT - 8),
    );
    this.tooltip.setVisible(true);
  }

  private showBattleTooltip(payload: { text: string; x: number; y: number }): void {
    this.showTooltip(payload.text, payload.x, payload.y);
  }

  private hideTooltip(): void {
    this.tooltip.setVisible(false);
  }
}
