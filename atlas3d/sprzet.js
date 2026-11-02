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
      g.beginPath(); g.moveTo(312, 76); g.lineTo(312, 122); obrys(g, 16, INK); obrys(g, 9, '#3b3f48');
      g.beginPath(); g.roundRect(286, 70, 54, 12, 4); wypelnij(g, '#9aa3ad'); obrys(g, 4);
      g.beginPath(); g.ellipse(300, 150, 36, 32, 0, 0, 7); wypelnij(g, lg(g, 264, 118, 336, 182, [[0, '#6a717a'], [1, '#1e2126']])); obrys(g, 6);
      g.beginPath(); g.roundRect(334, 128, 46, 46, 8); wypelnij(g, '#d7dde2'); obrys(g, 5); g.beginPath(); g.roundRect(342, 135, 30, 32, 5); wypelnij(g, '#7bc043');
      g.beginPath(); g.moveTo(380, 168); g.quadraticCurveTo(404, 196, 360, 196); obrys(g, 5); g.beginPath(); g.moveTo(380, 168); g.quadraticCurveTo(404, 196, 360, 196); obrys(g, 2, STAL);   // kabłąk
      g.beginPath(); g.moveTo(300, 150); g.lineTo(250, 186); obrys(g, 8, INK); g.beginPath(); g.ellipse(246, 192, 9, 13, .5, 0, 7); wypelnij(g, '#f4efe2'); obrys(g, 4);   // korbka
      g.beginPath(); g.moveTo(380, 150); g.quadraticCurveTo(520, 110, 620, Y(620) + 22 * 2.4); obrys(g, 1.6, '#7bc043');        // plecionka do 1. przelotki
    }
  };
  const w = odmiany(czesc(s, ...O, [0, 0, 1610, 280], [140, 60], () => {}, { kolejnosc: 0 }), { prosta: rys(0), wygieta: rys(1) });
  w.userData.ustaw(wygieta ? 'wygieta' : 'prosta');
  const grupa = zloz([w], kb);
  grupa.userData.sprzet = { dl, nos: pkt(s, O, [1590, 60]), anim: (t, st = {}) => w.userData.ustaw(st.wygieta ? 'wygieta' : 'prosta') };
  return grupa;
}
// ---------- KOŁOWROTEK o stałej szpuli (widok z boku, stopka u góry, korbka po prawej kręci się) ----------
export function stworzKolowrotek({ dl = .4, plecionka = '#7bc043', korpus = '#3b3f48' } = {}) {
  const s = dl / 520, O = [260, 220], OS = [300, 250], kb = nowyNumer();
  const cialo = czesc(s, ...O, [0, 0, 520, 420], [260, 220], g => {
    g.beginPath(); g.moveTo(250, 30); g.lineTo(250, 120); obrys(g, 34, INK); obrys(g, 22, korpus);                               // noga
    g.beginPath(); g.roundRect(150, 14, 210, 30, 10); wypelnij(g, '#9aa3ad'); obrys(g, 7);                                        // stopka
    // szpula z plecionką (z przodu, po lewej)
    g.beginPath(); g.roundRect(40, 150, 110, 200, 22); wypelnij(g, lg(g, 40, 0, 150, 0, [[0, '#d7dde2'], [.5, '#ffffff'], [1, '#8e98a3']])); obrys(g, 7);
    g.beginPath(); g.roundRect(56, 168, 78, 164, 14); wypelnij(g, plecionka); obrys(g, 4, 'rgba(36,23,38,.6)');
    for (let y = 176; y < 330; y += 9) { g.beginPath(); g.moveTo(58, y); g.lineTo(132, y + 4); obrys(g, 2, 'rgba(0,0,0,.18)'); }
    blik(g, 80, 200, 10, 60, .45);
    // rotor i korpus
    g.beginPath(); g.moveTo(150, 170); g.lineTo(230, 140); g.lineTo(230, 360); g.lineTo(150, 330); g.closePath(); wypelnij(g, lg(g, 150, 0, 230, 0, [[0, '#5a6068'], [1, korpus]])); obrys(g, 7);
    g.beginPath(); g.ellipse(310, 250, 95, 110, 0, 0, 7); wypelnij(g, lg(g, 220, 150, 400, 350, [[0, '#6a717a'], [.5, korpus], [1, '#1e2126']])); obrys(g, 8);
    blik(g, 285, 190, 40, 14, .35);
    g.beginPath(); g.arc(300, 250, 22, 0, 7); wypelnij(g, '#9aa3ad'); obrys(g, 6);                                                // oś korbki
    // kabłąk i rolka prowadząca
    g.beginPath(); g.moveTo(150, 330); g.quadraticCurveTo(70, 420, 30, 300); obrys(g, 9); g.beginPath(); g.moveTo(150, 330); g.quadraticCurveTo(70, 420, 30, 300); obrys(g, 4, STAL);
    g.beginPath(); g.arc(150, 330, 12, 0, 7); wypelnij(g, '#e9c85a'); obrys(g, 5);
  }, { kolejnosc: 0 });
  const korbka = czesc(s, ...O, [260, 110, 520, 290], OS, g => {
    g.beginPath(); g.moveTo(300, 250); g.lineTo(450, 180); obrys(g, 18, INK); obrys(g, 10, '#9aa3ad');
    g.beginPath(); g.roundRect(430, 135, 50, 80, 22); wypelnij(g, lg(g, 430, 0, 480, 0, [[0, '#f4efe2'], [1, '#c9a46a']])); obrys(g, 7);   // gałka
  }, { kolejnosc: 1 });
  const grupa = zloz([cialo, korbka], kb); podepnij(cialo, korbka);
  grupa.userData.sprzet = { dl, anim: (t, st = {}) => { korbka.rotation.z = -(st.obroty ?? 1) * t * 6; } };
  return grupa;
}
// ---------- SZPULA PLECIONKI ----------
export function stworzPlecionke({ dl = .25, kolor = '#7bc043' } = {}) {
  const s = dl / 300, O = [150, 150], kb = nowyNumer();
  const c = czesc(s, ...O, [0, 0, 300, 300], [150, 150], g => {
    g.beginPath(); g.arc(150, 150, 140, 0, 7); wypelnij(g, lg(g, 20, 20, 280, 280, [[0, '#f4f7fa'], [1, '#8e98a3']])); obrys(g, 8);   // tarcza szpuli
    g.beginPath(); g.arc(150, 150, 112, 0, 7); wypelnij(g, kolor); obrys(g, 5, 'rgba(36,23,38,.6)');
    for (let r = 50; r < 112; r += 7) { g.beginPath(); g.arc(150, 150, r, 0, 7); obrys(g, 1.6, 'rgba(0,0,0,.16)'); }
    g.beginPath(); g.arc(150, 150, 46, 0, 7); wypelnij(g, '#e9edf0'); obrys(g, 6); g.beginPath(); g.arc(150, 150, 18, 0, 7); wypelnij(g, '#3b3f48'); obrys(g, 5);
    blik(g, 105, 95, 34, 12, .5);
    g.beginPath(); g.moveTo(240, 80); g.quadraticCurveTo(290, 40, 300, 10); obrys(g, 4, kolor);                                 // wolny koniec linki
  }, { kolejnosc: 0 });
  const grupa = zloz([c], kb);
  grupa.userData.sprzet = { dl, anim: () => {} };
  return grupa;
}
// ---------- PRZYPON: fluorocarbon z krętlikiem (lewo) i agrafką (prawo) ----------
export function stworzPrzypon({ dl = .35 } = {}) {
  const s = dl / 700, O = [350, 60], kb = nowyNumer();
  const c = czesc(s, ...O, [0, 0, 700, 120], [350, 60], g => {
    g.beginPath(); g.moveTo(0, 60); g.lineTo(40, 60); obrys(g, 4, '#7bc043');                                                     // plecionka
    g.beginPath(); g.ellipse(70, 60, 30, 16, 0, 0, 7); obrys(g, 8); obrys(g, 4, STAL); g.beginPath(); g.ellipse(70, 60, 12, 8, 0, 0, 7); wypelnij(g, '#7c8792');   // krętlik
    g.beginPath(); g.moveTo(100, 60); g.lineTo(590, 60); obrys(g, 5, 'rgba(36,23,38,.35)'); g.beginPath(); g.moveTo(100, 60); g.lineTo(590, 60); obrys(g, 2.5, 'rgba(220,240,255,.95)');   // fluorocarbon
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
