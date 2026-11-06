import type Phaser from 'phaser';
import { BgmPlayer } from '../models/bgm';
import { WebBgmOutput } from './bgmOutput';
import { USER_SETTINGS } from '../models/userSettings';
import { SETTINGS_STATE } from '../models/localization';
import { GAME_FONT } from '../ui/fonts';

const files = import.meta.glob('../../bgm/*.{mp3,ogg,wav}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export const bgmAssets = Object.fromEntries(Object.entries(files).map(([path, url]) => [path.split('/').pop()!.replace(/\.[^.]+$/, ''), url]));
export const BGM = new BgmPlayer(new WebBgmOutput(), bgmAssets);

export function installBgm(game: Phaser.Game): void {
  let unfocused = document.hidden || !document.hasFocus();
  const preferences = () => BGM.preferences(USER_SETTINGS.value.audio, unfocused);
  const focus = () => { unfocused = false; preferences(); };
  const blur = () => { unfocused = true; preferences(); };
  const visibility = () => { unfocused = document.hidden || !document.hasFocus(); preferences(); };
  const unlock = () => { BGM.unlock(); };
  preferences();
  const unsubscribe = USER_SETTINGS.subscribe(preferences);
  window.addEventListener('focus', focus); window.addEventListener('blur', blur);
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('pointerdown', unlock, true); window.addEventListener('keydown', unlock, true);
  const notify = BGM.subscribe(state => {
    if (state.status !== 'error') return;
    console.error('BGM playback failed:', state.id, state.error);
    const scene = game.scene.getScenes(true).slice(-1)[0];
    if (!scene) return;
    const message = SETTINGS_STATE.language === 'ja' ? `BGM「${state.id}」を再生できませんでした。\nゲームは続行できます。Extraから再試行できます。` : `Unable to play BGM: ${state.id}\nThe game can continue. Retry in Extra.`;
    const text = scene.add.text(640, 80, message, { fontFamily: GAME_FONT, fontSize: '18px', color: '#ffffff', backgroundColor: '#45242e', padding: { x: 16, y: 10 } }).setOrigin(0.5).setDepth(20000);
    scene.time.delayedCall(6000, () => text.destroy());
  });
  game.events.once('destroy', () => {
    unsubscribe(); notify(); BGM.dispose(); window.removeEventListener('focus', focus); window.removeEventListener('blur', blur);
    document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pointerdown', unlock, true); window.removeEventListener('keydown', unlock, true);
  });
}
