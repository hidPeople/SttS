import type Phaser from 'phaser';
import dialogueUrl from './assets/conversation-graphite-dialogue.png';
import logUrl from './assets/conversation-graphite-log.png';

// Offline-baked alpha data, including the two original overlapping layers.
// To change dimensions/material, run tools/artwork/bake-conversation-graphite.mjs.
const GRAPHITE_PANELS = [
  { width: 1100, height: 192, key: 'conversation-graphite-dialogue', url: dialogueUrl },
  { width: 1100, height: 610, key: 'conversation-graphite-log', url: logUrl },
] as const;

export function preloadConversationGraphite(scene: Phaser.Scene): void {
  for (const panel of GRAPHITE_PANELS) {
    if (!scene.textures.exists(panel.key)) scene.load.image(panel.key, panel.url);
  }
}

/** No runtime strokes, random numbers or grain generation, even on the first opening. */
export function createConversationGraphite(scene: Phaser.Scene, width: number, height: number, color: number): Phaser.GameObjects.Image {
  const panel = GRAPHITE_PANELS.find(panel => panel.width === width && panel.height === height);
  if (!panel) throw new Error('Bake a graphite conversation panel for ' + width + 'x' + height);
  const key = panel.key + '-color-' + color.toString(16);
  if (!scene.textures.exists(key)) {
    // Recolour once per material/colour and retain it in the game's TextureManager.
    // This also works with CanvasRenderer, where Image.setTint is unsupported.
    const source = scene.textures.get(panel.key).getSourceImage() as HTMLImageElement;
    const texture = scene.textures.createCanvas(key, source.width, source.height)!;
    const context = texture.getContext();
    context.drawImage(source, 0, 0);
    context.globalCompositeOperation = 'source-in';
    context.fillStyle = '#' + color.toString(16).padStart(6, '0');
    context.fillRect(0, 0, source.width, source.height);
    context.globalCompositeOperation = 'source-over';
    texture.refresh();
  }
  // Destroying a window only destroys its Image; the shared texture survives scene changes.
  return scene.add.image(0, 0, key).setDisplaySize(width + 34, height + 5);
}
