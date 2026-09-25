import type Phaser from 'phaser';
import { cardTextResolution } from '../models/cardTextResolution';

/** Covers hand, rewards and nested pile previews through their shared card root. */
export function bindCardTextResolution(scene: Phaser.Scene, root: Phaser.GameObjects.Container): void {
  const matrix = root.getWorldTransformMatrix();
  const parentMatrix = root.getLocalTransformMatrix();
  const apply = (object: Phaser.GameObjects.GameObject, resolution: number) => {
    if (object.type === 'Text') {
      const text = object as Phaser.GameObjects.Text;
      if (text.style.resolution !== resolution) text.setResolution(resolution);
    } else if (object.type === 'Container') {
      for (const child of (object as Phaser.GameObjects.Container).list) apply(child, resolution);
    }
  };
  const sync = () => {
    for (let object: Phaser.GameObjects.Container | null = root; object; object = object.parentContainer) {
      if (!object.active || !object.visible) return;
    }
    // Matrix column length includes parent scaling but ignores the card fan's rotation.
    root.getWorldTransformMatrix(matrix, parentMatrix);
    const resolution = cardTextResolution(Math.hypot(matrix.a, matrix.b));
    // Revisit descendants so recreated descriptions/localized text inherit the current quality.
    apply(root, resolution);
  };
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    scene.events.off('postupdate', sync);
    scene.events.off('shutdown', dispose);
    root.off('destroy', dispose);
    matrix.destroy(); parentMatrix.destroy();
  };
  scene.events.on('postupdate', sync);
  scene.events.once('shutdown', dispose);
  root.once('destroy', dispose);
  sync();
}
