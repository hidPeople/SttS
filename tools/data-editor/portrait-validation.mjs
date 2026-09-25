import fs from 'node:fs';
import path from 'node:path';
import { literal } from './public/sprite-values.js';

export function validatePortraitModels(root, placements, factors) {
  const issues = [];
  const add = (model, node, message) => issues.push({file:model.file,line:model.source.slice(0,node.start).split('\n').length,code:'CONFIG',message});
  const entries = placements.declarations.find(d => d.name === 'CHARACTER_PORTRAITS')?.node.entries ?? [];
  function resolveFile(id, visiting = new Set()) {
    if (visiting.has(id)) return '循環参照があります: ' + [...visiting, id].join(' → ');
    if (!/^.+_.+_[1-9]\d*$/.test(id) || /[\\/]/.test(id)) return '立ち絵IDは player_[区分_]状態_番号（拡張子なし）にしてください。';
    visiting.add(id);
    const entry = entries.find(e => e.key === id);
    if (entry?.node.kind === 'string') return resolveFile(entry.node.value, visiting);
    if (!fs.existsSync(path.join(root,'image/character',id+'.png'))) return '立ち絵の画像がありません: '+id+'.png';
  }
  for (const entry of entries) {
    if (!entry.key) continue;
    const error = resolveFile(entry.key);
    if (error) add(placements,entry.node,error);
  }
  const node=factors.declarations.find(d=>d.name==='PORTRAIT_FACTORS')?.node;
  const rules=literal(node);
  if (rules) {
    const array = key => Array.isArray(rules[key]) ? rules[key] : [];
    const tags=['idle',...array('states'),...array('statuses'),...array('connections'),...array('relics'),...array('cards'),...array('events'),...array('interactions')];
    if (new Set(tags).size !== tags.length) add(factors,node,'立ち絵の状態タグは種類をまたいで一意にしてください（idleは予約語）。');
    const comparisons = array('percentComparisons');
    if (new Set(comparisons).size !== comparisons.length) add(factors,node,'パーセント比較の対象が重複しています。');
    for (const tag of tags) if (/^(HP|EP)(?:_?(gte|lte|gt|lt)\d+(?:\.\d+)?(?:per)?)?$/.test(tag)) add(factors,node,'数値付きパーセント条件はファイル名に直接指定してください。固定タグとしての登録は不要です: '+tag);
    for (const tag of tags) if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(tag)) add(factors,node,'立ち絵タグは英字で始まる英数字と_にしてください: '+tag);
  }
  return issues;
}
