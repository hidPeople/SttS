import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { flipArtworkValues, dragArtworkValues } from '../public/card-artwork-edit.js';

async function loadPureModule(file) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  return import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
}
const { cardArtworkPlacement } = await loadPureModule('src/models/cardArtworkGeometry.ts');
const { drawCardArtwork } = await loadPureModule('src/ui/cardArtworkCanvas.ts');
const frame = { rimWidth: 5, decorationWidth: 2, cornerRadius: 7, imageEdgeFade: 0 };
const image = { naturalWidth: 960, naturalHeight: 1280 };

// Capture the actual drawing transform without rendering or inspecting UI pixels.
function drawing(art) {
  let m = [1, 0, 0, 1, 0, 0], result, clip;
  const multiply = ([a, b, c, d, e, f]) => {
    const [A, B, C, D, E, F] = m;
    m = [A*a+C*b, B*a+D*b, A*c+C*d, B*c+D*d, A*e+C*f+E, B*e+D*f+F];
  };
  const ctx = {
    save() {}, restore() {}, beginPath() {},
    roundRect(...rect) { clip = rect; }, clip() {},
    translate(x, y) { multiply([1, 0, 0, 1, x, y]); },
    rotate(r) { multiply([Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0]); },
    scale(x, y) { multiply([x, 0, 0, y, 0, 0]); },
    drawImage() { result = [...m]; },
  };
  drawCardArtwork(ctx, image, 160, 232, frame, art,
    cardArtworkPlacement(art, image.naturalWidth, image.naturalHeight, 148, 220));
  return { clip, at(x, y) {
    const [a, b, c, d, e, f] = result;
    return [a*x+c*y+e, b*x+d*y+f];
  } };
}
const near = (a, b) => assert.ok(Math.abs(a-b) < 1e-8, `${a} != ${b}`);

test('flip mirrors the drawn crop around the card center with rotation, offset and off-center focus', () => {
  for (const original of [
    {},
    { rotation: 4, offsetX: 31, offsetY: -28, focusX: 240, focusY: 920, scale: 0.31 },
    { rotation: -73, offsetX: -12, offsetY: 17, focusX: 810, focusY: 60, scale: 0.12 },
    { flipX: true, rotation: 246, offsetX: 5, offsetY: -8, scale: 0.2 },
  ]) {
    const mirrored = flipArtworkValues(original);
    for (const key of ['offsetX', 'offsetY', 'focusX', 'focusY', 'scale']) assert.equal(mirrored[key], original[key]);
    assert.equal(mirrored.rotation, original.rotation === undefined ? undefined : -original.rotation);
    const before = drawing(original), after = drawing(mirrored);
    assert.deepEqual(before.clip, after.clip);
    // Every source point maps to its exact mirror; therefore the visible source region is preserved.
    for (const [x, y] of [[0,0], [960,0], [0,1280], [960,1280], [400,500]]) {
      const a = before.at(x,y), b = after.at(x,y);
      near(b[0], 160-a[0]); near(b[1], a[1]);
      const twice = drawing(flipArtworkValues(mirrored)).at(x,y);
      near(twice[0], a[0]); near(twice[1], a[1]);
    }
  }
});

test('drag after a flip follows the pointer on screen instead of reversing horizontally', () => {
  for (const flipX of [false, true]) {
    const original = { flipX, rotation: 37, offsetX: 10, offsetY: -20, scale: 0.2 };
    const moved = dragArtworkValues(original, 12, -9);
    const a = drawing(original).at(300,700), b = drawing(moved).at(300,700);
    near(b[0]-a[0], 12); near(b[1]-a[1], -9);
    assert.equal(moved.rotation, 37);
  }
});
