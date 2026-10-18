import assert from 'node:assert/strict';

export const playerState = playerState => ({ kind: 'playerState', operator: 'has', playerState });
export const enemyTrait = enemyTrait => ({ kind: 'enemyTrait', operator: 'has', target: 'selectedEnemy', enemyTrait });
export const flavorValue = (valueKey, value, operator = 'eq') => ({ kind: 'flavorValue', operator, valueKey, value });
export const status = (status, target = 'player', operator = 'has', value) => ({
  kind: 'status', operator, target, ...(Array.isArray(status) ? { statuses: status } : { status }),
  ...(value === undefined ? {} : { value }),
});
export const bodyPart = (parts, target, operator = 'has') => ({
  kind: 'bodyPartStatus', operator, parts, bodyPartStatusKinds: ['insert', 'intruded'],
  ...(target ? { target } : {}),
});
export const kindLines = (lines, kind = 'quote') => lines.filter(line => line.kind === kind);
const canonical = value => Array.isArray(value) ? value.map(canonical).sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;

// Locate an authored branch by its contract, not by its current array position.
// Expectations still specify which contract must win each overlapping scenario.
export function branchLines(entries, conditions, kind = 'quote') {
  const key = JSON.stringify(canonical(conditions));
  const matches = entries.filter(entry => JSON.stringify(canonical(entry.conditions ?? [])) === key
    && kindLines(entry.lines ?? [entry], kind).length);
  if (conditions.length) assert.equal(matches.length, 1, `expected one ${kind} branch: ${key}`);
  else assert.ok(matches.length, `missing ${kind} fallback`);
  return kindLines(matches[0].lines ?? [matches[0]], kind);
}
