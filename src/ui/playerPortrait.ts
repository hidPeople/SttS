import type Phaser from 'phaser';
import { PLAYER_PORTRAIT } from '../data/player';
import { CHARACTER_SPRITES } from '../data/sprites';

/** Reusable for later pose changes: image dimensions and offsets are reapplied on every switch. */
export function applyPlayerPortrait(sprite: Phaser.GameObjects.Sprite, spriteId: string, x = 0, y = 0): Phaser.GameObjects.Sprite {
  const visual = CHARACTER_SPRITES[spriteId];
  if (!visual) throw new Error(`Unknown character portrait: ${spriteId}`);
  sprite.setTexture(visual.textureKey);
  const width = visual.displayHeight * sprite.frame.realWidth / sprite.frame.realHeight;
  return sprite.setOrigin(0.5, 0).setDisplaySize(width, visual.displayHeight)
    .setPosition(x + PLAYER_PORTRAIT.offsetX + (visual.offsetX ?? 0), y + PLAYER_PORTRAIT.offsetY + (visual.offsetY ?? 0));
}

/** Battle, rewards and events share the same portrait and local placement. */
export function addPlayerPortrait(scene: Phaser.Scene, x = 0, y = 0): Phaser.GameObjects.Sprite {
  const visual = CHARACTER_SPRITES[PLAYER_PORTRAIT.spriteId];
  return applyPlayerPortrait(scene.add.sprite(x, y, visual.textureKey), PLAYER_PORTRAIT.spriteId, x, y).setName('player-portrait');
}

/** Render the live battle portrait above another scene, without restarting its pose or effects. */
export function addPlayerPortraitMirror(scene: Phaser.Scene, source: Phaser.GameObjects.Container, body: Phaser.GameObjects.Sprite): Phaser.GameObjects.Container {
  const mirror = scene.add.container(0, 0);
  const image = scene.add.sprite(0, 0, body.texture.key, body.frame.name);
  mirror.add(image);
  // Prevent a second silhouette under the reward panel when the portrait is transparent.
  const cameraMask = source.scene.cameras.cameras.reduce((mask, camera) => mask | camera.id, 0);
  const originalFilter = source.cameraFilter;
  source.cameraFilter |= cameraMask;
  const sync = () => {
    if (!source.active || !body.active) { mirror.setVisible(false); return; }
    mirror.setPosition(source.x, source.y).setScale(source.scaleX, source.scaleY)
      .setRotation(source.rotation).setAlpha(source.alpha).setVisible(source.visible);
    if (image.texture.key !== body.texture.key || image.frame.name !== body.frame.name) image.setTexture(body.texture.key, body.frame.name);
    image.setOrigin(body.originX, body.originY).setPosition(body.x, body.y).setScale(body.scaleX, body.scaleY)
      .setRotation(body.rotation).setFlip(body.flipX, body.flipY).setAlpha(body.alpha).setVisible(body.visible);
    image.setTint(body.tintTopLeft, body.tintTopRight, body.tintBottomLeft, body.tintBottomRight);
    image.tintFill = body.tintFill;
  };
  sync();
  // Run after all scenes update, so motion and tint remain in sync regardless of scene order.
  scene.game.events.on('prerender', sync);
  scene.events.once('shutdown', () => {
    scene.game.events.off('prerender', sync);
    source.cameraFilter = (source.cameraFilter & ~cameraMask) | (originalFilter & cameraMask);
  });
  return mirror;
}
