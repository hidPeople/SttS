import { STATUS_DESCRIPTIONS } from '../data/statuses';
import { CARD_DEFINITIONS } from '../data/cards';
import { RELIC_DEFINITIONS } from '../data/relics';
import { CARD_SYSTEM_TERMS, CARD_SYSTEM_TERM_COLOR, CARD_BLOCK_CARRY_DESCRIPTION, CARD_EFFECT_TEXT, CARD_TEXT_TARGETS, CARD_VALUE_BASES, CARD_TEXT_PHRASES, CARD_CONDITION_NAMES, CARD_CONDITION_OPERATORS } from '../data/cardText';
import { localizeGameText } from './gameText';
import { SETTINGS_STATE, type Language, type LocalizedText } from './localization';
import type { CardDefinition, StatusEffect, EffectDefinition, CardTextSection, ConditionDefinition } from './types';

export type CardTerm = StatusEffect | keyof typeof CARD_SYSTEM_TERMS;
export type CardTextSegment = { text: string; term?: CardTerm; bold?: boolean; color?: string; noWrap?: boolean; };
export interface CardEffectPreview {
  amounts: number[];
  baseAmounts: number[];
  times?: number;
  chance?: number;
  fromStatus?: StatusEffect;
  status?: StatusEffect;
  statusBlocked?: boolean;
}
export interface CardTextContext {
  preview?: (effect: EffectDefinition) => CardEffectPreview;
}
export function isCardSystemTerm(term: CardTerm): term is keyof typeof CARD_SYSTEM_TERMS { return Object.prototype.hasOwnProperty.call(CARD_SYSTEM_TERMS, term); }
export function cardTermDescription(term: CardTerm, carryBlock = false, language: Language = SETTINGS_STATE.language): string {
  return localizeGameText(isCardSystemTerm(term) ? term === 'block' && carryBlock ? CARD_BLOCK_CARRY_DESCRIPTION : CARD_SYSTEM_TERMS[term].description : STATUS_DESCRIPTIONS[term].description, language);
}
const formatNumber = (value: number) => String(Number(value.toFixed(4)));
const segments = (text: string, bold = false): CardTextSegment[] => text ? [{ text, ...(bold ? { bold } : {}) }] : [];
const sections: CardTextSection[] = ['conditions', 'description', 'effects', 'categories', 'vanish', 'temporary'];

let glossary: { aliases: Map<string, CardTerm>; pattern: RegExp; } | undefined;
function cardGlossary() {
  if(glossary) return glossary;
  const aliases = new Map<string, CardTerm>();
  for(const [id, definition] of Object.entries({ ...STATUS_DESCRIPTIONS, ...CARD_SYSTEM_TERMS })) {
    for(const alias of [id, localizeGameText(definition.name, 'en'), localizeGameText(definition.name, 'ja')]) if(alias) aliases.set(alias.toLowerCase(), id as CardTerm);
  }
  const pattern = new RegExp(`(?<![a-z])(?:${[...aliases.keys()].sort((a, b) => b.length - a.length).map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![a-z])`, 'gi');
  return glossary = { aliases, pattern };
}

/** One language-aware glossary used for authored and generated sentences in every card view. */
export function cardGlossarySegments(text: string, language: Language): CardTextSegment[] {
  const { aliases, pattern } = cardGlossary();
  const result: CardTextSegment[] = [];
  let cursor = 0;
  for(const match of text.matchAll(pattern)) {
    result.push(...segments(text.slice(cursor, match.index)));
    const term = aliases.get(match[0].toLowerCase())!;
    const definition = isCardSystemTerm(term) ? CARD_SYSTEM_TERMS[term] : STATUS_DESCRIPTIONS[term];
    result.push({ text: localizeGameText(definition.name, language), term, ...(isCardSystemTerm(term) ? { color: CARD_SYSTEM_TERM_COLOR } : {}) });
    cursor = match.index! + match[0].length;
  }
  result.push(...segments(text.slice(cursor)));
  return result;
}
function interpolate(template: string, values: Record<string, CardTextSegment[]>, language: Language): CardTextSegment[] {
  const out: CardTextSegment[] = [];
  let cursor = 0;
  for(const match of template.matchAll(/\{([^{}]+)\}/g)) {
    out.push(...cardGlossarySegments(template.slice(cursor, match.index), language));
    out.push(...(values[match[1]] ?? segments(match[0])));
    cursor = match.index! + match[0].length;
  }
  out.push(...cardGlossarySegments(template.slice(cursor), language));
  return out;
}
function resolveReference(card: CardDefinition, token: string): { effect: EffectDefinition; field: string; } | undefined {
  const parts = token.split('.');
  if(parts.length !== 3) return;
  const [target, kind, field] = parts;
  const matches = card.effects.filter(effect => target === 'effect' ? effect.textId === kind : effect.target === target && effect.kind === kind);
  if(matches.length === 1 && ['amount', 'times', 'status', 'stacks', 'ratio', 'base', 'chance', 'text'].includes(field)) return { effect: matches[0], field };
}
/** Used by editor validation too: ambiguous references never bind to an arbitrary array index. */
export function cardTextIssues(card: CardDefinition): string[] {
  const issues: string[] = [];
  const names = card.effects.map(e => e.textId).filter(Boolean);
  if(new Set(names).size !== names.length) issues.push('textIdはカード内で一意にしてください。');
  if(names.some(name => name && !/^[^\s.{}]+$/.test(name))) issues.push('textIdに空白・ピリオド・波括弧は使えません。');
  for(const section of card.textOrder ?? []) if(section.startsWith('effect.') && card.effects.filter(e => e.textId === section.slice(7)).length !== 1) issues.push(`${section}のtextIdが存在しないか重複しています。`);
  for(const language of ['ja', 'en'] as const) {
    const text = card.description ? localizeGameText(card.description, language) : '';
    for(const [, token] of text.matchAll(/\{([^{}]+)\}/g)) {
      if(token.includes('.') && !resolveReference(card, token)) issues.push(`${language}: {${token}} の対象・効果・値が存在しないか、同種効果が複数あります。textIdで区別してください。`);
      if(token === 'amount') issues.push(`${language}: {amount}は対象が曖昧です。{selectedEnemy.hpDamage.amount}などを指定してください。`);
    }
  }
  return [...new Set(issues)];
}

export function cardDescriptionLines(card: CardDefinition, language: Language = SETTINGS_STATE.language, context: CardTextContext = {}): CardTextSegment[][] {
  const local = (text: LocalizedText) => localizeGameText(text, language);
  const term = (id: CardTerm) => cardGlossarySegments(id, language);
  const fill = (text: LocalizedText, values: Record<string, CardTextSegment[]>) => interpolate(local(text), values, language);
  const effectData = new Map<EffectDefinition, { values: Record<string, CardTextSegment[]>; line: CardTextSegment[]; }>();
  for(const effect of card.effects) {
    const preview = context.preview?.(effect);
    const range = (values: number[], base?: number[]) => {
      const min = Math.min(...values), max = Math.max(...values);
      const bold = Boolean(base && (Math.min(...base) !== min || Math.max(...base) !== max));
      return min === max ? segments(formatNumber(min), bold) : [...segments(formatNumber(min), bold), ...segments('～'), ...segments(formatNumber(max), bold)];
    };
    let amount = preview ? range(preview.amounts, preview.baseAmounts) : effect.randomAmount ? range([Math.ceil(effect.randomAmount.min), Math.ceil(effect.randomAmount.max)]) : segments(formatNumber(effect.amount));
    if(effect.randomAmount) amount = fill(CARD_TEXT_PHRASES.random, { value: amount });
    else if(!preview && effect.percentOf) amount = fill(CARD_TEXT_PHRASES.percent, { value: segments(formatNumber(effect.amount * 100)), base: segments(local(CARD_VALUE_BASES[effect.percentOf])) });
    const ignoresTimes = ['status', 'drawCards', 'addCardToHand'].includes(effect.kind);
    const times = ignoresTimes ? 1 : preview?.times ?? effect.times;
    const effectiveStatus = preview?.status ?? effect.status;
    const status = effectiveStatus ? term(effectiveStatus) : effect.statusGroup
      ? Object.entries(STATUS_DESCRIPTIONS).filter(([, value]) => value.exclusiveGroup === effect.statusGroup).flatMap(([id], i) => [...segments(i ? '／' : ''), ...term(id as StatusEffect)]) : [];
    const stackAmounts = effect.stacks !== undefined ? [effect.stacks] : preview?.amounts ?? (effect.randomAmount ? [Math.ceil(effect.randomAmount.min), Math.ceil(effect.randomAmount.max)] : [effect.amount]);
    const stackValue = range(stackAmounts, effect.stacks !== undefined ? undefined : preview?.baseAmounts);
    if(effect.kind === 'status' && effect.stacks !== undefined) amount = segments(formatNumber(effect.stacks));
    const values: Record<string, CardTextSegment[]> = {
      amount, target: segments(local(CARD_TEXT_TARGETS[effect.target])), status,
      from: preview?.fromStatus ? term(preview.fromStatus) : [],
      stacks: stackValue,
      stackSuffix: Math.max(...stackAmounts) !== 1 || Math.min(...stackAmounts) !== 1 ? [...segments('×'), ...(effect.randomAmount && effect.stacks === undefined ? fill(CARD_TEXT_PHRASES.random, { value: stackValue }) : stackValue)] : [],
      times: segments(String(times), times !== (ignoresTimes ? 1 : effect.times)),
      repeat: times > 1 ? [...segments(' ×'), ...segments(String(times), times !== effect.times)] : [],
      ratio: segments(formatNumber(effect.amount * 100)),
      base: segments(local(CARD_VALUE_BASES[effect.ratioBase ?? effect.percentOf ?? 'playerMaxEp'])),
      chance: segments(formatNumber((preview?.chance ?? effect.chance ?? 1) * 100), preview?.chance !== undefined && preview.chance !== (effect.chance ?? 1)),
      card: segments(effect.cardId ? local(CARD_DEFINITIONS[effect.cardId]?.name ?? effect.cardId) : ''), block: term('block'),
    };
    let template = CARD_EFFECT_TEXT[effect.kind];
    if(effect.kind === 'energyGain' && !effect.randomAmount) {
      template = effect.amount < 0 ? CARD_TEXT_PHRASES.energyLoss : CARD_TEXT_PHRASES.energyGain;
      if(effect.amount < 0) values.amount = preview ? range(preview.amounts.map(Math.abs), preview.baseAmounts.map(Math.abs)) : segments(formatNumber(Math.abs(effect.amount)));
    }
    if(effect.kind === 'status' && preview?.statusBlocked) template = CARD_TEXT_PHRASES.blocked;
    else if(effect.kind === 'status' && preview?.fromStatus && preview.status) template = preview.fromStatus === preview.status ? CARD_TEXT_PHRASES.unchanged : CARD_TEXT_PHRASES.upgrade;
    const line = fill(template, values);
    if(effect.onlyDuringPlayerTurn) line.unshift(...fill(CARD_TEXT_PHRASES.turnOnly, {}));
    if(effect.chance !== undefined && !['drawCards', 'addCardToHand'].includes(effect.kind)) line.unshift(...fill(CARD_TEXT_PHRASES.chance, { value: values.chance }));
    effectData.set(effect, { values: { ...values, text: line }, line });
  }
  const used = new Map<EffectDefinition, Set<string>>();
  const customValues: Record<string, CardTextSegment[]> = {};
  const custom = card.description ? localizeGameText(card.description, language, {
    relatedEnemyName: card.relatedEnemyName ? local(card.relatedEnemyName) : language === 'ja' ? '敵' : 'the enemy',
    relatedIntrusionPart: card.relatedIntrusionPart ? local(card.relatedIntrusionPart) : card.relatedEnemyName ? local(card.relatedEnemyName) : language === 'ja' ? '対象' : 'the target',
  }) : '';
  for(const [, token] of custom.matchAll(/\{([^{}]+)\}/g)) {
    const ref = resolveReference(card, token);
    if(ref) {
      if(!used.has(ref.effect)) used.set(ref.effect, new Set());
      used.get(ref.effect)!.add(ref.field);
      customValues[token] = effectData.get(ref.effect)!.values[ref.field];
    }
  }
  // Preserve chance/repeat/turn constraints when custom prose replaces an effect's automatic sentence.
  const supplements: CardTextSegment[][] = [];
  for(const [effect, fields] of used) {
    if(fields.has('text')) continue;
    const { values } = effectData.get(effect)!;
    const notes: CardTextSegment[][] = [];
    if(effect.chance !== undefined && !fields.has('chance') && !['drawCards', 'addCardToHand'].includes(effect.kind)) notes.push(fill(CARD_TEXT_PHRASES.probability, { value: values.chance }));
    if(values.repeat.length && !fields.has('times')) notes.push(fill(CARD_TEXT_PHRASES.repetitions, { value: values.times }));
    if(effect.onlyDuringPlayerTurn) notes.push(fill(CARD_TEXT_PHRASES.turnOnly, {}));
    if(notes.length) supplements.push(fill(CARD_TEXT_PHRASES.supplement, { target: values.target, value: notes.flatMap((note, i) => [...segments(i ? ' / ' : ''), ...note]) }));
  }
  const conditionLines = card.conditions.map(condition => {
    if(condition.kind === 'cardsPlayedThisTurn' && condition.operator === 'eq' && condition.value === 0) return fill(CARD_TEXT_PHRASES.turnStart, {});
    return fill(CARD_TEXT_PHRASES.condition, { value: conditionText(condition, language) });
  });
  const groups: Record<CardTextSection, CardTextSegment[][]> = {
    description: custom ? [interpolate(custom, customValues, language), ...supplements] : [], conditions: conditionLines,
    effects: card.effects.filter(e => !used.has(e)).map(e => effectData.get(e)!.line),
    // Card behavior labels always form one footer, regardless of input/textOrder order.
    categories: [], vanish: [], temporary: [],
  };
  const order = [...new Set([...(card.textOrder ?? sections), ...sections])];
  const individuallyPlaced = new Set(order.filter(section => section.startsWith('effect.')).map(section => section.slice(7)));
  groups.effects = card.effects.filter(e => !used.has(e) && !individuallyPlaced.has(e.textId ?? '')).map(e => effectData.get(e)!.line);
  const body = order.flatMap(section => {
    if(!section.startsWith('effect.')) return groups[section as CardTextSection];
    const effect = card.effects.find(e => e.textId === section.slice(7));
    return effect && !used.has(effect) ? [effectData.get(effect)!.line] : [];
  });
  const footerTerms: CardTerm[] = [];
  if (card.categories.includes('noMotion')) footerTerms.push('noMotion');
  if (card.vanish) footerTerms.push('vanish');
  if (card.temporary) footerTerms.push('temporary');
  const footer = footerTerms.flatMap((id, index) => [...segments(index ? local(CARD_TEXT_PHRASES.keywordSeparator) : ''), ...term(id)])
    .map(segment => ({ ...segment, noWrap: true }));
  return footer.length ? [...body, footer] : body;
}
function conditionText(condition: ConditionDefinition, language: Language): CardTextSegment[] {
  const local = (v: LocalizedText) => localizeGameText(v, language);
  const target = condition.target ? String(condition.target) : 'player';
  const name = target === 'player' ? local(CARD_TEXT_TARGETS.player) : target === 'selectedEnemy' ? local(CARD_TEXT_TARGETS.selectedEnemy) : target;
  const states = condition.statuses ?? (condition.status ? [condition.status] : []);
  const relics = condition.relicIds ?? (condition.relicId ? [condition.relicId] : []);
  const details = states.map(s => local(STATUS_DESCRIPTIONS[s].name)).concat(relics.map(id => local(RELIC_DEFINITIONS[id]?.name ?? id)), condition.enemyTraits ?? (condition.enemyTrait ? [condition.enemyTrait] : []), condition.parts ?? [], condition.bodyPartStatusKinds ?? [], condition.valueKey ? [condition.valueKey] : []);
  const value = typeof condition.value === 'number' && ['hpPercent', 'epPercent'].includes(condition.kind) ? `${condition.value * 100}%` : condition.value === undefined ? '' : String(condition.value);
  return cardGlossarySegments(`${name}：${local(CARD_CONDITION_NAMES[condition.kind])} ${details.join('／')} ${local(CARD_CONDITION_OPERATORS[condition.operator])} ${value}`, language);
}
/** Compatibility entry point for base-value galleries and rewards; all routes use the same generator. */
export function cardDescriptionSegments(card: CardDefinition, language: Language = SETTINGS_STATE.language): CardTextSegment[] {
  return cardDescriptionLines(card, language).flatMap((line, index) => [...segments(index ? '\n' : ''), ...line]);
}
