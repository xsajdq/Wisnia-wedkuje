// Kontrola strzałek wskaźników: node atlas3d/kontrola_strzalek.mjs <film> [scena]
// Dla każdej strzałki (wskaz) w chwili, gdy jest widoczna, puszcza promień z kamery przez wskazany punkt i sprawdza, w co trafia:
// OK = obiekt leży w tym miejscu; „zasłonięte” = coś stoi przed punktem; „punkt w wodzie/powietrzu” = strzałka wskazuje pustkę.
// Wynik zawsze obejrzyj też na kadrze – promień nie wie, CZY trafiony obiekt to ten nazwany w etykiecie.
import { chromium } from 'playwright'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), [film, tylko] = process.argv.slice(2);
const typy = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const srv = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0])); if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': typy[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res); }).listen(0);
const b = await chromium.launch({ ...(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {}), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await b.newPage({ viewport: { width: 1080, height: 1920 } }); pg.on('pageerror', e => console.log('BŁĄD', e.message));
await pg.goto(`http://localhost:${srv.address().port}/atlas3d/${film}.html`); await pg.waitForFunction(() => window.gotowe);
let zle = 0; const n = await pg.evaluate(() => window.liczbaScen);
for (let sc = 1; sc <= n; sc++) { if (tylko && +tylko !== sc) continue; const dl = await pg.evaluate(s => window.zbuduj(s), sc);
  for (const w of await pg.evaluate(() => window.wskazniki())) { const t = Math.min(dl - .05, w.od + .8);
    await pg.evaluate(t => window.klatka(t), t); const [r] = await pg.evaluate(i => window.wskazniki(i), w.i);
    if (r.ocena !== 'OK') zle++; console.log(`${r.ocena === 'OK' ? '  ' : '!!'} scena ${sc} t=${t.toFixed(1)} „${r.tekst}” → ${r.trafia}: ${r.ocena}`); } }
console.log(zle ? `strzałek do poprawy: ${zle}` : 'OK – wszystkie strzałki trafiają w obiekty');
await b.close(); srv.close();
