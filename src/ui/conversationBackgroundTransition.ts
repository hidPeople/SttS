import Phaser from 'phaser';
import { SCREEN_WIDTH as W, SCREEN_HEIGHT as H } from './layout';
import { CONVERSATION_TRANSITIONS as STYLE, type ConversationBackgroundTransition } from '../data/conversationTransitions';
import { backgroundRevealRadius, backgroundTransitionFrame, backgroundTransitionSettings } from '../models/conversationTransition';

let maskSequence = 0;
/** Only background layers are touched; text/portraits/dimming retain their own ordering. */
export function transitionConversationBackground(
  scene: Phaser.Scene, root: Phaser.GameObjects.Container,
  previous: Phaser.GameObjects.Image, next: Phaser.GameObjects.Image,
  config: ConversationBackgroundTransition, complete: () => void,
): { cancel: () => void } {
  const options = backgroundTransitionSettings(config);
  const state = { progress: 0 };
  let tween: Phaser.Tweens.Tween | undefined;
  let overlay: Phaser.GameObjects.Graphics | undefined;
  let maskImage: Phaser.GameObjects.Image | undefined;
  let mask: Phaser.Display.Masks.BitmapMask | undefined;
  let maskKey: string | undefined;
  let finished = false;
  const isRadial = options.type === 'radial';
  const isPage = options.type === 'pageTurn';
  // next was inserted below previous. Radial reveal needs it directly above previous.
  if (isRadial) root.moveTo(next, root.getIndex(previous));
  if (isRadial && scene.sys.game.renderer.type === Phaser.WEBGL) {
    const size = Math.max(32, Math.floor(STYLE.maskResolution));
    maskKey = 'conversation-reveal-' + maskSequence++;
    const texture = scene.textures.createCanvas(maskKey, size, size)!;
    const context = texture.context, center = size / 2;
    const gradient = context.createRadialGradient(center, center, 0, center, center, center);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(1 - options.feather, 'rgba(255,255,255,1)');
    gradient.addColorStop(1, options.feather ? 'rgba(255,255,255,0)' : 'rgba(255,255,255,1)');
    context.fillStyle = gradient;
    context.beginPath(); context.arc(center, center, center, 0, Math.PI * 2); context.fill();
    texture.refresh();
    maskImage = scene.make.image({ x: W * options.originX, y: H * options.originY, key: maskKey, add: false });
    mask = new Phaser.Display.Masks.BitmapMask(scene, maskImage);
    next.setMask(mask);
  } else if (!isRadial) {
    overlay = scene.add.graphics();
    root.addAt(overlay, Math.max(root.getIndex(previous), root.getIndex(next)) + 1);
  }
  if (isPage) previous.setOrigin(0, 0.5).setX(0);
  const radius = backgroundRevealRadius(W, H, options.originX, options.originY, options.feather);
  const draw = () => {
    const p = state.progress;
    if (isRadial) {
      if (maskImage) maskImage.setDisplaySize(Math.max(0.001, radius * 2 * p), Math.max(0.001, radius * 2 * p));
      else next.setAlpha(p); // Canvas renderer fallback: smooth crossfade.
    } else if (isPage) {
      const edge = W * Math.cos(p * Math.PI / 2);
      previous.setDisplaySize(Math.max(0.001, edge), H);
      overlay!.clear().fillStyle(0x000000, Math.sin(p * Math.PI) * STYLE.pageFoldAlpha)
        .fillRect(Math.max(0, edge - STYLE.pageFoldWidth), 0, Math.min(edge, STYLE.pageFoldWidth), H);
    } else {
      const frame = backgroundTransitionFrame(options.type, p);
      previous.setVisible(!frame.swapped);
      overlay!.clear().fillStyle(options.type === 'flash' ? 0xffffff : 0x000000, options.type === 'blink' ? 1 : frame.alpha);
      if (options.type === 'blink') {
        const height = H * frame.alpha / 2;
        overlay!.fillRect(0, 0, W, height).fillRect(0, H - height, W, height);
      } else overlay!.fillRect(0, 0, W, H);
    }
  };
  const cleanup = () => {
    if (finished) return;
    finished = true;
    tween?.remove();
    next.clearMask(); mask?.destroy(); maskImage?.destroy();
    if (maskKey) scene.textures.remove(maskKey);
    overlay?.destroy(); previous.destroy(); next.setAlpha(1).setVisible(true);
  };
  draw();
  tween = scene.tweens.add({ targets: state, progress: 1, duration: Math.max(1, options.duration), ease: 'Linear', onUpdate: draw, onComplete: () => { cleanup(); complete(); } });
  return { cancel: cleanup };
}
