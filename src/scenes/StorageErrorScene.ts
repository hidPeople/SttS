import Phaser from 'phaser';
import { storageErrorMessage, takeStorageFailure, hasStorageFailures, type StorageFailure } from '../models/storageErrors';
import { localize, SETTINGS_STATE } from '../models/localization';
import { GAME_FONT } from '../ui/fonts';
import { KeyboardNavigation } from '../ui/keyboardNavigation';
import { installPointerBack, onPrimaryClick } from '../ui/pointerActions';

/** Separate overlay also reports failures while another modal is open, without replacing that modal. */
export class StorageErrorScene extends Phaser.Scene {
  constructor() { super('StorageErrorScene'); }
  create(data: StorageFailure & { sourceScene: string }): void {
    const ja = SETTINGS_STATE.language === 'ja';
    const close = () => { this.scene.stop(); this.scene.resume(data.sourceScene); };
    KeyboardNavigation.for(this).configure({ escape: close });
    installPointerBack(this, () => { close(); return true; });
    this.add.rectangle(640, 360, 1280, 720, 0, 0.7).setInteractive();
    this.add.rectangle(640, 360, 760, 370, 0x242a33).setStrokeStyle(2, 0xaeb8c8);
    const titles = {
      save: ['Save failed', 'セーブに失敗しました'], auto: ['Autosave failed', 'オートセーブに失敗しました'],
      read: ['Could not read save data', '保存データを読み込めませんでした'], delete: ['Deletion failed', '削除に失敗しました'],
      settings: ['Settings/history could not be saved', '設定・閲覧履歴を保存できませんでした'],
    };
    this.add.text(640, 230, titles[data.operation][ja ? 1 : 0], { fontFamily: GAME_FONT, fontSize: '24px', color: '#ffffff' }).setOrigin(0.5);
    const suffix = data.operation === 'save' || data.operation === 'auto'
      ? (ja ? '\nゲームは終了していません。保存済みデータは更新されていません。' : '\nThe game has not been closed. Existing saves were not updated.') : '';
    this.add.text(640, 345, localize(storageErrorMessage(data.error)) + suffix,
      { fontFamily: GAME_FONT, fontSize: '20px', color: '#ffffff', align: 'center', wordWrap: { width: 670, useAdvancedWrap: true } }).setOrigin(0.5);
    const button = this.add.rectangle(640, 478, 200, 46, 0x46546b).setInteractive({ useHandCursor: true });
    this.add.text(640, 478, 'OK', { fontFamily: GAME_FONT, fontSize: '22px', color: '#ffffff' }).setOrigin(0.5);
    onPrimaryClick(button, close);
    const nav = KeyboardNavigation.for(this); nav.select(nav.register(button));
  }
}

export function installStorageNotifications(game: Phaser.Game): void {
  const check = () => {
    if (!hasStorageFailures()) return;
    const scene = game.scene.getScenes(true).slice(-1)[0];
    if (!scene || scene.scene.key === 'StorageErrorScene' || !scene.sys.isActive()) return;
    const host = scene as Phaser.Scene & { canShowStorageFailure?: () => boolean };
    if (host.canShowStorageFailure?.() === false) return;
    const failure = takeStorageFailure();
    if (!failure) return;
    scene.scene.launch('StorageErrorScene', { ...failure, sourceScene: scene.scene.key });
    scene.scene.pause();
  };
  game.events.on('poststep', check);
  game.events.once('destroy', () => game.events.off('poststep', check));
}
