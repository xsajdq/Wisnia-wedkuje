// Diagnostyka kadru filmu 3D: node atlas3d/diagnostyka.mjs <film> <scena> <czas> [czas…]
// Wypisuje elementy sceny i ich pozycje na ekranie (x, y w -1…1 = w kadrze; poza tym zakresem = poza kadrem)
// oraz nachodzące na siebie napisy (NAKŁADKA – do poprawienia).
import { chromium } from 'playwright'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), [film, sc, ...ts] = process.argv.slice(2);
const typy = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const srv = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0])); if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': typy[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res); }).listen(0);
const b = await chromium.launch({ ...(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {}), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await b.newPage({ viewport: { width: 1080, height: 1920 } }); pg.on('pageerror', e => console.log('BŁĄD', e.message));
await pg.goto(`http://localhost:${srv.address().port}/atlas3d/${film}.html`); await pg.waitForFunction(() => window.gotowe);
await pg.evaluate(n => window.zbuduj(n), +sc);
for (const t of ts) { await pg.evaluate(t => window.klatka(t), +t); console.log(`--- scena ${sc}, t = ${t}`);
  for (const [k, p, x, y] of await pg.evaluate(() => window.diagnostyka())) console.log(`${Math.abs(x) <= 1 && Math.abs(y) <= 1 ? '  ' : '!!'} ${k.padEnd(26)} ${JSON.stringify(p).padEnd(24)} ekran ${x}, ${y}`);
  for (const n of await pg.evaluate(() => window.nakladki())) console.log('NAKŁADKA ' + n); }
await b.close(); srv.close();
