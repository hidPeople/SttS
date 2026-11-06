import type { BgmOutput, BgmVoice } from '../models/bgm';
import { AUDIO_SETTINGS, type BgmTrack } from '../data/bgm';

/** Decoded only on demand. Audio time is independent of Phaser/Ctrl time scaling. */
export class WebBgmOutput implements BgmOutput {
  private context?: AudioContext;
  private master?: GainNode;
  private level = 1;
  private paused = false;
  private activated = false;
  private getContext(): AudioContext {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain(); this.master.gain.value = this.level;
      this.master.connect(this.context.destination);
      if (this.paused) void this.context.suspend();
    }
    return this.context;
  }
  async load(url: string, signal: AbortSignal): Promise<AudioBuffer> {
    const timeout = new AbortController();
    const abort = () => timeout.abort(); signal.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(abort, AUDIO_SETTINGS.loadTimeoutMs);
    try {
      if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
      const response = await fetch(url, { signal: timeout.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bytes = await response.arrayBuffer();
      const context = this.getContext();
      const decoded = await context.decodeAudioData(bytes);
      if (signal.aborted || timeout.signal.aborted) throw new DOMException('Cancelled or timed out', 'AbortError');
      return decoded;
    } finally { clearTimeout(timer); signal.removeEventListener('abort', abort); }
  }
  play(buffer: unknown, loop: BgmTrack, offset = 0): BgmVoice {
    const context = this.getContext(), audio = buffer as AudioBuffer;
    const end = loop.loopEnd ?? audio.duration;
    if (!Number.isFinite(loop.loopStart) || !Number.isFinite(end) || loop.loopStart < 0 || end > audio.duration + 0.001 || end <= loop.loopStart)
      throw new Error('Invalid BGM loop range');
    const source = context.createBufferSource(), gain = context.createGain();
    source.buffer = audio; source.loop = true; source.loopStart = loop.loopStart; source.loopEnd = Math.min(end, audio.duration);
    source.connect(gain); gain.connect(this.master!); source.start(0, Math.max(0, Math.min(offset, end - 0.001)));
    let stopped = false, timer: ReturnType<typeof setTimeout> | undefined, finish: (() => void) | undefined;
    const stop = () => {
      if (stopped) return;
      stopped = true; clearTimeout(timer); source.stop(); source.disconnect(); gain.disconnect(); source.buffer = null; finish?.();
    };
    if (this.paused) void context.suspend(); else if (this.activated) void context.resume().catch(() => {});
    return { stop, fadeOut: seconds => new Promise<void>(resolve => {
      if (stopped) { resolve(); return; }
      finish = resolve;
      gain.gain.cancelScheduledValues(context.currentTime);
      gain.gain.setValueAtTime(gain.gain.value, context.currentTime);
      gain.gain.linearRampToValueAtTime(0, context.currentTime + seconds);
      timer = setTimeout(stop, Math.max(0, seconds * 1000));
    }) };
  }
  volume(value: number): void {
    this.level = value;
    if (this.master && this.context) this.master.gain.setTargetAtTime(value, this.context.currentTime, 0.015);
  }
  pause(paused: boolean): void {
    this.paused = paused;
    if (this.context) {
      if (paused) void this.context.suspend();
      else if (this.activated) void this.context.resume().catch(() => {});
    }
  }
  unlock(): void {
    this.activated = true;
    if (!this.paused) void this.getContext().resume().catch(() => {});
  }
  dispose(): void { if (this.context) void this.context.close(); }
}
