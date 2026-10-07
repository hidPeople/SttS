import type Phaser from 'phaser';
import { characterPortraitAssets } from '../models/portraitAssets';
import { portraitLocalPoint } from '../models/epHeartMotion';
import { resolvePortraitTouch, type PortraitTouchCandidate, type PortraitTouchTarget } from '../models/portraitTouch';
import { portraitContainsOpaquePixel, portraitIsExposedInScene } from './portraitHover';

function worldPoint(body: Phaser.GameObjects.Sprite, point: { x: number; y: number }): { x: number; y: number } {
  const local = portraitLocalPoint(point, body);
  return body.getWorldTransformMatrix().transformPoint(local.x, local.y);
}

export function portraitTouchTargetAt(
  body: Phaser.GameObjects.Sprite,
  portraitId: string | undefined,
  screenX: number,
  screenY: number,
  radius: number,
): PortraitTouchTarget | undefined {
  if (!portraitId || !body.active || !body.visible || !portraitIsExposedInScene(body, screenX, screenY)) return undefined;
  const placement = characterPortraitAssets[portraitId];
  const points = placement?.epPoints;
  if (!placement || !points) return undefined;

  const candidates: PortraitTouchCandidate[] = [];
  if (placement.sigilPoint) candidates.push({ target: 'sigil', ...worldPoint(body, placement.sigilPoint) });
  for (const target of ['M', 'C', 'V', 'A'] as const) {
    if (points[target]) candidates.push({ target, ...worldPoint(body, points[target]!) });
  }
  if (points.B1 || points.B2) {
    if (points.B1) candidates.push({ target: 'B', ...worldPoint(body, points.B1) });
    if (points.B2) candidates.push({ target: 'B', ...worldPoint(body, points.B2) });
  } else if (points.B) {
    candidates.push({ target: 'B', ...worldPoint(body, points.B) });
  }

  const mouth = points.M && worldPoint(body, points.M);
  const inMouthRadius = mouth && (screenX - mouth.x) ** 2 + (screenY - mouth.y) ** 2 <= Math.max(0, radius) ** 2;
  const headEligible = Boolean(mouth && screenY < mouth.y && !inMouthRadius && portraitContainsOpaquePixel(body, screenX, screenY));
  return resolvePortraitTouch({ x: screenX, y: screenY }, candidates, radius, headEligible);
}

export function bindPortraitTouch(
  body: Phaser.GameObjects.Sprite,
  portraitId: () => string | undefined,
  radius: () => number,
  enabled: () => boolean,
  touched: (target: PortraitTouchTarget) => void,
): void {
  const scene = body.scene;
  body.setInteractive({
    useHandCursor: true,
    hitArea: {},
    hitAreaCallback: () => {
      const pointer = scene.input.manager.mousePointer;
      return Boolean(pointer && enabled() && portraitTouchTargetAt(body, portraitId(), pointer.x, pointer.y, radius()));
    },
  });
  const onPointerUp = (pointer: Phaser.Input.Pointer) => {
    if (pointer.button !== 0 || !enabled()) return;
    const target = portraitTouchTargetAt(body, portraitId(), pointer.x, pointer.y, radius());
    if (target) touched(target);
  };
  body.on('pointerup', onPointerUp);
  body.once('destroy', () => body.off('pointerup', onPointerUp));
}
