// Biblioteka przynęt 2D (Wiśnia Wędkuje) – ten sam styl co postacie.js: śliwkowy kontur, ilustracyjne cieniowanie,
// części z własnymi osiami ruchu. Każda przynęta: widok z boku, „nos” (miejsce wiązania żyłki) w prawo.
// stworzX({ dl, ... }) zwraca THREE.Group, a grupa.userData.przyneta = { anim(t, { predkosc }), dl, nos }:
//   dl – długość przynęty w jednostkach świata, nos – punkt wiązania żyłki (lokalnie, do żyłki w scenie).
// Przynęty: twister, ripper (guma na główce jigowej), wahadłówka (blacha), obrotówka, wobler, mormyszka.
import * as THREE from 'three';
import { INK, narzedzia } from './postacie.js';
const { gladko, obrys, wypelnij, lg, czesc, odmiany, zloz, nowyNumer } = narzedzia;

// ---------- elementy wspólne ----------
function kotwiczka(g, x, y, r = 34, kat = 0) {          // kotwica z kółkiem: oczko w (x, y), trzonek w dół
  g.save(); g.translate(x, y); g.rotate(kat);
  const stal = '#9aa3ad';
  g.beginPath(); g.arc(0, 0, r * .22, 0, 7); obrys(g, 5); obrys(g, 2.5, stal);
  const hak = s => { g.beginPath(); g.moveTo(0, r * .2); g.lineTo(0, r * 1.25); g.quadraticCurveTo(0, r * 1.75, s * r * .55, r * 1.6); g.quadraticCurveTo(s * r * .82, r * 1.45, s * r * .78, r * 1.05); };
  for (const s of [-1, 1]) { hak(s); obrys(g, 7); hak(s); obrys(g, 3.5, stal);
    g.beginPath(); g.moveTo(s * r * .78, r * 1.05); g.lineTo(s * r * .62, r * 1.25); obrys(g, 4); }   // zadziory
  g.beginPath(); g.moveTo(0, r * .2); g.lineTo(0, r * 1.7); obrys(g, 7); obrys(g, 3.5, stal);
  g.restore();
}
function kolko(g, x, y, r = 12) { g.beginPath(); g.ellipse(x, y, r, r * .8, 0, 0, 7); obrys(g, 6); obrys(g, 3, '#b8c0c8'); }
function blik(g, x, y, rx, ry, a = .7) { g.beginPath(); g.ellipse(x, y, rx, ry, -.2, 0, 7); wypelnij(g, `rgba(255,255,255,${a})`); }
function brokat(g, x0, y0, x1, y1, n = 40, kol = 'rgba(255,255,255,.75)') {
  let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < n; i++) { g.beginPath(); g.arc(x0 + r() * (x1 - x0), y0 + r() * (y1 - y0), 1.5 + r() * 2, 0, 7); wypelnij(g, kol); }
}
// główka jigowa z hakiem (wspólna dla twistera i rippera); hak wychodzi grzbietem gumy
function glowkaJig(g, kol = '#e2452a') {
  g.beginPath(); g.arc(520, 110, 46, 0, 7); wypelnij(g, lg(g, 470, 70, 560, 150, [[0, '#ffffff'], [.25, kol], [1, '#5a1a14']])); obrys(g, 8);
  g.beginPath(); g.arc(538, 100, 15, 0, 7); wypelnij(g, '#ffe14a'); obrys(g, 4); g.beginPath(); g.arc(541, 101, 7, 0, 7); wypelnij(g, INK);
  blik(g, 505, 88, 12, 7);
  g.beginPath(); g.arc(524, 58, 11, 0, 7); obrys(g, 6); obrys(g, 3, '#b8c0c8');            // oczko na żyłkę
}
function grotHaka(g) {                                   // hak wychodzi grzbietem gumy, okrągłym łukiem w górę, końcówka z grotem równolegle do przynęty, w stronę główki
  const luk = () => { g.beginPath(); g.moveTo(372, 96); g.bezierCurveTo(362, 60, 364, 26, 396, 26); g.lineTo(426, 26); };
  luk(); obrys(g, 9); luk(); obrys(g, 4.5, '#b8c0c8');
  g.beginPath(); g.moveTo(424, 21); g.lineTo(438, 26); g.lineTo(424, 31); g.closePath(); wypelnij(g, '#b8c0c8'); obrys(g, 3);   // grot (poziomo, do główki)
  g.beginPath(); g.moveTo(426, 31); g.lineTo(414, 38); obrys(g, 3.5);                                                        // zadzior
}
function gumaCialo(g, x0, x1, h, kol, zebra = 8, glebokie = false) {
  const pts = [[x1, 110 - h * .5], [x1 - 40, 110 - h * .55], [(x0 + x1) / 2, 110 - h * .5], [x0 + 20, 110 - h * .32], [x0, 110 - h * .22], [x0, 110 + h * .22], [x0 + 20, 110 + h * .32], [(x0 + x1) / 2, 110 + h * .5], [x1 - 40, 110 + h * .55], [x1, 110 + h * .5]];
  gladko(g, pts); wypelnij(g, lg(g, 0, 110 - h * .6, 0, 110 + h * .6, [[0, kol], [.55, kol], [1, 'rgba(255,255,255,.6)']]));
  g.save(); gladko(g, pts); g.clip();
  brokat(g, x0, 110 - h * .6, x1, 110 + h * .6, 50);
  g.fillStyle = 'rgba(60,30,80,.2)'; g.fillRect(x0, 110 + h * .18, x1 - x0, h);
  for (let i = 0; i < zebra; i++) { const x = x1 - 18 - i * (glebokie ? (x1 - x0 - 30) / zebra : 13); g.beginPath(); g.moveTo(x, 110 - h); g.quadraticCurveTo(x - 7, 110, x, 110 + h); obrys(g, glebokie ? 6 : 4, 'rgba(36,23,38,.55)'); }
  blik(g, (x0 + x1) / 2 + 20, 110 - h * .28, (x1 - x0) * .3, h * .08, .45);
  g.restore(); gladko(g, pts); obrys(g, 8);
}

// Zasada precyzji: część nośna każdej przynęty obraca się wokół oczka na żyłkę (żyłka zawsze trafia w oczko),
// a elementy doczepione (ogonek, kotwice, paletka) są jej dziećmi z własnym piwotem w punkcie mocowania,
// więc podążają za korpusem i nigdy się nie odklejają.
function podepnij(rodzic, dziecko) {
  dziecko.position.sub(rodzic.position); dziecko.userData.pozycja0 = dziecko.position.clone(); rodzic.add(dziecko);
}
const nosZ = (s, O, p) => new THREE.Vector3((p[0] - O[0]) * s, (O[1] - p[1]) * s, 0);

// ---------- TWISTER: guma z sierpowatym ogonkiem na główce jigowej ----------
export function stworzTwister({ dl = .12, kolor = '#c8e03c', glowka = '#e2452a' } = {}) {
  const s = dl / 560, O = [300, 110], OCZKO = [524, 58], kb = nowyNumer();
  const ogon = czesc(s, ...O, [20, 60, 270, 260], [262, 110], g => {
    const sierp = () => { g.beginPath(); g.moveTo(266, 92); g.bezierCurveTo(170, 60, 60, 110, 70, 190); g.bezierCurveTo(78, 245, 160, 250, 190, 215);
      g.bezierCurveTo(150, 225, 110, 205, 120, 170); g.bezierCurveTo(135, 125, 200, 118, 266, 128); g.closePath(); };
    sierp(); wypelnij(g, lg(g, 60, 0, 262, 0, [[0, 'rgba(255,255,255,.55)'], [.4, kolor], [1, kolor]])); g.save(); sierp(); g.clip(); brokat(g, 60, 60, 262, 250, 30); g.restore(); sierp(); obrys(g, 7);
  }, { kolejnosc: 0 });
  const cialo = czesc(s, ...O, [240, 0, 580, 170], OCZKO, g => { gumaCialo(g, 255, 480, 74, kolor, 9); glowkaJig(g, glowka); grotHaka(g); }, { kolejnosc: 1 });
  const grupa = zloz([ogon, cialo], kb); podepnij(cialo, ogon); const f = Math.random() * 6;
  grupa.userData.przyneta = { dl, nos: nosZ(s, O, OCZKO), anim: (t, st = {}) => {
    const w = 16 * (st.predkosc ?? 1);
    cialo.rotation.z = .035 * Math.sin(w * .5 * t + f);                       // główka kołysze się na oczku
    ogon.rotation.z = .5 * Math.sin(w * t + f); ogon.scale.y = .82 + .18 * Math.cos(w * t + f); } };   // sierp bije
  return grupa;
}
// ---------- RIPPER: żebrowana guma z kopytem (ogon-łopatka) ----------
export function stworzRipper({ dl = .12, kolor = '#f2f0e6', glowka = '#3b3f48', grzbiet = '#4f7aa6' } = {}) {
  const s = dl / 560, O = [300, 110], OCZKO = [524, 58], kb = nowyNumer();
  const ogon = czesc(s, ...O, [130, 30, 280, 190], [262, 110], g => {
    g.beginPath(); g.moveTo(266, 92); g.lineTo(200, 100); g.lineTo(200, 120); g.lineTo(266, 128); g.closePath(); wypelnij(g, kolor); obrys(g, 6);
    const kop = () => { g.beginPath(); g.ellipse(190, 110, 34, 70, 0, 0, 7); };
    kop(); wypelnij(g, lg(g, 156, 0, 224, 0, [[0, grzbiet], [.5, kolor], [1, grzbiet]])); g.save(); kop(); g.clip(); brokat(g, 150, 40, 230, 180, 20); g.restore(); kop(); obrys(g, 7);
  }, { kolejnosc: 0 });
  const cialo = czesc(s, ...O, [240, 0, 580, 170], OCZKO, g => {
    gumaCialo(g, 255, 480, 92, kolor, 10, true);
    g.save(); g.beginPath(); g.rect(255, 40, 225, 52); g.clip(); gumaCialo(g, 255, 480, 92, grzbiet, 10, true); g.restore();
    glowkaJig(g, glowka); grotHaka(g);
  }, { kolejnosc: 1 });
  const grupa = zloz([ogon, cialo], kb); podepnij(cialo, ogon); const f = Math.random() * 6;
  grupa.userData.przyneta = { dl, nos: nosZ(s, O, OCZKO), anim: (t, st = {}) => {
    const w = 18 * (st.predkosc ?? 1), c = Math.cos(w * t + f);
    cialo.rotation.z = .04 * Math.sin(w * .5 * t + f);
    ogon.scale.x = .3 + .7 * Math.abs(c); ogon.rotation.z = .12 * Math.sin(w * t + f); } };   // kopyto obraca się w poprzek (widać skrót)
  return grupa;
}
// ---------- WAHADŁÓWKA (blacha): łyżka kołysze się na kółku łącznikowym, przechyla (błysk), kotwica wisi na kółku ----------
export function stworzWahadlowke({ dl = .1, wzor = ['#e2452a', '#f4efe2'] } = {}) {
  const s = dl / 420, O = [300, 110], KOLKO = [478, 110], OGON = [100, 110], kb = nowyNumer();
  const ksztalt = g => { g.beginPath(); g.moveTo(470, 110); g.bezierCurveTo(470, 72, 330, 22, 190, 38); g.bezierCurveTo(80, 52, 80, 168, 190, 182); g.bezierCurveTo(330, 198, 470, 148, 470, 110); g.closePath(); };
  const przod = jasnosc => g => { ksztalt(g); wypelnij(g, lg(g, 0, 50, 0, 170, [[0, '#f4f7fa'], [.35, '#aeb8c2'], [.6, '#e8edf1'], [1, '#7c8792']])); g.save(); ksztalt(g); g.clip();
    for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(250 + i * 50, 110, 12, 40, 0, 0, 7); wypelnij(g, 'rgba(255,255,255,.18)'); }
    blik(g, 260, 82, 110, 14, .8); if (jasnosc) { g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(70, 15, 440, 200); blik(g, 280, 100, 150, 40, .9); }
    g.fillStyle = 'rgba(60,30,80,.18)'; g.fillRect(80, 130, 420, 60); g.restore(); ksztalt(g); obrys(g, 8);
    kolko(g, 478, 110); g.beginPath(); g.arc(96, 110, 6, 0, 7); wypelnij(g, '#e9edf0'); obrys(g, 3); };   // otwory na kółka
  const lyzka = odmiany(czesc(s, ...O, [70, 15, 500, 205], KOLKO, () => {}, { kolejnosc: 1 }), { przod: przod(false), blysk: przod(true),
    tyl: g => { ksztalt(g); wypelnij(g, wzor[1]); g.save(); ksztalt(g); g.clip(); for (let i = 0; i < 5; i++) { g.fillStyle = wzor[0]; g.fillRect(130 + i * 70, 40, 34, 140); }
      g.fillStyle = 'rgba(60,30,80,.2)'; g.fillRect(80, 130, 420, 60); g.restore(); ksztalt(g); obrys(g, 8); kolko(g, 478, 110); } });
  lyzka.userData.ustaw('przod');
  const kotw = czesc(s, ...O, [-20, 40, 125, 180], OGON, g => { kolko(g, 100, 110, 11); kotwiczka(g, 86, 110, 44, Math.PI / 2); }, { kolejnosc: 0 });
  const grupa = zloz([kotw, lyzka], kb); podepnij(lyzka, kotw); const f = Math.random() * 6;
  grupa.userData.przyneta = { dl, nos: nosZ(s, O, KOLKO), anim: (t, st = {}) => {
    const w = 9 * (st.predkosc ?? 1), fi = 1.05 * Math.sin(w * t + f), c = Math.cos(fi);      // przechył blachy do ±60°
    lyzka.scale.y = c; lyzka.userData.ustaw(c > .97 ? 'blysk' : 'przod');
    lyzka.rotation.z = .16 * Math.sin(w * .5 * t + f);
    kotw.scale.y = 1 / c; kotw.rotation.z = -.2 * Math.sin(w * .5 * t + f + .6); } };       // kotwica nie spłaszcza się razem z blachą
  return grupa;
}
// ---------- OBROTÓWKA: paletka wiruje wokół drutu na strzemiączku, korpus z koralikami, kotwica z chwostem ----------
export function stworzObrotowke({ dl = .1, paletka = ['#e9c85a', '#3b3f48'] } = {}) {
  const s = dl / 560, O = [330, 110], OCZKO = [592, 110], STRZ = [462, 110], KOTW = [200, 110], kb = nowyNumer();
  const kotw = czesc(s, ...O, [40, 40, 240, 200], KOTW, g => {
    for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(195, 108); g.quadraticCurveTo(130, 90 + i * 4, 70, 70 + i * 9); obrys(g, 7, i % 2 ? '#d6452a' : '#b8352c'); }   // chwost z wełny
    kotwiczka(g, 196, 110, 46, Math.PI / 2);
  }, { kolejnosc: 0 });
  const korpus = czesc(s, ...O, [180, 50, 610, 170], OCZKO, g => {
    g.beginPath(); g.moveTo(200, 110); g.lineTo(582, 110); obrys(g, 7); obrys(g, 3, '#b8c0c8');
    g.beginPath(); g.ellipse(592, 110, 11, 9, 0, 0, 7); obrys(g, 6); obrys(g, 3, '#b8c0c8');              // oczko na żyłkę
    g.beginPath(); g.moveTo(230, 110); g.bezierCurveTo(240, 76, 360, 82, 372, 110); g.bezierCurveTo(360, 138, 240, 144, 230, 110); wypelnij(g, lg(g, 0, 80, 0, 140, [[0, '#fff3c4'], [.4, '#d9a43a'], [1, '#7a5418']])); obrys(g, 7);
    g.beginPath(); g.arc(390, 110, 17, 0, 7); wypelnij(g, '#e2452a'); obrys(g, 6); blik(g, 385, 104, 5, 3);
    g.beginPath(); g.arc(420, 110, 14, 0, 7); wypelnij(g, '#d9a43a'); obrys(g, 6);
    g.beginPath(); g.moveTo(448, 98); g.lineTo(466, 98); g.lineTo(466, 122); g.lineTo(448, 122); obrys(g, 5, INK);       // strzemiączko
    blik(g, 290, 94, 40, 6, .6);
  }, { kolejnosc: 1 });
  const ksz = g => { g.beginPath(); g.moveTo(462, 110); g.bezierCurveTo(440, 40, 320, 40, 300, 110); g.bezierCurveTo(320, 180, 440, 180, 462, 110); g.closePath(); };
  const blacha = odmiany(czesc(s, ...O, [290, 30, 475, 190], STRZ, () => {}, { kolejnosc: 2 }), {
    przod: g => { ksz(g); wypelnij(g, lg(g, 300, 40, 460, 180, [[0, '#fff6d0'], [.5, paletka[0]], [1, '#8a6a1a']])); g.save(); ksz(g); g.clip();
      for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(330 + (i % 3) * 38, 80 + Math.floor(i / 3) * 30, 7, 0, 7); wypelnij(g, 'rgba(255,255,255,.35)'); } g.restore(); ksz(g); obrys(g, 7); },
    tyl: g => { ksz(g); wypelnij(g, paletka[1]); g.save(); ksz(g); g.clip(); g.beginPath(); g.arc(370, 110, 26, 0, 7); wypelnij(g, '#e2452a'); g.beginPath(); g.arc(370, 110, 11, 0, 7); wypelnij(g, '#111'); g.restore(); ksz(g); obrys(g, 7); },
  });
  blacha.userData.ustaw('przod');
  const grupa = zloz([kotw, korpus, blacha], kb); podepnij(korpus, kotw); podepnij(korpus, blacha); const f = Math.random() * 6;
  grupa.userData.przyneta = { dl, nos: nosZ(s, O, OCZKO), anim: (t, st = {}) => {
    const w = 30 * (st.predkosc ?? 1), c = Math.cos(w * t + f);
    korpus.rotation.z = .02 * Math.sin(w * .1 * t + f);
    blacha.scale.y = Math.max(.06, Math.abs(c)); blacha.userData.ustaw(c >= 0 ? 'przod' : 'tyl');   // obrót wokół drutu: skrót + druga strona
    kotw.rotation.z = .1 * Math.sin(w * .15 * t + f); } };
  return grupa;
}
// ---------- WOBLER: korpus i ster to jedna sztywna bryła kołysząca się na oczku steru; kotwice na kółkach ----------
const MALOWANIA = {
  plotka: { grzbiet: '#3e5a6e', bok: '#dfe7ec', brzuch: '#ffffff', akcent: '#e2452a' },
  okon: { grzbiet: '#4b5e1e', bok: '#c8b84a', brzuch: '#fbf4dc', akcent: '#e2452a', pregi: true },
  firetiger: { grzbiet: '#2f6b2a', bok: '#c8e03c', brzuch: '#ff8a2c', akcent: '#e2452a', pregi: true },
};
export function stworzWoblera({ dl = .11, malowanie = 'plotka' } = {}) {
  const m = MALOWANIA[malowanie] || MALOWANIA.plotka, s = dl / 640, O = [380, 120], OCZKO = [668, 172], kb = nowyNumer();
  const ksz = [[612, 118], [590, 78], [520, 58], [400, 54], [260, 66], [170, 92], [140, 112], [140, 128], [170, 150], [260, 172], [400, 182], [520, 176], [590, 160], [612, 136]];
  const bryla = czesc(s, ...O, [60, 30, 725, 215], OCZKO, g => {
    // ster wtopiony w pysk (rysowany pod korpusem, jedna bryła)
    g.beginPath(); g.moveTo(585, 108); g.lineTo(700, 160); g.quadraticCurveTo(714, 192, 690, 202); g.lineTo(588, 152); g.closePath();
    wypelnij(g, 'rgba(225,240,250,.7)'); obrys(g, 6); g.beginPath(); g.moveTo(612, 128); g.lineTo(690, 170); obrys(g, 3, 'rgba(255,255,255,.85)');
    // płetwa ogonowa
    g.beginPath(); g.moveTo(150, 118); g.lineTo(78, 70); g.quadraticCurveTo(98, 120, 78, 168); g.closePath(); wypelnij(g, lg(g, 70, 0, 150, 0, [[0, 'rgba(255,255,255,.6)'], [1, m.bok]])); obrys(g, 6);
    gladko(g, ksz); wypelnij(g, lg(g, 0, 50, 0, 185, [[0, m.grzbiet], [.35, m.bok], [.7, m.bok], [1, m.brzuch]]));
    g.save(); gladko(g, ksz); g.clip();
    for (let y = 50, r = 0; y < 190; y += 12, r++) for (let x = 150 + (r % 2) * 8; x < 560; x += 16) { g.beginPath(); g.arc(x, y, 8, Math.PI * .1, Math.PI * .9); obrys(g, 1.4, 'rgba(30,30,40,.18)'); }
    if (m.pregi) for (let i = 0; i < 5; i++) { const x = 240 + i * 62; g.fillStyle = 'rgba(25,30,10,.55)'; g.beginPath(); g.moveTo(x - 14, 50); g.lineTo(x + 14, 50); g.lineTo(x + 4, 140); g.lineTo(x - 6, 140); g.closePath(); g.fill(); }
    blik(g, 380, 76, 170, 10, .55); g.fillStyle = 'rgba(60,30,80,.2)'; g.fillRect(60, 150, 600, 60);
    g.beginPath(); g.moveTo(540, 66); g.quadraticCurveTo(515, 120, 545, 168); obrys(g, 5, 'rgba(36,23,38,.6)');            // pokrywa skrzelowa
    g.beginPath(); g.moveTo(520, 150); g.lineTo(490, 170); obrys(g, 7, m.akcent);
    g.restore(); gladko(g, ksz); obrys(g, 8);
    g.beginPath(); g.arc(565, 104, 20, 0, 7); wypelnij(g, '#ffe14a'); obrys(g, 5); g.beginPath(); g.arc(569, 105, 10, 0, 7); wypelnij(g, INK); blik(g, 562, 99, 4, 3, .9);   // oko 3D
    g.beginPath(); g.arc(668, 172, 10, 0, 7); obrys(g, 5); obrys(g, 2.5, '#b8c0c8');          // oczko na sterze
    for (const x of [480, 280]) { g.beginPath(); g.moveTo(x, 176); g.lineTo(x, 166); obrys(g, 5); kolko(g, x, 184, 9); }  // wkręty z kółkami
  }, { kolejnosc: 2 });
  const kotw1 = czesc(s, ...O, [425, 180, 535, 290], [480, 192], g => kotwiczka(g, 480, 192, 44), { kolejnosc: 1 });
  const kotw2 = czesc(s, ...O, [225, 180, 335, 290], [280, 192], g => kotwiczka(g, 280, 192, 44), { kolejnosc: 1 });
  const grupa = zloz([kotw1, kotw2, bryla], kb); podepnij(bryla, kotw1); podepnij(bryla, kotw2); const f = Math.random() * 6;
  grupa.userData.przyneta = { dl, nos: nosZ(s, O, OCZKO), anim: (t, st = {}) => {
    const w = 14 * (st.predkosc ?? 1), a = .045 * Math.sin(w * t + f + 1.2);
    const bok = .42 * Math.sin(w * t + f), skrot = Math.cos(bok);             // wychylenie na boki (do i od widza): skrót długości
    bryla.rotation.z = a;                                                     // lekkie kiwanie góra–dół na oczku
    bryla.scale.set(skrot, 1 - .05 * Math.abs(Math.sin(w * t + f)), 1);      // cała bryła (korpus + ster) ucieka na boki i przechyla się
    for (const [k, fz] of [[kotw1, 0], [kotw2, 1]]) { k.scale.set(1 / skrot, 1 / bryla.scale.y, 1); k.rotation.z = -a + .1 * Math.sin(w * .5 * t + f + fz); } } };   // kotwice wiszą i bujają się
  return grupa;
}
// ---------- MORMYSZKA: wolframowa kropla z haczykiem i koralikiem (podlodowa) ----------
export function stworzMormyszke({ dl = .025, kolor = '#d9a43a' } = {}) {
  const s = dl / 200, O = [110, 90], kb = nowyNumer();
  const c = czesc(s, ...O, [20, 20, 200, 200], [150, 58], g => {
    g.beginPath(); g.moveTo(150, 60); g.quadraticCurveTo(170, 120, 120, 135); g.quadraticCurveTo(72, 140, 70, 98); g.quadraticCurveTo(80, 56, 150, 60); g.closePath();
    wypelnij(g, lg(g, 70, 60, 170, 140, [[0, '#fff3c4'], [.45, kolor], [1, '#5a3a10']])); obrys(g, 7); blik(g, 108, 84, 14, 8, .85);
    g.beginPath(); g.arc(150, 58, 9, 0, 7); obrys(g, 5); obrys(g, 2.5, '#b8c0c8');
    g.beginPath(); g.moveTo(90, 128); g.lineTo(60, 160); g.quadraticCurveTo(40, 185, 70, 186); g.quadraticCurveTo(95, 184, 92, 160); obrys(g, 7); g.beginPath(); g.moveTo(90, 128); g.lineTo(60, 160); g.quadraticCurveTo(40, 185, 70, 186); g.quadraticCurveTo(95, 184, 92, 160); obrys(g, 3, '#b8c0c8');
    g.beginPath(); g.arc(76, 146, 10, 0, 7); wypelnij(g, '#e2452a'); obrys(g, 4);
  }, { kolejnosc: 0 });
  const grupa = zloz([c], kb), f = Math.random() * 6;
  grupa.userData.przyneta = { dl, nos: new THREE.Vector3((150 - 110) * s, (90 - 58) * s, 0), anim: t => { c.rotation.z = .25 * Math.sin(t * 9 + f) * Math.max(0, Math.sin(t * 2)); } };   // drga na oczku
  return grupa;
}
export const PRZYNETY = { twister: stworzTwister, ripper: stworzRipper, wahadlowka: stworzWahadlowke, obrotowka: stworzObrotowke, wobler: stworzWoblera, mormyszka: stworzMormyszke };
