// Automatyczna kontrola płynności ruchu (zasada projektu: ruchy WSZYSTKICH postaci płynne, bez przeskoków pozycji, kierunku i pozy).
// node atlas3d/kontrola_ruchu.mjs <film> <scena> [fps=24] – przechodzi scenę klatka po klatce i zgłasza:
//  • skok pozycji (prędkość w jednej klatce > 3× mediany i > 1,5 m/s różnicy), • nagły zwrot (> 220°/s), • skok kamery.
import { przegladarka, serwer } from './przegladarka.mjs';
const [film, sc, fpsA] = process.argv.slice(2), FPS = Number(fpsA || 24);
const srv = serwer(), { przegladarka: b } = await przegladarka(), pg = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: .3 });
pg.on('pageerror', e => console.log('BŁĄD', e.message));
await pg.goto(`http://localhost:${srv.address().port}/atlas3d/${film}.html?skala=0.3`); await pg.waitForFunction(() => window.gotowe);
const dl = await pg.evaluate(s => window.zbuduj(+s), sc), N = Math.round(dl * FPS), slady = {};
for (let i = 0; i < N; i++) {
  const r = await pg.evaluate(t => { window.klatka(t); const out = {}; let k = 0;
    window.__scene().traverse(o => { const u = o.userData; if (!(u.ryba || u.postac || u.przyneta)) return; const n = (u.ryba ? 'ryba' : u.postac ? 'postać' : 'przynęta') + '#' + (k++);
      const p = o.getWorldPosition(o.position.clone()); out[n] = [p.x, p.y, p.z, u.wnetrze ? u.wnetrze.rotation.y : 0]; });
    const c = window.__cam().position; out['kamera'] = [c.x, c.y, c.z, 0]; return out; }, i / FPS);
  for (const [n, v] of Object.entries(r)) (slady[n] ||= []).push(v); }
await b.close(); srv.close();
let problemy = 0;
for (const [n, s] of Object.entries(slady)) {
  const v = []; for (let i = 1; i < s.length; i++) v.push(Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1], s[i][2] - s[i - 1][2]) * FPS);
  const med = [...v].sort((a, b) => a - b)[v.length >> 1] || 0;
  for (let i = 1; i < v.length; i++) { const dv = Math.abs(v[i] - v[i - 1]);
    if (dv > 1.5 && v[i] > 3 * Math.max(med, .2)) { console.log(`${n}: skok prędkości w ${(i / FPS).toFixed(2)} s (${v[i - 1].toFixed(2)} → ${v[i].toFixed(2)} m/s)`); problemy++; } }
  for (let i = 1; i < s.length; i++) { let d = s[i][3] - s[i - 1][3]; d = Math.atan2(Math.sin(d), Math.cos(d)); const w = Math.abs(d) * FPS * 180 / Math.PI;
    if (w > 220) { console.log(`${n}: nagły zwrot w ${(i / FPS).toFixed(2)} s (${w.toFixed(0)}°/s)`); problemy++; } } }
console.log(problemy ? `Zgłoszenia: ${problemy} (sprawdź klatka po klatce)` : 'Ruch płynny: brak skoków pozycji i zwrotów.');
