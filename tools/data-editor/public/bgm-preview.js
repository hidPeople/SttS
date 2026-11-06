/** On-demand Web Audio preview, using the same native loop region as the game. */
export function createBgmPreview(id, files, readTrack) {
  const panel = document.createElement('section'); panel.className = 'preview';
  const title = document.createElement('h3'); title.textContent = `BGM試聴：${id}`;
  const status = document.createElement('p'); status.textContent = '再生時のみ読み込み。ゲームの再生・ユーザー音量設定には影響しません。';
  panel.append(title, status);
  let context, source, buffer, disposed = false, generation = 0, controller;
  const stop = () => { generation++; controller?.abort(); if (source) { source.stop(); source.disconnect(); source = undefined; } };
  async function play(seam) {
    stop(); const request = generation;
    try {
      context ??= new AudioContext(); await context.resume();
      const file = files.find(file => file.replace(/\.[^.]+$/, '') === id);
      if (!file) throw Error('音源がありません。');
      if (!buffer) {
        status.textContent = '音源を読み込み中…'; controller = new AbortController();
        const response = await fetch('/bgm-asset?name=' + encodeURIComponent(file), {signal: controller.signal});
        if (!response.ok) throw Error(`HTTP ${response.status}`);
        const decoded = await context.decodeAudioData(await response.arrayBuffer());
        if (disposed || request !== generation) return;
        buffer = decoded;
      }
      if (disposed || request !== generation) return;
      const track = readTrack() ?? {}, start = track.loopStart ?? 0, end = track.loopEnd ?? buffer.duration;
      if (!(start >= 0 && start < end && end <= buffer.duration + .001)) throw Error(`ループ範囲は0～${buffer.duration.toFixed(6)}秒以内で、開始 < 終了にしてください。`);
      source = context.createBufferSource(); source.buffer = buffer; source.loop = true;
      source.loopStart = start; source.loopEnd = Math.min(end, buffer.duration);
      const gain = context.createGain(); gain.gain.value = .3; source.connect(gain); gain.connect(context.destination);
      source.onended = () => gain.disconnect();
      source.start(0, seam ? Math.max(start, end - 4) : 0);
      status.textContent = `再生中。長さ ${buffer.duration.toFixed(6)}秒／ループ ${start}～${end.toFixed(6)}秒。境目確認は末尾4秒前から再生します。`;
    } catch (error) { if (!disposed && request === generation) status.textContent = `試聴失敗：${error.message}`; }
  }
  for (const [caption, action] of [['頭から試聴', () => play(false)], ['ループ境目を確認', () => play(true)], ['停止', () => { stop(); status.textContent = '停止中'; }]]) {
    const button = document.createElement('button'); button.textContent = caption; button.onclick = action; panel.append(button);
  }
  return {panel, dispose() { disposed = true; stop(); buffer = undefined; if (context) void context.close(); }};
}
