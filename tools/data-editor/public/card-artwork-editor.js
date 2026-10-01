import { literal } from './sprite-values.js';
import { artworkKeys, validateArtworkValues } from './card-artwork-edit.js';
import { drawCardFrame, drawCardArtwork } from '/shared/cardArtworkCanvas.js';
import { cardArtworkPlacement } from '/shared/cardArtworkGeometry.js';

const el = (tag, text) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; return node; };
const css = n => '#' + n.toString(16).padStart(6, '0');
export function createCardArtworkEditor({ cardId, node, catalog, api, save, refresh, report }) {
  const panel = el('div'); panel.className = 'preview card-artwork-editor';
  panel.append(el('h3', 'カード画像の配置'));
  const hint = el('p', '数値入力または画像のドラッグで調整できます。空欄は自動値。プレビュー値を下書きへ反映してから「本体へ適用・ビルド」で保存します。'); hint.className = 'hint'; panel.append(hint);
  const select = el('select'); select.setAttribute('aria-label', 'カード画像の戦闘区分');
  const choices = new Set(['normal', ...node.entries.map(e => e.key).filter(Boolean), ...(catalog.refs.battles ?? []).map(b => b.key)]);
  for (const id of choices) { const option = el('option', id === 'normal' ? 'normal（通常）' : id); option.value = id; select.append(option); }
  panel.append(select);
  const info = el('p'); info.className = 'hint'; panel.append(info);
  const canvas = el('canvas'); canvas.style.width = '320px'; canvas.style.touchAction = 'none'; canvas.style.cursor = 'grab'; panel.append(canvas);
  const controls = el('div'); controls.className = 'controls'; panel.append(controls);
  const captions = { focusX: '中心に合わせる画像X', focusY: '中心に合わせる画像Y', scale: '倍率', offsetX: '左右位置', offsetY: '上下位置', rotation: '回転（度）', edgeFade: '端のぼかし（px）' };
  const inputs = new Map(), edits = new Map();
  let config, values = {}, image, imageVersion = 0, overlays = true, drag;
  function changed() { edits.set(select.value, { ...values }); draw(); }
  function sync() { for (const [key, input] of inputs) input.value = values[key] ?? ''; }
  for (const key of artworkKeys) {
    const label = el('label', captions[key]), input = el('input'); input.type = 'number'; input.step = key === 'scale' ? '0.01' : '1'; input.placeholder = '自動'; input.setAttribute('aria-label', `card artwork ${key}`);
    if (key === 'scale') input.min = '0.001'; if (key === 'edgeFade') input.min = '0';
    input.oninput = () => { if (input.validity.badInput) return; if (input.value === '') delete values[key]; else values[key] = Number(input.value); changed(); };
    label.append(input); controls.append(label); inputs.set(key, input);
  }
  const showLabel = el('label', '名前・説明欄を重ねる（文字は簡略表示）'), show = el('input'); show.type = 'checkbox'; show.checked = true;
  show.onchange = () => { overlays = show.checked; draw(); }; showLabel.prepend(show); panel.append(showLabel);
  const actions = el('div'); actions.className = 'controls';
  const apply = el('button', 'プレビュー値を下書きへ反映'); apply.className = 'primary'; apply.title = '変更した戦闘区分の配置だけを下書きへ保存します。本体ソースはまだ変更しません。';
  apply.onclick = () => { try { for (const input of inputs.values()) if (input.validity.badInput) throw Error('数値欄を確認してください。'); for (const v of edits.values()) validateArtworkValues(v); save(edits); } catch (error) { report(error); } };
  const reload = el('button', 'プレビューを再読込'); reload.title = 'フォームで変更した値を読み直します。未反映のプレビュー調整は破棄します。'; reload.onclick = refresh;
  actions.append(apply, reload); panel.append(actions);
  function choose() {
    const initial = literal(node.entries.find(e => e.key === select.value)?.node) ?? {};
    values = { ...(edits.get(select.value) ?? initial) }; sync(); image = undefined;
    const file = `${cardId}_${select.value}.png`, version = ++imageVersion;
    if (!(catalog.imageFiles ?? []).includes('card/' + file)) {
      info.textContent = `画像未配置: image/card/${file}。この配置は準備できます。実ゲームはnormal画像があればそちらに戻り、なければ背景のみです。`; draw(); return;
    }
    info.textContent = `読込中: ${file}`;
    const next = new Image();
    next.onload = () => { if (version !== imageVersion) return; image = next; info.textContent = `${file} · ${next.naturalWidth} × ${next.naturalHeight}px · ドラッグは左右・上下位置を変更`; draw(); };
    next.onerror = () => { if (version === imageVersion) info.textContent = `読み込めませんでした: ${file}`; };
    next.src = '/asset?name=' + encodeURIComponent('card/' + file); draw();
  }
  function draw() {
    if (!config) return;
    const { width: w, height: h, frame, finish, accent } = config;
    canvas.width = w * 3; canvas.height = h * 3;
    const ctx = canvas.getContext('2d'); ctx.scale(3, 3);
    drawCardFrame(ctx, w, h, frame, finish);
    if (image) {
      try {
        validateArtworkValues(values);
        const artCanvas = document.createElement('canvas'); artCanvas.width = canvas.width; artCanvas.height = canvas.height;
        const artCtx = artCanvas.getContext('2d'); artCtx.scale(3, 3);
        const inset = frame.rimWidth + frame.decorationWidth / 2;
        const pose = cardArtworkPlacement(values, image.naturalWidth, image.naturalHeight, w - inset * 2, h - inset * 2);
        drawCardArtwork(artCtx, image, w, h, frame, values, pose);
        ctx.drawImage(artCanvas, 0, 0, w, h);
      } catch { /* Invalid input stays editable and is rejected on save. */ }
    }
    ctx.strokeStyle = css(accent); ctx.lineWidth = frame.decorationWidth;
    ctx.beginPath(); ctx.roundRect(frame.rimWidth, frame.rimWidth, w - frame.rimWidth * 2, h - frame.rimWidth * 2, frame.cornerRadius); ctx.stroke();
    if (overlays) {
      ctx.translate(w / 2, h / 2);
      const title = config.title; ctx.fillStyle = css(accent); ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.roundRect(title.x, title.y, title.width, title.height, title.radius); ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = '#f1e8d7'; ctx.beginPath(); ctx.roundRect(-71, config.bodyY - config.bodyHeight / 2, 142, config.bodyHeight, 5); ctx.fill();
      ctx.fillStyle = '#141c29'; ctx.beginPath(); ctx.arc(-64, -101, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 16px sans-serif'; ctx.fillStyle = '#fff5df'; ctx.fillText(String(config.cost), -64, -101);
      ctx.fillStyle = '#202938'; ctx.font = 'bold 13px sans-serif'; ctx.fillText(config.name, 5, -94, 114);
      ctx.font = '12px sans-serif'; ctx.fillText('効果説明', 0, config.bodyY);
    }
  }
  canvas.onpointerdown = e => { if (e.button !== 0 || !image || !config) return; canvas.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY, ox: values.offsetX ?? 0, oy: values.offsetY ?? 0 }; e.preventDefault(); };
  canvas.onpointermove = e => { if (!drag) return; const rect = canvas.getBoundingClientRect(); values.offsetX = Math.round((drag.ox + (e.clientX - drag.x) * config.width / rect.width) * 10) / 10; values.offsetY = Math.round((drag.oy + (e.clientY - drag.y) * config.height / rect.height) * 10) / 10; sync(); changed(); };
  canvas.onpointerup = canvas.onpointercancel = canvas.onlostpointercapture = () => { drag = undefined; };
  select.onchange = choose;
  api('card-artwork-preview?entry=' + encodeURIComponent(cardId)).then(result => { config = result; choose(); }).catch(report);
  return panel;
}
