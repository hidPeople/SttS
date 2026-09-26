import type Phaser from 'phaser';
import { CONVERSATION_THEMES, type ConversationDesign } from '../data/conversationAppearance';
import { createConversationGraphite } from './conversationGraphite';

/** Shared materials for the dialogue and its history, with unscaled grain and edge details. */
export function paintConversationPanel(
  scene: Phaser.Scene, design: ConversationDesign, width: number, height: number,
  paint: Phaser.GameObjects.Container, decorations: Phaser.GameObjects.Container,
): void {
  const theme = CONVERSATION_THEMES[design];
  const left = -width / 2, top = -height / 2;
  if (design === 'graphite') {
    paint.add(createConversationGraphite(scene, width, height, theme.surface));
  } else if (design === 'paper') {
    const paper = scene.add.graphics();
    // Repeatable paper fibres and torn edges use local arithmetic, never combat randomness.
    const points = [{ x: left, y: top + 3 }, { x: -left - 4, y: top + 1 }, { x: -left, y: -top - 11 }];
    const segments = Math.ceil(width / 20);
    for (let i = 0; i <= segments; i++) points.push({ x: -left - i * width / segments, y: -top - 3 + (i * 17 % 7) - 3 });
    paper.fillStyle(theme.surface).fillPoints(points, true);
    const grainWidth = width - 20, grainHeight = height - 20;
    const grains = Math.round(560 * grainWidth * grainHeight / (1080 * 172));
    for (let i = 0; i < grains; i++) {
      const x = left + 10 + (i * 137 % grainWidth), y = top + 9 + (i * 53 % grainHeight);
      paper.lineStyle(1, 0x816e55, .06).lineBetween(x, y, x + 1 + i % 4, y + i % 2);
    }
    paint.add(paper);
  } else {
    const glass = scene.add.graphics().fillStyle(theme.surface).fillRoundedRect(left, top, width, height, 17);
    glass.fillStyle(0x35405a, .23).fillRoundedRect(left + 2, top + 2, width - 4, 43, 15);
    paint.add(glass);
    decorations.add(scene.add.graphics().lineStyle(1, theme.accent, .4).lineBetween(left + 45, top + 16, -left - 70, top + 16));
  }
}
