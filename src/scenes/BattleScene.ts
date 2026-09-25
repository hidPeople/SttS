import { onPrimaryClick, installPointerBack } from '../ui/pointerActions';
import { SCREEN_WIDTH, SCREEN_HEIGHT, SCREEN_CENTER_X, SCREEN_CENTER_Y } from '../ui/layout';
import { bindPortraitHover } from '../ui/portraitHover';
import { GAME_FONT } from '../ui/fonts';
import { characterPortraitAssets } from '../models/portraitAssets';
import { PortraitSelection } from '../models/portraitSelection';
import { PORTRAIT_FACTORS } from '../data/portraitFactors';
import { preloadBattleBackgrounds, addBattleBackground } from '../ui/battleBackground';
import { playBattleEntrance } from '../ui/battleEntrance';
import { TUTORIAL_TIPS } from '../data/tutorialTips';
import { TutorialTips } from '../ui/tutorialTips';
import type { TutorialEnemyState } from '../data/tutorialTips';
import { CrayonPatch, CRAYON_COLORS, paintBehindLabel, createTooltipPaint } from '../ui/crayon';
import { addPlayerPortrait, applyPlayerPortrait, bringPlayerPortraitForward } from '../ui/playerPortrait';
import { PortraitFlash } from '../ui/portraitFlash';
import { ConversationWindow, preloadConversationAssets } from '../ui/conversation';
import { battleLogColor } from '../ui/battleLogStyle';
import { EVENT_BATTLES } from '../data/eventBattles';
import { effect as makeEffect } from '../data/effectBuilders';
import { energyRecovery, receivedEpDamage, recordHpDrain, turnStartDrawAllowed } from '../models/statusRestrictions';
import { statusChanges, statusNoticeKind } from '../models/statusChanges';
import { ENEMY_INTENT_TEXT, ENEMY_INTENT_COLORS, PLAYER_STATUS_HUD_LAYOUT, RELIC_HUD_LAYOUT } from '../data/ui';
import { StatusRuntime, blocksTurnStartEpRecovery, statusTargetAllowed } from '../models/statusRuntime';
import { KeyboardNavigation, type Direction, type NavigationItem } from '../ui/keyboardNavigation';
import { statusStacksPerEnergy } from '../models/statusConsumption';
import Phaser from 'phaser';
import { cardDescriptionSegments } from '../models/cardDescription';
import { bindCardTermHover } from '../ui/cardTermHover';
import { renderCardText } from '../ui/cardText';
import { CARD_WIDTH, CARD_HEIGHT, CARD_EDGE, createCardShell, fitCardName } from '../ui/cardPresentation';
import { HAND_REST_Y, handPose, flyCard, cardBurst } from '../ui/cardMotion';
import { populatePileBrowser } from '../ui/pileBrowser';
import { HoverTooltip } from '../ui/hoverTooltip';
import { setPunctuationAwareWordWrap, sizeTooltipText, TOOLTIP_LAYOUT, tooltipPosition } from '../ui/textLayout';
import { BODY_PART_TOKENS, bodyPartDefaultName, bodyPartName, bodyPartStatPart, isBodyPartToken, type BodyPartNameLevel, type BodyPartToken } from '../data/bodyParts';
import { canPlayCardDuringCraving, canPlayCardWhileBound, cardCategoryColor } from '../data/cardCategories';
import { CARD_DEFINITIONS, createDeckDefinitions } from '../data/cards';
// DEBUG_MODE_START
import { appendDebugSettingsButtons, debugEncounterThreat } from '../debug/debugMode';
// DEBUG_MODE_END
import { ENEMY_DEFINITIONS, ENEMY_PEAK_AFTERSHOCKS_INTENT } from '../data/enemies';
import { ENEMY_SPRITES } from '../data/enemySprites';
import { DAMAGE_SPRITE_EFFECTS } from '../data/sprites';
import { preloadSprites, createSpriteAnimations, playSpriteEffect } from '../ui/sprites';
import { globalFlavorEntries } from '../data/flavorCatalog';
import { PLAYER_DEFINITION, PLAYER_PORTRAIT } from '../data/player';
import { RELIC_DEFINITIONS } from '../data/relics';
import { PART_SENSITIVITY_LEVELS, STATUS_DESCRIPTIONS, sensitivityStatusId, statusTriggersForTiming, type SensitivityLevel } from '../data/statuses';
import { Enemy, Player } from '../models/Combatants';
import { evaluateConditions } from '../models/conditions';
import { Deck } from '../models/Deck';
import { resolveEnemySpriteKey } from '../models/enemySprites';
import { localizeGameText as localize } from '../models/gameText';
import { SETTINGS_STATE, text as l, toggleLanguage, type Language, type LocalizedText } from '../models/localization';
import { RUN_STATE, currentEncounterThreat, resetRunState, saveRunVitals, setCurrentEncounterEnemyIds, type SavedBattleLogEntry } from '../models/RunState';
import { EFFECT_TIMINGS, EP_DAMAGE_PARTS, FLAVOR_EVENTS } from '../models/types';
import type {
  AttackAttribute,
  BattleFlavorEvent,
  BattleFlavorEntry,
  BattleFlavorLine,
  BattleLogKind,
  BattleEventContext,
  CardDefinition,
  CardInstance,
  ConditionTarget,
  EffectDefinition,
  EffectTiming,
  EnemyDeathCause,
  EnemyDeathNarration,
  EnemyDefinition,
  EnemyIntent,
  EnemyReactionRule,
  EnemySpriteDefinition,
  EpDamagePart,
  RelicDefinition,
  RelicTriggerDefinition,
  StatusDefinition,
  StatusEffect,
  StatusTriggerDefinition,
} from '../models/types';

const IMPORTANT_LOG_PAUSE_MS = 1000;
const STATUS_REMOVAL_TRANSITIONS: Partial<Record<StatusEffect, StatusEffect>> = {
  MultiplePeak: 'PeakHell',
  PeakHell: 'MultiplePeaksTorture',
};

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
  term?: StatusEffect | 'block';
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

type AddCardsToHandResult = {
  count: number;
  cardName?: LocalizedText;
};

type StatusApplicationResult = {
  label: string;
  appliedStatus?: StatusEffect;
  upgradeFrom?: StatusEffect;
  upgradeTo?: StatusEffect;
  changed: boolean;
};

type EnemyDefeatCauseContext = {
  cause: EnemyDeathCause;
  context: BattleEventContext;
  statuses: StatusEffect[];
  intent?: EnemyIntent;
};

type BattleLogEntry = SavedBattleLogEntry;

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

type EnemyOpaqueBounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
};

type EnemyVisualLayout = {
  areaY: number;
  bodyOffsetY: number;
  bounds: EnemyOpaqueBounds;
  shadowY: number;
  shadowWidth: number;
  shadowHeight: number;
  hitAreaX: number;
  hitAreaY: number;
  hitAreaWidth: number;
  hitAreaHeight: number;
  hudY: number;
  barY: number;
  statusY: number;
  intentY: number;
  effectOffsetX: number;
  effectOffsetY: number;
};

const ENEMY_DENSE_LAYOUT_MIN_COUNT = 2;
const ENEMY_DENSE_LAYOUT_BOTTOM_LIFT = 22;
const ENEMY_BASELINE_Y = 395;
const GIANT_ENEMY_BASELINE_Y = 446;

type EnemyView = {
  enemy: Enemy;
  displayName: string;
  visual?: EnemySpriteDefinition;
  displayedIntent: EnemyIntent;
  baselineY: number;
  shadow: Phaser.GameObjects.Ellipse;
  hitArea: Phaser.GameObjects.Rectangle;
  clickArea: Phaser.GameObjects.Rectangle;
  area: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Sprite;
  hudText: Phaser.GameObjects.Text;
  bars: HudBars;
  statusIcons: Phaser.GameObjects.Container;
  intentText: Phaser.GameObjects.Container;
  baseX: number;
  baseY: number;
  effectOffsetX: number;
  effectOffsetY: number;
};

const HAND_Y = HAND_REST_Y;
const MAX_HAND_SIZE = 10;
const HAND_MIN_X = 260;
const HAND_MAX_X = 950;
const HAND_CENTER_X = (HAND_MIN_X + HAND_MAX_X) / 2;
const HAND_CARD_GAP = 132;
const BAR_WIDTH = 190;
const BAR_HEIGHT = 16;
const EP_PEAK_FLASH_STEP_DURATION = 80;
const EP_PEAK_FLASH_CYCLE_DURATION = EP_PEAK_FLASH_STEP_DURATION * 2;
const EP_PEAK_BASE_FLASH_COUNT = 5;
const EP_PEAK_CONTINUOUS_ONE_FLASH_THRESHOLD = 5;
const EP_PEAK_CONTINUOUS_STEP_DURATION = 200;
const EP_PEAK_CONTINUOUS_SPEED_MULTIPLIER = 1.1;
const EP_PEAK_CONTINUOUS_MIN_STEP_DURATION = 24;
const EP_FILL_COLOR = 0xf28ac6;
const EP_RESERVE_COLOR = 0x6f0f3b;
export const PLAYER_VISUAL_X = 145;
export const PLAYER_VISUAL_Y = PLAYER_STATUS_HUD_LAYOUT.y + PLAYER_STATUS_HUD_LAYOUT.iconSize / 2;
export const PLAYER_VISUAL_SCALE = PLAYER_PORTRAIT.battleScale;
// Screen-space anchor from the original placeholder; independent of portrait placement and pose.
export const PLAYER_EFFECT_X = 145;
export const PLAYER_EFFECT_Y = 456;

export class BattleScene extends Phaser.Scene {
  private conversation?: ConversationWindow;
  private tutorialTips?: TutorialTips;
  private completedTurnEvents = new Map<number, number>();
  private statusRuntime = new StatusRuntime();
  private player!: Player;
  private enemy!: Enemy;
  private enemies: Enemy[] = [];
  private enemyViews: EnemyView[] = [];
  private enemyDefeatCauses = new Map<Enemy, EnemyDefeatCauseContext>();
  private narratedEnemyDefeats = new WeakSet<Enemy>();
  private enemyPeakDrains?: { enemy: Enemy; animation: Promise<void> }[];
  private hpDrainLogBatch?: Map<Enemy, number>;
  private selectedEnemyIndex = 0;
  private deck!: Deck;

  private portraitHovered = false;
  private playerArea!: Phaser.GameObjects.Container;
  private playerEntranceArea!: Phaser.GameObjects.Container;
  private playerBody!: Phaser.GameObjects.Sprite;
  private playerPortraitFlash!: PortraitFlash;
  private portraitSelection?: PortraitSelection;
  private currentPortraitId?: string;
  private enemyArea!: Phaser.GameObjects.Container;
  private enemyBody!: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Sprite;
  private reticle!: Phaser.GameObjects.Graphics;
  private reticlePulse = { offset: 0 };

  private playerHud!: Phaser.GameObjects.Text;
  private enemyHud!: Phaser.GameObjects.Text;
  private playerStatusIcons!: Phaser.GameObjects.Container;
  private enemyStatusIcons!: Phaser.GameObjects.Container;
  private relicIcons!: Phaser.GameObjects.Container;
  private playerBars!: HudBars;
  private enemyBars!: HudBars;
  private energyPanel!: CrayonPatch;
  private energyText!: Phaser.GameObjects.Text;
  private endTurnButton!: Phaser.GameObjects.Container;
  private endTurnButtonBg!: CrayonPatch;
  private endTurnButtonLabel!: Phaser.GameObjects.Text;
  private turnOverlay!: Phaser.GameObjects.Image;
  private deckPileText!: Phaser.GameObjects.Text;
  private handPileText!: Phaser.GameObjects.Text;
  private discardPileText!: Phaser.GameObjects.Text;
  private pileOverlay!: Phaser.GameObjects.Container;
  private hoverRelease?: Phaser.Time.TimerEvent;
  private transferredHoverUid?: string;
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
  private tooltipHover!: HoverTooltip;
  private statusTooltipBg!: CrayonPatch;
  private statusTooltipText!: Phaser.GameObjects.Text;
  private statusTooltipStatus?: StatusEffect;
  private statusTooltipOwner?: Phaser.GameObjects.Container;
  private resultOverlay!: Phaser.GameObjects.Container;
  private modalOverlay!: Phaser.GameObjects.Container;
  private modalBack?: () => void;
  private relicsByTiming = new Map<EffectTiming, IndexedRelicTrigger[]>();
  private relicIconViews = new Map<string, Phaser.GameObjects.Container>();
  private statusIconViews = new WeakMap<Phaser.GameObjects.Container, Map<StatusEffect, Phaser.GameObjects.Container>>();
  private enemyAttackAnimationBoostCounts = new WeakMap<Enemy, number>();
  private enemyAttackAnimationOriginalTimeScales = new WeakMap<Enemy, number>();

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
  private playerEpFillProtectionCount = 0;
  private enemyEpFillProtectionCount = 0;
  private playerEpReserveOverride = false;
  private playerEpReserveValue = 0;
  private retainPlayerBlockThisTurn = false;
  private hasRenderedHud = false;
  private cardsPlayedThisTurn = 0;
  private lastPortraitCardId?: string;
  private playerEpPeaksThisCycle = 0;
  private playerEpPeakNextFlashCount = EP_PEAK_BASE_FLASH_COUNT;
  private isResolvingCardEffects = false;
  private promotedFrustratedToCravingDuringCurrentCard = false;
  private deferCardPreviewUpdates = false;
  private deferEnemyIntentPreviewUpdates = false;

  constructor() {
    super('BattleScene');
  }

  preload(): void {
    preloadConversationAssets(this);
    preloadBattleBackgrounds(this);
    preloadSprites(this);
  }

  create(): void {
    this.conversation = undefined;
    this.tutorialTips = undefined;
    this.completedTurnEvents.clear();
    this.transferredHoverUid = undefined;
    this.input.on('pointermove', this.releaseTransferredHover, this);
    this.input.on('gameout', this.releaseTransferredHover, this);
    this.events.once('shutdown', () => {
      this.input.off('pointermove', this.releaseTransferredHover, this);
      this.input.off('gameout', this.releaseTransferredHover, this);
    });
    this.modalBack = undefined;
    installPointerBack(this, () => {
      if (this.conversation && !this.modalOverlay?.visible) return false;
      this.goBack(); return true;
    });
    KeyboardNavigation.for(this).configure({
      filter: item => this.tutorialTips?.active ? item.group === 'tutorial-tip' : !this.conversation || this.modalOverlay?.visible || ['settings', 'dialogue'].includes(item.group),
      scope: () => this.tutorialTips?.root ?? (this.modalOverlay?.visible ? this.modalOverlay : this.pileOverlay?.visible ? this.pileOverlay : undefined),
      move: (direction, current, items) => this.moveKeyboardSelection(direction, current, items),
      escape: () => this.goBack(),
    });
    this.isAnimating = false;
    this.isGameOver = false;
    this.isPlayerTurn = true;
    this.canEndTurn = false;
    this.playerEpPeakBarOverride = false;
    this.enemyEpPeakBarOverride = false;
    this.playerEpFillProtectionCount = 0;
    this.enemyEpFillProtectionCount = 0;
    this.playerEpReserveOverride = false;
    this.retainPlayerBlockThisTurn = false;
    this.playerEpReserveValue = 0;
    this.hasRenderedHud = false;
    this.cardsPlayedThisTurn = 0;
    this.playerEpPeaksThisCycle = 0;
    this.playerEpPeakNextFlashCount = EP_PEAK_BASE_FLASH_COUNT;
    this.deferCardPreviewUpdates = false;
    this.deferEnemyIntentPreviewUpdates = false;
    this.enemyDefeatCauses.clear();
    this.narratedEnemyDefeats = new WeakSet<Enemy>();
    this.cardViews.clear();
    this.battleLogs = RUN_STATE.battleLogs;
    this.nextBattleLogId = RUN_STATE.nextBattleLogId;
    this.logHistoryMode = false;
    this.logScrollOffset = 0;
    this.relicIconViews.clear();
    this.statusIconViews = new WeakMap<Phaser.GameObjects.Container, Map<StatusEffect, Phaser.GameObjects.Container>>();
    this.exitingCardUids.clear();
    this.hoveredCardUid = undefined;
    this.handInputLocked = false;
    this.statusTooltipStatus = undefined;
    this.statusTooltipOwner = undefined;
    this.tooltipHover = new HoverTooltip(this, () => {
      this.clearStatusTooltipSource();
      this.statusTooltip?.setVisible(false);
      this.game.events.emit('battle-tooltip-hide');
    });
    this.enemies = [];
    this.enemyViews = [];
    this.selectedEnemyIndex = 0;

    this.player = new Player({ ...PLAYER_DEFINITION, relics: [...RUN_STATE.relicIds] });
    this.player.hp = Phaser.Math.Clamp(RUN_STATE.playerHp, 0, this.player.maxHp);
    this.player.epPeakCount = RUN_STATE.playerEpPeakCount;
    this.player.epDamageByPart = { ...RUN_STATE.playerEpDamageByPart };
    this.player.epPeakByPart = { ...RUN_STATE.playerEpPeakByPart };
    this.player.recentEpPeakByPart = { ...RUN_STATE.playerRecentEpPeakByPart };
    this.statusRuntime = new StatusRuntime();
    this.player.statusActiveTurns = { ...RUN_STATE.playerStatusActiveTurns };
    for (const status of RUN_STATE.playerStatuses) {
      if (status.stacks > 0) {
        this.player.statuses.set(status.effect, status.stacks);
      }
    }
    this.player.ep = Phaser.Math.Clamp(RUN_STATE.playerEp, 0, this.playerEffectiveMaxEp());
    // Restore levels before the first HUD/card preview or battle-start hook.
    for (const part of EP_DAMAGE_PARTS) {
      this.setPlayerSensitivityLevel(part, this.sensitivityLevelForProgress(
        this.player.epPeakByPart[part], this.player.epDamageByPart[part],
      ));
    }
    this.playerEpReserveValue = Phaser.Math.Clamp(RUN_STATE.playerEpReserveValue, 0, this.playerEffectiveMaxEp());
    let encounterThreat = currentEncounterThreat();
    // DEBUG_MODE_START
    encounterThreat = debugEncounterThreat(encounterThreat);
    // DEBUG_MODE_END
    this.enemies = this.createEncounterEnemies(encounterThreat);
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
    this.createTutorialTips();
    this.setPlayerEpReserveValue(this.playerEpReserveValue, this.playerEffectiveMaxEp(), false);

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
      this.player.recentEpPeakByPart,
      this.remainingPlayerStatuses(),
      this.player.statusActiveTurns,
    );
  }

  private remainingPlayerStatuses(): { effect: StatusEffect; stacks: number }[] {
    return Array.from(this.player.statuses.entries())
      .filter(([effect, stacks]) => stacks > 0 && STATUS_DESCRIPTIONS[effect]?.remain === 1)
      .map(([effect, stacks]) => ({ effect, stacks: STATUS_DESCRIPTIONS[effect]?.durationTurns
        ? this.statusRuntime.remainingAtNextTurn(this.player, effect) : stacks }))
      .filter(entry => entry.stacks > 0);
  }

  private async startInitialTurn(): Promise<void> {
    this.isAnimating = true;
    this.updateHud();
    const entranceReticle = this.reticle;
    entranceReticle.setVisible(false);
    // Entrance runs alongside the existing startup sequence; it does not gate hooks or draws.
    void playBattleEntrance(this, this.playerEntranceArea, this.enemyViews).then(completed => {
      if (completed && entranceReticle.active) entranceReticle.setVisible(true);
    });
    this.setTurnOverlayColor('player');
    this.setEndTurnEnabled(false);
    // Event starting statuses are restored before HUD creation; announce them once here.
    const beforeInitialStatuses = new Map(this.player.statuses);
    const event = RUN_STATE.eventBattleId ? EVENT_BATTLES[RUN_STATE.eventBattleId] : undefined;
    for (const { effect } of event?.statuses ?? []) beforeInitialStatuses.delete(effect);
    await this.notifyAutomaticStatusChanges(this.player, beforeInitialStatuses);
    await this.runBattleStartHooks();
    this.addBattleLogSpacing(0.5);
    this.addGlobalFlavorEvent(FLAVOR_EVENTS.Battle.PlayerTurnStart, { source: 'system', actor: this.player });
    this.resetRecentEpPeaksIfNoAftershocksAtTurnStart();
    await this.startTurnCounters();
    const beforeTurnStatuses = new Map(this.player.statuses);
    const recoveryBlocked = this.player.startTurn(false, !blocksTurnStartEpRecovery(this.player));
    await this.notifyAutomaticStatusChanges(this.player, beforeTurnStatuses);
    this.showEnergyRecoveryBlocked(recoveryBlocked);
    this.syncPlayerEpReserveAfterTurnRecovery();
    this.updateHud();
    await this.runTurnStartHooks();
    this.clearPlayerBlockAfterTurnStartHooks();
    this.addBindingIntentWarnings();
    if (!await this.runBeforeDrawEvents()) return;
    if (turnStartDrawAllowed(this.player)) await this.drawCards(5, true);
    await this.runPlayerActionStartHooks();
    this.isAnimating = false;
    this.setEndTurnEnabled(true);
    this.updateHud();
    this.addPlayerActionReadySpacing();
  }

  private showEnergyRecoveryBlocked(status?: StatusEffect): void {
    if (!status) return;
    this.addFlavorEvent(STATUS_DESCRIPTIONS[status].flavors, FLAVOR_EVENTS.Status.EnergyRecoveryBlocked,
      this.battleEventContext({ source: 'status', actor: this.player, status, statusOwner: this.player }));
  }

  private async runBeforeDrawEvents(): Promise<boolean> {
    if (this.isGameOver) return false;
    const battle = RUN_STATE.eventBattleId ? EVENT_BATTLES[RUN_STATE.eventBattleId] : undefined;
    for (const [index, event] of (battle?.beforeDrawEvents ?? []).entries()) {
      const turn = this.statusRuntime.turn;
      if (event.repeatWhileStatus) {
        if (turn < event.turn || !this.player.hasStatus(event.repeatWhileStatus) || this.completedTurnEvents.get(index) === turn) continue;
      } else if (event.turn !== turn || this.completedTurnEvents.has(index)) continue;
      this.completedTurnEvents.set(index, turn);
      if (event.conversationId) {
        this.hideStatusTooltip();
        this.conversation = new ConversationWindow(this, event.conversationId, () => this.modalOverlay.visible, this.playerArea);
        const completed = await this.conversation.finished;
        this.conversation = undefined;
        if (!completed || !this.sys.isActive()) return false;
      }
      for (const cardId of event.cardIds ?? []) {
        await this.executeEffects([makeEffect('addCardToHand', 'player', 1, { cardId })], this.battleEventContext({
          source: 'system', actor: this.player,
          statusTrigger: { timing: EFFECT_TIMINGS.TurnStart, effects: [], visuals: ['addCardFromPlayerFadeIn'] },
        }));
      }
    }
    return true;
  }

  private async startTurnCounters(): Promise<void> {
    this.lastPortraitCardId = undefined;
    this.refreshPlayerPortrait();
    const snapshots = [this.player, ...this.enemies].map(owner => ({ owner, before: new Map(owner.statuses) }));
    this.statusRuntime.advance(this.player, this.enemies, this.playerEpPeaksThisCycle);
    this.cardsPlayedThisTurn = 0;
    this.playerEpPeaksThisCycle = 0;
    this.playerEpPeakNextFlashCount = EP_PEAK_BASE_FLASH_COUNT;
    for (const { owner, before } of snapshots) await this.notifyAutomaticStatusChanges(owner, before);
  }

  private resetRecentEpPeaksIfNoAftershocksAtTurnStart(): void {
    if (!this.player.hasStatus('Aftershocks')) {
      this.player.resetRecentEpPeakByPart();
    }
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
    createSpriteAnimations(this);
  }

  private createArena(): void {
    addBattleBackground(this, RUN_STATE.stage, RUN_STATE.eventBattleId, SCREEN_WIDTH, SCREEN_HEIGHT);
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
    this.lastPortraitCardId = undefined;
    this.playerArea = this.add.container(PLAYER_VISUAL_X, this.playerVisualY());
    this.playerArea.setScale(PLAYER_VISUAL_SCALE);

    this.portraitHovered = false;
    this.portraitSelection = new PortraitSelection(Object.keys(characterPortraitAssets), PORTRAIT_FACTORS);
    this.currentPortraitId = this.portraitSelection.select(this.playerPortraitContext());
    this.playerBody = addPlayerPortrait(this, 0, 0, this.currentPortraitId);
    this.playerBody.setVisible(Boolean(this.currentPortraitId));
    this.events.once('shutdown', () => { this.portraitSelection?.clear(); this.portraitSelection = undefined; });
    this.playerPortraitFlash = new PortraitFlash(this, this.playerBody);
    // Separate entrance transforms from per-image sizing and the outer damage/status motion.
    this.playerEntranceArea = this.add.container(0, 0, [this.playerBody]);
    this.playerArea.add(this.playerEntranceArea);
    bindPortraitHover(this.playerBody, hovered => {
      this.portraitHovered = hovered;
      this.refreshPlayerPortrait();
    });
  }

  private playerPortraitContext() {
    return {
      playerId: this.player.definition.id, category: RUN_STATE.eventBattleId ?? 'normal',
      statuses: new Set([...this.player.statuses].filter(([, count]) => count > 0).map(([status]) => status)),
      statusStacks: this.player.statuses,
      relics: new Set(this.player.relicIds),
      hovered: this.portraitHovered,
      lastCardId: this.lastPortraitCardId,
      hasInserted: (['M', 'V', 'A'] as const).some(part => this.enemyHasBodyPartStatus(part, ['insert'])),
      hasIntruded: (['M', 'V', 'A'] as const).some(part => this.enemyHasBodyPartStatus(part, ['intruded'])),
      hpRatio: this.player.hp / Math.max(1, this.player.maxHp), epRatio: this.player.ep / this.playerEffectiveMaxEp(),
    };
  }

  private refreshPlayerPortrait(): void {
    if (!this.portraitSelection || !this.playerBody?.active) return;
    const id = this.portraitSelection.select(this.playerPortraitContext());
    if (id === this.currentPortraitId) return;
    this.currentPortraitId = id;
    this.playerBody.setVisible(Boolean(id));
    if (id) applyPlayerPortrait(this.playerBody, id);
  }

  private beginPlayerPortraitFactor(tag: string): () => void {
    const selection = this.portraitSelection;
    const release = selection?.begin(tag);
    this.refreshPlayerPortrait();
    return () => { release?.(); if (this.portraitSelection === selection) this.refreshPlayerPortrait(); };
  }

  public createPlayerPortraitOverlay(scene: Phaser.Scene): Phaser.GameObjects.Container {
    return bringPlayerPortraitForward(scene, this.playerArea);
  }

  private playerVisualY(): number {
    return PLAYER_VISUAL_Y + (this.player?.hasStatus('Fainted') ? 38 : 0);
  }

  private playerEffectY(): number {
    return PLAYER_EFFECT_Y;
  }

  private createEnemy(): void {
    const positions = this.enemyPositions(this.enemies);
    const displayNames = this.enemyDisplayNames(this.enemies);
    this.enemyViews = this.enemies.map((enemy, index) =>
      this.createEnemyView(enemy, displayNames[index], positions[index].x, positions[index].y),
    );
    this.selectEnemy(0);
    this.createReticle();
  }

  private enemyDisplayNames(enemies: Enemy[]): string[] {
    return this.enemyDisplayNamesForLanguage(enemies, SETTINGS_STATE.language);
  }

  private enemyDisplayNamesForLanguage(enemies: Enemy[], language: 'en' | 'ja'): string[] {
    const nameCounts = new Map<string, number>();
    enemies.forEach((enemy) => {
      const name = localize(enemy.definition.name, language);
      nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
    });

    const occurrences = new Map<string, number>();
    return enemies.map((enemy) => {
      const name = localize(enemy.definition.name, language);
      const total = nameCounts.get(name) ?? 0;
      if (total <= 1) {
        return name;
      }

      const occurrence = occurrences.get(name) ?? 0;
      occurrences.set(name, occurrence + 1);
      return `${name}${language === 'ja' ? '' : ' '}${this.enemyIdentifier(occurrence)}`;
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

  private enemyPositions(enemies: Enemy[]): { x: number; y: number }[] {
    if (enemies.length === 1 && enemies[0].definition.isGiant) {
      return [{ x: 910, y: GIANT_ENEMY_BASELINE_Y }];
    }

    const count = enemies.length;
    const startX = 910 - ((count - 1) * 220) / 2;
    return Array.from({ length: count }, (_, index) => ({
      x: startX + index * 220,
      y: ENEMY_BASELINE_Y + (index % 2) * 44,
    }));
  }

  private createEnemyView(enemy: Enemy, displayName: string, x: number, y: number): EnemyView {
    const displayedIntent = enemy.currentIntent(this.player, this.enemies);
    const visual = this.enemySpriteVisual(enemy, displayedIntent);
    const bottomLift = enemy.definition.isGiant ? 0 : this.enemyDenseLayoutBottomLift(enemy);
    const visualScale = visual ? Phaser.Math.Clamp((visual.displayHeight - bottomLift) / visual.displayHeight, 0.65, 1) : 1;
    const layout = visual ? this.enemyVisualLayout(enemy, visual, y, visualScale, bottomLift) : undefined;
    const areaY = layout?.areaY ?? y;
    // Separate pointer target, behind the existing tooltip-bearing HUD objects.
    const clickArea = this.add.rectangle(x, areaY, 1, 1, 0xffffff, 0);
    clickArea.setInteractive({ useHandCursor: true });
    const area = this.add.container(x, areaY);
    const shadow = this.add.ellipse(
      0,
      layout?.shadowY ?? 140,
      layout?.shadowWidth ?? 230,
      layout?.shadowHeight ?? 48,
      0x0c0f12,
      0.6,
    );
    const bodyOffsetY = layout?.bodyOffsetY ?? visual?.bodyOffsetY ?? 0;
    const body: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Sprite = visual
      ? this.add.sprite(0, bodyOffsetY, visual.textureKey, 0)
      : this.add.rectangle(0, 0, 155, 210, 0x8a414d, 1);
    if (body instanceof Phaser.GameObjects.Sprite && visual) {
      body.setDisplaySize(visual.displayWidth * visualScale, visual.displayHeight * visualScale);
      body.play({ key: visual.animationKey, randomFrame: true });
    } else if (body instanceof Phaser.GameObjects.Rectangle) {
      body.setStrokeStyle(4, 0xf0a2a7, 0.75);
    }
    const head = visual ? undefined : this.add.circle(0, -132, 42, 0xb95d68);
    const hitArea = this.add.rectangle(
      layout?.hitAreaX ?? 0,
      layout?.hitAreaY ?? -30,
      layout?.hitAreaWidth ?? 190,
      layout?.hitAreaHeight ?? 270,
      0xffffff,
      0,
    );
    hitArea.setInteractive({ useHandCursor: true });
    onPrimaryClick(hitArea, () => this.selectEnemyByEnemy(enemy));
    onPrimaryClick(clickArea, () => this.selectEnemyByEnemy(enemy));
    clickArea.on('pointerover', () => hitArea.emit('pointerover'));
    KeyboardNavigation.for(this).register(hitArea, { group: 'enemies', enabled: () => !enemy.isDefeated && !this.isGameOver && !this.isAnimating && !this.handInputLocked, keyboardFocus: () => this.selectEnemyByEnemy(enemy) });
    area.add(head ? [shadow, body, head, hitArea] : [shadow, body, hitArea]);
    area.setScale(visual ? 1 : 0.5);

    const hudY = layout?.hudY ?? y + 92;
    const barY = layout?.barY ?? y + 116;
    const hudText = this.add.text(x - BAR_WIDTH / 2, hudY, displayName, this.hudStyle(15));
    paintBehindLabel(hudText, CRAYON_COLORS.enemy, 10, 3);
    const bars = this.createHudBars(x - BAR_WIDTH / 2, barY, 'enemy', enemy);
    // Bars remain on top for their Tips, but clicks also select their owner.
    for (const bar of [bars.hpBg, bars.epBg]) {
      onPrimaryClick(bar, () => this.selectEnemyByEnemy(enemy));
      bar.on('pointerover', () => hitArea.emit('pointerover'));
    }
    const statusIcons = this.add.container(x - BAR_WIDTH / 2 + 2, layout?.statusY ?? this.enemyStatusIconY(enemy, y, bottomLift));
    statusIcons.setDepth(25);
    const intentText = this.add.container(x, layout?.intentY ?? y - 110);

    return {
      enemy,
      displayName,
      visual,
      displayedIntent,
      baselineY: y,
      shadow,
      hitArea,
      clickArea,
      area,
      body,
      hudText,
      bars,
      statusIcons,
      intentText,
      baseX: x,
      baseY: areaY,
      effectOffsetX: layout?.effectOffsetX ?? 0,
      effectOffsetY: layout?.effectOffsetY ?? -20,
    };
  }

  private enemySpriteVisual(enemy: Enemy, intent: EnemyIntent): EnemySpriteDefinition | undefined {
    const key = resolveEnemySpriteKey(enemy.definition, this.battleEventContext({
      source: 'enemyIntent',
      actor: enemy,
      selectedEnemy: enemy,
      triggerEnemy: enemy,
      intent,
      intentKey: intent.intentKey,
    }));
    return ENEMY_SPRITES[key] ?? ENEMY_SPRITES[enemy.definition.sprite ?? enemy.definition.id];
  }

  private updateEnemySprite(view: EnemyView): void {
    if (view.enemy.isDefeated || !(view.body instanceof Phaser.GameObjects.Sprite)) {
      return;
    }
    const visual = this.enemySpriteVisual(view.enemy, view.displayedIntent);
    if (!visual || visual === view.visual) {
      return;
    }
    const bottomLift = view.enemy.definition.isGiant ? 0 : this.enemyDenseLayoutBottomLift(view.enemy);
    const scale = Phaser.Math.Clamp((visual.displayHeight - bottomLift) / visual.displayHeight, 0.65, 1);
    const layout = this.enemyVisualLayout(view.enemy, visual, view.baselineY, scale, bottomLift);
    // Keep the container's motion origin intact while aligning the new sheet
    // to the same baseline. Existing attack/status tweens can keep running.
    const offsetY = layout.areaY - view.baseY;
    view.visual = visual;
    view.body.play({ key: visual.animationKey, randomFrame: true });
    view.body.setDisplaySize(visual.displayWidth * scale, visual.displayHeight * scale);
    view.body.setY(layout.bodyOffsetY + offsetY);
    view.shadow.setPosition(0, layout.shadowY + offsetY);
    view.shadow.setDisplaySize(layout.shadowWidth, layout.shadowHeight);
    view.hitArea.setPosition(layout.hitAreaX, layout.hitAreaY + offsetY);
    view.hitArea.setSize(layout.hitAreaWidth, layout.hitAreaHeight);
    view.hudText.setY(layout.hudY);
    view.statusIcons.setY(layout.statusY);
    view.intentText.setY(layout.intentY);
    view.effectOffsetX = layout.effectOffsetX;
    view.effectOffsetY = layout.effectOffsetY + offsetY;
    if (view.enemy === this.enemy) {
      this.updateReticlePosition();
    }
  }

  private enemyVisualLayout(
    enemy: Enemy,
    visual: EnemySpriteDefinition,
    baselineY: number,
    visualScale: number,
    bottomLift: number,
  ): EnemyVisualLayout {
    const bodyOffsetY = visual.bodyOffsetY ?? 0;
    const bounds = this.displayedEnemyOpaqueBounds(visual, visualScale, bodyOffsetY);
    const targetBottomY = baselineY - bottomLift;
    const areaY = targetBottomY - bounds.bottom;
    const screenTop = areaY + bounds.top;
    const screenBottom = areaY + bounds.bottom;
    const hasEp = enemy.maxEp > 0;

    return {
      areaY,
      bodyOffsetY,
      bounds,
      shadowY: bounds.bottom,
      shadowWidth: Math.max(46, bounds.width * 1.08),
      shadowHeight: Math.max(10, bounds.height * 0.16),
      hitAreaX: bounds.centerX,
      hitAreaY: bounds.centerY,
      hitAreaWidth: Math.max(40, bounds.width),
      hitAreaHeight: Math.max(40, bounds.height),
      hudY: screenBottom + 8,
      barY: screenBottom + 34,
      statusY: this.enemyStatusIconYForBar(screenBottom + 34, hasEp),
      intentY: screenTop - 32,
      effectOffsetX: bounds.centerX,
      effectOffsetY: bounds.centerY,
    };
  }

  private displayedEnemyOpaqueBounds(
    visual: EnemySpriteDefinition,
    visualScale: number,
    bodyOffsetY: number,
  ): EnemyOpaqueBounds {
    const raw = visual.opaqueBounds;
    const frameWidth = visual.frameWidth;
    const frameHeight = visual.frameHeight;
    const displayWidth = visual.displayWidth * visualScale;
    const displayHeight = visual.displayHeight * visualScale;
    const left = ((raw.left / frameWidth) - 0.5) * displayWidth;
    const right = (((raw.right + 1) / frameWidth) - 0.5) * displayWidth;
    const top = bodyOffsetY + ((raw.top / frameHeight) - 0.5) * displayHeight;
    const bottom = bodyOffsetY + (((raw.bottom + 1) / frameHeight) - 0.5) * displayHeight;

    return {
      left,
      right,
      top,
      bottom,
      width: right - left,
      height: bottom - top,
      centerX: (left + right) / 2,
      centerY: (top + bottom) / 2,
    };
  }

  private enemyDenseLayoutBottomLift(enemy: Enemy): number {
    return this.enemies.length >= ENEMY_DENSE_LAYOUT_MIN_COUNT && ENEMY_SPRITES[enemy.definition.sprite ?? enemy.definition.id]
      ? ENEMY_DENSE_LAYOUT_BOTTOM_LIFT
      : 0;
  }

  private enemyStatusIconY(enemy: Enemy, baseY: number, bottomLift = 0): number {
    return this.enemyStatusIconYForBar(baseY + 116 - bottomLift, enemy.maxEp > 0);
  }

  private enemyStatusIconYForBar(barY: number, hasEp: boolean): number {
    const lastBarY = hasEp ? barY + 27 : barY;
    return lastBarY + BAR_HEIGHT / 2 + 8 + 16;
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
    this.updateCardEffectTexts();
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
    this.reticlePulse = { offset: 0 };
    this.updateReticlePosition();
    this.tweens.add({
      targets: this.reticlePulse,
      offset: 4,
      duration: 600,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
      onUpdate: () => this.updateReticlePosition(),
    });
  }

  private enemyRestBounds(view: EnemyView): Phaser.Geom.Rectangle {
    // Sprite swaps update the local hitArea; attack/shake tweens only move area.
    const scale = view.visual ? 1 : 0.5;
    const { hitArea } = view;
    return new Phaser.Geom.Rectangle(
      view.baseX + (hitArea.x - hitArea.width / 2) * scale,
      view.baseY + (hitArea.y - hitArea.height / 2) * scale,
      hitArea.width * scale,
      hitArea.height * scale,
    );
  }

  private updateEnemyClickArea(view: EnemyView): void {
    const bounds = this.enemyRestBounds(view);
    // Compare the opaque-body bounds with the HP bar, excluding sheet padding.
    const hpBounds = view.bars.hpBg.getBounds();
    const horizontalBounds = bounds.width > hpBounds.width ? bounds : hpBounds;
    const top = Math.min(bounds.top, view.intentText.getBounds().top);
    const bottom = Math.max(bounds.bottom, (view.bars.hasEp ? view.bars.epBg : view.bars.hpBg).getBounds().bottom);
    view.clickArea.setPosition(horizontalBounds.centerX, (top + bottom) / 2);
    view.clickArea.setSize(horizontalBounds.width, bottom - top);
    view.clickArea.setVisible(!view.enemy.isDefeated);
  }

  private updateReticlePosition(): void {
    if (!this.reticle || !this.enemyArea) {
      return;
    }

    const view = this.currentEnemyView();
    if (!view) return;
    // Use the resting layout, independent of damage/attack motion and the
    // expanded pointer target. Only the reticle's own pulse moves its corners.
    const bounds = this.enemyRestBounds(view);
    const inset = 10 - this.reticlePulse.offset;
    const size = 12;
    this.reticle.clear();
    this.reticle.fillStyle(0xf3c75f, 1);
    this.reticle.lineStyle(1, 0x392c15, 0.9);
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        const x = sx < 0 ? bounds.left + inset : bounds.right - inset;
        const y = sy < 0 ? bounds.top + inset : bounds.bottom - inset;
        // The right-angle vertex faces the center; the two legs extend out.
        this.reticle.fillTriangle(x, y, x + sx * size, y, x, y + sy * size);
        this.reticle.strokeTriangle(x, y, x + sx * size, y, x, y + sy * size);
      }
    }
  }

  private createHud(): void {
    this.playerBars = this.createHudBars(28, 52, 'player');
    this.playerHud = this.add.text(28, 22, '', this.hudStyle(17));
    paintBehindLabel(this.playerHud, CRAYON_COLORS.player, 10, 3);
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
    const y = 150;
    const width = 280;
    const height = 348;
    const maxLogLines = 16;
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
    onPrimaryClick(this.logHitArea, (pointer: Phaser.Input.Pointer) => {
      pointer.event?.stopPropagation();
      this.logHistoryMode = true;
      this.logScrollOffset = 0;
      this.renderBattleLog();
    });

    this.logTextObjects = Array.from({ length: maxLogLines }, (_, index) => {
      const textY = height - bottomMargin - maxLogLines * lineHeight + index * lineHeight;
      const text = this.add.text(14, textY, '', {
        fontFamily: GAME_FONT,
        fontSize: '14px',
        color: '#dfe8f5',
      });
      setPunctuationAwareWordWrap(text, width - 39, 'character');
      return text;
    });

    this.logScrollbar = this.add.rectangle(width - 12, 10, 5, 38, 0x8fa4c2, 0.8);
    this.logScrollbar.setOrigin(0.5, 0);
    this.logScrollbar.setInteractive({ draggable: true });
    this.input.setDraggable(this.logScrollbar);
    this.logScrollbar.on('drag', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.leftButtonDown()) return;
      if (!this.logHistoryMode) {
        return;
      }
      const maxOffset = this.maxBattleLogScrollOffset();
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
      const maxOffset = this.maxBattleLogScrollOffset();
      this.logScrollOffset = Phaser.Math.Clamp(this.logScrollOffset + (dy > 0 ? -1 : 1), 0, maxOffset);
      this.renderBattleLog();
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button !== 0) return;
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
    this.deckPileText = this.add.text(34, 658, '', this.hudStyle(17)).setDepth(35);
    this.handPileText = this.add.text(1055, 660, '', this.hudStyle(14)).setDepth(35);
    paintBehindLabel(this.handPileText, CRAYON_COLORS.hpIntent, 9, 7);
    this.discardPileText = this.add.text(1150, 660, '', this.hudStyle(17)).setDepth(35);
    const bind = (label: Phaser.GameObjects.Text, open: () => void) => {
      const paint = paintBehindLabel(label, CRAYON_COLORS.button, 12, 8);
      label.setInteractive({useHandCursor:true});
      label.on('pointerover', () => { label.setColor('#ffffff'); paint.setHoverColor(CRAYON_COLORS.hover); });
      label.on('pointerout', () => { label.setColor('#f1f5f9'); paint.setHoverColor(); });
      onPrimaryClick(label, open);
      KeyboardNavigation.for(this).register(label, { group: 'piles' });
    };
    bind(this.deckPileText, () => this.showPileOverlay('Deck', this.sortedDrawPileForDisplay()));
    bind(this.discardPileText, () => this.showPileOverlay('Discard', this.deck.discardPile));
  }

  private sortedDrawPileForDisplay(): CardInstance[] {
    return [...this.deck.drawPile].sort((a, b) => this.cardUidOrder(a.uid) - this.cardUidOrder(b.uid));
  }

  private cardUidOrder(uid: string): number {
    const value = Number(uid.split('-').pop());
    return Number.isFinite(value) ? value : 0;
  }

  private showPileOverlay(titleText: string, cards: CardInstance[]): void {
    if (this.modalOverlay.visible) return;
    this.hidePileOverlay();
    this.hoverRelease?.remove(false);
    this.hoveredCardUid = undefined;
    if (!this.handInputLocked) this.applyHoverLayout(160);
    this.hideStatusTooltip();
    populatePileBrowser(this, this.pileOverlay, cards, {
      title: titleText === 'Deck' ? this.uiText('Draw pile', '山札') : this.uiText('Discard pile', '捨て札'),
      subtitle: titleText === 'Deck'
        ? this.uiText('Cards remaining · display order is not draw order', '残りのカード一覧・表示順はドロー順とは異なります')
        : this.uiText('Used cards · shuffled into the draw pile when it runs out', '使用済みカード・山札がなくなるとシャッフルして戻ります'),
      close: () => this.hidePileOverlay(),
      preview: (card, x, y, scale) => this.createCardPreview(card.definition, x, y, scale),
      bindTips: (view, hit, pointerInView) => {
        bindCardTermHover(this, view.getByName('card-description') as Phaser.GameObjects.Container, this.tooltipHover, {
          enabled: () => this.pileOverlay.visible && !this.modalOverlay.visible && pointerInView()
            && Boolean(hit.input?.enabled) && hit.getBounds().contains(this.input.activePointer.x, this.input.activePointer.y),
          describe: (term) => this.cardTermDescription(term),
          visible: () => this.statusTooltip.visible && this.statusTooltipOwner === view,
          show: (text, bounds) => {
            this.clearStatusTooltipSource();
            this.statusTooltipOwner = view;
            this.showStatusTooltipText(text, bounds.centerX - TOOLTIP_LAYOUT.maxWidth / 2, bounds.top - 4, true);
          },
        });
      },
    });
  }

  private hidePileOverlay(): void {
    this.hideStatusTooltip();
    this.tweens.killTweensOf(this.pileOverlay);
    this.pileOverlay.removeAll(true);
    this.pileOverlay.setVisible(false);
  }

  private createCardPreview(definition: CardDefinition, x: number, y: number, scale: number): Phaser.GameObjects.Container {
    const {container} = createCardShell(this, definition, this.localizeDisplayText(definition.name));
    container.setPosition(x, y).setScale(scale);
    const text = this.add.container(0, 0).setName('card-description');
    this.renderCardEffectText(text, [cardDescriptionSegments(definition)]);
    container.add(text);
    return container;
  }

  private createStatusIconAreas(): void {
    this.playerStatusIcons = this.add.container(PLAYER_STATUS_HUD_LAYOUT.x, PLAYER_STATUS_HUD_LAYOUT.y);
    this.playerStatusIcons.setDepth(25);

  }

  private createRelicHud(): void {
    this.relicIcons = this.add.container(RELIC_HUD_LAYOUT.x, RELIC_HUD_LAYOUT.y);
    this.relicIcons.setDepth(35);

    this.player.relicIds.forEach((relicId, index) => {
      const relic = RELIC_DEFINITIONS[relicId];
      if (!relic) {
        return;
      }

      const x = index * 44;
      const iconGroup = this.add.container(x, 0);
      const icon = this.add.rectangle(0, 0, RELIC_HUD_LAYOUT.iconSize, RELIC_HUD_LAYOUT.iconSize, 0x6f4f2d, 1);
      icon.setStrokeStyle(2, 0xf1c27d, 0.9);
      icon.setInteractive({ useHandCursor: true });

      const label = this.add.text(0, 0, this.relicIconText(relic), {
        fontFamily: GAME_FONT,
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#ffffff',
      });
      label.setOrigin(0.5);

      const children: Phaser.GameObjects.GameObject[] = [icon, label];
      if (typeof relic.counter === 'number') {
        const counter = this.add.text(12, 11, String(relic.counter), {
          fontFamily: GAME_FONT,
          fontSize: '11px',
          fontStyle: 'bold',
          color: '#ffffff',
          backgroundColor: '#1f2329',
        });
        counter.setOrigin(0.5);
        children.push(counter);
      }

      this.tooltipHover.bind(icon, () => {
        this.clearStatusTooltipSource();
        this.showStatusTooltipText(
          this.localizeDisplayText(relic.description),
          this.relicIcons.x + x - 8,
          this.relicIcons.y + 28,
        );
      });

      iconGroup.add(children);
      KeyboardNavigation.for(this).register(icon, { group: 'relics' });
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
    return this.player.effectiveMaxEp;
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
    return this.sourceDisplayNameForLanguage(context, SETTINGS_STATE.language);
  }

  private sourceDisplayNameForLanguage(context: BattleEventContext, language: Language): string {
    return this.sourceDisplayNameFromContext(context, language);
  }

  private sourceDisplayNameFromContext(context: Partial<BattleEventContext> | undefined, language: Language): string {
    if (!context) {
      return '';
    }
    if (context.card) {
      const displayName = context.flavorValues?.cardDisplayName;
      if (displayName) {
        return typeof displayName === 'object'
          ? localize(displayName, language)
          : String(displayName);
      }
      return localize(context.card.name, language);
    }
    if (context.relic) {
      return localize(context.relic.name, language);
    }
    if (context.status) {
      return this.statusDisplayNameForLanguage(context.status, language);
    }
    if (context.intent) {
      return localize(context.intent.label, language);
    }
    if (context.sourceName === 'System') {
      return language === 'ja' ? 'システム' : 'System';
    }
    return context.sourceName ?? '';
  }

  private combatantDisplayName(combatant: Player | Enemy): string {
    return this.combatantDisplayNameForLanguage(combatant, SETTINGS_STATE.language);
  }

  private combatantDisplayNameForLanguage(combatant: Player | Enemy, language: Language): string {
    if (combatant === this.player) {
      return localize(this.player.definition.name, language);
    }
    if (combatant instanceof Enemy) {
      const index = this.enemies.indexOf(combatant);
      if (index >= 0) {
        return this.enemyDisplayNamesForLanguage(this.enemies, language)[index] ?? localize(combatant.definition.name, language);
      }
      return localize(combatant.definition.name, language);
    }
    return combatant.name;
  }

  private combatantDisplayNames(combatant: Player | Enemy): { en: string; ja: string } {
    return {
      en: this.combatantDisplayNameForLanguage(combatant, 'en'),
      ja: this.combatantDisplayNameForLanguage(combatant, 'ja'),
    };
  }

  private relatedIntrusionPartForEnemy(enemy: Enemy): { en: string; ja: string } | undefined {
    if (!enemy.definition.intrusionPart) {
      return undefined;
    }

    return {
      en: this.interpolateIntrusionPartText(enemy.definition.intrusionPart, { triggerEnemy: enemy }, 'en'),
      ja: this.interpolateIntrusionPartText(enemy.definition.intrusionPart, { triggerEnemy: enemy }, 'ja'),
    };
  }

  private statusDisplayName(status: StatusEffect): string {
    return this.statusDisplayNameForLanguage(status, SETTINGS_STATE.language);
  }

  private statusDisplayNameForLanguage(status: StatusEffect, language: Language): string {
    return localize(STATUS_DESCRIPTIONS[status]?.name ?? status, language);
  }

  private statusConsumesEachTurn(status: StatusEffect): boolean {
    return STATUS_DESCRIPTIONS[status]?.consumeEachTurn === 1;
  }

  private addStatusRemovalFlavorEvent(context: BattleEventContext, effect: EffectDefinition, removedStatus: StatusEffect): void {
    const transitionTarget = this.statusTransitionTargetForRemoval(context, effect, removedStatus);
    if (transitionTarget) {
      this.addGlobalFlavorEvent(
        statusNoticeKind(removedStatus, transitionTarget) === 'important'
          ? FLAVOR_EVENTS.Status.ChangeImportant
          : FLAVOR_EVENTS.Status.Change,
        {
          ...context,
          flavorValues: {
            fromStatus: l(
              this.statusDisplayNameForLanguage(removedStatus, 'en'),
              this.statusDisplayNameForLanguage(removedStatus, 'ja'),
            ),
            toStatus: l(
              this.statusDisplayNameForLanguage(transitionTarget, 'en'),
              this.statusDisplayNameForLanguage(transitionTarget, 'ja'),
            ),
          },
        },
      );
      return;
    }

    const sourceEn = this.sourceDisplayNameForLanguage(context, 'en');
    const sourceJa = this.sourceDisplayNameForLanguage(context, 'ja');
    const statusEn = this.statusDisplayNameForLanguage(removedStatus, 'en');
    const statusJa = this.statusDisplayNameForLanguage(removedStatus, 'ja');
    this.addGlobalFlavorEvent(FLAVOR_EVENTS.Status.Remove, {
      ...context,
      status: removedStatus,
      flavorValues: {
        status: l(statusEn, statusJa),
        sourceIsStatus: sourceEn === statusEn || sourceJa === statusJa,
        statusIsImportant: statusNoticeKind(removedStatus) === 'important',
      },
    });
  }

  private statusTransitionTargetForRemoval(
    context: BattleEventContext,
    effect: EffectDefinition,
    removedStatus: StatusEffect,
  ): StatusEffect | undefined {
    if (effect.kind !== 'removeStatus' || !context.status) {
      return undefined;
    }

    const transitionTarget = STATUS_REMOVAL_TRANSITIONS[removedStatus];
    return transitionTarget === context.status ? transitionTarget : undefined;
  }

  private statusRemovalLogKind(context: BattleEventContext, effect: EffectDefinition, removedStatus: StatusEffect): BattleLogKind {
    const transitionTarget = this.statusTransitionTargetForRemoval(context, effect, removedStatus);
    return statusNoticeKind(removedStatus, transitionTarget);
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

        const candidateTriggers = [
          ...statusTriggersForTiming(status, timing),
          ...(owner instanceof Enemy ? owner.definition.statusTriggers?.[status]?.filter((trigger) => trigger.timing === timing) ?? [] : []),
        ];
        for (const trigger of candidateTriggers) {
          const triggerContext = this.battleEventContext({
            ...context,
            source: 'status',
            sourceName: this.statusDisplayName(status),
            actor: owner,
            statusOwner: owner,
            status,
            statusStacks: stacks,
            statusTrigger: trigger,
            triggerEnemy: context.triggerEnemy ?? context.selectedEnemy ?? (owner instanceof Enemy ? owner : undefined) ?? this.bindingEnemyForContext({ ...context, status }),
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

  private async runBattleStartHooks(): Promise<void> {
    for (const entry of this.relicTriggersForTiming(EFFECT_TIMINGS.BattleStart)) {
      await this.applyRelicTriggerEffects(entry, this.battleEventContext({
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
      this.addFlavorEvent(entry.trigger.flavors, chancePassed ? FLAVOR_EVENTS.Effect.ChanceSuccess : FLAVOR_EVENTS.Effect.ChanceFailure, context);
      if (!chancePassed) {
        return [];
      }
    }

    if (entry.trigger.effects.length > 0) {
      await this.pulseRelicIcon(entry.relic.id);
      this.addFlavorEvent(entry.relic.flavors, FLAVOR_EVENTS.Relic.Trigger, context);
      this.addFlavorEvent(entry.trigger.flavors, FLAVOR_EVENTS.Relic.Trigger, context);
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
      if (added.count > 0) {
        const cardName = added.cardName ?? l('card', 'カード');
        this.addGlobalFlavorEvent(FLAVOR_EVENTS.Effect.AddCardToHand, {
          ...context,
          flavorValues: { amount: added.count, card: cardName },
        });
        result.messages.push(`${context.sourceName}: add ${added.count} ${localize(cardName)}`);
      }
      return;
    }

    if (effect.kind === 'drawCards') {
      const drawn = await this.drawCards(this.effectAmountForContext(effect, context.actor), true);
      if (drawn.length > 0) {
        this.addGlobalFlavorEvent(FLAVOR_EVENTS.Effect.DrawCards, {
          ...context,
          flavorValues: { amount: drawn.length },
        });
        result.messages.push(`${context.sourceName}: draw ${drawn.length}`);
      }
      return;
    }

    const targets = this.effectTargets(effect, context);
    if (targets.length === 0) {
      return;
    }

    for (const target of targets) {
      const targetContext = this.battleEventContext({
        ...context,
        target,
        selectedEnemy: target instanceof Enemy ? target : context.selectedEnemy,
        triggerEnemy: target instanceof Enemy ? target : context.triggerEnemy,
      });
      const repeatCount = this.effectRepeatCount(effect, targetContext);
      for (let repeat = 0; repeat < repeatCount; repeat += 1) {
        const repeatContext = this.effectRepeatContext(effect, targetContext, repeat);
        if (effect.chance !== undefined) {
          const chancePassed = Math.random() < this.effectChance(effect, repeatContext);
          this.addFlavorEvent(effect.flavors, chancePassed ? FLAVOR_EVENTS.Effect.ChanceSuccess : FLAVOR_EVENTS.Effect.ChanceFailure, repeatContext);
          if (!chancePassed) {
            continue;
          }
        }

        this.addFlavorEvent(effect.flavors, FLAVOR_EVENTS.Effect.Trigger, repeatContext);

        const rawAmount = this.effectAmountForContext(effect, target, repeatContext);
        this.addRandomAmountFlavors(effect, rawAmount, repeatContext);

        if (effect.kind !== 'status'
          && effect.kind !== 'removeStatus'
          && effect.kind !== 'discardHand'
          && effect.kind !== 'setEpReserveRatio'
          && effect.kind !== 'setEpReserve'
          && effect.kind !== 'setEp'
          && effect.kind !== 'setEpRatio'
          && effect.kind !== 'retainBlock'
          && effect.kind !== 'energyGain'
        && rawAmount <= 0) {
          if (effect.kind === 'epDamage' && target instanceof Enemy) {
            await this.applyEffectEpDamage(effect, target, rawAmount, repeatContext, result);
          }
          continue;
        }

        if (effect.kind === 'energyGain') {
          this.applyEffectEnergyGain(rawAmount, repeatContext, result);
        } else if (effect.kind === 'status' && effect.status) {
          await this.applyEffectStatus(effect, target, rawAmount, repeatContext, result);
        } else if (effect.kind === 'removeStatus') {
          const removedStatuses = this.removeStatusByEffect(target, effect, repeatContext.status ?? effect.status ?? 'Aftershocks');
          if (removedStatuses.length > 0) {
            this.syncPlayerFaintedPose(true);
            this.refreshHandCardUsabilities();
            for (const removedStatus of removedStatuses) {
              const kind = this.statusRemovalLogKind(repeatContext, effect, removedStatus);
              this.addStatusRemovalFlavorEvent(repeatContext, effect, removedStatus);
              this.playStatusRemovedMotion(target, removedStatus, repeatContext);
              if (kind === 'important') {
                await this.wait(IMPORTANT_LOG_PAUSE_MS);
              }
            }
            result.messages.push(`${repeatContext.sourceName}: removed ${removedStatuses.join(', ')}`);
          }
        } else if (effect.kind === 'discardHand' && target === this.player) {
          await this.discardHandWithAnimation();
          this.addGlobalFlavorEvent(FLAVOR_EVENTS.Effect.DiscardHand, repeatContext);
          result.messages.push(`${repeatContext.sourceName}: discard hand`);
        } else if ((effect.kind === 'setEpReserveRatio' || effect.kind === 'setEpReserve') && target === this.player) {
          const value = effect.kind === 'setEpReserveRatio' ? Math.floor(this.epRatioBase(effect).value * effect.amount) : rawAmount;
          this.setPlayerEpReserveValue(value, this.playerEffectiveMaxEp(), true);
          if (this.player.ep < this.playerEpReserveValue) {
            await this.setPlayerEpByEffect(this.playerEpReserveValue);
          }
          this.addGlobalFlavorEvent(effect.kind === 'setEpReserveRatio' ? FLAVOR_EVENTS.Effect.SetEpReserveRatio : FLAVOR_EVENTS.Effect.SetEpReserve, {
            ...repeatContext,
            flavorValues: { ...repeatContext.flavorValues, amount: this.playerEpReserveValue },
          });
          result.messages.push(`${repeatContext.sourceName}: EP reserve floor`);
        } else if ((effect.kind === 'setEp' || effect.kind === 'setEpRatio') && target === this.player) {
          const value = effect.kind === 'setEpRatio' ? Math.floor(this.epRatioBase(effect).value * effect.amount) : rawAmount;
          await this.setPlayerEpByEffect(value);
          this.addGlobalFlavorEvent(effect.kind === 'setEpRatio' ? FLAVOR_EVENTS.Effect.SetEpRatio : FLAVOR_EVENTS.Effect.SetEp, {
            ...repeatContext,
            flavorValues: { ...repeatContext.flavorValues, amount: this.player.ep },
          });
          result.messages.push(`${repeatContext.sourceName}: set EP ${this.player.ep}`);
        } else if (effect.kind === 'retainBlock' && target === this.player) {
          this.retainPlayerBlockThisTurn = true;
          this.addGlobalFlavorEvent(FLAVOR_EVENTS.Effect.RetainBlock, repeatContext);
          result.messages.push(`${repeatContext.sourceName}: retain block`);
        } else if (effect.kind === 'epReserveHeal' && target === this.player) {
          const animate = repeatContext.source !== 'status';
          this.setPlayerEpReserveValue(Math.max(0, this.playerEpReserveValue - rawAmount), this.playerEffectiveMaxEp(), animate);
          this.addGlobalFlavorEvent(FLAVOR_EVENTS.Effect.EpReserveHeal, repeatContext);
          result.messages.push(`${repeatContext.sourceName}: recover EP reserve`);
        } else if (effect.kind === 'hpHeal') {
          const before = new Map(target.statuses);
          this.applyEffectHpHeal(target, rawAmount, repeatContext, result);
          await this.notifyAutomaticStatusChanges(target, before);
        } else if (effect.kind === 'epHeal') {
          await this.applyEffectEpHeal(target, rawAmount, repeatContext, result);
        } else if (effect.kind === 'block') {
          this.applyEffectBlock(target, rawAmount, repeatContext, result);
        } else if (effect.kind === 'hpDamage') {
          await this.applyEffectHpDamage(effect, target, rawAmount, repeatContext, result);
        } else if (effect.kind === 'epDamage') {
          await this.applyEffectEpDamage(effect, target, rawAmount, repeatContext, result);
        } else if (effect.kind === 'hpDrain' && target instanceof Enemy) {
          const before = new Map(this.player.statuses);
          this.applyEffectHpDrain(effect, target, rawAmount, repeatContext, result);
          await this.notifyAutomaticStatusChanges(this.player, before);
        }
      }
    }
  }

  private epRatioBase(effect: EffectDefinition): { value: number; name: LocalizedText } {
    switch (effect.ratioBase) {
      case 'playerCurrentEp':
        return { value: this.player.ep, name: l('current EP', '現在EP') };
      case 'playerEpReserve':
        return { value: this.playerEpReserveValue, name: l('current EP reserve', '現在のEPリセット下限') };
      default:
        return { value: this.playerEffectiveMaxEp(), name: l('max EP', '最大EP') };
    }
  }

  private effectRepeatCount(effect: EffectDefinition, context?: BattleEventContext): number {
    if (effect.kind === 'status') {
      return 1;
    }
    const baseTimes = Math.max(1, effect.times ?? 1);
    if (
      context?.card?.id === 'cowgirlRiding'
      && effect.kind === 'epDamage'
      && effect.target === 'player'
    ) {
      return baseTimes * Math.max(1, this.cowgirlInsertedTargets().length);
    }
    return baseTimes;
  }

  private effectRepeatContext(effect: EffectDefinition, context: BattleEventContext, repeatIndex: number): BattleEventContext {
    if (
      context.card?.id === 'cowgirlRiding'
      && effect.kind === 'epDamage'
      && effect.target === 'player'
    ) {
      const parts = this.cowgirlInsertedParts();
      const part = parts[repeatIndex % parts.length];
      if (part) {
        return this.battleEventContext({
          ...context,
          flavorValues: {
            ...context.flavorValues,
            cowgirlEpDamagePart: part,
          },
        });
      }
    }

    return context;
  }

  private effectTargets(effect: EffectDefinition, context: BattleEventContext): (Player | Enemy)[] {
    if (effect.target === 'player') {
      return [this.player];
    }

    if (effect.target === 'self') {
      return [context.actor];
    }

    if (effect.target === 'triggerEnemy') {
      const triggerEnemy = context.triggerEnemy ?? this.bindingEnemyForContext(context);
      return triggerEnemy && !triggerEnemy.isDefeated ? [triggerEnemy] : [];
    }

    if (effect.target === 'selectedEnemy') {
      const cowgirlTargets = this.cowgirlEffectTargets(context);
      if (cowgirlTargets.length > 0) {
        return cowgirlTargets;
      }
      return context.selectedEnemy && !context.selectedEnemy.isDefeated ? [context.selectedEnemy] : [];
    }

    if (effect.target === 'allEnemies') {
      return this.enemies.filter((enemy) => !enemy.isDefeated);
    }

    return [];
  }

  private cowgirlEffectTargets(context: BattleEventContext): Enemy[] {
    if (context.card?.id !== 'cowgirlRiding') {
      return [];
    }

    return this.cowgirlInsertedTargets();
  }

  private cowgirlInsertedTargets(): Enemy[] {
    return this.uniqueEnemies([
      this.enemyWithStatus('InsertV'),
      this.enemyWithStatus('InsertA'),
    ].filter((enemy): enemy is Enemy => Boolean(enemy)));
  }

  private cowgirlInsertedParts(): EpDamagePart[] {
    const parts: EpDamagePart[] = [];
    if (this.enemyWithStatus('InsertV')) {
      parts.push('V');
    }
    if (this.enemyWithStatus('InsertA')) {
      parts.push('A');
    }
    return parts;
  }

  private enemyWithStatus(status: StatusEffect): Enemy | undefined {
    return this.enemies.find((enemy) => !enemy.isDefeated && enemy.hasStatus(status));
  }

  private uniqueEnemies(enemies: Enemy[]): Enemy[] {
    return enemies.filter((enemy, index) => enemies.indexOf(enemy) === index);
  }

  private effectAmountForContext(
    effect: EffectDefinition,
    target: Player | Enemy,
    context?: BattleEventContext,
  ): number {
    const baseAmount = this.effectBaseAmountForContext(effect, target);
    const randomizedAmount = effect.randomAmount
      ? Phaser.Math.Between(Math.ceil(effect.randomAmount.min), Math.ceil(effect.randomAmount.max))
      : baseAmount;
    if (context?.source === 'status' && effect.perStack) {
      return randomizedAmount * (context.statusStacks ?? 1);
    }
    return randomizedAmount;
  }

  private effectBaseAmountForContext(effect: EffectDefinition, target: Player | Enemy): number {
    if (effect.kind === 'epDamage' && target instanceof Player && !effect.percentOf) {
      return effect.amount;
    }

    return this.effectAmount(effect, target);
  }

  private async addEffectCardsToHand(
    effect: EffectDefinition,
    context: BattleEventContext,
    amount: number,
  ): Promise<AddCardsToHandResult> {
    if (!effect.cardId || amount <= 0) {
      return { count: 0 };
    }

    const definition = CARD_DEFINITIONS[effect.cardId];
    if (!definition) {
      return { count: 0 };
    }

    const addedUids = new Set<string>();
    let addedCardName: LocalizedText | undefined;
    for (let i = 0; i < amount; i += 1) {
      const cardDefinition =
        effect.cardAddVariant === 'purgeForStatusOwner' && context.actor instanceof Enemy
          ? this.createPurgeCardDefinitionForEnemy(context.actor, context.status ?? effect.status ?? 'IntrudedA')
          : effect.cardAddVariant === 'pulloutForStatusOwner' && context.actor instanceof Enemy
            ? this.createPulloutCardDefinitionForEnemy(context.actor, context.status ?? effect.status ?? 'InsertV')
            : effect.cardAddVariant === 'wriggleFreeForStatusOwner' && context.actor instanceof Enemy
              ? this.createResistBindingCardDefinitionForEnemy(context.actor)
              : definition;
      const card = this.deck.addToHand(cardDefinition, MAX_HAND_SIZE);
      if (this.deck.hand.some((handCard) => handCard.uid === card.uid)) {
        addedUids.add(card.uid);
        addedCardName ??= cardDefinition.name;
      }
    }

    if (addedUids.size <= 0) {
      return { count: 0 };
    }

    void this.renderHand();
    if (context.statusTrigger?.visuals?.includes('addCardFromPlayerFadeIn')) {
      await this.animateCardsAddedFromPlayer(addedUids);
    }
    this.updateHud();
    return { count: addedUids.size, cardName: addedCardName };
  }

  private applyEffectEnergyGain(
    amount: number,
    context: BattleEventContext,
    result: EffectExecutionResult,
  ): void {
    const recovery = energyRecovery(this.player, amount);
    this.showEnergyRecoveryBlocked(recovery.cause);
    amount = recovery.amount;
    const beforeEnergy = this.player.energy;
    this.player.energy = Math.max(0, Math.min(this.player.maxEnergy, this.player.energy + amount));
    const changed = this.player.energy - beforeEnergy;
    if (changed !== 0) {
      this.addGlobalFlavorEvent(FLAVOR_EVENTS.Effect.EnergyChange, {
        ...context,
        flavorValues: { signedAmount: `${changed > 0 ? '+' : ''}${changed}` },
      });
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
    const applied = await this.applyStatusToCombatantWithTriggers(target, status, effect.stacks ?? amount, context);
    result.messages.push(`${context.sourceName}: ${applied.label}`);
  }

  private shouldLogStatusApplication(applied: StatusApplicationResult): boolean {
    return applied.changed || applied.label.includes('miss');
  }

  private addStatusApplicationFlavorEvent(
    context: BattleEventContext,
    target: Player | Enemy,
    requestedStatus: StatusEffect,
    applied: StatusApplicationResult,
  ): void {
    if (applied.upgradeFrom && applied.upgradeTo) {
      this.addGlobalFlavorEvent(
        statusNoticeKind(applied.upgradeFrom, applied.upgradeTo) === 'important'
          ? FLAVOR_EVENTS.Status.ChangeImportant
          : FLAVOR_EVENTS.Status.Change,
        {
          ...context,
          flavorValues: {
            fromStatus: l(
              this.statusDisplayNameForLanguage(applied.upgradeFrom, 'en'),
              this.statusDisplayNameForLanguage(applied.upgradeFrom, 'ja'),
            ),
            toStatus: l(
              this.statusDisplayNameForLanguage(applied.upgradeTo, 'en'),
              this.statusDisplayNameForLanguage(applied.upgradeTo, 'ja'),
            ),
          },
        },
      );
      return;
    }

    const displayStatus = applied.appliedStatus ?? requestedStatus;
    if (!applied.changed && applied.label.includes('miss')) {
      this.addGlobalFlavorEvent(FLAVOR_EVENTS.Status.ApplyMiss, {
        ...context,
        status: displayStatus,
        flavorValues: {
          status: l(
            this.statusDisplayNameForLanguage(displayStatus, 'en'),
            this.statusDisplayNameForLanguage(displayStatus, 'ja'),
          ),
        },
      });
      return;
    }

    const infestedPart = this.infestedSlimePart(displayStatus);
    const sourceEnemy = this.contextEnemyForStatusLog(context);
    if (target === this.player && infestedPart && sourceEnemy) {
      this.addGlobalFlavorEvent(FLAVOR_EVENTS.Status.Infest, {
        ...context,
        target,
        selectedEnemy: sourceEnemy,
        triggerEnemy: sourceEnemy,
        flavorValues: { part: infestedPart },
      });
      return;
    }

    this.addGlobalFlavorEvent(
      this.statusApplicationLogKind(displayStatus) === 'important'
        ? FLAVOR_EVENTS.Status.ApplyImportant
        : FLAVOR_EVENTS.Status.Apply,
      {
        ...context,
        target,
        status: displayStatus,
        flavorValues: {
          target: this.combatantDisplayNames(target),
          status: l(
            this.statusDisplayNameForLanguage(displayStatus, 'en'),
            this.statusDisplayNameForLanguage(displayStatus, 'ja'),
          ),
        },
      },
    );
  }

  private infestedSlimePart(status: StatusEffect): 'A' | 'V' | undefined {
    if (status === 'InfestedA_Slime') {
      return 'A';
    }
    if (status === 'InfestedV_Slime') {
      return 'V';
    }
    return undefined;
  }

  private contextEnemyForStatusLog(context: BattleEventContext): Enemy | undefined {
    if (context.actor instanceof Enemy) {
      return context.actor;
    }
    return context.triggerEnemy ?? context.selectedEnemy;
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
    this.addGlobalFlavorEvent(FLAVOR_EVENTS.Effect.HpHeal, {
      ...context,
      target,
      flavorValues: { target: this.combatantDisplayNames(target), amount: healed },
    });
    result.messages.push(`${context.sourceName}: heal ${healed} HP`);
  }

  private async applyEffectEpHeal(
    target: Player | Enemy,
    amount: number,
    context: BattleEventContext,
    result: EffectExecutionResult,
  ): Promise<void> {
    if (target === this.player) {
      await this.setPlayerEpByEffect(this.player.ep - amount);
      this.addGlobalFlavorEvent(FLAVOR_EVENTS.Effect.EpHeal, {
        ...context,
        target,
        flavorValues: { target: this.combatantDisplayNames(target), amount },
      });
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
      this.addGlobalFlavorEvent(FLAVOR_EVENTS.Effect.EpHeal, {
        ...context,
        target,
        flavorValues: { target: this.combatantDisplayNames(target), amount },
      });
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
    this.addGlobalFlavorEvent(FLAVOR_EVENTS.Effect.BlockGain, {
      ...context,
      target,
      flavorValues: { target: this.combatantDisplayNames(target), amount },
    });
    result.messages.push(`${context.sourceName}: +${amount} block`);
  }

  private async applyEffectHpDamage(
    effect: EffectDefinition,
    target: Player | Enemy,
    amount: number,
    context: BattleEventContext,
    result: EffectExecutionResult,
  ): Promise<void> {
    const releasePortrait = target === this.player && amount > 0 ? this.beginPlayerPortraitFactor('HPdamage') : () => {};
    try {
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
        this.addHpDamageBattleLog(target, damage, amount);
        this.recordEnemyDefeatCauseIfNeeded(
          target,
          beforeHp,
          target === context.actor ? 'selfHpDamage' : 'hpDamage',
          context,
        );
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
      this.addHpDamageBattleLog(target, damage, hpDamage);
      result.messages.push(`${context.sourceName}: ${damage} HP damage`);
    } finally { releasePortrait(); }
  }

  private addHpDamageBattleLog(target: Player | Enemy, actualDamage: number, incomingDamage: number): void {
    this.addGlobalFlavorEvent(FLAVOR_EVENTS.Effect.HpDamage, {
      source: 'system',
      actor: this.player,
      target,
      flavorValues: {
        target: this.combatantDisplayNames(target),
        actualHpDamage: actualDamage,
        incomingHpDamage: incomingDamage,
      },
    });
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
    const releasePortrait = target === this.player && amount > 0 ? this.beginPlayerPortraitFactor('EPdamage') : () => {};
    try {
      const attribute = effect.attackAttribute ?? (context.intent?.attackAttribute ?? context.card?.attackAttribute ?? 'love');

      if (target instanceof Enemy) {
        const modifiedAmount = this.modifiedEnemyEpDamage(amount, target, context.source === 'card');
        if (modifiedAmount > 0) {
          this.playDamageEffect(attribute, this.enemyEffectX(target), this.enemyEffectY(target), modifiedAmount);
          this.showDamageNumber(modifiedAmount, this.enemyEffectX(target), this.enemyEffectY(target), 'ep');
          this.addEpDamageBattleLog(target, modifiedAmount);
        }
        const peaked = await this.applyEnemyEpDamage(modifiedAmount, target);
        if (modifiedAmount > 0 && !peaked) {
          this.enemyEpDamageMotion(target, context);
        }
        this.addEnemyDamage(result, target, modifiedAmount);
        this.runEnemyDamagedHooks({ triggerEnemy: target, card: context.card, amount: modifiedAmount });
        result.messages.push(peaked ? `${context.sourceName}: Enemy EP peak` : `${context.sourceName}: ${modifiedAmount} EP damage`);
        return;
      }

      const epDamageParts = this.resolvePlayerEpDamageParts(effect, context);
      if (context.source === 'card' && context.actor === this.player && amount > 0) {
        await this.spreadStatusesForCard(epDamageParts, context, result);
      }
      const override = receivedEpDamage(this.player, amount);
      const modifiedAmount = override.cause ? override.amount : this.modifiedPlayerEpDamage(amount, epDamageParts);
      if (override.cause) this.addFlavorEvent(STATUS_DESCRIPTIONS[override.cause].flavors, FLAVOR_EVENTS.Status.EpDamageOverridden, this.battleEventContext({ ...context, status: override.cause, statusOwner: this.player }));
      if (modifiedAmount <= 0) {
        if (amount > 0) {
          if (['enemyIntent', 'relic', 'status'].includes(context.source)) {
            this.addGlobalFlavorEvent(FLAVOR_EVENTS.Battle.PlayerEpDamageUnfelt, {
              ...context,
              flavorValues: {
                ...context.flavorValues,
                partCount: epDamageParts.length,
                defaultPart: bodyPartDefaultName(epDamageParts[0]),
              },
            });
          }
          // An ineffective positive hit still develops each involved part by 1.
          // Actual EP, damage history amount and Peak count remain unchanged.
          await this.recordPlayerEpDamage(0, epDamageParts, false, context, 1);
        }
        if (context.source === 'card' && context.card) {
          await this.runEnemyReactionsForPlayerSelfEpDamage(effect, amount, epDamageParts, context, result);
        }
        return;
      }
      const restoreEnemyAttackAnimationSpeed = context.source === 'enemyIntent'
        ? this.enemyEpAttackMotion()
        : () => undefined;
      try {
        this.playDamageEffect(attribute, PLAYER_EFFECT_X, this.playerEffectY(), modifiedAmount);
        this.showDamageNumber(modifiedAmount, PLAYER_EFFECT_X, this.playerEffectY(), 'ep');
        this.addPlayerEpDamageQuote(modifiedAmount, context);
        this.addEpDamageBattleLog(target, modifiedAmount);
        const peaked = await this.applyPlayerEpDamage(amount, epDamageParts, context);
        result.causedPlayerEpPeak = result.causedPlayerEpPeak || peaked;
        if (!peaked) {
          this.playerEpDamageMotion(context);
        }
        result.messages.push(peaked ? `${context.sourceName}: Player EP peak` : `${context.sourceName}: ${modifiedAmount} EP damage`);
      } finally {
        restoreEnemyAttackAnimationSpeed();
      }
      if (context.source === 'card' && context.card) {
        await this.runEnemyReactionsForPlayerSelfEpDamage(effect, amount, epDamageParts, context, result, 'afterPlayerSelfEpDamage');
      }
    } finally { releasePortrait(); }
  }

  private async runEnemyReactionsForPlayerSelfEpDamage(
    effect: EffectDefinition,
    baseAmount: number,
    parts: EpDamagePart[],
    context: BattleEventContext,
    result: EffectExecutionResult,
    timing: EnemyReactionRule['timing'] = 'afterPlayerSelfEpDamage',
  ): Promise<void> {
    if (baseAmount <= 0 || !context.card) {
      return;
    }

    const enemy = context.selectedEnemy ?? this.enemy;
    if (!enemy || enemy.isDefeated || !enemy.definition.reactionRules?.length) {
      return;
    }

    const matchingRules = enemy.definition.reactionRules
      .filter((rule) => this.enemyReactionRuleMatches(rule, enemy, context.card!, baseAmount, parts))
      .filter((rule) => (rule.timing ?? 'afterPlayerSelfEpDamage') === timing)
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    for (const rule of matchingRules) {
      const reactionContext = this.battleEventContext({
        source: 'enemyIntent',
        sourceName: this.combatantDisplayName(enemy),
        sourceId: rule.id,
        actor: enemy,
        selectedEnemy: enemy,
        triggerEnemy: enemy,
        flavorValues: {
          card: context.card.name,
        },
      });

      if (!evaluateConditions(rule.conditions, reactionContext)) {
        continue;
      }

      const variants = (rule.variants ?? []).filter((candidate) => evaluateConditions(candidate.conditions, reactionContext));
      const variant = variants.length > 0
        ? variants[Math.floor(Math.random() * variants.length)]
        : undefined;
      if (rule.variants && rule.variants.length > 0 && !variant) {
        continue;
      }

      const effects = variant?.effects ?? rule.effects ?? [];
      if (effects.length <= 0) {
        return;
      }

      this.addFlavorEvent(rule.flavors, FLAVOR_EVENTS.Enemy.Intent, reactionContext);
      this.addFlavorEvent(variant?.flavors, FLAVOR_EVENTS.Enemy.Intent, reactionContext);
      const reactionResult = await this.executeEffects(effects, reactionContext);
      this.mergeEffectExecutionResult(result, reactionResult);
      return;
    }
  }

  private enemyReactionRuleMatches(
    rule: EnemyReactionRule,
    enemy: Enemy,
    card: CardDefinition,
    baseAmount: number,
    parts: EpDamagePart[],
  ): boolean {
    const trigger = rule.trigger;
    if (trigger.kind !== 'playerSelfEpDamage') {
      return false;
    }

    if (trigger.minBaseAmount !== undefined && baseAmount < trigger.minBaseAmount) {
      return false;
    }

    if (trigger.cardIds && !trigger.cardIds.includes(card.id)) {
      return false;
    }

    if (trigger.categories && !trigger.categories.some((category) => card.categories.includes(category))) {
      return false;
    }

    if (trigger.parts && !trigger.parts.some((part) => parts.includes(part))) {
      return false;
    }

    return Boolean(enemy.definition.traits?.length);
  }

  private mergeEffectExecutionResult(target: EffectExecutionResult, source: EffectExecutionResult): void {
    target.causedPlayerEpPeak = target.causedPlayerEpPeak || source.causedPlayerEpPeak;
    for (const [enemy, damage] of source.damagedEnemies.entries()) {
      target.damagedEnemies.set(enemy, (target.damagedEnemies.get(enemy) ?? 0) + damage);
    }
    target.messages.push(...source.messages);
  }

  private addEpDamageBattleLog(target: Player | Enemy, amount: number): void {
    this.addGlobalFlavorEvent(FLAVOR_EVENTS.Effect.EpDamage, {
      source: 'system',
      actor: this.player,
      target,
      flavorValues: { target: this.combatantDisplayNames(target), amount },
    });
  }

  private addPlayerEpDamageQuote(amount: number, context: BattleEventContext): void {
    this.addGlobalFlavorEvent(FLAVOR_EVENTS.Battle.PlayerEpDamageQuote, {
      ...context,
      flavorValues: {
        amount,
        epDamagePercentOfRange: this.playerEpDamagePercentOfRange(amount),
      },
    });
  }

  private playerEpDamagePercentOfRange(amount: number): number {
    const reactionRange = Math.max(0, this.playerEffectiveMaxEp() - this.playerEpReserveValue);
    return reactionRange > 0 ? Math.ceil((amount / reactionRange) * 100) : 999;
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
    const animation = this.hpDrainEffect(this.enemyEffectX(enemy), this.enemyEffectY(enemy), PLAYER_EFFECT_X, this.playerEffectY());
    if (amount > 0 && beforeEnemyHp > 0) this.enemyPeakDrains?.push({ enemy, animation });
    enemy.takeDirectHpDamage(amount);
    if (amount > 0 && beforeEnemyHp > 0) recordHpDrain(this.player);
    this.showHpDamageBarChip(view.bars, beforeEnemyHp, enemy.hp, enemy.maxHp);
    this.showDamageNumber(amount, this.enemyEffectX(enemy), this.enemyEffectY(enemy), 'hp');
    this.addEnemyDamage(result, enemy, amount);
    this.runEnemyDamagedHooks({ triggerEnemy: enemy, card: context.card, amount });
    this.addHpDrainBattleLog(enemy, amount);
    this.recordEnemyDefeatCauseIfNeeded(enemy, beforeEnemyHp, 'hpDrain', context);
    result.messages.push(`${context.sourceName}: drain ${amount} HP`);
  }

  private addHpDrainBattleLog(enemy: Enemy, amount: number): void {
    if (this.hpDrainLogBatch) {
      this.hpDrainLogBatch.set(enemy, (this.hpDrainLogBatch.get(enemy) ?? 0) + amount);
      return;
    }

    this.addHpDrainFlavorEvent(enemy, amount);
  }

  private beginHpDrainLogBatch(): void {
    this.hpDrainLogBatch = new Map();
  }

  private flushHpDrainLogBatch(): void {
    const batch = this.hpDrainLogBatch;
    this.hpDrainLogBatch = undefined;
    if (!batch) {
      return;
    }

    for (const [enemy, amount] of batch.entries()) {
      if (amount > 0) {
        this.addHpDrainFlavorEvent(enemy, amount);
      }
    }
  }

  private addHpDrainFlavorEvent(enemy: Enemy, amount: number): void {
    this.addGlobalFlavorEvent(FLAVOR_EVENTS.Effect.HpDrain, {
      source: 'system',
      actor: this.player,
      target: enemy,
      selectedEnemy: enemy,
      triggerEnemy: enemy,
      flavorValues: { amount },
    });
  }

  private recordEnemyDefeatCauseIfNeeded(
    enemy: Enemy,
    beforeHp: number,
    cause: EnemyDeathCause,
    context: BattleEventContext,
  ): void {
    if (beforeHp <= 0 || !enemy.isDefeated || this.enemyDefeatCauses.has(enemy)) {
      return;
    }

    this.enemyDefeatCauses.set(enemy, {
      cause,
      context,
      statuses: Array.from(enemy.statuses.keys()).filter((status) => enemy.hasStatus(status)),
      intent: context.intent,
    });
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
    const active = entry.owner === this.player && entry.owner.hasStatus(entry.status)
      && (entry.trigger.consumeRule !== 'allWhileEnergy' || this.player.energy > 0);
    const release = active && entry.trigger.portraitEvent
      ? this.beginPlayerPortraitFactor(entry.trigger.portraitEvent) : () => {};
    try {
      return await this.executeStatusTriggerEffects(entry, context, options);
    } finally {
      release();
    }
  }

  private async executeStatusTriggerEffects(
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
      triggerEnemy: context.triggerEnemy ?? context.selectedEnemy ?? (entry.owner instanceof Enemy ? entry.owner : undefined) ?? this.bindingEnemyForContext({ ...context, status: entry.status }),
    });

    if (entry.trigger.consumeRule === 'allWhileEnergy') {
      let consumedStacks = 0;
      const batchSize = statusStacksPerEnergy(entry.trigger);
      while (this.player.energy > 0 && entry.owner.hasStatus(entry.status)) {
        const consumed = Math.min(batchSize, entry.owner.statuses.get(entry.status) ?? 0);
        await this.consumeStatusWithNotice(entry.owner, entry.status, consumed);
        consumedStacks += consumed;
        await this.pulseStatusIcon(entry.owner, entry.status);
        const result = await this.executeEffects(this.statusTriggerEffectsForRun(entry.trigger, options), this.battleEventContext({
          source: 'status',
          sourceName: this.statusDisplayName(entry.status),
          actor: entry.owner,
          triggerEnemy: triggerContext.triggerEnemy,
          statusOwner: entry.owner,
          status: entry.status,
          statusStacks: consumed,
          statusTrigger: entry.trigger,
        }));
        this.addFlavorEvent(entry.definition.flavors, FLAVOR_EVENTS.Status.Trigger, triggerContext);
        this.addFlavorEvent(entry.trigger.flavors, FLAVOR_EVENTS.Status.Trigger, triggerContext);
        messages.push(...result.messages);
        this.updateHud();
        await this.runStatusTriggerVisuals(entry.trigger);
        await this.wait(90);
      }
      if (entry.status === 'Aftershocks' && consumedStacks > 0) {
        this.addAftershocksAfterConsumptionFlavor(entry.owner.statuses.get(entry.status) ?? 0);
      }
      return messages;
    }

    const stacks = entry.owner.statuses.get(entry.status) ?? 0;
    if (stacks <= 0) {
      return messages;
    }

    if (entry.trigger.chance !== undefined) {
      const chancePassed = Math.random() < entry.trigger.chance;
      this.addFlavorEvent(entry.trigger.flavors, chancePassed ? FLAVOR_EVENTS.Effect.ChanceSuccess : FLAVOR_EVENTS.Effect.ChanceFailure, triggerContext);
      if (!chancePassed) {
        return messages;
      }
    }

    const runnableEffects = this.statusTriggerEffectsForRun(entry.trigger, options);
    if (runnableEffects.length > 0) {
      await this.pulseStatusIcon(entry.owner, entry.status);
    }
    this.addFlavorEvent(entry.definition.flavors, FLAVOR_EVENTS.Status.Trigger, triggerContext);
    this.addFlavorEvent(entry.trigger.flavors, FLAVOR_EVENTS.Status.Trigger, triggerContext);

    const result = await this.executeEffects(runnableEffects, this.battleEventContext({
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
      await this.consumeStatusWithNotice(entry.owner, entry.status);
      if (willRemoveStatus) {
        this.addFlavorEvent(entry.definition.flavors, FLAVOR_EVENTS.Status.Remove, triggerContext);
        this.addFlavorEvent(entry.trigger.flavors, FLAVOR_EVENTS.Status.Remove, triggerContext);
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

  private addAftershocksAfterConsumptionFlavor(remainingStacks: number): void {
    this.addGlobalFlavorEvent(FLAVOR_EVENTS.Battle.AftershocksAfterConsumption, {
      source: 'status',
      sourceName: this.statusDisplayName('Aftershocks'),
      actor: this.player,
      statusOwner: this.player,
      status: 'Aftershocks',
      flavorValues: {
        remainingStacks,
        playerEnergy: this.player.energy,
        playerFainted: this.player.hasStatus('Fainted'),
      },
    });
  }

  private statusEffectAmount(effect: EffectDefinition, owner: Player | Enemy, stacks: number): number {
    const baseAmount = this.effectAmount(effect, owner);
    return effect.perStack ? baseAmount * stacks : baseAmount;
  }

  private removeStatusByEffect(target: Player | Enemy, effect: EffectDefinition, fallbackStatus: StatusEffect): StatusEffect[] {
    if (effect.statusGroup) {
      const removedStatuses: StatusEffect[] = [];
      for (const [status, definition] of Object.entries(STATUS_DESCRIPTIONS) as [StatusEffect, StatusDefinition][]) {
        if (definition.exclusiveGroup === effect.statusGroup && target.hasStatus(status)) {
          target.statuses.delete(status);
          removedStatuses.push(status);
        }
      }
      return removedStatuses;
    }

    const status = effect.status ?? fallbackStatus;
    const changed = target.hasStatus(status);
    if (changed) {
      target.statuses.delete(status);
    }
    return changed ? [status] : [];
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

  private effectChance(effect: EffectDefinition, context: BattleEventContext): number {
    const chance = Phaser.Math.Clamp((effect.chance ?? 1) + this.chanceBonusFromStatus(
      effect.chanceBonusStatus,
      effect.chanceBonusTarget ?? 'player',
      effect.chanceBonusPerStack ?? 0,
      context,
    ), 0, 1);
    // Equivalent to independent trials, without replaying the effect or its animation.
    const trials = effect.chancePerStack ? Math.max(0, Math.floor(context.statusStacks ?? 1)) : 1;
    return trials === 1 ? chance : 1 - Math.pow(1 - chance, trials);
  }

  private enemyIntentChancePassed(intent: EnemyIntent, context: BattleEventContext): boolean {
    if (intent.chance === undefined) {
      return true;
    }

    const chance = Phaser.Math.Clamp(intent.chance + this.chanceBonusFromStatus(
      intent.chanceBonusStatus,
      intent.chanceBonusTarget ?? 'player',
      intent.chanceBonusPerStack ?? 0,
      context,
    ), 0, 1);
    return Math.random() < chance;
  }

  private chanceBonusFromStatus(
    status: StatusEffect | undefined,
    target: ConditionTarget,
    perStack: number,
    context: BattleEventContext,
  ): number {
    if (!status || perStack === 0) {
      return 0;
    }

    return (this.chanceBonusTarget(target, context)?.statuses.get(status) ?? 0) * perStack;
  }

  private chanceBonusTarget(target: ConditionTarget, context: BattleEventContext): Player | Enemy | undefined {
    if (target === 'player') {
      return this.player;
    }

    if (target === 'actor' || target === 'self') {
      return context.actor;
    }

    if (target === 'selectedEnemy') {
      return context.selectedEnemy;
    }

    if (target === 'triggerEnemy') {
      return context.triggerEnemy;
    }

    if (target === 'statusOwner') {
      return context.statusOwner;
    }

    return undefined;
  }

  private bindingEnemyForContext(context?: Partial<BattleEventContext>): Enemy | undefined {
    if (context?.status !== 'Escaping' && context?.card?.id !== 'wriggleFree') {
      return undefined;
    }

    return this.enemies.find((enemy) => !enemy.isDefeated && enemy.hasStatus('Binding'));
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
    const bg = createTooltipPaint(this, TOOLTIP_LAYOUT.maxWidth);
    this.statusTooltipBg = bg;
    this.statusTooltipText = this.add.text(TOOLTIP_LAYOUT.paddingX, TOOLTIP_LAYOUT.paddingY, '', {
      fontFamily: GAME_FONT,
      fontSize: TOOLTIP_LAYOUT.fontSize,
      color: '#f8fafc',
      wordWrap: { width: TOOLTIP_LAYOUT.maxWidth - TOOLTIP_LAYOUT.paddingX * 2, useAdvancedWrap: true },
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
    this.tooltipHover.bind(hpBg, () => this.showBarTooltip(owner, 'hp', x, y + 14, enemy));

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
      fontFamily: GAME_FONT,
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
    this.tooltipHover.bind(epBg, () => this.showBarTooltip(owner, 'ep', x, epY + 14, enemy));

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
      fontFamily: GAME_FONT,
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
      : this.uiText('Ecstasy point. EP rises when taking EP damage. At max, a Peak effect triggers.', '快感値。EPダメージを受けると上昇し、最大値に達するとPeakしてしまう。');
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
    this.energyPanel = new CrayonPatch(this, 90, 600, 132, 96, 0x182230, 0.95);
    this.energyPanel.setStrokeStyle(2, 0xd8a84c, 0.85);
    this.energyPanel.setDepth(35);
    const energyLabel = this.add.text(42, 566, 'ENERGY', {
      fontFamily: GAME_FONT,
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#d8a84c',
    });
    energyLabel.setDepth(36);
    this.energyText = this.add.text(42, 590, '', {
      fontFamily: GAME_FONT,
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
      fontFamily: GAME_FONT,
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#8fa0b8',
    });
  }

  private hudStyle(fontSize: number): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: GAME_FONT,
      fontSize: `${fontSize}px`,
      color: '#f1f5f9',
      lineSpacing: 7,
    };
  }

  private createSettingsButton(): void {
    const button = this.add.container(1220, 28);
    const bg = new CrayonPatch(this, 0, 0, 100, 36, CRAYON_COLORS.button, 1);
    bg.setStrokeStyle(2, 0x7d8ba0, 0.85);
    const label = this.add.text(0, 0, this.uiText('Settings', '設定'), {
      fontFamily: GAME_FONT,
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#f8fafc',
    });
    label.setOrigin(0.5);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setHoverColor(CRAYON_COLORS.hover));
    bg.on('pointerout', () => bg.setHoverColor());
    onPrimaryClick(bg, () => this.showSettingsMenu());
    KeyboardNavigation.for(this).register(bg, { group: 'settings' });
    button.add([bg, label]);
    button.setDepth(6000);
  }

  private showSettingsMenu(): void {
    this.modalBack = () => this.hideModal();
    this.hidePileOverlay();
    this.modalOverlay.removeAll(true);
    const shade = this.add.rectangle(SCREEN_CENTER_X, SCREEN_CENTER_Y, SCREEN_WIDTH, SCREEN_HEIGHT, 0x050607, 0.55);
    shade.setInteractive();
    onPrimaryClick(shade, () => this.hideModal());
    const panel = this.add.rectangle(640, 360, 500, 420, 0x242a33, 0.98);
    panel.setStrokeStyle(3, 0x758195, 0.9);
    panel.setInteractive();
    onPrimaryClick(panel, (pointer: Phaser.Input.Pointer) => pointer.event?.stopPropagation());
    const title = this.add.text(640, 220, this.uiText('Settings', '設定'), {
      fontFamily: GAME_FONT,
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
    const restart = this.createModalButton(640, 350, 360, 46, this.uiText('Restart Battle', '戦闘をはじめからやり直す'), () => {
      this.showConfirmDialog(
        l('Restart battle from the beginning?', '戦闘をはじめからやり直します。よろしいですか？'),
        () => this.restartBattle(),
      );
    });
    const help = this.createModalButton(640, 408, 360, 46, this.uiText('Help', 'ヘルプ'), () => this.showHelpPage());
    const titleButton = this.createModalButton(640, 466, 360, 46, this.uiText('Return to Title', 'タイトルに戻る'), () => {
      this.showConfirmDialog(
        l('Return to title?', 'タイトルに戻ります。よろしいですか？'),
        () => this.returnToTitle(),
      );
    });
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

  private showConfirmDialog(message: LocalizedText, onConfirm: () => void): void {
    this.modalBack = () => this.showSettingsMenu();
    this.modalOverlay.removeAll(true);
    const shade = this.add.rectangle(SCREEN_CENTER_X, SCREEN_CENTER_Y, SCREEN_WIDTH, SCREEN_HEIGHT, 0x050607, 0.58);
    shade.setInteractive();
    const panel = this.add.rectangle(640, 360, 560, 240, 0x242a33, 0.98);
    panel.setStrokeStyle(3, 0x758195, 0.9);
    panel.setInteractive();
    onPrimaryClick(panel, (pointer: Phaser.Input.Pointer) => pointer.event?.stopPropagation());
    const title = this.add.text(640, 285, this.uiText('Confirm', '確認'), {
      fontFamily: GAME_FONT,
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#f8fafc',
    });
    title.setOrigin(0.5);
    const body = this.add.text(640, 350, localize(message), {
      fontFamily: GAME_FONT,
      fontSize: '20px',
      color: '#e5edf7',
      align: 'center',
      wordWrap: { width: 480, useAdvancedWrap: true },
    });
    body.setOrigin(0.5);
    const yes = this.createModalButton(545, 430, 150, 42, this.uiText('Yes', 'はい'), onConfirm);
    const no = this.createModalButton(735, 430, 150, 42, this.uiText('No', 'いいえ'), () => this.showSettingsMenu());
    this.modalOverlay.add([shade, panel, title, body, yes, no]);
    this.modalOverlay.setVisible(true);
  }

  private refreshLocalizedText(): void {
    this.conversation?.refresh();
    const displayNames = this.enemyDisplayNames(this.enemyViews.map((view) => view.enemy));
    this.enemyViews.forEach((view, index) => {
      view.displayName = displayNames[index] ?? view.displayName;
    });
    this.updateHud();
    this.updateCardEffectTexts();
    this.renderBattleLog();
  }

  refreshLanguage(): void {
    this.refreshLocalizedText();
  }

  private showHelpPage(): void {
    this.modalBack = () => this.showSettingsMenu();
    this.modalOverlay.removeAll(true);
    const shade = this.add.rectangle(SCREEN_CENTER_X, SCREEN_CENTER_Y, SCREEN_WIDTH, SCREEN_HEIGHT, 0x050607, 0.58);
    shade.setInteractive();
    onPrimaryClick(shade, () => this.showSettingsMenu());
    const panel = this.add.rectangle(640, 360, 820, 560, 0x242a33, 0.98);
    panel.setStrokeStyle(3, 0x758195, 0.9);
    panel.setInteractive();
    onPrimaryClick(panel, (pointer: Phaser.Input.Pointer) => pointer.event?.stopPropagation());
    const title = this.add.text(640, 115, this.uiText('Help', 'ヘルプ'), {
      fontFamily: GAME_FONT,
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
            'プレイヤーEP：快感値。毎ターン1下がり、最大値に達するとPeakしてしまい、状態異常：余韻が付与される。',
            'エナジー：カード使用に消費する。コスト0のカードはエナジー0でも使用できる。',
            'Block：HPダメージを防ぐ。次のターン開始時にリセットされる。',
            '',
            '敵HP：敵の体力。全ての敵HPを0にすると勝利。',
            '敵EP：最大値に達するとPeakさせることができる。',
            'バフ/デバフ：同じ状態はスタック可能。発動時に1スタック消費されるものがある。',
            'Charm：敵が誘惑時行動を使用する。',
            this.localizeDisplayText(STATUS_DESCRIPTIONS.Aftershocks.description, undefined, 'ja'),
            '',
            'デッキループ：戦闘開始時と各ターンに5枚ドロー。使用カードとターン終了時の手札は捨て札へ。山札が空なら捨て札をシャッフルして山札に戻す。',
          ]
        : [
            'Player HP: Your health. If it reaches 0, you lose.',
            'Player EP: Your ecstasy point. It decreases by 1 each turn. If it reaches max, it drops to a reduced value and applies Aftershocks.',
            'Energy: Spent to play cards. Cards with cost 0 can be played with 0 energy.',
            'Block: Reduces incoming HP damage first, then resets at the start of your next turn.',
            '',
            'Enemy HP: Enemy health. If all enemies reach 0 HP, you win.',
            'Enemy EP: Enemy ecstasy point. If it reaches max, Peak effects trigger.',
            'Buffs/Debuffs: The same status can stack. One stack may be consumed when that status takes effect.',
            'Charm: The enemy uses its charm intent pool.',
            this.localizeDisplayText(STATUS_DESCRIPTIONS.Aftershocks.description, undefined, 'en'),
            '',
            'Deck Loop: Draw 5 cards at battle start and each turn. Played cards and end-turn hand cards go to discard. If the draw pile is empty, the discard pile is shuffled back into the draw pile.',
          ],
      {
        fontFamily: GAME_FONT,
        fontSize: '18px',
        color: '#e5edf7',
        wordWrap: { width: 730, useAdvancedWrap: true },
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
    const bg = new CrayonPatch(this, 0, 0, width, height, CRAYON_COLORS.button, 1);
    bg.setStrokeStyle(2, 0x9ba8ba, 0.9);
    const label = this.add.text(0, 0, labelText, {
      fontFamily: GAME_FONT,
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#f8fafc',
    });
    label.setOrigin(0.5);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setHoverColor(CRAYON_COLORS.hover));
    bg.on('pointerout', () => bg.setHoverColor());
    onPrimaryClick(bg, (pointer: Phaser.Input.Pointer) => {
      pointer.event?.stopPropagation();
      onClick();
    });
    KeyboardNavigation.for(this).register(bg);
    button.add([bg, label]);
    return button;
  }

  private goBack(): void {
    if (this.modalOverlay?.visible) (this.modalBack ?? (() => this.hideModal()))();
    else if (this.tutorialTips?.active) this.tutorialTips.dismiss();
    else if (this.pileOverlay?.visible) this.hidePileOverlay();
    else this.showSettingsMenu();
  }

  private hideModal(): void {
    this.modalBack = undefined;
    this.modalOverlay.removeAll(true);
    this.modalOverlay.setVisible(false);
  }

  private isModalOpen(): boolean {
    return Boolean(this.modalOverlay?.visible || this.pileOverlay?.visible || this.tutorialTips?.active);
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
    const definition = STATUS_DESCRIPTIONS[status];
    const ownerType = owner === this.playerStatusIcons ? 'player' : 'enemy';
    const description = this.localizeDisplayText(definition?.descriptionsByOwner?.[ownerType] ?? definition?.description ?? `${status}: No description.`);
    const stackText = stacks > 1 ? `\nStacks: ${stacks}` : '';
    this.showStatusTooltipText(`${description}${stackText}`, x, y);
  }

  private cardTermDescription(term: StatusEffect | 'block'): string {
    if (term === 'block') {
      return this.player.relicIds.includes('livingClothes')
        ? this.localizeDisplayText(l(
          'Reinforces clothing to prevent HP damage by the indicated amount. Carries over between turns.',
          '衣類を強化して、HPへの攻撃を数値の分だけ防ぐ。ターンをまたいで持ち越せる。',
        ))
        : this.localizeDisplayText(l(
          'Reinforces clothing to prevent HP damage by the indicated amount. Resets at the start of your turn.',
          '衣類を強化して、HPへの攻撃を数値の分だけ防ぐ。ターン開始時にリセットされる。',
        ));
    }
    return this.localizeDisplayText(STATUS_DESCRIPTIONS[term]?.description ?? `${term}: No description.`);
  }

  private bindCardTermTooltip(view: CardView): void {
    bindCardTermHover(this, view.effectText, this.tooltipHover, {
      enabled: () => this.hoveredCardUid === view.card.uid && this.isHandCardReady(view) && !this.isGameOver && !this.isModalOpen(),
      describe: (term) => this.cardTermDescription(term),
      visible: () => this.statusTooltipOwner === view.container && this.statusTooltip.visible,
      show: (text, bounds) => {
        this.clearStatusTooltipSource();
        this.statusTooltipOwner = view.container;
        this.showStatusTooltipText(text, bounds.centerX - TOOLTIP_LAYOUT.maxWidth / 2, bounds.top - 4, true);
      },
    });
  }

  private clearStatusTooltipSource(): void {
    this.statusTooltipStatus = undefined;
    this.statusTooltipOwner = undefined;
  }

  private showStatusTooltipText(text: string, x: number, y: number, above = false): void {
    if (this.tutorialTips?.active) return;
    const width = Math.min(TOOLTIP_LAYOUT.maxWidth, SCREEN_WIDTH - TOOLTIP_LAYOUT.screenMargin * 2);
    const { width: fittedWidth, height } = sizeTooltipText(this.statusTooltipText, text, width, SCREEN_HEIGHT - TOOLTIP_LAYOUT.screenMargin * 2);
    this.statusTooltipBg.fit(fittedWidth, height);
    const { x: clampedX, y: clampedY } = tooltipPosition(x, y, fittedWidth, height, SCREEN_WIDTH, SCREEN_HEIGHT, above);
    this.statusTooltip.setPosition(clampedX, clampedY);
    this.statusTooltip.setVisible(true);
    this.game.events.emit('battle-tooltip-show', { text, x: clampedX, y: clampedY });
  }

  private hideStatusTooltip(): void {
    this.tooltipHover.cancel();
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
      const iconSize = container === this.playerStatusIcons ? PLAYER_STATUS_HUD_LAYOUT.iconSize : 32;
      const icon = this.add.rectangle(0, 0, iconSize, iconSize, this.statusIconColor(status), 1);
      icon.setStrokeStyle(2, 0xffffff, 0.68);
      icon.setInteractive({ useHandCursor: true });

      const label = this.add.text(0, 0, this.statusIconText(status, stacks), {
        fontFamily: GAME_FONT,
        fontSize: stacks > 9 ? '13px' : '15px',
        fontStyle: 'bold',
        color: '#ffffff',
      });
      label.setOrigin(0.5);

      this.tooltipHover.bind(icon, () => {
        this.showStatusTooltip(status, stacks, container.x + x - 16, container.y + 24, container);
      });

      iconGroup.add([icon, label]);
      KeyboardNavigation.for(this).register(icon, { group: container === this.playerStatusIcons ? 'player-status' : 'enemy-status' });
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
    this.playerEpFillProtectionCount = 0;
    this.enemyEpFillProtectionCount = 0;
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

  private moveKeyboardSelection(direction: Direction, current: NavigationItem | undefined, items: NavigationItem[]): NavigationItem | undefined {
    if (this.conversation || this.tutorialTips?.active) {
      const index = current ? items.indexOf(current) : -1;
      return items[index < 0 ? 0 : (index + (direction === 'left' || direction === 'up' ? -1 : 1) + items.length) % items.length];
    }
    const group = (name: string) => items.filter(item => item.group === name);
    const hand = this.deck.hand.flatMap(card => group('hand').filter(item => item.object === this.cardViews.get(card.uid)?.hitArea));
    const enemies = this.enemyViews.flatMap(view => group('enemies').filter(item => item.object === view.hitArea));
    const target = enemies.find(item => item.object === this.enemyViews[this.selectedEnemyIndex]?.hitArea) ?? enemies[0];
    const info = [...group('player-status'), ...group('relics'), ...group('enemy-status')];
    const piles = group('piles'), end = group('end-turn')[0];
    const cycle = (list: NavigationItem[]) => list[(list.indexOf(current!) + (direction === 'left' ? -1 : 1) + list.length) % list.length];
    if (!current) return hand[0] ?? end ?? piles[0];
    if (current.group === 'hand') {
      if (direction === 'up') return target;
      if (direction === 'down') return piles[0];
      return hand[hand.indexOf(current) + (direction === 'left' ? -1 : 1)] ?? end ?? hand[0];
    }
    if (current.group === 'end-turn') {
      if (direction === 'up') return target;
      if (direction === 'down') return piles[0];
      return direction === 'left' ? hand[hand.length - 1] : hand[0];
    }
    if (current.group === 'enemies') {
      if (direction === 'down') return hand[0] ?? end;
      if (direction === 'up') return info[0] ?? current;
      return cycle(enemies);
    }
    if (info.includes(current)) {
      if (direction === 'down') return target;
      if (direction === 'up') return group('settings')[0];
      return cycle(info);
    }
    if (current.group === 'piles') {
      if (direction === 'up') return hand[0] ?? end;
      if (direction === 'down') return current;
      return cycle(piles);
    }
    if (current.group === 'settings') return direction === 'down' ? target : hand[0] ?? end;
    return hand[0] ?? end;
  }

  private createEndTurnButton(): void {
    this.endTurnButton = this.add.container(1110, 622);
    this.endTurnButtonBg = new CrayonPatch(this, 0, 0, 150, 52, 0xd08b3e, 1);
    this.endTurnButtonBg.setStrokeStyle(3, 0xffd48a, 0.8);
    this.endTurnButtonLabel = this.add.text(0, 0, 'End Turn', {
      fontFamily: GAME_FONT,
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
        this.endTurnButtonBg.setHoverColor(0xf0a54e);
      }
    });
    this.endTurnButtonBg.on('pointerout', () => {
      this.endTurnButtonBg.setHoverColor();
    });
    onPrimaryClick(this.endTurnButtonBg, () => this.endTurn());
    KeyboardNavigation.for(this).register(this.endTurnButtonBg, { group: 'end-turn', enabled: () => this.canEndTurn && !this.isAnimating && !this.handInputLocked });
    this.setEndTurnEnabled(false);
  }

  private createTutorialTips(): void {
    const battleId = RUN_STATE.eventBattleId ?? 'normal';
    const definitions = TUTORIAL_TIPS.filter(tip => tip.battleId === battleId);
    if (!definitions.length) return;
    const handViews = () => this.deck.hand.flatMap(card => {
      const view = this.cardViews.get(card.uid);
      return view && this.isHandCardReady(view) ? [view] : [];
    });
    this.tutorialTips = new TutorialTips(this, definitions, {
      snapshot: () => ({
        battleId, turn: this.statusRuntime.turn,
        eventReady: !this.isGameOver && !this.isModalOpen() && !this.conversation,
        ready: this.isPlayerTurn && !this.isAnimating && !this.handInputLocked && !this.isGameOver
          && !this.isModalOpen() && !this.conversation && this.canEndTurn,
        cards: handViews().map(view => view.card.definition.id),
        enemies: this.enemyViews.flatMap((view, index) => {
          if (view.enemy.isDefeated) return [];
          const states: TutorialEnemyState[] = [];
          if ([...view.enemy.statuses].some(([status, stacks]) => stacks > 0 && this.enemyBodyPartStatus(status)?.kind === 'insert')) states.push('inserted');
          if (view.enemy.hasPeakAftershocksIntent()) states.push('peakAftershocks');
          return [{ index, states }];
        }),
      }),
      text: page => this.localizeDisplayText(page.text),
      anchor: ({ page, enemyIndex }) => {
        const position = page.position;
        if (position.anchor === 'enemy') {
          const view = enemyIndex === undefined ? undefined : this.enemyViews[enemyIndex];
          if (!view?.area.active) return undefined;
          const bounds = this.enemyRestBounds(view);
          return { x: bounds.right + position.x, y: bounds.top + position.y, centered: false };
        }
        if (position.anchor === 'screen') return { x: position.x, y: position.y, centered: false };
        const object = position.anchor === 'endTurn' ? this.endTurnButtonBg
          : position.anchor === 'card' ? handViews().find(view => view.card.definition.id === position.cardId)?.hitArea
          : enemyIndex === undefined ? undefined : this.enemyViews[enemyIndex]?.intentText;
        if (!object?.active) return undefined;
        const bounds = object.getBounds();
        return { x: (position.anchor === 'card' ? bounds.right : bounds.centerX) + position.x, y: bounds.top + position.y, centered: position.anchor !== 'card' };
      },
      highlights: ({ page, enemyIndex }) => [
        ...handViews().filter(view => view.card.definition.id === page.highlightCardId).map(view => view.container),
        ...(page.highlightEnemy && enemyIndex !== undefined ? [this.enemyViews[enemyIndex].area] : []),
      ],
      sprites: () => this.enemyViews.flatMap(view => view.body instanceof Phaser.GameObjects.Sprite ? [view.body] : []),
      beforeShow: () => { this.setHoveredCard(undefined); this.hideStatusTooltip(); },
    });
  }

  private setEndTurnEnabled(enabled: boolean): void {
    this.canEndTurn = enabled && !this.isGameOver;
    if (!this.endTurnButtonBg) {
      return;
    }

    if (!this.canEndTurn) this.endTurnButtonBg.setHoverColor();
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
      view.baseY = handPose(targetX, HAND_CENTER_X).y;

      if (animateDraws && animatedDraws.has(card.uid)) {
        view.ready = false;
        view.hitArea.disableInteractive();
        this.tweens.killTweensOf(view.container);
        view.container.setPosition(-120, HAND_Y).setAlpha(1).setScale(0.8).setAngle(-12).setDepth(1200 + index);
        drawAnimations.push(new Promise((resolve) => {
          flyCard(this, view.container, {x:targetX,y:view.baseY,scale:1,angle:handPose(targetX,HAND_CENTER_X).angle}, {
            duration:440, delay:index*65, arc:85,
            onComplete:() => {
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
        this.moveCardTo(view, targetX, view.baseY, 260);
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

  private moveCardTo(view: CardView, x: number, y: number, duration: number, scale = 1, angle = handPose(view.baseX, HAND_CENTER_X).angle, onComplete?: () => void): void {
    this.tweens.killTweensOf(view.container);
    this.tweens.add({
      targets: view.container,
      x,
      y,
      scale,
      angle,
      duration,
      ease: 'Cubic.easeOut',
      onComplete,
    });
  }

  private setHoveredCard(uid?: string, onRestored?: () => void): void {
    if (this.handInputLocked || this.isModalOpen()) {
      return;
    }

    this.hoverRelease?.remove(false);
    if (this.hoveredCardUid === uid) return;
    this.hoveredCardUid = uid;
    this.applyHoverLayout(uid ? 190 : 240, onRestored);
  }

  private resumeHandHover(excludedUid: string): void {
    const navigation = KeyboardNavigation.for(this);
    if (this.hoveredCardUid || this.handInputLocked || this.isAnimating || this.isGameOver || !this.isPlayerTurn
      || this.isModalOpen() || !this.input.manager.isOver || !this.input.enabled
      || this.game.scene.getScenes(true).slice(-1)[0] !== this
      || (navigation.current && navigation.isKeyboardSelected(navigation.current.object))) return;
    const pointer = this.input.activePointer;
    const candidates = this.input.hitTestPointer(pointer).filter(object => {
      const view = [...this.cardViews.values()].find(view => view.hitArea === object);
      return view && view.card.uid !== excludedUid && this.isHandCardReady(view);
    });
    const hit = this.input.sortGameObjects(candidates, pointer)[0];
    if (!hit) return;
    hit.emit('pointerover', pointer);
    this.transferredHoverUid = this.hoveredCardUid;
  }

  private releaseTransferredHover(): void {
    const uid = this.transferredHoverUid;
    if (!uid) return;
    const view = this.cardViews.get(uid);
    if (!view || this.hoveredCardUid !== uid || KeyboardNavigation.for(this).isKeyboardSelected(view.hitArea)) {
      this.transferredHoverUid = undefined;
      return;
    }
    // A programmatic pointerover does not populate Phaser's pointer-over list.
    // On the next real mouse movement, explicitly release it if necessary.
    if (!this.input.manager.isOver || !this.input.hitTestPointer(this.input.activePointer).includes(view.hitArea)) {
      this.transferredHoverUid = undefined;
      view.hitArea.emit('pointerout', this.input.activePointer);
    }
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

  private cardPlayBlockReason(definition: CardDefinition): 'bound' | 'craving' | 'condition' | undefined {
    if (this.player.hasStatus('Bound') && !canPlayCardWhileBound(definition.categories)) {
      return 'bound';
    }

    if (this.player.hasStatus('DesperateToPeak') && !canPlayCardDuringCraving(definition.categories)) {
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
      this.hoverRelease?.remove(false);
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

  private applyHoverLayout(duration: number, onRestored?: () => void): void {
    const displayedHand = this.deck.hand.filter((card) => !this.exitingCardUids.has(card.uid));
    const hoveredView = this.hoveredCardUid ? this.cardViews.get(this.hoveredCardUid) : undefined;
    if (!this.hoveredCardUid || !hoveredView || !this.isHandCardReady(hoveredView)) {
      this.hoveredCardUid = undefined;
      const views = displayedHand.map(card => this.cardViews.get(card.uid)).filter((view): view is CardView => Boolean(view));
      let remaining = views.length;
      views.forEach((view) => {
        this.moveCardTo(view, view.baseX, view.baseY, duration, 1, undefined, () => {
          remaining -= 1;
          if (remaining === 0) onRestored?.();
        });
      });
      this.updateHandDepths();
      return;
    }

    const hoveredIndex = displayedHand.findIndex((card) => card.uid === this.hoveredCardUid);

    displayedHand.forEach((card, index) => {
      const view = this.cardViews.get(card.uid);
      if (!view) {
        return;
      }
      const uid = card.uid;
      if (uid === this.hoveredCardUid) {
        view.container.setDepth(1000);
        this.moveCardTo(view, view.baseX, 565, duration, 1.12, 0);
        return;
      }

      const distance = Math.abs(index - hoveredIndex);
      const direction = index < hoveredIndex ? -1 : 1;
      const targetX = view.baseX + direction * (distance === 1 ? 40 : distance === 2 ? 24 : 10);
      view.container.setDepth(30 + index);
      this.moveCardTo(view, targetX, view.baseY + 5, duration, 0.98);
    });
  }

  private animateCardToDiscard(cardView: Phaser.GameObjects.Container, onComplete: () => void): void {
    cardView.setDepth(2100);
    flyCard(this, cardView, {x:SCREEN_WIDTH + 130,y:HAND_Y,scale:0.8,angle:12,alpha:1}, {
      duration:360, arc:38, onComplete,
    });
  }

  private animateCardVanish(cardView: Phaser.GameObjects.Container, onComplete: () => void): void {
    this.tweens.killTweensOf(cardView);
    cardView.setDepth(2100);
    cardBurst(this, cardView.x, cardView.y - 20, 0xe5beed);
    this.tweens.add({targets:cardView,y:cardView.y-44,alpha:0,scaleX:0.65,scaleY:1.12,duration:420,ease:'Cubic.easeIn',onComplete});
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
        const targetX = view.baseX;
        const pose = handPose(targetX, HAND_CENTER_X);
        view.ready = false;
        view.hitArea.disableInteractive();
        view.container.setPosition(PLAYER_EFFECT_X, this.playerEffectY()).setAlpha(0.25).setScale(0.45).setAngle(-8).setDepth(1600 + index);
        cardBurst(this, PLAYER_EFFECT_X, this.playerEffectY(), 0xc9aedf, 1500);
        flyCard(this, view.container, {x:targetX,y:pose.y,scale:1,angle:pose.angle}, {
          duration:480,delay:index*65,arc:70,
          onComplete:() => {
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
    const {container,bg,costText,nameText} = createCardShell(this,card.definition,this.localizeDisplayText(this.cardDisplayName(card.definition)));
    container.setPosition(x,y).setDepth(30);
    const effectText = this.add.container(0, 0);
    this.renderCardEffectText(effectText, this.cardEffectDisplay(card.definition).lines);
    container.add(effectText);
    bg.setInteractive({useHandCursor:true});
    const view: CardView = {card,container,hitArea:bg,costText,nameText,effectText,baseX:x,baseY:y,ready:true};
    this.bindCardTermTooltip(view);
    KeyboardNavigation.for(this).register(bg, { group: 'hand', enabled: () => this.isHandCardReady(view) && !this.isGameOver && !this.isAnimating && this.isPlayerTurn });
    bg.on('pointerover', () => {
      if (this.isGameOver || this.isModalOpen() || !this.isHandCardReady(view)) return;
      this.setHoveredCard(card.uid);
      bg.setStrokeStyle(2, 0xf2d9a0);
      // Preserve the original lower hover area while the card lifts away from it.
      if (bg.input) (bg.input.hitArea as Phaser.Geom.Rectangle).height = CARD_HEIGHT + 42;
    });
    bg.on('pointerout', () => {
      if (!this.isHandCardReady(view) || KeyboardNavigation.for(this).isKeyboardSelected(bg)) return;
      bg.setStrokeStyle(1.5, CARD_EDGE);
      if (bg.input) (bg.input.hitArea as Phaser.Geom.Rectangle).height = CARD_HEIGHT;
      this.tooltipHover.cancelWithin(view.container);
      if (this.hoveredCardUid === card.uid) {
        this.hoverRelease?.remove(false);
        this.hoverRelease = this.time.delayedCall(65, () => {
          if (this.hoveredCardUid === card.uid && !KeyboardNavigation.for(this).isKeyboardSelected(bg)) {
            this.setHoveredCard(undefined, () => this.resumeHandHover(card.uid));
          }
        });
      }
    });
    onPrimaryClick(bg, () => {
      if (this.isHandCardReady(view)) this.playCard(card, container, bg);
    });
    return view;
  }



  private cardColor(definition: CardDefinition): number {
    return cardCategoryColor(definition.categories[0]);
  }

  private cardDisplayName(definition: CardDefinition, selectedEnemy = this.enemy): LocalizedText {
    const context = this.battleEventContext({
      source: 'card',
      actor: this.player,
      selectedEnemy,
      card: definition,
    });
    const matchingRule = definition.displayNameRules?.find((rule) => evaluateConditions(rule.conditions, context));
    if (matchingRule) {
      return matchingRule.name;
    }

    return definition.name;
  }

  private cardEffectDisplay(definition: CardDefinition): { lines: CardEffectLine[] } {
    const lines: CardEffectLine[] = [];
    const ja = SETTINGS_STATE.language === 'ja';

    if (this.isTurnStartOnlyCard(definition)) {
      lines.push(ja ? [{ text: 'ターン開始時のみ使用可。' }] : [{ text: 'Playable only at turn start.' }]);
    }

    for (const effect of definition.effects) {
      const amount = this.cardPreviewEffectAmount(definition, effect);
      const times = this.cardPreviewEffectTimes(definition, effect);
      if (effect.kind === 'hpDamage' && this.isEnemyTargetEffect(effect) && amount > 0) {
        lines.push(ja
          ? [{ text: 'HPに' }, { text: String(amount) }, ...(times > 1 ? [{ text: ` x${times}` }] : []), { text: 'ダメージ。' }]
          : [{ text: 'Deal ' }, { text: String(amount) }, ...(times > 1 ? [{ text: ` x${times}` }] : []), { text: ' HP damage.' }]);
      } else if (effect.kind === 'epDamage' && this.isEnemyTargetEffect(effect)) {
        const modifiedEpDamage = this.modifiedEnemyEpDamage(amount, this.cardPrimaryTargetEnemy(definition, this.enemy) ?? this.enemy);
        const isModified = modifiedEpDamage !== amount;
        lines.push(ja
          ? [{ text: 'EPに' }, { text: String(modifiedEpDamage), bold: isModified }, ...(times > 1 ? [{ text: ` x${times}` }] : []), { text: 'ダメージ。' }]
          : [{ text: 'Deal ' }, { text: String(modifiedEpDamage), bold: isModified }, ...(times > 1 ? [{ text: ` x${times}` }] : []), { text: ' EP damage.' }]);
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
        if (modifiedSelfEpDamage <= 0) {
          continue;
        }
        const isModified = modifiedSelfEpDamage !== amount;
        lines.push(ja
          ? [{ text: '自身のEPに' }, { text: String(modifiedSelfEpDamage), bold: isModified }, ...(times > 1 ? [{ text: ` x${times}` }] : []), { text: 'ダメージ。' }]
          : [{ text: 'Take ' }, { text: String(modifiedSelfEpDamage), bold: isModified }, ...(times > 1 ? [{ text: ` x${times}` }] : []), { text: ' EP damage.' }]);
      } else if (effect.kind === 'hpDamage' && effect.target === 'player' && amount > 0) {
        lines.push(ja
          ? [{ text: '自身のHPに' }, { text: String(amount) }, ...(times > 1 ? [{ text: ` x${times}` }] : []), { text: 'ダメージ。' }]
          : [{ text: 'Take ' }, { text: String(amount) }, ...(times > 1 ? [{ text: ` x${times}` }] : []), { text: ' HP damage.' }]);
      } else if (effect.kind === 'block' && effect.target === 'player' && amount > 0) {
        lines.push(ja
          ? [{ text: 'ブロック', term: 'block' }, { text: 'を' }, { text: String(amount) }, { text: '得る。' }]
          : [{ text: `Gain ${amount} ` }, { text: 'block', term: 'block' }, { text: '.' }]);
      } else if (effect.kind === 'status' && effect.status && (effect.stacks ?? amount) > 0) {
        lines.push(ja
          ? [{ text: this.statusDisplayName(effect.status), term: effect.status }, { text: (effect.stacks ?? amount) > 1 ? ` x${effect.stacks ?? amount}` : '' }, { text: 'を付与。' }]
          : [{ text: 'Apply ' }, { text: this.statusDisplayName(effect.status), term: effect.status }, { text: `${(effect.stacks ?? amount) > 1 ? ` x${effect.stacks ?? amount}` : ''}.` }]);
      } else if (effect.kind === 'hpHeal' && amount > 0) {
        lines.push(ja ? [{ text: 'HPを' }, { text: String(amount) }, { text: '回復。' }] : [{ text: `Heal ${amount} HP.` }]);
      } else if (effect.kind === 'epHeal' && amount > 0) {
        const effectiveHeal = Math.min(this.player.ep, amount);
        lines.push(ja ? [{ text: 'EPを' }, { text: String(effectiveHeal) }, { text: '回復。' }] : [{ text: `Recover ${effectiveHeal} EP.` }]);
      } else if (effect.kind === 'setEp' && effect.target === 'player') {
        lines.push(ja ? [{ text: 'EPを' }, { text: String(amount) }, { text: 'にする。' }] : [{ text: `Set EP to ${amount}.` }]);
      } else if (effect.kind === 'setEpRatio' && effect.target === 'player') {
        const ratio = Number((Phaser.Math.Clamp(effect.amount, 0, 1) * 100).toFixed(2));
        const base = localize(this.epRatioBase(effect).name);
        lines.push([{ text: ja ? `EPを${base}の${ratio}%にする。` : `Set EP to ${ratio}% of ${base}.` }]);
      } else if (effect.kind === 'setEpReserve' && effect.target === 'player') {
        lines.push([{ text: ja ? `EPリセット下限を${amount}にする。` : `Set EP reserve to ${amount}.` }]);
      } else if (effect.kind === 'setEpReserveRatio' && effect.target === 'player') {
        const ratio = Number((Phaser.Math.Clamp(effect.amount, 0, 1) * 100).toFixed(2));
        const base = localize(this.epRatioBase(effect).name);
        lines.push([{ text: ja ? `EPリセット下限を${base}の${ratio}%にする。` : `Set EP reserve to ${ratio}% of ${base}.` }]);
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
      const relatedIntrusionPart = definition.relatedIntrusionPart
        ? localize(definition.relatedIntrusionPart, SETTINGS_STATE.language)
        : undefined;
      lines.push([{
        text: definition.id === 'pullout'
          ? (ja ? `成功時、${relatedIntrusionPart ?? definition.purgeTargetName}を引き抜く。` : `On success, pull out ${relatedIntrusionPart ?? definition.purgeTargetName}.`)
          : (ja ? `成功時、${relatedIntrusionPart ?? definition.purgeTargetName}を排出。` : `On success, purge ${relatedIntrusionPart ?? definition.purgeTargetName}.`),
      }]);
    }

    return { lines: lines.length > 0 ? lines : [cardDescriptionSegments(definition)] };
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

    if (effect.kind === 'epDamage' && effect.target === 'player') {
      return effect.amount;
    }

    return Math.ceil(effect.amount);
  }

  private cardPreviewEffectTimes(definition: CardDefinition, effect: EffectDefinition): number {
    const baseTimes = Math.max(1, effect.times ?? 1);
    if (
      definition.id === 'cowgirlRiding'
      && effect.kind === 'epDamage'
      && (effect.target === 'player' || this.isEnemyTargetEffect(effect))
    ) {
      return baseTimes * Math.max(1, this.cowgirlInsertedTargets().length);
    }

    return baseTimes;
  }

  private renderCardEffectText(container: Phaser.GameObjects.Container, lines: CardEffectLine[]): void {
    renderCardText(this, container, lines.map((line) => line.map((segment) => ({
      ...segment, text: this.localizeDisplayText(segment.text),
    }))), this.logColor('status'));
  }

  private updateCardEffectTexts(): void {
    this.cardViews.forEach((view) => {
      view.nameText.setText(this.localizeDisplayText(this.cardDisplayName(view.card.definition)));
      fitCardName(view.nameText);
      view.container.getData('refreshCardLabels')?.();
      const renderedEffect = this.cardEffectDisplay(view.card.definition);
      this.renderCardEffectText(view.effectText, renderedEffect.lines);
    });
  }

  private rejectCardPlay(container: Phaser.GameObjects.Container, reason: 'energy' | 'bound' | 'craving' | 'condition'): void {
    const event = reason === 'energy'
      ? FLAVOR_EVENTS.Card.RejectEnergy
      : reason === 'bound'
        ? FLAVOR_EVENTS.Card.RejectBound
        : reason === 'craving'
          ? FLAVOR_EVENTS.Card.RejectCraving
          : FLAVOR_EVENTS.Card.RejectCondition;
    this.addGlobalFlavorEvent(event, { source: 'card', actor: this.player });
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
    this.deferCardPreviewUpdates = true;
    this.hoveredCardUid = undefined;
    this.hideStatusTooltip();
    this.markCardExiting(card.uid);
    const playedCard = this.deck.removeFromHand(card.uid);
    if (!playedCard) {
      this.exitingCardUids.delete(card.uid);
      view.ready = true;
      view.hitArea.setInteractive({ useHandCursor: true });
      this.deferCardPreviewUpdates = false;
      this.isAnimating = false;
      this.updateHud();
      return;
    }
    // Track every successful use, including cards with no registered portrait.
    this.lastPortraitCardId = card.definition.id;
    this.refreshPlayerPortrait();
    void this.renderHand();
    this.player.energy -= card.definition.cost;
    this.cardsPlayedThisTurn += 1;
    this.updateHud();
    this.refreshHandCardUsabilities();
    hitArea.disableInteractive();
    container.setDepth(2000);

    const targetsEnemy = this.targetsEnemy(card.definition);
    const targetEnemy = targetsEnemy ? this.cardPrimaryTargetEnemy(card.definition, this.enemy) : undefined;
    // Keep the card below the battle log and clear of the enemy during long effects.
    const rest = { x: 640, y: 610, scale: 0.86, angle: 0 };
    const resolveEffect = () => {
      void this.applyCardEffect(card, targetEnemy).then(() => {
        if (this.isGameOver) {
          this.deferCardPreviewUpdates = false;
          this.updateHud();
          return;
        }

        if (card.definition.vanish || card.definition.temporary) {
          this.animateCardVanish(container, () => {
            this.removeExitingCard(card.uid);
            this.deferCardPreviewUpdates = false;
            this.isAnimating = false;
            this.updateHud();
            this.addPlayerActionReadySpacing();
          });
          return;
        }

        this.deck.addToDiscard(playedCard);
        const discardDelay = targetsEnemy ? 0 : 180;
        this.time.delayedCall(discardDelay, () => this.animateCardToDiscard(container, () => {
          this.removeExitingCard(card.uid);
          this.deferCardPreviewUpdates = false;
          this.isAnimating = false;
          this.updateHud();
          this.addPlayerActionReadySpacing();
        }));
      });
    };
    if (targetsEnemy && targetEnemy) {
      flyCard(this, container, {
        x:this.enemyEffectX(targetEnemy),y:this.enemyEffectY(targetEnemy)+48,scale:0.7,angle:7,
      }, {
        duration:250,arc:45,onComplete:() => {
          cardBurst(this, container.x, container.y, this.cardColor(card.definition), 1990);
          flyCard(this, container, rest, {duration:180,arc:0,onComplete:resolveEffect});
        },
      });
    } else {
      flyCard(this, container, rest, {duration:240,arc:15,onComplete:() => {
        cardBurst(this, container.x, container.y, this.cardColor(card.definition), 1990);
        resolveEffect();
      }});
    }
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
    const enemy = this.counterCardTargetEnemy(definition) ?? targetEnemy ?? this.enemy;
    const cardContext = this.battleEventContext({
      source: 'card',
      sourceName: localize(this.cardDisplayName(definition, enemy)),
      sourceId: definition.id,
      actor: this.player,
      selectedEnemy: enemy,
      triggerEnemy: definition.purgeTargetName ? enemy : undefined,
      card: definition,
      status: definition.purgeStatus,
      purgeWillCauseEpPeak: definition.purgeStatus ? this.cardWillCausePlayerEpPeak(definition) : undefined,
      flavorValues: {
        cardDisplayName: this.cardDisplayName(definition, enemy),
      },
    });
    const result: EffectExecutionResult = {
      messages: [],
      causedPlayerEpPeak: false,
      damagedEnemies: new Map(),
    };
    await this.runEnemyReactionsForCardSelfEpDamageTiming(definition, cardContext, result, 'beforePlayerSelfEpDamage');
    this.addFlavorEvent(definition.flavors, FLAVOR_EVENTS.Card.Play, cardContext);
    this.isResolvingCardEffects = true;
    this.promotedFrustratedToCravingDuringCurrentCard = false;
    try {
      this.mergeEffectExecutionResult(result, await this.executeEffects(this.cardEffectsInExecutionOrder(definition), cardContext));
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

    const defeatedEnemies = [...result.damagedEnemies.keys()].filter((damagedEnemy) => damagedEnemy.isDefeated);
    for (const defeatedEnemy of defeatedEnemies) {
      await this.defeatEnemy(defeatedEnemy);
    }
  }

  private counterCardTargetEnemy(definition: CardDefinition): Enemy | undefined {
    if (!definition.purgeTargetName) {
      return undefined;
    }

    return this.enemyViews.find((view) => view.displayName === definition.purgeTargetName)?.enemy;
  }

  private cardPrimaryTargetEnemy(definition: CardDefinition, fallback?: Enemy): Enemy | undefined {
    if (definition.id === 'cowgirlRiding') {
      return this.cowgirlInsertedTargets()[0] ?? fallback;
    }

    return this.counterCardTargetEnemy(definition) ?? fallback;
  }

  private async runEnemyReactionsForCardSelfEpDamageTiming(
    definition: CardDefinition,
    context: BattleEventContext,
    result: EffectExecutionResult,
    timing: EnemyReactionRule['timing'],
  ): Promise<void> {
    for (const effect of this.cardEffectsInExecutionOrder(definition)) {
      if (effect.kind !== 'epDamage' || effect.target !== 'player') {
        continue;
      }

      const rawAmount = this.effectAmountForContext(effect, this.player, context);
      const epDamageParts = this.resolvePlayerEpDamageParts(effect, context);
      await this.runEnemyReactionsForPlayerSelfEpDamage(effect, rawAmount, epDamageParts, context, result, timing);
    }
  }

  private cardWillCausePlayerEpPeak(definition: CardDefinition): boolean {
    let totalEpDamage = 0;
    const context = this.battleEventContext({
      source: 'card',
      sourceName: localize(definition.name),
      sourceId: definition.id,
      actor: this.player,
      card: definition,
      status: definition.purgeStatus,
    });

    for (const effect of this.cardEffectsInExecutionOrder(definition)) {
      if (effect.kind !== 'epDamage' || effect.target !== 'player') {
        continue;
      }

      const rawAmount = this.cardPreviewEffectAmount(definition, effect);
      const repeatCount = this.effectRepeatCount(effect, context);
      for (let repeat = 0; repeat < repeatCount; repeat += 1) {
        const repeatContext = this.effectRepeatContext(effect, context, repeat);
        const parts = this.resolvePlayerEpDamageParts(effect, repeatContext);
        totalEpDamage += this.modifiedPlayerEpDamageForCard(definition, rawAmount, parts);
      }
    }

    return totalEpDamage >= Math.max(0, this.playerEffectiveMaxEp() - this.player.ep);
  }

  private cardEffectsInExecutionOrder(definition: CardDefinition): EffectDefinition[] {
    return this.effectsByPriority(definition.effects, (effect) => {
      if (effect.kind === 'setEp' || effect.kind === 'setEpRatio') {
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
      const statusMessages = await this.runStatusTriggersForTiming(EFFECT_TIMINGS.PurgePlayed, {
        triggerEnemy: targetView.enemy,
        statusOwner: targetView.enemy,
        status: definition.purgeStatus,
        purgeCausedEpPeak: true,
      });
      messages.push(...statusMessages);
      this.showMissEffect(this.enemyEffectX(targetView.enemy), this.enemyEffectY(targetView.enemy));
      this.addGlobalFlavorEvent(FLAVOR_EVENTS.Card.PurgeFailed, {
        source: 'card',
        sourceName: localize(definition.name),
        actor: this.player,
        selectedEnemy: targetView.enemy,
        triggerEnemy: targetView.enemy,
        card: definition,
        flavorValues: { card: definition.name },
      });
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

    this.addEnemyEpPeakLog(enemy);
    await this.runEnemyEpPeakHooks({ triggerEnemy: enemy });
    await this.resolveMaleEnemyPeakAftershocks(enemy);
    this.enemyEpPeakBarOverride = true;
    enemy.resetEpAfterPeak();
    this.updateHud();
    this.setEpFillImmediate(view.bars, enemy.ep, enemy.maxEp);
    this.enemyEpPeakBarOverride = false;
  }

  private addEnemyEpPeakLog(enemy: Enemy): void {
    this.addGlobalFlavorEvent(FLAVOR_EVENTS.Battle.EnemyEpPeak, {
      source: 'system',
      actor: this.player,
      target: enemy,
      selectedEnemy: enemy,
      triggerEnemy: enemy,
    });
  }

  private async resolveMaleEnemyPeakAftershocks(enemy: Enemy): Promise<void> {
    if (enemy.isDefeated || !this.isMaleNonSexToyEnemy(enemy)) {
      return;
    }

    if (enemy.hasStatus('Charm')) {
      enemy.clearPeakAftershocksIntent();
      return;
    }

    const context = this.battleEventContext({
      source: 'enemyIntent',
      sourceName: localize(ENEMY_PEAK_AFTERSHOCKS_INTENT.label),
      actor: enemy,
      target: enemy,
      selectedEnemy: enemy,
      triggerEnemy: enemy,
      intent: ENEMY_PEAK_AFTERSHOCKS_INTENT,
    });

    if (enemy.hasPeakAftershocksIntent()) {
      enemy.clearPeakAftershocksIntent();
      this.addFlavorEvent(
        ENEMY_PEAK_AFTERSHOCKS_INTENT.flavors,
        FLAVOR_EVENTS.Enemy.PeakAftershocksOverload,
        context,
      );
      await this.applyStatusToCombatantWithTriggers(enemy, 'Charm', 1, context);
      return;
    }

    enemy.setPeakAftershocksIntent(ENEMY_PEAK_AFTERSHOCKS_INTENT);
  }

  private isMaleNonSexToyEnemy(enemy: Enemy): boolean {
    const traits = enemy.definition.traits ?? [];
    return traits.includes('male') && !traits.includes('sexToy');
  }

  private async runEnemyEpPeakHooks(context: Partial<BattleEventContext>): Promise<string[]> {
    const messages: string[] = [];

    const previousDrains = this.enemyPeakDrains;
    const drains: { enemy: Enemy; animation: Promise<void> }[] = [];
    this.enemyPeakDrains = this.tutorialTips?.hasEvent('enemyPeakDrain') ? drains : undefined;
    this.beginHpDrainLogBatch();
    try {
      for (const entry of this.relicTriggersForTiming(EFFECT_TIMINGS.EnemyEpPeak)) {
        messages.push(...await this.applyRelicTriggerEffects(entry, this.battleEventContext({
          ...context,
          source: 'relic',
          sourceName: localize(entry.relic.name),
          actor: this.player,
          relic: entry.relic,
        })));
      }
    } finally {
      this.flushHpDrainLogBatch();
      this.enemyPeakDrains = previousDrains;
    }
    if (drains.length) {
      await Promise.all(drains.map(drain => drain.animation));
      const index = this.enemyViews.findIndex(view => view.enemy === drains[0].enemy);
      if (index >= 0 && this.sys.isActive() && !this.isGameOver) await this.tutorialTips?.showEvent('enemyPeakDrain', index);
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
    const rule = effect.epDamagePartRules?.find(rule => evaluateConditions(rule.conditions, context));
    if (rule) return this.normalizedEpDamageParts(rule.parts);
    if (context.card?.id === 'cowgirlRiding' && effect.kind === 'epDamage' && effect.target === 'player') {
      const repeatPart = context.flavorValues?.cowgirlEpDamagePart;
      if (typeof repeatPart === 'string' && EP_DAMAGE_PARTS.includes(repeatPart as EpDamagePart)) {
        return [repeatPart as EpDamagePart];
      }

      const insertedParts = this.cowgirlInsertedParts();
      if (insertedParts.length > 0) {
        return insertedParts;
      }
    }

    if (effect.epDamagePartMode === 'lastPlayerEpDamageParts') {
      return [...this.player.lastEpDamageParts];
    }

    if (effect.epDamagePartMode === 'actorIntruded') {
      if (context.actor instanceof Enemy) {
        if (context.actor.hasStatus('IntrudedA') || context.actor.hasStatus('InsertA')) {
          return ['A'];
        }
        if (context.actor.hasStatus('IntrudedV') || context.actor.hasStatus('InsertV')) {
          return ['V'];
        }

        if (context.actor.hasStatus('IntrudedM') || context.actor.hasStatus('InsertM')) {
          return ['M'];
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
    const override = receivedEpDamage(this.player, amount);
    let remaining = override.cause ? override.amount : this.modifiedPlayerEpDamage(amount, parts);
    let peaked = false;
    let flashCount = this.playerEpPeakNextFlashCount;
    let oneFlashPeaksInDamage = 0;
    let regularPeaksInDamage = 0;
    let loggedOneFlashPeakInDamage = false;
    let continuousPeakCount = 0;
    let continuousPeakSpeed = 1;
    let pendingContinuousStepDuration: number | undefined;
    let continuousHooksRun = false;
    let stopContinuousFlash: (() => void) | undefined;
    const runContinuousHooksIfNeeded = async () => {
      if (continuousHooksRun || continuousPeakCount <= 0) {
        return;
      }

      continuousHooksRun = true;
      await this.runContinuousPlayerEpPeakFinalHooks(continuousPeakCount);
    };

    try {
      while (remaining > 0) {
        const maxEp = this.playerEffectiveMaxEp();
        const damageToMax = Math.min(remaining, maxEp - this.player.ep);
        if (damageToMax > 0) {
          this.player.ep = Math.min(maxEp, this.player.ep + damageToMax);
          remaining -= damageToMax;
          await this.recordPlayerEpDamage(damageToMax, parts, this.player.ep >= maxEp, context);
          const willResolveContinuousPeak =
            this.player.ep >= maxEp
            && flashCount <= 1
            && oneFlashPeaksInDamage >= EP_PEAK_CONTINUOUS_ONE_FLASH_THRESHOLD;
          pendingContinuousStepDuration = willResolveContinuousPeak
            ? this.continuousPeakStepDuration(continuousPeakSpeed)
            : undefined;
          if (stopContinuousFlash) {
            this.playerEpPeakBarOverride = true;
          }
          this.updateHud();
          if (stopContinuousFlash) {
            this.playerEpPeakBarOverride = false;
          }
          await this.animateEpFillTo(this.playerBars, this.player.ep, maxEp, 'player', pendingContinuousStepDuration ?? 320, Boolean(stopContinuousFlash));
        }

        if (this.player.ep < this.playerEffectiveMaxEp()) {
          await runContinuousHooksIfNeeded();
          return peaked;
        }

        peaked = true;
        if (flashCount <= 1 && oneFlashPeaksInDamage >= EP_PEAK_CONTINUOUS_ONE_FLASH_THRESHOLD) {
          if (continuousPeakCount === 0) {
            this.addGlobalFlavorEvent(FLAVOR_EVENTS.Battle.ContinuousPeaks, {
              source: 'system',
              actor: this.player,
            });
          }
          stopContinuousFlash ??= this.startContinuousPlayerEpPeakBarFlash();
          continuousPeakCount += 1;
          this.addGlobalFlavorEvent(FLAVOR_EVENTS.Battle.PlayerEpPeakRepeatQuote, {
            source: 'system',
            actor: this.player,
            flavorValues: { flashCount: 0 },
          });
          const continuousStepDuration = pendingContinuousStepDuration ?? this.continuousPeakStepDuration(continuousPeakSpeed);
          pendingContinuousStepDuration = undefined;
          await this.resolveContinuousPlayerEpPeak(continuousStepDuration);
          continuousPeakSpeed *= EP_PEAK_CONTINUOUS_SPEED_MULTIPLIER;
          this.playerEpPeakNextFlashCount = 1;
          if (remaining > 0) {
            await this.wait(35);
          }
          continue;
        }

        regularPeaksInDamage += 1;
        const shouldLogPlayerPeak = flashCount > 1 || !loggedOneFlashPeakInDamage;
        const shouldLogRepeatQuoteOnly = flashCount <= 1 && loggedOneFlashPeakInDamage;
        if (flashCount <= 1) {
          loggedOneFlashPeakInDamage = true;
        }
        await this.resolveRegularPlayerEpPeak(
          flashCount,
          regularPeaksInDamage,
          shouldLogPlayerPeak,
          stopContinuousFlash,
          shouldLogRepeatQuoteOnly,
        );
        oneFlashPeaksInDamage = flashCount <= 1 ? oneFlashPeaksInDamage + 1 : 0;
        this.playerEpPeakNextFlashCount = Math.min(EP_PEAK_BASE_FLASH_COUNT, flashCount + 1);
        flashCount = Math.max(1, flashCount - 1);
        if (remaining > 0) {
          await this.wait(130);
        }
      }

      await runContinuousHooksIfNeeded();
    } finally {
      stopContinuousFlash?.();
    }

    return peaked;
  }

  private continuousPeakStepDuration(speed: number): number {
    return Math.max(
      EP_PEAK_CONTINUOUS_MIN_STEP_DURATION,
      Math.round(EP_PEAK_CONTINUOUS_STEP_DURATION / speed),
    );
  }

  private async resolveRegularPlayerEpPeak(
    flashCount: number,
    peakIndexInDamage: number,
    shouldLogPlayerPeak: boolean,
    stopContinuousFlash?: () => void,
    shouldLogRepeatQuoteOnly = false,
  ): Promise<void> {
    const releasePortrait = this.beginPlayerPortraitFactor('peak');
    try {
      const portraitPulse = this.playerPortraitFlash.peak(flashCount, EP_PEAK_FLASH_CYCLE_DURATION);
      await this.registerPlayerEpPeakInCycle();
      const baseRecoveryEp = this.nextPlayerEpRecoveryValue();
      const recoveryEp = this.playerEpPeakRecoveryValueAfterReserveEffects(baseRecoveryEp);

      if (flashCount > 1) {
        const flashDuration = flashCount * EP_PEAK_FLASH_CYCLE_DURATION;
        await Promise.all([
          portraitPulse,
          this.flashEpFill(this.playerBars, flashCount),
          this.animatePlayerEpReserveTo(recoveryEp, this.playerEffectiveMaxEp(), flashDuration),
        ]);
      } else {
        await Promise.all([
          portraitPulse,
          this.animatePlayerEpReserveTo(recoveryEp, this.playerEffectiveMaxEp(), EP_PEAK_FLASH_CYCLE_DURATION),
        ]);
      }

      if (shouldLogPlayerPeak) {
        this.addPlayerEpPeakLog(flashCount, peakIndexInDamage);
      } else if (shouldLogRepeatQuoteOnly) {
        this.addPlayerEpPeakRepeatQuote(flashCount);
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
    } finally { releasePortrait(); }
  }

  private addPlayerEpPeakLog(flashCount: number, peakIndexInDamage: number): void {
    if (peakIndexInDamage === 1) {
      if (flashCount < EP_PEAK_BASE_FLASH_COUNT) {
        this.addGlobalFlavorEvent(FLAVOR_EVENTS.Battle.PlayerEpPeakAfterglow, {
          source: 'system',
          actor: this.player,
        });
      }
      this.addGlobalFlavorEvent(FLAVOR_EVENTS.Battle.PlayerEpPeakFirstQuote, { source: 'system', actor: this.player });
      this.addGlobalFlavorEvent(FLAVOR_EVENTS.Battle.PlayerEpPeakFirst, { source: 'system', actor: this.player });
      return;
    }

    const repeatContext: Partial<BattleEventContext> = {
      source: 'system',
      actor: this.player,
      flavorValues: { flashCount },
    };
    this.addPlayerEpPeakRepeatQuote(flashCount);
    this.addGlobalFlavorEvent(FLAVOR_EVENTS.Battle.PlayerEpPeakRepeat, repeatContext);
  }

  private addPlayerEpPeakRepeatQuote(flashCount: number): void {
    this.addGlobalFlavorEvent(FLAVOR_EVENTS.Battle.PlayerEpPeakRepeatQuote, {
      source: 'system',
      actor: this.player,
      flavorValues: { flashCount },
    });
  }

  private async resolveContinuousPlayerEpPeak(stepDuration: number): Promise<void> {
    const releasePortrait = this.beginPlayerPortraitFactor('peak');
    try {
      const portraitPulse = this.playerPortraitFlash.peak(1, stepDuration);
      await this.registerPlayerEpPeakInCycle();
      const baseRecoveryEp = this.nextPlayerEpRecoveryValue();
      const recoveryEp = this.playerEpPeakRecoveryValueAfterReserveEffects(baseRecoveryEp);
      await Promise.all([
        portraitPulse,
        this.animatePlayerEpReserveTo(recoveryEp, this.playerEffectiveMaxEp(), stepDuration),
      ]);
      this.playerEpPeakBarOverride = true;
      this.player.recoverFromEpPeak(recoveryEp, this.playerEffectiveMaxEp());
      this.updateHud();
      this.playerEpPeakBarOverride = false;
      await this.animateEpFillTo(this.playerBars, this.player.ep, this.playerEffectiveMaxEp(), 'player', stepDuration, true);
    } finally { releasePortrait(); }
  }

  private async runContinuousPlayerEpPeakFinalHooks(continuousPeakCount: number): Promise<void> {
    this.prepareArousalStatusForPlayerEpPeak();
    await this.applyContinuousPlayerEpPeakHpDamage(continuousPeakCount);
    await this.runStatusTriggersForTiming(EFFECT_TIMINGS.PlayerEpPeak, { player: this.player }, {
      skipEffectKinds: new Set<EffectDefinition['kind']>(['hpDamage', 'epReserveHeal']),
    });
    await this.runPlayerEpPeakHooks();
    await this.runStatusTriggersForTiming(EFFECT_TIMINGS.PlayerEpPeakRecovered, { player: this.player });
  }

  private async applyContinuousPlayerEpPeakHpDamage(continuousPeakCount: number): Promise<void> {
    const perPeakDamage = this.continuousPlayerEpPeakHpDamagePerPeak();
    if (perPeakDamage <= 0 || continuousPeakCount <= 0) {
      return;
    }

    const damage = Math.min(perPeakDamage * continuousPeakCount, perPeakDamage * 10);
    const result: EffectExecutionResult = {
      messages: [],
      causedPlayerEpPeak: false,
      damagedEnemies: new Map(),
    };
    await this.applyEffectHpDamage({
      kind: 'hpDamage',
      target: 'player',
      amount: damage,
      times: 1,
      attackAttribute: 'love',
    }, this.player, damage, this.battleEventContext({
      source: 'system',
      sourceName: 'ContinuousPeaks',
      actor: this.player,
    }), result);
  }

  private continuousPlayerEpPeakHpDamagePerPeak(): number {
    return this.statusTriggersForTiming(EFFECT_TIMINGS.PlayerEpPeak, { player: this.player }).reduce((sum, entry) => {
      const stacks = entry.owner.statuses.get(entry.status) ?? 0;
      if (stacks <= 0) {
        return sum;
      }

      return sum + entry.trigger.effects.reduce((effectSum, effect) => {
        if (effect.kind !== 'hpDamage' || effect.target !== 'player') {
          return effectSum;
        }
        if (effect.onlyDuringPlayerTurn && !this.isPlayerTurn) {
          return effectSum;
        }
        return effectSum + this.statusEffectAmount(effect, entry.owner, stacks);
      }, 0);
    }, 0);
  }

  private async recordPlayerEpDamage(
    amount: number,
    parts: EpDamagePart[],
    causedPeak: boolean,
    context?: BattleEventContext,
    developmentAmount = amount,
  ): Promise<void> {
    if (developmentAmount <= 0) {
      return;
    }

    this.player.recordEpDamage({
      amount,
      parts: this.normalizedEpDamageParts(parts),
      causedPeak,
      source: context?.source ?? 'system',
      sourceName: context ? this.sourceDisplayName(context) : 'System',
      sourceId: context?.sourceId,
    }, developmentAmount);

    await this.syncPlayerSensitivityStatuses(parts);
  }

  private async syncPlayerSensitivityStatuses(parts: EpDamagePart[]): Promise<void> {
    let changed = false;
    for (const part of this.normalizedEpDamageParts(parts)) {
      const currentLevel = this.currentPlayerSensitivityLevel(part);
      const nextLevel = this.sensitivityLevelForProgress(
        this.player.epPeakByPart[part] ?? 0,
        this.player.epDamageByPart[part] ?? 0,
      );
      if (nextLevel === currentLevel) {
        continue;
      }

      this.setPlayerSensitivityLevel(part, nextLevel);
      if (nextLevel > currentLevel) {
        this.addGlobalFlavorEvent(FLAVOR_EVENTS.Battle.SensitivityLevelUp, {
          source: 'system',
          actor: this.player,
          flavorValues: {
            part,
            sensitivityLevel: nextLevel,
            sensitivityAdverb: nextLevel === 1 ? '少し' : nextLevel === 2 ? '' : nextLevel === 3 ? 'だいぶ' : 'かなり',
          },
        });
        await this.wait(IMPORTANT_LOG_PAUSE_MS);
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

  private setPlayerSensitivityLevel(part: EpDamagePart, level: number): void {
    this.clearPlayerSensitivityStatusesForPart(part);
    if (level > 0) {
      this.player.statuses.set(sensitivityStatusId(part, level as SensitivityLevel), 1);
    }
  }

  private sensitivityLevelForProgress(peakCount: number, epDamage: number): number {
    let level = 0;
    Object.entries(PART_SENSITIVITY_LEVELS).forEach(([key, config]) => {
      const peakReached = peakCount >= config.requiredPeakCount;
      const damageReached = epDamage >= config.requiredEpDamage;
      if (config.conditionMode === 'and' ? peakReached && damageReached : peakReached || damageReached) {
        level = Math.max(level, Number(key));
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

  private prepareArousalStatusForPlayerEpPeak(): void {
    if (!this.promotedFrustratedToCravingDuringCurrentCard || !this.player.hasStatus('DesperateToPeak')) {
      return;
    }

    this.player.statuses.delete('DesperateToPeak');
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

  private async setPlayerEpByEffect(value: number): Promise<void> {
    this.player.ep = Phaser.Math.Clamp(value, 0, this.playerEffectiveMaxEp());
    if (this.playerEpReserveValue > this.player.ep) {
      this.setPlayerEpReserveValue(this.player.ep, this.playerEffectiveMaxEp(), true);
    }
    this.updateHud();
    await this.animateEpFillTo(this.playerBars, this.player.ep, this.playerEffectiveMaxEp(), 'player', 320);
  }

  private async registerPlayerEpPeakInCycle(): Promise<void> {
    this.playerEpPeaksThisCycle += 1;

    if (this.playerEpPeaksThisCycle >= 20) {
      if (!this.player.hasStatus('MultiplePeaksTorture')) {
        await this.applyStatusToCombatantWithTriggers(this.player, 'MultiplePeaksTorture', 1);
      }
      return;
    }

    if (this.playerEpPeaksThisCycle >= 10) {
      if (!this.player.hasStatus('PeakHell') && !this.player.hasStatus('MultiplePeaksTorture')) {
        await this.applyStatusToCombatantWithTriggers(this.player, 'PeakHell', 1);
      }
      return;
    }

    if (this.playerEpPeaksThisCycle >= 5 && !this.player.hasStatus('PeakHell') && !this.player.hasStatus('MultiplePeaksTorture')) {
      await this.applyStatusToCombatantWithTriggers(this.player, 'MultiplePeak', 1);
    }
  }

  private modifiedPlayerEpDamage(amount: number, parts: EpDamagePart[] = ['M']): number {
    return this.roundModifiedPlayerEpDamage(amount, amount * this.playerEpDamageMultiplier(parts));
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
          if (modifier.kind === 'hpDamageTakenMultiplier' && ['player', 'statusOwner'].includes(modifier.target)) {
            multiplier = Math.max(multiplier, modifier.amount);
          }
        }
      }
    }

    return multiplier;
  }

  private modifiedEnemyEpDamage(amount: number, enemy = this.enemy, includeRelics = true): number {
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
    let multiplier = 1;
    for (const [status, stacks] of enemy.statuses) {
      if (stacks <= 0) continue;
      for (const trigger of statusTriggersForTiming(status, EFFECT_TIMINGS.DamageCalculation)) {
        for (const modifier of trigger.modifiers ?? []) {
          if (modifier.kind === 'epDamageTakenMultiplier' && ['self', 'statusOwner'].includes(modifier.target)) multiplier *= modifier.amount;
        }
      }
    }
    const base = amount + (includeRelics ? passiveBonus : 0);
    return multiplier === 1 ? base : Math.ceil(base * multiplier);
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

    return this.roundModifiedPlayerEpDamage(
      amount,
      amount
      * this.epDamageMultiplierForArousal(arousalStatus)
      * this.playerNonArousalEpDamageMultiplier()
      * this.playerSensitivityEpDamageMultiplier(parts),
    );
  }

  private roundModifiedPlayerEpDamage(baseAmount: number, modifiedAmount: number): number {
    if (baseAmount <= 0 || modifiedAmount <= 0) {
      return 0;
    }

    return Number.isInteger(baseAmount)
      ? Math.ceil(modifiedAmount)
      : Math.floor(modifiedAmount);
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
      const multiplier = level > 0 ? PART_SENSITIVITY_LEVELS[level as SensitivityLevel].epDamageMultiplier : 1;
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
          if (modifier.kind === 'epDamageTakenMultiplier' && ['player', 'statusOwner'].includes(modifier.target)) {
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
      .filter((modifier) => modifier.kind === 'epDamageTakenMultiplier' && ['player', 'statusOwner'].includes(modifier.target))
      .reduce((multiplier, modifier) => Math.max(multiplier, modifier.amount), 1);
  }

  private applyStatusToCombatant(target: Player | Enemy, status: StatusEffect, stacks: number, context?: Partial<BattleEventContext>): StatusApplicationResult {
    if (stacks <= 0 || !statusTargetAllowed(target, status, target instanceof Enemy ? target : undefined)) {
      return { label: `${status} blocked`, appliedStatus: status, changed: false };
    }
    if (target instanceof Enemy && status === 'Charm' && target.definition.intents_E.length === 0) {
      this.showMissEffect(this.enemyEffectX(target), this.enemyEffectY(target));
      return { label: 'Charm miss', changed: false };
    }

    const ownerType = target instanceof Enemy ? 'enemy' : 'player';
    const definition = STATUS_DESCRIPTIONS[status];
    if (!definition?.allowedOwners.includes(ownerType)) {
      return { label: `${status} miss`, changed: false };
    }

    if (target instanceof Enemy && !this.canApplyEnemyBodyPartStatus(target, status)) {
      return { label: `${status} blocked`, appliedStatus: status, changed: false };
    }

    if (definition.applyConditions && !evaluateConditions(definition.applyConditions, this.battleEventContext({
      source: context?.source ?? 'system',
      ...context,
      actor: target,
      target,
      statusOwner: target,
    }))) {
      return { label: `${status} blocked`, appliedStatus: status, changed: false };
    }

    if (definition.durationTurns) {
      this.statusRuntime.applyDuration(target, status, this.isPlayerTurn);
      if (this.isPlayerTurn) this.statusRuntime.countActive(this.player);
      return { label: status, appliedStatus: status, changed: true };
    }

    if (definition.singleStack && target.hasStatus(status)) {
      return { label: `${status} already active`, appliedStatus: status, changed: false };
    }

    if (definition.exclusiveGroup) {
      return this.applyExclusiveStatus(target, status, definition.exclusiveGroup);
    }

    target.addStatus(status, stacks);
    return { label: stacks > 1 ? `${status} x${stacks}` : status, appliedStatus: status, changed: true };
  }

  private async applyStatusToCombatantWithTriggers(
    target: Player | Enemy,
    status: StatusEffect,
    stacks: number,
    context?: Partial<BattleEventContext>,
  ): Promise<StatusApplicationResult> {
    const beforeStatuses = new Map(target.statuses);
    const applied = this.applyStatusToCombatant(target, status, stacks, context);
    this.refreshPlayerPortrait();
    const appliedStatus = applied.appliedStatus ?? applied.upgradeTo ?? status;
    if (target instanceof Enemy && applied.changed && appliedStatus === 'Charm') {
      target.clearPeakAftershocksIntent();
    }
    const beforeStacks = beforeStatuses.get(appliedStatus) ?? 0;
    const afterStacks = target.statuses.get(appliedStatus) ?? 0;
    if (afterStacks <= beforeStacks) {
      return applied;
    }

    this.addFlavorEvent(STATUS_DESCRIPTIONS[appliedStatus]?.flavors, FLAVOR_EVENTS.Status.Apply, this.battleEventContext({
      source: context?.source ?? 'system',
      ...context,
      actor: target,
      target,
      selectedEnemy: target instanceof Enemy ? target : context?.selectedEnemy,
      triggerEnemy: target instanceof Enemy ? target : context?.triggerEnemy,
      statusOwner: target,
      status: appliedStatus,
      flavorValues: {
        ...context?.flavorValues,
        statusTargetIsPlayer: target === this.player,
        statusTargetIsEnemy: target instanceof Enemy,
      },
    }));
    await this.runStatusTriggersForTiming(EFFECT_TIMINGS.StatusApplied, {
      triggerEnemy: target instanceof Enemy ? target : undefined,
      statusOwner: target,
      status: appliedStatus,
    });
    if (target instanceof Enemy) {
      for (const [carrier, stacks] of [...this.player.statuses]) {
        if (stacks > 0 && STATUS_DESCRIPTIONS[carrier]?.spreadRule?.appliedStatuses?.includes(appliedStatus)) {
          await this.applyStatusToCombatantWithTriggers(target, carrier, 1, context);
        }
      }
    }
    await this.addStatusApplicationLog(context, target, status, applied, beforeStatuses);
    this.playStatusAppliedMotion(target, appliedStatus, context);
    this.syncPlayerFaintedPose(true);
    return applied;
  }

  private async addStatusApplicationLog(
    context: Partial<BattleEventContext> | undefined,
    target: Player | Enemy,
    requestedStatus: StatusEffect,
    applied: StatusApplicationResult,
    beforeStatuses: ReadonlyMap<StatusEffect, number>,
  ): Promise<void> {
    if (!this.shouldLogStatusApplication(applied)) {
      return;
    }

    const eventContext = this.battleEventContext({
      source: context?.source ?? 'system',
      ...context,
    });
    const displayStatus = applied.appliedStatus ?? applied.upgradeTo ?? requestedStatus;
    if (this.statusApplicationCoveredByRemovalTransition(displayStatus, beforeStatuses)) {
      return;
    }

    const kind = statusNoticeKind(applied.upgradeFrom, displayStatus);
    this.addStatusApplicationFlavorEvent(eventContext, target, requestedStatus, applied);
    if (kind === 'important') {
      await this.wait(IMPORTANT_LOG_PAUSE_MS);
    }
  }

  private async consumeStatusWithNotice(target: Player | Enemy, status: StatusEffect, stacks = 1): Promise<void> {
    const before = new Map(target.statuses);
    target.consumeStatus(status, stacks);
    if (statusNoticeKind(status) === 'important') await this.notifyAutomaticStatusChanges(target, before);
  }

  private async notifyAutomaticStatusChanges(target: Player | Enemy, before: ReadonlyMap<StatusEffect, number>): Promise<void> {
    const changes = statusChanges(before, target.statuses);
    if (changes.length === 0) return;
    this.updateHud();
    this.syncPlayerFaintedPose(true);
    this.refreshHandCardUsabilities();
    for (const { from, to } of changes) {
      const status = from ?? to!;
      const context = this.battleEventContext({
        source: 'status', sourceName: this.statusDisplayName(status),
        actor: target, target, statusOwner: target, status,
      });
      if (to) {
        await this.addStatusApplicationLog(context, target, to, {
          label: to, appliedStatus: to, changed: true,
          upgradeFrom: from, upgradeTo: from ? to : undefined,
        }, before);
        this.playStatusAppliedMotion(target, to, context);
      } else if (from) {
        this.addStatusRemovalFlavorEvent(context, makeEffect('removeStatus', 'self', 0, { status: from }), from);
        this.playStatusRemovedMotion(target, from, context);
        if (statusNoticeKind(from) === 'important') await this.wait(IMPORTANT_LOG_PAUSE_MS);
      }
    }
  }

  private statusApplicationLogKind(status: StatusEffect): BattleLogKind {
    return statusNoticeKind(status);
  }

  private isIntrudedStatus(status: StatusEffect): boolean {
    return status === 'IntrudedA'
      || status === 'IntrudedV'
      || status === 'IntrudedM'
      || status === 'InsertA'
      || status === 'InsertV'
      || status === 'InsertM';
  }

  private isInfestedStatus(status: StatusEffect): boolean {
    return status === 'InfestedA_Slime' || status === 'InfestedV_Slime';
  }

  private canApplyEnemyBodyPartStatus(target: Enemy, status: StatusEffect): boolean {
    const bodyPartStatus = this.enemyBodyPartStatus(status);
    if (!bodyPartStatus) {
      return true;
    }

    if (bodyPartStatus.kind === 'insert') {
      return !this.enemyHasBodyPartStatus(bodyPartStatus.part, ['insert', 'intruded']);
    }

    return !this.enemyHasBodyPartStatus(bodyPartStatus.part, ['insert']);
  }

  private enemyHasBodyPartStatus(part: EpDamagePart, kinds: ('insert' | 'intruded')[], exceptEnemy?: Enemy): boolean {
    return this.enemies.some((enemy) => (
      enemy !== exceptEnemy
      && !enemy.isDefeated
      && kinds.some((kind) => {
        const status = this.bodyPartStatusForKind(part, kind);
        return Boolean(status && enemy.hasStatus(status));
      })
    ));
  }

  private enemyBodyPartStatus(status: StatusEffect): { part: EpDamagePart; kind: 'insert' | 'intruded' } | undefined {
    if (status === 'InsertA') return { part: 'A', kind: 'insert' };
    if (status === 'InsertV') return { part: 'V', kind: 'insert' };
    if (status === 'InsertM') return { part: 'M', kind: 'insert' };
    if (status === 'IntrudedA') return { part: 'A', kind: 'intruded' };
    if (status === 'IntrudedV') return { part: 'V', kind: 'intruded' };
    if (status === 'IntrudedM') return { part: 'M', kind: 'intruded' };
    return undefined;
  }

  private bodyPartStatusForKind(part: EpDamagePart, kind: 'insert' | 'intruded'): StatusEffect | undefined {
    if (kind === 'insert') {
      if (part === 'A') return 'InsertA';
      if (part === 'V') return 'InsertV';
      if (part === 'M') return 'InsertM';
      return undefined;
    }

    if (part === 'A') return 'IntrudedA';
    if (part === 'V') return 'IntrudedV';
    if (part === 'M') return 'IntrudedM';
    return undefined;
  }

  private statusApplicationCoveredByRemovalTransition(
    appliedStatus: StatusEffect,
    beforeStatuses: ReadonlyMap<StatusEffect, number>,
  ): boolean {
    return Object.entries(STATUS_REMOVAL_TRANSITIONS).some(([fromStatus, toStatus]) => (
      toStatus === appliedStatus && (beforeStatuses.get(fromStatus as StatusEffect) ?? 0) > 0
    ));
  }

  private isArousalStatus(status: StatusEffect): boolean {
    return STATUS_DESCRIPTIONS[status]?.exclusiveGroup === 'arousal';
  }

  private applyExclusiveStatus(target: Player | Enemy, status: StatusEffect, group: string): StatusApplicationResult {
    const currentStatus = this.highestStatusInGroup(target, group);
    const nextStatus = this.nextStatusForGroup(currentStatus, status, group);
    if (currentStatus === nextStatus) {
      return {
        label: `${nextStatus} already active`,
        appliedStatus: nextStatus,
        changed: false,
      };
    }

    if (
      target === this.player
      && group === 'arousal'
      && this.isResolvingCardEffects
      && currentStatus === 'Frustrated'
      && nextStatus === 'DesperateToPeak'
    ) {
      this.promotedFrustratedToCravingDuringCurrentCard = true;
    }

    for (const [candidate, definition] of Object.entries(STATUS_DESCRIPTIONS) as [StatusEffect, StatusDefinition][]) {
      if (definition.exclusiveGroup === group) {
        target.statuses.delete(candidate);
      }
    }
    target.addStatus(nextStatus);
    return {
      label: nextStatus,
      appliedStatus: nextStatus,
      upgradeFrom: currentStatus && currentStatus !== nextStatus ? currentStatus : undefined,
      upgradeTo: currentStatus && currentStatus !== nextStatus ? nextStatus : undefined,
      changed: true,
    };
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
    if (!this.canEndTurn || this.isAnimating || this.isGameOver || this.tutorialTips?.active) {
      return;
    }

    this.isAnimating = true;
    this.isPlayerTurn = false;
    this.setTurnOverlayColor('enemy');
    this.setEndTurnEnabled(false);
    this.addBattleLogSpacing(0.5);
    this.addGlobalFlavorEvent(FLAVOR_EVENTS.Battle.EnemyTurnStart, { source: 'system', actor: this.player });

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

    for (const [index, view] of actingViews.entries()) {
      if (index > 0) {
        this.addBattleLogSpacing(0.5);
      }

      this.selectEnemyByEnemy(view.enemy);
      const intent = this.enemy.currentIntent(this.player, this.enemies);
      view.displayedIntent = intent;
      this.updateEnemySprite(view);
      this.updateEnemyClickArea(view);
      const actingEnemy = this.enemy;
      const intentContext = this.battleEventContext({
        source: 'enemyIntent',
        sourceName: this.combatantDisplayName(actingEnemy),
        sourceId: actingEnemy.definition.id,
        actor: actingEnemy,
        selectedEnemy: actingEnemy,
        intent,
        intentKey: intent.intentKey,
      });
      const addedFlavorKinds = this.addFlavorEvent(intent.flavors, FLAVOR_EVENTS.Enemy.Intent, intentContext);
      if (!addedFlavorKinds.has('narration')) {
        this.addGlobalFlavorEvent(FLAVOR_EVENTS.Enemy.IntentFallback, {
          ...intentContext,
          target: this.player,
          flavorValues: { intent: intent.label },
        });
      }
      this.deferEnemyIntentPreviewUpdates = true;
      const intentChancePassed = this.enemyIntentChancePassed(intent, intentContext);
      if (intent.chance !== undefined) {
        this.addFlavorEvent(intent.flavors, intentChancePassed ? FLAVOR_EVENTS.Effect.ChanceSuccess : FLAVOR_EVENTS.Effect.ChanceFailure, intentContext);
      }
      if (intentChancePassed) {
        await this.executeEffects(this.enemyIntentEffectsInExecutionOrder(intent.effects), intentContext);
      } else {
        this.addGlobalFlavorEvent(FLAVOR_EVENTS.Enemy.IntentFailed, {
          ...intentContext,
          target: this.player,
          flavorValues: { intent: intent.label },
        });
      }

      if (intent.causedByStatus && this.enemy.hasStatus(intent.causedByStatus) && this.statusConsumesEachTurn(intent.causedByStatus)) {
        await this.consumeStatusWithNotice(this.enemy, intent.causedByStatus);
      }
      this.enemy.clearCharmIntent();

      const actingEnemyDefeated = this.enemy.isDefeated;
      if (!actingEnemyDefeated) {
        this.enemy.advanceIntent(intent, this.player, this.enemies);
      }
      this.deferEnemyIntentPreviewUpdates = false;
      this.updateHud();

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
    await this.startTurnCounters();
    this.setTurnOverlayColor('player');
    this.setHandInputLocked(true);
    this.addBattleLogSpacing(0.5);
    this.addGlobalFlavorEvent(FLAVOR_EVENTS.Battle.PlayerTurnStart, { source: 'system', actor: this.player });
    this.resetRecentEpPeaksIfNoAftershocksAtTurnStart();
    const beforeTurnStatuses = new Map(this.player.statuses);
    const recoveryBlocked = this.player.startTurn(false, !blocksTurnStartEpRecovery(this.player));
    await this.notifyAutomaticStatusChanges(this.player, beforeTurnStatuses);
    this.showEnergyRecoveryBlocked(recoveryBlocked);
    this.syncPlayerEpReserveAfterTurnRecovery();
    this.updateHud();
    await this.runTurnStartHooks();
    this.clearPlayerBlockAfterTurnStartHooks();
    this.addBindingIntentWarnings();
    if (!await this.runBeforeDrawEvents()) return;
    if (turnStartDrawAllowed(this.player)) await this.drawCards(5, true);
    await this.runPlayerActionStartHooks();
    this.setHandInputLocked(false);
    this.isAnimating = false;
    this.setEndTurnEnabled(true);
    this.updateHud();
    this.addPlayerActionReadySpacing();
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
    const release = this.beginPlayerPortraitFactor('HPdamage');
    void Promise.all([this.playerPortraitFlash.damage(), this.wait(550)]).finally(release);
    this.tweens.add({
      targets: this.playerArea,
      x: this.playerArea.x - 12,
      duration: 55,
      yoyo: true,
      repeat: 4,
      onComplete: () => {
        this.playerArea.setX(PLAYER_VISUAL_X);
      },
    });
  }

  private playerEpDamageMotion(context: BattleEventContext): void {
    if (this.contextHasPlayerHpDamage(context)) {
      return;
    }

    const release = this.beginPlayerPortraitFactor('EPdamage');
    this.sideSwayMotion(this.playerArea, PLAYER_VISUAL_X, 30, 100);
    this.time.delayedCall(370, release);
  }

  private enemyEpDamageMotion(enemy: Enemy, context: BattleEventContext): void {
    if (this.contextHasEnemyHpDamage(context, enemy)) {
      return;
    }

    const view = this.enemyViewFor(enemy);
    if (!view) {
      return;
    }

    this.sideSwayMotion(view.area, view.baseX, 24, 100);
  }

  private contextHasPlayerHpDamage(context: BattleEventContext): boolean {
    const effects = context.card?.effects ?? context.intent?.effects ?? [];
    return effects.some((effect) => effect.kind === 'hpDamage'
      && effect.amount > 0
      && (effect.target === 'player' || (effect.target === 'self' && context.actor === this.player)));
  }

  private contextHasEnemyHpDamage(context: BattleEventContext, enemy: Enemy): boolean {
    const effects = context.card?.effects ?? context.intent?.effects ?? [];
    return effects.some((effect) => effect.kind === 'hpDamage'
      && effect.amount > 0
      && (
        (effect.target === 'selectedEnemy' && context.selectedEnemy === enemy)
        || effect.target === 'allEnemies'
        || (effect.target === 'self' && context.actor === enemy)
        || (effect.target === 'triggerEnemy' && context.triggerEnemy === enemy)
      ));
  }

  private playStatusAppliedMotion(
    target: Player | Enemy,
    status: StatusEffect,
    context?: Partial<BattleEventContext>,
  ): void {
    if (status === 'Charm' && target instanceof Enemy) {
      this.playEnemyStatusSway(target);
      return;
    }

    if (this.isIntrudedStatus(status) || this.isInfestedStatus(status)) {
      this.playPairedStatusSway(target, context);
    }
  }

  private playStatusRemovedMotion(
    target: Player | Enemy,
    status: StatusEffect,
    context?: Partial<BattleEventContext>,
  ): void {
    if (this.isIntrudedStatus(status)) {
      this.playPairedStatusSway(target, context);
    }
  }

  private playPairedStatusSway(target: Player | Enemy, context?: Partial<BattleEventContext>): void {
    this.sideSwayMotion(this.playerArea, PLAYER_VISUAL_X, 20, 120);

    const enemy = target instanceof Enemy
      ? target
      : context?.triggerEnemy ?? (context?.actor instanceof Enemy ? context.actor : undefined) ?? context?.selectedEnemy;
    if (enemy) {
      this.playEnemyStatusSway(enemy);
    }
  }

  private playEnemyStatusSway(enemy: Enemy): void {
    const view = this.enemyViewFor(enemy);
    if (!view) {
      return;
    }

    this.sideSwayMotion(view.area, view.baseX, 20, 120);
  }

  private sideSwayMotion(target: Phaser.GameObjects.Components.Transform, baseX: number, distance: number, duration: number): void {
    this.tweens.killTweensOf(target);
    this.tweens.add({
      targets: target,
      x: baseX + distance,
      duration,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: target,
          x: baseX - distance,
          duration,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            this.tweens.add({
              targets: target,
              x: baseX + distance * 0.55,
              duration: Math.round(duration * 0.85),
              ease: 'Sine.easeInOut',
              onComplete: () => {
                this.tweens.add({
                  targets: target,
                  x: baseX,
                  duration: Math.round(duration * 0.85),
                  ease: 'Sine.easeOut',
                  onComplete: () => {
                    target.setX(baseX);
                    this.updateReticlePosition();
                  },
                });
              },
            });
          },
        });
      },
    });
  }

  private enemyHpAttackMotion(): void {
    const restoreAttackAnimationSpeed = this.boostEnemyAttackAnimationSpeed();
    this.tweens.add({
      targets: this.enemyArea,
      x: this.enemyArea.x - 32,
      duration: 120,
      ease: 'Sine.easeOut',
      yoyo: true,
      onComplete: () => {
        restoreAttackAnimationSpeed();
        this.enemyArea.setX(this.currentEnemyView()?.baseX ?? this.enemyArea.x);
        this.updateReticlePosition();
      },
    });
  }

  private enemyEpAttackMotion(): () => void {
    const restoreAttackAnimationSpeed = this.boostEnemyAttackAnimationSpeed();
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
    return restoreAttackAnimationSpeed;
  }

  private boostEnemyAttackAnimationSpeed(): () => void {
    const view = this.currentEnemyView();
    const body = view?.body;
    const attackTimeScale = view?.visual?.attackAnimationTimeScale;
    if (!view || !(body instanceof Phaser.GameObjects.Sprite) || attackTimeScale === undefined) {
      return () => undefined;
    }

    const enemy = view.enemy;
    const currentBoostCount = this.enemyAttackAnimationBoostCounts.get(enemy) ?? 0;
    if (currentBoostCount === 0) {
      this.enemyAttackAnimationOriginalTimeScales.set(enemy, body.anims.timeScale);
    }
    this.enemyAttackAnimationBoostCounts.set(enemy, currentBoostCount + 1);
    body.anims.timeScale = attackTimeScale;

    let restored = false;
    return () => {
      if (restored) {
        return;
      }
      restored = true;
      const boostCount = this.enemyAttackAnimationBoostCounts.get(enemy) ?? 0;
      if (boostCount > 1) {
        this.enemyAttackAnimationBoostCounts.set(enemy, boostCount - 1);
        return;
      }

      this.enemyAttackAnimationBoostCounts.delete(enemy);
      body.anims.timeScale = this.enemyAttackAnimationOriginalTimeScales.get(enemy) ?? 1;
      this.enemyAttackAnimationOriginalTimeScales.delete(enemy);
    };
  }

  private currentEnemyView(): EnemyView | undefined {
    return this.enemyViews[this.selectedEnemyIndex];
  }

  private enemyEffectX(enemy = this.enemy): number {
    const view = this.enemyViewFor(enemy) ?? this.currentEnemyView();
    return view ? view.baseX + view.effectOffsetX : 910;
  }

  private enemyEffectY(enemy = this.enemy): number {
    const view = this.enemyViewFor(enemy) ?? this.currentEnemyView();
    return view ? view.baseY + view.effectOffsetY : 300;
  }

  private enemyViewFor(enemy: Enemy): EnemyView | undefined {
    return this.enemyViews.find((view) => view.enemy === enemy);
  }

  private healingEffect(): void {
    for (let i = 0; i < 12; i += 1) {
      const x = PLAYER_EFFECT_X + Phaser.Math.Between(-85, 85);
      const y = this.playerEffectY() + Phaser.Math.Between(-70, 90);
      const cross = this.add.text(x, y, '+', {
        fontFamily: GAME_FONT,
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

  private hpDrainEffect(fromX: number, fromY: number, toX: number, toY: number): Promise<void> {
    return Promise.all(Array.from({ length: 7 }, (_, i) => new Promise<void>(resolve => {
      const plus = this.add.text(fromX + Phaser.Math.Between(-34, 34), fromY + Phaser.Math.Between(-34, 34), '+', {
        fontFamily: GAME_FONT,
        fontSize: '44px',
        fontStyle: 'bold',
        color: '#70f29a',
      });
      plus.setOrigin(0.5);
      plus.setDepth(1450);
      const finish = () => { this.events.off('shutdown', finish); plus.destroy(); resolve(); };
      this.events.once('shutdown', finish);
      this.tweens.add({
        targets: plus,
        x: toX + Phaser.Math.Between(-44, 44),
        y: toY + Phaser.Math.Between(-54, 28),
        scale: 1.35,
        alpha: 0,
        duration: 700,
        delay: i * 70,
        ease: 'Sine.easeInOut',
        onComplete: finish,
      });
    }))).then(() => {});
  }

  private legacyHpAbsorbEffect(): void {
    for (let i = 0; i < 7; i += 1) {
      const heart = this.add.text(910 + Phaser.Math.Between(-34, 34), 300 + Phaser.Math.Between(-34, 34), '♥', {
        fontFamily: GAME_FONT,
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
      let settled = false;
      const settle = () => {
        if (settled) {
          return;
        }
        settled = true;
        target.setAlpha(1);
        this.restoreCombatantBodyColor(body, restoreColor);
        resolve();
      };

      this.tweens.add({
        targets: target,
        alpha: 0.45,
        duration: EP_PEAK_FLASH_STEP_DURATION,
        yoyo: true,
        repeat: Math.max(0, flashCount - 1),
        onComplete: settle,
        onStop: settle,
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

  private protectEpFillTween(bars: HudBars): () => void {
    if (bars === this.playerBars) {
      this.playerEpFillProtectionCount += 1;
      return () => {
        this.playerEpFillProtectionCount = Math.max(0, this.playerEpFillProtectionCount - 1);
      };
    }

    this.enemyEpFillProtectionCount += 1;
    return () => {
      this.enemyEpFillProtectionCount = Math.max(0, this.enemyEpFillProtectionCount - 1);
    };
  }

  private isEpFillTweenProtected(bars: HudBars): boolean {
    return bars === this.playerBars
      ? this.playerEpPeakBarOverride || this.playerEpFillProtectionCount > 0
      : this.enemyEpPeakBarOverride || this.enemyEpFillProtectionCount > 0;
  }

  private flashEpFill(bars: HudBars, flashCount = EP_PEAK_BASE_FLASH_COUNT): Promise<void> {
    const releaseProtection = this.protectEpFillTween(bars);
    this.tweens.killTweensOf(bars.epFill);
    bars.epFill.setFillStyle(0xffd1ea);
    bars.epFill.setAlpha(1);

    return new Promise((resolve) => {
      let settled = false;
      const settle = () => {
        if (settled) {
          return;
        }
        settled = true;
        bars.epFill.setAlpha(1);
        bars.epFill.setFillStyle(EP_FILL_COLOR);
        releaseProtection();
        resolve();
      };

      this.tweens.add({
        targets: bars.epFill,
        alpha: 0.35,
        duration: EP_PEAK_FLASH_STEP_DURATION,
        yoyo: true,
        repeat: Math.max(0, flashCount - 1),
        onComplete: settle,
        onStop: settle,
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
      let settled = false;
      const settle = () => {
        if (settled) {
          return;
        }
        settled = true;
        this.setPlayerEpReserveWidth(targetWidth);
        this.playerEpReserveOverride = false;
        resolve();
      };

      this.tweens.add({
        targets: state,
        width: targetWidth,
        duration,
        ease: 'Sine.easeInOut',
        onUpdate: () => this.setPlayerEpReserveWidth(state.width),
        onComplete: settle,
        onStop: settle,
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

  private createEncounterEnemies(encounterThreat: number): Enemy[] {
    const savedDefinitions = RUN_STATE.encounterEnemyIds
      .map((id) => ENEMY_DEFINITIONS[id])
      .filter((definition): definition is EnemyDefinition => Boolean(definition));
    const definitions = savedDefinitions.length > 0 ? savedDefinitions : this.chooseEncounterEnemies(encounterThreat);
    setCurrentEncounterEnemyIds(definitions.map((definition) => definition.id));
    return definitions.map((definition) => new Enemy(definition));
  }

  private chooseEncounterEnemies(totalThreat: number): EnemyDefinition[] {
    const candidates = Object.values(ENEMY_DEFINITIONS)
      .filter((definition) => definition.stages.includes(RUN_STATE.stage) && definition.threat <= totalThreat)
      .sort((a, b) => b.threat - a.threat);
    const selected: EnemyDefinition[] = [];
    let remainingThreat = totalThreat;

    while (remainingThreat > 0) {
      const available = candidates.filter((definition) =>
        definition.threat <= remainingThreat && (selected.length === 0 || !definition.isGiant),
      );
      if (available.length === 0) {
        break;
      }

      const weighted = available.flatMap((definition) =>
        Array.from({ length: Math.max(1, definition.threat * definition.threat) }, () => definition),
      );
      const picked = Phaser.Utils.Array.GetRandom(weighted);
      if (picked.isGiant) {
        return [picked];
      }

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
      let settled = false;
      const settle = () => {
        if (settled) {
          return;
        }
        settled = true;
        if (owner === 'player') {
          this.playerEpPeakBarOverride = false;
        } else {
          this.enemyEpPeakBarOverride = false;
        }
        resolve();
      };

      this.tweens.add({
        targets: bars.epFill,
        displayWidth: BAR_WIDTH * Phaser.Math.Clamp(ep / maxEp, 0, 1),
        duration,
        ease: 'Sine.easeOut',
        onComplete: settle,
        onStop: settle,
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
    for (const [status, stacks] of [...this.player.statuses]) {
      const rule = STATUS_DESCRIPTIONS[status]?.idlePeakRule;
      if (stacks > 0 && rule && this.statusRuntime.hadNoPeaks(rule.turns)) {
        await this.applyStatusToCombatantWithTriggers(this.player, rule.status, rule.stacks, { source: 'status', status });
      }
    }
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

  private addBindingIntentWarnings(): void {
    if (this.player.hasStatus('Bound')) {
      return;
    }

    for (const view of this.enemyViews) {
      if (view.enemy.isDefeated) {
        continue;
      }

      const intent = view.enemy.currentIntent(this.player, this.enemies);
      if (!this.intentAppliesPlayerStatus(intent, 'Bound')) {
        continue;
      }

      const context = this.battleEventContext({
        source: 'enemyIntent',
        sourceName: this.combatantDisplayName(view.enemy),
        sourceId: view.enemy.definition.id,
        actor: view.enemy,
        selectedEnemy: view.enemy,
        intent,
        intentKey: intent.intentKey,
      });
      const addedKinds = this.addFlavorEvent(intent.flavors, FLAVOR_EVENTS.Enemy.IntentWarning, context);
      if (!addedKinds.has('narration')) {
        this.addGlobalFlavorEvent(FLAVOR_EVENTS.Enemy.IntentWarning, context);
      }
    }
  }

  private intentAppliesPlayerStatus(intent: EnemyIntent, status: StatusEffect): boolean {
    return intent.effects.some((effect) => effect.kind === 'status' && effect.target === 'player' && effect.status === status);
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
    const epDamageParts = this.normalizedEpDamageParts(STATUS_DESCRIPTIONS[status]?.epDamageParts);
    const relatedIntrusionPart = this.relatedIntrusionPartForEnemy(enemy);
    const intrusionPartName = relatedIntrusionPart ?? this.combatantDisplayNames(enemy);
    return {
      ...CARD_DEFINITIONS.purge,
      name: this.removalCardNameForParts(CARD_DEFINITIONS.purge, epDamageParts),
      effects: CARD_DEFINITIONS.purge.effects.map((effect) => effect.kind === 'epDamage' && effect.target === 'player'
        ? { ...effect, epDamageParts }
        : effect),
      description: l(`On success, purge ${intrusionPartName.en}. Fails if it causes EP Peak.`, `成功時、${intrusionPartName.ja}を排出する。EP Peakが発生すると失敗。`),
      relatedEnemyName: this.combatantDisplayNames(enemy),
      relatedIntrusionPart,
      purgeTargetName: targetName,
      purgeStatus: status,
      flavors: {
        ...CARD_DEFINITIONS.purge.flavors,
        [FLAVOR_EVENTS.Card.Play]: [
          ...(CARD_DEFINITIONS.purge.flavors?.[FLAVOR_EVENTS.Card.Play] ?? []),
          ...this.purgeCardPlayFlavors(status),
        ],
      },
    };
  }

  private createPulloutCardDefinitionForEnemy(enemy: Enemy, status: StatusEffect): CardDefinition {
    const view = this.enemyViewFor(enemy);
    const targetName = view?.displayName ?? localize(enemy.definition.name);
    const epDamageParts = this.normalizedEpDamageParts(STATUS_DESCRIPTIONS[status]?.epDamageParts);
    const relatedIntrusionPart = this.relatedIntrusionPartForEnemy(enemy);
    const intrusionPartName = relatedIntrusionPart ?? this.combatantDisplayNames(enemy);
    return {
      ...CARD_DEFINITIONS.pullout,
      name: this.removalCardNameForParts(CARD_DEFINITIONS.pullout, epDamageParts),
      effects: CARD_DEFINITIONS.pullout.effects.map((effect) => {
        if (effect.kind === 'epDamage' && effect.target === 'player') {
          return { ...effect, epDamageParts };
        }
        return effect;
      }),
      description: l(`On success, pull out ${intrusionPartName.en}. Fails if it causes EP Peak.`, `成功時、${intrusionPartName.ja}を引き抜く。EP Peakが発生すると失敗。`),
      relatedEnemyName: this.combatantDisplayNames(enemy),
      relatedIntrusionPart,
      purgeTargetName: targetName,
      purgeStatus: status,
      flavors: {
        ...CARD_DEFINITIONS.pullout.flavors,
        [FLAVOR_EVENTS.Card.Play]: [
          ...(CARD_DEFINITIONS.pullout.flavors?.[FLAVOR_EVENTS.Card.Play] ?? []),
          ...this.pulloutCardPlayFlavors(status),
        ],
      },
    };
  }

  private removalCardNameForParts(definition: CardDefinition, parts: EpDamagePart[]): LocalizedText {
    const suffix = parts.map(part => {
      const innerPart = `${part}I`;
      return `{default${isBodyPartToken(innerPart) ? innerPart : part}}`;
    }).join('/');
    return l(
      `${localize(definition.name, 'en')}(${suffix})`,
      `${localize(definition.name, 'ja')}(${suffix})`,
    );
  }

  private async spreadStatusesForCard(parts: EpDamagePart[], context: BattleEventContext, result: EffectExecutionResult): Promise<void> {
    for (const [status, stacks] of [...this.player.statuses]) {
      const rule = STATUS_DESCRIPTIONS[status]?.spreadRule;
      if (stacks <= 0 || !rule?.cardSelfEpDamageParts?.some(part => parts.includes(part))) continue;
      const targets = rule.cardTarget === 'allEnemies' ? this.enemies
        : rule.cardTarget === 'connectedEnemies'
          ? this.enemies.filter(enemy => ['InsertA', 'InsertV', 'InsertM', 'IntrudedA', 'IntrudedV', 'IntrudedM'].some(id => enemy.hasStatus(id as StatusEffect)))
          : rule.cardTarget === 'cardDamagedEnemies'
            ? [...result.damagedEnemies.keys()]
          : context.selectedEnemy ? [context.selectedEnemy] : [];
      for (const enemy of targets) {
        if (!enemy.isDefeated) await this.applyStatusToCombatantWithTriggers(enemy, status, 1, context);
      }
    }
  }

  private purgeCardPlayFlavors(status: StatusEffect): BattleFlavorEntry[] {
    if (status === 'IntrudedA' || status === 'IntrudedV') {
      const part = status === 'IntrudedA' ? 'A' : 'V';
      return [
        {
          conditions: [{ kind: 'purgeWillCauseEpPeak', operator: 'eq', value: false }],
          lines: [
            { kind: 'quote', text: l('"Do not Peak... slowly..."', '「Peakしちゃダメ……ゆっくり……」') },
            { kind: 'quote', text: l('"Hold it... hold it..."', '「我慢……我慢よ……」') },
          ],
        },
        {
          conditions: [{ kind: 'purgeWillCauseEpPeak', operator: 'eq', value: true }],
          lines: [
            { kind: 'quote', text: l('"There is no way... this will make me Peak..."', '「こんなの絶対無理……Peakさせられちゃう……」') },
            { kind: 'quote', text: l('"Hold it♡... I have to hold it somehow♡..."', '「我慢♡……なんとか我慢しなきゃ♡……」') },
            { kind: 'quote', text: l('"I will not let this make me Peak♡..."', '「絶対……こんなのにPeakさせられたりしないっ♡……」') },
          ],
        },
        {
          lines: [
            {
              kind: 'narration',
              text: part === 'A'
                ? l('{player} grabs {intrusionPart} inside {A} and tries to pull it out.', '{player}は{A}に入った{intrusionPart}を掴んで引きずり出そうとした。')
                : l('{player} grabs {intrusionPart} inside {V} and tries to pull it out.', '{player}は{V}に入った{intrusionPart}を掴んで引きずり出そうとした。'),
            },
          ],
        },
      ];
    }

    if (status === 'IntrudedM') {
      return [
        {
          lines: [
            { kind: 'quote', text: l('"Glk... (I cannot breathe much longer... I have to spit it out...)"', '「ごぽっ……(これ以上は息が……早く吐き出さないとっ)」') },
            { kind: 'quote', text: l('"***Ugh... gag!*** ...Get it... out of me..."', '「うっ……オ゛エッ！……ぜんぶ……出さなきゃ……っ」') },
            { kind: 'quote', text: l('"***dry-heave***... I need to... ***vomit***... everything... ***gag!*** ...Hah, ah..."', '「っ、ぅおえ……全部……吐き出さないと……っ、うぅ……はぁ、あ……」') },
            { kind: 'narration', text: l('{player} thrusts fingers deep into her throat and tries to vomit out {intrusionPart}.', '{player}は喉の奥に手を突っ込んで{intrusionPart}を吐き出そうとした。') },
          ],
        },
      ];
    }

    return [];
  }

  private pulloutCardPlayFlavors(status: StatusEffect): BattleFlavorEntry[] {
    if (status === 'InsertA' || status === 'InsertV') {
      const part = status === 'InsertA' ? 'A' : 'V';
      return [
        {
          conditions: [{ kind: 'purgeWillCauseEpPeak', operator: 'eq', value: false }],
          lines: [
            { kind: 'quote', text: l('"Steady... pull it out..."', '「落ち着いて……引き抜く……」') },
          ],
        },
        {
          conditions: [{ kind: 'purgeWillCauseEpPeak', operator: 'eq', value: true }],
          lines: [
            { kind: 'quote', text: l('"No... I might Peak before I can pull it out..."', '「だめ……引き抜く前にPeakしそう……」') },
          ],
        },
        {
          lines: [
            {
              kind: 'narration',
              text: part === 'A'
                ? l('{player} tries to pull {intrusionPart} out of {A}.', '{player}は{A}から{intrusionPart}を引き抜こうとした。')
                : l('{player} tries to pull {intrusionPart} out of {V}.', '{player}は{V}から{intrusionPart}を引き抜こうとした。'),
            },
          ],
        },
      ];
    }

    if (status === 'InsertM') {
      return [
        {
          lines: [
            { kind: 'quote', text: l('"Out... I have to get it out..."', '「抜かないと……早く……」') },
            { kind: 'narration', text: l('{player} tries to pull {intrusionPart} out of {M}.', '{player}は{M}から{intrusionPart}を引き抜こうとした。') },
          ],
        },
      ];
    }

    return [];
  }


  private createResistBindingCardDefinitionForEnemy(enemy: Enemy): CardDefinition {
    const names = this.combatantDisplayNames(enemy);
    return {
      ...CARD_DEFINITIONS.wriggleFree,
      description: l(`Try to escape ${names.en}'s binding. Gain Escaping. Temporary.`, `${names.ja}の拘束から抜け出そうとする。脱出中を得る。一時カード。`),
      relatedEnemyName: names,
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
    this.refreshPlayerPortrait();
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
    playSpriteEffect(this, DAMAGE_SPRITE_EFFECTS[attribute], x, y, amount);
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
      fontFamily: GAME_FONT,
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
      fontFamily: GAME_FONT,
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
      fontFamily: GAME_FONT,
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
          this.addEnemyDeathNarration(enemy);
          const victory = this.enemies.every((candidate) => candidate.isDefeated);
          if (victory) {
            this.time.delayedCall(1000, () => {
              this.isGameOver = true;
              this.isAnimating = true;
              this.setEndTurnEnabled(false);
              this.reticle.setVisible(false);
              this.addGlobalFlavorEvent(FLAVOR_EVENTS.Battle.Won, {
                source: 'system',
                actor: this.player,
              });
              this.addBattleLog('system', l(' ', ' '));
              this.showResult('VICTORY', 0x1f8f5f);
              this.time.delayedCall(700, () => {
                this.resultOverlay.removeAll(true);
                this.resultOverlay.setVisible(false);
                if (RUN_STATE.eventBattleId && EVENT_BATTLES[RUN_STATE.eventBattleId]?.victory === 'newGame') {
                  resetRunState();
                  this.scene.restart();
                  return;
                }
                if (!this.scene.isActive('RewardScene')) {
                  this.scene.launch('RewardScene');
                }
              });
              resolve(true);
            });
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

  private addEnemyDeathNarration(enemy: Enemy): void {
    if (this.narratedEnemyDefeats.has(enemy)) {
      return;
    }

    this.narratedEnemyDefeats.add(enemy);
    const causeContext = this.enemyDefeatCauses.get(enemy) ?? this.defaultEnemyDefeatCauseContext(enemy);
    const narration = this.enemyDeathNarration(enemy, causeContext);
    const context = {
      ...causeContext.context,
      actor: causeContext.context.actor,
      target: enemy,
      selectedEnemy: enemy,
      triggerEnemy: enemy,
      intent: causeContext.intent,
    };
    if (narration) {
      this.addBattleLog('narration', this.interpolateFlavorText(narration, context));
      return;
    }

    this.addGlobalFlavorEvent(
      causeContext.cause === 'hpDrain'
        ? FLAVOR_EVENTS.Enemy.DeathHpDrain
        : FLAVOR_EVENTS.Enemy.DeathHpDamage,
      context,
    );
  }

  private defaultEnemyDefeatCauseContext(enemy: Enemy): EnemyDefeatCauseContext {
    return {
      cause: 'hpDamage',
      context: this.battleEventContext({
        source: 'system',
        sourceName: 'System',
        actor: this.player,
        target: enemy,
        selectedEnemy: enemy,
        triggerEnemy: enemy,
      }),
      statuses: Array.from(enemy.statuses.keys()).filter((status) => enemy.hasStatus(status)),
    };
  }

  private enemyDeathNarration(enemy: Enemy, causeContext: EnemyDefeatCauseContext): LocalizedText | undefined {
    const definition = this.matchEnemyDeathNarration(enemy.definition.deathNarrations, causeContext);
    if (definition) {
      return definition.text;
    }
    return undefined;
  }

  private matchEnemyDeathNarration(
    narrations: EnemyDeathNarration[] | undefined,
    causeContext: EnemyDefeatCauseContext,
  ): EnemyDeathNarration | undefined {
    return narrations?.find((narration) => (
      narration.cause === causeContext.cause
      && this.enemyDeathNarrationStatusesMatch(narration, causeContext)
      && this.enemyDeathNarrationIntentMatches(narration, causeContext)
    ));
  }

  private enemyDeathNarrationStatusesMatch(
    narration: EnemyDeathNarration,
    causeContext: EnemyDefeatCauseContext,
  ): boolean {
    return (narration.requiredStatuses ?? []).every((status) => causeContext.statuses.includes(status));
  }

  private enemyDeathNarrationIntentMatches(
    narration: EnemyDeathNarration,
    causeContext: EnemyDefeatCauseContext,
  ): boolean {
    if (!narration.intentIds || narration.intentIds.length <= 0) {
      return true;
    }

    return Boolean(causeContext.intent?.id && narration.intentIds.includes(causeContext.intent.id));
  }

  private startContinuousPlayerEpPeakBarFlash(): () => void {
    const releaseProtection = this.protectEpFillTween(this.playerBars);
    this.tweens.killTweensOf(this.playerBars.epFill);
    this.playerBars.epFill.setFillStyle(0xffd1ea);
    this.playerBars.epFill.setAlpha(1);

    this.tweens.add({
      targets: this.playerBars.epFill,
      alpha: 0.35,
      duration: EP_PEAK_FLASH_STEP_DURATION,
      yoyo: true,
      repeat: -1,
    });

    return () => {
      this.tweens.killTweensOf(this.playerBars.epFill);
      this.playerBars.epFill.setAlpha(1);
      this.playerBars.epFill.setFillStyle(EP_FILL_COLOR);
      releaseProtection();
    };
  }

  private defeatPlayer(): void {
    const eventBattleId = RUN_STATE.eventBattleId;
    const conversationId = eventBattleId ? EVENT_BATTLES[eventBattleId]?.defeatConversations
      ?.find(rule => evaluateConditions(rule.conditions, this.battleEventContext({ source: 'system', actor: this.player })))?.conversationId : undefined;
    this.refreshPlayerPortrait();
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
        this.time.delayedCall(850, () => {
          this.scene.start('DefeatEventScene', { conversationId, eventBattleId: conversationId ? eventBattleId : undefined });
        });
      },
    });
  }

  private showResult(title: string, color: number): void {
    this.resultOverlay.removeAll(true);
    const shade = this.add.rectangle(SCREEN_CENTER_X, SCREEN_CENTER_Y, SCREEN_WIDTH, SCREEN_HEIGHT, 0x050607, 0.68);
    const banner = this.add.rectangle(640, 360, 500, 150, color, 0.94);
    banner.setStrokeStyle(4, 0xffffff, 0.75);
    const text = this.add.text(640, 360, title, {
      fontFamily: GAME_FONT,
      fontSize: '58px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    text.setOrigin(0.5);
    this.resultOverlay.add([shade, banner, text]);
    this.resultOverlay.setVisible(true);
  }

  private updateHud(): void {
    this.refreshPlayerPortrait();
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
    this.deckPileText.setText(`${this.uiText('Draw', '山札')}  ${this.deck.drawPile.length}`);
    this.handPileText.setText(`${this.uiText('Hand', '手札')}  ${this.deck.hand.length} / ${MAX_HAND_SIZE}`);
    this.discardPileText.setText(`${this.uiText('Discard', '捨て札')}  ${this.deck.discardPile.length}`);
    this.renderStatusIcons(this.playerStatusIcons, this.player.statuses);
    // Availability follows current battle state even while numerical previews are deferred.
    this.refreshHandCardUsabilities();
    if (!this.deferCardPreviewUpdates) {
      this.updateCardEffectTexts();
    }
  }

  private updateEnemyHuds(animateBars: boolean): void {
    this.enemyViews.forEach((view) => {
      view.hudText.setText(view.displayName);
      view.hudText.setVisible(!view.enemy.isDefeated);
      this.updateBars(view.bars, view.enemy.hp, view.enemy.maxHp, view.enemy.block, view.enemy.ep, view.enemy.maxEp, animateBars);
      this.setBarsVisible(view.bars, !view.enemy.isDefeated);
      this.renderStatusIcons(view.statusIcons, view.enemy.statuses, view.enemy.isDefeated);

      if (!this.deferEnemyIntentPreviewUpdates) {
        const intent = view.enemy.currentIntent(this.player, this.enemies);
        view.displayedIntent = intent;
        const renderedIntent = this.enemyIntentDisplay(intent, view.enemy);
        const intentColor = intent.effects.some(effect => effect.kind === 'epDamage' && effect.target === 'player')
          ? CRAYON_COLORS.epIntent : CRAYON_COLORS.hpIntent;
        this.renderEnemyIntentText(view.intentText, renderedIntent.segments, '#f8fafc', !view.enemy.isDefeated, intentColor, intent.intentKey ?? intent.id ?? '');
      } else {
        view.intentText.setVisible(!view.enemy.isDefeated);
      }
      this.updateEnemySprite(view);
      this.updateEnemyClickArea(view);
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
      segments.push({ text: String(hpDamage), bold: hpDamage !== rawHpDamage, color: ENEMY_INTENT_COLORS.hpDamage });
    }

    if (hpDamage > 0 && epDamagePreview.raw > 0) {
      segments.push({ text: ' / ' });
    }

    if (epDamagePreview.raw > 0) {
      segments.push({ text: String(epDamagePreview.modified), bold: epDamagePreview.modified !== epDamagePreview.raw, color: ENEMY_INTENT_COLORS.epDamage });
    }

    const selfHpDamage = this.intentEffectTotal(intent, enemy, 'hpDamage', 'self');
    const selfEpDamage = this.intentEffectTotal(intent, enemy, 'epDamage', 'self');
    if (selfHpDamage > 0 || selfEpDamage > 0) {
      segments.push({ text: ' / self ' });
      if (selfHpDamage > 0) segments.push({ text: String(selfHpDamage), color: ENEMY_INTENT_COLORS.hpDamage });
      if (selfHpDamage > 0 && selfEpDamage > 0) segments.push({ text: ' / ' });
      if (selfEpDamage > 0) segments.push({ text: String(selfEpDamage), color: ENEMY_INTENT_COLORS.epDamage });
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
    backgroundColor = CRAYON_COLORS.hpIntent,
    intentKey = '',
  ): void {
    container.setVisible(visible);
    if (!visible) {
      return;
    }

    const signature = JSON.stringify([intentKey, segments, color, backgroundColor, ENEMY_INTENT_TEXT]);
    let bg = container.getByName('intent-paint') as CrayonPatch | null;
    if (bg && container.getData('intent-paint-signature') === signature) return;
    container.setData('intent-paint-signature', signature);
    // Retain the painted surface so it can erase the previous intent while drawing the new one.
    for (const child of [...container.list]) {
      if (child !== bg) container.remove(child, true);
    }

    const textObjects = segments.map((segment) => {
      const text = this.add.text(0, 0, segment.text, {
        fontFamily: GAME_FONT,
        fontSize: /^\d+(?:\.\d+)?$/.test(segment.text) ? ENEMY_INTENT_TEXT.numberFontSize : ENEMY_INTENT_TEXT.fontSize,
        fontStyle: segment.bold ? 'bold' : 'normal',
        color: segment.color ?? color,
        stroke: Phaser.Display.Color.IntegerToColor(backgroundColor).rgba,
        strokeThickness: 3,
      });
      text.setOrigin(0, 0.5);
      return text;
    });
    const totalWidth = textObjects.reduce((sum, text) => sum + text.width, 0);
    const backgroundHeight = Math.max(38, ...textObjects.map(text => text.height + 12));
    if (bg) {
      bg.regenerate(totalWidth + 24, backgroundHeight, backgroundColor);
    } else {
      bg = new CrayonPatch(this, 0, 0, totalWidth + 24, backgroundHeight, backgroundColor);
      bg.setName('intent-paint').setOrigin(0.5);
      container.add(bg);
    }

    let x = -totalWidth / 2;
    textObjects.forEach((text) => {
      text.setX(x);
      x += text.width;
    });

    container.add(textObjects);
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

    if (this.isEpFillTweenProtected(bars)) {
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

  private addBattleLogSpacing(spacing: number): void {
    const lastEntry = this.battleLogs[this.battleLogs.length - 1];
    if (lastEntry?.spacing && lastEntry.spacing > 0) {
      return;
    }

    this.pushBattleLog('system', l('', ''), spacing);
  }

  private addPlayerActionReadySpacing(): void {
    if (!this.isPlayerTurn || this.isGameOver || this.isAnimating || this.handInputLocked || this.isModalOpen()) {
      return;
    }

    this.addBattleLogSpacing(0.5);
    this.tutorialTips?.check();
  }

  private addBattleLog(kind: BattleLogKind, text: LocalizedText): number {
    return this.pushBattleLog(kind, text);
  }

  private pushBattleLog(kind: BattleLogKind, text: LocalizedText, spacing?: number): number {
    const entryId = this.nextBattleLogId;
    this.battleLogs.push({ id: entryId, kind, text, spacing });
    this.nextBattleLogId += 1;
    RUN_STATE.battleLogs = this.battleLogs;
    RUN_STATE.nextBattleLogId = this.nextBattleLogId;
    if (this.battleLogs.length > 160) {
      this.battleLogs.splice(0, this.battleLogs.length - 160);
    }
    RUN_STATE.nextBattleLogId = this.nextBattleLogId;
    this.logScrollOffset = 0;
    this.renderBattleLog();
    if (kind === 'important') {
      this.pulseBattleLogEntry(entryId);
    }
    return entryId;
  }

  private addBattleLogs(entries?: BattleFlavorEntry[], context?: Partial<BattleEventContext>): Set<BattleLogKind> {
    const addedKinds = new Set<BattleLogKind>();
    const lines = this.resolveFlavorLines(entries, context);
    if (lines.length <= 0) {
      return addedKinds;
    }

    const availableLines = lines.filter((line) => !this.isBattleLogKindBlockedByPlayerStatus(line.kind));
    if (availableLines.length <= 0) {
      return addedKinds;
    }

    const linesByKind = availableLines.reduce((groups, line) => {
      const group = groups.get(line.kind) ?? [];
      group.push(line);
      groups.set(line.kind, group);
      return groups;
    }, new Map<BattleLogKind, BattleFlavorLine[]>());

    for (const [kind, group] of linesByKind.entries()) {
      const line = Phaser.Utils.Array.GetRandom(group);
      this.addBattleLog(line.kind, this.interpolateFlavorText(line.text, context));
      addedKinds.add(kind);
    }
    return addedKinds;
  }

  private resolveFlavorLines(entries?: BattleFlavorEntry[], context?: Partial<BattleEventContext>): BattleFlavorLine[] {
    if (!entries || entries.length <= 0) {
      return [];
    }

    const hasVariants = entries.some((entry) => 'lines' in entry);
    if (!hasVariants) {
      return entries as BattleFlavorLine[];
    }

    const eventContext = this.battleEventContext({
      source: context?.source ?? 'system',
      ...context,
    });
    const selectedByKind = new Map<BattleLogKind, BattleFlavorLine[]>();

    for (const entry of entries) {
      const lines = 'lines' in entry ? entry.lines : [entry];
      if ('lines' in entry && !evaluateConditions(entry.conditions, eventContext)) {
        continue;
      }

      if ('lines' in entry) for (const kind of entry.suppressKinds ?? []) {
        if (!selectedByKind.has(kind)) selectedByKind.set(kind, []);
      }

      const linesByKind = lines.reduce((groups, line) => {
        const group = groups.get(line.kind) ?? [];
        group.push(line);
        groups.set(line.kind, group);
        return groups;
      }, new Map<BattleLogKind, BattleFlavorLine[]>());

      for (const [kind, group] of linesByKind.entries()) {
        if (!selectedByKind.has(kind)) {
          selectedByKind.set(kind, group);
        }
      }
    }

    return Array.from(selectedByKind.values()).flat();
  }

  private addFlavorEvent(
    flavors: { [key: string]: BattleFlavorEntry[] | undefined } | undefined,
    event: BattleFlavorEvent,
    context?: Partial<BattleEventContext>,
  ): Set<BattleLogKind> {
    return this.addBattleLogs(flavors?.[event], context);
  }

  private addGlobalFlavorEvent(
    event: BattleFlavorEvent,
    context?: Partial<BattleEventContext>,
  ): Set<BattleLogKind> {
    return this.addBattleLogs(globalFlavorEntries(event), context);
  }

  private isBattleLogKindBlockedByPlayerStatus(kind: BattleLogKind): boolean {
    for (const [status, stacks] of this.player.statuses.entries()) {
      if (stacks > 0 && STATUS_DESCRIPTIONS[status]?.blockedFlavorKinds?.includes(kind)) {
        return true;
      }
    }
    return false;
  }

  private addRandomAmountFlavors(
    effect: EffectDefinition,
    amount: number,
    context?: Partial<BattleEventContext>,
  ): void {
    if (!effect.randomAmount) {
      return;
    }

    const min = Math.ceil(effect.randomAmount.min);
    const max = Math.ceil(effect.randomAmount.max);
    if (amount <= min) {
      this.addFlavorEvent(effect.flavors, FLAVOR_EVENTS.Effect.RandomAmountMin, context);
      return;
    }

    if (amount >= max) {
      this.addFlavorEvent(effect.flavors, FLAVOR_EVENTS.Effect.RandomAmountMax, context);
      return;
    }

    this.addFlavorEvent(effect.flavors, FLAVOR_EVENTS.Effect.RandomAmountOther, context);
  }

  private interpolateFlavorText(text: LocalizedText, context?: Partial<BattleEventContext>): LocalizedText {
    if (typeof text === 'string') {
      return this.localizeDisplayText(text, context);
    }

    return {
      en: this.localizeDisplayText(text, context, 'en'),
      ja: this.localizeDisplayText(text, context, 'ja'),
    };
  }

  private localizeDisplayText(
    text: LocalizedText,
    context?: Partial<BattleEventContext>,
    language: Language = SETTINGS_STATE.language,
  ): string {
    return localize(text, language, () => this.flavorReplacements(context, language));
  }

  private flavorReplacements(context: Partial<BattleEventContext> | undefined, language: Language): Record<string, string> {
    const playerName = this.combatantDisplayNameForLanguage(this.player, language);
    const relatedEnemyName = context?.card?.relatedEnemyName ? localize(context.card.relatedEnemyName, language) : '';
    const enemy = context?.target instanceof Enemy
      ? context.target
      : context?.triggerEnemy ?? (context?.actor instanceof Enemy ? context.actor : undefined) ?? this.bindingEnemyForContext(context) ?? context?.selectedEnemy;
    const enemyName = context?.status === 'Escaping' && relatedEnemyName
      ? relatedEnemyName
      : enemy
        ? this.combatantDisplayNameForLanguage(enemy, language)
        : relatedEnemyName;
    const replacements: Record<string, string> = {
      player: playerName,
      enemy: enemyName,
      intrusionPart: this.intrusionPartDisplayNameForContext(context, language),
      source: this.sourceDisplayNameFromContext(context, language),
      status: context?.status ? this.statusDisplayNameForLanguage(context.status, language) : '',
    };

    for (const part of BODY_PART_TOKENS) {
      const displayName = this.bodyPartDisplayName(part, language);
      replacements[`part${part}`] = displayName;
      replacements[part] = displayName;
    }

    for (const [key, value] of Object.entries(context?.flavorValues ?? {})) {
      if (value === undefined) {
        continue;
      }
      if (key === 'part' && isBodyPartToken(value)) {
        replacements[key] = this.bodyPartDisplayName(value, language);
        if (context?.flavorValues?.defaultPart === undefined) {
          replacements.defaultPart = localize(bodyPartDefaultName(value), language);
        }
        continue;
      }
      replacements[key] = typeof value === 'object'
        ? localize(value, language)
        : String(value);
    }

    return replacements;
  }

  private bodyPartDisplayName(part: BodyPartToken, language: Language): string {
    const statPart = bodyPartStatPart(part);
    const sensitivityLevel = this.currentPlayerSensitivityLevel(statPart) as BodyPartNameLevel;
    const name = localize(bodyPartName(part, sensitivityLevel), language);
    const prefixes = this.bodyPartPrefixes(part, language, sensitivityLevel);
    return `${prefixes.join('')}${name}`;
  }

  private bodyPartPrefixes(part: BodyPartToken, language: Language, sensitivityLevel: BodyPartNameLevel): string[] {
    const prefixes: string[] = [];
    const statPart = bodyPartStatPart(part);
    if (this.currentPlayerArousalStatus()) {
      prefixes.push(language === 'ja' ? '発情した、' : 'aroused ');
    }

    const recentPeaks = this.player.recentEpPeakByPart[statPart] ?? 0;
    if (recentPeaks >= 10) {
      prefixes.push(language === 'ja' ? 'Peakしっぱなしの' : 'overstimulated ');
    } else if (recentPeaks >= 4) {
      prefixes.push(language === 'ja' ? '何度もPeakさせられた' : 'Peaking over and over ');
    } else if (recentPeaks >= 1) {
      prefixes.push(language === 'ja' ? 'Peakしたばかりの' : 'just Peaked ');
    }

    if (recentPeaks === 0) {
      const epPercent = this.playerEffectiveMaxEp() > 0 ? (this.player.ep / this.playerEffectiveMaxEp()) * 100 : 0;
      if (epPercent >= 20) {
        prefixes.push(this.bodyPartEpPrefix(part, language, epPercent));
      }
    }

    if (this.bodyPartHasIntrusionOrInsert(statPart)) {
      prefixes.push(language === 'ja' ? 'ぎちぎちの' : 'tightly filled ');
    }

    if (sensitivityLevel === 0 && prefixes.length === 0) {
      prefixes.push(this.bodyPartDefaultPrefix(part, language));
    }

    return prefixes;
  }

  private bodyPartEpPrefix(part: BodyPartToken, language: Language, epPercent: number): string {
    if (language === 'en') {
      if (epPercent >= 90) {
        return 'on the edge of Peaking ';
      }
      if (epPercent >= 80) {
        return 'about to Peak ';
      } 
      if (epPercent >= 60) {
        if (part === 'V') {
          return 'soft and melted ';
        }
        if (part === 'N' || part === 'C') {
          return 'erect ';
        }
        return 'throbbing ';
      } 
      if (epPercent >= 40) {
        if (part === 'V') {
          return 'hot and wet ';
        }
        if (part === 'N' || part === 'C') {
          return 'perky ';
        }
        return 'faintly aching ';
      }
      // epPercent >= 20
      if (part === 'V') {
        return 'slightly wet ';
      }
      if (part === 'N' || part === 'C') {
        return 'slightly hard ';
      }
      return 'warm ';
    }

    if (epPercent >= 90) {
      return 'Peakする寸前の';
    }
    if (epPercent >= 80) {
      return '今にもPeakしそうな';
    } 
    if (epPercent >= 60) {
      if (part === 'V') {
        return '蕩けきった';
      }
      if (part === 'N' || part === 'C') {
        return 'ピンと勃った';
      }
      return 'ジンジンと疼く';
    }
    if (epPercent >= 40) {
      if (part === 'V') {
        return '熱く濡れた';
      }
      if (part === 'N' || part === 'C') {
        return '半勃ちの';
      }
      return '甘く疼く';
    }
    // epPercent >= 20
    if (part === 'V') {
      return 'ほんのり湿った';
    }
    if (part === 'N' || part === 'C') {
      return '少し芯のある';
    }
    return '熱を帯びた';
  }

  private bodyPartDefaultPrefix(part: BodyPartToken, language: Language): string {
    if (language === 'en') {
      const prefixes: Record<BodyPartToken, string> = {
        A: 'closed ',
        B: 'cute ',
        C: 'hidden ',
        V: 'tightly closed ',
        M: 'narrow ',
        AI: 'healthy ',
        VI: 'tightly closed ',
        N: 'pink ',
        b: 'cute ',
        MI: 'healthy ',
        U: 'undeveloped ',
      };
      return prefixes[part];
    }

    const prefixes: Record<BodyPartToken, string> = {
      A: 'キュッと閉じた',
      B: '可憐な',
      C: '隠れた',
      V: 'びっちりと閉じた',
      M: '狭い',
      AI: '健康な',
      VI: '締まりのいい',
      N: 'ピンクの',
      b: 'かわいい',
      MI: '健康な',
      U: '未開発の',
    };
    return prefixes[part];
  }

  private bodyPartHasIntrusionOrInsert(part: EpDamagePart): boolean {
    const statusByPart: Partial<Record<EpDamagePart, StatusEffect[]>> = {
      A: ['IntrudedA', 'InsertA'],
      V: ['IntrudedV', 'InsertV'],
      M: ['IntrudedM', 'InsertM'],
    };
    const statuses = statusByPart[part];
    if (!statuses) {
      return false;
    }

    return this.enemies.some((enemy) => !enemy.isDefeated && statuses.some((status) => enemy.hasStatus(status)));
  }

  private intrusionPartDisplayNameForContext(
    context: Partial<BattleEventContext> | undefined,
    language: Language,
  ): string {
    if (!context) {
      return '';
    }

    if (context.intrusionPart) {
      return this.interpolateIntrusionPartText(context.intrusionPart, context, language);
    }

    const owner = context.statusOwner instanceof Enemy
      ? context.statusOwner
      : context.triggerEnemy ?? (context.actor instanceof Enemy ? context.actor : undefined) ?? context.selectedEnemy;

    if (owner?.definition.intrusionPart) {
      return this.interpolateIntrusionPartText(owner.definition.intrusionPart, { ...context, actor: owner }, language);
    }

    return '';
  }

  private interpolateIntrusionPartText(
    text: LocalizedText,
    context: Partial<BattleEventContext>,
    language: Language,
  ): string {
    const owner = context.statusOwner instanceof Enemy
      ? context.statusOwner
      : context.triggerEnemy ?? (context.actor instanceof Enemy ? context.actor : undefined) ?? context.selectedEnemy;
    const enemyName = owner ? this.combatantDisplayNameForLanguage(owner, language) : '';
    return localize(text, language)
      .split('{enemy}').join(enemyName)
      .split('{player}').join(this.combatantDisplayNameForLanguage(this.player, language));
  }

  private visibleLogLineCount(): number {
    return this.logTextObjects.length;
  }

  private maxBattleLogScrollOffset(): number {
    return Math.max(0, this.battleLogs.length - 1);
  }

  private renderBattleLog(): void {
    if (!this.logPanel) {
      return;
    }

    const topPadding = 10;
    const bottomMargin = 14;
    const entryGap = 4;
    const panelHeight = 348;
    const lineHeight = 20;
    const maxOffset = this.maxBattleLogScrollOffset();
    this.logScrollOffset = Phaser.Math.Clamp(this.logScrollOffset, 0, maxOffset);

    this.logBg.setFillStyle(0x0d1218, this.logHistoryMode ? 0.86 : 0.5);
    this.logBg.setStrokeStyle(2, 0x40526a, this.logHistoryMode ? 0.82 : 0);

    this.logTextObjects.forEach((text) => {
      this.tweens.killTweensOf(text);
      text.setText('');
      text.setVisible(false);
      text.setScale(1);
      text.setFontStyle('normal');
      text.setData('logEntryId', undefined);
    });

    let cursorY = panelHeight - bottomMargin;
    let textIndex = this.logTextObjects.length - 1;
    const renderedTexts: Phaser.GameObjects.Text[] = [];
    const renderedKinds: BattleLogKind[] = [];
    const endExclusive = Phaser.Math.Clamp(this.battleLogs.length - this.logScrollOffset, 0, this.battleLogs.length);
    for (let entryIndex = endExclusive - 1; entryIndex >= 0 && textIndex >= 0; entryIndex -= 1) {
      const entry = this.battleLogs[entryIndex];
      if (entry.spacing && entry.spacing > 0) {
        cursorY -= lineHeight * entry.spacing;
        continue;
      }

      const text = this.logTextObjects[textIndex];
      text.setText(this.formatBattleLogEntry(entry));
      text.setColor(this.logColor(entry.kind));
      text.setFontStyle(entry.kind === 'important' ? 'bold' : 'normal');
      text.setScale(1);
      text.setData('logEntryId', entry.id);
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
      text.setAlpha(this.logLineAlpha(text.y, topPadding, 20));
      text.setColor(this.logColor(renderedKinds[index]));
    });

    this.logScrollbar.setVisible(this.logHistoryMode && maxOffset > 0);
    if (this.logScrollbar.visible) {
      const scrollbarTop = 10;
      const scrollbarTravel = 290;
      const y = scrollbarTop + scrollbarTravel - (this.logScrollOffset / Math.max(1, maxOffset)) * scrollbarTravel;
      this.logScrollbar.setY(y);
    }
  }

  private logLineAlpha(textY: number, topPadding: number, lineHeight: number): number {
    if (this.logHistoryMode) {
      return 1;
    }

    const rowFromTop = Math.floor((textY - topPadding) / lineHeight);
    if (rowFromTop < 0) {
      return 0.35;
    }
    if (rowFromTop === 0) {
      return 0.35;
    }
    if (rowFromTop === 1) {
      return 0.5;
    }
    if (rowFromTop === 2) {
      return 0.68;
    }
    return 1;
  }

  private formatBattleLogEntry(entry: BattleLogEntry): string {
    return localize(entry.text);
  }

  private logColor(kind: BattleLogKind): string {
    return battleLogColor(kind);
  }

  private pulseBattleLogEntry(entryId: number): void {
    const text = this.logTextObjects.find((candidate) => candidate.visible && candidate.getData('logEntryId') === entryId);
    if (!text) {
      return;
    }

    this.tweens.killTweensOf(text);
    text.setScale(1.1);
    this.tweens.add({
      targets: text,
      scaleX: 1,
      scaleY: 1,
      duration: 260,
      ease: 'Sine.easeOut',
    });
  }
}
