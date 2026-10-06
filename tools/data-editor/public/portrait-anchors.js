import { objectSource, sourceValue } from './source-format.js';
import { portraitValues } from './sprite-values.js';

export const portraitPlacementKeys = ['displayHeight', 'offsetX', 'offsetY', 'epPoints', 'sigilPoint'];
export const snapshotPlacement = values => structuredClone(Object.fromEntries(portraitPlacementKeys.map(key => [key, values[key]])));
export const snapshotPortraitAnchors = values => structuredClone({epPoints: values.epPoints, sigilPoint: values.sigilPoint});
// Tool-local clipboard survives item navigation, but never writes to the OS clipboard or game.
let anchorClipboard;
export function copyPortraitAnchors(values, id) {
  anchorClipboard = {id, values: snapshotPortraitAnchors(values)};
  return pastedPortraitAnchors();
}
export function pastedPortraitAnchors() { return anchorClipboard ? structuredClone(anchorClipboard) : undefined; }
export function previousPortraitAnchors(id, model, adjustments = new Map()) {
  const entries = model.declarations.find(d => d.name === 'CHARACTER_PORTRAITS')?.node.entries?.filter(e => e.key) ?? [];
  const index = entries.findIndex(e => e.key === id);
  if (index <= 0) return;
  const previous = entries[index - 1].key;
  const read = (key, seen = new Set()) => {
    if (seen.has(key)) return {};
    seen.add(key);
    const values = portraitValues(key, model);
    return values.portraitReference ? read(values.portraitReference, seen) : {...values, ...adjustments.get(key)};
  };
  return {id: previous, values: snapshotPortraitAnchors(read(previous))};
}
export function validatePortraitPoints(values) {
  for (const [key, point] of [...Object.entries(values.epPoints ?? {}), ['sigilPoint', values.sigilPoint]]) {
    if (point === undefined) continue;
    if (!point || ['x', 'y'].some(axis => !Number.isFinite(point[axis]) || point[axis] < 0 || point[axis] > 1)) throw Error(`${key}: 座標は画像左上0～右下1の範囲で指定してください。`);
  }
}
/** 変更項目だけを置換。省略による紋章の無効化と既存の1行記法・コメントを保持。 */
export function updatePortraitSource(node, before, after) {
  validatePortraitPoints(after);
  const changes = new Set(portraitPlacementKeys.filter(key => JSON.stringify(before[key]) !== JSON.stringify(after[key])));
  if (!changes.size) return node.source;
  const entries = node.entries.flatMap(e => {
    const raw = node.source.slice(e.start - node.start, e.end - node.start);
    if (!changes.has(e.key)) return [{...e, raw}];
    changes.delete(e.key);
    if (after[e.key] === undefined) return [];
    const at = e.node.start - e.start;
    return [{...e, raw: raw.slice(0, at) + sourceValue(after[e.key]) + raw.slice(at + e.node.source.length)}];
  });
  for (const key of changes) if (after[key] !== undefined) entries.push({raw: ` ${key}: ${sourceValue(after[key])}`});
  return objectSource(node, entries);
}

export function pointInImage(clientX, clientY, bounds, canvas, rect) {
  const x = (clientX - bounds.left) * canvas.width / bounds.width;
  const y = (clientY - bounds.top) * canvas.height / bounds.height;
  if (!rect || x < rect.x || y < rect.y || x > rect.x + rect.width || y > rect.y + rect.height) return;
  return {x: Math.round((x - rect.x) / rect.width * 10000) / 10000, y: Math.round((y - rect.y) / rect.height * 10000) / 10000};
}

/** 表示専用のズーム。保存するdisplayHeightや部位座標とは独立。 */
export function portraitDetailRect(image, canvas, view) {
  const scale = Math.min((canvas.width - 24) / image.width, (canvas.height - 24) / image.height) * view.zoom;
  const width = image.width * scale, height = image.height * scale;
  return {x: (canvas.width - width) / 2 + view.x, y: (canvas.height - height) / 2 + view.y, width, height};
}
export function zoomPortraitDetail(image, canvas, view, pointer, delta) {
  const before = portraitDetailRect(image, canvas, view);
  const zoom = Math.max(.5, Math.min(8, view.zoom * Math.exp(-Math.max(-300, Math.min(300, delta)) * .002)));
  const ratio = zoom / view.zoom;
  return {zoom, x: pointer.x + (before.x - pointer.x) * ratio - (canvas.width - before.width * ratio) / 2,
    y: pointer.y + (before.y - pointer.y) * ratio - (canvas.height - before.height * ratio) / 2};
}

/** 個別座標は画像、未設定部位だけは画面上の固定領域へ変換する。 */
export function portraitAnchorPositions(values, defaults, imageRect, screenRect) {
  const positions = {};
  for (const key of new Set([...Object.keys(defaults ?? {}), ...Object.keys(values.epPoints ?? {})])) {
    const explicit = values.epPoints?.[key];
    const rect = explicit ? imageRect : screenRect;
    const point = explicit ?? defaults?.[key];
    if (rect && point) positions[key] = {x: rect.x + point.x * rect.width, y: rect.y + point.y * rect.height};
  }
  if (values.sigilPoint) positions.sigil = {x: imageRect.x + values.sigilPoint.x * imageRect.width, y: imageRect.y + values.sigilPoint.y * imageRect.height};
  return positions;
}

/** Hit only explicitly configured markers. Radius is converted from CSS pixels by the caller. */
export function beginPortraitAnchorDrag(values, at, rect, radius = {x:12,y:12}) {
  if (!rect?.width || !rect?.height) return;
  const entries = Object.entries({...values.epPoints, sigil:values.sigilPoint}).filter(([,point])=>point);
  let nearest, distance = 1;
  for (const [,point] of entries) {
    const d = ((rect.x + point.x * rect.width - at.x) / radius.x) ** 2 + ((rect.y + point.y * rect.height - at.y) / radius.y) ** 2;
    if (d <= distance) {nearest=point;distance=d;}
  }
  if (!nearest) return;
  return {at:{...at},rect:{...rect},point:{...nearest},keys:entries.filter(([,p])=>Math.abs(p.x-nearest.x)<1e-8&&Math.abs(p.y-nearest.y)<1e-8).map(([key])=>key)};
}
export function movePortraitAnchors(values, drag, at) {
  const point = {};
  for (const axis of ['x','y']) point[axis] = Math.round(Math.max(0, Math.min(1, drag.point[axis] + (at[axis]-drag.at[axis])/drag.rect[axis==='x'?'width':'height']))*10000)/10000;
  for (const key of drag.keys) {
    if (key==='sigil') values.sigilPoint={...point};
    else {values.epPoints={...values.epPoints,[key]:{...point}};}
  }
}

export function createPortraitAnchorEditor(values, defaults, changed, readOnly = false, transfer = {}) {
  const panel = document.createElement('fieldset');panel.className = 'portrait-anchor-controls';
  const title = document.createElement('legend');title.textContent = 'EP演出・紋章の位置';panel.append(title);
  const modeButton = document.createElement('button');modeButton.type='button';modeButton.textContent='部位指定モードへ';modeButton.className='portrait-mode-button';title.append(modeButton);
  const toolbar = document.createElement('div');toolbar.className='portrait-anchor-transfer';panel.append(toolbar);
  const makeButton = (text, description, action) => {
    const button = document.createElement('button');button.type='button';button.textContent=text;button.title=description;button.onclick=action;toolbar.append(button);return button;
  };
  const transferInfo = document.createElement('small');transferInfo.setAttribute('role','status');
  const apply = source => {
    if (readOnly || !source) return;
    validatePortraitPoints(source.values);
    Object.assign(values, snapshotPortraitAnchors(source.values));changed();sync();
    transferInfo.textContent=source.id+' の部位・紋章位置をプレビューへ反映しました。';
  };
  const previousButton = makeButton('一つ上と同じにする', '検索の絞り込みに関係なく、実装順で一つ上の立ち絵から全EP部位・紋章位置をコピーします。未設定や紋章なしも反映します。', () => apply(transfer.previous?.()));
  const copyButton = makeButton('設定値をコピー', 'プレビュー中の全EP部位・紋章位置をツール内にコピーします。倍率やOffsetは含みません。', () => {
    copyPortraitAnchors(values, transfer.id);sync();transferInfo.textContent=(transfer.id??'この立ち絵')+' の設定値をコピーしました。';
  });
  copyButton.dataset.navigation='true';
  const pasteButton = makeButton('設定値をペースト', 'ツール内にコピーした全EP部位・紋章位置で置き換えます。保存は「プレビュー値を下書きへ反映」で行います。', () => apply(pastedPortraitAnchors()));
  toolbar.append(transferInfo);
  const select = document.createElement('select');select.setAttribute('aria-label', '演出位置の選択');
  for (const [id, text] of [['', '位置指定OFF'], ['M','M'], ['B','B'], ['C','C'], ['V','V'], ['A','A'], ['sigil','紋章'], ['move','移動']]) {
    const option = document.createElement('option');option.value = id;option.textContent = text;option.hidden=id==='move';select.append(option);
  }
  panel.append(select);
  const radios = document.createElement('div');radios.className='portrait-part-radios';radios.hidden=true;
  const radioInputs = [];
  const radioName = 'portrait-part-' + Math.random().toString(36).slice(2);
  for (const [id, text] of [['sigil','紋章'],['M','M'],['B','B'],['C','C'],['V','V'],['A','A'],['move','移動']]) {
    const label = document.createElement('label'), input = document.createElement('input');
    input.type='radio';input.name=radioName;input.value=id;input.onchange=()=>{select.value=id;sync();};
    label.append(input,document.createTextNode(text));radios.append(label);radioInputs.push(input);
  }
  panel.append(radios);
  const label = (text, input) => { const el = document.createElement('label');el.append(input, document.createTextNode(text));panel.append(el); };
  const group = document.createElement('input');group.type = 'checkbox';group.checked = true;label('C/V/Aを同時に設定', group);
  const enabled = document.createElement('input');enabled.type = 'checkbox';label('紋章位置を設定', enabled);
  const inputs = {};
  for (const key of ['x', 'y']) {
    const input = document.createElement('input');input.type='number';input.min=0;input.max=1;input.step=0.001;input.style.width='6em';input.setAttribute('aria-label', `演出位置 ${key}`);
    inputs[key]=input;label(key.toUpperCase()+'（0～1）', input);
    input.onchange = () => { if (!inputs.x.value || !inputs.y.value) return;const point = {x:Number(inputs.x.value), y:Number(inputs.y.value)};if(Object.values(point).every(v=>Number.isFinite(v)&&v>=0&&v<=1)) place(point);else sync(); };
  }
  const reset=document.createElement('button');reset.type='button';reset.textContent='選択部位を既定位置へ';reset.title='選択した部位の個別設定を削除します。紋章の場合は表示を無効にします。';panel.append(reset);
  const hint=document.createElement('p');hint.className='hint';hint.textContent='個別座標は画像左上=(0,0)、右下=(1,1)で、倍率・Offsetに追従します。未設定部位は画面基準の既定位置を使い、ゲーム画面側だけに表示します。画像クリックまたはX/Y両方の入力で個別指定できます。紋章位置なしでは紋章演出を出しません。';panel.append(hint);
  function targets() { return group.checked && ['C','V','A'].includes(select.value) ? ['C','V','A'] : [select.value]; }
  function sync() {
    const previous=transfer.previous?.();
    previousButton.disabled=readOnly||!previous;
    if(previous)previousButton.title='コピー元: '+previous.id+'（実装順で一つ上。編集中のプレビュー値があれば優先します）';
    pasteButton.disabled=readOnly||!anchorClipboard;
    if(anchorClipboard)pasteButton.title='コピー元: '+anchorClipboard.id+'。全EP部位・紋章位置をプレビューへ反映します。';
    for(const input of radioInputs) input.checked=input.value===select.value;
    enabled.checked=Boolean(values.sigilPoint);
    const moving=select.value==='move';
    group.disabled=moving;
    transfer.modeChanged?.(moving);
    const point=select.value==='sigil' ? values.sigilPoint : values.epPoints?.[select.value];
    for(const axis of ['x','y']) { inputs[axis].value=point?.[axis]??'';inputs[axis].placeholder=select.value && select.value!=='sigil' && !moving ? '画面基準' : '';inputs[axis].disabled=moving||!select.value||(select.value==='sigil'&&!enabled.checked); }
    reset.disabled=moving||!select.value;
    if(readOnly) for(const control of panel.querySelectorAll('input, select, button')) control.disabled=control!==modeButton&&control!==copyButton;
  }
  function place(point) {
    if(readOnly||!select.value||select.value==='move')return;
    if(select.value==='sigil')values.sigilPoint={...point};
    else {values.epPoints={...values.epPoints};for(const key of targets())values.epPoints[key]={...point};}
    changed();sync();
  }
  enabled.onchange=()=>{values.sigilPoint=enabled.checked?(values.sigilPoint??{x:.5,y:.667}):undefined;select.value='sigil';changed();sync();};
  reset.onclick=()=>{if(select.value==='sigil')values.sigilPoint=undefined;else{values.epPoints={...values.epPoints};for(const key of targets())delete values.epPoints[key];if(!Object.keys(values.epPoints).length)values.epPoints=undefined;}changed();sync();};
  select.onchange=sync;
  function draw(ctx, rect, screenRect) {
    const points=portraitAnchorPositions(values, defaults, rect, screenRect);
    const groups=new Map();
    for(const [key,p] of Object.entries(points)){if(!p)continue;const id=p.x+':'+p.y;const item=groups.get(id)??{point:p,names:[]};item.names.push(key);groups.set(id,item);}
    ctx.save();ctx.font='bold 12px sans-serif';ctx.textAlign='left';ctx.textBaseline='bottom';
    for(const {point,names} of groups.values()) {
      const {x,y}=point;
      ctx.strokeStyle='#101723';ctx.lineWidth=4;ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.stroke();
      ctx.strokeStyle=names.includes('sigil')?'#ff8bdf':'#a2efff';ctx.lineWidth=2;ctx.stroke();
      ctx.lineWidth=3;ctx.strokeStyle='#101723';ctx.strokeText(names.join('/'),x+7,y-3);ctx.fillStyle='#fff';ctx.fillText(names.join('/'),x+7,y-3);
    }ctx.restore();
  }
  function setDetailMode(active) {
    select.hidden=active;radios.hidden=!active;
    if(!active&&select.value==='move')select.value='';
    if(active&&!select.value)select.value='sigil';
    modeButton.textContent=active?'通常モードへ':'部位指定モードへ';
    modeButton.title=active?'座標を保持して通常のプレビューへ戻ります。':'画像を大きく表示して部位位置を指定します。';
    sync();
  }
  setDetailMode(false);return {panel,sync,place,draw,modeButton,setDetailMode,
    get moving() {return !readOnly&&select.value==='move';},
    move(drag, at) {if(readOnly||select.value!=='move')return;movePortraitAnchors(values,drag,at);changed();sync();},
  };
}
