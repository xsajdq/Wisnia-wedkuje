// Silnik filmów 2.5D Wiśnia Wędkuje: świat 3D bez krawędzi (jezioro, rzeka), woda w kompozycji (split na tafli),
// tusz, postacie i przynęty 2D, efekty, żyłka, kamera, kolizje ryb, animacja klatka po klatce, przejścia falą.
// Film: plik atlas3d/<film>.html importuje stąd narzędzia, definiuje SCENY i woła uruchom({...}).
// Opis zasad: .claude/skills/wisnia-animacja-2-5d/SKILL.md
import * as THREE from 'three';
import { stworzOkonia, stworzSzczupaka, stworzWedkarza, stworzPlotke, stworzUkleje, POSTACIE, INK } from './postacie.js';
import { PRZYNETY } from './przynety.js';
import { REKWIZYTY, ustawLosowanie } from './rekwizyty.js';

// ?poziom=1 – wersja pozioma (YouTube 1920×1080): ten sam świat i te same sceny, kamera z tym samym kątem w pionie
// (w kadrze wszystko, co w pionie, i więcej otoczenia po bokach), napisy przeliczone na kadr 16:9
const POZIOM = new URLSearchParams(location.search).get('poziom') === '1', W = POZIOM ? 1920 : 1080, H = POZIOM ? 1080 : 1920;
if (POZIOM) document.body.classList.add('poziom');
// ?skala=0.5 – szybki podgląd: grafika liczona w mniejszej rozdzielczości (układ napisów bez zmian, kontur skalowany razem z obrazem)
const SK = Math.min(1, Math.max(.25, Number(new URLSearchParams(location.search).get('skala')) || 1)), RW = Math.round(W * SK), RH = Math.round(H * SK);
const NOINK = 3;                // warstwa bez tuszu świata (efekty, woda, niebo)
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(SK); renderer.setSize(W, H);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.prepend(renderer.domElement);

// ---------- pomocnicze ----------
const lerp = (a, b, t) => a + (b - a) * t;
const sm = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647);
let R = rnd(7);
export const losuj = () => R();
const C = h => new THREE.Color(h);
const grad = (() => { const d = new Uint8Array([90, 170, 255]); const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const toon = (c, o = {}) => new THREE.MeshToonMaterial({ color: c, gradientMap: grad, ...o });

// ---------- kompozycja: tusz świata + woda (split / pod wodą) + winieta ----------
const glebiaRT = (w, h) => { const t = new THREE.WebGLRenderTarget(w, h, { depthTexture: new THREE.DepthTexture(w, h) }); t.depthTexture.type = THREE.UnsignedIntType; return t; };
const rtN = glebiaRT(RW, RH);                       // normalne + głębia świata
const rtM = glebiaRT(RW, RH);                       // maska + głębia postaci 2D
const rtB = glebiaRT(RW, RH);                       // maska samych brył ciała (ryby) – do konturu sylwetki ciała
const rtC = new THREE.WebGLRenderTarget(RW, RH, { samples: 4, type: THREE.HalfFloatType });
const normMat = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });   // obustronnie: cienkie płaty (skrzydła mew, liście) zasłaniają tło także w przebiegu głębi – tusz tła nie prześwituje
const fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const kompozycja = new THREE.ShaderMaterial({
  uniforms: { tC: { value: rtC.texture }, tN: { value: rtN.texture }, tD: { value: rtN.depthTexture }, tM: { value: rtM.texture }, tMD: { value: rtM.depthTexture }, tB: { value: rtB.texture },
    przyc: { value: new THREE.Vector4(1, 1, 1, 1) }, texel: { value: new THREE.Vector2(1 / RW, 1 / RH) }, sk: { value: SK }, cn: { value: .1 }, cf: { value: 600 }, ink: { value: C('#060506') }, fogC: { value: C('#fff') }, fogR: { value: new THREE.Vector2(60, 300) }, vig: { value: .2 },
    invProj: { value: new THREE.Matrix4() }, camWorld: { value: new THREE.Matrix4() }, camPos: { value: new THREE.Vector3() },
    wodaC: { value: C('#3fa7b5') }, wodaG: { value: C('#0b3d5a') }, wodaK: { value: .085 }, czas: { value: 0 }, lod: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }',
  fragmentShader: `
    #include <packing>
    uniform sampler2D tC, tN, tD, tM, tMD, tB; uniform vec2 texel; uniform float cn, cf, vig, wodaK, czas, lod, sk; uniform vec3 ink, fogC, camPos, wodaC, wodaG; uniform vec2 fogR; uniform vec4 przyc;
    uniform mat4 invProj, camWorld; varying vec2 vUv;
    float Zt(sampler2D d, vec2 uv){ return -perspectiveDepthToViewZ(texture2D(d, uv).x, cn, cf); }
    vec3 N(vec2 uv){ return texture2D(tN, uv).xyz * 2. - 1.; }
    float edge(vec2 uv, float w){
      float z0 = Zt(tD, uv); vec3 n0 = N(uv); float e = 0.;
      for (int i = 0; i < 8; i++){
        float a = float(i) * 0.785398; vec2 o = vec2(cos(a), sin(a)) * w * texel;
        float z = Zt(tD, uv + o); vec3 n = N(uv + o);
        e = max(e, smoothstep(.012, .035, (z - z0) / max(z0, .001)));
        if (abs(z - z0) < z0 * .02) e = max(e, .85 * (1. - smoothstep(.55, .8, dot(n0, n))));
      }
      return e;
    }
    vec2 losP(vec2 c) { return fract(sin(vec2(dot(c, vec2(127.1, 311.7)), dot(c, vec2(269.5, 183.3)))) * 43758.5453); }
    float kaustyka(vec2 p, float t) {   // jasne krawędzie komórek: 1 przy granicy, 0 w środku
      vec2 i = floor(p), f = fract(p); float d1 = 8., d2 = 8.;
      for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(float(x), float(y)), o = losP(i + g); o = .5 + .45 * sin(t + 6.2831 * o);
        float d = length(g + o - f); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
      return 1. - smoothstep(0., .22, d2 - d1); }
    void main(){
      vec3 col = texture2D(tC, vUv).rgb;
      float raw = texture2D(tD, vUv).x, z = Zt(tD, vUv);
      float maska = texture2D(tM, vUv).a, rawM = texture2D(tMD, vUv).x;
      // tusz świata (nie na postaciach)
      float w = mix(4.4, 2.4, smoothstep(4., 60., z)) * sk;
      float e = raw < 1. ? edge(vUv, w) : 0.;
      e *= 1. - smoothstep(fogR.x, fogR.y, z) * .75;
      e *= 1. - maska;
      col = mix(col, mix(ink, fogC, smoothstep(fogR.x, fogR.y, z) * .3), e);

      // odległość do pierwszej powierzchni (postać 2D przed światem ma pierwszeństwo)
      if (maska > .5 && rawM < raw) { raw = rawM; z = Zt(tMD, vUv); }
      vec4 v = invProj * vec4(vUv * 2. - 1., 1., 1.); vec3 vd = normalize(v.xyz / v.w);
      vec3 dir = normalize((camWorld * vec4(vd, 0.)).xyz);
      float dist = raw < 1. ? z / max(-vd.z, 1e-3) : 600.;
      // falująca tafla przy kamerze na poziomie wody
      float bliskoTafli = 1. - smoothstep(.05, .6, abs(camPos.y));
      float dy = dir.y + bliskoTafli * (.0045 * sin(vUv.x * 31. + czas * 2.3) + .0022 * sin(vUv.x * 87. - czas * 3.7));
      // kamera tuż przy tafli (ujęcie pół na pół) = dokładnie na tafli: ostry podział w linii menisku, bez „niebieskiego pasa” nad wodą
      float cy = abs(camPos.y) < .12 ? 1e-4 : camPos.y;
      float tP = -cy / (abs(dy) > 1e-5 ? dy : 1e-5);
      float pod = 0.;
      if (cy >= 0.) pod = (dy < 0. && dist > tP) ? dist - max(tP, 0.) : 0.;
      else pod = (dy > 0. && tP < dist) ? tP : dist;
      if (pod > 0.) {
        float gl = max(0., -(camPos.y + dir.y * min(dist, 40.)));
        vec3 wc = mix(wodaC, wodaG, smoothstep(0., 10., gl));
        col *= mix(vec3(1.), vec3(.78, .95, 1.02), smoothstep(0., 3., pod));
        col = mix(col, wc, 1. - exp(-pod * wodaK));
        col *= mix(1., .72, smoothstep(0., 9., gl)) * (1. - lod * .15);
        // migotanie światła pod taflą (kaustyki, delikatnie)
        // nieregularna sieć kaustyk (komórki Voronoja z zawirowaniem, dwie skale, wolno płynące) – bez powtarzalnego wzoru kresek
        vec2 q = vUv * vec2(1., 1.78) * 7.; q += .35 * vec2(sin(q.y * 1.7 + czas * .6), sin(q.x * 1.3 - czas * .5));
        float ka = kaustyka(q, czas * .45) * .65 + kaustyka(q * 2.3 + 7.1, czas * .7) * .35;
        col += vec3(.06, .085, .07) * smoothstep(.55, .95, ka) * exp(-gl * .35) * (1. - lod);
      }
      // linia menisku
      float m = (1. - smoothstep(.0, .0045, abs(dy))) * bliskoTafli;
      col = mix(col, vec3(.95, 1., 1.), m * .9);
      vec2 p = vUv * 2. - 1.; col *= 1. - vig * smoothstep(.55, 1.45, length(p * vec2(1., .8)));
      col = col * przyc.w * mix(vec3(1.), przyc.rgb, 1. - przyc.w);   // całościowe przyciemnienie (noc): wszystko ciemniej i chłodniej
      gl_FragColor = vec4(col, 1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`
});
const fsScene = new THREE.Scene(); fsScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), kompozycja));

// ---------- karty 2D (efekty: strzałki, ikra) ----------
function karta(rysuj, cw, ch, wys) {
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
  const g = cv.getContext('2d'); g.lineJoin = 'round'; g.lineCap = 'round'; rysuj(g, cw, ch);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(wys * cw / ch, wys), new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: .3, depthWrite: true, toneMapped: false, side: THREE.DoubleSide }));
  m.layers.set(POSTACIE); m.renderOrder = 10; return m;
}
const strzalka = (wys, kolor = '#ffffff') => karta(g => { g.scale(1, 1);
  g.beginPath(); g.moveTo(20, 80); g.lineTo(420, 80); g.lineTo(420, 25); g.lineTo(580, 120); g.lineTo(420, 215); g.lineTo(420, 160); g.lineTo(20, 160); g.closePath();
  g.fillStyle = kolor; g.fill(); g.lineWidth = 14; g.strokeStyle = INK; g.stroke(); }, 600, 240, wys);
const ikra = wys => karta(g => { R = rnd(3);
  g.lineWidth = 46; g.strokeStyle = INK; g.beginPath(); g.moveTo(30, 60); g.bezierCurveTo(160, 0, 220, 200, 320, 120); g.bezierCurveTo(400, 60, 430, 180, 480, 170); g.stroke();
  g.lineWidth = 32; g.strokeStyle = '#f5efd8'; g.stroke();
  for (let i = 0; i < 70; i++) { const t = i / 70, x = 30 + t * 450, y = 60 + Math.sin(t * 9) * 45 + 40 * t + (R() - .5) * 16; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fillStyle = '#e8d9a8'; g.fill(); }
}, 500, 240, wys);

// ---------- postacie 2D (biblioteka atlas3d/postacie.js) ----------
// zewnętrzna grupa = billboard (obrót w poziomie do kamery), wewnętrzna = postać (scale.x = ±1: kierunek)
// widziane znad wody: kolor przechodzi w kolor wody tym mocniej, im głębiej leży punkt (pal przy tafli prawie bez zmian, przy dnie mocno przygaszony)
const WODA_NAD = { value: 0 }, WODA_KOL = { value: new THREE.Color('#2f8f9e') };
function przygasWoda(mt) { if (mt.userData.przygas) return; mt.userData.przygas = true;   // materiał wspólny dla wielu siatek (np. zęby) owijamy raz – wielokrotne owinięcie psuło shader
  const wczesniej = mt.onBeforeCompile, kluczW = mt.customProgramCacheKey !== THREE.Material.prototype.customProgramCacheKey ? mt.customProgramCacheKey() : '';   // zachowaj shader materiału (np. kontur ryby zależny od kąta)
  mt.onBeforeCompile = (sh, r) => { if (wczesniej) wczesniej(sh, r); sh.uniforms.uNad = WODA_NAD; sh.uniforms.uWodaK = WODA_KOL;
    sh.vertexShader = sh.vertexShader.replace('void main() {', 'varying float vWy;\nvoid main() {').replace('#include <project_vertex>', '#include <project_vertex>\n  vWy = (modelMatrix * vec4(transformed, 1.)).y;');
    sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'uniform float uNad; uniform vec3 uWodaK; varying float vWy;\nvoid main() {')
      .replace('#include <opaque_fragment>', '#include <opaque_fragment>\n  gl_FragColor.rgb = mix(gl_FragColor.rgb, uWodaK, uNad * step(vWy, -.02) * clamp(.3 + max(0., -vWy) * .16, 0., .82));'); };
  mt.customProgramCacheKey = () => 'przygasWoda' + kluczW; }
function owin(grp, kier = 1) { grp.traverse(o => { if (o.isMesh && o.material && !o.userData.otoczka) przygasWoda(o.material); }); const b = new THREE.Group(); grp.rotation.y = kier < 0 ? Math.PI : 0; b.add(grp); b.userData.wnetrze = grp; b.userData.pion = true; return b; }
const okon = (wys, o = {}) => { const g = stworzOkonia({ wys, mina: o.mina }); const b = owin(g, o.lewo ? -1 : 1), s = wys / 560;
  b.userData.ryba = { kier: o.lewo ? -1 : 1, wys, dl: wys * 1.75, anim: g.userData.okon.anim, st: o.st || {},
    pysk: () => { b.updateMatrixWorld(true); return g.localToWorld(new THREE.Vector3((928 - 500) * s, (290 - 304) * s, 0)); } }; return b; };   // kącik pyska (żyłka po braniu)
// szczupak: wys = wysokość projektu (420 px) w metrach; długość ≈ 3,3 × wys
const szczupak = (wys, o = {}) => { const g = stworzSzczupaka({ wys, mina: o.mina }); const b = owin(g, o.lewo ? -1 : 1), s = wys / 420;
  b.userData.ryba = { kier: o.lewo ? -1 : 1, wys: wys * .55, dl: wys * 3.3, anim: g.userData.okon.anim, st: o.st || {},
    pysk: () => { b.updateMatrixWorld(true); return g.localToWorld(new THREE.Vector3(wys * 3.3 * .84 * .5, -wys * 3.3 * .84 * .012, 0)); } }; return b; };
const drobnica = tw => (wys, o = {}) => { const g = tw({ wys }); const b = owin(g, o.lewo ? -1 : 1); b.userData.ryba = { kier: o.lewo ? -1 : 1, wys, dl: wys * 2.2, anim: g.userData.okon.anim, st: {} }; return b; };
const plotka = drobnica(stworzPlotke), ukleja = drobnica(stworzUkleje);
const wedkarz = (wys, o = {}) => { const g = stworzWedkarza({ wys, zima: o.zima, siedzi: o.siedzi }); const b = owin(g, 1);
  b.userData.postac = { anim: g.userData.wedkarz.anim, czubek: g.userData.wedkarz.czubek, dlon: g.userData.wedkarz.dlon, st: o.st || {} }; return b; };
// dowolny asset 2D (sprzęt, przynęta na planszy) jako element sceny zwrócony do kamery, z własną animacją części
const element = (g, st = {}) => { const b = owin(g, 1); b.userData.animuj = t => (g.userData.sprzet || g.userData.przyneta)?.anim(t, st); return b; };

// ---------- świat ----------
let PORA = {}, scene, camera, sun, TEREN = () => 0, TEREN_ZRODLO = null, kamienie = [], LOD = -1;
let anim = [], tafle = [], kolysz = [];
const karty = [], etykiety = [];
// zwolnienie poprzedniej sceny (geometrie, materiały, tekstury, cienie) – bez tego pamięć rosła z każdą sceną i długi render się sypał
function zwolnijScene(sc) { if (!sc) return; const tex = new Set();
  sc.traverse(o => { if (o.geometry) o.geometry.dispose(); for (const m of [].concat(o.material || [])) { for (const k in m) if (m[k] && m[k].isTexture) tex.add(m[k]); m.dispose(); }
    if (o.isLight && o.shadow && o.shadow.map) { o.shadow.map.dispose(); o.shadow.map = null; } });
  if (sc.background && sc.background.isTexture) tex.add(sc.background); tex.forEach(t => t.dispose()); sc.clear(); }
function nowaScena(p) {
  PORA = p; zwolnijScene(scene);
  scene = new THREE.Scene(); R = rnd(p.seed || 11); kamienie = []; LOD = -1; ustawLosowanie(() => R());
  const cv = document.createElement('canvas'); cv.width = 4; cv.height = 256; const g = cv.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256); p.niebo.forEach((c, i) => gr.addColorStop(i / (p.niebo.length - 1), c)); g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  const bg = new THREE.CanvasTexture(cv); bg.colorSpace = THREE.SRGBColorSpace; scene.background = bg;
  scene.fog = new THREE.Fog(p.mgla, p.mglaOd || 70, p.mglaDo || 320);
  camera = new THREE.PerspectiveCamera(48, W / H, .1, 600);
  camera.layers.enable(NOINK); camera.layers.enable(POSTACIE);
  scene.add(new THREE.HemisphereLight(p.hemiG || '#dcecff', p.hemiD || '#8a7a60', p.hemiI ?? 1.1));
  sun = new THREE.DirectionalLight(p.slonceK || '#fff3e0', p.slonceI ?? 2.6); sun.position.set(...(p.slonceP || [30, 45, 25]));
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 200 }); sun.shadow.bias = -0.0005; sun.shadow.normalBias = .04;
  scene.add(sun);
  kompozycja.uniforms.fogC.value = C(p.mgla); kompozycja.uniforms.fogR.value.set(p.mglaOd || 70, p.mglaDo || 320);
  { const pc = p.przyciemnij; kompozycja.uniforms.przyc.value.set(...(pc ? [...C(pc.kolor).toArray(), pc.jasnosc] : [1, 1, 1, 1])); }
  kompozycja.uniforms.wodaC.value = C(p.wodaC || '#3fa7b5'); kompozycja.uniforms.wodaG.value = C(p.wodaG || '#0b3d5a');
  kompozycja.uniforms.wodaK.value = p.wodaK ?? .052; kompozycja.uniforms.lod.value = p.lod ? 1 : 0;
}
const add = (m, x = 0, y = 0, z = 0) => { m.position.set(x, y, z); scene.add(m); return m; };
const cien = m => { m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return m; };
const szum = (x, z) => .5 * Math.sin(x * .11 + 1.3) * Math.cos(z * .13) + .3 * Math.sin(x * .27 + z * .19) + .2 * Math.sin(x * .53 - z * .41);
const lad = d => d > 1 ? 1.4 * sm((d - 1) / .25) : 0;
function wzgorza(x, z, d) { return d > 1 ? 7 * sm((d - 1.5) / 1.3) * (.7 + .3 * szum(x * .5, z * .5)) + 16 * sm((d - 3) / 2) : 0; }

// jezioro ok. 64 × 48 m: płycizna (półka 1,5 m) od zachodu, spad do ok. 6,5 m
const jezioroH = (x, z) => {
  const a = Math.atan2(z, x), d = Math.hypot(x / 32, z / 24) * (1 + .06 * Math.sin(3 * a + 1) + .04 * Math.sin(5 * a));
  let y = -6.5 * sm((1 - d) / .7);
  const k = sm((-x - 9 + 1.6 * Math.sin(z * .27) + .9 * Math.sin(z * .71 + 1)) / 7) * sm((1 - d) / .1);   // krawędź półki falista, nie prosta y = lerp(y, Math.max(y, -1.5), k);
  return y + .5 * sm((d - .97) / .1) + lad(d) + wzgorza(x, z, d) + .18 * szum(x, z);
};
// rzeka ok. 20 m szerokości, płynie do widza (+z), głębokość ok. 3,5 m
const rzekaX = z => 3 * Math.sin(z * .045);
// zatoka przy lewym brzegu: płytka (ok. 1,9 m), otwarta na koryto, z dala od głównego nurtu
const ZATOKA = { x: rzekaX(5) - 8, z: 5, rx: 6, rz: 5, gl: -1.9 };
const rzekaH = (x, z) => {
  const d = Math.abs(x - rzekaX(z)) / 10;
  const zt = sm((1 - Math.hypot((x - ZATOKA.x) / ZATOKA.rx, (z - ZATOKA.z) / ZATOKA.rz)) / .4);
  const y = -3.6 * sm((1 - d) / .55) + .6 * sm((d - .95) / .12) + lad(d) + wzgorza(x, z, d * 1.4) + .15 * szum(x, z);
  return lerp(y, Math.min(y, ZATOKA.gl + .12 * szum(x * 2, z * 2)), zt);
};

// tekstura szczegółu terenu (kępki trawy, ziarna piasku, kamyczki) – mnożona przez kolor wierzchołków
let _tekTeren = null;
function teksturaTerenu() {
  if (_tekTeren) return _tekTeren;
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); let s = 3; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) { const v = 200 + r() * 55 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(r() * 256, r() * 256, 2, 2); }
  g.lineCap = 'round';
  for (let i = 0; i < 90; i++) { const x = r() * 256, y = r() * 256, v = 205 + r() * 35 | 0; g.strokeStyle = `rgb(${v},${v},${v})`; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - .5) * 6, y - 6 - r() * 8); g.stroke(); }
  for (let i = 0; i < 40; i++) { const v = 150 + r() * 60 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 2 + r() * 3, 1.5 + r() * 2, r() * 3, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(110, 110); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return (_tekTeren = t);
}
function teren(H, o = {}) {
  TEREN = H; o = { ...o, tafla: PORA.tafla || o.tafla, trawa: PORA.trawa || o.trawa, wzg: PORA.wzg || o.wzg };   // pora dnia/roku (noc, deszcz, jesień) przestawia kolory tafli i trawy
  const S = 260, n = 380, geo = new THREE.PlaneGeometry(S, S, n, n); geo.rotateX(-Math.PI / 2);   // oczko ok. 0,7 m – gładkie stoki górek i spadów
  const pos = geo.attributes.position, kol = [];
  const cTrawa = C(o.trawa || '#79b84a'), cWzg = C(o.wzg || '#5d9440'), cPiasek = C('#d8c38a'), cDno = C('#b9a77a'), cMul = C('#6c6a4c'), cSnieg = C('#f2f6fb'), cMulPlat = C('#585638'), cZwir = C('#948f84'), cRosl = C('#5d7a38');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), y = H(x, z); pos.setY(i, y);
    let c;
    if (y < -.25) {   // dno: ciemnieje z głębokością, płaty mułu, żwiru i roślin dennych (szum – miękkie, nieregularne granice)
      c = cDno.clone().lerp(cMul, .85 * sm(-y / 4.5));
      const pm = szum(x * .31 + 17, z * .29 - 9), pz = szum(x * .43 - 31, z * .47 + 13), pr = szum(x * .37 + 5, z * .33 + 41);
      if (pm > .2) c.lerp(cMulPlat, .7 * sm((pm - .2) / .35));
      if (pz > .35) c.lerp(cZwir, .75 * sm((pz - .35) / .25));
      if (pr > .3 && y > -4.5) c.lerp(cRosl, .55 * sm((pr - .3) / .3));
    }
    else if (y < .45) c = cPiasek.clone();
    else c = cTrawa.clone().lerp(cWzg, sm((y - 2) / 8));
    if (o.snieg && y > .25) c = cSnieg.clone().lerp(C('#dfe7f0'), sm((y - 3) / 10));
    c.offsetHSL(0, 0, (R() - .5) * .035); kol.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(kol, 3)); geo.computeVertexNormals();
  const m = cien(new THREE.Mesh(geo, toon('#ffffff', { vertexColors: true, map: teksturaTerenu() }))); scene.add(m); m.userData.teren = true;
  // tafla (widoczna z góry i od spodu); kamera na poziomie tafli widzi ją pod kątem prostym – wtedy działa linia menisku
  const tcv = document.createElement('canvas'); tcv.width = tcv.height = 512; const t2 = tcv.getContext('2d');
  t2.fillStyle = o.tafla || '#5fc3d6'; t2.fillRect(0, 0, 512, 512); t2.strokeStyle = 'rgba(255,255,255,.5)'; t2.lineWidth = 5; t2.lineCap = 'round';
  for (let i = 0; i < 70; i++) { const x = R() * 512, y = R() * 512, l = 12 + R() * 36; t2.beginPath(); t2.moveTo(x, y); t2.lineTo(x + l, y); t2.stroke(); }
  const tt = new THREE.CanvasTexture(tcv); tt.colorSpace = THREE.SRGBColorSpace; tt.wrapS = tt.wrapT = THREE.RepeatWrapping; tt.repeat.set(30, 30);
  const tafla = new THREE.Mesh(new THREE.PlaneGeometry(S, S).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tt, transparent: true, opacity: o.taflaOp ?? .6, depthWrite: false, side: THREE.DoubleSide }));
  tafla.layers.set(NOINK); tafla.renderOrder = 3; tafla.position.y = .005; scene.add(tafla);
  tafle.push([tt, o.nurt ? 0 : .02, o.nurt ? -.35 : 0, tafla]);
  dnoSzczegoly(H);
  return m;
}
// szczegóły dna w płatach z teren(): żwir (kamyczki) i kępki roślin dennych; bez tuszu (NOINK), żeby nie robić szumu linii
function scal(geos) { const pos = [], nor = []; for (const g0 of geos) { const g = g0.index ? g0.toNonIndexed() : g0; pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); return out; }
function dnoSzczegoly(H) {
  const NK = 1400, NR = 600, kam = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), toon('#ffffff'), NK);
  const kepa = scal(Array.from({ length: 7 }, (_, i) => { const h = .16 + (i % 3) * .07, c = new THREE.ConeGeometry(.018, h, 3); c.translate(0, h / 2, 0); c.rotateZ((i / 7 - .5) * .9); c.rotateY(i * 2.4); return c; }));
  const rosl = new THREE.InstancedMesh(kepa, toon('#5f8a3a'), NR), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Sx = new THREE.Vector3(), P = new THREE.Vector3(), E = new THREE.Euler(), kol = new THREE.Color();
  let ik = 0, ir = 0;
  for (let n = 0; n < 40000 && (ik < NK || ir < NR); n++) { const x = (R() - .5) * 120, z = (R() - .5) * 100, y = H(x, z); if (y > -.35) continue;
    const pz = szum(x * .43 - 31, z * .47 + 13), pr = szum(x * .37 + 5, z * .33 + 41);
    if (ik < NK && pz > .42) { const r = .018 + R() * R() * .06; P.set(x, y + r * .2, z); Q.setFromEuler(E.set(R() * 3, R() * 3, R() * 3)); Sx.set(r * (1 + R() * .5), r * .55, r);
      kam.setMatrixAt(ik, M.compose(P, Q, Sx)); kam.setColorAt(ik++, kol.set(['#a8a294', '#9a8f7e', '#b3ab98', '#8f8a80'][ik % 4]).offsetHSL(0, 0, (R() - .5) * .1)); }
    else if (ir < NR && pr > .38 && y > -4.5) { const k = .7 + R() * .8; P.set(x, y - .02, z); Q.setFromEuler(E.set((R() - .5) * .3, R() * 6, (R() - .5) * .3)); Sx.set(k, k, k);
      rosl.setMatrixAt(ir, M.compose(P, Q, Sx)); rosl.setColorAt(ir++, kol.set('#5f8a3a').offsetHSL((R() - .5) * .04, 0, (R() - .5) * .14)); } }
  kam.count = ik; rosl.count = ir; for (const m of [kam, rosl]) { m.layers.set(NOINK); m.receiveShadow = true; scene.add(m); }
}
// las i pagórki dookoła (instancje, żeby świat nie kończył się na brzegu)
function las(H, dMin, dMax, n, fn, o = {}) {
  const pien = new THREE.InstancedMesh(new THREE.CylinderGeometry(.18, .28, 2.2, 6), toon('#6b4630'), n);
  const kor = new THREE.InstancedMesh(o.liscie ? new THREE.IcosahedronGeometry(1.6, 1) : new THREE.ConeGeometry(1.7, 4.2, 7), toon(o.snieg ? '#e9f0f6' : o.kolor || (o.liscie ? '#4e9a3a' : '#2f7a45')), n);
  const kor2 = o.liscie ? null : new THREE.InstancedMesh(new THREE.ConeGeometry(1.25, 3.2, 7), toon(o.snieg ? '#f6f9fc' : '#367f4c'), n);
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  let k = 0;
  for (let i = 0; i < n * 6 && k < n; i++) {
    const a = R() * Math.PI * 2, d = lerp(dMin, dMax, Math.sqrt(R())), [x, z] = fn(a, d);
    if (o.pomin && o.pomin(x, z)) continue;
    const y = H(x, z); if (y < .4) continue;
    const sc = .8 + R() * .7; q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), R() * 6);
    M.compose(p.set(x, y + 1.1 * sc, z), q, s.set(sc, sc, sc)); pien.setMatrixAt(k, M);
    M.compose(p.set(x, y + (o.liscie ? 3.4 : 3.6) * sc, z), q, s.set(sc, sc * (o.liscie ? .85 : 1), sc)); kor.setMatrixAt(k, M); if (o.liscie && PORA.liscie && !o.snieg) { kor.material.color.set('#ffffff'); kor.setColorAt(k, C(PORA.liscie[k % PORA.liscie.length])); }   // jesień: liście w kilku kolorach
    if (kor2) { M.compose(p.set(x, y + 5.4 * sc, z), q, s.set(sc, sc, sc)); kor2.setMatrixAt(k, M); }
    k++;
  }
  for (const m of [pien, kor, kor2]) if (m) { m.count = k; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; cien(m); scene.add(m); }
}
// ---------- rekwizyty z biblioteki rekwizyty.js (kamienie, kłody, roślinność) ----------
// wstaw: stawia rekwizyt na dnie (albo na wysokości y), obraca, dopisuje kołysanie i kolizje dla ryb
function wstaw(g, x, z, { y, rot = R() * 6, cienie = true } = {}) {
  g.position.set(x, y ?? TEREN(x, z), z); g.rotation.y = rot; scene.add(g); if (cienie) cien(g);
  for (const k of g.userData.kolysz || []) kolysz.push(k);
  const c = Math.cos(rot), sn = Math.sin(rot);
  for (const k of g.userData.kolizja || []) kamienie.push({ x: x + k.x * c + k.z * sn, z: z - k.x * sn + k.z * c, r: k.r, top: g.position.y + k.top });
  return g;
}
function trzciny(x, z, n = 14, r = 1) { return wstaw(REKWIZYTY.trzcina({ n, rozrzut: r }), x, z, { y: TEREN(x, z) - .05 }); }
function palki(x, z, n = 8, r = .6) { return wstaw(REKWIZYTY.palka({ n, rozrzut: r }), x, z, { y: TEREN(x, z) - .05 }); }
function kamien(x, z, s = 1, kol = '#8b877c') { return wstaw(REKWIZYTY.kamien({ r: .5 * s, kolor: kol }), x, z, { y: TEREN(x, z) - .05 }); }
function rumosz(x, z, n = 6, r = .4) { return wstaw(REKWIZYTY.rumosz({ n, r }), x, z); }
function roslinaWodna(x, z, h = 1.3) { const dno = TEREN(x, z), hh = Math.min(h, -dno - .25); return wstaw((R() < .5 ? REKWIZYTY.rdestnica : REKWIZYTY.rogatek)({ h: Math.max(.4, hh) }), x, z); }
function rdestnice(x, z, h) { const dno = TEREN(x, z); return wstaw(REKWIZYTY.rdestnica({ h: h ?? Math.max(.5, -dno - .3) }), x, z); }
function rogatki(x, z, h) { const dno = TEREN(x, z); return wstaw(REKWIZYTY.rogatek({ h: h ?? Math.max(.5, -dno * .6) }), x, z); }
// podwodna łąka: gęsty płat roślin zanurzonych (rdestnice, rogatki) na płyciźnie, rośliny nie wychodzą ponad taflę
function laka(x, z, r = 3, n = 9) { const lista = [];
  for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2, d = Math.sqrt(R()) * r, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d * .7, dno = TEREN(px, pz); if (dno > -.5) continue;
    const h = Math.max(.4, Math.min(-dno - .25, (-dno) * (.55 + R() * .35))); lista.push(wstaw((R() < .62 ? REKWIZYTY.rdestnica : REKWIZYTY.rogatek)({ h, n: 3 + Math.floor(R() * 3), rozrzut: .35 }), px, pz)); }
  return lista; }
function grzybienie(x, z, n = 8, r = 3) { return wstaw(REKWIZYTY.grzybien({ n, rozrzut: r / 2, glebia: Math.max(.3, -TEREN(x, z)), kwiaty: Math.max(1, Math.round(n / 4)) }), x, z, { y: 0, cienie: false }); }
function grazele(x, z, n = 5, r = 2.5) { return wstaw(REKWIZYTY.grazel({ n, rozrzut: r / 2, glebia: Math.max(.3, -TEREN(x, z)) }), x, z, { y: 0, cienie: false }); }
function rdestPlat(x, z, n = 12, r = 2.5) { return wstaw(REKWIZYTY.rdest({ n, rozrzut: r / 2, glebia: Math.max(.3, -TEREN(x, z)) }), x, z, { y: 0, cienie: false }); }
function konar(x, z, dl = 5, kat = .4) { return wstaw(REKWIZYTY.kloda({ dl, r: .22 + dl * .02 }), x, z, { rot: kat }); }   // zatopiona kłoda
// zatopione drzewo: pień od brzegu w głąb wody, konary i gałązki (część wystaje nad wodę); pień blokuje ryby
function zatopioneDrzewo(x0, z0, kat = 0, dl = 7) {
  const g = new THREE.Group(), kora = toon('#5a3d2a'), ciemna = toon('#46301f'), V = (x, y, z) => new THREE.Vector3(x, y, z);
  const galaz = (p, q, r0, r1, m = kora) => { const d = q.clone().sub(p), L = d.length(); const c = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, L, 7), m); c.position.copy(p).add(q).multiplyScalar(.5); c.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); g.add(c); return c; };
  const x1 = x0 + Math.cos(kat) * dl, z1 = z0 + Math.sin(kat) * dl;
  const a = V(x0, TEREN(x0, z0) + .3, z0), b = V(x1, TEREN(x1, z1) + .35, z1);
  galaz(a, b, .34, .15);
  for (let i = 0; i < 7; i++) { const k = i / 7 * Math.PI * 2; galaz(a, a.clone().add(V(Math.cos(k) * .9, -.25 + .5 * R(), Math.sin(k) * .9)), .14, .05, ciemna); }   // karpa z korzeniami
  for (let i = 0; i < 10; i++) {
    const t = .22 + .72 * i / 9, p = a.clone().lerp(b, t), wyst = i % 4 === 1;
    const dir = V((R() - .5) * 1.2, .5 + R() * .7, (R() - .5) * 1.2).normalize(), L = 1.2 + R() * 1.6;
    const q = p.clone().add(dir.multiplyScalar(L)); if (!wyst) q.y = Math.min(q.y, -.25); else q.y = Math.max(q.y, .6);
    galaz(p, q, .1, .04);
    for (let j = 0; j < 2; j++) { const m = p.clone().lerp(q, .5 + .3 * j); galaz(m, m.clone().add(V((R() - .5) * .9, .3 + R() * .4, (R() - .5) * .9)), .04, .015); }
  }
  for (let i = 0; i <= 6; i++) { const p = a.clone().lerp(b, i / 6); kamienie.push({ x: p.x, z: p.z, r: .55, top: p.y + .4 }); }
  return cien(add(g));
}
function pomost(x, z0, z1) {   // pomost od brzegu (z0) w głąb jeziora (z1), deski na 0,6 m
  const g = new THREE.Group(), dl = Math.abs(z1 - z0), kier = Math.sign(z1 - z0), n = Math.round(dl / .35);
  for (let i = 0; i < n; i++) { const d = new THREE.Mesh(new THREE.BoxGeometry(1.6, .1, .3), toon(i % 3 ? '#b07a45' : '#a06c3b')); d.position.set(0, .6, z0 + kier * i * .35); g.add(d); }
  const pal = toon('#7a5030'), palMokry = toon('#6b4a2c');
  // pale: lite drewno z konturem nad i pod wodą (nie mogą wyglądać na przezroczyste); pod wodą ciemniejsze, mokre, przy tafli pas glonów
  for (let i = 0; i <= dl; i += 2.4) for (const s of [-.75, .75]) { const zz = z0 + kier * i, yb = TEREN(x + s, zz);
    const gora = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .72, 7), pal); gora.position.set(s, .34, zz); g.add(gora);
    if (yb < -.02) { const h = -yb, pod = new THREE.Mesh(new THREE.CylinderGeometry(.085, .095, h, 7), palMokry); pod.position.set(s, yb + h / 2 - .02, zz); g.add(pod);
      const glony = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, .35, 7), toon('#3f5a2a')); glony.position.set(s, -.2, zz); g.add(glony); } }   // pale pełne (z konturem), pas glonów pod taflą
  return cien(add(g, x, 0, 0));
}
function chmura(x, y, z, s = 1, k = '#ffffff') {
  const gr = new THREE.Group(); for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry((.9 + R() * .6) * s, 12, 8), new THREE.MeshBasicMaterial({ color: k, fog: false })); m.position.set((i - 2) * 1.1 * s, Math.sin(i) * .3 * s, 0); m.scale.y = .6; gr.add(m); }
  gr.traverse(o => o.layers.set(NOINK)); return add(gr, x, y, z);
}
function slonce(x, y, z, r = 8, k = '#ffcf9e') { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 40), new THREE.MeshBasicMaterial({ color: k, fog: false })); m.layers.set(NOINK); add(m, x, y, z); m.lookAt(0, y, 40); return m; }
function postaw(m, x, y, z, rot = 0) { m.position.set(x, y, z); m.userData.rot = rot; scene.add(m); karty.push(m); return m; }
function etykieta(tekst, x, y, z, klasa = '', od = 1, doT = 99) { etykiety.push({ tekst, v: new THREE.Vector3(x, y, z), klasa, od, do: doT }); }
// wskaźnik: etykieta odsunięta o (dx, dy) px od miejsca, ze strzałką wskazującą to miejsce (filar, główka, górka…)
// etykieta/wskaźnik jadący za obiektem (ryba): przypnij(wskaz(...) lub etykieta(...), obiekt, [dx, dy, dz])
function wToni() { etykiety[etykiety.length - 1].wToni = true; }   // strzałka celowo wskazuje toń (nurt, granica nurtu) – kontrola strzałek jej nie sprawdza
function przypnij(obiekt, off = [0, .35, 0]) { const e = etykiety[etykiety.length - 1]; e.za = obiekt; e.zaOff = new THREE.Vector3(...off); return e; }
function wskaz(tekst, x, y, z, dx = 0, dy = -140, klasa = 'z', od = 1, doT = 99) { etykiety.push({ tekst, v: new THREE.Vector3(x, y, z), klasa: klasa + ' wsk', od, do: doT, wsk: [dx, dy] }); }
function plyw(m, { dx = 1.2, okres = 6, faza = 0, dy = .06 } = {}) { m.userData.plyw = { dx, okres, faza, dy }; return m; }

// ---------- światy ----------
const LATO = { niebo: ['#3e7fd2', '#6aa3e3', '#b8d0ec'], mgla: '#b8d0ec', hemiG: '#dcecff', hemiD: '#a08a68', hemiI: 1.15, slonceI: 2.8 };
const ZIMA = { niebo: ['#7d93ad', '#a9bacb', '#dfe7ee'], mgla: '#dfe7ee', hemiG: '#eef4ff', hemiD: '#9aa6b8', hemiI: 1.35, slonceI: 1.2, slonceK: '#e6efff', wodaC: '#6a9cb2', wodaG: '#24506b', wodaK: .06, lod: true };
const JESIEN = { tafla: '#5aa6b4', trawa: '#93964e', wzg: '#7f7a40', niebo: ['#5d86c2', '#93b2d6', '#e3d6b8'], mgla: '#e0d2b4', hemiG: '#f3e2c4', hemiD: '#8a6a48', hemiI: 1.1, slonceI: 2.4, slonceK: '#ffd9a0', slonceP: [30, 30, 25], liscie: ['#d98a2b', '#c4572a', '#e3b23c'] },
  ZLOTA = { niebo: ['#6a4f8c', '#c4848e', '#f7ae78', '#ffd08a'], mgla: '#efb489', hemiG: '#d8b0b8', hemiD: '#6a5a78', hemiI: .9, slonceI: 3.4, slonceK: '#ffab5e', slonceP: [-30, 10, -60], mglaOd: 40, mglaDo: 260, wodaC: '#5a8f9a', wodaG: '#1a3550' };
// noc: granatowe niebo, słaby chłodny „księżyc” zamiast słońca (księżyc rysuje ksiezyc())
const NOC = { przyciemnij: { jasnosc: .58, kolor: '#5f78c8' }, tafla: '#24466e', trawa: '#2f4a3a', wzg: '#223a30', niebo: ['#070b1e', '#16224a', '#2c3c6e'], mgla: '#1c2a52', mglaOd: 30, mglaDo: 200, hemiG: '#5a6ea8', hemiD: '#151a2e', hemiI: .55, slonceI: .55, slonceK: '#b9c8ff', slonceP: [-25, 40, -40], wodaC: '#1d3d5c', wodaG: '#0a1a2c' };
// pochmurno i deszcz: szare niebo, rozproszone światło
const DESZCZ = { tafla: '#6f9aa6', trawa: '#5f8a48', niebo: ['#5d6875', '#7f8a96', '#a7b0b9'], mgla: '#9aa4ae', mglaOd: 35, mglaDo: 220, hemiG: '#c9d2dc', hemiD: '#6f6a60', hemiI: 1.25, slonceI: .7, slonceK: '#e4e9f0', wodaC: '#4f8595', wodaG: '#1f4152' };
function ksiezyc(x, y, z, r = 4) { const m = slonce(x, y, z, r, '#f3f0d8'), h = new THREE.Mesh(new THREE.CircleGeometry(r * 1.9, 40), new THREE.MeshBasicMaterial({ color: '#8ea0d8', transparent: true, opacity: .18, fog: false, depthWrite: false })); h.layers.set(NOINK); h.position.z = -.05; m.add(h);
  const gw = new THREE.BufferGeometry(), n = 260, pp = []; for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2, e = .25 + R() * 1.1, d = 180; pp.push(Math.cos(a) * Math.cos(e) * d, Math.sin(e) * d, Math.sin(a) * Math.cos(e) * d); }
  gw.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3)); const st = new THREE.Points(gw, new THREE.PointsMaterial({ color: '#ffffff', size: 1.4, sizeAttenuation: false, fog: false })); st.layers.set(NOINK); scene.add(st); return m; }
// deszcz: krople jako krótkie kreski spadające ukosem + kręgi na tafli (n kropli w obszarze sceny)
function deszcz(n = 1400, sila = 1) {
  const p = new Float32Array(n * 6), b = []; for (let i = 0; i < n; i++) b.push([OBSZAR.x + (R() - .5) * 34, R() * 12, OBSZAR.z - 22 + R() * 36, .8 + R() * .4]);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const m = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#f4f8fc', transparent: true, opacity: .8, fog: false, depthWrite: false })); m.layers.set(NOINK); m.frustumCulled = false; scene.add(m);
  anim.push(t => { b.forEach(([x, y, z, v], i) => { const yy = ((y - t * 9 * v) % 12 + 12) % 12, xx = x - yy * .12 * sila, k = i * 6; p[k] = xx; p[k + 1] = yy; p[k + 2] = z; p[k + 3] = xx + .03 * sila; p[k + 4] = yy + .45; p[k + 5] = z; }); g.attributes.position.needsUpdate = true; });
  // kręgi na tafli: kilkanaście naraz, każdy rośnie i znika
  const kr = [], mat = new THREE.MeshBasicMaterial({ color: '#e8f2f8', transparent: true, opacity: .5, depthWrite: false, side: THREE.DoubleSide });
  for (let i = 0; i < 40; i++) { const r = new THREE.Mesh(new THREE.RingGeometry(.9, 1, 24), mat.clone()); r.rotation.x = -Math.PI / 2; r.layers.set(NOINK); scene.add(r); kr.push([r, OBSZAR.x + (R() - .5) * 22, OBSZAR.z - 14 + R() * 22, R()]); }
  anim.push(t => { for (const [r, x, z, f] of kr) { const c = t * .9 + f, q = c % 1, j = Math.floor(c); r.position.set(x + Math.sin(j * 12.9 + f * 40) * 3, .01, z + Math.cos(j * 7.3 + f * 30) * 3); r.scale.setScalar(.04 + q * .3); r.material.opacity = .8 * (1 - q); } });
}
function swiatJezioro(o = {}) {
  // o.gorka = { x, z, r, top }: podwodna górka (wypłycenie do głębokości top) na stoku niecki
  const g = o.gorka;
  let H = !g ? jezioroH : (x, z) => { const y = jezioroH(x, z); if (y >= -.3) return y; const d = Math.hypot(x - g.x, z - g.z) / g.r; if (d >= 1.35) return y; const b = Math.pow(Math.max(0, 1 - (d / 1.35) ** 2), 2);   // kopiec: zaokrąglony wierzchołek i łagodne, wklęsłe stoki (bez płaskiego stołu)
    return Math.max(y, lerp(y, g.top + .1 * szum(x * 3, z * 3), b)); };
  // o.zatoka = { a, szer, ext }: zatoka – brzeg „wypchnięty” na zewnątrz w kierunku a (rad), na szerokość kątową szer, o ext (część promienia);
  // naturalny profil brzegu (płycizna, plaża, skarpa) zostaje, bo teren jest próbkowany bliżej środka; las sam omija wodę (y < 0,4)
  if (o.zatoka) { const H0 = H, { a: a0, szer = .45, ext = .25 } = o.zatoka; H = (x, z) => { let dA = Math.atan2(z / 24, x / 32) - a0; dA = Math.atan2(Math.sin(dA), Math.cos(dA));
    const k = sm(1 - Math.abs(dA) / szer); if (k <= 0) return H0(x, z); const f = 1 / (1 + ext * k); return H0(x * f, z * f); }; }
  teren(H, { snieg: o.snieg, trawa: o.zlota ? '#7f9a46' : undefined, tafla: o.zlota ? '#e8a27a' : o.snieg ? '#cfe3ef' : undefined, taflaOp: o.snieg ? 0 : .6 });
  const el = (a, d) => [Math.cos(a) * 32 * d, Math.sin(a) * 24 * d];
  las(H, 1.12, 2.1, 70, el, { snieg: o.snieg, pomin: (x, z) => z > 16 && Math.abs(x) < 16 });
  las(H, 1.15, 1.9, 40, el, { liscie: !o.snieg, snieg: o.snieg, kolor: o.zlota ? '#3f7a3a' : undefined, pomin: (x, z) => z > 16 && Math.abs(x) < 16 });
  las(H, 2.1, 4.2, 220, el, { snieg: o.snieg });
  if (o.snieg) { // lód: pokrywa jezioro, kamera stoi przy otwartej przerębli (krawędź lodu przed kamerą)
    const lod = new THREE.Mesh(new THREE.BoxGeometry(70, .16, 40), toon('#e6f3fa')); lod.receiveShadow = true; add(lod, 0, .0, -9);
    for (let i = 0; i < 30; i++) { const m = new THREE.Mesh(new THREE.CircleGeometry(.4 + R() * .9, 7), new THREE.MeshBasicMaterial({ color: '#ffffff' })); m.rotation.x = -Math.PI / 2; add(m, (R() - .5) * 50, .085, -28 + R() * 38); }
  } else {
    trzciny(-27, -4, 18, 2); trzciny(-24, -12, 16, 2); trzciny(-20, 14, 14, 1.8); trzciny(22, -14, 14, 1.8); trzciny(-29, 5, 16, 2);
    grzybienie(-18, 3, 10, 3); grzybienie(-14, -6, 8, 2.5);
    for (const [x, z] of [[-19, 2], [-17, 6], [-15.5, 4], [-21, -1], [-13.5, 8], [-18.5, 9]]) roslinaWodna(x, z, 1.1 + R() * .3);
  }
  for (let i = 0; i < 14; i++) { const x = -14 + R() * 26, z = -10 + R() * 22; if (Math.abs(x + 4) < 3 && z > 4) continue; if (g && Math.hypot(x - g.x, z - g.z) < g.r) continue; kamien(x, z, .5 + R() * .9); }
  if (!o.bezKonarow) { konar(5, 0, 6, .6); konar(-11, -4, 4, -.4); }
  chmura(-40, 34, -160, 7); chmura(50, 40, -200, 9); chmura(0, 46, -260, 10);
}
// podmyty brzeg: wzdłuż brzegu (strona -1 = lewy, +1 = prawy) od z0 do z1 woda wcina się pod darń na głębokość `wysun`
// (podwodna „jaskinia”), a nad nią zostaje naturalny nawis darni z korzeniami. Teren modyfikuje się przed budową świata.
const brzegX = (z, strona) => rzekaX(z) + strona * 9.55;
function zPodmyciami(H, podmycia) {
  if (!podmycia?.length) return H;
  return (x, z) => { let y = H(x, z);
    for (const p of podmycia) { const wz = sm((z - p.z0 + 1.2) / 1.2) * sm((p.z1 + 1.2 - z) / 1.2); if (wz <= 0) continue;
      const u = -p.strona * (x - brzegX(z, p.strona));            // u > 0: w stronę wody, u < 0: pod darnią
      if (u < -p.wysun - .9 || u > 1.2) continue;
      const dno = -1.05 + .12 * szum(x * 3, z * 3), k = wz * sm((u + p.wysun + .9) / .7);
      y = lerp(y, Math.min(y, dno), k); }
    return y; };
}
function nawis(H0, p) {   // darń nad podmyciem: przekrój profilu wyciągnięty wzdłuż brzegu, nieregularna krawędź, korzenie, trawa
  const g = new THREE.Group(), nz = Math.ceil((p.z1 - p.z0) * 12), w = p.wysun;
  // profil (u, y): darń nisko nad taflą (wierzch ok. 0,4 m), spód tuż przy wodzie, w głębi łączy się z brzegiem
  const prof = [[-w - .9, null], [-w * .6, .42], [-.1, .4], [.12, .38], [.25, .33], [.32, .24], [.34, .14], [.3, .06], [.2, .01], [.05, -.04], [-w * .45, -.08], [-w - .2, -.1], [-w - .9, null]];
  const pos = [], kol = [], idx = [], trawa = C('#6fae45'), trawa2 = C('#5d9a3a'), ziemia = C('#6a5238'), spod = C('#3e2c1f');
  for (let i = 0; i <= nz; i++) { const z = p.z0 + (p.z1 - p.z0) * i / nz, xb = brzegX(z, p.strona), yIn = H0(xb + p.strona * (w + .9), z);
    const wy = .16 * szum(z * .9, 3, 1) + .05 * Math.sin(z * 2.3);       // nieregularna, ale łagodna krawędź nawisu (bez kanciastych załamań)
    prof.forEach(([u, y], k) => { const uu = u > -.2 ? u + wy : u; pos.push(xb - p.strona * uu, y === null ? (k ? yIn - .5 : yIn - .02) : y + .03 * Math.sin(z * 3 + k), z);
      const c = k <= 1 ? trawa.clone().lerp(trawa2, R()) : k <= 3 ? trawa.clone().lerp(ziemia, .5) : ziemia.clone().lerp(spod, Math.min(1, (k - 4) / 5)); c.offsetHSL(0, 0, (R() - .5) * .05); kol.push(c.r, c.g, c.b); }); }
  const K = prof.length;
  for (let i = 0; i < nz; i++) for (let k = 0; k < K - 1; k++) { const a = i * K + k, b = a + K; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(kol, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  g.add(new THREE.Mesh(geo, toon('#ffffff', { vertexColors: true, side: THREE.DoubleSide })));
  const kor = toon('#4a3222'), V = (x, y, z) => new THREE.Vector3(x, y, z);
  // korzenie: mało, grube, zwężające się i rozgałęzione (jak korzenie wierzby/olchy wypłukane spod darni), zwisają łukiem do wody
  const korzen = (pts, r0, r1) => { const krz = new THREE.CatmullRomCurve3(pts), geo = new THREE.TubeGeometry(krz, 14, 1, 6), ps = geo.attributes.position, n = 15;
    for (let i = 0; i < ps.count; i++) { const k = Math.floor(i / 7), c = krz.getPoint(k / (n - 1)), r = lerp(r0, r1, k / (n - 1)); P.set(ps.getX(i), ps.getY(i), ps.getZ(i)).sub(c).multiplyScalar(r).add(c); ps.setXYZ(i, P.x, P.y, P.z); }
    geo.computeVertexNormals(); g.add(new THREE.Mesh(geo, kor)); return krz; }, P = new THREE.Vector3();
  for (let i = 0; i < (p.z1 - p.z0) * 1.6; i++) { const z = p.z0 + .4 + R() * (p.z1 - p.z0 - .8), xb = brzegX(z, p.strona), u = -w * (.15 + R() * .6), x = xb - p.strona * u, L = .55 + R() * .6, pts = [];
    for (let j = 0; j <= 5; j++) { const q = j / 5; pts.push(V(x + p.strona * .25 * q * q + Math.sin(q * 3 + i) * .05, -.06 - L * q, z + Math.sin(q * 2.2 + i * 1.7) * .12)); }
    const krz = korzen(pts, .045 + R() * .03, .008);
    for (let k = 0; k < 2 + (i % 2); k++) { const q0 = .3 + k * .22, a = krz.getPoint(q0), dl = .2 + R() * .25, s2 = (k % 2 ? 1 : -1), bp = [];   // odgałęzienia
      for (let j = 0; j <= 3; j++) { const q = j / 3; bp.push(V(a.x + p.strona * .08 * q, a.y - dl * q * .8, a.z + s2 * dl * q * .6)); }
      korzen(bp, .02, .004); } }
  for (let i = 0; i < (p.z1 - p.z0) * 5; i++) { const z = p.z0 + R() * (p.z1 - p.z0), xb = brzegX(z, p.strona), x = xb - p.strona * (-.05 + R() * .3), y = .42;   // trawa na krawędzi nawisu
    for (let j = 0; j < 4; j++) { const h = .2 + R() * .3, l = new THREE.Mesh(new THREE.ConeGeometry(.025, h, 3), toon('#5d9a3a')); l.position.set(x + (R() - .5) * .25, y + h / 2 - .05, z + (R() - .5) * .25); l.rotation.set((R() - .5) * .5, 0, (R() - .5) * .7); g.add(l); } }
  for (let z = p.z0; z <= p.z1; z += .8) kamienie.push({ x: brzegX(z, p.strona) + p.strona * (w + .6), z, r: .5, top: .3 });   // tylna ściana jaskini; sufit = spód darni (-0,1)
  return cien(add(g));
}
function swiatRzeka(o = {}) {
  const H0 = zPodmyciami(rzekaH, o.podmycia), dp = o.poziom || 0, H = dp ? (x, z) => H0(x, z) - dp : H0; TEREN_ZRODLO = dp ? (x, z) => rzekaH(x, z) - dp : rzekaH;   // o.poziom > 0: wysoka woda (teren niżej względem tafli), < 0: niska woda (łachy)
  teren(H, { nurt: true, tafla: '#5cc4d6' });
  for (const p of o.podmycia || []) nawis(rzekaH, p);
  las(H, 1.1, 3, 120, (a, d) => { const z = -120 + R() * 150, s = Math.sign(Math.cos(a)); return [rzekaX(z) + s * 10 * d, z]; });
  las(H, 1.15, 2.4, 50, (a, d) => { const z = -100 + R() * 120, s = Math.sign(Math.sin(a)); return [rzekaX(z) + s * 10 * d, z]; }, { liscie: true });
  trzciny(ZATOKA.x - 4.5, ZATOKA.z - 3, 16, 1.8); trzciny(ZATOKA.x - 6, ZATOKA.z + 1, 14, 1.6); trzciny(rzekaX(-6) + 9.5, -6, 14, 1.6);
  zatopioneDrzewo(ZATOKA.x - 5.2, ZATOKA.z - 2.6, .55, 7.5);
  for (let i = 0; i < 12; i++) { const z = -20 + R() * 34, x = rzekaX(z) + (R() - .5) * 12; if (Math.hypot(x - ZATOKA.x, z - ZATOKA.z) < 6.5) continue; kamien(x, z, .5 + R() * .8); }
  chmura(-40, 34, -160, 7); chmura(50, 40, -200, 9);
}

// ---------- rekwizyty rzeczne ----------
// główka (ostroga): nasyp z kamieni od brzegu (xb, z) w stronę nurtu (kier = +1 w prawo, -1 w lewo), czubek pod wodą
function glowka(xb, z, dl = 6, kier = 1, szer = 1.6) {
  const g = new THREE.Group(), kol = ['#8b877c', '#7d786c', '#9a958a', '#6f6a60'];
  for (let i = 0; i <= dl * 3; i++) { const u = i / (dl * 3), x = xb + kier * u * dl, gora = lerp(.7, -.5, u), dno = TEREN(x, z);
    for (let j = 0; j < 3; j++) { const zz = z + (R() - .5) * szer, y = lerp(dno, gora, (j + .5) / 3) + (R() - .5) * .2, sc = .45 + R() * .35;
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(sc, 0), toon(kol[(i + j) % 4])); m.scale.set(1.2, .8, 1); m.rotation.set(R(), R() * 6, R()); m.position.set(x + (R() - .5) * .4, y, zz); g.add(m); }
    kamienie.push({ x, z, r: szer * .8, top: gora + .3 }); }
  return cien(add(g));
}
// most na filarach w poprzek rzeki w punkcie z (przęsło na wysokości wys), filary w nurcie i przyczółki na brzegach
function most(z, { wys = 5, szer = 30, filary = [-4.5, 4.5] } = {}) {
  const g = new THREE.Group(), xc = rzekaX(z), beton = toon('#b9b4a8'), ciemny = toon('#8e897d');
  const p = new THREE.Mesh(new THREE.BoxGeometry(szer, .7, 4), beton); p.position.set(xc, wys, z); g.add(p);
  for (const s of [-1.8, 1.8]) { for (let x = -szer / 2; x <= szer / 2; x += 1.2) { const s1 = new THREE.Mesh(new THREE.BoxGeometry(.1, .9, .1), ciemny); s1.position.set(xc + x, wys + .8, z + s); g.add(s1); }
    const por = new THREE.Mesh(new THREE.BoxGeometry(szer, .12, .14), ciemny); por.position.set(xc, wys + 1.25, z + s); g.add(por); }
  for (const fx of filary) { const x = xc + fx, dno = TEREN(x, z), h = wys - dno;
    const f = new THREE.Mesh(new THREE.BoxGeometry(1.3, h, 2.6), beton); f.position.set(x, dno + h / 2, z); g.add(f);
    const n = new THREE.Mesh(new THREE.CylinderGeometry(.65, .65, h, 3), ciemny); n.rotation.y = Math.PI / 2; n.position.set(x, dno + h / 2, z + 1.3); g.add(n);   // ostroga filara pod prąd
    kamienie.push({ x, z, r: 1.6, top: wys }); }
  for (const s of [-1, 1]) { const x = xc + s * szer / 2, y = TEREN(x, z); const b = new THREE.Mesh(new THREE.BoxGeometry(2, wys - y + 1, 5), ciemny); b.position.set(x, y + (wys - y) / 2, z); g.add(b); }
  return cien(add(g));
}
function trawa(g, x, y, z) { for (let i = 0; i < 4; i++) { const h = .25 + R() * .3, l = new THREE.Mesh(new THREE.ConeGeometry(.03, h, 3), toon('#5d9a3a')); l.position.set(x + (R() - .5) * .3, y + h / 2, z + (R() - .5) * .3); l.rotation.z = (R() - .5) * .6; g.add(l); } }
// tor przynęty: przerywana linia (kreski) rysowana postępowo (ustaw(0…1)); pts = [[x,y,z],…]
function sciezka(pts, { kolor = '#ffffff', grub = .035, kreska = .12 } = {}) {
  // tor z prostych odcinków (opad pionowo, podbicie skośnie) – bez pętli, jakie robi spline na ostrych załamaniach
  const krzywa = new THREE.CurvePath(); for (let i = 1; i < pts.length; i++) krzywa.add(new THREE.LineCurve3(new THREE.Vector3(...pts[i - 1]), new THREE.Vector3(...pts[i])));
  const L = krzywa.getLength(), n = Math.floor(L / kreska), seg = [];
  const mat = new THREE.MeshBasicMaterial({ color: kolor, toneMapped: false });
  for (let i = 0; i < n; i += 2) { const a = krzywa.getPointAt(i / n), b = krzywa.getPointAt(Math.min(1, (i + 1) / n)), d = b.clone().sub(a);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(grub, grub, d.length(), 5), mat); m.position.copy(a).add(b).multiplyScalar(.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    m.layers.set(POSTACIE); m.renderOrder = 90; m.userData.u = i / n; scene.add(m); seg.push(m); }
  return { krzywa, ustaw: f => seg.forEach(m => { m.visible = m.userData.u <= f; }), punkt: f => krzywa.getPointAt(Math.min(1, Math.max(0, f))) };
}
// linka (żyłka/plecionka) o zmiennym kształcie: punkty(t) → [[x,y,z], …] (gładka krzywa przez punkty) albo null (ukryta); rura przebudowywana co klatkę
function linka(punkty, { kolor = '#f4f4ea', grub = .012 } = {}) {
  const mat = new THREE.MeshBasicMaterial({ color: kolor, toneMapped: false }); let m = null;
  anim.push(t => { const p = punkty(t); if (!p) { if (m) m.visible = false; return; }
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p.map(v => new THREE.Vector3(...v))), 48, grub, 5);
    if (!m) { m = new THREE.Mesh(g, mat); m.layers.set(POSTACIE); m.renderOrder = 89; scene.add(m); } else { m.geometry.dispose(); m.geometry = g; m.visible = true; } });
  return () => m;
}
// element wyskakujący w czasie (karta sprzętu, przynęta na planszy): skala „pop” od chwili od (s)
function pokaz(m, od) { m.userData.pokaz = od; return m; }

// ---------- efekty otoczenia ----------
const tekKolko = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.beginPath(); g.arc(32, 32, 24, 0, 7); g.fillStyle = 'rgba(255,255,255,.25)'; g.fill(); g.lineWidth = 6; g.strokeStyle = 'rgba(255,255,255,.95)'; g.stroke();
  g.beginPath(); g.arc(24, 24, 6, 0, 7); g.fillStyle = '#fff'; g.fill(); return new THREE.CanvasTexture(c); })();
const tekPylek = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d');
  const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })();
let OBSZAR = { x: 0, z: 0 };
function babelki(n = 40, sufit = 0) {   // pojedyncze bąbelki w trzech rozmiarach + kilka kolumn bąbelków z dna (rosną i kołyszą się coraz mocniej ku górze)
  const warstwy = [.06, .1, .16].map(size => { const g = new THREE.BufferGeometry(), lista = [];
    const m = new THREE.Points(g, new THREE.PointsMaterial({ map: tekKolko, size, transparent: true, opacity: size > .1 ? .8 : .95, depthWrite: false, fog: false })); m.layers.set(NOINK); m.renderOrder = 5; scene.add(m); return { g, lista }; });
  for (let i = 0; i < n; i++) { const x = OBSZAR.x + (R() - .5) * 8, z = OBSZAR.z + (R() - .2) * 9, w = R(); warstwy[w < .55 ? 0 : w < .88 ? 1 : 2].lista.push([x, z, TEREN(x, z), .25 + R() * .55, R() * 6, R(), .04 + R() * .08]); }
  const kolumny = Math.max(3, Math.round(n / 9));
  for (let k = 0; k < kolumny; k++) { const x = OBSZAR.x + (R() - .5) * 7, z = OBSZAR.z + (R() - .2) * 8, dno = TEREN(x, z), v = .45 + R() * .3, f = R() * 6;
    for (let j = 0; j < 9; j++) warstwy[j % 3 === 2 ? 1 : 0].lista.push([x, z, dno, v, f + j, j / 9 + R() * .03, .03, true]); }
  for (const W of warstwy) W.p = new Float32Array(W.lista.length * 3), W.g.setAttribute('position', new THREE.BufferAttribute(W.p, 3));
  anim.push(t => { for (const { g, lista, p } of warstwy) { lista.forEach(([x, z, dno, v, f, s, amp, kol], i) => { const h = sufit - dno, y = (s * h + t * v) % h, u = y / h;
      const a = kol ? .02 + .12 * u : amp; p[i * 3] = x + a * Math.sin(t * (kol ? 5 : 2) + f + u * 4); p[i * 3 + 1] = dno + y; p[i * 3 + 2] = z + a * .6 * Math.cos(t * 3.3 + f); });
    g.attributes.position.needsUpdate = true; } });
}
function mul(n = 260, kolor = '#e9dcb0', nurt = 0) {   // zawiesina w trzech rozmiarach (drobny pył, płatki, większe drobiny); przy nurcie płynie do widza
  for (const [udzial, size, op] of [[.6, .03, .7], [.3, .05, .7], [.1, .08, .55]]) {
    const nn = Math.round(n * udzial), p = new Float32Array(nn * 3), b = []; for (let i = 0; i < nn; i++) { const x = OBSZAR.x + (R() - .5) * 9, z = OBSZAR.z + (R() - .3) * 12; b.push([x, Math.max(TEREN(x, z) + .2, -6) * R(), z, R() * 6, .5 + R()]); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const m = new THREE.Points(g, new THREE.PointsMaterial({ map: tekPylek, color: kolor, size, transparent: true, opacity: op, depthWrite: false, fog: false })); m.layers.set(NOINK); m.renderOrder = 5; scene.add(m);
    anim.push(t => { b.forEach(([x, y, z, f, sp], i) => { const v = nurt ? nurt * Math.max(.15, 1 - Math.abs(x - rzekaX(z)) / 8) : 0; p[i * 3] = x + .15 * sp * Math.sin(t * .4 * sp + f); p[i * 3 + 1] = Math.min(-.05, y + .1 * Math.sin(t * .6 * sp + f * 2)); p[i * 3 + 2] = OBSZAR.z - 4 + ((z - OBSZAR.z + 4 + t * v) % 12 + 12) % 12; }); g.attributes.position.needsUpdate = true; }); }
}
function promienie(n = 6, sila = .2) {   // promienie światła pod wodą
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 256; const g = cv.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(255,255,220,1)'); gr.addColorStop(1, 'rgba(255,255,220,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
  const g2 = g.createLinearGradient(0, 0, 64, 0); g2.addColorStop(0, 'rgba(0,0,0,1)'); g2.addColorStop(.5, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,1)');
  g.globalCompositeOperation = 'destination-out'; g.fillStyle = g2; g.fillRect(0, 0, 64, 256);
  const tex = new THREE.CanvasTexture(cv), lista = [];
  for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(.6 + R() * .8, 7), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: sila, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    m.position.set(OBSZAR.x + (R() - .5) * 9, -3.4, OBSZAR.z + (R() - .3) * 8); m.rotation.z = -.25; m.layers.set(NOINK); m.renderOrder = 4; scene.add(m); lista.push([m, R() * 6]); }
  anim.push(t => lista.forEach(([m, f]) => { m.material.opacity = sila * (.55 + .45 * Math.sin(t * .9 + f)); m.rotation.y = Math.atan2(camera.position.x - m.position.x, camera.position.z - m.position.z); }));
}
function kregi(n = 5) {   // kręgi na tafli (widać je z góry i z poziomu tafli)
  const lista = [];
  for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.RingGeometry(.9, 1, 40), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.layers.set(NOINK); m.renderOrder = 6; scene.add(m);
    lista.push([m, R() * 3, OBSZAR.x + (R() - .5) * 12, OBSZAR.z - 4 - R() * 12]); }
  anim.push(t => lista.forEach(([m, f, x, z]) => { const c = ((t + f) % 3) / 3; m.position.set(x, .03, z); m.scale.setScalar(.15 + c * 1.2); m.material.opacity = .7 * (1 - c); }));
}
// mewy nad ławicą: krążą nad punktem (x0, z0) i co jakiś czas nurkują do wody (plusk + kręgi); głową w kierunku lotu
function mewy(x0, z0, n = 3, { r = 2.2, wys = 3, nurki = [], dzw = true } = {}) {
  const lista = [];
  for (let i = 0; i < n; i++) { const m = REKWIZYTY.mewa({ dl: .55 }); scene.add(m); const f = i / n * Math.PI * 2, rr = r * (.7 + .3 * R()), v = .9 + .3 * R();
    const nur = nurki[i];   // [czas, x, z] – nurkowanie (x, z – tylko orientacyjnie: mewa nurkuje w miejscu, nad którym akurat leci)
    // tor ciągły i gładki (także prędkość): krążenie + nurek jako łagodne „zanurzenie” wysokości (profil cos), bez skrętu do stałego punktu – brak przeskoków kierunku
    const DN = 1.1, nurek = t => nur && Math.abs(t - nur[0]) < DN ? .5 + .5 * Math.cos(Math.PI * (t - nur[0]) / DN) : 0;
    const poz = t => { const x = x0 + Math.cos(t * v + f) * rr, z = z0 + Math.sin(t * v + f) * rr * .6, y0 = wys + .4 * Math.sin(t * 1.3 + i); return [x, lerp(y0, .02, nurek(t)), z]; };
    const kier = t => { const [a, b, c] = poz(t - .12), [d, e, g] = poz(t + .12); return [d - a, e - b, g - c]; };   // kierunek lotu z gładkiego okna – obrót zawsze płynny
    anim.push(t => { const [x, y, z] = poz(t), [dx, dy, dz] = kier(t); m.position.set(x, y, z); m.lookAt(x + dx, y + dy, z + dz); m.rotateY(-Math.PI / 2);
      const [ax, , az] = kier(t - .1), [bx, , bz] = kier(t + .1), skret = (ax * bz - az * bx) / Math.max(1e-6, Math.hypot(ax, az) * Math.hypot(bx, bz)); m.rotateX(Math.max(-.5, Math.min(.5, -skret * 2.5)));   // przechył na zakręcie
      const zloz = nur ? sm(1 - Math.abs(t - nur[0]) / .85) : 0, szyb = sm((Math.sin(t * .9 + f * 2) - .05) / .4);   // płynne przejścia: machanie ↔ szybowanie ↔ skrzydła złożone
      m.userData.anim(t + i * .37, { zloz, szyb }); });
    if (nur) { const kr = new THREE.Mesh(new THREE.RingGeometry(.9, 1, 40), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false, side: THREE.DoubleSide })); kr.rotation.x = -Math.PI / 2; kr.layers.set(NOINK); kr.renderOrder = 6; scene.add(kr);
      anim.push(t => { const c = (t - nur[0]) / 1.4; kr.visible = c > 0 && c < 1; const pk = poz(nur[0]); kr.position.set(pk[0], .03, pk[2]); kr.scale.setScalar(.1 + c * .9); kr.material.opacity = .8 * (1 - c); }); if (dzw) dzwiek(nur[0], 'plusk', .4); }
    lista.push(m); }
  return lista;
}
function wazka(x0, y0, z0, { dl = .34, zakres = [1.3, .25, .5] } = {}) {   // ważka 3D (rekwizyty.js): lot z zawisami i szybkimi przeskokami, głową w kierunku ruchu
  const m = REKWIZYTY.wazka({ dl }); scene.add(m); const f = R() * 6, poz = t => {
    const T = t * .55 + f, k = Math.floor(T), u = T - k, sk = sm(Math.min(1, u / .35));   // co ok. 1,8 s: przeskok (0,6 s) i zawis
    const pkt = n => [x0 + zakres[0] * Math.sin(n * 2.3 + f), y0 + zakres[1] * Math.sin(n * 1.7), z0 + zakres[2] * Math.sin(n * 1.3 + f)];
    const a = pkt(k), b = pkt(k + 1); return [lerp(a[0], b[0], sk), lerp(a[1], b[1], sk) + .03 * Math.sin(t * 5), lerp(a[2], b[2], sk)]; };
  anim.push(t => { const [x, y, z] = poz(t), [x2, , z2] = poz(t + .05), dx = x2 - x, dz = z2 - z;
    m.position.set(x, y, z); if (Math.hypot(dx, dz) > 1e-3) m.userData.kurs = Math.atan2(-dz, dx);
    m.rotation.set(0, m.userData.kurs ?? 0, .05 * Math.sin(t * 3)); m.userData.anim(t); });
  return m;
}
function snieg() {
  const n = 900, p = new Float32Array(n * 3), b = []; for (let i = 0; i < n; i++) b.push([OBSZAR.x + (R() - .5) * 30, R() * 14, OBSZAR.z - 20 + R() * 34, R() * 6]);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const m = new THREE.Points(g, new THREE.PointsMaterial({ map: tekPylek, color: '#ffffff', size: .12, transparent: true, depthWrite: false, fog: false })); m.layers.set(NOINK); scene.add(m);
  anim.push(t => { b.forEach(([x, y, z, f], i) => { p[i * 3] = x + .4 * Math.sin(t * .8 + f); p[i * 3 + 1] = .35 + ((y - t * 1.1) % 14 + 14) % 14; p[i * 3 + 2] = z; }); g.attributes.position.needsUpdate = true; });
}
// żyłka od czubka wędki do spławika / przynęty (cel może być funkcją czasu)
// ATAK drapieżnika na przynętę (dokładny: przynęta kończy w pysku). tor(t) → [x,y,z] – prowadzenie przynęty; o.ts – chwila chwycenia.
// Ryba idzie za przynętą w odległości o.odleglosc (albo czeka w zasadzce o.zasadzka do chwili o.od), w ostatnich o.zryw s (domyślnie 0,2 s)
// przyspiesza jak prawdziwy szczupak (start z prędkością przynęty, uderzenie kilka m/s), paszcza otwiera się ok. 0,09 s przed chwyceniem,
// przynęta zostaje w pysku (nosem na zewnątrz), żyłka biegnie od jej oczka, ryba szarpie łbem (o.walkaDo s), wędkarz holuje.
// Ruch w czasie rzeczywistym – bez spowalniania (zasada projektu). o.potem(t) → [x,y,z]: tor ryby po ataku (np. ucieczka, hol do brzegu).
function atak(w, ryba, tor, o = {}) {
  const R = ryba.userData.ryba, ts = o.ts, Lp = R.dl * .84 * .5, gap0 = o.odleglosc ?? R.dl * .3, zryw = o.zryw ?? .2, tau = .14;
  const L = t => new THREE.Vector3(...tor(Math.min(t, ts)));
  const kier = t => { const d = L(Math.min(t, ts)).sub(L(Math.min(t, ts) - .3)); d.y = 0; if (d.lengthSq() < 1e-8) d.set(R.kier, 0, 0); return d.normalize(); };
  const zas = o.zasadzka ? new THREE.Vector3(...o.zasadzka) : null, od = o.od ?? -99, doj = o.dojscie ?? 1.2, dk = kier(ts), vUd = 2 * gap0 / zryw;
  const sledz = t => {   // środek ryby: za przynętą, pysk w odległości gap od niej
    const x = Math.max(0, Math.min(1, (t - (ts - zryw)) / zryw)), gap = gap0 * (1 - x * x) - .03 * Lp * x;   // zryw: przyspieszenie (x²), na końcu pysk na przynęcie
    const k = kier(t), p = L(t).addScaledVector(k, -(Lp + gap)); p.y -= .08 * (1 - x) * Math.min(1, gap0 / .3);   // przed zrywem lekko niżej, w zrywie w górę do przynęty
    p.addScaledVector(new THREE.Vector3(-k.z, 0, k.x), .04 * Math.sin(t * 2.3) * (1 - x)); return p; };   // lekkie wahanie toru przy śledzeniu
  const centrum = t => {
    if (t >= ts) { const s = t - ts, p = sledz(ts).addScaledVector(dk, vUd * tau * (1 - Math.exp(-s / tau)));   // po chwyceniu: wytraca prędkość
      if (o.potem) { const k = sm((s - .3) / .8); if (k > 0) p.lerp(new THREE.Vector3(...o.potem(t)), k); } return p; }
    const p = sledz(t); if (zas && t < od + doj) p.copy(zas).lerp(p, sm((t - od) / doj)); return p; };
  ryba.userData.ruch = t => { const p = centrum(t); return { x: p.x, y: p.y, z: p.z }; };
  R.atakTs = ts; R.walka = t => { const d = t - ts; return d < .15 ? 0 : sm((d - .15) / .2) * (1 - sm((d - (o.walkaDo ?? 2.2)) / .5)); };
  const wPysku = () => { const pk = R.pysk(); return pk.lerp(ryba.position, .06); };   // między szczękami, tuż za czubkiem pyska
  const strona = () => R.strona ?? R.kier;
  return zylka(w, t => tor(Math.min(t, ts)), false, { typ: o.typ || 'ripper', dl: o.dl ?? .35, predkosc: o.predkosc ?? 1, ...(o.przyneta || {}), atak: { ts, wPysku, strona } });
}
function zylka(postac, cel, splawik = true, przyneta = null) {
  // przyneta.branie = { od, ryba }: od chwili `od` przynęta znika (połknięta), żyłka biegnie do pyska ryby, wędkarz holuje.
  // przyneta.skala = t => mnożnik wielkości przynęty (np. zmiana na mniejszą).
  // Żyłka: 25 punktów. Przy przynęcie wychodzi z oczka POZIOMO w stronę nosa przynęty (w bok), potem łukiem do szczytówki.
  // Mormyszka: z przerębli pionowo w dół. Spławik: lekko zwisający łuk do spławika.
  // żyłka jako cienka rurka na warstwie POSTACIE: ma własną głębię (mgła wody liczy się do niej) i grubość niezależną od GPU
  const N = 25, pkt = Array.from({ length: N }, () => new THREE.Vector3()), krzywa = new THREE.CatmullRomCurve3(pkt);
  const zm = new THREE.MeshBasicMaterial({ color: '#2a2a2a', toneMapped: false }), l = new THREE.Mesh(new THREE.BufferGeometry(), zm); l.layers.set(POSTACIE); l.renderOrder = 95; scene.add(l);
  let sp = null;
  if (splawik) { sp = new THREE.Group(); const a = new THREE.Mesh(new THREE.SphereGeometry(.07, 12, 8), toon('#e2452a')); const b = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .22), toon('#ffffff')); b.position.y = .12; sp.add(a, b); scene.add(sp); }
  else if (przyneta) { sp = PRZYNETY[przyneta.typ]({ dl: przyneta.dl ?? .45, ...przyneta }); scene.add(sp); }
  else { sp = new THREE.Mesh(new THREE.SphereGeometry(.045, 10, 8), toon('#d9a43a')); scene.add(sp); }
  if (przyneta?.branie) przyneta.branie.ryba.userData.ryba.branieOd = przyneta.branie.od;   // atak: ryba otwiera paszczę (ustawiane przed animacją ryby, w tej samej klatce)
  const pionowo = przyneta?.typ === 'mormyszka';
  const nos = new THREE.Vector3(), kier = new THREE.Vector3(), c1 = new THREE.Vector3(), c2 = new THREE.Vector3(), p = new THREE.Vector3();
  const bezier = (a, b, c, d, u) => p.set(0, 0, 0).addScaledVector(a, (1 - u) ** 3).addScaledVector(b, 3 * u * (1 - u) ** 2).addScaledVector(c, 3 * u * u * (1 - u)).addScaledVector(d, u ** 3);
  const at = przyneta?.atak;   // atak(): przynęta kończy w pysku ryby i tam zostaje (żyłka od jej oczka), wędkarz zacina i holuje
  anim.push(t => { const br = przyneta?.branie, wziela = br && t >= br.od, zlapana = at && t >= at.ts;
    if (br) postac.userData.postac.st.hol = wziela;
    if (at) postac.userData.postac.st.hol = t >= at.ts + .15;
    postac.updateMatrixWorld(true); const tip = postac.userData.postac.czubek(), q = typeof cel === 'function' ? cel(t) : cel;
    const end = wziela ? br.ryba.userData.ryba.pysk() : new THREE.Vector3(...q);
    sp.visible = !wziela;
    if (at && t >= at.ts - .05) end.lerp(at.wPysku(), zlapana ? 1 : sm((t - at.ts + .05) / .05));   // ostatnie 0,05 s: zassanie do paszczy, potem przynęta trzymana w pysku
    if (splawik) end.y = .02 * Math.sin(t * 2.4);
    if (sp.userData.przyneta) {   // przynęta: zwrócona do kamery, nosem w stronę wędkarza; oczko dokładnie na końcu żyłki
      sp.rotation.set(0, pionowo ? 0 : Math.atan2(camera.position.x - end.x, camera.position.z - end.z), 0);
      const sk = przyneta.skala ? przyneta.skala(t) : 1, kZ = zlapana ? at.strona() : (pionowo || tip.x > end.x ? 1 : -1); sp.scale.set(kZ * sk, sk, sk);   // w pysku: nosem (oczkiem) na zewnątrz paszczy, w stronę głowy ryby sp.position.copy(end); sp.updateMatrixWorld(true);
      nos.copy(sp.userData.przyneta.nos); sp.localToWorld(nos); sp.position.add(end.clone().sub(nos));
      if (br && t > br.od - .3 && t < br.od) {   // połknięcie: w ostatnich 0,3 s przynęta wsuwa się w otwartą paszczę i maleje (znika w pysku)
        const k = sm((t - br.od + .3) / .3), pk = br.ryba.userData.ryba.pysk().lerp(br.ryba.position, .22); pk.z -= .06;   // cel: wnętrze paszczy, za szczęką
        sp.position.lerp(pk, k); sp.scale.multiplyScalar(1 - .8 * k); end.lerp(pk, k); }
      sp.userData.przyneta.anim(t, { predkosc: przyneta.predkosc ?? 1 });
    } else sp.position.copy(end);
    if (pionowo) {                                   // pion z przerębli: szczytówka → przerębel → mormyszka
      c1.set(end.x, Math.min(tip.y, .1), end.z); c2.set(end.x, (end.y + c1.y) / 2, end.z);
    } else if (wziela || zlapana) {                  // hol: żyłka napięta, lekko wygięta od pyska (oczka przynęty) do szczytówki
      c1.copy(tip).lerp(end, .35); c2.copy(tip).lerp(end, .7); c1.y -= .05; c2.y -= .04;
      if (zlapana && t < at.ts + .25) {              // zacięcie: żyłka płynnie przechodzi z łuku prowadzenia w napiętą (ok. 0,25 s), bez przeskoku
        const a = Math.atan2(camera.position.x - end.x, camera.position.z - end.z), zn = tip.x > end.x ? 1 : -1;
        kier.set(Math.cos(a) * zn, 0, -Math.sin(a) * zn); const L = Math.max(1.2, .45 * Math.hypot(tip.x - end.x, tip.z - end.z));
        const r2 = end.clone().addScaledVector(kier, L), r1 = r2.clone().lerp(tip, .5); r1.y = Math.max(end.y + .4, (tip.y + end.y) / 2);
        const k = sm((t - at.ts) / .25); c1.copy(r1.lerp(c1, k)); c2.copy(r2.lerp(c2, k)); }
    } else if (przyneta) {                           // w bok: styczna w oczku pozioma, wzdłuż osi przynęty
      kier.set(1, 0, 0).applyQuaternion(sp.quaternion).multiplyScalar(Math.sign(sp.scale.x)); kier.y = 0; kier.normalize();
      const L = Math.max(1.2, .45 * Math.hypot(tip.x - end.x, tip.z - end.z));
      c2.copy(end).addScaledVector(kier, L); c1.copy(c2).lerp(tip, .5); c1.y = Math.max(end.y + .4, (tip.y + end.y) / 2);
    } else { c1.copy(tip).lerp(end, .33); c2.copy(tip).lerp(end, .66); c1.y -= .2; c2.y -= .25; }
    for (let i = 0; i < N; i++) { const u = i / (N - 1); if (pionowo) { (u < .5 ? p.copy(tip).lerp(c1, u * 2) : p.copy(c1).lerp(end, (u - .5) * 2)); } else bezier(tip, c1, c2, end, u); pkt[i].copy(p); }
    l.geometry.dispose(); l.geometry = new THREE.TubeGeometry(krzywa, 60, .011, 5, false); });
}

// pierwszy plan pod wodą: rośliny i kamienie między kamerą a akcją (głębia kadru)
function przedplan(n = 4) {
  const cz = camera.position.z, ox = OBSZAR.x;
  for (let i = 0; i < n; i++) { const x = ox + (i % 2 ? 1 : -1) * (1.6 + R() * 1.4), z = cz - 3.5 - R() * 3; if (TEREN(x, z) > -.6) continue; roslinaWodna(x, z, .9 + R() * .6); if (R() < .6) kamien(x + (R() - .5), z - .5, .4 + R() * .5); }
}
// linia głównego nurtu: delikatne, małe strzałki płynące środkiem koryta (z0 → z1, w stronę widza)
function nurtLinia(z0, z1, { x = 0, y = -.3, odstep = 1.1, wys = .16, od = 0 } = {}) {
  const n = Math.ceil((z1 - z0) / odstep), lista = [];
  for (let i = 0; i < n; i++) { const m = strzalka(wys, '#ffffff'); m.material.transparent = true; m.material.depthWrite = false; m.renderOrder = 92; scene.add(m); lista.push([m, i]); }
  anim.push(t => lista.forEach(([m, i]) => { const f = ((i + t * 1.2 / odstep) % n) / n, z = z0 + (z1 - z0) * f;
    m.position.set(rzekaX(z) + x, y, z); m.quaternion.copy(camera.quaternion); m.rotateZ(-Math.PI / 2);
    m.material.opacity = .62 * Math.min(1, f * 5, (1 - f) * 5) * sm((t - chwila(T0 + od)) / .4); }));
}
// ---------- kamera: split na poziomie tafli, przejazdy, orbita ----------
function kam(p0, cel, o = {}) {
  camera.fov = o.fov ?? 48; if (POZIOM) camera.fov = 2 * Math.atan(Math.tan(camera.fov * Math.PI / 360) * (o.skalaPoziom ?? .7)) * 180 / Math.PI;   // poziom: ciaśniej w pionie, szerzej w poziomie
  camera.position.set(...p0);
  camera.userData = { cel: new THREE.Vector3(...cel), p1: o.p1 ? new THREE.Vector3(...o.p1) : null, l1: o.l1 ? new THREE.Vector3(...o.l1) : null,
    najazd: o.najazd ?? [0, .12], orbita: o.orbita ?? .1, stalaY: o.stalaY, panorama: o.panorama,
    klucze: o.klucze ? o.klucze.map(([t, p, l, przez]) => [o.rzecz ? t : chwila(t), new THREE.Vector3(...p), new THREE.Vector3(...l), przez ? new THREE.Vector3(...przez) : null]) : null };   // przez: punkt kontrolny łuku przelotu (omija rośliny / przelot nad wodą)   // klucze: [[czas, pozycja, cel], …]
  OBSZAR = { x: cel[0], z: cel[2] };
}

// ---------- kolizje ryb: nad dnem i kamieniami na całej długości, pod taflą / lodem ----------
function dnoPod(x, z) {
  let y = TEREN(x, z);
  for (const k of kamienie) { const d = Math.hypot(x - k.x, z - k.z); if (d < k.r) y = Math.max(y, k.top - (d / k.r) * .3); }
  return y;
}
function trzymajRybe(m, sufit) {
  const r = m.userData.ryba, pol = r.dl / 2, wys = r.wys * .5, p = m.position;
  let dno = -Infinity;
  for (let i = -2; i <= 2; i++) dno = Math.max(dno, dnoPod(p.x + i * pol / 2, p.z));
  p.y = Math.min(sufit - wys - .05, Math.max(p.y, dno + wys + .08));
}

// ---------- animacja ----------
const ui = document.getElementById('ui');
let CFG = { sceny: {}, liczba: 9, tytul: '', dlugosc: (n, dl) => dl, tlo: () => 'jezioro' }, SUFIT = 0;
export function ustawSufit(y) { SUFIT = y; }                 // np. lód: ryby trzymają się pod nim
export function swiatlo(tint, woda) { TINT = C(tint); if (woda) TINT_WODA = C(woda); }   // barwa postaci w świetle sceny
export function ustawObszar(x, z) { OBSZAR = { x, z }; }   // środek efektów (bąbelki, zawiesina…)
const naglowek = nr => `<div class="postep">${Array.from({ length: CFG.liczba }, (_, i) => `<i><b id="pp${i + 1}" style="width:${i + 1 < nr ? 100 : 0}%"></b></i>`).join('')}</div><div class="top"><div>${CFG.tytul}</div><div>@wisnia_wedkuje</div></div>`;
let TINT = C('#ffffff'), TINT_WODA = C('#bfe6ea');
const DL = Number(new URLSearchParams(location.search).get('dl')) || 3.6;
let DLUGOSC = DL, numer = 1, T0 = 0, przejscie = null, MAPA = null, REAL = false, GOFF = 0, CIAGLA = false;
// tryb ruchRzeczywisty (CFG.ruchRzeczywisty): ryby, ptaki, kamera i wszystkie ruchy biegną w czasie rzeczywistym – nic nie jest
// przyspieszane ani zwalniane, żeby dopasować się do lektora. Do słów lektora przypinane są tylko CHWILE (wejścia napisów,
// dźwięki, start akcji, klucze kamery): chwila(czas projektu) → czas rzeczywisty. W scenie: T(x) = chwila(x), P(r) = czas projektu.
// GOFF – przesunięcie czasu ruchu w ujęciu ciągłym (kilka scen w jednym świecie bez cięcia: obiekty żyją w czasie całego ujęcia)
const chwila = p => REAL ? naRzecz(p) : p;
export const T = p => chwila(p), P = r => REAL ? naProjekt(r) : r;
export function ujecie(off) { GOFF = off; }   // scena w ujęciu ciągłym: czas ruchu = czas sceny + off
// mapa czasu sceny (lektor): pary [czas rzeczywisty, czas projektu] – animacja i napisy projektowane w czasie projektu
// są rozciągane tak, żeby każdy element wchodził na swoje słowo; render i kontrole podają czas rzeczywisty
const naProjekt = t => { if (!MAPA) return t; let i = 0; while (i < MAPA.length - 2 && t > MAPA[i + 1][0]) i++; const [r0, p0] = MAPA[i], [r1, p1] = MAPA[i + 1]; return p0 + (p1 - p0) * (t - r0) / Math.max(1e-6, r1 - r0); };
const naRzecz = t => { if (!MAPA) return t; let i = 0; while (i < MAPA.length - 2 && t > MAPA[i + 1][1]) i++; const [r0, p0] = MAPA[i], [r1, p1] = MAPA[i + 1]; return r0 + (r1 - r0) * (t - p0) / Math.max(1e-6, p1 - p0); };
const backOut = p => { const c = 1.9; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
const tmpC = new THREE.Color();
// obiekty całkowicie pod wodą (pale, kamienie, kłody, rośliny) rysowane PO tafli – jak ryby: znad wody zachowują swój kolor
// (brązowy pal pod wodą = ten sam brąz co nad wodą); dno zostaje pod taflą, więc woda nadal wygląda jak woda
function zanurzone() { scene.updateMatrixWorld(true); const b = new THREE.Box3();
  scene.traverse(m => { if (!m.isMesh || m.isInstancedMesh || m.userData.teren || m.layers.isEnabled(NOINK) || m.layers.isEnabled(POSTACIE) || m.material.transparent) return;
    for (let x = m; x; x = x.parent) if (x.userData.ryba || x.userData.postac || x.userData.przyneta) return;
    b.setFromObject(m); if (b.max.y > -.01) return;
    m.material = m.material.clone(); m.material.transparent = true; m.renderOrder = 4; przygasWoda(m.material); }); }
window.zbuduj = n => {
  numer = n; karty.length = 0; etykiety.length = 0; dzwieki = []; anim = []; tafle = []; kolysz = [];
  TINT = C('#ffffff'); TINT_WODA = C('#bfe6ea'); SUFIT = 0;
  REAL = !!CFG.ruchRzeczywisty; GOFF = 0; CIAGLA = !!(CFG.ciagla && CFG.ciagla(n));
  { const dl0 = CFG.dlugosc(n, DL), c0 = CFG.czas ? CFG.czas(n, dl0) : null; MAPA = null; DLUGOSC = dl0;   // mapa czasu znana już przy budowie sceny (T/P)
    if (c0) { const k = c0.kotwice.filter(([r, p]) => r > 0 && r < c0.dl && p > 0 && p < dl0).sort((a, b) => a[1] - b[1]);
      MAPA = [[0, 0]]; for (const [r, p] of k) if (r > MAPA[MAPA.length - 1][0] + .05) MAPA.push([r, p]); MAPA.push([c0.dl, dl0]); } }
  const html = CFG.sceny[n]();
  zanurzone();
  DLUGOSC = CFG.dlugosc(n, DL);
  camera.userData.p0 = camera.position.clone(); camera.updateProjectionMatrix();
  for (const c of karty) c.userData.p0 = c.position.clone();
  let ht = naglowek(n) + html;
  etykiety.forEach((e, i) => { ht += `<div class="etk ${e.klasa}" id="etk${i}" data-od="${e.od}" data-do="${e.do}">${e.tekst}</div>`; });
  ht += `<div id="przej" style="position:absolute;inset:0;display:none"><img id="przejImg" style="position:absolute;inset:0;width:100%;height:100%"><svg width="${W}" height="${H}" style="position:absolute;inset:0"><path id="przejFala" fill="none" stroke="#ffffff" stroke-width="18" stroke-linecap="round"/><path id="przejFala2" fill="none" stroke="#9fe0ff" stroke-width="8"/></svg></div>`;
  ui.innerHTML = ht; if (POZIOM) poziomUklad();
  przejscie = null; T0 = 0;
  if (MAPA) { const dlR = MAPA[MAPA.length - 1][0]; if (REAL) DLUGOSC = dlR; return dlR; }
  return DLUGOSC;
};
// przejście „fala”: ostatnia klatka poprzedniej sceny odpływa w górę, odsłaniana falą z dołu
window.ustawPrzejscie = url => { if (CIAGLA) return Promise.resolve(); przejscie = url; T0 = .35; const i = document.getElementById('przejImg'); i.src = url; document.getElementById('przej').style.display = 'block'; return new Promise(r => { if (i.complete) r(); else i.onload = r; }); };
const DLP = .6;
// układ napisów w poziomie: pozycje pionowe z kadru 1920 px przeskalowane do 1080 px, karty węższe (lewa kolumna), nic poza kadrem
function poziomUklad() {
  for (const el of ui.querySelectorAll('[style*="top"]')) { if (el.classList.contains('etk') || el.id === 'przej') continue; const t = parseFloat(el.style.top); if (!isNaN(t)) el.style.top = Math.round(t * H / 1920) + 'px'; }
  const bloki = [...ui.querySelectorAll('.chip, h1, .opis, .karta, .lista, .koniec, .obserwuj')].filter(e => !e.closest('.lista') || e.classList.contains('lista'));
  const czas = e => { const el = e.dataset.od !== undefined ? [e] : [...e.querySelectorAll('[data-od]')]; if (!el.length) return [-1e9, 1e9];
    return [Math.min(...el.map(x => +x.dataset.od)), Math.max(...el.map(x => x.dataset.do !== undefined ? +x.dataset.do : 1e9))]; };
  // bloki widoczne w tym samym czasie nie mogą na siebie nachodzić: kolejne zsuwane pod poprzednie
  const ulozone = [];
  for (const e of bloki.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)) {
    const [od, dO] = czas(e);
    for (let k = 0; k < 6; k++) { const r = e.getBoundingClientRect(); const kol = ulozone.find(([q, o2, d2]) => { const R = q.getBoundingClientRect(); return od < d2 && o2 < dO && r.left < R.right && r.right > R.left && r.top < R.bottom + 12 && r.bottom > R.top; });
      if (!kol) break; e.style.top = Math.round(kol[0].getBoundingClientRect().bottom + 16) + 'px'; }
    const r = e.getBoundingClientRect(); if (r.height && r.bottom > H - 40) e.style.top = Math.max(120, H - 40 - r.height) + 'px';
    ulozone.push([e, od, dO]); }
}
function rysujPrzejscie(t) {
  const el = document.getElementById('przej'); if (!przejscie) { el.style.display = 'none'; return; }
  const p = Math.min(1, t / DLP); if (p >= 1) { el.style.display = 'none'; return; }
  el.style.display = 'block';
  const e = p * p * (3 - 2 * p), Y = x => H * (1.08 - 1.25 * e) + 55 * Math.sin(x / 130 + p * 9) + 25 * Math.sin(x / 47 - p * 14);
  const poly = []; let d = '';
  for (let x = 0; x <= W; x += 40) { poly.push(`${x}px ${Y(x)}px`); d += (x ? 'L' : 'M') + x + ' ' + Y(x).toFixed(1); }
  poly.push(`${W}px 0px`, `0px 0px`);
  const img = document.getElementById('przejImg');
  img.style.clipPath = `polygon(${poly.join(',')})`; img.style.transform = `translateY(${-90 * e}px) scale(${1 + .05 * e})`; img.style.filter = `blur(${6 * e}px)`;
  document.getElementById('przejFala').setAttribute('d', d); document.getElementById('przejFala2').setAttribute('d', d.replace(/ ([\d.]+)/g, (m, y) => ' ' + (Number(y) + 16).toFixed(1)));
}
// kolor postaci 3D: tint sceny × jasność materiału (część światła idzie z emisji rysunku)
function tintuj(mt, c) { const k = mt.userData.jasnosc ?? 1; mt.color.copy(c).multiplyScalar(k); if (mt.emissive && mt.emissiveMap) mt.emissive.copy(c).multiplyScalar(k); }
const tmpV = new THREE.Vector3();
window.klatka = tr => { const tk = REAL ? tr : naProjekt(tr), t = REAL ? tr + GOFF : tk;   // tk – czas sceny (kamera, napisy), t – czas ruchu
  const k = camera.userData, f = sm(tk / DLUGOSC), fe = 1 - Math.pow(1 - Math.min(1, tk / DLUGOSC), 2.2);
  const cel = k.l1 ? k.cel.clone().lerp(k.l1, k.panorama ? sm((tk / DLUGOSC - .25) / .55) : fe) : k.cel;   // panorama: trzyma start, potem łagodny obrót
  const start = k.p1 ? k.p0.clone().lerp(k.p1, fe) : k.p0.clone();
  const off = start.clone().sub(cel);
  off.applyAxisAngle(new THREE.Vector3(0, 1, 0), (k.orbita ?? .1) * (f - .5)).multiplyScalar(1 - lerp(k.najazd[0], k.najazd[1], fe));
  camera.position.copy(cel).add(off); if (k.stalaY !== undefined) camera.position.y = k.stalaY;
  if (k.klucze) {   // przejazd po kluczach (czas bezwzględny w scenie), łagodnie między nimi
    const K = k.klucze; let i = 0; while (i < K.length - 1 && tk >= K[i + 1][0]) i++;
    const [ta, pa, la] = K[i], [tb, pb, lb] = K[Math.min(i + 1, K.length - 1)], u = tb > ta ? sm((tk - ta) / (tb - ta)) : 1;
    const pz = K[Math.min(i + 1, K.length - 1)][3]; if (pz && u < 1) camera.position.copy(pa).multiplyScalar((1 - u) ** 2).addScaledVector(pz, 2 * u * (1 - u)).addScaledVector(pb, u * u); else camera.position.copy(pa).lerp(pb, u); camera.lookAt(la.clone().lerp(lb, u)); camera.updateMatrixWorld();
  } else { camera.lookAt(cel); camera.updateMatrixWorld(); }
  const sufit = SUFIT;
  for (const m of karty) {
    const u = m.userData; m.position.copy(u.p0);
    let v = 0;
    if (u.plyw) { const { dx, okres, faza, dy } = u.plyw, w = 2 * Math.PI / okres; m.position.x += dx * Math.sin(t * w + faza) * .5; v = dx * .5 * w * Math.cos(t * w + faza); m.position.y += dy * Math.sin(t * 2.1 + faza); }
    if (u.wejscie) { const [od, dl, x0] = u.wejscie, q = (t - chwila(od)) / dl; m.position.x += x0 * (1 - sm(q)); if (q > 0 && q < 1) v += -x0 * 6 * q * (1 - q) / dl; }
    // prędkość z ruch(t − 1/30): poprawny zwrot ryby także w pojedynczej klatce makiety
    // kierunek z ruchu w oknie 0,35 s – bez nagłych zwrotów od drobnych drgań
    let vz = 0;
    if (u.ruch) { const r = u.ruch(t); if (r.x !== undefined) { const r0 = u.ruch(t - .3), r1 = u.ruch(t + .05); v += ((r1.x ?? r.x) - (r0.x ?? r.x)) / .35; if (r.z !== undefined && r0.z !== undefined && r1.z !== undefined) vz = (r1.z - r0.z) / .35; m.position.x = r.x; } if (r.y !== undefined) m.position.y = r.y; if (r.z !== undefined) m.position.z = r.z; if (u.ryba) { u.ryba.kierWymuszony = r.kier; u.ryba.patrzNa = r.patrzNa; } }
    if (u.nurt !== undefined) { const f2 = (u.nurt + t / 2) % 1, z = 1 + 9 * f2; m.position.set(u.nurtX, -.6, z); m.material.opacity = 1; m.scale.setScalar(Math.min(1, Math.min(f2, 1 - f2) * 6)); }
    if (u.pion) m.rotation.set(0, Math.atan2(camera.position.x - m.position.x, camera.position.z - m.position.z), 0);
    if (u.pokaz !== undefined) { const q = Math.max(0, Math.min(1, (tk - (REAL ? chwila(T0 + u.pokaz) : T0 + u.pokaz)) / .35)); m.scale.setScalar(q <= 0 ? .0001 : backOut(q)); }
    else { m.quaternion.copy(camera.quaternion); m.rotateZ(u.rot || 0); }
    if (u.ryba) {
      if (!u.bezKolizji) trzymajRybe(m, sufit);   // bezKolizji: ryba w rękach wędkarza (poza wodą)
      // zwrot w stronę ruchu (karta obraca się przez profil); szybciej płynie = szybciej pracuje ogonem
      const ruchomy = (u.plyw && u.plyw.dx > 0) || u.ruch || u.wejscie;
      // zwrot w 3D: głowa w kierunku ruchu (także w głąb kadru, np. hol – ryba płynie do wędkarza); kąt w układzie zwróconym do kamery
      tmpV.set(1, 0, 0).applyQuaternion(camera.quaternion); const vR = v * tmpV.x + vz * tmpV.z; tmpV.set(0, 0, 1).applyQuaternion(camera.quaternion); const vC = v * tmpV.x + vz * tmpV.z;
      // strona (głowa w prawo / w lewo) zmienia się tylko przy wyraźnym ruchu w bok; ruch w głąb kadru daje tylko skręt do 30°
      if (ruchomy && Math.hypot(vR, vC) > .02) { const g = .5, stara = u.ryba.strona ?? u.ryba.kier;
        const strona = u.ryba.kierWymuszony ?? (Math.abs(vR) > .15 ? Math.sign(vR) : stara); u.ryba.strona = strona;
        const skret = Math.max(-g, Math.min(g, Math.atan2(-vC, Math.max(Math.abs(vR), .05))));
        u.ryba.ostTh = strona > 0 ? skret : Math.PI - skret; }
      if (u.ryba.kierWymuszony !== undefined && !u.ryba.patrzNa) { u.ryba.strona = u.ryba.kierWymuszony; u.ryba.ostTh = u.ryba.kierWymuszony > 0 ? 0 : Math.PI; }
      if (u.ryba.patrzNa) {   // ryba zwrócona do punktu (np. wędkarza w holu): pełny kierunek w głąb kadru, do 60° od profilu
        const [px, pz] = u.ryba.patrzNa, dx = px - m.position.x, dz = pz - m.position.z; tmpV.set(1, 0, 0).applyQuaternion(camera.quaternion); const aR = dx * tmpV.x + dz * tmpV.z;
        tmpV.set(0, 0, 1).applyQuaternion(camera.quaternion); const aC = dx * tmpV.x + dz * tmpV.z, g2 = 1.05, sk = Math.max(-g2, Math.min(g2, Math.atan2(-aC, Math.abs(aR) + 1e-3)));
        u.ryba.strona = aR >= 0 ? 1 : -1; u.ryba.ostTh = aR >= 0 ? sk : Math.PI - sk; }
      const thCel = u.ryba.ostTh ?? (u.ryba.kier < 0 ? Math.PI : 0);
      // obrót płynny: najwyżej ok. 200°/s (pełny zwrot ok. 0,9 s); przy przeskoku czasu (makieta, nowa scena) od razu na cel
      const dtK = u.ryba.tPrev === undefined ? 1 : t - u.ryba.tPrev; u.ryba.tPrev = t;
      let th = u.ryba.thAkt ?? thCel; if (dtK <= 0 || dtK > .2) th = thCel; else { let d = thCel - th; d = Math.atan2(Math.sin(d), Math.cos(d)); th += Math.sign(d) * Math.min(Math.abs(d), 3.5 * dtK); }
      u.ryba.thAkt = th;
      u.wnetrze.rotation.y = th;
      if (u.ryba.branieOd !== undefined) u.ryba.st.paszcza = t > u.ryba.branieOd - .62 && t < u.ryba.branieOd ? 1 : 0;   // paszcza otwiera się ok. 0,6 s przed połknięciem i zamyka się od razu
      if (u.ryba.atakTs !== undefined) { const d = t - u.ryba.atakTs; u.ryba.st.paszcza = d > -.09 && d < .05 ? 1 : 0; u.ryba.st.paszczaCzas = .045; }   // atak: paszcza otwiera się w ok. 0,05 s tuż przed przynętą i zamyka na niej
      u.ryba.anim(t, { tempo: 1 + Math.min(2.5, Math.abs(v) * 1.5), ...u.ryba.st });
      tmpC.copy(TINT).lerp(TINT_WODA, Math.min(.5, .15 + Math.max(0, -m.position.y) / 14));
      m.traverse(o => { if (o.isMesh && !o.userData.otoczka) tintuj(o.material, tmpC); });
      const wal = u.ryba.walka ? u.ryba.walka(t) : 0;   // walka w holu: gwałtowne potrząsanie łbem, przechyły, szybka praca ogona
      m.rotateZ(.035 * Math.sin(t * 1.3 + u.p0.x) + wal * (.22 * Math.sin(t * 13) + .1 * Math.sin(t * 7.7)));
      if (wal) { u.wnetrze.rotation.x = .35 * Math.sin(t * 9.5); u.ryba.anim(t, { tempo: 3.2, ...u.ryba.st, kolce: 1.05 }); } else u.wnetrze.rotation.x = 0;
    }
    if (u.animuj) u.animuj(t);
    if (u.postac) { u.postac.anim(t, u.postac.st); m.traverse(o => { if (o.isMesh && !o.userData.otoczka) tintuj(o.material, TINT); }); }
  }
  for (const [tx, vx, vy, m] of tafle) { tx.offset.x = t * vx; tx.offset.y = t * vy; if (m) m.visible = Math.abs(camera.position.y) > .12; }
  WODA_NAD.value = camera.position.y > .12 ? 1 : 0;   // przygaszanie zanurzonych obiektów tylko przy patrzeniu znad wody   // kamera w tafli: płaszczyzna wody widziana na krawędź zasłaniała brzeg – wtedy wodę rysuje tylko menisk
  kolysz.forEach((g, i) => { g.rotation.z = .04 * Math.sin(t * 1.4 + i); g.rotation.x = .03 * Math.sin(t * 1.1 + i * 2); });
  for (const fn of anim) fn(t);
  // render: kolor → normalne + głębia świata (warstwa 0) → maska + głębia postaci → kompozycja (tusz + woda)
  renderer.setRenderTarget(rtC); renderer.render(scene, camera);
  const bg = scene.background, fog = scene.fog, mask = camera.layers.mask; scene.background = null; scene.fog = null;
  scene.overrideMaterial = normMat; camera.layers.set(0);
  renderer.setRenderTarget(rtN); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(scene, camera);
  scene.overrideMaterial = null; camera.layers.set(POSTACIE);
  renderer.setRenderTarget(rtM); renderer.clear(); renderer.render(scene, camera);
  camera.layers.mask = mask; scene.background = bg; scene.fog = fog;
  const u = kompozycja.uniforms; u.cn.value = camera.near; u.cf.value = camera.far; u.czas.value = t;
  u.invProj.value.copy(camera.projectionMatrixInverse); u.camWorld.value.copy(camera.matrixWorld); u.camPos.value.copy(camera.position);
  renderer.setRenderTarget(null); renderer.render(fsScene, fsCam);
  // HTML: wejścia „pop”, liczniki, etykiety przypięte do świata; T0 = opóźnienie na przejście
  const tt = tk - T0, wd = x => REAL ? tk - chwila(T0 + x) : tt - x;   // w trybie rzeczywistym: pop 0,35 s w czasie rzeczywistym, start na słowo
  for (const el of ui.querySelectorAll('[data-od]')) {
    const p = Math.max(0, Math.min(1, wd(Number(el.dataset.od)) / .35)) * (el.dataset.do ? 1 - sm(wd(Number(el.dataset.do)) / .25) : 1);
    el.style.opacity = String(Math.min(1, p * 3));
    const sk = p <= 0 ? .6 : backOut(p);
    if (el.classList.contains('etk')) {
      const e = etykiety[Number(el.id.slice(3))]; if (e.za) e.v.copy(e.za.position).add(e.zaOff);   // etykieta przypięta do ruchomego obiektu (np. ryby)
      const s = e.v.clone().project(camera);
      e.ekran = [(s.x + 1) / 2 * W, (1 - s.y) / 2 * H, s.z < 1];
      el.style.left = e.ekran[0] + (e.wsk ? e.wsk[0] : 0) + 'px'; el.style.top = e.ekran[1] + (e.wsk ? e.wsk[1] : 0) + 'px';
      el.style.transform = el.classList.contains('dymek') ? `translate(-20%,calc(-100% - 40px)) scale(${sk})` : e.wsk ? `translate(-50%,-50%) scale(${sk})` : `translate(-50%,-100%) scale(${sk})`; el.style.transformOrigin = el.classList.contains('dymek') ? '20% 100%' : '50% 50%';
    } else el.style.transform = `translateY(${(1 - p) * 40}px) scale(${.85 + .15 * sk})`;
    const lz = el.querySelector('[data-licz]'); if (lz) lz.textContent = Math.round(Number(lz.dataset.licz) * sm(wd(Number(el.dataset.od)) / .8)) + ' cm';
  }
  rozsunNapisy(); rysujWskazniki();
  const pp = document.getElementById('pp' + numer); if (pp) pp.style.width = (100 * Math.min(1, Math.max(0, tk / DLUGOSC))).toFixed(1) + '%';
  rysujPrzejscie(REAL ? tr : t);
};
// napisy nie mogą na siebie nachodzić: etykiety przesuwane w pionie poza tytuły, karty i inne etykiety
function rozsunNapisy() {
  // każda etykieta trafia w najbliższe wolne miejsce (najmniejsze przesunięcie w pionie i poziomie), w granicach bezpiecznej strefy
  const widoczne = e => Number(e.style.opacity || 1) > .05, pad = 10;
  const zajete = [...ui.querySelectorAll('.top, .postep, .chip, h1, .opis, .karta')].filter(e => !e.classList.contains('etk') && widoczne(e)).map(e => e.getBoundingClientRect());
  const lista = [...ui.querySelectorAll('.etk')].filter(widoczne).sort((a, b) => Number(a.dataset.od) - Number(b.dataset.od));
  const kandydaci = [];
  for (let dy = 0; dy <= 520; dy += 20) for (const sy of dy ? [1, -1] : [1]) for (let dx = 0; dx <= 360; dx += 60) for (const sx of dx ? [1, -1] : [1]) kandydaci.push([sx * dx, sy * dy]);
  kandydaci.sort((a, b) => Math.hypot(a[0] * 1.6, a[1]) - Math.hypot(b[0] * 1.6, b[1]));
  for (const el of lista) {
    const r = el.getBoundingClientRect();
    const wolne = ([dx, dy]) => r.left + dx > 16 && r.right + dx < W - 16 && r.top + dy > 140 && r.bottom + dy < H - (POZIOM ? 110 : 230) &&
      !zajete.some(z => r.left + dx < z.right + pad && r.right + dx > z.left - pad && r.top + dy < z.bottom + pad && r.bottom + dy > z.top - pad);
    const [dx, dy] = kandydaci.find(wolne) || [0, 0];
    if (dx || dy) { el.style.left = parseFloat(el.style.left) + dx + 'px'; el.style.top = parseFloat(el.style.top) + dy + 'px'; }
    zajete.push(el.getBoundingClientRect());
  }
}
// strzałki wskaźników: od krawędzi etykiety do wskazanego miejsca
function rysujWskazniki() {
  let svg = document.getElementById('wskazniki');
  if (!svg) { svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.id = 'wskazniki'; svg.setAttribute('width', W); svg.setAttribute('height', H); svg.style.cssText = 'position:absolute;inset:0;pointer-events:none'; ui.prepend(svg); }
  let d = '';
  for (const el of ui.querySelectorAll('.etk.wsk')) {
    const e = etykiety[Number(el.id.slice(3))], op = Number(el.style.opacity || 0); if (!e?.ekran || op < .3 || !e.ekran[2]) continue;
    const r = el.getBoundingClientRect(), [tx, ty] = e.ekran, cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
    const k = Math.min(Math.abs((r.width / 2 + 6) / ((tx - cx) || 1e-6)), Math.abs((r.height / 2 + 6) / ((ty - cy) || 1e-6)), 1);
    const sx = cx + (tx - cx) * k, sy = cy + (ty - cy) * k, L = Math.hypot(tx - sx, ty - sy); if (L < 24) continue;
    const ux = (tx - sx) / L, uy = (ty - sy) / L, ex = tx - ux * 10, ey = ty - uy * 10;
    d += `M${sx.toFixed(1)} ${sy.toFixed(1)} L${ex.toFixed(1)} ${ey.toFixed(1)} M${(ex - ux * 18 - uy * 12).toFixed(1)} ${(ey - uy * 18 + ux * 12).toFixed(1)} L${ex.toFixed(1)} ${ey.toFixed(1)} L${(ex - ux * 18 + uy * 12).toFixed(1)} ${(ey - uy * 18 - ux * 12).toFixed(1)} `;
  }
  svg.innerHTML = d ? `<path d="${d}" fill="none" stroke="#241726" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>` : '';
}
// zdarzenia dźwiękowe sceny (czas od początku sceny)
// dźwięki akcji ustawiane w scenie: dzwiek(czas, typ, głośność 0–1) – rzut, przynęta w wodzie, branie, hol, wypuszczenie ryby
let dzwieki = [];
function dzwiek(t, typ, gl = 1) { dzwieki.push({ t, typ, gl }); }
window.zdarzeniaAudio = () => {
  const z = numer === 1 ? (dzwieki.length ? [] : [{ t: 0, typ: 'plusk' }]) : CIAGLA ? [] : [{ t: 0, typ: 'przejscie' }];   // ujęcie ciągłe: bez szumu przejścia (scena dodaje świst przelotu kamery)   // scena 1 z własnymi dźwiękami (rzut, plusk) – bez drugiego plusku
  if (numer > 1 && !CIAGLA && camera.position.y < .2) z.push({ t: T0 + .25, typ: 'zanurzenie', gl: .55 });   // ujęcie pod wodą / pół na pół: bąbelki zanurzenia
  for (const el of ui.querySelectorAll('[data-od]')) {
    const t = Number(el.dataset.od) + T0, k = el.classList;
    z.push({ t, typ: k.contains('karta') || k.contains('opis') ? 'slizg' : 'pop' });
    if (el.querySelector('[data-licz]')) z.push({ t: t + .05, typ: 'licznik' });
  }
  for (const k of karty) if (k.userData.wejscie) z.push({ t: k.userData.wejscie[0] + .3, typ: 'plusk' });
  for (const d of dzwieki) z.push({ ...d, t: d.t + T0 });
  return z.map(e => ({ ...e, t: naRzecz(e.t) }));
};
window.tloAudio = () => CFG.tlo(numer);
window.scena = (n, t) => { window.zbuduj(n); window.klatka(t ?? DLUGOSC - .3); };
window.__scene = () => scene; window.__cam = () => camera; window.__THREE = THREE;
// narzędzie kontrolne: rzut punktu świata na ekran (x, y w zakresie -1…1 = w kadrze)
window.__scena = () => ({ scene, camera });   // diagnostyka (testy kadrów)
window.rzut = (x, y, z) => { const v = new THREE.Vector3(x, y, z).project(camera); return [+v.x.toFixed(2), +v.y.toFixed(2)]; };
window.teren = (x, z) => +TEREN(x, z).toFixed(2);
// diagnostyka kadru: każdy element sceny (ryby, postacie, assety, przynęty na żyłce) z pozycją na ekranie
// (x, y w -1…1 = w kadrze) – do ustawiania obiektów w wąskim pionowym kadrze bez zgadywania
// kontrola napisów: pary widocznych napisów, które na siebie nachodzą (powinno być pusto)
window.nakladki = () => { const el = [...ui.querySelectorAll('.chip, h1, .opis, .karta, .etk')].filter(e => Number(e.style.opacity || 1) > .3 && !(e.classList.contains('karta') && e.closest('.lista') && false));
  const r = el.map(e => [e, e.getBoundingClientRect()]), wyn = [];
  for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) { const [a, A] = r[i], [b, B] = r[j]; if (a.contains(b) || b.contains(a)) continue;
    if (A.left < B.right - 2 && A.right > B.left + 2 && A.top < B.bottom - 2 && A.bottom > B.top + 2) wyn.push(a.textContent.trim().slice(0, 24) + ' ✕ ' + b.textContent.trim().slice(0, 24)); }
  // napisy nie mogą zasłaniać sprzętu, przynęt ani postaci (obiekty 3D z karty `karty`, rzut ich bryły na ekran)
  const bx = new THREE.Box3(), v = new THREE.Vector3(), Wd = innerWidth, Hd = innerHeight;
  for (const m of karty) { if (!m.visible || !(m.userData.animuj || m.userData.postac)) continue; if (m.userData.pokaz !== undefined && m.scale.x < .5) continue;
    bx.setFromObject(m, true); if (bx.isEmpty()) continue; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (let i = 0; i < 8; i++) { v.set(i & 1 ? bx.max.x : bx.min.x, i & 2 ? bx.max.y : bx.min.y, i & 4 ? bx.max.z : bx.min.z).project(camera); if (v.z > 1) continue;
      const sx = (v.x + 1) / 2 * Wd, sy = (1 - v.y) / 2 * Hd; x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy); }
    const sz = Math.min(x1 - x0, y1 - y0); if (x1 < 0 || x0 > Wd || y1 < 0 || y0 > Hd || sz < 6) continue;
    const ins = Math.min(8, sz * .15), nazwa = m.userData.postac ? 'wędkarz' : 'sprzęt/przynęta';
    for (const [a, A] of r) if (A.left < x1 - ins && A.right > x0 + ins && A.top < y1 - ins && A.bottom > y0 + ins && !a.classList.contains('chip')) {
      if (m.userData.postac && (!a.classList.contains('etk') || a.classList.contains('dymek'))) continue;   // dymek mowy celowo przy głowie   // duże karty nad wędkarzem w tle sprawdza oko, nie automat
      wyn.push(a.textContent.trim().slice(0, 24) + ' ✕ ' + nazwa + ` (${Math.round(m.position.x * 100) / 100}, ${Math.round(m.position.y * 100) / 100})`); } }
  for (const [a, A] of r) if (A.left < 8 || A.right > innerWidth - 8 || A.top < 8 || A.bottom > innerHeight - 8) wyn.push(a.textContent.trim().slice(0, 24) + ' – poza kadrem');   // napis ucięty krawędzią
  return wyn; };
// kontrola strzałek: promień z kamery przez wskazany punkt – w co trafia i czy obiekt jest TAM, gdzie wskazuje strzałka
window.wskazniki = (tylko) => { const rc = new THREE.Raycaster(), o = [], v = new THREE.Vector3(), W = innerWidth, H = innerHeight; rc.layers.enableAll();
  const typ = m => { for (let x = m; x; x = x.parent) { if (x.userData.teren) return 'dno/brzeg'; if (x.userData.ryba) return 'ryba'; if (x.userData.postac) return 'wędkarz'; if (x.userData.przyneta) return 'przynęta'; } return m.geometry?.type?.replace('Geometry', '') || 'obiekt'; };
  const pierwszy = ndc => { rc.setFromCamera(ndc, camera); rc.far = 400; return rc.intersectObjects(scene.children, true).find(h => h.object.isMesh && h.object.visible && h.object.material.depthWrite !== false && !(h.object.material.transparent && h.object.material.opacity < .95 && !h.object.material.map)); };
  etykiety.forEach((e, i) => { if (!e.wsk || (tylko !== undefined && tylko !== i)) return;
    if (e.wToni) return o.push({ i, tekst: e.tekst, od: e.od, do: e.do, trafia: 'toń', ocena: 'OK' });
    const d = e.v.distanceTo(camera.position); v.copy(e.v).project(camera); let best = null;
    for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) { const h = pierwszy(new THREE.Vector2(v.x + a * 16 / W, v.y + b * 16 / H)); if (h && (!best || Math.abs(h.distance - d) < Math.abs(best.distance - d))) best = h; }   // siatka promieni ±32 px: cienkie liście i łodygi
    let ocena = 'OK';
    if (!best) ocena = '!! w pustkę (za punktem nic nie ma)';
    else if (best.distance < d - .7) ocena = `!! zasłonięte: ${typ(best.object)} ${(d - best.distance).toFixed(1)} m przed punktem`;
    else if (best.distance > d + .7) ocena = `!! punkt w wodzie/powietrzu: najbliżej ${typ(best.object)} ${(best.distance - d).toFixed(1)} m za`;
    o.push({ i, tekst: e.tekst, od: e.od, do: e.do, trafia: best ? typ(best.object) : '-', ocena }); });
  return o; };
window.diagnostyka = () => { const o = [], v = new THREE.Vector3();
  for (const m of karty) { v.copy(m.position).project(camera); o.push([m.userData.ryba ? 'ryba' : m.userData.postac ? 'postac' : m.userData.animuj ? 'asset' : 'karta', m.position.toArray().map(a => +a.toFixed(2)), +v.x.toFixed(2), +v.y.toFixed(2)]); }
  scene.traverse(m => { if (m.userData.przyneta && !karty.includes(m.parent)) { v.copy(m.position).project(camera); o.push(['przyneta', m.position.toArray().map(a => +a.toFixed(2)), +v.x.toFixed(2), +v.y.toFixed(2)]); } });
  for (const e of etykiety) { v.copy(e.v).project(camera); o.push(['etykieta:' + e.tekst, e.v.toArray().map(a => +a.toFixed(2)), +v.x.toFixed(2), +v.y.toFixed(2)]); }
  return o; };
// start filmu: sceny = { 1: () => html, ... }, kadry makiety = [[scena, czas], ...]
export function uruchom(cfg) {
  CFG = { ...CFG, ...cfg };
  window.liczbaScen = CFG.liczba;
  window.kadryMakiety = CFG.kadry || Array.from({ length: CFG.liczba }, (_, i) => [i + 1, null]);
  window.gotowe = true;
}

export { THREE, W, H, NOINK, POSTACIE, INK, lerp, sm, rnd, C, toon, karta, strzalka, ikra, owin, okon, szczupak, plotka, ukleja, wedkarz,
  scene, camera, TEREN, kamienie, anim, linka, nowaScena, add, cien, szum, lad, wzgorza, jezioroH, rzekaX, ZATOKA, rzekaH, teren, las,
  trzciny, palki, kamien, rumosz, laka, mewy, roslinaWodna, rdestnice, rogatki, grazele, rdestPlat, wstaw, nurtLinia, wskaz, brzegX, element, grzybienie, konar, zatopioneDrzewo, pomost, chmura, slonce, postaw, etykieta, plyw,
  LATO, ZIMA, ZLOTA, JESIEN, NOC, DESZCZ, ksiezyc, deszcz, swiatJezioro, swiatRzeka, glowka, most, sciezka, pokaz, trawa, babelki, mul, promienie, kregi, wazka, snieg, zylka, atak, przedplan, kam, karty, etykiety, PRZYNETY, przypnij, wToni, dzwiek };
