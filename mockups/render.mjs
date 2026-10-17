// Renderuje każdą klatkę z frames.html do PNG 1080x1920.
// Użycie: node mockups/render.mjs [--guides]
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const dir = path.dirname(new URL(import.meta.url).pathname);
const guides = process.argv.includes('--guides');
const out = path.join(dir, guides ? 'out-guides' : 'out');
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto('file://' + path.join(dir, 'frames.html'), { waitUntil: 'networkidle' });
if (guides) await page.evaluate(() => document.body.classList.add('guides'));
await page.evaluate(() => document.fonts.ready);
for (const el of await page.$$('section.frame')) {
  const id = await el.getAttribute('id');
  await el.screenshot({ path: path.join(out, `${id}.png`) });
  console.log(id);
}
await browser.close();
