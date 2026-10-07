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

export type RunState = {
  stage: number; // 現在の階層。背景と通常敵の出現ステージで共用。
  eventBattleId?: string;
  deckIds: string[];
  relicIds: string[];
  encounterEnemyIds: string[];
  playerHp: number;
  playerEp: number;
  playerOrgasmCount: number;
  playerEpReserveValue: number;
  playerEpDamageByPart: EpPartRecord;
  playerOrgasmByPart: EpPartRecord;
  playerRecentOrgasmByPart: EpPartRecord;
  playerStatuses: SavedStatus[];
  playerStatusActiveTurns: Partial<Record<StatusEffect, number>>;
  battleLogs: SavedBattleLogEntry[];
  nextBattleLogId: number;
  battleIndex: number;
};

export type RunStateSnapshot = RunState;

function createEpPartRecord(initialField?: 'epDamage' | 'orgasmCount'): EpPartRecord {
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
  stage: 1,
  deckIds: [...PLAYER_DEFINITION.startingDeckIds],
  relicIds: [...PLAYER_DEFINITION.relics],
  encounterEnemyIds: [],
  playerHp: PLAYER_DEFINITION.maxHp,
  playerEp: 0,
  playerOrgasmCount: 0,
  playerEpReserveValue: 0,
  playerEpDamageByPart: createEpPartRecord('epDamage'),
  playerOrgasmByPart: createEpPartRecord('orgasmCount'),
  playerRecentOrgasmByPart: createEpPartRecord(),
  playerStatuses: [],
  playerStatusActiveTurns: {},
  battleLogs: [],
  nextBattleLogId: 1,
  battleIndex: 0,
};

export function resetRunState(): void {
  RUN_STATE.stage = 1;
  RUN_STATE.eventBattleId = undefined;
  RUN_STATE.deckIds = [...PLAYER_DEFINITION.startingDeckIds];
  RUN_STATE.relicIds = [...PLAYER_DEFINITION.relics];
  RUN_STATE.encounterEnemyIds = [];
  RUN_STATE.playerHp = PLAYER_DEFINITION.maxHp;
  RUN_STATE.playerEp = 0;
  RUN_STATE.playerOrgasmCount = 0;
  RUN_STATE.playerEpReserveValue = 0;
  RUN_STATE.playerEpDamageByPart = createEpPartRecord('epDamage');
  RUN_STATE.playerOrgasmByPart = createEpPartRecord('orgasmCount');
  RUN_STATE.playerRecentOrgasmByPart = createEpPartRecord();
  RUN_STATE.playerStatuses = [];
  RUN_STATE.playerStatusActiveTurns = {};
  RUN_STATE.battleLogs = [];
  RUN_STATE.nextBattleLogId = 1;
  RUN_STATE.battleIndex = 0;
}

export function snapshotRunState(): RunStateSnapshot {
  return JSON.parse(JSON.stringify(RUN_STATE)) as RunStateSnapshot;
}

export function restoreRunState(snapshot: RunStateSnapshot): void {
  resetRunState();
  RUN_STATE.stage = Math.max(1, Math.floor(snapshot.stage || 1));
  RUN_STATE.eventBattleId = snapshot.eventBattleId && EVENT_BATTLES[snapshot.eventBattleId] ? snapshot.eventBattleId : undefined;
  RUN_STATE.deckIds = [...snapshot.deckIds];
  RUN_STATE.relicIds = [...snapshot.relicIds];
  RUN_STATE.encounterEnemyIds = [...snapshot.encounterEnemyIds];
  RUN_STATE.playerHp = snapshot.playerHp;
  RUN_STATE.playerEp = snapshot.playerEp;
  RUN_STATE.playerOrgasmCount = snapshot.playerOrgasmCount;
  RUN_STATE.playerEpReserveValue = snapshot.playerEpReserveValue;
  RUN_STATE.playerEpDamageByPart = cloneEpPartRecord(snapshot.playerEpDamageByPart);
  RUN_STATE.playerOrgasmByPart = cloneEpPartRecord(snapshot.playerOrgasmByPart);
  RUN_STATE.playerRecentOrgasmByPart = cloneEpPartRecord(snapshot.playerRecentOrgasmByPart);
  RUN_STATE.playerStatuses = snapshot.playerStatuses.map(status => ({ ...status }));
  RUN_STATE.playerStatusActiveTurns = { ...snapshot.playerStatusActiveTurns };
  RUN_STATE.battleLogs = snapshot.battleLogs.map(entry => ({
    ...entry,
    text: typeof entry.text === 'string' ? entry.text : { ...entry.text },
  }));
  RUN_STATE.nextBattleLogId = snapshot.nextBattleLogId;
  RUN_STATE.battleIndex = snapshot.battleIndex;
}

/** New Game用。HP/EP/エナジー等の現在戦闘値は持ち込まない。 */
export function restoreBodyProgress(snapshot: RunStateSnapshot): void {
  resetRunState();
  RUN_STATE.playerOrgasmCount = snapshot.playerOrgasmCount;
  RUN_STATE.playerEpDamageByPart = cloneEpPartRecord(snapshot.playerEpDamageByPart);
  RUN_STATE.playerOrgasmByPart = cloneEpPartRecord(snapshot.playerOrgasmByPart);
  RUN_STATE.playerStatuses = snapshot.playerStatuses.map(status => ({ ...status }));
  RUN_STATE.playerStatusActiveTurns = { ...snapshot.playerStatusActiveTurns };
}

export function startEventBattle(id: string): void {
  const event = EVENT_BATTLES[id];
  if (!event) throw new Error(`Unknown event battle: ${id}`);
  resetRunState();
  RUN_STATE.eventBattleId = id;
  RUN_STATE.relicIds = RUN_STATE.relicIds.filter(relicId => !event.excludedRelicIds?.includes(relicId));
  RUN_STATE.playerHp = event.initialHp;
  RUN_STATE.playerEp = event.initialEp;
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
  playerOrgasmCount: number,
  playerEpReserveValue: number,
  playerEpDamageByPart: EpPartRecord,
  playerOrgasmByPart: EpPartRecord,
  playerRecentOrgasmByPart: EpPartRecord,
  playerStatuses: SavedStatus[] = [],
  playerStatusActiveTurns: Partial<Record<StatusEffect, number>> = {},
): void {
  RUN_STATE.playerHp = playerHp;
  RUN_STATE.playerEp = playerEp;
  RUN_STATE.playerOrgasmCount = playerOrgasmCount;
  RUN_STATE.playerEpReserveValue = playerEpReserveValue;
  RUN_STATE.playerEpDamageByPart = cloneEpPartRecord(playerEpDamageByPart);
  RUN_STATE.playerOrgasmByPart = cloneEpPartRecord(playerOrgasmByPart);
  RUN_STATE.playerRecentOrgasmByPart = cloneEpPartRecord(playerRecentOrgasmByPart);
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
