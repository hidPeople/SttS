import Phaser from 'phaser';
import { CARD_DEFINITIONS, createDeckDefinitions } from '../data/cards';
// DEBUG_MODE_START
import { appendDebugSettingsButtons, debugEncounterThreat } from '../debug/debugMode';
// DEBUG_MODE_END
import { ENEMY_DEFINITIONS } from '../data/enemies';
import { PLAYER_DEFINITION } from '../data/player';
import { RELIC_DEFINITIONS } from '../data/relics';
import { STATUS_DESCRIPTIONS, sensitivityStatusId, statusTriggersForTiming, type SensitivityLevel } from '../data/statuses';
import { Enemy, Player } from '../models/Combatants';
import { evaluateConditions } from '../models/conditions';
import { Deck } from '../models/Deck';
import { localize, SETTINGS_STATE, text as l, toggleLanguage, type LocalizedText } from '../models/localization';
import { RUN_STATE, currentEncounterThreat, resetRunState, saveRunVitals } from '../models/RunState';
import { EFFECT_TIMINGS, EP_DAMAGE_PARTS } from '../models/types';
import type {
  AttackAttribute,
  BattleFlavorKey,
  BattleFlavorLine,
  BattleLogKind,
  BattleEventContext,
  CardDefinition,
  CardInstance,
  EffectDefinition,
  EffectTiming,
  EpDamagePart,
  RelicDefinition,
  RelicTriggerDefinition,
  StatusDefinition,
  StatusEffect,
  StatusTriggerDefinition,
} from '../models/types';

const MUCUS_EFFECT_KEY = 'mucus-effect';
const MUCUS_EFFECT_ANIMATION_KEY = 'mucus-effect-play';
const MUCUS_SPRITE_URL = new URL('../../Sprite/mucus.png', import.meta.url).href;
const SLASH_EFFECT_KEY = 'slash-effect';
const SLASH_EFFECT_ANIMATION_KEY = 'slash-effect-play';
const SLASH_SPRITE_URL = new URL('../../Sprite/slash.png', import.meta.url).href;
const SLICE_EFFECT_KEY = 'slice-effect';
const SLICE_EFFECT_ANIMATION_KEY = 'slice-effect-play';
const SLICE_SPRITE_URL = new URL('../../Sprite/slice.png', import.meta.url).href;
const STRIKE_EFFECT_KEY = 'strike-effect';
const STRIKE_EFFECT_ANIMATION_KEY = 'strike-effect-play';
const STRIKE_SPRITE_URL = new URL('../../Sprite/strike.png', import.meta.url).href;
const SLIME_IDLE_KEY = 'slime-idle';
const SLIME_IDLE_ANIMATION_KEY = 'slime-idle-play';
const SLIME_IDLE_SPRITE_URL = new URL('../../Sprite/slime_idle.png', import.meta.url).href;
const GRUNT_IDLE_KEY = 'grunt-idle';
const GRUNT_IDLE_ANIMATION_KEY = 'grunt-idle-play';
const GRUNT_IDLE_SPRITE_URL = new URL('../../Sprite/grunt_idle.png', import.meta.url).href;
const BATTLE_BACKGROUND_KEY = 'battle-background-1';
const BATTLE_BACKGROUND_URL = new URL('../../image/Background1.png', import.meta.url).href;
const HEART_EFFECTS = [
  {
    key: 'heart-effect-1',
    animationKey: 'heart-effect-1-play',
    url: new URL('../../Sprite/heart1.png', import.meta.url).href,
  },
  {
    key: 'heart-effect-2',
    animationKey: 'heart-effect-2-play',
    url: new URL('../../Sprite/heart2.png', import.meta.url).href,
  },
  {
    key: 'heart-effect-3',
    animationKey: 'heart-effect-3-play',
    url: new URL('../../Sprite/heart3.png', import.meta.url).href,
  },
  {
    key: 'heart-effect-4',
    animationKey: 'heart-effect-4-play',
    url: new URL('../../Sprite/heart4.png', import.meta.url).href,
  },
  {
    key: 'heart-effect-5',
    animationKey: 'heart-effect-5-play',
    url: new URL('../../Sprite/heart5.png', import.meta.url).href,
  },
];

type CardView = {
  card: CardInstance;
  container: Phaser.GameObjects.Container;
  hitArea: Phaser.GameObjects.Rectangle;
  costText: Phaser.GameObjects.Text;
  nameText: Phaser.GameObjects.Text;
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

type IndexedRelicTrigger = {
  relic: RelicDefinition;
  trigger: RelicTriggerDefinition;
};

type IndexedStatusTrigger = {
  status: StatusEffect;
  definition: StatusDefinition;
  trigger: StatusTriggerDefinition;
  owner: Player | Enemy;
};

type StatusTriggerRunOptions = {
  skipEffectKinds?: ReadonlySet<EffectDefinition['kind']>;
};

type BattleEventContextInput = Partial<BattleEventContext> & Pick<BattleEventContext, 'source'>;

type EffectExecutionResult = {
  messages: string[];
  causedPlayerEpPeak: boolean;
  damagedEnemies: Map<Enemy, number>;
};

type BattleLogEntry = {
  id: number;
  kind: BattleLogKind;
  text: LocalizedText | (() => LocalizedText);
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
  epMaxText: Phaser.GameObjects.Text;
  epReserveFill: Phaser.GameObjects.Rectangle;
  epReserveStripes: Phaser.GameObjects.Graphics;
  hasEp: boolean;
  hpX: number;
  hpY: number;
  epX: number;
  epY: number;
};

type EnemyIdleVisualConfig = {
  textureKey: string;
  animationKey: string;
  displayWidth: number;
  displayHeight: number;
  shadowY: number;
  shadowWidth: number;
  shadowHeight: number;
  hitAreaY: number;
  hitAreaWidth: number;
  hitAreaHeight: number;
  hudOffsetY: number;
  barOffsetY: number;
  statusOffsetY: number;
  intentOffsetY: number;
  effectOffsetY: number;
};

const ENEMY_IDLE_VISUALS: Record<string, EnemyIdleVisualConfig> = {
  slime: {
    textureKey: SLIME_IDLE_KEY,
    animationKey: SLIME_IDLE_ANIMATION_KEY,
    displayWidth: 190,
    displayHeight: 190,
    shadowY: 86,
    shadowWidth: 180,
    shadowHeight: 34,
    hitAreaY: 0,
    hitAreaWidth: 205,
    hitAreaHeight: 190,
    hudOffsetY: 108,
    barOffsetY: 132,
    statusOffsetY: 164,
    intentOffsetY: -110,
    effectOffsetY: 0,
  },
  grunt: {
    textureKey: GRUNT_IDLE_KEY,
    animationKey: GRUNT_IDLE_ANIMATION_KEY,
    displayWidth: 230,
    displayHeight: 230,
    shadowY: 102,
    shadowWidth: 164,
    shadowHeight: 30,
    hitAreaY: 0,
    hitAreaWidth: 170,
    hitAreaHeight: 220,
    hudOffsetY: 124,
    barOffsetY: 148,
    statusOffsetY: 206,
    intentOffsetY: -126,
    effectOffsetY: 0,
  },
};

type EnemyView = {
  enemy: Enemy;
  displayName: string;
  area: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Sprite;
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
const PART_SENSITIVITY_LEVEL_THRESHOLDS = [100, 250, 450, 700, 1000] as const;
const PART_SENSITIVITY_MULTIPLIERS = [1, 1.2, 1.5, 2, 3, 5] as const;
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
  private enemyBody!: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Sprite;
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
  private logPanel!: Phaser.GameObjects.Container;
  private logBg!: Phaser.GameObjects.Rectangle;
  private logHitArea!: Phaser.GameObjects.Rectangle;
  private logTextObjects: Phaser.GameObjects.Text[] = [];
  private logScrollbar!: Phaser.GameObjects.Rectangle;
  private battleLogs: BattleLogEntry[] = [];
  private nextBattleLogId = 1;
  private logHistoryMode = false;
  private logScrollOffset = 0;
  private statusTooltip!: Phaser.GameObjects.Container;
  private statusTooltipBg!: Phaser.GameObjects.Rectangle;
  private statusTooltipText!: Phaser.GameObjects.Text;
  private statusTooltipStatus?: StatusEffect;
  private statusTooltipOwner?: Phaser.GameObjects.Container;
  private resultOverlay!: Phaser.GameObjects.Container;
  private modalOverlay!: Phaser.GameObjects.Container;
  private relicsByTiming = new Map<EffectTiming, IndexedRelicTrigger[]>();
  private relicIconViews = new Map<string, Phaser.GameObjects.Container>();
  private statusIconViews = new WeakMap<Phaser.GameObjects.Container, Map<StatusEffect, Phaser.GameObjects.Container>>();

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
  private retainPlayerBlockThisTurn = false;
  private hasRenderedHud = false;
  private cardsPlayedThisTurn = 0;
  private playerEpPeaksThisCycle = 0;
  private isResolvingCardEffects = false;
  private promotedFrustratedToCravingDuringCurrentCard = false;

  constructor() {
    super('BattleScene');
  }

  preload(): void {
    this.load.image(BATTLE_BACKGROUND_KEY, BATTLE_BACKGROUND_URL);
    this.load.spritesheet(MUCUS_EFFECT_KEY, MUCUS_SPRITE_URL, {
      frameWidth: 200,
      frameHeight: 200,
      endFrame: 15,
    });
    this.load.spritesheet(SLASH_EFFECT_KEY, SLASH_SPRITE_URL, {
      frameWidth: 200,
      frameHeight: 200,
      endFrame: 15,
    });
    this.load.spritesheet(SLICE_EFFECT_KEY, SLICE_SPRITE_URL, {
      frameWidth: 200,
      frameHeight: 200,
      endFrame: 15,
    });
    this.load.spritesheet(STRIKE_EFFECT_KEY, STRIKE_SPRITE_URL, {
      frameWidth: 200,
      frameHeight: 200,
      endFrame: 15,
    });
    this.load.spritesheet(SLIME_IDLE_KEY, SLIME_IDLE_SPRITE_URL, {
      frameWidth: 200,
      frameHeight: 200,
      endFrame: 15,
    });
    this.load.spritesheet(GRUNT_IDLE_KEY, GRUNT_IDLE_SPRITE_URL, {
      frameWidth: 200,
      frameHeight: 200,
      endFrame: 15,
    });
    HEART_EFFECTS.forEach((effect) => {
      this.load.spritesheet(effect.key, effect.url, {
        frameWidth: 200,
        frameHeight: 200,
        endFrame: 15,
      });
    });
  }

  create(): void {
    this.isAnimating = false;
    this.isGameOver = false;
    this.isPlayerTurn = true;
    this.canEndTurn = false;
    this.playerEpPeakBarOverride = false;
    this.enemyEpPeakBarOverride = false;
    this.playerEpReserveOverride = false;
    this.retainPlayerBlockThisTurn = false;
    this.playerEpReserveValue = 0;
    this.hasRenderedHud = false;
    this.cardsPlayedThisTurn = 0;
    this.playerEpPeaksThisCycle = 0;
    this.cardViews.clear();
    this.battleLogs = [];
    this.nextBattleLogId = 1;
    this.logHistoryMode = false;
    this.logScrollOffset = 0;
    this.relicIconViews.clear();
    this.statusIconViews = new WeakMap<Phaser.GameObjects.Container, Map<StatusEffect, Phaser.GameObjects.Container>>();
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
    this.player.epPeakCount = RUN_STATE.playerEpPeakCount;
    this.player.epDamageByPart = { ...RUN_STATE.playerEpDamageByPart };
    this.player.epPeakByPart = { ...RUN_STATE.playerEpPeakByPart };
    for (const status of RUN_STATE.playerStatuses) {
      if (status.stacks > 0) {
        this.player.statuses.set(status.effect, status.stacks);
      }
    }
    this.player.ep = Phaser.Math.Clamp(RUN_STATE.playerEp, 0, this.playerEffectiveMaxEp());
    this.playerEpReserveValue = Phaser.Math.Clamp(RUN_STATE.playerEpReserveValue, 0, this.playerEffectiveMaxEp());
    let encounterThreat = currentEncounterThreat();
    // DEBUG_MODE_START
    encounterThreat = debugEncounterThreat(encounterThreat);
    // DEBUG_MODE_END
    this.enemies = this.chooseEncounterEnemies(encounterThreat).map((definition) => new Enemy(definition));
    this.enemy = this.enemies[0];
    this.deck = new Deck(createDeckDefinitions(RUN_STATE.deckIds));
    this.indexPlayerRelics();
    this.createEffectAnimations();

    this.createArena();
    this.createPlayer();
    this.createEnemy();
    this.createTurnOverlay();
    this.createHud();
    this.createSettingsButton();
    this.createEndTurnButton();
    this.setPlayerEpReserveValue(this.playerEpReserveValue, this.playerEffectiveMaxEp(), false);

    this.runBattleStartHooks();
    void this.startInitialTurn();
  }

  persistRunVitals(): void {
    saveRunVitals(
      this.player.hp,
      this.player.ep,
      this.player.epPeakCount,
      this.playerEpReserveValue,
      this.player.epDamageByPart,
      this.player.epPeakByPart,
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
    this.startTurnCounters();
    this.player.startTurn(false);
    this.syncPlayerEpReserveAfterTurnRecovery();
    this.updateHud();
    await this.runTurnStartHooks();
    this.clearPlayerBlockAfterTurnStartHooks();
    await this.drawCards(5, true);
    await this.runPlayerActionStartHooks();
    this.isAnimating = false;
    this.setEndTurnEnabled(true);
    this.updateHud();
    this.showMessage(l('==== Your turn ====', '==== あなたのターン ===='));
  }

  private startTurnCounters(): void {
    this.cardsPlayedThisTurn = 0;
    this.playerEpPeaksThisCycle = 0;
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

  private createEffectAnimations(): void {
    if (!this.anims.exists(MUCUS_EFFECT_ANIMATION_KEY)) {
      this.anims.create({
        key: MUCUS_EFFECT_ANIMATION_KEY,
        frames: this.anims.generateFrameNumbers(MUCUS_EFFECT_KEY, { start: 0, end: 15 }),
        frameRate: 24,
        repeat: 0,
      });
    }

    if (!this.anims.exists(SLICE_EFFECT_ANIMATION_KEY)) {
      this.anims.create({
        key: SLICE_EFFECT_ANIMATION_KEY,
        frames: this.anims.generateFrameNumbers(SLICE_EFFECT_KEY, { start: 0, end: 15 }),
        frameRate: 24,
        repeat: 0,
      });
    }

    if (!this.anims.exists(SLASH_EFFECT_ANIMATION_KEY)) {
      this.anims.create({
        key: SLASH_EFFECT_ANIMATION_KEY,
        frames: this.anims.generateFrameNumbers(SLASH_EFFECT_KEY, { start: 0, end: 15 }),
        frameRate: 24,
        repeat: 0,
      });
    }

    if (!this.anims.exists(STRIKE_EFFECT_ANIMATION_KEY)) {
      this.anims.create({
        key: STRIKE_EFFECT_ANIMATION_KEY,
        frames: this.anims.generateFrameNumbers(STRIKE_EFFECT_KEY, { start: 0, end: 15 }),
        frameRate: 24,
        repeat: 0,
      });
    }

    if (!this.anims.exists(SLIME_IDLE_ANIMATION_KEY)) {
      this.anims.create({
        key: SLIME_IDLE_ANIMATION_KEY,
        frames: this.anims.generateFrameNumbers(SLIME_IDLE_KEY, { start: 0, end: 15 }),
        frameRate: 1000 / 120,
        repeat: -1,
      });
    }

    if (!this.anims.exists(GRUNT_IDLE_ANIMATION_KEY)) {
      this.anims.create({
        key: GRUNT_IDLE_ANIMATION_KEY,
        frames: this.anims.generateFrameNumbers(GRUNT_IDLE_KEY, { start: 0, end: 15 }),
        frameRate: 1000 / 120,
        repeat: -1,
      });
    }

    HEART_EFFECTS.forEach((effect) => {
      if (!this.anims.exists(effect.animationKey)) {
        this.anims.create({
          key: effect.animationKey,
          frames: this.anims.generateFrameNumbers(effect.key, { start: 0, end: 15 }),
          frameRate: 20,
          repeat: 0,
        });
      }
    });
  }

  private createArena(): void {
    const background = this.add.image(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, BATTLE_BACKGROUND_KEY);
    background.setDisplaySize(SCREEN_WIDTH, SCREEN_HEIGHT);
    background.setDepth(-20);
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
    this.playerArea = this.add.container(PLAYER_VISUAL_X, this.playerVisualY());
    this.playerArea.setScale(PLAYER_VISUAL_SCALE);

    this.playerBody = this.add.rectangle(0, 20, 185, 260, 0x467fb1, 1);
    this.playerBody.setStrokeStyle(4, 0xb4d8f5, 0.75);

    const head = this.add.circle(0, -135, 48, 0x76b1df);

    this.playerArea.add([this.playerBody, head]);
  }

  private playerVisualY(): number {
    return PLAYER_VISUAL_Y + (this.player?.hasStatus('Fainted') ? 38 : 0);
  }

  private playerEffectY(): number {
    return this.playerVisualY() + 30;
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
    enemies.forEach((enemy) => {
      const name = localize(enemy.definition.name);
      nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
    });

    const occurrences = new Map<string, number>();
    return enemies.map((enemy) => {
      const name = localize(enemy.definition.name);
      const total = nameCounts.get(name) ?? 0;
      if (total <= 1) {
        return name;
      }

      const occurrence = occurrences.get(name) ?? 0;
      occurrences.set(name, occurrence + 1);
      return `${name} ${this.enemyIdentifier(occurrence)}`;
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
    const visual = ENEMY_IDLE_VISUALS[enemy.definition.id];
    const shadow = this.add.ellipse(
      0,
      visual?.shadowY ?? 140,
      visual?.shadowWidth ?? 230,
      visual?.shadowHeight ?? 48,
      0x0c0f12,
      0.6,
    );
    const body: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Sprite = visual
      ? this.add.sprite(0, 0, visual.textureKey, 0)
      : this.add.rectangle(0, 0, 155, 210, 0x8a414d, 1);
    if (body instanceof Phaser.GameObjects.Sprite) {
      body.setDisplaySize(visual.displayWidth, visual.displayHeight);
      body.play(visual.animationKey);
    } else {
      body.setStrokeStyle(4, 0xf0a2a7, 0.75);
    }
    const head = visual ? undefined : this.add.circle(0, -132, 42, 0xb95d68);
    const hitArea = this.add.rectangle(
      0,
      visual?.hitAreaY ?? -30,
      visual?.hitAreaWidth ?? 190,
      visual?.hitAreaHeight ?? 270,
      0xffffff,
      0,
    );
    hitArea.setInteractive({ useHandCursor: true });
    hitArea.on('pointerup', () => this.selectEnemyByEnemy(enemy));
    area.add(head ? [shadow, body, head, hitArea] : [shadow, body, hitArea]);
    area.setScale(visual ? 1 : 0.5);

    const hudY = y + (visual?.hudOffsetY ?? 92);
    const barY = y + (visual?.barOffsetY ?? 116);
    const hudText = this.add.text(x - BAR_WIDTH / 2, hudY, displayName, this.hudStyle(15));
    const bars = this.createHudBars(x - BAR_WIDTH / 2, barY, 'enemy', enemy);
    const statusIcons = this.add.container(x - BAR_WIDTH / 2 + 2, this.enemyStatusIconY(enemy, y));
    statusIcons.setDepth(25);
    const intentText = this.add.container(x, y + (visual?.intentOffsetY ?? -110));

    return { enemy, displayName, area, body, hudText, bars, statusIcons, intentText, baseX: x, baseY: y };
  }

  private enemyStatusIconY(enemy: Enemy, baseY: number): number {
    const visual = ENEMY_IDLE_VISUALS[enemy.definition.id];
    if (visual) {
      return baseY + visual.statusOffsetY;
    }
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
    if (this.isModalOpen()) {
      return;
    }

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
    this.createBattleLogPanel();

    this.resultOverlay = this.add.container(0, 0);
    this.resultOverlay.setDepth(3000);
    this.resultOverlay.setVisible(false);

    this.modalOverlay = this.add.container(0, 0);
    this.modalOverlay.setDepth(7000);
    this.modalOverlay.setVisible(false);

    this.pileOverlay = this.add.container(0, 0);
    this.pileOverlay.setDepth(4200);
    this.pileOverlay.setVisible(false);

    this.createStatusTooltip();
  }

  private createBattleLogPanel(): void {
    const x = 300;
    const y = 266;
    const width = 283;
    const height = 232;
    const maxLogLines = 10;
    const lineHeight = 20;
    const bottomMargin = 14;
    const scrollbarThumbHeight = 38;
    const scrollbarTop = 10;
    const scrollbarTravel = height - scrollbarTop * 2 - scrollbarThumbHeight;
    const bg = this.add.rectangle(0, 0, width, height, 0x0d1218, 0.78);
    bg.setOrigin(0, 0);
    bg.setStrokeStyle(2, 0x40526a, 0.82);
    this.logBg = bg;
    this.logHitArea = this.add.rectangle(0, 0, width, height, 0xffffff, 0);
    this.logHitArea.setOrigin(0, 0);
    this.logHitArea.setInteractive({ useHandCursor: true });
    this.logHitArea.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      pointer.event?.stopPropagation();
      this.logHistoryMode = true;
      this.logScrollOffset = 0;
      this.renderBattleLog();
    });

    this.logTextObjects = Array.from({ length: maxLogLines }, (_, index) => {
      const textY = height - bottomMargin - maxLogLines * lineHeight + index * lineHeight;
      const text = this.add.text(14, textY, '', {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#dfe8f5',
        wordWrap: { width: width - 42, useAdvancedWrap: true },
      });
      return text;
    });

    this.logScrollbar = this.add.rectangle(width - 12, 10, 5, 38, 0x8fa4c2, 0.8);
    this.logScrollbar.setOrigin(0.5, 0);
    this.logScrollbar.setInteractive({ draggable: true });
    this.input.setDraggable(this.logScrollbar);
    this.logScrollbar.on('drag', (pointer: Phaser.Input.Pointer) => {
      if (!this.logHistoryMode) {
        return;
      }
      const visibleCount = this.visibleLogLineCount();
      const maxOffset = Math.max(0, this.battleLogs.length - visibleCount);
      const localY = Phaser.Math.Clamp(pointer.y - y, scrollbarTop, scrollbarTop + scrollbarTravel);
      const ratio = (scrollbarTop + scrollbarTravel - localY) / scrollbarTravel;
      this.logScrollOffset = Phaser.Math.Clamp(Math.round(ratio * maxOffset), 0, maxOffset);
      this.renderBattleLog();
    });

    this.logPanel = this.add.container(x, y, [bg, this.logHitArea, ...this.logTextObjects, this.logScrollbar]);
    this.logPanel.setDepth(45);
    this.renderBattleLog();

    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _objects: Phaser.GameObjects.GameObject[], _dx: number, dy: number) => {
      if (!this.logHistoryMode) {
        return;
      }
      const maxOffset = Math.max(0, this.battleLogs.length - this.visibleLogLineCount());
      this.logScrollOffset = Phaser.Math.Clamp(this.logScrollOffset + (dy > 0 ? -1 : 1), 0, maxOffset);
      this.renderBattleLog();
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.logHistoryMode) {
        return;
      }

      const localX = pointer.x - this.logPanel.x;
      const localY = pointer.y - this.logPanel.y;
      const insideLog = localX >= 0 && localX <= width && localY >= 0 && localY <= height;
      if (!insideLog) {
        this.closeLogHistoryMode();
      }
    });
  }

  private closeLogHistoryMode(): void {
    this.logHistoryMode = false;
    this.logScrollOffset = 0;
    this.renderBattleLog();
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
    const name = this.add.text(0, -42, localize(definition.name), {
      fontFamily: 'Arial',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#1e252c',
      align: 'center',
      wordWrap: { width: CARD_WIDTH - 24, useAdvancedWrap: true },
    });
    name.setOrigin(0.5);
    const text = this.add.text(0, 36, localize(definition.description), {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#26313c',
      align: 'center',
      wordWrap: { width: CARD_WIDTH - 24, useAdvancedWrap: true },
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
      const iconGroup = this.add.container(x, 0);
      const icon = this.add.rectangle(0, 0, 34, 34, 0x6f4f2d, 1);
      icon.setStrokeStyle(2, 0xf1c27d, 0.9);
      icon.setInteractive({ useHandCursor: true });

      const label = this.add.text(0, 0, this.relicIconText(relic), {
        fontFamily: 'Arial',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#ffffff',
      });
      label.setOrigin(0.5);

      const children: Phaser.GameObjects.GameObject[] = [icon, label];
      if (typeof relic.counter === 'number') {
        const counter = this.add.text(12, 11, String(relic.counter), {
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
        this.showStatusTooltipText(`${localize(relic.name)}\n${localize(relic.description)}`, this.relicIcons.x + x - 8, this.relicIcons.y + 28);
      });
      icon.on('pointerout', () => this.hideStatusTooltip());

      iconGroup.add(children);
      this.relicIconViews.set(relic.id, iconGroup);
      this.relicIcons.add(iconGroup);
    });
  }

  private relicIconText(relic: RelicDefinition): string {
    return localize(relic.name).slice(0, 2);
  }

  private relicTriggersForTiming(timing: EffectTiming): IndexedRelicTrigger[] {
    return this.relicsByTiming.get(timing) ?? [];
  }

  private statusHasTiming(status: StatusEffect, timing: EffectTiming): boolean {
    return statusTriggersForTiming(status, timing).length > 0;
  }

  private playerEffectiveMaxEp(): number {
    let multiplier = 1;
    for (const [status, stacks] of this.player.statuses.entries()) {
      if (stacks <= 0) {
        continue;
      }

      for (const trigger of statusTriggersForTiming(status, EFFECT_TIMINGS.Passive)) {
        for (const modifier of trigger.modifiers ?? []) {
          if (modifier.kind === 'epMaxMultiplier' && modifier.target === 'player') {
            multiplier = Math.max(multiplier, modifier.amount);
          }
        }
      }
    }

    return Math.max(1, Math.ceil(this.player.maxEp * multiplier));
  }

  private isPlayerMaxEpModified(): boolean {
    return this.playerEffectiveMaxEp() !== this.player.maxEp;
  }

  private battleEventContext(input: BattleEventContextInput): BattleEventContext {
    const actor = input.actor ?? this.player;
    return {
      sourceName: input.sourceName ?? 'System',
      player: this.player,
      enemies: this.enemies,
      actor,
      selectedEnemy: this.enemy,
      cardsPlayedThisTurn: this.cardsPlayedThisTurn,
      isPlayerTurn: this.isPlayerTurn,
      ...input,
    };
  }

  private sourceDisplayName(context: BattleEventContext): string {
    if (context.card) {
      return localize(context.card.name);
    }
    if (context.relic) {
      return localize(context.relic.name);
    }
    if (context.status) {
      return this.statusDisplayName(context.status);
    }
    if (context.intent) {
      return localize(context.intent.label);
    }
    return context.sourceName;
  }

  private combatantDisplayName(combatant: Player | Enemy): string {
    if (combatant === this.player) {
      return localize(this.player.definition.name);
    }
    if (combatant instanceof Enemy) {
      const view = this.enemyViewFor(combatant);
      return view?.displayName ?? localize(combatant.definition.name);
    }
    return combatant.name;
  }

  private statusDisplayName(status: StatusEffect): string {
    return localize(STATUS_DESCRIPTIONS[status]?.name ?? status);
  }

  private statusConsumesEachTurn(status: StatusEffect): boolean {
    return STATUS_DESCRIPTIONS[status]?.consumeEachTurn === 1;
  }

  private statusRemovalLog(context: BattleEventContext, effect: EffectDefinition): LocalizedText {
    const sourceName = this.sourceDisplayName(context);
    const actionEn = effect.kind === 'removeStatus' ? 'removed' : 'cleared';
    const actionJa = effect.kind === 'removeStatus' ? '解除' : '消去';
    const statusName = effect.status ? this.statusDisplayName(effect.status) : '状態';
    const isSameStatus = effect.status !== undefined && sourceName === statusName;

    return l(
      isSameStatus ? `${sourceName}: ${actionEn}` : `${sourceName}: ${actionEn} ${effect.status ?? 'status'}`,
      isSameStatus ? `${sourceName}：${actionJa}` : `${sourceName}：${statusName}を${actionJa}`,
    );
  }

  private statusTriggersForTiming(timing: EffectTiming, context: Partial<BattleEventContext> = {}): IndexedStatusTrigger[] {
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
          const triggerContext = this.battleEventContext({
            ...context,
            source: 'status',
            sourceName: this.statusDisplayName(status),
            actor: owner,
            statusOwner: owner,
            status,
            statusStacks: stacks,
            statusTrigger: trigger,
            triggerEnemy: context.triggerEnemy ?? context.selectedEnemy ?? (owner instanceof Enemy ? owner : undefined),
          });
          if (evaluateConditions(trigger.conditions, triggerContext)) {
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

  private runBattleStartHooks(): void {
    for (const entry of this.relicTriggersForTiming(EFFECT_TIMINGS.BattleStart)) {
      void this.applyRelicTriggerEffects(entry, this.battleEventContext({
        source: 'relic',
        sourceName: localize(entry.relic.name),
        actor: this.player,
        relic: entry.relic,
      }));
    }
  }

  private runCardDrawnHooks(context: Partial<BattleEventContext>): void {
    for (const entry of this.relicTriggersForTiming(EFFECT_TIMINGS.CardDrawn)) {
      void this.applyRelicTriggerEffects(entry, this.battleEventContext({
        ...context,
        source: 'relic',
        sourceName: localize(entry.relic.name),
        actor: this.player,
        relic: entry.relic,
      }));
    }
  }

  private runBlockGainedHooks(context: Partial<BattleEventContext>): void {
    for (const entry of this.relicTriggersForTiming(EFFECT_TIMINGS.BlockGained)) {
      void this.applyRelicTriggerEffects(entry, this.battleEventContext({
        ...context,
        source: 'relic',
        sourceName: localize(entry.relic.name),
        actor: this.player,
        relic: entry.relic,
      }));
    }
  }

  private runEnemyDamagedHooks(context: Partial<BattleEventContext>): void {
    for (const entry of this.relicTriggersForTiming(EFFECT_TIMINGS.EnemyDamaged)) {
      void this.applyRelicTriggerEffects(entry, this.battleEventContext({
        ...context,
        source: 'relic',
        sourceName: localize(entry.relic.name),
        actor: this.player,
        relic: entry.relic,
      }));
    }
  }

  private async applyRelicTriggerEffects(entry: IndexedRelicTrigger, context: BattleEventContext): Promise<string[]> {
    if (!evaluateConditions(entry.trigger.conditions, context)) {
      return [];
    }

    if (entry.trigger.chance !== undefined) {
      const chancePassed = Math.random() < entry.trigger.chance;
      this.addFlavors(entry.trigger.flavors, chancePassed ? 'onChanceSuccess' : 'onChanceFailure', context);
      if (!chancePassed) {
        return [];
      }
    }

    if (entry.trigger.effects.length > 0) {
      await this.pulseRelicIcon(entry.relic.id);
      this.addFlavors(entry.relic.flavors, 'onTrigger', context);
      this.addFlavors(entry.trigger.flavors, 'onTrigger', context);
    }

    const result = await this.executeEffects(entry.trigger.effects, context);

    this.updateHud();
    return result.messages;
  }

  private async executeEffects(
    effects: EffectDefinition[],
    context: BattleEventContext,
  ): Promise<EffectExecutionResult> {
    const result: EffectExecutionResult = {
      messages: [],
      causedPlayerEpPeak: false,
      damagedEnemies: new Map(),
    };

    for (const effect of effects) {
      if (context.skipEffectKinds?.has(effect.kind)) {
        continue;
      }

      if (effect.onlyDuringPlayerTurn && !this.isPlayerTurn) {
        continue;
      }

      await this.executeEffect(effect, context, result);

      if (this.player.isDefeated) {
        break;
      }
    }

    this.updateHud();
    return result;
  }

  private async executeEffect(
    effect: EffectDefinition,
    context: BattleEventContext,
    result: EffectExecutionResult,
  ): Promise<void> {
    if (effect.kind === 'addCardToHand') {
      const added = await this.addEffectCardsToHand(effect, context, this.effectAmountForContext(effect, context.actor));
      if (added > 0) {
        this.addBattleLog('system', () => l(`${this.sourceDisplayName(context)}: add ${added} card`, `${this.sourceDisplayName(context)}：カードを${added}枚手札に追加`));
        result.messages.push(`${context.sourceName}: add ${added} card`);
      }
      return;
    }

    if (effect.kind === 'drawCards') {
      const drawn = await this.drawCards(this.effectAmountForContext(effect, context.actor), true);
      if (drawn.length > 0) {
        this.addBattleLog('system', () => l(`${this.sourceDisplayName(context)}: draw ${drawn.length}`, `${this.sourceDisplayName(context)}：カードを${drawn.length}枚ドロー`));
        result.messages.push(`${context.sourceName}: draw ${drawn.length}`);
      }
      return;
    }

    const targets = this.effectTargets(effect, context);
    if (targets.length === 0) {
      return;
    }

    for (const target of targets) {
      const repeatCount = this.effectRepeatCount(effect);
      for (let repeat = 0; repeat < repeatCount; repeat += 1) {
        if (effect.chance !== undefined) {
          const chancePassed = Math.random() < effect.chance;
          this.addFlavors(effect.flavors, chancePassed ? 'onChanceSuccess' : 'onChanceFailure', context);
          if (!chancePassed) {
            continue;
          }
        }

        const rawAmount = this.effectAmountForContext(effect, target, context);

        if (effect.kind !== 'status'
          && effect.kind !== 'removeStatus'
          && effect.kind !== 'clearStatus'
          && effect.kind !== 'discardHand'
          && effect.kind !== 'setEpReserveRatio'
          && effect.kind !== 'setEp'
          && effect.kind !== 'retainBlock'
          && effect.kind !== 'energyGain'
          && rawAmount <= 0) {
          if (effect.kind === 'epDamage' && target instanceof Enemy) {
            await this.applyEffectEpDamage(effect, target, rawAmount, context, result);
          }
          continue;
        }

        if (effect.kind === 'energyGain') {
          this.applyEffectEnergyGain(rawAmount, context, result);
        } else if (effect.kind === 'status' && effect.status) {
          await this.applyEffectStatus(effect, target, rawAmount, context, result);
        } else if (effect.kind === 'removeStatus' || effect.kind === 'clearStatus') {
          const changed = this.removeStatusByEffect(target, effect, context.status ?? effect.status ?? 'Lingering');
          if (changed) {
            this.syncPlayerFaintedPose(true);
            this.refreshHandCardUsabilities();
            this.addBattleLog('system', () => this.statusRemovalLog(context, effect));
            result.messages.push(`${context.sourceName}: ${effect.kind === 'removeStatus' ? 'removed' : 'cleared'} ${effect.status ?? 'status'}`);
          }
        } else if (effect.kind === 'discardHand' && target === this.player) {
          await this.discardHandWithAnimation();
          this.addBattleLog('system', () => l(`${this.sourceDisplayName(context)}: discard hand`, `${this.sourceDisplayName(context)}：手札を捨てる`));
          result.messages.push(`${context.sourceName}: discard hand`);
        } else if (effect.kind === 'setEpReserveRatio' && target === this.player) {
          this.setPlayerEpReserveValue(Math.floor(this.playerEffectiveMaxEp() * effect.amount), this.playerEffectiveMaxEp(), true);
          this.addBattleLog('system', () => l(`${this.sourceDisplayName(context)}: EP reserve floor changed`, `${this.sourceDisplayName(context)}：EPリセット下限が変化`));
          result.messages.push(`${context.sourceName}: EP reserve floor`);
        } else if (effect.kind === 'setEp' && target === this.player) {
          this.player.ep = Phaser.Math.Clamp(rawAmount, 0, this.playerEffectiveMaxEp());
          if (this.player.ep <= 0) {
            this.setPlayerEpReserveValue(0, this.playerEffectiveMaxEp(), true);
          }
          this.updateHud();
          await this.animateEpFillTo(this.playerBars, this.player.ep, this.playerEffectiveMaxEp(), 'player', 320);
          this.addBattleLog('system', () => l(`${this.sourceDisplayName(context)}: set EP ${this.player.ep}`, `${this.sourceDisplayName(context)}：EPを${this.player.ep}に変更`));
          result.messages.push(`${context.sourceName}: set EP ${this.player.ep}`);
        } else if (effect.kind === 'retainBlock' && target === this.player) {
          this.retainPlayerBlockThisTurn = true;
          this.addBattleLog('system', () => l(`${this.sourceDisplayName(context)}: retain block`, `${this.sourceDisplayName(context)}：Blockを維持`));
          result.messages.push(`${context.sourceName}: retain block`);
        } else if (effect.kind === 'epReserveHeal' && target === this.player) {
          const animate = context.source !== 'status';
          this.setPlayerEpReserveValue(Math.max(0, this.playerEpReserveValue - rawAmount), this.playerEffectiveMaxEp(), animate);
          this.addBattleLog('system', () => l(`${this.sourceDisplayName(context)}: recover EP reserve`, `${this.sourceDisplayName(context)}：EPリセット下限を回復`));
          result.messages.push(`${context.sourceName}: recover EP reserve`);
        } else if (effect.kind === 'hpHeal') {
          this.applyEffectHpHeal(target, rawAmount, context, result);
        } else if (effect.kind === 'epHeal') {
          await this.applyEffectEpHeal(target, rawAmount, context, result);
        } else if (effect.kind === 'block') {
          this.applyEffectBlock(target, rawAmount, context, result);
        } else if (effect.kind === 'hpDamage') {
          await this.applyEffectHpDamage(effect, target, rawAmount, context, result);
        } else if (effect.kind === 'epDamage') {
          await this.applyEffectEpDamage(effect, target, rawAmount, context, result);
        } else if (effect.kind === 'hpDrain' && target instanceof Enemy) {
          this.applyEffectHpDrain(effect, target, rawAmount, context, result);
        }
      }
    }
  }

  private effectRepeatCount(effect: EffectDefinition): number {
    if (effect.kind === 'status') {
      return 1;
    }
    return Math.max(1, effect.times ?? 1);
  }

  private effectTargets(effect: EffectDefinition, context: BattleEventContext): (Player | Enemy)[] {
    if (effect.target === 'player') {
      return [this.player];
    }

    if (effect.target === 'self') {
      return [context.actor];
    }

    if (effect.target === 'triggerEnemy') {
      return context.triggerEnemy && !context.triggerEnemy.isDefeated ? [context.triggerEnemy] : [];
    }

    if (effect.target === 'selectedEnemy') {
      return context.selectedEnemy && !context.selectedEnemy.isDefeated ? [context.selectedEnemy] : [];
    }

    if (effect.target === 'allEnemies') {
      return this.enemies.filter((enemy) => !enemy.isDefeated);
    }

    return [];
  }

  private effectAmountForContext(
    effect: EffectDefinition,
    target: Player | Enemy,
    context?: BattleEventContext,
  ): number {
    const baseAmount = this.effectAmount(effect, target);
    const randomizedAmount = effect.randomAmount
      ? Phaser.Math.Between(Math.ceil(effect.randomAmount.min), Math.ceil(effect.randomAmount.max))
      : baseAmount;
    if (context?.source === 'status' && effect.perStack) {
      return randomizedAmount * (context.statusStacks ?? 1);
    }
    return randomizedAmount;
  }

  private async addEffectCardsToHand(
    effect: EffectDefinition,
    context: BattleEventContext,
    amount: number,
  ): Promise<number> {
    if (!effect.cardId || amount <= 0) {
      return 0;
    }

    const definition = CARD_DEFINITIONS[effect.cardId];
    if (!definition) {
      return 0;
    }

    const addedUids = new Set<string>();
    for (let i = 0; i < amount; i += 1) {
      const cardDefinition =
        effect.cardAddVariant === 'purgeForStatusOwner' && context.actor instanceof Enemy
          ? this.createPurgeCardDefinitionForEnemy(context.actor, context.status ?? effect.status ?? 'IntrudedA')
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
    if (context.statusTrigger?.visuals?.includes('addCardFromPlayerFadeIn')) {
      await this.animateCardsAddedFromPlayer(addedUids);
    }
    this.updateHud();
    return addedUids.size;
  }

  private applyEffectEnergyGain(
    amount: number,
    context: BattleEventContext,
    result: EffectExecutionResult,
  ): void {
    const beforeEnergy = this.player.energy;
    this.player.energy = Math.max(0, Math.min(this.player.maxEnergy, this.player.energy + amount));
    const changed = this.player.energy - beforeEnergy;
    if (changed !== 0) {
      this.addBattleLog('system', () => l(`${this.sourceDisplayName(context)}: ${changed > 0 ? '+' : ''}${changed} energy`, `${this.sourceDisplayName(context)}：エナジー${changed > 0 ? '+' : ''}${changed}`));
      result.messages.push(`${context.sourceName}: ${changed > 0 ? '+' : ''}${changed} energy`);
      this.refreshHandCardUsabilities();
    }
  }

  private async applyEffectStatus(
    effect: EffectDefinition,
    target: Player | Enemy,
    amount: number,
    context: BattleEventContext,
    result: EffectExecutionResult,
  ): Promise<void> {
    if (!effect.status) {
      return;
    }

    const status = effect.status;
    const applied = await this.applyStatusToCombatantWithTriggers(target, status, effect.stacks ?? amount);
    this.addBattleLog('system', () => l(`${this.sourceDisplayName(context)}: ${applied}`, `${this.sourceDisplayName(context)}：${this.combatantDisplayName(target)}に${this.statusDisplayName(status)}を付与`));
    result.messages.push(`${context.sourceName}: ${applied}`);
  }

  private applyEffectHpHeal(
    target: Player | Enemy,
    amount: number,
    context: BattleEventContext,
    result: EffectExecutionResult,
  ): void {
    const beforeHp = target.hp;
    target.healHp(amount);
    const healed = target.hp - beforeHp;
    if (healed <= 0) {
      return;
    }

    if (target === this.player) {
      this.healingEffect();
      this.showHealNumber(healed, PLAYER_EFFECT_X, this.playerEffectY());
    } else {
      this.showHealNumber(healed, this.enemyEffectX(target as Enemy), this.enemyEffectY(target as Enemy));
    }
    this.addBattleLog('system', () => l(`${this.combatantDisplayName(target)} heals ${healed} HP`, `${this.combatantDisplayName(target)}がHPを${healed}回復`));
    result.messages.push(`${context.sourceName}: heal ${healed} HP`);
  }

  private async applyEffectEpHeal(
    target: Player | Enemy,
    amount: number,
    context: BattleEventContext,
    result: EffectExecutionResult,
  ): Promise<void> {
    if (target === this.player) {
      await this.applyPlayerEpHeal(amount);
      this.addBattleLog('system', () => l(`${this.combatantDisplayName(target)} recovers ${amount} EP`, `${this.combatantDisplayName(target)}がEPを${amount}回復`));
      result.messages.push(`${context.sourceName}: recover ${amount} EP`);
      return;
    }

    if (target instanceof Enemy && target.maxEp > 0) {
      const view = this.enemyViewFor(target);
      target.ep = Math.max(0, target.ep - amount);
      this.updateHud();
      if (view) {
        await this.animateEpFillTo(view.bars, target.ep, target.maxEp, 'enemy', 320);
      }
      this.addBattleLog('system', () => l(`${this.combatantDisplayName(target)} recovers ${amount} EP`, `${this.combatantDisplayName(target)}がEPを${amount}回復`));
      result.messages.push(`${context.sourceName}: recover ${amount} EP`);
    }
  }

  private applyEffectBlock(
    target: Player | Enemy,
    amount: number,
    context: BattleEventContext,
    result: EffectExecutionResult,
  ): void {
    target.block += amount;
    if (target === this.player) {
      this.showShieldEffect(PLAYER_EFFECT_X, this.playerEffectY());
      this.runBlockGainedHooks({ player: this.player, card: context.card, amount });
    } else {
      this.showShieldEffect(this.enemyEffectX(target as Enemy), this.enemyEffectY(target as Enemy));
      this.runBlockGainedHooks({ actor: target as Enemy, triggerEnemy: target as Enemy, amount });
    }
    this.addBattleLog('system', () => l(`${this.combatantDisplayName(target)} gains ${amount} Block`, `${this.combatantDisplayName(target)}がBlockを${amount}得る`));
    result.messages.push(`${context.sourceName}: +${amount} block`);
  }

  private async applyEffectHpDamage(
    effect: EffectDefinition,
    target: Player | Enemy,
    amount: number,
    context: BattleEventContext,
    result: EffectExecutionResult,
  ): Promise<void> {
    const attribute = effect.attackAttribute ?? (context.intent?.attackAttribute ?? context.card?.attackAttribute ?? 'strike');

    if (target instanceof Enemy) {
      const view = this.enemyViewFor(target);
      if (!view) {
        return;
      }

      const beforeHp = target.hp;
      const beforeBlock = target.block;
      const useBlock = (context.source === 'card' || context.source === 'enemyIntent') && target !== context.actor;
      const damage = useBlock ? target.takeHpDamage(amount) : (target.takeDirectHpDamage(amount), amount);
      this.showHpDamageBarChip(view.bars, beforeHp, target.hp, target.maxHp);
      this.playDamageEffect(attribute, this.enemyEffectX(target), this.enemyEffectY(target));
      this.showDamageNumber(damage > 0 ? damage : amount, this.enemyEffectX(target), this.enemyEffectY(target), damage > 0 ? 'hp' : 'block');
      this.showBlockResultEffect(target, amount, beforeBlock, damage);
      if (damage > 0) {
        this.flashEnemy(target);
      }
      this.addEnemyDamage(result, target, damage);
      this.runEnemyDamagedHooks({ triggerEnemy: target, card: context.card, amount: damage });
      this.addBattleLog('system', () => l(`${this.combatantDisplayName(target)} takes ${damage} HP damage`, `${this.combatantDisplayName(target)}がHPに${damage}ダメージ`));
      result.messages.push(`${context.sourceName}: ${damage} HP damage`);
      return;
    }

    const hpDamage = context.source === 'enemyIntent' ? this.modifiedPlayerHpDamage(amount) : amount;
    if (context.source === 'enemyIntent') {
      this.enemyHpAttackMotion();
    }
    const beforeHp = this.player.hp;
    const beforeBlock = this.player.block;
    const useBlock = context.source === 'enemyIntent' && target !== context.actor;
    const damage = useBlock ? this.player.takeHpDamage(hpDamage) : (this.player.takeDirectHpDamage(hpDamage), hpDamage);
    this.showHpDamageBarChip(this.playerBars, beforeHp, this.player.hp, this.player.maxHp);
    this.playDamageEffect(attribute, PLAYER_EFFECT_X, this.playerEffectY());
    this.showDamageNumber(damage > 0 ? damage : hpDamage, PLAYER_EFFECT_X, this.playerEffectY(), damage > 0 ? 'hp' : 'block');
    this.showBlockResultEffect(this.player, hpDamage, beforeBlock, damage);
    if (damage > 0) {
      this.flashPlayer();
    }
    this.addBattleLog('system', () => l(`${this.combatantDisplayName(target)} takes ${damage} HP damage`, `${this.combatantDisplayName(target)}がHPに${damage}ダメージ`));
    result.messages.push(`${context.sourceName}: ${damage} HP damage`);
  }

  private showBlockResultEffect(target: Player | Enemy, rawDamage: number, beforeBlock: number, actualDamage: number): void {
    if (beforeBlock <= 0) {
      return;
    }

    const x = target instanceof Enemy ? this.enemyEffectX(target) : PLAYER_EFFECT_X;
    const y = target instanceof Enemy ? this.enemyEffectY(target) : this.playerEffectY();
    if (target.block === 0 && rawDamage >= beforeBlock) {
      this.showBrokenShieldEffect(x, y);
      return;
    }

    if (actualDamage === 0) {
      this.showShieldEffect(x, y);
    }
  }

  private async applyEffectEpDamage(
    effect: EffectDefinition,
    target: Player | Enemy,
    amount: number,
    context: BattleEventContext,
    result: EffectExecutionResult,
  ): Promise<void> {
    const attribute = effect.attackAttribute ?? (context.intent?.attackAttribute ?? context.card?.attackAttribute ?? 'love');

    if (target instanceof Enemy) {
      const modifiedAmount = context.source === 'card' ? this.modifiedEnemyEpDamage(amount, target) : amount;
      if (modifiedAmount > 0) {
        this.playDamageEffect(attribute, this.enemyEffectX(target), this.enemyEffectY(target), modifiedAmount);
        this.showDamageNumber(modifiedAmount, this.enemyEffectX(target), this.enemyEffectY(target), 'ep');
      }
      const peaked = await this.applyEnemyEpDamage(modifiedAmount, target);
      if (modifiedAmount > 0 && !peaked) {
        this.flashEnemy(target);
      }
      this.addEnemyDamage(result, target, modifiedAmount);
      this.runEnemyDamagedHooks({ triggerEnemy: target, card: context.card, amount: modifiedAmount });
      this.addBattleLog('system', () => peaked
        ? l(`${this.combatantDisplayName(target)} reaches EP Peak`, `${this.combatantDisplayName(target)}がEP Peak`)
        : l(`${this.combatantDisplayName(target)} takes ${modifiedAmount} EP damage`, `${this.combatantDisplayName(target)}がEPに${modifiedAmount}ダメージ`));
      result.messages.push(peaked ? `${context.sourceName}: Enemy EP peak` : `${context.sourceName}: ${modifiedAmount} EP damage`);
      return;
    }

    const epDamageParts = this.resolvePlayerEpDamageParts(effect, context);
    const modifiedAmount = this.modifiedPlayerEpDamage(amount, epDamageParts);
    if (context.source === 'enemyIntent') {
      this.enemyEpAttackMotion();
    }
    this.playDamageEffect(attribute, PLAYER_EFFECT_X, this.playerEffectY(), modifiedAmount);
    this.showDamageNumber(modifiedAmount, PLAYER_EFFECT_X, this.playerEffectY(), 'ep');
    const peaked = await this.applyPlayerEpDamage(amount, epDamageParts, context);
    result.causedPlayerEpPeak = result.causedPlayerEpPeak || peaked;
    if (!peaked) {
      this.flashPlayer();
    }
    this.addBattleLog('system', () => peaked
      ? l(`${this.combatantDisplayName(target)} reaches EP Peak`, `${this.combatantDisplayName(target)}がEP Peak`)
      : l(`${this.combatantDisplayName(target)} takes ${modifiedAmount} EP damage`, `${this.combatantDisplayName(target)}がEPに${modifiedAmount}ダメージ`));
    result.messages.push(peaked ? `${context.sourceName}: Player EP peak` : `${context.sourceName}: ${modifiedAmount} EP damage`);
  }

  private applyEffectHpDrain(
    effect: EffectDefinition,
    enemy: Enemy,
    amount: number,
    context: BattleEventContext,
    result: EffectExecutionResult,
  ): void {
    const view = this.enemyViewFor(enemy);
    if (!view) {
      return;
    }

    const beforeEnemyHp = enemy.hp;
    const beforePlayerHp = this.player.hp;
    this.player.healHp(amount);
    const healed = this.player.hp - beforePlayerHp;
    if (healed > 0) {
      this.healingEffect();
      this.showHealNumber(healed, PLAYER_EFFECT_X, this.playerEffectY());
    }
    this.hpDrainEffect(this.enemyEffectX(enemy), this.enemyEffectY(enemy), PLAYER_EFFECT_X, this.playerEffectY());
    enemy.takeDirectHpDamage(amount);
    this.showHpDamageBarChip(view.bars, beforeEnemyHp, enemy.hp, enemy.maxHp);
    this.showDamageNumber(amount, this.enemyEffectX(enemy), this.enemyEffectY(enemy), 'hp');
    this.addEnemyDamage(result, enemy, amount);
    this.runEnemyDamagedHooks({ triggerEnemy: enemy, card: context.card, amount });
    this.addBattleLog('system', () => l(`${this.combatantDisplayName(enemy)} is drained for ${amount} HP`, `${this.combatantDisplayName(enemy)}からHPを${amount}ドレイン`));
    result.messages.push(`${context.sourceName}: drain ${amount} HP`);
  }

  private addEnemyDamage(result: EffectExecutionResult, enemy: Enemy, amount: number): void {
    if (amount <= 0) {
      return;
    }

    result.damagedEnemies.set(enemy, (result.damagedEnemies.get(enemy) ?? 0) + amount);
  }

  private async applyStatusTriggerEffects(
    entry: IndexedStatusTrigger,
    context: Partial<BattleEventContext> = {},
    options: StatusTriggerRunOptions = {},
  ): Promise<string[]> {
    const messages: string[] = [];
    const triggerContext = this.battleEventContext({
      ...context,
      source: 'status',
      sourceName: this.statusDisplayName(entry.status),
      actor: entry.owner,
      statusOwner: entry.owner,
      status: entry.status,
      triggerEnemy: context.triggerEnemy ?? context.selectedEnemy ?? (entry.owner instanceof Enemy ? entry.owner : undefined),
    });

    if (entry.trigger.consumeRule === 'allWhileEnergy') {
      while (this.player.energy > 0 && entry.owner.hasStatus(entry.status)) {
        entry.owner.consumeStatus(entry.status);
        await this.pulseStatusIcon(entry.owner, entry.status);
        const result = await this.executeEffects(this.statusTriggerEffectsForRun(entry.trigger, options), this.battleEventContext({
          source: 'status',
          sourceName: this.statusDisplayName(entry.status),
          actor: entry.owner,
          triggerEnemy: triggerContext.triggerEnemy,
          statusOwner: entry.owner,
          status: entry.status,
          statusStacks: 1,
          statusTrigger: entry.trigger,
        }));
        this.addFlavors(entry.definition.flavors, 'onTrigger', triggerContext);
        this.addFlavors(entry.trigger.flavors, 'onTrigger', triggerContext);
        messages.push(...result.messages);
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

    if (entry.trigger.chance !== undefined) {
      const chancePassed = Math.random() < entry.trigger.chance;
      this.addFlavors(entry.trigger.flavors, chancePassed ? 'onChanceSuccess' : 'onChanceFailure', triggerContext);
      if (!chancePassed) {
        return messages;
      }
    }

    if (this.statusTriggerEffectsForRun(entry.trigger, options).length > 0) {
      await this.pulseStatusIcon(entry.owner, entry.status);
      this.addFlavors(entry.definition.flavors, 'onTrigger', triggerContext);
      this.addFlavors(entry.trigger.flavors, 'onTrigger', triggerContext);
    }

    const result = await this.executeEffects(this.statusTriggerEffectsForRun(entry.trigger, options), this.battleEventContext({
      source: 'status',
      sourceName: this.statusDisplayName(entry.status),
      actor: entry.owner,
      triggerEnemy: triggerContext.triggerEnemy,
      statusOwner: entry.owner,
      status: entry.status,
      statusStacks: stacks,
      statusTrigger: entry.trigger,
      purgeCausedEpPeak: triggerContext.purgeCausedEpPeak,
    }));
    messages.push(...result.messages);

    if (entry.trigger.consumeRule === 'one') {
      const willRemoveStatus = stacks <= 1;
      entry.owner.consumeStatus(entry.status);
      if (willRemoveStatus) {
        this.addFlavors(entry.definition.flavors, 'onRemove', triggerContext);
        this.addFlavors(entry.trigger.flavors, 'onRemove', triggerContext);
      }
      this.syncPlayerFaintedPose(true);
      this.refreshHandCardUsabilities();
    }

    await this.runStatusTriggerVisuals(entry.trigger);
    this.updateHud();
    return messages;
  }

  private statusTriggerEffectsForRun(
    trigger: StatusTriggerDefinition,
    options: StatusTriggerRunOptions,
  ): EffectDefinition[] {
    if (!options.skipEffectKinds || options.skipEffectKinds.size === 0) {
      return trigger.effects;
    }

    return trigger.effects.filter((effect) => !options.skipEffectKinds?.has(effect.kind));
  }

  private statusEffectAmount(effect: EffectDefinition, owner: Player | Enemy, stacks: number): number {
    const baseAmount = this.effectAmount(effect, owner);
    return effect.perStack ? baseAmount * stacks : baseAmount;
  }

  private removeStatusByEffect(target: Player | Enemy, effect: EffectDefinition, fallbackStatus: StatusEffect): boolean {
    if (effect.statusGroup) {
      let changed = false;
      for (const [status, definition] of Object.entries(STATUS_DESCRIPTIONS) as [StatusEffect, StatusDefinition][]) {
        if (definition.exclusiveGroup === effect.statusGroup && target.hasStatus(status)) {
          target.statuses.delete(status);
          changed = true;
        }
      }
      return changed;
    }

    const status = effect.status ?? fallbackStatus;
    const changed = target.hasStatus(status);
    if (changed) {
      target.statuses.delete(status);
    }
    return changed;
  }

  private async runStatusTriggerVisuals(trigger: StatusTriggerDefinition): Promise<void> {
    if (trigger.visuals?.includes('faintedDrop')) {
      await this.syncPlayerFaintedPose(true);
    }

    if (trigger.visuals?.includes('breathAndEnergyPulse')) {
      await Promise.all([
        this.breathingRecoveryMotion(),
        this.pulseEnergyPanel(),
      ]);
    }
  }

  private discardHandWithAnimation(): Promise<void> {
    const cardsToDiscard = this.handCardsForDiscardAnimation();
    cardsToDiscard.forEach(({ uid }) => this.markCardExiting(uid));

    return new Promise((resolve) => {
      const finishDiscard = () => {
        this.deck.discardHand();
        cardsToDiscard.forEach(({ uid }) => this.removeExitingCard(uid));
        void this.renderHand();
        resolve();
      };

      if (cardsToDiscard.length === 0) {
        finishDiscard();
        return;
      }

      let completed = 0;
      const completeOne = () => {
        completed += 1;
        if (completed === cardsToDiscard.length) {
          finishDiscard();
        }
      };

      cardsToDiscard.forEach(({ card, container }, index) => {
        container.setAlpha(1);
        if (card.definition.temporary) {
          this.time.delayedCall(index * 35, () => this.animateCardVanish(container, completeOne));
          return;
        }

        this.time.delayedCall(index * 35, () => this.animateCardToDiscard(container, completeOne));
      });
    });
  }

  private handCardsForDiscardAnimation(): { card: CardInstance; uid: string; container: Phaser.GameObjects.Container }[] {
    return this.deck.hand
      .map((card) => ({ card, uid: card.uid, container: this.cardViews.get(card.uid)?.container }))
      .filter((entry): entry is { card: CardInstance; uid: string; container: Phaser.GameObjects.Container } => Boolean(entry.container));
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
      return Math.ceil(this.playerEffectiveMaxEp() * effect.amount);
    }

    if (effect.percentOf === 'playerBaseMaxEp') {
      return Math.ceil(this.player.maxEp * effect.amount);
    }

    return Math.ceil(effect.amount);
  }

  private createStatusTooltip(): void {
    const bg = this.add.rectangle(0, 0, STATUS_TOOLTIP_WIDTH, STATUS_TOOLTIP_HEIGHT, 0x101419, 0.96);
    bg.setOrigin(0, 0);
    bg.setStrokeStyle(2, 0xaeb8c8, 0.9);
    this.statusTooltipBg = bg;
    this.statusTooltipText = this.add.text(14, 12, '', {
      fontFamily: 'Arial',
      fontSize: '15px',
      color: '#f8fafc',
      wordWrap: { width: 332, useAdvancedWrap: true },
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
    epText.setOrigin(0, 0.5);
    epText.setDepth(epReserveStripes.depth + 1);
    const epMaxText = this.add.text(x + BAR_WIDTH / 2, epY, '', this.barTextStyle());
    epMaxText.setOrigin(0, 0.5);
    epMaxText.setDepth(epText.depth);

    if (!hasEp) {
      epBg.setVisible(false);
      epFill.setVisible(false);
      epReserveFill.setVisible(false);
      epReserveStripes.setVisible(false);
      epText.setVisible(false);
      epMaxText.setVisible(false);
    }

    return { hpBg, hpFill, hpText, blockFill, blockShield, blockText, epBg, epFill, epText, epMaxText, epReserveFill, epReserveStripes, hasEp, hpX: x, hpY: y, epX: x, epY };
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
    const isJapanese = SETTINGS_STATE.language === 'ja';
    const ownerName = owner === 'player'
      ? this.uiText('Player', 'プレイヤー')
      : this.combatantDisplayName(combatant);
    const name = `${ownerName} ${bar === 'hp' ? 'HP' : 'EP'}`;
    const maxEp = owner === 'player' ? this.playerEffectiveMaxEp() : combatant.maxEp;
    const value = bar === 'hp' ? `${combatant.hp}/${combatant.maxHp}` : `${combatant.ep}/${maxEp}`;
    const tips = bar === 'hp'
      ? this.uiText('If HP reaches 0, this combatant is defeated.', 'HPが0になると倒れる。')
      : this.uiText('Ecstasy point. EP rises when taking EP damage. At max, a Peak effect triggers.', 'Ecstasy Point。EPダメージを受けると上昇し、最大値でPeak効果が発動する。');
    const reserve = owner === 'player' && bar === 'ep'
      ? `\n${isJapanese ? 'EPリセット下限' : 'EP reset floor'}: ${this.playerEpReserveValue}/${this.playerEffectiveMaxEp()}`
      : '';
    const peaks = owner === 'player' && bar === 'ep'
      ? `\n${isJapanese ? 'EP Peak回数' : 'EP Peaks'}: ${this.player.epPeakCount}`
      : '';

    this.clearStatusTooltipSource();
    this.showStatusTooltipText(`${name}: ${value}${reserve}${peaks}\n${tips}`, x, y);
  }

  private createEnergyHud(): void {
    this.energyPanel = this.add.rectangle(90, 600, 132, 96, 0x242a33, 0.95);
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
    const label = this.add.text(0, 0, this.uiText('Settings', '設定'), {
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
    shade.setInteractive();
    const panel = this.add.rectangle(640, 360, 500, 420, 0x242a33, 0.98);
    panel.setStrokeStyle(3, 0x758195, 0.9);
    panel.setInteractive();
    const title = this.add.text(640, 220, this.uiText('Settings', '設定'), {
      fontFamily: 'Arial',
      fontSize: '30px',
      fontStyle: 'bold',
      color: '#f8fafc',
    });
    title.setOrigin(0.5);

    const language = this.createModalButton(640, 292, 360, 46, this.languageButtonText(), () => {
      toggleLanguage();
      this.refreshLocalizedText();
      this.showSettingsMenu();
    });
    const restart = this.createModalButton(640, 350, 360, 46, this.uiText('Restart Battle', '戦闘をはじめからやり直す'), () => this.restartBattle());
    const help = this.createModalButton(640, 408, 360, 46, this.uiText('Help', 'ヘルプ'), () => this.showHelpPage());
    const titleButton = this.createModalButton(640, 466, 360, 46, this.uiText('Return to Title', 'タイトルに戻る'), () => this.returnToTitle());
    const close = this.createModalButton(640, 524, 180, 40, this.uiText('Close', '閉じる'), () => this.hideModal());

    this.modalOverlay.add([shade, panel, title, language, restart, help, titleButton, close]);
    // DEBUG_MODE_START
    appendDebugSettingsButtons(this, this.modalOverlay);
    // DEBUG_MODE_END
    this.modalOverlay.setVisible(true);
  }

  private languageButtonText(): string {
    return SETTINGS_STATE.language === 'ja' ? 'Language / 表示言語: 日本語' : 'Language / 表示言語: English';
  }

  private uiText(en: string, ja: string): string {
    return SETTINGS_STATE.language === 'ja' ? ja : en;
  }

  private refreshLocalizedText(): void {
    const displayNames = this.enemyDisplayNames(this.enemyViews.map((view) => view.enemy));
    this.enemyViews.forEach((view, index) => {
      view.displayName = displayNames[index] ?? view.displayName;
    });
    this.updateHud();
    this.updateCardEffectTexts();
    this.renderBattleLog();
  }

  private showHelpPage(): void {
    this.modalOverlay.removeAll(true);
    const shade = this.add.rectangle(640, 360, 1280, 720, 0x050607, 0.58);
    shade.setInteractive();
    const panel = this.add.rectangle(640, 360, 820, 560, 0x242a33, 0.98);
    panel.setStrokeStyle(3, 0x758195, 0.9);
    panel.setInteractive();
    const title = this.add.text(640, 115, this.uiText('Help', 'ヘルプ'), {
      fontFamily: 'Arial',
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#f8fafc',
    });
    title.setOrigin(0.5);

    const helpText = this.add.text(
      275,
      160,
      SETTINGS_STATE.language === 'ja'
        ? [
            'プレイヤーHP：体力。0になると敗北する。',
            'プレイヤーEP：ecstasy point。毎ターン1下がり、最大値に達するとPeak処理が発生してLingeringが付与される。',
            'エナジー：カード使用に消費する。コスト0のカードはエナジー0でも使用できる。',
            'Block：HPダメージを先に防ぎ、次のターン開始時にリセットされる。',
            '',
            '敵HP：敵の体力。全ての敵HPを0にすると勝利。',
            '敵EP：最大値に達するとPeak処理が発生する。',
            'バフ/デバフ：同じ状態はスタック可能。発動時に1スタック消費されるものがある。',
            'Charm：敵が誘惑時行動を使用する。',
            'Lingering：ターン開始時、エナジーが残る限り1スタックごとにエナジーを1失う。',
            '',
            'デッキループ：戦闘開始時と各ターンに5枚ドロー。使用カードとターン終了時の手札は捨て札へ。山札が空なら捨て札をシャッフルして山札に戻す。',
          ]
        : [
            'Player HP: Your health. If it reaches 0, you lose.',
            'Player EP: Your ecstasy point. It decreases by 1 each turn. If it reaches max, it drops to a reduced value and applies Lingering.',
            'Energy: Spent to play cards. Cards with cost 0 can be played with 0 energy.',
            'Block: Reduces incoming HP damage first, then resets at the start of your next turn.',
            '',
            'Enemy HP: Enemy health. If all enemies reach 0 HP, you win.',
            'Enemy EP: Enemy ecstasy point. If it reaches max, Peak effects trigger.',
            'Buffs/Debuffs: The same status can stack. One stack may be consumed when that status takes effect.',
            'Charm: The enemy uses its charm intent pool.',
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

    const back = this.createModalButton(640, 610, 220, 42, this.uiText('Back', '戻る'), () => this.showSettingsMenu());
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

  private isModalOpen(): boolean {
    return Boolean(this.modalOverlay?.visible);
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
    const description = localize(STATUS_DESCRIPTIONS[status]?.description ?? `${status}: No description.`);
    const stackText = stacks > 1 ? `\nStacks: ${stacks}` : '';
    this.showStatusTooltipText(`${description}${stackText}`, x, y);
  }

  private showCardStatusTooltip(definition: CardDefinition, x: number, y: number): void {
    const descriptions = definition.effects
      .filter((effect) => effect.kind === 'status' && effect.status && (effect.stacks ?? effect.amount) > 0)
      .map((effect) => localize(STATUS_DESCRIPTIONS[effect.status!]?.description ?? `${effect.status}: No description.`));

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
    this.statusTooltipText.setText(text);
    const height = Math.max(STATUS_TOOLTIP_HEIGHT, this.statusTooltipText.height + 24);
    this.statusTooltipBg.setDisplaySize(STATUS_TOOLTIP_WIDTH, height);
    const clampedX = Phaser.Math.Clamp(x, 8, SCREEN_WIDTH - STATUS_TOOLTIP_WIDTH - 8);
    const clampedY = Phaser.Math.Clamp(y, 8, SCREEN_HEIGHT - height - 8);

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
    this.statusIconViews.delete(container);

    if (hidden) {
      return;
    }

    const iconMap = new Map<StatusEffect, Phaser.GameObjects.Container>();
    this.statusIconViews.set(container, iconMap);

    this.orderedStatusEntries(statuses).forEach(([status, stacks], index) => {
      const x = index * 40;
      const iconGroup = this.add.container(x, 0);
      const icon = this.add.rectangle(0, 0, 32, 32, this.statusIconColor(status), 1);
      icon.setStrokeStyle(2, 0xffffff, 0.68);
      icon.setInteractive({ useHandCursor: true });

      const label = this.add.text(0, 0, this.statusIconText(status, stacks), {
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

      iconGroup.add([icon, label]);
      iconMap.set(status, iconGroup);
      container.add(iconGroup);
    });
  }

  private orderedStatusEntries(statuses: Map<StatusEffect, number>): [StatusEffect, number][] {
    return Array.from(statuses.entries())
      .filter(([, stacks]) => stacks > 0)
      .sort(([statusA], [statusB]) => this.statusDefinitionOrder(statusA) - this.statusDefinitionOrder(statusB));
  }

  private statusDefinitionOrder(status: StatusEffect): number {
    const index = Object.keys(STATUS_DESCRIPTIONS).indexOf(status);
    return index >= 0 ? index : Number.MAX_SAFE_INTEGER;
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
              this.refreshHandCardUsability(view);
              this.updateHandDepths();
              resolve();
            },
          });
        }));
      } else {
        view.ready = true;
        this.refreshHandCardUsability(view);
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
    if (this.handInputLocked || this.isModalOpen()) {
      return;
    }

    this.hoveredCardUid = uid;
    this.applyHoverLayout(180);
  }

  private isHandCardReady(view: CardView): boolean {
    return (
      !this.handInputLocked &&
      view.ready &&
      !this.exitingCardUids.has(view.card.uid) &&
      this.deck.hand.some((card) => card.uid === view.card.uid)
    );
  }

  private canPlayCardNow(definition: CardDefinition): boolean {
    return this.cardPlayBlockReason(definition) === undefined;
  }

  private cardPlayBlockReason(definition: CardDefinition): 'craving' | 'condition' | undefined {
    if (this.player.hasStatus('CravingForPeaks') && !this.cardHasSelfEpDamage(definition)) {
      return 'craving';
    }

    if (!evaluateConditions(definition.conditions, this.battleEventContext({
      source: 'card',
      sourceName: localize(definition.name),
      sourceId: definition.id,
      actor: this.player,
      card: definition,
    }))) {
      return 'condition';
    }

    if (definition.conditions.length === 0 && definition.playCondition === 'noCardsPlayedThisTurn') {
      return this.cardsPlayedThisTurn === 0 ? undefined : 'condition';
    }

    return undefined;
  }

  private cardHasSelfEpDamage(definition: CardDefinition): boolean {
    return definition.effects.some((effect) => (
      effect.kind === 'epDamage'
      && effect.target === 'player'
      && (effect.amount > 0 || effect.percentOf !== undefined || effect.randomAmount !== undefined)
    ));
  }

  private refreshHandCardUsability(view: CardView): void {
    if (this.handInputLocked || !view.ready || this.exitingCardUids.has(view.card.uid)) {
      view.hitArea.disableInteractive();
      return;
    }

    const blockReason = this.cardPlayBlockReason(view.card.definition);
    const hasEnoughEnergy = this.player.energy >= view.card.definition.cost;
    view.container.setAlpha(blockReason ? 0.45 : 1);
    view.costText.setColor(!blockReason && !hasEnoughEnergy ? '#ff4d4d' : '#ffffff');
    view.hitArea.setInteractive({ useHandCursor: true });
  }

  private refreshHandCardUsabilities(): void {
    this.cardViews.forEach((view) => {
      this.refreshHandCardUsability(view);
    });
  }

  private setHandInputLocked(locked: boolean): void {
    this.handInputLocked = locked;
    if (locked) {
      this.hoveredCardUid = undefined;
      this.hideStatusTooltip();
    }

    this.refreshHandCardUsabilities();
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

  private animateCardVanish(cardView: Phaser.GameObjects.Container, onComplete: () => void): void {
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
        view.container.setPosition(PLAYER_EFFECT_X, this.playerEffectY());
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

    const nameText = this.add.text(0, -46, localize(card.definition.name), {
      fontFamily: 'Arial',
      fontSize: '19px',
      fontStyle: 'bold',
      color: '#1e252c',
      align: 'center',
      wordWrap: { width: CARD_WIDTH - 24, useAdvancedWrap: true },
    });
    nameText.setOrigin(0.5);

    const renderedEffect = this.cardEffectDisplay(card.definition);
    const effectText = this.add.container(0, 0);
    this.renderCardEffectText(effectText, renderedEffect.lines);

    container.add([bg, costCircle, costText, nameText, effectText]);
    container.setSize(CARD_WIDTH, CARD_HEIGHT);
    container.setDepth(30);
    bg.setInteractive({ useHandCursor: true });
    const view: CardView = { card, container, hitArea: bg, costText, nameText, effectText, baseX: x, baseY: y, ready: true };

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
    if (definition.effects.some((effect) => effect.kind === 'hpDamage' && this.isEnemyTargetEffect(effect) && effect.amount > 0)) {
      return 0xe7aeb6;
    }

    if (definition.effects.some((effect) => effect.kind === 'epDamage' && this.isEnemyTargetEffect(effect) && effect.amount > 0)) {
      return 0xf8d6e8;
    }

    if (definition.effects.some((effect) => effect.kind === 'status' && this.isEnemyTargetEffect(effect) && (effect.stacks ?? effect.amount) > 0)) {
      return 0xe7f4c8;
    }

    return 0xdceafa;
  }

  private cardEffectDisplay(definition: CardDefinition): { lines: CardEffectLine[] } {
    const lines: CardEffectLine[] = [];
    const ja = SETTINGS_STATE.language === 'ja';

    if (this.isTurnStartOnlyCard(definition)) {
      lines.push(ja ? [{ text: 'ターン開始時のみ使用可。' }] : [{ text: 'Playable only at turn start.' }]);
    }

    for (const effect of definition.effects) {
      const amount = this.cardPreviewEffectAmount(definition, effect);
      if (effect.kind === 'hpDamage' && this.isEnemyTargetEffect(effect) && amount > 0) {
        lines.push(ja
          ? [{ text: 'HPに' }, { text: String(amount) }, ...(effect.times > 1 ? [{ text: ` x${effect.times}` }] : []), { text: 'ダメージ。' }]
          : [{ text: 'Deal ' }, { text: String(amount) }, ...(effect.times > 1 ? [{ text: ` x${effect.times}` }] : []), { text: ' HP damage.' }]);
      } else if (effect.kind === 'epDamage' && this.isEnemyTargetEffect(effect)) {
        const modifiedEpDamage = this.modifiedEnemyEpDamage(amount, this.enemy);
        const isModified = modifiedEpDamage !== amount;
        lines.push(ja
          ? [{ text: 'EPに' }, { text: String(modifiedEpDamage), bold: isModified }, ...(effect.times > 1 ? [{ text: ` x${effect.times}` }] : []), { text: 'ダメージ。' }]
          : [{ text: 'Deal ' }, { text: String(modifiedEpDamage), bold: isModified }, ...(effect.times > 1 ? [{ text: ` x${effect.times}` }] : []), { text: ' EP damage.' }]);
      } else if (effect.kind === 'epDamage' && effect.target === 'player' && amount > 0) {
        const modifiedSelfEpDamage = this.modifiedPlayerEpDamageForCard(
          definition,
          amount,
          this.resolvePlayerEpDamageParts(effect, this.battleEventContext({
            source: 'card',
            sourceName: localize(definition.name),
            sourceId: definition.id,
            actor: this.player,
            card: definition,
          })),
        );
        const isModified = modifiedSelfEpDamage !== amount;
        lines.push(ja
          ? [{ text: '自身のEPに' }, { text: String(modifiedSelfEpDamage), bold: isModified }, ...(effect.times > 1 ? [{ text: ` x${effect.times}` }] : []), { text: 'ダメージ。' }]
          : [{ text: 'Take ' }, { text: String(modifiedSelfEpDamage), bold: isModified }, ...(effect.times > 1 ? [{ text: ` x${effect.times}` }] : []), { text: ' EP damage.' }]);
      } else if (effect.kind === 'hpDamage' && effect.target === 'player' && amount > 0) {
        lines.push(ja
          ? [{ text: '自身のHPに' }, { text: String(amount) }, ...(effect.times > 1 ? [{ text: ` x${effect.times}` }] : []), { text: 'ダメージ。' }]
          : [{ text: 'Take ' }, { text: String(amount) }, ...(effect.times > 1 ? [{ text: ` x${effect.times}` }] : []), { text: ' HP damage.' }]);
      } else if (effect.kind === 'block' && effect.target === 'player' && amount > 0) {
        lines.push(ja ? [{ text: 'Blockを' }, { text: String(amount) }, { text: '得る。' }] : [{ text: `Gain ${amount} block.` }]);
      } else if (effect.kind === 'status' && effect.status && (effect.stacks ?? amount) > 0) {
        lines.push(ja
          ? [{ text: this.statusDisplayName(effect.status) }, { text: (effect.stacks ?? amount) > 1 ? ` x${effect.stacks ?? amount}` : '' }, { text: 'を付与。' }]
          : [{ text: `Apply ${this.statusDisplayName(effect.status)}${(effect.stacks ?? amount) > 1 ? ` x${effect.stacks ?? amount}` : ''}.` }]);
      } else if (effect.kind === 'hpHeal' && amount > 0) {
        lines.push(ja ? [{ text: 'HPを' }, { text: String(amount) }, { text: '回復。' }] : [{ text: `Heal ${amount} HP.` }]);
      } else if (effect.kind === 'epHeal' && amount > 0) {
        const effectiveHeal = Math.max(0, this.player.ep - Math.max(this.playerEpReserveValue, this.player.ep - amount));
        lines.push(ja ? [{ text: 'EPを' }, { text: String(effectiveHeal) }, { text: '回復。' }] : [{ text: `Recover ${effectiveHeal} EP.` }]);
      } else if (effect.kind === 'setEp' && effect.target === 'player') {
        lines.push(ja ? [{ text: 'EPを' }, { text: String(amount) }, { text: 'にする。' }] : [{ text: `Set EP to ${amount}.` }]);
      } else if (effect.kind === 'epReserveHeal' && amount > 0) {
        lines.push(ja ? [{ text: 'EPリセット下限を' }, { text: String(amount) }, { text: '回復。' }] : [{ text: `Recover ${amount} EP reserve.` }]);
      } else if (effect.kind === 'drawCards' && amount > 0) {
        lines.push(ja ? [{ text: 'カードを' }, { text: String(amount) }, { text: '枚引く。' }] : [{ text: `Draw ${amount}.` }]);
      } else if (effect.kind === 'energyGain' && amount > 0) {
        lines.push(ja ? [{ text: 'エナジーを' }, { text: String(amount) }, { text: '得る。' }] : [{ text: `Gain ${amount} energy.` }]);
      }
    }

    if (definition.vanish) {
      lines.push([{ text: ja ? '消滅。' : 'Vanish.' }]);
    }

    if (definition.temporary) {
      lines.push([{ text: ja ? '一時カード。' : 'Temporary.' }]);
    }

    if (definition.purgeTargetName && definition.purgeStatus) {
      lines.push([{ text: ja ? `成功時、${definition.purgeTargetName}を排出。` : `On success, purge ${definition.purgeTargetName}.` }]);
    }

    return { lines: lines.length > 0 ? lines : localize(definition.description).split('\n').map((text) => [{ text }]) };
  }

  private isTurnStartOnlyCard(definition: CardDefinition): boolean {
    return definition.conditions.some((condition) => (
      condition.kind === 'cardsPlayedThisTurn'
      && condition.operator === 'eq'
      && condition.value === 0
    ));
  }

  private cardPreviewEffectAmount(definition: CardDefinition, effect: EffectDefinition): number {
    if (effect.percentOf === 'playerMaxHp') {
      return Math.ceil(this.player.maxHp * effect.amount);
    }

    if (effect.percentOf === 'playerMaxEp') {
      return Math.ceil(this.playerEffectiveMaxEp() * effect.amount);
    }

    if (effect.percentOf === 'playerBaseMaxEp') {
      return Math.ceil(this.player.maxEp * effect.amount);
    }

    if (effect.percentOf === 'selfCurrentHp' && this.enemy) {
      return Math.ceil(this.enemy.hp * effect.amount);
    }

    if (effect.percentOf === 'selfMaxEp' && this.enemy) {
      return Math.ceil(this.enemy.maxEp * effect.amount);
    }

    if (effect.percentOf === 'targetMaxEp' && this.enemy) {
      return Math.ceil(this.enemy.maxEp * effect.amount);
    }

    return Math.ceil(effect.amount);
  }

  private renderCardEffectText(container: Phaser.GameObjects.Container, lines: CardEffectLine[]): void {
    container.removeAll(true);

    const lineHeight = 18;
    const maxWidth = CARD_WIDTH - 24;
    const visualLines = this.wrapCardEffectLines(lines, maxWidth);
    const startY = 22 - ((visualLines.length - 1) * lineHeight) / 2;

    visualLines.forEach((line, lineIndex) => {
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
        lineContainer.setScale(Math.max(0.82, maxWidth / totalWidth), 1);
      }
      container.add(lineContainer);
    });
  }

  private wrapCardEffectLines(lines: CardEffectLine[], maxWidth: number): CardEffectLine[] {
    const wrapped: CardEffectLine[] = [];
    const style = {
      fontFamily: 'Arial',
      fontSize: '15px',
      color: '#2d3742',
    };

    const measure = (segment: CardEffectSegment): number => {
      const text = this.add.text(0, 0, segment.text, {
        ...style,
        fontStyle: segment.bold ? 'bold' : 'normal',
      });
      const width = text.width;
      text.destroy();
      return width;
    };

    for (const line of lines) {
      let current: CardEffectLine = [];
      let currentWidth = 0;
      for (const segment of line) {
        const segmentWidth = measure(segment);
        if (current.length > 0 && currentWidth + segmentWidth > maxWidth) {
          wrapped.push(current);
          current = [];
          currentWidth = 0;
        }
        current.push(segment);
        currentWidth += segmentWidth;
      }
      if (current.length > 0) {
        wrapped.push(current);
      }
    }

    return wrapped;
  }

  private updateCardEffectTexts(): void {
    this.cardViews.forEach((view) => {
      view.nameText.setText(localize(view.card.definition.name));
      const renderedEffect = this.cardEffectDisplay(view.card.definition);
      this.renderCardEffectText(view.effectText, renderedEffect.lines);
    });
  }

  private rejectCardPlay(container: Phaser.GameObjects.Container, reason: 'energy' | 'craving' | 'condition'): void {
    const message = reason === 'energy'
      ? l('Not enough energy', 'エナジーが足りない')
      : reason === 'craving'
        ? l('I can think only of Peak now', '今はPeakの事しか考えられない')
        : l('Cannot play now', '今は使用できない');

    this.showMessage(message);
    this.tweens.add({
      targets: container,
      x: container.x + 8,
      duration: 45,
      yoyo: true,
      repeat: 3,
    });
  }

  private playCard(
    card: CardInstance,
    container: Phaser.GameObjects.Container,
    hitArea: Phaser.GameObjects.Rectangle,
  ): void {
    if (this.isModalOpen()) {
      return;
    }

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

    const blockReason = this.cardPlayBlockReason(card.definition);
    if (blockReason) {
      this.rejectCardPlay(container, blockReason);
      return;
    }

    if (this.player.energy < card.definition.cost) {
      this.rejectCardPlay(container, 'energy');
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
    this.cardsPlayedThisTurn += 1;
    this.updateHud();
    this.refreshHandCardUsabilities();
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

          if (card.definition.vanish || card.definition.temporary) {
            this.animateCardVanish(container, () => {
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
    return definition.effects.some((effect) => this.isEnemyTargetEffect(effect) && (
      effect.kind === 'hpDamage'
      || effect.kind === 'epDamage'
      || effect.kind === 'status'
      || effect.kind === 'hpDrain'
    ));
  }

  private isEnemyTargetEffect(effect: EffectDefinition): boolean {
    return effect.target === 'selectedEnemy' || effect.target === 'triggerEnemy' || effect.target === 'allEnemies';
  }

  private async applyCardEffect(card: CardInstance, targetEnemy?: Enemy): Promise<void> {
    const definition = card.definition;
    const enemy = targetEnemy ?? this.enemy;
    this.addFlavors(definition.flavors, 'onPlay');
    this.isResolvingCardEffects = true;
    this.promotedFrustratedToCravingDuringCurrentCard = false;
    let result: EffectExecutionResult;
    try {
      result = await this.executeEffects(this.cardEffectsInExecutionOrder(definition), this.battleEventContext({
        source: 'card',
        sourceName: localize(definition.name),
        sourceId: definition.id,
        actor: this.player,
        selectedEnemy: enemy,
        card: definition,
      }));
    } finally {
      this.isResolvingCardEffects = false;
      this.promotedFrustratedToCravingDuringCurrentCard = false;
    }

    if (definition.purgeStatus) {
      await this.applyPurgeEffect(definition, result.causedPlayerEpPeak, result.messages);
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

  private cardEffectsInExecutionOrder(definition: CardDefinition): EffectDefinition[] {
    return this.effectsByPriority(definition.effects, (effect) => {
      if (effect.kind === 'setEp') {
        return 0;
      }

      if (effect.kind === 'status') {
        return 1;
      }

      if (this.isEnemyTargetEffect(effect)) {
        return 2;
      }

      if ((effect.kind === 'hpDamage' || effect.kind === 'epDamage') && effect.target === 'player') {
        return 3;
      }

      return 4;
    });
  }

  private enemyIntentEffectsInExecutionOrder(effects: EffectDefinition[]): EffectDefinition[] {
    return this.effectsByPriority(effects, (effect) => {
      if ((effect.kind === 'hpDamage' || effect.kind === 'epDamage') && effect.target === 'player') {
        return 0;
      }

      if ((effect.kind === 'hpDamage' || effect.kind === 'epDamage') && effect.target === 'self') {
        return 1;
      }

      return 2;
    });
  }

  private effectsByPriority(
    effects: EffectDefinition[],
    priorityFor: (effect: EffectDefinition) => number,
  ): EffectDefinition[] {
    return effects
      .map((effect, index) => ({ effect, index, priority: priorityFor(effect) }))
      .sort((a, b) => a.priority - b.priority || a.index - b.index)
      .map((entry) => entry.effect);
  }

  private async applyPurgeEffect(definition: CardDefinition, selfEpPeaked: boolean, messages: string[]): Promise<void> {
    if (!definition.purgeTargetName || !definition.purgeStatus || !this.statusHasTiming(definition.purgeStatus, EFFECT_TIMINGS.PurgePlayed)) {
      return;
    }

    const targetView = this.enemyViews.find((view) => view.displayName === definition.purgeTargetName);
    if (!targetView || !targetView.enemy.hasStatus(definition.purgeStatus)) {
      messages.push(`${localize(definition.name)}: no target`);
      return;
    }

    if (selfEpPeaked) {
      this.showMissEffect(this.enemyEffectX(targetView.enemy), this.enemyEffectY(targetView.enemy));
      this.addBattleLog('system', () => l(`${localize(definition.name)} failed`, `${localize(definition.name)}は失敗した`));
      messages.push(`${localize(definition.name)}: failed`);
      return;
    }

    const statusMessages = await this.runStatusTriggersForTiming(EFFECT_TIMINGS.PurgePlayed, {
      triggerEnemy: targetView.enemy,
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

    await this.runEnemyEpPeakHooks({ triggerEnemy: enemy });
    this.enemyEpPeakBarOverride = true;
    enemy.resetEpAfterPeak();
    this.updateHud();
    this.setEpFillImmediate(view.bars, enemy.ep, enemy.maxEp);
    this.enemyEpPeakBarOverride = false;
    this.showMessage(l(`${this.combatantDisplayName(enemy)} reaches EP Peak`, `${this.combatantDisplayName(enemy)}がEP Peak`));
  }

  private async runEnemyEpPeakHooks(context: Partial<BattleEventContext>): Promise<string[]> {
    const messages: string[] = [];

    for (const entry of this.relicTriggersForTiming(EFFECT_TIMINGS.EnemyEpPeak)) {
      messages.push(...await this.applyRelicTriggerEffects(entry, this.battleEventContext({
        ...context,
        source: 'relic',
        sourceName: localize(entry.relic.name),
        actor: this.player,
        relic: entry.relic,
      })));
    }

    return messages;
  }

  private async runPlayerEpPeakHooks(): Promise<string[]> {
    const messages: string[] = [];

    for (const entry of this.relicTriggersForTiming(EFFECT_TIMINGS.PlayerEpPeak)) {
      messages.push(...await this.applyRelicTriggerEffects(entry, this.battleEventContext({
        source: 'relic',
        sourceName: localize(entry.relic.name),
        actor: this.player,
        relic: entry.relic,
      })));
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

  private resolvePlayerEpDamageParts(effect: EffectDefinition, context: BattleEventContext): EpDamagePart[] {
    if (effect.epDamagePartMode === 'lastPlayerEpDamageParts') {
      return [...this.player.lastEpDamageParts];
    }

    if (effect.epDamagePartMode === 'actorIntruded') {
      if (context.actor instanceof Enemy) {
        if (context.actor.hasStatus('IntrudedA')) {
          return ['A'];
        }
        if (context.actor.hasStatus('IntrudedV')) {
          return ['V'];
        }
      }
    }

    return this.normalizedEpDamageParts(effect.epDamageParts);
  }

  private normalizedEpDamageParts(parts?: EpDamagePart[]): EpDamagePart[] {
    if (!parts || parts.length <= 0) {
      return ['M'];
    }

    const normalized = parts.filter((part, index) => parts.indexOf(part) === index);
    return normalized.length > 0 ? normalized : ['M'];
  }

  private async applyPlayerEpDamage(
    amount: number,
    parts: EpDamagePart[] = ['M'],
    context?: BattleEventContext,
  ): Promise<boolean> {
    let remaining = this.modifiedPlayerEpDamage(amount, parts);
    let peaked = false;
    let peakCountInDamage = 0;
    let stopContinuousFlash: (() => void) | undefined;

    try {
      while (remaining > 0) {
        const maxEp = this.playerEffectiveMaxEp();
        const damageToMax = Math.min(remaining, maxEp - this.player.ep);
        if (damageToMax > 0) {
          this.player.ep = Math.min(maxEp, this.player.ep + damageToMax);
          remaining -= damageToMax;
          this.recordPlayerEpDamage(damageToMax, parts, this.player.ep >= maxEp, context);
          this.updateHud();
          await this.animateEpFillTo(this.playerBars, this.player.ep, maxEp, 'player', 320, Boolean(stopContinuousFlash));
        }

        if (this.player.ep < this.playerEffectiveMaxEp()) {
          return peaked;
        }

        peaked = true;
        const flashCount = this.playerEpPeakFlashCount(peakCountInDamage);
        peakCountInDamage += 1;
        await this.registerPlayerEpPeakInCycle();
        const baseRecoveryEp = this.nextPlayerEpRecoveryValue();
        const recoveryEp = this.playerEpPeakRecoveryValueAfterReserveEffects(baseRecoveryEp);

        if (flashCount > 1) {
          const flashDuration = flashCount * EP_PEAK_FLASH_CYCLE_DURATION;
          await Promise.all([
            this.flashEpPeak(this.playerArea, this.playerBody, 0x467fb1, flashCount),
            this.flashEpFill(this.playerBars, flashCount),
            this.animatePlayerEpReserveTo(recoveryEp, this.playerEffectiveMaxEp(), flashDuration),
          ]);
        } else {
          stopContinuousFlash ??= this.startContinuousPlayerEpPeakFlash();
          await this.animatePlayerEpReserveTo(recoveryEp, this.playerEffectiveMaxEp(), EP_PEAK_FLASH_CYCLE_DURATION);
        }

        this.prepareArousalStatusForPlayerEpPeak();
        await this.runStatusTriggersForTiming(EFFECT_TIMINGS.PlayerEpPeak, { player: this.player }, {
          skipEffectKinds: new Set<EffectDefinition['kind']>(['epReserveHeal']),
        });
        await this.runPlayerEpPeakHooks();
        this.playerEpPeakBarOverride = true;
        this.player.recoverFromEpPeak(recoveryEp, this.playerEffectiveMaxEp());
        this.updateHud();
        this.setEpFillImmediate(this.playerBars, this.player.ep, this.playerEffectiveMaxEp(), Boolean(stopContinuousFlash));
        this.playerEpPeakBarOverride = false;
        await this.runStatusTriggersForTiming(EFFECT_TIMINGS.PlayerEpPeakRecovered, { player: this.player });
        if (remaining > 0) {
          await this.wait(130);
        }
      }
    } finally {
      stopContinuousFlash?.();
    }

    return peaked;
  }

  private recordPlayerEpDamage(
    amount: number,
    parts: EpDamagePart[],
    causedPeak: boolean,
    context?: BattleEventContext,
  ): void {
    if (amount <= 0) {
      return;
    }

    this.player.recordEpDamage({
      amount,
      parts: this.normalizedEpDamageParts(parts),
      causedPeak,
      source: context?.source ?? 'system',
      sourceName: context ? this.sourceDisplayName(context) : 'System',
      sourceId: context?.sourceId,
    });

    if (causedPeak) {
      this.syncPlayerSensitivityStatuses(parts);
    }
  }

  private syncPlayerSensitivityStatuses(parts: EpDamagePart[]): void {
    let changed = false;
    for (const part of this.normalizedEpDamageParts(parts)) {
      const currentLevel = this.currentPlayerSensitivityLevel(part);
      const nextLevel = this.sensitivityLevelForPeakCount(this.player.epPeakByPart[part] ?? 0);
      if (nextLevel === currentLevel) {
        continue;
      }

      this.clearPlayerSensitivityStatusesForPart(part);
      if (nextLevel > 0) {
        this.player.statuses.set(sensitivityStatusId(part, nextLevel as SensitivityLevel), 1);
      }
      if (nextLevel > currentLevel) {
        this.addBattleLog('narration', () => this.sensitivityLevelUpNarration(part, nextLevel));
      }
      changed = true;
    }

    if (changed) {
      this.updateHud();
    }
  }

  private clearPlayerSensitivityStatusesForPart(part: EpDamagePart): void {
    for (let level = 1; level <= 5; level += 1) {
      this.player.statuses.delete(sensitivityStatusId(part, level as SensitivityLevel));
    }
  }

  private sensitivityLevelForPeakCount(peakCount: number): number {
    let level = 0;
    PART_SENSITIVITY_LEVEL_THRESHOLDS.forEach((threshold, index) => {
      if (peakCount >= threshold) {
        level = index + 1;
      }
    });
    return level;
  }

  private currentPlayerSensitivityLevel(part: EpDamagePart): number {
    for (let level = 5; level >= 1; level -= 1) {
      if (this.player.hasStatus(sensitivityStatusId(part, level as SensitivityLevel))) {
        return level;
      }
    }

    return 0;
  }

  private sensitivityLevelUpNarration(part: EpDamagePart, level: number): LocalizedText {
    if (level >= 5) {
      return l(
        `${this.combatantDisplayName(this.player)}'s ${part} has been developed completely and cannot endure even the slightest stimulation.`,
        `${this.combatantDisplayName(this.player)}の${part}は開発し尽され、わずかな刺激にも耐えられない。`,
      );
    }

    const adverb = level === 1 ? '少し' : level === 2 ? '' : level === 3 ? 'だいぶ' : 'かなり';
    return l(
      `${this.combatantDisplayName(this.player)}'s ${part} has become more sensitive.`,
      `${this.combatantDisplayName(this.player)}の${part}が開発され${adverb}敏感になってしまった。`,
    );
  }

  private prepareArousalStatusForPlayerEpPeak(): void {
    if (!this.promotedFrustratedToCravingDuringCurrentCard || !this.player.hasStatus('CravingForPeaks')) {
      return;
    }

    this.player.statuses.delete('CravingForPeaks');
    this.player.statuses.set('Frustrated', 1);
    this.promotedFrustratedToCravingDuringCurrentCard = false;
    this.updateHud();
  }

  private playerEpPeakRecoveryValueAfterReserveEffects(baseRecoveryEp: number): number {
    let recoveryEp = baseRecoveryEp;

    for (const entry of this.statusTriggersForTiming(EFFECT_TIMINGS.PlayerEpPeak, { player: this.player })) {
      const stacks = entry.owner.statuses.get(entry.status) ?? 0;
      if (stacks <= 0) {
        continue;
      }

      for (const effect of entry.trigger.effects) {
        if (effect.kind !== 'epReserveHeal' || effect.target !== 'player') {
          continue;
        }

        if (effect.onlyDuringPlayerTurn && !this.isPlayerTurn) {
          continue;
        }

        recoveryEp = Math.max(0, recoveryEp - this.statusEffectAmount(effect, entry.owner, stacks));
      }
    }

    return Phaser.Math.Clamp(recoveryEp, 0, this.playerEffectiveMaxEp());
  }

  private async applyPlayerEpHeal(amount: number): Promise<void> {
    this.player.ep = Math.max(this.playerEpReserveValue, this.player.ep - amount);
    this.updateHud();
    await this.animateEpFillTo(this.playerBars, this.player.ep, this.playerEffectiveMaxEp(), 'player', 320);
  }

  private async registerPlayerEpPeakInCycle(): Promise<void> {
    this.playerEpPeaksThisCycle += 1;

    if (this.playerEpPeaksThisCycle >= 10) {
      await this.applyStatusToCombatantWithTriggers(this.player, 'PeakHell', 1);
      return;
    }

    if (this.playerEpPeaksThisCycle >= 5 && !this.player.hasStatus('PeakHell')) {
      await this.applyStatusToCombatantWithTriggers(this.player, 'MultiplePeak', 1);
    }
  }

  private modifiedPlayerEpDamage(amount: number, parts: EpDamagePart[] = ['M']): number {
    return Math.ceil(amount * this.playerEpDamageMultiplier(parts));
  }

  private modifiedPlayerHpDamage(amount: number): number {
    if (amount <= 0) {
      return amount;
    }

    return Math.ceil(amount * this.playerHpDamageMultiplier());
  }

  private playerHpDamageMultiplier(): number {
    let multiplier = 1;
    for (const [status, stacks] of this.player.statuses.entries()) {
      if (stacks <= 0) {
        continue;
      }

      for (const trigger of statusTriggersForTiming(status, EFFECT_TIMINGS.Passive)) {
        for (const modifier of trigger.modifiers ?? []) {
          if (modifier.kind === 'hpDamageTakenMultiplier' && modifier.target === 'player') {
            multiplier = Math.max(multiplier, modifier.amount);
          }
        }
      }
    }

    return multiplier;
  }

  private modifiedEnemyEpDamage(amount: number, enemy = this.enemy): number {
    if (amount <= 0) {
      return amount;
    }

    if (enemy.maxEp <= 0) {
      return 0;
    }

    const passiveBonus = this.relicTriggersForTiming(EFFECT_TIMINGS.Passive).reduce((sum, entry) => {
      return sum + entry.trigger.effects
        .filter((effect) => effect.kind === 'epDamage' && effect.target === 'selectedEnemy')
        .reduce((effectSum, effect) => effectSum + effect.amount, 0);
    }, 0);
    return amount + passiveBonus;
  }

  private modifiedPlayerEpDamageForCard(definition: CardDefinition, amount: number, parts: EpDamagePart[] = ['M']): number {
    let arousalStatus = this.currentPlayerArousalStatus();
    for (const effect of definition.effects) {
      if (
        effect.kind === 'status'
        && effect.target === 'player'
        && effect.status
        && (effect.stacks ?? effect.amount) > 0
        && this.isArousalStatus(effect.status)
      ) {
        arousalStatus = this.nextArousalStatus(arousalStatus, effect.status);
      }
    }

    return Math.ceil(
      amount
      * this.epDamageMultiplierForArousal(arousalStatus)
      * this.playerNonArousalEpDamageMultiplier()
      * this.playerSensitivityEpDamageMultiplier(parts),
    );
  }

  private playerEpDamageMultiplier(parts: EpDamagePart[] = ['M']): number {
    return (
      this.epDamageMultiplierForArousal(this.currentPlayerArousalStatus())
      * this.playerNonArousalEpDamageMultiplier()
      * this.playerSensitivityEpDamageMultiplier(parts)
    );
  }

  private playerSensitivityEpDamageMultiplier(parts: EpDamagePart[]): number {
    const normalizedParts = this.normalizedEpDamageParts(parts);
    const totalBonus = normalizedParts.reduce((sum, part) => {
      const level = this.currentPlayerSensitivityLevel(part);
      const multiplier = PART_SENSITIVITY_MULTIPLIERS[level] ?? 1;
      return sum + (multiplier - 1);
    }, 0);

    return 1 + totalBonus / normalizedParts.length;
  }

  private playerNonArousalEpDamageMultiplier(): number {
    let multiplier = 1;
    for (const [status, stacks] of this.player.statuses.entries()) {
      if (stacks <= 0 || this.isArousalStatus(status)) {
        continue;
      }

      for (const trigger of statusTriggersForTiming(status, EFFECT_TIMINGS.DamageCalculation)) {
        for (const modifier of trigger.modifiers ?? []) {
          if (modifier.kind === 'epDamageTakenMultiplier' && modifier.target === 'player') {
            multiplier *= modifier.amount;
          }
        }
      }
    }

    return multiplier;
  }

  private currentPlayerArousalStatus(): StatusEffect | undefined {
    return this.highestStatusInGroup(this.player, 'arousal');
  }

  private epDamageMultiplierForArousal(status: StatusEffect | undefined): number {
    if (!status) {
      return 1;
    }

    return statusTriggersForTiming(status, EFFECT_TIMINGS.DamageCalculation)
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

    if (definition.singleStack && target.hasStatus(status)) {
      return `${status} already active`;
    }

    if (definition.exclusiveGroup) {
      return this.applyExclusiveStatus(target, status, definition.exclusiveGroup);
    }

    target.addStatus(status, stacks);
    return stacks > 1 ? `${status} x${stacks}` : status;
  }

  private async applyStatusToCombatantWithTriggers(target: Player | Enemy, status: StatusEffect, stacks: number): Promise<string> {
    const beforeStacks = target.statuses.get(status) ?? 0;
    const applied = this.applyStatusToCombatant(target, status, stacks);
    const afterStacks = target.statuses.get(status) ?? 0;
    if (afterStacks <= beforeStacks) {
      return applied;
    }

    this.addFlavors(STATUS_DESCRIPTIONS[status]?.flavors, 'onApply');
    await this.runStatusTriggersForTiming(EFFECT_TIMINGS.StatusApplied, {
      triggerEnemy: target instanceof Enemy ? target : undefined,
      statusOwner: target,
      status,
    });
    this.syncPlayerFaintedPose(true);
    return applied;
  }

  private isArousalStatus(status: StatusEffect): boolean {
    return STATUS_DESCRIPTIONS[status]?.exclusiveGroup === 'arousal';
  }

  private applyExclusiveStatus(target: Player | Enemy, status: StatusEffect, group: string): string {
    const currentStatus = this.highestStatusInGroup(target, group);
    const nextStatus = this.nextStatusForGroup(currentStatus, status, group);
    if (
      target === this.player
      && group === 'arousal'
      && this.isResolvingCardEffects
      && currentStatus === 'Frustrated'
      && nextStatus === 'CravingForPeaks'
    ) {
      this.promotedFrustratedToCravingDuringCurrentCard = true;
    }

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
    this.showMessage(l('==== Enemy turn ====', '==== 敵のターン ===='));

    this.discardHandWithAnimation().then(() => {
      this.time.delayedCall(350, () => this.enemyAction());
    });
  }

  private async enemyAction(): Promise<void> {
    const actingViews = this.enemyViews.filter((view) => !view.enemy.isDefeated);
    if (actingViews.length === 0) {
      this.startNextTurn();
      return;
    }

    for (const view of actingViews) {
      this.selectEnemyByEnemy(view.enemy);
      const intent = this.enemy.currentIntent(this.player);
      const actingEnemy = this.enemy;
      const hasIntentNarration = (intent.flavors?.onIntent?.length ?? 0) > 0;
      this.addFlavors(intent.flavors, 'onIntent');
      if (!hasIntentNarration) {
        this.addBattleLog('narration', () => l(
          `${this.combatantDisplayName(actingEnemy)} uses ${localize(intent.label, 'en')}.`,
          `${this.combatantDisplayName(actingEnemy)}の${localize(intent.label, 'ja')}。`,
        ));
      }
      await this.executeEffects(this.enemyIntentEffectsInExecutionOrder(intent.effects), this.battleEventContext({
        source: 'enemyIntent',
        sourceName: this.combatantDisplayName(this.enemy),
        sourceId: this.enemy.definition.id,
        actor: this.enemy,
        selectedEnemy: this.enemy,
        intent,
        intentKey: intent.intentKey,
      }));

      if (intent.causedByStatus && this.enemy.hasStatus(intent.causedByStatus) && this.statusConsumesEachTurn(intent.causedByStatus)) {
        this.enemy.consumeStatus(intent.causedByStatus);
      }
      this.enemy.clearCharmIntent();

      const actingEnemyDefeated = this.enemy.isDefeated;
      this.updateHud();
      if (!actingEnemyDefeated) {
        this.enemy.advanceIntent(intent, this.player);
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

    this.time.delayedCall(650, () => this.startNextTurn());
  }

  private async startNextTurn(): Promise<void> {
    this.isPlayerTurn = true;
    this.startTurnCounters();
    this.setTurnOverlayColor('player');
    this.setHandInputLocked(true);
    this.player.startTurn(false);
    this.syncPlayerEpReserveAfterTurnRecovery();
    this.updateHud();
    await this.runTurnStartHooks();
    this.clearPlayerBlockAfterTurnStartHooks();
    await this.drawCards(5, true);
    await this.runPlayerActionStartHooks();
    this.setHandInputLocked(false);
    this.isAnimating = false;
    this.setEndTurnEnabled(true);
    this.showMessage(l('==== Your turn ====', '==== あなたのターン ===='));
    this.updateHud();
  }

  private flashEnemy(enemy = this.enemy): void {
    const view = this.enemyViewFor(enemy);
    if (!view) {
      return;
    }

    this.setEnemyBodyHitColor(view.body);
    this.tweens.add({
      targets: view.area,
      x: view.area.x + 12,
      duration: 55,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        view.area.setX(view.baseX);
        if (!enemy.isDefeated) {
          this.restoreEnemyBodyColor(view.body);
        }
        if (view.enemy === this.enemy) {
          this.updateReticlePosition();
        }
      },
    });
  }

  private setEnemyBodyHitColor(body: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Sprite): void {
    if (body instanceof Phaser.GameObjects.Sprite) {
      body.setTint(0xff4657);
      return;
    }

    body.setFillStyle(0xff4657);
  }

  private restoreEnemyBodyColor(body: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Sprite): void {
    if (body instanceof Phaser.GameObjects.Sprite) {
      body.clearTint();
      return;
    }

    body.setFillStyle(0x8a414d);
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
    const view = this.enemyViewFor(enemy) ?? this.currentEnemyView();
    const visual = view ? ENEMY_IDLE_VISUALS[view.enemy.definition.id] : undefined;
    if (view && visual) {
      return view.baseY + visual.effectOffsetY;
    }

    return (view?.baseY ?? 320) - 20;
  }

  private enemyViewFor(enemy: Enemy): EnemyView | undefined {
    return this.enemyViews.find((view) => view.enemy === enemy);
  }

  private healingEffect(): void {
    for (let i = 0; i < 12; i += 1) {
      const x = PLAYER_EFFECT_X + Phaser.Math.Between(-85, 85);
      const y = this.playerEffectY() + Phaser.Math.Between(-70, 90);
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
        y: this.playerEffectY() + Phaser.Math.Between(-54, 28),
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
    body: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Sprite,
    restoreColor: number,
    flashCount = EP_PEAK_BASE_FLASH_COUNT,
  ): Promise<void> {
    this.setCombatantBodyEpPeakColor(body);
    return new Promise((resolve) => {
      this.tweens.add({
        targets: target,
        alpha: 0.45,
        duration: EP_PEAK_FLASH_STEP_DURATION,
        yoyo: true,
        repeat: Math.max(0, flashCount - 1),
        onComplete: () => {
          target.setAlpha(1);
          this.restoreCombatantBodyColor(body, restoreColor);
          resolve();
        },
      });
    });
  }

  private setCombatantBodyEpPeakColor(body: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Sprite): void {
    if (body instanceof Phaser.GameObjects.Sprite) {
      body.setTint(0xff73b8);
      return;
    }

    body.setFillStyle(0xff73b8);
  }

  private restoreCombatantBodyColor(body: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Sprite, restoreColor: number): void {
    if (body instanceof Phaser.GameObjects.Sprite) {
      body.clearTint();
      return;
    }

    body.setFillStyle(restoreColor);
  }

  private playerEpPeakFlashCount(peakIndexInDamage: number): number {
    return Math.max(1, EP_PEAK_BASE_FLASH_COUNT - peakIndexInDamage);
  }

  private nextPlayerEpRecoveryValue(): number {
    const maxEp = this.playerEffectiveMaxEp();
    const reserveStep = Math.max(1, Math.floor(maxEp * 0.1));
    const reserveCap = Math.floor(maxEp * 0.9);
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

    return selected.length > 0 ? selected : [ENEMY_DEFINITIONS.grunt];
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
    this.retainPlayerBlockThisTurn = false;
    await this.runStatusTriggersForTiming(EFFECT_TIMINGS.TurnStart, { player: this.player });

    for (const entry of this.relicTriggersForTiming(EFFECT_TIMINGS.TurnStart)) {
      await this.applyRelicTriggerEffects(entry, this.battleEventContext({
        source: 'relic',
        sourceName: localize(entry.relic.name),
        actor: this.player,
        relic: entry.relic,
      }));
    }
  }

  private clearPlayerBlockAfterTurnStartHooks(): void {
    if (!this.retainPlayerBlockThisTurn) {
      this.player.block = 0;
    }
    this.retainPlayerBlockThisTurn = false;
    this.updateHud();
  }

  private async runPlayerActionStartHooks(): Promise<void> {
    await this.runStatusTriggersForTiming(EFFECT_TIMINGS.PlayerActionStart, { player: this.player });
    this.updateHud();
  }

  private async runStatusTriggersForTiming(
    timing: EffectTiming,
    context: Partial<BattleEventContext> = {},
    options: StatusTriggerRunOptions = {},
  ): Promise<string[]> {
    const messages: string[] = [];
    for (const entry of this.statusTriggersForTiming(timing, context)) {
      messages.push(...await this.applyStatusTriggerEffects(entry, context, options));
    }
    return messages;
  }

  private createPurgeCardDefinitionForEnemy(enemy: Enemy, status: StatusEffect): CardDefinition {
    const view = this.enemyViewFor(enemy);
    const targetName = view?.displayName ?? localize(enemy.definition.name);
    const statusName = this.statusDisplayName(status);
    const epDamageParts = this.normalizedEpDamageParts(STATUS_DESCRIPTIONS[status]?.epDamageParts);
    return {
      ...CARD_DEFINITIONS.purge,
      effects: CARD_DEFINITIONS.purge.effects.map((effect) => effect.kind === 'epDamage' && effect.target === 'player'
        ? { ...effect, epDamageParts }
        : effect),
      description: l(`On success, remove ${targetName}'s ${statusName}. Fails if it causes EP Peak.`, `成功時、${targetName}の${statusName}を解除する。EP Peakが発生すると失敗。`),
      purgeTargetName: targetName,
      purgeStatus: status,
    };
  }

  private breathingRecoveryMotion(): Promise<void> {
    this.tweens.killTweensOf(this.playerArea);
    const baseY = this.playerVisualY();
    this.playerArea.setY(baseY);

    return new Promise((resolve) => {
      this.tweens.add({
        targets: this.playerArea,
        y: baseY + 16,
        duration: 300,
        ease: 'Sine.easeInOut',
        yoyo: true,
        onComplete: () => {
          this.playerArea.setY(baseY);
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

  private async pulseRelicIcon(relicId: string): Promise<void> {
    const icon = this.relicIconViews.get(relicId);
    if (!icon) {
      return;
    }

    await this.pulseIconContainer(icon);
  }

  private async pulseStatusIcon(owner: Player | Enemy, status: StatusEffect): Promise<void> {
    let iconContainer: Phaser.GameObjects.Container | undefined;
    if (owner instanceof Enemy) {
      const view = this.enemyViewFor(owner);
      iconContainer = view ? this.statusIconViews.get(view.statusIcons)?.get(status) : undefined;
    } else {
      iconContainer = this.statusIconViews.get(this.playerStatusIcons)?.get(status);
    }

    if (!iconContainer) {
      this.updateHud();
      if (owner instanceof Enemy) {
        const view = this.enemyViewFor(owner);
        iconContainer = view ? this.statusIconViews.get(view.statusIcons)?.get(status) : undefined;
      } else {
        iconContainer = this.statusIconViews.get(this.playerStatusIcons)?.get(status);
      }
    }

    if (!iconContainer) {
      return;
    }

    await this.pulseIconContainer(iconContainer);
  }

  private pulseIconContainer(icon: Phaser.GameObjects.Container): Promise<void> {
    this.tweens.killTweensOf(icon);
    icon.setScale(1);

    return new Promise((resolve) => {
      this.tweens.add({
        targets: icon,
        scale: 1.22,
        duration: 120,
        ease: 'Sine.easeInOut',
        yoyo: true,
        onComplete: () => {
          icon.setScale(1);
          resolve();
        },
      });
    });
  }

  private syncPlayerFaintedPose(animate: boolean): Promise<void> {
    if (!this.playerArea) {
      return Promise.resolve();
    }

    const targetY = this.playerVisualY();
    this.tweens.killTweensOf(this.playerArea);
    if (!animate) {
      this.playerArea.setY(targetY);
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.tweens.add({
        targets: this.playerArea,
        y: targetY,
        duration: 180,
        ease: 'Quad.easeIn',
        onComplete: () => {
          this.playerArea.setY(targetY);
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

  private playDamageEffect(attribute: AttackAttribute, x: number, y: number, amount = 1): void {
    if (attribute === 'strike') {
      this.strikeImpactEffect(x, y);
      return;
    }

    if (attribute === 'slice') {
      this.sliceImpactEffect(x, y);
      return;
    }

    if (attribute === 'slash') {
      this.slashImpactEffect(x, y);
      return;
    }

    if (attribute === 'mucus') {
      this.mucusImpactEffect(x, y);
      return;
    }

    this.loveImpactEffect(x, y, amount);
  }

  private strikeImpactEffect(x: number, y: number): void {
    const sprite = this.add.sprite(x, y, STRIKE_EFFECT_KEY, 0);
    sprite.setDepth(1450);
    sprite.setScale(1.35);
    sprite.setAlpha(0.96);
    sprite.play(STRIKE_EFFECT_ANIMATION_KEY);
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.tweens.add({
        targets: sprite,
        alpha: 0,
        scale: 1.48,
        duration: 120,
        ease: 'Sine.easeOut',
        onComplete: () => sprite.destroy(),
      });
    });
  }

  private sliceImpactEffect(x: number, y: number): void {
    const sprite = this.add.sprite(x, y, SLICE_EFFECT_KEY, 0);
    sprite.setDepth(1450);
    sprite.setScale(1.35);
    sprite.setAlpha(0.96);
    sprite.play(SLICE_EFFECT_ANIMATION_KEY);
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.tweens.add({
        targets: sprite,
        alpha: 0,
        scale: 1.48,
        duration: 120,
        ease: 'Sine.easeOut',
        onComplete: () => sprite.destroy(),
      });
    });
  }

  private slashImpactEffect(x: number, y: number): void {
    const sprite = this.add.sprite(x, y, SLASH_EFFECT_KEY, 0);
    sprite.setDepth(1450);
    sprite.setScale(1.35);
    sprite.setAlpha(0.96);
    sprite.play(SLASH_EFFECT_ANIMATION_KEY);
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.tweens.add({
        targets: sprite,
        alpha: 0,
        scale: 1.48,
        duration: 120,
        ease: 'Sine.easeOut',
        onComplete: () => sprite.destroy(),
      });
    });
  }

  private loveImpactEffect(x: number, y: number, amount: number): void {
    const heartCount = Phaser.Math.Clamp(Math.ceil(Math.max(1, amount) / 2), 1, 5);
    for (let i = 0; i < heartCount; i += 1) {
      const effect = Phaser.Utils.Array.GetRandom(HEART_EFFECTS);
      const offsetX = Phaser.Math.Between(-44, 44);
      const offsetY = Phaser.Math.Between(-38, 38);
      const sprite = this.add.sprite(x + offsetX, y + offsetY, effect.key, 0);
      sprite.setDepth(1450 + i);
      sprite.setScale(1.35);
      sprite.setAlpha(0.96);
      sprite.play(effect.animationKey);

      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const travel = (200 * sprite.scaleX) / 4;
      this.tweens.add({
        targets: sprite,
        x: sprite.x + Math.cos(angle) * travel,
        y: sprite.y + Math.sin(angle) * travel * 0.7,
        duration: 660,
        ease: 'Sine.easeOut',
      });

      sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        this.tweens.add({
          targets: sprite,
          alpha: 0,
          scale: 1.48,
          duration: 120,
          ease: 'Sine.easeOut',
          onComplete: () => sprite.destroy(),
        });
      });
    }
  }

  private mucusImpactEffect(x: number, y: number): void {
    const sprite = this.add.sprite(x, y, MUCUS_EFFECT_KEY, 0);
    sprite.setDepth(1450);
    sprite.setScale(1.35);
    sprite.setAlpha(0.96);
    sprite.play(MUCUS_EFFECT_ANIMATION_KEY);
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.tweens.add({
        targets: sprite,
        alpha: 0,
        scale: 1.48,
        duration: 120,
        ease: 'Sine.easeOut',
        onComplete: () => sprite.destroy(),
      });
    });
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
    this.setEnemyBodyHitColor(defeatedView.body);

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

    this.playerHud.setText(localize(this.player.definition.name));
    const animateBars = this.hasRenderedHud;
    this.updateBars(
      this.playerBars,
      this.player.hp,
      this.player.maxHp,
      this.player.block,
      this.player.ep,
      this.playerEffectiveMaxEp(),
      animateBars,
      this.isPlayerMaxEpModified(),
    );
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

      const intent = view.enemy.currentIntent(this.player);
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
    bars.epMaxText.setVisible(visible && bars.hasEp);
    bars.epReserveFill.setVisible(visible && bars.hasEp);
    bars.epReserveStripes.setVisible(visible && bars.hasEp);
  }

  private enemyIntentDisplay(intent: ReturnType<Enemy['currentIntent']>, enemy = this.enemy): { segments: CardEffectSegment[] } {
    const prefix = intent.causedByStatus ? `${this.statusDisplayName(intent.causedByStatus)}: ` : '';
    const segments: CardEffectSegment[] = [{ text: `${prefix}${localize(intent.label)} ` }];

    const rawHpDamage = this.intentEffectTotal(intent, enemy, 'hpDamage', 'player');
    const hpDamage = this.modifiedPlayerHpDamage(rawHpDamage);
    const epDamagePreview = this.intentPlayerEpDamagePreview(intent, enemy);

    if (hpDamage > 0) {
      segments.push({ text: String(hpDamage), bold: hpDamage !== rawHpDamage, color: '#ff6b72' });
    }

    if (hpDamage > 0 && epDamagePreview.raw > 0) {
      segments.push({ text: ' / ' });
    }

    if (epDamagePreview.raw > 0) {
      segments.push({ text: String(epDamagePreview.modified), bold: epDamagePreview.modified !== epDamagePreview.raw, color: '#ff73b8' });
    }

    const selfDamage = this.intentEffectTotal(intent, enemy, 'hpDamage', 'self') + this.intentEffectTotal(intent, enemy, 'epDamage', 'self');
    if (selfDamage > 0) {
      segments.push({ text: ' / self ' });
      segments.push({ text: String(selfDamage) });
    }

    return {
      segments,
    };
  }

  private intentPlayerEpDamagePreview(
    intent: ReturnType<Enemy['currentIntent']>,
    enemy: Enemy,
  ): { raw: number; modified: number } {
    return intent.effects
      .filter((effect) => effect.kind === 'epDamage' && effect.target === 'player')
      .reduce((total, effect) => {
        const rawAmount = this.effectAmount(effect, this.player);
        const parts = this.resolvePlayerEpDamageParts(effect, this.battleEventContext({
          source: 'enemyIntent',
          sourceName: localize(intent.label),
          actor: enemy,
          intent,
        }));
        return {
          raw: total.raw + rawAmount * this.effectRepeatCount(effect),
          modified: total.modified + this.modifiedPlayerEpDamage(rawAmount, parts) * this.effectRepeatCount(effect),
        };
      }, { raw: 0, modified: 0 });
  }

  private intentEffectTotal(
    intent: ReturnType<Enemy['currentIntent']>,
    enemy: Enemy,
    kind: 'hpDamage' | 'epDamage',
    target: 'player' | 'self',
  ): number {
    return intent.effects
      .filter((effect) => effect.kind === kind && effect.target === target)
      .reduce((sum, effect) => sum + this.effectAmount(effect, target === 'self' ? enemy : this.player) * this.effectRepeatCount(effect), 0);
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
    epMaxModified = false,
  ): void {
    const hpRatio = Phaser.Math.Clamp(hp / maxHp, 0, 1);
    bars.hpText.setText(`${hp}/${maxHp}`);
    this.updateEpText(bars, ep, maxEp, epMaxModified);
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
      bars.epMaxText.setVisible(false);
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

  private updateEpText(bars: HudBars, ep: number, maxEp: number, maxModified: boolean): void {
    bars.epText.setText(`${ep}/`);
    bars.epText.setFontStyle('normal');
    bars.epMaxText.setText(String(maxEp));
    bars.epMaxText.setFontStyle(maxModified ? 'bold' : 'normal');

    const totalWidth = bars.epText.width + bars.epMaxText.width;
    const startX = bars.epX + BAR_WIDTH / 2 - totalWidth / 2;
    bars.epText.setPosition(startX, bars.epY);
    bars.epMaxText.setPosition(startX + bars.epText.width, bars.epY);
  }

  private syncPlayerEpReserveAfterTurnRecovery(): void {
    const nextReserveValue = Math.min(this.playerEpReserveValue, this.player.ep);
    if (nextReserveValue !== this.playerEpReserveValue) {
      this.setPlayerEpReserveValue(nextReserveValue, this.playerEffectiveMaxEp(), true);
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

  private showMessage(message: LocalizedText): void {
    this.addBattleLog('system', message);
  }

  private addBattleLog(kind: BattleLogKind, text: LocalizedText | (() => LocalizedText)): void {
    this.battleLogs.push({ id: this.nextBattleLogId, kind, text });
    this.nextBattleLogId += 1;
    if (this.battleLogs.length > 160) {
      this.battleLogs.splice(0, this.battleLogs.length - 160);
    }
    this.logScrollOffset = 0;
    this.renderBattleLog();
  }

  private addBattleLogs(lines?: BattleFlavorLine[], context?: Partial<BattleEventContext>): void {
    if (!lines || lines.length <= 0) {
      return;
    }
    const line = Phaser.Utils.Array.GetRandom(lines);
    this.addBattleLog(line.kind, () => this.interpolateFlavorText(line.text, context));
  }

  private addFlavors(
    flavors: { [key: string]: BattleFlavorLine[] | undefined } | undefined,
    key: BattleFlavorKey,
    context?: Partial<BattleEventContext>,
  ): void {
    this.addBattleLogs(flavors?.[key], context);
  }

  private interpolateFlavorText(text: LocalizedText, context?: Partial<BattleEventContext>): LocalizedText {
    const replacements = this.flavorReplacements(context);
    const replace = (value: string) => Object.entries(replacements).reduce(
      (result, [key, replacement]) => result.split(`{${key}}`).join(replacement),
      value,
    );

    if (typeof text === 'string') {
      return replace(text);
    }

    return {
      en: replace(text.en),
      ja: replace(text.ja),
    };
  }

  private flavorReplacements(context?: Partial<BattleEventContext>): Record<string, string> {
    return {
      player: this.combatantDisplayName(this.player),
      source: context?.sourceName ?? '',
      status: context?.status ? this.statusDisplayName(context.status) : '',
    };
  }

  private visibleLogLineCount(): number {
    return this.logTextObjects.length;
  }

  private renderBattleLog(): void {
    if (!this.logPanel) {
      return;
    }

    const visibleCount = this.visibleLogLineCount();
    const start = Math.max(0, this.battleLogs.length - visibleCount - this.logScrollOffset);
    const entries = this.battleLogs.slice(start, start + visibleCount);
    const topPadding = 10;
    const bottomMargin = 14;
    const entryGap = 4;
    const panelHeight = 232;

    this.logBg.setFillStyle(0x0d1218, this.logHistoryMode ? 0.86 : 0);
    this.logBg.setStrokeStyle(2, 0x40526a, this.logHistoryMode ? 0.82 : 0);

    this.logTextObjects.forEach((text) => {
      text.setText('');
      text.setVisible(false);
    });

    let cursorY = panelHeight - bottomMargin;
    let textIndex = this.logTextObjects.length - 1;
    const renderedTexts: Phaser.GameObjects.Text[] = [];
    const renderedKinds: BattleLogKind[] = [];
    for (let entryIndex = entries.length - 1; entryIndex >= 0 && textIndex >= 0; entryIndex -= 1) {
      const entry = entries[entryIndex];
      const text = this.logTextObjects[textIndex];
      text.setText(this.formatBattleLogEntry(entry));
      text.setColor(this.logColor(entry.kind));
      const nextY = cursorY - text.height;
      if (nextY < topPadding && renderedTexts.length > 0) {
        text.setText('');
        text.setVisible(false);
        break;
      }

      text.setY(Math.max(topPadding, nextY));
      text.setVisible(true);
      renderedTexts.unshift(text);
      renderedKinds.unshift(entry.kind);
      cursorY = text.y - entryGap;
      textIndex -= 1;
    }

    renderedTexts.forEach((text, index) => {
      text.setAlpha(this.logLineAlpha(index, renderedTexts.length));
      text.setColor(this.logColor(renderedKinds[index]));
    });

    this.logScrollbar.setVisible(this.logHistoryMode && this.battleLogs.length > visibleCount);
    if (this.logScrollbar.visible) {
      const maxOffset = Math.max(1, this.battleLogs.length - visibleCount);
      const scrollbarTop = 10;
      const scrollbarTravel = 174;
      const y = scrollbarTop + scrollbarTravel - (this.logScrollOffset / maxOffset) * scrollbarTravel;
      this.logScrollbar.setY(y);
    }
  }

  private logLineAlpha(index: number, visibleEntries: number): number {
    if (this.logHistoryMode || visibleEntries <= 0) {
      return 1;
    }

    if (index === 0) {
      return 0.35;
    }
    if (index === 1) {
      return 0.5;
    }
    if (index === 2) {
      return 0.68;
    }
    return 1;
  }

  private formatBattleLogEntry(entry: BattleLogEntry): string {
    const text = typeof entry.text === 'function' ? entry.text() : entry.text;
    return localize(text);
  }

  private logColor(kind: BattleLogKind): string {
    if (kind === 'system') {
      return '#dcecff';
    }
    if (kind === 'quote') {
      return '#ffd6ef';
    }
    return '#d8d2c8';
  }
}
