// Statyczna makieta filmu 3D (three.js w Chromium/SwiftShader) → atlas3d/out/<nazwa>/01..NN.png + _plansza.jpg
// Kadry makiety podaje film (window.kadryMakiety = [[scena, czas], …]); film ma window.liczbaScen scen.
// Użycie: node atlas3d/render_makieta.mjs okon_gdzie [numery kadrów, np. 3,4] [--animacja]
// --animacja: niemy podgląd ruchu (bez lektora) → atlas3d/out/<nazwa>/podglad_animacji.mp4
// --film [--dl 4.3]: film 30 fps z efektami (audio/sfx) i tłem (szum wody/wiatr), BEZ lektora → wideo/<nazwa>_bez_lektora.mp4
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const nazwa = process.argv[2] || 'okon_gdzie';
const argi = process.argv.slice(3), FILM = argi.includes('--film'), ANIM = FILM || argi.includes('--animacja'), FPS = FILM ? 30 : 24;
const DL = argi.includes('--dl') ? Number(argi[argi.indexOf('--dl') + 1]) : (FILM ? 4.3 : 3.6);
const lista = argi.find((a, i) => /^\d/.test(a) && argi[i - 1] !== '--dl');
const OUT = path.join(ROOT, 'atlas3d/out', nazwa); fs.mkdirSync(OUT, { recursive: true });

const typy = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css' };
const srv = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': typy[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(0);

const browser = await chromium.launch({ ...(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {}), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('pageerror', e => console.error('błąd strony:', e.message));
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('konsola:', m.text()); });
await page.goto(`http://localhost:${srv.address().port}/atlas3d/${nazwa}.html?dl=${DL}`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.gotowe);
await page.evaluate(() => document.fonts.ready);
const liczba = await page.evaluate(() => window.liczbaScen || 9), kadryFilmu = await page.evaluate(() => window.kadryMakiety);
const wybor = lista ? lista.split(',').map(Number) : null;
if (ANIM) {
  const kadry = wybor || Array.from({ length: liczba }, (_, i) => i + 1);   // tu: numery scen
  const { spawn } = await import('node:child_process');
  const plik = FILM ? path.join(OUT, 'film_obraz.mp4') : path.join(OUT, 'podglad_animacji.mp4');
  const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', FILM ? '18' : '20', '-movflags', '+faststart', plik], { stdio: ['pipe', 'ignore', 'ignore'] });
  const t0 = Date.now(), zdarzenia = [], tla = []; let start = 0, ostatnia = null;
  for (const n of kadry) {
    const dl = await page.evaluate(n => window.zbuduj(n), n), N = Math.round(dl * FPS);
    // przejście: ostatnia klatka poprzedniej sceny odpływa z falą (scena sama rysuje nakładkę)
    if (ostatnia) await page.evaluate(u => window.ustawPrzejscie(u), 'data:image/jpeg;base64,' + ostatnia.toString('base64'));
    for (const z of await page.evaluate(() => window.zdarzeniaAudio())) zdarzenia.push({ t: start + z.t, typ: z.typ });
    tla.push({ od: start, do: start + N / FPS, typ: await page.evaluate(() => window.tloAudio()) });
    for (let i = 0; i < N; i++) { await page.evaluate(t => window.klatka(t), i / FPS); ostatnia = await page.screenshot({ type: 'jpeg', quality: 92 }); ff.stdin.write(ostatnia); }
    start += N / FPS;
    console.log(`scena ${n} gotowa, ${Math.round((Date.now() - t0) / 1000)} s`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  await browser.close(); srv.close();
  if (FILM) {
    // tło: syntetyczny szum (bez cudzej muzyki), efekty z biblioteki audio/sfx, całość -16 LUFS + limiter
    const TLO = {   // [źródło szumu, obróbka]
      jezioro: ['color=brown:amplitude=0.5:seed=3', 'lowpass=f=500,highpass=f=60,tremolo=f=0.35:d=0.5'],
      rzeka: ['color=pink:amplitude=0.4:seed=5', 'bandpass=f=900:width_type=o:w=2.2,tremolo=f=1.3:d=0.25'],
      wiatr: ['color=pink:amplitude=0.4:seed=7', 'lowpass=f=800,highpass=f=120,tremolo=f=0.18:d=0.75'],
    };
    const GL = { plusk: 0.9, przejscie: 0.55, pop: 0.6, slizg: 0.55, licznik: 0.5, dzwonek: 0.6 };
    const we = [], fil = [], mix = [];
    const typy = [...new Set(tla.map(t => t.typ))];
    typy.forEach((ty, i) => {
      const okna = tla.filter(t => t.typ === ty).map(t => `between(t,${t.od.toFixed(3)},${t.do.toFixed(3)})`).join('+');
      fil.push(`anoisesrc=${TLO[ty][0]}:sample_rate=48000:duration=${start.toFixed(3)},${TLO[ty][1]},aformat=channel_layouts=stereo,volume='0.35*(${okna})':eval=frame[tlo${i}]`);
      mix.push(`[tlo${i}]`);
    });
    zdarzenia.forEach((z, i) => {
      we.push('-i', path.join(ROOT, 'audio/sfx', z.typ + '.wav'));
      const ms = Math.max(0, Math.round(z.t * 1000));
      fil.push(`[${i + 1}:a]aresample=48000,aformat=channel_layouts=stereo,volume=${GL[z.typ] ?? .5},adelay=${ms}|${ms}[s${i}]`); mix.push(`[s${i}]`);
    });
    fil.push(`${mix.join('')}amix=inputs=${mix.length}:normalize=0:duration=longest,atrim=0:${start.toFixed(3)},loudnorm=I=-16:TP=-1.5:LRA=11,alimiter=limit=0.9,aresample=48000[a]`);
    const wynik = path.join(ROOT, 'wideo', `${nazwa}_bez_lektora.mp4`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', plik, ...we, '-filter_complex', fil.join(';'), '-map', '0:v:0', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', wynik]);
    fs.writeFileSync(path.join(OUT, 'zdarzenia_audio.json'), JSON.stringify({ zdarzenia, tla }, null, 1));
    fs.unlinkSync(plik);
    console.log(wynik);
  } else console.log(plik);
  process.exit(0);
}
for (const [i, [sc, t]] of kadryFilmu.entries()) {   // tu: numery kadrów makiety (1…)
  if (wybor && !wybor.includes(i + 1)) continue;
  const t0 = Date.now();
  await page.evaluate(([sc, t]) => window.scena(sc, t ?? undefined), [sc, t]);
  await page.screenshot({ path: path.join(OUT, String(i + 1).padStart(2, '0') + '.png') });
  console.log(`kadr ${i + 1} (scena ${sc}): ${Date.now() - t0} ms`);
}
await browser.close(); srv.close();
execFileSync('python3', [path.join(ROOT, 'atlas/plansza.py'), OUT]);
console.log(path.join(OUT, '_plansza.jpg'));
