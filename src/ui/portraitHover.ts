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

export function portraitIsExposed(
  layers: readonly (readonly PortraitHoverNode[])[], target: PortraitHoverNode, x: number, y: number,
): boolean {
  const visit = (nodes: readonly PortraitHoverNode[]): 'target' | 'blocked' | undefined => {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      if (node.visible === false || (node.alpha === 0 && !node.input?.enabled)) continue;
      if (node === target) return 'target';
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
  return (localX, localY) => {
    const x = flipX ? width - localX : localX;
    const y = flipY ? height - localY : localY;
    return x >= 0 && y >= 0 && x < width && y < height
      && (scene.textures.getPixelAlpha(Math.floor(x), Math.floor(y), key, frame) ?? 0) > 8;
  };
}

/** Snapshot the pre-hover screen-to-texture transform, including parent transforms and origin. */
function capturePortraitHitTest(sprite: Phaser.GameObjects.Sprite): (x: number, y: number) => boolean {
  const origin = sprite.getLocalPoint(0, 0);
  const horizontal = sprite.getLocalPoint(1, 0);
  const vertical = sprite.getLocalPoint(0, 1);
  const xx = horizontal.x - origin.x, xy = horizontal.y - origin.y;
  const yx = vertical.x - origin.x, yy = vertical.y - origin.y;
  const contains = portraitPixelTest(sprite);
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
      let onImage = false;
      if (sprite.getBounds().contains(pointer.x, pointer.y)) {
        const point = sprite.getLocalPoint(pointer.x, pointer.y);
        onImage = portraitPixelTest(sprite)(point.x, point.y);
      }
      // Hysteresis: leave only after exiting both the current and original silhouettes.
      if (onImage || beforeHoverHit?.(pointer.x, pointer.y)) {
        const scenes = scene.game.scene.getScenes(false).filter(item => item.sys.isVisible());
        // Rewards can move the same portrait into another scene's display list.
        const layers = scenes.map(item => { item.children.depthSort(); return item.children.list; });
        next = portraitIsExposed(layers as PortraitHoverNode[][], sprite, pointer.x, pointer.y);
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
