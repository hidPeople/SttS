// Classic script also runs when index.html is opened directly from Explorer.
// Vite must serve the application's TypeScript imports; file:// cannot load them.
(() => {
  const panel = document.getElementById('startup-status');
  const title = document.getElementById('startup-title');
  const message = document.getElementById('startup-message');
  const retry = document.getElementById('startup-retry');
  retry.onclick = () => location.reload();
  if (location.protocol === 'file:') {
    title.textContent = 'このHTMLファイルは直接起動できません';
    message.textContent = '本体のデータ・UIを読み込むため、開発サーバー経由で開いてください。下のリンクを押すと通常のブラウザで比較画面が開きます。接続できない場合は、READMEの手順でサーバーを起動してください。';
    document.getElementById('startup-link').hidden = false;
    return;
  }
  const timer = setTimeout(() => {
    title.textContent = '読み込みに時間がかかっています';
    message.textContent = 'サーバーとの接続、またはUI素材の初期化を待っています。再読み込みしても続く場合は、この画面のURLをお知らせください。';
    retry.hidden = false;
  }, 15000);
  import('./app.js').then(() => {
    clearTimeout(timer);
    panel.hidden = true;
  }).catch(error => {
    clearTimeout(timer);
    title.textContent = '比較画面を読み込めませんでした';
    message.textContent = `ページを再読み込みしてください。繰り返す場合は、このエラーをお知らせください：${error instanceof Error ? error.message : String(error)}`;
    retry.hidden = false;
    console.error('UI competition startup failed:', error);
  });
})();
