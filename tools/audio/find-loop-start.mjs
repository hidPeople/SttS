// Compare separately encoded intro/full and loop MP3s without re-encoding either file.
// Usage: node tools/audio/find-loop-start.mjs "bgm/Title_first.mp3" "bgm/Title_Loop.mp3"
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const [firstFile, loopFile] = process.argv.slice(2);
if (!firstFile || !loopFile) throw new Error('Specify the full/intro file and the loop file.');
function decode(file, rate) {
  const bytes = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', '1', '-ar', String(rate), 'pipe:1'], { maxBuffer: 128 * 1024 * 1024 });
  return new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
}
function bestMatch(first, loop, anchor, length, low, high) {
  const segment = loop.subarray(anchor, anchor + length);
  const mean = segment.reduce((sum, value) => sum + value, 0) / length;
  const centered = Float64Array.from(segment, value => value - mean);
  const energy = centered.reduce((sum, value) => sum + value * value, 0);
  if (energy < 1e-10) throw new Error('The comparison window is silent.');
  let best = { lag: 0, correlation: -Infinity };
  for (let lag = Math.max(0, low); lag <= Math.min(high, first.length - anchor - length); lag++) {
    let dot = 0, sum = 0, squared = 0;
    for (let i = 0; i < length; i++) {
      const value = first[anchor + lag + i];
      dot += value * centered[i]; sum += value; squared += value * value;
    }
    const correlation = dot / Math.sqrt(Math.max(1e-20, (squared - sum * sum / length) * energy));
    if (correlation > best.correlation) best = { lag, correlation };
  }
  return best;
}
const rate = 48000, coarseRate = 1000;
const first = decode(firstFile, rate), loop = decode(loopFile, rate);
const coarseFirst = decode(firstFile, coarseRate), coarseLoop = decode(loopFile, coarseRate);
const firstDuration = first.length / rate, loopDuration = loop.length / rate;
if (loopDuration < 8 || firstDuration < loopDuration) throw new Error('Expected full track >= loop track >= 8 seconds.');
const anchors = [2, Math.floor(loopDuration / 2), Math.floor(loopDuration - 4)];
const matches = anchors.map(seconds => {
  const coarse = bestMatch(coarseFirst, coarseLoop, seconds * coarseRate, coarseRate, 0, Math.ceil((firstDuration - loopDuration + 2) * coarseRate));
  const estimate = Math.round(coarse.lag * rate / coarseRate);
  return bestMatch(first, loop, seconds * rate, rate / 2, estimate - 240, estimate + 240);
});
const lags = matches.map(match => match.lag), correlations = matches.map(match => match.correlation);
if (Math.max(...lags) - Math.min(...lags) > 2 || correlations.some(value => value < .98)) {
  throw new Error(`Alignment is uncertain: ${JSON.stringify(matches)}`);
}
const loopStart = [...lags].sort((a, b) => a - b)[1] / rate;
console.log(JSON.stringify({ title: path.basename(firstFile).replace(/_first\.[^.]+$/i, ''), loopStart, firstDuration, loopDuration, lags, correlations, tailDifferenceSeconds: firstDuration - loopStart - loopDuration }, null, 2));
