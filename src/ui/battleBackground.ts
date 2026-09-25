import type Phaser from 'phaser';
import { BATTLE_BACKGROUNDS } from '../data/battlePresentation';
import { battleBackgroundFile } from '../models/battlePresentation';

const sources = import.meta.glob('../../image/background/*.{png,jpg,jpeg,webp}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export const battleBackgroundKey = (file: string) => `battle-background:${file}`;
export function preloadBattleBackgrounds(scene: Phaser.Scene): void {
  for (const file of new Set([BATTLE_BACKGROUNDS.fallback, ...Object.values(BATTLE_BACKGROUNDS.stages), ...Object.values(BATTLE_BACKGROUNDS.events)])) {
    const source = sources[`../../image/background/${file}`];
    if (source && !scene.textures.exists(battleBackgroundKey(file))) scene.load.image(battleBackgroundKey(file), source);
  }
}
export function addBattleBackground(scene: Phaser.Scene, stage: number, eventId: string | undefined, width: number, height: number): void {
  const selected = battleBackgroundKey(battleBackgroundFile(stage, eventId));
  const key = scene.textures.exists(selected) ? selected : battleBackgroundKey(BATTLE_BACKGROUNDS.fallback);
  if (scene.textures.exists(key)) scene.add.image(width / 2, height / 2, key).setDisplaySize(width, height).setDepth(-20);
}
