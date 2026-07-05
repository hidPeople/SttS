import { PLAYER_DEFINITION } from '../data/player';

type RunState = {
  deckIds: string[];
  relicIds: string[];
};

export const RUN_STATE: RunState = {
  deckIds: [...PLAYER_DEFINITION.startingDeckIds],
  relicIds: [...PLAYER_DEFINITION.relics],
};

export function resetRunState(): void {
  RUN_STATE.deckIds = [...PLAYER_DEFINITION.startingDeckIds];
  RUN_STATE.relicIds = [...PLAYER_DEFINITION.relics];
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
