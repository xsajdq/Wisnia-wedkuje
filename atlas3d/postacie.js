// Biblioteka postaci 2D „Fishing Animation Universe” (Wiśnia Wędkuje).
// Każda postać to grupa płaskich części (Canvas2D) z własnymi osiami obrotu, więc ogon, płetwy, oczy, głowa i ręka
// z wędką ruszają się niezależnie. Rysunek: śliwkowy kontur INK (jak toon.ts w skillu cartoon-3d-short),
// cieniowanie ilustracyjne, anatomia gatunku zgodna z FishBase (okoń: 2 płetwy grzbietowe, czarna plama na końcu
// pierwszej, 5–8 ciemnych pręg często w kształcie Y, płetwy brzuszne i odbytowa żółte do czerwonych, kolec na pokrywie).
// Postacie są na warstwie POSTACIE (bez tuszu świata, osobna maska), a oprawa (billboard, tint światła) jest w scenie.
import * as THREE from 'three';

export const INK = '#241726';
export const POSTACIE = 4;           // warstwa postaci 2D
const D2R = Math.PI / 180;

// ---------- pomocnicze rysowanie ----------
function gladko(g, pts, zamknij = true) {          // krzywa przez punkty (środki odcinków jako węzły)
  const n = pts.length, P = i => pts[(i + n) % n];
  g.beginPath();
  if (zamknij) {
    g.moveTo((P(-1)[0] + P(0)[0]) / 2, (P(-1)[1] + P(0)[1]) / 2);
    for (let i = 0; i < n; i++) g.quadraticCurveTo(P(i)[0], P(i)[1], (P(i)[0] + P(i + 1)[0]) / 2, (P(i)[1] + P(i + 1)[1]) / 2);
    g.closePath();
  } else {
    g.moveTo(...pts[0]);
    for (let i = 1; i < n - 1; i++) g.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
    g.lineTo(...pts[n - 1]);
  }
}
const obrys = (g, w = 10, k = INK) => { g.lineWidth = w; g.strokeStyle = k; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); };
const wypelnij = (g, f) => { g.fillStyle = f; g.fill(); };
const lg = (g, x0, y0, x1, y1, stopy) => { const gr = g.createLinearGradient(x0, y0, x1, y1); stopy.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; };

// część postaci: płaszczyzna z własną teksturą, obracana wokół punktu `piwot` (w pikselach projektu)
// s – jednostki świata na piksel projektu; (ox, oy) – środek układu postaci w pikselach projektu
function czesc(s, ox, oy, bbox, piwot, rysuj, { res = 1.2, segX = 1, kolejnosc = 0 } = {}) {
  const [x0, y0, x1, y1] = bbox, cw = Math.ceil((x1 - x0) * res), ch = Math.ceil((y1 - y0) * res);
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
  const g = cv.getContext('2d'); g.scale(res, res); g.translate(-x0, -y0); g.lineJoin = 'round'; g.lineCap = 'round'; rysuj(g);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const geo = new THREE.PlaneGeometry((x1 - x0) * s, (y1 - y0) * s, segX, 1);
  geo.translate(((x0 + x1) / 2 - piwot[0]) * s, (piwot[1] - (y0 + y1) / 2) * s, 0);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: .35, depthWrite: true, side: THREE.DoubleSide, toneMapped: false });
  const m = new THREE.Mesh(geo, mat);
  m.position.set((piwot[0] - ox) * s, (oy - piwot[1]) * s, kolejnosc * 1e-4);
  m.userData = { kolejnosc, cv, g, bbox, res, pozycja0: m.position.clone(), geo0: geo.attributes.position.array.slice() };
  m.layers.set(POSTACIE);
  return m;
}
// odmiany tekstury jednej części (np. miny, mrugnięcie): rysuje każdą odmianę raz i podmienia mapę
function odmiany(m, rysunki) {
  const { bbox: [x0, y0, x1, y1], res } = m.userData, mapy = {};
  for (const [k, rys] of Object.entries(rysunki)) {
    const cv = document.createElement('canvas'); cv.width = m.userData.cv.width; cv.height = m.userData.cv.height;
    const g = cv.getContext('2d'); g.scale(res, res); g.translate(-x0, -y0); g.lineJoin = 'round'; g.lineCap = 'round'; rys(g);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; mapy[k] = t;
  }
  m.userData.mapy = mapy;
  m.userData.ustaw = k => { if (mapy[k] && m.material.map !== mapy[k]) { m.material.map = mapy[k]; m.material.needsUpdate = true; } };
  return m;
}
function zloz(czesci, kolejnoscBazowa) {
  const g = new THREE.Group();
  czesci.forEach(c => { c.renderOrder = kolejnoscBazowa + c.userData.kolejnosc; g.add(c); });
  return g;
}
let licznikPostaci = 0;

// =====================================================================================================
// OKOŃ (Perca fluviatilis) – widok z boku, głowa w prawo. Projekt 1000 × 560 px, środek (500, 290).
// =====================================================================================================
const OKON_CIALO = [[935, 300], [905, 248], [868, 205], [800, 160], [700, 128], [600, 120], [500, 132], [400, 160], [300, 205],
  [230, 248], [196, 268], [188, 296], [196, 326], [235, 348], [320, 380], [430, 412], [560, 432], [680, 428], [780, 405],
  [860, 372], [912, 335]];
function cialoOkonia(g) {
  // kształt ciała
  gladko(g, OKON_CIALO);
  wypelnij(g, lg(g, 0, 118, 0, 435, [[0, '#33491a'], [.22, '#5f7a26'], [.45, '#a8a83f'], [.62, '#d8c766'], [.8, '#efe3ad'], [1, '#fbf6e6']]));
  g.save(); gladko(g, OKON_CIALO); g.clip();
  // łuski (ctenoidalne, drobne): łuki w rzędach
  g.lineWidth = 1.6;
  for (let y = 120, r = 0; y < 440; y += 13, r++) for (let x = 190 + (r % 2) * 9; x < 800; x += 18) {
    const a = .1 + .16 * Math.min(1, (440 - y) / 200); g.strokeStyle = `rgba(30,38,8,${a})`;
    g.beginPath(); g.arc(x, y, 9, -.5 * Math.PI - 1.1, -.5 * Math.PI + 1.1 + Math.PI, true); g.stroke();
  }
  // ciemne pręgi (6, część w kształcie Y), od grzbietu ku brzuchowi, wygaszane w dół
  const pregi = [[305, 22, 1], [392, 26, 0], [480, 28, 1], [570, 28, 0], [655, 26, 1], [735, 20, 0]];
  for (const [x, w, y] of pregi) {
    const gr = lg(g, 0, 110, 0, 390, [[0, 'rgba(22,28,10,.9)'], [.55, 'rgba(26,32,12,.75)'], [1, 'rgba(30,36,14,0)']]);
    g.fillStyle = gr; g.beginPath();
    if (y) { // Y: rozwidlenie przy grzbiecie
      g.moveTo(x - w * 1.6, 110); g.lineTo(x - w * .5, 110); g.lineTo(x, 175); g.lineTo(x + w * .5, 110); g.lineTo(x + w * 1.6, 110);
      g.lineTo(x + w * .45, 230); g.quadraticCurveTo(x + w * .2, 330, x - 2, 390); g.quadraticCurveTo(x - w * .7, 320, x - w * .45, 230); g.closePath();
    } else { g.moveTo(x - w, 110); g.lineTo(x + w, 110); g.lineTo(x + w * .4, 250); g.quadraticCurveTo(x + w * .1, 340, x - 4, 385); g.quadraticCurveTo(x - w * .6, 320, x - w * .55, 240); g.closePath(); }
    g.fill();
  }
  // światło od góry, cień od spodu (ilustracyjne)
  g.fillStyle = lg(g, 0, 125, 0, 230, [[0, 'rgba(255,255,230,.0)'], [.5, 'rgba(255,255,220,.22)'], [1, 'rgba(255,255,220,0)']]);
  g.beginPath(); g.ellipse(560, 185, 300, 34, -.06, 0, 7); g.fill();
  g.fillStyle = 'rgba(52,26,70,.22)'; g.beginPath(); g.ellipse(560, 470, 430, 95, -.02, 0, 7); g.fill();
  // linia boczna
  g.setLineDash([10, 7]); g.strokeStyle = 'rgba(35,40,15,.55)'; g.lineWidth = 3;
  gladko(g, [[770, 205], [640, 180], [500, 185], [370, 210], [250, 262], [195, 290]], false); g.stroke(); g.setLineDash([]);
  // głowa: pokrywa skrzelowa, przedpokrywa, kolec, pysk
  g.fillStyle = 'rgba(60,70,20,.16)'; g.beginPath(); g.moveTo(790, 150); g.quadraticCurveTo(740, 280, 800, 412); g.lineTo(940, 412); g.lineTo(940, 140); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(800, 158); g.quadraticCurveTo(735, 285, 795, 400); obrys(g, 7);
  g.beginPath(); g.moveTo(850, 290); g.quadraticCurveTo(830, 345, 852, 392); obrys(g, 4, 'rgba(36,23,38,.6)');
  g.beginPath(); g.moveTo(760, 270); g.lineTo(705, 286); g.lineTo(762, 300); g.closePath(); wypelnij(g, '#c9b98a'); obrys(g, 5);   // kolec pokrywy
  // pysk: szeroka szczelina, dolna szczęka
  g.beginPath(); g.moveTo(935, 300); g.quadraticCurveTo(905, 322, 860, 316); obrys(g, 7);
  g.beginPath(); g.moveTo(930, 318); g.quadraticCurveTo(900, 336, 868, 328); obrys(g, 4, 'rgba(36,23,38,.55)');
  // nozdrza
  g.beginPath(); g.arc(908, 262, 5, 0, 7); wypelnij(g, INK);
  // oczodół + tęczówka (źrenica jest osobną częścią)
  g.beginPath(); g.arc(852, 246, 37, 0, 7); wypelnij(g, lg(g, 0, 210, 0, 285, [[0, '#ffe07a'], [.6, '#f4a53a'], [1, '#c4621d']])); obrys(g, 8);
  g.restore();
  gladko(g, OKON_CIALO); obrys(g, 10);
  // grubszy kontur od spodu (strona cienia)
  g.save(); g.beginPath(); g.rect(150, 330, 800, 200); g.clip(); gladko(g, OKON_CIALO); obrys(g, 14); g.restore();
}
function pletwaPromienie(g, baza, czubki, kolor, promien = 'rgba(36,23,38,.55)', szer = 3) {
  g.beginPath(); g.moveTo(...baza[0]);
  for (let i = 0; i < czubki.length; i++) {
    const t = i / (czubki.length - 1), bx = baza[0][0] + (baza[1][0] - baza[0][0]) * t, by = baza[0][1] + (baza[1][1] - baza[0][1]) * t;
    if (i) { const p = czubki[i - 1], q = czubki[i]; g.quadraticCurveTo((p[0] + q[0]) / 2 + (bx - (p[0] + q[0]) / 2) * .18, (p[1] + q[1]) / 2 + (by - (p[1] + q[1]) / 2) * .18, q[0], q[1]); }
    else g.lineTo(...czubki[0]);
  }
  g.lineTo(...baza[1]); g.closePath();
  wypelnij(g, kolor);
  g.save(); g.clip();
  for (let i = 0; i < czubki.length; i++) { const t = i / (czubki.length - 1), bx = baza[0][0] + (baza[1][0] - baza[0][0]) * t, by = baza[0][1] + (baza[1][1] - baza[0][1]) * t;
    g.beginPath(); g.moveTo(bx, by); g.lineTo(...czubki[i]); obrys(g, szer, promien); }
  g.restore();
}
export function stworzOkonia({ wys = 2, mina = 'spokojny' } = {}) {
  const s = wys / 560, O = [500, 290], kb = 100 + (licznikPostaci++ % 40) * 12;
  const ogon = czesc(s, ...O, [15, 140, 225, 455], [205, 297], g => {
    const pkt = [[205, 270], [150, 230], [70, 160], [30, 168], [55, 235], [92, 297], [55, 360], [30, 428], [70, 435], [150, 365], [205, 324]];
    gladko(g, pkt); wypelnij(g, lg(g, 0, 160, 0, 435, [[0, '#9b8a3c'], [.5, '#c8a046'], [.8, '#e0743a'], [1, '#d6512c']]));
    g.save(); gladko(g, pkt); g.clip();
    for (let i = 0; i < 11; i++) { const a = (-50 + i * 10) * D2R; g.beginPath(); g.moveTo(205, 297); g.lineTo(205 - 190 * Math.cos(a), 297 + 160 * Math.sin(a)); obrys(g, 3, 'rgba(36,23,38,.45)'); }
    g.restore(); gladko(g, pkt); obrys(g, 9);
  }, { kolejnosc: 0, segX: 6 });
  // 1. płetwa grzbietowa: 13–15 twardych kolców, czarna plama w tylnej części
  const kolce = [], N = 14;
  for (let i = 0; i < N; i++) { const t = i / (N - 1), bx = 440 + t * 270, by = 150 - Math.sin(t * Math.PI * .9 + .25) * 26 + t * 5;
    const h = 125 * Math.pow(Math.sin(Math.PI * (.12 + .82 * t)), .65) * (1 - .25 * t); kolce.push([bx - 18 - 10 * t, by - h]); }
  const grzb1 = czesc(s, ...O, [400, 0, 740, 170], [575, 150], g => {
    pletwaPromienie(g, [[445, 152], [712, 140]], kolce, lg(g, 0, 20, 0, 150, [[0, 'rgba(150,150,110,.92)'], [1, 'rgba(110,118,60,.95)']]), INK, 4);
    g.save(); g.beginPath(); g.ellipse(655, 95, 48, 40, .3, 0, 7); g.clip();
    pletwaPromienie(g, [[445, 152], [712, 140]], kolce, '#120c14', INK, 3); g.restore();
    g.beginPath(); g.moveTo(445, 152); for (const k of kolce) g.lineTo(...k); g.lineTo(712, 140); obrys(g, 7);
  }, { kolejnosc: 1 });
  const grzb2 = czesc(s, ...O, [255, 85, 450, 230], [355, 175], g => {
    const cz = [[418, 120], [396, 102], [366, 98], [334, 108], [302, 130], [276, 165]];
    pletwaPromienie(g, [[440, 150], [272, 212]], cz, lg(g, 0, 95, 0, 215, [[0, 'rgba(190,175,95,.92)'], [1, 'rgba(120,128,55,.95)']]));
    g.beginPath(); g.moveTo(440, 150); for (const k of cz) g.lineTo(...k); g.lineTo(272, 212); obrys(g, 7);
  }, { kolejnosc: 2 });
  const odbyt = czesc(s, ...O, [270, 360, 420, 500], [350, 395], g => {
    const cz = [[392, 470], [372, 485], [345, 482], [318, 466], [296, 440]];
    pletwaPromienie(g, [[400, 408], [298, 380]], cz, lg(g, 0, 390, 0, 490, [[0, '#f08a3c'], [1, '#e2452a']]));
    g.beginPath(); g.moveTo(400, 408); for (const k of cz) g.lineTo(...k); g.lineTo(298, 380); obrys(g, 7);
  }, { kolejnosc: 3 });
  const brzuch = czesc(s, ...O, [590, 395, 730, 525], [705, 412], g => {
    const cz = [[690, 470], [665, 505], [630, 512], [605, 498]];
    pletwaPromienie(g, [[712, 412], [668, 425]], cz, lg(g, 0, 410, 0, 510, [[0, '#f2a040'], [1, '#e2452a']]));
    g.beginPath(); g.moveTo(712, 412); for (const k of cz) g.lineTo(...k); g.lineTo(668, 425); obrys(g, 7);
  }, { kolejnosc: 4 });
  const cialo = czesc(s, ...O, [170, 100, 960, 460], [560, 290], cialoOkonia, { kolejnosc: 5, segX: 24 });
  const piers = czesc(s, ...O, [620, 290, 770, 420], [752, 318], g => {
    const cz = [[700, 300], [660, 315], [636, 345], [645, 380], [672, 398]];
    pletwaPromienie(g, [[756, 308], [748, 340]], cz, 'rgba(244,190,95,.82)', 'rgba(150,90,30,.6)');
    g.beginPath(); g.moveTo(756, 308); for (const k of cz) g.lineTo(...k); g.lineTo(748, 340); obrys(g, 6);
  }, { kolejnosc: 6 });
  // źrenica z małym blikiem + brew (mina)
  const zr = czesc(s, ...O, [820, 215, 885, 280], [852, 247], g => {
    g.beginPath(); g.arc(852, 247, 19, 0, 7); wypelnij(g, '#0d0910');
    g.beginPath(); g.arc(845, 239, 5, 0, 7); wypelnij(g, 'rgba(255,255,255,.85)');
  }, { kolejnosc: 7 });
  const brew = odmiany(czesc(s, ...O, [790, 175, 920, 235], [855, 205], () => {}, { kolejnosc: 8 }), {
    spokojny: g => { g.beginPath(); g.moveTo(815, 212); g.quadraticCurveTo(852, 196, 892, 208); obrys(g, 7, 'rgba(36,23,38,.65)'); },
    czujny: g => { g.beginPath(); g.moveTo(812, 196); g.quadraticCurveTo(850, 214, 895, 222); obrys(g, 10); },
    zdziwiony: g => { g.beginPath(); g.moveTo(815, 200); g.quadraticCurveTo(852, 180, 892, 196); obrys(g, 8); },
  });
  brew.userData.ustaw(mina);
  const grupa = zloz([ogon, grzb1, grzb2, odbyt, brzuch, cialo, piers, zr, brew], kb);
  const faza = Math.random() * 6;
  // animacja: fala ciała, praca ogona (obrót + skrót perspektywiczny), niezależne płetwy, oko się rozgląda
  const anim = (t, st = {}) => {
    const tempo = st.tempo ?? 1, w = 7.5 * tempo, ph = faza;
    const geo = cialo.geometry.attributes.position, b0 = cialo.userData.geo0, L = 790 * s;
    const fala = x => { const u = Math.min(1, Math.max(0, (x + 390 * s) / L)); return wys * .022 * Math.pow(1 - u, 2) * Math.sin(w * t + ph - (1 - u) * 2.2); };
    for (let i = 0; i < geo.count; i++) geo.array[i * 3 + 1] = b0[i * 3 + 1] + fala(b0[i * 3] + cialo.position.x);
    geo.needsUpdate = true;
    const ogonY = fala(ogon.position.x);
    ogon.position.y = ogon.userData.pozycja0.y + ogonY;
    ogon.rotation.z = .2 * Math.sin(w * t + ph - 2.4) * (st.ogon ?? 1);
    ogon.scale.x = .78 + .22 * Math.abs(Math.cos(w * t + ph - 2.4));
    grzb2.position.y = grzb2.userData.pozycja0.y + fala(grzb2.position.x) * .7; odbyt.position.y = odbyt.userData.pozycja0.y + fala(odbyt.position.x) * .7;
    grzb1.scale.y = (st.kolce ?? .92) + .07 * Math.sin(t * 1.3 + ph);
    piers.rotation.z = .32 * Math.sin(w * .55 * t + ph) - .1; piers.scale.x = .75 + .25 * Math.cos(w * .55 * t + ph);
    brzuch.rotation.z = .12 * Math.sin(w * .5 * t + ph + 1);
    odbyt.rotation.z = .05 * Math.sin(w * .5 * t + ph + 2);
    const ex = st.patrz ? st.patrz[0] : 5 * Math.sin(t * .7 + ph), ey = st.patrz ? st.patrz[1] : 3 * Math.sin(t * 1.1 + ph * 2);
    zr.position.set(zr.userData.pozycja0.x + ex * s, zr.userData.pozycja0.y + ey * s, zr.position.z);
    if (st.mina) brew.userData.ustaw(st.mina);
  };
  grupa.userData.okon = { anim, wys };
  return grupa;
}

// =====================================================================================================
// WĘDKARZ „EKSPERT” – spokojny, doświadczony. Projekt 600 × 1000 px, stopy na y = 975, środek układu w stopach.
// Stałe cechy: krótka siwiejąca broda, krzaczaste brwi, zielona czapka z daszkiem z naszywką ryby, kamizelka khaki
// z kieszeniami na czerwonej flanelowej koszuli, oliwkowe wodery z szelkami. Zimą: ta sama twarz, czerwona kurtka i czapka z pomponem.
// =====================================================================================================
const SKORA = '#f2c7a0', SKORA_C = '#d99f78', BRODA = '#8a7a6c';
function glowaEksperta(g, { mina = 'spokojny', zima = false } = {}) {
  // uszy
  for (const x of [190, 410]) { g.beginPath(); g.ellipse(x, 300, 26, 36, 0, 0, 7); wypelnij(g, SKORA_C); obrys(g, 8); }
  // głowa (fasola, lekko węższa broda)
  const gl = [[300, 165], [395, 195], [420, 290], [405, 380], [350, 440], [300, 452], [250, 440], [195, 380], [180, 290], [205, 195]];
  gladko(g, gl); wypelnij(g, SKORA);
  g.save(); gladko(g, gl); g.clip();
  g.fillStyle = 'rgba(160,80,60,.18)'; g.beginPath(); g.ellipse(390, 330, 70, 140, 0, 0, 7); g.fill();       // cień boczny
  // broda i wąs (krótkie, siwiejące)
  g.beginPath(); g.moveTo(190, 330); g.quadraticCurveTo(205, 455, 300, 462); g.quadraticCurveTo(395, 455, 410, 330); g.quadraticCurveTo(380, 410, 300, 405); g.quadraticCurveTo(222, 410, 190, 330); wypelnij(g, BRODA);
  for (let i = 0; i < 70; i++) { const a = Math.random() * Math.PI, r = 100 + Math.random() * 40; g.beginPath(); g.arc(300 + Math.cos(a) * r * .95, 330 + Math.sin(a) * r * .85, 2.2, 0, 7); wypelnij(g, 'rgba(60,50,45,.35)'); }
  g.restore();
  gladko(g, gl); obrys(g, 10);
  // nos (duży, charakterystyczny)
  g.beginPath(); g.moveTo(300, 290); g.quadraticCurveTo(338, 345, 312, 360); g.quadraticCurveTo(292, 366, 282, 352); wypelnij(g, SKORA_C); obrys(g, 7);
  // oczy, brwi, usta wg miny
  const oko = (x, otw) => {
    if (otw <= .1) { g.beginPath(); g.moveTo(x - 24, 285); g.quadraticCurveTo(x, 296, x + 24, 285); obrys(g, 7); return; }
    g.beginPath(); g.ellipse(x, 282, 24, 27 * otw, 0, 0, 7); wypelnij(g, '#fffaf2'); obrys(g, 6);
    g.save(); g.beginPath(); g.ellipse(x, 282, 24, 27 * otw, 0, 0, 7); g.clip();
    g.beginPath(); g.arc(x + 4, 286, 13, 0, 7); wypelnij(g, '#4a6a3a'); g.beginPath(); g.arc(x + 5, 287, 7, 0, 7); wypelnij(g, '#120c10');
    g.beginPath(); g.arc(x + 1, 281, 3, 0, 7); wypelnij(g, '#fff'); g.restore();
  };
  const brew = (x, dy, kat) => { g.save(); g.translate(x, 240 + dy); g.rotate(kat); g.beginPath(); g.ellipse(0, 0, 34, 11, 0, 0, 7); wypelnij(g, '#5d5048'); g.restore(); };
  const m = { spokojny: [.85, 0, 0], usmiech: [.6, -4, 0], zdziwiony: [1.12, -18, 0], mrug: [0, 0, 0], skupiony: [.55, 6, .12] }[mina] || [.85, 0, 0];
  oko(255, m[0]); oko(350, m[0]);
  brew(255, m[1], mina === 'skupiony' ? m[2] : -.06); brew(350, m[1], mina === 'skupiony' ? -m[2] : .06);
  g.beginPath();
  if (mina === 'usmiech') { g.moveTo(262, 392); g.quadraticCurveTo(305, 425, 345, 388); g.quadraticCurveTo(305, 410, 262, 392); wypelnij(g, '#5a1e28'); obrys(g, 6); }
  else if (mina === 'zdziwiony') { g.ellipse(305, 400, 16, 20, 0, 0, 7); wypelnij(g, '#5a1e28'); obrys(g, 6); }
  else { g.moveTo(275, 397); g.quadraticCurveTo(305, 405, 335, 395); obrys(g, 6); }
  // wąs
  g.beginPath(); g.moveTo(258, 378); g.quadraticCurveTo(300, 360, 345, 376); g.quadraticCurveTo(300, 372, 258, 378); wypelnij(g, BRODA); obrys(g, 4, 'rgba(36,23,38,.6)');
  // nakrycie głowy
  if (zima) {
    g.beginPath(); g.moveTo(178, 255); g.quadraticCurveTo(180, 110, 300, 105); g.quadraticCurveTo(420, 110, 422, 255); g.closePath(); wypelnij(g, lg(g, 0, 105, 0, 255, [[0, '#ffd23a'], [1, '#e8a91c']])); obrys(g, 9);
    g.beginPath(); g.roundRect(172, 222, 256, 44, 18); wypelnij(g, '#f4efe2'); obrys(g, 8);
    for (let x = 190; x < 420; x += 18) { g.beginPath(); g.moveTo(x, 228); g.lineTo(x, 260); obrys(g, 2, 'rgba(36,23,38,.3)'); }
    g.beginPath(); g.arc(300, 98, 32, 0, 7); wypelnij(g, '#f4efe2'); obrys(g, 8);
  } else {
    g.beginPath(); g.moveTo(182, 245); g.quadraticCurveTo(178, 130, 300, 122); g.quadraticCurveTo(415, 128, 418, 240); g.closePath(); wypelnij(g, lg(g, 0, 122, 0, 245, [[0, '#4f7a46'], [1, '#365a32']])); obrys(g, 9);
    g.beginPath(); g.moveTo(300, 124); g.lineTo(300, 240); obrys(g, 2.5, 'rgba(240,240,220,.5)');                  // szew
    g.beginPath(); g.moveTo(185, 238); g.quadraticCurveTo(300, 228, 470, 252); g.quadraticCurveTo(480, 272, 440, 270); g.quadraticCurveTo(300, 258, 190, 262); g.closePath(); wypelnij(g, '#2f4d2c'); obrys(g, 8);   // daszek
    g.beginPath(); g.ellipse(245, 192, 34, 18, -.1, 0, 7); wypelnij(g, '#f4efe2'); obrys(g, 4);                        // naszywka z rybą
    g.beginPath(); g.moveTo(222, 192); g.quadraticCurveTo(245, 178, 262, 192); g.quadraticCurveTo(245, 205, 222, 192); g.lineTo(214, 184); g.moveTo(222, 192); g.lineTo(214, 200); wypelnij(g, '#e2452a'); obrys(g, 2.5);
  }
}
function tulowEksperta(g, { zima = false } = {}) {
  const t = [[205, 470], [395, 470], [420, 560], [412, 690], [300, 712], [188, 690], [180, 560]];
  if (zima) { // czerwona kurtka z kapturem i odblaskiem
    gladko(g, t); wypelnij(g, lg(g, 160, 0, 440, 0, [[0, '#e04a34'], [.7, '#c63a28'], [1, '#9a2a1f']])); g.save(); gladko(g, t); g.clip();
    g.fillStyle = '#d8dde0'; g.fillRect(170, 600, 260, 22);
    g.beginPath(); g.moveTo(300, 470); g.lineTo(300, 712); obrys(g, 4, 'rgba(36,23,38,.6)');
    for (const y of [520, 560, 640, 680]) { g.beginPath(); g.moveTo(190, y); g.lineTo(410, y); obrys(g, 2, 'rgba(36,23,38,.2)'); }
    g.restore(); gladko(g, t); obrys(g, 10);
    g.beginPath(); g.ellipse(300, 470, 110, 34, 0, 0, 7); wypelnij(g, '#f4efe2'); obrys(g, 8);   // szalik
    return;
  }
  // koszula flanelowa (krata)
  gladko(g, t); wypelnij(g, '#b8352c'); g.save(); gladko(g, t); g.clip();
  for (let x = 170; x < 440; x += 34) { g.fillStyle = 'rgba(40,10,10,.3)'; g.fillRect(x, 460, 12, 260); }
  for (let y = 470; y < 720; y += 34) { g.fillStyle = 'rgba(40,10,10,.3)'; g.fillRect(170, y, 270, 12); }
  // kamizelka khaki z kieszeniami i szwami
  const k = [[190, 480], [262, 470], [282, 712], [190, 692]], k2 = [[410, 480], [338, 470], [318, 712], [410, 692]];
  for (const p of [k, k2]) { gladko(g, p.map(([x, y]) => [x, y])); g.beginPath(); g.moveTo(...p[0]); p.slice(1).forEach(q => g.lineTo(...q)); g.closePath(); wypelnij(g, lg(g, 180, 0, 420, 0, [[0, '#b6a46e'], [1, '#8f7f50']])); obrys(g, 5); }
  g.setLineDash([7, 6]);
  for (const [x, y, w, h] of [[200, 560, 64, 56], [336, 560, 64, 56], [204, 632, 62, 48], [334, 632, 62, 48]]) {
    g.beginPath(); g.roundRect(x, y, w, h, 6); wypelnij(g, '#a69560'); g.setLineDash([]); obrys(g, 4); g.setLineDash([7, 6]);
    g.beginPath(); g.roundRect(x + 5, y + 5, w - 10, h - 10, 4); obrys(g, 2, 'rgba(60,45,20,.55)');
    g.beginPath(); g.moveTo(x, y + 14); g.lineTo(x + w, y + 14); obrys(g, 3, 'rgba(36,23,38,.6)');
  }
  g.setLineDash([]);
  g.beginPath(); g.arc(232, 520, 9, 0, 7); wypelnij(g, '#e2452a'); obrys(g, 3);         // przypięta przynęta
  g.beginPath(); g.moveTo(232, 529); g.quadraticCurveTo(238, 545, 228, 548); obrys(g, 2.5, '#888');
  g.fillStyle = 'rgba(52,26,70,.2)'; g.beginPath(); g.ellipse(395, 600, 50, 140, 0, 0, 7); g.fill();
  g.restore(); gladko(g, t); obrys(g, 10);
}
function nogiEksperta(g, { zima = false, siedzi = false } = {}) {
  const sp = zima ? '#2f3b5a' : '#5d6b3a', but = zima ? '#3a2e28' : '#3e4a2a';
  if (siedzi) {
    g.beginPath(); g.roundRect(150, 760, 260, 90, 10); wypelnij(g, '#4f7aa6'); obrys(g, 8);      // skrzynka wędkarska
    g.beginPath(); g.roundRect(150, 760, 260, 26, 8); wypelnij(g, '#3d6189'); obrys(g, 6);
    for (const [x0, x1] of [[235, 320], [320, 405]]) {
      g.beginPath(); g.moveTo(x0 - 30, 690); g.lineTo(x0 + 70, 740); g.lineTo(x1 + 10, 940); g.lineTo(x1 - 40, 945); g.lineTo(x0 + 40, 790); g.lineTo(x0 - 50, 750); g.closePath(); wypelnij(g, sp); obrys(g, 9);
      g.beginPath(); g.roundRect(x1 - 55, 915, 95, 55, 18); wypelnij(g, but); obrys(g, 8);
    }
    return;
  }
  for (const [x, kier] of [[245, -1], [355, 1]]) {
    g.beginPath(); g.moveTo(x - 50, 690); g.lineTo(x + 48, 690); g.lineTo(x + 40 + kier * 8, 930); g.lineTo(x - 42 + kier * 8, 930); g.closePath(); wypelnij(g, lg(g, x - 50, 0, x + 50, 0, [[0, sp], [1, '#3f4a26']])); obrys(g, 9);
    g.beginPath(); g.moveTo(x - 40, 870); g.lineTo(x + 38, 870); obrys(g, 3, 'rgba(36,23,38,.4)');           // szew nad cholewą
    g.beginPath(); g.moveTo(x - 48 + kier * 8, 925); g.lineTo(x + 46 + kier * 20, 925); g.quadraticCurveTo(x + 70 + kier * 20, 975, x + 40 + kier * 20, 975); g.lineTo(x - 52 + kier * 8, 975); g.closePath(); wypelnij(g, but); obrys(g, 8);
  }
  if (!zima) for (const x of [222, 378]) { g.beginPath(); g.moveTo(x, 700); g.lineTo(x + (x < 300 ? -5 : 5), 470); obrys(g, 14, '#3f4a26'); obrys(g, 4, 'rgba(36,23,38,.6)'); }   // szelki woderów
}
export function stworzWedkarza({ wys = 2.4, zima = false, siedzi = false } = {}) {
  const s = wys / 975, O = [300, 975], kb = 100 + (licznikPostaci++ % 40) * 12, op = { zima, siedzi };
  const tylnaReka = czesc(s, ...O, [150, 460, 260, 720], [215, 485], g => {
    g.beginPath(); g.moveTo(215, 485); g.quadraticCurveTo(170, 590, 205, 680); obrys(g, 52, INK); obrys(g, 36, zima ? '#c63a28' : '#b8352c');
    g.beginPath(); g.arc(207, 690, 26, 0, 7); wypelnij(g, zima ? '#2b2b2b' : '#5a4a3a'); obrys(g, 7);
  }, { kolejnosc: 0 });
  const nogi = czesc(s, ...O, [130, 670, 470, 985], [300, 975], g => nogiEksperta(g, op), { kolejnosc: 1 });
  const tulow = czesc(s, ...O, [160, 440, 440, 730], [300, 712], g => tulowEksperta(g, op), { kolejnosc: 2 });
  const glowa = odmiany(czesc(s, ...O, [160, 60, 490, 480], [300, 450], () => {}, { kolejnosc: 3 }),
    Object.fromEntries(['spokojny', 'usmiech', 'zdziwiony', 'mrug', 'skupiony'].map(m => [m, g => glowaEksperta(g, { mina: m, zima })])));
  glowa.userData.ustaw('spokojny');
  // ręka z wędką: ramię, rękawica, kołowrotek, blank z przelotkami; czubek wędki w (930, 40)
  const reka = czesc(s, ...O, [330, 20, 960, 720], [385, 490], g => {
    g.beginPath(); g.moveTo(385, 490); g.quadraticCurveTo(440, 560, 470, 600); obrys(g, 52, INK); obrys(g, 36, zima ? '#c63a28' : '#b8352c');
    // wędka
    g.beginPath(); g.moveTo(420, 690); g.lineTo(930, 40); obrys(g, 11, INK); g.beginPath(); g.moveTo(420, 690); g.lineTo(930, 40); obrys(g, 5, '#3b3f48');
    g.beginPath(); g.moveTo(420, 690); g.lineTo(520, 562); obrys(g, 22, INK); obrys(g, 14, '#c9a46a');                         // rękojeść z korka
    for (const t of [.35, .55, .72, .86]) { const x = 420 + 510 * t, y = 690 - 650 * t; g.beginPath(); g.arc(x - 8, y - 6, 6, 0, 7); obrys(g, 3, INK); }
    g.beginPath(); g.ellipse(500, 615, 30, 22, .6, 0, 7); wypelnij(g, '#9aa3ad'); obrys(g, 7); g.beginPath(); g.moveTo(492, 600); g.lineTo(478, 650); obrys(g, 6, INK);   // kołowrotek
    g.beginPath(); g.arc(472, 605, 30, 0, 7); wypelnij(g, zima ? '#2b2b2b' : '#5a4a3a'); obrys(g, 8);                        // rękawica
  }, { kolejnosc: 4 });
  reka.userData.czubek = new THREE.Vector3((930 - 385) * s, (490 - 40) * s, 0);
  if (siedzi) { [tulow, glowa, reka, tylnaReka].forEach(c => { c.position.y -= 150 * s; c.userData.pozycja0.y -= 150 * s; }); }
  // cień kontaktowy pod stopami (ciemna elipsa w tej samej płaszczyźnie)
  const cien = czesc(s, ...O, [120, 935, 480, 1000], [300, 968], g => { g.beginPath(); g.ellipse(300, 968, 170, 22, 0, 0, 7); wypelnij(g, 'rgba(30,20,40,.5)'); }, { kolejnosc: -1 });
  cien.material.alphaTest = .1; cien.material.depthWrite = false;
  const grupa = zloz([cien, tylnaReka, nogi, tulow, glowa, reka], kb);
  const faza = Math.random() * 6;
  const anim = (t, st = {}) => {
    const odd = 1 + .012 * Math.sin(t * 2.2 + faza);
    tulow.scale.y = odd; glowa.position.y = glowa.userData.pozycja0.y + (odd - 1) * 260 * s;
    glowa.rotation.z = .035 * Math.sin(t * 1.1 + faza) + (st.glowa ?? 0);
    // podrywanie wędki (twitch) albo spokojne trzymanie
    const pod = st.podrywanie ? Math.max(0, Math.sin(t * 5)) ** 6 * .18 : 0;
    reka.rotation.z = .04 * Math.sin(t * 1.4 + faza) + pod + (st.reka ?? 0);
    reka.position.y = reka.userData.pozycja0.y + (odd - 1) * 200 * s;
    tylnaReka.rotation.z = .05 * Math.sin(t * 1.4 + faza + 1);
    const okres = 2.9, f = ((t + faza) % okres) / okres;
    glowa.userData.ustaw(f > .955 ? 'mrug' : (st.mina || 'spokojny'));
  };
  const czubek = () => reka.localToWorld(reka.userData.czubek.clone());
  grupa.userData.wedkarz = { anim, czubek };
  return grupa;
}

// mała ryba-drobnica (płoć) – prosta karta 2D z czerwonym okiem, falujący ogon
export function stworzPlotke({ wys = .5 } = {}) {
  const s = wys / 200, O = [200, 100], kb = 100 + (licznikPostaci++ % 40) * 12;
  const ogon = czesc(s, ...O, [20, 30, 130, 170], [120, 100], g => {
    g.beginPath(); g.moveTo(120, 88); g.quadraticCurveTo(80, 60, 30, 40); g.quadraticCurveTo(55, 100, 30, 160); g.quadraticCurveTo(80, 140, 120, 112); g.closePath(); wypelnij(g, '#b9c6cc'); obrys(g, 8);
  }, { kolejnosc: 0 });
  const cialo = czesc(s, ...O, [95, 25, 385, 175], [240, 100], g => {
    g.beginPath(); g.moveTo(375, 100); g.bezierCurveTo(335, 40, 200, 35, 110, 82); g.lineTo(110, 118); g.bezierCurveTo(200, 165, 335, 160, 375, 100); g.closePath();
    wypelnij(g, lg(g, 0, 40, 0, 160, [[0, '#4f6f84'], [.45, '#d8e3ea'], [1, '#ffffff']])); obrys(g, 8);
    g.beginPath(); g.moveTo(240, 60); g.lineTo(262, 30); g.lineTo(290, 58); wypelnij(g, '#c9a080'); obrys(g, 5);
    g.beginPath(); g.moveTo(230, 140); g.lineTo(250, 168); g.lineTo(268, 142); wypelnij(g, '#e2452a'); obrys(g, 5);
    g.beginPath(); g.arc(325, 92, 15, 0, 7); wypelnij(g, '#e8392b'); obrys(g, 5); g.beginPath(); g.arc(328, 92, 7, 0, 7); wypelnij(g, INK);
  }, { kolejnosc: 1 });
  const grupa = zloz([ogon, cialo], kb), faza = Math.random() * 6;
  grupa.userData.okon = { wys, anim: (t, st = {}) => { const w = 11 * (st.tempo ?? 1); ogon.rotation.z = .3 * Math.sin(w * t + faza); ogon.scale.x = .7 + .3 * Math.abs(Math.cos(w * t + faza)); } };
  return grupa;
}

// narzędzia rysunkowe dla innych bibliotek assetów (przynety.js itd.) – ten sam kontur i cieniowanie
export const narzedzia = { gladko, obrys, wypelnij, lg, czesc, odmiany, zloz, nowyNumer: () => 100 + (licznikPostaci++ % 40) * 12 };
