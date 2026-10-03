/** Phaser's Glow uses an angular step of 1 / quality / rounded distance.
 * Keep enough evenly spaced directions even for a tiny halo radius.
 */
export function glowSampling(spread: number, angularSamples: number): { distance: number; quality: number } {
  const distance = Math.max(1, Math.round(spread));
  const samples = Math.max(8, Math.ceil(angularSamples / 4) * 4);
  // Phaser serializes the angle to seven decimals. A tiny upward bias prevents
  // rounding from adding a duplicate sample at 2π and skewing normalization.
  const angle = 2 * Math.PI / samples + 0.0000001;
  return { distance, quality: 1 / (distance * angle) };
}
