import { CONVERSATIONS, CONVERSATION_EVENTS } from '../data/conversations';
import { EVENT_BATTLES } from '../data/eventBattles';
import { STATUS_DESCRIPTIONS } from '../data/statuses';
import { text as l, type LocalizedText } from './localization';
import type { ConditionDefinition } from './types';

const localizedParts = (value: LocalizedText): { en: string; ja: string } => typeof value === 'string'
  ? { en: value, ja: value } : value;

export interface GalleryEvent {
  conversationId: string;
  title: LocalizedText;
  category: 'prologue' | 'normal';
  thumbnail?: string;
  condition: LocalizedText;
}

export function galleryEvents(): GalleryEvent[] {
  return Object.entries(CONVERSATION_EVENTS)
    .filter(([, metadata]) => metadata.gallery)
    .map(([conversationId, metadata]) => ({
      conversationId,
      title: metadata.title,
      category: metadata.category,
      thumbnail: CONVERSATIONS[conversationId]?.find(page => page.background)?.background,
      condition: conversationUnlockCondition(conversationId),
    }));
}

export function conversationUnlockCondition(conversationId: string): LocalizedText {
  for (const [battleId, battle] of Object.entries(EVENT_BATTLES)) {
    const battleName = localizedParts(battleId === 'prologue' ? l('Prologue', 'プロローグ') : l(battleId, battleId));
    if (battle.introConversationId === conversationId) {
      return l(`Before the ${battleName.en} battle`, `${battleName.ja}の戦闘開始前`);
    }
    if (battle.victoryConversationId === conversationId) {
      return l(`Win in ${battleName.en}`, `${battleName.ja}で勝利`);
    }
    const defeatIndex = battle.defeatConversations?.findIndex(rule => rule.conversationId === conversationId) ?? -1;
    if (defeatIndex >= 0) {
      const rule = battle.defeatConversations?.[defeatIndex];
      const earlier = battle.defeatConversations?.slice(0, defeatIndex).flatMap(entry => entry.conditions ?? []) ?? [];
      return defeatCondition(battleName, rule?.conditions ?? [], earlier);
    }
  }
  return conversationId === 'defeatDefault'
    ? l('Lose a normal battle', '通常戦闘で敗北')
    : l('View this event in game', 'ゲーム中にこのイベントを見る');
}

function defeatCondition(battleName: LocalizedText, conditions: ConditionDefinition[], earlier: ConditionDefinition[]): LocalizedText {
  const battle = localizedParts(battleName);
  const required = conditions.flatMap(conditionStatusNames).map(localizedParts);
  if (required.length > 0) {
    return l(
      `Lose in ${battle.en} while affected by ${required.map(name => name.en).join(' / ')}`,
      `${battle.ja}で${required.map(name => name.ja).join('・')}状態のまま敗北`,
    );
  }
  const excluded = earlier.flatMap(conditionStatusNames).map(localizedParts);
  if (excluded.length > 0) {
    return l(
      `Lose in ${battle.en} without ${excluded.map(name => name.en).join(' / ')}`,
      `${battle.ja}で${excluded.map(name => name.ja).join('・')}状態でないまま敗北`,
    );
  }
  return l(`Lose in ${battle.en}`, `${battle.ja}で敗北`);
}

function conditionStatusNames(condition: ConditionDefinition): LocalizedText[] {
  if (condition.kind !== 'status' || condition.operator !== 'has') return [];
  return [...(condition.status ? [condition.status] : []), ...(condition.statuses ?? [])]
    .map(status => STATUS_DESCRIPTIONS[status]?.name ?? l(status, status));
}

const TOKEN_HINTS: Record<string, LocalizedText> = {
  idle: l('Default pose', '通常時'), hover: l('While the portrait is hovered', '立ち絵にカーソルを合わせる'),
  novel: l('During a novel event', 'ノベルイベント中'), HPdamage: l('When taking HP damage', 'HPダメージ時'),
  EPdamage: l('When taking EP damage', 'EPダメージ時'), orgasm: l('When climaxing', '絶頂時'),
  hasInserted: l('While a body part is inserted', '部位に挿入されている時'),
  hasIntruded: l('While a body part is intruded', '部位に侵入されている時'),
  rubOneOut: l('While using Rub One Out', '自慰カード使用時'),
  seduction: l('While using Seduction', '誘惑カード使用時'),
};

export function portraitConditionHint(id: string): LocalizedText {
  const tokens = id.replace(/\.png$/i, '').split('_').slice(2, -1);
  const hints: LocalizedText[] = [];
  for (const token of tokens) {
    const known = TOKEN_HINTS[token];
    if (known) { hints.push(known); continue; }
    const status = STATUS_DESCRIPTIONS[token as keyof typeof STATUS_DESCRIPTIONS];
    if (status) {
      const name = localizedParts(status.name);
      hints.push(l(`While ${name.en}`, `${name.ja}状態`)); continue;
    }
    const percent = /^(HP|EP)(lt|lte|gt|gte)(\d+)per$/.exec(token);
    if (percent) {
      const [, gauge, operator, value] = percent;
      const op = operator === 'lt' ? '<' : operator === 'lte' ? '≤' : operator === 'gt' ? '>' : '≥';
      hints.push(l(`${gauge} ${op} ${value}%`, `${gauge} ${op} ${value}%`));
      continue;
    }
    const statusCount = /^(.+?)(lt|lte|gt|gte)(\d+)$/.exec(token);
    if (statusCount) {
      const [, statusId, operator, value] = statusCount;
      const definition = STATUS_DESCRIPTIONS[statusId as keyof typeof STATUS_DESCRIPTIONS];
      if (definition) {
        const name = localizedParts(definition.name);
        const op = operator === 'lt' ? '<' : operator === 'lte' ? '≤' : operator === 'gt' ? '>' : '≥';
        hints.push(l(`${name.en} stacks ${op} ${value}`, `${name.ja}が${value}${operator === 'lt' ? '未満' : operator === 'lte' ? '以下' : operator === 'gt' ? 'より多い' : '以上'}`));
        continue;
      }
    }
    hints.push(l(token, token));
  }
  if (hints.length === 0) return l('Default portrait', '通常の立ち絵');
  const parts = hints.map(localizedParts);
  return { en: parts.map(hint => hint.en).join(' / '), ja: parts.map(hint => hint.ja).join('・') };
}
