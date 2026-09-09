import type { EnemySpriteDefinition } from '../models/types';

function sprite(
  textureKey: string,
  source: string,
  size: number,
  opaqueBounds: EnemySpriteDefinition['opaqueBounds'],
  bodyOffsetY = 0,
): EnemySpriteDefinition {
  return {
    textureKey,
    animationKey: `${textureKey}-play`,
    source,
    frameWidth: 200,
    frameHeight: 200,
    frameCount: 16,
    frameRate: 1000 / 120,
    displayWidth: size,
    displayHeight: size,
    bodyOffsetY,
    opaqueBounds,
  };
}

// Bounds are measured once across all frames, using alpha > 8 (inclusive edges).
export const ENEMY_SPRITES: Record<string, EnemySpriteDefinition> = {
  slime: sprite('slime-idle', new URL('../../Sprite/slime_idle.png', import.meta.url).href, 95,
    { left: 12, right: 186, top: 6, bottom: 172 }),
  grunt: sprite('grunt-idle', new URL('../../Sprite/grunt_idle.png', import.meta.url).href, 230,
    { left: 42, right: 155, top: 11, bottom: 190 }),
  gruntCharm: sprite('grunt-charm', new URL('../../Sprite/grunt_charm.png', import.meta.url).href, 230,
    { left: 41, right: 157, top: 0, bottom: 199 }),
  PeakMachine: {
    ...sprite('peak-machine-idle', new URL('../../Sprite/peak_machine_idle.png', import.meta.url).href, 210,
      { left: 33, right: 167, top: 32, bottom: 189 }),
    attackAnimationTimeScale: 6,
  },
  slimeColony: sprite('slime-colony-idle', new URL('../../Sprite/slime_colony_idle.png', import.meta.url).href, 360,
    { left: 6, right: 193, top: 45, bottom: 193 }, -34),
};
