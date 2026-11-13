// Sprawdza kolizje rąk z tułowiem wędkarza 3D w pozach i w ruchu (karta_wedkarz3d.html)
import { chromium } from 'playwright'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const ROOT = '/home/user/Wisnia-wedkuje';
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': p.endsWith('.js') ? 'text/javascript' : 'text/html' }); fs.createReadStream(p).pipe(r); }).listen(0);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const pg = await b.newPage();
pg.on('pageerror', e => console.error('błąd', e.message));
await pg.goto(`http://localhost:${srv.address().port}/atlas3d/karta_wedkarz3d.html`); await pg.waitForFunction(() => window.gotowe);
const wynik = await pg.evaluate(async () => { const { stworzWedkarza3D } = await import('./postacie.js'); const o = {};
  for (const [n, f] of Object.entries({ spokoj: () => ({}), hol: () => ({ hol: true }), trzyma: () => ({ trzyma: true }), podrywanie: () => ({ podrywanie: true }), rzut: t => ({ rzut: (t % 2) / 2 }) })) {
    const w = stworzWedkarza3D({ wys: 1.9 }); let m = 0; for (let i = 0; i < 120; i++) { const t = i / 24; w.userData.wedkarz.anim(t, f(t)); m = Math.max(m, w.userData.kolizjeRak()); } o[n] = +m.toFixed(3); }
  return o; });
console.log(wynik); await b.close(); srv.close();
