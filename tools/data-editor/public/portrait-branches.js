const groupNames = { states:'状態', statuses:'状態異常', connections:'接続', relics:'レリック', events:'演出・行動', cards:'最後に使ったカード', percentComparisons:'割合条件' };
function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
}
function button(text, action) {
    const node = element('button', text);
    node.onclick = action;
    return node;
}
function option(value, name = value) {
    const node = element('option', name); node.value = value; return node;
}

export function createPortraitBranches(host, {api, token, onImport, editPlacement, refs}) {
    let data, category = 'normal', selected = [], extra = [], revision = 0, importing = false, loading = false;
    let files = [], chosen, filePage = 0, urls = [];
    const status = element('p', '', 'hint');
    status.setAttribute('role','status');
    const filters = element('section'), current = element('section'), destinations = element('section');
    current.classList.add('branch-current');
    const source = element('section'), gallery = element('div'), toolbar = element('div', undefined, 'branch-tools');
    const folder = element('input'); folder.type = 'file'; folder.webkitdirectory = true; folder.multiple = true;
    const fileLabel = element('label','素材フォルダ '); fileLabel.append(folder);
    const hover = element('input'); hover.type = 'checkbox';
    const hoverLabel = element('label'); hoverLabel.append(hover, ' ホバー用として追加');
    const filename = element('code'), copy = button('追加して配置を編集', upload);
    const importNote = element('p', '', 'hint');
    importNote.setAttribute('role','status');
    toolbar.append(hoverLabel,filename,copy);
    source.append(element('h2','フォルダから立ち絵を追加'),fileLabel,gallery,toolbar,importNote);
    host.append(element('h1','立ち絵の派生'),status,filters,current,destinations,source);
    function params() {
        const q = new URLSearchParams({category});
        for (const tag of selected) q.append('factor',tag);
        for (const tag of extra) q.append('option',tag);
        return q;
    }
    function label(t) {
        const localized = refs()?.[t.group]?.find(r => r.key === t.base || r.id === t.base)?.label;
        return localized && localized !== t.base ? localized + ' · ' + t.tag : t.tag;
    }
    function toggle(t) {
        if (selected.includes(t.tag)) selected = selected.filter(tag => tag !== t.tag);
        else {
            selected = selected.filter(tag => {
                const prior = data.choices.find(c => c.tag === tag);
                return prior?.base !== t.base && !(prior?.group === 'cards' && t.group === 'cards');
            });
            selected.push(t.tag);
        }
        refresh();
    }
    async function refresh(message = '') {
        const request = ++revision;
        loading = true;
        updateImport();
        try {
            const result = await api('portrait-branches?' + params());
            if (request !== revision) return;
            data = result; selected = result.selected;
            render();
            status.textContent = message;
        } catch (error) {
            if (request !== revision) return;
            status.textContent = error.message;
            if (data) {
                category = data.category;
                selected = [...data.selected];
                extra = extra.filter(t=>data.choices.some(c=>c.tag===t));
                render();
            }
        } finally {
            if (request === revision) { loading = false; updateImport(); }
        }
    }
    function images(title, pool) {
        const section = element('div');
        section.append(element('strong',title));
        const row = element('div',undefined,'branch-images');
        for (const p of pool) {
            const figure = element('figure');
            const img = element('img'); img.loading = 'lazy'; img.alt = p.id;
            img.onerror = () => { img.onerror = null; img.src = '/asset?name=' + encodeURIComponent('character/' + p.image); };
            img.src = '/portrait-thumbnail?name=' + encodeURIComponent(p.image);
            const caption = element('figcaption',p.id);
            if (p.image !== p.id + '.png') caption.append(element('small','参照元 ' + p.image));
            const edit = button('', () => editPlacement(p.id));
            edit.className = 'branch-edit-image';
            edit.title = p.id + ' の配置を編集';
            edit.setAttribute('aria-label', edit.title);
            edit.append(img);
            figure.append(edit,caption); row.append(figure);
        }
        section.append(row); return section;
    }
    function showResult(box, result, branch = false) {
        const pair = element('div',undefined,'branch-pair');
        if (result.normal.length) pair.append(images('通常', result.normal));
        else if (!branch) pair.append(element('p','通常の立ち絵はありません。'));
        if (result.hover.length) pair.append(images('ホバー', result.hover));
        box.append(pair);
    }
    function resetButton() {
        const reset = button('選択をすべて解除', () => { selected = []; refresh(); });
        reset.disabled = !selected.length;
        return reset;
    }
    function render() {
        filters.replaceChildren();
        const select = element('select');
        for (const id of data.categories) select.append(option(id));
        select.value = category;
        select.onchange = () => { category = select.value; refresh(); };
        const top = element('label',data.player + ' ／ 戦闘区分 '); top.append(select);
        const lookup = element('select');
        lookup.append(option('', '立ち絵を選択…'));
        for (const p of data.portraits) lookup.append(option(p.id));
        lookup.onchange = () => {
            const portrait = data.portraits.find(p => p.id === lookup.value);
            if (portrait) { selected = [...portrait.factors]; refresh(); }
        };
        const lookupLabel = element('label','立ち絵から選択 ');
        lookupLabel.append(lookup);
        const controls = element('div',undefined,'branch-tools branch-filter-bar');
        controls.append(top,lookupLabel);
        filters.append(controls, element('p','要因を発動順に選択してください。最後に使ったカードや、同じ要因の閾値は選び直せます。', 'hint'));
        for (const [group,title] of Object.entries(groupNames)) {
            const choices = data.choices.filter(c => c.group === group);
            if (!choices.length) continue;
            const line = element('div',undefined,'branch-tools branch-factors');
            line.append(element('strong',title));
            for (const t of choices) {
                const b = button(label(t),()=>toggle(t)); b.setAttribute('aria-pressed', String(selected.includes(t.tag)));
                line.append(b);
            }
            filters.append(line);
        }
        const addComparison = element('form',undefined,'branch-threshold');
        const base = element('select'), operator = element('select'), amount = element('input');
        for (const [group,ids] of Object.entries(data.comparisonBases)) for (const id of ids) base.append(option(group+'/'+id,id));
        for (const [op,sign] of Object.entries({gte:'≥',gt:'>',lte:'≤',lt:'<'})) operator.append(option(op,sign));
        base.setAttribute('aria-label','比較する要因'); operator.setAttribute('aria-label','比較演算子');
        amount.type='number'; amount.min='0'; amount.step='any'; amount.value='1'; amount.required=true; amount.setAttribute('aria-label','閾値');
        addComparison.append(element('strong','新しい閾値'),base,operator,amount,element('button','条件を追加'));
        addComparison.onsubmit = event => {
            event.preventDefault();
            const [group,id] = base.value.split('/');
            const tag = id + operator.value + Number(amount.value) + (group === 'percentComparisons' ? 'per' : '');
            if (!extra.includes(tag)) extra.push(tag);
            if (!selected.includes(tag)) selected.push(tag);
            refresh();
        };
        controls.append(addComparison,resetButton());
        const summary = element('div',undefined,'branch-tools');
        summary.append(element('span',selected.join(' → ') || '通常待機'),resetButton());
        current.replaceChildren(element('h2','選択中の組み合わせ'),summary);
        const result = data.current;
        if (result.normal.length) current.append(element('p','採用要因：' + result.normal[0].tags.join('・')));
        if (result.missing.length) current.append(element('p','不足している要因：' + result.missing.join('・'),'branch-missing'),
            button('この条件で画像を追加…',()=>{source.scrollIntoView({block:'start'});folder.focus({preventScroll:true});}));
        showResult(current,result);
        destinations.replaceChildren(element('h2','派生先'));
        if (!data.branches.length) destinations.append(element('p','要因を1つ加えて画像が変わる派生先はありません。'));
        for (const branch of data.branches) {
            const box = element('article');
            const action = selected.every(tag => branch.selected.includes(tag)) ? '＋ ' : '変更：';
            box.append(button(action+label(data.choices.find(t=>t.tag===branch.tag)),()=>{selected=branch.selected;refresh();current.scrollIntoView({block:'start'});}));
            showResult(box,branch,true);destinations.append(box);
        }
        updateImport();
    }
    function updateImport() {
        const dest = data?.filenames[Number(hover.checked)];
        filename.textContent = dest ? (chosen ? chosen.name + ' → ' : '') + dest : '';
        copy.disabled = !data || !chosen || importing || loading;
    }
    function renderFiles() {
        for (const url of urls) URL.revokeObjectURL(url);
        urls = [];
        gallery.replaceChildren();
        if (!files.length) {
            gallery.append(element('p','PNG画像のあるフォルダを選択してください。','hint'));
            return;
        }
        const perPage = 18, pages = Math.ceil(files.length/perPage);
        const nav = element('div',undefined,'branch-tools');
        const prev = button('前へ', () => { filePage--; renderFiles(); });
        const next = button('次へ', () => { filePage++; renderFiles(); });
        prev.disabled = filePage === 0;
        next.disabled = filePage + 1 >= pages;
        nav.append(prev,element('span',`${filePage+1} / ${pages}（${files.length}枚）`),next);
        const list = element('div',undefined,'branch-files');
        for (const file of files.slice(filePage * perPage, (filePage + 1) * perPage)) {
            const tile = button('', () => {
                chosen = file;
                for (const item of list.children) item.setAttribute('aria-pressed', String(item === tile));
                updateImport();
            });
            const img = element('img');
            img.loading = 'lazy';
            img.alt = '';
            img.src = URL.createObjectURL(file);
            urls.push(img.src);
            tile.setAttribute('aria-pressed', String(chosen === file));
            tile.append(img,element('span', file.webkitRelativePath || file.name));
            list.append(tile);
        }
        gallery.append(nav,list);
    }
    folder.onchange = () => {
        files = Array.from(folder.files).filter(f => /\.png$/i.test(f.name))
            .sort((a,b) => a.webkitRelativePath.localeCompare(b.webkitRelativePath));
        chosen = undefined;
        filePage = 0;
        renderFiles();
        updateImport();
    };
    hover.onchange=updateImport;
    async function upload() {
        if (!chosen || !data || importing || loading) return;
        importing = true;
        updateImport();
        importNote.textContent = '画像を追加しています…';
        const q = params();
        const request = revision;
        q.set('hover', hover.checked ? '1' : '0');
        q.set('name', data.filenames[Number(hover.checked)]);
        try {
            const r = await fetch('/api/portrait-import?' + q, {
                method: 'POST', headers: {'X-Editor-Token': token, 'Content-Type':'image/png'}, body: chosen,
            });
            const answer = await r.json();
            if (!r.ok) throw Error(answer.error);
            onImport(answer.name);
            importNote.textContent = '追加しました：'+answer.name;
            if (!host.hidden && request === revision) await editPlacement(answer.name.slice(0, -4));
            if (!host.hidden) await refresh(importNote.textContent);
        } catch (error) {
            importNote.textContent = error.message;
        } finally {
            importing = false;
            updateImport();
        }
    }
    renderFiles();
    return { refresh };
}
