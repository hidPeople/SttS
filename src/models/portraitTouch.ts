import type { PortraitPoint } from './types';

export type PortraitTouchTarget = 'sigil' | 'M' | 'B' | 'C' | 'V' | 'A' | 'head';

export interface PortraitTouchCandidate extends PortraitPoint {
  target: Exclude<PortraitTouchTarget, 'head'>;
}

const PRIORITY: readonly PortraitTouchTarget[] = ['sigil', 'M', 'B', 'C', 'V', 'A', 'head'];

/** Select the closest configured point; exact ties use the documented body-part priority. */
export function resolvePortraitTouch(
  pointer: PortraitPoint,
  candidates: readonly PortraitTouchCandidate[],
  radius: number,
  headEligible: boolean,
): PortraitTouchTarget | undefined {
  const radiusSquared = Math.max(0, radius) ** 2;
  const matches = candidates
    .map((candidate) => ({ candidate, distance: (pointer.x - candidate.x) ** 2 + (pointer.y - candidate.y) ** 2 }))
    .filter(({ distance }) => distance <= radiusSquared)
    .sort((left, right) => left.distance - right.distance
      || PRIORITY.indexOf(left.candidate.target) - PRIORITY.indexOf(right.candidate.target));
  return matches[0]?.candidate.target ?? (headEligible ? 'head' : undefined);
}
