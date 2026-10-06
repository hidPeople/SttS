/** Bounded history on the scene clock. Presentation can lag without delaying combat. */
export class PresentationDelay<T> {
  private history: { time: number; value: T }[] = [];
  constructor(private delay: number) {}
  sample(time: number, value: T): T {
    const last = this.history[this.history.length - 1];
    if (last?.time === time) last.value = value;
    else this.history.push({ time, value });
    const cutoff = time - Math.max(0, this.delay);
    let remove = 0;
    while (remove + 1 < this.history.length && this.history[remove + 1].time <= cutoff) remove++;
    if (remove) this.history.splice(0, remove);
    return this.history[0].value;
  }
}
