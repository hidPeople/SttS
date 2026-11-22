import { CONVERSATIONS, CONVERSATION_EVENTS } from '../data/conversations';
import { EVENT_BATTLES } from '../data/eventBattles';
import { ENEMY_DEFINITIONS } from '../data/enemies';
import { STATUS_DESCRIPTIONS } from '../data/statuses';
import { text as l, type LocalizedText } from './localization';

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
      thumbnail: metadata.thumbnail || CONVERSATIONS[conversationId]?.find(page => page.background)?.background,
      condition: conversationUnlockCondition(conversationId),
    }));
}

export function conversationUnlockCondition(conversationId: string): LocalizedText {
  const event = CONVERSATION_EVENTS[conversationId];
  if (event?.defeatEnemyId) return defeatHint([event.defeatEnemyId]);
  if (event?.defeatWhen) return defeatHint(event.defeatWhen.enemyIds ?? []);
  for (const [battleId, battle] of Object.entries(EVENT_BATTLES)) {
    const battleName = localizedParts(battleId === 'prologue' ? l('Prologue', 'プロローグ') : l(battleId, battleId));
    if (battle.introConversationId === conversationId) {
      return l(`Before the ${battleName.en} battle`, `${battleName.ja}の戦闘開始前`);
    }
    if (battle.victoryConversationId === conversationId) {
      return l(`Win the ${battleName.en} battle`, `${battleName.ja}で勝利`);
    }
    if (battle.defeatConversations?.some(rule => rule.conversationId === conversationId)) {
      return defeatHint(battle.enemyIds);
    }
  }
  return conversationId === 'defeatDefault'
    ? l('Lose a normal battle', '通常戦闘で敗北')
    : l('View this event in game', 'ゲーム中にこのイベントを見る');
}

function defeatHint(enemyIds: string[]): LocalizedText {
  const names = [...new Set(enemyIds)].map(id => localizedParts(ENEMY_DEFINITIONS[id]?.name ?? id));
  if (!names.length) return l('Lose a battle', '戦闘で敗北');
  return l(`Lose to ${names.map(name => name.en).join(' & ')}`, `${names.map(name => name.ja).join('・')}に敗北`);
}

const TOKEN_HINTS: Record<string, LocalizedText> = {
  idle: l('Default pose', '通常時'), hover: l('Hover over the portrait', '立ち絵にカーソルを合わせる'),
  novel: l('During a novel event', 'ノベルイベント中'), HPdamage: l('When taking HP damage', 'HPダメージ時'),
  EPdamage: l('When taking EP damage', 'EPダメージ時'), orgasm: l('When climaxing', '絶頂時'),
  hasInserted: l('During insertion', '部位に挿入されている時'),
  hasIntruded: l('During intrusion', '部位に侵入されている時'),
  rubOneOut: l('While using Rub One Out', '自慰カード使用時'),
  seduction: l('While using Seduction', '誘惑カード使用時'),
};

export function portraitConditionHint(id: string): LocalizedText {
  const tokens = id.replace(/\.png$/i, '').split('_').slice(2, -1);
  const hints: LocalizedText[] = [];
  for (const token of tokens) {
    if (token === 'novel') {
      const titles = portraitNovelEventTitles(id);
      if (titles.length > 0) {
        const names = titles.map(localizedParts);
        hints.push(l(
          `During ${names.map(name => `“${name.en}”`).join(' / ')}`,
          `${names.map(name => `「${name.ja}」`).join('・')}中`,
        ));
        continue;
      }
    }
    const known = TOKEN_HINTS[token];
    if (known) { hints.push(known); continue; }
    const status = STATUS_DESCRIPTIONS[token as keyof typeof STATUS_DESCRIPTIONS];
    if (status) {
      const name = localizedParts(status.name);
      hints.push(l(`Status: ${name.en}`, `${name.ja}状態`)); continue;
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
        const isTurns = definition.triggers.some(trigger => trigger.consumeRule === 'one');
        const unit = isTurns ? l('turn', 'ターン') : l('stack', 'スタック');
        const localizedUnit = localizedParts(unit);
        const englishOperator = operator === 'lt' ? '<' : operator === 'lte' ? '≤' : operator === 'gt' ? '>' : '≥';
        const japaneseOperator = operator === 'lt' ? '未満' : operator === 'lte' ? '以下' : operator === 'gt' ? 'より多い' : '以上';
        hints.push(l(
          `${name.en} ${englishOperator} ${value} ${localizedUnit.en}${Number(value) === 1 ? '' : 's'}`,
          `${name.ja}が${value}${localizedUnit.ja}${japaneseOperator}`,
        ));
        continue;
      }
    }
    hints.push(l(token, token));
  }
  if (hints.length === 0) return l('Default portrait', '通常の立ち絵');
  const parts = hints.map(localizedParts);
  return { en: parts.map(hint => hint.en).join(' / '), ja: parts.map(hint => hint.ja).join('・') };
}

function portraitNovelEventTitles(id: string): LocalizedText[] {
  const portraitId = id.replace(/\.png$/i, '');
  return Object.entries(CONVERSATIONS)
    .filter(([, pages]) => pages.some(page => page.portrait?.replace(/\.png$/i, '') === portraitId))
    .map(([conversationId]) => CONVERSATION_EVENTS[conversationId]?.title)
    .filter((title): title is LocalizedText => Boolean(title));
}
