// Biblioteka rekwizytów 3D (Wiśnia Wędkuje): kamienie, kłody i roślinność wodna do wielokrotnego użytku.
// Styl: cieniowanie toon (jak świat w silnik.js), tusz dorysowuje kompozycja; kolory naturalne, detale w teksturach Canvas.
// Każda funkcja zwraca THREE.Group z podstawą w y = 0 (w scenie stawiamy ją na dnie / tafli), a w userData:
//   kolysz   – lista obiektów, które silnik kołysze (rośliny, łodygi),
//   kolizja  – [{ x, z, r, top }] względem środka grupy: przeszkody dla ryb (silnik dopisuje je do `kamienie`).
// Rośliny (polskie wody):
//   grzybien (lilia wodna, Nymphaea alba) – okrągłe liście z wąskim wcięciem (nie nachodzą na siebie), białe kwiaty, ogonki do dna
//   grazel (grążel żółty, Nuphar lutea)   – sercowate liście, żółty kulisty kwiat nad wodą
//   rdest (rdest ziemnowodny, Persicaria amphibia) – pędy płożące po tafli, naprzemienne lancetowate liście, różowe kłosy
//   rdestnica (rdestnica przeszyta, Potamogeton perfoliatus) – zanurzone łodygi, jajowate falujące liście obejmujące łodygę
//   rogatek (Ceratophyllum)               – gęste okółki cienkich, widlastych liści, ciemnozielony „ogon lisa”
//   palka (pałka wodna, Typha)            – taśmowate liście i brązowe kolby
//   trzcina (Phragmites)                  – łodygi z liśćmi i pierzastymi, fioletowobrązowymi wiechami
import * as THREE from 'three';

const grad = (() => { const d = new Uint8Array([90, 170, 255]); const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const toon = (c, o = {}) => new THREE.MeshToonMaterial({ color: c, gradientMap: grad, ...o });
let R = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(97);
export function ustawLosowanie(fn) { R = fn; }                     // silnik podaje swój generator (powtarzalne sceny)
const C = h => new THREE.Color(h);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const szum3 = (x, y, z) => Math.sin(x * 1.7 + y * .9) * Math.cos(z * 1.3 - x * .4) * .5 + Math.sin(x * 3.1 - z * 2.3 + y * 1.9) * .3 + Math.sin(y * 4.7 + z * 3.9) * .2;
const tekstura = (w, h, rys, rep = [1, 1]) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); rys(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = 8; return t; };
function walec(p, q, r0, r1, mat, rad = 6) {   // cylinder od p do q (łodygi, gałęzie)
  const d = q.clone().sub(p), L = d.length(), m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, L, rad), mat);
  m.position.copy(p).add(q).multiplyScalar(.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); return m;
}
function lodyga(pts, r, mat) { return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Math.max(8, pts.length * 4), r, 5), mat); }

// ======================================================= KAMIENIE ==========================================================
// kamień rzeczny: nieregularna bryła (dwudziestościan z szumem), płaski spód, kolory skały z żyłkami, mech na górze
export function kamien({ r = .5, kolor = '#8b877c', mech = .6, wydl = 1.25, plaski = .65 } = {}) {
  const geo = new THREE.IcosahedronGeometry(r, 2), pos = geo.attributes.position, f = R() * 10;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const n = 1 + .22 * szum3(x / r * 1.3 + f, y / r * 1.3, z / r * 1.3 - f);
    x *= n * wydl; z *= n; y *= n * plaski; if (y < -r * .15) y = -r * .15 + (y + r * .15) * .25;   // spłaszczony spód (leży na dnie)
    pos.setXYZ(i, x, y + r * .15, z);
  }
  geo.computeVertexNormals();
  // kolory na ściankach (trójkąt = jedna barwa): skała z odcieniami, ciemniejszy spód, mech na wierzchu
  const kol = [], baza = C(kolor), ciemny = C(kolor).multiplyScalar(.62), mchu = C('#5f7d32'), nrm = geo.attributes.normal;
  for (let i = 0; i < pos.count; i += 3) {
    const ny = (nrm.getY(i) + nrm.getY(i + 1) + nrm.getY(i + 2)) / 3, yy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
    const c = baza.clone().lerp(ciemny, Math.max(0, .5 - yy / r)).offsetHSL((R() - .5) * .02, (R() - .5) * .05, (R() - .5) * .07);
    if (ny > .55 && R() < mech) c.lerp(mchu, .55 + R() * .3);
    for (let k = 0; k < 3; k++) kol.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(kol, 3));
  const m = new THREE.Mesh(geo, toon('#ffffff', { vertexColors: true })); m.rotation.y = R() * 6;
  const g = new THREE.Group(); g.add(m);
  g.userData = { kolysz: [], kolizja: [{ x: 0, z: 0, r: r * wydl * 1.05, top: r * plaski * 1.2 + r * .15 }] };
  return g;
}
// grupa kamieni (rumosz): kilka kamieni różnej wielkości ciasno obok siebie
export function rumosz({ n = 6, r = .4, rozrzut = 1.2, kolor } = {}) {
  const g = new THREE.Group(); g.userData = { kolysz: [], kolizja: [] };
  for (let i = 0; i < n; i++) { const k = kamien({ r: r * (.5 + R() * .8), kolor: kolor || ['#8b877c', '#7d786c', '#9a958a', '#6f6a60'][i % 4] }), x = (R() - .5) * rozrzut * 2, z = (R() - .5) * rozrzut;
    k.position.set(x, 0, z); g.add(k); for (const c of k.userData.kolizja) g.userData.kolizja.push({ ...c, x: c.x + x, z: c.z + z }); }
  return g;
}

// ======================================================= KŁODY =============================================================
const tekKora = () => tekstura(256, 512, (g, w, h) => {
  g.fillStyle = '#6b4a32'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 46; i++) { const x = R() * w; g.strokeStyle = `rgba(30,18,10,${.35 + R() * .35})`; g.lineWidth = 3 + R() * 6; g.beginPath(); g.moveTo(x, 0);
    for (let y = 0; y <= h; y += 32) g.lineTo(x + Math.sin(y * .03 + i) * 6, y); g.stroke(); }                                // bruzdy kory
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(150,120,85,${.25 + R() * .25})`; g.fillRect(R() * w, R() * h, 4 + R() * 10, 20 + R() * 40); }
  for (let i = 0; i < 18; i++) { g.fillStyle = `rgba(150,170,120,${.35 + R() * .3})`; g.beginPath(); g.ellipse(R() * w, R() * h, 6 + R() * 14, 4 + R() * 9, R() * 3, 0, 7); g.fill(); }   // porosty
}, [2, 1]);
const tekSloje = () => tekstura(256, 256, (g, w) => {
  g.fillStyle = '#d9b483'; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill();
  for (let r = 10; r < 120; r += 7 + R() * 5) { g.strokeStyle = `rgba(120,80,45,${.35 + R() * .3})`; g.lineWidth = 2; g.beginPath(); g.ellipse(128 + R() * 3, 128, r, r * .97, 0, 0, 7); g.stroke(); }
  g.strokeStyle = 'rgba(80,50,25,.6)'; g.lineWidth = 3; for (let i = 0; i < 3; i++) { const a = R() * 6; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.cos(a) * 110, 128 + Math.sin(a) * 110); g.stroke(); }   // pęknięcia
  g.strokeStyle = '#4a3222'; g.lineWidth = 12; g.beginPath(); g.arc(128, 128, 122, 0, 7); g.stroke();
});
// kłoda: lekko wygięty pień z korą, ścięty koniec ze słojami, złamany koniec, kikuty gałęzi, mech od góry
export function kloda({ dl = 4, r = .3, kikuty = 3, mech = .5 } = {}) {
  const g = new THREE.Group(), geo = new THREE.CylinderGeometry(r * .9, r, dl, 14, 12, true); geo.rotateZ(Math.PI / 2);
  const pos = geo.attributes.position, f = R() * 10;
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), u = x / dl; pos.setY(i, pos.getY(i) * (1 + .08 * Math.sin(x * 3 + f)) + .12 * dl * (u * u - .25) * -.6); pos.setZ(i, pos.getZ(i) * (1 + .08 * Math.cos(x * 2.3 + f)) + .1 * Math.sin(u * 3 + f)); }
  geo.computeVertexNormals();
  const kol = [], nrm = geo.attributes.normal, mchu = C('#6d8a3a'), bia = C('#ffffff');
  for (let i = 0; i < pos.count; i++) { const c = bia.clone(); if (nrm.getY(i) > .45 && szum3(pos.getX(i) * 2, 0, pos.getZ(i) * 3) > .1 - mech * .5) c.lerp(mchu, .7); kol.push(c.r, c.g, c.b); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(kol, 3));
  const pien = new THREE.Mesh(geo, toon('#ffffff', { map: tekKora(), vertexColors: true, side: THREE.DoubleSide })); g.add(pien);
  const czolo = new THREE.Mesh(new THREE.CircleGeometry(r * .9, 18), toon('#ffffff', { map: tekSloje() })); czolo.rotation.y = Math.PI / 2; czolo.position.x = dl / 2 - .01; g.add(czolo);   // ścięty koniec
  const zlam = new THREE.Mesh(new THREE.ConeGeometry(r * .95, r * 1.4, 9, 1, true), toon('#5e4129', { side: THREE.DoubleSide }));       // złamany koniec (drzazgi)
  const zp = zlam.geometry.attributes.position; for (let i = 0; i < zp.count; i++) if (zp.getY(i) > 0) zp.setXYZ(i, zp.getX(i) + (R() - .5) * r * .5, zp.getY(i) * (.4 + R() * .8), zp.getZ(i) + (R() - .5) * r * .5);
  zlam.geometry.computeVertexNormals(); zlam.rotation.z = Math.PI / 2; zlam.position.x = -dl / 2 - r * .5; g.add(zlam);
  const kora = toon('#5a3d2a');
  for (let i = 0; i < kikuty; i++) { const x = -dl / 2 + dl * (.2 + .6 * R()), a = R() * Math.PI * .9 + .1, p = V(x, Math.sin(a) * r * .8, Math.cos(a) * r * .8), q = p.clone().add(V((R() - .5) * .4, Math.sin(a) * (.5 + R() * .8), Math.cos(a) * (.5 + R() * .8)));
    g.add(walec(p, q, r * .28, r * .12, kora, 7)); }
  g.position.y = r * .85;
  const h = new THREE.Group(); h.add(g); h.userData = { kolysz: [], kolizja: Array.from({ length: Math.ceil(dl) + 1 }, (_, i) => ({ x: -dl / 2 + i * dl / Math.ceil(dl), z: 0, r: r * 1.6, top: r * 2.1 })) };
  return h;
}

// ======================================================= ROŚLINY ===========================================================
const tekLisc = (kol, zylki = 'radialne', plamy = 0) => tekstura(256, 256, (g, w) => {
  const gr = g.createRadialGradient(128, 128, 10, 128, 128, 128); gr.addColorStop(0, C(kol).offsetHSL(0, 0, .08).getStyle()); gr.addColorStop(.85, kol); gr.addColorStop(1, C(kol).offsetHSL(0, 0, -.12).getStyle());
  g.fillStyle = gr; g.fillRect(0, 0, w, w);
  g.strokeStyle = 'rgba(20,50,10,.35)'; g.lineWidth = 2.2;
  if (zylki === 'radialne') for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2; g.beginPath(); g.moveTo(128, 128); g.quadraticCurveTo(128 + Math.cos(a + .15) * 60, 128 + Math.sin(a + .15) * 60, 128 + Math.cos(a) * 126, 128 + Math.sin(a) * 126); g.stroke(); }
  else { g.lineWidth = 3.5; g.beginPath(); g.moveTo(0, 128); g.lineTo(256, 128); g.stroke(); g.lineWidth = 1.8; for (let x = 20; x < 240; x += 22) { g.beginPath(); g.moveTo(x, 128); g.quadraticCurveTo(x + 14, 90, x + 30, 60); g.moveTo(x, 128); g.quadraticCurveTo(x + 14, 166, x + 30, 196); g.stroke(); } }
  for (let i = 0; i < plamy; i++) { g.fillStyle = `rgba(120,60,40,${.15 + R() * .2})`; g.beginPath(); g.arc(R() * w, R() * w, 4 + R() * 10, 0, 7); g.fill(); }
});
// liść pływający: okrąg z wycięciem (grzybień, grążel) z lekko podwiniętym brzegiem
function liscPlywajacy(r, mat, { serce = false } = {}) {
  const geo = new THREE.CircleGeometry(r, 28, .18, Math.PI * 2 - .36); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), d = Math.hypot(x, z) / r; if (serce) p.setX(i, x * 1.15); p.setY(i, .045 * r * d ** 4 + .01 * Math.sin(x * 9)); }
  geo.computeVertexNormals(); return new THREE.Mesh(geo, mat);
}
// łodyga od liścia na tafli do dna, falująca (widoczna pod wodą w ujęciu pół na pół)
function lodygaDoDna(x, z, glebia, mat, r = .008) {   // ogonek w wodzie: cienki, bez tuszu (warstwa 3), z delikatnym łukiem
  const pts = []; for (let i = 0; i <= 8; i++) { const u = i / 8; pts.push(V(x + Math.sin(u * 3 + x * 3) * .22 * (1 - u) * u * 2, -glebia * (1 - u) - .01, z + Math.cos(u * 2.5 + z * 3) * .16 * (1 - u) * u * 2)); }
  const m = lodyga(pts, Math.min(r, .008), mat); m.layers.set(3); return m;
}
// ---- pomocnicze dla roślin pływających ----
// rozmieszczenie bez nakładania (próbkowanie z odrzuceniem): każdy element ma promień, odstęp = suma promieni × zapas
function bezNakladania(n, rozrzut, promien, zapas = 1.06, istniejace = []) {
  const wyn = [...istniejace]; let proby = 0;
  while (wyn.length < istniejace.length + n && proby++ < n * 400) {
    const r = promien(), a = R() * Math.PI * 2, d = Math.sqrt(R()), x = Math.cos(a) * d * rozrzut, z = Math.sin(a) * d * rozrzut * .75;
    if (wyn.every(q => Math.hypot(q.x - x, q.z - z) >= (q.r + r) * zapas)) wyn.push({ x, z, r });
  }
  return wyn.slice(istniejace.length);
}
// kształt liścia z wcięciem (zatoką) do ogonka: koło (grzybień) albo owal-serce (grążel); lekko falisty brzeg
function ksztaltLiscia(r, { wydl = 1, zatoka = .14, fal = .012 } = {}) {
  // obrys: środek (nasada ogonka) → brzeg dookoła → z powrotem do środka; bez zdublowanego punktu startu (poprawna triangulacja)
  const sh = new THREE.Shape(), n = 120; sh.moveTo(r * .04, 0);
  for (let i = 0; i <= n; i++) { const a = zatoka + (Math.PI * 2 - 2 * zatoka) * i / n, rr = r * (1 + fal * Math.sin(a * 9 + r * 7));
    sh.lineTo(Math.cos(a) * rr * wydl, Math.sin(a) * rr); }
  sh.closePath(); return sh;
}
function geoLisciaPlywajacego(r, opcje = {}) {
  const geo = new THREE.ShapeGeometry(ksztaltLiscia(r, opcje), 4), p = geo.attributes.position, uv = geo.attributes.uv, w = r * (opcje.wydl || 1);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), d = Math.hypot(x / w, y / r); uv.setXY(i, .5 + x / (2 * w), .5 + y / (2 * r)); p.setZ(i, .025 * r * Math.max(0, d - .82) * 6); }   // brzeg lekko podwinięty do GÓRY (cała blaszka nad taflą – liść leży na wodzie, nie jest zalany)
  geo.rotateX(-Math.PI / 2); geo.computeVertexNormals(); return geo;
}
const tekLiscGrzybienia = () => tekstura(512, 512, (g, w) => {
  const c = 256, gr = g.createRadialGradient(c, c, 20, c, c, 256); gr.addColorStop(0, '#4f8f3a'); gr.addColorStop(.75, '#3d7a2c'); gr.addColorStop(.95, '#2f6322'); gr.addColorStop(1, '#6b4a2a');
  g.fillStyle = gr; g.fillRect(0, 0, w, w);
  g.strokeStyle = 'rgba(25,60,15,.45)'; g.lineWidth = 3;                                       // nerwy promieniste, rozwidlone przy brzegu
  for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2; g.beginPath(); g.moveTo(c, c); const x1 = c + Math.cos(a) * 170, y1 = c + Math.sin(a) * 170; g.lineTo(x1, y1);
    for (const s of [-.12, .12]) { g.moveTo(x1, y1); g.lineTo(c + Math.cos(a + s) * 245, c + Math.sin(a + s) * 245); } g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,.16)'; g.beginPath(); g.ellipse(c - 70, c - 80, 110, 50, -.6, 0, 7); g.fill();   // połysk woskowej blaszki
  for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(110,70,30,${.2 + R() * .2})`; g.beginPath(); g.arc(c + (R() - .5) * 380, c + (R() - .5) * 380, 4 + R() * 9, 0, 7); g.fill(); }   // drobne przebarwienia
}, [1, 1]);
// płatek: zaostrzony owal, podstawa w (0,0), oś wzdłuż +y
function geoPlatka(dl, szer) { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.bezierCurveTo(szer, dl * .25, szer * .9, dl * .7, 0, dl); sh.bezierCurveTo(-szer * .9, dl * .7, -szer, dl * .25, 0, 0); const g = new THREE.ShapeGeometry(sh, 8); g.computeVertexNormals(); return g; }
// kwiat grzybienia: 4 działki (zielone od spodu), 3 okółki białych zaostrzonych płatków coraz bardziej wzniesionych, żółte pręciki
function kwiatGrzybienia(sk = 1) {
  const kw = new THREE.Group(), bialy = toon('#fbfbf4', { side: THREE.DoubleSide }), kremowy = toon('#f3eedd', { side: THREE.DoubleSide }), dzialka = toon('#5e8a3a', { side: THREE.DoubleSide });
  const okolki = [[4, .15, .055, .25, dzialka], [8, .15, .05, .45, bialy], [8, .13, .045, .75, bialy], [7, .1, .035, 1.05, kremowy]];
  okolki.forEach(([n, dl, sz, wznies, mat], w) => { const geo = geoPlatka(dl * sk, sz * sk);
    for (let i = 0; i < n; i++) { const a = (i + w * .5) / n * Math.PI * 2, m = new THREE.Mesh(geo, mat); m.rotation.order = 'YXZ'; m.rotation.set(-(Math.PI / 2 - wznies), -a, 0); m.position.y = .01 + w * .006; kw.add(m); } });
  const zolty = toon('#f2c21a'), ciemnoz = toon('#d99a12');
  for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2, m = new THREE.Mesh(new THREE.CylinderGeometry(.004 * sk, .004 * sk, .035 * sk, 4), i % 2 ? zolty : ciemnoz); m.position.set(Math.cos(a) * .022 * sk, .03 * sk, Math.sin(a) * .022 * sk); m.rotation.set(Math.sin(a) * .5, 0, -Math.cos(a) * .5); kw.add(m); }
  const sr = new THREE.Mesh(new THREE.CylinderGeometry(.018 * sk, .02 * sk, .02 * sk, 12), zolty); sr.position.y = .02 * sk; kw.add(sr);
  return kw;
}
// grzybień biały (Nymphaea alba): okrągłe liście z wąskim wcięciem do ogonka (nie nachodzą na siebie), białe kwiaty na tafli, długie ogonki do dna
export function grzybien({ n = 8, rozrzut = 1.6, glebia = 1.5, kwiaty = 2 } = {}) {
  const g = new THREE.Group(), lisc = toon('#ffffff', { map: tekLiscGrzybienia(), side: THREE.DoubleSide }), spod = toon('#7a3f3a', { side: THREE.DoubleSide }), ogonek = toon('#6b6a3a');
  const liscie = bezNakladania(n, rozrzut, () => .26 + R() * .2, 1.04);
  for (const { x, z, r } of liscie) { const rot = R() * 6;
    const l = new THREE.Mesh(geoLisciaPlywajacego(r), lisc); l.position.set(x, .02, z); l.rotation.y = rot; g.add(l);
    const sp = new THREE.Mesh(geoLisciaPlywajacego(r * .995), spod); sp.position.set(x, .012, z); sp.rotation.y = rot; g.add(sp);   // czerwonawy spód
    g.add(lodygaDoDna(x, z, glebia, ogonek, .011)); }
  const wolne = bezNakladania(kwiaty, rozrzut * .8, () => .14, 1.02, liscie), kolysz = [];
  for (const { x, z } of wolne) { const kw = kwiatGrzybienia(1.6); kw.position.set(x, 0, z); kw.rotation.y = R() * 6; g.add(kw); g.add(lodygaDoDna(x, z, glebia, ogonek, .011)); }
  g.userData = { kolysz, kolizja: [] }; return g;
}
const tekLiscGrazela = () => tekstura(512, 512, (g, w) => {
  const c = 256, gr = g.createRadialGradient(c, c, 20, c, c, 256); gr.addColorStop(0, '#6aa040'); gr.addColorStop(.8, '#4e8a30'); gr.addColorStop(1, '#3b6d24');
  g.fillStyle = gr; g.fillRect(0, 0, w, w);
  g.strokeStyle = 'rgba(30,70,15,.5)'; g.lineWidth = 5; g.beginPath(); g.moveTo(c, c); g.lineTo(w, c); g.stroke();      // główny nerw wzdłuż długiej osi
  g.lineWidth = 2.5; for (let i = 1; i < 14; i++) { const x = c + i * 17; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(x - 20, c); g.quadraticCurveTo(x, c + s * 90, x + 10, c + s * 200); g.stroke(); } }   // nerwy pierzaste
  for (let i = 0; i < 10; i++) { const a = Math.PI * (.55 + i * .09); g.beginPath(); g.moveTo(c, c); g.quadraticCurveTo(c + Math.cos(a) * 120, c + Math.sin(a) * 120, c + Math.cos(a) * 240, c + Math.sin(a) * 240); g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,.14)'; g.beginPath(); g.ellipse(c + 60, c - 70, 120, 45, -.3, 0, 7); g.fill();
}, [1, 1]);
// grążel żółty (Nuphar lutea): duże owalne liście z głęboką zatoką, kulisty żółty kwiat 10–15 cm nad wodą, falujące liście podwodne przy dnie
export function grazel({ n = 5, rozrzut = 1.4, glebia = 1.6, kwiaty = 2 } = {}) {
  const g = new THREE.Group(), lisc = toon('#ffffff', { map: tekLiscGrazela(), side: THREE.DoubleSide }), ogonek = toon('#7a8a3a'), zolty = toon('#f4c418'), zolty2 = toon('#e0a810'), kolysz = [];
  const liscie = bezNakladania(n, rozrzut, () => .32 + R() * .14, 1.05, []).map(q => ({ ...q, r: q.r }));
  for (const { x, z, r } of liscie) { const l = new THREE.Mesh(geoLisciaPlywajacego(r / 1.25, { wydl: 1.25, zatoka: .2 }), lisc); l.position.set(x, .02, z); l.rotation.y = R() * 6; g.add(l); g.add(lodygaDoDna(x, z, glebia, ogonek, .013)); }
  const podwodny = toon('#7fb04a', { side: THREE.DoubleSide, transparent: true, opacity: .85 });   // „sałata” liści podwodnych
  for (let i = 0; i < 5; i++) { const geo = geoLisciaPlywajacego(.22, { wydl: 1.3, zatoka: .25, fal: .08 }), m = new THREE.Mesh(geo, podwodny), a = i / 5 * Math.PI * 2;
    m.position.set(Math.cos(a) * .12, -glebia + .18, Math.sin(a) * .12); m.rotation.set(-1 + R() * .5, a, R() - .5); g.add(m); }
  for (const { x, z } of bezNakladania(kwiaty, rozrzut * .8, () => .1, 1.02, liscie)) {
    const kw = new THREE.Group(); kw.add(walec(V(0, 0, 0), V(.02, .2, 0), .014, .012, ogonek));
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, pl = new THREE.Mesh(new THREE.SphereGeometry(.06, 12, 10, 0, Math.PI * 2, 0, Math.PI * .6), i % 2 ? zolty : zolty2);
      pl.scale.set(.9, 1.15, .7); pl.position.set(.02 + Math.cos(a) * .035, .2, Math.sin(a) * .035); pl.rotation.set(Math.sin(a) * .5, 0, -Math.cos(a) * .5); kw.add(pl); }   // 5 mięsistych działek w kubek
    const sr = new THREE.Mesh(new THREE.CylinderGeometry(.03, .026, .03, 12), toon('#9aa83a')); sr.position.set(.02, .27, 0); kw.add(sr);
    kw.position.set(x, 0, z); g.add(kw); g.add(lodygaDoDna(x, z, glebia, ogonek, .013)); kolysz.push(kw); }
  g.userData = { kolysz, kolizja: [] }; return g;
}
const tekLiscRdestu = () => tekstura(256, 128, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#3d7a2a'); gr.addColorStop(.5, '#5c9c3c'); gr.addColorStop(1, '#3d7a2a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(215,230,180,.6)'; g.lineWidth = 3.5; g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();           // jasny nerw środkowy
  g.strokeStyle = 'rgba(30,60,15,.45)'; g.lineWidth = 1.8; for (let x = 14; x < w - 10; x += 13) for (const s of [-1, 1]) { g.beginPath(); g.moveTo(x, h / 2); g.quadraticCurveTo(x + 16, h / 2 + s * 26, x + 34, h / 2 + s * 54); g.stroke(); }   // gęste nerwy boczne
  g.fillStyle = 'rgba(170,70,60,.22)'; g.fillRect(0, 0, w, 5); g.fillRect(0, h - 5, w, 5);       // czerwonawy brzeg blaszki
  g.fillStyle = 'rgba(255,255,255,.13)'; g.beginPath(); g.ellipse(w * .45, h * .32, w * .3, 10, 0, 0, 7); g.fill();   // połysk
}, [1, 1]);
// rdest ziemnowodny (Persicaria amphibia), forma wodna: pędy pływające tuż pod / na tafli, liście podłużnie eliptyczne
// (ok. 3,5 × dłuższe niż szersze, nasada zaokrąglona, szczyt tępo zaostrzony) na krótkich ogonkach, skupione na końcach pędów;
// na szczytach gęste, walcowate, różowe kłosy (kilka cm) wzniesione nad wodę
export function rdest({ pedy = 5, rozrzut = 1.5, glebia = 1.2, klosy = 3 } = {}) {
  const g = new THREE.Group(), lisc = toon('#ffffff', { map: tekLiscRdestu(), side: THREE.DoubleSide }), ped = toon('#7a5a3a'), roz = toon('#ee74a4'), roz2 = toon('#d4508a'), ziel = toon('#6a8f3e'), kolysz = [];
  const L0 = .3, W0 = .085, sh = new THREE.Shape(); sh.moveTo(0, 0);
  sh.bezierCurveTo(0, W0 * .55, L0 * .2, W0, L0 * .45, W0); sh.bezierCurveTo(L0 * .75, W0, L0 * .92, W0 * .45, L0, 0);
  sh.bezierCurveTo(L0 * .92, -W0 * .45, L0 * .75, -W0, L0 * .45, -W0); sh.bezierCurveTo(L0 * .2, -W0, 0, -W0 * .55, 0, 0);
  const geoL = new THREE.ShapeGeometry(sh, 12); geoL.rotateX(-Math.PI / 2); const uv = geoL.attributes.uv, pp = geoL.attributes.position;
  for (let i = 0; i < uv.count; i++) { uv.setXY(i, pp.getX(i) / L0, .5 - pp.getZ(i) / (2 * W0)); pp.setY(i, .01 * Math.sin(pp.getX(i) / L0 * Math.PI)); }   // lekko wypukła blaszka
  geoL.computeVertexNormals();
  const zajete = [];
  const polozLisc = (x, z, kat, sk, wys) => { const cx = x + Math.cos(kat) * L0 * sk * .55, cz = z - Math.sin(kat) * L0 * sk * .55;
    if (zajete.some(o => Math.hypot(o[0] - cx, o[1] - cz) < (o[2] + sk) * L0 * .3)) return; zajete.push([cx, cz, sk]);
    const l = new THREE.Mesh(geoL, lisc); l.position.set(x, wys, z); l.rotation.y = kat; l.scale.setScalar(sk); g.add(l); };
  for (let k = 0; k < pedy; k++) {
    const a0 = k / pedy * Math.PI * 2 + R() * .7, L = rozrzut * (.55 + R() * .45), pts = [];
    for (let j = 0; j <= 10; j++) { const u = j / 10, a = a0 + .45 * Math.sin(u * 2.2 + k); pts.push(V(Math.cos(a) * L * u, .006, Math.sin(a) * L * u * .75)); }
    const krz = new THREE.CatmullRomCurve3(pts), pd = new THREE.Mesh(new THREE.TubeGeometry(krz, 24, .006, 4), ped); pd.layers.set(3); g.add(pd);
    for (let j = 2; j <= 12; j++) { const u = j / 12, q = krz.getPoint(u), d = krz.getTangent(u), kat = Math.atan2(-d.z, d.x) + (j % 2 ? 1 : -1) * (.55 + .25 * R()), sk = .7 + .35 * u;   // im bliżej końca, tym gęściej i większe
      polozLisc(q.x, q.z, kat, sk, .014 + j * .0003); if (u > .6) polozLisc(q.x, q.z, kat + (j % 2 ? -1.7 : 1.7), sk * .9, .015 + j * .0003); }
    if (k < klosy) { const q = pts[10], kl = new THREE.Group(); kl.add(walec(V(0, 0, 0), V(0, .14, 0), .009, .008, ziel));
      for (let j = 0; j < 34; j++) { const b = new THREE.Mesh(new THREE.SphereGeometry(.017, 7, 5), j % 3 ? roz : roz2), a = j * 2.4, y = .14 + j * .0042; b.position.set(Math.cos(a) * .022 * (1 - j / 60), y, Math.sin(a) * .022 * (1 - j / 60)); kl.add(b); }   // gęsty walcowaty kłos
      kl.position.copy(q); g.add(kl); kolysz.push(kl); }
  }
  g.add(lodygaDoDna(0, 0, glebia, ped, .008));
  g.userData = { kolysz, kolizja: [] }; return g;
}
// rdestnica przeszyta (Potamogeton perfoliatus): zanurzone łodygi od dna, jajowate falujące liście obejmujące łodygę (naprzemiennie)
export function rdestnica({ n = 5, h = 1.6, rozrzut = .5 } = {}) {
  const g = new THREE.Group(), zielona = toon('#4f8a2c'), lisc = toon('#ffffff', { map: tekLiscRdestu(), side: THREE.DoubleSide, transparent: true, opacity: .92 }), kolysz = [];
  const geoL = new THREE.PlaneGeometry(.2, .13, 8, 4), p = geoL.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), u = (x + .1) / .2, szer = Math.sin(Math.PI * Math.min(1, u * .95 + .05)) ** .7;   // jajowaty, sercowata nasada obejmuje łodygę
    p.setXYZ(i, x + .1, y * szer, .012 * Math.sin(u * 12) * Math.abs(y) / .065); }                                                                  // falisty brzeg
  geoL.computeVertexNormals();
  for (let i = 0; i < n; i++) { const pl = new THREE.Group(), x = (R() - .5) * rozrzut * 2, z = (R() - .5) * rozrzut, hh = h * (.7 + R() * .4), f = R() * 6, pts = [];
    for (let j = 0; j <= 8; j++) { const u = j / 8; pts.push(V(Math.sin(u * 3 + f) * .1 * u, u * hh, Math.cos(u * 2.5 + f) * .07 * u)); }
    const krz = new THREE.CatmullRomCurve3(pts); pl.add(lodyga(pts, .011, zielona));
    for (let j = 1; j < 12; j++) { const u = j / 12, q = krz.getPoint(u), l = new THREE.Mesh(geoL, lisc); l.position.copy(q); l.rotation.set((R() - .5) * .4, j * 2.4, (j % 2 ? 1 : -1) * (.35 + R() * .25)); l.scale.setScalar(.75 + .45 * Math.sin(u * 3)); pl.add(l); }
    pl.position.set(x, 0, z); g.add(pl); kolysz.push(pl); }
  g.userData = { kolysz, kolizja: [{ x: 0, z: 0, r: rozrzut + .2, top: h * .5 }] }; return g;
}
// rogatek: gęste okółki cienkich widlastych liści na łodydze („lisi ogon”), ciemnozielony
export function rogatek({ n = 4, h = 1.2, rozrzut = .4 } = {}) {
  const g = new THREE.Group(), zielona = toon('#2f6a26'), jasna = toon('#3f7d2c'), kolysz = [];
  const igla = new THREE.CylinderGeometry(.004, .006, .16, 3);
  for (let i = 0; i < n; i++) { const pl = new THREE.Group(), hh = h * (.7 + R() * .5), f = R() * 6, pts = [];
    for (let j = 0; j <= 6; j++) { const u = j / 6; pts.push(V(Math.sin(u * 2.5 + f) * .12 * u, u * hh, Math.cos(u * 2 + f) * .08 * u)); }
    const krz = new THREE.CatmullRomCurve3(pts); pl.add(lodyga(pts, .01, zielona));
    for (let j = 2; j < 26; j++) { const u = j / 26, q = krz.getPoint(u), dl = .55 + .45 * Math.sin(u * Math.PI);   // okółki gęstsze i dłuższe w środku
      for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2 + j, m = new THREE.Mesh(igla, k % 2 ? zielona : jasna); m.scale.y = dl; m.position.copy(q).add(V(Math.cos(a) * .06 * dl, 0, Math.sin(a) * .06 * dl)); m.rotation.set(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2); pl.add(m); } }
    pl.position.set((R() - .5) * rozrzut * 2, 0, (R() - .5) * rozrzut); g.add(pl); kolysz.push(pl); }
  g.userData = { kolysz, kolizja: [{ x: 0, z: 0, r: rozrzut + .2, top: h * .55 }] }; return g;
}
// liść taśmowaty (pałka, trzcina): płaska, lekko skręcona i wygięta wstęga
function wstega(dl, szer, mat, wyg = .3, skret = .8) {
  const geo = new THREE.PlaneGeometry(szer, dl, 1, 10); geo.translate(0, dl / 2, 0); const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i), u = y / dl, x = p.getX(i) * (1 - u * .85), a = u * skret; p.setXYZ(i, x * Math.cos(a), y, x * Math.sin(a) + wyg * dl * u * u); }
  geo.computeVertexNormals(); return new THREE.Mesh(geo, mat);
}
// pałka wodna: kępa taśmowatych liści i łodygi z brązową kolbą (z cienkim szczytem)
export function palka({ n = 8, h = 2, rozrzut = .5 } = {}) {
  const g = new THREE.Group(), lisc = toon('#6f9e3c', { side: THREE.DoubleSide }), lisc2 = toon('#8bb24e', { side: THREE.DoubleSide }), zielona = toon('#7f9c48'), braz = toon('#5a3a22'), kolysz = [];
  // liście: długie, sztywne, szerokie taśmy – wyprostowane, tylko szczyt lekko przewieszony
  for (let i = 0; i < n * 2; i++) { const w = liscLukowy(h * (.75 + R() * .45), .085, i % 2 ? lisc : lisc2, .04 + R() * .18, .25 + R() * .55, 14); w.position.set((R() - .5) * rozrzut * 2, 0, (R() - .5) * rozrzut); w.rotation.y = R() * 6; g.add(w); kolysz.push(w); }
  for (let k = 0; k < Math.ceil(n / 3); k++) { const kl = new THREE.Group(), hh = h * (.85 + R() * .3); kl.add(walec(V(0, 0, 0), V(0, hh, 0), .02, .014, zielona));
    const kolba = new THREE.Mesh(new THREE.CapsuleGeometry(.045, .24, 4, 10), braz); kolba.position.y = hh - .02; kl.add(kolba); kl.add(walec(V(0, hh + .12, 0), V(0, hh + .3, 0), .006, .003, zielona));
    kl.position.set((R() - .5) * rozrzut * 1.5, 0, (R() - .5) * rozrzut); g.add(kl); kolysz.push(kl); }
  g.userData = { kolysz, kolizja: [{ x: 0, z: 0, r: rozrzut + .2, top: .6 }] }; return g;
}
// liść trawiasty (trzcina, mozga): blaszka wychodzi z łodygi skośnie w górę i łukiem opada; szeroka u nasady, zwęża się do ostrego szczytu
function liscLukowy(dl, szer, mat, kat0 = .5, luk = 1.4, n = 12) {
  const pts = [], P = V(0, 0, 0); let th = kat0;
  for (let i = 0; i <= n; i++) { pts.push(P.clone()); const u = i / n; th = kat0 + luk * u * u; P.x += Math.sin(th) * dl / n; P.y += Math.cos(th) * dl / n; }
  const poz = [], idx = [];
  pts.forEach((q, i) => { const u = i / n, a = kat0 + luk * u * u, w = szer * (i === n ? 0 : Math.min(1, .55 + u * 2) * (1 - u * .92)) / 2, nx = Math.cos(a), ny = -Math.sin(a);
    poz.push(q.x - nx * w * .3, q.y - ny * w * .3, -w, q.x + nx * w * .3, q.y + ny * w * .3, w); if (i) { const b = (i - 1) * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); } });
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat);
}
// trzcina pospolita (Phragmites australis): sztywne źdźbła (2–3 m), liście szerokie (2–4 cm), długie, łukowato odstające na całej wysokości,
// na szczycie wiecha – gęsta, pierzasta, fioletowobrązowa, przewieszona na jedną stronę (tę samą w całej kępie – wiatr)
export function trzcina({ n = 10, h = 2.6, rozrzut = .8 } = {}) {
  const g = new THREE.Group(), zielona = toon('#a6c45e'), lisc = toon('#7aa83c', { side: THREE.DoubleSide }), lisc2 = toon('#93b84f', { side: THREE.DoubleSide }), sucha = toon('#b7a46a', { side: THREE.DoubleSide }),
    wiecha = toon('#7d5a6a'), wiecha2 = toon('#a8848a'), wiecha3 = toon('#c4a98a'), kolysz = [], wiatr = R() * 6;
  for (let i = 0; i < n; i++) { const pl = new THREE.Group(), hh = h * (.75 + R() * .4); pl.add(walec(V(0, 0, 0), V(0, hh, 0), .026, .014, zielona));
    for (let j = 0; j < 9; j++) { const u = .12 + j * .085, m = j < 2 ? sucha : j % 2 ? lisc : lisc2, w = liscLukowy(.5 + R() * .25 - u * .15, .075, m, .45 + R() * .35, 1.1 + R() * .7);
      w.position.y = hh * u; w.rotation.y = j * 2.4 + R() * .6; pl.add(w); }                         // liście naprzemianległe, dookoła źdźbła
    const os = new THREE.CatmullRomCurve3([V(0, hh, 0), V(.04, hh + .14, 0), V(.13, hh + .24, 0), V(.24, hh + .27, 0)]), wi = new THREE.Group();   // oś wiechy przewieszona
    wi.add(new THREE.Mesh(new THREE.TubeGeometry(os, 8, .006, 4), zielona));
    for (let j = 0; j < 40; j++) { const t = .08 + .92 * j / 39, q = os.getPoint(t), d = os.getTangent(t), b = new THREE.Mesh(new THREE.SphereGeometry(.032, 6, 4), [wiecha, wiecha2, wiecha3][j % 3]);
      const a = j * 2.4; b.scale.set(.45, 2.2 - t * .9, .45); b.position.copy(q).add(V(Math.cos(a) * .02, -.03, Math.sin(a) * .025));
      b.quaternion.setFromUnitVectors(V(0, 1, 0), d.clone().add(V(Math.cos(a) * .5, -.9, Math.sin(a) * .5)).normalize().negate()); b.layers.set(3); wi.add(b); }   // bez tuszu – wiecha ma być miękka, puszysta   // kłoski zwisają w dół i na boki
    wi.rotation.y = wiatr - (i * .37 % 1 - .5) * .3; wi.position.set(0, 0, 0); pl.add(wi);
    pl.position.set((R() - .5) * rozrzut * 2, 0, (R() - .5) * rozrzut); pl.rotation.z = (R() - .5) * .1; g.add(pl); kolysz.push(pl); }
  g.userData = { kolysz, kolizja: [{ x: 0, z: 0, r: rozrzut + .2, top: 1.2 }] }; return g;
}
// ważka (żagnica, np. Aeshna): model 3D – głowa z wielkimi oczami złożonymi, zielony tułów z paskami, nogi, długi odwłok
// w niebiesko-czarne pierścienie, 4 przezroczyste skrzydła z żyłkowaniem i plamką (pterostygmą). Oś ciała: +x = głowa.
// anim(t, { mach }) – skrzydła machają wokół osi ciała (amplituda ±70°), przednia i tylna para w przeciwfazie.
export function wazka({ dl = .3 } = {}) {
  const g = new THREE.Group(), k = dl / .3, oko = toon('#1f9fc4'), oko2 = toon('#7fd7e8'), tul = toon('#3f8a3a'), pas = toon('#d8dc52'), niebieski = toon('#2f86d8'), czarny = toon('#141a22'), noga = toon('#1d1d1d');
  const kula = (r, m, x, y, z, sx = 1, sy = 1, sz = 1) => { const o = new THREE.Mesh(new THREE.SphereGeometry(r * k, 14, 10), m); o.position.set(x * k, y * k, z * k); o.scale.set(sx, sy, sz); g.add(o); return o; };
  kula(.024, oko, .118, .006, .016, 1, 1.05, 1); kula(.024, oko, .118, .006, -.016, 1, 1.05, 1); kula(.009, oko2, .128, .016, .02); kula(.009, oko2, .128, .016, -.02);   // oczy złożone z blikiem
  kula(.014, toon('#2c6a3a'), .136, -.008, 0, 1.2, .9, 1.1);                                                                             // twarz
  kula(.026, tul, .08, .002, 0, 1.55, 1.1, .85);                                                                                         // tułów: smukły, wydłużony
  for (const z of [-.012, .012]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.004 * k, .004 * k, .05 * k, 6), pas); p.position.set(.08 * k, .01 * k, z * k); p.rotation.z = 1.1; g.add(p); }   // jasne paski na tułowiu
  for (let i = 0; i < 10; i++) { const x = .045 - i * .022, r = (i === 1 ? .0085 : i === 0 ? .011 : .0102 - i * .0003);                // odwłok: 10 wydłużonych segmentów, przewężenie przy nasadzie
    kula(r, i < 2 || i % 3 === 2 ? niebieski : i % 3 === 0 ? niebieski : toon('#3a9ae0'), x, -.003 - i * .0011, 0, 1.75, 1, 1);
    kula(r * 1.04, czarny, x - .0115, -.003 - i * .0011, 0, .32, 1, 1); }                                                                 // cienkie czarne pierścienie na stykach
  for (const z of [-.006, .006]) { const c = new THREE.Mesh(new THREE.ConeGeometry(.004 * k, .02 * k, 5), czarny); c.position.set(-.175 * k, -.016 * k, z * k); c.rotation.z = Math.PI / 2; g.add(c); }   // przydatki odwłoka
  for (let i = 0; i < 3; i++) for (const z of [-1, 1]) { const pts = [new THREE.Vector3((.092 - i * .012) * k, -.02 * k, z * .008 * k), new THREE.Vector3((.104 - i * .01) * k, -.032 * k, z * .016 * k), new THREE.Vector3((.122 - i * .008) * k, -.036 * k, z * .018 * k)];   // nogi podkulone do przodu (w locie)
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 6, .0022 * k, 4), noga)); }   // 3 pary nóg złożone pod tułowiem (koszyk)
  // skrzydło: tekstura z żyłkowaniem i pterostygmą
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const c = cv.getContext('2d');
  const obrys = () => { c.beginPath(); c.moveTo(4, 26); c.bezierCurveTo(60, 6, 200, 6, 250, 26); c.bezierCurveTo(252, 40, 200, 56, 120, 56); c.bezierCurveTo(60, 56, 20, 46, 4, 36); c.closePath(); };
  obrys(); c.fillStyle = 'rgba(220,238,250,.45)'; c.fill(); c.save(); obrys(); c.clip();
  c.strokeStyle = 'rgba(40,55,70,.55)'; c.lineWidth = 1.4; for (let y = 14; y < 58; y += 6) { c.beginPath(); c.moveTo(4, 31); c.quadraticCurveTo(120, y, 250, y * .7 + 8); c.stroke(); }
  c.lineWidth = 1; for (let x = 20; x < 250; x += 9) { c.beginPath(); c.moveTo(x, 6); c.lineTo(x + 4, 58); c.stroke(); }
  c.fillStyle = '#3a2a1a'; c.fillRect(214, 14, 16, 6); c.restore(); obrys(); c.lineWidth = 3; c.strokeStyle = 'rgba(20,26,34,.9)'; c.stroke();
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false });
  const skrzydla = [];
  for (const [x, dlS, faza] of [[.088, .15, 0], [.066, .14, Math.PI * .85]]) for (const str of [-1, 1]) {
    const geo = new THREE.PlaneGeometry(dlS * k, .036 * k); geo.translate(dlS * k / 2, 0, 0); geo.rotateX(-Math.PI / 2); geo.rotateY(str > 0 ? -Math.PI / 2 : Math.PI / 2);   // skrzydło od nasady w bok (oś z)
    const w = new THREE.Mesh(geo, mat); const zaw = new THREE.Group(); zaw.position.set(x * k, .022 * k, 0); zaw.add(w); g.add(zaw); w.layers.set(3); skrzydla.push([zaw, str, faza]); }
  g.userData = { kolysz: [], kolizja: [], anim: (t, { mach = 1 } = {}) => {
    for (const [zaw, str, faza] of skrzydla) zaw.rotation.x = str * (.15 + .9 * mach * Math.sin(t * 2 * Math.PI * 7 + faza)); } };   // 7 machnięć/s (czytelne w 30 kl./s)
  return g;
}
// mewa (śmieszka / mewa pospolita): biały tułów, szaro-popielate skrzydła z czarnymi końcami, żółty dziób; oś ciała +x = głowa
// anim(t, { mach }) – machanie skrzydłami; skrzydła złożone (mach = 0) przy nurkowaniu
// Mewa (styl kreskówkowy, jak ryby: kolor + rysowany obrys): gładki tułów z głową w jednej bryle (bez szwów, które kompozycja rysowała jako kreski),
// szary płaszcz na grzbiecie malowany kolorem wierzchołków, żółty zakrzywiony dziób z czerwoną plamką, skrzydła z dwóch członów (ramię + dłoń)
// i ogon z namalowanym wzorem i ciemnym obrysem (poza krawędzią przy tułowiu). Ruch: machanie, szybowanie, nurkowanie.
function mewaTekstura(rodzaj, uvObrys) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), W = 256;
  // u = rozpiętość (0 = nasada → 1 = koniec), v = cięciwa (0 = krawędź spływu → 1 = krawędź natarcia); canvas: y odwrócone
  if (rodzaj === 'ogon') { x.fillStyle = '#f6f8fa'; x.fillRect(0, 0, W, W); }
  else {
    const g = x.createLinearGradient(0, W, 0, 0); g.addColorStop(0, '#ffffff'); g.addColorStop(.16, '#ffffff'); g.addColorStop(.21, '#b4c0cc'); g.addColorStop(.8, '#bcc7d2'); g.addColorStop(1, '#cfd8e0');
    x.fillStyle = g; x.fillRect(0, 0, W, W);
    if (rodzaj === 'dlon') {
      x.fillStyle = '#1b1f26'; x.beginPath(); x.moveTo(W * .5, W); x.quadraticCurveTo(W * .58, W * .5, W * .62, 0); x.lineTo(W, 0); x.lineTo(W, W); x.closePath(); x.fill();
      x.fillStyle = '#ffffff'; for (const [u, v, r] of [[.78, .55, .07], [.9, .42, .05]]) { x.beginPath(); x.ellipse(u * W, (1 - v) * W, r * W * 1.3, r * W, 0, 0, 7); x.fill(); }
      x.strokeStyle = 'rgba(0,0,0,.18)'; x.lineWidth = 3; for (let u = .55; u < .98; u += .07) { x.beginPath(); x.moveTo(u * W, W); x.lineTo((u + .05) * W, W * .35); x.stroke(); }   // lotki
    } else { x.strokeStyle = 'rgba(70,85,100,.22)'; x.lineWidth = 3; for (let u = .1; u < 1; u += .12) { x.beginPath(); x.moveTo(u * W, W); x.lineTo((u + .03) * W, W * .62); x.stroke(); } }
  }
  // obrys: krawędzie kształtu poza nasadą (u ≈ 0 – tam skrzydło łączy się z tułowiem / ramieniem)
  x.strokeStyle = '#241726'; x.lineWidth = 16; x.lineCap = x.lineJoin = 'round';
  for (let i = 0; i < uvObrys.length; i++) { const [u1, v1] = uvObrys[i], [u2, v2] = uvObrys[(i + 1) % uvObrys.length]; if (u1 < .02 && u2 < .02) continue; if (rodzaj === 'ramie' && u1 > .98 && u2 > .98) continue;   // styk ramienia z dłonią – bez kreski w poprzek skrzydła
    x.beginPath(); x.moveTo(u1 * W, (1 - v1) * W); x.lineTo(u2 * W, (1 - v2) * W); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
export function mewa({ dl = .5 } = {}) {
  const g = new THREE.Group(), k = dl / .5, dziobM = toon('#f4c430'), czerw = toon('#e0402a'), oko = toon('#111111'), blik = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const kula = (r, m, x, y, z, sx = 1, sy = 1, sz = 1, rodzic = g) => { const o = new THREE.Mesh(new THREE.SphereGeometry(r * k, 24, 16), m); o.position.set(x * k, y * k, z * k); o.scale.set(sx, sy, sz); rodzic.add(o); return o; };
  // tułów + szyja + głowa: gładki profil toczony wzdłuż osi X (ogon → dziób), głowa uniesiona łagodnym wygięciem osi
  const prof = new THREE.SplineCurve([[0, -.215], [.03, -.19], [.052, -.13], [.072, -.06], [.08, .0], [.074, .06], [.056, .105], [.046, .13], [.05, .16], [.054, .185], [.046, .215], [.026, .238], [0, .248]].map(([r, y]) => new THREE.Vector2(r, y))).getPoints(60);
  const tg = new THREE.LatheGeometry(prof.map(v => new THREE.Vector2(Math.max(v.x, 0) * k, v.y * k)), 56); tg.rotateZ(-Math.PI / 2);
  const P = tg.attributes.position, kol = [], sm2 = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  for (let i = 0; i < P.count; i++) { const X = P.getX(i) / k; P.setY(i, P.getY(i) * .92 + .034 * k * sm2(.07, .17, X)); P.setZ(i, P.getZ(i) * .86); }
  tg.computeVertexNormals(); const N = tg.attributes.normal;
  const bialy = new THREE.Color('#f6f8fa'), szary = new THREE.Color('#b4c0cc');
  for (let i = 0; i < P.count; i++) { const X = P.getX(i) / k, ny = N.getY(i), w = sm2(-.05, .4, ny) * sm2(-.17, -.1, X) * (1 - sm2(.05, .11, X)); const c = bialy.clone().lerp(szary, w); kol.push(c.r, c.g, c.b); }   // płaszcz na grzbiecie
  tg.setAttribute('color', new THREE.Float32BufferAttribute(kol, 3));
  g.add(new THREE.Mesh(tg, toon('#ffffff', { vertexColors: true })));
  const gl = [.185, .034, 0];   // środek głowy (po wygięciu osi)
  for (const s of [-1, 1]) { kula(.011, oko, gl[0] + .012, gl[1] + .008, s * .042, 1, 1.1, .55); kula(.0035, blik, gl[0] + .016, gl[1] + .013, s * .047); }   // oczy z blikiem
  const dz = new THREE.Shape(); dz.moveTo(0, .016); dz.quadraticCurveTo(.05, .02, .085, .006); dz.quadraticCurveTo(.095, -.006, .084, -.014); dz.lineTo(.07, -.006); dz.quadraticCurveTo(.04, -.014, 0, -.016); dz.closePath();
  const dg = new THREE.ExtrudeGeometry(dz, { depth: .02, bevelEnabled: true, bevelSize: .005, bevelThickness: .005, bevelSegments: 4, curveSegments: 16 }); dg.translate(0, 0, -.01); dg.scale(k, k, k);
  const dziob = new THREE.Mesh(dg, dziobM); dziob.position.set(.222 * k, (gl[1] - .012) * k, 0); g.add(dziob);
  kula(.006, czerw, .3, gl[1] - .024, 0, 1.2, 1, 2.6);                                         // czerwona plamka na żuchwie
  // płaskie części z wzorem i obrysem: obrys (X wzdłuż rozpiętości, Y wzdłuż tułowia) → wierzchołki (x = Y, z = ±X), lekko wygięte w łuk (profil skrzydła)
  const plaski = (obrys, dl, rodzaj, str, luk = .012) => { const sh = new THREE.Shape(); sh.moveTo(...obrys[0]); for (let i = 1; i < obrys.length; i++) obrys[i].length === 4 ? sh.quadraticCurveTo(...obrys[i]) : sh.lineTo(...obrys[i]); sh.closePath();
    const pk = sh.getPoints(24); let y0 = 1e9, y1 = -1e9; for (const p of pk) { y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
    const geo = new THREE.ShapeGeometry(sh, 24), Q = geo.attributes.position, UV = geo.attributes.uv;
    for (let i = 0; i < Q.count; i++) { const X = Q.getX(i), Y = Q.getY(i), v = (Y - y0) / (y1 - y0); UV.setXY(i, X / dl, v); Q.setXYZ(i, Y * k, luk * Math.sin(Math.PI * v) * k, str * X * k); }
    geo.computeVertexNormals(); return new THREE.Mesh(geo, toon('#ffffff', { map: mewaTekstura(rodzaj, pk.map(p => [p.x / dl, (p.y - y0) / (y1 - y0)])), side: THREE.DoubleSide })); };
  // ogon: wachlarz za tułowiem (X = połowa szerokości, symetrycznie po obu stronach)
  for (const str of [-1, 1]) { const o = plaski([[0, 0], [.05, -.004, .056, -.06], [.03, -.085, 0, -.088]], .06, 'ogon', str, .004); o.position.set(-.17 * k, .008 * k, 0); g.add(o); }
  const RAMIE = [[0, .06], [.2, .055], [.2, -.06], [.1, -.075, 0, -.09]];
  const DLON = [[0, .055], [.16, .04, .27, -.06], [.24, -.07, .18, -.065], [.08, -.06, 0, -.06]];
  const skrzydla = [];
  for (const str of [-1, 1]) { const ram = new THREE.Group(); ram.position.set(.01 * k, .05 * k, str * .042 * k); g.add(ram);
    ram.add(plaski(RAMIE, .2, 'ramie', str));
    const dlon = new THREE.Group(); dlon.position.set(0, 0, str * .198 * k); ram.add(dlon); dlon.add(plaski(DLON, .27, 'dlon', str));
    skrzydla.push({ ram, dlon, str }); }
  g.userData = { kolysz: [], kolizja: [], anim: (t, { mach = 1, szybuj = false, zloz, szyb } = {}) => {
    // pozy skrzydeł mieszane płynnie (bez przeskoków): machanie, szybowanie (płytkie „M”), złożone do nurka; zloz/szyb 0..1 (stare mach/szybuj nadal działają)
    const Z = zloz ?? (mach === 0 ? 1 : 0), S = szyb ?? (szybuj ? 1 : 0), w = t * 2 * Math.PI * 2.6;
    for (const { ram, dlon, str } of skrzydla) {
      const m = [.12 + .62 * Math.sin(w), -.1 + .55 * Math.sin(w - .9), .1 - .08 * Math.sin(w)], s2 = [.14 + .03 * Math.sin(t * 2), -.2, .12], d = [.35, -.2, .9];
      const [a, b, sw] = m.map((v, k) => { const q = v + (s2[k] - v) * S; return q + (d[k] - q) * Z; });
      ram.rotation.set(-str * a, -str * sw, 0); dlon.rotation.set(-str * b, -str * sw * .6, 0); }
  } };
  return g;
}
export const REKWIZYTY = { kamien, rumosz, kloda, grzybien, grazel, rdest, rdestnica, rogatek, palka, trzcina, wazka, mewa };
