// Karty assetów: node atlas3d/render_karta.mjs [postacie|przynety] → atlas3d/out/karta_<nazwa>.png
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const typy = { '.html': 'text/html', '.js': 'text/javascript' };
const srv = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': typy[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res); }).listen(0);
const browser = await chromium.launch({ ...(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {}), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', e => console.error('błąd strony:', e.message));
const NAZWA = process.argv[2] || 'postacie';
await page.goto(`http://localhost:${srv.address().port}/atlas3d/${NAZWA}.html`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.gotowe); await page.evaluate(() => document.fonts.ready);
fs.mkdirSync(path.join(ROOT, 'atlas3d/out'), { recursive: true });
const out = path.join(ROOT, 'atlas3d/out', NAZWA === 'postacie' ? 'karta_postaci.png' : `karta_${NAZWA}.png`); await page.screenshot({ path: out }); console.log(out);
await browser.close(); srv.close();
