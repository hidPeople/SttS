import { PLAYER_DEFINITION } from '../data/player';
import { EVENT_BATTLES } from '../data/eventBattles';
import type { LocalizedText } from './localization';
import { EP_DAMAGE_PARTS, type BattleLogKind, type EpDamagePart, type StatusEffect } from './types';

export type SavedStatus = {
  effect: StatusEffect;
  stacks: number;
};

export type EpPartRecord = Record<EpDamagePart, number>;

export type SavedBattleLogEntry = {
  id: number;
  kind: BattleLogKind;
  text: LocalizedText;
  spacing?: number;
};

type RunState = {
  eventBattleId?: string;
  deckIds: string[];
  relicIds: string[];
  encounterEnemyIds: string[];
  playerHp: number;
  playerEp: number;
  playerEpPeakCount: number;
  playerEpReserveValue: number;
  playerEpDamageByPart: EpPartRecord;
  playerEpPeakByPart: EpPartRecord;
  playerRecentEpPeakByPart: EpPartRecord;
  playerStatuses: SavedStatus[];
  playerStatusActiveTurns: Partial<Record<StatusEffect, number>>;
  battleLogs: SavedBattleLogEntry[];
  nextBattleLogId: number;
  battleIndex: number;
};

function createEpPartRecord(initialField?: 'epDamage' | 'peakCount'): EpPartRecord {
  return EP_DAMAGE_PARTS.reduce((record, part) => {
    record[part] = initialField ? PLAYER_DEFINITION.initialEpProgress?.[part][initialField] ?? 0 : 0;
    return record;
  }, {} as EpPartRecord);
}

function cloneEpPartRecord(record: EpPartRecord): EpPartRecord {
  return EP_DAMAGE_PARTS.reduce((copy, part) => {
    copy[part] = record[part] ?? 0;
    return copy;
  }, {} as EpPartRecord);
}

export const RUN_STATE: RunState = {
  deckIds: [...PLAYER_DEFINITION.startingDeckIds],
  relicIds: [...PLAYER_DEFINITION.relics],
  encounterEnemyIds: [],
  playerHp: PLAYER_DEFINITION.maxHp,
  playerEp: 0,
  playerEpPeakCount: 0,
  playerEpReserveValue: 0,
  playerEpDamageByPart: createEpPartRecord('epDamage'),
  playerEpPeakByPart: createEpPartRecord('peakCount'),
  playerRecentEpPeakByPart: createEpPartRecord(),
  playerStatuses: [],
  playerStatusActiveTurns: {},
  battleLogs: [],
  nextBattleLogId: 1,
  battleIndex: 0,
};

export function resetRunState(): void {
  RUN_STATE.eventBattleId = undefined;
  RUN_STATE.deckIds = [...PLAYER_DEFINITION.startingDeckIds];
  RUN_STATE.relicIds = [...PLAYER_DEFINITION.relics];
  RUN_STATE.encounterEnemyIds = [];
  RUN_STATE.playerHp = PLAYER_DEFINITION.maxHp;
  RUN_STATE.playerEp = 0;
  RUN_STATE.playerEpPeakCount = 0;
  RUN_STATE.playerEpReserveValue = 0;
  RUN_STATE.playerEpDamageByPart = createEpPartRecord('epDamage');
  RUN_STATE.playerEpPeakByPart = createEpPartRecord('peakCount');
  RUN_STATE.playerRecentEpPeakByPart = createEpPartRecord();
  RUN_STATE.playerStatuses = [];
  RUN_STATE.playerStatusActiveTurns = {};
  RUN_STATE.battleLogs = [];
  RUN_STATE.nextBattleLogId = 1;
  RUN_STATE.battleIndex = 0;
}

export function startEventBattle(id: string): void {
  const event = EVENT_BATTLES[id];
  if (!event) throw new Error(`Unknown event battle: ${id}`);
  resetRunState();
  RUN_STATE.eventBattleId = id;
  RUN_STATE.playerHp = event.initialHp;
  RUN_STATE.deckIds = [...event.deckIds];
  RUN_STATE.playerStatuses = event.statuses.map(status => ({ ...status }));
  RUN_STATE.encounterEnemyIds = [...event.enemyIds];
}

export function addCardToRun(cardId: string): void {
  RUN_STATE.deckIds.push(cardId);
}

export function addRelicToRun(relicId: string): void {
  if (RUN_STATE.relicIds.includes(relicId)) {
    return;
  }

  RUN_STATE.relicIds.push(relicId);
}

export function setCurrentEncounterEnemyIds(enemyIds: string[]): void {
  RUN_STATE.encounterEnemyIds = [...enemyIds];
}

export function clearCurrentEncounterEnemyIds(): void {
  RUN_STATE.encounterEnemyIds = [];
}

export function saveRunVitals(
  playerHp: number,
  playerEp: number,
  playerEpPeakCount: number,
  playerEpReserveValue: number,
  playerEpDamageByPart: EpPartRecord,
  playerEpPeakByPart: EpPartRecord,
  playerRecentEpPeakByPart: EpPartRecord,
  playerStatuses: SavedStatus[] = [],
  playerStatusActiveTurns: Partial<Record<StatusEffect, number>> = {},
): void {
  RUN_STATE.playerHp = playerHp;
  RUN_STATE.playerEp = playerEp;
  RUN_STATE.playerEpPeakCount = playerEpPeakCount;
  RUN_STATE.playerEpReserveValue = playerEpReserveValue;
  RUN_STATE.playerEpDamageByPart = cloneEpPartRecord(playerEpDamageByPart);
  RUN_STATE.playerEpPeakByPart = cloneEpPartRecord(playerEpPeakByPart);
  RUN_STATE.playerRecentEpPeakByPart = cloneEpPartRecord(playerRecentEpPeakByPart);
  RUN_STATE.playerStatuses = [...playerStatuses];
  RUN_STATE.playerStatusActiveTurns = { ...playerStatusActiveTurns };
}

export function currentEncounterThreat(): number {
  return Math.min(3, RUN_STATE.battleIndex + 1);
}

export function advanceRunBattle(): void {
  RUN_STATE.battleIndex += 1;
  clearCurrentEncounterEnemyIds();
}
