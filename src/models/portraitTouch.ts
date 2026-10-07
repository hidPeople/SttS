import type { PortraitPoint } from './types';

export type PortraitTouchTarget = 'sigil' | 'M' | 'B' | 'C' | 'V' | 'A' | 'head';
export type PortraitTouchCircleTarget = Exclude<PortraitTouchTarget, 'head'>;
export type PortraitTouchBOrigin = 'B1' | 'B2';

export interface PortraitTouchHit {
  target: PortraitTouchTarget;
  bOrigin?: PortraitTouchBOrigin;
}

export interface PortraitTouchCandidate extends PortraitPoint {
  target: PortraitTouchCircleTarget;
  bOrigin?: PortraitTouchBOrigin;
}

const PRIORITY: readonly PortraitTouchTarget[] = ['sigil', 'M', 'B', 'C', 'V', 'A', 'head'];

/** Select the closest configured point; exact ties use the documented body-part priority. */
export function resolvePortraitTouch(
  pointer: PortraitPoint,
  candidates: readonly PortraitTouchCandidate[],
  radii: Readonly<Record<PortraitTouchCircleTarget, number>>,
  headEligible: boolean,
): PortraitTouchHit | undefined {
  const matches = candidates
    .map((candidate) => ({ candidate, distance: (pointer.x - candidate.x) ** 2 + (pointer.y - candidate.y) ** 2 }))
    .filter(({ candidate, distance }) => distance <= Math.max(0, radii[candidate.target]) ** 2)
    .sort((left, right) => left.distance - right.distance
      || PRIORITY.indexOf(left.candidate.target) - PRIORITY.indexOf(right.candidate.target));
  const match = matches[0]?.candidate;
  return match
    ? { target: match.target, ...(match.bOrigin ? { bOrigin: match.bOrigin } : {}) }
    : (headEligible ? { target: 'head' } : undefined);
}
