import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { programFor, contracts, contractChanges } from './schema.mjs';

// Read-only review command. Never acknowledge changes automatically.
const toolRoot = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(toolRoot, '../..');
const baseline = JSON.parse(fs.readFileSync(path.join(toolRoot, 'schema-baseline.json'), 'utf8'));
const changes = contractChanges(baseline, contracts(programFor(root), root));
if (changes.length) {
    console.log(changes.map(change => change.message).join('\n\n'));
    console.log(`\n未確認の定義差分: ${changes.length} 件。対応確認後、確認済みの項目だけschema-baseline.jsonへ反映してください。`);
    process.exitCode = 1;
} else console.log('定義差分なし。意味・単位・条件・プレビューの変更は別途確認してください。');
