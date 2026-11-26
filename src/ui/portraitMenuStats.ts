import type Phaser from 'phaser';
import { BODY_PART_MENU_NAMES } from '../data/bodyParts';
import type { Player } from '../models/Combatants';
import { localize } from '../models/localization';
import { characterPortraitAssets } from '../models/portraitAssets';
import type { EpDamagePart } from '../models/types';
import { portraitEpOrigin } from './epHeartEffect';
import { GAME_FONT } from './fonts';
import { labelWidth, leaderPoints, pairedOrigin, planPortraitStats, STAT_PARTS, type StatLayout, type StatOrigin, type StatSlot } from './portraitStatsLayout';
import { portraitCoverage } from './portraitCoverage';

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
  levelForPart: (part: EpDamagePart) => number,
  region: { x: number; y: number; width: number; height: number }, japanese: boolean,
  mode: StatLayout = 'adaptive',
): Phaser.GameObjects.Container {
  const root = scene.add.container(0, 0);
  const ink = scene.add.graphics();
  root.add(ink);
  const width = labelWidth(mode), narrow = mode !== 'right';
  const rows = STAT_PARTS.map(part => {
    const label = scene.add.container(0, 0);
    const paper = scene.add.graphics();
    const top = narrow ? -42 : -26;
    paper.fillStyle(0x211e2b, 0.93).fillRoundedRect(0, top, width, narrow ? 84 : 55, 5);
    const text = (tx: number, ty: number, str: string, size: number, color: string) =>
      scene.add.text(tx, ty, str, { fontFamily: GAME_FONT, fontSize: size, color }).setOrigin(0, 0.5);
    paper.fillStyle(0xffdeeb).fillRoundedRect(2, top - 10, width - 4, 19, 4);
    const name = localize(BODY_PART_MENU_NAMES[part], japanese ? 'ja' : 'en');
    const badge = text(width / 2, top, '', 14, '#371629').setOrigin(0.5);
    const pleasure = text(width - 6, narrow ? -7 : -10, '', 14, '#ffffff').setOrigin(1, 0.5);
    const peaks = text(width - 6, narrow ? 30 : 12, '', 14, '#ffffff').setOrigin(1, 0.5);
    label.add([paper, badge, text(8, narrow ? -24 : -8, japanese ? '累計快感値' : 'Total EP', 13, '#e4dbe3'),
      text(8, 12, japanese ? '絶頂回数' : 'Climaxes', 13, '#e4dbe3'), pleasure, peaks]);
    root.add(label);
    return { part, label, name, badge, pleasure, peaks, lastLevel: NaN, lastEp: NaN, lastPeaks: NaN, origin: { x: 0, y: 0 } as StatOrigin };
  });
  const matrix = body.getLocalTransformMatrix(), parentMatrix = area.getLocalTransformMatrix();
  const origin = (id: string | undefined, part: EpDamagePart): StatOrigin => {
    const points = id && characterPortraitAssets[id]?.epPoints;
    if (part === 'B' && points && (points.B1 || points.B2)) {
      if (!points.B1) return portraitEpOrigin(body, id, 'B2', region, matrix);
      if (!points.B2) return portraitEpOrigin(body, id, 'B1', region, matrix);
      const a = portraitEpOrigin(body, id, 'B1', region, matrix), b = portraitEpOrigin(body, id, 'B2', region, matrix);
      return pairedOrigin(a, b);
    }
    return portraitEpOrigin(body, id, part, region, matrix);
  };
  let elapsed = 0;
  const duration = REVEAL_MS + STAGGER_MS * (rows.length - 1);
  let lastId: string | undefined;
  let flipX = body.flipX, flipY = body.flipY;
  const previous = Array<number>(6).fill(NaN);
  let slots: StatSlot[] = [];
  let settleMs = 0;
  const update = (_time: number, delta: number) => {
    root.setVisible(area.visible && body.visible);
    if (!root.visible) return;
    const id = portraitId();
    const transform = body.getWorldTransformMatrix(matrix, parentMatrix).matrix;
    const newPose = lastId !== id || flipX !== body.flipX || flipY !== body.flipY;
    const moved = newPose || previous.some((value, i) => value !== transform[i]);
    const planNow = !slots.length || newPose || (!moved && settleMs > 0 && delta >= settleMs);
    const redraw = moved || planNow || elapsed < duration;
    if (moved) {
      lastId = id;
      flipX = body.flipX;
      flipY = body.flipY;
      for (let i = 0; i < previous.length; i++) previous[i] = transform[i];
      for (const row of rows) row.origin = origin(id, row.part);
    }
    if (planNow) {
      slots = planPortraitStats(rows.map(row => row.origin), mode, mode === 'adaptive' ? portraitCoverage(body, matrix) : undefined);
      settleMs = 0;
    } else settleMs = moved ? 120 : Math.max(0, settleMs - delta);
    elapsed = Math.min(duration, elapsed + delta);
    if (redraw) ink.clear();
    rows.forEach((row, i) => {
      const level = levelForPart(row.part);
      if (row.lastLevel !== level) {
        row.badge.setText(`${row.name} Lv.${level}`);
        row.badge.setScale(Math.min(1, (width - 10) / row.badge.width));
        row.lastLevel = level;
      }
      const ep = player.epDamageByPart[row.part], peaks = player.orgasmByPart[row.part];
      if (row.lastEp !== ep) { row.pleasure.setText(formatTotal(ep)); row.lastEp = ep; }
      if (row.lastPeaks !== peaks) { row.peaks.setText(formatTotal(peaks)); row.lastPeaks = peaks; }
      if (!redraw) return;
      const slot = slots[i];
      const p = unit((elapsed - i * STAGGER_MS) / REVEAL_MS);
      const fade = unit((p - 0.56) / 0.44);
      row.label.setAlpha(fade).setPosition(slot.x + (slot.left ? 1 : -1) * (1 - fade) * 8, slot.y);
      if (!p) return;
      const [start, bend, end] = leaderPoints(row.origin, slot, width);
      const diagonal = unit((p - 0.12) / 0.56);
      const tail = unit((p - 0.68) / 0.26);
      const marker = unit(p / 0.2);
      const radius = MARKER_RADIUS * marker;
      if (diagonal > 0) {
        const dx = bend.x - start.x, dy = bend.y - start.y;
        const inset = Math.min(1, radius / (Math.hypot(dx, dy) || 1));
        const rimX = start.x + dx * inset, rimY = start.y + dy * inset;
        ink.lineStyle(2.8, CALLOUT_EDGE, 0.68).beginPath().moveTo(rimX, rimY)
          .lineTo(rimX + (bend.x - rimX) * diagonal, rimY + (bend.y - rimY) * diagonal);
        if (tail) ink.lineTo(bend.x + (end.x - bend.x) * tail, bend.y + (end.y - bend.y) * tail);
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
