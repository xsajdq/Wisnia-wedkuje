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
function zetrzyjKontur(cv, szer, tex, pelnaAlfa = false) {   // pelnaAlfa: cały obraz nieprzezroczysty (kolor rozlany także poza sylwetkę)
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
  if (pelnaAlfa) for (let i = 0; i < N; i++) d[i * 4 + 3] = 255;
  g.putImageData(im, 0, 0); if (tex) tex.needsUpdate = true;
}   // krok siatki w px projektu
// bryla – części tworzące objętość (domyślnie największa część, np. ciało ryby); płetwy, ogon i inne części poza bryłą są cienkie
// (płaskie jak prawdziwa płetwa – bez „dwóch warstw” widocznych od tyłu), a części leżące na bryle przylegają do jej powierzchni
// wypuklosci: [[x, y, R, a]] – kopuły na powierzchni bryły (np. oko: a × T w środku, łagodnie do 0 na promieniu R) – oczy wystają na boki,
// więc z przodu ryby są rozsunięte i nie zlewają się w jedno
function nadmuchaj(czesci, { T, D, plaskie = [], bryla, ob = 15, wypuklosci = [], glowa } = {}) {
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
    // glowa: { x, D } – od x w stronę pyska węższe zaokrąglenie brzegu (boki głowy płaskie, oczy na bokach, nie na „dachu”)
    const Dl = glowa ? D + (glowa.D - D) * (Math.min(1, Math.max(0, (x - glowa.x + 60) / 120))) : D;
    const obl = glowa?.ob !== undefined ? ob + (glowa.ob - ob) * Math.min(1, Math.max(0, (x - glowa.x + 60) / 120)) : ob;
    const u = Math.min(1, Math.max(0, v / k - obl) / Dl); let h = T * Math.sqrt(Math.max(0, 1 - (1 - u) * (1 - u)));
    for (const [wx, wy, wr, wa] of wypuklosci) { const r = Math.hypot(x - wx, y - wy) / wr; if (r < 1) h += wa * T * (1 - r * r) * (1 - r * r) * Math.min(1, u * 1.5); }
    return h; };   // pas konturu z rysunku (ob px) leży płasko na szwie – pod kątem nie widać go jako czarnej kreski na boku
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
    const poz = [], uv = [], idx = [], nr = new Int32Array((nx + 1) * (ny + 1)).fill(-1), eps = bryla.includes(c) && bryla !== czesci ? 0 : .5 + .12 * c.userData.kolejnosc;   // warstwy tuż przy powierzchni (oko, źrenica, brew bez paralaksy); kolejność rysowania z polygonOffset   // każda warstwa wyraźnie nad poprzednią (źrenica nad okiem, oko nad ciałem) – bez przebijania przy różnej gęstości siatek   // nakładki tuż nad powierzchnią (bez odstawania)
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
    // kontur z rysunku zostaje (jak w wersji 2D); leży na płaskim pasie przy brzegu bryły (ob px)   // kontur rysuje otoczka 3D – pas konturu z rysunku zastąp kolorem ciała
    const map = c.material.map; c.material.dispose();
    c.material = new THREE.MeshLambertMaterial({ map, emissiveMap: map, emissive: '#ffffff', emissiveIntensity: 1, color: '#ffffff', transparent: true, alphaTest: .35, depthWrite: true, side: THREE.FrontSide });
    c.material.userData.jasnosc = .5; c.material.color.setScalar(.5);
    c.material.polygonOffset = true; c.material.polygonOffsetFactor = -c.userData.kolejnosc * .6; c.material.polygonOffsetUnits = -c.userData.kolejnosc * 4;
    if (bryla.includes(c) && bryla !== czesci) c.material.alphaTest = .35;
    if (bryla.includes(c) && bryla !== czesci) c.layers.enable(5);
    // kontur z rysunku tylko tam, gdzie brzeg bryły jest brzegiem sylwetki (widok z boku); gdy na szew patrzymy na wprost (np. pysk z przodu),
    // kontur i jasne piksele brzegu zastępuje kolor ciała – bez pionowej kreski przez środek głowy. kontN: kierunek „na zewnątrz” konturu (w płaszczyźnie rysunku)
    if (bryla.includes(c) && bryla !== czesci && map) {
      // kolor zamiast linii konturu: sąsiedni kolor z wnętrza rysunku (paski przechodzą dalej, ostro – bez rozmycia); alfa = waga wąskiego pasa konturu
      const cv3 = document.createElement('canvas'); cv3.width = map.image.width; cv3.height = map.image.height; const g3 = cv3.getContext('2d'); g3.drawImage(map.image, 0, 0);
      const SZ = Math.ceil(22 * res); zetrzyjKontur(cv3, SZ + 4, null, true);
      { const W = cv3.width, Hh = cv3.height, src = map.image.getContext('2d').getImageData(0, 0, W, Hh).data, im = g3.getImageData(0, 0, W, Hh), d = im.data, N = W * Hh;
        const dist = new Float32Array(N).fill(1e9), q = new Int32Array(N); let h = 0, t = 0;
        for (let i = 0; i < N; i++) if (src[i * 4 + 3] < 128) { dist[i] = 0; q[t++] = i; }
        while (h < t) { const i = q[h++], x = i % W, y = (i / W) | 0, nd = dist[i] + 1; if (nd > SZ + 6) continue;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= Hh) continue; const j = yy * W + xx; if (dist[j] > nd) { dist[j] = nd; q[t++] = j; } } }
        for (let i = 0; i < N; i++) { const u = Math.min(1, Math.max(0, (dist[i] - SZ) / 6)); d[i * 4 + 3] = Math.round(255 * (1 - u)); }
        g3.putImageData(im, 0, 0); }
      const mapBez = new THREE.CanvasTexture(cv3); mapBez.premultiplyAlpha = false; mapBez.colorSpace = map.colorSpace; mapBez.anisotropy = map.anisotropy;
      c.material.onBeforeCompile = sh => { sh.uniforms.mapBez = { value: mapBez };
        sh.vertexShader = 'varying vec3 vBokK;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vBokK = normalize(normalMatrix * vec3(0., 0., 1.));');
        sh.fragmentShader = 'uniform sampler2D mapBez;\nvarying vec3 vBokK;\n' + sh.fragmentShader
          .replace('#include <map_fragment>', 'vec3 vDirK = isOrthographic ? vec3(0., 0., 1.) : normalize(vViewPosition);\nfloat fKont = smoothstep(.25, .6, abs(dot(normalize(vNormal), vDirK)));\nvec4 kOryg = texture2D(map, vMapUv), kBez = texture2D(mapBez, vMapUv);\n#ifdef USE_MAP\n  fKont *= kBez.a;\n  vec4 sampledDiffuseColor = vec4(mix(kOryg.rgb, kBez.rgb, max(fKont, 1. - kOryg.a)), kOryg.a);\n  diffuseColor *= sampledDiffuseColor;\n#endif')
          .replace('#include <emissivemap_fragment>', '#ifdef USE_EMISSIVEMAP\n  totalEmissiveRadiance *= mix(kOryg.rgb, kBez.rgb, max(fKont, 1. - kOryg.a));\n#endif'); };
      c.material.customProgramCacheKey = () => 'bezKonturuZPrzodu';
    }   // bryła: kształt wyznacza siatka, bez dziur przy brzegu (przez dziury prześwitywał czarny kontur)
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
  g.beginPath(); g.arc(845, 254, 34, 0, 7); wypelnij(g, lg(g, 0, 220, 0, 290, [[0, '#ffe07a'], [.6, '#f4a53a'], [1, '#c4621d']])); obrys(g, 8);
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
  const zr = czesc(s, ...O, [813, 223, 878, 288], [845, 255], g => {
    g.beginPath(); g.arc(845, 255, 18, 0, 7); wypelnij(g, '#0d0910');
    g.beginPath(); g.arc(839, 248, 5, 0, 7); wypelnij(g, 'rgba(255,255,255,.85)');
  }, { kolejnosc: 7 });
  const brew = odmiany(czesc(s, ...O, [785, 180, 910, 242], [848, 212], () => {}, { kolejnosc: 8 }), {
    spokojny: g => { g.beginPath(); g.moveTo(810, 220); g.quadraticCurveTo(845, 205, 880, 215); obrys(g, 7, 'rgba(36,23,38,.65)'); },
    czujny: g => { g.beginPath(); g.moveTo(806, 205); g.quadraticCurveTo(842, 222, 884, 228); obrys(g, 10); },
    zdziwiony: g => { g.beginPath(); g.moveTo(810, 208); g.quadraticCurveTo(845, 190, 880, 204); obrys(g, 8); },
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
  const grupa = zloz([ogon, grzb1, grzb2, odbyt, brzuch, cialo, piers, zr, brew, paszcza], kb, { glowa: { x: 790, D: 40 } });
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
// SZCZUPAK (Esox lucius) – PRAWDZIWA BRYŁA 3D (nie rysunek „nadmuchany”): ciało z przekrojów wzdłuż ryby (walcowate, pysk spłaszczony
// grzbietowo-brzusznie – „kaczy dziób”), tekstura malowana dookoła ciała (u = długość, v = obwód: grzbiet → bok → brzuch),
// oczy jako kule 3D (widoczne poprawnie z każdego kąta), płetwy jako cienkie płaty z rysunkiem promieni.
// Anatomia (FishBase, Wikipedia): ciało wydłużone; długi płaski pysk, żuchwa wysunięta, paszcza z licznymi zębami; JEDNA płetwa
// grzbietowa daleko z tyłu, naprzeciw odbytowej; ogon wcięty; oliwkowozielone boki z rzędami jasnych fasolkowatych plam,
// brzuch kremowy; płetwy nieparzyste z ciemnymi plamkami, rdzawe; oko złociste, wysoko na głowie.
// Układ: głowa w +x, grzbiet +y, prawy bok do kamery +z. Jednostki: metry (TL = całkowita długość = 3,3 × wys).
// =====================================================================================================
// przekroje: [u (0 = koniec trzonu ogona, 1 = czubek pyska), pół-wysokość h, pół-szerokość w, przesunięcie środka yc, wykładnik kształtu n] (× długość ciała)
// przekroje wg profilu szczupaka: grzbiet i brzuch równoległe od głowy do płetw przy ogonie, głowa zwężająca się OD GÓRY
// (czoło opada prosto ostrym klinem do pyska, żuchwa nisko); [u, pół-wysokość h, pół-szerokość w, środek yc, wykładnik n] (× długość ciała)
const SZCZ_PRZEKROJE = [[0, 0.0285, 0.019, 0.0005, 2], [0.035, 0.0285, 0.02, 0.0005, 2], [0.065, 0.0365, 0.026, 0.0005, 2], [0.095, 0.0555, 0.039, 0.0005, 2], [0.12, 0.0635, 0.045, 0.0005, 2], [0.17, 0.0675, 0.048, 0.0005, 2.1], [0.26, 0.0700, 0.05, 0.0000, 2.1], [0.5, 0.0710, 0.051, 0.0000, 2.1], [0.62, 0.0700, 0.05, 0.0000, 2.1], [0.71, 0.0685, 0.048, -0.0005, 2.2], [0.755, 0.0670, 0.047, -0.0010, 2.3], [0.795, 0.0600, 0.046, -0.0040, 2.5], [0.825, 0.0520, 0.045, -0.0080, 2.6], [0.865, 0.0390, 0.043, -0.0130, 2.8], [0.91, 0.0270, 0.04, -0.0120, 3], [0.95, 0.0187, 0.034, -0.0083, 3], [0.98, 0.0132, 0.027, -0.0057, 2.7], [1, 0.0080, 0.017, -0.0040, 2.3]];   // ciało równoległe aż do tylnego końca płetwy grzbietowej (u ≈ 0,1), zaraz za nią mocne zwężenie w wąski trzon ogona
// interpolacja monotoniczna (Fritsch–Carlson): gładki profil bez „schodków” i przewężeń między punktami
const SZCZ_STYCZNE = (() => { const P = SZCZ_PRZEKROJE, n = P.length, T = [];
  for (let j = 1; j <= 4; j++) { const d = [], m = []; for (let i = 0; i < n - 1; i++) d.push((P[i + 1][j] - P[i][j]) / (P[i + 1][0] - P[i][0]));
    for (let i = 0; i < n; i++) m.push(i === 0 ? d[0] : i === n - 1 ? d[n - 2] : d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2);
    for (let i = 0; i < n - 1; i++) { if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; } const a = m[i] / d[i], b = m[i + 1] / d[i], h = a * a + b * b; if (h > 9) { const t = 3 / Math.sqrt(h); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; } }
    T.push(m); } return T; })();
function przekroj(u) { const P = SZCZ_PRZEKROJE; let i = 1; while (i < P.length - 1 && u > P[i][0]) i++;
  const a = P[i - 1], b = P[i], dx = b[0] - a[0], t = Math.min(1, Math.max(0, (u - a[0]) / dx)), t2 = t * t, t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
  return [1, 2, 3, 4].map((j, k) => h00 * a[j] + h10 * dx * SZCZ_STYCZNE[k][i - 1] + h01 * b[j] + h11 * dx * SZCZ_STYCZNE[k][i]); }
function teksturaSzczupaka() {
  const W = 2048, H = 640, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  const X = u => u * W, Y = v => v * H;   // v: 0 grzbiet, .5 linia boku, 1 brzuch
  g.fillStyle = lg(g, 0, 0, 0, H, [[0, '#26381a'], [.14, '#3c5622'], [.32, '#5f7a30'], [.5, '#8d9c48'], [.6, '#c7c27a'], [.7, '#ebe4bd'], [1, '#fbf8ec']]); g.fillRect(0, 0, W, H);
  // rozmyte pionowe pasma (młodsze ryby) i drobne łuski
  for (let x = 60; x < X(.72); x += 58) { g.fillStyle = lg(g, 0, 0, 0, Y(.65), [[0, 'rgba(25,40,12,.0)'], [.35, 'rgba(25,40,12,.18)'], [1, 'rgba(25,40,12,0)']]); g.beginPath(); g.ellipse(x, Y(.3), 16, Y(.32), .15, 0, 7); g.fill(); }
  g.lineWidth = 1.3; for (let y = 8, r = 0; y < Y(.75); y += 11, r++) for (let x = (r % 2) * 8; x < X(.72); x += 16) { const a = .1 * (1 - y / Y(.8)); g.strokeStyle = `rgba(20,35,8,${a})`; g.beginPath(); g.arc(x, y, 8, .3, Math.PI - .3); g.stroke(); }
  // jasne fasolkowate plamy w przesuniętych rzędach (bok i grzbiet), mniejsze ku ogonowi i ku brzuchowi; głowa bez plam
  let z = 11; const los = () => (z = (z * 16807) % 2147483647) / 2147483647;
  for (let v = .08, r = 0; v < .6; v += .07, r++) for (let u = .025 + (r % 2) * .019; u < .69; u += .038) { if (los() < .12) continue;
    const xx = X(u + (los() - .5) * .012), yy = Y(v + (los() - .5) * .012), m = (.6 + .4 * Math.min(1, u / .35)) * (1 - .3 * v), w = (22 + los() * 12) * m, h = (11 + los() * 5) * m;
    g.fillStyle = `rgba(232,224,150,${.85 - .3 * v})`; g.beginPath(); g.ellipse(xx, yy, w, h, (los() - .5) * .5, 0, 7); g.fill(); g.strokeStyle = 'rgba(35,50,15,.4)'; g.lineWidth = 1.6; g.stroke(); }
  // deseń z ciała przechodzi na głowę: mniejsze jasne plamki (czoło, policzek, pokrywa skrzelowa) i kilka falistych prążków; paszcza i żuchwa bez plam
  for (let v = .1, r = 0; v < .56; v += .06, r++) for (let u = .735 + (r % 2) * .012; u < .95; u += .025) { if (los() < .3) continue;
    const zanik = 1 - (u - .73) / .25, xx = X(u + (los() - .5) * .01), yy = Y(v + (los() - .5) * .015), w = (11 + los() * 8) * (.55 + .45 * zanik), h = (6 + los() * 3) * (.55 + .45 * zanik);
    if (v > .5 && u > .8) continue;   // nad szczeliną paszczy pas czysty
    g.fillStyle = `rgba(226,218,145,${.6 * zanik + .35})`; g.beginPath(); g.ellipse(xx, yy, w, h, (los() - .5) * .6, 0, 7); g.fill(); g.strokeStyle = 'rgba(35,50,15,.3)'; g.lineWidth = 1.3; g.stroke(); }
  g.strokeStyle = 'rgba(205,200,120,.35)'; g.lineWidth = 4; for (let k = 0; k < 4; k++) { const y = Y(.2 + k * .08); g.beginPath(); g.moveTo(X(.745), y); g.bezierCurveTo(X(.79), y - 10, X(.83), y + 12, X(.88), y - 4); g.stroke(); }
  // linia boczna, ciemniejszy grzbiet
  g.setLineDash([12, 9]); g.strokeStyle = 'rgba(30,40,12,.55)'; g.lineWidth = 3; g.beginPath(); g.moveTo(X(.01), Y(.42)); g.bezierCurveTo(X(.3), Y(.43), X(.55), Y(.4), X(.73), Y(.33)); g.stroke(); g.setLineDash([]);
  g.fillStyle = lg(g, 0, 0, 0, Y(.12), [[0, 'rgba(20,30,10,.45)'], [1, 'rgba(20,30,10,0)']]); g.fillRect(0, 0, W, Y(.12));
  // głowa: oliwkowa, gładka, delikatne ciemne kreski (wzór głowy), pokrywa skrzelowa łukiem, przedpokrywa
  g.fillStyle = 'rgba(50,66,22,.1)'; g.beginPath(); g.moveTo(X(.715), 0); g.bezierCurveTo(X(.69), Y(.35), X(.69), Y(.7), X(.725), Y(.95)); g.lineTo(W, Y(.95)); g.lineTo(W, 0); g.closePath(); g.fill();
  g.strokeStyle = INK; g.lineWidth = 7; g.beginPath(); g.moveTo(X(.722), Y(.12)); g.bezierCurveTo(X(.69), Y(.38), X(.692), Y(.66), X(.73), Y(.9)); g.stroke();
  g.strokeStyle = 'rgba(36,23,38,.5)'; g.lineWidth = 3.5; g.beginPath(); g.moveTo(X(.76), Y(.4)); g.bezierCurveTo(X(.745), Y(.55), X(.75), Y(.7), X(.765), Y(.82)); g.stroke();
  g.fillStyle = 'rgba(255,185,160,.2)'; g.beginPath(); g.ellipse(X(.735), Y(.62), 30, Y(.14), 0, 0, 7); g.fill();
  // pysk: szczelina paszczy wzdłuż boku pyska (od czubka do miejsca pod okiem), dolna szczęka kremowa z porami, drobne zęby
  const yp = Y(.6); g.strokeStyle = INK; g.lineWidth = 7; g.beginPath(); g.moveTo(X(.835), yp + 4); g.bezierCurveTo(X(.88), yp - 2, X(.95), yp - 4, X(1), yp - 6); g.stroke();
  for (let i = 0; i < 12; i++) { const x = X(.85 + i * .012); g.fillStyle = '#fffaf0'; g.beginPath(); g.moveTo(x, yp - 1 - i * .5); g.lineTo(x + 5, yp + 9 - i * .5); g.lineTo(x + 10, yp - 2 - i * .5); g.fill(); }
  g.fillStyle = 'rgba(36,23,38,.55)'; for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(X(.84 + i * .02), Y(.74), 3, 0, 7); g.fill(); }
  g.fillStyle = INK; g.beginPath(); g.arc(X(.93), Y(.33), 4, 0, 7); g.fill(); g.beginPath(); g.arc(X(.918), Y(.31), 3, 0, 7); g.fill();   // nozdrza
  // złocisty policzek i pokrywa, drobne ciemne cętki na głowie, rząd porów czuciowych nad okiem i na policzku
  g.fillStyle = 'rgba(214,180,70,.22)'; g.beginPath(); g.ellipse(X(.765), Y(.55), 70, Y(.16), 0, 0, 7); g.fill();
  g.fillStyle = lg(g, X(.70), 0, X(.76), 0, [[0, 'rgba(20,30,10,.25)'], [1, 'rgba(20,30,10,0)']]); g.fillRect(X(.70), Y(.1), X(.06), Y(.8));
  for (let i = 0; i < 90; i++) { const u = .73 + los() * .25, v = .08 + los() * .42; g.fillStyle = `rgba(25,35,12,${.25 + los() * .25})`; g.beginPath(); g.ellipse(X(u), Y(v), 3 + los() * 4, 2 + los() * 2, los() * 3, 0, 7); g.fill(); }
  g.fillStyle = 'rgba(36,23,38,.5)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(X(.79 + i * .03), Y(.2 - i * .005), 2.6, 0, 7); g.fill(); g.beginPath(); g.arc(X(.775 + i * .018), Y(.5 + i * .004), 2.4, 0, 7); g.fill(); }
  // czubek pyska: jaśniejszy (bez ciemnej „lejkowatej” zbieżności grzbietu w widoku z przodu)
  g.fillStyle = lg(g, X(.955), 0, W, 0, [[0, 'rgba(95,120,50,0)'], [1, 'rgba(95,120,50,.75)']]); g.fillRect(X(.955), 0, W - X(.955), Y(.55));
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; return tex;
}
const matPostaci = (map, opt = {}) => { const m = new THREE.MeshLambertMaterial({ map, emissiveMap: map, emissive: '#ffffff', color: '#ffffff', side: THREE.FrontSide, ...opt }); m.userData.jasnosc = .5; m.color.setScalar(.5); return m; };
// płetwa jako płat: kształt i promienie rysowane na płótnie (px), osadzony w płaszczyźnie (xy) lub obrócony
function platPletwy(szer, wys, rysuj, s) {
  const cv = document.createElement('canvas'); cv.width = Math.ceil(szer * 2); cv.height = Math.ceil(wys * 2); const g = cv.getContext('2d'); g.scale(2, 2); g.lineJoin = 'round'; g.lineCap = 'round'; rysuj(g);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(szer * s, wys * s, 8, 2), matPostaci(tex, { transparent: true, alphaTest: .4, side: THREE.DoubleSide })); m.layers.set(POSTACIE); return m;
}
function plamkiPletwy(g, x0, y0, x1, y1, n = 10, kol = 'rgba(45,35,20,.55)') {
  let z = 3; const los = () => (z = (z * 48271) % 2147483647) / 2147483647;
  for (let i = 0; i < n; i++) { g.fillStyle = kol; g.beginPath(); g.ellipse(x0 + los() * (x1 - x0), y0 + los() * (y1 - y0), 6 + los() * 6, 4 + los() * 3, los() * 3, 0, 7); g.fill(); }
}
export function stworzSzczupaka({ wys = .6, mina = 'spokojny' } = {}) {
  const minaStala = mina;
  const TL = wys * 3.3, Lb = TL * .84, x0 = -Lb * .5, kb = 100 + (licznikPostaci++ % 40) * 12;   // x0: koniec trzonu ogona
  const grupa = new THREE.Group(), NU = 110, NT = 56;
  // ---- ciało ----
  const poz = [], uv = [], idx = [];
  for (let i = 0; i <= NU; i++) { const u = i / NU, [h, w, yc, n] = przekroj(u);
    for (let j = 0; j <= NT; j++) { const th = j / NT * Math.PI * 2, c = Math.cos(th), sn = Math.sin(th), e = 2 / n;
      poz.push(x0 + u * Lb, (yc + h * Math.sign(c) * Math.pow(Math.abs(c), e)) * Lb, w * Math.sign(sn) * Math.pow(Math.abs(sn), e) * Lb);
      uv.push(u, 1 - (th <= Math.PI ? th / Math.PI : 2 - th / Math.PI));
      const k = poz.length - 3, dol = Math.max(0, -c - .15) / .85, gora = Math.max(0, c);   // żuchwa wysunięta przed górną szczękę („podgryz” szczupaka)
      poz[k] += Lb * (.012 * dol - .004 * gora) * sm((u - .9) / .1); } }
  for (let i = 0; i < NU; i++) for (let j = 0; j < NT; j++) { const a = i * (NT + 1) + j, b = a + NT + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  // zamknięcie obu końców (czubek pyska i trzon ogona): wierzchołek środkowy + wachlarz trójkątów
  // czubek pyska: trzy środki – górny (szczęka), dolny (żuchwa, obraca się z nią) i „szwowy” dla trójkątów na linii pyska (znika przy otwarciu),
  // żeby po otwarciu przód pyska był otwarty, a nie zamknięty rozciągniętą ścianką
  const C0p = Math.cos(.6 * Math.PI), dolnyJ = j => Math.cos(j / NT * Math.PI * 2) < C0p, czubek = {};
  for (const [i, kier] of [[0, -1], [NU, 1]]) { const u = i / NU, [, , yc] = przekroj(u), c = poz.length / 3, ile = kier > 0 ? 3 : 1;
    for (let q = 0; q < ile; q++) { poz.push(x0 + u * Lb + kier * .004 * Lb, yc * Lb, 0); uv.push(u, .5); }
    if (kier > 0) Object.assign(czubek, { G: c, D: c + 1, M: c + 2 });
    for (let j = 0; j < NT; j++) { const a = i * (NT + 1) + j;
      if (kier > 0) { const d1 = dolnyJ(j), d2 = dolnyJ(j + 1); idx.push(a, a + 1, d1 && d2 ? c + 1 : !d1 && !d2 ? c : c + 2); } else idx.push(a + 1, a, c); } }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
  const cialo = new THREE.Mesh(geo, matPostaci(teksturaSzczupaka())); cialo.layers.set(POSTACIE); grupa.add(cialo);
  const b0 = geo.attributes.position.array.slice(), n0 = geo.attributes.normal.array.slice();
  // obrys jak u okonia: odwrócona otoczka (tylne ściany odsunięte wzdłuż normalnych) – gruba linia tuszu na sylwetce pod każdym kątem; wspólna geometria = podąża za falą
  const om = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide, toneMapped: false }), grO = Lb * .0055;
  om.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n  transformed += normalize(normal) * ${grO.toFixed(5)};`); };
  om.customProgramCacheKey = () => 'otoczkaSzcz' + grO.toFixed(5);
  const otoczka = new THREE.Mesh(geo, om); otoczka.layers.set(POSTACIE); otoczka.userData.otoczka = true; cialo.add(otoczka);
  const naPowierzchni = (u, th, wysun = 0) => { const [h, w, yc, n] = przekroj(u), c = Math.cos(th), sn = Math.sin(th), e = 2 / n;
    return new THREE.Vector3(x0 + u * Lb, (yc + (h + wysun) * Math.sign(c) * Math.pow(Math.abs(c), e)) * Lb, (w + wysun) * Math.sign(sn) * Math.pow(Math.abs(sn), e) * Lb); };
  // ---- oczy: kule (tęczówka złota z ciemną obwódką, źrenica, blik) wysoko na bokach głowy, lekko ku przodowi i w górę ----
  const oczy = [], uO = .83, thO = .3 * Math.PI, rO = .0155 * Lb;
  for (const strona of [1, -1]) {
    const o = new THREE.Group(), p = naPowierzchni(uO, strona > 0 ? thO : 2 * Math.PI - thO, -.0075); o.position.copy(p);
    const cvI = document.createElement('canvas'); cvI.width = cvI.height = 128; const gi = cvI.getContext('2d'); gi.fillStyle = lg(gi, 0, 10, 0, 118, [[0, '#fff2a8'], [.5, '#e8bd3a'], [1, '#a56a16']]); gi.fillRect(0, 0, 128, 128);
    const ti = new THREE.CanvasTexture(cvI); ti.colorSpace = THREE.SRGBColorSpace;
    const kula = new THREE.Mesh(new THREE.SphereGeometry(rO, 24, 16), matPostaci(ti)); o.add(kula);
    const obw = new THREE.Mesh(new THREE.TorusGeometry(rO * .98, rO * .16, 8, 32), matPostaci(null, { color: '#241726', emissive: '#241726' })); obw.material.color.set('#241726'); obw.material.userData.jasnosc = .15; o.add(obw);
    const zr = new THREE.Mesh(new THREE.SphereGeometry(rO * .52, 16, 12), matPostaci(null, { emissive: '#0d0910' })); zr.material.color.set('#0d0910'); zr.material.userData.jasnosc = .06; zr.position.z = rO * .62; o.add(zr);
    const bl = new THREE.Mesh(new THREE.SphereGeometry(rO * .15, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' })); bl.position.set(-rO * .2 * strona, rO * .25, rO * 1.0); o.add(bl);
    // brew (łuk nad okiem, jak u okonia – mina): rurka z tuszu w układzie oka
    const luk = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-rO * 1.15, rO * .95, rO * .35), new THREE.Vector3(0, rO * 1.45, rO * .55), new THREE.Vector3(rO * 1.15, rO * .95, rO * .35));
    const brew = new THREE.Mesh(new THREE.TubeGeometry(luk, 16, rO * .13, 6), matPostaci(null, { emissive: '#241726' })); brew.material.color.set('#241726'); brew.material.userData.jasnosc = .1; o.add(brew);
    // oko patrzy na bok, lekko w przód i w górę (u szczupaka oczy są skierowane częściowo do przodu)
    o.lookAt(o.position.clone().add(new THREE.Vector3(.35, .45, strona))); o.traverse(m => m.layers.set(POSTACIE)); grupa.add(o); oczy.push({ o, zr, z0: zr.position.clone(), strona, brew }); }
  // ---- płetwy ----
  const S = Lb / 1000;   // 1 px rysunku płetwy = 1/1000 długości ciała
  const rysPletwa = (szer, wys, baza, czubki, kolory, plamki = true) => g => {
    pletwaPromienie(g, baza, czubki, lg(g, 0, 0, 0, wys, [[0, kolory[0]], [1, kolory[1]]]), 'rgba(36,23,38,.5)', 2.4);
    if (plamki) { g.save(); g.beginPath(); g.moveTo(...baza[0]); for (const k of czubki) g.lineTo(...k); g.lineTo(...baza[1]); g.closePath(); g.clip(); plamkiPletwy(g, 0, 0, szer, wys, 10); g.restore(); }
    g.beginPath(); g.moveTo(...baza[0]); for (const k of czubki) g.lineTo(...k); g.lineTo(...baza[1]); obrys(g, 5); };
  // ogon (wcięty): płat pionowy za trzonem
  const ogon = platPletwy(200, 280, g => { const pkt = [[196, 112], [140, 82], [56, 18], [16, 6], [34, 70], [72, 140], [34, 210], [16, 274], [56, 262], [140, 198], [196, 168]];
    gladko(g, pkt); wypelnij(g, lg(g, 0, 0, 200, 0, [[0, '#a5572a'], [.45, '#8a7a3a'], [1, '#55682a']])); g.save(); gladko(g, pkt); g.clip();
    for (let i = 0; i < 15; i++) { const a = (-50 + i * 7.1) * D2R; g.beginPath(); g.moveTo(196, 140); g.lineTo(196 - 220 * Math.cos(a), 140 + 190 * Math.sin(a)); obrys(g, 2.4, 'rgba(36,23,38,.42)'); }
    plamkiPletwy(g, 20, 10, 170, 270, 14); for (let k = 0; k < 4; k++) { g.strokeStyle = 'rgba(45,30,15,.3)'; g.lineWidth = 9; g.beginPath(); g.moveTo(150 - k * 34, 20); g.quadraticCurveTo(120 - k * 34, 140, 150 - k * 34, 262); g.stroke(); } g.restore(); gladko(g, pkt); obrys(g, 7); }, S);
  ogon.geometry.translate(-100 * S + 4 * S, 0, 0); const ogonPiw = new THREE.Group(); ogonPiw.position.set(x0 + .004 * Lb, 0, 0); ogonPiw.add(ogon); grupa.add(ogonPiw);
  // grzbietowa i odbytowa: daleko z tyłu, naprzeciw siebie; nasada na powierzchni ciała (pionowe płaty w osi ryby)
  // grzbietowa i odbytowa: daleko z tyłu, naprzeciw siebie; nisko z przodu (prawa strona płata = przód ryby), najwyższe z tyłu, tylny brzeg zaokrąglony
  const czG = [[150, 98], [134, 80], [114, 60], [92, 40], [70, 24], [50, 14], [32, 12], [18, 20], [9, 38], [5, 60], [6, 84], [11, 106]];
  const grzb = platPletwy(160, 120, rysPletwa(160, 120, [[158, 114], [14, 114]], czG, ['rgba(150,80,40,.92)', 'rgba(95,110,45,.96)']), S);
  const gora = u => (przekroj(u)[0] + przekroj(u)[2]) * Lb, dol = u => (przekroj(u)[2] - przekroj(u)[0]) * Lb;
  // nasada płetwy leży na linii grzbietu (nachylona jak grzbiet), lekko zagłębiona w ciele
  const uG = [.1, .25], kG = Math.atan2(gora(uG[1]) - gora(uG[0]), (uG[1] - uG[0]) * Lb);
  grzb.geometry.translate(0, (114 - 120 / 2) * S, 0); grzb.rotation.z = kG; grzb.position.set(x0 + (uG[0] + uG[1]) / 2 * Lb, (gora(uG[0]) + gora(uG[1])) / 2 - .004 * Lb, 0); grzb.scale.x = (uG[1] - uG[0]) * Lb / (144 * S); grupa.add(grzb);
  const czO = [[150, 14], [134, 30], [114, 48], [92, 66], [70, 80], [50, 90], [32, 92], [18, 86], [9, 70], [5, 50], [6, 28], [11, 8]];
  const odbyt = platPletwy(160, 110, rysPletwa(160, 110, [[158, 4], [12, 4]], czO, ['rgba(110,105,50,.95)', 'rgba(170,85,40,.92)']), S);
  const uOd = [.1, .235], kO = Math.atan2(dol(uOd[1]) - dol(uOd[0]), (uOd[1] - uOd[0]) * Lb);
  odbyt.geometry.translate(0, (4 - 110 / 2) * S, 0); odbyt.rotation.z = kO; odbyt.position.set(x0 + (uOd[0] + uOd[1]) / 2 * Lb, (dol(uOd[0]) + dol(uOd[1])) / 2 + .004 * Lb, 0); odbyt.scale.x = (uOd[1] - uOd[0]) * Lb / (146 * S); grupa.add(odbyt);
  // parzyste: brzuszne (połowa ciała, nisko) i piersiowe (tuż za pokrywą, nisko) – płaty odchylone od ciała w dół i w tył
  const parzysta = (u, th, szer, wys, kol, kat) => { const lista = [];
    for (const strona of [1, -1]) {   // wachlarz: nasada w prawym górnym rogu płata (przód, przy ciele), promienie w tył i w dół, brzeg zaokrąglony
      const czP = []; for (let i = 0; i < 9; i++) { const a = (.15 + i * .1) * Math.PI, R = (szer - 14) * (.8 + .25 * Math.sin(i / 8 * Math.PI)); czP.push([szer - 10 - R * Math.cos(a - .1) * .98, 10 + R * Math.sin(a) * (wys - 16) / (szer - 14)]); }
      const m = platPletwy(szer, wys, rysPletwa(szer, wys, [[szer - 6, 8], [szer - 22, 18]], czP.filter(([x, y]) => x > 4 && y > 4 && y < wys - 4), kol, false), S); m.geometry.translate(-(szer / 2 - 8) * S, -(wys / 2 - 10) * S, 0);
      const piw = new THREE.Group(); piw.position.copy(naPowierzchni(u, strona > 0 ? th : 2 * Math.PI - th, -.004)); piw.rotation.set(-strona * kat, 0, -.35); /* odchylone NA ZEWNĄTRZ: lewa i prawa płetwa nie krzyżują się pod brzuchem */ piw.add(m); grupa.add(piw); lista.push(piw); }
    return lista; };
  const brzuch = parzysta(.47, .85 * Math.PI, 120, 90, ['#d8b860', '#d07a3a'], .85), piers = parzysta(.705, .74 * Math.PI, 130, 90, ['rgba(226,190,110,.95)', 'rgba(210,150,80,.9)'], .6);
  // ---- paszcza (atak): żuchwa (dolna część pyska) obraca się w dół wokół zawiasu pod okiem; w środku ciemne gardło, zęby w obu szczękach ----
  const uZ = .82, uK = .856, C0 = Math.cos(.6 * Math.PI), zaw = new THREE.Vector3(x0 + uZ * Lb, przekroj(uZ)[2] * Lb - .01 * Lb, 0), zuchwa = [], usta = new Float32Array(geo.attributes.position.count);
  for (let i = 0; i <= NU; i++) { const u = i / NU; if (u < uZ - .02) continue;
    for (let j = 0; j <= NT; j++) { const k = i * (NT + 1) + j, c = Math.cos(j / NT * Math.PI * 2), w = c < C0 ? sm((u - uZ + .02) / .06) : 0; if (w > 0) zuchwa.push([k, w]);
      const cN = Math.cos((j + (j < NT / 2 ? 1 : -1)) / NT * Math.PI * 2); if ((c >= C0) !== (cN >= C0) || (c < C0 && Math.cos((j - (j < NT / 2 ? 1 : -1)) / NT * Math.PI * 2) >= C0)) usta[k] = u >= uK ? 1 : 0; } }   // pas na linii pyska: przed kącikiem (u ≥ uK) znika przy otwarciu, za nim zostaje skórą łączącą wargi (kącik pyska)
  zuchwa.push([czubek.D, 1]); usta[czubek.M] = 1;
  geo.setAttribute('aUsta', new THREE.Float32BufferAttribute(usta, 1));
  { const uP = { value: 0 }; cialo.userData.uPasz = uP; const m = cialo.material, wcz = m.onBeforeCompile;
    m.onBeforeCompile = (sh, r) => { if (wcz) wcz(sh, r); sh.uniforms.uPasz = uP;
      sh.vertexShader = 'attribute float aUsta;\nvarying float vUsta;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vUsta = aUsta;');
      sh.vertexShader = sh.vertexShader.replace('varying float vUsta;', 'varying float vUsta;\nvarying float vU;').replace('vUsta = aUsta;', 'vUsta = aUsta; vU = uv.x;');
      sh.fragmentShader = 'uniform float uPasz;\nvarying float vUsta;\nvarying float vU;\n' + sh.fragmentShader.replace('void main() {', 'void main() {\n  if (uPasz > .03 && vUsta > .985) discard;\n  if (!gl_FrontFacing && (uPasz < .03 || vU < .8)) discard;')
        .replace('#include <opaque_fragment>', '#include <opaque_fragment>\n  if (!gl_FrontFacing) gl_FragColor.rgb = vec3(.36, .1, .12);'); };   // wnętrze policzków widziane przez szczelinę: ciemne gardło zamiast czarnego tuszu otoczki; otwarta paszcza: rozciągnięty pas między szczękami znika – szczelina przezroczysta, widać zęby
    m.side = THREE.DoubleSide; m.customProgramCacheKey = () => 'paszczaSzczupaka';
    const ow = otoczka.material.onBeforeCompile; otoczka.material.onBeforeCompile = (sh, r) => { ow(sh, r); sh.uniforms.uPasz = uP;
      sh.vertexShader = 'attribute float aUsta;\nvarying float vUsta;\nvarying float vU;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vUsta = aUsta; vU = uv.x;');
      sh.fragmentShader = 'uniform float uPasz;\nvarying float vUsta;\nvarying float vU;\n' + sh.fragmentShader.replace('void main() {', 'void main() {\n  if (uPasz > .03 && vUsta > .985) discard;'); };
    otoczka.material.customProgramCacheKey = () => 'otoczkaSzczPaszcza'; }
  const gardlo = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), new THREE.MeshBasicMaterial({ color: '#4a1018' })); gardlo.material.customProgramCacheKey = () => 'gardloSzczupaka'; gardlo.material.userData.jasnosc = .3; gardlo.scale.set(.085 * Lb, .02 * Lb, .03 * Lb);
  gardlo.position.set(x0 + .91 * Lb, przekroj(.91)[2] * Lb, 0); gardlo.layers.set(POSTACIE); grupa.add(gardlo);
  const zab = new THREE.ConeGeometry(.0042 * Lb, .018 * Lb, 6), bialy = new THREE.MeshLambertMaterial({ color: '#fffaf0', emissive: '#cfc8b8' }), zebyD = new THREE.Group();
  bialy.userData.jasnosc = 1; bialy.customProgramCacheKey = () => 'zebySzczupaka'; zebyD.position.copy(zaw); grupa.add(zebyD);
  const naLinii = (u, dc) => { const [h, w, yc, n] = przekroj(u), c = C0 + dc, e = 2 / n, sn = Math.sqrt(1 - c * c); return [(yc - h * Math.pow(-c, e)) * Lb, w * Math.pow(sn, e) * Lb * 1.0]; };   // punkt na linii pyska (z boku)
  // zęby (wg budowy szczupaka): na żuchwie rząd dużych, zakrzywionych kłów różnej długości, w górnej szczęce drobniejsze,
  // na podniebieniu pasy małych zębów – wszystkie pochylone do tyłu, ku gardłu (ofiara nie może się wycofać)
  const zab2 = new THREE.ConeGeometry(.0034 * Lb, .011 * Lb, 5), KLY = [1, 1.5, 1.1, 1.75, 1.2, 1.6, 1.05, 1.4, .95];
  for (let i = 0; i < 9; i++) { const u = .875 + i * .0135, [yD, zD] = naLinii(u, -.06), [yG, zG] = naLinii(u, .06), xs = x0 + u * Lb + Lb * .012 * sm((u - .9) / .1) * .3;
    for (const sg of [1, -1]) { const zg = new THREE.Mesh(zab, bialy); zg.scale.set(1, KLY[i], 1); zg.position.set(xs - zaw.x, yD - zaw.y + .004 * Lb * KLY[i], sg * zD); zg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-.5, .82, -sg * .28).normalize()); zg.layers.set(POSTACIE); zebyD.add(zg);
      const zgG = new THREE.Mesh(zab2, bialy); zgG.position.set(xs, yG - .003 * Lb, sg * zG); zgG.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-.5, -.82, -sg * .28).normalize()); zgG.layers.set(POSTACIE); grupa.add(zgG); zgG.userData.zabG = 1;
      if (i % 2 === 0 && i >= 2 && i < 8) { const zp = new THREE.Mesh(zab2, bialy), [, wP, ycP] = przekroj(u); zp.scale.setScalar(.8); zp.position.set(xs - .006 * Lb, yG - .001 * Lb, sg * wP * Lb * .55); zp.quaternion.copy(zgG.quaternion); zp.layers.set(POSTACIE); grupa.add(zp); zp.userData.zabG = 1; } } }
  let pasz = 0, tPasz;
  grupa.traverse(o => { if (o.isMesh) { o.renderOrder = kb; } });
  const faza = Math.random() * 6;
  // ruch: fala boczna (w osi z) narastająca ku ogonowi – przód ciała sztywny (szczupak); płetwy i ogon podążają za falą
  const anim = (t, st = {}) => {
    const w = 6.5 * (st.tempo ?? 1), ph = faza, A = Lb * .045;
    const es = st.esowanie ?? 0;   // S-start (atak szczupaka): ciało wygięte w „S” tuż przed zrywem (Webb i Skadsen 1980; Schriefer i Hale 2004)
    const fala = u => A * Math.pow(Math.max(0, 1 - u / .75), 2) * Math.sin(w * t + ph - (1 - u) * 3) * (1 - .7 * es)
      + (es > 0 && u < .86 ? es * Lb * .07 * Math.sin(2 * Math.PI * (.86 - u) / .86) * Math.sqrt((.86 - u) / .86) : 0);
    const P = geo.attributes.position.array;
    for (let i = 0; i <= NU; i++) { const u = i / NU, dz = fala(u); for (let j = 0; j <= NT; j++) { const k = (i * (NT + 1) + j) * 3; P[k + 2] = b0[k + 2] + dz; } }
    // paszcza: płynne otwieranie (0..1), żuchwa obraca się wokół zawiasu w płaszczyźnie xy
    { const cel = typeof st.paszcza === 'number' ? st.paszcza : st.paszcza ? 1 : 0, dt = tPasz === undefined ? 1 : t - tPasz; tPasz = t;   // płynnie, ok. 0,15 s na otwarcie; przy skoku czasu (kadr makiety) od razu
      pasz = dt <= 0 || dt > .2 ? cel : pasz + Math.sign(cel - pasz) * Math.min(Math.abs(cel - pasz), dt / (st.paszczaCzas ?? .15)); }   // paszczaCzas: czas pełnego otwarcia (atak: ok. 0,05 s jak u prawdziwego szczupaka)
    const ka = -.55 * pasz;
    if (pasz > .002) for (const [k, w] of zuchwa) { const x = b0[k * 3] - zaw.x, y = b0[k * 3 + 1] - zaw.y, a2 = ka * w, ca = Math.cos(a2), sa = Math.sin(a2); P[k * 3] = zaw.x + x * ca - y * sa; P[k * 3 + 1] = zaw.y + x * sa + y * ca; }
    else for (const [k] of zuchwa) { P[k * 3] = b0[k * 3]; P[k * 3 + 1] = b0[k * 3 + 1]; }
    zebyD.rotation.z = ka; zebyD.visible = pasz > .05; gardlo.visible = false; grupa.children.forEach(o => { if (o.userData.zabG) o.visible = pasz > .05; }); cialo.userData.uPasz.value = pasz; grupa.children.forEach(o => { if (o.geometry === zab && o.parent === grupa) o.visible = pasz > .05; });
    geo.attributes.position.needsUpdate = true;
    const dzO = fala(0), kat = Math.atan2(fala(.02) - fala(0), .02 * Lb);
    ogonPiw.position.z = dzO; ogonPiw.rotation.y = kat * 1.6 + .25 * Math.sin(w * t + ph - 3.3) * (st.ogon ?? 1);
    grzb.position.z = fala(.17); odbyt.position.z = fala(.17); grzb.rotation.y = odbyt.rotation.y = kat * .8;
    brzuch.forEach((p, i) => { p.position.z = naPowierzchni(.47, i ? 2 * Math.PI - .85 * Math.PI : .85 * Math.PI, -.004).z + fala(.47); p.rotation.y = .25 * Math.sin(w * .45 * t + ph + i); });
    piers.forEach((p, i) => { p.rotation.y = .35 * Math.sin(w * .5 * t + ph + i * 1.5); });
    const ex = st.patrz ? st.patrz[0] : 4 * Math.sin(t * .6 + ph), ey = st.patrz ? st.patrz[1] : 2 * Math.sin(t * .9 + ph);
    // oba oczy patrzą w tę samą stronę: przesunięcie w przód ryby jest w lewym oku lustrzane (układ oka odbity)
    oczy.forEach(({ zr, z0, strona, brew }) => { zr.position.set(z0.x + ex * .0012 * Lb * strona, z0.y + ey * .0012 * Lb, z0.z);
      const mina = st.mina || minaStala; brew.rotation.z = strona * (mina === 'czujny' ? -.32 : mina === 'zdziwiony' ? .18 : 0); brew.position.y = (mina === 'zdziwiony' ? .25 : mina === 'czujny' ? -.12 : 0) * rO; });
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
// rytm prowadzenia jerka (wspólny dla wędkarza i przynęty): 2 szarpnięcia po 0,3 s, potem pauza; cykl 2,6 s.
// szarp 0..1 – siła szarpnięcia (gładki impuls sin²), strona ±1 – w którą stronę ucieka przynęta, pauza 0..1 – zawis w pauzie
export function jerkRytm(t) { const okres = 2.6, c = Math.floor(t / okres), x = t - c * okres, imp = a => (x >= a && x < a + .3 ? Math.sin(Math.PI * (x - a) / .3) ** 2 : 0);
  const s1 = imp(0), s2 = imp(.6), strona = s2 > 0 ? -1 : 1, pauza = Math.min(1, Math.max(0, (x - 1.1) / .4));
  return { szarp: s1 + s2, strona, pauza, cykl: c, x }; }
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
    const pod = (st.podrywanie ? Math.max(0, Math.sin(t * 5)) ** 6 * .18 : 0) - (st.jerk ? .38 * jerkRytm(t - (st.jerkStart ?? 0)).szarp : 0);   // jerk: krótkie szarpnięcia szczytówką w dół
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
  const grupa = zloz([ogon, grzb, odbyt, brzuch, cialo, piers, zr], kb, { T: c.H * .2, glowa: { x: ex - er * 3, D: er * 1.5 } }), faza = Math.random() * 6;
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

// =====================================================================================================
// OKOŃ 3D (Perca fluviatilis) – PRAWDZIWA BRYŁA jak szczupak: ciało z przekrojów (profil wzięty z rysunku okonia 2D, OKON_CIALO,
// więc bohater wygląda tak samo), tekstura malowana dookoła ciała, oczy-kule, płetwy-płaty.
// Anatomia (FishBase, Wikipedia): ciało wysokie, bocznie spłaszczone, garb za głową; DWIE płetwy grzbietowe – pierwsza kolczasta
// z czarną plamą w TYLNEJ części, druga miękka; 5–9 ciemnych pionowych pręg (część w kształcie Y); grzbiet oliwkowy, boki
// zielonkawożółte, brzuch biały; płetwy brzuszne i odbytowa pomarańczowoczerwone; pokrywa skrzelowa z kolcem; oko złotopomarańczowe.
// Układ: głowa w +x, grzbiet +y, prawy bok +z. TL = 1,7 × wys (wys = wysokość projektu okonia 2D, zgodnie z okon()).
// =====================================================================================================
const OKON3D_PRZEKROJE = [[0, .042, .019, -.006, 2.3], [.03, .05, .021, -.007, 2.3], [.07, .068, .029, -.006, 2.3], [.12, .09, .038, -.001, 2.3],
  [.2, .121, .051, .005, 2.3], [.3, .153, .064, .012, 2.3], [.42, .177, .074, .018, 2.3], [.55, .187, .079, .021, 2.3], [.66, .181, .077, .019, 2.3],
  [.75, .162, .074, .017, 2.3], [.82, .14, .07, .015, 2.4], [.88, .108, .058, .007, 2.5], [.93, .074, .043, .0, 2.6], [.97, .04, .025, -.009, 2.5], [1, .012, .008, -.012, 2.3]];
function profilRyby(P) {   // interpolacja monotoniczna (Fritsch–Carlson) kolumn h, w, yc, n
  const n = P.length, T = [];
  for (let j = 1; j <= 4; j++) { const d = [], m = []; for (let i = 0; i < n - 1; i++) d.push((P[i + 1][j] - P[i][j]) / (P[i + 1][0] - P[i][0]));
    for (let i = 0; i < n; i++) m.push(i === 0 ? d[0] : i === n - 1 ? d[n - 2] : d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2);
    for (let i = 0; i < n - 1; i++) { if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; } const a = m[i] / d[i], b = m[i + 1] / d[i], h = a * a + b * b; if (h > 9) { const t = 3 / Math.sqrt(h); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; } }
    T.push(m); }
  return u => { let i = 1; while (i < n - 1 && u > P[i][0]) i++;
    const a = P[i - 1], b = P[i], dx = b[0] - a[0], t = Math.min(1, Math.max(0, (u - a[0]) / dx)), t2 = t * t, t3 = t2 * t;
    const h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
    return [1, 2, 3, 4].map((j, k) => h00 * a[j] + h10 * dx * T[k][i - 1] + h01 * b[j] + h11 * dx * T[k][i]); };
}
function teksturaOkonia() {
  const W = 2048, H = 640, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  const X = u => u * W, Y = v => v * H;   // u: 0 trzon ogona → 1 pysk; v: 0 grzbiet, .5 bok, 1 brzuch
  g.fillStyle = lg(g, 0, 0, 0, H, [[0, '#2c4116'], [.16, '#4f6b20'], [.34, '#8e9a36'], [.48, '#c9be58'], [.62, '#e6d996'], [.76, '#f4ecc8'], [1, '#fcf8ea']]); g.fillRect(0, 0, W, H);
  // drobne łuski ctenoidalne
  g.lineWidth = 1.4; for (let y = 6, r = 0; y < Y(.8); y += 10, r++) for (let x = (r % 2) * 7; x < X(.8); x += 14) { g.strokeStyle = `rgba(30,38,8,${.16 * (1 - y / Y(.85))})`; g.beginPath(); g.arc(x, y, 7, .35, Math.PI - .35); g.stroke(); }
  // 6 ciemnych pręg od grzbietu ku brzuchowi (część Y), gasną w dół
  for (const [u, sz, y] of [[.157, .022, 1], [.27, .026, 0], [.39, .028, 1], [.51, .028, 0], [.62, .026, 1], [.73, .02, 0]]) {
    const x = X(u), w = sz * W; g.fillStyle = lg(g, 0, 0, 0, Y(.72), [[0, 'rgba(20,26,8,.92)'], [.55, 'rgba(24,30,10,.72)'], [1, 'rgba(28,34,12,0)']]); g.beginPath();
    if (y) { g.moveTo(x - w * 1.5, 0); g.lineTo(x - w * .45, 0); g.lineTo(x, Y(.13)); g.lineTo(x + w * .45, 0); g.lineTo(x + w * 1.5, 0); g.lineTo(x + w * .45, Y(.3)); g.quadraticCurveTo(x + w * .2, Y(.55), x, Y(.72)); g.quadraticCurveTo(x - w * .7, Y(.5), x - w * .45, Y(.3)); }
    else { g.moveTo(x - w, 0); g.lineTo(x + w, 0); g.lineTo(x + w * .4, Y(.38)); g.quadraticCurveTo(x + w * .1, Y(.58), x, Y(.7)); g.quadraticCurveTo(x - w * .6, Y(.52), x - w * .55, Y(.36)); }
    g.closePath(); g.fill(); }
  // linia boczna (łuk równoległy do grzbietu)
  g.setLineDash([12, 8]); g.strokeStyle = 'rgba(35,40,15,.55)'; g.lineWidth = 3; g.beginPath(); g.moveTo(X(.01), Y(.47)); g.bezierCurveTo(X(.3), Y(.36), X(.55), Y(.3), X(.79), Y(.3)); g.stroke(); g.setLineDash([]);
  // głowa: gładka, pokrywa skrzelowa (łuk), przedpokrywa, kolec pokrywy, policzek złocisty
  g.fillStyle = 'rgba(60,70,20,.14)'; g.beginPath(); g.moveTo(X(.805), 0); g.bezierCurveTo(X(.77), Y(.35), X(.77), Y(.7), X(.81), Y(1)); g.lineTo(W, H); g.lineTo(W, 0); g.closePath(); g.fill();
  g.fillStyle = 'rgba(230,170,60,.22)'; g.beginPath(); g.ellipse(X(.86), Y(.6), 90, Y(.16), 0, 0, 7); g.fill();
  g.strokeStyle = INK; g.lineWidth = 7; g.beginPath(); g.moveTo(X(.81), Y(.08)); g.bezierCurveTo(X(.775), Y(.38), X(.78), Y(.7), X(.815), Y(.95)); g.stroke();
  g.strokeStyle = 'rgba(36,23,38,.55)'; g.lineWidth = 4; g.beginPath(); g.moveTo(X(.865), Y(.42)); g.bezierCurveTo(X(.85), Y(.58), X(.855), Y(.72), X(.87), Y(.86)); g.stroke();
  g.fillStyle = '#d6c690'; g.beginPath(); g.moveTo(X(.79), Y(.4)); g.lineTo(X(.755), Y(.45)); g.lineTo(X(.79), Y(.5)); g.closePath(); g.fill(); g.strokeStyle = INK; g.lineWidth = 4; g.stroke();
  // pysk: szeroka szczelina paszczy, dolna szczęka
  const yp = Y(.6); g.strokeStyle = INK; g.lineWidth = 8; g.beginPath(); g.moveTo(X(.905), yp + 10); g.bezierCurveTo(X(.94), yp + 4, X(.975), yp - 4, X(1), yp - 6); g.stroke();
  g.strokeStyle = 'rgba(36,23,38,.5)'; g.lineWidth = 4; g.beginPath(); g.moveTo(X(.915), yp + 34); g.bezierCurveTo(X(.95), yp + 30, X(.98), yp + 20, X(1), yp + 14); g.stroke();
  g.fillStyle = INK; g.beginPath(); g.arc(X(.965), Y(.36), 5, 0, 7); g.fill(); g.beginPath(); g.arc(X(.952), Y(.34), 4, 0, 7); g.fill();   // nozdrza
  // ciemniejszy grzbiet, jaśniejszy czubek pyska
  g.fillStyle = lg(g, 0, 0, 0, Y(.12), [[0, 'rgba(20,28,8,.45)'], [1, 'rgba(20,28,8,0)']]); g.fillRect(0, 0, W, Y(.12));
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; return tex;
}
export function stworzOkonia3D({ wys = .6, mina = 'spokojny' } = {}) {
  const minaStala = mina, przekroj = profilRyby(OKON3D_PRZEKROJE);
  const TL = wys * 1.7, Lb = TL * .8, x0 = -Lb * .5, kb = 100 + (licznikPostaci++ % 40) * 12;
  const grupa = new THREE.Group(), NU = 110, NT = 56;
  const poz = [], uv = [], idx = [];
  for (let i = 0; i <= NU; i++) { const u = i / NU, [h, w, yc, n] = przekroj(u);
    for (let j = 0; j <= NT; j++) { const th = j / NT * Math.PI * 2, c = Math.cos(th), sn = Math.sin(th), e = 2 / n;
      poz.push(x0 + u * Lb, (yc + h * Math.sign(c) * Math.pow(Math.abs(c), e)) * Lb, w * Math.sign(sn) * Math.pow(Math.abs(sn), e) * Lb);
      uv.push(u, 1 - (th <= Math.PI ? th / Math.PI : 2 - th / Math.PI)); } }
  for (let i = 0; i < NU; i++) for (let j = 0; j < NT; j++) { const a = i * (NT + 1) + j, b = a + NT + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  for (const [i, kier] of [[0, -1], [NU, 1]]) { const u = i / NU, [, , yc] = przekroj(u), c = poz.length / 3; poz.push(x0 + u * Lb + kier * .004 * Lb, yc * Lb, 0); uv.push(u, .5);
    for (let j = 0; j < NT; j++) { const a = i * (NT + 1) + j; if (kier > 0) idx.push(a, a + 1, c); else idx.push(a + 1, a, c); } }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
  const cialo = new THREE.Mesh(geo, matPostaci(teksturaOkonia())); cialo.layers.set(POSTACIE); grupa.add(cialo);
  const b0 = geo.attributes.position.array.slice();
  const om = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide, toneMapped: false }), grO = Lb * .007;
  om.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n  transformed += normalize(normal) * ${grO.toFixed(5)};`); };
  om.customProgramCacheKey = () => 'otoczkaOkon3' + grO.toFixed(5);
  const otoczka = new THREE.Mesh(geo, om); otoczka.layers.set(POSTACIE); otoczka.userData.otoczka = true; cialo.add(otoczka);
  const naPowierzchni = (u, th, wysun = 0) => { const [h, w, yc, n] = przekroj(u), c = Math.cos(th), sn = Math.sin(th), e = 2 / n;
    return new THREE.Vector3(x0 + u * Lb, (yc + (h + wysun) * Math.sign(c) * Math.pow(Math.abs(c), e)) * Lb, (w + wysun) * Math.sign(sn) * Math.pow(Math.abs(sn), e) * Lb); };
  // oczy: duże, złotopomarańczowe, wysoko na bokach głowy
  const oczy = [], uO = .9, thO = .36 * Math.PI, rO = .036 * Lb;
  for (const strona of [1, -1]) {
    const o = new THREE.Group(); o.position.copy(naPowierzchni(uO, strona > 0 ? thO : 2 * Math.PI - thO, -.012));
    const cvI = document.createElement('canvas'); cvI.width = cvI.height = 128; const gi = cvI.getContext('2d'); gi.fillStyle = lg(gi, 0, 10, 0, 118, [[0, '#ffe07a'], [.6, '#f4a53a'], [1, '#c4621d']]); gi.fillRect(0, 0, 128, 128);
    const ti = new THREE.CanvasTexture(cvI); ti.colorSpace = THREE.SRGBColorSpace;
    o.add(new THREE.Mesh(new THREE.SphereGeometry(rO, 24, 16), matPostaci(ti)));
    const obw = new THREE.Mesh(new THREE.TorusGeometry(rO * .98, rO * .14, 8, 32), matPostaci(null, { color: '#241726', emissive: '#241726' })); obw.material.color.set('#241726'); obw.material.userData.jasnosc = .15; o.add(obw);
    const zr = new THREE.Mesh(new THREE.SphereGeometry(rO * .55, 16, 12), matPostaci(null, { emissive: '#0d0910' })); zr.material.color.set('#0d0910'); zr.material.userData.jasnosc = .06; zr.position.z = rO * .6; o.add(zr);
    const bl = new THREE.Mesh(new THREE.SphereGeometry(rO * .16, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' })); bl.position.set(-rO * .2 * strona, rO * .25, rO * 1.0); o.add(bl);
    const luk = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-rO * 1.15, rO * .95, rO * .35), new THREE.Vector3(0, rO * 1.45, rO * .55), new THREE.Vector3(rO * 1.15, rO * .95, rO * .35));
    const brew = new THREE.Mesh(new THREE.TubeGeometry(luk, 16, rO * .13, 6), matPostaci(null, { emissive: '#241726' })); brew.material.color.set('#241726'); brew.material.userData.jasnosc = .1; o.add(brew);
    o.lookAt(o.position.clone().add(new THREE.Vector3(.15, .1, strona))); o.traverse(m => m.layers.set(POSTACIE)); grupa.add(o); oczy.push({ o, zr, z0: zr.position.clone(), strona, brew }); }
  // płetwy (canvas: x w prawo = przód ryby)
  const S = Lb / 1000;
  const gora = u => (przekroj(u)[0] + przekroj(u)[2]) * Lb, dol = u => (przekroj(u)[2] - przekroj(u)[0]) * Lb;
  const naGrzbiet = (m, u0, u1, yBaz, wysPl, dlBaz, znak) => { const k = Math.atan2((znak > 0 ? gora(u1) - gora(u0) : dol(u1) - dol(u0)), (u1 - u0) * Lb);
    m.geometry.translate(0, (yBaz - wysPl / 2) * S, 0); m.rotation.z = k; m.position.set(x0 + (u0 + u1) / 2 * Lb, (znak > 0 ? (gora(u0) + gora(u1)) / 2 - .006 * Lb : (dol(u0) + dol(u1)) / 2 + .006 * Lb), 0);
    m.scale.x = (u1 - u0) * Lb / (dlBaz * S); grupa.add(m); return m; };
  // 1. grzbietowa kolczasta: 14 kolców, najwyższa w przedniej części, czarna plama z tyłu
  const kol = []; for (let i = 0; i < 14; i++) { const t = i / 13, bx = 14 + t * 300, h = 190 * Math.pow(Math.sin(Math.PI * (.1 + .82 * t)), .6) * (.6 + .4 * t); kol.push([bx + 10, 206 - h]); }
  const grzb1 = platPletwy(330, 215, g => { const baza = [[12, 206], [316, 206]];
    // błona sięga ok. 80% kolca – wystające ostre końce kolców (cecha okonia)
    const blona = kol.map(([x, y]) => [x - 2, 206 - (206 - y) * .8]);
    pletwaPromienie(g, baza, blona, lg(g, 0, 20, 0, 206, [[0, 'rgba(150,150,110,.93)'], [1, 'rgba(110,118,60,.96)']]), INK, 3.6);
    g.save(); g.beginPath(); g.moveTo(...baza[0]); for (const k of blona) g.lineTo(...k); g.lineTo(...baza[1]); g.closePath(); g.clip(); g.beginPath(); g.ellipse(50, 150, 50, 52, -.2, 0, 7); wypelnij(g, '#120c14'); g.restore();
    g.beginPath(); g.moveTo(...baza[0]); for (const k of blona) g.lineTo(...k); g.lineTo(...baza[1]); obrys(g, 6);
    for (let i = 0; i < kol.length; i++) { const t = i / 13, bx = 14 + t * 300; g.beginPath(); g.moveTo(bx + 4, 200); g.lineTo(...kol[i]); obrys(g, 8); g.beginPath(); g.moveTo(bx + 4, 200); g.lineTo(...kol[i]); obrys(g, 3.6, '#e4dcb0'); } }, S);
  naGrzbiet(grzb1, .41, .73, 206, 215, 304, 1);
  // 2. grzbietowa miękka
  const cz2 = [[30, 40], [62, 20], [100, 14], [140, 22], [178, 46]];
  const grzb2 = platPletwy(200, 130, g => { pletwaPromienie(g, [[14, 120], [190, 120]], cz2, lg(g, 0, 10, 0, 120, [[0, 'rgba(190,175,95,.93)'], [1, 'rgba(120,128,55,.96)']])); g.beginPath(); g.moveTo(14, 120); for (const k of cz2) g.lineTo(...k); g.lineTo(190, 120); obrys(g, 6); }, S);
  naGrzbiet(grzb2, .17, .39, 120, 130, 176, 1);
  // odbytowa (pomarańczowoczerwona)
  const czA = [[30, 100], [60, 116], [96, 112], [130, 92], [160, 60]];
  const odbyt = platPletwy(180, 130, g => { pletwaPromienie(g, [[14, 10], [170, 10]], czA, lg(g, 0, 10, 0, 120, [[0, '#f08a3c'], [1, '#e2452a']])); g.beginPath(); g.moveTo(14, 10); for (const k of czA) g.lineTo(...k); g.lineTo(170, 10); obrys(g, 6); }, S);
  naGrzbiet(odbyt, .17, .33, 10, 130, 156, -1);
  // ogon: lekko wcięty, oliwkowy przechodzący w pomarańcz u dołu
  const ogon = platPletwy(220, 300, g => { const pkt = [[216, 122], [150, 90], [60, 20], [18, 10], [40, 80], [70, 150], [40, 220], [18, 290], [60, 280], [150, 210], [216, 178]];
    gladko(g, pkt); wypelnij(g, lg(g, 0, 0, 0, 300, [[0, '#9b8a3c'], [.5, '#c8a046'], [.8, '#e0743a'], [1, '#d6512c']])); g.save(); gladko(g, pkt); g.clip();
    for (let i = 0; i < 13; i++) { const a = (-50 + i * 8.3) * D2R; g.beginPath(); g.moveTo(216, 150); g.lineTo(216 - 230 * Math.cos(a), 150 + 200 * Math.sin(a)); obrys(g, 3, 'rgba(36,23,38,.45)'); } g.restore(); gladko(g, pkt); obrys(g, 7); }, S);
  ogon.geometry.translate(-110 * S + 6 * S, 0, 0); const ogonPiw = new THREE.Group(); ogonPiw.position.set(x0 + .006 * Lb, przekroj(0)[2] * Lb, 0); ogonPiw.add(ogon); grupa.add(ogonPiw);
  // parzyste: piersiowe (za pokrywą, na boku) i brzuszne (pod piersiowymi – położenie piersiowe), czerwone
  const parzysta = (u, th, szer, wys, kolory, kat) => { const lista = [];
    for (const strona of [1, -1]) { const czP = []; for (let i = 0; i < 8; i++) { const a = (.15 + i * .11) * Math.PI, R = (szer - 14) * (.82 + .2 * Math.sin(i / 7 * Math.PI)); czP.push([szer - 10 - R * Math.cos(a - .1) * .98, 10 + R * Math.sin(a) * (wys - 16) / (szer - 14)]); }
      const m = platPletwy(szer, wys, g => { const kk = czP.filter(([x, y]) => x > 4 && y > 4 && y < wys - 4); pletwaPromienie(g, [[szer - 6, 8], [szer - 22, 18]], kk, lg(g, 0, 0, 0, wys, [[0, kolory[0]], [1, kolory[1]]]), 'rgba(36,23,38,.5)', 2.4); g.beginPath(); g.moveTo(szer - 6, 8); for (const k of kk) g.lineTo(...k); g.lineTo(szer - 22, 18); obrys(g, 5); }, S);
      m.geometry.translate(-(szer / 2 - 8) * S, -(wys / 2 - 10) * S, 0);
      const piw = new THREE.Group(); piw.position.copy(naPowierzchni(u, strona > 0 ? th : 2 * Math.PI - th, -.004)); piw.rotation.set(-strona * kat, 0, -.35); piw.add(m); grupa.add(piw); lista.push(piw); }
    return lista; };
  const piers = parzysta(.76, .6 * Math.PI, 150, 110, ['rgba(244,200,110,.9)', 'rgba(230,150,70,.85)'], .5);
  const brzuch = parzysta(.7, .9 * Math.PI, 130, 100, ['#f2a040', '#e2452a'], .7);
  grupa.traverse(o => { if (o.isMesh) o.renderOrder = kb; });
  const faza = Math.random() * 6;
  const anim = (t, st = {}) => {
    const w = 7.5 * (st.tempo ?? 1), ph = faza, A = Lb * .04;
    const fala = u => A * Math.pow(Math.max(0, 1 - u / .7), 2) * Math.sin(w * t + ph - (1 - u) * 2.6);
    const P = geo.attributes.position.array;
    for (let i = 0; i <= NU; i++) { const dz = fala(i / NU); for (let j = 0; j <= NT; j++) { const k = (i * (NT + 1) + j) * 3; P[k + 2] = b0[k + 2] + dz; } }
    geo.attributes.position.needsUpdate = true;
    const kat = Math.atan2(fala(.02) - fala(0), .02 * Lb);
    ogonPiw.position.z = fala(0); ogonPiw.rotation.y = kat * 1.6 + .22 * Math.sin(w * t + ph - 3) * (st.ogon ?? 1);
    grzb2.position.z = odbyt.position.z = fala(.25); grzb2.rotation.y = odbyt.rotation.y = kat * .6; grzb1.position.z = fala(.57);
    if (st.kolce !== undefined) grzb1.scale.y = .55 + .45 * st.kolce;
    piers.forEach((p, i) => { p.rotation.y = .35 * Math.sin(w * .5 * t + ph + i * 1.5); });
    brzuch.forEach((p, i) => { p.rotation.y = .2 * Math.sin(w * .45 * t + ph + i); });
    const ex = st.patrz ? st.patrz[0] : 4 * Math.sin(t * .6 + ph), ey = st.patrz ? st.patrz[1] : 2 * Math.sin(t * .9 + ph);
    oczy.forEach(({ zr, z0, strona, brew }) => { zr.position.set(z0.x + ex * .0015 * Lb * strona, z0.y + ey * .0015 * Lb, z0.z);
      const mina = st.mina || minaStala; brew.rotation.z = strona * (mina === 'czujny' ? -.32 : mina === 'zdziwiony' ? .18 : 0); brew.position.y = (mina === 'zdziwiony' ? .3 : mina === 'czujny' ? -.12 : 0) * rO; });
  };
  // anatomia do nakładek (metry w układzie ryby): pęcherz pławny w górnej części jamy ciała, pysk, oko
  grupa.userData.anat = { Lb, pecherz: { x: x0 + .52 * Lb, y: .07 * Lb, w: .4 * Lb, h: .085 * Lb }, pysk: [x0 + Lb * 1.0, -.013 * Lb], oko: [naPowierzchni(uO, thO).x, naPowierzchni(uO, thO).y], oczy };
  grupa.userData.okon = { anim, wys };
  return grupa;
}

// =====================================================================================================
// WĘDKARZ „EKSPERT” 3D – ta sama postać co stworzWedkarza (stałe cechy: krótka siwiejąca broda, krzaczaste brwi, zielona czapka
// z daszkiem i naszywką ryby, kamizelka khaki z kieszeniami na czerwonej flanelowej koszuli, oliwkowe wodery z szelkami;
// zimą czerwona kurtka i czapka z pomponem), zbudowana z brył (kapsuły, kule, rurki) z obrysem tuszem (odwrócona otoczka).
// Układ: stopy w y = 0, przodem do +z, wędka w prawej ręce (strona +x). API jak stworzWedkarza: userData.wedkarz = { anim, czubek, dlon },
// anim(t, { mina, glowa, podrywanie, rzut, hol, trzyma, reka }).
// =====================================================================================================
const TEX_KOLOR = {};
function texKolor(k) { if (!TEX_KOLOR[k]) { const cv = document.createElement('canvas'); cv.width = cv.height = 4; const g = cv.getContext('2d'); g.fillStyle = k; g.fillRect(0, 0, 4, 4); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; TEX_KOLOR[k] = t; } return TEX_KOLOR[k]; }
function bryla3(geo, kolor, gr, { map, tusz = true } = {}) {
  const m = new THREE.Mesh(geo, matPostaci(map || texKolor(kolor))); m.layers.set(POSTACIE);
  if (tusz) { const om = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide, toneMapped: false });
    om.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n  transformed += normalize(normal) * ${gr.toFixed(5)};`); };
    om.customProgramCacheKey = () => 'otoczkaW' + gr.toFixed(5);
    const o = new THREE.Mesh(geo, om); o.layers.set(POSTACIE); o.userData.otoczka = true; m.add(o); }
  return m;
}
// kapsuła między punktami a i b (Vector3), promień r
function odcinek3(a, b, r, kolor, gr, opt) { const d = b.clone().sub(a), L = d.length();
  const m = bryla3(new THREE.CapsuleGeometry(r, Math.max(.0001, L), 6, 14), kolor, gr, opt);
  m.position.copy(a).add(b).multiplyScalar(.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return m; }
function teksturaTulowia(zima) {
  const W = 512, H = 256, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  // u: obwód (0 = tył, .5 = przód), v: 0 góra → 1 dół
  if (zima) { g.fillStyle = '#c63a28'; g.fillRect(0, 0, W, H); for (const y of [60, 100, 140, 180, 220]) { g.strokeStyle = 'rgba(70,10,10,.35)'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.fillStyle = '#d8dde0'; g.fillRect(0, 150, W, 14); g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.stroke(); }
  else {
    g.fillStyle = '#b8352c'; g.fillRect(0, 0, W, H);   // flanela w kratę
    g.strokeStyle = 'rgba(70,15,15,.45)'; g.lineWidth = 6; for (let x = 0; x < W; x += 28) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let y = 0; y < H; y += 28) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    // kamizelka khaki: wszędzie poza pasem z przodu (rozpięta)
    g.fillStyle = '#ab9c68'; g.fillRect(0, 0, W * .43, H); g.fillRect(W * .57, 0, W * .43, H);
    g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); g.moveTo(W * .43, 0); g.lineTo(W * .43, H); g.moveTo(W * .57, 0); g.lineTo(W * .57, H); g.stroke();
    for (const x of [W * .34, W * .62]) { g.fillStyle = '#968856'; g.fillRect(x, 120, 42, 50); g.strokeRect(x, 120, 42, 50); g.beginPath(); g.moveTo(x, 132); g.lineTo(x + 42, 132); g.stroke(); }   // kieszenie
    g.fillStyle = '#968856'; g.fillRect(W * .35, 60, 34, 34); g.strokeRect(W * .35, 60, 34, 34);
    // śliniak woderów i szelki
    g.fillStyle = '#5f6b3c'; g.fillRect(W * .4, 190, W * .2, 66); g.strokeRect(W * .4, 190, W * .2, 66);
    g.fillStyle = '#3d4526'; for (const x of [W * .44, W * .56]) g.fillRect(x - 6, 0, 12, 192); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const lerp = (a, b, t) => a + (b - a) * t;
// ---- narzędzia postaci skórowanych: jedna ciągła powierzchnia na kościach + jeden kontur (odwrócona otoczka na tym samym szkielecie) ----
function skora(geo, map, kosci, gr, rodzic) {
  const m = new THREE.SkinnedMesh(geo, matPostaci(map)); m.layers.set(POSTACIE); m.frustumCulled = false; rodzic.add(m);
  const om = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide, toneMapped: false });
  om.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n  transformed += normalize(normal) * ${gr.toFixed(5)};`); };
  om.customProgramCacheKey = () => 'otoczkaSk' + gr.toFixed(5);
  const o = new THREE.SkinnedMesh(geo, om); o.layers.set(POSTACIE); o.frustumCulled = false; o.userData.otoczka = true; rodzic.add(o);
  return { m, o, wiaz: () => { const sk = new THREE.Skeleton(kosci); m.bind(sk); o.bind(sk, m.bindMatrix); } };
}
// rurka wzdłuż osi -y (od punktu p0 w dół), promienie r(d) i wagi kości w(d) → [i0, i1, w1]; zaokrąglony koniec górny
function rurka(p0, dl, r, wagi, NT = 18, NU = 26) {
  const poz = [], uv = [], si = [], sw = [], idx = [];
  const pierscien = (d, rr, v) => { for (let j = 0; j <= NT; j++) { const th = j / NT * Math.PI * 2;
    poz.push(p0.x + Math.cos(th) * rr, p0.y - d, p0.z + Math.sin(th) * rr); uv.push(j / NT, v); const [a, b, w] = wagi(d); si.push(a, b, 0, 0); sw.push(1 - w, w, 0, 0); } };
  const r0 = r(0), NK = 6;
  for (let k = 0; k < NK; k++) { const f = k / NK, a = (1 - f) * Math.PI / 2; pierscien(-Math.sin(a) * r0, Math.cos(a) * r0 + .0001, 1); }   // kopułka u góry
  for (let i = 0; i <= NU; i++) { const d = dl * i / NU; pierscien(d, r(d), 1 - i / NU); }
  const rzedy = NK + NU + 1;
  for (let i = 0; i < rzedy - 1; i++) for (let j = 0; j < NT; j++) { const a = i * (NT + 1) + j, b = a + NT + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
const przejscie = (d, a, b) => sm((d - a) / (b - a));
function teksturaTulowia3(zima, H, y0, y1) {
  const W = 1024, Hc = 512, cv = document.createElement('canvas'); cv.width = W; cv.height = Hc; const g = cv.getContext('2d');
  const Y = y => (1 - (y - y0) / (y1 - y0)) * Hc, U = u => u * W;   // u: obwód (przód = .25), y: wysokość w ułamkach H
  const krata = (x0, x1, ya, yb, k1, k2) => { g.fillStyle = k1; g.fillRect(x0, ya, x1 - x0, yb - ya); g.strokeStyle = k2; g.lineWidth = 7;
    for (let x = x0; x < x1; x += 30) { g.beginPath(); g.moveTo(x, ya); g.lineTo(x, yb); g.stroke(); } for (let y = ya; y < yb; y += 30) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); } };
  if (zima) {
    g.fillStyle = '#c63a28'; g.fillRect(0, 0, W, Hc);
    for (let y = .6; y < .76; y += .028) { g.strokeStyle = 'rgba(80,10,10,.35)'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, Y(y)); g.lineTo(W, Y(y)); g.stroke(); }
    g.fillStyle = '#d8dde0'; g.fillRect(0, Y(.66), W, 12);
    g.strokeStyle = INK; g.lineWidth = 6; g.beginPath(); g.moveTo(U(.25), Y(.78)); g.lineTo(U(.25), Y(.56)); g.stroke();
  } else {
    krata(0, W, 0, Hc, '#b8352c', 'rgba(70,15,15,.42)');                                 // flanela
    // kamizelka khaki od pasa do barków, rozpięta z przodu (pas koszuli u = .228–.272), wycięcia na ramiona na bokach
    const kam = () => { g.beginPath(); g.moveTo(U(.272), Y(.53)); g.lineTo(U(.272), Y(.745)); g.quadraticCurveTo(U(.31), Y(.79), U(.37), Y(.78));
      g.lineTo(U(.45), Y(.7)); g.lineTo(U(.55), Y(.7)); g.lineTo(U(.63), Y(.78)); g.lineTo(U(.87), Y(.78)); g.lineTo(U(.95), Y(.7)); g.lineTo(U(1.05), Y(.7));
      g.lineTo(U(1.13), Y(.78)); g.quadraticCurveTo(U(1.19), Y(.79), U(1.228), Y(.745)); g.lineTo(U(1.228), Y(.53)); g.closePath(); };
    g.fillStyle = '#ab9c68'; kam(); g.fill(); g.save(); g.translate(-W, 0); kam(); g.fill(); g.restore();
    g.strokeStyle = INK; g.lineWidth = 6; g.beginPath(); g.moveTo(U(.272), Y(.53)); g.lineTo(U(.272), Y(.745)); g.moveTo(U(.228), Y(.53)); g.lineTo(U(.228), Y(.745)); g.stroke();
    g.lineWidth = 3; g.strokeStyle = 'rgba(80,70,40,.6)'; g.setLineDash([8, 6]); g.beginPath(); g.moveTo(U(.262), Y(.54)); g.lineTo(U(.262), Y(.735)); g.moveTo(U(.238), Y(.54)); g.lineTo(U(.238), Y(.735)); g.stroke(); g.setLineDash([]);
    g.strokeStyle = INK; g.lineWidth = 4;
    for (const u of [.135, .29]) { g.fillStyle = '#968856'; g.fillRect(U(u), Y(.63), 70, Y(.565) - Y(.63)); g.strokeRect(U(u), Y(.63), 70, Y(.565) - Y(.63)); g.beginPath(); g.moveTo(U(u), Y(.615)); g.lineTo(U(u) + 70, Y(.615)); g.stroke(); }
    for (const u of [.16, .29]) { g.fillStyle = '#968856'; g.fillRect(U(u), Y(.71), 50, Y(.67) - Y(.71)); g.strokeRect(U(u), Y(.71), 50, Y(.67) - Y(.71)); }
    g.fillStyle = '#e8e2c8'; g.beginPath(); g.ellipse(U(.18) + 12, Y(.725), 14, 8, 0, 0, 7); g.fill(); g.stroke();   // naszywka-rybka na kamizelce
    // kołnierzyk koszuli (V z przodu)
    g.fillStyle = '#9e2b24'; g.beginPath(); g.moveTo(U(.19), Y(.785)); g.lineTo(U(.25), Y(.745)); g.lineTo(U(.31), Y(.785)); g.lineTo(U(.31), Y(.795)); g.lineTo(U(.19), Y(.795)); g.closePath(); g.fill(); g.stroke();
  }
  // wodery od pasa w dół + pas (klamra z przodu)
  g.fillStyle = '#5f6b3c'; g.fillRect(0, Y(.53), W, Hc - Y(.53));
  g.fillStyle = '#3a2e22'; g.fillRect(0, Y(.535), W, Y(.515) - Y(.535)); g.fillStyle = '#c9b06a'; g.fillRect(U(.25) - 16, Y(.538), 32, Y(.512) - Y(.538));
  g.strokeStyle = INK; g.lineWidth = 4; g.strokeRect(U(.25) - 16, Y(.538), 32, Y(.512) - Y(.538));
  if (!zima) {   // naszywka z owczej skóry z muchami (lewa pierś) i szczypce w dolnej kieszeni
    g.fillStyle = '#efe6cf'; g.beginPath(); g.roundRect(U(.165), Y(.745), 64, Y(.715) - Y(.745), 8); g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke();
    for (const [dx, k] of [[14, '#d0452a'], [32, '#e8b83a'], [50, '#4a7ab8']]) { g.fillStyle = k; g.beginPath(); g.ellipse(U(.165) + dx, Y(.73), 5, 9, .5, 0, 7); g.fill(); g.strokeStyle = '#333'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(U(.165) + dx, Y(.73) + 8); g.lineTo(U(.165) + dx + 4, Y(.73) + 14); g.stroke(); }
    g.fillStyle = '#9aa2a8'; g.fillRect(U(.3) + 30, Y(.645), 8, 26); g.fillRect(U(.3) + 42, Y(.645), 8, 26); g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(U(.3) + 30, Y(.645), 8, 26); g.strokeRect(U(.3) + 42, Y(.645), 8, 26);
    g.fillStyle = '#c63a28'; g.fillRect(U(.3) + 28, Y(.645) + 20, 24, 10);
  }
  // cieniowanie: boki i plecy ciemniejsze, światło z przodu-góry (styl tekstur ryb i świata)
  for (let x = 0; x < W; x += 4) { const u = x / W, d = Math.cos((u - .25) * Math.PI * 2); g.fillStyle = `rgba(40,20,50,${Math.max(0, -d) * .22 + (1 - Math.abs(d)) * .08})`; g.fillRect(x, 0, 4, Hc); }
  g.fillStyle = lg(g, 0, Y(.5), 0, Hc, [[0, 'rgba(40,20,50,0)'], [1, 'rgba(40,20,50,.25)']]); g.fillRect(0, Y(.5), W, Hc - Y(.5));
  // szyja (skóra) na górze tułowia
  g.fillStyle = SKORA_C; g.fillRect(0, 0, W, Y(.8)); g.fillStyle = SKORA; g.fillRect(U(.15), 0, U(.2), Y(.8));
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function teksturaKonczyny(kol, kolCiemny, krata, mankiet) {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 256; const g = cv.getContext('2d');
  g.fillStyle = kol; g.fillRect(0, 0, 128, 256);
  if (krata) { g.strokeStyle = 'rgba(70,15,15,.42)'; g.lineWidth = 5; for (let x = 0; x < 128; x += 22) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); } for (let y = 0; y < 256; y += 22) { g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke(); } }
  else { g.fillStyle = kolCiemny; for (const y of [120, 132]) { g.fillRect(0, y, 128, 4); } }   // przeszycia na kolanie
  if (!krata && kolCiemny) { g.fillStyle = kolCiemny; g.beginPath(); g.roundRect(14, 104, 40, 44, 10); g.fill(); g.strokeStyle = 'rgba(30,30,10,.6)'; g.lineWidth = 2; g.setLineDash([5, 4]); g.stroke(); g.setLineDash([]); }   // łata na kolanie (przód: u = .25)
  for (let x = 0; x < 128; x += 2) { const d = Math.cos((x / 128 - .25) * Math.PI * 2); g.fillStyle = `rgba(40,20,50,${Math.max(0, -d) * .25})`; g.fillRect(x, 0, 2, 256); }
  if (mankiet) { g.fillStyle = mankiet; g.fillRect(0, 232, 128, 24); g.fillStyle = INK; g.fillRect(0, 230, 128, 3); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function stworzWedkarza3D({ wys = 1.9, zima = false, siedzi = false } = {}) {
  // Proporcje kreskówki (ułamki wzrostu H): głowa ok. 23% (środek .865, r .118), barki .75, talia .59, biodra/krocze .46,
  // kolana .26, kostki .055; ramiona szerokości ok. 2,6 głowy; dłonie sięgają połowy uda.
  // Tułów = jedna powierzchnia z przekrojów (biodra → talia → klatka → barki → szyja), kończyny i wędka = ciągłe rurki na kościach.
  const H = wys, gr = H * .0062, V = (x, y, z = 0) => new THREE.Vector3(x * H, y * H, z * H);
  const grupa = new THREE.Group(), kb = 100 + (licznikPostaci++ % 40) * 12;
  const REKAWICA = zima ? '#2b2b2b' : SKORA, BUT = '#2b2a28';   // latem gołe dłonie (kolor skóry), zimą rękawice
  const kosc = (rodzic, x, y, z = 0) => { const b = new THREE.Bone(); b.position.set(x * H, y * H, z * H); rodzic.add(b); return b; };
  // ---- szkielet ----
  const YM = siedzi ? .3 : .4;
  const miednica = kosc(grupa, 0, YM), kregoslup = kosc(miednica, 0, .11), klatka = kosc(kregoslup, 0, .1);   // y: .47 → .58 → .68
  // ---- tułów z przekrojów: [y (ułamek H), pół-szerokość, pół-głębokość] ----
  const SEK = [[.36, .09, .074], [.4, .108, .08], [.46, .112, .084], [.52, .11, .085], [.58, .122, .09], [.63, .133, .093], [.665, .136, .09], [.688, .122, .08],
    [.705, .075, .058], [.72, .042, .042], [.77, .04, .04]];
  const y0 = SEK[0][0], y1 = SEK[SEK.length - 1][0], NT = 40, NU = 44;
  const P = profilRyby(SEK.map(([y, a, b]) => [(y - y0) / (y1 - y0), a, b, 0, 2.6]));
  const pz = [], uvT = [], siT = [], swT = [], idT = [];
  for (let i = 0; i <= NU; i++) { const f = i / NU, y = y0 + f * (y1 - y0), [a, b, , n] = P(f), e = 2 / n;
    for (let j = 0; j <= NT; j++) { const th = j / NT * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
      // przód brzucha/klatki lekko wypukły (+z), plecy płaskie
      const wyp = s > 0 ? 1 + .06 * s * sm((y - .43) / .2) : 1;
      pz.push(Math.sign(c) * Math.pow(Math.abs(c), e) * a * H, (siedzi ? y - .1 : y) * H, Math.sign(s) * Math.pow(Math.abs(s), e) * b * wyp * H); uvT.push(j / NT, f);
      const wS = przejscie(y, .45, .53), wK = przejscie(y, .56, .64);
      if (wK > 0) { siT.push(1, 2, 0, 0); swT.push(1 - wK, wK, 0, 0); } else { siT.push(0, 1, 0, 0); swT.push(1 - wS, wS, 0, 0); } } }
  for (let i = 0; i < NU; i++) for (let j = 0; j < NT; j++) { const a = i * (NT + 1) + j, b = a + NT + 1; idT.push(a, b, a + 1, b, b + 1, a + 1); }
  // dno (krocze) zamknięte
  { const c = pz.length / 3; pz.push(0, (siedzi ? y0 - .1 : y0) * H - .01 * H, 0); uvT.push(.5, 0); siT.push(0, 0, 0, 0); swT.push(1, 0, 0, 0); for (let j = 0; j < NT; j++) idT.push(j + 1, j, c); }
  const gT = new THREE.BufferGeometry(); gT.setAttribute('position', new THREE.Float32BufferAttribute(pz, 3)); gT.setAttribute('uv', new THREE.Float32BufferAttribute(uvT, 2));
  gT.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(siT, 4)); gT.setAttribute('skinWeight', new THREE.Float32BufferAttribute(swT, 4)); gT.setIndex(idT); gT.computeVertexNormals();
  const texT = teksturaTulowia3(zima, H, y0 + .07, y1 + .07); texT.offset.x = -.0; // przód tekstury = u .25 = kierunek +z (th = π/2)
  const tulow = skora(gT, texT, [miednica, kregoslup, klatka], gr, grupa);
  // ---- nogi: biodro → kolano → kostka, ciągłe rurki (wodery), buty na kostkach ----
  const texN = teksturaKonczyny('#5f6b3c', '#4c5730', false, null), nogi = [], wiazania = [tulow];
  for (const sx of [-1, 1]) {
    const biodro = kosc(miednica, sx * .058, -.02), kolano = kosc(biodro, 0, -.17), kostka = kosc(kolano, 0, -.165);
    const p0 = new THREE.Vector3(sx * .058 * H, (YM - .02) * H, 0), Ld = .335 * H;
    const geo = rurka(p0, Ld, d => (.06 - .016 * (d / Ld)) * H * (d / Ld > .47 && d / Ld < .55 ? 1.04 : 1), d => { const w = przejscie(d / H, .145, .195); if (d / H < .26) return [0, 1, w]; return [1, 2, przejscie(d / H, .32, .34)]; });
    const n = skora(geo, texN, [biodro, kolano, kostka], gr, grupa); wiazania.push(n);
    const but = new THREE.Group(); kostka.add(but);
    but.add(odcinek3(V(0, -.012, -.03), V(0, -.016, .08), .046 * H, BUT, gr)); const pod = odcinek3(V(0, -.046, -.03), V(0, -.046, .085), .018 * H, '#6b5a44', gr * .6); pod.scale.x = 2.4; but.add(pod);   // gumowy rant podeszwy
    nogi.push({ biodro, kolano, kostka, sx }); }
  // ---- głowa: duża kula z zarostem, nos, oczy, brwi, usta, czapka (ten sam bohater) ----
  const glowa = new THREE.Group(); glowa.position.set(0, .245 * H, 0); klatka.add(glowa); glowa.scale.setScalar(1.16); const RG = .118, GA = RG * .86, GB = RG * 1.1, GC = RG * .93;
  const zweza = y => y < 0 ? 1 - .24 * Math.min(1, -y / GB) ** 1.6 : 1;   // głowa jak fasolka: zwęża się ku brodzie (jak w 2D)
  const G = (m, x, y, z) => { m.position.set(x * H, y * H, z * H); glowa.add(m); return m; };
  const naGlowie = (x, y, w = 0) => [x, y, GC * zweza(y) * Math.sqrt(Math.max(0, 1 - (x / (GA * zweza(y))) ** 2 - (y / GB) ** 2)) + w];
  const kula = (r, kolor, sx = 1, sy = 1, sz = 1, g2 = gr, opt) => { const m = bryla3(new THREE.SphereGeometry(r * H, 26, 18), kolor, g2, opt); m.scale.set(sx, sy, sz); return m; };
  const cvG = document.createElement('canvas'); cvG.width = 512; cvG.height = 256; const gg = cvG.getContext('2d');
  gg.fillStyle = SKORA; gg.fillRect(0, 0, 512, 256);
  gg.fillStyle = 'rgba(160,80,60,.16)'; gg.beginPath(); gg.ellipse(220, 130, 40, 90, 0, 0, 7); gg.fill(); gg.beginPath(); gg.ellipse(36, 130, 40, 90, 0, 0, 7); gg.fill();
  gg.fillStyle = BRODA; gg.beginPath(); gg.moveTo(0, 150); gg.bezierCurveTo(40, 165, 70, 190, 128, 196); gg.bezierCurveTo(186, 190, 216, 165, 256, 150); gg.lineTo(256, 256); gg.lineTo(0, 256); gg.closePath(); gg.fill();
  let zz = 7; const los = () => (zz = (zz * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 260; i++) { gg.fillStyle = `rgba(60,50,45,${.25 + los() * .25})`; gg.beginPath(); gg.arc(los() * 256, 160 + los() * 92, 2, 0, 7); gg.fill(); }
  gg.fillStyle = 'rgba(230,120,110,.25)'; gg.beginPath(); gg.ellipse(88, 138, 16, 10, 0, 0, 7); gg.fill(); gg.beginPath(); gg.ellipse(168, 138, 16, 10, 0, 0, 7); gg.fill();
  gg.fillStyle = 'rgba(120,90,70,.3)'; gg.fillRect(256, 100, 256, 156);
  const tG = new THREE.CanvasTexture(cvG); tG.colorSpace = THREE.SRGBColorSpace;
  { const gs = new THREE.SphereGeometry(1, 36, 28), pp = gs.attributes.position; for (let i = 0; i < pp.count; i++) { const y = pp.getY(i) * GB, k = zweza(y); pp.setXYZ(i, pp.getX(i) * GA * k * H, y * H, pp.getZ(i) * GC * k * H); } gs.computeVertexNormals();
    G(bryla3(gs, null, gr, { map: tG }), 0, 0, 0); }
  for (const sx of [-1, 1]) G(kula(.03, SKORA_C, .55, 1.3, .8, gr * .6), sx * (GA - .002), -.006, -.012);   // uszy (duże jak w 2D)
  const nos = G(kula(.026, SKORA_C, .78, 1.15, 1.35, gr * .6), ...naGlowie(0, -.022, -.002)); nos.rotation.x = -.35;   // duży, charakterystyczny nos
  const was = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(V(-.03, -.007, -.008), V(0, .004, .008), V(.03, -.007, -.008)), 12, .0075 * H, 8), matPostaci(texKolor(BRODA))); was.layers.set(POSTACIE); G(was, ...naGlowie(0, -.052, -.004));   // wąs
  const oczy = [], brwi = [];
  for (const sx of [-1, 1]) {
    const o = G(new THREE.Group(), ...naGlowie(sx * .041, .008, -.009));
    const bialko = bryla3(new THREE.SphereGeometry(.023 * H, 16, 12), '#fffdf4', gr * .45); bialko.scale.set(.95, 1.15, .8); o.add(bialko);
    const zr = new THREE.Group(); zr.position.z = .015 * H; o.add(zr);
    const tecz = bryla3(new THREE.SphereGeometry(.0125 * H, 12, 10), '#4a6a3a', 0, { tusz: false }); tecz.scale.z = .5; zr.add(tecz);
    const zren = bryla3(new THREE.SphereGeometry(.0068 * H, 10, 8), '#120c10', 0, { tusz: false }); zren.position.z = .004 * H; zr.add(zren);
    const bl = new THREE.Mesh(new THREE.SphereGeometry(.004 * H, 6, 5), new THREE.MeshBasicMaterial({ color: '#ffffff' })); bl.position.set(-.004 * H, .006 * H, .024 * H); bl.layers.set(POSTACIE); o.add(bl); oczy.push({ o, zr });
    const luk = new THREE.QuadraticBezierCurve3(V(-.03, -.004, 0), V(0, .012, .006), V(.03, -.002, 0));
    const b = G(new THREE.Mesh(new THREE.TubeGeometry(luk, 10, .013 * H, 6), matPostaci(texKolor('#5d5048'))), ...naGlowie(sx * .041, .04, -.002)); b.layers.set(POSTACIE); brwi.push(b); }
  const usta = {}, ustaMat = matPostaci(texKolor('#3a1a20')), pU = naGlowie(0, -.07, -.004);
  const lukU = (g0, g1) => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(V(-.026, 0, -.004), V(0, g1, .004), V(.026, g0, -.004)), 10, .0042 * H, 6), ustaMat); m.layers.set(POSTACIE); return G(m, ...pU); };
  usta.spokojny = lukU(0, -.004); usta.skupiony = lukU(.002, .006); usta.usmiech = lukU(.01, -.024); usta.mrug = usta.spokojny;
  usta.zdziwiony = G(kula(.017, '#5a1e28', .85, 1.1, .5, gr * .5), ...naGlowie(0, -.074, -.01));
  if (zima) { const c = G(bryla3(new THREE.SphereGeometry((RG + .006) * H, 28, 14, 0, Math.PI * 2, 0, Math.PI * .5), '#c63a28', gr), 0, .05, 0); c.scale.set(GA / RG + .04, 1, GC / RG + .05);
    const ot = G(bryla3(new THREE.TorusGeometry((RG + .004) * H, .02 * H, 8, 28), '#f4efe2', gr), 0, .055, 0); ot.rotation.x = Math.PI / 2; ot.scale.set(GA / RG + .04, GC / RG + .05, 1);
    G(kula(.04, '#f4efe2'), 0, .19, 0);
    const sz = bryla3(new THREE.TorusGeometry(.06 * H, .026 * H, 10, 24), '#f4efe2', gr); sz.rotation.x = Math.PI / 2; sz.position.y = .105 * H; klatka.add(sz); }
  else { const c = G(bryla3(new THREE.SphereGeometry((RG + .008) * H, 28, 14, 0, Math.PI * 2, 0, Math.PI * .5), '#3d6b35', gr), 0, .05, -.004); c.scale.set(GA / RG + .04, .7, GC / RG + .05);
    const daszek = G(bryla3(new THREE.CylinderGeometry(.09 * H, .09 * H, .013 * H, 28, 1, false, -Math.PI / 2, Math.PI), '#335a2c', gr), 0, .058, .085); daszek.scale.set(1.05, 1, 1.45); daszek.rotation.x = .06;
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 40; const g = cv.getContext('2d'); g.fillStyle = '#f4efe2'; g.beginPath(); g.ellipse(32, 20, 30, 18, 0, 0, 7); g.fill();
    g.fillStyle = '#e2902a'; g.beginPath(); g.ellipse(28, 20, 16, 8, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(42, 20); g.lineTo(54, 12); g.lineTo(54, 28); g.fill();
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    G(kula(.012, '#335a2c', 1, .6, 1, gr * .5), 0, .05 + .084, -.004);   // guzik na czubku
    { const mu = new THREE.Group(); mu.position.set(.085 * H, .075 * H, .03 * H); mu.rotation.set(0, .9, -.5); glowa.add(mu);   // mucha wędkarska wpięta w czapkę
      const tul = bryla3(new THREE.CylinderGeometry(.006 * H, .004 * H, .03 * H, 8), '#d0452a', gr * .3); tul.rotation.z = Math.PI / 2; mu.add(tul);
      for (const [k, kat] of [['#e8b83a', .5], ['#4a7ab8', -.4], ['#f4efe2', .1]]) { const pi = bryla3(new THREE.ConeGeometry(.007 * H, .03 * H, 6), k, gr * .3); pi.position.set(-.018 * H, 0, 0); pi.rotation.z = Math.PI / 2 + kat; mu.add(pi); }
      const hak = new THREE.Mesh(new THREE.TorusGeometry(.006 * H, .0012 * H, 5, 10, Math.PI), matPostaci(texKolor('#9aa2a8'))); hak.position.set(.016 * H, -.004 * H, 0); hak.layers.set(POSTACIE); mu.add(hak); }
    const nasz = G(new THREE.Mesh(new THREE.PlaneGeometry(.058 * H, .036 * H), matPostaci(t, { transparent: true, alphaTest: .3 })), 0, .095, .098); nasz.layers.set(POSTACIE); nasz.rotation.x = -.55; }
  // ---- ręce: bark → łokieć → nadgarstek jedną rurką (rękaw z kratą, mankiet), rękawica z kciukiem na nadgarstku ----
  const texR = teksturaKonczyny(zima ? '#c63a28' : '#b8352c', null, !zima, zima ? '#f4efe2' : '#9e2b24');
  const reka = sx => {
    const bark = kosc(klatka, sx * .145, .055), lokiec = kosc(bark, 0, -.125), nadg = kosc(lokiec, 0, -.115);
    const p0 = new THREE.Vector3(sx * .145 * H, (YM + .21 + .055) * H, 0), Lr = .24 * H;
    const geo = rurka(p0, Lr, d => (.04 - .011 * (d / Lr)) * H, d => d / H < .18 ? [0, 1, przejscie(d / H, .1, .15)] : [1, 2, przejscie(d / H, .225, .24)]);
    wiazania.push(skora(geo, texR, [bark, lokiec, nadg], gr, grupa));
    const dl = new THREE.Group(); dl.position.y = -.03 * H; nadg.add(dl);
    dl.add(kula(.037, REKAWICA, 1, 1.15, .82)); const kc = kula(.017, REKAWICA, 1, 1.5, 1, gr * .7); kc.position.set(-sx * .028 * H, .004 * H, .026 * H); kc.rotation.z = sx * .6; dl.add(kc);
    if (!zima) for (let i = 0; i < 4; i++) { const pal = kula(.0105, SKORA_C, 1, 1, 1, gr * .45); pal.position.set((-.018 + i * .012) * H * sx, -.03 * H, .016 * H); dl.add(pal); }   // zgięte palce
    return { bark, lokiec, nadg, dl }; };
  const L = reka(-1), Pr = reka(1);
  // ---- wędka w prawej dłoni: rękojeść, kołowrotek pod blankiem, blank jako jedna skórowana rurka na 6 kościach (płynne ugięcie) ----
  const d = new THREE.Vector3(.85, -.32, .55).normalize(), dolS = new THREE.Vector3(0, 0, -1); dolS.sub(d.clone().multiplyScalar(dolS.dot(d))).normalize();
  const wedka = new THREE.Group(); wedka.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(d, dolS), d, dolS)); wedka.position.y = -.03 * H; Pr.nadg.add(wedka);
  wedka.add(odcinek3(V(0, -.1), V(0, .07), .016 * H, '#c9a46a', gr * .7));
  const reel = new THREE.Group(); reel.position.y = .02 * H; wedka.add(reel);
  reel.add(odcinek3(V(0, 0, .01), V(0, 0, .045), .006 * H, '#3b3f48', gr * .4));
  const korp = bryla3(new THREE.CylinderGeometry(.021 * H, .021 * H, .03 * H, 16), '#5a6068', gr * .6); korp.position.set(0, 0, .065 * H); reel.add(korp);
  const szp = bryla3(new THREE.CylinderGeometry(.016 * H, .016 * H, .024 * H, 14), '#7bc043', gr * .5); szp.position.set(0, .027 * H, .065 * H); reel.add(szp);
  // korbka kołowrotka (po stronie lewej ręki – strona ustalana niżej): ramię obraca się wokół osi poprzecznej do wędki, gałka na końcu
  const korbaOs = new THREE.Group(); korbaOs.position.set(0, 0, .065 * H); reel.add(korbaOs);
  const korbaRam = new THREE.Group(); korbaOs.add(korbaRam);
  const RK = .034 * H;   // promień korbki
  korbaRam.add(odcinek3(V(0, 0, 0), V(0, 0, RK / H), .0035 * H, '#3b3f48', gr * .3));
  const galka = bryla3(new THREE.CylinderGeometry(.007 * H, .007 * H, .022 * H, 10), '#f2f2ee', gr * .3); galka.rotation.z = Math.PI / 2; galka.position.set(0, 0, RK); korbaRam.add(galka);
  const NSEG = 6, LR = .62, segs = []; let rodzic = new THREE.Bone(); rodzic.position.y = .07 * H; wedka.add(rodzic); segs.push(rodzic);
  for (let i = 1; i <= NSEG; i++) { const b = new THREE.Bone(); b.position.y = LR / NSEG * H; rodzic.add(b); segs.push(b); rodzic = b; }
  // geometria blanku w układzie grupy wędki (oś +y), wagi: liniowo między sąsiednimi kośćmi
  const gB = (() => { const NTb = 8, NUb = 60, poz = [], si = [], sw = [], idx = [];
    for (let i = 0; i <= NUb; i++) { const f = i / NUb, y = .07 * H + f * LR * H, r = (.0068 - .0042 * f) * H, s = f * NSEG, k = Math.min(NSEG - 1, Math.floor(s)), w = s - k;
      for (let j = 0; j <= NTb; j++) { const th = j / NTb * Math.PI * 2; poz.push(Math.cos(th) * r, y, Math.sin(th) * r); si.push(k, k + 1, 0, 0); sw.push(1 - w, w, 0, 0); } }
    for (let i = 0; i < NUb; i++) for (let j = 0; j < NTb; j++) { const a = i * (NTb + 1) + j, b = a + NTb + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(poz.map(() => 0).slice(0, poz.length / 3 * 2), 2));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4)); g.setIndex(idx); g.computeVertexNormals(); return g; })();
  wiazania.push(skora(gB, texKolor('#3b3f48'), segs, gr * .45, wedka));
  for (let i = 2; i <= NSEG; i++) { const pr = bryla3(new THREE.TorusGeometry((.012 - i * .0011) * H, .0022 * H, 6, 14), '#c9ced3', gr * .3); pr.position.set(0, -.02 * H, (.016 - i * .001) * H); segs[i].add(pr); }
  const czubekObj = new THREE.Object3D(); segs[NSEG].add(czubekObj);
  // cień kontaktowy
  const cien = new THREE.Mesh(new THREE.CircleGeometry(.2 * H, 24), new THREE.MeshBasicMaterial({ color: '#1e1428', transparent: true, opacity: .4, depthWrite: false }));
  cien.rotation.x = -Math.PI / 2; cien.scale.set(1, siedzi ? 1.4 : .7, 1); cien.position.set(0, .004 * H, siedzi ? .1 * H : .02 * H); cien.layers.set(POSTACIE); grupa.add(cien);
  grupa.updateMatrixWorld(true); wiazania.forEach(w => w.wiaz());
  let stronaKorby = -1;
  korbaOs.add(odcinek3(V(0, 0, 0), V(.036, 0, 0), .004 * H, '#3b3f48', gr * .3));   // oś korbki do korpusu kołowrotka (korpus w +x układu korbki)
  const ustawKorbe = () => {};
  // korbka ustawiana co klatkę w układzie wędkarza: 7 cm na lewo od korpusu kołowrotka, oś obrotu pozioma (lewo–prawo), jak w kołowrotku spinningowym
  const qTmp = new THREE.Quaternion(), vTmp = new THREE.Vector3();
  const polozKorbe = () => { grupa.updateMatrixWorld(true); const c = korp.getWorldPosition(new THREE.Vector3()), gq = grupa.getWorldQuaternion(new THREE.Quaternion());
    vTmp.set(-.036 * H, 0, 0).applyQuaternion(gq).multiplyScalar(grupa.getWorldScale(new THREE.Vector3()).x); c.add(vTmp);
    korbaOs.position.copy(reel.worldToLocal(c)); korbaOs.quaternion.copy(reel.getWorldQuaternion(qTmp).invert().multiply(gq)); korbaOs.updateMatrixWorld(true); };
  grupa.traverse(o => { if (o.isMesh) o.renderOrder = kb; });
  // ---- pozy i płynne mieszanie ----
  const POZY = {
    spokoj: { pochyl: .02, skret: 0, kolana: .06, pSx: -.45, pSz: .16, pE: -1.15, lSx: -.08, lSz: -.16, lE: -.3, gX: 0, ugiecie: 0 },
    hol: { pochyl: -.15, skret: .2, kolana: .28, pSx: -.8, pSz: .25, pE: -1.0, lSx: -.75, lSz: .3, lE: -.75, gX: -.12, ugiecie: 1 },
    korba: { pSx: .3, pSz: .2, pE: -2 },   // ręce przy kręceniu (nadpisuje ramiona pozy bazowej)
    trzyma: { pochyl: .06, skret: -.1, kolana: .08, pSx: -.3, pSz: .2, pE: -.9, lSx: -1.15, lSz: .05, lE: -.55, gX: .12, ugiecie: 0 },
  };
  // ---- ręce nie wchodzą w tułów: próbki wzdłuż ramienia, przedramienia i dłoni sprawdzane względem bryły tułowia (przekroje SEK
  // w układzie kości, która go wygina); przy kolizji ręka odsuwa się przed tułów (gdy jest z przodu) albo na bok – w kilku krokach ----
  const tmpW = new THREE.Vector3(), ARM_R = .042 * H;
  const glebokosc = (wp, rr = ARM_R) => { const pK = kregoslup.worldToLocal(wp.clone()), kos = pK.y / H + YM + .11 > YM + .18 ? klatka : kregoslup, yR = kos === klatka ? YM + .21 : YM + .11;
    const p = kos === klatka ? klatka.worldToLocal(wp.clone()) : pK; p.y += yR * H; const yy = p.y / H + (siedzi ? .1 : 0);
    if (yy < y0 - .02 || yy > .64) return [0, p];   // pacha i bark (nasada ręki w tułowiu) pomijane
    const [a, b2, , n] = P(Math.min(1, Math.max(0, (yy - y0) / (y1 - y0)))), wyp = p.z > 0 ? 1.06 : 1;
    const v = Math.pow(Math.abs(p.x) / (a * H + rr), n) + Math.pow(Math.abs(p.z) / (b2 * wyp * H + rr), n); return [1 - v, p]; };
  const probki = R => { const pb = R.bark.getWorldPosition(new THREE.Vector3()), pl = R.lokiec.getWorldPosition(new THREE.Vector3()), pn = R.nadg.getWorldPosition(new THREE.Vector3()), pd = R.dl.getWorldPosition(new THREE.Vector3()), o = [];
    for (let i = 3; i <= 6; i++) o.push([pb.clone().lerp(pl, i / 6), (.04 - .006 * i / 6) * H * .85]); for (let i = 1; i <= 6; i++) o.push([pl.clone().lerp(pn, i / 6), (.034 - .005 * i / 6) * H * .85]); o.push([pd, .036 * H]); return o; };
  const bezKolizji = (R, sx) => {
    grupa.updateMatrixWorld(true);
    let odw = 0;
    for (let it = 0; it < 24; it++) {
      R.bark.updateMatrixWorld(true); let max = 0;
      for (const [q, rr] of probki(R)) { const [g] = glebokosc(q, rr); if (g > max) max = g; }
      if (max <= 0) return;
      const krok = .025 + max * .15;   // najpierw lekkie odwiedzenie ramienia na bok; gdy to za mało – ręka wysuwa się przed tułów
      if (odw < .45) { R.bark.rotation.z += sx * krok; odw += krok; } else R.bark.rotation.x -= krok;
    } };
  grupa.userData.debugRak = () => { grupa.updateMatrixWorld(true); return [Pr, L].map(R => ({ x: +R.bark.rotation.x.toFixed(2), z: +R.bark.rotation.z.toFixed(2), prob: probki(R).map(q => { const [g, p] = glebokosc(q[0], q[1]); return [+(p.x / H).toFixed(3), +(p.y / H).toFixed(3), +(p.z / H).toFixed(3), +g.toFixed(2)]; }) })); };
  grupa.userData.kolizjeRak = () => { grupa.updateMatrixWorld(true); let m = 0; for (const R of [Pr, L]) for (const q of probki(R)) m = Math.max(m, glebokosc(q[0], q[1])[0]); return m; };
  const stan = { ...POZY.spokoj }; let tPop = null, kw = 0; const faza = Math.random() * 6;
  const sk = o => o.getWorldScale(new THREE.Vector3()).y;   // skala świata (długości kości w metrach sceny)
  const anim = (t, st = {}) => {
    const cel = { ...(st.hol ? POZY.hol : st.trzyma ? POZY.trzyma : POZY.spokoj) };
    if (st.korba) Object.assign(cel, POZY.korba);   // prowadzenie / hol z kręceniem: wędka przed brzuchem, kołowrotek w zasięgu lewej ręki
    if (st.rzut !== undefined) { const p = Math.min(1, Math.max(0, st.rzut)), a = p < .35 ? sm(p / .35) : 1 - sm((p - .35) / .4);
      cel.pSx = lerp(-.4, -2.5, a) + (p > .35 ? -.25 * sm((p - .35) / .3) * (1 - sm((p - .7) / .3)) : 0); cel.pE = lerp(-1.2, -.5, a); cel.skret = .35 * a - .15 * sm((p - .4) / .3); cel.pochyl = -.1 * a + .1 * sm((p - .4) / .4); }
    const dt = tPop === null ? -1 : t - tPop; tPop = t; const k = dt <= 0 || dt > .5 ? 1 : 1 - Math.exp(-dt * 7);
    for (const kl in cel) stan[kl] += (cel[kl] - stan[kl]) * k;
    const S = stan, odd = Math.sin(t * 2.2 + faza), drz = S.ugiecie * (.04 * Math.sin(t * 9) + .025 * Math.sin(t * 23)), kol = Math.sin(t * .6 + faza);
    miednica.position.set(kol * .006 * H, (YM - S.kolana * .055) * H, 0);
    kregoslup.rotation.set(S.pochyl * .5, (S.skret + .05 * Math.sin(t * .4 + faza)) * .5, -kol * .012);
    klatka.rotation.set(S.pochyl * .5, (S.skret + .05 * Math.sin(t * .4 + faza)) * .5, -kol * .012);
    klatka.position.y = (.1 + .002 * odd) * H;
    nogi.forEach(({ biodro, kolano, kostka, sx }) => { if (siedzi) { biodro.rotation.set(-1.45, 0, 0); kolano.rotation.x = 1.45; kostka.rotation.x = 0; }
      else { biodro.rotation.set(-S.kolana * .9, 0, sx * (.035 + .008 * kol * sx)); kolano.rotation.x = S.kolana * 1.8; kostka.rotation.x = -S.kolana * .9; } });
    glowa.rotation.set(S.gX + .025 * odd, .14 * Math.sin(t * .35 + faza) * (1 - S.ugiecie * .6), .03 * Math.sin(t * 1.1 + faza) + (st.glowa ?? 0));
    const pod = st.podrywanie ? Math.max(0, Math.sin(t * 5)) ** 6 : 0;
    Pr.bark.rotation.set(S.pSx - .08 * pod + .02 * Math.sin(t * 1.4 + faza), 0, S.pSz); Pr.lokiec.rotation.x = S.pE - .25 * pod; Pr.nadg.rotation.x = -.35 * pod + drz - (st.reka ?? 0);
    L.bark.rotation.set(S.lSx + .03 * Math.sin(t * 1.4 + faza + 1), 0, S.lSz); L.lokiec.rotation.x = S.lE; L.nadg.rotation.x = -.1;
    // kręcenie kołowrotkiem (st.korba): korbka obraca się (ok. 1,1 obr./s), lewa dłoń trzyma gałkę – ręka liczona z IK dwóch kości, płynnie wchodzi i schodzi (waga kw)
    kw += ((st.korba ? 1 : 0) - kw) * k; korbaRam.rotation.x = -2 * Math.PI * (st.obrotyKorby ?? 1.1) * t;
    bezKolizji(Pr, 1);
    polozKorbe(); L.bark.position.copy(L.bark.userData.p0 || (L.bark.userData.p0 = L.bark.position.clone())); L.bark.position.x += kw * .08 * H; L.bark.position.z += kw * .06 * H;   // przy kręceniu bark lekko do przodu i do środka
    if (kw > .01) { grupa.updateMatrixWorld(true);
      const T = galka.getWorldPosition(new THREE.Vector3()), Sb = L.bark.getWorldPosition(new THREE.Vector3()), a1 = .125 * H * sk(L.bark), b1 = .145 * H * sk(L.bark);
      { const brak = T.distanceTo(Sb) - (a1 + b1) * .97; if (brak > 0) {   // gałka poza zasięgiem: bark sięga do niej (wysuwa się ku gałce, najwyżej o 0,05 H) – dłoń zawsze na gałce
          const pk = L.bark.parent.worldToLocal(T.clone()), pb = L.bark.position.clone(), kier = pk.sub(pb).normalize(); L.bark.position.addScaledVector(kier, Math.min(brak / sk(L.bark.parent), .05 * H)); L.bark.updateMatrixWorld(true); Sb.copy(L.bark.getWorldPosition(new THREE.Vector3())); } }
      const dv = T.clone().sub(Sb), dd = Math.min(dv.length(), (a1 + b1) * .995), dir = dv.normalize();
      const cosA = (a1 * a1 + dd * dd - b1 * b1) / (2 * a1 * dd), alfa = Math.acos(Math.max(-1, Math.min(1, cosA)));
      const pole = grupa.localToWorld(new THREE.Vector3(-.6 * H, -1 * H, -.2 * H)).sub(grupa.getWorldPosition(new THREE.Vector3())); pole.sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();   // łokieć w dół i na zewnątrz
      const E = Sb.clone().addScaledVector(dir, a1 * Math.cos(alfa)).addScaledVector(pole, a1 * Math.sin(alfa));
      const doLok = q => { const par = q.parent, qp = par.getWorldQuaternion(new THREE.Quaternion()).invert(); return qp; };
      const q0b = L.bark.quaternion.clone(), q1 = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), E.clone().sub(Sb).normalize().applyQuaternion(doLok(L.bark)));
      L.bark.quaternion.copy(q0b.slerp(q1, kw)); L.bark.updateMatrixWorld(true);
      const El = L.lokiec.getWorldPosition(new THREE.Vector3()), q0l = L.lokiec.quaternion.clone(), q2 = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), T.clone().sub(El).normalize().applyQuaternion(doLok(L.lokiec)));
      L.lokiec.quaternion.copy(q0l.slerp(q2, kw)); L.nadg.rotation.x = lerp(-.1, .25, kw); }
    else bezKolizji(L, -1);
    segs.forEach((s, i) => { if (i) s.rotation.x = S.ugiecie * (.06 + i * .045) + drz * .5 * (i / NSEG); });
    const mina = st.mina || 'spokojny', f = ((t + faza) % 2.9) / 2.9, mrug = f > .955 || mina === 'mrug';
    oczy.forEach(({ o, zr }) => { o.scale.set(1, mrug ? .12 : mina === 'zdziwiony' ? 1.22 : mina === 'skupiony' ? .75 : 1, 1); zr.position.x = .006 * H * Math.sin(t * .35 + faza); });
    brwi.forEach((b, i) => { const s = i ? 1 : -1; b.position.y = (.04 + (mina === 'zdziwiony' ? .014 : mina === 'skupiony' ? -.008 : 0)) * H; b.rotation.z = s * (mina === 'skupiony' ? -.25 : mina === 'zdziwiony' ? .12 : 0); });
    for (const m of Object.values(usta)) m.visible = false; (usta[mina] || usta.spokojny).visible = true;
  };
  anim(0, {}); ustawKorbe();
  const czubek = () => czubekObj.localToWorld(new THREE.Vector3());
  const dlon = () => L.dl.localToWorld(new THREE.Vector3(0, -.01 * H, .02 * H));
  grupa.userData.wedkarz = { anim, czubek, dlon, galka: () => galka.getWorldPosition(new THREE.Vector3()), lewa: L, prawa: Pr, pozy: POZY, dbg: () => ({ strona: stronaKorby, reel: reel.getWorldPosition(new THREE.Vector3()), os: korbaOs.getWorldPosition(new THREE.Vector3()) }) };
  return grupa;
}

// =====================================================================================================
// RYBY KARPIOWATE 3D (płoć, ukleja) – bryła z przekrojów jak okoń/szczupak. Profil liczony z profilKarp (ten sam obrys co 2D),
// cechy gatunku z GATUNKI_KARP: płoć – czerwona tęczówka, czerwonawe płetwy brzuszne i odbytowa, duże łuski;
// ukleja – smukła, bardzo srebrna, pysk górny, długa płetwa odbytowa (FishBase, Wikipedia). Głowa w +x, TL ≈ 2,15 × wys.
// =====================================================================================================
function przekrojeKarp(c, wezszy) {
  const { gora, dol } = profilKarp(c), P = [];
  for (let k = 0; k <= 24; k++) { const u = k / 24, g = gora[k][1], d = dol[24 - k][1]; let h = Math.max(.012 * 740, (d - g) / 2) / 740, yc = (210 - (g + d) / 2) / 740;
    if (k === 0) h = Math.max(h, c.H * .14 / 740);
    const w = h * (wezszy + (u > .78 ? (u - .78) / .22 * .16 : 0)); P.push([u, h, w, yc, u > .9 ? 2.5 : 2.2]); }
  P[24][1] = Math.min(P[24][1], .016); P[24][2] = Math.min(P[24][2], .01);
  return P;
}
function teksturaKarp(c, gat) {
  const W = 2048, H = 640, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  const X = u => u * W, Y = v => v * H;
  g.fillStyle = lg(g, 0, 0, 0, H, [[0, c.grzbiet], [.2, c.grzbiet], [.4, c.bok], [.7, c.bok], [1, c.brzuch]]); g.fillRect(0, 0, W, H);
  // duże łuski cykloidalne (łuk ciemny + jasny refleks), wyraźniejsze na grzbiecie
  const L = c.luska * 2.6;
  for (let y = 4, r = 0; y < Y(.92); y += L * .78, r++) for (let x = (r % 2) * L * .55; x < X(.8); x += L * 1.1) {
    const a = .12 + .18 * Math.max(0, 1 - y / Y(.6)); g.strokeStyle = `rgba(20,38,48,${a})`; g.lineWidth = 2.6;
    g.beginPath(); g.arc(x, y, L * .62, Math.PI / 2 + 1.15, -Math.PI / 2 - 1.15 + Math.PI * 2, false); g.stroke();
    g.strokeStyle = `rgba(255,255,255,${a * 1.1})`; g.lineWidth = 1.6; g.beginPath(); g.arc(x + 3, y, L * .5, Math.PI / 2 + .9, -Math.PI / 2 - .9 + Math.PI * 2, false); g.stroke(); }
  g.fillStyle = lg(g, 0, Y(.3), 0, Y(.62), [[0, 'rgba(255,255,255,0)'], [.5, c.polysk], [1, 'rgba(255,255,255,0)']]); g.fillRect(0, Y(.3), X(.82), Y(.32));   // srebrny połysk boku
  g.setLineDash([12, 9]); g.strokeStyle = 'rgba(30,40,45,.5)'; g.lineWidth = 3; g.beginPath(); g.moveTo(X(.02), Y(.5)); g.bezierCurveTo(X(.3), Y(.5 + (c.linia - .5) * 1.4 + .08), X(.6), Y(.5 + (c.linia - .5) * 1.4 + .08), X(.8), Y(.42)); g.stroke(); g.setLineDash([]);
  // głowa: bez łusek, ciemniejsza u góry, pokrywa skrzelowa, przedpokrywa, rumieniec, nozdrze, pysk
  g.fillStyle = 'rgba(40,60,70,.12)'; g.beginPath(); g.moveTo(X(.81), 0); g.bezierCurveTo(X(.775), Y(.4), X(.78), Y(.7), X(.82), Y(1)); g.lineTo(W, H); g.lineTo(W, 0); g.closePath(); g.fill();
  g.strokeStyle = INK; g.lineWidth = 6; g.beginPath(); g.moveTo(X(.815), Y(.1)); g.bezierCurveTo(X(.775), Y(.4), X(.78), Y(.7), X(.825), Y(.92)); g.stroke();
  g.strokeStyle = 'rgba(36,23,38,.5)'; g.lineWidth = 3.5; g.beginPath(); g.moveTo(X(.865), Y(.5)); g.bezierCurveTo(X(.85), Y(.62), X(.855), Y(.74), X(.87), Y(.86)); g.stroke();
  g.fillStyle = 'rgba(255,170,150,.22)'; g.beginPath(); g.ellipse(X(.85), Y(.6), 50, Y(.14), 0, 0, 7); g.fill();
  g.fillStyle = INK; g.beginPath(); g.arc(X(.965), Y(.36), 4, 0, 7); g.fill();
  g.strokeStyle = INK; g.lineWidth = 6; g.beginPath();
  if (gat === 'ukleja') { g.moveTo(X(1), Y(.42)); g.bezierCurveTo(X(.975), Y(.5), X(.95), Y(.54), X(.93), Y(.55)); } else { g.moveTo(X(1), Y(.54)); g.bezierCurveTo(X(.98), Y(.6), X(.955), Y(.6), X(.94), Y(.58)); }
  g.stroke();
  if (gat === 'ploc') { g.fillStyle = 'rgba(214,82,48,.1)'; g.fillRect(0, Y(.7), W, Y(.3)); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; return tex;
}
function stworzKarpiowata3D(gat, { wys = .5 } = {}) {
  const c = GATUNKI_KARP[gat], przekroj = profilRyby(przekrojeKarp(c, gat === 'ukleja' ? .36 : .4));
  const Lb = wys * 740 / 420, x0 = -Lb * .5, kb = 100 + (licznikPostaci++ % 40) * 12;
  const grupa = new THREE.Group(), NU = 96, NT = 48, poz = [], uv = [], idx = [];
  for (let i = 0; i <= NU; i++) { const u = i / NU, [h, w, yc, n] = przekroj(u);
    for (let j = 0; j <= NT; j++) { const th = j / NT * Math.PI * 2, cs = Math.cos(th), sn = Math.sin(th), e = 2 / n;
      poz.push(x0 + u * Lb, (yc + h * Math.sign(cs) * Math.pow(Math.abs(cs), e)) * Lb, w * Math.sign(sn) * Math.pow(Math.abs(sn), e) * Lb);
      uv.push(u, 1 - (th <= Math.PI ? th / Math.PI : 2 - th / Math.PI)); } }
  for (let i = 0; i < NU; i++) for (let j = 0; j < NT; j++) { const a = i * (NT + 1) + j, b = a + NT + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  for (const [i, kier] of [[0, -1], [NU, 1]]) { const u = i / NU, [, , yc] = przekroj(u), cc = poz.length / 3; poz.push(x0 + u * Lb + kier * .004 * Lb, yc * Lb, 0); uv.push(u, .5);
    for (let j = 0; j < NT; j++) { const a = i * (NT + 1) + j; if (kier > 0) idx.push(a, a + 1, cc); else idx.push(a + 1, a, cc); } }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
  const cialo = new THREE.Mesh(geo, matPostaci(teksturaKarp(c, gat))); cialo.layers.set(POSTACIE); grupa.add(cialo);
  const b0 = geo.attributes.position.array.slice();
  const om = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide, toneMapped: false }), grO = Lb * .008;
  om.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n  transformed += normalize(normal) * ${grO.toFixed(5)};`); };
  om.customProgramCacheKey = () => 'otoczkaKarp' + grO.toFixed(5);
  const otoczka = new THREE.Mesh(geo, om); otoczka.layers.set(POSTACIE); otoczka.userData.otoczka = true; cialo.add(otoczka);
  const naPow = (u, th, wysun = 0) => { const [h, w, yc, n] = przekroj(u), cs = Math.cos(th), sn = Math.sin(th), e = 2 / n;
    return new THREE.Vector3(x0 + u * Lb, (yc + (h + wysun) * Math.sign(cs) * Math.pow(Math.abs(cs), e)) * Lb, (w + wysun) * Math.sign(sn) * Math.pow(Math.abs(sn), e) * Lb); };
  // oczy: duże, tęczówka gatunku (płoć czerwona, ukleja srebrna)
  const uO = .905, thO = (gat === 'ukleja' ? .4 : .37) * Math.PI, rO = .034 * Lb, oczy = [];
  for (const strona of [1, -1]) { const o = new THREE.Group(); o.position.copy(naPow(uO, strona > 0 ? thO : 2 * Math.PI - thO, -.01));
    const cvI = document.createElement('canvas'); cvI.width = cvI.height = 128; const gi = cvI.getContext('2d'); gi.fillStyle = lg(gi, 0, 0, 0, 128, [[0, '#ffffff'], [.35, c.teczowka], [1, c.teczowka]]); gi.fillRect(0, 0, 128, 128);
    const ti = new THREE.CanvasTexture(cvI); ti.colorSpace = THREE.SRGBColorSpace; o.add(new THREE.Mesh(new THREE.SphereGeometry(rO, 20, 14), matPostaci(ti)));
    const obw = new THREE.Mesh(new THREE.TorusGeometry(rO * .98, rO * .13, 8, 28), matPostaci(null, { emissive: '#241726' })); obw.material.color.set('#241726'); obw.material.userData.jasnosc = .15; o.add(obw);
    const zr = new THREE.Mesh(new THREE.SphereGeometry(rO * .5, 14, 10), matPostaci(null, { emissive: '#0d0910' })); zr.material.color.set('#0d0910'); zr.material.userData.jasnosc = .06; zr.position.z = rO * .62; o.add(zr);
    const bl = new THREE.Mesh(new THREE.SphereGeometry(rO * .15, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' })); bl.position.set(-rO * .2 * strona, rO * .25, rO * 1.0); o.add(bl);
    o.lookAt(o.position.clone().add(new THREE.Vector3(.15, .05, strona))); o.traverse(m => m.layers.set(POSTACIE)); grupa.add(o); oczy.push({ zr, z0: zr.position.clone(), strona }); }
  // płetwy
  const S = Lb / 1000, gora = u => (przekroj(u)[0] + przekroj(u)[2]) * Lb, dol = u => (przekroj(u)[2] - przekroj(u)[0]) * Lb;
  const nasada = (m, u0, u1, yBaz, wysPl, dlBaz, znak) => { const k = Math.atan2((znak > 0 ? gora(u1) - gora(u0) : dol(u1) - dol(u0)), (u1 - u0) * Lb);
    m.geometry.translate(0, (yBaz - wysPl / 2) * S, 0); m.rotation.z = k; m.position.set(x0 + (u0 + u1) / 2 * Lb, znak > 0 ? (gora(u0) + gora(u1)) / 2 - .006 * Lb : (dol(u0) + dol(u1)) / 2 + .006 * Lb, 0);
    m.scale.x = (u1 - u0) * Lb / (dlBaz * S); grupa.add(m); return m; };
  // płetwa nieparzysta: przód wysoki (prawa strona płata), tył niski, brzeg lekko wklęsły (karpiowate)
  const nieparzysta = (wPl, hPl, znak, kolory) => { const n = 10, cz = []; for (let i = 0; i < n; i++) { const t = i / (n - 1), L = (.28 + .72 * Math.pow(t, 1.4)) * (hPl - 16), x = 14 + t * (wPl - 40) - L * .35;
      cz.push([x, znak > 0 ? hPl - 8 - L : 8 + L]); }
    const yb = znak > 0 ? hPl - 8 : 8, baza = [[14, yb], [wPl - 12, yb]];
    return [platPletwy(wPl, hPl, g => { pletwaPromienie(g, baza, cz, lg(g, 0, 0, 0, hPl, znak > 0 ? [[0, kolory[1]], [1, kolory[0]]] : [[0, kolory[0]], [1, kolory[1]]]), 'rgba(36,23,38,.42)', 2.2);
      g.beginPath(); g.moveTo(...baza[0]); for (const k of cz) g.lineTo(...k); g.lineTo(...baza[1]); obrys(g, 5.5); }, S), yb]; };
  const [gd0, gd1, gdh] = c.grzbietowa, [od0, od1, odh] = c.odbytowa;
  const hG = gdh * c.H / 740 * 1000 * .78, hO = odh * c.H / 740 * 1000 * .85;
  const [grzb, ybG] = nieparzysta(160, hG + 20, 1, c.pletwy); nasada(grzb, gd0, gd1, ybG, hG + 20, 136, 1);
  const [odbyt, ybO] = nieparzysta(160, hO + 20, -1, c.czerwone); nasada(odbyt, od0, od1, ybO, hO + 20, 136, -1);
  // ogon widlasty
  const ogon = platPletwy(220, 300, g => { const k = [[214, 120], [150, 80], [40, 8], [16, 18], [70, 110], [110, 150], [70, 190], [16, 282], [40, 292], [150, 220], [214, 180]];
    gladko(g, k); wypelnij(g, lg(g, 0, 0, 220, 0, [[0, gat === 'ploc' ? '#c8693e' : c.pletwy[1]], [.5, c.pletwy[0]], [1, c.grzbiet]])); g.save(); gladko(g, k); g.clip();
    for (let i = 0; i < 15; i++) { const a = (-50 + i * 7.1) * D2R; g.beginPath(); g.moveTo(214, 150); g.lineTo(214 - 230 * Math.cos(a), 150 + 220 * Math.sin(a)); obrys(g, 2.2, 'rgba(36,23,38,.38)'); } g.restore(); gladko(g, k); obrys(g, 6.5); }, S);
  const sk = c.H / 236; ogon.scale.y = sk; ogon.geometry.translate(-108 * S, 0, 0); const ogonPiw = new THREE.Group(); ogonPiw.position.set(x0 + .006 * Lb, przekroj(0)[2] * Lb, 0); ogonPiw.add(ogon); grupa.add(ogonPiw);
  const parzysta = (u, th, szer, wysP, kolory, kat) => { const lista = [];
    for (const strona of [1, -1]) { const czP = []; for (let i = 0; i < 8; i++) { const a = (.15 + i * .11) * Math.PI, R = (szer - 14) * (.82 + .2 * Math.sin(i / 7 * Math.PI)); czP.push([szer - 10 - R * Math.cos(a - .1) * .98, 10 + R * Math.sin(a) * (wysP - 16) / (szer - 14)]); }
      const m = platPletwy(szer, wysP, g => { const kk = czP.filter(([x, y]) => x > 4 && y > 4 && y < wysP - 4); pletwaPromienie(g, [[szer - 6, 8], [szer - 22, 18]], kk, lg(g, 0, 0, 0, wysP, [[0, kolory[0]], [1, kolory[1]]]), 'rgba(36,23,38,.45)', 2.2); g.beginPath(); g.moveTo(szer - 6, 8); for (const k of kk) g.lineTo(...k); g.lineTo(szer - 22, 18); obrys(g, 5); }, S);
      m.geometry.translate(-(szer / 2 - 8) * S, -(wysP / 2 - 10) * S, 0);
      const piw = new THREE.Group(); piw.position.copy(naPow(u, strona > 0 ? th : 2 * Math.PI - th, -.004)); piw.rotation.set(-strona * kat, 0, -.35); piw.add(m); grupa.add(piw); lista.push(piw); }
    return lista; };
  const piers = parzysta(c.piersiowa - .02, .72 * Math.PI, 140, 80, gat === 'ukleja' ? ['#dfe6e9', '#c9d2d6'] : ['#f2b48a', '#e0784a'], .5);
  const brzuch = parzysta(c.brzuszne, .9 * Math.PI, 120, 80, [c.czerwone[0], c.czerwone[1]], .7);
  grupa.traverse(o => { if (o.isMesh) o.renderOrder = kb; });
  const faza = Math.random() * 6;
  const anim = (t, st = {}) => {
    const w = 9 * (st.tempo ?? 1), ph = faza, A = Lb * .04;
    const fala = u => A * Math.pow(Math.max(0, 1 - u / .72), 2) * Math.sin(w * t + ph - (1 - u) * 2.6);
    const Pp = geo.attributes.position.array;
    for (let i = 0; i <= NU; i++) { const dz = fala(i / NU); for (let j = 0; j <= NT; j++) { const k = (i * (NT + 1) + j) * 3; Pp[k + 2] = b0[k + 2] + dz; } }
    geo.attributes.position.needsUpdate = true;
    const kat = Math.atan2(fala(.02) - fala(0), .02 * Lb);
    ogonPiw.position.z = fala(0); ogonPiw.rotation.y = kat * 1.6 + .22 * Math.sin(w * t + ph - 3);
    grzb.position.z = fala((gd0 + gd1) / 2); odbyt.position.z = fala((od0 + od1) / 2);
    piers.forEach((p, i) => { p.rotation.y = .35 * Math.sin(w * .5 * t + ph + i * 1.5); }); brzuch.forEach((p, i) => { p.rotation.y = .2 * Math.sin(w * .45 * t + ph + i); });
    const ex = 4 * Math.sin(t * .6 + ph);
    oczy.forEach(({ zr, z0, strona }) => { zr.position.set(z0.x + ex * .0015 * Lb * strona, z0.y, z0.z); });
  };
  grupa.userData.okon = { wys, anim };
  return grupa;
}
export const stworzPlotke3D = o => stworzKarpiowata3D('ploc', o);
export const stworzUkleje3D = o => stworzKarpiowata3D('ukleja', o);
