import type { EpDamagePart, PlayerEpDamageRecord, StatusEffect } from './types';

export interface SavedCardInstance {
  uid: string; cardId: string;
  link?: { enemyIndex: number; status?: StatusEffect; variant: 'pullout' | 'purge' | 'wriggleFree' };
}
export interface DeckSnapshot {
  drawPile: SavedCardInstance[];
  hand: SavedCardInstance[];
  discardPile: SavedCardInstance[];
  nextUid: number;
}

export interface CombatantSnapshot {
  hp: number;
  ep: number;
  block: number;
  statuses: [StatusEffect, number][];
}

export interface EnemySnapshot extends CombatantSnapshot {
  enemyId: string;
  intentIndex: number;
  intentUsage: [string, number][];
  inOrgasmAftershocks: boolean;
  hasForcedOrgasmAftershocksIntent: boolean;
  specialIntent?: { pool: 'e' | 'b'; index: number };
}

export interface PlayerBattleSnapshot extends CombatantSnapshot {
  energy: number;
  orgasmCount: number;
  orgasmsThisBattle: number;
  epDamageByPart: Record<EpDamagePart, number>;
  orgasmByPart: Record<EpDamagePart, number>;
  recentOrgasmByPart: Record<EpDamagePart, number>;
  statusActiveTurns: Partial<Record<StatusEffect, number>>;
  statusDrainCounts: [StatusEffect, number][];
  epDamageRecords: PlayerEpDamageRecord[];
  lastEpDamageParts: EpDamagePart[];
}

export interface BattleSceneSaveState {
  statusRuntime?: import('./statusRuntime').StatusRuntimeSnapshot;
  turnEpEffects?: import('./turnEpEffects').TurnEpEffectsSnapshot;
  shownTutorialTips?: string[];
  rngState: number;
  turn: number;
  orgasmHistory: number[];
  isPlayerTurn: boolean;
  canEndTurn: boolean;
  selectedEnemyIndex: number;
  cardsPlayedThisTurn: number;
  playerOrgasmsThisCycle: number;
  playerEpReserveValue: number;
  completedTurnEvents: [number, number][];
  touchCounts: { dormantSigil: number; arousedSigil: number; body: number; head: number };
  player: PlayerBattleSnapshot;
  enemies: EnemySnapshot[];
  deck: DeckSnapshot;
}
