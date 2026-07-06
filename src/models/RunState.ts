import { PLAYER_DEFINITION } from '../data/player';
import type { StatusEffect } from './types';

export type SavedStatus = {
  effect: StatusEffect;
  stacks: number;
};

type RunState = {
  deckIds: string[];
  relicIds: string[];
  playerHp: number;
  playerEp: number;
  playerEpPeakCount: number;
  playerEpReserveValue: number;
  playerStatuses: SavedStatus[];
  battleIndex: number;
};

export const RUN_STATE: RunState = {
  deckIds: [...PLAYER_DEFINITION.startingDeckIds],
  relicIds: [...PLAYER_DEFINITION.relics],
  playerHp: PLAYER_DEFINITION.maxHp,
  playerEp: 0,
  playerEpPeakCount: 0,
  playerEpReserveValue: 0,
  playerStatuses: [],
  battleIndex: 0,
};

export function resetRunState(): void {
  RUN_STATE.deckIds = [...PLAYER_DEFINITION.startingDeckIds];
  RUN_STATE.relicIds = [...PLAYER_DEFINITION.relics];
  RUN_STATE.playerHp = PLAYER_DEFINITION.maxHp;
  RUN_STATE.playerEp = 0;
  RUN_STATE.playerEpPeakCount = 0;
  RUN_STATE.playerEpReserveValue = 0;
  RUN_STATE.playerStatuses = [];
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
  playerStatuses: SavedStatus[] = [],
): void {
  RUN_STATE.playerHp = playerHp;
  RUN_STATE.playerEp = playerEp;
  RUN_STATE.playerEpPeakCount = playerEpPeakCount;
  RUN_STATE.playerEpReserveValue = playerEpReserveValue;
  RUN_STATE.playerStatuses = [...playerStatuses];
}

export function currentEncounterThreat(): number {
  return Math.min(3, RUN_STATE.battleIndex + 1);
}

export function advanceRunBattle(): void {
  RUN_STATE.battleIndex += 1;
}
