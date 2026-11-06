// Fragment sceny jako osobny klip: node atlas3d/fragment.mjs <film> <scena> <od_s> <do_s> [wyjscie.mp4] [--fps 30] [--skala 1]
// Renderuje wybrany odcinek czasu jednej sceny (np. sam hol), z efektami dźwiękowymi sceny z tego odcinka.
import { chromium } from 'playwright'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { spawn, execFileSync } from 'node:child_process';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), a = process.argv.slice(2), [film, sc, od, doo] = a;
const arg = (n, d) => a.includes('--' + n) ? Number(a[a.indexOf('--' + n) + 1]) : d, FPS = arg('fps', 30), SK = arg('skala', 1);
const out = path.resolve(ROOT, a[4] && !a[4].startsWith('--') ? a[4] : `wideo/${film}_s${sc}_${od}-${doo}.mp4`);
const typy = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': typy[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); }).listen(0);
const b = await chromium.launch({ ...(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {}), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: SK }); pg.on('pageerror', e => console.error('błąd strony:', e.message));
await pg.goto(`http://localhost:${srv.address().port}/atlas3d/${film}.html?skala=${SK}`); await pg.waitForFunction(() => window.gotowe); await pg.evaluate(() => document.fonts.ready);
await pg.evaluate(n => window.zbuduj(n), +sc);
const tmp = out.replace('.mp4', '_obraz.mp4'), ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', tmp], { stdio: ['pipe', 'ignore', 'ignore'] });
const N = Math.round((doo - od) * FPS);
for (let i = 0; i < N; i++) { await pg.evaluate(t => window.klatka(t), +od + i / FPS); ff.stdin.write(await pg.screenshot({ type: 'jpeg', quality: 92 })); }
ff.stdin.end(); await new Promise(r => ff.on('close', r));
const zd = (await pg.evaluate(() => window.zdarzeniaAudio())).filter(z => z.t >= +od - .05 && z.t < +doo);
await b.close(); srv.close();
const GL = { plusk: 0.9, przejscie: 0.55, pop: 0.6, slizg: 0.55, licznik: 0.5, dzwonek: 0.6, rzut: 0.6, hamulec: 0.5, zanurzenie: 0.6, wazka: 0.5, lawica: 0.6, korbka: 0.5, lyk: 0.8 };
const we = [], fil = [`anoisesrc=color=brown:amplitude=0.5:seed=3:sample_rate=48000:duration=${doo - od},lowpass=f=500,highpass=f=60,aformat=channel_layouts=stereo,volume=0.3[t]`], mix = ['[t]'];
zd.forEach((z, i) => { we.push('-i', path.join(ROOT, 'audio/sfx', z.typ + '.wav')); const ms = Math.max(0, Math.round((z.t - od) * 1000));
  fil.push(`[${i + 1}:a]aresample=48000,aformat=channel_layouts=stereo,volume=${((GL[z.typ] ?? .5) * (z.gl ?? 1)).toFixed(3)},adelay=${ms}|${ms}[s${i}]`); mix.push(`[s${i}]`); });
fil.push(`${mix.join('')}amix=inputs=${mix.length}:normalize=0:duration=first,loudnorm=I=-16:TP=-1.5,alimiter=limit=0.9[a]`);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, ...we, '-filter_complex', fil.join(';'), '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', out]);
fs.unlinkSync(tmp); console.log(out, zd.map(z => z.typ + '@' + (z.t - od).toFixed(2)).join(' '));
