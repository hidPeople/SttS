import Phaser from 'phaser';
import { CARD_BODY_Y, CARD_BODY_HEIGHT, CARD_WIDTH, CARD_FONT, CARD_INK } from './cardPresentation';
import { wrapTextSegments } from './textLayout';
import type { CardTextSegment } from '../models/cardDescription';

export function renderCardText(scene: Phaser.Scene, container: Phaser.GameObjects.Container, resolvedLines: CardTextSegment[][], statusColor = '#e74b86'): void {
  container.removeAll(true);

  container.setScale(1);
  container.setY(CARD_BODY_Y);
  const maxWidth = CARD_WIDTH - 30;
  const maxHeight = CARD_BODY_HEIGHT;
  let fontSize = 13;
  let visualLines = wrapCardEffectLines(scene, resolvedLines, maxWidth, fontSize);
  while (visualLines.length * (fontSize + 3) > maxHeight && fontSize > 10) {
    fontSize -= 1;
    visualLines = wrapCardEffectLines(scene, resolvedLines, maxWidth, fontSize);
  }
  const lineHeight = fontSize + 3;
  const startY = -((visualLines.length - 1) * lineHeight) / 2;
  let contentHeight = 0;

  visualLines.forEach((line, lineIndex) => {
    const lineContainer = scene.add.container(0, startY + lineIndex * lineHeight);
    const textObjects = line.map((segment) => {
      const text = scene.add.text(0, 0, segment.text, {
        fontFamily: CARD_FONT,
        fontSize: `${fontSize}px`,
        color: segment.term ? statusColor : (segment.color ?? CARD_INK),
        fontStyle: segment.bold ? 'bold' : 'normal',
      });
      text.setOrigin(0, 0.5).setResolution(2);
      if (segment.term) text.setData('cardTerm', segment.term);
      return text;
    });
    const totalWidth = textObjects.reduce((sum, text) => sum + text.width, 0);
    contentHeight = Math.max(contentHeight, (visualLines.length - 1) * lineHeight + Math.max(0, ...textObjects.map((text) => text.height)) + 1);
    let x = -totalWidth / 2;
    textObjects.forEach((text) => {
      text.setX(x);
      x += text.width;
    });
    lineContainer.add(textObjects);
    textObjects.forEach((text) => {
      if (!text.getData('cardTerm')) return;
      const underline = scene.add.rectangle(text.x, text.height / 2, text.width, 1, Phaser.Display.Color.HexStringToColor(statusColor).color);
      underline.setOrigin(0, 0.5);
      lineContainer.add(underline);
    });
    if (totalWidth > maxWidth) {
      lineContainer.setScale(maxWidth / totalWidth, 1);
    }
    container.add(lineContainer);
  });
  if (contentHeight > maxHeight) container.setScale(maxHeight / contentHeight);
}

function wrapCardEffectLines(scene: Phaser.Scene, lines: CardTextSegment[][], maxWidth: number, fontSize = 15): CardTextSegment[][] {
  const ruler = scene.add.text(0, 0, '', { fontFamily: CARD_FONT, fontSize: `${fontSize}px` }).setVisible(false);
  const widths = new Map<string, number>();
  try {
    return wrapTextSegments(lines, maxWidth, (segment) => {
      const key = `${segment.bold ? 'bold' : 'normal'}:${segment.text}`;
      const cached = widths.get(key);
      if (cached !== undefined) return cached;
      ruler.setFontStyle(segment.bold ? 'bold' : 'normal');
      ruler.setText(segment.text);
      widths.set(key, ruler.width);
      return ruler.width;
    });
  } finally {
    ruler.destroy();
  }
}

