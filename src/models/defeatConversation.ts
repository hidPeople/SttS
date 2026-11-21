import { CONVERSATION_EVENTS, DEFEAT_CONVERSATIONS, type ConversationEventMetadata } from '../data/conversations';
import { evaluateConditions } from './conditions';
import type { BattleEventContext } from './types';

export function normalDefeatConversation(context: BattleEventContext, cardSelfDamage: boolean,
  events: Record<string, ConversationEventMetadata> = CONVERSATION_EVENTS): string {
  const enemies = context.enemies.filter(enemy => !enemy.isDefeated);
  const byEnemy = new Map<string, string>();
  for (const [id, event] of Object.entries(events)) {
    if (event.category !== 'normal') continue;
    const rule = event.defeatWhen;
    if (!rule) {
      if (event.defeatEnemyId) byEnemy.set(event.defeatEnemyId, id);
      continue;
    }
    if (rule.cardSelfDamage !== undefined && rule.cardSelfDamage !== cardSelfDamage) continue;
    const remaining = enemies.map(enemy => enemy.definition.id);
    const required = rule.enemyIds ?? [];
    if (!required.every(key => {
      const index = remaining.indexOf(key);
      if (index < 0) return false;
      remaining.splice(index, 1);
      return true;
    })) continue;
    const candidates = required.length ? enemies.filter(enemy => required.includes(enemy.definition.id)) : enemies;
    if ((candidates.length ? candidates : [undefined]).some(enemy => evaluateConditions(rule.conditions, {
      ...context, enemies, selectedEnemy: enemy, triggerEnemy: enemy,
    }))) return id;
  }
  let conversation = DEFEAT_CONVERSATIONS.default;
  let highestThreat = -Infinity;
  for (const enemy of enemies) {
    const id = byEnemy.get(enemy.definition.id);
    if (id && enemy.definition.threat > highestThreat) {
      highestThreat = enemy.definition.threat;
      conversation = id;
    }
  }
  return conversation;
}
