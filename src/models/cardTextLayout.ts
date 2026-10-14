/** Reflow at half-pixel font steps; find the largest fitting size in bounded work. */
export function fitCardTextLayout<T extends { height: number }>(maxHeight: number, layout: (fontSize: number) => T): T & { fontSize: number } {
  const full = layout(13);
  if (full.height <= maxHeight) return { ...full, fontSize: 13 };
  let best = { ...layout(1), fontSize: 1 };
  let low = 3, high = 25;
  while (low <= high) {
    const step = Math.floor((low + high) / 2);
    const result = layout(step / 2);
    if (result.height <= maxHeight) { best = { ...result, fontSize: step / 2 }; low = step + 1; }
    else high = step - 1;
  }
  return best;
}
