// Wspólny start przeglądarki do renderu filmów 3D (Atlas 3D).
// Szybka ścieżka: Chromium na wirtualnym ekranie Xvfb z Mesa llvmpipe (WebGL liczony wielowątkowo na CPU) – ok. 3,5× szybciej
// niż SwiftShader przy tym samym obrazie (pomiar 11.2026, atlas3d/test_gl.mjs). Gdy Xvfb/llvmpipe niedostępne – SwiftShader.
// Zapis klatki: CDP Page.captureScreenshot (ok. 0,08 s) zamiast page.screenshot (ok. 2,7 s) – ten sam obraz z napisami HTML.
import { chromium } from 'playwright';
import { spawn, execSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CHROMIUM = fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {};
const SWIFT = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

// serwer statyczny (moduły ES nie ładują się z file://)
export function serwer() {
  const typy = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
  const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': typy[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); }).listen(0);
  return srv;
}

let xvfb = null;
function startXvfb() {
  if (process.env.DISPLAY) return true;
  try { execSync('which Xvfb', { stdio: 'ignore' }); } catch { return false; }
  const nr = 90 + Math.floor(Math.random() * 400);
  xvfb = spawn('Xvfb', [`:${nr}`, '-screen', '0', '2000x2000x24', '-nolisten', 'tcp'], { stdio: 'ignore', detached: false }); xvfb.unref();   // unref: Xvfb nie trzyma procesu node po zakończeniu
  process.env.DISPLAY = `:${nr}`; execSync('sleep 0.5'); return true;
}
process.on('exit', () => { if (xvfb) xvfb.kill(); });

// start: { przegladarka, silnik: 'llvmpipe' | 'swiftshader' }. SILNIK=swiftshader wymusza starą ścieżkę.
export async function przegladarka() {
  if (process.env.SILNIK !== 'swiftshader' && startXvfb()) {
    process.env.GALLIUM_DRIVER = 'llvmpipe';
    const b = await chromium.launch({ ...CHROMIUM, headless: false, args: ['--use-angle=gl', '--ignore-gpu-blocklist', '--enable-gpu', '--window-size=2000,2000'] });
    const p = await b.newPage(), r = await p.evaluate(() => { const g = document.createElement('canvas').getContext('webgl2'); if (!g) return ''; const e = g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : ''; });
    await p.close();
    if (/llvmpipe/i.test(r)) return { przegladarka: b, silnik: 'llvmpipe' };
    await b.close();
  }
  return { przegladarka: await chromium.launch({ ...CHROMIUM, args: SWIFT }), silnik: 'swiftshader' };
}

// szybki zrzut strony przez CDP; skala = docelowa wielkość względem viewportu (np. 0,6667 → 720×1280)
export async function zrzutnik(page, { szer, wys, skala = 1 }) {
  const cdp = await page.context().newCDPSession(page);
  return async (format = 'jpeg', jakosc = 92) => {
    const r = await cdp.send('Page.captureScreenshot', { format, ...(format === 'jpeg' ? { quality: jakosc } : {}), optimizeForSpeed: true, clip: { x: 0, y: 0, width: szer, height: wys, scale: skala } });
    return Buffer.from(r.data, 'base64');
  };
}

// kontrola kadru: statystyka pikseli płótna 3D liczona w przeglądarce zaraz po narysowaniu (czarne/białe plamy = błąd renderu)
export const KONTROLA = `(() => { const c = document.querySelector('canvas'); if (!c) return null; const g = c.getContext('webgl2') || c.getContext('webgl'); if (!g) return null;
  const W = g.drawingBufferWidth, H = g.drawingBufferHeight, px = new Uint8Array(4); let cz = 0, bi = 0, n = 0;
  for (let y = 4; y < H; y += Math.max(1, H / 48 | 0)) for (let x = 4; x < W; x += Math.max(1, W / 27 | 0)) { g.readPixels(x, y, 1, 1, g.RGBA, g.UNSIGNED_BYTE, px); const l = (px[0] + px[1] + px[2]) / 3; if (l < 5) cz++; if (l > 250) bi++; n++; }
  return { czarne: cz / n, biale: bi / n }; })()`;
export const zlyKadr = s => s && (s.czarne > .6 || s.biale > .6);
