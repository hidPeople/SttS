export function createSpriteChecker(defaults) {
    const el = (tag, text, cls) => { const node = document.createElement(tag); if (text) node.textContent = text; if (cls) node.className = cls; return node; };
    const panel = el('section', '', 'preview sprite-checker');
    panel.append(el('h3', '素材用スプライトチェッカー'), el('p', 'PC内の画像を選んで再生します。画像・設定は本体や下書きに保存されません。', 'hint'));
    const file = el('input'); file.type = 'file'; file.accept = 'image/png,image/webp,image/jpeg,image/gif,image/bmp'; file.setAttribute('aria-label', 'チェックするスプライト画像');
    const fileLabel = el('label', '画像を選択 '); fileLabel.append(file); panel.append(fileLabel);
    const canvas = el('canvas'); canvas.width = 520; canvas.height = 340; canvas.setAttribute('aria-label', '素材チェック再生画面'); panel.append(canvas);
    const context = canvas.getContext('2d'), controls = el('div', '', 'controls'), inputs = {};
    const initial = { frameWidth: defaults.frameWidth ?? 200, frameHeight: defaults.frameHeight ?? 200, frameCount: defaults.frameCount ?? 16, frameRate: defaults.frameRate ?? 1000 / 120, zoom: 1 };
    for (const [key, label] of Object.entries({frameWidth:'1コマの幅 (px)',frameHeight:'1コマの高さ (px)',frameCount:'フレーム数',frameRate:'再生速度 (fps)',zoom:'表示倍率'})) {
        const wrap = el('label', label), input = el('input'); input.type = 'number'; input.step = ['frameRate','zoom'].includes(key) ? '0.1' : '1'; input.value = initial[key]; input.setAttribute('aria-label', `checker ${key}`);
        input.oninput = () => { frame = 0; elapsed = 0; draw(); }; inputs[key] = input; wrap.append(input); controls.append(wrap);
    }
    panel.append(controls);
    const actions = el('div', '', 'controls'), info = el('p', '画像を選択してください。', 'hint'); info.setAttribute('role','status');
    let frame = 0, elapsed = 0, playing = true, image, url, loading = false, loadError = '', active = false, animation, last;
    function button(label, help, action) { const b = el('button', label); b.type = 'button'; b.dataset.help = help; b.onclick = action; actions.append(b); return b; }
    const toggle = button('一時停止', 'このチェッカーの再生を一時停止・再開します。', () => { playing = !playing; toggle.textContent = playing ? '一時停止' : '再生'; draw(); });
    const step = delta => { playing = false; toggle.textContent = '再生'; frame = Math.max(0, frame + delta); elapsed = 0; draw(); };
    button('前のコマ', '再生を停止し、1コマ戻します。', () => step(-1));
    button('次のコマ', '再生を停止し、1コマ進めます。', () => step(1));
    button('先頭へ', '1コマ目へ戻します。', () => { frame = 0; elapsed = 0; draw(); });
    button('設定を初期値に戻す', '本体の既存スプライトから取得した初期サイズ・コマ数・速度へ戻します。', () => { for (const [key,value] of Object.entries(initial)) inputs[key].value = value; frame = 0; elapsed = 0; draw(); });
    panel.append(actions, info);
    function settings() {
        const values = Object.fromEntries(Object.entries(inputs).map(([key,input])=>[key,Number(input.value)]));
        const invalid = Object.entries(values).filter(([key,value])=>!Number.isFinite(value)||value<=0||(['frameWidth','frameHeight','frameCount'].includes(key)&&!Number.isInteger(value)));
        for (const [key,input] of Object.entries(inputs)) input.classList.toggle('warn',invalid.some(([name])=>name===key));
        return { ...values, valid: !invalid.length };
    }
    function draw(delta = 0) {
        context.clearRect(0,0,canvas.width,canvas.height);
        const s = settings();
        info.classList.remove('warning');
        if (loading || !image) { info.textContent = loading ? '画像を読み込み中…' : loadError || '画像を選択してください。'; return; }
        if (!s.valid) { info.textContent = 'サイズ・フレーム数は正の整数、速度・倍率は正の数値で指定してください。'; info.classList.add('warning'); return; }
        const cols = Math.floor(image.naturalWidth/s.frameWidth), rows = Math.floor(image.naturalHeight/s.frameHeight);
        if (!cols || !rows || s.frameCount > cols*rows) { info.textContent = `${image.naturalWidth} × ${image.naturalHeight}px：指定サイズで使用できるのは ${cols*rows} コマです。サイズ・フレーム数を確認してください。`; info.classList.add('warning'); return; }
        if (playing) { elapsed += delta*s.frameRate/1000; frame += Math.floor(elapsed); elapsed %= 1; }
        frame %= s.frameCount;
        const scale = Math.min(1,480/s.frameWidth,300/s.frameHeight)*s.zoom, w=s.frameWidth*scale,h=s.frameHeight*scale;
        context.imageSmoothingEnabled = false;
        context.drawImage(image,(frame%cols)*s.frameWidth,Math.floor(frame/cols)*s.frameHeight,s.frameWidth,s.frameHeight,(520-w)/2,(340-h)/2,w,h);
        const remainder = image.naturalWidth%s.frameWidth || image.naturalHeight%s.frameHeight;
        info.textContent = `${image.naturalWidth} × ${image.naturalHeight}px · ${cols}列 × ${rows}行 · コマ ${frame+1} / ${s.frameCount} · ${s.frameRate.toFixed(2)} fps${remainder ? ' · 端の余りは使用しません。' : ''}`;
        canvas.dataset.frame = frame;
    }
    file.onchange = () => {
        if (!file.files[0]) return;
        if (url) URL.revokeObjectURL(url);
        const next = new Image(), nextUrl = URL.createObjectURL(file.files[0]); url = nextUrl; image = undefined; loading = true; loadError = ''; frame = 0; elapsed = 0;
        next.onload = () => { if (url !== nextUrl) return; loading = false; image = next; draw(); };
        next.onerror = () => { if (url !== nextUrl) return; loading = false; loadError = '画像を読み込めません。PNG・WebPなどの画像ファイルを選択してください。'; draw(); };
        next.src = nextUrl; draw();
    };
    function tick(now) { if (!active) return; const delta = last === undefined ? 0 : Math.min(1000,now-last); last = now; draw(delta); animation=requestAnimationFrame(tick); }
    return { panel, setActive(value) { active=value; cancelAnimationFrame(animation); last=undefined; if (active) animation=requestAnimationFrame(tick); }, dispose() { active=false; cancelAnimationFrame(animation); if(url)URL.revokeObjectURL(url); } };
}
