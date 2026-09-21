import type { PortraitFactorRules, PortraitPercentComparison } from './types';

export interface PortraitContext {
  playerId: string;
  category: string;
  statuses: ReadonlySet<string>;
  relics: ReadonlySet<string>;
  hpRatio: number;
  epRatio: number;
  hovered?: boolean;
}
type Candidate = { id: string; tags: string[]; key: string };
type PercentTag = { tag: string; stat: 'hpRatio' | 'epRatio'; operator: 'gt' | 'gte' | 'lt' | 'lte'; ratio: number; priority: number };

/** Percent numbers belong to filenames, so new thresholds need no additional rule registration. */
function percentTag(tag: string, enabled: readonly PortraitPercentComparison[]): PercentTag | undefined {
  const match = tag.match(/^(HP|EP)(gte|lte|gt|lt)(\d+(?:\.\d+)?)per$/);
  if (!match) return;
  const priority = enabled.indexOf(`${match[1]}${match[2]}` as PortraitPercentComparison);
  const ratio = Number(match[3]) / 100;
  if (priority < 0 || !Number.isFinite(ratio)) return;
  return { tag, stat: match[1] === 'HP' ? 'hpRatio' : 'epRatio', operator: match[2] as PercentTag['operator'], ratio, priority };
}

function matchesPercent(rule: PercentTag, context: PortraitContext): boolean {
  const value = context[rule.stat];
  switch (rule.operator) {
    case 'gt': return value > rule.ratio;
    case 'gte': return value >= rule.ratio;
    case 'lt': return value < rule.ratio;
    case 'lte': return value <= rule.ratio;
  }
}

/** Registered IDs may contain underscores. Reject ambiguous tokenizations instead of guessing. */
export function parsePortraitTags(source: string, dictionary: readonly string[]): string[] | undefined {
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
  const results = parse(source);
  return results.length === 1 && new Set(results[0]).size === results[0].length ? results[0] : undefined;
}

/** Data-based selection with stable interruption history; randomize only on a new entry. */
export class PortraitSelection {
  readonly issues = new Map<string, string>();
  private history: { key: string; id: string }[] = [];
  private lastChosen = new Map<string, string>();
  private active = new Map<symbol, string>();
  private cache = new Map<string, Candidate[]>();
  private percentTags: PercentTag[];
  constructor(private ids: readonly string[], private rules: PortraitFactorRules, private random = Math.random) {
    this.percentTags = [...new Set(ids.flatMap(id => id.split('_')))]
      .map(tag => percentTag(tag, rules.percentComparisons)).filter((rule): rule is PercentTag => Boolean(rule))
      .sort((a, b) => a.priority - b.priority
        || (rules.percentThresholdOrder === 'stricter' ? 1 : -1) * (a.operator.startsWith('g') ? b.ratio - a.ratio : a.ratio - b.ratio)
        || a.tag.localeCompare(b.tag));
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
    for (const rule of this.percentTags) if (matchesPercent(rule, context)) active.add(rule.tag);
    // Object entry order is the data-authored priority. Non-array settings are not factors.
    const priority: string[] = Object.entries(this.rules).flatMap(([group, values]) => !Array.isArray(values) ? []
      : group === 'percentComparisons' ? this.percentTags.map(rule => rule.tag) : values);
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
      ...this.percentTags.map(rule => rule.tag)])];
    const result: Candidate[] = [];
    for (const id of this.ids) {
      if (!id.startsWith(prefix)) continue;
      const match = id.slice(prefix.length).match(/^(.+)_([1-9]\d*)$/);
      const tags = match && parsePortraitTags(match[1], dictionary);
      if (!tags || (tags.includes('idle') && this.rules.events.some(tag => tags.includes(tag)))) {
        if (category) this.issues.set(id, '状態タグが未登録・曖昧・重複、または番号/idleとの組合せが不正です。');
        continue;
      }
      result.push({ id, tags, key: prefix + [...tags].sort().join('|') });
    }
    this.cache.set(prefix, result); return result;
  }
}
