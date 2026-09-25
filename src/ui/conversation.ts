import { SCREEN_WIDTH, SCREEN_HEIGHT, SCREEN_CENTER_X, SCREEN_CENTER_Y } from './layout';
import type Phaser from 'phaser';
import { CONVERSATIONS, CONVERSATION_WINDOW, type ConversationPage } from '../data/conversations';
import { PLAYER_DEFINITION, PLAYER_PORTRAIT } from '../data/player';
import { characterPortraitAssets } from '../models/portraitAssets';
import { CHARACTER_IMAGE_EXTENSION } from '../data/characterPortraits';
import { PLAYER_STATUS_HUD_LAYOUT } from '../data/ui';
import { localizeGameText as localize } from '../models/gameText';
import { text as l } from '../models/localization';
import { applyPlayerPortrait, hidePlayerPortrait } from './playerPortrait';
import { battleLogColor } from './battleLogStyle';
import { ConversationControls, type NovelAction } from './conversationControls';
import { ConversationLog, type ConversationLogEntry } from './conversationLog';
import { ConversationSurface } from './conversationSurface';
import { NovelPlayback, type NovelPlaybackMode } from '../models/novelPlayback';
import { setSceneFastForward } from './gameSpeed';

const assets = import.meta.glob('../../image/**/*.{png,jpg,jpeg,webp}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const backgroundKey = (file: string) => `conversation-background:${file}`;
export interface ConversationPresentation {
  fadeInDuration: number;
  fadeOutDuration: number;
}
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
  private surface: ConversationSurface;
  private playback = new NovelPlayback();
  private portrait?: Phaser.GameObjects.Container;
  private background?: Phaser.GameObjects.Image;
  private pages: ConversationPage[];
  private index = 0;
  private ready = false;
  private done = false;
  private restorePortrait?: () => void;
  private tween?: Phaser.Tweens.Tween;
  private shade?: Phaser.GameObjects.Rectangle;
  private backgroundShade: Phaser.GameObjects.Rectangle;
  private dimTween?: Phaser.Tweens.Tween;
  private dimTarget?: number;
  private controls: ConversationControls;
  private log?: ConversationLog;
  private hidden = false;

  constructor(private scene: Phaser.Scene, id: string, private blocked: () => boolean = () => false, private originalPortrait?: Phaser.GameObjects.Container, private presentation?: ConversationPresentation) {
    this.pages = CONVERSATIONS[id] ?? [];
    this.finished = new Promise(resolve => { this.finish = resolve; });
    this.root = scene.add.container(0, 0).setDepth(5500);
    const input = scene.add.rectangle(SCREEN_CENTER_X, SCREEN_CENTER_Y, SCREEN_WIDTH, SCREEN_HEIGHT, 0x000000, 0).setInteractive();
    this.backgroundShade = scene.add.rectangle(SCREEN_CENTER_X, SCREEN_CENTER_Y, SCREEN_WIDTH, SCREEN_HEIGHT, 0x000000, 1).setAlpha(0);
    this.root.add([input, this.backgroundShade]);
    this.surface = new ConversationSurface(scene, Boolean(originalPortrait), {
      enabled: () => this.ready && !this.done && !this.blocked() && !this.log,
      mode: mode => this.setPlaybackMode(mode),
      hide: () => this.action('hide'), log: () => this.action('log'),
    });
    this.window = this.surface.root.setScale(0.001);
    this.root.add(this.window);
    this.controls = new ConversationControls(scene, {
      enabled: () => !this.done && !this.blocked(),
      owns: object => {
        for (let node: Phaser.GameObjects.GameObject | null = object; node; node = node.parentContainer) {
          if (node === this.root || node === this.log?.root || node === this.shade) return true;
        }
        return false;
      },
      interaction: () => this.setPlaybackMode('off'),
      action: action => this.action(action),
      skip: () => { if (!this.hidden && !this.log) this.next(); },
      scrollLog: delta => { if (!this.log) return false; this.log.scroll(delta); return true; },
    });
    scene.events.on('update', this.updatePlayback, this);
    scene.events.once('shutdown', this.cancel, this);
    this.refresh();
    if (presentation) {
      this.window.setVisible(false);
      // Above settings as well: opening/closing fades block all pointer input.
      this.shade = scene.add.rectangle(SCREEN_CENTER_X, SCREEN_CENTER_Y, SCREEN_WIDTH, SCREEN_HEIGHT, 0x000000, 1).setDepth(8000).setInteractive();
      this.tween = scene.tweens.add({ targets: this.shade, alpha: 0, duration: presentation.fadeInDuration, ease: 'Linear', onComplete: () => {
        this.shade?.setVisible(false);
        this.open();
      } });
    } else this.open();
  }

  get transitioning(): boolean { return !this.ready; }
  get logActive(): boolean { return Boolean(this.log); }

  private setPlaybackMode(mode: NovelPlaybackMode): void {
    if (mode !== 'off' && (this.originalPortrait || !this.ready || this.done || this.blocked())) return;
    this.playback.setMode(mode);
    setSceneFastForward(this.scene, mode === 'skip');
    this.surface.setPlayback(mode, 0);
  }

  private updatePlayback(): void {
    if (this.done) return;
    this.surface.update();
    const now = this.scene.game.loop.now;
    const ready = this.ready && !this.blocked() && !this.hidden && !this.log
      && this.scene.game.scene.getScenes(true).slice(-1)[0] === this.scene;
    if (this.playback.update(now, Boolean(ready))) this.next();
    this.surface.setPlayback(this.playback.mode, this.playback.progress(now));
  }

  private action(action: NovelAction): void {
    this.setPlaybackMode('off');
    if (!this.ready || this.blocked() || this.done) return;
    if (action === 'hide') {
      if (this.log) { this.closeLog(); return; }
      this.hidden = !this.hidden; this.window.setVisible(!this.hidden);
    } else if (action === 'log') {
      this.hidden = false; this.window.setVisible(true); this.openLog();
    } else if (!this.log) this.next();
  }

  private pageEntry(page: ConversationPage): ConversationLogEntry {
    return {
      text: localize(page.text).split('{player}').join(localize(PLAYER_DEFINITION.name)),
      name: page.speaker === 'narration' ? '' : page.speaker === 'user' ? localize(l('You', 'あなた')) : localize(PLAYER_DEFINITION.name),
      color: battleLogColor(page.speaker),
    };
  }

  private openLog(): void {
    this.closeLog();
    this.log = new ConversationLog(this.scene, this.pages.slice(0, this.index + 1).map(page => this.pageEntry(page)), localize(l('Message Log', 'メッセージログ')), () => this.closeLog());
  }

  private closeLog(): void { this.log?.destroy(); this.log = undefined; }

  private open(): void {
    this.window.setVisible(true);
    this.tween = this.scene.tweens.add({ targets: this.window, scaleX: 1, scaleY: 1, duration: CONVERSATION_WINDOW.openDuration, ease: 'Sine.easeOut', onComplete: () => { this.ready = true; if (!this.pages.length) this.close(); } });
  }

  refresh(): void {
    const page = this.pages[this.index];
    if (!page || this.done) return;
    const entry = this.pageEntry(page);
    this.surface.setPage(entry.text, entry.name, page.speaker, this.index, this.pages.length);
    this.playback.page(entry.text);
    const dim = Math.max(0, Math.min(1, page.backgroundDim ?? 0));
    if (dim !== this.dimTarget) {
      this.dimTween?.stop();
      if (this.dimTarget === undefined) this.backgroundShade.setAlpha(dim);
      else this.dimTween = this.scene.tweens.add({ targets: this.backgroundShade, alpha: dim, duration: CONVERSATION_WINDOW.backgroundDimDuration, ease: 'Linear' });
      this.dimTarget = dim;
    }
    if (this.log) this.openLog();
    this.background?.destroy(); this.background = undefined;
    this.portrait?.destroy(true); this.portrait = undefined;
    if (page.background && this.scene.textures.exists(backgroundKey(page.background))) {
      this.background = this.scene.add.image(SCREEN_CENTER_X, SCREEN_CENTER_Y, backgroundKey(page.background)).setDisplaySize(SCREEN_WIDTH, SCREEN_HEIGHT);
      this.root.addAt(this.background, 0);
    }
    const file = page.portrait;
    const key = file?.endsWith(CHARACTER_IMAGE_EXTENSION) ? file.slice(0, -CHARACTER_IMAGE_EXTENSION.length) : file;
    const id = key && characterPortraitAssets[key] ? key : undefined;
    if (id) {
      this.restorePortrait ??= hidePlayerPortrait(this.originalPortrait);
      const sprite = this.scene.add.sprite(0, 0, characterPortraitAssets[id].textureKey);
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
    if (this.log) return;
    if (this.hidden) { this.hidden = false; this.window.setVisible(true); return; }
    if (this.index + 1 >= this.pages.length) this.close();
    else { this.index++; this.refresh(); }
  }

  private close(): void {
    this.ready = false;
    if (this.presentation && this.shade) {
      this.shade.setVisible(true).setAlpha(0);
      this.tween = this.scene.tweens.add({ targets: this.shade, alpha: 1, duration: this.presentation.fadeOutDuration, ease: 'Linear', onComplete: () => this.dispose(true) });
      return;
    }
    this.tween = this.scene.tweens.add({ targets: this.window, scaleX: 0.001, scaleY: 0.001, duration: CONVERSATION_WINDOW.closeDuration, ease: 'Sine.easeIn', onComplete: () => this.dispose(true) });
  }

  private cancel(): void { this.dispose(false); }
  private dispose(completed: boolean): void {
    if (this.done) return;
    this.done = true; this.ready = false;
    this.tween?.stop();
    this.dimTween?.stop();
    this.setPlaybackMode('off');
    this.scene.events.off('update', this.updatePlayback, this);
    this.controls.destroy();
    this.closeLog();
    this.shade?.destroy();
    this.restorePortrait?.();
    this.scene.events.off('shutdown', this.cancel, this);
    this.root.destroy(true);
    this.finish(completed);
  }
}
