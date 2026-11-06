import { AUDIO_SETTINGS, BGM_BINDINGS, BGM_TRACKS, type BgmTrack } from '../data/bgm';

export type BgmSelection = string | null;
export interface BgmVoice { stop(): void; fadeOut(seconds: number): Promise<void> }
/** Native exe output can replace Web Audio without changing scene/data code. */
export interface BgmOutput {
  load(url: string, signal: AbortSignal): Promise<unknown>;
  play(buffer: unknown, loop: BgmTrack, offset?: number): BgmVoice;
  volume(value: number): void;
  pause(paused: boolean): void;
  unlock(): void;
  dispose(): void;
}
export function battleBgm(stage: number, threat: number, eventId?: string): BgmSelection {
  const event = eventId ? BGM_BINDINGS.eventBattles[eventId] : undefined;
  return event !== undefined ? event : BGM_BINDINGS.stageBattles[stage]?.[threat] !== undefined
    ? BGM_BINDINGS.stageBattles[stage][threat] : BGM_BINDINGS.battleThreats[threat] !== undefined
      ? BGM_BINDINGS.battleThreats[threat] : BGM_BINDINGS.battleDefault;
}
export function conversationBgm(id: string, pages: readonly { bgm?: BgmSelection }[], index: number): BgmSelection | undefined {
  let selection = BGM_BINDINGS.conversations[id];
  for (const page of pages.slice(0, index + 1)) if (page.bgm !== undefined) selection = page.bgm;
  return selection;
}
export type BgmState = { id: BgmSelection; status: 'stopped' | 'loading' | 'playing' | 'error'; error?: string };

export class BgmPlayer {
  private generation = 0;
  private controller?: AbortController;
  private voice?: BgmVoice;
  private outgoing = new Set<BgmVoice>();
  private listeners = new Set<(state: BgmState) => void>();
  private menuSelection?: BgmSelection;
  state: BgmState = { id: null, status: 'stopped' };
  constructor(private output: BgmOutput, readonly assets: Record<string, string>, private tracks = BGM_TRACKS,
    private settings = AUDIO_SETTINGS) {}

  subscribe(listener: (state: BgmState) => void): () => void {
    this.listeners.add(listener); return () => { this.listeners.delete(listener); };
  }
  private emit(state: BgmState): void { this.state = state; this.listeners.forEach(listener => listener(state)); }
  enterMenu(): void { void this.play(this.menuSelection === undefined ? BGM_BINDINGS.title : this.menuSelection); }
  audition(id: BgmSelection, restart = false): void { this.menuSelection = id; void this.play(id, restart); }
  unlock(): void { this.output.unlock(); }
  preferences(audio: { master: number; bgm: number; pauseOnBlur: boolean }, unfocused: boolean): void {
    const level = (n: number) => Math.max(0, Math.min(this.settings.maxVolume, n)) / this.settings.maxVolume;
    this.output.volume(level(audio.master) * level(audio.bgm));
    this.output.pause(audio.pauseOnBlur && unfocused);
  }
  async play(id: BgmSelection, restart = false, offset = 0): Promise<void> {
    if (!restart && id === this.state.id && this.state.status !== 'error') return;
    const generation = ++this.generation;
    this.controller?.abort();
    const controller = this.controller = new AbortController();
    // Cancel an earlier transition immediately so no two previous songs can linger.
    this.outgoing.forEach(voice => voice.stop()); this.outgoing.clear();
    const previous = this.voice; this.voice = undefined;
    const faded = previous ? (this.outgoing.add(previous), previous.fadeOut(this.settings.fadeOutSeconds)
      .finally(() => { previous.stop(); this.outgoing.delete(previous); })) : Promise.resolve();
    this.emit({ id, status: id === null ? 'stopped' : 'loading' });
    if (id === null) { await faded; return; }
    let buffer: unknown;
    try {
      const url = this.assets[id];
      if (!url) throw new Error(`BGM file not found: ${id}`);
      for (let attempt = 0; ; attempt++) {
        try { buffer = await this.output.load(url, controller.signal); break; }
        catch (error) {
          if (controller.signal.aborted || attempt >= this.settings.retryCount) throw error;
          await new Promise<void>(resolve => {
            const done = () => { clearTimeout(timer); controller.signal.removeEventListener('abort', done); resolve(); };
            const timer = setTimeout(done, this.settings.retryDelayMs); controller.signal.addEventListener('abort', done, { once: true });
          });
        }
        if (controller.signal.aborted) return;
      }
      await faded;
      if (generation !== this.generation) return;
      this.voice = this.output.play(buffer, this.tracks[id] ?? { loopStart: 0 }, offset);
      this.emit({ id, status: 'playing' });
    } catch (error) {
      if (generation !== this.generation) return;
      this.emit({ id, status: 'error', error: String(error) });
    }
  }
  dispose(): void {
    this.generation++; this.controller?.abort(); this.voice?.stop(); this.outgoing.forEach(voice => voice.stop());
    this.outgoing.clear(); this.listeners.clear(); this.output.dispose();
  }
}
