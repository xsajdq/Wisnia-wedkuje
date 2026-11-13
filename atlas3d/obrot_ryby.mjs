// Krótki film kontrolny modelu ryby 3D: obrót z boku przodem do kamery i z powrotem (wygląd bryły pod każdym kątem).
// node atlas3d/obrot_ryby.mjs <strona.html> <scena> <czas_startu> [sekundy=3] [fps=24] [wyjscie.mp4]
import { chromium } from 'playwright'; import { przegladarka, zrzutStrony } from './przegladarka.mjs'; /* llvmpipe na Xvfb (szybciej), awaryjnie SwiftShader */ import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), [STRONA, SC = 1, T0 = 0, DL = 3, FPS = 24, OUT = 'wideo/ryba_3d_obrot.mp4'] = process.argv.slice(2);
const typy = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': typy[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); }).listen(0);
const b = (await przegladarka()).przegladarka;
const pg = await b.newPage({ viewport: { width: 1080, height: 1920 } }); const zrzut = await zrzutStrony(pg); pg.on('pageerror', e => console.error('błąd strony:', e.message));
await pg.goto(`http://localhost:${srv.address().port}/atlas3d/${STRONA}`); await pg.waitForFunction(() => window.gotowe); await pg.evaluate(() => document.fonts.ready);
await pg.evaluate(([sc, t0]) => { window.zbuduj(+sc); const { scene, camera } = window.__scena();
  document.querySelectorAll('#ui .etk, #ui .karta').forEach(e => e.remove());
  const ryby = []; scene.traverse(o => { if (o.userData.ryba) ryby.push(o); }); window.klatka(+t0);
  const d = ryby.sort((a, b) => a.position.distanceTo(camera.position) - b.position.distanceTo(camera.position))[0];
  // kąt płynnie: bok → przód (−90°) → bok, profil cos (ciągła prędkość obrotu)
  window.__obrot = u => { const k = -Math.PI / 2 * (.5 - .5 * Math.cos(2 * Math.PI * u)); scene.onBeforeRender = () => { d.userData.wnetrze.rotation.y = k; d.updateMatrixWorld(true); }; window.klatka(+t0 + u * 1.5); }; }, [SC, T0]);
const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', path.resolve(ROOT, OUT)], { stdio: ['pipe', 'inherit', 'inherit'] });
const N = Math.round(DL * FPS); for (let i = 0; i < N; i++) { await pg.evaluate(u => window.__obrot(u), i / N); ff.stdin.write(await zrzut('jpeg', 92)); }
ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close(); srv.close(); console.log(OUT);
