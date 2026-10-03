import type Phaser from 'phaser';
import { ICON_APPEARANCE } from '../data/ui';
import { STATUS_DESCRIPTIONS } from '../data/statuses';
import { RELIC_DEFINITIONS } from '../data/relics';
import { iconFallbackText, iconTextureKey, resolveIconFile, statusIconCount, type IconDefinition, type IconKind } from '../models/iconImage';
import { GAME_FONT } from './fonts';
import { iconHaloTexture } from './iconHalo';

// Build-time URL metadata only. Decode just the icons requested by visible UI.
const sources = {
  Status: import.meta.glob('../../image/icon/Status/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>,
  Relic: import.meta.glob('../../image/icon/Relic/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>,
};
function imageFiles(kind: IconKind): ReadonlySet<string> {
  return new Set(Object.keys(sources[kind]).map(path => path.slice(path.lastIndexOf('/') + 1)));
}
const files = { Status: imageFiles('Status'), Relic: imageFiles('Relic') };
const registries: Record<IconKind, Record<string, IconDefinition>> = {
  Status: STATUS_DESCRIPTIONS,
  // Filenames/references use the actual relic id, not its source property name.
  Relic: Object.fromEntries(Object.values(RELIC_DEFINITIONS).map(relic => [relic.id, relic])),
};
const requests = new WeakMap<Phaser.Textures.TextureManager, Map<string, Promise<boolean>>>();
const relicGlowStates = new WeakMap<Phaser.GameObjects.Container, { progress: number; halo?: Phaser.GameObjects.Image }>();

/** Drive the halo from the shared activation timeline (including Ctrl speed). */
export function setRelicIconGlowPulse(group: Phaser.GameObjects.Container, progress: number): void {
  const state = relicGlowStates.get(group);
  if (!state) return;
  state.progress = Math.max(0, Math.min(1, progress));
  const config = ICON_APPEARANCE.relicGlow;
  const strength = config.idleStrength + (config.activeStrength - config.idleStrength) * state.progress;
  state.halo?.setAlpha(strength / Math.max(config.idleStrength, config.activeStrength, Number.EPSILON));
}

function addRelicGlow(scene: Phaser.Scene, group: Phaser.GameObjects.Container, image: Phaser.GameObjects.Image): void {
  const state = relicGlowStates.get(group);
  if (!state) return;
  const key = iconHaloTexture(scene.textures, image);
  if (!key) return;
  const halo = scene.add.image(0, 0, key);
  group.addAt(halo, group.getIndex(image));
  state.halo = halo;
  setRelicIconGlowPulse(group, state.progress);
  image.once('destroy', () => { if (state.halo === halo) state.halo = undefined; halo.destroy(); });
}

/** Cache failed loads too, to avoid retrying a broken asset on every HUD refresh. */
export function loadIconTexture(textures: Phaser.Textures.TextureManager, kind: IconKind, file: string, url: string): Promise<boolean> {
  const key = iconTextureKey(kind, file);
  if (textures.exists(key)) return Promise.resolve(true);
  let cache = requests.get(textures);
  if (!cache) { cache = new Map(); requests.set(textures, cache); }
  let request = cache.get(key);
  if (!request) {
    request = new Promise<boolean>(resolve => {
      const image = new Image();
      image.onerror = () => resolve(false);
      image.onload = () => {
        if (!textures.game || !image.naturalWidth || !image.naturalHeight) { resolve(false); return; }
        try { resolve(textures.exists(key) || !!textures.addImage(key, image)); }
        catch { resolve(false); }
      };
      image.src = url;
    });
    cache.set(key, request);
  }
  return request;
}

export function addIconImage(
  scene: Phaser.Scene, group: Phaser.GameObjects.Container, kind: IconKind, id: string, size: number,
  fallback: Phaser.GameObjects.Rectangle, onResolved: (imageShown: boolean) => void,
): void {
  const file = resolveIconFile(id, files[kind], registries[kind]);
  // The build-time file inventory is complete: an absent file needs no load wait.
  if (!file) { onResolved(false); return; }
  const key = iconTextureKey(kind, file);
  const apply = () => {
    if (!group.active || !fallback.active) return;
    const image = scene.add.image(0, 0, key);
    image.setScale(size / Math.max(image.width, image.height));
    group.addAt(image, 1);
    if (kind === 'Relic') addRelicGlow(scene, group, image);
    // Preserve the rectangle as the tooltip/keyboard hit target.
    fallback.setFillStyle(0, 0).setStrokeStyle(0);
    onResolved(true);
  };
  const failed = () => { if (group.active && fallback.active) onResolved(false); };
  if (scene.textures.exists(key)) apply();
  else void loadIconTexture(scene.textures, kind, file, sources[kind][`../../image/icon/${kind}/${file}`])
    .then(loaded => { if (loaded) apply(); else failed(); }, failed);
}

/** Same drawing and loading path for status HUD, relic HUD and reward choices. */
export function createDataIcon(
  scene: Phaser.Scene, kind: IconKind, id: string, definition: IconDefinition, size: number,
  options: { stacks?: number; counter?: number; fontSize?: number; interactive?: boolean } = {},
) {
  const style = ICON_APPEARANCE[kind];
  const stacks = options.stacks ?? 1;
  let display: 'pending' | 'image' | 'fallback' = 'pending';
  const getLabelText = () => display === 'fallback' ? iconFallbackText(kind, id, definition) : '';
  const icon = scene.add.rectangle(0, 0, size, size, definition.iconColor ?? style.fallbackColor, 1);
  icon.setStrokeStyle(ICON_APPEARANCE.borderWidth, style.borderColor, style.borderAlpha);
  if (options.interactive !== false) icon.setInteractive({ useHandCursor: true });
  const label = scene.add.text(0, 0, getLabelText(), {
    fontFamily: GAME_FONT, fontSize: options.fontSize ?? (stacks > ICON_APPEARANCE.compactCountThreshold ? style.compactFontSize : style.fontSize),
    fontStyle: 'bold', color: ICON_APPEARANCE.textColor,
  }).setOrigin(0.5);
  // Hide the complete icon, including counters, until the image outcome is known.
  const group = scene.add.container(0, 0, [icon, label]).setVisible(false);
  if (kind === 'Relic') relicGlowStates.set(group, { progress: 0 });
  if (kind === 'Status') {
    const c = ICON_APPEARANCE.statusCounter;
    const statusDefinition = STATUS_DESCRIPTIONS[id as keyof typeof STATUS_DESCRIPTIONS];
    const text = statusDefinition ? statusIconCount(statusDefinition, stacks) : '';
    const counter = scene.add.text(size / 2 + c.offsetX, -size / 2 + c.offsetY, text, {
      fontFamily: GAME_FONT, fontSize: c.fontSize, fontStyle: 'bold', color: ICON_APPEARANCE.textColor,
    }).setOrigin(1, 0.5).setStroke(ICON_APPEARANCE.imageCountStrokeColor, ICON_APPEARANCE.imageCountStrokeWidth);
    group.add(counter);
  }
  if (kind === 'Relic' && typeof options.counter === 'number') {
    const c = ICON_APPEARANCE.relicCounter;
    const counter = scene.add.text(c.offsetX, c.offsetY, String(options.counter), {
      fontFamily: GAME_FONT, fontSize: c.fontSize, fontStyle: 'bold', color: c.textColor, backgroundColor: c.backgroundColor,
    }).setOrigin(0.5);
    group.add(counter);
  }
  addIconImage(scene, group, kind, id, size, icon, imageShown => {
    display = imageShown ? 'image' : 'fallback';
    label.setText(getLabelText());
    group.setVisible(true);
  });
  return { group, icon, label, getLabelText };
}
