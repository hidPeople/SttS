import { condition } from './effectBuilders';
import type { ConditionDefinition, StatusApplication, StatusEffect } from '../models/types';

export interface EventBattleDefinition {
  introConversationId?: string; // 戦闘前のノベル会話。終了後にこのイベント戦闘を開始。
  battleStartConversationId?: string; // CONVERSATIONSキー。初期状態異常の付与通知・戦闘開始効果の後、初回ターン開始処理の前に表示。省略時は会話なし。
  victoryConversationId?: string; // 勝利後に表示する会話。終了後はvictoryで指定した遷移へ進む。
  defeatConversations?: { // 上から条件判定し、最初に一致した会話を表示。終了後は初期状態で再挑戦。
    conditions?: ConditionDefinition[]; // 省略時は常に一致（最後のフォールバック用）。
    conversationId: string;
  }[];
  excludedRelicIds?: string[]; // PLAYER_DEFINITION.relicsからこの戦闘の間だけ除外するRELIC_DEFINITIONSキー。
  initialHp: number;
  initialEp: number;
  deckIds: string[];
  statuses: StatusApplication[];
  enemyIds: string[];
  beforeDrawEvents: {
    turn: number; // 発生ターン。繰り返しの場合は開始ターン。
    conversationId?: string; // 省略すると会話なしでカード追加のみ実行。
    repeatWhileStatus?: StatusEffect; // この状態中、開始ターン以降の各ターンに1回実行。省略時は単発。
    cardIds?: string[]; // 省略・空配列ならカード追加なし。会話のみのイベントも可能。
  }[];
  victory: 'newGame';
}

export const EVENT_BATTLES: Record<string, EventBattleDefinition> = {
  tutorial: {
    introConversationId: 'tutorialBeforeBattle',
    battleStartConversationId: 'tutorialTurn1',
    victoryConversationId: 'tutorialAfterBattle',
    defeatConversations: [
      { conditions: [condition('status', 'has', { target: 'player', status: 'Starvation' })], conversationId: 'tutorialDefeat1' },
      { conversationId: 'tutorialDefeat2' },
    ],
    excludedRelicIds: ['contractSigil'],
    initialHp: 2,
    initialEp: 2,
    deckIds: ['strike', 'handjob', 'cowgirlRiding', 'rubOneOut'],
    statuses: [{ effect: 'Starvation', stacks: 1 }, { effect: 'ExtremeFatigue', stacks: 1 }],
    enemyIds: ['tutorialGrunt', 'tutorialGrunt', 'tutorialGrunt'],
    beforeDrawEvents: [
      { turn: 3, conversationId: 'tutorialTurn3', cardIds: ['seduction'] },
      { turn: 4, repeatWhileStatus: 'ExtremeFatigue', cardIds: ['seduction'] },
    ],
    victory: 'newGame',
  },
};
