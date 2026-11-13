// Pojedynczy kadr filmu: node atlas3d/kadr.mjs <film> <scena> <czas> [plik.png]  (szybki podgląd jednej chwili)
import { chromium } from 'playwright'; import { przegladarka } from './przegladarka.mjs'; /* llvmpipe na Xvfb (szybciej), awaryjnie SwiftShader */ import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), [film, sc, t, plik] = process.argv.slice(2);
const typy = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const srv = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0])); if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': typy[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res); }).listen(0);
const b = (await przegladarka()).przegladarka;
const pg = await b.newPage({ viewport: { width: 1080, height: 1920 } }); pg.on('pageerror', e => console.log('BŁĄD', e.message));
await pg.goto(`http://localhost:${srv.address().port}/atlas3d/${film}.html`); await pg.waitForFunction(() => window.gotowe); await pg.evaluate(() => document.fonts.ready);
await pg.evaluate(([s, t]) => { window.zbuduj(+s); window.klatka(+t); }, [sc, t]);
const out = plik || path.join(ROOT, 'atlas3d/out', `${film}_s${sc}_t${t}.png`); await pg.screenshot({ path: out }); console.log(out);
await b.close(); srv.close();
