// Statyczna makieta filmu 3D (three.js w Chromium/SwiftShader) → atlas3d/out/<nazwa>/01..NN.png + _plansza.jpg
// Kadry makiety podaje film (window.kadryMakiety = [[scena, czas], …]); film ma window.liczbaScen scen.
// Użycie: node atlas3d/render_makieta.mjs okon_gdzie [numery kadrów, np. 3,4] [--animacja]
// --animacja: niemy podgląd ruchu (bez lektora) → atlas3d/out/<nazwa>/podglad_animacji.mp4
// --film [--dl 4.3]: film 30 fps z efektami (audio/sfx) i tłem (szum wody/wiatr), BEZ lektora → wideo/<nazwa>_bez_lektora.mp4
// --film --lektor audio/<film>/lektor.mp3: film z lektorem → wideo/<nazwa>.mp4
// --test: szybki podgląd filmu (5 kl./s, 540×960) → wideo/<nazwa>_test.mp4 – do sprawdzania tempa, czytelności i synchronizacji
// --skala 0.6667: mniejsza rozdzielczość (np. 720×1280) – plik wideo/<nazwa>_720p<fps>.mp4
// Render filmu PO SCENACH: każda scena → atlas3d/out/<nazwa>/sceny/sNN.mp4 (bezstratnie, sklejane na końcu).
// --wznow: sceny już wyrenderowane zostają (po awarii / po poprawce), --popraw 5,7: te sceny renderuj od nowa mimo --wznow.
// Silnik: Mesa llvmpipe na Xvfb (atlas3d/przegladarka.mjs), szybki zapis klatek przez CDP, kontrola kadrów (czarne/białe plamy).
import { przegladarka, zrzutnik, KONTROLA, zlyKadr } from './przegladarka.mjs';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const nazwa = process.argv[2] || 'okon_gdzie';
const argi = process.argv.slice(3), TEST = argi.includes('--test'), FILM = TEST || argi.includes('--film'), ANIM = FILM || argi.includes('--animacja'), FPS = argi.includes('--fps') ? Number(argi[argi.indexOf('--fps') + 1]) : TEST ? 5 : FILM ? 24 : 24, SKALA = argi.includes('--skala') ? Number(argi[argi.indexOf('--skala') + 1]) : TEST ? .5 : 1;   // domyślnie 24 kl./s (wystarcza na IG/TikTok)
const DL = argi.includes('--dl') ? Number(argi[argi.indexOf('--dl') + 1]) : (FILM ? 4.3 : 3.6);
const lista = argi.find((a, i) => /^\d/.test(a) && argi[i - 1] !== '--dl' && argi[i - 1] !== '--fps' && argi[i - 1] !== '--skala');
const OUT = path.join(ROOT, 'atlas3d/out', nazwa); fs.mkdirSync(OUT, { recursive: true });

const typy = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css' };
const srv = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': typy[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(0);

const { przegladarka: browser, silnik } = await przegladarka(); console.log('silnik WebGL:', silnik);
const POZ = argi.includes('--poziom');   // wersja pozioma 1920×1080 (YouTube)
const VP = POZ ? { width: 1920, height: 1080 } : { width: 1080, height: 1920 };
const SS = argi.includes('--ss') ? Number(argi[argi.indexOf('--ss') + 1]) : 1,   /* supersampling tylko na życzenie (--ss 1.5) – wydłuża render (decyzja użytkownika: bez dłuższego renderu) */ SKR = Math.min(1, SKALA * SS);   // --ss 1.5: supersampling (render w większej rozdzielczości, zapis w docelowej)
const page = await browser.newPage({ viewport: VP, deviceScaleFactor: SKALA });
const zrzut = await zrzutnik(page, { szer: VP.width, wys: VP.height, skala: SKALA });
page.on('pageerror', e => console.error('błąd strony:', e.message));
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('konsola:', m.text()); });
await page.goto(`http://localhost:${srv.address().port}/atlas3d/${nazwa}.html?dl=${DL}&skala=${SKR}${POZ ? '&poziom=1' : ''}${argi.includes('--rozmycie') ? '&rozmycie=1' : ''}`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.gotowe);
await page.evaluate(() => document.fonts.ready);
const liczba = await page.evaluate(() => window.liczbaScen || 9), kadryFilmu = await page.evaluate(() => window.kadryMakiety);
const wybor = lista ? lista.split(',').map(Number) : null;
if (ANIM) {
  const kadry = wybor || Array.from({ length: liczba }, (_, i) => i + 1);   // tu: numery scen
  const { spawn } = await import('node:child_process');
  const plik = FILM ? path.join(OUT, 'film_obraz.mp4') : path.join(OUT, 'podglad_animacji.mp4');
  const WZNOW = argi.includes('--wznow'), POPRAW = argi.includes('--popraw') ? argi[argi.indexOf('--popraw') + 1].split(',').map(Number) : [];
  const SC = path.join(OUT, 'sceny' + (TEST ? '_test' : '') + (POZ ? '_poziom' : '') + `_${Math.round(1080 * SKALA)}p${FPS}`); fs.mkdirSync(SC, { recursive: true });
  const t0 = Date.now(), zdarzenia = [], tla = [], segmenty = [], bledy = [], podWodaSc = []; let start = 0, ostatnia = null, klatek = 0;
  for (const n of kadry) {
    const dl = await page.evaluate(n => window.zbuduj(n), n), N = Math.round(dl * FPS), seg = path.join(SC, `s${String(n).padStart(2, '0')}.mp4`), ost = seg.replace('.mp4', '_ost.png');
    for (const z of await page.evaluate(() => window.zdarzeniaAudio())) zdarzenia.push({ t: start + z.t, typ: z.typ, gl: z.gl ?? 1 });
    tla.push({ od: start, do: start + N / FPS, typ: await page.evaluate(() => window.tloAudio()) });
    segmenty.push(seg); podWodaSc.push([start, seg.replace('.mp4', '_podwoda.json')]); start += N / FPS;
    if (WZNOW && !POPRAW.includes(n) && fs.existsSync(seg) && fs.existsSync(ost)) { ostatnia = fs.readFileSync(ost); console.log(`scena ${n}: jest, pomijam`); continue; }
    // przejście: ostatnia klatka poprzedniej sceny odpływa z falą (scena sama rysuje nakładkę)
    if (ostatnia) await page.evaluate(u => window.ustawPrzejscie(u), 'data:image/png;base64,' + ostatnia.toString('base64'));
    // bezstratnie (PNG → x264 crf 16) – bez podwójnej kompresji JPEG; podgląd/test w JPEG (szybciej)
    const fmt = FILM && !TEST ? 'png' : 'jpeg';
    const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-crf', FILM && !TEST ? '16' : '20', '-r', String(FPS), seg], { stdio: ['pipe', 'ignore', 'ignore'] });
    const ts = Date.now(), podWoda = [];
    for (let i = 0; i < N; i++) {
      // rozmycie ruchu: w szybkich chwilach (window.rozmycie) średnia z kilku pod-klatek, poza nimi zwykła klatka
      const kontrola = i % 12 === 0 || i === N - 1, st = await page.evaluate(([t, k, fps]) => { const n = window.rozmycie ? window.rozmycie(t) : 1;
        if (n > 1) window.klatkaRozmyta(t, n, fps); else { if (window.bezRozmycia) window.bezRozmycia(); window.klatka(t); } return k && n === 1 ? eval(k) : null; }, [i / FPS, kontrola ? KONTROLA : '', FPS]);
      podWoda.push(await page.evaluate(() => window.podWoda ? window.podWoda() : false));
      if (zlyKadr(st)) bledy.push(`scena ${n}, klatka ${i}: czarne ${(st.czarne * 100).toFixed(0)}%, białe ${(st.biale * 100).toFixed(0)}%`);
      const k = await zrzut(fmt); if (!ff.stdin.write(k)) await new Promise(r => ff.stdin.once('drain', r)); if (i === N - 1) ostatnia = fmt === 'png' ? k : await zrzut('png');
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r)); fs.writeFileSync(ost, ostatnia); klatek += N;
    fs.writeFileSync(seg.replace('.mp4', '_podwoda.json'), JSON.stringify(podWoda));
    console.log(`scena ${n} gotowa: ${N} kl. w ${Math.round((Date.now() - ts) / 1000)} s (${((Date.now() - ts) / N / 1000).toFixed(2)} s/kl.), razem ${Math.round((Date.now() - t0) / 1000)} s`);
  }
  if (bledy.length) { console.error('UWAGA – podejrzane kadry (czarne/białe plamy):\n' + bledy.join('\n')); }
  // sklejenie scen (bez ponownego kodowania)
  fs.writeFileSync(path.join(SC, 'lista.txt'), segmenty.map(f => `file '${f}'`).join('\n'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(SC, 'lista.txt'), '-c', 'copy', '-movflags', '+faststart', plik]);
  await browser.close(); srv.close();
  if (FILM) {
    // tło: syntetyczny szum (bez cudzej muzyki), efekty z biblioteki audio/sfx, całość -16 LUFS + limiter
    const TLO = {   // [źródło szumu, obróbka]
      jezioro: ['color=brown:amplitude=0.5:seed=3', 'lowpass=f=500,highpass=f=60,tremolo=f=0.35:d=0.5'],
      rzeka: ['color=pink:amplitude=0.4:seed=5', 'bandpass=f=900:width_type=o:w=2.2,tremolo=f=1.3:d=0.25'],
      wiatr: ['color=pink:amplitude=0.4:seed=7', 'lowpass=f=800,highpass=f=120,tremolo=f=0.18:d=0.75'],
    };
    const GL = { plusk: 0.9, przejscie: 0.55, pop: 0.6, slizg: 0.55, licznik: 0.5, dzwonek: 0.6, rzut: 0.6, hamulec: 0.5, zanurzenie: 0.6, wazka: 0.5, lawica: 0.6, korbka: 0.5, lyk: 0.8, mewy: 0.55, nurt: 0.5, babelki: 0.5, dno: 0.7, brzeg: 0.45, ogon: 0.6 };
    const we = [], fil = [], mix = [];
    // pod wodą: efekty i tło stłumione (filtr dolnoprzepustowy) – przedziały z zapisu kamery w każdej klatce
    const podw = []; for (const [s0, f] of podWodaSc) { if (!fs.existsSync(f)) continue; const a = JSON.parse(fs.readFileSync(f)); let od = null;
      a.forEach((v, i) => { if (v && od === null) od = i; if ((!v || i === a.length - 1) && od !== null) { podw.push([s0 + od / FPS, s0 + (v ? i + 1 : i) / FPS]); od = null; } }); }
    const stlum = podw.length ? `,lowpass=f=700:enable='${podw.map(([a, b]) => `between(t,${a.toFixed(3)},${b.toFixed(3)})`).join('+')}'` : '';
    const typy = [...new Set(tla.map(t => t.typ))];
    typy.forEach((ty, i) => {
      const okna = tla.filter(t => t.typ === ty).map(t => `between(t,${t.od.toFixed(3)},${t.do.toFixed(3)})`).join('+');
      fil.push(`anoisesrc=${TLO[ty][0]}:sample_rate=48000:duration=${start.toFixed(3)},${TLO[ty][1]},aformat=channel_layouts=stereo,volume='0.35*(${okna})':eval=frame[tlo${i}]`);
      mix.push(`[tlo${i}]`);
    });
    zdarzenia.forEach((z, i) => {
      we.push('-i', path.join(ROOT, 'audio/sfx', z.typ + '.wav'));
      const ms = Math.max(0, Math.round(z.t * 1000));
      fil.push(`[${i + 1}:a]aresample=48000,aformat=channel_layouts=stereo,volume=${((GL[z.typ] ?? .5) * z.gl).toFixed(3)},adelay=${ms}|${ms}[s${i}]`); mix.push(`[s${i}]`);
    });
    // --lektor <plik>: lektor -15 LUFS na wierzchu, efekty i tło ok. 13 dB ciszej (zasada projektu: efekty zawsze pod lektorem)
    const iL = argi.indexOf('--lektor'), LEKTOR = iL >= 0 ? path.resolve(ROOT, argi[iL + 1]) : null;
    if (LEKTOR) { we.push('-i', LEKTOR); const k = zdarzenia.length + 1;
      fil.push(`${mix.join('')}amix=inputs=${mix.length}:normalize=0:duration=longest,atrim=0:${start.toFixed(3)}${stlum},loudnorm=I=-28:TP=-8:LRA=11[tlo]`);
      fil.push(`[${k}:a]aresample=48000,aformat=channel_layouts=stereo,loudnorm=I=-15:TP=-1.5:LRA=11,apad[lek]`);
      fil.push(`[tlo][lek]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.89,aresample=48000[a]`); }
    else fil.push(`${mix.join('')}amix=inputs=${mix.length}:normalize=0:duration=longest,atrim=0:${start.toFixed(3)}${stlum},loudnorm=I=-16:TP=-1.5:LRA=11,alimiter=limit=0.9,aresample=48000[a]`);
    const wynik = path.join(ROOT, 'wideo', TEST ? `${nazwa}_test.mp4` : POZ ? `${nazwa}_youtube_${Math.round(1080 * SKALA)}p${FPS}.mp4` : SKALA !== 1 ? `${nazwa}_${Math.round(1080 * SKALA)}p${FPS}.mp4` : LEKTOR ? `${nazwa}.mp4` : `${nazwa}_bez_lektora.mp4`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', plik, ...we, '-filter_complex', fil.join(';'), '-map', '0:v:0', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', start.toFixed(3), '-movflags', '+faststart', wynik]);
    fs.writeFileSync(path.join(OUT, 'zdarzenia_audio.json'), JSON.stringify({ zdarzenia, tla }, null, 1));
    fs.unlinkSync(plik);   // sceny zostają w atlas3d/out/<nazwa>/sceny_* (wznawianie, poprawki pojedynczych scen)
    console.log(wynik);
  } else console.log(plik);
  process.exit(0);
}
for (const [i, [sc, t]] of kadryFilmu.entries()) {   // tu: numery kadrów makiety (1…)
  if (wybor && !wybor.includes(i + 1)) continue;
  const t0 = Date.now();
  await page.evaluate(([sc, t]) => window.scena(sc, t ?? undefined), [sc, t]);
  fs.writeFileSync(path.join(OUT, String(i + 1).padStart(2, '0') + '.png'), await zrzut('png'));
  console.log(`kadr ${i + 1} (scena ${sc}): ${Date.now() - t0} ms`);
}
await browser.close(); srv.close();
execFileSync('python3', [path.join(ROOT, 'atlas/plansza.py'), OUT]);
console.log(path.join(OUT, '_plansza.jpg'));
