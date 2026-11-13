// Kontrola: czy ręce wędkarza 3D wchodzą w tułów – 5 s każdej pozy (spokój, hol, trzyma, podrywanie, rzut).
// Wynik: największa głębokość wejścia (0 = brak kolizji). Użycie: node atlas3d/kontrola_rak.mjs
import { przegladarka, serwer } from './przegladarka.mjs';
const srv = serwer(), { przegladarka: b } = await przegladarka(), pg = await b.newPage();
pg.on('pageerror', e => console.error('błąd strony:', e.message));
await pg.goto(`http://localhost:${srv.address().port}/atlas3d/karta_wedkarz3d.html`); await pg.waitForFunction(() => window.gotowe);
const wynik = await pg.evaluate(async () => { const { stworzWedkarza3D } = await import('./postacie.js'); const o = {};
  for (const [n, f] of Object.entries({ spokoj: () => ({}), hol: () => ({ hol: true }), trzyma: () => ({ trzyma: true }), podrywanie: () => ({ podrywanie: true }), rzut: t => ({ rzut: (t % 2) / 2 }) })) {
    const w = stworzWedkarza3D({ wys: 1.9 }); let m = 0; for (let i = 0; i < 120; i++) { const t = i / 24; w.userData.wedkarz.anim(t, f(t)); m = Math.max(m, w.userData.kolizjeRak()); } o[n] = +m.toFixed(3); }
  return o; });
console.log(wynik, Object.values(wynik).every(v => v === 0) ? 'OK – brak kolizji' : 'UWAGA – ręce wchodzą w tułów');
await b.close(); srv.close();
