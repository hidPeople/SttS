import type Phaser from 'phaser';
import type { Player } from '../models/Combatants';
import { characterPortraitAssets } from '../models/portraitAssets';
import type { EpDamagePart, PortraitPoint } from '../models/types';
import { portraitEpOrigin } from './epHeartEffect';
import { GAME_FONT } from './fonts';

// Coordinates in the free area left of the settings panel. Fan out even if C/V/A share a point.
const LABELS = [
  { part: 'M', x: 12, y: 140, left: true },
  { part: 'B', x: 246, y: 267, left: false },
  { part: 'C', x: 12, y: 430, left: true },
  { part: 'V', x: 246, y: 555, left: false },
  { part: 'A', x: 12, y: 640, left: true },
] as const;
const WIDTH = 132;
const REVEAL_MS = 360;
const STAGGER_MS = 55;
const CALLOUT_PINK = 0xc82c67;
const CALLOUT_EDGE = 0xfff3f7;
const MARKER_RADIUS = 4;
const unit = (value: number) => Math.max(0, Math.min(1, value));

function formatTotal(value: number): string {
  if (value < 1000) return String(Math.round(value * 10) / 10);
  if (value < 999950) return `${Math.round(value / 100) / 10}k`;
  return `${Math.round(value / 100000) / 10}M`;
}

/** The modal owns this non-interactive overlay and disposes it on every page change. */
export function createPortraitMenuStats(
  scene: Phaser.Scene, body: Phaser.GameObjects.Sprite, area: Phaser.GameObjects.Container,
  portraitId: () => string | undefined, player: Pick<Player, 'epDamageByPart' | 'orgasmByPart'>,
  region: { x: number; y: number; width: number; height: number }, japanese: boolean,
): Phaser.GameObjects.Container {
  const root = scene.add.container(0, 0);
  const ink = scene.add.graphics();
  root.add(ink);
  const rows = LABELS.map(({ part, x, y, left }) => {
    const label = scene.add.container(x, y);
    const paper = scene.add.graphics();
    paper.fillStyle(0x211e2b, 0.93).fillRoundedRect(0, -26, WIDTH, 55, 5);
    const text = (tx: number, ty: number, str: string, size: number, color: string) =>
      scene.add.text(tx, ty, str, { fontFamily: GAME_FONT, fontSize: size, color }).setOrigin(0, 0.5);
    paper.fillStyle(0x55394e).fillRoundedRect(5, -36, 22, 19, 4);
    const badge = text(16, -26, part, 16, '#ffe5f3').setOrigin(0.5);
    const pleasure = text(WIDTH - 6, -10, '', 14, '#ffffff').setOrigin(1, 0.5);
    const peaks = text(WIDTH - 6, 12, '', 14, '#ffffff').setOrigin(1, 0.5);
    label.add([paper, badge, text(8, -8, japanese ? '累計快感値' : 'Total EP', 13, '#e4dbe3'),
      text(8, 12, japanese ? '絶頂回数' : 'Climaxes', 13, '#e4dbe3'), pleasure, peaks]);
    root.add(label);
    return { part, x, y, left, label, pleasure, peaks, lastEp: NaN, lastPeaks: NaN, origin: { x: 0, y: 0 } };
  });
  const matrix = body.getLocalTransformMatrix(), parentMatrix = area.getLocalTransformMatrix();
  const origin = (id: string | undefined, part: EpDamagePart): PortraitPoint => {
    const points = id && characterPortraitAssets[id]?.epPoints;
    if (part === 'B' && points && (points.B1 || points.B2)) {
      if (!points.B1) return portraitEpOrigin(body, id, 'B2', region, matrix);
      if (!points.B2) return portraitEpOrigin(body, id, 'B1', region, matrix);
      const a = portraitEpOrigin(body, id, 'B1', region, matrix), b = portraitEpOrigin(body, id, 'B2', region, matrix);
      return a.x >= b.x ? a : b;
    }
    return portraitEpOrigin(body, id, part, region, matrix);
  };
  let elapsed = 0;
  const duration = REVEAL_MS + STAGGER_MS * (rows.length - 1);
  let lastId: string | undefined;
  let flipX = body.flipX, flipY = body.flipY;
  const previous = Array<number>(6).fill(NaN);
  const update = (_time: number, delta: number) => {
    root.setVisible(area.visible && body.visible);
    if (!root.visible) return;
    const id = portraitId();
    const transform = body.getWorldTransformMatrix(matrix, parentMatrix).matrix;
    const moved = lastId !== id || flipX !== body.flipX || flipY !== body.flipY || previous.some((value, i) => value !== transform[i]);
    const redraw = moved || elapsed < duration;
    if (moved) {
      lastId = id;
      flipX = body.flipX;
      flipY = body.flipY;
      for (let i = 0; i < previous.length; i++) previous[i] = transform[i];
    }
    elapsed = Math.min(duration, elapsed + delta);
    if (redraw) ink.clear();
    rows.forEach((row, i) => {
      const ep = player.epDamageByPart[row.part], peaks = player.orgasmByPart[row.part];
      if (row.lastEp !== ep) { row.pleasure.setText(formatTotal(ep)); row.lastEp = ep; }
      if (row.lastPeaks !== peaks) { row.peaks.setText(formatTotal(peaks)); row.lastPeaks = peaks; }
      if (!redraw) return;
      if (moved) row.origin = origin(id, row.part);
      const p = unit((elapsed - i * STAGGER_MS) / REVEAL_MS);
      const fade = unit((p - 0.56) / 0.44);
      row.label.setAlpha(fade).setX(row.x + (row.left ? 1 : -1) * (1 - fade) * 8);
      if (!p) return;
      const start = row.origin;
      const endX = row.x + (row.left ? WIDTH : 0);
      const bendX = endX + (row.left ? 16 : -16);
      const diagonal = unit((p - 0.12) / 0.56);
      const tail = unit((p - 0.68) / 0.26);
      const marker = unit(p / 0.2);
      const radius = MARKER_RADIUS * marker;
      if (diagonal > 0) {
        const dx = bendX - start.x, dy = row.y - start.y;
        const inset = Math.min(1, radius / (Math.hypot(dx, dy) || 1));
        const rimX = start.x + dx * inset, rimY = start.y + dy * inset;
        ink.lineStyle(2.8, CALLOUT_EDGE, 0.68).beginPath().moveTo(rimX, rimY)
          .lineTo(rimX + (bendX - rimX) * diagonal, rimY + (row.y - rimY) * diagonal);
        if (tail) ink.lineTo(bendX + (endX - bendX) * tail, row.y);
        ink.strokePath().lineStyle(1.6, CALLOUT_PINK, 1).strokePath();
      }
      ink.lineStyle(2.8, CALLOUT_EDGE, 0.68 * marker).strokeCircle(start.x, start.y, radius)
        .lineStyle(1.6, CALLOUT_PINK, marker).strokeCircle(start.x, start.y, radius);
    });
  };
  update(0, 0);
  scene.events.on('postupdate', update);
  root.once('destroy', () => scene.events.off('postupdate', update));
  return root;
}
