// Napis PNG z przezroczystym tłem (czcionki filmów): node atlas3d/napis_png.mjs <plik.png> <szer> <wys> '<html>'
import { chromium } from 'playwright'; import fs from 'node:fs';
const [plik, w, h, html] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const pg = await b.newPage({ viewport: { width: +w, height: +h } });
await pg.setContent(`<html><head><link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@800;900&display=swap" rel="stylesheet"><style>html,body{margin:0;background:transparent}</style></head><body>${html}</body></html>`, { waitUntil: 'networkidle' });
await pg.evaluate(() => document.fonts.ready); await pg.screenshot({ path: plik, omitBackground: true }); await b.close();
