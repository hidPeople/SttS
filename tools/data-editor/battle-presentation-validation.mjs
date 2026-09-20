import fs from 'node:fs';
import path from 'node:path';
import { literal } from './public/sprite-values.js';

export function validateBattlePresentation(root, model, events) {
  const issues = [];
  const add = (node, message) => issues.push({ file: model.file, line: model.source.slice(0, node.start).split('\n').length, code: 'CONFIG', message });
  const find = name => model.declarations.find(d => d.name === name)?.node;
  const backgroundNode = find('BATTLE_BACKGROUNDS'), backgrounds = literal(backgroundNode);
  const eventIds = new Set(events.declarations.find(d => d.name === 'EVENT_BATTLES')?.node.entries?.map(e => e.key));
  if (backgrounds) {
    for (const file of [backgrounds.fallback, ...Object.values(backgrounds.stages ?? {}), ...Object.values(backgrounds.events ?? {})]) {
      if (typeof file !== 'string' || path.basename(file) !== file || /[\\/]/.test(file) || !/\.(png|jpe?g|webp)$/i.test(file) || !fs.existsSync(path.join(root, 'image/background', file))) add(backgroundNode, 'image/background内の背景画像を指定してください: ' + file);
    }
    for (const stage of Object.keys(backgrounds.stages ?? {})) if (!/^[1-9]\d*$/.test(stage)) add(backgroundNode, '背景のステージ番号は1以上の整数にしてください。');
    for (const id of Object.keys(backgrounds.events ?? {})) if (!eventIds.has(id)) add(backgroundNode, '背景のイベント戦闘IDが未登録です: ' + id);
  }
  const entranceNode = find('BATTLE_ENTRANCE'), entrance = literal(entranceNode);
  if (entrance) {
    for (const key of ['playerDuration', 'enemyDuration']) if (!(Number.isFinite(entrance[key]) && entrance[key] >= 0)) add(entranceNode, key + 'は0以上の時間msにしてください。');
    if (!(entrance.nextEnemyProgress >= 0 && entrance.nextEnemyProgress <= 1)) add(entranceNode, 'nextEnemyProgressは0〜1にしてください。');
    for (const [count, order] of Object.entries(entrance.enemyOrder ?? {})) {
      if (!/^[1-9]\d*$/.test(count) || !Array.isArray(order) || order.length !== Number(count) || new Set(order).size !== Number(count) || !order.every(i => Number.isInteger(i) && i >= 0 && i < Number(count))) add(entranceNode, `enemyOrder[${count}]は0から敵数−1までを一度ずつ指定してください。`);
    }
  }
  return issues;
}
