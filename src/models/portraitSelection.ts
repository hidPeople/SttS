import type { PortraitFactorRules } from './types';

export interface PortraitContext {
  playerId: string;
  category: string;
  statuses: ReadonlySet<string>;
  relics: ReadonlySet<string>;
  hpRatio: number;
  epRatio: number;
}
type Candidate = { id: string; tags: string[]; key: string };

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
  constructor(private ids: readonly string[], private rules: PortraitFactorRules, private random = Math.random) {}

  begin(tag: string): () => void {
    const token = Symbol(tag); this.active.set(token, tag);
    return () => { this.active.delete(token); };
  }
  clear(): void { this.active.clear(); this.history = []; }

  select(context: PortraitContext): string | undefined {
    const active = new Set(['idle', ...this.active.values()]);
    for (const id of this.rules.statuses) if (context.statuses.has(id)) active.add(id);
    for (const id of this.rules.relics) if (context.relics.has(id)) active.add(id);
    for (const [rules, ratio] of [[this.rules.hpRatios, context.hpRatio], [this.rules.epRatios, context.epRatio]] as const) {
      for (const rule of rules) if (ratio >= (rule.min ?? 0) && ratio <= (rule.max ?? 1)) active.add(rule.tag);
    }
    // Persistent situation takes precedence; peak interrupts damage, and damage interrupts card art.
    const priority = [
      ...[...this.rules.statuses].reverse(), ...[...this.rules.relics].reverse(),
      ...[...this.rules.events].reverse(), ...[...this.rules.cards].reverse(),
      ...[...this.rules.hpRatios].reverse().map(r => r.tag), ...[...this.rules.epRatios].reverse().map(r => r.tag),
    ];
    let candidates: Candidate[] = [];
    for (const category of [...new Set([context.category, 'normal'])]) {
      candidates = this.candidates(context.playerId, category).filter(c => c.tags.every(tag => active.has(tag)));
      if (candidates.length) break;
    }
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
    const prefix = `${playerId}_${category}_`;
    if (this.cache.has(prefix)) return this.cache.get(prefix)!;
    const dictionary = [...new Set(['idle', ...this.rules.statuses, ...this.rules.relics, ...this.rules.cards,
      ...this.rules.events, ...this.rules.hpRatios.map(r => r.tag), ...this.rules.epRatios.map(r => r.tag)])];
    const result: Candidate[] = [];
    for (const id of this.ids) {
      if (!id.startsWith(prefix)) continue;
      const match = id.slice(prefix.length).match(/^(.+)_([1-9]\d*)$/);
      const tags = match && parsePortraitTags(match[1], dictionary);
      if (!tags || (tags.includes('idle') && this.rules.events.some(tag => tags.includes(tag)))) {
        this.issues.set(id, '状態タグが未登録・曖昧・重複、または番号/idleとの組合せが不正です。'); continue;
      }
      result.push({ id, tags, key: prefix + [...tags].sort().join('|') });
    }
    this.cache.set(prefix, result); return result;
  }
}
