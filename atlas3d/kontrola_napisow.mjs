// Kontrola napisów całego filmu: node atlas3d/kontrola_napisow.mjs <film> [krok_s=0.5]
// Dla każdej sceny co `krok` sekund sprawdza, czy widoczne napisy (tytuł, opisy, karty, etykiety, dymki) na siebie nie nachodzą.
import { chromium } from 'playwright'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), [film, krok = '0.5', tylko] = process.argv.slice(2);
const typy = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const srv = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0])); if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': typy[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res); }).listen(0);
const b = await chromium.launch({ ...(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {}), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await b.newPage({ viewport: { width: 1080, height: 1920 } }); pg.on('pageerror', e => console.log('BŁĄD', e.message));
await pg.goto(`http://localhost:${srv.address().port}/atlas3d/${film}.html`); await pg.waitForFunction(() => window.gotowe); await pg.evaluate(() => document.fonts.ready);
let bledy = 0; const n = await pg.evaluate(() => window.liczbaScen);
for (let sc = 1; sc <= n; sc++) { if (tylko && +tylko !== sc) continue; const dl = await pg.evaluate(s => window.zbuduj(s), sc); const widziane = new Set();
  for (let t = 0; t < dl; t += +krok) { await pg.evaluate(t => window.klatka(t), t); for (const x of await pg.evaluate(() => window.nakladki())) if (!widziane.has(x)) { widziane.add(x); bledy++; console.log(`scena ${sc}, t=${t.toFixed(1)}: ${x}`); } } }
console.log(bledy ? `nachodzących par: ${bledy}` : 'OK – napisy nigdzie na siebie nie nachodzą i mieszczą się w kadrze');
await b.close(); srv.close();
