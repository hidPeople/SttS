import { onPrimaryClick } from './pointerActions';
import { GAME_FONT } from './fonts';
import { TUTORIAL_TIP_PRESENTATION } from '../data/ui';
import type Phaser from 'phaser';
import type { TutorialTipDefinition, TutorialTipPage } from '../data/tutorialTips';
import { TutorialTipRuntime, type TutorialTipMatch, type TutorialTipSnapshot } from '../models/tutorialTips';
import { createTooltipPaint } from './crayon';
import { sizeTooltipText, TOOLTIP_LAYOUT } from './textLayout';
import { KeyboardNavigation } from './keyboardNavigation';

type FocusObject = Phaser.GameObjects.Container;
type TipHost = {
  snapshot: () => TutorialTipSnapshot;
  text: (page: TutorialTipPage) => string;
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
  private highlighted = new Map<FocusObject, number>();
  private pageIndex = 0;
  private width = 0;
  private height = 0;
  private nextPoll = 0;
  private inputReadyAt = 0;
  private openingTween?: Phaser.Tweens.Tween;
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
    // Use real time so Ctrl fast-forward cannot weaken the accidental-click guard.
    this.inputReadyAt = this.scene.game.loop.now + Math.max(0, TUTORIAL_TIP_PRESENTATION.inputLockDuration);
    this.runtime.markShown(match.definition.id);
    const { width, height } = this.scene.scale;
    this.shade = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5).setDepth(10000);
    for (const sprite of this.host.sprites()) {
      if (!sprite.anims.isPlaying || sprite.anims.isPaused) continue;
      sprite.anims.pause();
      this.restore.push(() => { if (sprite.active) sprite.anims.resume(); });
    }
    this.root = this.scene.add.container(0, 0).setDepth(10002);
    const shield = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0).setInteractive();
    onPrimaryClick(shield, (pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      const panel = this.panel;
      if (panel && (match.definition.pages.length > 1 || pointer.x < panel.x || pointer.x > panel.x + this.width || pointer.y < panel.y || pointer.y > panel.y + this.height)) this.advance();
    });
    this.root.add(shield);
    // Multi-page tips advance on click/confirm; one-page tips keep outside-only mouse dismissal.
    const navigation = KeyboardNavigation.for(this.scene);
    navigation.select(navigation.register(shield, { group: 'tutorial-tip', activate: () => this.advance() }), true);
    this.showPage(0);
    if (this.shade && this.panel) {
      const duration = Math.max(0, TUTORIAL_TIP_PRESENTATION.fadeInDuration);
      if (duration > 0) {
        this.shade.setAlpha(0);
        this.panel.setAlpha(0);
        this.openingTween = this.scene.tweens.add({
          targets: [this.shade, this.panel], alpha: 1, duration, ease: 'Sine.easeOut',
        });
      }
    }
  }

  advance(): void {
    if (!this.match || this.scene.game.loop.now < this.inputReadyAt) return;
    if (this.pageIndex + 1 < this.match.definition.pages.length) this.showPage(this.pageIndex + 1);
    else this.dismiss();
  }

  private syncHighlights(match: TutorialTipMatch): void {
    const next = new Set(this.host.highlights(match));
    for (const [object, depth] of this.highlighted) {
      if (next.has(object)) continue;
      if (object.active) object.setDepth(depth);
      this.highlighted.delete(object);
    }
    for (const object of next) {
      if (this.highlighted.has(object)) continue;
      this.highlighted.set(object, object.depth);
      object.setDepth(10001);
    }
  }

  private showPage(index: number): void {
    if (!this.match || !this.root) return;
    const page = this.match.definition.pages[index];
    if (!page) { this.dismiss(true); return; }
    this.pageIndex = index;
    this.match = { ...this.match, page };
    this.syncHighlights(this.match);
    // Rebuild only the text panel; keep shade, input shield, shared highlights and paused sprites.
    this.panel?.destroy(true);
    const { width, height } = this.scene.scale;
    const paint = createTooltipPaint(this.scene, TOOLTIP_LAYOUT.maxWidth).setFillStyle(0xffffff);
    const text = this.scene.add.text(TOOLTIP_LAYOUT.paddingX, TOOLTIP_LAYOUT.paddingY, '', { fontFamily: GAME_FONT, fontSize: TOOLTIP_LAYOUT.fontSize, color: '#000000', lineSpacing: 4 });
    const size = sizeTooltipText(text, this.host.text(page), Math.min(TOOLTIP_LAYOUT.maxWidth, width - 31), height - 31);
    const extraPadding = parseFloat(String(text.style.fontSize)) * TOOLTIP_LAYOUT.edgePaddingRatio;
    text.setPosition(text.x + extraPadding, text.y + extraPadding);
    this.width = size.width + extraPadding * 2;
    this.height = size.height + extraPadding * 2;
    paint.fit(this.width, this.height);
    this.panel = this.scene.add.container(0, 0, [paint, text]);
    this.root.add(this.panel);
    this.position();
  }

  private position(): void {
    if (!this.match || !this.panel) return;
    const anchor = this.host.anchor(this.match);
    if (!anchor) { this.dismiss(true); return; }
    const { width, height } = this.scene.scale;
    const left = anchor.x - (anchor.centered ? this.width / 2 : 0);
    this.panel.setPosition(Math.max(8, Math.min(left, width - this.width - 8)), Math.max(8, Math.min(anchor.y - this.height, height - this.height - 8)));
  }

  dismiss(force = false): void {
    if (!force && this.scene.game.loop.now < this.inputReadyAt) return;
    this.openingTween?.remove();
    this.openingTween = undefined;
    this.inputReadyAt = 0;
    for (const [object, depth] of this.highlighted) if (object.active) object.setDepth(depth);
    this.highlighted.clear();
    this.pageIndex = 0;
    this.restore.splice(0).forEach(restore => restore());
    this.root?.destroy(true); this.root = undefined;
    this.shade?.destroy(); this.shade = undefined;
    this.panel = undefined; this.match = undefined;
    this.nextPoll = this.scene.time.now + 150; // Do not reuse the dismissing click for the next Tip.
  }

  private destroy(): void {
    this.scene.events.off('update', this.update, this);
    this.dismiss(true);
  }
}
