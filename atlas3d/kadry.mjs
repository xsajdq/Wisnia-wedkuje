// Wiele kadrów naraz (szybki podgląd, grafika w skali 0,4): node atlas3d/kadry.mjs <film> <katalog> <scena>:<czas> ...
import { chromium } from 'playwright'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const ROOT = '/home/user/Wisnia-wedkuje', [film, outd, ...pary] = process.argv.slice(2);
const typy = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const srv = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0])); if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': typy[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res); }).listen(0);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: .4 }); pg.on('pageerror', e => console.log('BŁĄD', e.message));
await pg.goto(`http://localhost:${srv.address().port}/atlas3d/${film}.html?skala=0.4`); await pg.waitForFunction(() => window.gotowe); await pg.evaluate(() => document.fonts.ready);
fs.mkdirSync(outd, { recursive: true }); let ost = null;
for (const pr of pary) { const [s, t] = pr.split(':').map(Number);
  if (s !== ost) { const dl = await pg.evaluate(s => window.zbuduj(s), s); console.log('scena', s, 'dl', dl.toFixed(2)); ost = s; }
  await pg.evaluate(t => window.klatka(t), t); await pg.screenshot({ path: `${outd}/s${s}_${String(t).replace('.', '_')}.jpg`, type: 'jpeg', quality: 80 }); }
await b.close(); srv.close();
