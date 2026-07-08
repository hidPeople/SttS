import Phaser from 'phaser';
import { CARD_DEFINITIONS, createDeckDefinitions } from '../data/cards';
import { ENEMY_DEFINITIONS } from '../data/enemies';
import { PLAYER_DEFINITION } from '../data/player';
import { RELIC_DEFINITIONS } from '../data/relics';
import { STATUS_DESCRIPTIONS, statusTriggersForTiming } from '../data/statuses';
import { Enemy, Player } from '../models/Combatants';
import { Deck } from '../models/Deck';
import { RUN_STATE, currentEncounterThreat, resetRunState, saveRunVitals } from '../models/RunState';
import type {
  AttackAttribute,
  CardDefinition,
  CardInstance,
  EffectDefinition,
  EffectTiming,
  RelicDefinition,
  RelicTriggerDefinition,
  StatusDefinition,
  StatusEffect,
  StatusTriggerDefinition,
} from '../models/types';

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
  color?: string;
};

type CardEffectLine = CardEffectSegment[];

type RelicHookContext = {
  enemy?: Enemy;
  player?: Player;
  card?: CardDefinition;
  amount?: number;
};

type IndexedRelicTrigger = {
  relic: RelicDefinition;
  trigger: RelicTriggerDefinition;
};

type StatusHookContext = {
  enemy?: Enemy;
  player?: Player;
  card?: CardDefinition;
  amount?: number;
  statusOwner?: Player | Enemy;
  status?: StatusEffect;
  purgeCausedEpPeak?: boolean;
};

type IndexedStatusTrigger = {
  status: StatusEffect;
  definition: StatusDefinition;
  trigger: StatusTriggerDefinition;
  owner: Player | Enemy;
};

type HudBars = {
  hpBg: Phaser.GameObjects.Rectangle;
  hpFill: Phaser.GameObjects.Rectangle;
  hpText: Phaser.GameObjects.Text;
  blockFill: Phaser.GameObjects.Rectangle;
  blockShield: Phaser.GameObjects.Graphics;
  blockText: Phaser.GameObjects.Text;
  epBg: Phaser.GameObjects.Rectangle;
  epFill: Phaser.GameObjects.Rectangle;
  epText: Phaser.GameObjects.Text;
  epReserveFill: Phaser.GameObjects.Rectangle;
  epReserveStripes: Phaser.GameObjects.Graphics;
  hasEp: boolean;
  hpX: number;
  hpY: number;
  epX: number;
  epY: number;
};

type EnemyView = {
  enemy: Enemy;
  displayName: string;
  area: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Rectangle;
  hudText: Phaser.GameObjects.Text;
  bars: HudBars;
  statusIcons: Phaser.GameObjects.Container;
  intentText: Phaser.GameObjects.Container;
  baseX: number;
  baseY: number;
};

const CARD_WIDTH = 150;
const CARD_HEIGHT = 190;
const HAND_Y = 645;
const MAX_HAND_SIZE = 10;
const HAND_MIN_X = 260;
const HAND_MAX_X = 950;
const HAND_CENTER_X = (HAND_MIN_X + HAND_MAX_X) / 2;
const HAND_CARD_GAP = 132;
const BAR_WIDTH = 190;
const BAR_HEIGHT = 16;
const SCREEN_WIDTH = 1280;
const SCREEN_HEIGHT = 720;
const STATUS_TOOLTIP_WIDTH = 360;
const STATUS_TOOLTIP_HEIGHT = 118;
const EP_PEAK_FLASH_STEP_DURATION = 80;
const EP_PEAK_FLASH_CYCLE_DURATION = EP_PEAK_FLASH_STEP_DURATION * 2;
const EP_PEAK_BASE_FLASH_COUNT = 6;
const EP_FILL_COLOR = 0xf28ac6;
const EP_RESERVE_COLOR = 0x6f0f3b;
export const PLAYER_VISUAL_X = 145;
export const PLAYER_VISUAL_Y = 426;
export const PLAYER_VISUAL_SCALE = 1.5;
export const PLAYER_EFFECT_X = PLAYER_VISUAL_X;
export const PLAYER_EFFECT_Y = PLAYER_VISUAL_Y + 30;

export class BattleScene extends Phaser.Scene {
  private player!: Player;
  private enemy!: Enemy;
  private enemies: Enemy[] = [];
  private enemyViews: EnemyView[] = [];
  private selectedEnemyIndex = 0;
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
  private endTurnButton!: Phaser.GameObjects.Container;
  private endTurnButtonBg!: Phaser.GameObjects.Rectangle;
  private endTurnButtonLabel!: Phaser.GameObjects.Text;
  private turnOverlay!: Phaser.GameObjects.Image;
  private deckPileText!: Phaser.GameObjects.Text;
  private handPileText!: Phaser.GameObjects.Text;
  private discardPileText!: Phaser.GameObjects.Text;
  private pileOverlay!: Phaser.GameObjects.Container;
  private intentText!: Phaser.GameObjects.Container;
  private messageText!: Phaser.GameObjects.Text;
  private statusTooltip!: Phaser.GameObjects.Container;
  private statusTooltipText!: Phaser.GameObjects.Text;
  private statusTooltipStatus?: StatusEffect;
  private statusTooltipOwner?: Phaser.GameObjects.Container;
  private resultOverlay!: Phaser.GameObjects.Container;
  private modalOverlay!: Phaser.GameObjects.Container;
  private relicsByTiming = new Map<EffectTiming, IndexedRelicTrigger[]>();

  private cardViews = new Map<string, CardView>();
  private hoveredCardUid?: string;
  private exitingCardUids = new Set<string>();
  private handInputLocked = false;
  private isAnimating = false;
  private isGameOver = false;
  private isPlayerTurn = false;
  private canEndTurn = false;
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
    this.canEndTurn = false;
    this.playerEpPeakBarOverride = false;
    this.enemyEpPeakBarOverride = false;
    this.playerEpReserveOverride = false;
    this.playerEpReserveValue = 0;
    this.hasRenderedHud = false;
    this.cardViews.clear();
    this.exitingCardUids.clear();
    this.hoveredCardUid = undefined;
    this.handInputLocked = false;
    this.statusTooltipStatus = undefined;
    this.statusTooltipOwner = undefined;
    this.enemies = [];
    this.enemyViews = [];
    this.selectedEnemyIndex = 0;

    this.player = new Player({ ...PLAYER_DEFINITION, relics: [...RUN_STATE.relicIds] });
    this.player.hp = Phaser.Math.Clamp(RUN_STATE.playerHp, 0, this.player.maxHp);
    this.player.ep = Phaser.Math.Clamp(RUN_STATE.playerEp, 0, this.player.maxEp);
    this.player.epPeakCount = RUN_STATE.playerEpPeakCount;
    this.playerEpReserveValue = Phaser.Math.Clamp(RUN_STATE.playerEpReserveValue, 0, this.player.maxEp);
    for (const status of RUN_STATE.playerStatuses) {
      if (status.stacks > 0) {
        this.player.statuses.set(status.effect, status.stacks);
      }
    }
    this.enemies = this.chooseEncounterEnemies(currentEncounterThreat()).map((definition) => new Enemy(definition));
    this.enemy = this.enemies[0];
    this.deck = new Deck(createDeckDefinitions(RUN_STATE.deckIds));
    this.indexPlayerRelics();

    this.createArena();
    this.createPlayer();
    this.createEnemy();
    this.createTurnOverlay();
    this.createHud();
    this.createSettingsButton();
    this.createEndTurnButton();
    this.setPlayerEpReserveValue(this.playerEpReserveValue, this.player.maxEp, false);

    this.runBattleStartHooks();
    void this.startInitialTurn();
  }

  persistRunVitals(): void {
    saveRunVitals(
      this.player.hp,
      this.player.ep,
      this.player.epPeakCount,
      this.playerEpReserveValue,
      this.remainingPlayerStatuses(),
    );
  }

  private remainingPlayerStatuses(): { effect: StatusEffect; stacks: number }[] {
    return Array.from(this.player.statuses.entries())
      .filter(([effect, stacks]) => stacks > 0 && STATUS_DESCRIPTIONS[effect]?.remain === 1)
      .map(([effect, stacks]) => ({ effect, stacks }));
  }

  private async startInitialTurn(): Promise<void> {
    this.isAnimating = true;
    this.setTurnOverlayColor('player');
    this.setEndTurnEnabled(false);
    await this.drawCards(5, true);
    this.isAnimating = false;
    this.setEndTurnEnabled(true);
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
      for (const trigger of relic.triggers) {
        const triggers = this.relicsByTiming.get(trigger.timing) ?? [];
        triggers.push({ relic, trigger });
        this.relicsByTiming.set(trigger.timing, triggers);
      }
    }
  }

  private createArena(): void {
    this.add.rectangle(640, 360, 1280, 720, 0x171a1f);
    this.add.rectangle(640, 460, 1280, 260, 0x20252d);
    this.add.rectangle(640, 590, 1280, 260, 0x111419, 0.94);

    const centerLine = this.add.rectangle(640, 360, 2, 560, 0x39404b, 0.5);
    centerLine.setDepth(0);

  }

  private createTurnOverlay(): void {
    this.ensureTurnOverlayTexture('player');
    this.ensureTurnOverlayTexture('enemy');
    this.turnOverlay = this.add.image(0, 600, 'turn-overlay-player');
    this.turnOverlay.setOrigin(0, 0);
    this.turnOverlay.setDepth(12);
    this.setTurnOverlayColor('player');
  }

  private setTurnOverlayColor(turn: 'player' | 'enemy'): void {
    if (!this.turnOverlay) {
      return;
    }

    this.turnOverlay.setTexture(`turn-overlay-${turn}`);
  }

  private ensureTurnOverlayTexture(turn: 'player' | 'enemy'): void {
    const key = `turn-overlay-${turn}`;
    if (this.textures.exists(key)) {
      return;
    }

    const fadeTop = 600;
    const solidTop = 648;
    const height = SCREEN_HEIGHT - fadeTop;
    const color = turn === 'player' ? '23,61,120' : '123,31,42';
    const texture = this.textures.createCanvas(key, SCREEN_WIDTH, height);
    if (!texture) {
      return;
    }
    const context = texture.getContext();
    const gradient = context.createLinearGradient(0, 0, 0, height);
    const solidStop = Phaser.Math.Clamp((solidTop - fadeTop) / height, 0, 1);

    gradient.addColorStop(0, `rgba(${color}, 0)`);
    gradient.addColorStop(solidStop, `rgba(${color}, 1)`);
    gradient.addColorStop(1, `rgba(${color}, 1)`);
    context.clearRect(0, 0, SCREEN_WIDTH, height);
    context.fillStyle = gradient;
    context.fillRect(0, 0, SCREEN_WIDTH, height);
    texture.refresh();
  }

  private createPlayer(): void {
    this.playerArea = this.add.container(PLAYER_VISUAL_X, PLAYER_VISUAL_Y);
    this.playerArea.setScale(PLAYER_VISUAL_SCALE);

    this.playerBody = this.add.rectangle(0, 20, 185, 260, 0x467fb1, 1);
    this.playerBody.setStrokeStyle(4, 0xb4d8f5, 0.75);

    const head = this.add.circle(0, -135, 48, 0x76b1df);

    this.playerArea.add([this.playerBody, head]);
  }

  private createEnemy(): void {
    const positions = this.enemyPositions(this.enemies.length);
    const displayNames = this.enemyDisplayNames(this.enemies);
    this.enemyViews = this.enemies.map((enemy, index) =>
      this.createEnemyView(enemy, displayNames[index], positions[index].x, positions[index].y),
    );
    this.selectEnemy(0);
    this.createReticle();
  }

  private enemyDisplayNames(enemies: Enemy[]): string[] {
    const nameCounts = new Map<string, number>();
    enemies.forEach((enemy) => nameCounts.set(enemy.name, (nameCounts.get(enemy.name) ?? 0) + 1));

    const occurrences = new Map<string, number>();
    return enemies.map((enemy) => {
      const total = nameCounts.get(enemy.name) ?? 0;
      if (total <= 1) {
        return enemy.name;
      }

      const occurrence = occurrences.get(enemy.name) ?? 0;
      occurrences.set(enemy.name, occurrence + 1);
      return `${enemy.name} ${this.enemyIdentifier(occurrence)}`;
    });
  }

  private enemyIdentifier(index: number): string {
    let value = index;
    let label = '';

    do {
      label = String.fromCharCode(65 + (value % 26)) + label;
      value = Math.floor(value / 26) - 1;
    } while (value >= 0);

    return label;
  }

  private enemyPositions(count: number): { x: number; y: number }[] {
    const startX = 910 - ((count - 1) * 220) / 2;
    return Array.from({ length: count }, (_, index) => ({
      x: startX + index * 220,
      y: 300 + (index % 2) * 44,
    }));
  }

  private createEnemyView(enemy: Enemy, displayName: string, x: number, y: number): EnemyView {
    const area = this.add.container(x, y);
    const shadow = this.add.ellipse(0, 140, 230, 48, 0x0c0f12, 0.6);
    const body = this.add.rectangle(0, 0, 155, 210, 0x8a414d, 1);
    body.setStrokeStyle(4, 0xf0a2a7, 0.75);
    const head = this.add.circle(0, -132, 42, 0xb95d68);
    const hitArea = this.add.rectangle(0, -30, 190, 270, 0xffffff, 0);
    hitArea.setInteractive({ useHandCursor: true });
    hitArea.on('pointerup', () => this.selectEnemyByEnemy(enemy));
    area.add([shadow, body, head, hitArea]);
    area.setScale(0.5);

    const hudText = this.add.text(x - BAR_WIDTH / 2, y + 92, displayName, this.hudStyle(15));
    const bars = this.createHudBars(x - BAR_WIDTH / 2, y + 116, 'enemy', enemy);
    const statusIcons = this.add.container(x - BAR_WIDTH / 2 + 2, this.enemyStatusIconY(enemy, y));
    statusIcons.setDepth(25);
    const intentText = this.add.container(x, y - 110);

    return { enemy, displayName, area, body, hudText, bars, statusIcons, intentText, baseX: x, baseY: y };
  }

  private enemyStatusIconY(enemy: Enemy, baseY: number): number {
    return enemy.maxEp > 0 ? baseY + 174 : baseY + 148;
  }

  private selectEnemyByEnemy(enemy: Enemy): void {
    const index = this.enemyViews.findIndex((view) => view.enemy === enemy);
    if (index >= 0 && !enemy.isDefeated) {
      this.selectEnemy(index);
      this.updateHud();
    }
  }

  private selectEnemy(index: number): void {
    const view = this.enemyViews[index];
    if (!view) {
      return;
    }

    this.selectedEnemyIndex = index;
    this.enemy = view.enemy;
    this.enemyArea = view.area;
    this.enemyBody = view.body;
    this.enemyHud = view.hudText;
    this.enemyBars = view.bars;
    this.enemyStatusIcons = view.statusIcons;
    this.intentText = view.intentText;
    this.updateReticlePosition();
  }

  private selectNextAliveEnemy(): boolean {
    const index = this.enemyViews.findIndex((view) => !view.enemy.isDefeated);
    if (index < 0) {
      return false;
    }

    this.selectEnemy(index);
    return true;
  }

  private createReticle(): void {
    this.reticle = this.add.graphics();
    this.reticle.setDepth(8);
    this.updateReticlePosition();
  }

  private updateReticlePosition(): void {
    if (!this.reticle || !this.enemyArea) {
      return;
    }

    const x = this.enemyArea.x;
    const y = this.enemyArea.y;
    this.reticle.clear();
    this.reticle.lineStyle(3, 0xf3c75f, 1);
    this.reticle.strokeEllipse(x, y, 125, 175);
    this.reticle.lineBetween(x - 62, y, x - 38, y);
    this.reticle.lineBetween(x + 38, y, x + 62, y);
    this.reticle.lineBetween(x, y - 88, x, y - 65);
    this.reticle.lineBetween(x, y + 65, x, y + 88);
  }

  private createHud(): void {
    this.playerBars = this.createHudBars(28, 52, 'player');
    this.playerHud = this.add.text(28, 22, '', this.hudStyle(17));
    this.createEnergyHud();
    this.createStatusIconAreas();
    this.createRelicHud();

    this.createPileHud();
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

    this.pileOverlay = this.add.container(0, 0);
    this.pileOverlay.setDepth(4200);
    this.pileOverlay.setVisible(false);

    this.createStatusTooltip();
  }

  private createPileHud(): void {
    this.deckPileText = this.add.text(34, 658, '', this.hudStyle(17));
    this.handPileText = this.add.text(1060, 660, '', this.hudStyle(17));
    this.discardPileText = this.add.text(1150, 660, '', this.hudStyle(17));
    this.deckPileText.setDepth(35);
    this.handPileText.setDepth(35);
    this.discardPileText.setDepth(35);

    this.makePileLabelInteractive(this.deckPileText, () => this.showPileOverlay('Deck', this.sortedDrawPileForDisplay()));
    this.makePileLabelInteractive(this.discardPileText, () => this.showPileOverlay('Discard', this.deck.discardPile));
  }

  private makePileLabelInteractive(label: Phaser.GameObjects.Text, onClick: () => void): void {
    label.setInteractive({ useHandCursor: true });
    label.on('pointerover', () => {
      label.setColor('#fff4bd');
      label.setStyle({ fontStyle: 'bold' });
    });
    label.on('pointerout', () => {
      label.setColor('#f1f5f9');
      label.setStyle({ fontStyle: 'normal' });
    });
    label.on('pointerup', onClick);
  }

  private sortedDrawPileForDisplay(): CardInstance[] {
    return [...this.deck.drawPile].sort((a, b) => this.cardUidOrder(a.uid) - this.cardUidOrder(b.uid));
  }

  private cardUidOrder(uid: string): number {
    const value = Number(uid.split('-').pop());
    return Number.isFinite(value) ? value : 0;
  }

  private showPileOverlay(titleText: string, cards: CardInstance[]): void {
    this.pileOverlay.removeAll(true);
    this.hideStatusTooltip();

    const shade = this.add.rectangle(640, 360, 1280, 720, 0x050607, 0.5);
    shade.setInteractive({ useHandCursor: true });
    shade.on('pointerup', () => this.hidePileOverlay());

    const panel = this.add.rectangle(640, 360, 1160, 560, 0x242a33, 0.98);
    panel.setStrokeStyle(3, 0x93a4b8, 0.92);
    panel.setInteractive();

    const title = this.add.text(640, 105, `${titleText} (${cards.length})`, {
      fontFamily: 'Arial',
      fontSize: '30px',
      fontStyle: 'bold',
      color: '#f8fafc',
    });
    title.setOrigin(0.5);

    const close = this.createModalButton(1154, 104, 90, 36, 'Close', () => this.hidePileOverlay());
    this.pileOverlay.add([shade, panel, title, close]);

    if (cards.length === 0) {
      const empty = this.add.text(640, 350, 'No cards', {
        fontFamily: 'Arial',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#9caabd',
      });
      empty.setOrigin(0.5);
      this.pileOverlay.add(empty);
    } else {
      cards.forEach((card, index) => {
        const columns = 10;
        const x = 174 + (index % columns) * 104;
        const y = 178 + Math.floor(index / columns) * 128;
        this.pileOverlay.add(this.createCardPreview(card.definition, x, y, 0.62));
      });
    }

    this.pileOverlay.setVisible(true);
  }

  private hidePileOverlay(): void {
    this.pileOverlay.removeAll(true);
    this.pileOverlay.setVisible(false);
  }

  private createCardPreview(definition: CardDefinition, x: number, y: number, scale: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    container.setScale(scale);
    const bg = this.add.rectangle(0, 0, CARD_WIDTH, CARD_HEIGHT, this.cardColor(definition), 1);
    bg.setStrokeStyle(3, 0x38312a, 1);
    const costCircle = this.add.circle(-55, -70, 22, definition.cost === 0 ? 0x5cbf88 : 0x537fc1);
    const costText = this.add.text(-55, -70, String(definition.cost), {
      fontFamily: 'Arial',
      fontSize: '25px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    costText.setOrigin(0.5);
    const name = this.add.text(0, -42, definition.name, {
      fontFamily: 'Arial',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#1e252c',
      align: 'center',
      wordWrap: { width: CARD_WIDTH - 24 },
    });
    name.setOrigin(0.5);
    const text = this.add.text(0, 36, definition.description, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#26313c',
      align: 'center',
      wordWrap: { width: CARD_WIDTH - 24 },
    });
    text.setOrigin(0.5);
    container.add([bg, costCircle, costText, name, text]);
    return container;
  }

  private createStatusIconAreas(): void {
    this.playerStatusIcons = this.add.container(30, 118);
    this.playerStatusIcons.setDepth(25);

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

  private relicTriggersForTiming(timing: EffectTiming): IndexedRelicTrigger[] {
    return this.relicsByTiming.get(timing) ?? [];
  }

  private statusHasTiming(status: StatusEffect, timing: EffectTiming): boolean {
    return statusTriggersForTiming(status, timing).length > 0;
  }

  private statusTriggersForTiming(timing: EffectTiming, context: StatusHookContext = {}): IndexedStatusTrigger[] {
    const triggers: IndexedStatusTrigger[] = [];

    const addTriggers = (owner: Player | Enemy, ownerType: 'player' | 'enemy') => {
      if (context.statusOwner && context.statusOwner !== owner) {
        return;
      }

      for (const [status, stacks] of owner.statuses.entries()) {
        if (stacks <= 0 || (context.status && context.status !== status)) {
          continue;
        }

        const definition = STATUS_DESCRIPTIONS[status];
        if (!definition || !definition.allowedOwners.includes(ownerType)) {
          continue;
        }

        for (const trigger of statusTriggersForTiming(status, timing)) {
          if (this.statusTriggerMatchesConditions(trigger, context)) {
            triggers.push({ status, definition, trigger, owner });
          }
        }
      }
    };

    addTriggers(this.player, 'player');
    for (const view of this.enemyViews) {
      if (!view.enemy.isDefeated) {
        addTriggers(view.enemy, 'enemy');
      }
    }

    return triggers.sort((a, b) => (a.trigger.order ?? 100) - (b.trigger.order ?? 100));
  }

  private statusTriggerMatchesConditions(trigger: StatusTriggerDefinition, context: StatusHookContext): boolean {
    if (!trigger.conditions) {
      return true;
    }

    if (
      trigger.conditions.purgeCausedEpPeak !== undefined &&
      trigger.conditions.purgeCausedEpPeak !== Boolean(context.purgeCausedEpPeak)
    ) {
      return false;
    }

    return true;
  }

  private runBattleStartHooks(): void {
    for (const entry of this.relicTriggersForTiming('battleStart')) {
      void this.applyRelicTriggerEffects(entry, { player: this.player });
    }
  }

  private runCardDrawnHooks(context: RelicHookContext): void {
    for (const entry of this.relicTriggersForTiming('cardDrawn')) {
      void this.applyRelicTriggerEffects(entry, context);
    }
  }

  private runBlockGainedHooks(context: RelicHookContext): void {
    for (const entry of this.relicTriggersForTiming('blockGained')) {
      void this.applyRelicTriggerEffects(entry, context);
    }
  }

  private runEnemyDamagedHooks(context: RelicHookContext): void {
    for (const entry of this.relicTriggersForTiming('enemyDamaged')) {
      void this.applyRelicTriggerEffects(entry, context);
    }
  }

  private async applyRelicTriggerEffects(entry: IndexedRelicTrigger, context: RelicHookContext): Promise<string[]> {
    const messages: string[] = [];

    for (const effect of entry.trigger.effects) {
      const message = await this.applyRelicEffect(entry.relic, effect, context);
      if (message) {
        messages.push(message);
      }
    }

    this.updateHud();
    return messages;
  }

  private async applyRelicEffect(
    relic: RelicDefinition,
    effect: EffectDefinition,
    context: RelicHookContext,
  ): Promise<string | undefined> {
    const targets = this.relicEffectTargets(effect, context);
    if (targets.length === 0) {
      return undefined;
    }

    if (effect.kind === 'drawCards') {
      const drawn = await this.drawCards(this.effectAmount(effect, this.player), true);
      return drawn.length > 0 ? `${relic.name}: draw ${drawn.length}` : undefined;
    }

    if (effect.kind === 'energyGain') {
      const beforeEnergy = this.player.energy;
      this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + this.effectAmount(effect, this.player));
      return this.player.energy > beforeEnergy ? `${relic.name}: +${this.player.energy - beforeEnergy} energy` : undefined;
    }

    for (const target of targets) {
      const amount = this.effectAmount(effect, target);
      if (amount <= 0 && effect.kind !== 'status') {
        continue;
      }

      if (target instanceof Enemy) {
        await this.applyRelicEnemyEffect(relic, effect, target, amount, context);
      } else {
        await this.applyRelicPlayerEffect(relic, effect, amount);
      }
    }

    return `${relic.name}`;
  }

  private async applyRelicEnemyEffect(
    _relic: RelicDefinition,
    effect: EffectDefinition,
    enemy: Enemy,
    amount: number,
    context: RelicHookContext,
  ): Promise<void> {
    const view = this.enemyViewFor(enemy);
    if (!view) {
      return;
    }

    if (effect.kind === 'status' && effect.status) {
      this.applyStatusToCombatant(enemy, effect.status, effect.stacks ?? effect.amount);
      return;
    }

    if (effect.kind === 'hpDrain') {
      const player = context.player ?? this.player;
      const beforeEnemyHp = enemy.hp;
      const beforePlayerHp = player.hp;
      player.healHp(amount);
      const healed = player.hp - beforePlayerHp;
      this.healingEffect();
      this.showHealNumber(healed, PLAYER_EFFECT_X, PLAYER_EFFECT_Y);
      this.hpDrainEffect(this.enemyEffectX(enemy), this.enemyEffectY(enemy), PLAYER_EFFECT_X, PLAYER_EFFECT_Y);
      enemy.takeDirectHpDamage(amount);
      this.showHpDamageBarChip(view.bars, beforeEnemyHp, enemy.hp, enemy.maxHp);
      this.showDamageNumber(amount, this.enemyEffectX(enemy), this.enemyEffectY(enemy), 'hp');
      this.runEnemyDamagedHooks({ enemy, player, amount });
      return;
    }

    if (effect.kind === 'hpDamage') {
      const beforeHp = enemy.hp;
      enemy.takeDirectHpDamage(amount);
      this.showHpDamageBarChip(view.bars, beforeHp, enemy.hp, enemy.maxHp);
      this.showDamageNumber(amount, this.enemyEffectX(enemy), this.enemyEffectY(enemy), 'hp');
      this.runEnemyDamagedHooks({ enemy, player: this.player, amount });
      return;
    }

    if (effect.kind === 'epDamage') {
      const previousEnemy = this.enemy;
      const index = this.enemyViews.findIndex((enemyView) => enemyView.enemy === enemy);
      if (index >= 0) {
        this.selectEnemy(index);
        await this.applyEnemyEpDamage(amount);
        const previousIndex = this.enemyViews.findIndex((enemyView) => enemyView.enemy === previousEnemy);
        if (previousIndex >= 0 && !previousEnemy.isDefeated) {
          this.selectEnemy(previousIndex);
        }
      }
      return;
    }

    if (effect.kind === 'block') {
      enemy.block += amount;
      this.showShieldEffect(this.enemyEffectX(enemy), this.enemyEffectY(enemy));
    }
  }

  private async applyRelicPlayerEffect(
    _relic: RelicDefinition,
    effect: EffectDefinition,
    amount: number,
  ): Promise<void> {
    if (effect.kind === 'status' && effect.status) {
      this.applyStatusToCombatant(this.player, effect.status, effect.stacks ?? effect.amount);
      return;
    }

    if (effect.kind === 'hpDamage') {
      const beforeHp = this.player.hp;
      this.player.takeDirectHpDamage(amount);
      this.showHpDamageBarChip(this.playerBars, beforeHp, this.player.hp, this.player.maxHp);
      this.showDamageNumber(amount, PLAYER_EFFECT_X, PLAYER_EFFECT_Y, 'hp');
      this.flashPlayer();
      return;
    }

    if (effect.kind === 'epDamage') {
      this.playDamageEffect(effect.attackAttribute ?? 'love', PLAYER_EFFECT_X, PLAYER_EFFECT_Y);
      this.showDamageNumber(this.modifiedPlayerEpDamage(amount), PLAYER_EFFECT_X, PLAYER_EFFECT_Y, 'ep');
      await this.applyPlayerEpDamage(amount);
      return;
    }

    if (effect.kind === 'hpHeal') {
      const beforeHp = this.player.hp;
      this.player.healHp(amount);
      const healed = this.player.hp - beforeHp;
      this.healingEffect();
      this.showHealNumber(healed, PLAYER_EFFECT_X, PLAYER_EFFECT_Y);
      return;
    }

    if (effect.kind === 'epHeal') {
      await this.applyPlayerEpHeal(amount);
      return;
    }

    if (effect.kind === 'epReserveHeal') {
      this.setPlayerEpReserveValue(Math.max(0, this.playerEpReserveValue - amount), this.player.maxEp, true);
      return;
    }

    if (effect.kind === 'block') {
      this.player.block += amount;
      this.showShieldEffect(PLAYER_EFFECT_X, PLAYER_EFFECT_Y);
    }
  }

  private async applyStatusTriggerEffects(entry: IndexedStatusTrigger, context: StatusHookContext = {}): Promise<string[]> {
    const messages: string[] = [];
    const triggerContext = {
      ...context,
      statusOwner: entry.owner,
      status: entry.status,
      enemy: context.enemy ?? (entry.owner instanceof Enemy ? entry.owner : undefined),
      player: context.player ?? this.player,
    };

    if (entry.trigger.consumeRule === 'allWhileEnergy') {
      while (this.player.energy > 0 && entry.owner.hasStatus(entry.status)) {
        entry.owner.consumeStatus(entry.status);
        for (const effect of entry.trigger.effects) {
          const message = await this.applyStatusEffect(entry, effect, triggerContext, 1);
          if (message) {
            messages.push(message);
          }
        }
        this.updateHud();
        await this.runStatusTriggerVisuals(entry.trigger);
        await this.wait(90);
      }
      return messages;
    }

    const stacks = entry.owner.statuses.get(entry.status) ?? 0;
    if (stacks <= 0) {
      return messages;
    }

    for (const effect of entry.trigger.effects) {
      const message = await this.applyStatusEffect(entry, effect, triggerContext, stacks);
      if (message) {
        messages.push(message);
      }
    }

    this.updateHud();
    return messages;
  }

  private async applyStatusEffect(
    entry: IndexedStatusTrigger,
    effect: EffectDefinition,
    context: StatusHookContext,
    stacks: number,
  ): Promise<string | undefined> {
    const amount = this.statusEffectAmount(effect, context.statusOwner ?? entry.owner, stacks);

    if (effect.onlyDuringPlayerTurn && !this.isPlayerTurn) {
      return undefined;
    }

    if (effect.kind === 'addCardToHand') {
      const added = await this.addStatusCardsToHand(entry, effect, amount);
      return added > 0 ? `${entry.status}: add ${added} card` : undefined;
    }

    const targets = this.statusEffectTargets(effect, context);
    if (targets.length === 0) {
      return undefined;
    }

    for (const target of targets) {
      if (effect.kind === 'energyGain') {
        const beforeEnergy = this.player.energy;
        this.player.energy = Math.max(0, this.player.energy + amount);
        const changed = this.player.energy - beforeEnergy;
        if (changed !== 0) {
          return `${entry.status}: ${changed > 0 ? '+' : ''}${changed} energy`;
        }
        continue;
      }

      if (effect.kind === 'removeStatus') {
        this.removeStatusByEffect(target, effect, entry.status);
        return `${entry.status}: removed`;
      }

      if (effect.kind === 'epDamage') {
        if (target instanceof Enemy) {
          const previousEnemy = this.enemy;
          this.selectEnemyByEnemy(target);
          this.playDamageEffect(effect.attackAttribute ?? 'love', this.enemyEffectX(target), this.enemyEffectY(target));
          this.showDamageNumber(amount, this.enemyEffectX(target), this.enemyEffectY(target), 'ep');
          await this.applyEnemyEpDamage(amount);
          this.selectEnemyByEnemy(previousEnemy);
        } else {
          this.playDamageEffect(effect.attackAttribute ?? 'love', PLAYER_EFFECT_X, PLAYER_EFFECT_Y);
          this.showDamageNumber(this.modifiedPlayerEpDamage(amount), PLAYER_EFFECT_X, PLAYER_EFFECT_Y, 'ep');
          const peaked = await this.applyPlayerEpDamage(amount);
          if (!peaked) {
            this.flashPlayer();
          }
        }
        return `${entry.status}: ${amount} EP damage`;
      }

      if (effect.kind === 'hpDamage') {
        if (target instanceof Enemy) {
          const view = this.enemyViewFor(target);
          if (view) {
            const beforeHp = target.hp;
            target.takeDirectHpDamage(amount);
            this.showHpDamageBarChip(view.bars, beforeHp, target.hp, target.maxHp);
            this.playDamageEffect(effect.attackAttribute ?? 'strike', this.enemyEffectX(target), this.enemyEffectY(target));
            this.showDamageNumber(amount, this.enemyEffectX(target), this.enemyEffectY(target), 'hp');
          }
        } else {
          const beforeHp = this.player.hp;
          this.player.takeDirectHpDamage(amount);
          this.showHpDamageBarChip(this.playerBars, beforeHp, this.player.hp, this.player.maxHp);
          this.playDamageEffect(effect.attackAttribute ?? 'strike', PLAYER_EFFECT_X, PLAYER_EFFECT_Y);
          this.showDamageNumber(amount, PLAYER_EFFECT_X, PLAYER_EFFECT_Y, 'hp');
          this.flashPlayer();
        }
        return `${entry.status}: ${amount} HP damage`;
      }
    }

    return undefined;
  }

  private statusEffectAmount(effect: EffectDefinition, owner: Player | Enemy, stacks: number): number {
    const baseAmount = this.effectAmount(effect, owner);
    return effect.perStack ? baseAmount * stacks : baseAmount;
  }

  private statusEffectTargets(effect: EffectDefinition, context: StatusHookContext): (Player | Enemy)[] {
    if (effect.target === 'player') {
      return [this.player];
    }

    if (effect.target === 'self') {
      return context.statusOwner ? [context.statusOwner] : [];
    }

    if (effect.target === 'triggerEnemy') {
      if (context.enemy) {
        return [context.enemy];
      }
      return context.statusOwner instanceof Enemy ? [context.statusOwner] : [];
    }

    if (effect.target === 'selectedEnemy') {
      return this.enemy && !this.enemy.isDefeated ? [this.enemy] : [];
    }

    if (effect.target === 'allEnemies') {
      return this.enemies.filter((enemy) => !enemy.isDefeated);
    }

    return [];
  }

  private async addStatusCardsToHand(
    entry: IndexedStatusTrigger,
    effect: EffectDefinition,
    amount: number,
  ): Promise<number> {
    if (!effect.cardId || amount <= 0) {
      return 0;
    }

    const addedUids = new Set<string>();
    const definition = CARD_DEFINITIONS[effect.cardId];
    if (!definition) {
      return 0;
    }

    for (let i = 0; i < amount; i += 1) {
      const cardDefinition =
        effect.cardAddVariant === 'purgeForStatusOwner' && entry.owner instanceof Enemy
          ? this.createPurgeCardDefinitionForEnemy(entry.owner, entry.status)
          : definition;
      const card = this.deck.addToHand(cardDefinition, MAX_HAND_SIZE);
      if (this.deck.hand.some((handCard) => handCard.uid === card.uid)) {
        addedUids.add(card.uid);
      }
    }

    if (addedUids.size <= 0) {
      return 0;
    }

    void this.renderHand();
    if (entry.trigger.visuals?.includes('addCardFromPlayerFadeIn')) {
      await this.animateCardsAddedFromPlayer(addedUids);
    }
    this.updateHud();
    return addedUids.size;
  }

  private removeStatusByEffect(target: Player | Enemy, effect: EffectDefinition, fallbackStatus: StatusEffect): void {
    if (effect.statusGroup) {
      for (const [status, definition] of Object.entries(STATUS_DESCRIPTIONS) as [StatusEffect, StatusDefinition][]) {
        if (definition.exclusiveGroup === effect.statusGroup) {
          target.statuses.delete(status);
        }
      }
      return;
    }

    target.statuses.delete(effect.status ?? fallbackStatus);
  }

  private async runStatusTriggerVisuals(trigger: StatusTriggerDefinition): Promise<void> {
    if (!trigger.visuals?.includes('breathAndEnergyPulse')) {
      return;
    }

    await Promise.all([
      this.breathingRecoveryMotion(),
      this.pulseEnergyPanel(),
    ]);
  }

  private relicEffectTargets(effect: EffectDefinition, context: RelicHookContext): (Player | Enemy)[] {
    if (effect.target === 'player' || effect.target === 'self') {
      return [this.player];
    }

    if (effect.target === 'triggerEnemy') {
      return context.enemy ? [context.enemy] : [];
    }

    if (effect.target === 'selectedEnemy') {
      return this.enemy && !this.enemy.isDefeated ? [this.enemy] : [];
    }

    if (effect.target === 'allEnemies') {
      return this.enemies.filter((enemy) => !enemy.isDefeated);
    }

    return [];
  }

  private effectAmount(effect: EffectDefinition, target: Player | Enemy): number {
    if (effect.percentOf === 'targetMaxEp' && target instanceof Enemy) {
      return Math.ceil(target.maxEp * effect.amount);
    }

    if (effect.percentOf === 'selfCurrentHp' && target instanceof Enemy) {
      return Math.ceil(target.hp * effect.amount);
    }

    if (effect.percentOf === 'selfMaxEp' && target instanceof Enemy) {
      return Math.ceil(target.maxEp * effect.amount);
    }

    if (effect.percentOf === 'playerMaxHp') {
      return Math.ceil(this.player.maxHp * effect.amount);
    }

    if (effect.percentOf === 'playerMaxEp') {
      return Math.ceil(this.player.maxEp * effect.amount);
    }

    return Math.ceil(effect.amount);
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

  private createHudBars(x: number, y: number, owner: 'player' | 'enemy', enemy?: Enemy): HudBars {
    const hasEp = owner === 'player' || (enemy?.maxEp ?? 0) > 0;
    const hpBg = this.add.rectangle(x, y, BAR_WIDTH, BAR_HEIGHT, 0x17351f, 1);
    hpBg.setOrigin(0, 0.5);
    hpBg.setStrokeStyle(1, 0x426f4a, 0.9);
    hpBg.setInteractive({ useHandCursor: true });
    hpBg.on('pointerover', () => this.showBarTooltip(owner, 'hp', x, y + 14, enemy));
    hpBg.on('pointerout', () => this.hideStatusTooltip());

    const hpFill = this.add.rectangle(x, y, BAR_WIDTH, BAR_HEIGHT, 0x39b769, 1);
    hpFill.setOrigin(0, 0.5);
    const hpText = this.add.text(x + BAR_WIDTH / 2, y, '', this.barTextStyle());
    hpText.setOrigin(0.5);
    hpText.setDepth(hpFill.depth + 4);

    const blockFill = this.add.rectangle(x, y - 5, BAR_WIDTH, BAR_HEIGHT, 0x3a80d7, 0.92);
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

    const epY = y + 27;
    const epBg = this.add.rectangle(x, epY, BAR_WIDTH, BAR_HEIGHT, 0x3a1730, 1);
    epBg.setOrigin(0, 0.5);
    epBg.setStrokeStyle(1, 0x8b4a76, 0.9);
    epBg.setInteractive({ useHandCursor: true });
    epBg.on('pointerover', () => this.showBarTooltip(owner, 'ep', x, epY + 14, enemy));
    epBg.on('pointerout', () => this.hideStatusTooltip());

    const epFill = this.add.rectangle(x, epY, BAR_WIDTH, BAR_HEIGHT, EP_FILL_COLOR, 1);
    epFill.setOrigin(0, 0.5);
    const epReserveFill = this.add.rectangle(x, epY, BAR_WIDTH, BAR_HEIGHT, EP_RESERVE_COLOR, 0.98);
    epReserveFill.setOrigin(0, 0.5);
    epReserveFill.setDepth(epFill.depth + 2);
    epReserveFill.setScale(0, 1);
    const epReserveStripes = this.add.graphics();
    epReserveStripes.setDepth(epReserveFill.depth + 1);
    const epText = this.add.text(x + BAR_WIDTH / 2, epY, '', this.barTextStyle());
    epText.setOrigin(0.5);
    epText.setDepth(epReserveStripes.depth + 1);

    if (!hasEp) {
      epBg.setVisible(false);
      epFill.setVisible(false);
      epReserveFill.setVisible(false);
      epReserveStripes.setVisible(false);
      epText.setVisible(false);
    }

    return { hpBg, hpFill, hpText, blockFill, blockShield, blockText, epBg, epFill, epText, epReserveFill, epReserveStripes, hasEp, hpX: x, hpY: y, epX: x, epY };
  }

  private barTextStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'Arial',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#101419',
      stroke: '#ffffff',
      strokeThickness: 3,
    };
  }

  private showBarTooltip(owner: 'player' | 'enemy', bar: 'hp' | 'ep', x: number, y: number, enemy?: Enemy): void {
    const combatant = owner === 'player' ? this.player : enemy ?? this.enemy;
    const name = bar === 'hp' ? 'HP' : 'EP';
    const value = bar === 'hp' ? `${combatant.hp}/${combatant.maxHp}` : `${combatant.ep}/${combatant.maxEp}`;
    const tips = bar === 'hp'
      ? 'If HP reaches 0, this combatant is defeated.'
      : 'Ecstasy point. EP rises when taking EP damage. At max, a Peak effect triggers.';
    const reserve = owner === 'player' && bar === 'ep'
      ? `\nEP reset floor: ${this.playerEpReserveValue}/${this.player.maxEp}`
      : '';
    const peaks = owner === 'player' && bar === 'ep'
      ? `\nEP Peaks: ${this.player.epPeakCount}`
      : '';

    this.clearStatusTooltipSource();
    this.showStatusTooltipText(`${name}: ${value}${reserve}${peaks}\n${tips}`, x, y);
  }

  private createEnergyHud(): void {
    this.energyPanel = this.add.rectangle(24, 552, 132, 96, 0x242a33, 0.95);
    this.energyPanel.setOrigin(0, 0);
    this.energyPanel.setStrokeStyle(2, 0xd8a84c, 0.85);
    this.energyPanel.setDepth(35);
    const energyLabel = this.add.text(42, 566, 'ENERGY', {
      fontFamily: 'Arial',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#d8a84c',
    });
    energyLabel.setDepth(36);
    this.energyText = this.add.text(42, 590, '', {
      fontFamily: 'Arial',
      fontSize: '34px',
      fontStyle: 'bold',
      color: '#ffd36e',
    });
    this.energyText.setDepth(36);
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
    const panel = this.add.rectangle(640, 360, 460, 360, 0x242a33, 0.98);
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
    const titleButton = this.createModalButton(640, 445, 330, 48, 'Return to Title', () => this.returnToTitle());
    const close = this.createModalButton(640, 505, 180, 42, 'Close', () => this.hideModal());

    this.modalOverlay.add([shade, panel, title, restart, help, titleButton, close]);
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
    const descriptions = [...definition.playerStatuses, ...definition.enemyStatuses]
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
    this.game.events.emit('battle-tooltip-show', { text, x: clampedX, y: clampedY });
  }

  private hideStatusTooltip(): void {
    this.clearStatusTooltipSource();
    this.statusTooltip.setVisible(false);
    this.game.events.emit('battle-tooltip-hide');
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
    return STATUS_DESCRIPTIONS[status]?.iconColor ?? 0x526075;
  }

  private statusIconText(status: StatusEffect, stacks: number): string {
    const suffix = stacks > 1 ? String(Math.min(stacks, 99)) : '';

    return `${STATUS_DESCRIPTIONS[status]?.iconText ?? status.slice(0, 2)}${suffix}`;
  }

  private restartBattle(): void {
    this.isAnimating = false;
    this.isGameOver = false;
    this.isPlayerTurn = false;
    this.canEndTurn = false;
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

  private returnToTitle(): void {
    resetRunState();
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.scene.stop('RewardScene');
    this.scene.start('TitleScene');
  }

  private createEndTurnButton(): void {
    this.endTurnButton = this.add.container(1110, 622);
    this.endTurnButtonBg = this.add.rectangle(0, 0, 150, 52, 0xd08b3e, 1);
    this.endTurnButtonBg.setStrokeStyle(3, 0xffd48a, 0.8);
    this.endTurnButtonLabel = this.add.text(0, 0, 'End Turn', {
      fontFamily: 'Arial',
      fontSize: '21px',
      fontStyle: 'bold',
      color: '#1b1510',
    });
    this.endTurnButtonLabel.setOrigin(0.5);
    this.endTurnButton.add([this.endTurnButtonBg, this.endTurnButtonLabel]);
    this.endTurnButton.setDepth(35);
    this.endTurnButtonBg.setInteractive({ useHandCursor: true });
    this.endTurnButtonBg.on('pointerover', () => {
      if (this.canEndTurn) {
        this.endTurnButtonBg.setFillStyle(0xf0a54e);
      }
    });
    this.endTurnButtonBg.on('pointerout', () => {
      this.endTurnButtonBg.setFillStyle(this.canEndTurn ? 0xd08b3e : 0x5b6472);
    });
    this.endTurnButtonBg.on('pointerup', () => this.endTurn());
    this.setEndTurnEnabled(false);
  }

  private setEndTurnEnabled(enabled: boolean): void {
    this.canEndTurn = enabled && !this.isGameOver;
    if (!this.endTurnButtonBg) {
      return;
    }

    this.endTurnButtonBg.setFillStyle(this.canEndTurn ? 0xd08b3e : 0x5b6472);
    this.endTurnButtonBg.setStrokeStyle(3, this.canEndTurn ? 0xffd48a : 0x8b94a3, this.canEndTurn ? 0.8 : 0.55);
    this.endTurnButtonLabel.setColor(this.canEndTurn ? '#1b1510' : '#d4dae3');
    this.endTurnButton.setAlpha(this.canEndTurn ? 1 : 0.72);
  }

  private async drawCards(count: number, animate: boolean): Promise<CardInstance[]> {
    const drawn = this.deck.draw(count, MAX_HAND_SIZE);
    await this.renderHand(new Set(drawn.map((card) => card.uid)), animate);
    if (drawn.length > 0) {
      this.runCardDrawnHooks({ player: this.player, amount: drawn.length });
    }
    return drawn;
  }

  private renderHand(animatedDraws = new Set<string>(), animateDraws = false): Promise<void> {
    const handUids = new Set(this.deck.hand.map((card) => card.uid));
    this.cardViews.forEach((view, uid) => {
      if (!handUids.has(uid) && !this.exitingCardUids.has(uid)) {
        view.container.destroy();
        this.cardViews.delete(uid);
      }
    });

    const displayedHand = this.deck.hand.filter((card) => !this.exitingCardUids.has(card.uid));
    const basePositions = this.handBasePositions(displayedHand);
    const locksInputForDraw = animateDraws && displayedHand.some((card) => animatedDraws.has(card.uid));
    if (locksInputForDraw) {
      this.setHandInputLocked(true);
    }

    const drawAnimations: Promise<void>[] = [];

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
        drawAnimations.push(new Promise((resolve) => {
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
              this.updateHandDepths();
              resolve();
            },
          });
        }));
      } else {
        view.container.setAlpha(1);
        view.ready = true;
        if (this.handInputLocked) {
          view.hitArea.disableInteractive();
        } else {
          view.hitArea.setInteractive({ useHandCursor: true });
        }
        this.moveCardTo(view, targetX, HAND_Y, 260);
      }
    });

    if (this.hoveredCardUid && !this.handInputLocked) {
      this.applyHoverLayout(220);
    } else {
      this.updateHandDepths();
    }
    this.updateHud();
    return Promise.all(drawAnimations).then(() => {
      if (locksInputForDraw) {
        this.setHandInputLocked(false);
        this.updateHandDepths();
      }
    });
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
    if (this.handInputLocked) {
      return;
    }

    this.hoveredCardUid = uid;
    this.applyHoverLayout(180);
  }

  private isHandCardReady(view: CardView): boolean {
    return !this.handInputLocked && view.ready && !this.exitingCardUids.has(view.card.uid) && this.deck.hand.some((card) => card.uid === view.card.uid);
  }

  private setHandInputLocked(locked: boolean): void {
    this.handInputLocked = locked;
    if (locked) {
      this.hoveredCardUid = undefined;
      this.hideStatusTooltip();
    }

    this.cardViews.forEach((view) => {
      if (locked || !view.ready || this.exitingCardUids.has(view.card.uid)) {
        view.hitArea.disableInteractive();
      } else {
        view.hitArea.setInteractive({ useHandCursor: true });
      }
    });
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

    const hoveredIndex = displayedHand.findIndex((card) => card.uid === this.hoveredCardUid);
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

      const targetX = this.hoverNeighborTargetX(view.baseX, index, hoveredIndex, displayedHand.length, removedPositions.get(uid));
      view.container.setDepth(30 + index);
      this.moveCardTo(view, targetX, view.baseY, duration, 1);
    });
  }

  private hoverNeighborTargetX(
    baseX: number,
    index: number,
    hoveredIndex: number,
    count: number,
    removedX: number | undefined,
  ): number {
    if (index < hoveredIndex) {
      return this.leftHoverTargetX(baseX, count, removedX);
    }

    return this.rightHoverTargetX(baseX, index, count, removedX);
  }

  private leftHoverTargetX(baseX: number, count: number, removedX: number | undefined): number {
    const factor =
      count >= 10 ? 0 :
      count === 9 ? 0.2 :
      count === 8 ? 0.25 :
      0.5;

    return this.interpolateX(baseX, removedX, factor);
  }

  private rightHoverTargetX(baseX: number, index: number, count: number, removedX: number | undefined): number {
    if (count >= 10) {
      return baseX + 50;
    }

    if (count === 9) {
      return this.rightPackedTargetX(baseX, index, count, 9.5, 30);
    }

    if (count === 8) {
      return this.rightPackedTargetX(baseX, index, count, 8.5, 0);
    }

    const factor =
      count === 7 ? 0.2 :
      count === 6 ? 1 / 3 :
      0.5;

    return this.interpolateX(baseX, removedX, factor);
  }

  private rightPackedTargetX(baseX: number, index: number, count: number, referenceCount: number, extraPush: number): number {
    const referenceGap = (HAND_MAX_X - HAND_MIN_X) / (referenceCount - 1);
    const rightmostBaseX = HAND_CENTER_X + Math.min((count - 1) * HAND_CARD_GAP, HAND_MAX_X - HAND_MIN_X) / 2;
    const packedX = rightmostBaseX + extraPush - (count - 1 - index) * referenceGap;
    return Math.max(baseX, packedX);
  }

  private interpolateX(baseX: number, targetX: number | undefined, factor: number): number {
    return baseX + ((targetX ?? baseX) - baseX) * factor;
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

    this.setHandInputLocked(true);
    let completed = 0;
    return new Promise((resolve) => {
      views.forEach((view, index) => {
        const targetX = view.container.x;
        const targetY = view.container.y;
        view.ready = false;
        view.hitArea.disableInteractive();
        view.container.setPosition(PLAYER_EFFECT_X, PLAYER_EFFECT_Y);
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
            this.updateHandDepths();
            completed += 1;
            if (completed === views.length) {
              this.setHandInputLocked(false);
              this.updateHandDepths();
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

    if (definition.enemyStatuses.some((status) => status.stacks > 0)) {
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

    const selfHpDamage = this.cardSelfHpDamageAmount(definition);
    if (selfHpDamage > 0 && definition.selfHpDamageTimes > 0) {
      lines.push([
        { text: 'Take ' },
        { text: String(selfHpDamage) },
        ...(definition.selfHpDamageTimes > 1 ? [{ text: ` x${definition.selfHpDamageTimes}` }] : []),
        { text: ' HP damage.' },
      ]);
    }

    if (definition.block > 0) {
      lines.push([{ text: `Gain ${definition.block} block.` }]);
    }

    for (const status of definition.playerStatuses) {
      if (status.stacks > 0) {
        lines.push([{ text: `Apply ${status.effect}${status.stacks > 1 ? ` x${status.stacks}` : ''}.` }]);
      }
    }

    for (const status of definition.enemyStatuses) {
      if (status.stacks > 0) {
        lines.push([{ text: `Apply ${status.effect}${status.stacks > 1 ? ` x${status.stacks}` : ''}.` }]);
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

    if (definition.temporary) {
      lines.push([{ text: 'Temporary.' }]);
    }

    if (definition.purgeTargetName && definition.purgeStatus) {
      lines.push([{ text: `On success, purge ${definition.purgeTargetName}.` }]);
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
    if (this.isAnimating || this.isGameOver || !this.enemy || this.enemy.isDefeated) {
      if (!this.selectNextAliveEnemy()) {
        return;
      }
    }

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
    const playedCard = this.deck.removeFromHand(card.uid);
    if (!playedCard) {
      this.exitingCardUids.delete(card.uid);
      view.ready = true;
      view.hitArea.setInteractive({ useHandCursor: true });
      this.isAnimating = false;
      return;
    }
    void this.renderHand();
    this.player.energy -= card.definition.cost;
    this.updateHud();
    hitArea.disableInteractive();
    container.setDepth(2000);

    const originalX = container.x;
    const originalY = container.y;
    const targetsEnemy = this.targetsEnemy(card.definition);
    const targetEnemy = targetsEnemy ? this.enemy : undefined;
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
        void this.applyCardEffect(card, targetEnemy).then(() => {
          if (this.isGameOver) {
            return;
          }

          if (card.definition.exhaust || card.definition.temporary) {
            this.animateCardExhaust(container, () => {
              this.removeExitingCard(card.uid);
              this.isAnimating = false;
              this.updateHud();
            });
            return;
          }

          this.deck.addToDiscard(playedCard);
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
    const hasEnemyStatus = definition.enemyStatuses.some((status) => status.stacks > 0);
    return hasHpDamage || hasEpDamage || hasEnemyStatus;
  }

  private async applyCardEffect(card: CardInstance, targetEnemy?: Enemy): Promise<void> {
    const definition = card.definition;
    const messages: string[] = [];
    const enemy = targetEnemy ?? this.enemy;
    const enemyView = this.enemyViewFor(enemy);
    const enemyBars = enemyView?.bars ?? this.enemyBars;

    for (const status of definition.playerStatuses) {
      if (status.stacks <= 0) {
        continue;
      }
      const applied = this.applyStatusToCombatant(this.player, status.effect, status.stacks);
      messages.push(`${definition.name}: ${applied}`);
    }

    for (const status of definition.enemyStatuses) {
      if (status.stacks <= 0) {
        continue;
      }
      const applied = this.applyStatusToCombatant(enemy, status.effect, status.stacks);
      messages.push(`${definition.name}: ${applied}`);
    }

    let totalHpDamage = 0;
    for (let i = 0; i < definition.hpDamageTimes; i += 1) {
      if (definition.hpDamage <= 0) {
        continue;
      }
      const beforeHp = enemy.hp;
      const beforeBlock = enemy.block;
      const damage = enemy.takeHpDamage(definition.hpDamage);
      this.showHpDamageBarChip(enemyBars, beforeHp, enemy.hp, enemy.maxHp);
      totalHpDamage += damage;
      this.playDamageEffect(definition.attackAttribute, this.enemyEffectX(enemy), this.enemyEffectY(enemy));
      this.showDamageNumber(damage > 0 ? damage : definition.hpDamage, this.enemyEffectX(enemy), this.enemyEffectY(enemy), damage > 0 ? 'hp' : 'block');
      if (damage === 0) {
        if (beforeBlock > 0 && enemy.block === 0 && definition.hpDamage >= beforeBlock) {
          this.showBrokenShieldEffect(this.enemyEffectX(enemy), this.enemyEffectY(enemy));
        } else {
          this.showShieldEffect(this.enemyEffectX(enemy), this.enemyEffectY(enemy));
        }
      } else if (beforeBlock > 0 && enemy.block === 0 && definition.hpDamage >= beforeBlock) {
        this.showBrokenShieldEffect(this.enemyEffectX(enemy), this.enemyEffectY(enemy));
      }
    }

    if (definition.hpDamage > 0 && definition.hpDamageTimes > 0) {
      this.flashEnemy(enemy);
      messages.push(`${definition.name}: ${totalHpDamage} HP damage`);
      this.runEnemyDamagedHooks({ enemy, card: definition, amount: totalHpDamage });
    }

    let totalEpDamage = 0;
    let enemyEpPeaked = false;
    for (let i = 0; i < definition.epDamageTimes; i += 1) {
      if (definition.epDamage <= 0) {
        continue;
      }
      const modifiedEpDamage = this.modifiedEnemyEpDamageForCard(definition, definition.epDamage, enemy);
      if (modifiedEpDamage > 0) {
        this.playDamageEffect(definition.attackAttribute, this.enemyEffectX(enemy), this.enemyEffectY(enemy));
        this.showDamageNumber(modifiedEpDamage, this.enemyEffectX(enemy), this.enemyEffectY(enemy), 'ep');
      }
      enemyEpPeaked = (await this.applyEnemyEpDamage(modifiedEpDamage, enemy)) || enemyEpPeaked;
      totalEpDamage += modifiedEpDamage;
      if (enemy.isDefeated) {
        break;
      }
    }

    if (definition.epDamage > 0 && definition.epDamageTimes > 0) {
      if (totalEpDamage > 0 && !enemyEpPeaked) {
        this.flashEnemy(enemy);
      }
      messages.push(`${definition.name}: ${totalEpDamage} EP damage`);
      this.runEnemyDamagedHooks({ enemy, card: definition, amount: totalEpDamage });
    }

    if (definition.block > 0) {
      this.player.block += definition.block;
      this.showShieldEffect(PLAYER_EFFECT_X, PLAYER_EFFECT_Y);
      messages.push(`${definition.name}: +${definition.block} block`);
      this.runBlockGainedHooks({ player: this.player, card: definition, amount: definition.block });
    }

    let selfHpDamage = 0;
    for (let i = 0; i < definition.selfHpDamageTimes; i += 1) {
      const rawSelfHpDamage = this.cardSelfHpDamageAmount(definition);
      if (rawSelfHpDamage <= 0) {
        continue;
      }
      const beforeHp = this.player.hp;
      this.player.takeDirectHpDamage(rawSelfHpDamage);
      this.showHpDamageBarChip(this.playerBars, beforeHp, this.player.hp, this.player.maxHp);
      selfHpDamage += rawSelfHpDamage;
      this.playDamageEffect('strike', PLAYER_EFFECT_X, PLAYER_EFFECT_Y);
      this.showDamageNumber(rawSelfHpDamage, PLAYER_EFFECT_X, PLAYER_EFFECT_Y, 'hp');
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
      this.playDamageEffect('love', PLAYER_EFFECT_X, PLAYER_EFFECT_Y);
      this.showDamageNumber(modifiedSelfEpDamage, PLAYER_EFFECT_X, PLAYER_EFFECT_Y, 'ep');
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

    if (definition.purgeStatus) {
      await this.applyPurgeEffect(definition, selfEpPeaked, messages);
    }

    if (definition.hpHeal > 0) {
      const beforeHp = this.player.hp;
      this.player.healHp(definition.hpHeal);
      const healed = this.player.hp - beforeHp;
      this.healingEffect();
      this.showHealNumber(healed, PLAYER_EFFECT_X, PLAYER_EFFECT_Y);
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
      const drawn = await this.drawCards(definition.drawCards, true);
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

    if (enemy.isDefeated) {
      await this.defeatEnemy(enemy);
    }
  }

  private async applyPurgeEffect(definition: CardDefinition, selfEpPeaked: boolean, messages: string[]): Promise<void> {
    if (!definition.purgeTargetName || !definition.purgeStatus || !this.statusHasTiming(definition.purgeStatus, 'purgePlayed')) {
      return;
    }

    const targetView = this.enemyViews.find((view) => view.displayName === definition.purgeTargetName);
    if (!targetView || !targetView.enemy.hasStatus(definition.purgeStatus)) {
      messages.push(`${definition.name}: no target`);
      return;
    }

    if (selfEpPeaked) {
      this.showMissEffect(this.enemyEffectX(targetView.enemy), this.enemyEffectY(targetView.enemy));
      messages.push(`${definition.name}: failed`);
      return;
    }

    const statusMessages = await this.runStatusTriggersForTiming('purgePlayed', {
      player: this.player,
      enemy: targetView.enemy,
      statusOwner: targetView.enemy,
      status: definition.purgeStatus,
      purgeCausedEpPeak: false,
    });
    messages.push(...statusMessages);
  }

  private async resolveEnemyEpPeak(enemy = this.enemy): Promise<void> {
    const view = this.enemyViewFor(enemy);
    if (!view) {
      return;
    }

    await this.flashEpPeak(view.area, view.body, 0x8a414d);

    const hookMessages = await this.runEnemyEpPeakHooks({ enemy, player: this.player });
    this.enemyEpPeakBarOverride = true;
    enemy.resetEpAfterPeak();
    this.updateHud();
    this.setEpFillImmediate(view.bars, enemy.ep, enemy.maxEp);
    this.enemyEpPeakBarOverride = false;
    this.showMessage(hookMessages.length > 0 ? `Enemy EP peak: ${hookMessages.join(' / ')}` : 'Enemy EP peak');
  }

  private async runEnemyEpPeakHooks(context: RelicHookContext): Promise<string[]> {
    const messages: string[] = [];

    for (const entry of this.relicTriggersForTiming('enemyEpPeak')) {
      messages.push(...await this.applyRelicTriggerEffects(entry, context));
    }

    return messages;
  }

  private async applyEnemyEpDamage(amount: number, enemy = this.enemy): Promise<boolean> {
    const view = this.enemyViewFor(enemy);
    if (!view) {
      return false;
    }

    if (enemy.maxEp <= 0 || amount <= 0) {
      this.showMissEffect(this.enemyEffectX(enemy), this.enemyEffectY(enemy));
      return false;
    }

    let remaining = amount;
    let peaked = false;

    while (remaining > 0 && !enemy.isDefeated) {
      const damageToMax = Math.min(remaining, enemy.maxEp - enemy.ep);
      if (damageToMax > 0) {
        enemy.takeEpDamage(damageToMax);
        remaining -= damageToMax;
        this.updateHud();
        await this.animateEpFillTo(view.bars, enemy.ep, enemy.maxEp, 'enemy', 320);
      }

      if (enemy.ep < enemy.maxEp) {
        return peaked;
      }

      peaked = true;
      await this.resolveEnemyEpPeak(enemy);
      if (remaining > 0) {
        await this.wait(130);
      }
    }

    return peaked;
  }

  private async applyPlayerEpDamage(amount: number): Promise<boolean> {
    let remaining = this.modifiedPlayerEpDamage(amount);
    let peaked = false;
    let peakCountInDamage = 0;
    let stopContinuousFlash: (() => void) | undefined;

    try {
      while (remaining > 0) {
        const damageToMax = Math.min(remaining, this.player.maxEp - this.player.ep);
        if (damageToMax > 0) {
          this.player.takeEpDamage(damageToMax);
          remaining -= damageToMax;
          this.updateHud();
          await this.animateEpFillTo(this.playerBars, this.player.ep, this.player.maxEp, 'player', 320, Boolean(stopContinuousFlash));
        }

        if (this.player.ep < this.player.maxEp) {
          return peaked;
        }

        peaked = true;
        const recoveryEp = this.nextPlayerEpRecoveryValue();
        const flashCount = this.playerEpPeakFlashCount(peakCountInDamage);
        peakCountInDamage += 1;

        if (flashCount > 1) {
          const flashDuration = flashCount * EP_PEAK_FLASH_CYCLE_DURATION;
          await Promise.all([
            this.flashEpPeak(this.playerArea, this.playerBody, 0x467fb1, flashCount),
            this.flashEpFill(this.playerBars, flashCount),
            this.animatePlayerEpReserveTo(recoveryEp, this.player.maxEp, flashDuration),
          ]);
        } else {
          stopContinuousFlash ??= this.startContinuousPlayerEpPeakFlash();
          await this.animatePlayerEpReserveTo(recoveryEp, this.player.maxEp, EP_PEAK_FLASH_CYCLE_DURATION);
        }

        this.playerEpPeakBarOverride = true;
        this.player.recoverFromEpPeak(recoveryEp);
        await this.runStatusTriggersForTiming('playerEpPeak', { player: this.player });
        this.updateHud();
        this.setEpFillImmediate(this.playerBars, this.player.ep, this.player.maxEp, Boolean(stopContinuousFlash));
        this.playerEpPeakBarOverride = false;
        if (remaining > 0) {
          await this.wait(130);
        }
      }
    } finally {
      stopContinuousFlash?.();
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

  private cardSelfHpDamageAmount(definition: CardDefinition): number {
    return definition.selfHpDamage + Math.ceil(this.player.maxHp * definition.selfHpDamagePercent);
  }

  private modifiedPlayerEpDamage(amount: number): number {
    return Math.ceil(amount * this.playerEpDamageMultiplier());
  }

  private modifiedEnemyEpDamageForCard(_definition: CardDefinition, amount: number, enemy = this.enemy): number {
    return this.modifiedEnemyEpDamage(amount, enemy);
  }

  private modifiedEnemyEpDamage(amount: number, enemy = this.enemy): number {
    if (amount <= 0) {
      return amount;
    }

    if (enemy.maxEp <= 0) {
      return 0;
    }

    const passiveBonus = this.relicTriggersForTiming('passive').reduce((sum, entry) => {
      return sum + entry.trigger.effects
        .filter((effect) => effect.kind === 'epDamage' && effect.target === 'selectedEnemy')
        .reduce((effectSum, effect) => effectSum + effect.amount, 0);
    }, 0);
    return amount + passiveBonus;
  }

  private modifiedPlayerEpDamageForCard(definition: CardDefinition, amount: number): number {
    let arousalStatus = this.currentPlayerArousalStatus();
    for (const status of definition.playerStatuses) {
      if (status.stacks > 0 && this.isArousalStatus(status.effect)) {
        arousalStatus = this.nextArousalStatus(arousalStatus, status.effect);
      }
    }

    return Math.ceil(amount * this.epDamageMultiplierForArousal(arousalStatus));
  }

  private playerEpDamageMultiplier(): number {
    return this.epDamageMultiplierForArousal(this.currentPlayerArousalStatus());
  }

  private currentPlayerArousalStatus(): StatusEffect | undefined {
    return this.highestStatusInGroup(this.player, 'arousal');
  }

  private epDamageMultiplierForArousal(status: StatusEffect | undefined): number {
    if (!status) {
      return 1;
    }

    return statusTriggersForTiming(status, 'damageCalculation')
      .flatMap((trigger) => trigger.modifiers ?? [])
      .filter((modifier) => modifier.kind === 'epDamageTakenMultiplier' && modifier.target === 'player')
      .reduce((multiplier, modifier) => Math.max(multiplier, modifier.amount), 1);
  }

  private applyStatusToCombatant(target: Player | Enemy, status: StatusEffect, stacks: number): string {
    if (target instanceof Enemy && status === 'Charm' && target.definition.intents_E.length === 0) {
      this.showMissEffect(this.enemyEffectX(target), this.enemyEffectY(target));
      return 'Charm miss';
    }

    const ownerType = target instanceof Enemy ? 'enemy' : 'player';
    const definition = STATUS_DESCRIPTIONS[status];
    if (!definition?.allowedOwners.includes(ownerType)) {
      return `${status} miss`;
    }

    if (definition.exclusiveGroup) {
      return this.applyExclusiveStatus(target, status, definition.exclusiveGroup);
    }

    target.addStatus(status, stacks);
    return stacks > 1 ? `${status} x${stacks}` : status;
  }

  private isArousalStatus(status: StatusEffect): boolean {
    return STATUS_DESCRIPTIONS[status]?.exclusiveGroup === 'arousal';
  }

  private applyExclusiveStatus(target: Player | Enemy, status: StatusEffect, group: string): string {
    const nextStatus = this.nextStatusInExclusiveGroup(target, status, group);
    for (const [candidate, definition] of Object.entries(STATUS_DESCRIPTIONS) as [StatusEffect, StatusDefinition][]) {
      if (definition.exclusiveGroup === group) {
        target.statuses.delete(candidate);
      }
    }
    target.addStatus(nextStatus);
    return nextStatus;
  }

  private nextPlayerArousalStatus(status: StatusEffect): StatusEffect {
    return this.nextArousalStatus(this.currentPlayerArousalStatus(), status);
  }

  private nextArousalStatus(current: StatusEffect | undefined, incoming: StatusEffect): StatusEffect {
    return this.nextStatusForGroup(current, incoming, 'arousal');
  }

  private nextStatusInExclusiveGroup(target: Player | Enemy, incoming: StatusEffect, group: string): StatusEffect {
    return this.nextStatusForGroup(this.highestStatusInGroup(target, group), incoming, group);
  }

  private nextStatusForGroup(current: StatusEffect | undefined, incoming: StatusEffect, group: string): StatusEffect {
    const incomingRank = STATUS_DESCRIPTIONS[incoming]?.groupRank ?? 1;
    const currentRank = current ? STATUS_DESCRIPTIONS[current]?.groupRank ?? 0 : 0;
    const nextRank = current ? Math.min(this.maxStatusGroupRank(group), currentRank + incomingRank) : incomingRank;
    return this.statusForGroupRank(group, nextRank) ?? incoming;
  }

  private highestStatusInGroup(target: Player | Enemy, group: string): StatusEffect | undefined {
    let selected: StatusEffect | undefined;
    let selectedRank = 0;
    for (const [status, stacks] of target.statuses.entries()) {
      const definition = STATUS_DESCRIPTIONS[status];
      if (stacks > 0 && definition?.exclusiveGroup === group && (definition.groupRank ?? 0) > selectedRank) {
        selected = status;
        selectedRank = definition.groupRank ?? 0;
      }
    }
    return selected;
  }

  private statusForGroupRank(group: string, rank: number): StatusEffect | undefined {
    return (Object.entries(STATUS_DESCRIPTIONS) as [StatusEffect, StatusDefinition][])
      .find(([, definition]) => definition.exclusiveGroup === group && definition.groupRank === rank)?.[0];
  }

  private maxStatusGroupRank(group: string): number {
    return (Object.values(STATUS_DESCRIPTIONS) as StatusDefinition[])
      .filter((definition) => definition.exclusiveGroup === group)
      .reduce((max, definition) => Math.max(max, definition.groupRank ?? 0), 0);
  }

  private endTurn(): void {
    if (!this.canEndTurn || this.isAnimating || this.isGameOver) {
      return;
    }

    this.isAnimating = true;
    this.isPlayerTurn = false;
    this.setTurnOverlayColor('enemy');
    this.setEndTurnEnabled(false);
    this.showMessage('Enemy turn');

    const cardsToDiscard = this.deck.hand
      .map((card) => ({ card, uid: card.uid, container: this.cardViews.get(card.uid)?.container }))
      .filter((entry): entry is { card: CardInstance; uid: string; container: Phaser.GameObjects.Container } => Boolean(entry.container));

    cardsToDiscard.forEach(({ uid }) => this.markCardExiting(uid));

    const finishDiscard = () => {
      this.deck.discardHand();
      cardsToDiscard.forEach(({ uid }) => this.removeExitingCard(uid));
      void this.renderHand();
      this.time.delayedCall(350, () => this.enemyAction());
    };

    if (cardsToDiscard.length === 0) {
      finishDiscard();
      return;
    }

    let completed = 0;
    cardsToDiscard.forEach(({ card, container }, index) => {
      container.setAlpha(1);
      if (card.definition.temporary) {
        this.time.delayedCall(index * 35, () => {
          this.animateCardExhaust(container, () => {
            completed += 1;
            if (completed === cardsToDiscard.length) {
              finishDiscard();
            }
          });
        });
        return;
      }

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
    const actingViews = this.enemyViews.filter((view) => !view.enemy.isDefeated);
    if (actingViews.length === 0) {
      this.startNextTurn();
      return;
    }

    const messages: string[] = [];

    for (const view of actingViews) {
      this.selectEnemyByEnemy(view.enemy);
      const intent = this.enemy.currentIntent();
      await this.applyEnemyIntentSelfEffects(intent, messages);
      await this.applyEnemyIntentPlayerEffects(intent, messages);

      if (intent.causedByStatus === 'Charm') {
        this.enemy.consumeStatus('Charm');
        this.enemy.clearCharmIntent();
      }

      await this.applyEnemySelfDamage(intent, messages);
      const actingEnemyDefeated = this.enemy.isDefeated;
      this.updateHud();
      if (!actingEnemyDefeated) {
        this.enemy.advanceIntent(intent);
      }

      if (this.player.isDefeated) {
        this.defeatPlayer();
        return;
      }

      if (actingEnemyDefeated) {
        const victory = await this.defeatEnemy(view.enemy);
        if (victory) {
          return;
        }
        continue;
      }

      if (this.enemies.every((enemy) => enemy.isDefeated)) {
        await this.defeatEnemy(this.enemy);
        return;
      }

      await this.wait(220);
    }

    this.selectNextAliveEnemy();
    if (messages.length > 0) {
      this.showMessage(messages.join(' / '));
    }

    this.time.delayedCall(650, () => this.startNextTurn());
  }

  private async applyEnemyIntentSelfEffects(intent: ReturnType<Enemy['currentIntent']>, messages: string[]): Promise<void> {
    for (const status of intent.enemyStatuses) {
      if (status.stacks <= 0) {
        continue;
      }
      const applied = this.applyStatusToCombatant(this.enemy, status.effect, status.stacks);
      messages.push(`${this.enemy.name}: ${applied}`);
    }

    for (const status of intent.playerStatuses) {
      if (status.stacks <= 0) {
        continue;
      }
      const applied = this.applyStatusToCombatant(this.player, status.effect, status.stacks);
      messages.push(`${this.enemy.name}: player ${applied}`);
    }

    if (intent.block > 0) {
      this.enemy.block += intent.block;
      this.showShieldEffect(this.enemyEffectX(), this.enemyEffectY());
      this.runBlockGainedHooks({ enemy: this.enemy, amount: intent.block });
      messages.push(`${this.enemy.name}: +${intent.block} block`);
    }

    if (intent.hpHeal > 0) {
      const beforeHp = this.enemy.hp;
      this.enemy.healHp(intent.hpHeal);
      const healed = this.enemy.hp - beforeHp;
      if (healed > 0) {
        this.showHealNumber(healed, this.enemyEffectX(), this.enemyEffectY());
      }
      messages.push(`${this.enemy.name}: heal ${healed} HP`);
    }

    if (intent.epHeal > 0 && this.enemy.maxEp > 0) {
      this.enemy.ep = Math.max(0, this.enemy.ep - intent.epHeal);
      this.updateHud();
      await this.animateEpFillTo(this.enemyBars, this.enemy.ep, this.enemy.maxEp, 'enemy', 320);
      messages.push(`${this.enemy.name}: recover ${intent.epHeal} EP`);
    }
  }

  private async applyEnemyIntentPlayerEffects(intent: ReturnType<Enemy['currentIntent']>, messages: string[]): Promise<void> {
    const hpDamage = intent.hpDamage > 0 ? intent.hpDamage : (intent.damageType === 'hp' ? intent.amount : 0);
    if (hpDamage > 0) {
      this.enemyHpAttackMotion();
      const beforeHp = this.player.hp;
      const beforeBlock = this.player.block;
      const damage = this.player.takeHpDamage(hpDamage);
      this.showHpDamageBarChip(this.playerBars, beforeHp, this.player.hp, this.player.maxHp);
      this.playDamageEffect(intent.attackAttribute, PLAYER_EFFECT_X, PLAYER_EFFECT_Y);
      this.showDamageNumber(damage > 0 ? damage : hpDamage, PLAYER_EFFECT_X, PLAYER_EFFECT_Y, damage > 0 ? 'hp' : 'block');
      if (damage === 0) {
        if (beforeBlock > 0 && this.player.block === 0 && hpDamage >= beforeBlock) {
          this.showBrokenShieldEffect(PLAYER_EFFECT_X, PLAYER_EFFECT_Y);
        } else {
          this.showShieldEffect(PLAYER_EFFECT_X, PLAYER_EFFECT_Y);
        }
      } else {
        if (beforeBlock > 0 && this.player.block === 0 && hpDamage >= beforeBlock) {
          this.showBrokenShieldEffect(PLAYER_EFFECT_X, PLAYER_EFFECT_Y);
        }
        this.flashPlayer();
      }
      messages.push(`${this.enemy.name}: ${damage} HP damage`);
    }

    const epDamage = intent.epDamage > 0 ? intent.epDamage : (intent.damageType === 'ep' ? intent.amount : 0);
    if (epDamage > 0) {
      const modifiedAmount = this.modifiedPlayerEpDamage(epDamage);
      this.enemyEpAttackMotion();
      this.playDamageEffect(intent.attackAttribute, PLAYER_EFFECT_X, PLAYER_EFFECT_Y);
      this.showDamageNumber(modifiedAmount, PLAYER_EFFECT_X, PLAYER_EFFECT_Y, 'ep');
      const peaked = await this.applyPlayerEpDamage(epDamage);
      if (!peaked) {
        this.flashPlayer();
      }
      messages.push(peaked ? `${this.enemy.name}: Player EP peak` : `${this.enemy.name}: ${modifiedAmount} EP damage`);
    }
  }

  private async applyEnemySelfDamage(intent: ReturnType<Enemy['currentIntent']>, messages: string[]): Promise<void> {
    const selfHpDamage = intent.selfHpDamage + Math.ceil(this.enemy.hp * intent.selfHpDamagePercent);
    if (selfHpDamage > 0) {
      const beforeHp = this.enemy.hp;
      this.enemy.takeDirectHpDamage(selfHpDamage);
      this.showHpDamageBarChip(this.enemyBars, beforeHp, this.enemy.hp, this.enemy.maxHp);
      this.playDamageEffect(intent.attackAttribute, this.enemyEffectX(), this.enemyEffectY());
      this.showDamageNumber(selfHpDamage, this.enemyEffectX(), this.enemyEffectY(), 'hp');
      this.flashEnemy(this.enemy);
      this.runEnemyDamagedHooks({ enemy: this.enemy, amount: selfHpDamage });
      messages.push(`Enemy self ${selfHpDamage} HP damage`);
    }

    const selfEpDamage = intent.selfEpDamage + Math.ceil(this.enemy.maxEp * intent.selfEpDamagePercent);
    if (selfEpDamage > 0 && !this.enemy.isDefeated) {
      this.playDamageEffect('love', this.enemyEffectX(), this.enemyEffectY());
      this.showDamageNumber(selfEpDamage, this.enemyEffectX(), this.enemyEffectY(), 'ep');
      const peaked = await this.applyEnemyEpDamage(selfEpDamage);
      if (!peaked) {
        this.flashEnemy(this.enemy);
      }
      this.runEnemyDamagedHooks({ enemy: this.enemy, amount: selfEpDamage });
      messages.push(peaked ? `Enemy self ${selfEpDamage} EP damage / EP peak` : `Enemy self ${selfEpDamage} EP damage`);
    }
  }

  private async startNextTurn(): Promise<void> {
    this.isPlayerTurn = true;
    this.setTurnOverlayColor('player');
    this.setHandInputLocked(true);
    this.player.startTurn();
    this.syncPlayerEpReserveAfterTurnRecovery();
    this.updateHud();
    await this.runTurnStartHooks();
    await this.drawCards(5, true);
    this.setHandInputLocked(false);
    this.isAnimating = false;
    this.setEndTurnEnabled(true);
    this.showMessage('Your turn');
    this.updateHud();
  }

  private flashEnemy(enemy = this.enemy): void {
    const view = this.enemyViewFor(enemy);
    if (!view) {
      return;
    }

    view.body.setFillStyle(0xff4657);
    this.tweens.add({
      targets: view.area,
      x: view.area.x + 12,
      duration: 55,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        view.area.setX(view.baseX);
        if (!enemy.isDefeated) {
          view.body.setFillStyle(0x8a414d);
        }
        if (view.enemy === this.enemy) {
          this.updateReticlePosition();
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
        this.playerArea.setX(PLAYER_VISUAL_X);
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
      onComplete: () => {
        this.enemyArea.setX(this.currentEnemyView()?.baseX ?? this.enemyArea.x);
        this.updateReticlePosition();
      },
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
      onComplete: () => {
        this.enemyArea.setY(this.currentEnemyView()?.baseY ?? this.enemyArea.y);
        this.updateReticlePosition();
      },
    });
  }

  private currentEnemyView(): EnemyView | undefined {
    return this.enemyViews[this.selectedEnemyIndex];
  }

  private enemyEffectX(enemy = this.enemy): number {
    return this.enemyViewFor(enemy)?.baseX ?? this.currentEnemyView()?.baseX ?? 910;
  }

  private enemyEffectY(enemy = this.enemy): number {
    return (this.enemyViewFor(enemy)?.baseY ?? this.currentEnemyView()?.baseY ?? 320) - 20;
  }

  private enemyViewFor(enemy: Enemy): EnemyView | undefined {
    return this.enemyViews.find((view) => view.enemy === enemy);
  }

  private healingEffect(): void {
    for (let i = 0; i < 12; i += 1) {
      const x = PLAYER_EFFECT_X + Phaser.Math.Between(-85, 85);
      const y = PLAYER_EFFECT_Y + Phaser.Math.Between(-70, 90);
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
        x: PLAYER_EFFECT_X + Phaser.Math.Between(-44, 44),
        y: PLAYER_EFFECT_Y + Phaser.Math.Between(-54, 28),
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
    flashCount = EP_PEAK_BASE_FLASH_COUNT,
  ): Promise<void> {
    body.setFillStyle(0xff73b8);
    return new Promise((resolve) => {
      this.tweens.add({
        targets: target,
        alpha: 0.45,
        duration: EP_PEAK_FLASH_STEP_DURATION,
        yoyo: true,
        repeat: Math.max(0, flashCount - 1),
        onComplete: () => {
          target.setAlpha(1);
          body.setFillStyle(restoreColor);
          resolve();
        },
      });
    });
  }

  private playerEpPeakFlashCount(peakIndexInDamage: number): number {
    return Math.max(1, EP_PEAK_BASE_FLASH_COUNT - peakIndexInDamage);
  }

  private nextPlayerEpRecoveryValue(): number {
    const reserveStep = Math.max(1, Math.floor(this.player.maxEp * 0.1));
    const reserveCap = Math.floor(this.player.maxEp * 0.9);
    return Math.min(reserveCap, this.playerEpReserveValue + reserveStep);
  }

  private setEpFillImmediate(bars: HudBars, ep: number, maxEp: number, preserveFlash = false): void {
    if (!preserveFlash) {
      this.tweens.killTweensOf(bars.epFill);
      bars.epFill.setFillStyle(EP_FILL_COLOR);
      bars.epFill.setAlpha(1);
    }
    bars.epFill.displayWidth = BAR_WIDTH * Phaser.Math.Clamp(ep / maxEp, 0, 1);
  }

  private flashEpFill(bars: HudBars, flashCount = EP_PEAK_BASE_FLASH_COUNT): Promise<void> {
    this.tweens.killTweensOf(bars.epFill);
    bars.epFill.setFillStyle(0xffd1ea);
    bars.epFill.setAlpha(1);

    return new Promise((resolve) => {
      this.tweens.add({
        targets: bars.epFill,
        alpha: 0.35,
        duration: EP_PEAK_FLASH_STEP_DURATION,
        yoyo: true,
        repeat: Math.max(0, flashCount - 1),
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
    const left = bars.epX;
    const right = bars.epX + width;
    const bottom = bars.epY + BAR_HEIGHT / 2;
    const top = bars.epY - BAR_HEIGHT / 2;

    for (let offset = -BAR_HEIGHT; offset < width; offset += 9) {
      let startX = bars.epX + offset;
      let startY = bottom;
      let endX = bars.epX + offset + BAR_HEIGHT;
      let endY = top;

      if (endX < left || startX > right) {
        continue;
      }

      if (startX < left) {
        const clipped = left - startX;
        startX = left;
        startY -= clipped;
      }

      if (endX > right) {
        const clipped = endX - right;
        endX = right;
        endY += clipped;
      }

      bars.epReserveStripes.lineBetween(startX, startY, endX, endY);
    }
  }

  private chooseEncounterEnemies(totalThreat: number): typeof ENEMY_DEFINITIONS[keyof typeof ENEMY_DEFINITIONS][] {
    const candidates = Object.values(ENEMY_DEFINITIONS)
      .filter((definition) => definition.stages.includes(1) && definition.threat <= totalThreat)
      .sort((a, b) => b.threat - a.threat);
    const selected: typeof candidates = [];
    let remainingThreat = totalThreat;

    while (remainingThreat > 0) {
      const available = candidates.filter((definition) => definition.threat <= remainingThreat);
      if (available.length === 0) {
        break;
      }

      const weighted = available.flatMap((definition) =>
        Array.from({ length: Math.max(1, definition.threat * definition.threat) }, () => definition),
      );
      const picked = Phaser.Utils.Array.GetRandom(weighted);
      selected.push(picked);
      remainingThreat -= picked.threat;

      if (selected.length >= 5) {
        break;
      }
    }

    return selected.length > 0 ? selected : [ENEMY_DEFINITIONS.trainingWraith];
  }

  private animateEpFillTo(
    bars: HudBars,
    ep: number,
    maxEp: number,
    owner: 'player' | 'enemy',
    duration: number,
    preserveFlash = false,
  ): Promise<void> {
    if (owner === 'player') {
      this.playerEpPeakBarOverride = true;
    } else {
      this.enemyEpPeakBarOverride = true;
    }

    if (!preserveFlash) {
      this.tweens.killTweensOf(bars.epFill);
    }
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
    const statusMessages = await this.runStatusTriggersForTiming('turnStart', { player: this.player });
    if (statusMessages.length > 0) {
      this.showMessage(statusMessages.join(' / '));
    }

    for (const entry of this.relicTriggersForTiming('turnStart')) {
      await this.applyRelicTriggerEffects(entry, { player: this.player });
    }
  }

  private async runStatusTriggersForTiming(timing: EffectTiming, context: StatusHookContext = {}): Promise<string[]> {
    const messages: string[] = [];
    for (const entry of this.statusTriggersForTiming(timing, context)) {
      messages.push(...await this.applyStatusTriggerEffects(entry, context));
    }
    return messages;
  }

  private createPurgeCardDefinitionForEnemy(enemy: Enemy, status: StatusEffect): CardDefinition {
    const view = this.enemyViewFor(enemy);
    const targetName = view?.displayName ?? enemy.name;
    return {
      ...CARD_DEFINITIONS.purge,
      description: `On success, remove ${targetName}'s ${status}. Fails if it causes EP Peak.`,
      purgeTargetName: targetName,
      purgeStatus: status,
    };
  }

  private breathingRecoveryMotion(): Promise<void> {
    this.tweens.killTweensOf(this.playerArea);
    this.playerArea.setY(PLAYER_VISUAL_Y);

    return new Promise((resolve) => {
      this.tweens.add({
        targets: this.playerArea,
        y: PLAYER_VISUAL_Y + 16,
        duration: 300,
        ease: 'Sine.easeInOut',
        yoyo: true,
        onComplete: () => {
          this.playerArea.setY(PLAYER_VISUAL_Y);
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
    const chip = this.add.rectangle(bars.hpX + afterWidth, bars.hpY, chipWidth, BAR_HEIGHT, 0xffd166, 0.9);
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

  private showHealNumber(amount: number, x: number, y: number): void {
    if (amount <= 0) {
      return;
    }

    const text = this.add.text(x, y, String(amount), {
      fontFamily: 'Yu Gothic, Meiryo, Arial, sans-serif',
      fontSize: '44px',
      fontStyle: 'bold',
      color: '#42e66f',
      stroke: '#ffffff',
      strokeThickness: 7,
    });
    text.setOrigin(0.5);
    text.setDepth(2600);
    this.tweens.add({
      targets: text,
      y: y - 76,
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

  private defeatEnemy(enemy = this.enemy): Promise<boolean> {
    const defeatedView = this.enemyViewFor(enemy);
    if (!defeatedView) {
      return Promise.resolve(this.enemies.every((candidate) => candidate.isDefeated));
    }

    this.renderStatusIcons(defeatedView.statusIcons, enemy.statuses, true);
    this.hideStatusTooltip();
    defeatedView.body.setFillStyle(0xff4657);

    return new Promise((resolve) => {
      this.tweens.add({
        targets: defeatedView.area,
        alpha: 0,
        y: defeatedView.baseY + 70,
        angle: 9,
        duration: 650,
        ease: 'Sine.easeIn',
        onComplete: () => {
          defeatedView.area.setVisible(false);
          const victory = this.enemies.every((candidate) => candidate.isDefeated);
          if (victory) {
            this.isGameOver = true;
            this.isAnimating = true;
            this.setEndTurnEnabled(false);
            this.reticle.setVisible(false);
            this.showResult('VICTORY', 0x1f8f5f);
            this.time.delayedCall(700, () => {
              this.resultOverlay.removeAll(true);
              this.resultOverlay.setVisible(false);
              if (!this.scene.isActive('RewardScene')) {
                this.scene.launch('RewardScene');
              }
            });
            resolve(true);
            return;
          }

          this.selectNextAliveEnemy();
          this.isAnimating = false;
          this.updateHud();
          resolve(false);
        }
      });
    });
  }

  private startContinuousPlayerEpPeakFlash(): () => void {
    this.tweens.killTweensOf(this.playerArea);
    this.tweens.killTweensOf(this.playerBars.epFill);
    this.playerBody.setFillStyle(0xff73b8);
    this.playerArea.setAlpha(1);
    this.playerBars.epFill.setFillStyle(0xffd1ea);
    this.playerBars.epFill.setAlpha(1);

    this.tweens.add({
      targets: this.playerArea,
      alpha: 0.45,
      duration: EP_PEAK_FLASH_STEP_DURATION,
      yoyo: true,
      repeat: -1,
    });
    this.tweens.add({
      targets: this.playerBars.epFill,
      alpha: 0.35,
      duration: EP_PEAK_FLASH_STEP_DURATION,
      yoyo: true,
      repeat: -1,
    });

    return () => {
      this.tweens.killTweensOf(this.playerArea);
      this.tweens.killTweensOf(this.playerBars.epFill);
      this.playerArea.setAlpha(1);
      this.playerBody.setFillStyle(0x467fb1);
      this.playerBars.epFill.setAlpha(1);
      this.playerBars.epFill.setFillStyle(EP_FILL_COLOR);
    };
  }

  private defeatPlayer(): void {
    this.isGameOver = true;
    this.isAnimating = true;
    this.setEndTurnEnabled(false);
    this.tweens.add({
      targets: this.playerArea,
      alpha: 0.25,
      y: this.playerArea.y + 28,
      duration: 550,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this.showResult('DEFEAT', 0x9c2d39);
        this.time.delayedCall(850, () => this.scene.start('DefeatEventScene'));
      },
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

    this.playerHud.setText(this.player.name);
    const animateBars = this.hasRenderedHud;
    this.updateBars(this.playerBars, this.player.hp, this.player.maxHp, this.player.block, this.player.ep, this.player.maxEp, animateBars);
    this.updateEnemyHuds(animateBars);
    this.hasRenderedHud = true;

    this.energyText.setText(`${this.player.energy}/${this.player.maxEnergy}`);
    this.deckPileText.setText(`Deck: ${this.deck.drawPile.length}`);
    this.handPileText.setText(`Hand: ${this.deck.hand.length}`);
    this.discardPileText.setText(`Discard: ${this.deck.discardPile.length}`);
    this.renderStatusIcons(this.playerStatusIcons, this.player.statuses);
    this.updateCardEffectTexts();
  }

  private updateEnemyHuds(animateBars: boolean): void {
    this.enemyViews.forEach((view) => {
      view.hudText.setText(view.displayName);
      view.hudText.setVisible(!view.enemy.isDefeated);
      this.updateBars(view.bars, view.enemy.hp, view.enemy.maxHp, view.enemy.block, view.enemy.ep, view.enemy.maxEp, animateBars);
      this.setBarsVisible(view.bars, !view.enemy.isDefeated);
      this.renderStatusIcons(view.statusIcons, view.enemy.statuses, view.enemy.isDefeated);

      const intent = view.enemy.currentIntent();
      const renderedIntent = this.enemyIntentDisplay(intent, view.enemy);
      this.renderEnemyIntentText(view.intentText, renderedIntent.segments, '#f8fafc', !view.enemy.isDefeated);
    });
  }

  private setBarsVisible(bars: HudBars, visible: boolean): void {
    bars.hpBg.setVisible(visible);
    bars.hpFill.setVisible(visible);
    bars.hpText.setVisible(visible);
    bars.blockFill.setVisible(visible && bars.blockFill.visible);
    bars.blockShield.setVisible(visible && bars.blockShield.visible);
    bars.blockText.setVisible(visible && bars.blockText.visible);
    bars.epBg.setVisible(visible && bars.hasEp);
    bars.epFill.setVisible(visible && bars.hasEp);
    bars.epText.setVisible(visible && bars.hasEp);
    bars.epReserveFill.setVisible(visible && bars.hasEp);
    bars.epReserveStripes.setVisible(visible && bars.hasEp);
  }

  private enemyIntentDisplay(intent: ReturnType<Enemy['currentIntent']>, enemy = this.enemy): { segments: CardEffectSegment[] } {
    const prefix = intent.causedByStatus ? `${intent.causedByStatus}: ` : '';
    const segments: CardEffectSegment[] = [{ text: `${prefix}${intent.label} ` }];

    const hpDamage = intent.hpDamage > 0 ? intent.hpDamage : (intent.damageType === 'hp' ? intent.amount : 0);
    const epDamage = intent.epDamage > 0 ? intent.epDamage : (intent.damageType === 'ep' ? intent.amount : 0);

    if (hpDamage > 0) {
      segments.push({ text: String(hpDamage), color: '#ff6b72' });
    }

    if (hpDamage > 0 && epDamage > 0) {
      segments.push({ text: ' / ' });
    }

    if (epDamage > 0) {
      const modifiedEpDamage = this.modifiedPlayerEpDamage(epDamage);
      segments.push({ text: String(modifiedEpDamage), bold: modifiedEpDamage !== epDamage, color: '#ff73b8' });
    }

    if (intent.selfHpDamage > 0 || intent.selfHpDamagePercent > 0 || intent.selfEpDamage > 0 || intent.selfEpDamagePercent > 0) {
      segments.push({ text: ' / self ' });
      segments.push({ text: String(intent.selfHpDamage + intent.selfEpDamage + Math.ceil(enemy.hp * intent.selfHpDamagePercent) + Math.ceil(enemy.maxEp * intent.selfEpDamagePercent)) });
    }

    return {
      segments,
    };
  }

  private renderEnemyIntentText(
    container: Phaser.GameObjects.Container,
    segments: CardEffectSegment[],
    color: string,
    visible = true,
  ): void {
    container.removeAll(true);
    container.setVisible(visible);
    if (!visible) {
      return;
    }

    const textObjects = segments.map((segment) => {
      const text = this.add.text(0, 0, segment.text, {
        fontFamily: 'Arial',
        fontSize: '20px',
        fontStyle: segment.bold ? 'bold' : 'normal',
        color: segment.color ?? color,
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

    container.add([bg, ...textObjects]);
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
    bars.hpText.setText(`${hp}/${maxHp}`);
    bars.epText.setText(`${ep}/${maxEp}`);
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
    this.updateHudBlockShield(bars, block, maxHp);
    if (!bars.hasEp || maxEp <= 0) {
      this.tweens.killTweensOf(bars.epFill);
      bars.epBg.setVisible(false);
      bars.epFill.setVisible(false);
      bars.epText.setVisible(false);
      bars.epReserveFill.setVisible(false);
      bars.epReserveStripes.setVisible(false);
      return;
    }

    const epPeakOverride =
      (bars === this.playerBars && this.playerEpPeakBarOverride) ||
      (bars !== this.playerBars && this.enemyEpPeakBarOverride);
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

  private updateHudBlockShield(bars: HudBars, block: number, maxHp: number): void {
    if (block <= 0) {
      bars.blockFill.setVisible(false);
      bars.blockShield.setVisible(false);
      bars.blockText.setVisible(false);
      return;
    }

    bars.blockFill.displayWidth = BAR_WIDTH * Phaser.Math.Clamp(block / maxHp, 0, 1);
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
