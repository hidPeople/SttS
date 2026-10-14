// Development/preview host only. The production game bundle never imports Node I/O.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';

export function settingsDirectory(platform = process.platform, env = process.env, home = os.homedir()) {
  const base = platform === 'win32' ? env.LOCALAPPDATA || path.join(home, 'AppData', 'Local')
    : env.XDG_DATA_HOME || path.join(home, '.local', 'share');
  return path.join(base, 'SttS', 'preferences');
}

export function runSavesDirectory() {
  return path.join(path.dirname(settingsDirectory()), 'saves');
}

export function createSettingsMiddleware(directory = settingsDirectory()) {
  return createJsonFileMiddleware({ directory, filename: 'user-settings.json', endpoint: '/__stts/user-settings',
    protocol: 'stts.user-settings-file.v1', maxBytes: 2 * 1024 * 1024,
    valid: parsed => parsed.settings && typeof parsed.settings === 'object' && !Array.isArray(parsed.settings) });
}

export function createRunSavesMiddleware(directory = runSavesDirectory()) {
  return createJsonFileMiddleware({ directory, filename: 'run-saves.json', endpoint: '/__stts/run-saves',
    protocol: 'stts.run-saves-file.v1', maxBytes: 64 * 1024 * 1024,
    valid: parsed => Array.isArray(parsed.slots) });
}

function createJsonFileMiddleware({ directory, filename: name, endpoint, protocol, maxBytes, valid }) {
  const filename = path.join(directory, name);
  const token = randomUUID();
  let writes = Promise.resolve();
  const read = async () => {
    try {
      const contents = await fs.readFile(filename, 'utf8');
      // A null tombstone prevents old browser copies from resurrecting erased history.
      return { exists: true, contents: contents.trim() === 'null' ? null : contents };
    } catch (error) {
      if (error.code === 'ENOENT') return { exists: false, contents: null };
      throw error;
    }
  };
  const write = contents => writeAtomicJson(filename, contents);
  return async (req, res, next) => {
    if (req.url?.split('?')[0] !== endpoint) { next(); return; }
    const send = (status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ protocol, ...body }));
    };
    // Loopback only; no CORS and a per-server bearer token for mutations. Web pages
    // cannot write local files by posting forms or rebinding a remote host name.
    const remote = req.socket.remoteAddress;
    const host = req.headers.host ?? '';
    const local = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host);
    if (!local || !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote)
      || (req.headers.origin && req.headers.origin !== `http://${host}` && req.headers.origin !== `https://${host}`)
      || req.headers['sec-fetch-site'] === 'cross-site') {
      send(403, { code: 'SecurityError' }); return;
    }
    try {
      if (req.method === 'GET') {
        await writes;
        send(200, { ...await read(), token }); return;
      }
      if (!['PUT', 'DELETE'].includes(req.method)) { send(405, { code: 'EINVAL' }); return; }
      if (req.headers.authorization !== `Bearer ${token}`) { send(403, { code: 'SecurityError' }); return; }
      let contents = 'null';
      if (req.method === 'PUT') {
        const chunks = []; let size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > maxBytes) { send(413, { code: 'QuotaExceededError' }); return; }
          chunks.push(chunk);
        }
        contents = Buffer.concat(chunks).toString('utf8');
        const parsed = JSON.parse(contents);
        if (!Number.isInteger(parsed?.version) || parsed.version < 1 || !valid(parsed)) {
          send(400, { code: 'SyntaxError' }); return;
        }
      }
      const operation = writes.then(() => write(contents));
      writes = operation.catch(() => {});
      await operation;
      send(200, {});
    } catch (error) {
      const code = error.code || error.name || 'EIO';
      console.warn(`[${protocol}] ${req.method} failed (${code})`, error.message);
      send(500, { code });
    }
  };
}

/** Same-directory replacement leaves the old file intact until the new data is flushed.
 * Windows antivirus/indexing can briefly lock the destination: retry only those errors.
 * Native storage adapters should preserve this contract and OS error codes. */
export async function writeAtomicJson(filename, contents, io = fs, pause = ms => new Promise(resolve => setTimeout(resolve, ms))) {
  await io.mkdir(path.dirname(filename), { recursive: true });
  const temporary = filename + '.' + randomUUID() + '.tmp';
  try {
    const handle = await io.open(temporary, 'wx', 0o600);
    try { await handle.writeFile(contents, 'utf8'); await handle.sync(); }
    finally { await handle.close(); }
    const delays = [40, 100, 200];
    for (let attempt = 0; ; attempt++) {
      try { await io.rename(temporary, filename); break; }
      catch (error) {
        if (!['EBUSY', 'EPERM', 'EACCES'].includes(error.code) || attempt >= delays.length) throw error;
        await pause(delays[attempt]);
      }
    }
  } finally {
    // Do not replace the real error (or report a committed write as failed) when
    // antivirus holds the abandoned temp file during best-effort cleanup.
    await io.rm(temporary, { force: true }).catch(error => console.warn('Save temp cleanup failed:', error.code));
  }
}

export function userSettingsFilePlugin() {
  return {
    name: 'stts-local-storage',
    configureServer(server) { server.middlewares.use(createSettingsMiddleware()); server.middlewares.use(createRunSavesMiddleware()); },
    configurePreviewServer(server) { server.middlewares.use(createSettingsMiddleware()); server.middlewares.use(createRunSavesMiddleware()); },
  };
}
