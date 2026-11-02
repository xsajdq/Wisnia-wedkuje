// Biblioteka sprzętu 2D (Wiśnia Wędkuje) – styl jak postacie.js i przynety.js: śliwkowy kontur, ilustracyjne cieniowanie,
// części ruchome osobno. Każdy element: stworzX({ dl, ... }) → THREE.Group z userData.sprzet = { anim(t, st), dl, nos? }.
//   wedka       – spinning: dolnik z korka, uchwyt z kołowrotkiem, blank z przelotkami; przelotki i kołowrotek po tej samej
//                 stronie blanku, odmiana wygięta ugina się na tę samą stronę
//   kolowrotek  – kołowrotek o stałej szpuli: stopka, korpus, rotor z kabłąkiem, szpula z plecionką, korbka (kręci się)
//   plecionka   – szpula plecionki (kolor linki do wyboru)
//   przypon     – odcinek fluorocarbonu z krętlikiem i agrafką
//   dropShot    – zestaw drop shot: linka pionowo, hak wiązany w bok z małą gumą, niżej ciężarek na dnie (nos = góra linki)
//   splawikRobak– spławik z anteną, śruciny, haczyk z robakiem (robak się wije; nos = szczyt anteny)
import * as THREE from 'three';
import { INK, narzedzia } from './postacie.js';
const { gladko, obrys, wypelnij, lg, czesc, odmiany, zloz, nowyNumer } = narzedzia;
const STAL = '#b8c0c8';
const blik = (g, x, y, rx, ry, a = .7) => { g.beginPath(); g.ellipse(x, y, rx, ry, -.2, 0, 7); wypelnij(g, `rgba(255,255,255,${a})`); };
function podepnij(rodzic, dziecko) { dziecko.position.sub(rodzic.position); dziecko.userData.pozycja0 = dziecko.position.clone(); rodzic.add(dziecko); }
const pkt = (s, O, p) => new THREE.Vector3((p[0] - O[0]) * s, (O[1] - p[1]) * s, 0);

// ---------- WĘDKA spinningowa (poziomo: dolnik z lewej, szczytówka z prawej) ----------
export function stworzWedke({ dl = 2.1, blank = '#3b3f48', wygieta = 0, zKolowrotkiem = true } = {}) {
  const s = dl / 1600, O = [800, 60], kb = nowyNumer();
  const rys = ug => g => {
    const Y = x => 60 + ug * 180 * Math.max(0, (x - 700) / 900) ** 2;                    // ugięcie szczytówki w dół – na stronę przelotek i kołowrotka
    const linia = (x0, x1) => { g.beginPath(); for (let x = x0; x <= x1; x += 20) (x === x0 ? g.moveTo(x, Y(x)) : g.lineTo(x, Y(x))); };
    linia(330, 1590); obrys(g, 13, INK); linia(330, 1590); obrys(g, 7, blank);           // blank
    linia(1100, 1590); obrys(g, 4, '#e2452a');                                            // kolorowa szczytówka
    g.beginPath(); g.roundRect(10, 40, 260, 40, 18); wypelnij(g, lg(g, 0, 40, 0, 80, [[0, '#e6c78e'], [1, '#a9824c']])); obrys(g, 7);   // dolnik z korka
    for (let x = 30; x < 260; x += 22) { g.beginPath(); g.arc(x, 52 + (x % 3) * 6, 2.2, 0, 7); wypelnij(g, 'rgba(90,60,30,.5)'); }
    g.beginPath(); g.roundRect(268, 44, 90, 32, 6); wypelnij(g, lg(g, 0, 44, 0, 76, [[0, '#9aa3ad'], [1, '#3b3f48']])); obrys(g, 6);   // uchwyt kołowrotka
    g.beginPath(); g.roundRect(356, 46, 120, 28, 12); wypelnij(g, '#c9a46a'); obrys(g, 6);                                         // górny korek
    for (const [x, r] of [[620, 22], [860, 16], [1060, 12], [1240, 9], [1400, 7], [1520, 6]]) {                                     // przelotki
      g.beginPath(); g.moveTo(x - r, Y(x)); g.lineTo(x, Y(x) + r * 2.1); g.lineTo(x + r, Y(x)); obrys(g, 4); g.beginPath(); g.arc(x, Y(x) + r * 2.4, r * .8, 0, 7); obrys(g, 4); obrys(g, 2, STAL); }
    g.beginPath(); g.arc(1590, Y(1590), 6, 0, 7); obrys(g, 4);                                                                    // przelotka szczytowa
    if (zKolowrotkiem) {   // kołowrotek pod uchwytem – po tej samej stronie co przelotki; szpula w stronę szczytówki
      g.save(); g.translate(312, 80); g.scale(.3, .3); rysujKolowrotek(g, { kl: 2.4 }); g.restore();
      g.beginPath(); g.moveTo(312 + 188 * .3, 80 + 318 * .3); g.quadraticCurveTo(500, 120, 620, Y(620) + 22 * 2.4); obrys(g, 1.6, '#7bc043');        // plecionka do 1. przelotki
    }
  };
  const w = odmiany(czesc(s, ...O, [0, 0, 1610, 280], [140, 60], () => {}, { kolejnosc: 0 }), { prosta: rys(0), wygieta: rys(1) });
  w.userData.ustaw(wygieta ? 'wygieta' : 'prosta');
  const grupa = zloz([w], kb);
  grupa.userData.sprzet = { dl, nos: pkt(s, O, [1590, 60]), anim: (t, st = {}) => w.userData.ustaw(st.wygieta ? 'wygieta' : 'prosta') };
  return grupa;
}
// ---------- KOŁOWROTEK o stałej szpuli (widok z boku, stopka u góry, korbka po prawej kręci się) ----------
// Kołowrotek o stałej szpuli – widok z boku, stopka u góry (pod wędką), szpula w stronę szczytówki (+x).
// Układ lokalny: środek stopki w (0, 0); oś korbki w (KX, KY). kl – mnożnik grubości konturu (przy małej skali w wędce).
const KX = -30, KY = 232;
function rysujKolowrotek(g, { kl = 1, plecionka = '#7bc043', korpus = '#3b3f48', korbka = true } = {}) {
  const o = (w, k) => obrys(g, w * kl, k);
  // noga: wygięta, rozszerza się do korpusu (jedna bryła ze stopką i korpusem)
  g.beginPath(); g.moveTo(-26, 8); g.bezierCurveTo(-30, 60, -52, 100, -70, 150); g.lineTo(30, 150); g.bezierCurveTo(20, 100, 20, 50, 18, 8); g.closePath();
  wypelnij(g, lg(g, -60, 0, 30, 0, [[0, '#23262c'], [.55, korpus], [1, '#6a717a']])); o(7);
  g.beginPath(); g.moveTo(-112, 4); g.quadraticCurveTo(-100, -16, -60, -14); g.lineTo(60, -14); g.quadraticCurveTo(100, -16, 112, 4); g.lineTo(60, 12); g.lineTo(-60, 12); g.closePath();
  wypelnij(g, lg(g, 0, -16, 0, 12, [[0, '#d7dde2'], [1, '#7c8792']])); o(6);                                     // stopka (wchodzi w uchwyt wędki)
  // korpus (obudowa przekładni) z dekielkiem i śrubkami
  g.beginPath(); g.ellipse(KX, KY, 92, 100, 0, 0, 7); wypelnij(g, lg(g, KX - 90, KY - 100, KX + 90, KY + 100, [[0, '#7a818a'], [.45, korpus], [1, '#16181c']])); o(8);
  g.beginPath(); g.ellipse(KX - 6, KY + 2, 58, 64, 0, 0, 7); wypelnij(g, lg(g, KX - 60, KY - 60, KX + 50, KY + 60, [[0, '#5d646d'], [1, '#2a2d33']])); o(4, 'rgba(0,0,0,.55)');
  for (const [dx, dy] of [[-44, -36], [36, -40], [-40, 46], [40, 44]]) { g.beginPath(); g.arc(KX + dx, KY + dy, 5, 0, 7); wypelnij(g, '#9aa3ad'); o(2); }
  blik(g, KX - 30, KY - 62, 34, 10, .3);
  g.beginPath(); g.roundRect(KX - 112, KY + 70, 34, 16, 6); wypelnij(g, '#9aa3ad'); o(4);                    // przełącznik blokady wstecznej
  // rotor (miseczka) i ramiona rotora
  g.beginPath(); g.moveTo(48, 132); g.lineTo(120, 156); g.lineTo(120, 308); g.lineTo(48, 332); g.closePath(); wypelnij(g, lg(g, 48, 0, 120, 0, [[0, '#2a2d33'], [.6, korpus], [1, '#5a6068']])); o(7);
  for (const [y0, y1] of [[150, 146], [314, 318]]) { g.beginPath(); g.moveTo(96, y0 - 8); g.lineTo(186, y1 - 6); g.lineTo(186, y1 + 6); g.lineTo(96, y0 + 8); g.closePath(); wypelnij(g, '#5a6068'); o(5); }
  // szpula: fartuch, nawinięta plecionka, kołnierz, hamulec
  g.beginPath(); g.roundRect(114, 146, 30, 172, 8); wypelnij(g, lg(g, 114, 0, 144, 0, [[0, '#7c8792'], [.5, '#e8edf1'], [1, '#7c8792']])); o(6);
  g.beginPath(); g.rect(144, 170, 60, 124); wypelnij(g, plecionka); o(4, 'rgba(36,23,38,.6)');
  g.save(); g.beginPath(); g.rect(144, 170, 60, 124); g.clip(); for (let y = 168; y < 300; y += 7) { g.beginPath(); g.moveTo(144, y); g.lineTo(204, y + 5); o(1.6, 'rgba(0,0,0,.2)'); }
  g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(150, 172, 10, 120); g.restore();
  g.beginPath(); g.roundRect(200, 156, 14, 152, 5); wypelnij(g, lg(g, 200, 0, 214, 0, [[0, '#e8edf1'], [1, '#8e98a3']])); o(6);       // kołnierz szpuli
  g.beginPath(); g.roundRect(212, 196, 40, 72, 10); wypelnij(g, lg(g, 0, 196, 0, 268, [[0, '#6a717a'], [.5, '#2a2d33'], [1, '#16181c']])); o(6);   // pokrętło hamulca
  for (let y = 204; y < 264; y += 9) { g.beginPath(); g.moveTo(216, y); g.lineTo(248, y); o(1.6, 'rgba(255,255,255,.25)'); }
  // kabłąk: od rolki prowadzącej (dolne ramię) łukiem przed szpulą do górnego ramienia
  const kab = () => { g.beginPath(); g.moveTo(188, 318); g.bezierCurveTo(262, 350, 300, 260, 280, 214); g.bezierCurveTo(262, 168, 226, 146, 188, 146); };
  kab(); o(10); kab(); o(4.5, STAL);
  g.beginPath(); g.roundRect(176, 306, 26, 22, 6); wypelnij(g, '#e9c85a'); o(4);                                // rolka prowadząca żyłkę
  if (korbka) rysujKorbke(g, kl, -.6);
}
function rysujKorbke(g, kl = 1, kat = -.6) {   // ramię korbki z gałką; kat – położenie ramienia
  const o = (w, k) => obrys(g, w * kl, k), ex = KX + Math.cos(kat) * 150, ey = KY + Math.sin(kat) * 150;
  g.beginPath(); g.arc(KX, KY, 26, 0, 7); wypelnij(g, lg(g, KX - 26, KY - 26, KX + 26, KY + 26, [[0, '#d7dde2'], [1, '#6a717a']])); o(6);   // nakrętka osi
  g.beginPath(); g.moveTo(KX, KY); g.lineTo(ex, ey); o(22); g.beginPath(); g.moveTo(KX, KY); g.lineTo(ex, ey); o(12, '#9aa3ad');
  g.beginPath(); g.arc(ex, ey, 10, 0, 7); wypelnij(g, '#9aa3ad'); o(4);
  g.save(); g.translate(ex, ey); g.rotate(kat); g.beginPath(); g.roundRect(-10, -34, 34, 68, 14);                         // gałka (T) w poprzek ramienia
  wypelnij(g, lg(g, -10, 0, 24, 0, [[0, '#f4efe2'], [1, '#b8915a']])); o(6); g.restore();
}
export function stworzKolowrotek({ dl = .4, plecionka = '#7bc043', korpus = '#3b3f48' } = {}) {
  const s = dl / 520, T = [260, 30], O = [300, 250], OS = [T[0] + KX, T[1] + KY], kb = nowyNumer();
  const cialo = czesc(s, ...O, [40, 0, 580, 420], OS, g => { g.translate(...T); rysujKolowrotek(g, { plecionka, korpus, korbka: false }); }, { kolejnosc: 0 });
  const korbka = czesc(s, ...O, [OS[0] - 200, OS[1] - 200, OS[0] + 200, OS[1] + 200], OS, g => { g.translate(...T); rysujKorbke(g, 1, 0); }, { kolejnosc: 1 });
  const grupa = zloz([cialo, korbka], kb); podepnij(cialo, korbka);
  grupa.userData.sprzet = { dl, anim: (t, st = {}) => { korbka.rotation.z = -(st.obroty ?? 1) * t * 6; } };
  return grupa;
}
// ---------- SZPULA PLECIONKI ----------
export function stworzPlecionke({ dl = .25, kolor = '#7bc043' } = {}) {   // szpula w ujęciu 3/4: dwie tarcze i gruby wałek nawiniętej plecionki (splot na krzyż)
  const s = dl / 300, O = [150, 150], kb = nowyNumer(), ciemny = new THREE.Color(kolor).multiplyScalar(.7).getStyle();
  const c = czesc(s, ...O, [0, 0, 330, 300], [150, 150], g => {
    const tarcza = (x, jasna) => { g.beginPath(); g.ellipse(x, 150, 44, 136, 0, 0, 7); wypelnij(g, lg(g, x - 44, 20, x + 44, 280, jasna ? [[0, '#ffffff'], [.5, '#d7dde2'], [1, '#8e98a3']] : [[0, '#aeb8c2'], [1, '#5d646d']])); obrys(g, 8); };
    tarcza(232, false);                                                                                                       // tylna tarcza
    const walek = () => { g.beginPath(); g.moveTo(88, 40); g.lineTo(232, 40); g.ellipse(232, 150, 36, 110, 0, -Math.PI / 2, Math.PI / 2); g.lineTo(88, 260); g.closePath(); };
    walek(); wypelnij(g, lg(g, 0, 40, 0, 260, [[0, ciemny], [.3, kolor], [.55, '#ffffff'], [.62, kolor], [1, ciemny]]));
    g.save(); walek(); g.clip(); for (let x = 40; x < 300; x += 12) { g.beginPath(); g.moveTo(x, 40); g.lineTo(x + 60, 260); obrys(g, 2, 'rgba(0,0,0,.18)'); g.beginPath(); g.moveTo(x + 60, 40); g.lineTo(x, 260); obrys(g, 1.5, 'rgba(255,255,255,.2)'); } g.restore();
    walek(); obrys(g, 6);
    tarcza(88, true);                                                                                                         // przednia tarcza z etykietą
    g.beginPath(); g.ellipse(88, 150, 24, 74, 0, 0, 7); wypelnij(g, kolor); obrys(g, 4);
    g.beginPath(); g.ellipse(88, 150, 9, 26, 0, 0, 7); wypelnij(g, '#3b3f48'); obrys(g, 4);
    blik(g, 76, 80, 8, 30, .6);
    g.beginPath(); g.moveTo(232, 42); g.bezierCurveTo(280, 30, 300, 60, 322, 20); obrys(g, 6, INK); g.beginPath(); g.moveTo(232, 42); g.bezierCurveTo(280, 30, 300, 60, 322, 20); obrys(g, 3.5, kolor);   // wolny koniec
  }, { kolejnosc: 0 });
  const grupa = zloz([c], kb);
  grupa.userData.sprzet = { dl, anim: () => {} };
  return grupa;
}
// ---------- PRZYPON: fluorocarbon z krętlikiem (lewo) i agrafką (prawo) ----------
export function stworzPrzypon({ dl = .35 } = {}) {
  const s = dl / 700, O = [350, 60], kb = nowyNumer();
  const c = czesc(s, ...O, [0, 0, 700, 120], [350, 60], g => {
    g.beginPath(); g.moveTo(0, 60); g.lineTo(40, 60); obrys(g, 9, INK); g.beginPath(); g.moveTo(0, 60); g.lineTo(40, 60); obrys(g, 5, '#7bc043');                                                     // plecionka
    g.beginPath(); g.ellipse(70, 60, 30, 16, 0, 0, 7); obrys(g, 8); obrys(g, 4, STAL); g.beginPath(); g.ellipse(70, 60, 12, 8, 0, 0, 7); wypelnij(g, '#7c8792');   // krętlik
    g.beginPath(); g.moveTo(100, 60); g.lineTo(590, 60); obrys(g, 10, 'rgba(36,23,38,.75)'); g.beginPath(); g.moveTo(100, 60); g.lineTo(590, 60); obrys(g, 5, 'rgba(225,242,255,1)');   // fluorocarbon (wyraźny w kadrze)
    g.beginPath(); g.moveTo(590, 60); g.lineTo(640, 40); g.quadraticCurveTo(690, 50, 660, 72); g.lineTo(600, 72); g.closePath(); obrys(g, 7); obrys(g, 3.5, STAL);   // agrafka
  }, { kolejnosc: 0 });
  const grupa = zloz([c], kb);
  grupa.userData.sprzet = { dl, nos: pkt(s, O, [0, 60]), anim: () => {} };
  return grupa;
}
// ---------- DROP SHOT: linka pionowo, hak z gumą ok. 1/3 wysokości, ciężarek na dnie ----------
export function stworzDropShot({ dl = .7, guma = '#e2a63c' } = {}) {
  const s = dl / 700, O = [150, 350], HAK = [150, 380], kb = nowyNumer();
  const linka = czesc(s, ...O, [100, 0, 220, 700], [150, 350], g => {
    g.beginPath(); g.moveTo(150, 0); g.lineTo(150, 590); obrys(g, 8, 'rgba(36,23,38,.6)'); g.beginPath(); g.moveTo(150, 0); g.lineTo(150, 590); obrys(g, 4, 'rgba(220,240,255,.95)');
    // ciężarek drop shot (kropla) z oczkiem
    g.beginPath(); g.arc(150, 596, 9, 0, 7); obrys(g, 5); obrys(g, 2.5, STAL);
    g.beginPath(); g.moveTo(150, 605); g.bezierCurveTo(105, 640, 115, 698, 150, 698); g.bezierCurveTo(185, 698, 195, 640, 150, 605); wypelnij(g, lg(g, 110, 600, 190, 700, [[0, '#9aa3ad'], [1, '#3b3f48']])); obrys(g, 7);
    blik(g, 138, 650, 8, 18, .5);
    g.beginPath(); g.arc(150, 380, 7, 0, 7); wypelnij(g, INK);                                                                     // węzeł Palomar
  }, { kolejnosc: 0 });
  const przyneta = czesc(s, ...O, [140, 300, 420, 470], HAK, g => {   // haczyk wiązany prosto do linki (Palomar), grot do góry, guma za nos
    const ks = [[198, 376], [240, 366], [300, 368], [360, 378], [410, 386], [360, 398], [300, 400], [240, 398], [200, 392]];
    gladko(g, ks); wypelnij(g, lg(g, 0, 364, 0, 402, [[0, guma], [1, '#ffffff']])); g.save(); gladko(g, ks); g.clip();
    for (let x = 220; x < 400; x += 16) { g.beginPath(); g.moveTo(x, 356); g.lineTo(x - 4, 412); obrys(g, 2.5, 'rgba(36,23,38,.35)'); } g.restore(); gladko(g, ks); obrys(g, 6);
    const hak = () => { g.beginPath(); g.moveTo(150, 380); g.lineTo(184, 384); g.quadraticCurveTo(212, 388, 210, 362); g.lineTo(206, 340); };
    hak(); obrys(g, 7); hak(); obrys(g, 3, STAL);                                                                                // trzonek, kolanko, grot do góry przez nos gumy
    g.beginPath(); g.moveTo(206, 340); g.lineTo(201, 330); g.lineTo(212, 336); g.closePath(); wypelnij(g, STAL); obrys(g, 2.5);  // grot
    g.beginPath(); g.moveTo(207, 348); g.lineTo(215, 354); obrys(g, 2.5);                                                       // zadzior
  }, { kolejnosc: 1 });
  const grupa = zloz([linka, przyneta], kb); podepnij(linka, przyneta); const f = Math.random() * 6;
  grupa.userData.sprzet = { dl, nos: pkt(s, O, [150, 0]), anim: (t) => { przyneta.rotation.z = .08 * Math.sin(t * 6 + f) + .05 * Math.sin(t * 13 + f); } };
  return grupa;
}
// ---------- SPŁAWIK z robakiem: antena nad wodą (nos = szczyt anteny), śruciny, haczyk z wijącym się robakiem ----------
export function stworzSplawikRobak({ dl = 1, przeglebienie = 700 } = {}) {
  const s = dl / (przeglebienie + 260), O = [120, 140], ROBAK = [120, 140 + przeglebienie], kb = nowyNumer();
  const spl = czesc(s, ...O, [40, 0, 200, 280 + przeglebienie], [120, 140], g => {
    g.beginPath(); g.moveTo(120, 0); g.lineTo(120, 60); obrys(g, 12, INK); obrys(g, 7, '#ff5a2a');                                 // antena
    g.beginPath(); g.moveTo(120, 56); g.bezierCurveTo(160, 90, 156, 170, 120, 200); g.bezierCurveTo(84, 170, 80, 90, 120, 56); wypelnij(g, lg(g, 0, 60, 0, 200, [[0, '#ffd23a'], [.45, '#ffd23a'], [.46, '#f4efe2'], [1, '#d9d3c4']])); obrys(g, 7);
    blik(g, 108, 110, 6, 22, .55);
    g.beginPath(); g.moveTo(120, 200); g.lineTo(120, 236); obrys(g, 6, INK);                                                       // kil
    g.beginPath(); g.moveTo(120, 236); g.lineTo(120, 140 + przeglebienie); obrys(g, 8, 'rgba(36,23,38,.6)'); g.beginPath(); g.moveTo(120, 236); g.lineTo(120, 140 + przeglebienie); obrys(g, 4, 'rgba(220,240,255,.9)');
    for (const y of [.55, .72, .8]) { g.beginPath(); g.arc(120, 236 + (przeglebienie - 96) * y, 9, 0, 7); wypelnij(g, '#7c8792'); obrys(g, 4); }   // śruciny
  }, { kolejnosc: 0 });
  const robak = czesc(s, ...O, [60, przeglebienie + 100, 200, przeglebienie + 280], ROBAK, g => {
    const Y = przeglebienie + 140;
    g.beginPath(); g.moveTo(120, Y); g.lineTo(120, Y + 70); g.quadraticCurveTo(120, Y + 100, 96, Y + 96); g.quadraticCurveTo(80, Y + 90, 84, Y + 70); obrys(g, 6); g.beginPath(); g.moveTo(120, Y); g.lineTo(120, Y + 70); g.quadraticCurveTo(120, Y + 100, 96, Y + 96); g.quadraticCurveTo(80, Y + 90, 84, Y + 70); obrys(g, 2.5, STAL);
    const pts = [[118, Y + 20], [150, Y + 40], [130, Y + 70], [95, Y + 82], [110, Y + 110], [150, Y + 128], [128, Y + 150]];
    g.beginPath(); g.moveTo(...pts[0]); for (let i = 1; i < pts.length - 1; i++) g.quadraticCurveTo(...pts[i], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2); g.lineTo(...pts[pts.length - 1]);
    obrys(g, 22, INK); g.beginPath(); g.moveTo(...pts[0]); for (let i = 1; i < pts.length - 1; i++) g.quadraticCurveTo(...pts[i], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2); g.lineTo(...pts[pts.length - 1]); obrys(g, 14, '#c95a6a');
    g.beginPath(); g.ellipse(128, Y + 74, 14, 8, .4, 0, 7); wypelnij(g, '#e88a8a');                                                // siodełko
  }, { kolejnosc: 1 });
  const grupa = zloz([spl, robak], kb); podepnij(spl, robak); const f = Math.random() * 6;
  grupa.userData.sprzet = { dl, nos: pkt(s, O, [120, 0]), wodaY: pkt(s, O, [120, 110]).y, anim: (t) => { spl.rotation.z = .03 * Math.sin(t * 1.7 + f); robak.rotation.z = .25 * Math.sin(t * 3.2 + f); robak.scale.x = 1 + .12 * Math.sin(t * 4.1 + f); } };
  return grupa;
}
export const SPRZET = { wedka: stworzWedke, kolowrotek: stworzKolowrotek, plecionka: stworzPlecionke, przypon: stworzPrzypon, dropShot: stworzDropShot, splawikRobak: stworzSplawikRobak };
