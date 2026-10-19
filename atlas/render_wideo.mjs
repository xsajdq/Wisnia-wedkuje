// Renderuje rolkę MP4: klatki z wideo.html (Playwright) → ffmpeg + lektor.
// Użycie: node atlas/render_wideo.mjs szczupak [--fps 30] [--od 0 --do 64] [--podglad 12,30,45]
//   --podglad  zamiast wideo zapisuje pojedyncze klatki PNG dla podanych sekund
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const dir = path.dirname(new URL(import.meta.url).pathname);
const root = path.join(dir, '..');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const gatunek = process.argv[2] || 'szczupak';
const fps = Number(arg('fps', 30));
const czytaj = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const GATUNEK = czytaj(`data/gatunki/${gatunek}.json`);
const OS = czytaj(`data/os_czasu/${gatunek}.json`);
const dane = { GATUNEK, OS, REKORDY: czytaj('data/rekordy_polski.json'), ZDJECIA: czytaj('data/zdjecia.json'), PROFIL: 'wisnia_wedkuje' };
const od = Number(arg('od', 0)), doo = Number(arg('do', OS.dlugosc));
const audio = path.join(root, 'audio', gatunek, GATUNEK.audio || 'lektor.mp3');
const out = path.join(root, 'wideo');
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.addInitScript((d) => Object.assign(window, d), dane);
await page.goto('file://' + path.join(dir, 'wideo.html'), { waitUntil: 'networkidle' });
await page.evaluate(() => window.gotowe);

const podglad = arg('podglad');
if (podglad) {
  for (const t of podglad.split(',').map(Number)) {
    await page.evaluate((t) => window.ustawCzas(t), t);
    await page.screenshot({ path: path.join(out, `${gatunek}_t${String(t).replace('.', '_')}.png`) });
  }
  await browser.close();
  process.exit(0);
}

const plik = arg('wyjscie') ? path.resolve(arg('wyjscie')) : path.join(out, `${gatunek}.mp4`);
// Efekty dźwiękowe: zdarzenia z odtwarzacza → adelay każdego efektu, cicho pod lektorem
const SFX = Number(arg('sfx', 0.22));            // głośność efektów względem lektora (0 = bez efektów)
const zdarzenia = SFX > 0 ? (await page.evaluate(() => window.zdarzeniaAudio())).filter(e => e.t >= od && e.t < doo) : [];
const rodzaje = [...new Set(zdarzenia.map(e => e.dzwiek))];
const wejscia = rodzaje.flatMap(r => ['-i', path.join(root, 'audio', 'sfx', `${r}.wav`)]);
// lektor: tempo + normalizacja głośności do standardu social (ok. -15 LUFS)
let filtr = `[1:a]atempo=${OS.tempo},loudnorm=I=-15:TP=-1.5:LRA=11,apad[lektor]`;
const etykiety = [];
rodzaje.forEach((r, k) => {
  const ev = zdarzenia.filter(e => e.dzwiek === r);
  filtr += `;[${k + 2}:a]asplit=${ev.length}${ev.map((_, j) => `[${r}${j}]`).join('')}`;
  ev.forEach((e, j) => {
    const ms = Math.round((e.t - od) * 1000);
    filtr += `;[${r}${j}]adelay=${ms}|${ms},volume=${SFX}[s_${r}${j}]`;
    etykiety.push(`[s_${r}${j}]`);
  });
});
filtr += etykiety.length
  ? `;[lektor]${etykiety.join('')}amix=inputs=${etykiety.length + 1}:normalize=0:duration=first,alimiter=limit=0.95[a]`
  : `;[lektor]anull[a]`;
console.log(`efekty: ${zdarzenia.length} (${rodzaje.map(r => `${r}×${zdarzenia.filter(e => e.dzwiek === r).length}`).join(', ')})`);
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error',
  '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
  '-ss', String(od * OS.tempo), '-i', audio, ...wejscia,
  '-filter_complex', filtr, '-map', '0:v', '-map', '[a]', '-shortest',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(fps),
  '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', plik], { stdio: ['pipe', 'inherit', 'inherit'] });

const n = Math.round((doo - od) * fps);
const start = Date.now();
for (let f = 0; f < n; f++) {
  await page.evaluate((t) => window.ustawCzas(t), od + f / fps);
  const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (f % (fps * 5) === 0) console.log(`klatka ${f}/${n}  ${((Date.now() - start) / 1000).toFixed(0)} s`);
}
ff.stdin.end();
await new Promise(r => ff.on('close', r));
await browser.close();
console.log(plik);
