// Comparison tool -> game only. Reuse real definitions and name backgrounds without changing the game.
import Phaser from 'phaser';
import { CrayonPatch, CRAYON_COLORS } from '../../src/ui/crayon';
import { PLAYER_DEFINITION } from '../../src/data/player';
import { ENEMY_DEFINITIONS } from '../../src/data/enemies';
import { RELIC_DEFINITIONS } from '../../src/data/relics';
import { STATUS_DESCRIPTIONS } from '../../src/data/statuses';
import { ICON_HUD_LAYOUT, ICON_APPEARANCE, PLAYER_STATUS_HUD_LAYOUT } from '../../src/data/ui';
import { resolveIconFile, statusIconCount } from '../../src/models/iconImage';
import { localize } from '../../src/models/localization';
import type { StatusEffect } from '../../src/models/types';

const grunt = ENEMY_DEFINITIONS.grunt;
export const combatStats = {
  playerMaxHp: PLAYER_DEFINITION.maxHp, playerMaxEp: PLAYER_DEFINITION.maxEp,
  enemyMaxHp: grunt.maxHp, enemyMaxEp: grunt.maxEp,
  drainRatio: RELIC_DEFINITIONS.succubusBlood.triggers.flatMap(t => t.effects)
    .find(e => e.kind === 'hpDrain' && e.percentOf === 'targetMaxEp')?.amount ?? 0,
};
export const hudLayout = { playerSize: PLAYER_STATUS_HUD_LAYOUT.iconSize, enemySize: ICON_HUD_LAYOUT.enemyStatusSize, gap: ICON_HUD_LAYOUT.gap, counter: ICON_APPEARANCE.statusCounter };
export const combatName = (enemy: boolean, language: 'ja' | 'en') => localize(enemy ? grunt.name : PLAYER_DEFINITION.name, language);
export const sampleStatuses: Record<string, { id: StatusEffect; count: number }[]> = {
  player: [{ id: 'Horny', count: 1 }, { id: 'Aftershocks', count: 3 }, { id: 'Aphrodisiac', count: 2 }],
  enemy: [{ id: 'Charm', count: 1 }, { id: 'Aphrodisiac', count: 2 }, { id: 'InsertV', count: 1 }],
};
export const counterText = (id: StatusEffect, count: number) => statusIconCount(STATUS_DESCRIPTIONS[id], count);

const sources = import.meta.glob('../../image/icon/Status/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export async function loadGameUi() {
  const icons: Record<string, HTMLImageElement> = {};
  const files = new Set(Object.keys(sources).map(p => p.slice(p.lastIndexOf('/') + 1)));
  await Promise.all(Object.values(sampleStatuses).flat().map(async ({ id }) => {
    const file = resolveIconFile(id, files, STATUS_DESCRIPTIONS);
    if (!file) return;
    const image = new Image(); image.src = sources[`../../image/icon/Status/${file}`];
    try { await image.decode(); icons[id] = image; } catch { /* Missing optional assets remain blank. */ }
  }));
  // Bake the real crayon generator once. All five candidates share these cached name patches.
  const patches = await new Promise<Record<string, HTMLCanvasElement>>((resolve, reject) => {
    const host = document.createElement('div'); host.style.display = 'none'; document.body.append(host);
    const game = new Phaser.Game({ type: Phaser.CANVAS, parent: host, width: 8, height: 8, audio: { noAudio: true }, banner: false,
      scene: { create() {
        try {
          const result: Record<string, HTMLCanvasElement> = {};
          for (const owner of ['player', 'enemy'] as const) {
            const patch = new CrayonPatch(this, 0, 0, 150, 29, CRAYON_COLORS[owner], 1, { animateChanges: false });
            const copy = document.createElement('canvas'); copy.width = 150; copy.height = 29;
            copy.getContext('2d')!.drawImage(patch.texture.getSourceImage() as HTMLCanvasElement, 0, 0);
            result[owner] = copy;
          }
          resolve(result);
        } catch (error) { reject(error); }
        // Destroy on the next frame, after Phaser's boot has completed.
        setTimeout(() => { game.destroy(true); host.remove(); }, 0);
      } },
    });
  });
  return { icons, patches };
}
