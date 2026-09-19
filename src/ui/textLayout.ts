import type Phaser from 'phaser';

const PROHIBITED_LINE_START_PUNCTUATION = /^[。、.,]$/u;

// Wrap resolved text, retaining the metadata of every styled source segment.
// Latin words stay together where possible; oversized words and Japanese text
// can break between characters. Character mode fills lines without word boundaries.
// Explicit newlines are preserved in both modes.
export function wrapTextSegments<T extends { text: string }>(
  lines: T[][],
  maxWidth: number,
  measure: (segment: T) => number,
  mode: 'word' | 'character' = 'word',
): T[][] {
  const output: T[][] = [];
  for (const line of lines) {
    let current: T[] = [];
    let width = 0;
    let previousSource: T | undefined;
    const flush = () => {
      const last = current[current.length - 1];
      if (last) last.text = last.text.trimEnd();
      output.push(current.filter((segment) => segment.text.length > 0));
      current = [];
      width = 0;
      previousSource = undefined;
    };
    const append = (source: T, text: string) => {
      if (!current.length && /^\s+$/u.test(text)) return;
      const last = current[current.length - 1];
      const merged = previousSource === source && last;
      const candidate = { ...source, text: merged ? last.text + text : text };
      const addedWidth = measure(candidate) - (merged ? measure(last) : 0);
      if (
        current.length
        && width + addedWidth > maxWidth
        && !PROHIBITED_LINE_START_PUNCTUATION.test(text)
      ) {
        flush();
        if (/^\s+$/u.test(text)) return;
        current.push({ ...source, text });
        width = measure(current[0]);
      } else {
        if (merged) current[current.length - 1] = candidate;
        else current.push(candidate);
        width += addedWidth;
      }
      previousSource = source;
    };
    for (const segment of line) {
      const tokens = segment.text.match(/\r\n|[\r\n]|[^\S\r\n]+|[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*|[^\r\n]/gu) ?? [];
      for (const token of tokens) {
        if (/^[\r\n]+$/.test(token)) {
          flush();
        } else if (mode === 'character' || measure({ ...segment, text: token }) > maxWidth) {
          for (const character of token) append(segment, character);
        } else {
          append(segment, token);
        }
      }
    }
    flush();
  }
  return output;
}

export function setPunctuationAwareWordWrap(textObject: Phaser.GameObjects.Text, width: number, mode: 'word' | 'character' = 'word'): void {
  textObject.setWordWrapWidth(width, true);
  textObject.setWordWrapCallback((text, target) => wrapTextSegments(
    [[{ text }]],
    width,
    (segment) => target.context.measureText(segment.text).width,
    mode,
  ).map((line) => line.map((segment) => segment.text).join('')).join('\n'));
}

export function sizeTooltipText(textObject: Phaser.GameObjects.Text, text: string, width: number, maxHeight: number): { width: number; height: number } {
  textObject.setFontSize(15);
  setPunctuationAwareWordWrap(textObject, width - 28);
  textObject.setText(text);
  // Only exceptionally long Tips need a smaller font to remain on screen.
  let fontSize = 15;
  while (textObject.height + 24 + fontSize > maxHeight && fontSize > 1) {
    textObject.setFontSize(--fontSize);
  }
  // Retain the wrapping limit, but trim unused width after wrapping. Extend the
  // previous padding by half the actual font size on every side for rough edges.
  const paddingX = 14 + fontSize / 2, paddingY = 12 + fontSize / 2;
  textObject.setPosition(paddingX, paddingY);
  return {
    width: Math.ceil(textObject.width + paddingX * 2),
    height: Math.ceil(textObject.height + paddingY * 2),
  };
}
