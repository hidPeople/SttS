import Phaser from 'phaser';
import { characterPortraitAssets, characterPortraitFiles } from '../../src/models/portraitAssets';
import { applyPlayerPortrait } from '../../src/ui/playerPortrait';
import { createPortraitMenuStats } from '../../src/ui/portraitMenuStats';
import type { StatLayout } from '../../src/ui/portraitStatsLayout';
import { PLAYER_VISUAL_SCALE, PLAYER_VISUAL_X, PLAYER_VISUAL_Y } from '../../src/scenes/BattleScene';
import { loadGameFont } from '../../src/ui/fonts';

const column = 390, height = 720;
const modes: StatLayout[] = ['right', 'narrow', 'adaptive'];
const values = { epDamageByPart: { M: 79, B: 1250, C: 14300, V: 820, A: 68 }, orgasmByPart: { M: 3, B: 28, C: 217, V: 14, A: 2 } };
const select = document.querySelector<HTMLSelectElement>('#portrait')!;
const status = document.querySelector<HTMLElement>('#status')!;
for (const file of characterPortraitFiles) {
  const id = file.replace(/\.png$/, '');
  if (characterPortraitAssets[id]) select.add(new Option(id, id));
}
if (characterPortraitAssets.Succubus_normal_idle_1) select.value = 'Succubus_normal_idle_1';
let activeKey: string | undefined, request = 0, ready = 0;
class Column extends Phaser.Scene {
  private stats?: Phaser.GameObjects.Container;
  private body!: Phaser.GameObjects.Sprite;
  private area!: Phaser.GameObjects.Container;
  constructor(readonly mode: StatLayout, readonly index: number) { super({ key: mode, active: true }); }
  create() {
    this.cameras.main.setViewport(this.index * column, 0, column, height).setScroll(0, 0);
    this.add.rectangle(0, 0, column, height, 0x30303a).setOrigin(0);
    this.add.rectangle(column - 2, 55, 2, 610, 0x758195).setOrigin(0);
    this.body = this.add.sprite(0, 0, '__DEFAULT').setVisible(false);
    this.area = this.add.container(PLAYER_VISUAL_X, PLAYER_VISUAL_Y, [this.body]).setScale(PLAYER_VISUAL_SCALE);
    if (++ready === modes.length) void show();
  }
  showPortrait(id: string) {
    this.stats?.destroy();
    applyPlayerPortrait(this.body, id).setVisible(true);
    this.stats = createPortraitMenuStats(this, this.body, this.area, () => id, values,
      { x: 0, y: PLAYER_VISUAL_Y, width: 2 * PLAYER_VISUAL_X, height: height - PLAYER_VISUAL_Y }, true, this.mode);
  }
}
const columns = modes.map((mode, i) => new Column(mode, i));
async function show() {
  if (ready !== columns.length) return;
  const ticket = ++request, id = select.value, asset = characterPortraitAssets[id];
  if (!asset) { status.textContent = '立ち絵がありません'; return; }
  const textures = columns[0].textures;
  status.textContent = '読み込み中…';
  try {
    if (!textures.exists(asset.textureKey)) {
      const image = new Image();
      image.src = asset.source;
      await image.decode();
      if (ticket !== request) return;
      textures.addImage(asset.textureKey, image);
    }
    for (const scene of columns) scene.showPortrait(id);
    if (activeKey && activeKey !== asset.textureKey) textures.remove(activeKey);
    activeKey = asset.textureKey;
    status.textContent = '';
  } catch (error) {
    if (ticket === request) status.textContent = '立ち絵を表示できませんでした';
    console.error(error);
  }
}
select.onchange = show;
for (const [id, delta] of [['prev', -1], ['next', 1]] as const) {
  document.getElementById(id)!.onclick = () => {
    if (!select.length) return;
    select.selectedIndex = (select.selectedIndex + delta + select.length) % select.length;
    void show();
  };
}
void loadGameFont().catch(error => console.warn('ゲーム用フォントを読み込めなかったため代替フォントを使用します。', error)).then(() => {
  new Phaser.Game({ type: Phaser.CANVAS, width: column * modes.length, height, parent: 'stage', scene: columns, audio: { noAudio: true }, banner: false });
});
