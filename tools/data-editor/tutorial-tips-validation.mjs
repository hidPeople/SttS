import { literal } from './public/sprite-values.js';

export function validateTutorialTips(model) {
  const issues = [], ids = new Set();
  const entries = model.declarations.find(d => d.name === 'TUTORIAL_TIPS')?.node.items ?? [];
  for (const node of entries) {
    const tip = literal(node);
    if (!tip) continue;
    const add = message => issues.push({ file: model.file, line: model.source.slice(0, node.start).split('\n').length, code: 'CONFIG', message: `${tip.id ?? 'Tips'}: ${message}` });
    if (ids.has(tip.id)) add('Tipsのidは重複できません。');
    ids.add(tip.id);
    if (tip.turn !== undefined && (!Number.isInteger(tip.turn) || tip.turn < 1)) add('turnは1以上の整数を指定してください。');
    if (tip.delayMs !== undefined && (!Number.isFinite(tip.delayMs) || tip.delayMs < 0)) add('delayMsは0以上の時間msを指定してください。');
    if (!Array.isArray(tip.pages) || tip.pages.length === 0) {
      add('pagesには1ページ以上必要です。');
      continue;
    }
    tip.pages.forEach((page, index) => {
      const pageIssue = message => add('pages[' + (index + 1) + ']: ' + message);
      if (!page || typeof page !== 'object') { pageIssue('ページの設定が必要です。'); return; }
      if (page.position?.anchor === 'card' && !page.position.cardId?.trim()) pageIssue('card位置にはcardIdが必要です。');
      if ((page.position?.anchor === 'enemyIntent' || page.highlightEnemy) && !tip.enemyState) pageIssue('敵を基準にする場合はenemyStateが必要です。');
      for (const key of ['x', 'y']) if (!Number.isFinite(page.position?.[key])) pageIssue('position.' + key + 'は有限の数値を指定してください。');
    });
  }
  return issues;
}
