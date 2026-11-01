// Statyczna makieta 9 kadrów sceny 3D (three.js w Chromium/SwiftShader) → atlas3d/out/<nazwa>/01..09.png + _plansza.jpg
// Użycie: node atlas3d/render_makieta.mjs okon_gdzie [kadry=1-9, np. 3,4] [--animacja]
// --animacja: niemy podgląd ruchu (bez lektora) → atlas3d/out/<nazwa>/podglad_animacji.mp4
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const nazwa = process.argv[2] || 'okon_gdzie';
const argi = process.argv.slice(3), ANIM = argi.includes('--animacja'), FPS = 24;
const lista = argi.find(a => /^\d/.test(a));
const kadry = lista ? lista.split(',').map(Number) : [1, 2, 3, 4, 5, 6, 7, 8, 9];
const OUT = path.join(ROOT, 'atlas3d/out', nazwa); fs.mkdirSync(OUT, { recursive: true });

const typy = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };
const srv = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': typy[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(0);

const browser = await chromium.launch({ ...(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {}), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('pageerror', e => console.error('błąd strony:', e.message));
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('konsola:', m.text()); });
await page.goto(`http://localhost:${srv.address().port}/atlas3d/${nazwa}.html`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.gotowe);
await page.evaluate(() => document.fonts.ready);
if (ANIM) {
  const { spawn } = await import('node:child_process');
  const plik = path.join(OUT, 'podglad_animacji.mp4');
  const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', plik], { stdio: ['pipe', 'ignore', 'inherit'] });
  const t0 = Date.now();
  for (const n of kadry) {
    const dl = await page.evaluate(n => window.zbuduj(n), n);
    for (let i = 0; i < Math.round(dl * FPS); i++) { await page.evaluate(t => window.klatka(t), i / FPS); ff.stdin.write(await page.screenshot({ type: 'jpeg', quality: 90 })); }
    console.log(`scena ${n} gotowa, ${Math.round((Date.now() - t0) / 1000)} s`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); console.log(plik);
  await browser.close(); srv.close(); process.exit(0);
}
for (const n of kadry) {
  const t0 = Date.now();
  await page.evaluate(n => window.scena(n), n);
  await page.screenshot({ path: path.join(OUT, String(n).padStart(2, '0') + '.png') });
  console.log(`kadr ${n}: ${Date.now() - t0} ms`);
}
await browser.close(); srv.close();
execFileSync('python3', [path.join(ROOT, 'atlas/plansza.py'), OUT]);
console.log(path.join(OUT, '_plansza.jpg'));
