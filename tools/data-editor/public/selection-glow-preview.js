const color = value => `#${Math.max(0, value).toString(16).padStart(6, '0').slice(-6)}`;
const clamp = value => Math.max(0, Math.min(1, value));

/** Same timing curves as selectionGlow.ts; Canvas contours are a preview approximation. */
export function glowPreviewState(config, elapsed, dimmed = false) {
    const c = config.card, e = config.enemy;
    const phase = (elapsed % Math.max(1, c.pulseDuration)) / Math.max(1, c.pulseDuration);
    const alpha = c.minAlpha + (c.maxAlpha - c.minAlpha) * (1 + Math.cos(phase * Math.PI * 2)) / 2;
    const rise = Math.max(1, e.riseDuration), fade = Math.max(1, e.fadeDuration);
    const enemy = elapsed < rise ? Math.sin(clamp(elapsed / rise) * Math.PI / 2)
        : elapsed < rise + fade ? Math.cos(clamp((elapsed - rise) / fade) * Math.PI / 2) : 0;
    return { cardAlpha: clamp(alpha * (dimmed ? c.dimmedMultiplier : 1)), enemyStrength: Math.max(0, e.strength) * enemy };
}

export function createSelectionGlowPreview(read) {
    const panel = document.createElement('div'); panel.className = 'preview';
    const title = document.createElement('h3'); title.textContent = '選択時発光プレビュー';
    const note = document.createElement('p'); note.className = 'hint';
    note.textContent = 'フォームの下書き値で再生。左は使用可能、中央は使用不可、右は透過カード。下は敵選択の一度きりの発光です。輪郭・透過量は確認用の仮表示で、敵のWebGL効果を完全再現するものではありません。';
    const canvas = document.createElement('canvas'); canvas.width = 600; canvas.height = 430;
    canvas.style.maxWidth = '100%'; canvas.setAttribute('aria-label', 'カードと敵の選択発光プレビュー');
    const replay = document.createElement('button'); replay.textContent = '発光を再生'; replay.title = '現在のフォーム値を使って敵とカードの発光を最初から再生します。';
    let start = performance.now(), frame, previous;
    replay.onclick = () => { start = performance.now(); };
    panel.append(title, note, canvas, replay);
    const ctx = canvas.getContext('2d');
    function draw(now) {
        if (!panel.isConnected) return;
        const config = read(), stamp = JSON.stringify(config);
        if (stamp !== previous) { previous = stamp; start = now; }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#18202a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (config?.card && config?.enemy) {
            const state = glowPreviewState(config, now - start), dimmed = glowPreviewState(config, now - start, true);
            [100, 300, 500].forEach((x, index) => {
                const opacity = index === 2 ? 0.5 : 1;
                ctx.strokeStyle = color(index === 0 ? config.card.usableColor : config.card.unusableColor); ctx.lineWidth = 2;
                const spread = Math.min(80, Math.max(1, config.card.spread));
                for (let offset = spread; offset >= 1; offset--) {
                    ctx.globalAlpha = 0.5 * (1 - (offset - 1) / spread) ** 2 * (index === 2 ? dimmed.cardAlpha : state.cardAlpha) * opacity;
                    ctx.beginPath(); ctx.roundRect(x - 65 - offset, 30 - offset, 130 + offset * 2, 185 + offset * 2, 8 + offset); ctx.stroke();
                }
                ctx.globalAlpha = opacity; ctx.fillStyle = '#3c4759'; ctx.beginPath(); ctx.roundRect(x - 65, 30, 130, 185, 8); ctx.fill();
                ctx.globalAlpha = 1; ctx.fillStyle = '#ffffff'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText(['使用可能', '使用不可', '透過カード'][index], x, 245);
            });
            ctx.save(); ctx.translate(300, 335);
            ctx.shadowColor = color(config.enemy.color); ctx.shadowBlur = Math.min(80, Math.max(1, config.enemy.spread)) * state.enemyStrength;
            ctx.fillStyle = '#6c99be'; ctx.beginPath(); ctx.ellipse(0, 0, 65, 43, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
            ctx.fillStyle = '#ffffff'; ctx.fillText('敵（仮の輪郭）', 300, 403);
        }
        frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);
    return { panel, dispose: () => cancelAnimationFrame(frame) };
}
