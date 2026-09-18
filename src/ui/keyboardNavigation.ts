import Phaser from 'phaser';

export type Direction = 'left' | 'right' | 'up' | 'down';
export type NavigationItem = {
  object: Phaser.GameObjects.GameObject;
  group: string;
  enabled?: () => boolean;
  keyboardFocus?: () => void;
  activate?: () => void;
  reveal?: () => void;
  clip?: Phaser.Geom.Rectangle;
};
type Options = {
  filter?: (item: NavigationItem) => boolean;
  scope?: () => Phaser.GameObjects.Container | undefined;
  move?: (direction: Direction, current: NavigationItem | undefined, items: NavigationItem[]) => NavigationItem | undefined;
  escape?: () => void;
};
const instances = new WeakMap<Phaser.Scene, KeyboardNavigation>();
const directions: Record<string, Direction> = { ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down' };

/** Shared selection for pointer hover and keyboard, with modal input isolation. */
export class KeyboardNavigation {
  private items: NavigationItem[] = [];
  private selected?: NavigationItem;
  private scope?: Phaser.GameObjects.Container;
  private sending = false;
  private keyboardMode = false;
  private scopeMoves = new WeakMap<Phaser.GameObjects.Container, NonNullable<Options['move']>>();
  private outline: Phaser.GameObjects.Graphics;
  private options: Options = {};

  static for(scene: Phaser.Scene): KeyboardNavigation {
    let nav = instances.get(scene);
    if (!nav) { nav = new KeyboardNavigation(scene); instances.set(scene, nav); }
    return nav;
  }
  configure(options: Options): void { this.options = options; }
  setScopeMove(scope: Phaser.GameObjects.Container, move: NonNullable<Options['move']>): void { this.scopeMoves.set(scope, move); }
  isSelected(object: Phaser.GameObjects.GameObject): boolean { return this.selected?.object === object; }
  isKeyboardSelected(object: Phaser.GameObjects.GameObject): boolean { return this.keyboardMode && this.isSelected(object); }
  get current(): NavigationItem | undefined { return this.selected; }

  private constructor(private scene: Phaser.Scene) {
    this.outline = scene.add.graphics().setDepth(9900).setName('keyboard-selection');
    scene.input.keyboard?.on('keydown', this.key, this);
    scene.input.on('pointermove', this.usePointer, this);
    scene.input.on('pointerdown', this.usePointer, this);
    scene.input.on('wheel', this.usePointer, this);
    scene.events.on('postupdate', this.update, this);
    scene.events.once('shutdown', () => {
      scene.input.keyboard?.off('keydown', this.key, this);
      scene.input.off('pointermove', this.usePointer, this);
      scene.input.off('pointerdown', this.usePointer, this);
      scene.input.off('wheel', this.usePointer, this);
      scene.events.off('postupdate', this.update, this);
      this.items = []; this.selected = undefined;
      instances.delete(scene);
    });
  }
  register(object: Phaser.GameObjects.GameObject, options: Omit<NavigationItem, 'object'> = { group: 'buttons' }): NavigationItem {
    const item = { object, ...options };
    this.items.push(item);
    object.on('pointerover', () => { if (!this.sending && this.available(item)) this.select(item, true); });
    object.once('destroy', () => {
      this.items = this.items.filter(i => i !== item);
      if (this.selected === item) { this.selected = undefined; this.outline.clear(); }
    });
    return item;
  }
  private within(object: Phaser.GameObjects.GameObject, parent: Phaser.GameObjects.Container): boolean {
    for (let node: Phaser.GameObjects.GameObject | null = object; node; node = node.parentContainer) if (node === parent) return true;
    return false;
  }
  private available(item: NavigationItem): boolean {
    if (this.options.filter?.(item) === false) return false;
    const object = item.object;
    if (!object.active || item.enabled?.() === false) return false;
    // Off-screen scroll entries can become visible through reveal().
    if (!item.reveal && !object.input?.enabled) return false;
    for (let node: Phaser.GameObjects.GameObject | null = object; node; node = node.parentContainer) {
      if ('visible' in node && !node.visible && !(item.reveal && node !== this.scope)) return false;
    }
    const scope = this.options.scope?.();
    return !scope || this.within(object, scope);
  }
  private topScene(): boolean { return this.scene.game.scene.getScenes(true).slice(-1)[0] === this.scene; }
  select(item?: NavigationItem, pointer = false): void {
    this.update();
    if (!item || !this.available(item)) return;
    this.keyboardMode = !pointer;
    if (this.selected === item) {
      if (!pointer) this.focusFromKeyboard(item);
      return;
    }
    const old = this.selected;
    this.selected = item;
    this.sending = true;
    if (old?.object.active) {
      old.object.emit('keyboardblur');
      old.object.emit('pointerout', this.scene.input.activePointer);
    }
    item.reveal?.();
    if (!pointer) this.focusFromKeyboard(item);
    this.sending = false;
    this.update();
  }
  private focusFromKeyboard(item: NavigationItem): void {
    const sending = this.sending;
    this.sending = true;
    try {
      // Re-enter hover even when returning to a remembered selection after mouseout.
      item.object.emit('pointerover', this.scene.input.activePointer);
      item.object.emit('keyboardfocus');
      item.keyboardFocus?.();
    } finally {
      this.sending = sending;
    }
  }
  private clear(): void {
    const old = this.selected; this.selected = undefined;
    if (old?.object.active) {
      old.object.emit('keyboardblur');
      old.object.emit('pointerout', this.scene.input.activePointer);
    }
    this.outline.clear();
  }
  private usePointer(): void {
    const wasKeyboard = this.keyboardMode;
    this.keyboardMode = false;
    this.outline.clear();
    const object = this.selected?.object;
    if (wasKeyboard && object?.active && !this.scene.input.hitTestPointer(this.scene.input.activePointer).includes(object)) {
      // A keyboard-picked card may never have received a real pointerover/out pair.
      // Release its visual hover while retaining the navigation position.
      object.emit('keyboardblur');
      object.emit('pointerout', this.scene.input.activePointer);
    }
  }
  private key(event: KeyboardEvent): void {
    if (!this.topScene() || event.altKey || event.metaKey || (event.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName))) return;
    const value = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    const direction = directions[value], confirm = value === 'Enter' || value === 'z';
    if (!direction && !confirm && value !== 'Escape') return;
    event.preventDefault();
    // Holding confirm must not repeatedly spend cards or confirm a new dialog.
    if (event.repeat && (confirm || value === 'Escape')) return;
    this.update();
    if (value === 'Escape') { this.options.escape?.(); return; }
    const items = this.items.filter(item => this.available(item));
    if (!items.length) return;
    if (confirm) {
      if (!this.selected || !items.includes(this.selected)) return;
      const item = this.selected;
      if (item.activate) item.activate();
      else item.object.emit('pointerup', this.scene.input.activePointer);
    } else if (direction) {
      let next: NavigationItem | undefined;
      const move = this.scope ? this.scopeMoves.get(this.scope) : this.options.move;
      if (move) next = move(direction, this.selected, items);
      else {
        const index = this.selected ? items.indexOf(this.selected) : -1;
        next = items[index < 0 ? 0 : (index + (direction === 'left' || direction === 'up' ? -1 : 1) + items.length) % items.length];
      }
      this.select(next);
    }
  }
  private update(): void {
    const scope = this.options.scope?.();
    if (scope !== this.scope) { this.clear(); this.scope = scope; }
    if (this.selected && !this.available(this.selected)) this.clear();
    this.outline.clear();
    if (!this.keyboardMode || !this.topScene() || !this.selected) return;
    const object = this.selected.object as Phaser.GameObjects.Rectangle;
    if (typeof object.getBounds !== 'function') return;
    for (let node: Phaser.GameObjects.GameObject | null = object; node; node = node.parentContainer) {
      if ('visible' in node && !node.visible) return;
    }
    const b = object.getBounds();
    if (this.selected.clip) Phaser.Geom.Rectangle.Intersection(b, this.selected.clip, b);
    if (b.width <= 0 || b.height <= 0) return;
    this.outline.lineStyle(3, 0xffe2a3, 1).strokeRoundedRect(b.x - 4, b.y - 4, b.width + 8, b.height + 8, 7);
  }
}
