import Phaser from 'phaser';
import { cardCategoryColor } from '../data/cardCategories';
import { SETTINGS_STATE } from '../models/localization';
import type { CardDefinition } from '../models/types';

export const CARD_WIDTH = 160;
export const CARD_HEIGHT = 232;
export const CARD_BODY_Y = 65;
export const CARD_BODY_HEIGHT = 64;
export const CARD_BODY_PANEL_HEIGHT = 76;
export const CARD_NAME_WIDTH = 114;
export const CARD_NAME_HEIGHT = 24;
export const CARD_FONT = 'Arial, "Yu Gothic", sans-serif';
export const CARD_INK = '#303744';
export const CARD_EDGE = 0xa49270;

const CATEGORY_LABELS = {
  attack: ['ATTACK', '攻撃'], utility: ['SKILL', 'スキル'], caress: ['CARESS', '愛撫'],
  lust: ['LUST', '欲望'], physiology: ['PHYSIOLOGY', '生理'], remedy: ['REMEDY', '回復'],
  noMotion: ['STILL', '静止'],
};

export function fitCardName(text: Phaser.GameObjects.Text): void {
  text.setFontSize(14).setScale(1);
  let fontSize = 14;
  while (text.height > CARD_NAME_HEIGHT && fontSize > 10) {
    text.setFontSize(--fontSize);
  }
  text.setScale(Math.min(1, CARD_NAME_WIDTH / Math.max(1, text.width), CARD_NAME_HEIGHT / Math.max(1, text.height)));
}

/** Code-drawn frame and a separate art slot; replace art without changing input/layout. */
export function createCardShell(scene: Phaser.Scene, definition: CardDefinition, name: string) {
  const container = scene.add.container(0, 0).setSize(CARD_WIDTH, CARD_HEIGHT);
  const accent = cardCategoryColor(definition.categories[0]);
  const shadow = scene.add.graphics().fillStyle(0x000000, 0.26).fillRoundedRect(-77, -110, 162, 232, 10);
  const bg = scene.add.rectangle(0, 0, CARD_WIDTH, CARD_HEIGHT, 0x1d2532).setStrokeStyle(1.5, CARD_EDGE);
  const frame = scene.add.graphics();
  frame.lineStyle(2, accent, 1).strokeRoundedRect(-75, -111, 150, 225, 7);
  frame.fillStyle(accent, 0.9).fillRoundedRect(-71, -108, 142, 29, 5);
  frame.fillStyle(0xf1e8d7).fillRoundedRect(-71, CARD_BODY_Y - CARD_BODY_PANEL_HEIGHT / 2, 142, CARD_BODY_PANEL_HEIGHT, 5);
  frame.lineStyle(1, accent, 0.85).lineBetween(-66, 23, 66, 23);
  // Quiet geometric ornament occupies the future illustration slot.
  const art = scene.add.container(0, -28.5).setName('card-art-slot').setSize(140, 93);
  const ornament = scene.add.graphics();
  ornament.fillStyle(accent, 0.1).fillRoundedRect(-70, -46.5, 140, 93, 4);
  ornament.lineStyle(1, accent, 0.32).strokeCircle(0, -1, 23);
  ornament.lineStyle(1, accent, 0.6).strokePoints([{ x: 0, y: -22 }, { x: 18, y: -1 }, { x: 0, y: 20 }, { x: -18, y: -1 }], true);
  ornament.lineBetween(-58, -1, -30, -1).lineBetween(30, -1, 58, -1);
  ornament.fillStyle(accent, 0.75).fillCircle(0, -1, 4);
  art.add(ornament);
  const costRing = scene.add.circle(-64, -101, 15, 0x141c29).setStrokeStyle(2, accent);
  const costText = scene.add.text(-64, -101, String(definition.cost), {
    fontFamily: CARD_FONT, fontSize: '19px', fontStyle: 'bold', color: '#fff5df',
  }).setOrigin(0.5).setResolution(2);
  const nameText = scene.add.text(14, -94, name, {
    fontFamily: CARD_FONT, fontSize: '14px', fontStyle: 'bold', color: '#202938',
    align: 'center', wordWrap: { width: CARD_NAME_WIDTH, useAdvancedWrap: true },
  }).setOrigin(0.5).setResolution(2);
  fitCardName(nameText);
  const label = cardCategoryLabel(definition);
  const category = scene.add.text(0, 108, label, { fontFamily: CARD_FONT, fontSize: '9px', color: '#d6c9ae', letterSpacing: 1 }).setOrigin(0.5).setResolution(2);
  const rarity = scene.add.graphics().fillStyle(definition.rarity === 'rare' ? 0xf2ce7c : accent, 0.9);
  const pips = definition.rarity === 'rare' ? 3 : definition.rarity === 'uncommon' ? 2 : 1;
  for (let i = 0; i < pips; i++) rarity.fillCircle(58 - i * 6, 110, 1.5);
  container.add([shadow, bg, frame, art, costRing, costText, nameText, category, rarity]);
  container.setData('refreshCardLabels', () => category.setText(cardCategoryLabel(definition)));
  return { container, bg, costText, nameText };
}

function cardCategoryLabel(definition: CardDefinition): string {
  return CATEGORY_LABELS[definition.categories[0]][SETTINGS_STATE.language === 'ja' ? 1 : 0];
}
