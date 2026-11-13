"""Avatar Wiśnia Wędkuje ze zdjęcia: postać z rybą wycięta (maska rembg isnet), naklejka z obrysem, tło + fala wody, pierścień marki.
python3 avatar/avatar.py  → avatar/avatar_*.png (1080×1080, platformy same przycinają do koła)"""
from PIL import Image, ImageFilter, ImageDraw
import numpy as np, math, os, sys
D = os.path.dirname(os.path.abspath(__file__)); N = 1080
TLO_JEZIORO = sys.argv[1] if len(sys.argv) > 1 else os.path.join(D, 'tlo_jezioro.png')
# zdjęcie z okoniem z doklejonym czubkiem głowy (glowa.py: włosy z avatar/zrodlo_twarz.jpg)
img = Image.open(os.path.join(D, 'glowa_pelna.png')).convert('RGB'); M0 = Image.open(os.path.join(D, 'glowa_pelna_maska.png')).convert('L')
M0 = M0.point(lambda v: 255 if v > 110 else 0).filter(ImageFilter.GaussianBlur(2))
F = img.width / 2000; EXT = 220; H2 = img.height
s, cx, cy = .47 / F, 1060 * F, (790 * F + EXT)
def warstwa(x, tryb):
    r = x.resize((int(x.width * s), int(x.height * s)), Image.LANCZOS); L = Image.new(tryb, (N, N), 0 if tryb == 'L' else (0, 0, 0)); L.paste(r, (int(540 - cx * s), int(540 - cy * s))); return L
P, M = warstwa(img, 'RGB'), warstwa(M0, 'L')
b = Image.fromarray(((np.array(M) > 100) * 255).astype(np.uint8))
bial = b.filter(ImageFilter.MaxFilter(15)).filter(ImageFilter.GaussianBlur(1)); tusz = b.filter(ImageFilter.MaxFilter(23)).filter(ImageFilter.GaussianBlur(1))
dol = int(540 + (H2 - cy) * s)   # dolna krawędź zdjęcia na avatarze – chowana pod falą
def fala(c):
    d = ImageDraw.Draw(c); y0 = dol - 14; pts = [(x, y0 + 9 * math.sin(x / 46) + 4 * math.sin(x / 17)) for x in range(0, N + 8, 8)]
    d.polygon(pts + [(N, N), (0, N)], fill='#2f9aab')
    for k in range(4): d.line([(60 + k * 260, y0 + 70 + 30 * (k % 2)), (180 + k * 260, y0 + 70 + 30 * (k % 2))], fill='#7fd0da', width=8)
    d.line(pts, fill='#241726', width=16); d.line(pts, fill='#ffffff', width=8)
def zloz(tlo, nazwa):
    c = tlo.convert('RGB').resize((N, N))
    c.paste(Image.new('RGB', (N, N), '#241726'), (0, 0), tusz); c.paste(Image.new('RGB', (N, N), '#ffffff'), (0, 0), bial); c.paste(P, (0, 0), M)
    fala(c); n = Image.open(os.path.join(D, 'napis.png')).convert('RGBA'); c.paste(n, (0, dol + 18), n)   # nazwa kanału na wodzie
    d = ImageDraw.Draw(c); d.ellipse((6, 6, N - 7, N - 7), outline='#241726', width=26); d.ellipse((14, 14, N - 15, N - 15), outline='#ffd400', width=12)
    c.save(os.path.join(D, nazwa + '.png')); return c
z = Image.new('RGB', (N, N), '#ffd400'); dz = ImageDraw.Draw(z)
for i in range(18):
    a0 = i * 2 * math.pi / 18; a1 = a0 + math.pi / 18
    dz.polygon([(540, 620), (540 + 1600 * math.cos(a0), 620 + 1600 * math.sin(a0)), (540 + 1600 * math.cos(a1), 620 + 1600 * math.sin(a1))], fill='#ffc400')
wyn = [zloz(z, 'avatar_zolty')]
if os.path.exists(TLO_JEZIORO): wyn.append(zloz(Image.open(TLO_JEZIORO), 'avatar_jezioro'))
pv = Image.new('RGB', (760 * len(wyn), 560), '#fafafa'); kolo = Image.new('L', (N, N), 0); ImageDraw.Draw(kolo).ellipse((0, 0, N - 1, N - 1), fill=255)
for i, k in enumerate(wyn):
    for sz, x, y in [(480, 20 + i * 760, 40), (160, 520 + i * 760, 40), (64, 568 + i * 760, 240)]: pv.paste(k.resize((sz, sz), Image.LANCZOS), (x, y), kolo.resize((sz, sz), Image.LANCZOS))
pv.save(os.path.join(D, 'podglad.jpg'), quality=90)
