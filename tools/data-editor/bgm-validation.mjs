import fs from 'node:fs';
import path from 'node:path';
import { literal } from './public/sprite-values.js';

export function bgmFiles(root) {
  try { return fs.readdirSync(path.join(root, 'bgm')).filter(name => /\.(mp3|ogg|wav)$/i.test(name)).sort(); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}
export function validateBgm(root, model, conversations, events) {
  const issues = [], files = bgmFiles(root), ids = new Set(files.map(file => file.replace(/\.[^.]+$/, '')));
  const add = (m, n, message) => issues.push({ file: m.file, start: n?.start, line: m.source.slice(0, n?.start ?? 0).split('\n').length, code: 'CONFIG', message });
  for (const id of ids) if (files.filter(file => file.replace(/\.[^.]+$/, '') === id).length > 1) add(model, undefined, `BGM ID「${id}」の拡張子違い音源が複数あります。1つにしてください。`);
  const find = name => model.declarations.find(d => d.name === name)?.node;
  const checkId = (m, n, id) => { if (id !== null && (typeof id !== 'string' || !ids.has(id))) add(m, n, `BGM「${id}」の音源がbgm直下にありません。拡張子なしで指定してください。`); };
  const trackNode = find('BGM_TRACKS');
  for (const [id, track] of Object.entries(literal(trackNode) ?? {})) {
    checkId(model, trackNode, id);
    if (!(Number.isFinite(track.loopStart) && track.loopStart >= 0)) add(model, trackNode, `${id}: loopStartは0以上の秒数です。`);
    if (track.loopEnd !== undefined && !(Number.isFinite(track.loopEnd) && track.loopEnd > track.loopStart)) add(model, trackNode, `${id}: loopEndはloopStartより後の秒数です。音源長内かは試聴時に確認します。`);
  }
  const bindingNode = find('BGM_BINDINGS'), bindings = literal(bindingNode) ?? {};
  const visit = (value, n = bindingNode) => { if (value === null || typeof value !== 'object') checkId(model, n, value); else Object.values(value).forEach(v => visit(v, n)); };
  visit(bindings);
  const knownConversations = literal(conversations.declarations.find(d => d.name === 'CONVERSATIONS')?.node) ?? {};
  const knownEvents = literal(events.declarations.find(d => d.name === 'EVENT_BATTLES')?.node) ?? {};
  for (const id of Object.keys(bindings.conversations ?? {})) if (!(id in knownConversations)) add(model, bindingNode, `BGMの会話IDが未登録です: ${id}`);
  for (const id of Object.keys(bindings.eventBattles ?? {})) if (!(id in knownEvents)) add(model, bindingNode, `BGMのイベント戦闘IDが未登録です: ${id}`);
  for (const map of [bindings.stageBattles, bindings.stageRoutes, bindings.battleThreats, ...Object.values(bindings.stageBattles ?? {})]) {
    for (const number of Object.keys(map ?? {})) if (!/^[1-9]\d*$/.test(number)) add(model, bindingNode, 'ステージ・脅威度は1以上の整数をキーにしてください。');
  }
  function pages(n) {
    for (const e of n?.entries ?? []) { if (e.key === 'bgm') checkId(conversations, e.node, literal(e.node)); else pages(e.node); }
    for (const child of [...(n?.items ?? []), ...(n?.args ?? []), ...(n?.inner ? [n.inner] : [])]) pages(child);
  }
  pages(conversations.declarations.find(d => d.name === 'CONVERSATIONS')?.node);
  const settingsNode = find('AUDIO_SETTINGS'), settings = literal(settingsNode) ?? {};
  for (const key of ['defaultMaster', 'defaultBgm']) if (!(Number.isInteger(settings[key]) && settings[key] >= 0 && settings[key] <= settings.maxVolume)) add(model, settingsNode, `${key}は0～maxVolumeの整数です。`);
  if (!(Number.isInteger(settings.maxVolume) && settings.maxVolume > 0)) add(model, settingsNode, 'maxVolumeは正の整数です。');
  for (const key of ['fadeOutSeconds', 'retryDelayMs', 'retryCount', 'loadTimeoutMs']) if (!(Number.isFinite(settings[key]) && settings[key] >= 0) || key === 'retryCount' && !Number.isInteger(settings[key]) || key === 'loadTimeoutMs' && settings[key] === 0) add(model, settingsNode, `${key}の時間・回数を確認してください。`);
  return issues;
}
