import type Phaser from 'phaser';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from './layout';

export const SAVE_PREVIEW_WIDTH = 256;
export const SAVE_PREVIEW_HEIGHT = 144;
const SAVE_PREVIEW_QUALITY = 0.48;

/** Capture the next rendered frame, then immediately downscale it for save-list use. */
export function captureSavePreview(scene: Phaser.Scene): Promise<string | undefined> {
  if (typeof document === 'undefined' || !scene.sys.isActive()) return Promise.resolve(undefined);
  return new Promise(resolve => {
    let settled = false;
    const timeout = window.setTimeout(() => finish(), 1200);
    const finish = (value?: string) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve(value);
    };
    scene.game.renderer.snapshotArea(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, snapshot => {
      if (!(snapshot instanceof HTMLImageElement)) { finish(); return; }
      try {
        const canvas = document.createElement('canvas');
        canvas.width = SAVE_PREVIEW_WIDTH;
        canvas.height = SAVE_PREVIEW_HEIGHT;
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) { finish(); return; }
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'medium';
        context.drawImage(snapshot, 0, 0, SAVE_PREVIEW_WIDTH, SAVE_PREVIEW_HEIGHT);
        const webp = canvas.toDataURL('image/webp', SAVE_PREVIEW_QUALITY);
        finish(webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', SAVE_PREVIEW_QUALITY));
      } catch (error) {
        console.warn('セーブ用スナップショットを作成できませんでした。', error);
        finish();
      }
    }, 'image/webp', SAVE_PREVIEW_QUALITY);
  });
}
