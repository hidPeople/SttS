import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const stateFile = path.join(root, 'scripts/windows-release.json');
const releases = path.join(root, 'windows-releases');
if (process.platform !== 'win32' || process.arch !== 'x64') throw new Error('Use x64 Windows and x64 Node.js.');
const args = process.argv.slice(2);
if (args.length && !(args.length === 2 && args[0] === '--series' && /^(0|[1-9]\d*)\.\d{2}$/.test(args[1]))) {
  throw new Error('Usage: npm run release:windows [-- --series X.YY]');
}
fs.mkdirSync(releases, { recursive: true });
const lock = path.join(releases, '.build-lock');
fs.mkdirSync(lock);
try {
  const previous = JSON.parse(fs.readFileSync(stateFile, 'utf8')).lastRelease;
  if (!/^(0|[1-9]\d*)\.\d{2}\.\d{2}$/.test(previous)) throw new Error('Invalid lastRelease.');
  const [major, minor, patch] = previous.split('.').map(Number);
  const [x, y] = args.length ? args[1].split('.').map(Number) : [major, minor];
  if (x < major || (x === major && y < minor)) throw new Error('Release series cannot go backwards.');
  const z = patch + 1;
  if (z > 99) throw new Error('ZZ exceeds two digits. Decide the next numbering rule before publishing.');
  const version = [x, y, z].join('.');
  const label = [x, ...[y, z].map(n => String(n).padStart(2, '0'))].join('.');
  const output = path.join(releases, 'Ver' + label);
  if (fs.existsSync(output)) throw new Error('Release already exists: ' + output);
  for (const directory of ['image/card', 'image/character', 'image/background', 'image/event', 'bgm']) {
    if (!fs.readdirSync(path.join(root, directory)).some(file => /\.(png|webp|mp3|ogg|wav)$/i.test(file))) {
      throw new Error('Missing release assets: ' + directory);
    }
  }
  const cargoBin = path.join(os.homedir(), '.cargo', 'bin');
  const env = { ...process.env, Path: cargoBin + path.delimiter + process.env.Path,
    CARGO_TARGET_DIR: path.join(root, 'src-tauri/target') };
  const config = { version, app: { windows: [
    { ...JSON.parse(fs.readFileSync(path.join(root, 'src-tauri/tauri.conf.json'), 'utf8')).app.windows[0],
      title: 'SttS Ver' + label },
  ] } };
  // Passing a config file also works under Windows paths with spaces; no shell quoting.
  const configFile = path.join(lock, 'version.json');
  fs.writeFileSync(configFile, JSON.stringify(config));
  const result = spawnSync(process.execPath, [
    path.join(root, 'node_modules/@tauri-apps/cli/tauri.js'), 'build', '--ci', '--bundles', 'nsis', '--config', configFile,
  ], { cwd: root, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('Windows build failed.');
  const installer = path.join(env.CARGO_TARGET_DIR, 'release/bundle/nsis', 'SttS_' + version + '_x64-setup.exe');
  const stage = path.join(lock, 'ready');
  fs.mkdirSync(stage);
  const name = 'SttS-Ver' + label + '-Windows-x64-Setup.exe';
  fs.copyFileSync(installer, path.join(stage, name), fs.constants.COPYFILE_EXCL);
  fs.renameSync(stage, output);
  const nextState = stateFile + '.tmp';
  fs.writeFileSync(nextState, JSON.stringify({ lastRelease: label }, null, 2) + '\n');
  fs.renameSync(nextState, stateFile);
  console.log('Installer: ' + path.join(output, name));
} finally {
  fs.rmSync(lock, { recursive: true, force: true });
}
