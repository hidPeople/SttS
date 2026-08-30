import { PLAYER_DEFINITION } from '../data/player';
import type { LocalizedText } from './localization';
import { EP_DAMAGE_PARTS, type EpDamagePart, type StatusEffect } from './types';

export type SavedStatus = {
  effect: StatusEffect;
  stacks: number;
};

export type EpPartRecord = Record<EpDamagePart, number>;

export type SavedBattleLogEntry = {
  id: number;
  kind: 'system' | 'narration' | 'quote';
  text: LocalizedText | (() => LocalizedText);
  spacing?: number;
};

type RunState = {
  deckIds: string[];
  relicIds: string[];
  playerHp: number;
  playerEp: number;
  playerEpPeakCount: number;
  playerEpReserveValue: number;
  playerEpDamageByPart: EpPartRecord;
  playerEpPeakByPart: EpPartRecord;
  playerStatuses: SavedStatus[];
  battleLogs: SavedBattleLogEntry[];
  nextBattleLogId: number;
  battleIndex: number;
};

function createEpPartRecord(): EpPartRecord {
  return EP_DAMAGE_PARTS.reduce((record, part) => {
    record[part] = 0;
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
  playerHp: PLAYER_DEFINITION.maxHp,
  playerEp: 0,
  playerEpPeakCount: 0,
  playerEpReserveValue: 0,
  playerEpDamageByPart: createEpPartRecord(),
  playerEpPeakByPart: createEpPartRecord(),
  playerStatuses: [],
  battleLogs: [],
  nextBattleLogId: 1,
  battleIndex: 0,
};

export function resetRunState(): void {
  RUN_STATE.deckIds = [...PLAYER_DEFINITION.startingDeckIds];
  RUN_STATE.relicIds = [...PLAYER_DEFINITION.relics];
  RUN_STATE.playerHp = PLAYER_DEFINITION.maxHp;
  RUN_STATE.playerEp = 0;
  RUN_STATE.playerEpPeakCount = 0;
  RUN_STATE.playerEpReserveValue = 0;
  RUN_STATE.playerEpDamageByPart = createEpPartRecord();
  RUN_STATE.playerEpPeakByPart = createEpPartRecord();
  RUN_STATE.playerStatuses = [];
  RUN_STATE.battleLogs = [];
  RUN_STATE.nextBattleLogId = 1;
  RUN_STATE.battleIndex = 0;
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

export function saveRunVitals(
  playerHp: number,
  playerEp: number,
  playerEpPeakCount: number,
  playerEpReserveValue: number,
  playerEpDamageByPart: EpPartRecord,
  playerEpPeakByPart: EpPartRecord,
  playerStatuses: SavedStatus[] = [],
): void {
  RUN_STATE.playerHp = playerHp;
  RUN_STATE.playerEp = playerEp;
  RUN_STATE.playerEpPeakCount = playerEpPeakCount;
  RUN_STATE.playerEpReserveValue = playerEpReserveValue;
  RUN_STATE.playerEpDamageByPart = cloneEpPartRecord(playerEpDamageByPart);
  RUN_STATE.playerEpPeakByPart = cloneEpPartRecord(playerEpPeakByPart);
  RUN_STATE.playerStatuses = [...playerStatuses];
}

export function currentEncounterThreat(): number {
  return Math.min(3, RUN_STATE.battleIndex + 1);
}

export function advanceRunBattle(): void {
  RUN_STATE.battleIndex += 1;
}
