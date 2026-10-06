import { CONFIG } from './config.js';

// Generate once per playback; all candidates and timeline scrubbing share this plan.
export function createPlayerOverflow(random = Math.random) {
  const settings = CONFIG.playerDrain;
  const between = range => range[0] + random() * (range[1] - range[0]);
  return Array.from({ length: settings.outletCount }, (_, i) => ({
    // Stratification leaves some flow on the left while concentrating most on the right.
    position: 1 - (1 - (i + random()) / settings.outletCount) ** settings.rightBias,
    delay: between(settings.delay),
    cycle: between(settings.cycle),
    radius: between(settings.radius),
    drift: between(settings.drift),
  }));
}
