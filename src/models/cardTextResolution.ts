import { CARD_TEXT_RENDERING, type CardTextResolutionPoint } from '../data/ui';

/** Nearest configured size avoids rerasterizing text at every fraction of a scale tween. */
export function cardTextResolution(scale: number, points: readonly CardTextResolutionPoint[] = CARD_TEXT_RENDERING.scaleResolutions): number {
  const size = Number.isFinite(scale) ? Math.abs(scale) : 1;
  let nearest: CardTextResolutionPoint | undefined;
  let distance = Infinity;
  for (const point of points) {
    if (!Number.isFinite(point.cardScale) || point.cardScale <= 0 || !Number.isFinite(point.resolution) || point.resolution < 1) continue;
    const delta = Math.abs(size - point.cardScale);
    if (delta < distance || (delta === distance && point.cardScale < nearest!.cardScale)) {
      nearest = point;
      distance = delta;
    }
  }
  return nearest?.resolution ?? 1;
}
