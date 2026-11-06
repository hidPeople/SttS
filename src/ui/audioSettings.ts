import type Phaser from 'phaser';
import { AUDIO_SETTINGS } from '../data/bgm';
import { USER_SETTINGS } from '../models/userSettings';
import { SETTINGS_STATE } from '../models/localization';
import { GAME_FONT } from './fonts';
import { CachedCrayonPatch, CRAYON_COLORS } from './crayon';
import { KeyboardNavigation } from './keyboardNavigation';
import { onPrimaryClick } from './pointerActions';

/** Shared modal contents; caller retains its existing modal/back-navigation scope. */
export function createAudioSettings(scene: Phaser.Scene, back: () => void): Phaser.GameObjects.Container {
  const root = scene.add.container(0, 0).setDepth(7000);
  const ui = (en: string, ja: string) => SETTINGS_STATE.language === 'ja' ? ja : en;
  const label = (x: number, y: number, value: string, size = 22) => scene.add.text(x, y, value, { fontFamily: GAME_FONT, fontSize: `${size}px`, color: '#f8fafc' }).setOrigin(0.5);
  const shade = scene.add.rectangle(640, 360, 1280, 720, 0x050607, 0.7).setInteractive();
  const panel = new CachedCrayonPatch(scene, 640, 360, 700, 460, 0x242a33, 1).setInteractive();
  root.add([shade, panel, label(640, 175, ui('Audio', '音量設定'), 30)]);
  const nav = KeyboardNavigation.for(scene);
  const button = (x: number, y: number, width: number, value: string, action: () => void) => {
    const bg = new CachedCrayonPatch(scene, x, y, width, 42, CRAYON_COLORS.button, 1).setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setHoverColor(CRAYON_COLORS.hover)); bg.on('pointerout', () => bg.setHoverColor());
    onPrimaryClick(bg, action); nav.register(bg, { group: 'audio', activate: action }); root.add([bg, label(x, y, value)]);
  };
  const refreshers: Array<() => void> = [];
  const sliders = new Map<Phaser.GameObjects.GameObject, (step: number) => void>();
  for (const [index, channel] of (['master', 'bgm'] as const).entries()) {
    const y = 270 + index * 100;
    root.add(label(435, y - 27, channel === 'master' ? ui('Master', 'マスター') : 'BGM'));
    const ink = scene.add.graphics(), value = label(920, y, '');
    const hit = scene.add.rectangle(695, y, 380, 48, 0, 0).setInteractive({ useHandCursor: true });
    scene.input.setDraggable(hit);
    const change = (level: number) => USER_SETTINGS.update({ audio: { ...USER_SETTINGS.value.audio, [channel]: Math.max(0, Math.min(AUDIO_SETTINGS.maxVolume, Math.round(level))) } });
    const locate = (pointer: Phaser.Input.Pointer) => change((pointer.x - 525) / 340 * AUDIO_SETTINGS.maxVolume);
    hit.on('pointerdown', (pointer: Phaser.Input.Pointer) => { if (pointer.button === 0) locate(pointer); });
    hit.on('drag', (pointer: Phaser.Input.Pointer) => { if (pointer.leftButtonDown()) locate(pointer); });
    hit.on('wheel', (_pointer: Phaser.Input.Pointer, _dx: number, dy: number) => { if (dy) change(USER_SETTINGS.value.audio[channel] - Math.sign(dy)); });
    const item = nav.register(hit, { group: 'audio-volume', activate: () => change((USER_SETTINGS.value.audio[channel] + 1) % (AUDIO_SETTINGS.maxVolume + 1)) });
    sliders.set(item.object, step => change(USER_SETTINGS.value.audio[channel] + step));
    root.add([hit, ink, value]);
    refreshers.push(() => {
      const level = USER_SETTINGS.value.audio[channel], x = 525 + 340 * level / AUDIO_SETTINGS.maxVolume;
      ink.clear().lineStyle(5, 0x637083).lineBetween(525, y, 865, y).lineStyle(5, 0x91bee3).lineBetween(525, y, x, y);
      ink.fillStyle(0xe6f3ff).fillCircle(x, y, 9);
      // Speaker silhouette + 0..3 sound arcs; no font-dependent speaker emoji.
      ink.fillStyle(0xe6f3ff).fillRect(430, y - 6, 7, 12).fillTriangle(437, y - 6, 448, y - 13, 448, y + 13).fillTriangle(437, y - 6, 448, y + 13, 437, y + 6);
      ink.lineStyle(2, 0xe6f3ff);
      if (level === 0) ink.lineBetween(457, y - 6, 469, y + 6).lineBetween(469, y - 6, 457, y + 6);
      else for (let i = 0; i < Math.ceil(level / AUDIO_SETTINGS.maxVolume * 3); i++) { ink.beginPath(); ink.arc(448, y, 13 + i * 7, -0.7, 0.7); ink.strokePath(); }
      value.setText(`${level} / ${AUDIO_SETTINGS.maxVolume}`);
    });
  }
  // Both scene modal containers and standalone title/Extra containers use this scope.
  const move = (direction: import('./keyboardNavigation').Direction, current: import('./keyboardNavigation').NavigationItem | undefined, items: import('./keyboardNavigation').NavigationItem[]) => {
    const adjust = current && sliders.get(current.object);
    if (adjust && (direction === 'left' || direction === 'right')) { adjust(direction === 'right' ? 1 : -1); return current; }
    const index = current ? items.indexOf(current) : -1;
    return items[index < 0 ? 0 : (index + (direction === 'left' || direction === 'up' ? -1 : 1) + items.length) % items.length];
  };
  nav.setScopeMove(root, move);
  // Parent modal is assigned by the caller after construction.
  let parentScope: Phaser.GameObjects.Container | undefined;
  scene.events.once('postupdate', () => { if (root.active && root.parentContainer) { parentScope = root.parentContainer; nav.setScopeMove(parentScope, move); } });
  root.once('destroy', () => { nav.clearScopeMove(root); if (parentScope) nav.clearScopeMove(parentScope); });
  const caption = label(0, 460, ui('Pause when window is inactive', 'ウインドウ非アクティブ時に再生を止める'), 20).setOrigin(0, 0.5);
  const left = 640 - (caption.width + 36) / 2;
  caption.x = left + 36;
  const check = scene.add.rectangle(640, 460, caption.width + 60, 46, 0, 0).setInteractive({ useHandCursor: true });
  const box = scene.add.graphics();
  const toggle = () => USER_SETTINGS.update({ audio: { ...USER_SETTINGS.value.audio, pauseOnBlur: !USER_SETTINGS.value.audio.pauseOnBlur } });
  onPrimaryClick(check, toggle); nav.register(check, { group: 'audio', activate: toggle }); root.add([check, caption, box]);
  refreshers.push(() => {
    const checked = USER_SETTINGS.value.audio.pauseOnBlur;
    box.clear().fillStyle(checked ? 0x478275 : 0x192431).fillRoundedRect(left, 448, 24, 24, 4);
    box.lineStyle(2, 0xc3d1df).strokeRoundedRect(left, 448, 24, 24, 4);
    if (checked) box.lineStyle(3, 0xffffff).beginPath().moveTo(left + 5, 460).lineTo(left + 10, 465).lineTo(left + 19, 454).strokePath();
  });
  button(640, 535, 200, ui('Back', '戻る'), back);
  const refresh = () => refreshers.forEach(fn => fn());
  const unsubscribe = USER_SETTINGS.subscribe(refresh); root.once('destroy', unsubscribe); refresh();
  return root;
}
