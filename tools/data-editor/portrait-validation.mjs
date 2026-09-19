import fs from 'node:fs';
import path from 'node:path';
import { literal } from './public/sprite-values.js';

export function validatePortraitModels(root, placements, factors) {
  const issues = [];
  const add = (model, node, message) => issues.push({file:model.file,line:model.source.slice(0,node.start).split('\n').length,code:'CONFIG',message});
  for (const entry of placements.declarations.find(d => d.name === 'CHARACTER_PORTRAITS')?.node.entries ?? []) {
    if (!entry.key) continue;
    if (!/^.+_.+_.+_[1-9]\d*$/.test(entry.key) || /[\\/]/.test(entry.key)) add(placements,entry.node,'立ち絵IDは player_区分_状態_番号（拡張子なし）にしてください。');
    else if (!fs.existsSync(path.join(root,'image/character',entry.key+'.png'))) add(placements,entry.node,'立ち絵の画像がありません: '+entry.key+'.png');
  }
  const node=factors.declarations.find(d=>d.name==='PORTRAIT_FACTORS')?.node;
  const rules=literal(node);
  if (rules) {
    const array = key => Array.isArray(rules[key]) ? rules[key] : [];
    const tags=['idle',...array('statuses'),...array('relics'),...array('cards'),...array('events'),...array('hpRatios').map(r=>r?.tag),...array('epRatios').map(r=>r?.tag)];
    if (new Set(tags).size !== tags.length) add(factors,node,'立ち絵の状態タグは種類をまたいで一意にしてください（idleは予約語）。');
    for (const tag of tags) if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(tag)) add(factors,node,'立ち絵タグは英字で始まる英数字と_にしてください: '+tag);
  }
  return issues;
}
