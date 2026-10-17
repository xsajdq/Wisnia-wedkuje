// Renderuje klatki rolki „Atlas ryb Polski” dla gatunku z data/gatunki/<gatunek>.json.
// Użycie: node atlas/render.mjs szczupak [--guides]
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const dir = path.dirname(new URL(import.meta.url).pathname);
const root = path.join(dir, '..');
const gatunek = process.argv[2] || 'szczupak';
const guides = process.argv.includes('--guides');
const PROFIL = 'wisnia_wedkuje';

const GATUNEK = JSON.parse(fs.readFileSync(path.join(root, 'data/gatunki', `${gatunek}.json`), 'utf8'));
const REKORDY = JSON.parse(fs.readFileSync(path.join(root, 'data/rekordy_polski.json'), 'utf8'));
const out = path.join(dir, 'out', gatunek + (guides ? '-guides' : ''));
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.addInitScript((d) => Object.assign(window, d), { GATUNEK, REKORDY, PROFIL });
await page.goto('file://' + path.join(dir, 'szablon.html'), { waitUntil: 'networkidle' });
if (guides) await page.evaluate(() => document.body.classList.add('guides'));
await page.evaluate(() => document.fonts.ready);
for (const el of await page.$$('section.frame')) {
  const id = await el.getAttribute('id');
  await el.screenshot({ path: path.join(out, `${id}.png`) });
}
await browser.close();
console.log(out);
