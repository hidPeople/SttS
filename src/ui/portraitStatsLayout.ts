import type { PortraitPoint as Point } from '../models/types';

export const STAT_PARTS = ['M', 'B', 'C', 'V', 'A'] as const;
export type StatLayout = 'right' | 'narrow' | 'adaptive';
export const labelWidth = (mode: StatLayout) => mode === 'right' ? 132 : 86;
const bands = [166, 284, 407, 530, 651];
const GAP = 16;
const CONFLICT = 100000;
export interface StatSlot { x: number; y: number; left: boolean; dock?: 'top' | 'bottom' }
export type Coverage = (x: number, y: number, w: number, h: number) => number;
export type StatOrigin = Point | { left: Point; right: Point };

export function pairedOrigin(a: Point, b: Point): StatOrigin {
  return a.x <= b.x ? { left: a, right: b } : { left: b, right: a };
}

function pointOnSide(origin: StatOrigin, left: boolean): Point {
  return 'x' in origin ? origin : left ? origin.left : origin.right;
}

export function leaderPoints(origin: StatOrigin, slot: StatSlot, width: number) {
  const start = pointOnSide(origin, slot.left);
  if (slot.dock) {
    const direction = slot.dock === 'top' ? -1 : 1;
    const x = slot.x + width / 2, y = slot.y + direction * 42;
    return [start, { x, y: y + direction * GAP }, { x, y }] as const;
  }
  const x = slot.x + (slot.left ? width : 0);
  return [start, { x: x + (slot.left ? GAP : -GAP), y: slot.y }, { x, y: slot.y }] as const;
}
const same = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) < 0.001;
const turn = (a: Point, b: Point, c: Point) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
function onSegment(a: Point, b: Point, p: Point) {
  return Math.abs(turn(a, b, p)) < 0.001 && (p.x-a.x)*(p.x-b.x) + (p.y-a.y)*(p.y-b.y) <= 0.001;
}
function intersect(a: Point, b: Point, c: Point, d: Point) {
  return (turn(a,b,c)*turn(a,b,d) < 0 && turn(c,d,a)*turn(c,d,b) < 0)
    || onSegment(a,b,c) || onSegment(a,b,d) || onSegment(c,d,a) || onSegment(c,d,b);
}
function leaderConflict(a: Route, b: Route) {
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      const p = a.path[i], q = b.path[j];
      const end = a.path[i + 1], other = b.path[j + 1];
      if (!i && !j && same(p, q) && !onSegment(p, end, other) && !onSegment(q, other, end)) continue;
      if (intersect(p, end, q, other)) return true;
    }
  }
  return false;
}
type Route = { slot: StatSlot; band: number; path: ReturnType<typeof leaderPoints>; corners: Point[]; cost: number };
function hitsLabel(route: Route, label: Route) {
  return label.corners.some((a, i, rect) => intersect(route.path[0], route.path[1], a, rect[(i+1)%4])
    || intersect(route.path[1], route.path[2], a, rect[(i+1)%4]));
}

/** Keep several partial layouts so an early short leader cannot force a crossing further down. */
export function planPortraitStats(origins: readonly StatOrigin[], mode: StatLayout, coverage?: Coverage): StatSlot[] {
  const adaptive = mode === 'adaptive', width = labelWidth(mode), height = mode === 'right' ? 55 : 84;
  const right = 378 - width;
  let beam: { routes: Route[]; cost: number }[] = [{ routes: [], cost: 0 }];
  for (const [index, source] of origins.entries()) {
    const options: Route[] = [];
    for (const [band, center] of bands.entries()) {
      if (adaptive && band !== index) continue;
      for (const x of adaptive ? [10, 48, right - 38, right] : [right]) {
        const left = x < 100;
        const origin = pointOnSide(source, left);
        for (const dy of adaptive ? [-12, 0, 12] : [0]) {
          const y = center + dy;
          const slot = { x, y, left };
          const top = slot.y - height / 2 - 10, bottom = slot.y + height / 2;
          const corners = [{x,y:top},{x:x+width,y:top},{x:x+width,y:bottom},{x,y:bottom}];
          const cover = coverage?.(x, top, width, bottom-top) ?? 0;
          // A paired marker on another row has no position until that row chooses a side.
          // Its actual leader is checked against this box in hitsLabel.
          const obscured = origins.filter(p => {
            const point = p === source ? origin : p;
            return 'x' in point && point.x >= x && point.x <= x+width && point.y >= top && point.y <= bottom;
          }).length;
          const docks: StatSlot[] = [slot];
          if (adaptive && Math.abs(origin.y-y) > height/2+GAP) {
            docks.push({ ...slot, dock: origin.y < y ? 'top' : 'bottom' });
          }
          for (const dock of docks) {
            const path = leaderPoints(origin, dock, width);
            const cost = obscured * CONFLICT + cover * 1500 + Math.abs(band-index)*35
              + Math.hypot(origin.x-path[1].x, origin.y-path[1].y) + Math.abs(dy)*0.1;
            options.push({ slot: dock, band, path, corners, cost });
          }
        }
      }
    }
    const next: typeof beam = [];
    for (const candidate of options) {
      const penalties = new Map<Route, number>();
      for (const state of beam) {
        if (state.routes.some(r => r.band === candidate.band)) continue;
        let cost = state.cost + candidate.cost;
        for (const route of state.routes) {
          let penalty = penalties.get(route);
          if (penalty === undefined) {
            penalty = leaderConflict(route, candidate) ? CONFLICT * 100 : 0;
            if (hitsLabel(route, candidate) || hitsLabel(candidate, route)) penalty += CONFLICT;
            penalties.set(route, penalty);
          }
          cost += penalty;
        }
        next.push({ routes: [...state.routes, candidate], cost });
      }
    }
    next.sort((a,b) => a.cost-b.cost);
    if (adaptive) {
      // Retain alternatives on each side of the figure for the crowded lower three parts.
      const counts = new Map<string, number>();
      beam = next.filter(state => {
        const sides = state.routes.map(r => r.slot.left ? 'L' : 'R').join('');
        const used = counts.get(sides) ?? 0;
        if (used >= 4) return false;
        counts.set(sides, used + 1);
        return true;
      });
    } else beam = next;
  }
  return beam[0].routes.map(r => r.slot);
}
