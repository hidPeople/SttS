import type { PortraitFactorRules } from './types';

export interface PortraitContext {
  playerId: string;
  category: string;
  statuses: ReadonlySet<string>;
  statusStacks?: ReadonlyMap<string, number>; // スタック数、または状態異常で管理している残りターン数。
  relics: ReadonlySet<string>;
  hpRatio: number;
  epRatio: number;
  hovered?: boolean;
}
type Candidate = { id: string; tags: string[]; key: string };
type ThresholdTag = { tag: string; base: string; group: 'statuses' | 'percentComparisons'; operator: 'gt' | 'gte' | 'lt' | 'lte'; value: number };

function matchesThreshold(rule: ThresholdTag, context: PortraitContext): boolean {
  if (rule.group === 'statuses' && !context.statuses.has(rule.base)) return false;
  const value = rule.group === 'statuses' ? context.statusStacks?.get(rule.base) ?? 1
    : context[rule.base === 'HP' ? 'hpRatio' : 'epRatio'];
  const threshold = rule.group === 'statuses' ? rule.value : rule.value / 100;
  switch (rule.operator) {
    case 'gt': return value > threshold;
    case 'gte': return value >= threshold;
    case 'lt': return value < threshold;
    case 'lte': return value <= threshold;
  }
}

/** Compare constraints in the same direction; opposite directions have no strictness relation. */
function compareThresholds(a: ThresholdTag, b: ThresholdTag, order: PortraitFactorRules['ThresholdOrder']): number {
  const greater = a.operator.startsWith('g');
  if (greater !== b.operator.startsWith('g')) return a.operator.localeCompare(b.operator);
  const difference = (greater ? b.value - a.value : a.value - b.value)
    || Number(a.operator.endsWith('e')) - Number(b.operator.endsWith('e'));
  return (order === 'stricter' ? 1 : -1) * difference || a.tag.localeCompare(b.tag);
}

/** Registered IDs may contain underscores. Reject ambiguous tokenizations instead of guessing. */
export function parsePortraitTags(source: string, dictionary: readonly string[], aliases: ReadonlyMap<string, string> = new Map()): string[] | undefined {
  const memo = new Map<string, string[][]>();
  const parse = (rest: string): string[][] => {
    if (!rest) return [[]];
    if (memo.has(rest)) return memo.get(rest)!;
    const results: string[][] = [];
    for (const tag of dictionary) {
      if (rest !== tag && !rest.startsWith(tag + '_')) continue;
      for (const tail of parse(rest === tag ? '' : rest.slice(tag.length + 1))) {
        results.push([tag, ...tail]);
        if (results.length > 1) { memo.set(rest, results); return results; }
      }
    }
    memo.set(rest, results); return results;
  };
  const results = parse(source).map(tags => tags.map(tag => aliases.get(tag) ?? tag));
  return results.length === 1 && new Set(results[0]).size === results[0].length ? results[0] : undefined;
}

/** Data-based selection with stable interruption history; randomize only on a new entry. */
export class PortraitSelection {
  readonly issues = new Map<string, string>();
  private history: { key: string; id: string }[] = [];
  private lastChosen = new Map<string, string>();
  private active = new Map<symbol, string>();
  private cache = new Map<string, Candidate[]>();
  private thresholdTags: ThresholdTag[] = [];
  private thresholdAliases = new Map<string, string>();
  constructor(private ids: readonly string[], private rules: PortraitFactorRules, private random = Math.random) {
    // Match registered bases as a whole (including IDs containing underscores).
    // Attached and separate suffixes share a canonical tag, hence the same random/history pool.
    const found = new Map<string, ThresholdTag>();
    for (const group of ['statuses', 'percentComparisons'] as const) for (const base of rules[group]) {
      const pattern = new RegExp('(?:^|_)' + base + '_?(gte|lte|gt|lt)([0-9]+(?:\\.[0-9]+)?)' + (group === 'percentComparisons' ? '(?:per)?' : '') + '(?=_|$)', 'g');
      for (const id of ids) for (const match of id.matchAll(pattern)) {
        const value = Number(match[2]);
        if (!Number.isFinite(value)) continue;
        const tag = base + match[1] + value + (group === 'percentComparisons' ? 'per' : '');
        found.set(tag, { tag, base, group, operator: match[1] as ThresholdTag['operator'], value });
        this.thresholdAliases.set(match[0].replace(/^_/, ''), tag);
      }
    }
    this.thresholdTags = [...found.values()].sort((a, b) => compareThresholds(a, b, rules.ThresholdOrder));
  }

  begin(tag: string): () => void {
    const token = Symbol(tag); this.active.set(token, tag);
    return () => { this.active.delete(token); };
  }
  clear(): void { this.active.clear(); this.history = []; }

  select(context: PortraitContext): string | undefined {
    const active = new Set(['idle', ...this.active.values()]);
    if (this.rules.states.includes('Death') && context.hpRatio <= 0) active.add('Death');
    if (this.rules.interactions.includes('hover') && context.hovered) active.add('hover');
    for (const id of this.rules.statuses) if (context.statuses.has(id)) active.add(id);
    for (const id of this.rules.relics) if (context.relics.has(id)) active.add(id);
    for (const rule of this.thresholdTags) if (matchesThreshold(rule, context)) active.add(rule.tag);
    // Object entry order is the data-authored priority. Non-array settings are not factors.
    const priority: string[] = Object.entries(this.rules).flatMap(([group, values]) => !Array.isArray(values) ? []
      : group === 'percentComparisons' || group === 'statuses'
        ? values.flatMap(base => [...this.thresholdTags.filter(rule => rule.group === group && rule.base === base).map(rule => rule.tag), ...(group === 'statuses' ? [base] : [])]) : values);
    let candidates: Candidate[] = [];
    for (const category of [...new Set([context.category, 'normal'])]) {
      candidates = this.candidates(context.playerId, category).filter(c => c.tags.every(tag => active.has(tag)));
      if (candidates.length) break;
    }
    candidates.push(...this.candidates(context.playerId, '').filter(c => c.tags.every(tag => active.has(tag))));
    if (!candidates.length) { this.history = []; return undefined; }
    const compare = (a: Candidate, b: Candidate) => {
      for (const tag of priority) {
        const delta = Number(b.tags.includes(tag)) - Number(a.tags.includes(tag));
        if (delta) return delta;
      }
      return b.tags.length - a.tags.length;
    };
    candidates.sort(compare);
    const best = candidates[0];
    const pool = candidates.filter(c => c.key === best.key);
    const valid = new Set(candidates.map(c => c.id));
    this.history = this.history.filter(entry => valid.has(entry.id));
    const previousIndex = this.history.findIndex(entry => entry.key === best.key);
    if (previousIndex >= 0) {
      this.history.length = previousIndex + 1;
      return this.history[previousIndex].id;
    }
    const choices = pool.length > 1 ? pool.filter(c => c.id !== this.lastChosen.get(best.key)) : pool;
    const chosen = choices[Math.min(choices.length - 1, Math.floor(Math.max(0, this.random()) * choices.length))];
    this.lastChosen.set(best.key, chosen.id);
    this.history.push({ key: best.key, id: chosen.id });
    return chosen.id;
  }

  private candidates(playerId: string, category: string): Candidate[] {
    const prefix = category ? `${playerId}_${category}_` : `${playerId}_`;
    if (this.cache.has(prefix)) return this.cache.get(prefix)!;
    const dictionary = [...new Set(['idle', ...this.rules.states, ...this.rules.statuses, ...this.rules.relics, ...this.rules.cards,
      ...this.rules.events, ...this.rules.interactions,
      ...this.thresholdTags.map(rule => rule.tag), ...this.thresholdAliases.keys()])];
    const result: Candidate[] = [];
    for (const id of this.ids) {
      if (!id.startsWith(prefix)) continue;
      const match = id.slice(prefix.length).match(/^(.+)_([1-9]\d*)$/);
      const tags = match && parsePortraitTags(match[1], dictionary, this.thresholdAliases);
      if (!tags || (tags.includes('idle') && this.rules.events.some(tag => tags.includes(tag)))) {
        if (category) this.issues.set(id, '状態タグが未登録・曖昧・重複、または番号/idleとの組合せが不正です。');
        continue;
      }
      result.push({ id, tags, key: prefix + [...tags].sort().join('|') });
    }
    this.cache.set(prefix, result); return result;
  }
}
