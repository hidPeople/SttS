import { pointerActionHandled } from './pointerActions';
import type Phaser from 'phaser';
import { NOVEL_CONTROLS } from '../data/conversations';

export type NovelAction = 'advance' | 'log' | 'hide';
const actions: NovelAction[] = ['advance', 'log', 'hide'];

/** Isolate conversation bindings from battle navigation; dispose restores all listeners. */
export class ConversationControls {
  private held = new Set<string>();
  private nextSkip = 0;
  constructor(private scene: Phaser.Scene, private host: {
    enabled: () => boolean;
    owns: (object: Phaser.GameObjects.GameObject) => boolean;
    action: (action: NovelAction) => void;
    skip: () => void;
    scrollLog: (delta: number) => boolean;
  }) {
    window.addEventListener('keydown', this.keyDown, true);
    window.addEventListener('keyup', this.keyUp, true);
    window.addEventListener('blur', this.reset);
    document.addEventListener('visibilitychange', this.reset);
    scene.game.canvas.addEventListener('contextmenu', this.preventMenu);
    scene.game.canvas.addEventListener('mousedown', this.preventSideNavigation, true);
    scene.game.canvas.addEventListener('mouseup', this.preventSideNavigation, true);
    scene.game.canvas.addEventListener('auxclick', this.preventSideNavigation, true);
    scene.input.on('pointerup', this.pointerUp, this);
    scene.input.on('wheel', this.wheel, this);
    scene.events.on('update', this.update, this);
  }
  private enabled(): boolean {
    return this.scene.game.scene.getScenes(true).slice(-1)[0] === this.scene && this.host.enabled();
  }
  private keyDown = (event: KeyboardEvent): void => {
    if (!this.enabled() || event.altKey || event.metaKey || (event.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName))) return;
    const skip = NOVEL_CONTROLS.skip.keys.includes(event.code);
    const action = actions.find(action => NOVEL_CONTROLS[action].keys.includes(event.code));
    if (!skip && !action) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (skip) this.held.add(event.code);
    else if (!event.repeat && action) this.host.action(action);
  };
  private keyUp = (event: KeyboardEvent): void => { this.held.delete(event.code); };
  private reset = (): void => { this.held.clear(); this.nextSkip = 0; };
  private preventMenu = (event: Event): void => { if (this.enabled()) event.preventDefault(); };
  private preventSideNavigation = (event: MouseEvent): void => {
    if (this.enabled() && event.button >= 3 && actions.some(action => NOVEL_CONTROLS[action].buttons.includes(event.button))) event.preventDefault();
  };
  private pointerUp(pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]): void {
    if (pointerActionHandled(pointer) || !this.enabled() || !over.some(object => this.host.owns(object))) return;
    const action = actions.find(action => NOVEL_CONTROLS[action].buttons.includes(pointer.button));
    if (action) this.host.action(action);
  }
  private wheel(_pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[], _dx: number, dy: number): void {
    if (!this.enabled() || !dy || !over.some(object => this.host.owns(object))) return;
    if (this.host.scrollLog(dy)) return;
    const action = actions.find(action => NOVEL_CONTROLS[action].wheel === (dy > 0 ? 'down' : 'up'));
    if (action) this.host.action(action);
  }
  private update(): void {
    if (!this.enabled()) { this.reset(); return; }
    if (!this.held.size) return;
    const now = this.scene.game.loop.now;
    if (now < this.nextSkip) return;
    this.nextSkip = now + Math.max(16, NOVEL_CONTROLS.skip.intervalMs);
    this.host.skip();
  }
  destroy(): void {
    this.reset();
    window.removeEventListener('keydown', this.keyDown, true);
    window.removeEventListener('keyup', this.keyUp, true);
    window.removeEventListener('blur', this.reset);
    document.removeEventListener('visibilitychange', this.reset);
    this.scene.game.canvas.removeEventListener('contextmenu', this.preventMenu);
    this.scene.game.canvas.removeEventListener('mousedown', this.preventSideNavigation, true);
    this.scene.game.canvas.removeEventListener('mouseup', this.preventSideNavigation, true);
    this.scene.game.canvas.removeEventListener('auxclick', this.preventSideNavigation, true);
    this.scene.input.off('pointerup', this.pointerUp, this);
    this.scene.input.off('wheel', this.wheel, this);
    this.scene.events.off('update', this.update, this);
  }
}
