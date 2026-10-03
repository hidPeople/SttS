/** Build a small, reusable halo from icon alpha. Never called by the render loop. */
export function iconHaloPixels(source: Uint8ClampedArray, width: number, height: number,
  spread: number, angularSamples: number, color: number, strength: number): Uint8ClampedArray {
  const result = new Uint8ClampedArray(source.length);
  if (spread <= 0 || strength <= 0) return result;
  const radius = Math.max(1, Math.round(spread));
  const directions = Math.max(8, Math.ceil(angularSamples / 4) * 4);
  const samples: { x: number; y: number; weight: number }[] = [];
  for (let i = 0; i < directions; i++) {
    const angle = i * Math.PI * 2 / directions;
    for (let distance = 1; distance <= radius; distance++) {
      samples.push({ x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, weight: radius + 1 - distance });
    }
  }
  const totalWeight = directions * radius * (radius + 1) / 2;
  const alpha = (x: number, y: number) => x < 0 || y < 0 || x >= width || y >= height ? 0 : source[(y * width + x) * 4 + 3];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    let sum = 0;
    for (const sample of samples) {
      const sx = x + sample.x, sy = y + sample.y;
      const left = Math.floor(sx), top = Math.floor(sy), fx = sx - left, fy = sy - top;
      sum += ((alpha(left, top) * (1 - fx) + alpha(left + 1, top) * fx) * (1 - fy)
        + (alpha(left, top + 1) * (1 - fx) + alpha(left + 1, top + 1) * fx) * fy) * sample.weight;
    }
    const offset = (y * width + x) * 4;
    result[offset] = color >>> 16 & 255; result[offset + 1] = color >>> 8 & 255; result[offset + 2] = color & 255;
    result[offset + 3] = Math.min(255, sum / totalWeight * strength);
  }
  // The original icon is drawn over this halo and masks its opaque interior.
  return result;
}
