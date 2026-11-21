import Phaser from 'phaser';
import { CachedCrayonPatch, CRAYON_COLORS, CrayonPatch } from './crayon';
import { GAME_FONT } from './fonts';

export function bindMenuHover(bg: CachedCrayonPatch | CrayonPatch, enabled?: () => boolean, color = CRAYON_COLORS.hover): void {
  bg.on('pointerover', () => bg.setHoverColor(!enabled || enabled() ? color : undefined));
  bg.on('pointerout', () => bg.setHoverColor());
}

export type MenuButtonLabel = string | { arrow: 'left' | 'right' };

export function menuArrow(scene: Phaser.Scene, direction: 'left' | 'right', color: number): Phaser.GameObjects.Graphics {
  const sign = direction === 'left' ? -1 : 1;
  return scene.add.graphics().fillStyle(color).fillTriangle(7 * sign, 0, -6 * sign, -8, -6 * sign, 8);
}

export function menuButtonLabel(scene: Phaser.Scene, label: MenuButtonLabel, width: number, maxSize: number, color: string) {
  if (typeof label !== 'string') return menuArrow(scene, label.arrow, Phaser.Display.Color.HexStringToColor(color).color);
  const size = Math.min(maxSize, Math.max(11, width / Math.max(5, label.length) * 1.1));
  return scene.add.text(0, 0, label, { fontFamily: GAME_FONT, fontSize: `${size}px`, fontStyle: 'bold', color }).setOrigin(0.5);
}
