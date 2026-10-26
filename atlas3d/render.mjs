// Render próbki 3D: scena three.js w Chromium (SwiftShader), klatka po klatce → ffmpeg → MP4.
// Użycie: node atlas3d/render.mjs [sekundy=5] [--podglad t1,t2]
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const SEK = Number(args.find(a => /^\d/.test(a)) || 5), FPS = 30;
const podglad = args.includes('--podglad') ? args[args.indexOf('--podglad') + 1].split(',').map(Number) : null;

// mały serwer statyczny (moduły ES nie ładują się z file://)
const typy = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };
const srv = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': typy[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(0);
const port = srv.address().port;

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('pageerror', e => console.error('błąd strony:', e.message));
await page.goto(`http://localhost:${port}/atlas3d/scena.html`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.gotowe);
await page.evaluate(() => document.fonts.ready);

if (podglad) {
  for (const t of podglad) { await page.evaluate(t => window.klatka(t), t); await page.screenshot({ path: path.join(ROOT, `wideo/3d_t${t}.png`) }); }
} else {
  const out = path.join(ROOT, 'wideo/probka_3d.mp4');
  const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', out], { stdio: ['pipe', 'ignore', 'inherit'] });
  const N = SEK * FPS, t0 = Date.now();
  for (let i = 0; i < N; i++) {
    await page.evaluate(t => window.klatka(t), i / FPS);
    ff.stdin.write(await page.screenshot({ type: 'jpeg', quality: 92 }));
    if (i % 30 === 0) console.log(`klatka ${i}/${N}  ${Math.round((Date.now() - t0) / 1000)} s`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  console.log(out);
}
await browser.close(); srv.close();
