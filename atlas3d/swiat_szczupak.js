// Wspólny świat filmu „Szczupak – gdzie i jak łowić”: jezioro i rzeka (używane przez szczupak_gdzie.html i szczupak_film.html)
import { nowaScena, swiatJezioro, swiatRzeka, trzciny, palki, grzybienie, grazele, rdestnice, rogatki, laka, zatopioneDrzewo, konar, kamien, pomost, wazka,
  glowka, rzekaX, ZATOKA, nurtLinia, TEREN, LATO, wstaw } from './silnik.js';
import { REKWIZYTY } from './rekwizyty.js';
export const lodka = (x, z, rot = 0, o = {}) => wstaw(REKWIZYTY.lodz(o), x, z, { y: .2, rot, cienie: false });   // łódź na wodzie: wnętrze nad taflą (inaczej płaszczyzna wody zalewa łódź)
export const PX = -5;   // pomost
// ---------- JEZIORO SZCZUPAKA: płycizna z podwodną łąką na zachodzie, pas trzcin, zarośnięta zatoka, pola grzybieni i grążeli,
// pojedyncza kępa na górce na otwartej wodzie, zatopione drzewo na krawędzi płycizny, pomost z cieniem ----------
export const ZAT = { a: Math.PI - .5, szer: .26, ext: .55 };   // wąska, długa zatoka na zachodnio-północnym zachodzie
// punkt przy brzegu na promieniu w kierunku a (od środka jeziora na zewnątrz): pierwsze miejsce o głębokości ≤ gl (ujemne, np. -0,5 m)
export const brzeg = (a, gl = -.5) => { for (let d = 1.6; d > .3; d -= .005) { const x = Math.cos(a) * 32 * d, z = Math.sin(a) * 24 * d; if (TEREN(x, z) <= gl) return [x, z]; } return [0, 0]; };
export function JEZIORO(pora = LATO) {
  nowaScena({ ...pora, seed: 17 }); swiatJezioro({ gorka: { x: 4, z: 6, r: 4, top: -2.2 }, zatoka: ZAT, bezKonarow: true, snieg: !!pora.lod });
  pomost(PX, -26, -3);
  // pas trzcin wzdłuż zachodniego brzegu (woda ok. 0,4 m), pałki między nimi; trzciny po obu brzegach zatoki
  for (const a of [2.86, 2.98, 3.1, 3.22, 3.34]) trzciny(...brzeg(a, -.4), 16, 1.6);
  // trzciny dookoła brzegu zatoki: punkty o głębokości 0,2–0,5 m, co najmniej 2,4 m od siebie i z dala od grzybieni
  { const [lx, lz] = brzeg(ZAT.a, -.8), pkt = [];
    for (let x = -48; x <= -26; x += .6) for (let z = 4; z <= 22; z += .6) { const t = TEREN(x, z); if (t < -.5 || t > -.2) continue;
      if (Math.hypot(x - lx, z - lz) < 2.6 || pkt.some(([a, b]) => Math.hypot(a - x, b - z) < 2.4)) continue; pkt.push([x, z]); }
    pkt.forEach(([x, z], i) => i % 4 !== 3 && trzciny(x, z, 8, .9)); }
  palki(...brzeg(3.04, -.3), 10, .9); palki(...brzeg(ZAT.a + .16, -.3), 8, .8);
  // podwodna łąka na płyciźnie, kończy się na krawędzi (spad)
  laka(-24, -4, 4.2, 18); laka(-19, -1, 4, 18); laka(-20, 5.5, 3.6, 14);
  // pola grzybieni i grążeli: przy brzegu i w głębi zatoki
  grzybienie(...brzeg(2.66, -1), 12, 3.4); grazele(...brzeg(2.5, -1.2), 6, 2.6); grzybienie(...brzeg(ZAT.a, -.8), 9, 2.4);
  // pojedyncza kępa na otwartej wodzie: na szczycie górki
  rdestnice(4, 6, 1.7); rogatki(4.8, 6.6, 1.4); rdestnice(3.3, 5.4, 1.5);
  // zatopione drzewo na krawędzi płycizny, kłoda i kamienie
  zatopioneDrzewo(-17, -10, .25, 8); konar(-12, 2, 4.5, .9); kamien(-14.5, -3, 1); kamien(-13.6, -2.2, .7);
  wazka(-28.5, .8, 2);
}
// ---------- RZEKA SZCZUPAKA: zakole, zatoka (starorzecze połączone z korytem), główka z zastoiskiem, podmyty brzeg ----------
export function RZEKA(pora = LATO, poziom = 0) {
  nowaScena({ ...pora, seed: 29, wodaK: .042 }); swiatRzeka({ poziom, podmycia: [{ z0: -5.5, z1: 1.5, strona: -1, wysun: 1.5 }] });
  const zg = 4, xg = rzekaX(zg) + 9.4; glowka(xg, zg, 5.2, -1);
  trzciny(ZATOKA.x - 1.5, ZATOKA.z - 1.6, 14, 1.4); grzybienie(ZATOKA.x + .2, ZATOKA.z + .2, 8, 2.2); laka(ZATOKA.x + .6, ZATOKA.z - .4, 1.6, 6);
  rdestnice(xg - 2.2, zg + 2, 1.2); rogatki(xg - 3, zg + 2.6, 1);
  nurtLinia(-12, 14, { x: -.3, y: -.35 });
}
