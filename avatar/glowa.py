"""Dokleja czubek głowy (włosy) z avatar/zrodlo_twarz.jpg nad krawędź zdjęcia zrodlo_2.jpg (głowa ucięta kadrem).
Dopasowanie po oczach (skala z rozstawu oczu), kolor dopasowany na pasie przejścia, miękkie łączenie.
Wynik: glowa_pelna.png (RGB) + glowa_pelna_maska.png, EXT = liczba dodanych wierszy u góry."""
from PIL import Image, ImageFilter
import numpy as np, json, os
D = os.path.dirname(os.path.abspath(__file__))
A = np.array(Image.open(os.path.join(D, 'zrodlo_2.jpg')).convert('RGB')).astype(float)
MA = (np.array(Image.open(os.path.join(D, 'zrodlo_2_maska.png')).convert('L')) > 110).astype(float)
B = Image.open(os.path.join(D, 'zrodlo_twarz.jpg')).convert('RGB'); MB = Image.open(os.path.join(D, 'zrodlo_twarz_maska.png')).convert('L')
# punkty: środek oczu i rozstaw (zdjęcie z okoniem: środki szkieł okularów)
oA, dA = (1050, 330), 380; oB, dB = (1252, 1725), 705
k = dA / dB; ky = .43; EXT = 220; PAS = 70; PRZES = 30   # PRZES: linia włosów tuż nad krawędzią zdjęcia   # ky: zdjęcie z okoniem robione od dołu – czubek głowy skrócony w pionie    # pas przejścia (wiersze zdjęcia z okoniem od góry)
# głowa-źródło: maska z koloru (ciemne włosy na tle rolet i poduszki) w elipsie głowy + czoło poniżej linii włosów
Bn = np.array(B).astype(float); lum = Bn.mean(-1); yy0, xx0 = np.mgrid[0:B.height, 0:B.width]
E = ((xx0 - 1245) / 720) ** 2 + ((yy0 - 1150) / 560) ** 2 <= 1
wl = Image.fromarray(((lum < 105) & E).astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(21)).filter(ImageFilter.MinFilter(21)).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(5))
MBn = (np.array(wl) > 0) | (E & (yy0 >= 950)); MB = Image.fromarray(MBn.astype(np.uint8) * 255).filter(ImageFilter.GaussianBlur(3))
kx = (1372 - 662) / 1380 * 1.1; oBx, srA = 1245, 1022   # szerokość głowy na górnej krawędzi zdjęcia z okoniem
Bs = np.array(B.resize((round(B.width * kx), round(B.height * ky)), Image.LANCZOS)).astype(float)
MBs = np.array(MB.resize((round(B.width * kx), round(B.height * ky)), Image.LANCZOS)).astype(float) / 255
H, W = A.shape[:2]; OUT = np.zeros((H + EXT, W, 3)); MO = np.zeros((H + EXT, W))
OUT[EXT:] = A; MO[EXT:] = MA
dx, dy = srA - oBx * kx, oA[1] + EXT + PRZES - oB[1] * ky     # położenie przeskalowanego zdjęcia twarzy na płótnie
L = np.zeros_like(OUT); LM = np.zeros_like(MO)
x0, y0 = int(round(dx)), int(round(dy)); h, w = Bs.shape[:2]
ys, xs = max(0, y0), max(0, x0); ye, xe = min(H + EXT, y0 + h), min(W, x0 + w)
L[ys:ye, xs:xe] = Bs[ys - y0:ye - y0, xs - x0:xe - x0]; LM[ys:ye, xs:xe] = MBs[ys - y0:ye - y0, xs - x0:xe - x0]
# tylko głowa (bez poduszki i rąk): elipsa wokół głowy
# dopasowanie koloru: średnia i odchylenie na pasie przejścia (osobno jasne – skóra, ciemne – włosy)
pas = np.zeros_like(MO, bool); pas[EXT:EXT + PAS] = True; wsp = pas & (MO > .5) & (LM > .5)
jas = lambda X: X.mean(axis=-1)
for nazwa, sel in [('skora', jas(OUT) > 110), ('wlosy', jas(OUT) <= 110)]:
    m = wsp & sel
    if m.sum() < 200: continue
    selL = (jas(L) > 110) if nazwa == 'skora' else (jas(L) <= 110)
    for c in range(3):
        a, b = OUT[..., c][m], L[..., c][m]
        L[..., c] = np.where(selL, (L[..., c] - b.mean()) / max(b.std(), 1) * a.std() + a.mean(), L[..., c])
L = np.clip(L, 0, 255)
# łączenie: nad zdjęciem tylko twarz-źródło, w pasie płynne przejście
w = np.zeros(H + EXT); w[:EXT] = 1; w[EXT:EXT + PAS] = np.linspace(1, 0, PAS); w = w[:, None]
wa = (w * (LM > .02)).clip(0, 1)
OUT = OUT * (1 - wa[..., None]) + L * wa[..., None]
MO = np.where(w[:, 0][:, None] >= 1, LM, np.where(w[:, 0][:, None] > 0, np.maximum(MO, LM), MO))
Image.fromarray(OUT.astype(np.uint8)).save(os.path.join(D, 'glowa_pelna.png'))
Image.fromarray((MO * 255).astype(np.uint8)).save(os.path.join(D, 'glowa_pelna_maska.png'))
json.dump({'EXT': EXT}, open(os.path.join(D, 'glowa_pelna.json'), 'w'))
