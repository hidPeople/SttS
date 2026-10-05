import { CONFIG, DESIGNS } from './config.js';
import { sampleMotion } from './motion.js';
import { drawStudy } from './renderer.js';
const $=id=>document.getElementById(id), key='stts-ui-competition-vitals-v1';
let saved={};try{saved=JSON.parse(localStorage.getItem(key)||'{}')||{};}catch{}
const review={selected:Array.isArray(saved.selected)?saved.selected.filter(id=>DESIGNS.some(d=>d.id===id)):[],notes:saved.notes&&typeof saved.notes==='object'?saved.notes:{}};
let base={...CONFIG.initial},action='',progress=0,paused=false,last=0,clock=0,focused='B';
const background=new Image();background.src='../../image/background/Prison.png';
const canvases=new Map();
function save(){try{localStorage.setItem(key,JSON.stringify(review));}catch{}}
function sizeCanvas(canvas){const ratio=Math.min(devicePixelRatio||1,CONFIG.canvas.pixelRatioLimit);const width=Math.max(CONFIG.canvas.width,canvas.clientWidth);canvas.width=Math.round(width*ratio);canvas.height=Math.round(width*CONFIG.canvas.height/CONFIG.canvas.width*ratio);}
for(const design of DESIGNS){
  const article=document.createElement('article');article.className='study';article.dataset.design=design.id;
  article.innerHTML=`<header><span class="letter">${design.id}</span><div><h3>${design.name}</h3><div class="tag">${design.tag}</div></div></header><canvas aria-label="${design.id}案：プレイヤーと敵のHP・EPプレビュー"></canvas><div class="study-info"><p class="description">${design.description}</p><p class="floor-note">下限の表現：${design.floor}</p><div class="study-actions"><button class="choose">候補に残す</button><span style="font-size:10px;color:#998b93">${design.liquid?'液体アニメーション':'フレームアニメーション'}</span><button class="focus">拡大確認 ↗</button></div><textarea class="memo" rows="1" placeholder="この案の良い点・気になる点" aria-label="${design.id}案のメモ"></textarea></div>`;
  $('designs').append(article);const canvas=article.querySelector('canvas');sizeCanvas(canvas);canvases.set(design.id,canvas);
  const choose=article.querySelector('.choose'),memo=article.querySelector('.memo');
  const sync=()=>{const selected=review.selected.includes(design.id);choose.setAttribute('aria-pressed',String(selected));choose.textContent=selected?'✓ 候補に選択中':'候補に残す';article.classList.toggle('chosen',selected);};sync();
  choose.onclick=()=>{review.selected=review.selected.includes(design.id)?review.selected.filter(id=>id!==design.id):[...review.selected,design.id];sync();save();};
  memo.value=review.notes[design.id]||'';memo.oninput=()=>{review.notes[design.id]=memo.value;save();};
  article.querySelector('.focus').onclick=()=>{focused=design.id;updateFocus();$('detail').scrollIntoView({behavior:'smooth',block:'start'});};
}
function updateFocus(){const d=DESIGNS.find(d=>d.id===focused);$('detail-title').textContent=`${d.id} / ${d.name} — ${d.en}`;}
updateFocus();sizeCanvas($('large'));
const resizeObserver=new ResizeObserver(entries=>{for(const {target} of entries)sizeCanvas(target);});
for(const canvas of [...canvases.values(),$('large')])resizeObserver.observe(canvas);
function sliders(){for(const prop of ['hp','ep','floor']){$(prop).value=Math.round(base[prop]*100);document.querySelector(`output[for=${prop}]`).textContent=`${Math.round(base[prop]*100)}%`;}}
for(const prop of ['hp','ep','floor'])$(prop).oninput=()=>{base[prop]=Number($(prop).value)/100;if(prop==='ep')base.floor=Math.min(base.floor,base.ep);if(prop==='floor')base.ep=Math.max(base.ep,base.floor);action='';progress=0;sliders();};
sliders();
const labels={damage:'HPダメージ',heal:'HP回復',charge:'EP上昇',playerReset:'プレイヤー排出',enemyReset:'敵の2段排出'};
for(const button of document.querySelectorAll('[data-action]'))button.onclick=()=>{action=button.dataset.action;progress=0;paused=false;};
$('reset').onclick=()=>{base={...CONFIG.initial};action='';progress=0;paused=false;sliders();};
$('pause').onclick=()=>paused=!paused;
$('timeline').oninput=()=>{if(!action)action='playerReset';progress=Number($('timeline').value)/1000;paused=true;};
$('export').onclick=()=>{const payload={competition:'hp-ep-v1',...review,preview:{...base,action,progress,background:$('background').value},exportedAt:new Date().toISOString()};const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='hp-ep-selection.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
let frameTime=0;
function render(now){requestAnimationFrame(render);if(document.hidden){last=now;return;}const delta=last?Math.min(now-last,100):0;last=now;
  if(!paused){clock+=delta/1000;if(action){progress+=delta*Number($('speed').value)/CONFIG.durations[action];if(progress>1){if($('loop').checked){if(progress>1.35)progress=0;}else progress=1;}}}
  if(now-frameTime<1000/CONFIG.canvas.fps)return;frameTime=now;
  const p=Math.min(1,progress),state=sampleMotion(action,p,base),options={time:clock,background,backgroundKind:$('background').value,language:$('language').value,action,progress:p};
  for(const design of DESIGNS)drawStudy(canvases.get(design.id),design,state,options);
  drawStudy($('large'),DESIGNS.find(d=>d.id===focused),state,options);
  $('timeline').value=Math.round(p*1000);$('time-label').textContent=`${Math.round(p*100)}%`;$('phase').textContent=labels[action]||'待機';$('pause').textContent=paused?'▶':'Ⅱ';
  $('pause').setAttribute('aria-label',paused?'演出を再開':'演出を一時停止');
  for(const button of document.querySelectorAll('[data-action]'))button.setAttribute('aria-pressed',String(button.dataset.action===action));
}
requestAnimationFrame(render);
