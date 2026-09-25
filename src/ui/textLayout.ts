import type Phaser from 'phaser';

/** Shared tooltip text metrics; tutorial tips add their existing extra half-character padding. */
export const TOOLTIP_LAYOUT = {
  maxWidth: 360,
  fontSize: 15,
  paddingX: 14,
  paddingY: 12,
  edgePaddingRatio: 0.5,
  screenMargin: 8,
};

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
  textObject.setFontSize(TOOLTIP_LAYOUT.fontSize);
  setPunctuationAwareWordWrap(textObject, width - TOOLTIP_LAYOUT.paddingX * 2);
  textObject.setText(text);
  // Only exceptionally long Tips need a smaller font to remain on screen.
  let fontSize = TOOLTIP_LAYOUT.fontSize;
  while (textObject.height + TOOLTIP_LAYOUT.paddingY * 2 + fontSize > maxHeight && fontSize > 1) {
    textObject.setFontSize(--fontSize);
  }
  // Retain the wrapping limit, but trim unused width after wrapping. Extend the
  // previous padding by half the actual font size on every side for rough edges.
  const paddingX = TOOLTIP_LAYOUT.paddingX + fontSize * TOOLTIP_LAYOUT.edgePaddingRatio;
  const paddingY = TOOLTIP_LAYOUT.paddingY + fontSize * TOOLTIP_LAYOUT.edgePaddingRatio;
  textObject.setPosition(paddingX, paddingY);
  return {
    width: Math.ceil(textObject.width + paddingX * 2),
    height: Math.ceil(textObject.height + paddingY * 2),
  };
}

/** Position a fitted HUD tooltip; preserve the nominal-width anchor used by card terms. */
export function tooltipPosition(x: number, y: number, width: number, height: number, screenWidth: number, screenHeight: number, above = false): { x: number; y: number } {
  const margin = TOOLTIP_LAYOUT.screenMargin;
  const left = above ? x + TOOLTIP_LAYOUT.maxWidth / 2 - width / 2 : x;
  return {
    x: Math.max(margin, Math.min(left, screenWidth - width - margin)),
    y: Math.max(margin, Math.min(above ? y - height : y, screenHeight - height - margin)),
  };
}
