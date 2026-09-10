import Phaser from 'phaser';
import { CARD_FONT, CARD_HEIGHT, CARD_WIDTH } from './cardPresentation';
import { localizeGameText } from '../models/gameText';
import { SETTINGS_STATE } from '../models/localization';
import type { CardInstance } from '../models/types';

export function populatePileBrowser(scene: Phaser.Scene, host: Phaser.GameObjects.Container, cards: CardInstance[], options: {
  title: string; subtitle: string; close: () => void;
  preview: (card: CardInstance, x: number, y: number, scale: number) => Phaser.GameObjects.Container;
}): void {
  const ja = SETTINGS_STATE.language === 'ja';
  let ordered = [...cards], page = 0;
  const pageSize = 8, pages = Math.max(1, Math.ceil(cards.length / pageSize));
  const shade = scene.add.rectangle(640, 360, 1280, 720, 0x080d16, 0.88).setInteractive();
  shade.on('pointerup', options.close);
  const panel = scene.add.rectangle(640, 360, 1184, 648, 0x171e2a).setStrokeStyle(1, 0x9a8561, 0.85).setInteractive();
  const heading = scene.add.text(88, 67, `${options.title}  /  ${cards.length}`, { fontFamily: CARD_FONT, fontSize: '27px', color: '#f3e6cd', fontStyle: 'bold' });
  const subtitle = scene.add.text(89, 106, options.subtitle, { fontFamily: CARD_FONT, fontSize: '13px', color: '#a4afbf' });
  const divider = scene.add.rectangle(899, 368, 1, 474, 0x8794a9, 0.25);
  const grid = scene.add.container(0, 0), detail = scene.add.container(0, 0);
  const detailTitle = scene.add.text(1052, 156, ja ? 'カード詳細' : 'CARD DETAILS', { fontFamily: CARD_FONT, fontSize: '12px', color: '#c5b391', letterSpacing: 2 }).setOrigin(0.5);
  const pageText = scene.add.text(480, 653, '', { fontFamily: CARD_FONT, fontSize: '14px', color: '#d7c9b2' }).setOrigin(0.5);
  host.add([shade, panel, heading, subtitle, divider, grid, detail, detailTitle, pageText]);
  const showDetail = (card: CardInstance) => {
    detail.removeAll(true);
    detail.add(options.preview(card, 1052, 363, 1.48));
    const rarity = scene.add.text(1052, 564, localizeGameText(card.definition.name), { fontFamily: CARD_FONT, fontSize: '15px', color: '#eee1cb', align: 'center', wordWrap: { width: 270, useAdvancedWrap: true } }).setOrigin(0.5);
    detail.add(rarity);
  };
  const button = (x: number, y: number, width: number, label: string, click: () => void) => {
    const bg = scene.add.rectangle(x, y, width, 32, 0x263141).setStrokeStyle(1, 0x706b60).setInteractive({ useHandCursor: true });
    const text = scene.add.text(x, y, label, { fontFamily: CARD_FONT, fontSize: '13px', color: '#eee1cb' }).setOrigin(0.5);
    bg.on('pointerover', () => bg.setFillStyle(0x3a4657));
    bg.on('pointerout', () => bg.setFillStyle(0x263141));
    bg.on('pointerup', click); host.add([bg, text]);
    return bg;
  };
  let previous: Phaser.GameObjects.Rectangle, next: Phaser.GameObjects.Rectangle;
  const render = () => {
    grid.removeAll(true);
    pageText.setText(`${page + 1} / ${pages}`);
    for (const [index, card] of ordered.slice(page * pageSize, (page + 1) * pageSize).entries()) {
      const x = 193 + (index % 4) * 194, y = 260 + Math.floor(index / 4) * 234;
      const view = options.preview(card, x, y, 0.87);
      const hit = scene.add.rectangle(0, 0, CARD_WIDTH, CARD_HEIGHT, 0xffffff, 0).setInteractive({ useHandCursor: true });
      view.add(hit); grid.add(view);
      hit.on('pointerover', () => { showDetail(card); scene.tweens.killTweensOf(view); view.setDepth(10); grid.bringToTop(view); scene.tweens.add({ targets: view, y: y - 5, scale: 0.91, duration: 130, ease: 'Cubic.easeOut' }); });
      hit.on('pointerout', () => { scene.tweens.killTweensOf(view); scene.tweens.add({ targets: view, y, scale: 0.87, duration: 160, ease: 'Cubic.easeOut' }); });
      hit.on('pointerup', () => showDetail(card));
    }
    previous.setAlpha(page > 0 ? 1 : 0.3); next.setAlpha(page < pages - 1 ? 1 : 0.3);
    if (ordered[page * pageSize]) showDetail(ordered[page * pageSize]);
  };
  const changePage = (direction: number) => { const target = Phaser.Math.Clamp(page + direction, 0, pages - 1); if (page !== target) { page = target; render(); } };
  previous = button(345, 653, 110, ja ? '← 前へ' : '← Previous', () => changePage(-1));
  next = button(615, 653, 110, ja ? '次へ →' : 'Next →', () => changePage(1));
  const sortLabel = scene.add.text(682, 107, ja ? '並び順：標準' : 'ORDER: DEFAULT', { fontFamily: CARD_FONT, fontSize: '11px', color: '#a4afbf' });
  host.add(sortLabel);
  button(725, 79, 84, ja ? 'コスト' : 'Cost', () => { ordered = [...cards].sort((a, b) => a.definition.cost - b.definition.cost); page = 0; sortLabel.setText(ja ? '並び順：コスト' : 'ORDER: COST'); render(); });
  button(823, 79, 84, ja ? '名前' : 'Name', () => { ordered = [...cards].sort((a, b) => localizeGameText(a.definition.name).localeCompare(localizeGameText(b.definition.name), ja ? 'ja' : 'en')); page = 0; sortLabel.setText(ja ? '並び順：名前' : 'ORDER: NAME'); render(); });
  button(1145, 80, 110, ja ? '閉じる  ×' : 'Close  ×', options.close);
  if (!cards.length) grid.add(scene.add.text(480, 350, ja ? 'カードはありません' : 'No cards here', { fontFamily: CARD_FONT, fontSize: '23px', color: '#a4afbf' }).setOrigin(0.5));
  // Register once per opening and remove with the panel, including scene shutdown.
  const key = (event: KeyboardEvent) => { if (event.key === 'Escape') options.close(); else if (event.key === 'ArrowLeft') changePage(-1); else if (event.key === 'ArrowRight') changePage(1); };
  let lastWheel = 0;
  const wheel = (_p: unknown, _over: unknown, _dx: number, dy: number) => { if (scene.time.now - lastWheel > 180 && dy) { lastWheel = scene.time.now; changePage(Math.sign(dy)); } };
  scene.input.keyboard?.on('keydown', key); scene.input.on('wheel', wheel);
  panel.once('destroy', () => { scene.input.keyboard?.off('keydown', key); scene.input.off('wheel', wheel); });
  if (cards.length) {
    render();
  } else {
    pageText.setText('0 / 0');
    previous.setAlpha(0.3).disableInteractive();
    next.setAlpha(0.3).disableInteractive();
    detailTitle.setVisible(false);
  }
  host.setAlpha(0).setVisible(true);
  scene.tweens.add({ targets: host, alpha: 1, duration: 160, ease: 'Sine.easeOut' });
}
