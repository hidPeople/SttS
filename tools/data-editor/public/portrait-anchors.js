import { objectSource, sourceValue } from './source-format.js';

export const portraitPlacementKeys = ['displayHeight', 'offsetX', 'offsetY', 'epPoints', 'sigilPoint'];
export const snapshotPlacement = values => structuredClone(Object.fromEntries(portraitPlacementKeys.map(key => [key, values[key]])));
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

export function createPortraitAnchorEditor(values, defaults, changed, readOnly = false) {
  const panel = document.createElement('fieldset');panel.className = 'portrait-anchor-controls';panel.disabled = readOnly;
  const title = document.createElement('legend');title.textContent = 'EP演出・紋章の位置（画像全体をクリック）';panel.append(title);
  const select = document.createElement('select');select.setAttribute('aria-label', '演出位置の選択');
  for (const [id, text] of [['', '位置指定OFF'], ['M','M'], ['B','B'], ['C','C'], ['V','V'], ['A','A'], ['sigil','紋章']]) {
    const option = document.createElement('option');option.value = id;option.textContent = text;select.append(option);
  }
  panel.append(select);
  const label = (text, input) => { const el = document.createElement('label');el.append(input, document.createTextNode(text));panel.append(el); };
  const group = document.createElement('input');group.type = 'checkbox';group.checked = true;label('C/V/Aを同時に設定', group);
  const enabled = document.createElement('input');enabled.type = 'checkbox';label('紋章位置を設定', enabled);
  const inputs = {};
  for (const key of ['x', 'y']) {
    const input = document.createElement('input');input.type='number';input.min=0;input.max=1;input.step=0.001;input.style.width='6em';input.setAttribute('aria-label', `演出位置 ${key}`);
    inputs[key]=input;label(key.toUpperCase()+'（0～1）', input);
    input.onchange = () => { const point = {x:Number(inputs.x.value), y:Number(inputs.y.value)};if(Object.values(point).every(v=>Number.isFinite(v)&&v>=0&&v<=1)) place(point);else sync(); };
  }
  const reset=document.createElement('button');reset.type='button';reset.textContent='選択部位を既定位置へ';reset.title='選択した部位の個別設定を削除します。紋章の場合は表示を無効にします。';panel.append(reset);
  const hint=document.createElement('p');hint.className='hint';hint.textContent='画像左上=(0,0)、右下=(1,1)。倍率・Offsetを変えても位置は追従します。紋章位置なしの画像では紋章演出を出しません。';panel.append(hint);
  function targets() { return group.checked && ['C','V','A'].includes(select.value) ? ['C','V','A'] : [select.value]; }
  function sync() {
    enabled.checked=Boolean(values.sigilPoint);
    const point=select.value==='sigil' ? values.sigilPoint : values.epPoints?.[select.value] ?? defaults?.[select.value];
    for(const axis of ['x','y']) { inputs[axis].value=point?.[axis]??'';inputs[axis].disabled=!select.value||(select.value==='sigil'&&!enabled.checked); }
    reset.disabled=!select.value;
  }
  function place(point) {
    if(readOnly||!select.value)return;
    if(select.value==='sigil')values.sigilPoint={...point};
    else {values.epPoints={...values.epPoints};for(const key of targets())values.epPoints[key]={...point};}
    changed();sync();
  }
  enabled.onchange=()=>{values.sigilPoint=enabled.checked?(values.sigilPoint??{x:.5,y:.667}):undefined;select.value='sigil';changed();sync();};
  reset.onclick=()=>{if(select.value==='sigil')values.sigilPoint=undefined;else{values.epPoints={...values.epPoints};for(const key of targets())delete values.epPoints[key];if(!Object.keys(values.epPoints).length)values.epPoints=undefined;}changed();sync();};
  select.onchange=sync;
  function draw(ctx, rect) {
    const points={...defaults,...values.epPoints,...(values.sigilPoint?{sigil:values.sigilPoint}:{})};
    const groups=new Map();
    for(const [key,p] of Object.entries(points)){if(!p)continue;const id=p.x+':'+p.y;const item=groups.get(id)??{point:p,names:[]};item.names.push(key);groups.set(id,item);}
    ctx.save();ctx.font='bold 12px sans-serif';ctx.textAlign='left';ctx.textBaseline='bottom';
    for(const {point,names} of groups.values()) {
      const x=rect.x+point.x*rect.width,y=rect.y+point.y*rect.height;
      ctx.strokeStyle='#101723';ctx.lineWidth=4;ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.stroke();
      ctx.strokeStyle=names.includes('sigil')?'#ff8bdf':'#a2efff';ctx.lineWidth=2;ctx.stroke();
      ctx.lineWidth=3;ctx.strokeStyle='#101723';ctx.strokeText(names.join('/'),x+7,y-3);ctx.fillStyle='#fff';ctx.fillText(names.join('/'),x+7,y-3);
    }ctx.restore();
  }
  sync();return {panel,sync,place,draw};
}
