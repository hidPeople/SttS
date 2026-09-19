import type Phaser from 'phaser';
import { PLAYER_DEFINITION } from '../data/player';
import { PORTRAIT_FACTORS } from '../data/portraitFactors';
import { PortraitSelection } from '../models/portraitSelection';
import { characterPortraitAssets } from '../models/portraitAssets';

/** Reusable for later pose changes: image dimensions and offsets are reapplied on every switch. */
export function applyPlayerPortrait(sprite: Phaser.GameObjects.Sprite, spriteId: string, x = 0, y = 0): Phaser.GameObjects.Sprite {
  const visual = characterPortraitAssets[spriteId];
  if (!visual) throw new Error(`Unknown character portrait: ${spriteId}`);
  sprite.setTexture(visual.textureKey);
  const width = visual.displayHeight * sprite.frame.realWidth / sprite.frame.realHeight;
  return sprite.setOrigin(0.5, 0).setDisplaySize(width, visual.displayHeight)
    .setPosition(x + (visual.offsetX ?? 0), y + (visual.offsetY ?? 0));
}

/** Battle, rewards and events share the same portrait and local placement. */
export function addPlayerPortrait(scene: Phaser.Scene, x = 0, y = 0, portraitId?: string): Phaser.GameObjects.Sprite {
  const id = portraitId ?? new PortraitSelection(Object.keys(characterPortraitAssets), PORTRAIT_FACTORS).select({
    playerId: PLAYER_DEFINITION.id, category: 'normal', statuses: new Set(), relics: new Set(), hpRatio: 1, epRatio: 0,
  });
  const sprite = scene.add.sprite(x, y, id ? characterPortraitAssets[id].textureKey : '__DEFAULT').setName('player-portrait');
  return id ? applyPlayerPortrait(sprite, id, x, y) : sprite.setVisible(false);
}

/** Temporarily suppress an existing portrait while dialogue owns the portrait layer. */
export function hidePlayerPortrait(source?: Phaser.GameObjects.Container): () => void {
  const visible = source?.visible;
  source?.setVisible(false);
  return () => { if (source?.active) source.setVisible(visible!); };
}

/** Move the actual portrait into the foreground scene, retaining all animation/pose state. */
export function bringPlayerPortraitForward(scene: Phaser.Scene, source: Phaser.GameObjects.Container): Phaser.GameObjects.Container {
  const owner = source.scene, oldList = source.displayList, oldDepth = source.depth, oldIgnoreDestroy = source.ignoreDestroy;
  source.removeFromDisplayList();
  scene.sys.displayList.add(source);
  // Reward DisplayList shutdown must not destroy a portrait owned by BattleScene.
  source.ignoreDestroy = true;
  let released = false;
  const release = (restore: boolean) => {
    if (released) return;
    released = true;
    scene.events.off('shutdown', restoreToBattle);
    owner.events.off('shutdown', destroyWithBattle);
    source.ignoreDestroy = oldIgnoreDestroy;
    source.removeFromDisplayList();
    if (restore && source.active && oldList) { source.setDepth(oldDepth); oldList.add(source); }
    else source.destroy();
  };
  const restoreToBattle = () => release(true);
  const destroyWithBattle = () => release(false);
  scene.events.once('shutdown', restoreToBattle);
  owner.events.once('shutdown', destroyWithBattle);
  return source;
}
