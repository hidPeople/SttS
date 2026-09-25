import type Phaser from 'phaser';

type ClickHandler = (pointer: Phaser.Input.Pointer, ...args: any[]) => void;
const handledEvents = new WeakSet<object>();

/** Keyboard activation supplies an explicit primary pointer; physical clicks must be left-button releases. */
export function onPrimaryClick(object: Phaser.GameObjects.GameObject, handler: ClickHandler): void {
  object.on('pointerup', (pointer: Phaser.Input.Pointer, ...args: any[]) => {
    if (pointer.button === 0) handler(pointer, ...args);
  });
}

export function emitPrimaryClick(object: Phaser.GameObjects.GameObject, pointer: Phaser.Input.Pointer): void {
  const activation = Object.create(pointer) as Phaser.Input.Pointer;
  Object.defineProperties(activation, { button: { value: 0 }, event: { value: undefined } });
  object.emit('pointerup', activation);
}

export function pointerActionHandled(pointer: Phaser.Input.Pointer): boolean {
  return Boolean(pointer.event && handledEvents.has(pointer.event));
}

/** Consume a drag/control release before scene-level conversation navigation sees it. */
export function markPointerActionHandled(pointer: Phaser.Input.Pointer): void {
  if (pointer.event) handledEvents.add(pointer.event);
}

/** Scene-level back action, after primary-only object handlers. Return false to delegate to novel controls. */
export function installPointerBack(scene: Phaser.Scene, back: () => boolean): void {
  const top = () => scene.game.scene.getScenes(true).slice(-1)[0] === scene;
  const release = (pointer: Phaser.Input.Pointer) => {
    if (!top() || pointer.button !== 2 || pointerActionHandled(pointer)) return;
    if (back() && pointer.event) handledEvents.add(pointer.event);
  };
  const context = (event: Event) => { if (top()) event.preventDefault(); };
  const side = (event: MouseEvent) => { if (top() && event.button >= 3) event.preventDefault(); };
  scene.input.on('pointerup', release);
  scene.game.canvas.addEventListener('contextmenu', context);
  for (const event of ['mousedown', 'mouseup', 'auxclick']) scene.game.canvas.addEventListener(event, side as EventListener, true);
  scene.events.once('shutdown', () => {
    scene.input.off('pointerup', release);
    scene.game.canvas.removeEventListener('contextmenu', context);
    for (const event of ['mousedown', 'mouseup', 'auxclick']) scene.game.canvas.removeEventListener(event, side as EventListener, true);
  });
}
