import type Phaser from 'phaser';
import { localize, text, toggleLanguage } from '../models/localization';
import { createAudioSettings } from './audioSettings';
import { CachedCrayonPatch, CRAYON_COLORS } from './crayon';
import { GAME_FONT } from './fonts';
import { KeyboardNavigation } from './keyboardNavigation';
import { bindMenuHover } from './menuButton';
import { onPrimaryClick } from './pointerActions';

/** Settings available outside a run, shared by the title screen and Extras. */
export function createMenuSettings(scene: Phaser.Scene, languageChanged: () => void, close: () => void) {
  const root = scene.add.container(0, 0).setDepth(7000);
  let audio: Phaser.GameObjects.Container | undefined;
  const ui = (en: string, ja: string) => localize(text(en, ja));
  const label = (y: number, value: string, size: number) => scene.add.text(640, y, value, {
    fontFamily: GAME_FONT, fontSize: `${size}px`, color: '#f8fafc', fontStyle: 'bold',
  }).setOrigin(0.5);
  const button = (y: number, caption: string, action: () => void) => {
    const bg = new CachedCrayonPatch(scene, 640, y, 330, 44, CRAYON_COLORS.button).setInteractive({ useHandCursor: true });
    bindMenuHover(bg);
    onPrimaryClick(bg, action);
    KeyboardNavigation.for(scene).register(bg, { group: 'settings', activate: action });
    root.add([bg, label(y, caption, 20)]);
  };
  const showMenu = () => {
    root.removeAll(true);
    audio = undefined;
    const shade = scene.add.rectangle(640, 360, 1280, 720, 0x050607, 0.7).setInteractive();
    onPrimaryClick(shade, close);
    const panel = new CachedCrayonPatch(scene, 640, 360, 500, 330, 0x242a33).setInteractive();
    root.add([shade, panel, label(250, ui('Settings', '設定'), 30)]);
    button(325, ui('Language: English', 'Language / 言語：日本語'), () => {
      toggleLanguage();
      languageChanged();
      showMenu();
    });
    button(388, ui('Audio', '音量設定'), () => {
      root.removeAll(true);
      audio = createAudioSettings(scene, showMenu);
      root.add(audio);
    });
    button(460, ui('Close', '閉じる'), close);
  };
  showMenu();
  return { root, back: () => audio ? showMenu() : close() };
}
