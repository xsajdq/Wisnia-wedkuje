// Wiele kadrów naraz (szybki podgląd, grafika w skali 0,4): node atlas3d/kadry.mjs <film> <katalog> <scena>:<czas> ...
import { przegladarka, zrzutnik } from './przegladarka.mjs'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const ROOT = '/home/user/Wisnia-wedkuje', [film, outd, ...pary] = process.argv.slice(2);
const typy = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const srv = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0])); if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': typy[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res); }).listen(0);
const { przegladarka: b } = await przegladarka();
const POZ0 = process.env.POZIOM === '1', VPK = POZ0 ? { width: 1920, height: 1080 } : { width: 1080, height: 1920 }, pg = await b.newPage({ viewport: VPK, deviceScaleFactor: .4 }), POZ = process.env.POZIOM === '1'; pg.on('pageerror', e => console.log('BŁĄD', e.message));
await pg.goto(`http://localhost:${srv.address().port}/atlas3d/${film}.html?skala=0.4${POZ ? '&poziom=1' : ''}`); await pg.waitForFunction(() => window.gotowe); await pg.evaluate(() => document.fonts.ready);
fs.mkdirSync(outd, { recursive: true }); let ost = null; const zrzut = await zrzutnik(pg, { szer: VPK.width, wys: VPK.height, skala: .4 });
for (const pr of pary) { const [s, t] = pr.split(':').map(Number);
  if (s !== ost) { const dl = await pg.evaluate(s => window.zbuduj(s), s); console.log('scena', s, 'dl', dl.toFixed(2)); ost = s; }
  await pg.evaluate(t => window.klatka(t), t); fs.writeFileSync(`${outd}/s${s}_${String(t).replace('.', '_')}.jpg`, await zrzut('jpeg', 80)); }
await b.close(); srv.close();
