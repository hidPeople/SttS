import type Phaser from 'phaser';
import { PLAYER_PORTRAIT_HOVER } from '../data/ui';

/** Walk the actual draw order, not interactive objects only: disabled UI also occludes portraits. */
export interface PortraitHoverNode {
  visible?: boolean;
  alpha?: number;
  input?: { enabled: boolean } | null;
  list?: readonly PortraitHoverNode[];
  getBounds?: () => { contains(x: number, y: number): boolean };
}

const ignoredPortraitHoverOccluders = new WeakMap<object, true | ((x: number, y: number) => boolean)>();
const PIXEL_CACHE_LIMIT = 64;

/** Mark short-lived presentation objects that may draw over the portrait but must not change its hover state. */
export function ignorePortraitHoverOcclusion<T extends object>(object: T, when?: (x: number, y: number) => boolean): T {
  ignoredPortraitHoverOccluders.set(object, when ?? true);
  return object;
}

export function portraitIsExposed(
  layers: readonly (readonly PortraitHoverNode[])[], target: PortraitHoverNode, x: number, y: number,
): boolean {
  const visit = (nodes: readonly PortraitHoverNode[]): 'target' | 'blocked' | undefined => {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      if (node.visible === false) continue;
      // A newly switched portrait starts at zero alpha while fading in.
      if (node === target) return 'target';
      const ignored = ignoredPortraitHoverOccluders.get(node);
      if (ignored === true || ignored?.(x, y)) continue;
      if (node.alpha === 0 && !node.input?.enabled) continue;
      if (node.list) {
        const result = visit(node.list);
        if (result) return result;
      } else if (node.getBounds?.().contains(x, y)) return 'blocked';
    }
  };
  for (let i = layers.length - 1; i >= 0; i--) {
    const result = visit(layers[i]);
    if (result) return result === 'target';
  }
  return false;
}

/** Keep texture coordinates independent of later texture/size/offset changes. */
function portraitPixelTest(sprite: Phaser.GameObjects.Sprite): (x: number, y: number) => boolean {
  const { realWidth: width, realHeight: height, name: frame } = sprite.frame;
  const { key } = sprite.texture;
  const { flipX, flipY, scene } = sprite;
  // Breathing revisits nearby pixels even under a stationary pointer.
  const sourceImage = sprite.frame.source?.image;
  const hits = sourceImage && 'tagName' in sourceImage && sourceImage.tagName === 'IMG'
    ? new Map<number, boolean>() : undefined;
  return (localX, localY) => {
    const x = flipX ? width - localX : localX;
    const y = flipY ? height - localY : localY;
    if (!(x >= 0 && y >= 0 && x < width && y < height)) return false;
    const px = Math.floor(x), py = Math.floor(y);
    const index = py * width + px;
    const cached = hits?.get(index);
    if (cached !== undefined) return cached;
    const hit = (scene.textures.getPixelAlpha(px, py, key, frame) ?? 0) > 8;
    if (hits) {
      if (hits.size >= PIXEL_CACHE_LIMIT) hits.clear();
      hits.set(index, hit);
    }
    return hit;
  };
}

const opaquePixelTests = new WeakMap<Phaser.GameObjects.Sprite, {
  frame: Phaser.Textures.Frame;
  flipX: boolean;
  flipY: boolean;
  test: ReturnType<typeof portraitPixelTest>;
}>();

function currentPixelTest(sprite: Phaser.GameObjects.Sprite): ReturnType<typeof portraitPixelTest> {
  let cached = opaquePixelTests.get(sprite);
  if (!cached || cached.frame !== sprite.frame || cached.flipX !== sprite.flipX || cached.flipY !== sprite.flipY) {
    cached = { frame: sprite.frame, flipX: sprite.flipX, flipY: sprite.flipY, test: portraitPixelTest(sprite) };
    opaquePixelTests.set(sprite, cached);
  }
  return cached.test;
}

export function portraitContainsOpaquePixel(sprite: Phaser.GameObjects.Sprite, screenX: number, screenY: number): boolean {
  if (!sprite.getBounds().contains(screenX, screenY)) return false;
  const point = sprite.getLocalPoint(screenX, screenY);
  return currentPixelTest(sprite)(point.x, point.y);
}

export function portraitIsExposedInScene(sprite: Phaser.GameObjects.Sprite, x: number, y: number): boolean {
  const scenes = sprite.scene.game.scene.getScenes(false).filter((item) => item.sys.isVisible());
  const layers = scenes.map((item) => { item.children.depthSort(); return item.children.list; });
  return portraitIsExposed(layers as PortraitHoverNode[][], sprite, x, y);
}

/** Snapshot the pre-hover screen-to-texture transform, including parent transforms and origin. */
function capturePortraitHitTest(sprite: Phaser.GameObjects.Sprite): (x: number, y: number) => boolean {
  const origin = sprite.getLocalPoint(0, 0);
  const horizontal = sprite.getLocalPoint(1, 0);
  const vertical = sprite.getLocalPoint(0, 1);
  const xx = horizontal.x - origin.x, xy = horizontal.y - origin.y;
  const yx = vertical.x - origin.x, yy = vertical.y - origin.y;
  const contains = currentPixelTest(sprite);
  return (x, y) => contains(origin.x + xx * x + yx * y, origin.y + xy * x + yy * y);
}

/** Observe mouse position after all scenes update; do not register or consume pointer events. */
export function bindPortraitHover(sprite: Phaser.GameObjects.Sprite, changed: (hovered: boolean) => void): void {
  const scene = sprite.scene;
  let hovered = false;
  let pendingSince: number | undefined;
  let beforeHoverHit: ((x: number, y: number) => boolean) | undefined;
  // Game POST_STEP time is real elapsed time, independent of Ctrl fast-forward.
  const update = (time: number) => {
    const pointer = scene.input.manager.mousePointer;
    let next = false;
    if (pointer && scene.input.manager.isOver && sprite.active && sprite.visible) {
      // An opaque pixel in the retained silhouette already establishes a hit at this pointer position.
      if (beforeHoverHit?.(pointer.x, pointer.y) || portraitContainsOpaquePixel(sprite, pointer.x, pointer.y)) {
        next = portraitIsExposedInScene(sprite, pointer.x, pointer.y);
      }
    }
    if (next === hovered) {
      pendingSince = undefined;
    } else {
      pendingSince ??= time;
      if (time - pendingSince < Math.max(0, PLAYER_PORTRAIT_HOVER.delayMs)) return;
      pendingSince = undefined;
      // Capture before changed() applies the hover image; never overwrite it while hovering.
      beforeHoverHit = next ? capturePortraitHitTest(sprite) : undefined;
      hovered = next;
      changed(next);
    }
  };
  const dispose = () => {
    beforeHoverHit = undefined;
    pendingSince = undefined;
    scene.game.events.off('poststep', update);
    scene.events.off('shutdown', dispose);
    sprite.off('destroy', dispose);
  };
  scene.game.events.on('poststep', update);
  scene.events.once('shutdown', dispose);
  sprite.once('destroy', dispose);
}
