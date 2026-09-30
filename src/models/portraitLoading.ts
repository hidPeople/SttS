/** Keeps the displayed portrait intact while the newest requested image loads. */
export class PortraitLoading {
  private desired?: string;
  private shown?: string;
  private revision = 0;
  private disposed = false;
  private warmed = new Set<string>();

  constructor(
    private ready: (id: string) => boolean,
    private load: (ids: string[]) => Promise<boolean>,
    private display: (id?: string) => void,
    initial?: string,
  ) { this.desired = this.shown = initial; }

  prefetch(ids: readonly string[]): void {
    if (this.disposed) return;
    const missing = [...new Set(ids)].filter(id => !this.ready(id) && !this.warmed.has(id));
    if (!missing.length) return;
    missing.forEach(id => this.warmed.add(id));
    void this.load(missing).catch(error => console.error('Portrait preload failed:', error));
  }

  show(id: string | undefined, companions: readonly string[] = []): void {
    this.prefetch(companions.filter(candidate => candidate !== id));
    if (this.disposed || this.desired === id) return;
    this.desired = id;
    const revision = ++this.revision;
    const apply = () => {
      if (this.disposed || revision !== this.revision || id === this.shown) return;
      this.shown = id;
      this.display(id);
    };
    if (!id || this.ready(id)) { apply(); return; }
    // Await only the foreground image; a slow hover variant must not delay it.
    void this.load([id]).then(success => { if (success) apply(); }).catch(error => console.error('Portrait load failed:', error));
  }

  dispose(): void { this.disposed = true; this.revision++; this.warmed.clear(); }
}
