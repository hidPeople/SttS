import { PORTRAIT_OVERLAY_RULES, PORTRAIT_OVERLAY_STYLE, type PortraitOverlayRule } from '../data/epPresentation';
import { EP_DAMAGE_PARTS, type EnemyDefinition, type EpDamagePart } from './types';

export interface PortraitMark {
  material: string;
  file: string;
  part: EpDamagePart;
  blend: number; // B1とB2の間の位置
  dx: number;
  dy: number;
  size: number;
  age: number;
  besideM?: true; // 部位も接続もなかったときの付着。dxで選んだ左右を保存する。
}

export function overlayRules(trigger: PortraitOverlayRule['trigger'], enemy: EnemyDefinition): PortraitOverlayRule[] {
  return PORTRAIT_OVERLAY_RULES.filter(rule => rule.trigger === trigger
    && (!rule.enemyIds || rule.enemyIds.includes(enemy.id))
    && (!rule.trait || enemy.traits?.includes(rule.trait)));
}

/** The first player turn after application stays at full strength. */
export function portraitMarkStrength(age: number, turns = PORTRAIT_OVERLAY_STYLE.turns): number {
  if (turns <= 0) return 0;
  return Math.max(0, 1 - Math.max(0, age - 1) / Math.max(1, turns - 1));
}

export function savedPortraitMarks(value: unknown): PortraitMark[] {
  if (!Array.isArray(value)) return [];
  return value.slice(-PORTRAIT_OVERLAY_STYLE.maxMarks).filter((m): m is PortraitMark => m
    && PORTRAIT_OVERLAY_RULES.some(rule => rule.material === m.material)
    && typeof m.file === 'string' && EP_DAMAGE_PARTS.includes(m.part)
    && [m.blend, m.dx, m.dy, m.size].every(n => Number.isFinite(n) && n >= 0 && n <= 1)
    && Number.isInteger(m.age) && m.age >= 0 && portraitMarkStrength(m.age) > 0);
}

export interface OverlayPlacement {
  rule: PortraitOverlayRule;
  part: EpDamagePart;
  besideM?: true;
}

/** Plan all simultaneous placements of one material before committing any of them. */
export function chooseOverlayFiles(files: readonly string[], parts: readonly EpDamagePart[],
  previous: ReadonlyMap<EpDamagePart, string>, random = Math.random): string[] {
  if (!files.length) return [];
  const last = new Map(previous);
  const chosen: string[] = [];
  const pick = <T>(items: T[]) => items[Math.floor(random() * items.length)];
  for (let start = 0; start < parts.length; start += files.length) {
    const available = new Set(files);
    const seen = new Set<EpDamagePart>();
    const exclusions: (string | undefined)[] = [];
    const round = parts.slice(start, start + files.length);
    for (const part of round) {
      // Within a round all files are distinct, so only its first stamp on a part needs the old exclusion.
      const excluded = seen.has(part) ? undefined : last.get(part);
      const options = [...available].filter(file => file !== excluded);
      let file: string;
      if (options.length) {
        file = pick(options);
      } else {
        // The sole unused file is forbidden here. Exchange an earlier draw if it can use that file.
        const spare = excluded!;
        const swaps = exclusions.flatMap((prior, i) => prior !== spare ? [start + i] : []);
        if (swaps.length) {
          const index = pick(swaps);
          file = chosen[index];
          chosen[index] = spare;
          available.delete(spare);
        } else {
          // All parts exclude the same remaining file. Prefer avoiding a repeat on the same part.
          file = files.length === 1 ? files[0] : pick(files.filter(f => f !== spare));
        }
      }
      available.delete(file);
      chosen.push(file);
      exclusions.push(excluded);
      seen.add(part);
    }
    round.forEach((part, index) => last.set(part, chosen[start + index]));
  }
  return chosen;
}

/** Either side of an action can resolve first. Pair each peak with each distinct hit part once. */
export class ActionOverlayHits {
  private parts = new Set<EpDamagePart>();
  private peaks: { rule: PortraitOverlayRule; connected: EpDamagePart[] }[] = [];

  constructor(private place: (placements: OverlayPlacement[]) => void) {}

  hit(parts: EpDamagePart[]): void {
    const placements: OverlayPlacement[] = [];
    for (const part of parts) {
      if (this.parts.has(part)) continue;
      this.parts.add(part);
      for (const { rule } of this.peaks) placements.push({ rule, part });
    }
    if (placements.length) this.place(placements);
  }

  peak(rule: PortraitOverlayRule, connected: EpDamagePart[]): void {
    this.peaks.push({ rule, connected });
    if (this.parts.size) this.place([...this.parts].map(part => ({ rule, part })));
  }

  finish(): void {
    if (this.parts.size) return;
    const placements: OverlayPlacement[] = [];
    for (const { rule, connected } of this.peaks) {
      for (const part of new Set(connected)) placements.push({ rule, part });
      if (!connected.length && rule.unconnectedMOffsetRatio !== undefined) placements.push({ rule, part: 'M', besideM: true });
    }
    if (placements.length) this.place(placements);
  }
}
