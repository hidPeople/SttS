import fs from 'node:fs';
import path from 'node:path';

export function validateEventModels(root, conversations, battles, sprites) {
  const issues = [];
  const entries = (model, name) => model.declarations.find(d => d.name === name)?.node.entries ?? [];
  const add = (model, node, message) => issues.push({ file: model.file, line: model.source.slice(0, node.start).split('\n').length, code: 'CONFIG', message });
  const fields = node => Object.fromEntries((node.entries ?? []).map(e => [e.key, e.node]));
  const pages = entries(conversations, 'CONVERSATIONS'), ids = new Set(pages.map(e => e.key));
  const files = fs.readdirSync(path.join(root, 'image/character')).filter(f => /^.+_.+_.+_[1-9]\d*\.png$/.test(f));
  const portraits = new Set(files.flatMap(f => [f, f.slice(0, -4)]));
  for (const event of pages) {
    if (event.node.kind === 'array' && !event.node.items.length) add(conversations, event.node, `${event.key}: 会話ページを1件以上追加してください。`);
    for (const page of event.node.items ?? []) {
      const p = fields(page);
      if (p.portrait?.kind === 'string' && p.portrait.value && !portraits.has(p.portrait.value)) add(conversations, p.portrait, `${event.key}: 立ち絵の命名形式と画像ファイルを確認してください: ${p.portrait.value}`);
      if (p.background?.kind === 'string' && p.background.value) {
        const imageRoot = path.resolve(root, 'image'), file = path.resolve(imageRoot, p.background.value);
        if (!file.startsWith(imageRoot + path.sep) || !/\.(png|webp|jpe?g)$/i.test(file) || !fs.existsSync(file)) add(conversations, p.background, `${event.key}: image内に背景画像がありません: ${p.background.value}`);
      }
    }
  }
  for (const entry of entries(conversations, 'DEFEAT_CONVERSATIONS')) if (entry.node.kind === 'string' && !ids.has(entry.node.value)) add(conversations, entry.node, `敗北会話IDが未登録です: ${entry.node.value}`);
  for (const entry of entries(battles, 'EVENT_BATTLES')) {
    const b = fields(entry.node);
    if (b.initialHp?.kind === 'number' && b.initialHp.value <= 0) add(battles, b.initialHp, 'initialHpは正の数値を指定してください。');
    for (const key of ['deckIds', 'enemyIds']) if (b[key]?.kind === 'array' && !b[key].items.length) add(battles, b[key], `${key}は1件以上必要です。`);
    for (const event of b.beforeDrawEvents?.items ?? []) {
      const e = fields(event);
      if (e.turn?.kind === 'number' && (!Number.isInteger(e.turn.value) || e.turn.value < 1)) add(battles, e.turn, 'turnは1以上の整数を指定してください。');
      if (e.conversationId?.kind === 'string' && !ids.has(e.conversationId.value)) add(battles, e.conversationId, `会話IDが未登録です: ${e.conversationId.value}`);
    }
  }
  return issues;
}
