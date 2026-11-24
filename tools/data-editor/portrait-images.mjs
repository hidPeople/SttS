import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { galleryThumbnail } from '../gallery-thumbnail.mjs';

const pending = new Map();

export async function portraitThumbnail(root, name) {
    if (!name || !/^[^/\\:]+\.png$/i.test(name)) throw Error('立ち絵名が不正です。');
    const base = await fs.realpath(path.join(root, 'image/character'));
    const source = await fs.realpath(path.join(base, name));
    if (!source.startsWith(base + path.sep)) throw Error('立ち絵の参照先が不正です。');
    const directory = path.join(root, 'image/gallery-thumbnails/character');
    const target = path.join(directory, name.slice(0,-4) + '.webp');
    if (!pending.has(target)) pending.set(target, update().finally(() => pending.delete(target)));
    await pending.get(target);
    return fs.readFile(target);

    async function update() {
        const original = await fs.stat(source);
        const cached = await fs.lstat(target).catch(error => {
            if (error.code !== 'ENOENT') throw error;
        });
        if (cached && !cached.isFile()) throw Error('サムネイルの保存先が不正です。');
        if (cached && cached.mtimeMs >= Math.max(original.mtimeMs, original.ctimeMs)) return;
        await fs.mkdir(directory, {recursive:true});
        const temp = path.join(directory, randomUUID() + '.tmp');
        try {
            const bytes = await fs.readFile(source);
            await (await galleryThumbnail(bytes)).toFile(temp);
            const latest = await fs.stat(source);
            if (latest.ctimeMs !== original.ctimeMs || latest.mtimeMs !== original.mtimeMs || latest.size !== original.size)
                throw Error('立ち絵を更新中です。');
            await fs.rename(temp, target);
        } finally {
            await fs.rm(temp, {force:true});
        }
    }
}
