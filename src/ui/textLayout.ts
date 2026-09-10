import type Phaser from 'phaser';

const PROHIBITED_LINE_START_PUNCTUATION = /^[。、.,]$/u;

// Wrap resolved text, retaining the metadata of every styled source segment.
// Latin words stay together where possible; oversized words and Japanese text
// can break between characters. Explicit newlines are preserved.
export function wrapTextSegments<T extends { text: string }>(
  lines: T[][],
  maxWidth: number,
  measure: (segment: T) => number,
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
        } else if (measure({ ...segment, text: token }) > maxWidth) {
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

export function setPunctuationAwareWordWrap(textObject: Phaser.GameObjects.Text, width: number): void {
  textObject.setWordWrapWidth(width, true);
  textObject.setWordWrapCallback((text, target) => wrapTextSegments(
    [[{ text }]],
    width,
    (segment) => target.context.measureText(segment.text).width,
  ).map((line) => line.map((segment) => segment.text).join('')).join('\n'));
}

export function sizeTooltipText(textObject: Phaser.GameObjects.Text, text: string, width: number, maxHeight: number): number {
  textObject.setFontSize(15);
  setPunctuationAwareWordWrap(textObject, width - 28);
  textObject.setText(text);
  // Only exceptionally long Tips need a smaller font to remain on screen.
  let fontSize = 15;
  while (textObject.height + 24 > maxHeight && fontSize > 1) {
    textObject.setFontSize(--fontSize);
  }
  return textObject.height + 24;
}
