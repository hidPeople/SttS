import Phaser from 'phaser';
import { CARD_TACTICS_UI as UI } from '../data/cardTacticsUi';
import { DeckInspectionSelection } from '../models/cardTactics';
import type { CardInstance } from '../models/types';
import { localize } from '../models/localization';
import { GAME_FONT } from './fonts';
import { KeyboardNavigation } from './keyboardNavigation';
import { onPrimaryClick } from './pointerActions';
import { CARD_WIDTH, CARD_HEIGHT } from './cardPresentation';

/** Only confirmation closes selection overlays; selecting the last candidate never commits. */
export class CardTacticsOverlay {
  readonly root: Phaser.GameObjects.Container;
  private finished = false;
  private cancel?: () => void;
  constructor(private scene: Phaser.Scene) {
    this.root = scene.add.container(0, 0).setDepth(UI.depth);
    this.root.add(scene.add.rectangle(640, 360, 1280, 720, 0x070c18, UI.shadeAlpha).setInteractive());
    scene.events.once('shutdown', this.destroy, this);
  }
  private label(x: number, y: number, text: string, size = 22): Phaser.GameObjects.Text {
    const result = this.scene.add.text(x, y, text, { fontFamily: GAME_FONT, fontSize: `${size}px`, color: '#ffffff', align: 'center', wordWrap: { width: 1120 } }).setOrigin(0.5);
    this.root.add(result); return result;
  }
  private button(x: number, y: number, text: string, click: () => void, width = 250, height = 56): Phaser.GameObjects.Container {
    const box = this.scene.add.container(x, y);
    const bg = this.scene.add.rectangle(0, 0, width, height, 0x263e56).setStrokeStyle(2, 0x91bccb).setInteractive({ useHandCursor: true });
    const label = this.scene.add.text(0, 0, text, { fontFamily: GAME_FONT, fontSize: '23px', color: '#ffffff', align: 'center', wordWrap: { width: width - 24 } }).setOrigin(0.5);
    box.add([bg, label]); this.root.add(box);
    onPrimaryClick(bg, () => { if (!this.finished) click(); });
    KeyboardNavigation.for(this.scene).register(bg, { group: 'card-tactic' });
    return box;
  }
  inspect(cards: CardInstance[], takeCount: number, preview: (card: CardInstance, x: number, y: number, scale: number) => Phaser.GameObjects.Container): Promise<DeckInspectionSelection> {
    const model = new DeckInspectionSelection(cards, takeCount);
    return new Promise(resolve => {
      this.cancel = () => resolve(new DeckInspectionSelection([], 0));
      this.label(640, 38, localize(UI.inspect));
      const takeLabel = this.label(235, 94, '').setColor(Phaser.Display.Color.IntegerToColor(UI.takeColor).rgba);
      const discardLabel = this.label(760, 94, '').setColor(Phaser.Display.Color.IntegerToColor(UI.discardColor).rgba);
      const slots = this.scene.add.graphics(); this.root.add(slots);
      const groupGap = cards.length > model.required ? UI.inspectGroupGap : 0;
      const slotStep = Math.min(142, (1100 - groupGap) / Math.max(1, cards.length));
      const slotScale = Math.min(UI.slotScale, (slotStep - 8) / CARD_WIDTH);
      const slotX = (take: boolean, index: number) => 640 + ((take ? index : model.required + index) - (cards.length - 1) / 2) * slotStep + (take ? -groupGap / 2 : groupGap / 2);
      takeLabel.setX(slotX(true, (model.required - 1) / 2));
      discardLabel.setX(slotX(false, (cards.length - model.required - 1) / 2)).setVisible(cards.length > model.required);
      const candidateStep = Math.min(210, 1120 / Math.max(1, cards.length));
      const candidateScale = Math.min(UI.inspectScale, (candidateStep - 8) / CARD_WIDTH);
      const w = CARD_WIDTH * slotScale, h = CARD_HEIGHT * slotScale;
      const dotted = (x: number, y: number) => {
        for (let dx = -w / 2; dx < w / 2; dx += 14) { slots.lineBetween(x + dx, y - h / 2, x + Math.min(w / 2, dx + 7), y - h / 2); slots.lineBetween(x + dx, y + h / 2, x + Math.min(w / 2, dx + 7), y + h / 2); }
        for (let dy = -h / 2; dy < h / 2; dy += 14) { slots.lineBetween(x - w / 2, y + dy, x - w / 2, y + Math.min(h / 2, dy + 7)); slots.lineBetween(x + w / 2, y + dy, x + w / 2, y + Math.min(h / 2, dy + 7)); }
      };
      slots.lineStyle(2, UI.takeColor, 0.85);
      for (let i = 0; i < model.required; i++) dotted(slotX(true, i), 218);
      slots.lineStyle(2, UI.discardColor, 0.85);
      for (let i = 0; i < cards.length - model.required; i++) dotted(slotX(false, i), 218);
      let ready = false;
      const views = cards.map((card, index) => {
        const x = 640 + (index - (cards.length - 1) / 2) * candidateStep;
        const view = preview(card, x, 485, candidateScale); this.root.add(view);
        const hit = this.scene.add.rectangle(0, 0, CARD_WIDTH, CARD_HEIGHT, 0xffffff, 0).setInteractive({ useHandCursor: true }); view.add(hit);
        onPrimaryClick(hit, () => { if (ready && !this.finished) { model.toggle(card.uid); refresh(); } });
        KeyboardNavigation.for(this.scene).register(hit, { group: 'card-tactic', enabled: () => ready });
        view.setX(-150).setAlpha(0);
        this.scene.tweens.add({ targets: view, x, alpha: 1, duration: UI.revealDuration, delay: index * UI.revealStagger,
          onComplete: () => { if (index === cards.length - 1) ready = true; } });
        return { view, card, x };
      });
      const confirm = this.button(640, 659, localize(UI.confirm), () => {
        if (!ready || !model.valid) return;
        this.cancel = undefined; this.destroy(); resolve(model);
      });
      const refresh = () => {
        takeLabel.setText(`${localize(UI.take)} ${model.hand.size}/${model.required}`);
        discardLabel.setText(`${localize(UI.discard)} ${model.discard.size}/${cards.length - model.required}(max)`);
        confirm.setAlpha(model.valid ? 1 : 0.45);
        for (const { view, card, x } of views) {
          const handIndex = [...model.hand].indexOf(card.uid), discardIndex = [...model.discard].indexOf(card.uid);
          const selected = handIndex >= 0 || discardIndex >= 0;
          this.scene.tweens.killTweensOf(view);
          this.scene.tweens.add({ targets: view, x: selected ? slotX(handIndex >= 0, Math.max(handIndex, discardIndex)) : x,
            y: selected ? 218 : 485, scale: selected ? slotScale : candidateScale, duration: 140 });
        }
      };
      // Do not cancel the initial draw animation when writing the first counters.
      takeLabel.setText(`${localize(UI.take)} 0/${model.required}`);
      discardLabel.setText(`${localize(UI.discard)} 0/${cards.length - model.required}(max)`); confirm.setAlpha(0.45);
      if (!cards.length) { this.cancel = undefined; this.destroy(); resolve(model); }
    });
  }
  selectHand(onToggleReady: (toggle: (uid: string) => void) => void, mark: (uids: Set<string>) => void): Promise<Set<string>> {
    return new Promise(resolve => {
      const selected = new Set<string>();
      this.cancel = () => resolve(new Set());
      this.label(640, 240, localize(UI.exhaust));
      const count = this.label(640, 280, '0');
      onToggleReady(uid => { if (selected.has(uid)) selected.delete(uid); else selected.add(uid); count.setText(String(selected.size)); mark(selected); });
      this.button(640, 344, localize(UI.confirm), () => { this.cancel = undefined; this.destroy(); resolve(selected); });
    });
  }
  choose(labels: string[], notes: string[]): Promise<number> {
    return new Promise(resolve => {
      this.cancel = () => resolve(-1);
      this.label(640, 200, localize(UI.choose), 30);
      labels.forEach((text, index) => {
        const x = 640 + (index - (labels.length - 1) / 2) * 365;
        this.button(x, 330, text, () => { this.cancel = undefined; this.destroy(); resolve(index); }, 338, 138);
        const note = this.label(x, 457, notes[index] ?? '', 18); note.setWordWrapWidth(325);
      });
    });
  }
  destroy(): void {
    if (this.finished) return;
    this.finished = true;
    this.scene.events.off('shutdown', this.destroy, this);
    for (const child of this.root.list) this.scene.tweens.killTweensOf(child);
    this.root.destroy(); this.cancel?.(); this.cancel = undefined;
  }
}
