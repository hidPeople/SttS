import type Phaser from 'phaser';
import { END_TURN_PROMPT } from '../data/ui';

/** Tint only: keep the crayon texture, stroke shapes and hover colour intact. */
export function installEndTurnPrompt(
  scene: Phaser.Scene,
  background: Phaser.GameObjects.Image,
  shouldPrompt: () => boolean,
): void {
  let elapsed = 0;
  let lastTint = 0xffffff;
  const update = (_time: number, delta: number) => {
    const active = shouldPrompt();
    const cycle = Math.max(1, END_TURN_PROMPT.cycleDuration);
    elapsed = active ? (elapsed + delta) % cycle : 0;
    const wave = (1 - Math.cos(elapsed / cycle * Math.PI * 2)) / 2;
    const minimum = Math.max(0, Math.min(1, END_TURN_PROMPT.minBrightness));
    const channel = Math.round(255 * (1 - (1 - minimum) * wave));
    const tint = channel * 0x010101;
    if (tint !== lastTint) {
      background.setTint(tint);
      lastTint = tint;
    }
  };
  const dispose = () => {
    scene.events.off('update', update);
    scene.events.off('shutdown', dispose);
    background.off('destroy', dispose);
  };
  scene.events.on('update', update);
  scene.events.once('shutdown', dispose);
  background.once('destroy', dispose);
}
