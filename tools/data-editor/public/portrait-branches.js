const groupNames = { states:'状態', statuses:'状態異常', connections:'接続', relics:'レリック', events:'演出・行動', cards:'最後に使ったカード', percentComparisons:'割合条件' };
const folderPageSize = 60;
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
    let files = [], chosen, filePage = 0, previewUrl;
    const tiles = new Map(), versions = new Map();
    let stream, poll, readingFolder, sourceDirectory, folderSelected = false, scanning = false;
    const status = element('p', '', 'hint');
    status.setAttribute('role','status');
    const filters = element('section'), current = element('section'), destinations = element('section');
    current.classList.add('branch-current');
    const source = element('section'), gallery = element('div'), toolbar = element('div', undefined, 'branch-tools');
    const comparison = element('div', undefined, 'branch-comparison');
    const folderPreview = element('div', undefined, 'branch-folder-preview');
    folderPreview.hidden = true;
    const previewTitle = element('strong', 'フォルダから表示中');
    previewTitle.tabIndex = -1;
    const previewFigure = element('figure'), previewImage = element('img'), previewName = element('figcaption');
    previewFigure.append(previewImage, previewName);
    const back = button('素材一覧に戻る', () => {
        const page = Math.floor(files.indexOf(chosen) / folderPageSize);
        if (page !== filePage) { filePage = page; renderFiles(); }
        gallery.querySelector('[aria-pressed=true]')?.focus();
    });
    const previewCopy = button('追加して配置を編集', upload);
    const previewActions = element('div', undefined, 'branch-tools');
    previewActions.append(back, previewCopy);
    folderPreview.append(previewTitle, previewFigure, previewActions);
    const folder = element('input'); folder.type = 'file'; folder.webkitdirectory = true; folder.multiple = true;
    const fileLabel = element('label','素材フォルダ '); fileLabel.append(folder);
    const reloadFolder = button('最新の状態に更新', async () => {
        if (sourceDirectory) await scanDirectory(sourceDirectory, true);
        else { folder.value = ''; folder.click(); }
    });
    reloadFolder.disabled = true;
    if (window.showDirectoryPicker) {
        fileLabel.replaceChildren(button('素材フォルダを選択', async () => {
            try {
                const directory = await window.showDirectoryPicker({mode:'read'});
                await scanDirectory(directory, false);
            } catch (error) {
                if (error.name !== 'AbortError') {
                    fileLabel.replaceChildren('素材フォルダ ', folder);
                    importNote.textContent = 'フォルダの継続読み取りを開始できませんでした。ファイル選択欄から開く場合は、素材編集後にフォルダを選び直してください。';
                }
            }
        }));
    }
    const hover = element('input'); hover.type = 'checkbox';
    const hoverLabel = element('label'); hoverLabel.append(hover, ' ホバー用として追加');
    const filename = element('code'), copy = button('追加して配置を編集', upload);
    const importNote = element('p', '', 'hint');
    importNote.setAttribute('role','status');
    toolbar.append(hoverLabel,filename,copy);
    const folderActions = element('div', undefined, 'branch-tools');
    folderActions.append(fileLabel, reloadFolder);
    source.append(element('h2','フォルダから立ち絵を追加'),folderActions,gallery,toolbar,importNote);
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
        updateVisibility();
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
            img.dataset.portrait = p.image;
            img.onerror = () => {
                if (img.getAttribute('src').startsWith('/portrait-thumbnail?'))
                    img.src = '/asset?name=' + encodeURIComponent('character/' + p.image) + '&v=' + (versions.get(p.image) ?? 0);
            };
            img.src = thumbnailUrl(p.image);
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
        if (result.appliedFactors.length) {
            const applied = element('div', undefined, 'branch-tools branch-factors');
            applied.append(element('strong', '採用要因'));
            for (const {tag, inputs} of result.appliedFactors) {
                const choice = data.choices.find(t => t.tag === tag);
                const chip = button(choice ? label(choice) : tag, () => {
                    selected = selected.filter(t => !inputs.includes(t));
                    refresh();
                });
                chip.disabled = inputs.length === 0;
                chip.setAttribute('aria-pressed', 'true');
                chip.title = chip.disabled ? '自動で適用される要因です' : inputs.join('・') + ' を解除';
                applied.append(chip);
            }
            current.append(applied);
        }
        if (result.missing.length) current.append(element('p','不足している要因：' + result.missing.join('・'),'branch-missing'),
            button('この条件で画像を追加…',()=>{source.scrollIntoView({block:'start'});folder.focus({preventScroll:true});}));
        comparison.replaceChildren();
        showResult(comparison,result);
        comparison.append(folderPreview);
        current.append(comparison);
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
        copy.disabled = previewCopy.disabled = !data || !chosen?.file || importing || loading || scanning;
    }
    function updatePreview() {
        previewImage.removeAttribute('src');
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = chosen?.file ? URL.createObjectURL(chosen.file) : undefined;
        folderPreview.hidden = !chosen;
        if (chosen) {
            previewImage.alt = chosen.name;
            previewName.textContent = chosen.path;
        }
        if (previewUrl) {
            previewImage.src = previewUrl;
        }
        updateImport();
    }
    function selectFile(file) {
        chosen = file;
        updatePreview();
        if (file) {
            previewTitle.focus({preventScroll:true});
            comparison.scrollIntoView({block:'nearest'});
        }
    }
    function thumbnailUrl(name) {
        return '/portrait-thumbnail?name=' + encodeURIComponent(name) + '&v=' + (versions.get(name) ?? 0);
    }
    function reloadPortraits(names) {
        const stamp = Date.now();
        for (const img of host.querySelectorAll('img[data-portrait]')) {
            const name = img.dataset.portrait;
            if (names && !names.has('*') && !names.has(name)) continue;
            versions.set(name, stamp);
            img.src = thumbnailUrl(name);
        }
    }
    function updateVisibility() {
        if (host.hidden || document.hidden) {
            stream?.close();
            stream = undefined;
            clearInterval(poll);
            poll = undefined;
            return;
        }
        if (!stream) {
            stream = new EventSource('/portrait-changes');
            stream.onopen = () => { versions.clear(); reloadPortraits(); };
            stream.onmessage = e => reloadPortraits(new Set(JSON.parse(e.data)));
        }
        if (!sourceDirectory || !files.length) {
            clearInterval(poll);
            poll = undefined;
        } else if (!poll) {
            poll = setInterval(refreshFolderFiles, 2000);
            refreshFolderFiles();
        }
    }
    async function latestFile(entry) {
        return entry.dir ? (await entry.dir.getFileHandle(entry.name)).getFile() : entry.file;
    }
    function updateTile(entry) {
        const tile = tiles.get(entry);
        if (!tile) return;
        if (tile.url) URL.revokeObjectURL(tile.url);
        tile.url = entry.file && URL.createObjectURL(entry.file);
        if (tile.url) tile.img.src = tile.url;
        else tile.img.removeAttribute('src');
    }
    async function refreshFolderFiles() {
        const list = files;
        if (readingFolder === list || host.hidden || document.hidden) return;
        readingFolder = list;
        try {
            const entries = new Set(tiles.keys());
            if (chosen) entries.add(chosen);
            await Promise.all([...entries].filter(entry => entry.dir).map(async entry => {
                let file;
                try { file = await latestFile(entry); }
                catch (error) {
                    if (files !== list) return;
                    if (error.name !== 'NotFoundError') { importNote.textContent = error.message; return; }
                }
                if (files !== list) return;
                if (entry.file?.lastModified === file?.lastModified && entry.file?.size === file?.size) return;
                entry.file = file;
                updateTile(entry);
                if (chosen === entry) updatePreview();
            }));
        } finally {
            if (readingFolder === list) readingFolder = undefined;
        }
    }
    function renderFiles() {
        for (const tile of tiles.values()) if (tile.url) URL.revokeObjectURL(tile.url);
        tiles.clear();
        gallery.replaceChildren();
        if (!files.length) {
            gallery.append(element('p','PNG画像のあるフォルダを選択してください。','hint'));
            return;
        }
        const pages = Math.ceil(files.length/folderPageSize);
        const nav = element('div',undefined,'branch-tools');
        const prev = button('前へ', () => { filePage--; renderFiles(); });
        const next = button('次へ', () => { filePage++; renderFiles(); });
        prev.disabled = filePage === 0;
        next.disabled = filePage + 1 >= pages;
        nav.append(prev,element('span',`${filePage+1} / ${pages}（${files.length}枚）`),next);
        const list = element('div',undefined,'branch-files');
        for (const file of files.slice(filePage * folderPageSize, (filePage + 1) * folderPageSize)) {
            const tile = button('', () => {
                const next = chosen === file ? undefined : file;
                for (const item of list.children) item.setAttribute('aria-pressed', String(item === tile && !!next));
                selectFile(next);
            });
            const img = element('img');
            img.loading = 'lazy';
            img.alt = '';
            tiles.set(file, {img});
            updateTile(file);
            tile.setAttribute('aria-pressed', String(chosen === file));
            tile.append(img,element('span', file.path));
            list.append(tile);
        }
        gallery.append(nav,list);
        refreshFolderFiles();
    }
    async function scanDirectory(directory, preserve) {
        if (scanning) return;
        scanning = true;
        const picker = fileLabel.querySelector('button, input');
        picker.disabled = reloadFolder.disabled = true;
        updateImport();
        try {
            const entries = [];
            async function collect(dir, prefix) {
                for await (const handle of dir.values()) {
                    const path = prefix + '/' + handle.name;
                    if (handle.kind === 'directory') await collect(handle, path);
                    else if (/\.png$/i.test(handle.name)) entries.push({name:handle.name, path, dir});
                }
            }
            await collect(directory, directory.name);
            sourceDirectory = directory;
            setFolder(entries, preserve);
            importNote.textContent = '';
        } catch (error) {
            if (!preserve) fileLabel.replaceChildren('素材フォルダ ', folder);
            importNote.textContent = '素材フォルダを読み込めませんでした。' + error.message;
        } finally {
            scanning = false;
            picker.disabled = false;
            reloadFolder.disabled = !folderSelected;
            updateImport();
        }
    }
    function setFolder(entries, preserve) {
        files = entries.sort((a,b) => a.path.localeCompare(b.path));
        const previousPath = preserve ? chosen?.path : undefined;
        chosen = files.find(file => file.path === previousPath);
        filePage = preserve ? Math.min(filePage, Math.max(0, Math.ceil(files.length / folderPageSize) - 1)) : 0;
        folderSelected = true;
        reloadFolder.disabled = false;
        updatePreview();
        renderFiles();
        updateVisibility();
    }
    folder.onchange = () => {
        if (!folder.files.length) return;
        const entries = Array.from(folder.files).filter(f => /\.png$/i.test(f.name))
            .map(file => ({file, name:file.name, path:file.webkitRelativePath || file.name}));
        const sameFolder = !sourceDirectory && files[0]?.path.split('/')[0] === folder.files[0].webkitRelativePath.split('/')[0];
        sourceDirectory = undefined;
        setFolder(entries, sameFolder);
    };
    hover.onchange=updateImport;
    async function upload() {
        if (!chosen?.file || !data || importing || loading || scanning) return;
        importing = true;
        updateImport();
        importNote.textContent = '画像を追加しています…';
        const q = params();
        const request = revision;
        q.set('hover', hover.checked ? '1' : '0');
        q.set('name', data.filenames[Number(hover.checked)]);
        try {
            const r = await fetch('/api/portrait-import?' + q, {
                method: 'POST', headers: {'X-Editor-Token': token, 'Content-Type':'image/png'}, body: await latestFile(chosen),
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
    document.addEventListener('visibilitychange', updateVisibility);
    return { refresh, updateVisibility };
}
