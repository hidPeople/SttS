import { condition } from './effectBuilders';
import type { ConditionDefinition, StatusApplication, StatusEffect } from '../models/types';

export interface EventBattleDefinition {
  introConversationId?: string; // 戦闘前のノベル会話。終了後にこのイベント戦闘を開始。
  defeatConversations?: { // 上から条件判定し、最初に一致した会話を表示。終了後は初期状態で再挑戦。
    conditions?: ConditionDefinition[]; // 省略時は常に一致（最後のフォールバック用）。
    conversationId: string;
  }[];
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
    introConversationId: 'tutorialBeforeBattle',
    defeatConversations: [
      { conditions: [condition('status', 'has', { target: 'player', status: 'Starvation' })], conversationId: 'tutorialDefeat1' },
      { conversationId: 'tutorialDefeat2' },
    ],
    initialHp: 2,
    initialEp: 2,
    deckIds: ['strike', 'handWork', 'cowgirlRiding', 'rubOneOut'],
    statuses: [{ effect: 'Starvation', stacks: 1 }, { effect: 'ExtremeFatigue', stacks: 1 }],
    enemyIds: ['tutorialGrunt', 'tutorialGrunt', 'tutorialGrunt'],
    beforeDrawEvents: [
      { turn: 3, conversationId: 'tutorialTurn3', cardIds: ['seduction'] },
      { turn: 4, repeatWhileStatus: 'ExtremeFatigue', cardIds: ['seduction'] },
    ],
    victory: 'newGame',
  },
};
