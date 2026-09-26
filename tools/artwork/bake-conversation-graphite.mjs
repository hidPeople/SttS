// Development-only: bake the existing crayon material; never imported or run by the game/build.
// CANVAS_MODULE may point to an existing @napi-rs/canvas installation.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const { createCanvas, Path2D, DOMMatrix } = require(process.env.CANVAS_MODULE || '@napi-rs/canvas');
const root = fileURLToPath(new URL('../../', import.meta.url));
const source = ts.createSourceFile('crayon.ts', fs.readFileSync(path.join(root, 'src/ui/crayon.ts'), 'utf8'), ts.ScriptTarget.Latest, true);
const functions = source.statements.filter(n => ts.isFunctionDeclaration(n) && ['canvas', 'crayonArtwork'].includes(n.name?.text));
if (functions.length !== 2) throw new Error('Crayon generator changed; update the offline baker.');
const code = ts.transpileModule(functions.map(n => n.getText(source)).join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
let seed = 0;
const artwork = new Function('document', 'Path2D', 'DOMMatrix', 'globalThis', code + ';return crayonArtwork;')(
  { createElement: () => createCanvas(8, 8) }, Path2D, DOMMatrix,
  { crypto: { getRandomValues: values => { values[0] = seed; return values; } } },
);
const output = path.join(root, 'src/ui/assets');
fs.mkdirSync(output, { recursive: true });
for (const panel of [
  { name: 'dialogue', width: 1100, height: 192, seed: 0x47324101 },
  { name: 'log', width: 1100, height: 610, seed: 0x47324102 },
]) {
  const canvas = createCanvas(panel.width + 34, panel.height + 5);
  const ctx = canvas.getContext('2d');
  seed = panel.seed;
  ctx.drawImage(artwork(panel.width + 34, panel.height + 5).canvas, 0, 0);
  seed = panel.seed + 17;
  ctx.globalAlpha = .7;
  // Original second layer: centre (14, 6), with a canvas 54px narrower and 25px shorter.
  ctx.drawImage(artwork(panel.width - 20, panel.height - 20).canvas, 41, 18.5);
  const file = path.join(output, 'conversation-graphite-' + panel.name + '.png');
  const png = canvas.toBuffer('image/png');
  fs.writeFileSync(file, png);
  console.log(path.relative(root, file) + ': ' + canvas.width + 'x' + canvas.height + ', ' + png.length + ' bytes');
}
