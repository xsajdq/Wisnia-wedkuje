// Diagnostyka sceny: node atlas3d/ewal.mjs <film> <scena> '<wyrażenie JS>'  (np. 'window.teren(-12,-3)' albo 'window.diagnostyka()')
import { chromium } from 'playwright'; import { przegladarka } from './przegladarka.mjs'; /* llvmpipe na Xvfb (szybciej), awaryjnie SwiftShader */ import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), [film, sc, wyr] = process.argv.slice(2);
const typy = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': typy[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); }).listen(0);
const b = (await przegladarka()).przegladarka;
const pg = await b.newPage({ viewport: { width: 1080, height: 1920 } }); pg.on('pageerror', e => console.log('BŁĄD', e.message));
await pg.goto(`http://localhost:${srv.address().port}/atlas3d/${film}.html?skala=0.3`); await pg.waitForFunction(() => window.gotowe);
console.log(JSON.stringify(await pg.evaluate(([s, w]) => { window.zbuduj(+s); window.klatka(1); return eval(w); }, [sc, wyr])));
await b.close(); srv.close();
