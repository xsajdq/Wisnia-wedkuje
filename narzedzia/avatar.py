# Avatar: wycięta postać + ryba na tle w kolorach Atlasu, okrągły kadr
import sys, numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
src, maska, out, cx, cy, R, tlo = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5]), int(sys.argv[6]), sys.argv[7]
im = Image.open(src).convert('RGB'); m = Image.open(maska).convert('L')
im = ImageEnhance.Color(im).enhance(1.12); im = ImageEnhance.Contrast(im).enhance(1.05)
W, H = im.size
# wygaszenie postaci przy dolnej krawędzi zdjęcia (nogi ucięte kadrem)
a = np.array(m).astype(float) / 255
fade = 380
for y in range(H - fade, H): a[y] *= ((H - y) / fade) ** 1.5
a[:160] *= (np.linspace(0, 1, 160) ** 0.6)[:, None]
a[:, :220] *= (np.linspace(0, 1, 220) ** 0.8)[None, :]
m = Image.fromarray((a * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(2))
S = 2 * R
# tło: gradient radialny
yy, xx = np.mgrid[0:S, 0:S]; d = np.sqrt((xx - S * .62) ** 2 + (yy - S * .42) ** 2) / S
kol = {'ziel': ((46, 110, 78), (15, 42, 31)), 'zolty': ((255, 226, 80), (240, 175, 0))}[tlo]
c0, c1 = np.array(kol[0]), np.array(kol[1]); t = np.clip(d / 0.75, 0, 1)[..., None]
bg = Image.fromarray((c0 * (1 - t) + c1 * t).astype('uint8'))
x0, y0 = cx - R, cy - R
bg.paste(im.crop((x0, y0, x0 + S, y0 + S)), (0, 0), m.crop((x0, y0, x0 + S, y0 + S)))
img = bg.resize((1080, 1080), Image.LANCZOS)
# ring w kolorze marki
dr = ImageDraw.Draw(img); ring = (255, 212, 0) if tlo == 'ziel' else (15, 42, 31)
dr.ellipse((6, 6, 1073, 1073), outline=ring, width=14)
img.save(out, quality=95)
# podgląd w kółku, jak na profilu
k = Image.new('L', (1080, 1080), 0); ImageDraw.Draw(k).ellipse((0, 0, 1079, 1079), fill=255)
p = Image.new('RGB', (1080, 1080), (250, 250, 250)); p.paste(img, mask=k); p.save(out.replace('.jpg', '_kolo.png'))
