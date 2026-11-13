// Kontrola czasu ekranowego: node atlas3d/kontrola_czasu.mjs <film> [krok_s=0.1] [--json plik]
// Dla każdej sceny (czas rzeczywisty, z lektorem) mierzy, jak długo każdy element jest widoczny w kadrze:
//   napisy (tytuł, karty, etykiety, dymki) – nieprzezroczyste i w całości w kadrze,
//   ryby, wędkarz, sprzęt i przynęty – środek w kadrze.
// Ocena: napis krócej niż czas czytania (0,8 s + 0,3 s/słowo, min. 1,5 s) → „ZA KRÓTKO”;
// obiekt 3D krócej niż 1,5 s → „ZA KRÓTKO”; ponad 4 s bez nowego elementu → „PUSTO”; ponad 3 nowe elementy w 1,5 s → „TŁOK”.
import { chromium } from 'playwright'; import { przegladarka } from './przegladarka.mjs'; /* llvmpipe na Xvfb (szybciej), awaryjnie SwiftShader */ import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), argi = process.argv.slice(2), film = argi[0];
const krok = Number(argi[1] && !argi[1].startsWith('--') ? argi[1] : .1), jsonOut = argi.includes('--json') ? argi[argi.indexOf('--json') + 1] : null;
const typy = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const srv = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0])); if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': typy[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res); }).listen(0);
const b = (await przegladarka()).przegladarka;
const pg = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: .25 }); pg.on('pageerror', e => console.log('BŁĄD', e.message));
await pg.goto(`http://localhost:${srv.address().port}/atlas3d/${film}.html?skala=0.25`); await pg.waitForFunction(() => window.gotowe); await pg.evaluate(() => document.fonts.ready);
const n = await pg.evaluate(() => window.liczbaScen), wynik = []; let start = 0;
const czytanie = t => Math.max(1.5, .8 + .3 * t.split(/\s+/).filter(Boolean).length);
for (let sc = 1; sc <= n; sc++) {
  const dl = await pg.evaluate(s => window.zbuduj(s), sc), slady = new Map();
  for (let t = 0; t <= dl + 1e-6; t += krok) {
    await pg.evaluate(t => window.klatka(t), t);
    const widac = await pg.evaluate(() => {
      const o = [], W = innerWidth, H = innerHeight;
      document.querySelectorAll('#ui .chip, #ui h1, #ui .opis, #ui .karta, #ui .etk').forEach((e, i) => {
        if (Number(e.style.opacity || 1) <= .3) return; const r = e.getBoundingClientRect(); if (r.width < 2) return;
        const caly = r.left >= 0 && r.right <= W && r.top >= 0 && r.bottom <= H;
        o.push([`napis|${e.className.split(' ')[0]}|${e.innerText.replace(/\s+/g, ' ').trim().slice(0, 60)}`, caly]); });
      const licz = {}; for (const [k, , x, y] of window.diagnostyka()) { if (k.startsWith('etykieta:')) continue; licz[k] = (licz[k] || 0) + 1; o.push([`3d|${k}|${k} ${licz[k]}`, Math.abs(x) < .95 && Math.abs(y) < .95]); }
      return o; });
    for (const [k, w] of widac) { const s = slady.get(k) || { t: [], poza: 0 }; if (w) s.t.push(t); else s.poza++; slady.set(k, s); }
  }
  const el = [];
  for (const [k, s] of slady) { if (!s.t.length) { el.push({ k, od: null, ile: 0, poza: s.poza * krok }); continue; }
    el.push({ k, od: s.t[0], do: s.t[s.t.length - 1], ile: s.t.length * krok, poza: s.poza * krok }); }
  el.sort((a, b) => (a.od ?? 99) - (b.od ?? 99));
  const uwagi = [];
  for (const e of el) { const [typ, , tekst] = e.k.split('|');
    if (e.od === null) { uwagi.push(`NIEWIDOCZNY: ${tekst} (cały czas poza kadrem)`); continue; }
    const min = typ === 'napis' ? czytanie(tekst) : 1.5; e.min = min;
    if (e.ile + 1e-6 < min && !(typ === 'napis' && e.do >= dl - krok)) uwagi.push(`ZA KRÓTKO: ${tekst} – ${e.ile.toFixed(1)} s (potrzeba ${min.toFixed(1)} s)`);
    else if (e.ile + 1e-6 < min) uwagi.push(`KRÓTKO NA KOŃCU SCENY: ${tekst} – ${e.ile.toFixed(1)} s (potrzeba ${min.toFixed(1)} s)`); }
  const wejscia = el.filter(e => e.od !== null && e.od > .05).map(e => e.od).sort((a, b) => a - b), punkty = [0, ...wejscia, dl];
  for (let i = 1; i < punkty.length; i++) if (punkty[i] - punkty[i - 1] > 4) uwagi.push(`PUSTO: ${punkty[i - 1].toFixed(1)}–${punkty[i].toFixed(1)} s bez nowego elementu (${(punkty[i] - punkty[i - 1]).toFixed(1)} s)`);
  for (let i = 0; i + 3 < wejscia.length; i++) if (wejscia[i + 3] - wejscia[i] < 1.5) { uwagi.push(`TŁOK: 4 elementy w ${(wejscia[i + 3] - wejscia[i]).toFixed(1)} s od ${wejscia[i].toFixed(1)} s`); i += 3; }
  wynik.push({ scena: sc, start, dl, elementy: el, uwagi });
  console.log(`\n=== scena ${sc}: ${start.toFixed(1)}–${(start + dl).toFixed(1)} s (${dl.toFixed(1)} s)`);
  for (const e of el) console.log(`  ${e.od === null ? '   –  ' : e.od.toFixed(1).padStart(5) + 's'} ${e.ile.toFixed(1).padStart(5)}s widać  ${e.k.split('|').slice(1).join(' | ')}`);
  for (const u of uwagi) console.log('  !! ' + u);
  start += dl;
}
if (jsonOut) fs.writeFileSync(path.resolve(ROOT, jsonOut), JSON.stringify(wynik, null, 1));
await b.close(); srv.close();
