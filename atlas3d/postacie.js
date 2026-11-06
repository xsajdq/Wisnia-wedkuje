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
  m.userData = { kolejnosc, cv, g, bbox, res, s, piwot, pozycja0: m.position.clone(), geo0: geo.attributes.position.array.slice() };
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
  m.userData.ustaw = k => { if (mapy[k] && m.material.map !== mapy[k]) { m.material.map = mapy[k]; if (m.material.emissiveMap) m.material.emissiveMap = mapy[k]; m.material.needsUpdate = true; } };
  return m;
}
function zloz(czesci, kolejnoscBazowa, opcje3d = {}) {
  const g = new THREE.Group();
  czesci.forEach(c => { c.renderOrder = kolejnoscBazowa + c.userData.kolejnosc; g.add(c); });
  if (opcje3d !== false) nadmuchaj(czesci, opcje3d);
  return g;
}
// ---------- 3D z rysunku 2D (decyzja użytkownika: wygląd bez zmian, ale bryły 3D) ----------
// Sylwetka całej postaci (suma części) → mapa odległości od krawędzi → wysokość h(x, y) (przekrój zaokrąglony jak elipsa).
// Każda część dostaje siatkę: przód na +h, tył na −h (ten sam rysunek, z tyłu lustrzany), krawędź na 0 – zamknięta bryła.
// Części wyżej w kolejności (oko, brew, ręka) leżą odrobinę nad powierzchnią, więc widać je z obu stron.
// T – połowa grubości (px projektu; domyślnie 22% krótszego boku sylwetki), D – szerokość zaokrąglenia brzegu (px).
// Oświetlenie: Lambert z rysunkiem także jako emisją – kolory jak w rysunku, a światło sceny dodaje objętość.
const SIATKA = 4;
// pas przy krawędzi sylwetki (szer px) wypełnia kolorem najbliższego piksela z wnętrza (BFS od wnętrza na zewnątrz); alfa bez zmian
function zetrzyjKontur(cv, szer, tex) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height, im = g.getImageData(0, 0, W, H), d = im.data, N = W * H;
  const dist = new Float32Array(N).fill(1e9), q = new Int32Array(N); let h = 0, t = 0;
  for (let i = 0; i < N; i++) if (d[i * 4 + 3] < 40) { dist[i] = 0; q[t++] = i; }
  while (h < t) { const i = q[h++], x = i % W, y = (i / W) | 0, nd = dist[i] + 1; if (nd > szer + 2) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const j = yy * W + xx; if (dist[j] > nd) { dist[j] = nd; q[t++] = j; } } }
  // od wnętrza (dist > szer) rozlej kolor na pas – także na przezroczyste piksele (alfa bez zmian), żeby filtrowanie tekstury nie wciągało czerni na brzeg
  const src = new Int32Array(N).fill(-1); h = 0; t = 0;
  for (let i = 0; i < N; i++) if (d[i * 4 + 3] >= 40 && dist[i] > szer) { src[i] = i; if (dist[i] <= szer + 2) q[t++] = i; }
  while (h < t) { const i = q[h++], x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const j = yy * W + xx;
      if (src[j] < 0) { src[j] = src[i]; const k = src[i] * 4; d[j * 4] = d[k]; d[j * 4 + 1] = d[k + 1]; d[j * 4 + 2] = d[k + 2]; q[t++] = j; } } }
  g.putImageData(im, 0, 0); if (tex) tex.needsUpdate = true;
}   // krok siatki w px projektu
// bryla – części tworzące objętość (domyślnie największa część, np. ciało ryby); płetwy, ogon i inne części poza bryłą są cienkie
// (płaskie jak prawdziwa płetwa – bez „dwóch warstw” widocznych od tyłu), a części leżące na bryle przylegają do jej powierzchni
function nadmuchaj(czesci, { T, D, plaskie = [], bryla, ob = 15 } = {}) {
  if (bryla === undefined) { let mx = 0; for (const c of czesci) { const [a, b, cc, d] = c.userData.bbox, pole = (cc - a) * (d - b); if (pole > mx) { mx = pole; bryla = [c]; } } }
  if (bryla === 'wszystko') bryla = czesci;
  let X0 = 1e9, Y0 = 1e9, X1 = -1e9, Y1 = -1e9;
  for (const c of czesci) { const [a, b, cc, d] = c.userData.bbox; X0 = Math.min(X0, a); Y0 = Math.min(Y0, b); X1 = Math.max(X1, cc); Y1 = Math.max(Y1, d); }
  const k = 1, uw = Math.ceil((X1 - X0) * k) + 2, uh = Math.ceil((Y1 - Y0) * k) + 2;   // maska sumy w siatce co 3 px
  const cvU = document.createElement('canvas'); cvU.width = uw; cvU.height = uh; const gu = cvU.getContext('2d');
  const obrazy = c => [c.userData.cv, ...Object.values(c.userData.mapy || {}).map(t => t.image)];
  for (const c of bryla) { const [a, b, cc, d] = c.userData.bbox; for (const im of obrazy(c)) gu.drawImage(im, (a - X0) * k + 1, (b - Y0) * k + 1, (cc - a) * k, (d - b) * k); }
  const A = gu.getImageData(0, 0, uw, uh).data, dist = new Float32Array(uw * uh);
  for (let i = 0; i < uw * uh; i++) dist[i] = A[i * 4 + 3] > 60 ? 1e6 : 0;
  // odległość od krawędzi (dwuprzebiegowa, przybliżenie euklidesowej)
  const q = Math.SQRT2;
  for (let y = 1; y < uh - 1; y++) for (let x = 1; x < uw - 1; x++) { const i = y * uw + x; if (!dist[i]) continue; dist[i] = Math.min(dist[i], dist[i - 1] + 1, dist[i - uw] + 1, dist[i - uw - 1] + q, dist[i - uw + 1] + q); }
  for (let y = uh - 2; y > 0; y--) for (let x = uw - 2; x > 0; x--) { const i = y * uw + x; if (!dist[i]) continue; dist[i] = Math.min(dist[i], dist[i + 1] + 1, dist[i + uw] + 1, dist[i + uw + 1] + q, dist[i + uw - 1] + q); }
  let dmax = 0; for (const v of dist) if (v < 1e5 && v > dmax) dmax = v; dmax /= k;     // px projektu
  if (bryla !== czesci) { let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9; for (const c of bryla) { const [a, b, cc, d] = c.userData.bbox; bx0 = Math.min(bx0, a); by0 = Math.min(by0, b); bx1 = Math.max(bx1, cc); by1 = Math.max(by1, d); } T = T ?? .22 * Math.min(bx1 - bx0, by1 - by0); }
  T = T ?? .22 * Math.min(X1 - X0, Y1 - Y0); D = D ?? Math.max(8, dmax * .85);
  const H = (x, y) => { const gx = (x - X0) * k + 1, gy = (y - Y0) * k + 1, ix = Math.max(0, Math.min(uw - 2, Math.floor(gx))), iy = Math.max(0, Math.min(uh - 2, Math.floor(gy))), fx = gx - ix, fy = gy - iy;
    const v = (dist[iy * uw + ix] * (1 - fx) + dist[iy * uw + ix + 1] * fx) * (1 - fy) + (dist[(iy + 1) * uw + ix] * (1 - fx) + dist[(iy + 1) * uw + ix + 1] * fx) * fy;
    const u = Math.min(1, Math.max(0, v / k - ob) / D); return T * Math.sqrt(Math.max(0, 1 - (1 - u) * (1 - u))); };   // pas konturu z rysunku (ob px) leży płasko na szwie – pod kątem nie widać go jako czarnej kreski na boku
  const kolMax = Math.max(...czesci.map(c => c.userData.kolejnosc)) || 1;
  for (const c of czesci) {
    const { bbox: [a, b, cc, d], s, piwot, res } = c.userData, plaska = plaskie.includes(c);
    const nx = Math.max(2, Math.ceil((cc - a) / SIATKA)), ny = Math.max(2, Math.ceil((d - b) / SIATKA));
    // które węzły siatki należą do części (alfa dowolnej odmiany rysunku)
    const al = new Uint8Array((nx + 1) * (ny + 1));
    for (const im of obrazy(c)) { const W = im.width, Hh = im.height, dat = im.getContext('2d').getImageData(0, 0, W, Hh).data;
      for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) { const px = Math.min(W - 1, Math.round(i / nx * (W - 1))), py = Math.min(Hh - 1, Math.round(j / ny * (Hh - 1)));
        let m = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const xx = Math.min(W - 1, Math.max(0, px + dx * Math.ceil(res * SIATKA / 4))), yy = Math.min(Hh - 1, Math.max(0, py + dy * Math.ceil(res * SIATKA / 4))); m = Math.max(m, dat[(yy * W + xx) * 4 + 3]); }
        if (m > 10) al[j * (nx + 1) + i] = 1; } }
    const poz = [], uv = [], idx = [], nr = new Int32Array((nx + 1) * (ny + 1)).fill(-1), eps = c.userData.kolejnosc * Math.max(1.2, T * .012) + .4;   // każda warstwa wyraźnie nad poprzednią (źrenica nad okiem, oko nad ciałem) – bez przebijania przy różnej gęstości siatek   // nakładki tuż nad powierzchnią (bez odstawania)
    for (let strona = 0; strona < 2; strona++) {
      nr.fill(-1);
      for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
        const uzyty = [[0, 0], [-1, 0], [0, -1], [-1, -1]].some(([di, dj]) => { const ii = i + di, jj = j + dj; return ii >= 0 && jj >= 0 && ii < nx && jj < ny && [[0, 0], [1, 0], [0, 1], [1, 1]].some(([ei, ej]) => al[(jj + ej) * (nx + 1) + ii + ei]); });
        if (!uzyty) continue;
        let x = a + (cc - a) * i / nx, y = b + (d - b) * j / ny; const h = al[j * (nx + 1) + i] ? (plaska ? T * .04 : H(x, y)) + eps : 0;
        if (!al[j * (nx + 1) + i] && bryla.includes(c) && bryla !== czesci) {   // węzeł brzegu bryły: dosuń do prawdziwego konturu (gładka sylwetka zamiast schodków siatki)
          let best = 1e9, bx = x, by = y; const R = SIATKA * 1.6;
          for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const gx = Math.round((x + dx - X0) * k + 1), gy = Math.round((y + dy - Y0) * k + 1);
            if (gx < 0 || gy < 0 || gx >= uw || gy >= uh || !dist[gy * uw + gx]) continue; const dd = dx * dx + dy * dy; if (dd < best) { best = dd; bx = x + dx; by = y + dy; } }
          if (best < 1e9) { x = bx; y = by; } }
        nr[j * (nx + 1) + i] = poz.length / 3; poz.push((x - piwot[0]) * s, (piwot[1] - y) * s, (strona ? -h : h) * s); uv.push(i / nx, 1 - j / ny); }
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const v00 = nr[j * (nx + 1) + i], v10 = nr[j * (nx + 1) + i + 1], v01 = nr[(j + 1) * (nx + 1) + i], v11 = nr[(j + 1) * (nx + 1) + i + 1];
        if ([v00, v10, v01, v11].some(v => v < 0)) continue;
        if (!(al[j * (nx + 1) + i] || al[j * (nx + 1) + i + 1] || al[(j + 1) * (nx + 1) + i] || al[(j + 1) * (nx + 1) + i + 1])) continue;
        if (strona) idx.push(v00, v10, v01, v10, v11, v01); else idx.push(v00, v01, v10, v10, v01, v11); }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    if (bryla.includes(c) && bryla !== czesci) {   // szew (h = 0): normalna w płaszczyźnie sylwetki, z gradientu pola odległości (gładka, skierowana na zewnątrz)
      const P = geo.attributes.position, Nn = geo.attributes.normal, D0 = (x, y) => { const gx = Math.round((x - X0) * k + 1), gy = Math.round((y - Y0) * k + 1); return gx < 0 || gy < 0 || gx >= uw || gy >= uh ? 0 : Math.min(dist[gy * uw + gx], 40); };
      for (let i = 0; i < P.count; i++) { if (Math.abs(P.getZ(i)) > 1e-6) continue; const x = P.getX(i) / s + piwot[0], y = piwot[1] - P.getY(i) / s;
        let gx = 0, gy = 0; for (const r of [3, 6, 9]) { gx += D0(x + r, y) - D0(x - r, y); gy += D0(x, y + r) - D0(x, y - r); }
        const l = Math.hypot(gx, gy); if (l > 1e-6) Nn.setXYZ(i, -gx / l, gy / l, 0); }
      Nn.needsUpdate = true; }
    c.geometry.dispose(); c.geometry = geo; c.userData.geo0 = geo.attributes.position.array.slice();
    if (bryla.includes(c) && bryla !== czesci) zetrzyjKontur(c.userData.cv, (ob + 4) * res, c.material.map);   // kontur rysuje otoczka 3D – pas konturu z rysunku zastąp kolorem ciała
    const map = c.material.map; c.material.dispose();
    c.material = new THREE.MeshLambertMaterial({ map, emissiveMap: map, emissive: '#ffffff', emissiveIntensity: 1, color: '#ffffff', transparent: true, alphaTest: .35, depthWrite: true, side: THREE.FrontSide });
    c.material.userData.jasnosc = .5; c.material.color.setScalar(.5);
    if (bryla.includes(c) && bryla !== czesci) c.material.alphaTest = .5;   // bryła: kształt wyznacza siatka, bez dziur przy brzegu (przez dziury prześwitywał czarny kontur)
    // kontur bryły (odwrócona otoczka): czarna skorupa widoczna tylko na krawędzi sylwetki pod każdym kątem; wspólna geometria – podąża za falą ciała
    if (false && bryla.includes(c) && bryla !== czesci) {   // (wyłączone) otoczka 3D – kontur sylwetki rysuje teraz kompozycja silnika (obrys maski postaci)
      const om = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide, toneMapped: false, polygonOffset: true, polygonOffsetFactor: 40, polygonOffsetUnits: 60 }), gr = (bryla[0] === c ? 10 : 8) * s;
      om.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n  transformed += normalize(normal) * ${gr.toFixed(5)};`); };
      om.customProgramCacheKey = () => 'otoczka' + gr.toFixed(5);
      const ot = new THREE.Mesh(c.geometry, om); ot.layers.set(POSTACIE); ot.renderOrder = c.renderOrder - 1; ot.userData.otoczka = true; c.add(ot); c.userData.otoczka = ot;
    }
  }
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
  // paszcza (atak): otwarta – ciemne wnętrze, górna warga uniesiona, żuchwa opuszczona; zamknięta – pusta (pysk z rysunku ciała)
  const paszcza = odmiany(czesc(s, ...O, [820, 240, 975, 395], [935, 300], () => {}, { kolejnosc: 9 }), {
    zamknieta: () => {},
    otwarta: g => {   // otwarta paszcza w obrysie głowy (okoń: drobne ząbki niewidoczne – bez zębów): szczęki rozchylone, wargi, ciemne gardło
      const wn = () => { g.beginPath(); g.moveTo(940, 282); g.bezierCurveTo(915, 282, 890, 290, 868, 306); g.bezierCurveTo(888, 322, 910, 336, 934, 344); g.bezierCurveTo(944, 324, 946, 302, 940, 282); g.closePath(); };
      wn(); const gr = g.createRadialGradient(882, 308, 2, 905, 314, 55); gr.addColorStop(0, '#16050a'); gr.addColorStop(.6, '#4f141b'); gr.addColorStop(1, '#9a3a3e'); g.fillStyle = gr; g.fill();
      g.save(); wn(); g.clip(); g.beginPath(); g.ellipse(912, 330, 22, 8, .4, 0, 7); wypelnij(g, '#b9585a'); g.restore(); wn(); obrys(g, 5);
      g.lineCap = 'round';
      const gw = () => { g.beginPath(); g.moveTo(942, 280); g.bezierCurveTo(915, 279, 889, 288, 866, 305); }, dw = () => { g.beginPath(); g.moveTo(866, 309); g.bezierCurveTo(888, 326, 911, 340, 936, 348); };
      gw(); obrys(g, 11); gw(); obrys(g, 5.5, '#cdbf72'); dw(); obrys(g, 11); dw(); obrys(g, 5.5, '#e6dba6'); },
  });
  paszcza.userData.ustaw('zamknieta');
  const grupa = zloz([ogon, grzb1, grzb2, odbyt, brzuch, cialo, piers, zr, brew, paszcza], kb);
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
    paszcza.userData.ustaw(st.paszcza ? 'otwarta' : 'zamknieta');
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
  const grupa = zloz([cien, tylnaReka, nogi, tulow, glowa, reka], kb, { T: 42, D: 70, plaskie: [cien], bryla: 'wszystko' });   // człowiek z przodu: płytsza bryła niż ryba
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
// =====================================================================================================
// RYBY KARPIOWATE (płoć, ukleja, …) – jeden model, cechy gatunku w GATUNKI_KARP. Widok z boku, głowa w prawo.
// Projekt 1000 × 420 px, linia środkowa y = 210, ciało od ogona (u = 0, x = 190) do pyska (u = 1, x = 930).
// Wygląd wg zdjęć i opisów (Wikipedia, FishBase): płoć – czerwona tęczówka, czerwonawe płetwy brzuszne i odbytowa,
// duże łuski; ukleja – smukła, bardzo srebrna, pysk górny (żuchwa wysunięta w górę), długa płetwa odbytowa,
// płetwa grzbietowa cofnięta za nasadę płetw brzusznych.
// =====================================================================================================
const GATUNKI_KARP = {
  ploc: { H: 236, szczyt: .5, gora: 1, dol: 1, pysk: 'koncowy', luska: 15, grzbiet: '#2f4a55', bok: '#c9d5db', brzuch: '#f7f8f6', polysk: 'rgba(255,255,255,.28)',
    teczowka: '#d63a2a', pletwy: ['#7e8a86', '#9a8a7a'], czerwone: ['#e86a35', '#d2452a'], linia: .52,
    grzbietowa: [.47, .62, .62], odbytowa: [.24, .36, .42], brzuszne: .5, piersiowa: .8 },
  ukleja: { H: 150, szczyt: .58, gora: .72, dol: 1.08, pysk: 'gorny', luska: 10, grzbiet: '#4a7468', bok: '#e4ecef', brzuch: '#fbfcfc', polysk: 'rgba(255,255,255,.42)',
    teczowka: '#c9d1d6', pletwy: ['#c3cbcf', '#b7c0c4'], czerwone: ['#cfd6d9', '#bcc5c9'], linia: .62,
    grzbietowa: [.36, .45, .6], odbytowa: [.12, .34, .38], brzuszne: .5, piersiowa: .82 },
};
function profilKarp(c) {   // punkty obrysu ciała (górny profil od ogona do pyska, dolny z powrotem)
  const X = u => 190 + u * 740, pr = (u, max) => u < c.szczyt ? .3 + (max - .3) * sm01(u / c.szczyt) : max - (max - .12) * Math.pow((u - c.szczyt) / (1 - c.szczyt), 2.1);
  const gora = [], dol = [];
  for (let k = 0; k <= 24; k++) { const u = k / 24; gora.push([X(u), 210 - c.H / 2 * pr(u, c.gora)]); dol.push([X(u), 210 + c.H / 2 * pr(u, c.dol)]); }
  gora.push([X(1) + 10, 210 + (c.pysk === 'gorny' ? -c.H * .12 : -c.H * .02)]);
  return { gora, dol, pts: [...gora, ...dol.reverse()] };
}
const sm01 = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
function stworzKarpiowata(gat, { wys = .5 } = {}) {
  const c = GATUNKI_KARP[gat], s = wys / 420, O = [560, 210], kb = 100 + (licznikPostaci++ % 40) * 12, { gora, dol, pts } = profilKarp(c);
  const X = u => 190 + u * 740, yG = u => gora[Math.round(u * 24)][1], yD = u => dol[24 - Math.round(u * 24)][1];
  // ogon: wcięty (widlasty), z promieniami
  const ogon = czesc(s, ...O, [20, 40, 230, 380], [205, 210], g => {
    const h = c.H * .66, k = [[208, 210 - c.H * .15], [140, 210 - h * .55], [44, 210 - h * 1.02], [30, 210 - h * .9], [74, 210 - h * .42], [118, 210], [74, 210 + h * .42], [30, 210 + h * .9], [44, 210 + h * 1.02], [140, 210 + h * .55], [208, 210 + c.H * .15]];
    g.beginPath(); g.moveTo(...k[0]); for (let i = 1; i < k.length; i++) { const p = k[i - 1], q = k[i]; g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); } g.lineTo(...k[k.length - 1]); g.closePath();
    const ksz = new Path2D(); ksz.moveTo(...k[0]); for (let i = 1; i < k.length; i++) { const p = k[i - 1], q = k[i]; ksz.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); } ksz.lineTo(...k[k.length - 1]); ksz.closePath();
    g.fillStyle = lg(g, 30, 0, 208, 0, [[0, c.czerwone[0] === '#cfd6d9' ? c.pletwy[1] : c.pletwy[1]], [.5, c.pletwy[0]], [1, c.grzbiet]]); g.fill(ksz);
    if (gat === 'ploc') { g.save(); g.clip(ksz); g.fillStyle = 'rgba(214,82,48,.22)'; g.fillRect(20, 0, 110, 420); g.restore(); }   // płoć: czerwonawe końce płatów
    g.save(); g.clip(ksz); for (let i = 0; i < 17; i++) { const a = (-50 + i * 6.25) * D2R; g.beginPath(); g.moveTo(208, 210); g.lineTo(208 - 200 * Math.cos(a), 210 + 210 * Math.sin(a)); obrys(g, 2.2, 'rgba(36,23,38,.38)'); } g.restore();
    g.lineWidth = 7; g.strokeStyle = INK; g.stroke(ksz);
  }, { kolejnosc: 0, segX: 6 });
  // płetwa: nasada od (xa, ya) – przód – do (xb, yb) – tył; promienie odchylone do tyłu o kąt `kat` od pionu (sg: −1 w górę, +1 w dół),
  // długość promieni maleje od przodu ku tyłowi (L0 → L1), brzeg łukowaty; membrana z gradientem nasada → końce
  const fin = (xa, ya, xb, yb, sg, kat, L0, L1, n, kolory, kol, wypukly = .25, rozrzut = .3) => {
    const cz = []; for (let i = 0; i < n; i++) { const t = i / (n - 1), L = L1 + (L0 - L1) * Math.pow(1 - t, 1 + wypukly * 2), a = kat + t * rozrzut;   // brzeg lekko wklęsły (płetwy karpiowatych)
      cz.push([lerpL(xa, xb, t) - Math.sin(a) * L, lerpL(ya, yb, t) + sg * Math.cos(a) * L]); }
    const xs = [xa, xb, ...cz.map(q => q[0])], ys = [ya, yb, ...cz.map(q => q[1])];
    return czesc(s, ...O, [Math.min(...xs) - 14, Math.min(...ys) - 14, Math.max(...xs) + 14, Math.max(...ys) + 14], [xa, ya], g => {
      const yt = (ya + yb) / 2 + sg * L0 * .9;
      pletwaPromienie(g, [[xa, ya], [xb, yb]], cz, lg(g, 0, (ya + yb) / 2, 0, yt, [[0, kolory[0]], [1, kolory[1]]]), 'rgba(36,23,38,.4)', 2.2);
      g.beginPath(); g.moveTo(xa, ya); g.lineTo(...cz[0]); for (let i = 1; i < n; i++) { const p = cz[i - 1], q = cz[i]; g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
      g.lineTo(...cz[n - 1]); g.lineTo(xb, yb); obrys(g, 5.5); }, { kolejnosc: kol });
  };
  const lerpL = (a, b, t) => a + (b - a) * t;
  const [gd0, gd1, gdh] = c.grzbietowa, [od0, od1, odh] = c.odbytowa;
  const grzb = fin(X(gd1), yG(gd1) + 6, X(gd0), yG(gd0) + 6, -1, .5, gdh * c.H, gdh * c.H * .3, 12, c.pletwy, 1);
  const odbyt = fin(X(od1), yD(od1) - 6, X(od0), yD(od0) - 6, 1, .55, odh * c.H, odh * c.H * .35, 11, c.czerwone, 2);
  const ub = c.brzuszne, bx = X(ub), by = yD(ub) - 6;
  const brzuch = fin(bx, by, bx - c.H * .22, yD(ub - .03) - 4, 1, .75, c.H * .4, c.H * .16, 9, [c.czerwone[1], c.czerwone[0]], 3, .1);
  const cialo = czesc(s, ...O, [170, 205 - c.H * .65, 960, 215 + c.H * .65], [560, 210], g => {
    gladko(g, pts); wypelnij(g, lg(g, 0, 210 - c.H / 2, 0, 210 + c.H / 2, [[0, c.grzbiet], [.28, c.grzbiet], [.45, c.bok], [.75, c.bok], [1, c.brzuch]]));
    g.save(); gladko(g, pts); g.clip();
    // łuski cykloidalne: łuki w przesuniętych rzędach, wyraźniejsze na grzbiecie
    for (let y = 210 - c.H * .55, r = 0; y < 210 + c.H * .6; y += c.luska * .78, r++) for (let x = 200 + (r % 2) * c.luska * .55; x < X(.8); x += c.luska * 1.1) {
      const a = .13 + .16 * Math.max(0, (210 - y) / c.H + .45); g.strokeStyle = `rgba(20,38,48,${a})`; g.lineWidth = 1.8;
      g.beginPath(); g.arc(x, y, c.luska * .62, -Math.PI / 2 - 1.15, Math.PI / 2 + 1.15, true); g.stroke();
      g.strokeStyle = `rgba(255,255,255,${a * .9})`; g.lineWidth = 1.2; g.beginPath(); g.arc(x - 2.5, y, c.luska * .5, -Math.PI / 2 - .9, Math.PI / 2 + .9, true); g.stroke(); }
    g.fillStyle = lg(g, 0, 210 - c.H * .3, 0, 210 + c.H * .05, [[0, 'rgba(255,255,255,0)'], [.5, c.polysk], [1, 'rgba(255,255,255,0)']]);   // srebrny połysk boku
    g.beginPath(); g.ellipse(560, 210 - c.H * .1, 330, c.H * .16, -.03, 0, 7); g.fill();
    g.fillStyle = 'rgba(40,40,70,.16)'; g.beginPath(); g.ellipse(560, 210 + c.H * .55, 420, c.H * .2, 0, 0, 7); g.fill();
    // linia boczna: łagodnie wygięta w dół
    g.setLineDash([7, 6]); g.strokeStyle = 'rgba(30,40,45,.5)'; g.lineWidth = 2.5;
    gladko(g, [[X(.82), 210 - c.H * .12], [X(.6), 210 + c.H * (c.linia - .45)], [X(.35), 210 + c.H * (c.linia - .42)], [X(.08), 210 + c.H * .02]], false); g.stroke(); g.setLineDash([]);
    // pokrywa skrzelowa i pysk
    g.fillStyle = 'rgba(40,60,70,.14)'; g.beginPath(); g.moveTo(X(.81), 210 - c.H * .5); g.quadraticCurveTo(X(.77), 210, X(.82), 210 + c.H * .5); g.lineTo(X(1) + 20, 210 + c.H * .5); g.lineTo(X(1) + 20, 210 - c.H * .5); g.closePath(); g.fill();   // głowa bez łusek, ciemniejsza
    g.beginPath(); g.moveTo(X(.815), 210 - c.H * .38); g.quadraticCurveTo(X(.775), 210, X(.825), 210 + c.H * .42); obrys(g, 6);                           // pokrywa skrzelowa
    g.beginPath(); g.moveTo(X(.865), 210 + c.H * .02); g.quadraticCurveTo(X(.85), 210 + c.H * .22, X(.87), 210 + c.H * .38); obrys(g, 3.5, 'rgba(36,23,38,.55)');   // przedpokrywa
    g.fillStyle = 'rgba(255,180,160,.2)'; g.beginPath(); g.ellipse(X(.85), 210 + c.H * .06, 26, c.H * .26, 0, 0, 7); g.fill();
    g.beginPath(); g.arc(X(.965), 210 - c.H * .14, 4, 0, 7); wypelnij(g, INK);                                                                                // nozdrze
    if (c.pysk === 'gorny') { g.beginPath(); g.moveTo(X(1) + 8, 210 - c.H * .12); g.quadraticCurveTo(X(.95), 210 - c.H * .02, X(.92), 210 + c.H * .03); obrys(g, 6); }   // pysk górny (ukleja)
    else { g.beginPath(); g.moveTo(X(1) + 6, 210 + c.H * .02); g.quadraticCurveTo(X(.965), 210 + c.H * .1, X(.935), 210 + c.H * .08); obrys(g, 6); }
    g.restore(); gladko(g, pts); obrys(g, 10);
    g.save(); g.beginPath(); g.rect(150, 210 + c.H * .12, 820, c.H); g.clip(); gladko(g, pts); obrys(g, 13); g.restore();   // grubszy kontur od spodu (strona cienia)
    // oko: tęczówka gatunku, źrenica osobno (patrzy)
    const ex = X(.905), ey = 210 - c.H * (c.pysk === 'gorny' ? .06 : .1), er = c.H * (gat === 'ukleja' ? .13 : .13);
    g.beginPath(); g.arc(ex, ey, er, 0, 7); wypelnij(g, lg(g, ex, ey - er, ex, ey + er, [[0, '#ffffff'], [.35, c.teczowka], [1, c.teczowka]])); obrys(g, 6);
  }, { kolejnosc: 4, segX: 24 });
  const pp = c.piersiowa, px = X(pp), py = 210 + c.H * .3;   // piersiowa: smukły wachlarz za pokrywą skrzelową, skierowany w tył i w dół
  const piers = fin(px + 6, py - c.H * .06, px, py + c.H * .1, 1, 1.4, c.H * .55, c.H * .24, 9, gat === 'ukleja' ? ['#c9d2d6', '#e8edef'] : ['#e0784a', '#f2b48a'], 5, .15, -.8);
  const ex = X(.905), ey = 210 - c.H * (c.pysk === 'gorny' ? .06 : .1), er = c.H * (gat === 'ukleja' ? .062 : .065);
  const zr = czesc(s, ...O, [ex - 30, ey - 30, ex + 30, ey + 30], [ex, ey], g => { g.beginPath(); g.arc(ex + 2, ey, er, 0, 7); wypelnij(g, '#0d0910'); g.beginPath(); g.arc(ex - er * .3, ey - er * .35, er * .3, 0, 7); wypelnij(g, 'rgba(255,255,255,.9)'); }, { kolejnosc: 6 });
  const grupa = zloz([ogon, grzb, odbyt, brzuch, cialo, piers, zr], kb, { T: c.H * .2 }), faza = Math.random() * 6;
  const anim = (t, st = {}) => {
    const w = 9 * (st.tempo ?? 1), ph = faza, geo = cialo.geometry.attributes.position, b0 = cialo.userData.geo0, L = 740 * s;
    const fala = x => { const u = Math.min(1, Math.max(0, (x + 370 * s) / L)); return wys * .018 * Math.pow(1 - u, 2) * Math.sin(w * t + ph - (1 - u) * 2.4); };
    for (let i = 0; i < geo.count; i++) geo.array[i * 3 + 1] = b0[i * 3 + 1] + fala(b0[i * 3] + cialo.position.x);
    geo.needsUpdate = true;
    ogon.position.y = ogon.userData.pozycja0.y + fala(ogon.position.x); ogon.rotation.z = .22 * Math.sin(w * t + ph - 2.4);
    grzb.position.y = grzb.userData.pozycja0.y + fala(grzb.position.x) * .6; odbyt.position.y = odbyt.userData.pozycja0.y + fala(odbyt.position.x) * .6;
    piers.rotation.z = .3 * Math.sin(w * .5 * t + ph) - .1; brzuch.rotation.z = .1 * Math.sin(w * .45 * t + ph + 1);
    zr.position.x = zr.userData.pozycja0.x + .006 * wys * Math.sin(t * .7 + ph);
  };
  grupa.userData.okon = { wys, anim };
  return grupa;
}
function lg2([a, b]) { return `${a}`; }
export const stworzPlotke = o => stworzKarpiowata('ploc', o);
export const stworzUkleje = o => stworzKarpiowata('ukleja', o);

// narzędzia rysunkowe dla innych bibliotek assetów (przynety.js itd.) – ten sam kontur i cieniowanie
export const narzedzia = { gladko, obrys, wypelnij, lg, czesc, odmiany, zloz, nowyNumer: () => 100 + (licznikPostaci++ % 40) * 12 };
