import { STATUS_DESCRIPTIONS } from '../data/statuses';
import { localizeGameText } from './gameText';
import { SETTINGS_STATE, type Language } from './localization';
import type { CardDefinition, StatusEffect } from './types';

export type CardTerm = StatusEffect | 'block';
export type CardTextSegment = { text: string; term?: CardTerm; bold?: boolean; color?: string };

/** Preserve authored descriptions and base numbers, tagging only glossary terms. */
export function cardDescriptionSegments(card: CardDefinition, language: Language = SETTINGS_STATE.language): CardTextSegment[] {
  const aliases = new Map<string, CardTerm>();
  for (const [id, definition] of Object.entries(STATUS_DESCRIPTIONS)) {
    for (const alias of [id, localizeGameText(definition.name, 'en'), localizeGameText(definition.name, 'ja')]) {
      if (alias) aliases.set(alias.toLowerCase(), id as StatusEffect);
    }
  }
  aliases.set('block', 'block');
  aliases.set('ブロック', 'block');
  const alternatives = [...aliases.keys()].sort((a, b) => b.length - a.length)
    .map((alias) => alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`(?<![a-z])(?:${alternatives.join('|')})(?![a-z])`, 'gi');
  const description = localizeGameText(card.description, language);
  const segments: CardTextSegment[] = [];
  let cursor = 0;
  for (const match of description.matchAll(pattern)) {
    const start = match.index!;
    if (start > cursor) segments.push({ text: description.slice(cursor, start) });
    const term = aliases.get(match[0].toLowerCase())!;
    const text = term === 'block' ? (language === 'ja' ? 'ブロック' : 'Block') : localizeGameText(STATUS_DESCRIPTIONS[term].name, language);
    segments.push({ text, term });
    cursor = start + match[0].length;
  }
  if (cursor < description.length) segments.push({ text: description.slice(cursor) });
  return segments;
}
