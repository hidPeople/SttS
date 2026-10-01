import type { CardArtwork } from '../data/cardAppearance';

/** Shared by the game and editor preview; independent of Phaser and game state. */
export function cardArtworkPlacement(art: CardArtwork, imageWidth: number, imageHeight: number, width: number, height: number) {
  return {
    focusX: art.focusX ?? imageWidth / 2,
    focusY: art.focusY ?? imageHeight / 2,
    scale: Math.max(0.001, art.scale ?? Math.max(width / imageWidth, height / imageHeight)),
    x: art.offsetX ?? 0,
    y: art.offsetY ?? 0,
    radians: (art.rotation ?? 0) * Math.PI / 180,
  };
}
