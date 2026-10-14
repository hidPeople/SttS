/** Platform-neutral JSON storage contract; native hosts may implement it directly. */
export interface JsonStorage {
  read(): Promise<string | null>;
  write(contents: string): Promise<void>;
  remove(): Promise<void>;
}

type HostState = { protocol: string; exists: boolean; contents: string | null; token: string; code?: string };
const storageError = (code = 'StorageUnavailable', cause?: unknown) => Object.assign(new Error(code), { code, cause });
const transportCode = (error: unknown) => (error as { name?: string })?.name === 'AbortError' ? 'StorageTimeout' : 'StorageNetworkError';

/** Local Vite host persists outside private-browser profiles and origin/port changes.
 * Static web hosting retains the browser adapter; packaged hosts can inject native I/O. */
export async function hostedJsonStorage(
  endpoint: string, protocol: string, browser: JsonStorage,
  request: typeof fetch = fetch, requireHost = import.meta.env.DEV,
  options: { keepalive?: boolean; timeoutMs?: number } = {},
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
    } catch (error) {
      if ((error as { code?: string })?.code) throw error;
      if (error instanceof SyntaxError) throw storageError('SyntaxError', error);
      throw storageError(transportCode(error), error);
    } finally { clearTimeout(timeout); }
  };
  let state = await inspect();
  if (!state) {
    if (requireHost) throw storageError();
    return browser;
  }
  const mutate = async (method: 'PUT' | 'DELETE', contents?: string) => {
    // keepalive has an aggregate in-flight quota, not a per-request quota. Never
    // use it for run saves; only small settings/history writes need unload delivery.
    const background = options.keepalive === true && (!contents || new TextEncoder().encode(contents).length < 60 * 1024);
    const send = async (keepalive = background): Promise<{ status: number; ok: boolean; code?: string }> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 30000);
      try {
        const response = await request(endpoint, {
          method, headers: { Authorization: `Bearer ${state!.token}`, 'Content-Type': 'application/json' },
          body: contents, cache: 'no-store', keepalive, signal: controller.signal,
        });
        // Consume successful replies too, so completed keepalive requests release their quota.
        const body = await response.json().catch(() => ({})) as { code?: string };
        const fallback = response.status === 413 ? 'QuotaExceededError'
          : response.status === 403 ? 'SecurityError' : response.status === 404 ? 'StorageUnavailable' : 'StorageHostError';
        return { status: response.status, ok: response.ok, code: body.code ?? fallback };
      } catch (error) {
        if (keepalive && (error as { name?: string })?.name === 'TypeError') return send(false);
        throw storageError(transportCode(error), error);
      } finally { clearTimeout(timeout); }
    };
    try {
      let response = await send();
      if (response.status === 403) {
        const fresh = await inspect();
        if (!fresh) throw storageError();
        state = fresh; response = await send();
      }
      if (!response.ok) throw storageError(response.code);
    } catch (error) {
      // A lost reply does not prove that the atomic write failed. Confirm the
      // authoritative file before reporting failure; never blindly overwrite it.
      if (['StorageNetworkError', 'StorageTimeout'].includes(String((error as { code?: string })?.code))) {
        const fresh = await inspect().catch(() => undefined);
        if (fresh?.exists && fresh.contents === (method === 'DELETE' ? null : contents)) { state = fresh; return; }
      }
      throw error;
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

