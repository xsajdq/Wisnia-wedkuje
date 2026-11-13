// Pomiar czasu renderu: node atlas3d/pomiar.mjs <film> <scena> [skala]  – budowa sceny, klatka (GPU), zrzut ekranu, pamięć
import { chromium } from 'playwright'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), [film, sc, skala = '0.6667'] = process.argv.slice(2);
const typy = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': typy[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); }).listen(0);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: +skala });
await pg.goto(`http://localhost:${srv.address().port}/atlas3d/${film}.html?skala=${skala}`); await pg.waitForFunction(() => window.gotowe);
const czas = async f => { const t = Date.now(); await f(); return Date.now() - t; };
const mem = async () => { const { execSync } = await import('node:child_process'); return execSync("ps -eo rss,comm | grep -i chrom | awk '{s+=$1} END {print int(s/1024)}'").toString().trim() + ' MB (chromium RSS)'; };
if (sc.includes('-')) { const [a, z] = sc.split('-').map(Number); for (let n = a; n <= z; n++) { const tb = await czas(() => pg.evaluate(s => window.zbuduj(s), n)); await pg.evaluate(() => window.klatka(2)); if (n % 5 === 0) console.log('scena', n, 'budowa', tb, 'ms, pamięć', await mem()); } await b.close(); srv.close(); process.exit(0); }
for (let k = 0; k < 12; k++) console.log('budowa', await czas(() => pg.evaluate(s => window.zbuduj(s), +sc)), 'ms, pamięć', await mem());
let tk = 0, ts = 0; for (let i = 0; i < 10; i++) { tk += await czas(() => pg.evaluate(t => window.klatka(t), 1 + i / 24)); ts += await czas(() => pg.screenshot({ type: 'jpeg', quality: 92 })); }
console.log('klatka', tk / 10, 'ms, zrzut', ts / 10, 'ms');
const cdp = await pg.context().newCDPSession(pg); let tc = 0, tp = 0, rozm = 0;
for (let i = 0; i < 10; i++) { tc += await czas(async () => { const r = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 92, optimizeForSpeed: true }); rozm = r.data.length; }); }
for (let i = 0; i < 10; i++) { tp += await czas(() => cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true })); }
console.log('CDP jpeg szybki', tc / 10, 'ms (', (rozm * .75 / 1e3).toFixed(0), 'kB), png szybki', tp / 10, 'ms');
await b.close(); srv.close();
