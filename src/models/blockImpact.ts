/** A block is broken only by overflow. Equal damage consumes it but remains a full guard. */
export function blockImpact(beforeBlock: number, incoming: number, hpDamage: number, usesBlock: boolean): 'guard' | 'break' | undefined {
  if (!usesBlock || beforeBlock <= 0 || incoming <= 0 || incoming - hpDamage <= 0) return;
  return hpDamage > 0 ? 'break' : 'guard';
}
