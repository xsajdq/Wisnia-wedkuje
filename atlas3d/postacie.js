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
const sm = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);

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
// dłoń w rękawicy bez palców (rękawica wędkarska): pięść wokół drążka pod kątem `kat`, opuszki palców w kolorze skóry, kciuk wzdłuż drążka
function dlonChwyt(g, x, y, kat, rek = '#3b3f48', kciuk = true) {
  g.save(); g.translate(x, y); g.rotate(kat);
  g.beginPath(); g.roundRect(-36, -26, 72, 54, 22); wypelnij(g, rek); obrys(g, 7);
  for (let i = 0; i < 4; i++) { const fx = -24 + i * 16;                                         // palce owinięte wokół drążka (od spodu)
    g.beginPath(); g.ellipse(fx, 22, 8.5, 10, 0, 0, 7); wypelnij(g, SKORA); obrys(g, 4);
    g.beginPath(); g.moveTo(fx - 8, 12); g.lineTo(fx + 8, 12); obrys(g, 3, 'rgba(36,23,38,.45)'); }
  if (kciuk) { g.beginPath(); g.ellipse(30, -22, 22, 10, -.1, 0, 7); wypelnij(g, rek); obrys(g, 5); g.beginPath(); g.ellipse(48, -24, 9, 8, 0, 0, 7); wypelnij(g, SKORA); obrys(g, 4); }
  g.beginPath(); g.moveTo(-36, -6); g.lineTo(-36, 10); obrys(g, 4, 'rgba(255,255,255,.25)');      // rzep na nadgarstku
  g.restore();
}
// dłoń luźna (opuszczona ręka): rękawica, cztery palce, kciuk z przodu
function dlonLuzna(g, x, y, rek = '#3b3f48') {
  g.beginPath(); g.roundRect(x - 24, y - 26, 48, 46, 16); wypelnij(g, rek); obrys(g, 6);
  for (let i = 0; i < 4; i++) { g.beginPath(); g.roundRect(x - 22 + i * 11.5, y + 12, 10, 22, 5); wypelnij(g, SKORA); obrys(g, 3.5); }
  g.beginPath(); g.ellipse(x + 26, y - 4, 8, 14, -.4, 0, 7); wypelnij(g, SKORA); obrys(g, 4);
}
function tulowEksperta(g, { zima = false } = {}) {
  // szyja z cieniem pod brodą
  g.beginPath(); g.roundRect(268, 410, 64, 90, 18); wypelnij(g, SKORA); obrys(g, 7);
  g.fillStyle = 'rgba(160,80,60,.28)'; g.fillRect(272, 414, 56, 34);
  const t = [[188, 486], [236, 466], [300, 470], [364, 466], [412, 486], [432, 548], [420, 640], [410, 700], [300, 714], [190, 700], [180, 640], [168, 548]];
  if (zima) { // puchowa kurtka: pikowanie, odblask, zamek, szalik
    gladko(g, t); wypelnij(g, lg(g, 160, 0, 440, 0, [[0, '#e04a34'], [.7, '#c63a28'], [1, '#9a2a1f']])); g.save(); gladko(g, t); g.clip();
    for (const y of [520, 560, 600, 640, 680]) { g.beginPath(); g.moveTo(170, y); g.quadraticCurveTo(300, y + 10, 430, y); obrys(g, 3, 'rgba(70,10,10,.35)'); }
    g.fillStyle = '#d8dde0'; g.fillRect(170, 604, 260, 18);
    g.beginPath(); g.moveTo(300, 470); g.lineTo(300, 714); obrys(g, 6, INK); obrys(g, 2.5, '#c9ced3');
    g.fillStyle = 'rgba(52,26,70,.2)'; g.beginPath(); g.ellipse(410, 600, 50, 150, 0, 0, 7); g.fill();
    g.restore(); gladko(g, t); obrys(g, 10);
    g.beginPath(); g.ellipse(300, 474, 104, 32, 0, 0, 7); wypelnij(g, '#f4efe2'); obrys(g, 8);           // szalik
    g.beginPath(); g.roundRect(318, 484, 30, 74, 10); wypelnij(g, '#f4efe2'); obrys(g, 6);
    for (let y = 496; y < 556; y += 12) { g.beginPath(); g.moveTo(320, y); g.lineTo(346, y); obrys(g, 2, 'rgba(36,23,38,.3)'); }
    return;
  }
  // koszula flanelowa w kratę (widoczna między połami kamizelki) + kołnierzyk
  gladko(g, t); wypelnij(g, '#b8352c'); g.save(); gladko(g, t); g.clip();
  for (let x = 160; x < 440; x += 30) { g.fillStyle = 'rgba(40,10,10,.32)'; g.fillRect(x, 460, 11, 260); g.fillStyle = 'rgba(255,220,200,.12)'; g.fillRect(x + 18, 460, 3, 260); }
  for (let y = 470; y < 720; y += 30) { g.fillStyle = 'rgba(40,10,10,.32)'; g.fillRect(160, y, 280, 11); }
  // kamizelka wędkarska: dwie poły, siatkowy karczek, suwaki, kieszenie z klapami i zamkami, kółko D, łatka na muchy
  const pola = [[[184, 490], [256, 468], [276, 700], [190, 700], [176, 600]], [[416, 490], [344, 468], [324, 700], [410, 700], [424, 600]]];
  for (const p of pola) { g.beginPath(); g.moveTo(...p[0]); p.slice(1).forEach(q => g.lineTo(...q)); g.closePath(); wypelnij(g, lg(g, 176, 0, 424, 0, [[0, '#bfae78'], [.5, '#a69560'], [1, '#8f7f50']])); obrys(g, 5);
    g.setLineDash([6, 6]); g.beginPath(); g.moveTo(p[1][0] + (p[1][0] < 300 ? 8 : -8), p[1][1] + 10); g.lineTo(p[2][0] + (p[2][0] < 300 ? 8 : -8), p[2][1] - 6); obrys(g, 2.5, 'rgba(60,45,20,.6)'); g.setLineDash([]); }
  for (const x of [270, 330]) { g.beginPath(); g.moveTo(x - 6 * Math.sign(300 - x) * -1, 476); g.lineTo(x + (x < 300 ? 8 : -8), 700); obrys(g, 5, '#3b3f48'); }   // zamki błyskawiczne pół
  g.beginPath(); g.moveTo(258, 470); g.lineTo(300, 506); g.lineTo(276, 512); g.closePath(); wypelnij(g, '#9e2b24'); obrys(g, 4);   // kołnierzyk koszuli
  g.beginPath(); g.moveTo(342, 470); g.lineTo(300, 506); g.lineTo(324, 512); g.closePath(); wypelnij(g, '#9e2b24'); obrys(g, 4);
  for (const [x, y, w, h] of [[196, 548, 62, 52], [342, 548, 62, 52], [192, 620, 72, 62], [336, 620, 72, 62]]) {
    g.beginPath(); g.roundRect(x, y, w, h, 7); wypelnij(g, '#a49359'); obrys(g, 4);
    g.setLineDash([5, 5]); g.beginPath(); g.roundRect(x + 5, y + 5, w - 10, h - 10, 5); obrys(g, 2, 'rgba(60,45,20,.5)'); g.setLineDash([]);
    g.beginPath(); g.roundRect(x - 2, y - 2, w + 4, 16, 6); wypelnij(g, '#968552'); obrys(g, 4);      // klapa
    g.beginPath(); g.moveTo(x + w - 14, y + 14); g.lineTo(x + w - 14, y + 28); obrys(g, 4, '#3b3f48'); // suwak zamka
  }
  g.beginPath(); g.ellipse(386, 520, 9, 11, 0, 0, 7); obrys(g, 5, '#3b3f48'); obrys(g, 2.5, '#c9ced3');   // kółko D
  g.beginPath(); g.roundRect(204, 500, 40, 30, 6); wypelnij(g, '#e8e2d0'); obrys(g, 3.5);                 // łatka z owczej wełny
  for (const [fx, fy, k] of [[214, 512, '#e2452a'], [230, 518, '#f2c21a']]) { g.beginPath(); g.moveTo(fx - 7, fy); g.lineTo(fx + 7, fy); obrys(g, 4, k); g.beginPath(); g.arc(fx - 7, fy, 3, 0, 7); wypelnij(g, INK); }   // muchy
  // pas woderów
  g.fillStyle = '#2f3a24'; g.fillRect(176, 690, 248, 22); g.beginPath(); g.roundRect(286, 686, 30, 30, 5); wypelnij(g, '#c9ced3'); obrys(g, 4);
  g.fillStyle = 'rgba(52,26,70,.2)'; g.beginPath(); g.ellipse(412, 600, 46, 150, 0, 0, 7); g.fill();
  g.restore(); gladko(g, t); obrys(g, 10);
}
function nogiEksperta(g, { zima = false, siedzi = false } = {}) {
  const sp = zima ? '#2f3b5a' : '#5d6b3a', sp2 = zima ? '#232c44' : '#46522a', but = zima ? '#3a2e28' : '#3e4a2a';
  if (siedzi) {
    g.beginPath(); g.roundRect(150, 760, 260, 90, 10); wypelnij(g, '#4f7aa6'); obrys(g, 8);      // skrzynka wędkarska
    g.beginPath(); g.roundRect(150, 760, 260, 26, 8); wypelnij(g, '#3d6189'); obrys(g, 6);
    for (const [x0, x1] of [[235, 320], [320, 405]]) {
      g.beginPath(); g.moveTo(x0 - 30, 690); g.lineTo(x0 + 70, 740); g.lineTo(x1 + 10, 940); g.lineTo(x1 - 40, 945); g.lineTo(x0 + 40, 790); g.lineTo(x0 - 50, 750); g.closePath(); wypelnij(g, sp); obrys(g, 9);
      g.beginPath(); g.roundRect(x1 - 55, 915, 95, 55, 18); wypelnij(g, but); obrys(g, 8);
    }
    return;
  }
  // wodery: dwie nogawki z kolanami (lekkie zwężenie i ugięcie), wzmocnienia kolan, szwy; buty z podeszwą i bieżnikiem
  for (const k of [-1, 1]) {
    const c = 300 + k * 52, noga = [[c - 50, 702], [c + 50, 702], [c + 44 + k * 4, 820], [c + 40 + k * 6, 900], [c - 40 + k * 6, 900], [c - 44 + k * 2, 820]];
    gladko(g, noga); wypelnij(g, lg(g, c - 50, 0, c + 50, 0, [[0, k < 0 ? sp : sp2], [1, k < 0 ? sp2 : sp]]));
    g.save(); gladko(g, noga); g.clip();
    g.beginPath(); g.roundRect(c - 40 + k * 3, 800, 80, 56, 16); wypelnij(g, 'rgba(0,0,0,.18)');                          // łata na kolanie
    g.setLineDash([6, 6]); g.beginPath(); g.roundRect(c - 34 + k * 3, 806, 68, 44, 12); obrys(g, 2, 'rgba(255,255,255,.25)'); g.setLineDash([]);
    g.beginPath(); g.moveTo(c - k * 30, 706); g.quadraticCurveTo(c - k * 26, 800, c - k * 30, 900); obrys(g, 2.5, 'rgba(36,23,38,.35)');   // szew
    g.fillStyle = 'rgba(52,26,70,.18)'; g.fillRect(c + (k > 0 ? 20 : -50), 700, 30, 210);
    g.restore(); gladko(g, noga); obrys(g, 9);
    // but: cholewka, nosek skierowany lekko na zewnątrz, gruba podeszwa z bieżnikiem
    const bx = c + k * 6;
    g.beginPath(); g.moveTo(bx - 44, 890); g.lineTo(bx + 44, 890); g.lineTo(bx + 46 + k * 18, 950); g.quadraticCurveTo(bx + 52 + k * 30, 960, bx + 40 + k * 30, 962); g.lineTo(bx - 46 + k * 4, 962); g.closePath(); wypelnij(g, but); obrys(g, 8);
    g.beginPath(); g.moveTo(bx - 40, 914); g.lineTo(bx + 40, 914); obrys(g, 3, 'rgba(255,255,255,.18)');
    g.beginPath(); g.roundRect(bx - 50 + k * 4, 958, 96 + k * 26 * (k > 0 ? 1 : -1), 18, 6); wypelnij(g, '#22251c'); obrys(g, 6);
    for (let x = bx - 42 + k * 4; x < bx + 38 + k * 24; x += 13) { g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x, 966, 6, 6); }
  }
}
export function stworzWedkarza({ wys = 2.4, zima = false, siedzi = false } = {}) {
  const s = wys / 975, O = [300, 975], kb = 100 + (licznikPostaci++ % 40) * 12, op = { zima, siedzi };
  const rekawica = zima ? '#2b2b2b' : '#3b3f48', rekaw = zima ? '#c63a28' : '#b8352c';
  const tylnaReka = czesc(s, ...O, [110, 450, 280, 740], [206, 490], g => {   // ramię → łokieć → przedramię, mankiet, luźna dłoń
    g.beginPath(); g.moveTo(206, 492); g.quadraticCurveTo(160, 556, 158, 600); g.quadraticCurveTo(158, 640, 166, 664); obrys(g, 50, INK); obrys(g, 36, rekaw);
    g.beginPath(); g.moveTo(150, 652); g.lineTo(180, 650); obrys(g, 14, INK); obrys(g, 8, zima ? '#f4efe2' : '#9e2b24');   // mankiet
    dlonLuzna(g, 166, 684, rekawica);
  }, { kolejnosc: 0 });
  const nogi = czesc(s, ...O, [130, 670, 470, 985], [300, 975], g => nogiEksperta(g, op), { kolejnosc: 1 });
  const tulow = czesc(s, ...O, [160, 440, 440, 730], [300, 712], g => tulowEksperta(g, op), { kolejnosc: 2 });
  const glowa = odmiany(czesc(s, ...O, [160, 60, 490, 480], [300, 450], () => {}, { kolejnosc: 3 }),
    Object.fromEntries(['spokojny', 'usmiech', 'zdziwiony', 'mrug', 'skupiony'].map(m => [m, g => glowaEksperta(g, { mina: m, zima })])));
  glowa.userData.ustaw('spokojny');
  // ręka z wędką: ramię, rękawica, kołowrotek, blank z przelotkami; czubek wędki w (930, 40)
  // ręka z wędką: ramię, rękawica, kołowrotek pod blankiem, przelotki po tej samej stronie (dół). Odmiany: prosta (czubek 930,40)
  // i wygięta przy holu (czubek 905,300) – szczytówka ugina się w dół, na stronę przelotek i kołowrotka
  const rekaRys = wygieta => g => {
    // ramię z łokciem i mankietem
    g.beginPath(); g.moveTo(385, 492); g.quadraticCurveTo(436, 540, 450, 584); g.quadraticCurveTo(460, 600, 470, 606); obrys(g, 50, INK); obrys(g, 36, rekaw);
    g.beginPath(); g.moveTo(446, 590); g.lineTo(466, 572); obrys(g, 14, INK); obrys(g, 8, zima ? '#f4efe2' : '#9e2b24');
    // kołowrotek pod wędką (po stronie przelotek): stopka w uchwycie, noga między palcami, korpus, szpula w stronę szczytówki, korbka
    const nx = .787, ny = .617, rx = 482, ry = 606;   // normalna do blanku w dół (prosta wędka), punkt chwytu
    g.beginPath(); g.moveTo(rx + nx * 6, ry + ny * 6); g.lineTo(rx + nx * 46, ry + ny * 46); obrys(g, 14, INK); obrys(g, 7, '#3b3f48');
    g.save(); g.translate(rx + nx * 64, ry + ny * 64); g.rotate(-.9);
    g.beginPath(); g.ellipse(0, 0, 26, 22, 0, 0, 7); wypelnij(g, lg(g, -26, -22, 26, 22, [[0, '#6a717a'], [1, '#1e2126']])); obrys(g, 6);
    g.beginPath(); g.roundRect(-14, -48, 28, 28, 6); wypelnij(g, '#d7dde2'); obrys(g, 5); g.beginPath(); g.roundRect(-9, -44, 18, 20, 4); wypelnij(g, '#7bc043');   // szpula z plecionką
    g.beginPath(); g.moveTo(0, 0); g.lineTo(-30, 18); obrys(g, 6, INK); g.beginPath(); g.ellipse(-34, 22, 7, 10, .6, 0, 7); wypelnij(g, '#f4efe2'); obrys(g, 4);   // korbka
    g.restore();
    // wędka: dolnik z korka, blank, przelotki pod blankiem (strona kołowrotka); odmiana wygięta przy holu
    const blank = () => { g.beginPath(); g.moveTo(420, 690); if (wygieta) g.quadraticCurveTo(720, 260, 905, 300); else g.lineTo(930, 40); };
    blank(); obrys(g, 11, INK); blank(); obrys(g, 5, '#3b3f48');
    g.beginPath(); g.moveTo(420, 690); g.lineTo(520, 562); obrys(g, 22, INK); obrys(g, 14, '#c9a46a');
    for (let k = 0; k < 6; k++) { const u = .1 + k * .14; g.beginPath(); g.arc(420 + 100 * u, 690 - 128 * u, 1.6, 0, 7); wypelnij(g, 'rgba(90,60,30,.6)'); }   // pory korka
    // przelotki po stronie kołowrotka (pod blankiem): normalna do blanku skierowana w dół
    for (const t of [.35, .55, .72, .86]) {
      const x = wygieta ? (1 - t) ** 2 * 420 + 2 * t * (1 - t) * 720 + t * t * 905 : 420 + 510 * t, y = wygieta ? (1 - t) ** 2 * 690 + 2 * t * (1 - t) * 260 + t * t * 300 : 690 - 650 * t;
      const dx = wygieta ? 2 * (1 - t) * 300 + 2 * t * 185 : 510, dy = wygieta ? 2 * (1 - t) * -430 + 2 * t * 40 : -650, L = Math.hypot(dx, dy);
      let nx = -dy / L, ny = dx / L; if (ny < 0) { nx = -nx; ny = -ny; }
      const r = 7 - 2.5 * t;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + nx * 9, y + ny * 9); obrys(g, 3, INK);
      g.beginPath(); g.arc(x + nx * (9 + r), y + ny * (9 + r), r, 0, 7); obrys(g, 3, INK); }
    dlonChwyt(g, rx, ry, -.905, rekawica);   // dłoń zaciśnięta na rękojeści, kciuk wzdłuż blanku
  };
  const reka = odmiany(czesc(s, ...O, [330, 20, 960, 720], [385, 490], () => {}, { kolejnosc: 4 }), { prosta: rekaRys(false), wygieta: rekaRys(true) });
  reka.userData.ustaw('prosta');
  const czubki = { prosta: new THREE.Vector3((930 - 385) * s, (490 - 40) * s, 0), wygieta: new THREE.Vector3((905 - 385) * s, (490 - 300) * s, 0) };
  reka.userData.czubek = czubki.prosta;
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
    // rzut (st.rzut = postęp 0…1): wędka za głowę, potem szybko do przodu i lekko w dół
    let rz = 0;
    if (st.rzut !== undefined) { const p = Math.min(1, Math.max(0, st.rzut)); rz = p < .35 ? 1.15 * sm(p / .35) : 1.15 - 1.5 * (1 - (1 - (p - .35) / .65) ** 3); }
    // hol (st.hol): wędka wygięta i uniesiona, drży od pracy ryby
    const hol = st.hol ? .3 + .05 * Math.sin(t * 9) + .03 * Math.sin(t * 23) : 0;
    reka.userData.ustaw(st.hol ? 'wygieta' : 'prosta'); reka.userData.czubek = czubki[st.hol ? 'wygieta' : 'prosta'];
    reka.rotation.z = .04 * Math.sin(t * 1.4 + faza) + pod + rz + hol + (st.reka ?? 0);
    reka.position.y = reka.userData.pozycja0.y + (odd - 1) * 200 * s;
    // druga ręka: luźno albo wyciągnięta do przodu (st.trzyma – trzyma rybę, dłoń w dlon())
    tylnaReka.rotation.z = st.trzyma ? -1.25 + .04 * Math.sin(t * 2) : .05 * Math.sin(t * 1.4 + faza + 1);
    const okres = 2.9, f = ((t + faza) % okres) / okres;
    glowa.userData.ustaw(f > .955 ? 'mrug' : (st.mina || 'spokojny'));
  };
  const czubek = () => reka.localToWorld(reka.userData.czubek.clone());
  const dlon = () => tylnaReka.localToWorld(new THREE.Vector3((166 - 206) * s, (490 - 690) * s, 0));
  grupa.userData.wedkarz = { anim, czubek, dlon };
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
