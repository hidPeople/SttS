import { GAME_FONT } from './fonts';
import type Phaser from 'phaser';
import type { TutorialTipDefinition } from '../data/tutorialTips';
import { TutorialTipRuntime, type TutorialTipMatch, type TutorialTipSnapshot } from '../models/tutorialTips';
import { createTooltipPaint } from './crayon';
import { sizeTooltipText } from './textLayout';
import { KeyboardNavigation } from './keyboardNavigation';

type FocusObject = Phaser.GameObjects.Container;
type TipHost = {
  snapshot: () => TutorialTipSnapshot;
  text: (definition: TutorialTipDefinition) => string;
  anchor: (match: TutorialTipMatch) => { x: number; y: number; centered: boolean } | undefined;
  highlights: (match: TutorialTipMatch) => FocusObject[];
  sprites: () => Phaser.GameObjects.Sprite[];
  beforeShow: () => void;
};

/** Modal spotlight: raised visuals remain behind a full-screen input shield. */
export class TutorialTips {
  root?: Phaser.GameObjects.Container;
  private runtime: TutorialTipRuntime;
  private match?: TutorialTipMatch;
  private panel?: Phaser.GameObjects.Container;
  private shade?: Phaser.GameObjects.Rectangle;
  private restore: (() => void)[] = [];
  private width = 0;
  private height = 0;
  private nextPoll = 0;
  get active(): boolean { return Boolean(this.root); }

  constructor(private scene: Phaser.Scene, definitions: readonly TutorialTipDefinition[], private host: TipHost) {
    this.runtime = new TutorialTipRuntime(definitions);
    scene.events.on('update', this.update, this);
    scene.events.once('shutdown', this.destroy, this);
  }

  private update(): void {
    if (this.active) this.position();
    if (this.scene.time.now < this.nextPoll) return;
    this.check();
  }

  /** Called immediately when action resolution finishes; polling is only a timeout fallback. */
  check(): void {
    const now = this.scene.time.now;
    this.nextPoll = now + 100;
    const snapshot = this.host.snapshot();
    const match = this.runtime.next({ ...snapshot, ready: snapshot.ready && !this.active }, now);
    if (match && this.host.anchor(match)) this.show(match);
  }

  private show(match: TutorialTipMatch): void {
    this.host.beforeShow();
    this.match = match;
    this.runtime.markShown(match.definition.id);
    const { width, height } = this.scene.scale;
    this.shade = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5).setDepth(10000);
    for (const object of new Set(this.host.highlights(match))) {
      const depth = object.depth;
      object.setDepth(10001);
      this.restore.push(() => { if (object.active) object.setDepth(depth); });
    }
    for (const sprite of this.host.sprites()) {
      if (!sprite.anims.isPlaying || sprite.anims.isPaused) continue;
      sprite.anims.pause();
      this.restore.push(() => { if (sprite.active) sprite.anims.resume(); });
    }
    this.root = this.scene.add.container(0, 0).setDepth(10002);
    const shield = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0).setInteractive();
    shield.on('pointerup', (pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      const panel = this.panel;
      if (panel && (pointer.x < panel.x || pointer.x > panel.x + this.width || pointer.y < panel.y || pointer.y > panel.y + this.height)) this.dismiss();
    });
    const paint = createTooltipPaint(this.scene, 360).setFillStyle(0xffffff);
    const text = this.scene.add.text(14, 12, '', { fontFamily: GAME_FONT, fontSize: '15px', color: '#000000', lineSpacing: 4 });
    // Reserve one extra character across both sides; keep the usual text wrapping width.
    const size = sizeTooltipText(text, this.host.text(match.definition), Math.min(360, width - 31), height - 31);
    const extraPadding = parseFloat(String(text.style.fontSize)) / 2;
    text.setPosition(text.x + extraPadding, text.y + extraPadding);
    this.width = size.width + extraPadding * 2;
    this.height = size.height + extraPadding * 2;
    paint.fit(this.width, this.height);
    this.panel = this.scene.add.container(0, 0, [paint, text]);
    this.root.add([shield, this.panel]);
    // Mouse dismissal is outside-only; keyboard users can dismiss with confirm or Escape.
    const navigation = KeyboardNavigation.for(this.scene);
    navigation.select(navigation.register(shield, { group: 'tutorial-tip', activate: () => this.dismiss() }), true);
    this.position();
  }

  private position(): void {
    if (!this.match || !this.panel) return;
    const anchor = this.host.anchor(this.match);
    if (!anchor) { this.dismiss(); return; }
    const { width, height } = this.scene.scale;
    const left = anchor.x - (anchor.centered ? this.width / 2 : 0);
    this.panel.setPosition(Math.max(8, Math.min(left, width - this.width - 8)), Math.max(8, Math.min(anchor.y - this.height, height - this.height - 8)));
  }

  dismiss(): void {
    this.restore.splice(0).forEach(restore => restore());
    this.root?.destroy(true); this.root = undefined;
    this.shade?.destroy(); this.shade = undefined;
    this.panel = undefined; this.match = undefined;
    this.nextPoll = this.scene.time.now + 150; // Do not reuse the dismissing click for the next Tip.
  }

  private destroy(): void {
    this.scene.events.off('update', this.update, this);
    this.dismiss();
  }
}
