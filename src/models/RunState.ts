import { PLAYER_DEFINITION } from '../data/player';

type RunState = {
  deckIds: string[];
  relicIds: string[];
  playerHp: number;
  playerEp: number;
  playerEpPeakCount: number;
  playerEpReserveValue: number;
};

export const RUN_STATE: RunState = {
  deckIds: [...PLAYER_DEFINITION.startingDeckIds],
  relicIds: [...PLAYER_DEFINITION.relics],
  playerHp: PLAYER_DEFINITION.maxHp,
  playerEp: 0,
  playerEpPeakCount: 0,
  playerEpReserveValue: 0,
};

export function resetRunState(): void {
  RUN_STATE.deckIds = [...PLAYER_DEFINITION.startingDeckIds];
  RUN_STATE.relicIds = [...PLAYER_DEFINITION.relics];
  RUN_STATE.playerHp = PLAYER_DEFINITION.maxHp;
  RUN_STATE.playerEp = 0;
  RUN_STATE.playerEpPeakCount = 0;
  RUN_STATE.playerEpReserveValue = 0;
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

export function saveRunVitals(playerHp: number, playerEp: number, playerEpPeakCount: number, playerEpReserveValue: number): void {
  RUN_STATE.playerHp = playerHp;
  RUN_STATE.playerEp = playerEp;
  RUN_STATE.playerEpPeakCount = playerEpPeakCount;
  RUN_STATE.playerEpReserveValue = playerEpReserveValue;
}
