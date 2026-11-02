// Biblioteka rekwizytów 3D (Wiśnia Wędkuje): kamienie, kłody i roślinność wodna do wielokrotnego użytku.
// Styl: cieniowanie toon (jak świat w silnik.js), tusz dorysowuje kompozycja; kolory naturalne, detale w teksturach Canvas.
// Każda funkcja zwraca THREE.Group z podstawą w y = 0 (w scenie stawiamy ją na dnie / tafli), a w userData:
//   kolysz   – lista obiektów, które silnik kołysze (rośliny, łodygi),
//   kolizja  – [{ x, z, r, top }] względem środka grupy: przeszkody dla ryb (silnik dopisuje je do `kamienie`).
// Rośliny (polskie wody):
//   grzybien (lilia wodna, Nymphaea alba) – pływające okrągłe liście z wycięciem, biały kwiat, długie łodygi do dna
//   grazel (grążel żółty, Nuphar lutea)   – sercowate liście, żółty kulisty kwiat nad wodą
//   rdest (rdest ziemnowodny, Persicaria amphibia) – pływające lancetowate liście, różowe kłosy kwiatów nad wodą
//   rdestnica (Potamogeton)               – zanurzone długie łodygi z naprzemiennymi, półprzezroczystymi liśćmi
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
  const geo = new THREE.IcosahedronGeometry(r, 2).toNonIndexed(), pos = geo.attributes.position, f = R() * 10;
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
function lodygaDoDna(x, z, glebia, mat, r = .012) {
  const pts = []; for (let i = 0; i <= 6; i++) { const u = i / 6; pts.push(V(x + Math.sin(u * 4 + x) * .18 * u, -glebia * (1 - u), z + Math.cos(u * 3 + z) * .14 * u)); }
  return lodyga(pts, r, mat);
}
// grzybień biały (lilia wodna): kępa liści na tafli, 0–2 kwiaty, łodygi do dna
export function grzybien({ n = 7, rozrzut = 1.6, glebia = 1.5, kwiaty = 2 } = {}) {
  const g = new THREE.Group(), lisc = toon('#ffffff', { map: tekLisc('#3f7f2c', 'radialne', 2), side: THREE.DoubleSide }), spod = toon('#7a4a3a'), zielona = toon('#4f7a34');
  for (let i = 0; i < n; i++) { const r = .32 + R() * .22, x = (R() - .5) * rozrzut * 2, z = (R() - .5) * rozrzut * 1.4;
    const l = liscPlywajacy(r, lisc); l.position.set(x, .012, z); l.rotation.y = R() * 6; g.add(l);
    const s = liscPlywajacy(r * .98, spod); s.position.set(x, .004, z); s.rotation.copy(l.rotation); s.rotation.x = Math.PI; g.add(s);   // czerwonawy spód liścia
    g.add(lodygaDoDna(x, z, glebia, zielona)); }
  const plat = toon('#fbfbf6', { side: THREE.DoubleSide }), srodek = toon('#f2c33a');
  for (let k = 0; k < kwiaty; k++) { const kx = (R() - .5) * rozrzut, kz = (R() - .5) * rozrzut * .8, kw = new THREE.Group();
    for (let w = 0; w < 3; w++) for (let i = 0; i < 9; i++) { const pl = new THREE.Mesh(new THREE.SphereGeometry(.09, 10, 6), plat); pl.scale.set(.42, .18, 1.1 - w * .18);
      const a = i / 9 * Math.PI * 2 + w * .35; pl.position.set(Math.cos(a) * (.11 - w * .03), .05 + w * .045, Math.sin(a) * (.11 - w * .03)); pl.rotation.set(0, -a + Math.PI / 2, 0); pl.rotateX(-.35 - w * .35); kw.add(pl); }
    const sr = new THREE.Mesh(new THREE.CylinderGeometry(.045, .04, .05, 12), srodek); sr.position.y = .11; kw.add(sr);
    kw.position.set(kx, 0, kz); g.add(kw); g.add(lodygaDoDna(kx, kz, glebia, zielona)); }
  g.userData = { kolysz: [], kolizja: [] }; return g;
}
// grążel żółty: większe, sercowate liście, kulisty żółty kwiat na łodydze nad wodą
export function grazel({ n = 5, rozrzut = 1.4, glebia = 1.6, kwiaty = 2 } = {}) {
  const g = new THREE.Group(), lisc = toon('#ffffff', { map: tekLisc('#4f8a30', 'radialne'), side: THREE.DoubleSide }), zielona = toon('#5a8a34'), zolty = toon('#f2c21a'), ciemnoz = toon('#c99a12');
  for (let i = 0; i < n; i++) { const r = .38 + R() * .2, x = (R() - .5) * rozrzut * 2, z = (R() - .5) * rozrzut * 1.4; const l = liscPlywajacy(r, lisc, { serce: true }); l.position.set(x, .012, z); l.rotation.y = R() * 6; g.add(l); g.add(lodygaDoDna(x, z, glebia, zielona)); }
  for (let k = 0; k < kwiaty; k++) { const kx = (R() - .5) * rozrzut, kz = (R() - .5) * rozrzut, kw = new THREE.Group();
    kw.add(walec(V(0, 0, 0), V(.02, .22, 0), .012, .01, zielona));
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, pl = new THREE.Mesh(new THREE.SphereGeometry(.07, 10, 8), zolty); pl.scale.set(.75, 1, .55); pl.position.set(Math.cos(a) * .05, .27, Math.sin(a) * .05); pl.lookAt(0, .27, 0); kw.add(pl); }
    const sr = new THREE.Mesh(new THREE.CylinderGeometry(.03, .04, .04, 10), ciemnoz); sr.position.y = .31; kw.add(sr);
    kw.position.set(kx, 0, kz); g.add(kw); g.add(lodygaDoDna(kx, kz, glebia, zielona)); g.userData.kolysz = [kw]; }
  g.userData = { kolysz: g.userData.kolysz || [], kolizja: [] }; return g;
}
// rdest ziemnowodny: lancetowate liście na tafli, różowe kłosy kwiatów 15–25 cm nad wodą, cienkie łodygi w dół
export function rdest({ n = 12, rozrzut = 1.5, glebia = 1.2, klosy = 4 } = {}) {
  const g = new THREE.Group(), lisc = toon('#ffffff', { map: tekLisc('#4d8a3a', 'pierzaste'), side: THREE.DoubleSide }), zielona = toon('#6a8f3e'), roz = toon('#e46a9a'), roz2 = toon('#c94c7e');
  const ksz = new THREE.Shape(); ksz.moveTo(-.22, 0); ksz.quadraticCurveTo(0, .07, .22, 0); ksz.quadraticCurveTo(0, -.07, -.22, 0);
  const geoL = new THREE.ShapeGeometry(ksz, 8); geoL.rotateX(-Math.PI / 2);
  const uv = geoL.attributes.uv, p = geoL.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) + .22) / .44, (p.getZ(i) + .07) / .14);
  const lodygi = [];
  for (let i = 0; i < n; i++) { const x = (R() - .5) * rozrzut * 2, z = (R() - .5) * rozrzut * 1.3, l = new THREE.Mesh(geoL, lisc); l.position.set(x, .012, z); l.rotation.y = R() * 6; l.scale.setScalar(.8 + R() * .5); g.add(l);
    if (i % 2 === 0) g.add(lodygaDoDna(x, z, glebia, zielona, .008)); }
  for (let k = 0; k < klosy; k++) { const kx = (R() - .5) * rozrzut, kz = (R() - .5) * rozrzut, kl = new THREE.Group(); kl.add(walec(V(0, 0, 0), V(0, .14, 0), .008, .007, zielona));
    for (let j = 0; j < 14; j++) { const b = new THREE.Mesh(new THREE.SphereGeometry(.022, 6, 5), j % 3 ? roz : roz2); const a = j * 2.4; b.position.set(Math.cos(a) * .022, .14 + j * .011, Math.sin(a) * .022); kl.add(b); }
    kl.position.set(kx, 0, kz); g.add(kl); lodygi.push(kl); }
  g.userData = { kolysz: lodygi, kolizja: [] }; return g;
}
// rdestnica: zanurzone łodygi od dna prawie do tafli, naprzemienne podłużne, półprzezroczyste liście
export function rdestnica({ n = 5, h = 1.6, rozrzut = .5 } = {}) {
  const g = new THREE.Group(), zielona = toon('#4f8a2c'), lisc = toon('#6fa83c', { side: THREE.DoubleSide, transparent: true, opacity: .9 }), kolysz = [];
  const ksz = new THREE.Shape(); ksz.moveTo(0, 0); ksz.quadraticCurveTo(.05, .12, 0, .26); ksz.quadraticCurveTo(-.05, .12, 0, 0); const geoL = new THREE.ShapeGeometry(ksz, 6);
  for (let i = 0; i < n; i++) { const pl = new THREE.Group(), x = (R() - .5) * rozrzut * 2, z = (R() - .5) * rozrzut, hh = h * (.7 + R() * .4), f = R() * 6, pts = [];
    for (let j = 0; j <= 8; j++) { const u = j / 8; pts.push(V(Math.sin(u * 3 + f) * .1 * u, u * hh, Math.cos(u * 2.5 + f) * .07 * u)); }
    pl.add(lodyga(pts, .012, zielona));
    for (let j = 1; j < 14; j++) { const u = j / 14, q = new THREE.CatmullRomCurve3(pts).getPoint(u), l = new THREE.Mesh(geoL, lisc); l.position.copy(q); l.rotation.set(0, j * 2.2, (j % 2 ? 1 : -1) * (.9 + R() * .3)); l.scale.setScalar(.8 + .5 * Math.sin(u * 3)); pl.add(l); }
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
  const g = new THREE.Group(), lisc = toon('#6e9a3a', { side: THREE.DoubleSide }), lisc2 = toon('#86a848', { side: THREE.DoubleSide }), zielona = toon('#6a8a3a'), braz = toon('#5a3a22'), kolysz = [];
  for (let i = 0; i < n; i++) { const w = wstega(h * (.8 + R() * .4), .06, i % 2 ? lisc : lisc2, (R() - .5) * .5, (R() - .5) * 1.6); w.position.set((R() - .5) * rozrzut * 2, 0, (R() - .5) * rozrzut); w.rotation.y = R() * 6; g.add(w); kolysz.push(w); }
  for (let k = 0; k < Math.ceil(n / 3); k++) { const kl = new THREE.Group(), hh = h * (.85 + R() * .3); kl.add(walec(V(0, 0, 0), V(0, hh, 0), .014, .011, zielona));
    const kolba = new THREE.Mesh(new THREE.CapsuleGeometry(.045, .24, 4, 10), braz); kolba.position.y = hh - .02; kl.add(kolba); kl.add(walec(V(0, hh + .12, 0), V(0, hh + .3, 0), .006, .003, zielona));
    kl.position.set((R() - .5) * rozrzut * 1.5, 0, (R() - .5) * rozrzut); g.add(kl); kolysz.push(kl); }
  g.userData = { kolysz, kolizja: [{ x: 0, z: 0, r: rozrzut + .2, top: .6 }] }; return g;
}
// trzcina: wysokie łodygi z liśćmi odchodzącymi w bok i pierzastą wiechą na szczycie
export function trzcina({ n = 10, h = 2.6, rozrzut = .8 } = {}) {
  const g = new THREE.Group(), zielona = toon('#8bb84a'), lisc = toon('#7fae3d', { side: THREE.DoubleSide }), wiecha = toon('#8a6a7a'), wiecha2 = toon('#a88a8a'), kolysz = [];
  for (let i = 0; i < n; i++) { const pl = new THREE.Group(), hh = h * (.75 + R() * .4); pl.add(walec(V(0, 0, 0), V(0, hh, 0), .02, .012, zielona));
    for (let j = 0; j < 4; j++) { const w = wstega(.45 + R() * .2, .045, lisc, .5, .4); w.position.y = hh * (.35 + j * .14); w.rotation.set(0, R() * 6, -.9 - R() * .3); pl.add(w); }
    for (let j = 0; j < 9; j++) { const a = j / 9 * Math.PI * 2, b = new THREE.Mesh(new THREE.SphereGeometry(.05, 6, 5), j % 2 ? wiecha : wiecha2); b.scale.set(.5, 2.6, .5); b.position.set(Math.cos(a) * .05, hh + .12 + (j % 3) * .05, Math.sin(a) * .05); b.rotation.set(Math.sin(a) * .4, 0, -Math.cos(a) * .4 - .25); pl.add(b); }
    pl.position.set((R() - .5) * rozrzut * 2, 0, (R() - .5) * rozrzut); pl.rotation.z = (R() - .5) * .12; g.add(pl); kolysz.push(pl); }
  g.userData = { kolysz, kolizja: [{ x: 0, z: 0, r: rozrzut + .2, top: 1.2 }] }; return g;
}
export const REKWIZYTY = { kamien, rumosz, kloda, grzybien, grazel, rdest, rdestnica, rogatek, palka, trzcina };
