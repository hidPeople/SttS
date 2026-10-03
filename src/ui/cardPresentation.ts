import Phaser from 'phaser';
import { GAME_FONT } from './fonts';
import { cardCategoryColor } from '../data/cardCategories';
import { SETTINGS_STATE } from '../models/localization';
import type { CardDefinition } from '../models/types';
import { cardTextResolution } from '../models/cardTextResolution';
import { bindCardTextResolution } from './cardTextResolution';
import { CARD_FRAME } from '../data/cardAppearance';
import { STATUS_DESCRIPTIONS } from '../data/statuses';
import { RUN_STATE } from '../models/RunState';
import { resolveCardArtwork } from '../models/cardArtwork';
import { addCardArtwork, cardFrameTexture, cardArtworkFiles } from './cardArtwork';
import { CardSelectionGlow } from './selectionGlow';

export const CARD_WIDTH = 160;
export const CARD_HEIGHT = 232;
export const CARD_BODY_Y = 65;
export const CARD_BODY_HEIGHT = 64;
export const CARD_BODY_PANEL_HEIGHT = 76;
export const CARD_NAME_WIDTH = 114;
export const CARD_NAME_HEIGHT = 24;
export const CARD_NAME_FONT_SIZE = 16;
export const CARD_NAME_PANEL = { x: -71, y: -108, width: 142, height: 29, radius: 5 };
export const CARD_FONT = GAME_FONT;
export const CARD_INK = '#303744';

const CATEGORY_LABELS = {
  attack: ['ATTACK', '攻撃'], utility: ['SKILL', 'スキル'], caress: ['CARESS', '愛撫'],
  lust: ['LUST', '欲望'], physiology: ['PHYSIOLOGY', '生理'], remedy: ['REMEDY', '回復'],
  noMotion: ['STILL', '静止'],
};

export function fitCardName(text: Phaser.GameObjects.Text): void {
  text.setFontSize(CARD_NAME_FONT_SIZE).setScale(1);
  let fontSize = CARD_NAME_FONT_SIZE;
  while (text.height > CARD_NAME_HEIGHT && fontSize > 10) {
    text.setFontSize(--fontSize);
  }
  text.setScale(Math.min(1, CARD_NAME_WIDTH / Math.max(1, text.width), CARD_NAME_HEIGHT / Math.max(1, text.height)));
}

/** Shared rounded frame, clipped full-surface art and foreground labels for every card view. */
export function createCardShell(scene: Phaser.Scene, definition: CardDefinition, name: string) {
  const container = scene.add.container(0, 0).setSize(CARD_WIDTH, CARD_HEIGHT);
  const accent = cardCategoryColor(definition.categories[0]);
  const shadow = scene.add.graphics().fillStyle(0x000000, 0.26).fillRoundedRect(-77, -110, CARD_WIDTH, CARD_HEIGHT, CARD_FRAME.cornerRadius);
  // Keep the existing Rectangle input API; all visible pixels belong to the rounded surface.
  const bg = scene.add.rectangle(0, 0, CARD_WIDTH, CARD_HEIGHT, 0xffffff, 0);
  const surface = scene.add.image(0, 0, cardFrameTexture(scene, definition.rarity, CARD_WIDTH, CARD_HEIGHT)).setDisplaySize(CARD_WIDTH, CARD_HEIGHT);
  const art = scene.add.container(0, 0).setName('card-art-slot').setSize(CARD_WIDTH, CARD_HEIGHT);
  const artworkPart = definition.purgeStatus ? STATUS_DESCRIPTIONS[definition.purgeStatus]?.epDamageParts?.[0] : undefined;
  addCardArtwork(scene, art, resolveCardArtwork(definition.id, RUN_STATE.eventBattleId ?? 'normal', cardArtworkFiles, undefined, artworkPart), CARD_WIDTH, CARD_HEIGHT);
  const frame = scene.add.graphics();
  const inset = CARD_FRAME.rimWidth;
  frame.lineStyle(CARD_FRAME.decorationWidth, accent, 1).strokeRoundedRect(
    -CARD_WIDTH / 2 + inset, -CARD_HEIGHT / 2 + inset,
    CARD_WIDTH - inset * 2, CARD_HEIGHT - inset * 2, CARD_FRAME.cornerRadius,
  );
  const title = CARD_NAME_PANEL;
  frame.fillStyle(accent, 0.9).fillRoundedRect(title.x, title.y, title.width, title.height, title.radius);
  frame.fillStyle(0xf1e8d7).fillRoundedRect(-71, CARD_BODY_Y - CARD_BODY_PANEL_HEIGHT / 2, 142, CARD_BODY_PANEL_HEIGHT, 5);
  const costRing = scene.add.circle(-64, -101, 15, 0x141c29).setStrokeStyle(2, accent);
  const costText = scene.add.text(-64, -101, String(definition.cost), {
    fontFamily: CARD_FONT, fontSize: '19px', fontStyle: 'bold', color: '#fff5df',
  }).setOrigin(0.5).setResolution(cardTextResolution(1));
  const nameText = scene.add.text(5, -94, name, {
    fontFamily: CARD_FONT, fontSize: CARD_NAME_FONT_SIZE, fontStyle: 'bold', color: '#202938',
    align: 'center', wordWrap: { width: CARD_NAME_WIDTH, useAdvancedWrap: true },
  }).setOrigin(0.5).setResolution(cardTextResolution(1));
  fitCardName(nameText);
  const label = cardCategoryLabel(definition);
  const category = scene.add.text(0, 105, label, { fontFamily: CARD_FONT, fontSize: '9px', color: '#d6c9ae', letterSpacing: 1, stroke: '#151923', strokeThickness: 2 }).setOrigin(0.5).setResolution(cardTextResolution(1));
  container.add([shadow, bg, surface, art, frame, costRing, costText, nameText, category]);
  const selectionGlow = new CardSelectionGlow(scene, container, CARD_WIDTH, CARD_HEIGHT);
  container.setData('refreshCardLabels', () => category.setText(cardCategoryLabel(definition)));
  bindCardTextResolution(scene, container);
  return { container, bg, costText, nameText, selectionGlow };
}

function cardCategoryLabel(definition: CardDefinition): string {
  return CATEGORY_LABELS[definition.categories[0]][SETTINGS_STATE.language === 'ja' ? 1 : 0];
}
