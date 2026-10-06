import type { PortraitPoint } from './types';

/** MAX到達でダメージが分割されても、攻撃全体のceil(実ダメージ/部位数)を守る。 */
export class EpHeartBudget {
  private damage = 0;
  private emitted = 0;
  constructor(readonly origins: number) {}
  take(damage: number): number {
    this.damage += Math.max(0, damage);
    const count = Math.ceil(this.damage / Math.max(1, this.origins));
    const next = count - this.emitted;
    this.emitted = count;
    return next;
  }
}

/** Fan sectors avoid a clump of particles choosing the same launch direction. */
export function heartBurst(start: PortraitPoint, index: number, count: number, radius: number, fanAngle: number, random = Math.random): PortraitPoint {
  const sector = (index + 0.2 + random() * 0.6) / Math.max(1, count);
  const angle = -Math.PI / 2 + (sector - 0.5) * Math.min(180, Math.max(0, fanAngle)) * Math.PI / 180;
  const distance = radius * (0.65 + random() * 0.35);
  return { x: start.x + Math.cos(angle) * distance, y: start.y + Math.sin(angle) * distance };
}

export function heartPosition(start: PortraitPoint, burst: PortraitPoint, end: PortraitPoint, progress: number, arrival: number, burstEnd: number, curveHeight = 0, bend = 1): PortraitPoint {
  if (progress >= arrival) return { ...end };
  const launch = Math.max(0, Math.min(1, progress / burstEnd));
  const spread = { x: start.x + (burst.x - start.x) * Math.sin(launch * Math.PI / 2),
    y: start.y + (burst.y - start.y) * (1 - (1 - launch) ** 3) };
  // Overlap absorption with the last part of the launch, before its velocity reaches zero.
  const homingStart = burstEnd * 0.7;
  if (progress <= homingStart) return spread;
  const t = Math.min(1, (progress - homingStart) / (arrival - homingStart));
  const q = t * t, u = 1 - q;
  // The curve starts pulling toward the bar while the remaining outward momentum fades.
  const c1 = { x: burst.x + (end.x - burst.x) * 0.25 + bend * curveHeight * 0.5,
    y: burst.y + (end.y - burst.y) * 0.25 - curveHeight * 0.5 };
  const c2 = { x: (burst.x + end.x) / 2 + bend * curveHeight, y: (burst.y + end.y) / 2 - curveHeight * 0.5 };
  return { x: spread.x - burst.x + u ** 3 * burst.x + 3 * u * u * q * c1.x + 3 * u * q * q * c2.x + q ** 3 * end.x,
    y: spread.y - burst.y + u ** 3 * burst.y + 3 * u * u * q * c1.y + 3 * u * q * q * c2.y + q ** 3 * end.y };
}

/** Flipは描画時に適用されるため、変換行列へ渡す前に画像内座標へ反映する。 */
export function portraitLocalPoint(point: PortraitPoint, body: { width: number; height: number; originX: number; originY: number; flipX: boolean; flipY: boolean }): PortraitPoint {
  return { x: ((body.flipX ? 1 - point.x : point.x) - body.originX) * body.width,
    y: ((body.flipY ? 1 - point.y : point.y) - body.originY) * body.height };
}
