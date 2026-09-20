import type { StatusApplication, StatusEffect } from '../models/types';

export interface EventBattleDefinition {
  initialHp: number;
  initialEp: number;
  deckIds: string[];
  statuses: StatusApplication[];
  enemyIds: string[];
  beforeDrawEvents: {
    turn: number; // 発生ターン。繰り返しの場合は開始ターン。
    conversationId?: string; // 省略すると会話なしでカード追加のみ実行。
    repeatWhileStatus?: StatusEffect; // この状態中、開始ターン以降の各ターンに1回実行。省略時は単発。
    cardIds: string[];
  }[];
  victory: 'newGame';
}

export const EVENT_BATTLES: Record<string, EventBattleDefinition> = {
  tutorial: {
    initialHp: 2,
    initialEp: 2,
    deckIds: ['strike', 'handWork', 'blowWork', 'cowgirlRiding'],
    statuses: [{ effect: 'Starvation', stacks: 1 }, { effect: 'ExtremeFatigue', stacks: 1 }],
    enemyIds: ['tutorialGrunt', 'tutorialGrunt', 'tutorialGrunt'],
    beforeDrawEvents: [
      { turn: 3, conversationId: 'tutorialTurn3', cardIds: ['seduction'] },
      { turn: 4, repeatWhileStatus: 'ExtremeFatigue', cardIds: ['seduction'] },
    ],
    victory: 'newGame',
  },
};
