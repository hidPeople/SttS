import type Phaser from 'phaser';
import { CONVERSATIONS, CONVERSATION_WINDOW, type ConversationPage } from '../data/conversations';
import { PLAYER_DEFINITION, PLAYER_PORTRAIT } from '../data/player';
import { CHARACTER_SPRITES } from '../data/sprites';
import { PLAYER_STATUS_HUD_LAYOUT } from '../data/ui';
import { localizeGameText as localize } from '../models/gameText';
import { text as l } from '../models/localization';
import { CrayonPatch, CRAYON_COLORS } from './crayon';
import { applyPlayerPortrait, hidePlayerPortrait } from './playerPortrait';
import { battleLogColor } from './battleLogStyle';
import { KeyboardNavigation } from './keyboardNavigation';
import { setPunctuationAwareWordWrap } from './textLayout';

const assets = import.meta.glob('../../image/**/*.{png,jpg,jpeg,webp}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const backgroundKey = (file: string) => `conversation-background:${file}`;
export function preloadConversationAssets(scene: Phaser.Scene): void {
  for (const pages of Object.values(CONVERSATIONS)) for (const page of pages) {
    if (!page.background) continue;
    const source = assets[`../../image/${page.background}`];
    if (source && !scene.textures.exists(backgroundKey(page.background))) scene.load.image(backgroundKey(page.background), source);
  }
}

/** A modal page sequence; neither the battle nor input callbacks need to know its page count. */
export class ConversationWindow {
  readonly root: Phaser.GameObjects.Container;
  readonly finished: Promise<boolean>;
  private finish!: (completed: boolean) => void;
  private window: Phaser.GameObjects.Container;
  private body: Phaser.GameObjects.Text;
  private name: Phaser.GameObjects.Text;
  private namePlate: Phaser.GameObjects.Container;
  private portrait?: Phaser.GameObjects.Container;
  private background?: Phaser.GameObjects.Image;
  private pages: ConversationPage[];
  private index = 0;
  private ready = false;
  private done = false;
  private restorePortrait?: () => void;
  private tween?: Phaser.Tweens.Tween;

  constructor(private scene: Phaser.Scene, id: string, private blocked: () => boolean = () => false, private originalPortrait?: Phaser.GameObjects.Container) {
    this.pages = CONVERSATIONS[id] ?? [];
    this.finished = new Promise(resolve => { this.finish = resolve; });
    this.root = scene.add.container(0, 0).setDepth(5500);
    const input = scene.add.rectangle(640, 360, 1280, 720, 0x000000, 0).setInteractive();
    input.on('pointerup', () => this.next());
    this.root.add(input);
    this.window = scene.add.container(640, 612).setScale(0.001);
    const panel = scene.add.rectangle(0, 0, 1100, 165, 0x101419, 0.94).setStrokeStyle(3, 0xaeb8c8, 0.9).setInteractive();
    panel.on('pointerup', () => this.next());
    KeyboardNavigation.for(scene).register(panel, { group: 'dialogue', activate: () => this.next(), enabled: () => this.ready && !this.blocked() });
    this.namePlate = scene.add.container(-430, -107);
    const nameBg = new CrayonPatch(scene, 0, 0, 190, 40, CRAYON_COLORS.player);
    this.name = scene.add.text(0, 0, '', { fontFamily: 'Arial', fontSize: '18px', fontStyle: 'bold' }).setOrigin(0.5);
    this.namePlate.add([nameBg, this.name]);
    this.body = scene.add.text(-515, -52, '', { fontFamily: 'Arial', fontSize: '26px', wordWrap: { width: 1015 }, lineSpacing: 8 });
    setPunctuationAwareWordWrap(this.body, 1015);
    this.window.add([panel, this.namePlate, this.body]);
    this.root.add(this.window);
    scene.events.once('shutdown', this.cancel, this);
    this.refresh();
    this.tween = scene.tweens.add({ targets: this.window, scaleX: 1, scaleY: 1, duration: CONVERSATION_WINDOW.openDuration, ease: 'Sine.easeOut', onComplete: () => { this.ready = true; if (!this.pages.length) this.close(); } });
  }

  refresh(): void {
    const page = this.pages[this.index];
    if (!page || this.done) return;
    this.body.setText(localize(page.text).split('{player}').join(localize(PLAYER_DEFINITION.name))).setColor(battleLogColor(page.speaker));
    this.body.setFontSize(26);
    while (this.body.height > 120 && Number(this.body.style.fontSize.toString().replace('px', '')) > 12) this.body.setFontSize(parseInt(this.body.style.fontSize.toString()) - 1);
    this.namePlate.setVisible(page.speaker !== 'narration');
    this.name.setText(page.speaker === 'user' ? localize(l('You', 'あなた')) : localize(PLAYER_DEFINITION.name)).setColor(battleLogColor(page.speaker));
    this.background?.destroy(); this.background = undefined;
    this.portrait?.destroy(true); this.portrait = undefined;
    if (page.background && this.scene.textures.exists(backgroundKey(page.background))) {
      this.background = this.scene.add.image(640, 360, backgroundKey(page.background)).setDisplaySize(1280, 720);
      this.root.addAt(this.background, 0);
    }
    const file = page.portrait;
    const id = file && (CHARACTER_SPRITES[file] ? file : Object.keys(CHARACTER_SPRITES).find(key => CHARACTER_SPRITES[key].source === assets[`../../image/character/${file}`]));
    if (id) {
      this.restorePortrait ??= hidePlayerPortrait(this.originalPortrait);
      const sprite = this.scene.add.sprite(0, 0, CHARACTER_SPRITES[id].textureKey);
      applyPlayerPortrait(sprite, id);
      this.portrait = this.scene.add.container(145, PLAYER_STATUS_HUD_LAYOUT.y + PLAYER_STATUS_HUD_LAYOUT.iconSize / 2).setScale(PLAYER_PORTRAIT.battleScale);
      this.portrait.add(sprite); this.root.addAt(this.portrait, this.root.length - 1);
    } else {
      this.restorePortrait?.();
      this.restorePortrait = undefined;
    }
  }

  next(): void {
    if (!this.ready || this.blocked() || this.done) return;
    if (this.index + 1 >= this.pages.length) this.close();
    else { this.index++; this.refresh(); }
  }

  private close(): void {
    this.ready = false;
    this.tween = this.scene.tweens.add({ targets: this.window, scaleX: 0.001, scaleY: 0.001, duration: CONVERSATION_WINDOW.closeDuration, ease: 'Sine.easeIn', onComplete: () => this.dispose(true) });
  }

  private cancel(): void { this.dispose(false); }
  private dispose(completed: boolean): void {
    if (this.done) return;
    this.done = true; this.ready = false;
    this.tween?.stop();
    this.restorePortrait?.();
    this.scene.events.off('shutdown', this.cancel, this);
    this.root.destroy(true);
    this.finish(completed);
  }
}
