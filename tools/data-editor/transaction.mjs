import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { hash } from './schema.mjs';
export async function atomicWrite(file, text) {
    await fs.mkdir(path.dirname(file), { recursive: true });
    const temporary = `${file}.${process.pid}.tmp`;
    await fs.writeFile(temporary, text);
    await fs.rename(temporary, file);
}
export async function safeFile(root, relative) {
    if (typeof relative !== 'string' || !(relative === 'src/models/types.ts' || /^src\/data\/(?:[\w-]+\/)*[\w-]+\.ts$/.test(relative)))
        throw Error('src/data と対応する src/models/types.ts だけを編集できます。');
    const realRoot = await fs.realpath(root), realFile = await fs.realpath(path.resolve(root, relative));
    const resolvedRelative = path.relative(realRoot, realFile).replaceAll('\\', '/');
    if (!(resolvedRelative === 'src/models/types.ts' || /^src\/data\/(?:[\w-]+\/)*[\w-]+\.ts$/.test(resolvedRelative)))
        throw Error('編集対象が許可されたデータ領域外を参照しています。');
    return realFile;
}
export function runBuild(root, timeoutMs = 180000) {
    return new Promise(resolve => {
        const child = process.platform === 'win32'
            ? spawn(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', 'npm run build'], { cwd: root, windowsHide: true })
            : spawn('npm', ['run', 'build'], { cwd: root });
        let log = '', timedOut = false;
        const capture = data => { log = (log + data.toString()).slice(-4000000); };
        child.stdout.on('data', capture);
        child.stderr.on('data', capture);
        const timer = setTimeout(() => {
            timedOut = true;
            if (process.platform === 'win32')
                spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true });
            else
                child.kill('SIGKILL');
        }, timeoutMs);
        child.on('error', error => { clearTimeout(timer); resolve({ ok: false, log: log + '\n' + error.message }); });
        child.on('close', code => {
            clearTimeout(timer);
            const plain = log.replace(/\x1b\[[0-9;]*m/g, '');
            // Both the actual command and Vite's completion text must accompany exit code zero.
            const marker = /built in\s+[\d.]+\s*(?:ms|s)/.test(plain) && /tsc\s*&&\s*vite build/.test(plain);
            resolve({ ok: code === 0 && marker && !timedOut, log: plain + (timedOut ? '\nビルドがタイムアウトしました。' : !marker ? '\n想定したビルド完了ワードを確認できませんでした。' : ''), code });
        });
    });
}
export class Transactions {
    constructor(root, toolRoot, build = runBuild) { this.root = root; this.directory = path.join(toolRoot, 'backups'); this.build = build; this.busy = false; this.blocked = []; }
    async restore(directory, journal) {
        const conflicts = [];
        for (const item of journal.files) {
            let target, current;
            try {
                target = await safeFile(this.root, item.file);
                current = await fs.readFile(target, 'utf8');
            } catch {
                // External deletion, relocation or a changed link needs manual reconciliation.
                conflicts.push(item.file);
                continue;
            }
            if (hash(current) === item.originalHash)
                continue;
            if (hash(current) !== item.appliedHash) {
                conflicts.push(item.file);
                continue;
            }
            const backup = await fs.readFile(path.join(directory, item.file), 'utf8');
            if (hash(backup) !== item.originalHash)
                throw Error(`バックアップの整合性エラー: ${item.file}`);
            await atomicWrite(target, backup);
        }
        journal.status = conflicts.length ? 'restore-conflict' : 'restored';
        journal.conflicts = conflicts;
        await atomicWrite(path.join(directory, 'journal.json'), JSON.stringify(journal, null, 2));
        this.blocked = conflicts;
        return conflicts;
    }
    async recover() {
        await fs.mkdir(this.directory, { recursive: true });
        const reports = [];
        for (const name of (await fs.readdir(this.directory)).sort()) {
            const directory = path.join(this.directory, name);
            let journal;
            try {
                journal = JSON.parse(await fs.readFile(path.join(directory, 'journal.json'), 'utf8'));
            }
            catch {
                continue;
            }
            if (['prepared', 'building', 'restore-conflict'].includes(journal.status)) {
                const conflicts = await this.restore(directory, journal);
                reports.push({ backup: directory, conflicts });
            }
        }
        this.blocked = reports.flatMap(r => r.conflicts);
        return reports;
    }
    async apply(drafts) {
        if (this.busy)
            throw Error('別の適用処理が進行中です。');
        if (this.blocked.length)
            throw Error(`復元時に外部変更を検出しました。バックアップと比較して解消し再起動してください: ${this.blocked.join(', ')}`);
        this.busy = true;
        let directory, journal;
        try {
            const entries = Object.entries(drafts).filter(([, d]) => d.source !== d.base);
            if (!entries.length)
                return { ok: true, log: '変更はありません。', unchanged: true };
            for (const [file, draft] of entries) {
                const target = await safeFile(this.root, file);
                if (hash(await fs.readFile(target, 'utf8')) !== hash(draft.base))
                    throw Error(`外部変更を検出しました: ${file}。入力は保持しています。最新ソースと比較してください。`);
            }
            directory = path.join(this.directory, `${new Date().toISOString().replaceAll(/[:.]/g, '-')}-${process.pid}`);
            journal = { status: 'preparing', createdAt: new Date().toISOString(), files: [] };
            for (const [file, draft] of entries) {
                await atomicWrite(path.join(directory, file), draft.base);
                journal.files.push({ file, originalHash: hash(draft.base), appliedHash: hash(draft.source) });
            }
            journal.status = 'prepared';
            await atomicWrite(path.join(directory, 'journal.json'), JSON.stringify(journal, null, 2));
            for (const [file, draft] of entries) {
                const target = await safeFile(this.root, file);
                if (hash(await fs.readFile(target, 'utf8')) !== hash(draft.base))
                    throw Error(`適用直前に外部変更: ${file}`);
                await atomicWrite(target, draft.source);
            }
            journal.status = 'building';
            await atomicWrite(path.join(directory, 'journal.json'), JSON.stringify(journal, null, 2));
            const result = await this.build(this.root);
            await atomicWrite(path.join(directory, 'build.log'), result.log);
            // Catch saves by an external editor while the build was running.
            for (const item of journal.files)
                if (hash(await fs.readFile(await safeFile(this.root, item.file), 'utf8')) !== item.appliedHash)
                    result.ok = false;
            if (!result.ok) {
                const conflicts = await this.restore(directory, journal);
                return { ...result, backup: directory, restored: !conflicts.length, conflicts };
            }
            journal.status = 'committed';
            await atomicWrite(path.join(directory, 'journal.json'), JSON.stringify(journal, null, 2));
            return { ...result, backup: directory };
        }
        catch (error) {
            if (directory && journal && ['prepared', 'building'].includes(journal.status)) {
                const conflicts = await this.restore(directory, journal);
                return { ok: false, log: error.stack, backup: directory, restored: !conflicts.length, conflicts };
            }
            throw error;
        }
        finally {
            this.busy = false;
        }
    }
}
