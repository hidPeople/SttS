import Phaser from 'phaser';
import type { CardTerm } from '../models/cardDescription';
import type { HoverTooltip } from './hoverTooltip';

/** Text hit testing without making the text steal card clicks or hover events. */
export function bindCardTermHover(scene: Phaser.Scene, description: Phaser.GameObjects.Container, hover: HoverTooltip, options: {
  enabled: () => boolean;
  describe: (term: CardTerm) => string;
  visible: () => boolean;
  show: (text: string, bounds: Phaser.Geom.Rectangle) => void;
}): void {
  let active: Phaser.GameObjects.Text | undefined;
  let lastText = '', lastX = 0, lastY = 0;
  const clear = () => {
    if (active) hover.cancelSource(active);
    active = undefined;
  };
  const findTerm = () => {
    if (!scene.input.manager.isOver || !options.enabled()) return undefined;
    const pointer = scene.input.activePointer;
    for (const line of description.list as Phaser.GameObjects.Container[]) {
      const text = line.list.find((object) => object instanceof Phaser.GameObjects.Text
        && object.getData('cardTerm') && object.getBounds().contains(pointer.x, pointer.y));
      if (text) return text as Phaser.GameObjects.Text;
    }
    return undefined;
  };
  const update = () => {
    const text = findTerm();
    if (!text) { clear(); return; }
    const content = options.describe(text.getData('cardTerm'));
    const bounds = text.getBounds();
    if (active === text && content === lastText && bounds.centerX === lastX && bounds.top === lastY && options.visible()) return;
    active = text;
    lastText = content; lastX = bounds.centerX; lastY = bounds.top;
    hover.request(text, () => {
      // Scrolling can hide a term before the scene's next UPDATE callback.
      if (findTerm() !== text) { hover.cancelSource(text); return; }
      options.show(content, text.getBounds());
    });
  };
  scene.events.on(Phaser.Scenes.Events.UPDATE, update);
  description.once(Phaser.GameObjects.Events.DESTROY, () => {
    scene.events.off(Phaser.Scenes.Events.UPDATE, update);
    clear();
  });
}
