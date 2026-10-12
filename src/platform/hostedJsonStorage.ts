/** Platform-neutral JSON storage contract; native hosts may implement it directly. */
export interface JsonStorage {
  read(): Promise<string | null>;
  write(contents: string): Promise<void>;
  remove(): Promise<void>;
}

type HostState = { protocol: string; exists: boolean; contents: string | null; token: string; code?: string };
const storageError = (code = 'StorageUnavailable') => Object.assign(new Error(code), { code });

/** Local Vite host persists outside private-browser profiles and origin/port changes.
 * Static web hosting retains the browser adapter; packaged hosts can inject native I/O. */
export async function hostedJsonStorage(
  endpoint: string, protocol: string, browser: JsonStorage,
  request: typeof fetch = fetch, requireHost = import.meta.env.DEV,
): Promise<JsonStorage> {
  const inspect = async (): Promise<HostState | undefined> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    try {
      const response = await request(endpoint, { cache: 'no-store', signal: controller.signal });
      if (response.status === 404 || (response.ok && !response.headers.get('content-type')?.includes('application/json'))) return undefined;
      if (!response.headers.get('content-type')?.includes('application/json')) throw storageError();
      const state = await response.json() as HostState;
      if (!response.ok) throw storageError(state.code);
      if (state.protocol !== protocol) return undefined;
      if (typeof state.token !== 'string' || typeof state.exists !== 'boolean'
        || (state.contents !== null && typeof state.contents !== 'string')) throw storageError('SyntaxError');
      return state;
    } finally { clearTimeout(timeout); }
  };
  let state = await inspect();
  if (!state) {
    if (requireHost) throw storageError();
    return browser;
  }
  const mutate = async (method: 'PUT' | 'DELETE', contents?: string) => {
    const send = () => request(endpoint, {
      method, headers: { Authorization: `Bearer ${state!.token}`, 'Content-Type': 'application/json' },
      body: contents, cache: 'no-store',
      // Keep small history writes alive when the tab is closed; larger imports
      // use normal fetch to avoid the browser's 64 KiB keepalive quota.
      keepalive: !contents || new TextEncoder().encode(contents).length < 60 * 1024,
    });
    let response = await send();
    if (response.status === 403) {
      // Restarting the development server rotates its token, not the save file.
      const fresh = await inspect();
      if (!fresh) throw storageError();
      state = fresh; response = await send();
    }
    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as { code?: string };
      throw storageError(error.code);
    }
  };
  const mirror = async (contents: string | null) => {
    try { if (contents === null) await browser.remove(); else await browser.write(contents); }
    catch { /* The host file is authoritative even when browser storage is unavailable. */ }
  };
  return {
    async read() {
      if (!state!.exists) {
        // One-time migration from the current origin. Never import an old browser
        // copy over an existing host file or an explicit all-data deletion.
        let legacy: string | null = null;
        try { legacy = await browser.read(); } catch { /* No usable browser copy. */ }
        if (legacy) { await mutate('PUT', legacy); state = { ...state!, exists: true, contents: legacy }; }
      }
      await mirror(state!.contents);
      return state!.contents;
    },
    async write(contents) {
      await mutate('PUT', contents);
      state = { ...state!, exists: true, contents };
      await mirror(contents);
    },
    async remove() {
      await mutate('DELETE');
      state = { ...state!, exists: true, contents: null };
      await mirror(null);
    },
  };
}

