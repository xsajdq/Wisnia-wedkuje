// Kontrola modelu ryby pod różnymi kątami (zbliżenie): node atlas3d/katy_ryby.mjs <strona.html> <scena> <plik.jpg> <kąt[:pochylenie[:fov]]> …
// kąt 0 = bok, -90 = przód do kamery, -180 = ogon; pochylenie > 0 = widok z góry na grzbiet (stopnie); fov – zbliżenie (domyślnie 18)
import { chromium } from 'playwright'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), [STRONA, SC, OUT, ...KATY] = process.argv.slice(2);
const typy = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': typy[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); }).listen(0);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await b.newPage({ viewport: { width: 1080, height: 1920 } }); pg.on('pageerror', e => console.error('błąd strony:', e.message));
await pg.goto(`http://localhost:${srv.address().port}/atlas3d/${STRONA}`); await pg.waitForFunction(() => window.gotowe);
const tmp = path.join(path.dirname(path.resolve(OUT)), 'katy_tmp'); fs.mkdirSync(tmp, { recursive: true }); const pliki = [];
for (const [i, spec] of KATY.entries()) { const [k, p = 0, fov = 18] = spec.split(':').map(Number);
  const xy = await pg.evaluate(([sc, k, p, fov]) => { window.zbuduj(+sc); const { scene, camera } = window.__scena(); document.getElementById('ui').style.display = 'none';
    const ryby = []; scene.traverse(o => { if (o.userData.ryba) ryby.push(o); }); const d = ryby[0];
    camera.fov = fov; camera.updateProjectionMatrix();
    scene.onBeforeRender = () => { d.userData.wnetrze.rotation.set(p * Math.PI / 180, k * Math.PI / 180, 0); d.updateMatrixWorld(true); };
    window.klatka(1); const v = d.position.clone().project(camera); return [(v.x + 1) / 2 * 1080, (1 - v.y) / 2 * 1920]; }, [SC, k, p, fov]);
  const f = path.join(tmp, `k${i}.png`); await pg.screenshot({ path: f, clip: { x: Math.max(0, Math.min(1080 - 760, xy[0] - 380)), y: Math.max(0, xy[1] - 300), width: 760, height: 600 } }); pliki.push(f); }
await b.close(); srv.close();
const kol = Math.min(3, pliki.length), rz = Math.ceil(pliki.length / kol);
execFileSync('ffmpeg', ['-y', '-v', 'error', ...pliki.flatMap(f => ['-i', f]), '-filter_complex', `${pliki.map((_, i) => `[${i}]`).join('')}xstack=inputs=${pliki.length}:layout=${pliki.map((_, i) => `${(i % kol) * 760}_${Math.floor(i / kol) * 600}`).join('|')}:fill=white`, path.resolve(OUT)]);
console.log(OUT);
