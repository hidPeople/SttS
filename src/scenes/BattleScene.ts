import Phaser from 'phaser';
import { CARD_DEFINITIONS, createStartingDeckDefinitions } from '../data/cards';
import { ENEMY_DEFINITIONS } from '../data/enemies';
import { PLAYER_DEFINITION } from '../data/player';
import { RELIC_DEFINITIONS } from '../data/relics';
import { STATUS_DESCRIPTIONS } from '../data/statuses';
import { Enemy, Player } from '../models/Combatants';
import { Deck } from '../models/Deck';
import type { AttackAttribute, CardDefinition, CardInstance, EffectTiming, RelicDefinition, StatusEffect } from '../models/types';

type CardView = {
  card: CardInstance;
  container: Phaser.GameObjects.Container;
  hitArea: Phaser.GameObjects.Rectangle;
  effectText: Phaser.GameObjects.Container;
  baseX: number;
  baseY: number;
  ready: boolean;
};

type CardEffectSegment = {
  text: string;
  bold?: boolean;
};

type CardEffectLine = CardEffectSegment[];

type RelicHookContext = {
  enemy?: Enemy;
  player?: Player;
  card?: CardDefinition;
  amount?: number;
};

type HudBars = {
  hpFill: Phaser.GameObjects.Rectangle;
  blockFill: Phaser.GameObjects.Rectangle;
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
const HAND_Y = 645;
const MAX_HAND_SIZE = 10;
const HAND_MIN_X = 260;
const HAND_MAX_X = 950;
const HAND_CENTER_X = (HAND_MIN_X + HAND_MAX_X) / 2;
const HAND_CARD_GAP = 118;
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
  private relicIcons!: Phaser.GameObjects.Container;
  private playerBars!: HudBars;
  private enemyBars!: HudBars;
  private energyPanel!: Phaser.GameObjects.Rectangle;
  private energyText!: Phaser.GameObjects.Text;
  private pileHud!: Phaser.GameObjects.Text;
  private intentText!: Phaser.GameObjects.Container;
  private messageText!: Phaser.GameObjects.Text;
  private statusTooltip!: Phaser.GameObjects.Container;
  private statusTooltipText!: Phaser.GameObjects.Text;
  private statusTooltipStatus?: StatusEffect;
  private statusTooltipOwner?: Phaser.GameObjects.Container;
  private resultOverlay!: Phaser.GameObjects.Container;
  private modalOverlay!: Phaser.GameObjects.Container;
  private relicsByTiming = new Map<EffectTiming, RelicDefinition[]>();

  private cardViews = new Map<string, CardView>();
  private hoveredCardUid?: string;
  private exitingCardUids = new Set<string>();
  private isAnimating = false;
  private isGameOver = false;
  private isPlayerTurn = false;
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
    this.isPlayerTurn = true;
    this.playerEpPeakBarOverride = false;
    this.enemyEpPeakBarOverride = false;
    this.playerEpReserveOverride = false;
    this.playerEpReserveValue = 0;
    this.hasRenderedHud = false;
    this.cardViews.clear();

    this.player = new Player(PLAYER_DEFINITION);
    this.enemy = new Enemy(ENEMY_DEFINITIONS.trainingWraith);
    this.deck = new Deck(createStartingDeckDefinitions());
    this.indexPlayerRelics();

    this.createArena();
    this.createPlayer();
    this.createEnemy();
    this.createHud();
    this.createSettingsButton();
    this.createEndTurnButton();

    this.runBattleStartHooks();
    this.drawCards(5, true);
    this.updateHud();
    this.showMessage('Your turn');
  }

  private indexPlayerRelics(): void {
    this.relicsByTiming.clear();
    for (const relicId of this.player.relicIds) {
      const relic = RELIC_DEFINITIONS[relicId];
      if (!relic) {
        continue;
      }
      const relics = this.relicsByTiming.get(relic.timing) ?? [];
      relics.push(relic);
      this.relicsByTiming.set(relic.timing, relics);
    }
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
    this.createRelicHud();

    this.intentText = this.add.container(760, 170);

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

  private createRelicHud(): void {
    this.relicIcons = this.add.container(386, 24);
    this.relicIcons.setDepth(35);

    this.player.relicIds.forEach((relicId, index) => {
      const relic = RELIC_DEFINITIONS[relicId];
      if (!relic) {
        return;
      }

      const x = index * 44;
      const icon = this.add.rectangle(x, 0, 34, 34, 0x6f4f2d, 1);
      icon.setStrokeStyle(2, 0xf1c27d, 0.9);
      icon.setInteractive({ useHandCursor: true });

      const label = this.add.text(x, 0, this.relicIconText(relic), {
        fontFamily: 'Arial',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#ffffff',
      });
      label.setOrigin(0.5);

      const children: Phaser.GameObjects.GameObject[] = [icon, label];
      if (typeof relic.counter === 'number') {
        const counter = this.add.text(x + 12, 11, String(relic.counter), {
          fontFamily: 'Arial',
          fontSize: '11px',
          fontStyle: 'bold',
          color: '#ffffff',
          backgroundColor: '#1f2329',
        });
        counter.setOrigin(0.5);
        children.push(counter);
      }

      icon.on('pointerover', () => {
        this.clearStatusTooltipSource();
        this.showStatusTooltipText(`${relic.name}\n${relic.description}`, this.relicIcons.x + x - 8, this.relicIcons.y + 28);
      });
      icon.on('pointerout', () => this.hideStatusTooltip());

      this.relicIcons.add(children);
    });
  }

  private relicIconText(relic: RelicDefinition): string {
    return relic.name.slice(0, 2);
  }

  private relicsForTiming(timing: EffectTiming): RelicDefinition[] {
    return this.relicsByTiming.get(timing) ?? [];
  }

  private statusHasTiming(status: StatusEffect, timing: EffectTiming): boolean {
    const statusTiming = STATUS_DESCRIPTIONS[status]?.timing;
    if (Array.isArray(statusTiming)) {
      return statusTiming.includes(timing);
    }

    return statusTiming === timing;
  }

  private runBattleStartHooks(): void {
    for (const relic of this.relicsForTiming('battleStart')) {
      this.applyRelicStatusApplications(relic);
    }
  }

  private applyRelicStatusApplications(relic: RelicDefinition): void {
    for (const buff of relic.buffs) {
      if (buff.stacks > 0) {
        this.applyStatusToCombatant(this.player, buff.effect, buff.stacks);
      }
    }

    for (const debuff of relic.debuffs) {
      if (debuff.stacks > 0) {
        this.applyStatusToCombatant(this.enemy, debuff.effect, debuff.stacks);
      }
    }
  }

  private runCardDrawnHooks(_context: RelicHookContext): void {
    for (const relic of this.relicsForTiming('cardDrawn')) {
      this.applyRelicStatusApplications(relic);
    }
  }

  private runBlockGainedHooks(_context: RelicHookContext): void {
    for (const relic of this.relicsForTiming('blockGained')) {
      this.applyRelicStatusApplications(relic);
    }
  }

  private runEnemyDamagedHooks(_context: RelicHookContext): void {
    for (const relic of this.relicsForTiming('enemyDamaged')) {
      this.applyRelicStatusApplications(relic);
    }
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

    const blockFill = this.add.rectangle(x, y - 4, BAR_WIDTH, 12, 0x3a80d7, 0.92);
    blockFill.setOrigin(0, 0.5);
    blockFill.setDepth(hpFill.depth + 2);
    blockFill.setVisible(false);

    const blockShield = this.add.graphics();
    blockShield.setDepth(blockFill.depth + 2);
    blockShield.setVisible(false);
    const blockText = this.add.text(x - 2, y - 3, '', {
      fontFamily: 'Arial',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ffffff',
      align: 'center',
    });
    blockText.setOrigin(0.5);
    blockText.setDepth(blockShield.depth + 1);
    blockText.setVisible(false);

    const epY = y + 23;
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

    return { hpFill, blockFill, blockShield, blockText, epFill, epReserveFill, epReserveStripes, hpX: x, hpY: y, epX: x, epY };
  }

  private createEnergyHud(): void {
    this.energyPanel = this.add.rectangle(24, 552, 132, 96, 0x242a33, 0.95);
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

  private showStatusTooltip(
    status: StatusEffect,
    stacks: number,
    x: number,
    y: number,
    owner: Phaser.GameObjects.Container,
  ): void {
    this.statusTooltipStatus = status;
    this.statusTooltipOwner = owner;
    const description = STATUS_DESCRIPTIONS[status]?.description ?? `${status}: No description.`;
    const stackText = stacks > 1 ? `\nStacks: ${stacks}` : '';
    this.showStatusTooltipText(`${description}${stackText}`, x, y);
  }

  private showCardStatusTooltip(definition: CardDefinition, x: number, y: number): void {
    const descriptions = [...definition.buffs, ...definition.debuffs]
      .filter((status) => status.stacks > 0)
      .map(({ effect }) => STATUS_DESCRIPTIONS[effect]?.description ?? `${effect}: No description.`);

    if (descriptions.length === 0) {
      this.hideStatusTooltip();
      return;
    }

    this.clearStatusTooltipSource();
    this.showStatusTooltipText(descriptions.join('\n\n'), x, y);
  }

  private clearStatusTooltipSource(): void {
    this.statusTooltipStatus = undefined;
    this.statusTooltipOwner = undefined;
  }

  private showStatusTooltipText(text: string, x: number, y: number): void {
    const clampedX = Phaser.Math.Clamp(x, 8, SCREEN_WIDTH - STATUS_TOOLTIP_WIDTH - 8);
    const clampedY = Phaser.Math.Clamp(y, 8, SCREEN_HEIGHT - STATUS_TOOLTIP_HEIGHT - 8);

    this.statusTooltipText.setText(text);
    this.statusTooltip.setPosition(clampedX, clampedY);
    this.statusTooltip.setVisible(true);
  }

  private hideStatusTooltip(): void {
    this.clearStatusTooltipSource();
    this.statusTooltip.setVisible(false);
  }

  private renderStatusIcons(
    container: Phaser.GameObjects.Container,
    statuses: Map<StatusEffect, number>,
    hidden = false,
  ): void {
    if (
      this.statusTooltipOwner === container &&
      (hidden || !this.statusTooltipStatus || !statuses.has(this.statusTooltipStatus))
    ) {
      this.hideStatusTooltip();
    }

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
        this.showStatusTooltip(status, stacks, container.x + x - 16, container.y + 24, container);
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

    if (status === 'Horny') {
      return 0xd45d9c;
    }

    if (status === 'Heat') {
      return 0xc93f69;
    }

    if (status === 'Frustrated') {
      return 0x983553;
    }

    return 0x526075;
  }

  private statusIconText(status: StatusEffect, stacks: number): string {
    const baseText: Record<StatusEffect, string> = {
      Charm: 'Ch',
      Lingering: 'Li',
      Horny: 'Ho',
      Heat: 'Ht',
      Frustrated: 'Fr',
    };
    const suffix = stacks > 1 ? String(Math.min(stacks, 99)) : '';

    return `${baseText[status] ?? status.slice(0, 2)}${suffix}`;
  }

  private restartBattle(): void {
    this.isAnimating = false;
    this.isGameOver = false;
    this.isPlayerTurn = false;
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

  private drawCards(count: number, animate: boolean): CardInstance[] {
    const drawn = this.deck.draw(count, MAX_HAND_SIZE);
    this.renderHand(new Set(drawn.map((card) => card.uid)), animate);
    if (drawn.length > 0) {
      this.runCardDrawnHooks({ player: this.player, amount: drawn.length });
    }
    return drawn;
  }

  private renderHand(animatedDraws = new Set<string>(), animateDraws = false): void {
    const handUids = new Set(this.deck.hand.map((card) => card.uid));
    this.cardViews.forEach((view, uid) => {
      if (!handUids.has(uid) && !this.exitingCardUids.has(uid)) {
        view.container.destroy();
        this.cardViews.delete(uid);
      }
    });

    const displayedHand = this.deck.hand.filter((card) => !this.exitingCardUids.has(card.uid));
    const basePositions = this.handBasePositions(displayedHand);

    displayedHand.forEach((card, index) => {
      const targetX = basePositions.get(card.uid) ?? 640;
      let view = this.cardViews.get(card.uid);
      if (!view) {
        view = this.createCardView(card, targetX, HAND_Y);
        this.cardViews.set(card.uid, view);
      }

      view.baseX = targetX;
      view.baseY = HAND_Y;

      if (animateDraws && animatedDraws.has(card.uid)) {
        view.ready = false;
        view.hitArea.disableInteractive();
        view.container.setX(-120 - index * 24);
        view.container.setY(HAND_Y);
        view.container.setAlpha(0);
        view.container.setScale(1);
        this.tweens.add({
          targets: view.container,
          x: targetX,
          y: HAND_Y,
          alpha: 1,
          scale: 1,
          duration: 320,
          delay: index * 55,
          ease: 'Sine.easeOut',
          onComplete: () => {
            view.container.setAlpha(1);
            view.ready = true;
            view.hitArea.setInteractive({ useHandCursor: true });
            this.updateHandDepths();
          },
        });
      } else {
        view.container.setAlpha(1);
        view.ready = true;
        view.hitArea.setInteractive({ useHandCursor: true });
        this.moveCardTo(view, targetX, HAND_Y, 260);
      }
    });

    if (this.hoveredCardUid) {
      this.applyHoverLayout(220);
    } else {
      this.updateHandDepths();
    }
    this.updateHud();
  }

  private handBasePositions(cards: CardInstance[]): Map<string, number> {
    const positions = new Map<string, number>();
    const count = cards.length;
    if (count === 0) {
      return positions;
    }

    const totalWidth = count > 1 ? Math.min((count - 1) * HAND_CARD_GAP, HAND_MAX_X - HAND_MIN_X) : 0;
    const gap = count > 1 ? totalWidth / (count - 1) : 0;
    const startX = HAND_CENTER_X - totalWidth / 2;
    cards.forEach((card, index) => {
      positions.set(card.uid, startX + index * gap);
    });

    return positions;
  }

  private moveCardTo(view: CardView, x: number, y: number, duration: number, scale = 1): void {
    this.tweens.killTweensOf(view.container);
    this.tweens.add({
      targets: view.container,
      x,
      y,
      scale,
      duration,
      ease: 'Sine.easeOut',
    });
  }

  private setHoveredCard(uid?: string): void {
    this.hoveredCardUid = uid;
    this.applyHoverLayout(180);
  }

  private isHandCardReady(view: CardView): boolean {
    return view.ready && !this.exitingCardUids.has(view.card.uid) && this.deck.hand.some((card) => card.uid === view.card.uid);
  }

  private updateHandDepths(): void {
    this.deck.hand
      .filter((card) => !this.exitingCardUids.has(card.uid))
      .forEach((card, index) => {
        const view = this.cardViews.get(card.uid);
        if (view && this.hoveredCardUid !== card.uid) {
          view.container.setDepth(30 + index);
        }
      });
  }

  private applyHoverLayout(duration: number): void {
    const displayedHand = this.deck.hand.filter((card) => !this.exitingCardUids.has(card.uid));
    const hoveredView = this.hoveredCardUid ? this.cardViews.get(this.hoveredCardUid) : undefined;
    if (!this.hoveredCardUid || !hoveredView || !this.isHandCardReady(hoveredView)) {
      this.hoveredCardUid = undefined;
      displayedHand.forEach((card) => {
        const view = this.cardViews.get(card.uid);
        if (!view) {
          return;
        }
        this.moveCardTo(view, view.baseX, view.baseY, duration, 1);
      });
      this.updateHandDepths();
      return;
    }

    const removedPositions = this.handBasePositions(displayedHand.filter((card) => card.uid !== this.hoveredCardUid));
    displayedHand.forEach((card, index) => {
      const view = this.cardViews.get(card.uid);
      if (!view) {
        return;
      }
      const uid = card.uid;
      if (uid === this.hoveredCardUid) {
        view.container.setDepth(1000);
        this.moveCardTo(view, view.baseX, view.baseY - 28, duration, 1.08);
        return;
      }

      const removedX = removedPositions.get(uid) ?? view.baseX;
      const halfwayX = view.baseX + (removedX - view.baseX) * 0.5;
      view.container.setDepth(30 + index);
      this.moveCardTo(view, halfwayX, view.baseY, duration, 1);
    });
  }

  private animateCardToDiscard(cardView: Phaser.GameObjects.Container, onComplete: () => void): void {
    cardView.setAlpha(1);
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

  private animateCardExhaust(cardView: Phaser.GameObjects.Container, onComplete: () => void): void {
    cardView.setAlpha(1);
    this.tweens.add({
      targets: cardView,
      alpha: 0,
      scale: 0.82,
      duration: 500,
      ease: 'Sine.easeIn',
      onComplete,
    });
  }

  private markCardExiting(cardUid: string): void {
    const view = this.cardViews.get(cardUid);
    if (!view) {
      return;
    }

    view.ready = false;
    view.hitArea.disableInteractive();
    this.exitingCardUids.add(cardUid);
  }

  private removeExitingCard(cardUid: string): void {
    const view = this.cardViews.get(cardUid);
    if (view) {
      view.container.destroy();
      this.cardViews.delete(cardUid);
    }
    this.exitingCardUids.delete(cardUid);
  }

  private animateCardsAddedFromPlayer(cardUids: Set<string>): Promise<void> {
    const views = Array.from(cardUids)
      .map((uid) => this.cardViews.get(uid))
      .filter((view): view is CardView => Boolean(view));

    if (views.length === 0) {
      return Promise.resolve();
    }

    let completed = 0;
    return new Promise((resolve) => {
      views.forEach((view, index) => {
        const targetX = view.container.x;
        const targetY = view.container.y;
        view.ready = false;
        view.hitArea.disableInteractive();
        view.container.setPosition(270, 315);
        view.container.setAlpha(0);
        view.container.setScale(0.62);
        view.container.setDepth(1600 + index);
        this.tweens.add({
          targets: view.container,
          x: targetX,
          y: targetY,
          alpha: 1,
          scale: 1,
          duration: 500,
          delay: index * 70,
          ease: 'Sine.easeOut',
          onComplete: () => {
            view.container.setAlpha(1);
            view.ready = true;
            view.hitArea.setInteractive({ useHandCursor: true });
            this.updateHandDepths();
            completed += 1;
            if (completed === views.length) {
              resolve();
            }
          },
        });
      });
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

    const renderedEffect = this.cardEffectDisplay(card.definition);
    const effectText = this.add.container(0, 0);
    this.renderCardEffectText(effectText, renderedEffect.lines);

    container.add([bg, costCircle, costText, nameText, effectText]);
    container.setSize(CARD_WIDTH, CARD_HEIGHT);
    container.setDepth(30);
    bg.setInteractive({ useHandCursor: true });
    const view: CardView = { card, container, hitArea: bg, effectText, baseX: x, baseY: y, ready: true };

    bg.on('pointerover', () => {
      if (this.isGameOver || !this.isHandCardReady(view)) {
        return;
      }
      this.setHoveredCard(card.uid);
      bg.setFillStyle(cardColor);
      bg.setStrokeStyle(4, 0xfff4bd, 1);
      const hoveredCardTop = view.baseY - 28 - (CARD_HEIGHT * 1.08) / 2;
      this.showCardStatusTooltip(
        card.definition,
        view.baseX - STATUS_TOOLTIP_WIDTH / 2,
        hoveredCardTop - STATUS_TOOLTIP_HEIGHT - 4,
      );
    });

    bg.on('pointerout', () => {
      if (!this.isHandCardReady(view)) {
        return;
      }
      if (this.hoveredCardUid === card.uid) {
        this.setHoveredCard(undefined);
      }
      bg.setFillStyle(cardColor);
      bg.setStrokeStyle(3, 0x38312a, 1);
      this.hideStatusTooltip();
    });

    bg.on('pointerup', () => {
      if (!this.isHandCardReady(view)) {
        return;
      }
      this.playCard(card, container, bg);
    });

    return view;
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

  private cardEffectDisplay(definition: CardDefinition): { lines: CardEffectLine[] } {
    const lines: CardEffectLine[] = [];

    if (definition.hpDamage > 0 && definition.hpDamageTimes > 0) {
      lines.push([
        { text: 'Deal ' },
        { text: String(definition.hpDamage) },
        ...(definition.hpDamageTimes > 1 ? [{ text: ` x${definition.hpDamageTimes}` }] : []),
        { text: ' HP damage.' },
      ]);
    }

    if (definition.epDamage > 0 && definition.epDamageTimes > 0) {
      const modifiedEpDamage = this.modifiedEnemyEpDamageForCard(definition, definition.epDamage);
      const isModified = modifiedEpDamage !== definition.epDamage;
      lines.push([
        { text: 'Deal ' },
        { text: String(modifiedEpDamage), bold: isModified },
        ...(definition.epDamageTimes > 1 ? [{ text: ` x${definition.epDamageTimes}` }] : []),
        { text: ' EP damage.' },
      ]);
    }

    const selfEpDamage = this.cardSelfEpDamageAmount(definition);
    if (selfEpDamage > 0 && definition.selfEpDamageTimes > 0) {
      const modifiedSelfEpDamage = this.modifiedPlayerEpDamageForCard(definition, selfEpDamage);
      const isModified = modifiedSelfEpDamage !== selfEpDamage;
      lines.push([
        { text: 'Take ' },
        { text: String(modifiedSelfEpDamage), bold: isModified },
        ...(definition.selfEpDamageTimes > 1 ? [{ text: ` x${definition.selfEpDamageTimes}` }] : []),
        { text: ' EP damage.' },
      ]);
    }

    if (definition.selfHpDamage > 0 && definition.selfHpDamageTimes > 0) {
      lines.push([
        { text: 'Take ' },
        { text: String(definition.selfHpDamage) },
        ...(definition.selfHpDamageTimes > 1 ? [{ text: ` x${definition.selfHpDamageTimes}` }] : []),
        { text: ' HP damage.' },
      ]);
    }

    if (definition.block > 0) {
      lines.push([{ text: `Gain ${definition.block} block.` }]);
    }

    for (const buff of definition.buffs) {
      if (buff.stacks > 0) {
        lines.push([{ text: `Apply ${buff.effect}${buff.stacks > 1 ? ` x${buff.stacks}` : ''}.` }]);
      }
    }

    for (const debuff of definition.debuffs) {
      if (debuff.stacks > 0) {
        lines.push([{ text: `Apply ${debuff.effect}${debuff.stacks > 1 ? ` x${debuff.stacks}` : ''}.` }]);
      }
    }

    if (definition.hpHeal > 0) {
      lines.push([{ text: `Heal ${definition.hpHeal} HP.` }]);
    }

    if (definition.epHeal > 0) {
      const effectiveHeal = Math.max(0, this.player.ep - Math.max(this.playerEpReserveValue, this.player.ep - definition.epHeal));
      lines.push([{ text: `Recover ${effectiveHeal} EP.` }]);
    }

    if (definition.epReserveHeal > 0) {
      lines.push([{ text: `Recover ${definition.epReserveHeal} EP reserve.` }]);
    }

    if (definition.drawCards > 0) {
      lines.push([{ text: `Draw ${definition.drawCards}.` }]);
    }

    if (definition.energyGain > 0) {
      lines.push([{ text: `Gain ${definition.energyGain} energy.` }]);
    }

    if (definition.exhaust) {
      lines.push([{ text: 'Exhaust.' }]);
    }

    return { lines: lines.length > 0 ? lines : definition.description.split('\n').map((text) => [{ text }]) };
  }

  private renderCardEffectText(container: Phaser.GameObjects.Container, lines: CardEffectLine[]): void {
    container.removeAll(true);

    const lineHeight = 22;
    const maxWidth = CARD_WIDTH - 24;
    const startY = 22 - ((lines.length - 1) * lineHeight) / 2;

    lines.forEach((line, lineIndex) => {
      const lineContainer = this.add.container(0, startY + lineIndex * lineHeight);
      const textObjects = line.map((segment) => {
        const text = this.add.text(0, 0, segment.text, {
          fontFamily: 'Arial',
          fontSize: '15px',
          color: '#2d3742',
          fontStyle: segment.bold ? 'bold' : 'normal',
        });
        text.setOrigin(0, 0.5);
        return text;
      });
      const totalWidth = textObjects.reduce((sum, text) => sum + text.width, 0);
      let x = -totalWidth / 2;
      textObjects.forEach((text) => {
        text.setX(x);
        x += text.width;
      });
      lineContainer.add(textObjects);
      if (totalWidth > maxWidth) {
        lineContainer.setScale(maxWidth / totalWidth, 1);
      }
      container.add(lineContainer);
    });
  }

  private updateCardEffectTexts(): void {
    this.cardViews.forEach((view) => {
      const renderedEffect = this.cardEffectDisplay(view.card.definition);
      this.renderCardEffectText(view.effectText, renderedEffect.lines);
    });
  }

  private playCard(
    card: CardInstance,
    container: Phaser.GameObjects.Container,
    hitArea: Phaser.GameObjects.Rectangle,
  ): void {
    const view = this.cardViews.get(card.uid);
    if (this.isAnimating || this.isGameOver || this.enemy.isDefeated) {
      return;
    }

    if (!view || !this.isHandCardReady(view)) {
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
    this.hoveredCardUid = undefined;
    this.hideStatusTooltip();
    this.markCardExiting(card.uid);
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
          if (this.isGameOver) {
            return;
          }

          if (card.definition.exhaust) {
            this.deck.exhaust(card.uid);
            this.renderHand();
            this.animateCardExhaust(container, () => {
              this.removeExitingCard(card.uid);
              this.isAnimating = false;
              this.updateHud();
            });
            return;
          }

          this.deck.discard(card.uid);
          this.renderHand();
          const discardDelay = targetsEnemy ? 0 : 180;
          this.time.delayedCall(discardDelay, () => this.animateCardToDiscard(container, () => {
            this.removeExitingCard(card.uid);
            this.isAnimating = false;
            this.updateHud();
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

    for (const buff of definition.buffs) {
      if (buff.stacks <= 0) {
        continue;
      }
      const applied = this.applyStatusToCombatant(this.player, buff.effect, buff.stacks);
      messages.push(`${definition.name}: ${applied}`);
    }

    for (const debuff of definition.debuffs) {
      if (debuff.stacks <= 0) {
        continue;
      }
      const applied = this.applyStatusToCombatant(this.enemy, debuff.effect, debuff.stacks);
      messages.push(`${definition.name}: ${applied}`);
    }

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
      this.runEnemyDamagedHooks({ enemy: this.enemy, card: definition, amount: totalHpDamage });
    }

    let totalEpDamage = 0;
    let enemyEpPeaked = false;
    for (let i = 0; i < definition.epDamageTimes; i += 1) {
      if (definition.epDamage <= 0) {
        continue;
      }
      const modifiedEpDamage = this.modifiedEnemyEpDamageForCard(definition, definition.epDamage);
      this.playDamageEffect(definition.attackAttribute, 910, 300);
      this.showDamageNumber(modifiedEpDamage, 910, 300, 'ep');
      enemyEpPeaked = (await this.applyEnemyEpDamage(modifiedEpDamage)) || enemyEpPeaked;
      totalEpDamage += modifiedEpDamage;
      if (this.enemy.isDefeated) {
        break;
      }
    }

    if (definition.epDamage > 0 && definition.epDamageTimes > 0) {
      if (!enemyEpPeaked) {
        this.flashEnemy();
      }
      messages.push(`${definition.name}: ${totalEpDamage} EP damage`);
      this.runEnemyDamagedHooks({ enemy: this.enemy, card: definition, amount: totalEpDamage });
    }

    if (definition.block > 0) {
      this.player.block += definition.block;
      this.showShieldEffect(270, 315);
      messages.push(`${definition.name}: +${definition.block} block`);
      this.runBlockGainedHooks({ player: this.player, card: definition, amount: definition.block });
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
      const rawSelfEpDamage = this.cardSelfEpDamageAmount(definition);
      if (rawSelfEpDamage <= 0) {
        continue;
      }
      const modifiedSelfEpDamage = this.modifiedPlayerEpDamage(rawSelfEpDamage);
      this.playDamageEffect('love', 270, 315);
      this.showDamageNumber(modifiedSelfEpDamage, 270, 315, 'ep');
      selfEpPeaked = (await this.applyPlayerEpDamage(rawSelfEpDamage)) || selfEpPeaked;
      selfEpDamage += modifiedSelfEpDamage;
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

    if (definition.hpHeal > 0) {
      this.player.healHp(definition.hpHeal);
      this.healingEffect();
      messages.push(`${definition.name}: heal ${definition.hpHeal} HP`);
    }

    if (definition.epHeal > 0) {
      await this.applyPlayerEpHeal(definition.epHeal);
      messages.push(`${definition.name}: recover ${definition.epHeal} EP`);
    }

    if (definition.epReserveHeal > 0) {
      const nextReserveValue = Math.max(0, this.playerEpReserveValue - definition.epReserveHeal);
      this.setPlayerEpReserveValue(nextReserveValue, this.player.maxEp, true);
      messages.push(`${definition.name}: recover ${definition.epReserveHeal} EP reserve`);
    }

    if (definition.drawCards > 0) {
      const drawn = this.drawCards(definition.drawCards, true);
      messages.push(`${definition.name}: draw ${drawn.length}`);
    }

    if (definition.energyGain > 0) {
      const beforeEnergy = this.player.energy;
      this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + definition.energyGain);
      messages.push(`${definition.name}: +${this.player.energy - beforeEnergy} energy`);
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

    const hookMessages = await this.runEnemyEpPeakHooks({ enemy: this.enemy, player: this.player });
    this.enemyEpPeakBarOverride = true;
    this.enemy.resetEpAfterPeak();
    this.updateHud();
    this.setEpFillImmediate(this.enemyBars, this.enemy.ep, this.enemy.maxEp);
    this.enemyEpPeakBarOverride = false;
    this.showMessage(hookMessages.length > 0 ? `Enemy EP peak: ${hookMessages.join(' / ')}` : 'Enemy EP peak');
  }

  private async runEnemyEpPeakHooks(context: RelicHookContext): Promise<string[]> {
    const messages: string[] = [];

    for (const relic of this.relicsForTiming('enemyEpPeak')) {
      const hpDrain = this.resolveHpDrainAmount(relic, context);
      if (hpDrain > 0 && context.enemy && context.player) {
        const beforeEnemyHp = context.enemy.hp;
        context.player.healHp(hpDrain);
        this.healingEffect();
        this.hpDrainEffect(910, 300, 270, 315);
        context.enemy.takeDirectHpDamage(hpDrain);
        this.showHpDamageBarChip(this.enemyBars, beforeEnemyHp, context.enemy.hp, context.enemy.maxHp);
        this.showDamageNumber(hpDrain, 910, 300, 'hp');
        this.runEnemyDamagedHooks({ enemy: context.enemy, player: context.player, amount: hpDrain });
        messages.push(`${relic.name}: drain ${hpDrain}`);
      }

      this.applyRelicStatusApplications(relic);
    }

    return messages;
  }

  private resolveHpDrainAmount(relic: RelicDefinition, context: RelicHookContext): number {
    if (relic.hpDrain === 'targetMaxEp') {
      return context.enemy?.maxEp ?? 0;
    }

    return relic.hpDrain;
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
    let remaining = this.modifiedPlayerEpDamage(amount);
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
      this.clearPlayerArousalOnEpPeak();
      this.updateHud();
      this.setEpFillImmediate(this.playerBars, this.player.ep, this.player.maxEp);
      this.playerEpPeakBarOverride = false;
      if (remaining > 0) {
        await this.wait(130);
      }
    }

    return peaked;
  }

  private async applyPlayerEpHeal(amount: number): Promise<void> {
    this.player.ep = Math.max(this.playerEpReserveValue, this.player.ep - amount);
    this.updateHud();
    await this.animateEpFillTo(this.playerBars, this.player.ep, this.player.maxEp, 'player', 320);
  }

  private cardSelfEpDamageAmount(definition: CardDefinition): number {
    return definition.selfEpDamage + Math.ceil(this.player.maxEp * definition.selfEpDamagePercent);
  }

  private modifiedPlayerEpDamage(amount: number): number {
    return Math.ceil(amount * this.playerEpDamageMultiplier());
  }

  private modifiedEnemyEpDamageForCard(_definition: CardDefinition, amount: number): number {
    return this.modifiedEnemyEpDamage(amount);
  }

  private modifiedEnemyEpDamage(amount: number): number {
    if (amount <= 0) {
      return amount;
    }

    const passiveBonus = this.relicsForTiming('passive').reduce((sum, relic) => sum + relic.epDamage, 0);
    return amount + passiveBonus;
  }

  private modifiedPlayerEpDamageForCard(definition: CardDefinition, amount: number): number {
    let arousalStatus = this.currentPlayerArousalStatus();
    for (const buff of definition.buffs) {
      if (buff.stacks > 0 && this.isArousalStatus(buff.effect)) {
        arousalStatus = this.nextArousalStatus(arousalStatus, buff.effect);
      }
    }

    return Math.ceil(amount * this.epDamageMultiplierForArousal(arousalStatus));
  }

  private playerEpDamageMultiplier(): number {
    return this.epDamageMultiplierForArousal(this.currentPlayerArousalStatus());
  }

  private currentPlayerArousalStatus(): StatusEffect | undefined {
    if (this.statusHasTiming('Frustrated', 'damageCalculation') && this.player.hasStatus('Frustrated')) {
      return 'Frustrated';
    }

    if (this.statusHasTiming('Heat', 'damageCalculation') && this.player.hasStatus('Heat')) {
      return 'Heat';
    }

    if (this.statusHasTiming('Horny', 'damageCalculation') && this.player.hasStatus('Horny')) {
      return 'Horny';
    }

    return undefined;
  }

  private epDamageMultiplierForArousal(status: StatusEffect | undefined): number {
    if (status === 'Frustrated') {
      return 3;
    }

    if (status === 'Heat') {
      return 2;
    }

    if (status === 'Horny') {
      return 1.5;
    }

    return 1;
  }

  private applyStatusToCombatant(target: Player | Enemy, status: StatusEffect, stacks: number): string {
    if (target instanceof Enemy && status === 'Charm' && target.definition.intents_E.length === 0) {
      this.showMissEffect(910, 300);
      return 'Charm miss';
    }

    if (target === this.player && this.isArousalStatus(status)) {
      return this.applyPlayerArousalStatus(status);
    }

    target.addStatus(status, stacks);
    return stacks > 1 ? `${status} x${stacks}` : status;
  }

  private isArousalStatus(status: StatusEffect): boolean {
    return status === 'Horny' || status === 'Heat' || status === 'Frustrated';
  }

  private applyPlayerArousalStatus(status: StatusEffect): string {
    const nextStatus = this.nextPlayerArousalStatus(status);
    this.player.statuses.delete('Horny');
    this.player.statuses.delete('Heat');
    this.player.statuses.delete('Frustrated');
    this.player.addStatus(nextStatus);
    return nextStatus;
  }

  private nextPlayerArousalStatus(status: StatusEffect): StatusEffect {
    return this.nextArousalStatus(this.currentPlayerArousalStatus(), status);
  }

  private nextArousalStatus(current: StatusEffect | undefined, incoming: StatusEffect): StatusEffect {
    if (current === 'Frustrated' || incoming === 'Frustrated') {
      return 'Frustrated';
    }

    if (current === 'Heat') {
      return 'Frustrated';
    }

    if (current === 'Horny') {
      return incoming === 'Horny' ? 'Heat' : 'Frustrated';
    }

    return incoming === 'Heat' ? 'Heat' : 'Horny';
  }

  private clearPlayerArousalOnEpPeak(): void {
    if (
      !this.statusHasTiming('Horny', 'playerEpPeak') &&
      !this.statusHasTiming('Heat', 'playerEpPeak') &&
      !this.statusHasTiming('Frustrated', 'playerEpPeak')
    ) {
      return;
    }

    const hadArousal =
      this.player.hasStatus('Horny') ||
      this.player.hasStatus('Heat') ||
      this.player.hasStatus('Frustrated');

    if (!hadArousal) {
      return;
    }

    this.player.statuses.delete('Horny');
    this.player.statuses.delete('Heat');
    this.player.statuses.delete('Frustrated');
    if (this.isPlayerTurn) {
      this.player.energy += 1;
    }
  }

  private async addRubOneCardsFromArousal(): Promise<void> {
    if (
      !this.statusHasTiming('Horny', 'turnStart') &&
      !this.statusHasTiming('Heat', 'turnStart') &&
      !this.statusHasTiming('Frustrated', 'turnStart')
    ) {
      return;
    }

    const count = this.rubOneCardsForArousal();
    if (count <= 0) {
      return;
    }

    const addedUids = new Set<string>();
    for (let i = 0; i < count; i += 1) {
      const card = this.deck.addToHand(CARD_DEFINITIONS.rubOne, MAX_HAND_SIZE);
      if (this.deck.hand.some((handCard) => handCard.uid === card.uid)) {
        addedUids.add(card.uid);
      }
    }

    this.renderHand();
    await this.animateCardsAddedFromPlayer(addedUids);
  }

  private rubOneCardsForArousal(): number {
    if (this.player.hasStatus('Frustrated')) {
      return 5;
    }

    if (this.player.hasStatus('Heat')) {
      return 2;
    }

    if (this.player.hasStatus('Horny')) {
      return 1;
    }

    return 0;
  }

  private endTurn(): void {
    if (this.isAnimating || this.isGameOver) {
      return;
    }

    this.isAnimating = true;
    this.isPlayerTurn = false;
    this.showMessage('Enemy turn');

    const cardsToDiscard = this.deck.hand
      .map((card) => ({ uid: card.uid, container: this.cardViews.get(card.uid)?.container }))
      .filter((entry): entry is { uid: string; container: Phaser.GameObjects.Container } => Boolean(entry.container));

    cardsToDiscard.forEach(({ uid }) => this.markCardExiting(uid));

    const finishDiscard = () => {
      this.deck.discardHand();
      cardsToDiscard.forEach(({ uid }) => this.removeExitingCard(uid));
      this.renderHand();
      this.time.delayedCall(350, () => this.enemyAction());
    };

    if (cardsToDiscard.length === 0) {
      finishDiscard();
      return;
    }

    let completed = 0;
    cardsToDiscard.forEach(({ container }, index) => {
      container.setAlpha(1);
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
    const messages: string[] = [];
    if (intent.damageType === 'ep') {
      const modifiedAmount = this.modifiedPlayerEpDamage(intent.amount);
      this.enemyEpAttackMotion();
      this.playDamageEffect('love', 270, 315);
      this.showDamageNumber(modifiedAmount, 270, 315, 'ep');
      const peaked = await this.applyPlayerEpDamage(intent.amount);
      if (intent.causedByStatus === 'Charm') {
        this.enemy.consumeStatus('Charm');
        this.enemy.clearCharmIntent();
      }
      if (!peaked) {
        this.flashPlayer();
      }
      messages.push(peaked ? 'Player EP peak: Lingering' : `Enemy dealt ${modifiedAmount} EP damage`);
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
      messages.push(`Enemy attacked: ${damage} HP damage`);
    }

    await this.applyEnemySelfDamage(intent, messages);
    this.updateHud();
    this.enemy.advanceIntent(intent);

    if (this.player.isDefeated) {
      this.defeatPlayer();
      return;
    }

    if (this.enemy.isDefeated) {
      this.defeatEnemy();
      return;
    }

    if (messages.length > 0) {
      this.showMessage(messages.join(' / '));
    }

    this.time.delayedCall(650, () => this.startNextTurn());
  }

  private async applyEnemySelfDamage(intent: ReturnType<Enemy['currentIntent']>, messages: string[]): Promise<void> {
    if (intent.selfHpDamage > 0) {
      const beforeHp = this.enemy.hp;
      this.enemy.takeDirectHpDamage(intent.selfHpDamage);
      this.showHpDamageBarChip(this.enemyBars, beforeHp, this.enemy.hp, this.enemy.maxHp);
      this.playDamageEffect(intent.attackAttribute, 910, 300);
      this.showDamageNumber(intent.selfHpDamage, 910, 300, 'hp');
      this.flashEnemy();
      this.runEnemyDamagedHooks({ enemy: this.enemy, amount: intent.selfHpDamage });
      messages.push(`Enemy self ${intent.selfHpDamage} HP damage`);
    }

    if (intent.selfEpDamage > 0 && !this.enemy.isDefeated) {
      this.playDamageEffect('love', 910, 300);
      this.showDamageNumber(intent.selfEpDamage, 910, 300, 'ep');
      const peaked = await this.applyEnemyEpDamage(intent.selfEpDamage);
      if (!peaked) {
        this.flashEnemy();
      }
      this.runEnemyDamagedHooks({ enemy: this.enemy, amount: intent.selfEpDamage });
      messages.push(peaked ? `Enemy self ${intent.selfEpDamage} EP damage / EP peak` : `Enemy self ${intent.selfEpDamage} EP damage`);
    }
  }

  private async startNextTurn(): Promise<void> {
    this.isPlayerTurn = true;
    this.player.startTurn();
    this.syncPlayerEpReserveAfterTurnRecovery();
    this.updateHud();
    await this.runTurnStartHooks();
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

  private hpDrainEffect(fromX: number, fromY: number, toX: number, toY: number): void {
    for (let i = 0; i < 7; i += 1) {
      const plus = this.add.text(fromX + Phaser.Math.Between(-34, 34), fromY + Phaser.Math.Between(-34, 34), '+', {
        fontFamily: 'Arial',
        fontSize: '44px',
        fontStyle: 'bold',
        color: '#70f29a',
      });
      plus.setOrigin(0.5);
      plus.setDepth(1450);
      this.tweens.add({
        targets: plus,
        x: toX + Phaser.Math.Between(-44, 44),
        y: toY + Phaser.Math.Between(-54, 28),
        scale: 1.35,
        alpha: 0,
        duration: 700,
        delay: i * 70,
        ease: 'Sine.easeInOut',
        onComplete: () => plus.destroy(),
      });
    }
  }

  private legacyHpAbsorbEffect(): void {
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

  private async runTurnStartHooks(): Promise<void> {
    await this.consumeLingeringAtTurnStart();
    await this.addRubOneCardsFromArousal();

    for (const relic of this.relicsForTiming('turnStart')) {
      this.applyRelicStatusApplications(relic);
    }
  }

  private async consumeLingeringAtTurnStart(): Promise<void> {
    if (!this.statusHasTiming('Lingering', 'turnStart')) {
      return;
    }

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

  private showMissEffect(x: number, y: number): void {
    const text = this.add.text(x, y, 'MISS', {
      fontFamily: 'Arial',
      fontSize: '34px',
      fontStyle: 'bold',
      color: '#cbd5e1',
      stroke: '#111827',
      strokeThickness: 5,
    });
    text.setOrigin(0.5);
    text.setDepth(2600);
    this.tweens.add({
      targets: text,
      y: y - 42,
      alpha: 0,
      duration: 760,
      ease: 'Sine.easeOut',
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
    const renderedIntent = this.enemyIntentDisplay(intent);
    this.renderEnemyIntentText(renderedIntent.segments, intent.damageType === 'hp' ? '#ff6b72' : '#ff73b8');
    this.energyText.setText(`${this.player.energy}/${this.player.maxEnergy}`);
    this.pileHud.setText(
      `Deck: ${this.deck.drawPile.length}   Hand: ${this.deck.hand.length}   Discard: ${this.deck.discardPile.length}`,
    );
    this.renderStatusIcons(this.playerStatusIcons, this.player.statuses);
    this.renderStatusIcons(this.enemyStatusIcons, this.enemy.statuses, this.enemy.isDefeated);
    this.updateCardEffectTexts();
  }

  private enemyIntentDisplay(intent: ReturnType<Enemy['currentIntent']>): { segments: CardEffectSegment[] } {
    const modifiedAmount = intent.damageType === 'ep' ? this.modifiedPlayerEpDamage(intent.amount) : intent.amount;
    const modified = modifiedAmount !== intent.amount;
    const prefix = intent.causedByStatus ? `${intent.causedByStatus}: ` : '';
    const segments: CardEffectSegment[] = [
      { text: `${prefix}${intent.label} ` },
      { text: String(modifiedAmount), bold: modified },
    ];

    if (intent.selfHpDamage > 0 || intent.selfEpDamage > 0) {
      segments.push({ text: ' / self ' });
      segments.push({ text: String(intent.selfHpDamage + intent.selfEpDamage) });
    }

    return {
      segments,
    };
  }

  private renderEnemyIntentText(segments: CardEffectSegment[], color: string): void {
    this.intentText.removeAll(true);

    const textObjects = segments.map((segment) => {
      const text = this.add.text(0, 0, segment.text, {
        fontFamily: 'Arial',
        fontSize: '20px',
        fontStyle: segment.bold ? 'bold' : 'normal',
        color,
      });
      text.setOrigin(0, 0.5);
      return text;
    });
    const totalWidth = textObjects.reduce((sum, text) => sum + text.width, 0);
    const bg = this.add.rectangle(0, 0, totalWidth + 24, 38, 0x1f2329, 1);
    bg.setOrigin(0.5);

    let x = -totalWidth / 2;
    textObjects.forEach((text) => {
      text.setX(x);
      x += text.width;
    });

    this.intentText.add([bg, ...textObjects]);
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

  private syncPlayerEpReserveAfterTurnRecovery(): void {
    const nextReserveValue = Math.min(this.playerEpReserveValue, this.player.ep);
    if (nextReserveValue !== this.playerEpReserveValue) {
      this.setPlayerEpReserveValue(nextReserveValue, this.player.maxEp, true);
    }
  }

  private updateHudBlockShield(bars: HudBars, block: number): void {
    if (block <= 0) {
      bars.blockFill.setVisible(false);
      bars.blockShield.setVisible(false);
      bars.blockText.setVisible(false);
      return;
    }

    bars.blockFill.displayWidth = BAR_WIDTH * Phaser.Math.Clamp(block / this.maxHpForBars(bars), 0, 1);
    bars.blockFill.setVisible(true);

    const x = bars.hpX - 24;
    const y = bars.hpY - 14;
    const points = [
      new Phaser.Math.Vector2(x, y),
      new Phaser.Math.Vector2(x + 24, y),
      new Phaser.Math.Vector2(x + 24, y + 16),
      new Phaser.Math.Vector2(x + 12, y + 27),
      new Phaser.Math.Vector2(x, y + 16),
    ];

    bars.blockShield.clear();
    bars.blockShield.fillStyle(0x2f7fdd, 0.96);
    bars.blockShield.lineStyle(2, 0xd8ecff, 0.98);
    bars.blockShield.fillPoints(points, true);
    bars.blockShield.strokePoints(points, true);
    bars.blockShield.setVisible(true);

    bars.blockText.setText(String(block));
    bars.blockText.setPosition(x + 12, y + 12);
    bars.blockText.setVisible(true);
  }

  private maxHpForBars(bars: HudBars): number {
    return bars === this.playerBars ? this.player.maxHp : this.enemy.maxHp;
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
