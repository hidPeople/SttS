/** Bundled font is loaded before Phaser measures or rasterizes any UI text. */
export const GAME_FONT = '"KeiJi", Arial, "Yu Gothic", sans-serif';

export async function loadGameFont(): Promise<void> {
  const source = new URL('../../font/Kei_Ji-P.ttf', import.meta.url).href;
  const face = new FontFace('KeiJi', `url("${source}")`);
  await face.load();
  document.fonts.add(face);
  document.documentElement.style.setProperty('--game-font', GAME_FONT);
}
