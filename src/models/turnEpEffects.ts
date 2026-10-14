import type { Enemy, Player } from './Combatants';
import type { EpDamagePart } from './types';

export interface TurnEpEffectsSnapshot { shared: number[]; sensitivity: [number, EpDamagePart][]; retaliation?: [number, number, number][] }

/** Battle-local effects: links refresh, retaliation adds an independent entry. */
export class TurnEpEffects {
  private retaliation = new Map<Enemy, { amount: number; selfAmount: number }[]>();
  retaliate(enemy: Enemy, amount: number, selfAmount: number): boolean {
    if (enemy.isDefeated || enemy.maxEp <= 0) return false;
    const entries = this.retaliation.get(enemy) ?? []; entries.push({ amount, selfAmount }); this.retaliation.set(enemy, entries); return true;
  }
  retaliations(enemy: Enemy) { return this.retaliation.get(enemy) ?? []; }
  private shared = new Set<Enemy>();
  private sensitivity = new Map<Enemy, EpDamagePart>();
  snapshot(enemies: Enemy[]): TurnEpEffectsSnapshot {
    return { retaliation: [...this.retaliation].flatMap(([enemy, entries]) => entries.map(e => [enemies.indexOf(enemy), e.amount, e.selfAmount] as [number, number, number])).filter(e => e[0] >= 0), shared: [...this.shared].map(enemy => enemies.indexOf(enemy)).filter(index => index >= 0),
      sensitivity: [...this.sensitivity].flatMap(([enemy, part]) => {
        const index = enemies.indexOf(enemy); return index >= 0 ? [[index, part] as [number, EpDamagePart]] : [];
      }) };
  }
  restore(snapshot: TurnEpEffectsSnapshot | undefined, enemies: Enemy[]): void {
    this.clear();
    snapshot?.retaliation?.forEach(([index, amount, selfAmount]) => { if (enemies[index]) this.retaliate(enemies[index], amount, selfAmount); });
    snapshot?.shared.forEach(index => { if (enemies[index]) this.share(enemies[index]); });
    snapshot?.sensitivity.forEach(([index, part]) => { if (enemies[index]) this.copySensitivity(enemies[index], part); });
  }
  clear(): void { this.shared.clear(); this.sensitivity.clear(); this.retaliation.clear(); }
  share(enemy: Enemy): boolean {
    if (enemy.maxEp <= 0 || enemy.isDefeated) return false;
    this.shared.add(enemy); return true;
  }
  copySensitivity(enemy: Enemy, part: EpDamagePart): boolean {
    if (enemy.maxEp <= 0 || enemy.isDefeated) return false;
    this.sensitivity.set(enemy, part); return true;
  }
  sensitivityPart(enemy: Enemy): EpDamagePart | undefined { return this.sensitivity.get(enemy); }
  recipients(source: Player | Enemy, player: Player): (Player | Enemy)[] {
    if (source === player) return [...this.shared].filter(enemy => !enemy.isDefeated && enemy.maxEp > 0);
    return this.shared.has(source as Enemy) && !player.isDefeated ? [player] : [];
  }
}
