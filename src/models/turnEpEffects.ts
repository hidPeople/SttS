import type { Enemy, Player } from './Combatants';
import type { EpDamagePart } from './types';

/** Battle-local links; reapplication refreshes a pair, never duplicates it. */
export class TurnEpEffects {
  private shared = new Set<Enemy>();
  private sensitivity = new Map<Enemy, EpDamagePart>();
  clear(): void { this.shared.clear(); this.sensitivity.clear(); }
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
