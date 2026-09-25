import { NOVEL_AUTO } from '../data/conversationAppearance';
import { NOVEL_CONTROLS } from '../data/conversations';
export type NovelPlaybackMode = 'off' | 'auto' | 'skip';
export function novelAutoDuration(text: string): number {
  const weight = Array.from(text.replace(/[\r\n]/g, '')).reduce((sum, char) => sum +
    (/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\u3000-\u303f\uff00-\uffef]/u.test(char)
      ? NOVEL_AUTO.japaneseWeight : NOVEL_AUTO.latinWeight), 0);
  return Math.max(0, NOVEL_AUTO.baseMs) + weight * Math.max(0, NOVEL_AUTO.perCharacterMs);
}
/** Real-time page clock. Blocked/hidden/log time never advances a page. */
export class NovelPlayback {
  mode: NovelPlaybackMode = 'off';
  private started?: number;
  private duration = 0;
  setMode(mode: NovelPlaybackMode): void { this.mode = mode; this.started = undefined; }
  page(text: string): void { this.duration = novelAutoDuration(text); this.started = undefined; }
  update(now: number, ready: boolean): boolean {
    if (!ready || this.mode === 'off') { this.started = undefined; return false; }
    this.started ??= now;
    const duration = this.mode === 'skip' ? Math.max(16, NOVEL_CONTROLS.skip.intervalMs) : this.duration;
    if (now - this.started < duration) return false;
    this.started = now;
    return true;
  }
  progress(now: number): number {
    return this.mode === 'auto' && this.started !== undefined ? Math.min(1, (now - this.started) / Math.max(1, this.duration)) : 0;
  }
}
