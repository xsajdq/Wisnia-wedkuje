// Renderuje klatki (makietę) odcinka serii „Rybia nauka” z data/nauka/<odcinek>.json.
// Użycie: node nauka/render.mjs barotrauma [--guides]  →  nauka/out/<odcinek>/
// Plansza: python3 atlas/plansza.py nauka/out/<odcinek>
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const dir = path.dirname(new URL(import.meta.url).pathname);
const root = path.join(dir, '..');
const odc = process.argv[2] || 'barotrauma';
const guides = process.argv.includes('--guides');
const ODC = JSON.parse(fs.readFileSync(path.join(root, 'data/nauka', `${odc}.json`), 'utf8'));
const ZDJECIA = JSON.parse(fs.readFileSync(path.join(root, 'data/zdjecia.json'), 'utf8'));
const out = path.join(dir, 'out', odc + (guides ? '-guides' : ''));
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.addInitScript((d) => Object.assign(window, d), { ODC, ZDJECIA, PROFIL: 'wisnia_wedkuje' });
await page.goto('file://' + path.join(dir, 'szablon.html'), { waitUntil: 'networkidle' });
if (guides) await page.evaluate(() => document.body.classList.add('guides'));
await page.evaluate(() => document.fonts.ready);
for (const el of await page.$$('section.frame')) {
  const id = await el.getAttribute('id');
  await el.screenshot({ path: path.join(out, `${id}.png`) });
}
await browser.close();
console.log(out);
