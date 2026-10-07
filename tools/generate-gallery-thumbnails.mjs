import { mkdir, readdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const targetRoot = path.join(root, 'image', 'gallery-thumbnails');
const sources = [
  [path.join(root, 'image', 'character'), path.join(targetRoot, 'character')],
  [path.join(root, 'image', 'event'), path.join(targetRoot, 'event')],
  [path.join(root, 'image', 'background'), path.join(targetRoot, 'background')],
];
const check = process.argv.includes('--check');

async function filesWithExtension(directory, extension) {
  try {
    return (await readdir(directory, { withFileTypes: true }))
      .filter(entry => entry.isFile() && path.extname(entry.name).toLowerCase() === extension)
      .map(entry => path.join(directory, entry.name));
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
}

async function expectedSize(source) {
  const metadata = await sharp(source).metadata();
  if (!metadata.width || !metadata.height) throw new Error(`Cannot read image dimensions: ${source}`);
  return { width: Math.max(1, Math.floor(metadata.width / 3)), height: Math.max(1, Math.floor(metadata.height / 3)) };
}

async function needsUpdate(source, target) {
  try {
    const [sourceStat, targetStat, expected, metadata] = await Promise.all([
      stat(source), stat(target), expectedSize(source), sharp(target).metadata(),
    ]);
    return targetStat.mtimeMs < sourceStat.mtimeMs
      || metadata.format !== 'webp'
      || metadata.width !== expected.width
      || metadata.height !== expected.height;
  } catch (error) {
    if (error?.code === 'ENOENT') return true;
    return true;
  }
}

const pending = [];
const stale = [];
for (const [sourceDirectory, targetDirectory] of sources) {
  const sourceFiles = await filesWithExtension(sourceDirectory, '.png');
  const targetFiles = await filesWithExtension(targetDirectory, '.webp');
  const sourceByStem = new Map(sourceFiles.map(file => [path.basename(file, '.png'), file]));
  for (const [stem, source] of sourceByStem) {
    const target = path.join(targetDirectory, `${stem}.webp`);
    if (await needsUpdate(source, target)) pending.push({ source, target });
  }
  for (const target of targetFiles) {
    if (!sourceByStem.has(path.basename(target, '.webp'))) stale.push(target);
  }
}

const relative = file => path.relative(root, file).replaceAll('\\', '/');
if (check) {
  pending.forEach(({ source }) => console.log(`MISSING_OR_OUTDATED: ${relative(source)}`));
  stale.forEach(target => console.log(`STALE: ${relative(target)}`));
  if (pending.length || stale.length) {
    console.log('Run: npm run gallery-thumbnails');
    process.exitCode = 1;
  } else console.log('Gallery thumbnails are in sync.');
} else {
  for (const { source, target } of pending) {
    const { width, height } = await expectedSize(source);
    await mkdir(path.dirname(target), { recursive: true });
    await sharp(source).resize(width, height, { fit: 'fill' }).webp({ quality: 65, alphaQuality: 75, effort: 6 }).toFile(target);
    console.log(`GENERATED: ${relative(target)}`);
  }
  for (const target of stale) {
    await unlink(target);
    console.log(`DELETED: ${relative(target)}`);
  }
  console.log(`Gallery thumbnails synchronized: ${pending.length} generated, ${stale.length} deleted.`);
}
