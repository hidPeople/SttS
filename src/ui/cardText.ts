import Phaser from 'phaser';
import { CARD_BODY_Y, CARD_BODY_HEIGHT, CARD_BODY_PANEL_HEIGHT, CARD_WIDTH, CARD_FONT, CARD_INK } from './cardPresentation';
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
  let contentTop = Infinity;
  let contentBottom = -Infinity;

  visualLines.forEach((line, lineIndex) => {
    const lineContainer = scene.add.container(0, lineIndex * lineHeight);
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
    // Measure locally so hand animations and preview magnification cannot change layout.
    const lineTop = Math.min(-fontSize / 2, ...textObjects.map((text) => -text.height / 2));
    const lineBottom = Math.max(fontSize / 2, ...textObjects.map((text) => text.height / 2 + (text.getData('cardTerm') ? 0.5 : 0)));
    contentTop = Math.min(contentTop, lineContainer.y + lineTop);
    contentBottom = Math.max(contentBottom, lineContainer.y + lineBottom);
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
  if (visualLines.length === 0) return;
  const contentHeight = contentBottom - contentTop;
  const scale = Math.min(1, maxHeight / contentHeight);
  const remainingSpace = CARD_BODY_PANEL_HEIGHT - contentHeight * scale;
  // Usually half a line above the text; tight descriptions leave more room below.
  const topPadding = Math.min(lineHeight * scale / 2, remainingSpace / 3);
  container.setScale(scale);
  container.setY(CARD_BODY_Y - CARD_BODY_PANEL_HEIGHT / 2 + topPadding - contentTop * scale);
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

