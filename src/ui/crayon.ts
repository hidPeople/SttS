import Phaser from 'phaser';

// White wax textures are cached by size; tint changes never regenerate the grain.
export const CRAYON_COLORS = {
  player: 0x244e83,
  enemy: 0x852d42,
  hpIntent: 0x171a24,
  epIntent: 0x552b72,
  button: 0x344860,
  hover: 0x526b86,
};

function crayonTexture(scene: Phaser.Scene, width: number, height: number): string {
  const w = Math.max(8, Math.ceil(width)), h = Math.max(8, Math.ceil(height));
  const key = `crayon-${w}x${h}`;
  if (scene.textures.exists(key)) return key;
  const texture = scene.textures.createCanvas(key, w, h)!;
  const ctx = texture.context;
  let seed = w * 139 + h * 197;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  // A dense, irregular centre keeps letters legible, with dry, uneven ends.
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.beginPath();
  ctx.moveTo(8, 6);
  for (let x = 8; x < w - 7; x += 7) ctx.lineTo(x, 3 + random() * 4);
  ctx.lineTo(w - 5, h - 8);
  for (let x = w - 8; x > 7; x -= 7) ctx.lineTo(x, h - 3 - random() * 4);
  ctx.closePath();
  ctx.fill();
  ctx.lineCap = 'butt';
  for (let y = 5; y < h - 3; y += 2.1) {
    ctx.strokeStyle = `rgba(255,255,255,${0.45 + random() * 0.4})`;
    ctx.lineWidth = 2 + random() * 3;
    ctx.beginPath();
    const inset = random() * 9;
    ctx.moveTo(2 + inset, Math.min(h - 3, y + 2));
    ctx.lineTo(w - 2 - random() * 10, Math.max(2, y - 2));
    ctx.stroke();
  }
  // Small paper-coloured gaps and fine diagonal wax streaks, not a flat rectangle.
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < w * h / 9; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.12 + random() * 0.38})`;
    ctx.fillRect(random() * w, random() * h, 0.5 + random() * 1.8, 0.4 + random());
  }
  for (let i = 0; i < h / 4; i++) {
    const x = random() * w, y = random() * h;
    ctx.strokeStyle = 'rgba(0,0,0,0.13)';
    ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 10 + random() * 28, y - 2); ctx.stroke();
  }
  // Taper the swipe on a slight diagonal instead of leaving horizontal edges.
  const slant = Math.min(7, h * 0.15);
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w, 0); ctx.lineTo(0, slant); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(w, h); ctx.lineTo(0, h); ctx.lineTo(w, h - slant); ctx.closePath(); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  texture.refresh();
  return key;
}

/** Painted surface with the same colour controls used by existing button states. */
export class CrayonPatch extends Phaser.GameObjects.Image {
  private paintColor: number;
  private accentColor = 0;
  private accentAmount = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number, color: number, alpha = 1) {
    super(scene, x, y, crayonTexture(scene, width, height));
    this.paintColor = color;
    scene.add.existing(this);
    this.setName('crayon-patch').setDisplaySize(width, height).setFillStyle(color, alpha);
  }

  setFillStyle(color: number, alpha = 1): this {
    this.paintColor = color;
    this.setAlpha(alpha);
    return this.refreshPaint();
  }

  // Old border highlights become a lighter pigment instead of a geometric outline.
  setStrokeStyle(width: number, color = 0xffffff, alpha = 1): this {
    this.accentColor = color;
    this.accentAmount = Math.min(0.22, width * 0.04) * alpha;
    return this.refreshPaint();
  }

  private refreshPaint(): this {
    const mix = (shift: number) => Math.round(((this.paintColor >> shift) & 255) * (1 - this.accentAmount) + ((this.accentColor >> shift) & 255) * this.accentAmount);
    return this.setTint((mix(16) << 16) | (mix(8) << 8) | mix(0));
  }

  fit(width: number, height: number): this {
    const key = crayonTexture(this.scene, width, height);
    if (this.texture.key !== key) this.setTexture(key);
    return this.setDisplaySize(width, height);
  }
}

/** Root HUD labels keep their original coordinates, bounds, hit areas and lifetime. */
export function paintBehindLabel(text: Phaser.GameObjects.Text, color: number, paddingX = 10, paddingY = 4): CrayonPatch {
  const scene = text.scene;
  const patch = new CrayonPatch(scene, text.x, text.y, 8, 8, color);
  scene.children.moveBelow(patch, text);
  text.setStroke('#141a25', 2).setResolution(2);
  const sync = () => {
    const width = Math.max(8, text.width + paddingX * 2), height = Math.max(8, text.height + paddingY * 2);
    if (patch.displayWidth !== width || patch.displayHeight !== height) patch.fit(width, height);
    patch.setPosition(text.x + (0.5 - text.originX) * text.width, text.y + (0.5 - text.originY) * text.height);
    if (patch.depth !== text.depth) patch.setDepth(text.depth);
    patch.setVisible(text.visible && Boolean(text.text)).setAlpha(text.alpha);
  };
  sync();
  scene.events.on(Phaser.Scenes.Events.POST_UPDATE, sync);
  text.once(Phaser.GameObjects.Events.DESTROY, () => {
    scene.events.off(Phaser.Scenes.Events.POST_UPDATE, sync);
    patch.destroy();
  });
  return patch;
}
