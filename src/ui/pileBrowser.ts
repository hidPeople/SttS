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
  const viewport = new Phaser.Geom.Rectangle(88, 143, 800, 490);
  const columns = 8, rowHeight = 145, scale = 0.56;
  let ordered = [...cards], scrollY = 0;
  const contentHeight = Math.ceil(cards.length / columns) * rowHeight;
  const maxScroll = Math.max(0, contentHeight - viewport.height);
  const shade = scene.add.rectangle(640, 360, 1280, 720, 0x080d16, 0.88).setInteractive();
  shade.on('pointerup', options.close);
  const panel = scene.add.rectangle(640, 360, 1184, 648, 0x171e2a).setStrokeStyle(1, 0x9a8561, 0.85).setInteractive();
  const heading = scene.add.text(88, 67, `${options.title}  /  ${cards.length}`, { fontFamily: CARD_FONT, fontSize: '27px', color: '#f3e6cd', fontStyle: 'bold' });
  const subtitle = scene.add.text(89, 106, options.subtitle, { fontFamily: CARD_FONT, fontSize: '13px', color: '#a4afbf' });
  const divider = scene.add.rectangle(913, 380, 1, 480, 0x8794a9, 0.25);
  const grid = scene.add.container(0, 0).setName('pile-scroll-grid');
  const detail = scene.add.container(0, 0);
  const clip = scene.add.graphics().fillStyle(0xffffff).fillRect(viewport.x, viewport.y, viewport.width, viewport.height).setVisible(false);
  const mask = clip.createGeometryMask();
  grid.setMask(mask);
  const detailTitle = scene.add.text(1052, 156, ja ? 'カード詳細' : 'CARD DETAILS', { fontFamily: CARD_FONT, fontSize: '12px', color: '#c5b391', letterSpacing: 2 }).setOrigin(0.5);
  const hint = scene.add.text(480, 653, ja ? 'ホイール / ↑↓ でスクロール' : 'Scroll with wheel / ↑↓', { fontFamily: CARD_FONT, fontSize: '13px', color: '#a4afbf' }).setOrigin(0.5);
  const track = scene.add.rectangle(899, viewport.centerY, 6, viewport.height, 0x303c4d).setInteractive();
  const thumbHeight = Math.max(36, viewport.height * Math.min(1, viewport.height / Math.max(1, contentHeight)));
  const thumb = scene.add.rectangle(899, viewport.y, 6, thumbHeight, 0xb6a584).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
  host.add([shade, panel, heading, subtitle, divider, grid, detail, detailTitle, hint, track, thumb]);
  const showDetail = (card: CardInstance) => {
    detail.removeAll(true);
    detail.add(options.preview(card, 1052, 363, 1.48));
    detail.add(scene.add.text(1052, 564, localizeGameText(card.definition.name), {
      fontFamily: CARD_FONT, fontSize: '15px', color: '#eee1cb', align: 'center', wordWrap: { width: 270, useAdvancedWrap: true },
    }).setOrigin(0.5));
  };
  const views: { view: Phaser.GameObjects.Container; hit: Phaser.GameObjects.Rectangle; y: number }[] = [];
  const scrollTo = (value: number) => {
    scrollY = Phaser.Math.Clamp(value, 0, maxScroll);
    grid.setY(-scrollY);
    for (const item of views) {
      const centerY = item.y - scrollY;
      const visible = centerY + CARD_HEIGHT * scale / 2 >= viewport.top && centerY - CARD_HEIGHT * scale / 2 <= viewport.bottom;
      item.view.setVisible(visible);
      if (item.hit.input) item.hit.input.enabled = visible;
    }
    thumb.setY(viewport.y + (maxScroll ? scrollY / maxScroll : 0) * (viewport.height - thumbHeight));
  };
  const render = () => {
    grid.removeAll(true);
    views.length = 0;
    ordered.forEach((card, index) => {
      const x = 138 + (index % columns) * 100;
      const y = viewport.y + rowHeight / 2 + Math.floor(index / columns) * rowHeight;
      const view = options.preview(card, x, y, scale);
      const hit = scene.add.rectangle(0, 0, CARD_WIDTH, CARD_HEIGHT, 0xffffff, 0);
      // A geometry mask clips rendering only; clip hit testing as well.
      hit.setInteractive(new Phaser.Geom.Rectangle(0, 0, CARD_WIDTH, CARD_HEIGHT), (area: Phaser.Geom.Rectangle, x: number, y: number) => (
        area.contains(x, y) && viewport.contains(scene.input.activePointer.x, scene.input.activePointer.y)
      ));
      if (hit.input) hit.input.cursor = 'pointer';
      view.add(hit);
      grid.add(view);
      views.push({ view, hit, y });
      hit.on('pointerover', () => { hit.setStrokeStyle(2, 0xffe2ac); showDetail(card); });
      hit.on('pointerout', () => hit.setStrokeStyle(0));
      hit.on('pointerup', () => showDetail(card));
    });
    scrollTo(0);
    if (ordered.length) showDetail(ordered[0]);
  };
  const button = (x: number, width: number, label: string, click: () => void) => {
    const bg = scene.add.rectangle(x, 79, width, 32, 0x263141).setStrokeStyle(1, 0x706b60).setInteractive({ useHandCursor: true });
    const text = scene.add.text(x, 79, label, { fontFamily: CARD_FONT, fontSize: '13px', color: '#eee1cb' }).setOrigin(0.5);
    bg.on('pointerover', () => bg.setFillStyle(0x3a4657));
    bg.on('pointerout', () => bg.setFillStyle(0x263141));
    bg.on('pointerup', click);
    host.add([bg, text]);
  };
  const sortLabel = scene.add.text(682, 107, ja ? '並び順：標準' : 'ORDER: DEFAULT', { fontFamily: CARD_FONT, fontSize: '11px', color: '#a4afbf' });
  host.add(sortLabel);
  button(725, 84, ja ? 'コスト' : 'Cost', () => {
    ordered = [...cards].sort((a, b) => a.definition.cost - b.definition.cost);
    sortLabel.setText(ja ? '並び順：コスト' : 'ORDER: COST');
    render();
  });
  button(823, 84, ja ? '名前' : 'Name', () => {
    ordered = [...cards].sort((a, b) => localizeGameText(a.definition.name).localeCompare(localizeGameText(b.definition.name), ja ? 'ja' : 'en'));
    sortLabel.setText(ja ? '並び順：名前' : 'ORDER: NAME');
    render();
  });
  button(1145, 110, ja ? '閉じる  ×' : 'Close  ×', options.close);
  const key = (event: KeyboardEvent) => {
    if (event.key === 'Escape') options.close();
    else if (event.key === 'ArrowUp') scrollTo(scrollY - 65);
    else if (event.key === 'ArrowDown') scrollTo(scrollY + 65);
    else if (event.key === 'Home') scrollTo(0);
    else if (event.key === 'End') scrollTo(maxScroll);
  };
  const wheel = (_p: unknown, _over: unknown, _dx: number, dy: number) => scrollTo(scrollY + dy * 0.65);
  let dragOffset: number | undefined;
  thumb.on('pointerdown', (pointer: Phaser.Input.Pointer) => { dragOffset = pointer.y - thumb.y; });
  track.on('pointerdown', (pointer: Phaser.Input.Pointer) => scrollTo((pointer.y - viewport.y - thumbHeight / 2) / (viewport.height - thumbHeight) * maxScroll));
  const move = (pointer: Phaser.Input.Pointer) => {
    if (dragOffset !== undefined) scrollTo((pointer.y - dragOffset - viewport.y) / (viewport.height - thumbHeight) * maxScroll);
  };
  const release = () => { dragOffset = undefined; };
  scene.input.keyboard?.on('keydown', key);
  scene.input.on('wheel', wheel);
  scene.input.on('pointermove', move);
  scene.input.on('pointerup', release);
  scene.input.on('gameout', release);
  panel.once('destroy', () => {
    scene.input.keyboard?.off('keydown', key);
    scene.input.off('wheel', wheel);
    scene.input.off('pointermove', move);
    scene.input.off('pointerup', release);
    scene.input.off('gameout', release);
    grid.clearMask();
    mask.destroy();
    clip.destroy();
  });
  render();
  if (!cards.length) {
    grid.add(scene.add.text(480, 350, ja ? 'カードはありません' : 'No cards here', { fontFamily: CARD_FONT, fontSize: '23px', color: '#a4afbf' }).setOrigin(0.5));
    detailTitle.setVisible(false);
  }
  if (!maxScroll) {
    track.setVisible(false).disableInteractive();
    thumb.setVisible(false).disableInteractive();
    hint.setVisible(false);
  }
  host.setAlpha(0).setVisible(true);
  scene.tweens.add({ targets: host, alpha: 1, duration: 160, ease: 'Sine.easeOut' });
}
