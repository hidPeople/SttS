import Phaser from 'phaser';
import { createStartingDeckDefinitions } from '../data/cards';
import { ENEMY_DEFINITIONS } from '../data/enemies';
import { PLAYER_DEFINITION } from '../data/player';
import { STATUS_DESCRIPTIONS } from '../data/statuses';
import { Enemy, Player } from '../models/Combatants';
import { Deck } from '../models/Deck';
import type { AttackAttribute, CardDefinition, CardInstance, StatusEffect } from '../models/types';

type CardView = {
  card: CardInstance;
  container: Phaser.GameObjects.Container;
};

type HudBars = {
  hpFill: Phaser.GameObjects.Rectangle;
  blockShield: Phaser.GameObjects.Graphics;
  blockText: Phaser.GameObjects.Text;
  epFill: Phaser.GameObjects.Rectangle;
  epReserveFill: Phaser.GameObjects.Rectangle;
  epReserveStripes: Phaser.GameObjects.Graphics;
  hpX: number;
  hpY: number;
  epX: number;
  epY: number;
};

const CARD_WIDTH = 150;
const CARD_HEIGHT = 190;
const HAND_Y = 585;
const BAR_WIDTH = 190;
const SCREEN_WIDTH = 1280;
const SCREEN_HEIGHT = 720;
const STATUS_TOOLTIP_WIDTH = 360;
const STATUS_TOOLTIP_HEIGHT = 82;
const EP_PEAK_FLASH_DURATION = 960;
const EP_FILL_COLOR = 0xf28ac6;
const EP_RESERVE_COLOR = 0x6f0f3b;

export class BattleScene extends Phaser.Scene {
  private player!: Player;
  private enemy!: Enemy;
  private deck!: Deck;

  private playerArea!: Phaser.GameObjects.Container;
  private playerBody!: Phaser.GameObjects.Rectangle;
  private enemyArea!: Phaser.GameObjects.Container;
  private enemyBody!: Phaser.GameObjects.Rectangle;
  private reticle!: Phaser.GameObjects.Graphics;

  private playerHud!: Phaser.GameObjects.Text;
  private enemyHud!: Phaser.GameObjects.Text;
  private playerStatusIcons!: Phaser.GameObjects.Container;
  private enemyStatusIcons!: Phaser.GameObjects.Container;
  private playerBars!: HudBars;
  private enemyBars!: HudBars;
  private energyPanel!: Phaser.GameObjects.Rectangle;
  private energyText!: Phaser.GameObjects.Text;
  private pileHud!: Phaser.GameObjects.Text;
  private intentText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private statusTooltip!: Phaser.GameObjects.Container;
  private statusTooltipText!: Phaser.GameObjects.Text;
  private resultOverlay!: Phaser.GameObjects.Container;
  private modalOverlay!: Phaser.GameObjects.Container;

  private cardViews = new Map<string, CardView>();
  private isAnimating = false;
  private isGameOver = false;
  private playerEpPeakBarOverride = false;
  private enemyEpPeakBarOverride = false;
  private playerEpReserveOverride = false;
  private playerEpReserveValue = 0;
  private hasRenderedHud = false;

  constructor() {
    super('BattleScene');
  }

  create(): void {
    this.isAnimating = false;
    this.isGameOver = false;
    this.playerEpPeakBarOverride = false;
    this.enemyEpPeakBarOverride = false;
    this.playerEpReserveOverride = false;
    this.playerEpReserveValue = 0;
    this.hasRenderedHud = false;
    this.cardViews.clear();

    this.player = new Player(PLAYER_DEFINITION);
    this.enemy = new Enemy(ENEMY_DEFINITIONS.trainingWraith);
    this.deck = new Deck(createStartingDeckDefinitions());

    this.createArena();
    this.createPlayer();
    this.createEnemy();
    this.createHud();
    this.createSettingsButton();
    this.createEndTurnButton();

    this.drawCards(5, true);
    this.updateHud();
    this.showMessage('Your turn');
  }

  private createArena(): void {
    this.add.rectangle(640, 360, 1280, 720, 0x171a1f);
    this.add.rectangle(640, 460, 1280, 260, 0x20252d);
    this.add.rectangle(640, 590, 1280, 260, 0x111419, 0.94);

    const centerLine = this.add.rectangle(640, 360, 2, 560, 0x39404b, 0.5);
    centerLine.setDepth(0);

  }

  private createPlayer(): void {
    this.playerArea = this.add.container(270, 335);

    const frame = this.add.rectangle(0, 0, 360, 390, 0x252c36, 0.95);
    frame.setStrokeStyle(3, 0x4a6b8a, 0.8);
    this.playerBody = this.add.rectangle(0, 20, 185, 260, 0x467fb1, 1);
    this.playerBody.setStrokeStyle(4, 0xb4d8f5, 0.75);

    const head = this.add.circle(0, -135, 48, 0x76b1df);
    const label = this.add.text(0, 185, 'PLAYER', {
      fontFamily: 'Arial',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#d8edff',
    });
    label.setOrigin(0.5);

    this.playerArea.add([frame, this.playerBody, head, label]);
  }

  private createEnemy(): void {
    this.enemyArea = this.add.container(910, 320);

    const shadow = this.add.ellipse(0, 140, 230, 48, 0x0c0f12, 0.6);
    this.enemyBody = this.add.rectangle(0, 0, 155, 210, 0x8a414d, 1);
    this.enemyBody.setStrokeStyle(4, 0xf0a2a7, 0.75);
    const head = this.add.circle(0, -132, 42, 0xb95d68);
    const label = this.add.text(0, 150, 'ENEMY', {
      fontFamily: 'Arial',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#ffe4e6',
    });
    label.setOrigin(0.5);

    this.enemyArea.add([shadow, this.enemyBody, head, label]);
    this.createReticle();
  }

  private createReticle(): void {
    this.reticle = this.add.graphics();
    this.reticle.lineStyle(3, 0xf3c75f, 1);
    this.reticle.strokeEllipse(910, 320, 235, 325);
    this.reticle.lineBetween(792, 320, 835, 320);
    this.reticle.lineBetween(985, 320, 1028, 320);
    this.reticle.lineBetween(910, 157, 910, 198);
    this.reticle.lineBetween(910, 442, 910, 483);
    this.reticle.setDepth(8);
  }

  private createHud(): void {
    this.createPanel(20, 18, 330, 180, 'PLAYER');
    this.createPanel(930, 62, 330, 180, 'ENEMY');

    this.playerBars = this.createHudBars(136, 58);
    this.enemyBars = this.createHudBars(1046, 102);
    this.playerHud = this.add.text(38, 52, '', this.hudStyle(17));
    this.enemyHud = this.add.text(948, 96, '', this.hudStyle(17));
    this.createEnergyHud();
    this.createStatusIconAreas();

    this.intentText = this.add.text(760, 170, '', {
      fontFamily: 'Arial',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ffd36e',
      backgroundColor: '#1f2329',
      padding: { x: 12, y: 8 },
    });
    this.intentText.setOrigin(0.5);

    this.pileHud = this.add.text(1020, 660, '', this.hudStyle(17));
    this.messageText = this.add.text(640, 116, '', {
      fontFamily: 'Arial',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    this.messageText.setOrigin(0.5);

    this.resultOverlay = this.add.container(0, 0);
    this.resultOverlay.setDepth(3000);
    this.resultOverlay.setVisible(false);

    this.modalOverlay = this.add.container(0, 0);
    this.modalOverlay.setDepth(5000);
    this.modalOverlay.setVisible(false);

    this.createStatusTooltip();
  }

  private createStatusIconAreas(): void {
    this.createStatusIconArea(38, 156);
    this.playerStatusIcons = this.add.container(58, 176);
    this.playerStatusIcons.setDepth(25);

    this.createStatusIconArea(948, 184);
    this.enemyStatusIcons = this.add.container(968, 204);
    this.enemyStatusIcons.setDepth(25);
  }

  private createStatusIconArea(x: number, y: number): void {
    const area = this.add.rectangle(x, y, 286, 40, 0x151a21, 0.32);
    area.setOrigin(0, 0);
    area.setStrokeStyle(1, 0x526075, 0.65);
  }

  private createStatusTooltip(): void {
    const bg = this.add.rectangle(0, 0, STATUS_TOOLTIP_WIDTH, STATUS_TOOLTIP_HEIGHT, 0x101419, 0.96);
    bg.setOrigin(0, 0);
    bg.setStrokeStyle(2, 0xaeb8c8, 0.9);
    this.statusTooltipText = this.add.text(14, 12, '', {
      fontFamily: 'Arial',
      fontSize: '15px',
      color: '#f8fafc',
      wordWrap: { width: 332 },
      lineSpacing: 4,
    });
    this.statusTooltip = this.add.container(0, 0, [bg, this.statusTooltipText]);
    this.statusTooltip.setDepth(6500);
    this.statusTooltip.setVisible(false);
  }

  private createHudBars(x: number, y: number): HudBars {
    const hpBg = this.add.rectangle(x, y, BAR_WIDTH, 12, 0x17351f, 1);
    hpBg.setOrigin(0, 0.5);
    hpBg.setStrokeStyle(1, 0x426f4a, 0.9);
    const hpFill = this.add.rectangle(x, y, BAR_WIDTH, 12, 0x39b769, 1);
    hpFill.setOrigin(0, 0.5);

    const blockShield = this.add.graphics();
    blockShield.setDepth(hpFill.depth + 4);
    blockShield.setVisible(false);
    const blockText = this.add.text(x + 10, y - 3, '', {
      fontFamily: 'Arial',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#ffffff',
      align: 'center',
    });
    blockText.setOrigin(0.5);
    blockText.setDepth(blockShield.depth + 1);
    blockText.setVisible(false);

    const epY = y + 46;
    const epBg = this.add.rectangle(x, epY, BAR_WIDTH, 12, 0x3a1730, 1);
    epBg.setOrigin(0, 0.5);
    epBg.setStrokeStyle(1, 0x8b4a76, 0.9);
    const epFill = this.add.rectangle(x, epY, BAR_WIDTH, 12, EP_FILL_COLOR, 1);
    epFill.setOrigin(0, 0.5);
    const epReserveFill = this.add.rectangle(x, epY, BAR_WIDTH, 12, EP_RESERVE_COLOR, 0.98);
    epReserveFill.setOrigin(0, 0.5);
    epReserveFill.setDepth(epFill.depth + 2);
    epReserveFill.setScale(0, 1);
    const epReserveStripes = this.add.graphics();
    epReserveStripes.setDepth(epReserveFill.depth + 1);

    return { hpFill, blockShield, blockText, epFill, epReserveFill, epReserveStripes, hpX: x, hpY: y, epX: x, epY };
  }

  private createEnergyHud(): void {
    this.energyPanel = this.add.rectangle(24, 552, 166, 96, 0x242a33, 0.95);
    this.energyPanel.setOrigin(0, 0);
    this.energyPanel.setStrokeStyle(2, 0xd8a84c, 0.85);
    this.add.text(42, 566, 'ENERGY', {
      fontFamily: 'Arial',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#d8a84c',
    });
    this.energyText = this.add.text(42, 590, '', {
      fontFamily: 'Arial',
      fontSize: '34px',
      fontStyle: 'bold',
      color: '#ffd36e',
    });
  }

  private createPanel(x: number, y: number, width: number, height: number, title: string): void {
    const panel = this.add.rectangle(x, y, width, height, 0x242a33, 0.92);
    panel.setOrigin(0, 0);
    panel.setStrokeStyle(2, 0x4d5665, 0.75);
    this.add.text(x + 16, y + 10, title, {
      fontFamily: 'Arial',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#8fa0b8',
    });
  }

  private hudStyle(fontSize: number): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'Arial',
      fontSize: `${fontSize}px`,
      color: '#f1f5f9',
      lineSpacing: 7,
    };
  }

  private createSettingsButton(): void {
    const button = this.add.container(1220, 28);
    const bg = this.add.rectangle(0, 0, 100, 36, 0x333b47, 1);
    bg.setStrokeStyle(2, 0x7d8ba0, 0.85);
    const label = this.add.text(0, 0, 'Settings', {
      fontFamily: 'Arial',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#f8fafc',
    });
    label.setOrigin(0.5);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(0x455164));
    bg.on('pointerout', () => bg.setFillStyle(0x333b47));
    bg.on('pointerup', () => this.showSettingsMenu());
    button.add([bg, label]);
    button.setDepth(6000);
  }

  private showSettingsMenu(): void {
    this.modalOverlay.removeAll(true);
    const shade = this.add.rectangle(640, 360, 1280, 720, 0x050607, 0.55);
    const panel = this.add.rectangle(640, 360, 460, 300, 0x242a33, 0.98);
    panel.setStrokeStyle(3, 0x758195, 0.9);
    const title = this.add.text(640, 255, 'Settings', {
      fontFamily: 'Arial',
      fontSize: '30px',
      fontStyle: 'bold',
      color: '#f8fafc',
    });
    title.setOrigin(0.5);

    const restart = this.createModalButton(640, 325, 330, 48, 'Restart Battle', () => this.restartBattle());
    const help = this.createModalButton(640, 385, 330, 48, 'Help', () => this.showHelpPage());
    const close = this.createModalButton(640, 445, 180, 42, 'Close', () => this.hideModal());

    this.modalOverlay.add([shade, panel, title, restart, help, close]);
    this.modalOverlay.setVisible(true);
  }

  private showHelpPage(): void {
    this.modalOverlay.removeAll(true);
    const shade = this.add.rectangle(640, 360, 1280, 720, 0x050607, 0.58);
    const panel = this.add.rectangle(640, 360, 820, 560, 0x242a33, 0.98);
    panel.setStrokeStyle(3, 0x758195, 0.9);
    const title = this.add.text(640, 115, 'Help', {
      fontFamily: 'Arial',
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#f8fafc',
    });
    title.setOrigin(0.5);

    const helpText = this.add.text(
      275,
      160,
      [
        'Player HP: Your health. If it reaches 0, you lose.',
        'Player EP: Your ecstasy point. It decreases by 1 each turn. If it reaches max, it drops to a reduced value and applies Lingering.',
        'Energy: Spent to play cards. Cards with cost 0 can be played with 0 energy.',
        'Block: Reduces incoming HP damage first, then resets at the start of your next turn.',
        '',
        'Enemy HP: Enemy health. If all enemies reach 0 HP, you win.',
        'Enemy EP: Enemy ecstasy point. If it reaches max, the player heals by the enemy max EP, the enemy takes that much HP damage, then the enemy EP drops to 0.',
        'Buffs/Debuffs: The same status can stack. One stack is consumed when that status takes effect.',
        'Charm: The enemy next attack hits player EP instead of HP.',
        'Lingering: At the start of your turn, lose 1 energy per stack while energy remains.',
        '',
        'Deck Loop: Draw 5 cards at battle start and each turn. Played cards and end-turn hand cards go to discard. If the draw pile is empty, the discard pile is shuffled back into the draw pile.',
      ],
      {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#e5edf7',
        wordWrap: { width: 730 },
        lineSpacing: 7,
      },
    );

    const back = this.createModalButton(640, 610, 220, 42, 'Back', () => this.showSettingsMenu());
    this.modalOverlay.add([shade, panel, title, helpText, back]);
    this.modalOverlay.setVisible(true);
  }

  private createModalButton(
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
    const label = this.add.text(0, 0, labelText, {
      fontFamily: 'Arial',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#f8fafc',
    });
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

  private showStatusTooltip(status: StatusEffect, stacks: number, x: number, y: number): void {
    const description = STATUS_DESCRIPTIONS[status] ?? `${status}: No description.`;
    const stackText = stacks > 1 ? `\nStacks: ${stacks}` : '';
    const clampedX = Phaser.Math.Clamp(x, 8, SCREEN_WIDTH - STATUS_TOOLTIP_WIDTH - 8);
    const clampedY = Phaser.Math.Clamp(y, 8, SCREEN_HEIGHT - STATUS_TOOLTIP_HEIGHT - 8);

    this.statusTooltipText.setText(`${description}${stackText}`);
    this.statusTooltip.setPosition(clampedX, clampedY);
    this.statusTooltip.setVisible(true);
  }

  private hideStatusTooltip(): void {
    this.statusTooltip.setVisible(false);
  }

  private renderStatusIcons(
    container: Phaser.GameObjects.Container,
    statuses: Map<StatusEffect, number>,
    hidden = false,
  ): void {
    container.removeAll(true);

    if (hidden) {
      return;
    }

    Array.from(statuses.entries()).forEach(([status, stacks], index) => {
      const x = index * 40;
      const icon = this.add.rectangle(x, 0, 32, 32, this.statusIconColor(status), 1);
      icon.setStrokeStyle(2, 0xffffff, 0.68);
      icon.setInteractive({ useHandCursor: true });

      const label = this.add.text(x, 0, this.statusIconText(status, stacks), {
        fontFamily: 'Arial',
        fontSize: stacks > 9 ? '13px' : '15px',
        fontStyle: 'bold',
        color: '#ffffff',
      });
      label.setOrigin(0.5);

      icon.on('pointerover', () => {
        this.showStatusTooltip(status, stacks, container.x + x - 16, container.y + 24);
      });
      icon.on('pointerout', () => this.hideStatusTooltip());

      container.add([icon, label]);
    });
  }

  private statusIconColor(status: StatusEffect): number {
    if (status === 'Charm') {
      return 0xd85a91;
    }

    if (status === 'Lingering') {
      return 0x7b5fc4;
    }

    return 0x526075;
  }

  private statusIconText(status: StatusEffect, stacks: number): string {
    const baseText: Record<StatusEffect, string> = {
      Charm: 'Ch',
      Lingering: 'Li',
    };
    const suffix = stacks > 1 ? String(Math.min(stacks, 99)) : '';

    return `${baseText[status] ?? status.slice(0, 2)}${suffix}`;
  }

  private restartBattle(): void {
    this.isAnimating = false;
    this.isGameOver = false;
    this.playerEpPeakBarOverride = false;
    this.enemyEpPeakBarOverride = false;
    this.hasRenderedHud = false;
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.input.setDefaultCursor('default');
    this.cardViews.forEach((view) => view.container.destroy());
    this.cardViews.clear();
    this.scene.restart();
  }

  private createEndTurnButton(): void {
    const button = this.add.container(1110, 590);
    const bg = this.add.rectangle(0, 0, 150, 52, 0xd08b3e, 1);
    bg.setStrokeStyle(3, 0xffd48a, 0.8);
    const label = this.add.text(0, 0, 'End Turn', {
      fontFamily: 'Arial',
      fontSize: '21px',
      fontStyle: 'bold',
      color: '#1b1510',
    });
    label.setOrigin(0.5);
    button.add([bg, label]);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(0xf0a54e));
    bg.on('pointerout', () => bg.setFillStyle(0xd08b3e));
    bg.on('pointerup', () => this.endTurn());
  }

  private drawCards(count: number, animate: boolean): void {
    const drawn = this.deck.draw(count);
    this.renderHand(new Set(drawn.map((card) => card.uid)), animate);
  }

  private renderHand(animatedDraws = new Set<string>(), animateDraws = false): void {
    this.cardViews.forEach((view) => view.container.destroy());
    this.cardViews.clear();

    const count = this.deck.hand.length;
    const gap = Math.min(168, count > 1 ? 820 / (count - 1) : 0);
    const startX = 640 - ((count - 1) * gap) / 2;

    this.deck.hand.forEach((card, index) => {
      const targetX = startX + index * gap;
      const view = this.createCardView(card, targetX, HAND_Y);
      if (animateDraws && animatedDraws.has(card.uid)) {
        view.container.setX(-120 - index * 24);
        view.container.setAlpha(0);
        this.tweens.add({
          targets: view.container,
          x: targetX,
          alpha: 1,
          duration: 260,
          delay: index * 55,
          ease: 'Sine.easeOut',
        });
      }
      this.cardViews.set(card.uid, view);
    });

    this.updateHud();
  }

  private animateCardToDiscard(cardView: Phaser.GameObjects.Container, onComplete: () => void): void {
    this.tweens.add({
      targets: cardView,
      x: 1390,
      y: HAND_Y + 24,
      alpha: 0,
      angle: 8,
      duration: 240,
      ease: 'Sine.easeIn',
      onComplete,
    });
  }

  private createCardView(card: CardInstance, x: number, y: number): CardView {
    const container = this.add.container(x, y);
    const cardColor = this.cardColor(card.definition);
    const bg = this.add.rectangle(0, 0, CARD_WIDTH, CARD_HEIGHT, cardColor, 1);
    bg.setStrokeStyle(3, 0x38312a, 1);

    const costCircle = this.add.circle(-55, -70, 22, card.definition.cost === 0 ? 0x5cbf88 : 0x537fc1);
    const costText = this.add.text(-55, -70, String(card.definition.cost), {
      fontFamily: 'Arial',
      fontSize: '25px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    costText.setOrigin(0.5);

    const nameText = this.add.text(0, -46, card.definition.name, {
      fontFamily: 'Arial',
      fontSize: '19px',
      fontStyle: 'bold',
      color: '#1e252c',
      align: 'center',
      wordWrap: { width: CARD_WIDTH - 24 },
    });
    nameText.setOrigin(0.5);

    const effectText = this.add.text(0, 22, card.definition.description, {
      fontFamily: 'Arial',
      fontSize: '15px',
      color: '#2d3742',
      align: 'center',
      wordWrap: { width: CARD_WIDTH - 24 },
      lineSpacing: 5,
    });
    effectText.setOrigin(0.5);

    container.add([bg, costCircle, costText, nameText, effectText]);
    container.setSize(CARD_WIDTH, CARD_HEIGHT);
    container.setDepth(30);
    bg.setInteractive({ useHandCursor: true });

    bg.on('pointerover', () => {
      if (this.isAnimating || this.isGameOver) {
        return;
      }
      container.setScale(1.08);
      container.setY(HAND_Y - 28);
      container.setDepth(1000);
      bg.setFillStyle(cardColor);
      bg.setStrokeStyle(4, 0xfff4bd, 1);
    });

    bg.on('pointerout', () => {
      container.setScale(1);
      container.setY(HAND_Y);
      container.setDepth(30);
      bg.setFillStyle(cardColor);
      bg.setStrokeStyle(3, 0x38312a, 1);
    });

    bg.on('pointerup', () => this.playCard(card, container, bg));

    return { card, container };
  }

  private cardColor(definition: CardDefinition): number {
    if (definition.hpDamage > 0 && definition.hpDamageTimes > 0) {
      return 0xe7aeb6;
    }

    if (definition.epDamage > 0 && definition.epDamageTimes > 0) {
      return 0xf8d6e8;
    }

    if (definition.debuffs.some((debuff) => debuff.stacks > 0)) {
      return 0xe7f4c8;
    }

    return 0xdceafa;
  }

  private playCard(
    card: CardInstance,
    container: Phaser.GameObjects.Container,
    hitArea: Phaser.GameObjects.Rectangle,
  ): void {
    if (this.isAnimating || this.isGameOver || this.enemy.isDefeated) {
      return;
    }

    if (this.player.energy < card.definition.cost) {
      this.showMessage('Not enough energy');
      this.tweens.add({
        targets: container,
        x: container.x + 8,
        duration: 45,
        yoyo: true,
        repeat: 3,
      });
      return;
    }

    this.isAnimating = true;
    this.player.energy -= card.definition.cost;
    this.updateHud();
    hitArea.disableInteractive();
    container.setDepth(2000);

    const originalX = container.x;
    const originalY = container.y;
    const targetsEnemy = this.targetsEnemy(card.definition);
    const playTweenConfig = targetsEnemy
      ? {
          x: 810,
          y: 420,
          scale: 0.92,
          duration: 160,
          ease: 'Sine.easeOut',
          yoyo: true,
        }
      : {
          x: originalX,
          y: originalY - 92,
          scale: 1.2,
          duration: 260,
          ease: 'Back.easeOut',
          yoyo: false,
        };
    this.tweens.add({
      targets: container,
      ...playTweenConfig,
      onComplete: () => {
        if (targetsEnemy) {
          container.setPosition(originalX, originalY);
          container.setScale(1);
        }
        void this.applyCardEffect(card).then(() => {
          this.deck.discard(card.uid);
          if (this.isGameOver) {
            return;
          }

          const discardDelay = targetsEnemy ? 0 : 180;
          this.time.delayedCall(discardDelay, () => this.animateCardToDiscard(container, () => {
            this.isAnimating = false;
            this.renderHand();
          }));
        });
      },
    });
  }

  private targetsEnemy(definition: CardDefinition): boolean {
    const hasHpDamage = definition.hpDamage > 0 && definition.hpDamageTimes > 0;
    const hasEpDamage = definition.epDamage > 0 && definition.epDamageTimes > 0;
    const hasDebuff = definition.debuffs.some((debuff) => debuff.stacks > 0);
    return hasHpDamage || hasEpDamage || hasDebuff;
  }

  private async applyCardEffect(card: CardInstance): Promise<void> {
    const definition = card.definition;
    const messages: string[] = [];

    let totalHpDamage = 0;
    for (let i = 0; i < definition.hpDamageTimes; i += 1) {
      if (definition.hpDamage <= 0) {
        continue;
      }
      const beforeHp = this.enemy.hp;
      const beforeBlock = this.enemy.block;
      const damage = this.enemy.takeHpDamage(definition.hpDamage);
      this.showHpDamageBarChip(this.enemyBars, beforeHp, this.enemy.hp, this.enemy.maxHp);
      totalHpDamage += damage;
      this.playDamageEffect(definition.attackAttribute, 910, 300);
      this.showDamageNumber(damage > 0 ? damage : definition.hpDamage, 910, 300, damage > 0 ? 'hp' : 'block');
      if (damage === 0) {
        if (beforeBlock > 0 && this.enemy.block === 0 && definition.hpDamage >= beforeBlock) {
          this.showBrokenShieldEffect(910, 300);
        } else {
          this.showShieldEffect(910, 300);
        }
      } else if (beforeBlock > 0 && this.enemy.block === 0 && definition.hpDamage >= beforeBlock) {
        this.showBrokenShieldEffect(910, 300);
      }
    }

    if (definition.hpDamage > 0 && definition.hpDamageTimes > 0) {
      this.flashEnemy();
      messages.push(`${definition.name}: ${totalHpDamage} HP damage`);
    }

    let totalEpDamage = 0;
    let enemyEpPeaked = false;
    for (let i = 0; i < definition.epDamageTimes; i += 1) {
      if (definition.epDamage <= 0) {
        continue;
      }
      this.playDamageEffect(definition.attackAttribute, 910, 300);
      this.showDamageNumber(definition.epDamage, 910, 300, 'ep');
      enemyEpPeaked = (await this.applyEnemyEpDamage(definition.epDamage)) || enemyEpPeaked;
      totalEpDamage += definition.epDamage;
      if (this.enemy.isDefeated) {
        break;
      }
    }

    if (definition.epDamage > 0 && definition.epDamageTimes > 0) {
      if (!enemyEpPeaked) {
        this.flashEnemy();
      }
      messages.push(`${definition.name}: ${totalEpDamage} EP damage`);
    }

    if (definition.block > 0) {
      this.player.block += definition.block;
      this.showShieldEffect(270, 315);
      messages.push(`${definition.name}: +${definition.block} block`);
    }

    for (const buff of definition.buffs) {
      if (buff.stacks <= 0) {
        continue;
      }
      this.player.addStatus(buff.effect, buff.stacks);
      messages.push(`${definition.name}: ${buff.effect} x${buff.stacks}`);
    }

    for (const debuff of definition.debuffs) {
      if (debuff.stacks <= 0) {
        continue;
      }
      this.enemy.addStatus(debuff.effect, debuff.stacks);
      messages.push(`${definition.name}: ${debuff.effect} x${debuff.stacks}`);
    }

    let selfHpDamage = 0;
    for (let i = 0; i < definition.selfHpDamageTimes; i += 1) {
      if (definition.selfHpDamage <= 0) {
        continue;
      }
      const beforeHp = this.player.hp;
      this.player.takeDirectHpDamage(definition.selfHpDamage);
      this.showHpDamageBarChip(this.playerBars, beforeHp, this.player.hp, this.player.maxHp);
      selfHpDamage += definition.selfHpDamage;
      this.playDamageEffect('strike', 270, 315);
      this.showDamageNumber(definition.selfHpDamage, 270, 315, 'hp');
    }

    if (selfHpDamage > 0) {
      this.flashPlayer();
      messages.push(`${definition.name}: self ${selfHpDamage} HP damage`);
    }

    let selfEpDamage = 0;
    let selfEpPeaked = false;
    for (let i = 0; i < definition.selfEpDamageTimes; i += 1) {
      if (definition.selfEpDamage <= 0) {
        continue;
      }
      this.playDamageEffect('love', 270, 315);
      this.showDamageNumber(definition.selfEpDamage, 270, 315, 'ep');
      selfEpPeaked = (await this.applyPlayerEpDamage(definition.selfEpDamage)) || selfEpPeaked;
      selfEpDamage += definition.selfEpDamage;
    }

    if (selfEpDamage > 0) {
      if (!selfEpPeaked) {
        this.flashPlayer();
      }
      messages.push(
        selfEpPeaked
          ? `${definition.name}: self ${selfEpDamage} EP damage / Lingering`
          : `${definition.name}: self ${selfEpDamage} EP damage`,
      );
    }

    if (messages.length > 0) {
      this.showMessage(messages.join(' / '));
    }

    this.updateHud();

    if (this.player.isDefeated) {
      this.defeatPlayer();
      return;
    }

    if (this.enemy.isDefeated) {
      this.defeatEnemy();
    }
  }

  private async resolveEnemyEpPeak(): Promise<void> {
    await this.flashEpPeak(this.enemyArea, this.enemyBody, 0x8a414d);

    const beforeEnemyHp = this.enemy.hp;
    this.player.healHp(this.enemy.maxEp);
    this.healingEffect();
    this.hpAbsorbEffect();
    this.enemy.takeDirectHpDamage(this.enemy.maxEp);
    this.showHpDamageBarChip(this.enemyBars, beforeEnemyHp, this.enemy.hp, this.enemy.maxHp);
    this.showDamageNumber(this.enemy.maxEp, 910, 300, 'hp');
    this.enemyEpPeakBarOverride = true;
    this.enemy.resetEpAfterPeak();
    this.updateHud();
    this.setEpFillImmediate(this.enemyBars, this.enemy.ep, this.enemy.maxEp);
    this.enemyEpPeakBarOverride = false;
    this.showMessage(`Enemy EP peak: heal ${this.enemy.maxEp}, deal ${this.enemy.maxEp}`);
  }

  private async applyEnemyEpDamage(amount: number): Promise<boolean> {
    let remaining = amount;
    let peaked = false;

    while (remaining > 0 && !this.enemy.isDefeated) {
      const damageToMax = Math.min(remaining, this.enemy.maxEp - this.enemy.ep);
      if (damageToMax > 0) {
        this.enemy.takeEpDamage(damageToMax);
        remaining -= damageToMax;
        this.updateHud();
        await this.animateEpFillTo(this.enemyBars, this.enemy.ep, this.enemy.maxEp, 'enemy', 320);
      }

      if (this.enemy.ep < this.enemy.maxEp) {
        return peaked;
      }

      peaked = true;
      await this.resolveEnemyEpPeak();
      if (remaining > 0) {
        await this.wait(130);
      }
    }

    return peaked;
  }

  private async applyPlayerEpDamage(amount: number): Promise<boolean> {
    let remaining = amount;
    let peaked = false;

    while (remaining > 0) {
      const damageToMax = Math.min(remaining, this.player.maxEp - this.player.ep);
      if (damageToMax > 0) {
        this.player.takeEpDamage(damageToMax);
        remaining -= damageToMax;
        this.updateHud();
        await this.animateEpFillTo(this.playerBars, this.player.ep, this.player.maxEp, 'player', 320);
      }

      if (this.player.ep < this.player.maxEp) {
        return peaked;
      }

      peaked = true;
      const recoveryEp = this.nextPlayerEpRecoveryValue();
      await Promise.all([
        this.flashEpPeak(this.playerArea, this.playerBody, 0x467fb1),
        this.flashEpFill(this.playerBars, EP_PEAK_FLASH_DURATION),
        this.animatePlayerEpReserveTo(recoveryEp, this.player.maxEp, EP_PEAK_FLASH_DURATION),
      ]);
      this.playerEpPeakBarOverride = true;
      this.player.recoverFromEpPeak(recoveryEp);
      this.updateHud();
      this.setEpFillImmediate(this.playerBars, this.player.ep, this.player.maxEp);
      this.playerEpPeakBarOverride = false;
      if (remaining > 0) {
        await this.wait(130);
      }
    }

    return peaked;
  }

  private endTurn(): void {
    if (this.isAnimating || this.isGameOver) {
      return;
    }

    this.isAnimating = true;
    this.showMessage('Enemy turn');

    const cardsToDiscard = this.deck.hand
      .map((card) => this.cardViews.get(card.uid)?.container)
      .filter((container): container is Phaser.GameObjects.Container => Boolean(container));

    const finishDiscard = () => {
      this.deck.discardHand();
      this.renderHand();
      this.time.delayedCall(350, () => this.enemyAction());
    };

    if (cardsToDiscard.length === 0) {
      finishDiscard();
      return;
    }

    let completed = 0;
    cardsToDiscard.forEach((container, index) => {
      this.tweens.add({
        targets: container,
        x: 1390,
        y: HAND_Y + 24,
        alpha: 0,
        angle: 10,
        duration: 220,
        delay: index * 35,
        ease: 'Sine.easeIn',
        onComplete: () => {
          completed += 1;
          if (completed === cardsToDiscard.length) {
            finishDiscard();
          }
        },
      });
    });
  }

  private async enemyAction(): Promise<void> {
    if (this.enemy.isDefeated) {
      this.startNextTurn();
      return;
    }

    const intent = this.enemy.currentIntent();
    if (intent.damageType === 'ep') {
      this.enemyEpAttackMotion();
      this.playDamageEffect('love', 270, 315);
      this.showDamageNumber(intent.amount, 270, 315, 'ep');
      const peaked = await this.applyPlayerEpDamage(intent.amount);
      this.enemy.consumeStatus('Charm');
      if (!peaked) {
        this.flashPlayer();
      }
      this.showMessage(peaked ? 'Player EP peak: Lingering' : `Enemy dealt ${intent.amount} EP damage`);
    } else {
      this.enemyHpAttackMotion();
      const beforeHp = this.player.hp;
      const beforeBlock = this.player.block;
      const damage = this.player.takeHpDamage(intent.amount);
      this.showHpDamageBarChip(this.playerBars, beforeHp, this.player.hp, this.player.maxHp);
      this.playDamageEffect(intent.attackAttribute, 270, 315);
      this.showDamageNumber(damage > 0 ? damage : intent.amount, 270, 315, damage > 0 ? 'hp' : 'block');
      if (damage === 0) {
        if (beforeBlock > 0 && this.player.block === 0 && intent.amount >= beforeBlock) {
          this.showBrokenShieldEffect(270, 315);
        } else {
          this.showShieldEffect(270, 315);
        }
      } else {
        if (beforeBlock > 0 && this.player.block === 0 && intent.amount >= beforeBlock) {
          this.showBrokenShieldEffect(270, 315);
        }
        this.flashPlayer();
      }
      this.showMessage(`Enemy attacked: ${damage} HP damage`);
    }

    this.updateHud();
    this.enemy.advanceIntent();

    if (this.player.isDefeated) {
      this.defeatPlayer();
      return;
    }

    this.time.delayedCall(650, () => this.startNextTurn());
  }

  private async startNextTurn(): Promise<void> {
    this.player.startTurn();
    this.updateHud();
    await this.consumeLingeringAtTurnStart();
    this.drawCards(5, true);
    this.isAnimating = false;
    this.showMessage('Your turn');
    this.updateHud();
  }

  private flashEnemy(): void {
    this.enemyBody.setFillStyle(0xff4657);
    this.tweens.add({
      targets: this.enemyArea,
      x: this.enemyArea.x + 12,
      duration: 55,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        if (!this.enemy.isDefeated) {
          this.enemyArea.setX(910);
          this.enemyBody.setFillStyle(0x8a414d);
        }
      },
    });
  }

  private flashPlayer(): void {
    this.playerBody.setFillStyle(0xffffff);
    this.tweens.add({
      targets: this.playerArea,
      x: this.playerArea.x - 12,
      duration: 55,
      yoyo: true,
      repeat: 4,
      onComplete: () => {
        this.playerArea.setX(270);
        this.playerBody.setFillStyle(0x467fb1);
      },
    });
  }

  private enemyHpAttackMotion(): void {
    this.tweens.add({
      targets: this.enemyArea,
      x: this.enemyArea.x - 32,
      duration: 120,
      ease: 'Sine.easeOut',
      yoyo: true,
      onComplete: () => this.enemyArea.setX(910),
    });
  }

  private enemyEpAttackMotion(): void {
    this.tweens.add({
      targets: this.enemyArea,
      y: this.enemyArea.y - 14,
      duration: 70,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: 3,
      onComplete: () => this.enemyArea.setY(320),
    });
  }

  private healingEffect(): void {
    for (let i = 0; i < 12; i += 1) {
      const x = Phaser.Math.Between(185, 355);
      const y = Phaser.Math.Between(330, 425);
      const cross = this.add.text(x, y, '+', {
        fontFamily: 'Arial',
        fontSize: `${Phaser.Math.Between(80, 120)}px`,
        fontStyle: 'bold',
        color: '#6df090',
      });
      cross.setOrigin(0.5);
      cross.setDepth(1200);
      this.tweens.add({
        targets: cross,
        y: y - Phaser.Math.Between(82, 140),
        alpha: 0,
        duration: Phaser.Math.Between(720, 1050),
        delay: i * 35,
        ease: 'Sine.easeOut',
        onComplete: () => cross.destroy(),
      });
    }
  }

  private hpAbsorbEffect(): void {
    for (let i = 0; i < 7; i += 1) {
      const heart = this.add.text(910 + Phaser.Math.Between(-34, 34), 300 + Phaser.Math.Between(-34, 34), '♥', {
        fontFamily: 'Arial',
        fontSize: '44px',
        fontStyle: 'bold',
        color: '#70f29a',
      });
      heart.setOrigin(0.5);
      heart.setDepth(1450);
      this.tweens.add({
        targets: heart,
        x: 270 + Phaser.Math.Between(-44, 44),
        y: 315 + Phaser.Math.Between(-54, 28),
        scale: 1.35,
        alpha: 0,
        duration: 700,
        delay: i * 70,
        ease: 'Sine.easeInOut',
        onComplete: () => heart.destroy(),
      });
    }
  }

  private flashEpPeak(
    target: Phaser.GameObjects.Container,
    body: Phaser.GameObjects.Rectangle,
    restoreColor: number,
  ): Promise<void> {
    body.setFillStyle(0xff73b8);
    return new Promise((resolve) => {
      this.tweens.add({
        targets: target,
        alpha: 0.45,
        duration: 80,
        yoyo: true,
        repeat: 5,
        onComplete: () => {
          target.setAlpha(1);
          body.setFillStyle(restoreColor);
          resolve();
        },
      });
    });
  }

  private nextPlayerEpRecoveryValue(): number {
    const reserveStep = Math.max(1, Math.floor(this.player.maxEp * 0.1));
    const reserveCap = Math.floor(this.player.maxEp * 0.9);
    return Math.min(reserveCap, this.playerEpReserveValue + reserveStep);
  }

  private setEpFillImmediate(bars: HudBars, ep: number, maxEp: number): void {
    this.tweens.killTweensOf(bars.epFill);
    bars.epFill.setFillStyle(EP_FILL_COLOR);
    bars.epFill.setAlpha(1);
    bars.epFill.displayWidth = BAR_WIDTH * Phaser.Math.Clamp(ep / maxEp, 0, 1);
  }

  private flashEpFill(bars: HudBars, duration: number): Promise<void> {
    this.tweens.killTweensOf(bars.epFill);
    bars.epFill.setFillStyle(0xffd1ea);
    bars.epFill.setAlpha(1);

    return new Promise((resolve) => {
      this.tweens.add({
        targets: bars.epFill,
        alpha: 0.35,
        duration: 80,
        yoyo: true,
        repeat: Math.max(0, Math.floor(duration / 160) - 1),
        onComplete: () => {
          bars.epFill.setAlpha(1);
          bars.epFill.setFillStyle(EP_FILL_COLOR);
          resolve();
        },
      });
    });
  }

  private setPlayerEpReserveWidth(width: number): void {
    const clampedWidth = Phaser.Math.Clamp(width, 0, BAR_WIDTH);
    this.playerBars.epReserveFill.setScale(clampedWidth / BAR_WIDTH, 1);
    this.redrawEpReserveStripes(this.playerBars, clampedWidth);
  }

  private setPlayerEpReserveValue(value: number, maxEp: number, animate: boolean): void {
    this.playerEpReserveValue = Phaser.Math.Clamp(value, 0, maxEp);
    const targetWidth = BAR_WIDTH * Phaser.Math.Clamp(this.playerEpReserveValue / maxEp, 0, 1);

    if (!animate) {
      this.setPlayerEpReserveWidth(targetWidth);
      return;
    }

    this.playerEpReserveOverride = true;
    const state = { width: this.playerBars.epReserveFill.scaleX * BAR_WIDTH };
    this.tweens.add({
      targets: state,
      width: targetWidth,
      duration: 500,
      ease: 'Sine.easeOut',
      onUpdate: () => this.setPlayerEpReserveWidth(state.width),
      onComplete: () => {
        this.setPlayerEpReserveWidth(targetWidth);
        this.playerEpReserveOverride = false;
      },
    });
  }

  private animatePlayerEpReserveTo(value: number, maxEp: number, duration: number): Promise<void> {
    this.playerEpReserveOverride = true;
    this.playerEpReserveValue = Phaser.Math.Clamp(value, 0, maxEp);
    const targetWidth = BAR_WIDTH * Phaser.Math.Clamp(this.playerEpReserveValue / maxEp, 0, 1);
    const state = { width: this.playerBars.epReserveFill.scaleX * BAR_WIDTH };

    return new Promise((resolve) => {
      this.tweens.add({
        targets: state,
        width: targetWidth,
        duration,
        ease: 'Sine.easeInOut',
        onUpdate: () => this.setPlayerEpReserveWidth(state.width),
        onComplete: () => {
          this.setPlayerEpReserveWidth(targetWidth);
          this.playerEpReserveOverride = false;
          resolve();
        },
      });
    });
  }

  private redrawEpReserveStripes(bars: HudBars, width: number): void {
    bars.epReserveStripes.clear();
    if (width <= 0) {
      return;
    }

    bars.epReserveStripes.lineStyle(2, 0xffffff, 0.78);
    for (let offset = -8; offset < width; offset += 9) {
      const startX = bars.epX + Math.max(0, offset);
      const startY = bars.epY + 6 - Math.max(0, -offset);
      const endX = bars.epX + Math.min(width, offset + 12);
      const endY = startY - (endX - startX);
      bars.epReserveStripes.lineBetween(startX, startY, endX, Math.max(bars.epY - 6, endY));
    }
  }

  private animateEpFillTo(
    bars: HudBars,
    ep: number,
    maxEp: number,
    owner: 'player' | 'enemy',
    duration: number,
  ): Promise<void> {
    if (owner === 'player') {
      this.playerEpPeakBarOverride = true;
    } else {
      this.enemyEpPeakBarOverride = true;
    }

    this.tweens.killTweensOf(bars.epFill);
    return new Promise((resolve) => {
      this.tweens.add({
        targets: bars.epFill,
        displayWidth: BAR_WIDTH * Phaser.Math.Clamp(ep / maxEp, 0, 1),
        duration,
        ease: 'Sine.easeOut',
        onComplete: () => {
          if (owner === 'player') {
            this.playerEpPeakBarOverride = false;
          } else {
            this.enemyEpPeakBarOverride = false;
          }
          resolve();
        },
      });
    });
  }

  private wait(duration: number): Promise<void> {
    return new Promise((resolve) => {
      this.time.delayedCall(duration, resolve);
    });
  }

  private async consumeLingeringAtTurnStart(): Promise<void> {
    while (this.player.energy > 0 && this.player.hasStatus('Lingering')) {
      this.player.consumeStatus('Lingering');
      this.player.energy -= 1;
      this.updateHud();
      await Promise.all([
        this.breathingRecoveryMotion(),
        this.pulseEnergyPanel(),
      ]);
      await this.wait(90);
    }
  }

  private breathingRecoveryMotion(): Promise<void> {
    this.tweens.killTweensOf(this.playerArea);
    this.playerArea.setY(335);

    return new Promise((resolve) => {
      this.tweens.add({
        targets: this.playerArea,
        y: 351,
        duration: 300,
        ease: 'Sine.easeInOut',
        yoyo: true,
        onComplete: () => {
          this.playerArea.setY(335);
          resolve();
        },
      });
    });
  }

  private pulseEnergyPanel(): Promise<void> {
    this.tweens.killTweensOf(this.energyPanel);
    this.energyPanel.setScale(1);
    this.energyPanel.setStrokeStyle(4, 0x63e68a, 1);

    return new Promise((resolve) => {
      this.tweens.add({
        targets: this.energyPanel,
        scale: 1.07,
        duration: 170,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: 2,
        onComplete: () => {
          this.energyPanel.setScale(1);
          this.energyPanel.setStrokeStyle(2, 0xd8a84c, 0.85);
          resolve();
        },
      });
    });
  }

  private showHpDamageBarChip(bars: HudBars, beforeHp: number, afterHp: number, maxHp: number): void {
    const damage = Math.max(0, beforeHp - afterHp);
    if (damage <= 0) {
      return;
    }

    const beforeWidth = BAR_WIDTH * Phaser.Math.Clamp(beforeHp / maxHp, 0, 1);
    const afterWidth = BAR_WIDTH * Phaser.Math.Clamp(afterHp / maxHp, 0, 1);
    const chipWidth = Math.max(2, beforeWidth - afterWidth);
    const chip = this.add.rectangle(bars.hpX + afterWidth, bars.hpY, chipWidth, 12, 0xffd166, 0.9);
    chip.setOrigin(0, 0.5);
    chip.setDepth(1400);
    this.tweens.add({
      targets: chip,
      x: chip.x + 14,
      y: chip.y - 12,
      duration: 120,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: chip,
          displayWidth: 0,
          alpha: 0,
          duration: 500,
          ease: 'Sine.easeIn',
          onComplete: () => chip.destroy(),
        });
      },
    });
  }

  private playDamageEffect(attribute: AttackAttribute, x: number, y: number): void {
    if (attribute === 'strike') {
      this.strikeImpactEffect(x, y);
      return;
    }

    if (attribute === 'slash') {
      this.slashImpactEffect(x, y);
      return;
    }

    this.loveImpactEffect(x, y);
  }

  private strikeImpactEffect(x: number, y: number): void {
    const offsets = [
      { x: -34, y: -18 },
      { x: 18, y: 12 },
      { x: 46, y: -28 },
    ];

    offsets.forEach((offset, index) => {
      const ring = this.add.circle(x + offset.x, y + offset.y, 24, 0xffffff, 0);
      ring.setStrokeStyle(8, 0xffe0a3, 0.95);
      ring.setDepth(1400);
      this.tweens.add({
        targets: ring,
        scale: 3.1,
        alpha: 0,
        duration: 460,
        delay: index * 45,
        ease: 'Sine.easeOut',
        onComplete: () => ring.destroy(),
      });
    });
  }

  private slashImpactEffect(x: number, y: number): void {
    const slash = this.add.graphics();
    slash.lineStyle(15, 0xf8f3e8, 0.98);
    slash.lineBetween(-78, -86, 78, 86);
    slash.lineStyle(5, 0xdf475a, 0.95);
    slash.lineBetween(-56, -64, 98, 102);
    slash.setPosition(x, y);
    slash.setDepth(1400);
    slash.setAlpha(0.95);
    this.tweens.add({
      targets: slash,
      x: x + 28,
      y: y + 20,
      scale: 1.18,
      alpha: 0,
      duration: 460,
      ease: 'Sine.easeOut',
      onComplete: () => slash.destroy(),
    });
  }

  private loveImpactEffect(x: number, y: number): void {
    for (let i = 0; i < 5; i += 1) {
      const heart = this.add.text(x + Phaser.Math.Between(-54, 54), y + 64, '♥', {
        fontFamily: 'Arial',
        fontSize: '120px',
        fontStyle: 'bold',
        color: '#ff73b8',
      });
      heart.setOrigin(0.5);
      heart.setDepth(1400);
      heart.setScale(0.55);
      this.tweens.add({
        targets: heart,
        y: y - Phaser.Math.Between(48, 92),
        scale: 1.35,
        alpha: 0,
        duration: 820,
        delay: i * 65,
        ease: 'Sine.easeOut',
        onComplete: () => heart.destroy(),
      });
    }
  }

  private showDamageNumber(amount: number, x: number, y: number, type: 'hp' | 'ep' | 'block'): void {
    if (amount <= 0) {
      return;
    }

    const colorByType = {
      hp: '#f04452',
      ep: '#ff73b8',
      block: '#4ea3ff',
    };
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const distance = Phaser.Math.Between(34, 64);
    const text = this.add.text(x, y, String(amount), {
      fontFamily: 'Yu Gothic, Meiryo, Arial, sans-serif',
      fontSize: '44px',
      fontStyle: 'bold',
      color: colorByType[type],
      stroke: '#ffffff',
      strokeThickness: 7,
    });
    text.setOrigin(0.5);
    text.setDepth(2600);

    this.tweens.add({
      targets: text,
      x: x + Math.cos(angle) * distance,
      y: y + Math.sin(angle) * distance,
      duration: 2000,
      ease: 'Sine.easeOut',
    });
    this.tweens.add({
      targets: text,
      alpha: 0,
      duration: 1000,
      delay: 1000,
      ease: 'Sine.easeIn',
      onComplete: () => text.destroy(),
    });
  }

  private showShieldEffect(x: number, y: number): void {
    const shield = this.add.graphics();
    shield.fillStyle(0x3a80d7, 0.78);
    shield.lineStyle(5, 0xd8ecff, 0.95);
    const points = [
      new Phaser.Math.Vector2(-58, -58),
      new Phaser.Math.Vector2(58, -58),
      new Phaser.Math.Vector2(58, 22),
      new Phaser.Math.Vector2(0, 78),
      new Phaser.Math.Vector2(-58, 22),
    ];
    shield.fillPoints(points, true);
    shield.strokePoints(points, true);
    shield.setPosition(x, y);
    shield.setDepth(1500);
    shield.setScale(1.3);
    this.tweens.add({
      targets: shield,
      scale: 2.1,
      alpha: 0,
      duration: 900,
      ease: 'Sine.easeOut',
      onComplete: () => shield.destroy(),
    });
  }

  private showBrokenShieldEffect(x: number, y: number): void {
    const leftShield = this.createShieldPiece([
      new Phaser.Math.Vector2(-58, -58),
      new Phaser.Math.Vector2(0, -58),
      new Phaser.Math.Vector2(0, 78),
      new Phaser.Math.Vector2(-58, 22),
    ]);
    const rightShield = this.createShieldPiece([
      new Phaser.Math.Vector2(0, -58),
      new Phaser.Math.Vector2(58, -58),
      new Phaser.Math.Vector2(58, 22),
      new Phaser.Math.Vector2(0, 78),
    ]);

    leftShield.setPosition(x, y);
    rightShield.setPosition(x, y);
    leftShield.setScale(1.3);
    rightShield.setScale(1.3);

    this.tweens.add({
      targets: leftShield,
      x: x - 54,
      y: y + 8,
      angle: -18,
      scale: 1.75,
      alpha: 0,
      duration: 900,
      ease: 'Sine.easeOut',
      onComplete: () => leftShield.destroy(),
    });
    this.tweens.add({
      targets: rightShield,
      x: x + 54,
      y: y + 8,
      angle: 18,
      scale: 1.75,
      alpha: 0,
      duration: 900,
      ease: 'Sine.easeOut',
      onComplete: () => rightShield.destroy(),
    });
  }

  private createShieldPiece(points: Phaser.Math.Vector2[]): Phaser.GameObjects.Graphics {
    const shield = this.add.graphics();
    shield.fillStyle(0x3a80d7, 0.78);
    shield.lineStyle(5, 0xd8ecff, 0.95);
    shield.fillPoints(points, true);
    shield.strokePoints(points, true);
    shield.setDepth(1500);
    return shield;
  }

  private defeatEnemy(): void {
    this.isGameOver = true;
    this.isAnimating = true;
    this.reticle.setVisible(false);
    this.renderStatusIcons(this.enemyStatusIcons, this.enemy.statuses, true);
    this.hideStatusTooltip();
    this.enemyBody.setFillStyle(0xff4657);

    this.tweens.add({
      targets: this.enemyArea,
      alpha: 0,
      y: this.enemyArea.y + 70,
      angle: 9,
      duration: 650,
      ease: 'Sine.easeIn',
      onComplete: () => this.showResult('VICTORY', 0x1f8f5f),
    });
  }

  private defeatPlayer(): void {
    this.isGameOver = true;
    this.isAnimating = true;
    this.tweens.add({
      targets: this.playerArea,
      alpha: 0.25,
      y: this.playerArea.y + 28,
      duration: 550,
      ease: 'Sine.easeIn',
      onComplete: () => this.showResult('DEFEAT', 0x9c2d39),
    });
  }

  private showResult(title: string, color: number): void {
    this.resultOverlay.removeAll(true);
    const shade = this.add.rectangle(640, 360, 1280, 720, 0x050607, 0.68);
    const banner = this.add.rectangle(640, 360, 500, 150, color, 0.94);
    banner.setStrokeStyle(4, 0xffffff, 0.75);
    const text = this.add.text(640, 360, title, {
      fontFamily: 'Arial',
      fontSize: '58px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    text.setOrigin(0.5);
    this.resultOverlay.add([shade, banner, text]);
    this.resultOverlay.setVisible(true);
  }

  private updateHud(): void {
    if (!this.playerHud || !this.enemyHud) {
      return;
    }

    this.playerHud.setText([
      `HP: ${this.player.hp}/${this.player.maxHp}`,
      `EP: ${this.player.ep}/${this.player.maxEp}`,
      `EP Peaks: ${this.player.epPeakCount}`,
    ]);

    this.enemyHud.setText([
      `HP: ${this.enemy.hp}/${this.enemy.maxHp}`,
      `EP: ${this.enemy.ep}/${this.enemy.maxEp}`,
    ]);

    const animateBars = this.hasRenderedHud;
    this.updateBars(this.playerBars, this.player.hp, this.player.maxHp, this.player.block, this.player.ep, this.player.maxEp, animateBars);
    this.updateBars(this.enemyBars, this.enemy.hp, this.enemy.maxHp, this.enemy.block, this.enemy.ep, this.enemy.maxEp, animateBars);
    this.hasRenderedHud = true;

    const intent = this.enemy.currentIntent();
    this.intentText.setText(intent.label);
    this.intentText.setColor(intent.damageType === 'hp' ? '#ff6b72' : '#ff73b8');
    this.energyText.setText(`${this.player.energy}/${this.player.maxEnergy}`);
    this.pileHud.setText(
      `Deck: ${this.deck.drawPile.length}   Hand: ${this.deck.hand.length}   Discard: ${this.deck.discardPile.length}`,
    );
    this.renderStatusIcons(this.playerStatusIcons, this.player.statuses);
    this.renderStatusIcons(this.enemyStatusIcons, this.enemy.statuses, this.enemy.isDefeated);
  }

  private updateBars(
    bars: HudBars,
    hp: number,
    maxHp: number,
    block: number,
    ep: number,
    maxEp: number,
    animate: boolean,
  ): void {
    const hpRatio = Phaser.Math.Clamp(hp / maxHp, 0, 1);
    this.tweens.killTweensOf(bars.hpFill);
    if (animate) {
      this.tweens.add({
        targets: bars.hpFill,
        displayWidth: BAR_WIDTH * hpRatio,
        duration: 500,
        ease: 'Sine.easeOut',
      });
    } else {
      bars.hpFill.displayWidth = BAR_WIDTH * hpRatio;
    }
    bars.hpFill.setFillStyle(hpRatio < 1 / 3 ? 0xd94a56 : 0x39b769);
    this.updateHudBlockShield(bars, block);
    if (bars === this.playerBars && !this.playerEpReserveOverride) {
      const nextReserveValue = Math.min(this.playerEpReserveValue, ep);
      this.setPlayerEpReserveValue(nextReserveValue, maxEp, animate && nextReserveValue !== this.playerEpReserveValue);
    }
    const epPeakOverride =
      (bars === this.playerBars && this.playerEpPeakBarOverride) ||
      (bars === this.enemyBars && this.enemyEpPeakBarOverride);
    if (epPeakOverride) {
      return;
    }
    this.tweens.killTweensOf(bars.epFill);
    bars.epFill.setAlpha(1);
    bars.epFill.setFillStyle(EP_FILL_COLOR);
    if (animate) {
      this.tweens.add({
        targets: bars.epFill,
        displayWidth: BAR_WIDTH * Phaser.Math.Clamp(ep / maxEp, 0, 1),
        duration: 500,
        ease: 'Sine.easeOut',
      });
    } else {
      bars.epFill.displayWidth = BAR_WIDTH * Phaser.Math.Clamp(ep / maxEp, 0, 1);
    }
  }

  private updateHudBlockShield(bars: HudBars, block: number): void {
    if (block <= 0) {
      bars.blockShield.setVisible(false);
      bars.blockText.setVisible(false);
      return;
    }

    const x = bars.hpX - 6;
    const y = bars.hpY - 18;
    const points = [
      new Phaser.Math.Vector2(x, y),
      new Phaser.Math.Vector2(x + 32, y),
      new Phaser.Math.Vector2(x + 32, y + 21),
      new Phaser.Math.Vector2(x + 16, y + 36),
      new Phaser.Math.Vector2(x, y + 21),
    ];

    bars.blockShield.clear();
    bars.blockShield.fillStyle(0x2f7fdd, 0.96);
    bars.blockShield.lineStyle(2, 0xd8ecff, 0.98);
    bars.blockShield.fillPoints(points, true);
    bars.blockShield.strokePoints(points, true);
    bars.blockShield.setVisible(true);

    bars.blockText.setText(String(block));
    bars.blockText.setPosition(x + 16, y + 16);
    bars.blockText.setVisible(true);
  }

  private showMessage(message: string): void {
    this.messageText.setText(message);
    this.messageText.setAlpha(1);
    this.tweens.killTweensOf(this.messageText);
    this.tweens.add({
      targets: this.messageText,
      alpha: 0.25,
      duration: 1200,
      ease: 'Sine.easeIn',
    });
  }
}
