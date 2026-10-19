"""Przygotowuje zdjęcie ryby do rolki.

Wycina rybę modelem SAM (rembg) na podstawie ramki/punktów wskazanych ręcznie,
a następnie zapisuje:
  assets/ryby/<nazwa>.jpg       – oryginał, w którym wszystko poza rybą jest mocno rozmyte
                                  (ludzie, twarze, ręce, tło),
  assets/ryby/<nazwa>.png       – sama ryba z przezroczystym tłem (wycinek),
  assets/ryby/<nazwa>_maska.png – podgląd maski do kontroli,
  data/zdjecia.json             – wpis z rozmiarem zdjęcia i ramką ryby (bbox) w pikselach.

Szablon używa ramki, żeby zawsze pokazać CAŁĄ rybę.

Użycie:
  python3 narzedzia/przygotuj_zdjecie.py assets/photos/szczupak_trzymany.jpg \
      --nazwa szczupak_trzymany --ramka 40,60,1500,1120 [--punkt 700,600] [--tlo-punkt 1300,150] \
      [--rozmycie 40] [--autor "..."] [--licencja "CC BY"] [--zrodlo URL]
Współrzędne w pikselach oryginału.
"""
import argparse
import json
import os

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")


def para(s):
    return [int(float(v)) for v in s.split(",")]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("plik")
    ap.add_argument("--nazwa", required=True)
    ap.add_argument("--ramka", type=para, required=True, help="x0,y0,x1,y1 wokół ryby")
    ap.add_argument("--punkt", type=para, action="append", default=[], help="punkt na rybie")
    ap.add_argument("--tlo-punkt", type=para, action="append", default=[], help="punkt NIE na rybie (np. dłoń, twarz)")
    ap.add_argument("--rozmycie", type=int, default=40)
    ap.add_argument("--rozszerz", type=int, default=5, help="poszerzenie maski w px (nieparzyste) – ratuje cienkie płetwy")
    ap.add_argument("--autor", default="")
    ap.add_argument("--licencja", default="")
    ap.add_argument("--zrodlo", default="")
    a = ap.parse_args()

    from rembg import new_session, remove

    img = Image.open(a.plik).convert("RGB")
    W, H = img.size
    # SAM pracuje na mniejszej wersji – szybciej, a maskę i tak skalujemy do oryginału
    k = min(1.0, 1024 / max(W, H))
    small = img.resize((round(W * k), round(H * k)), Image.LANCZOS)
    sk = lambda p: [round(v * k) for v in p]
    prompt = [{"type": "rectangle", "data": sk(a.ramka), "label": 1}]
    prompt += [{"type": "point", "data": sk(p), "label": 1} for p in a.punkt]
    prompt += [{"type": "point", "data": sk(p), "label": 0} for p in a.tlo_punkt]
    sesja = new_session("sam")
    maska = remove(small, session=sesja, sam_prompt=prompt, only_mask=True)
    maska = maska.convert("L").resize((W, H), Image.BILINEAR)

    m = np.array(maska) > 127
    # usuń drobne okruchy maski (przynęta, źdźbła) – zostają tylko duże fragmenty ryby
    from scipy import ndimage
    lab, n = ndimage.label(m)
    if n > 1:
        pola = ndimage.sum(m, lab, range(1, n + 1))
        m = np.isin(lab, [i + 1 for i, p in enumerate(pola) if p > 0.03 * pola.max()])
    ys, xs = np.where(m)
    if len(xs) == 0:
        raise SystemExit("Pusta maska – popraw ramkę/punkty")
    bbox = [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]

    # miękka krawędź maski
    miekka = Image.fromarray((m * 255).astype("uint8")).filter(ImageFilter.MaxFilter(a.rozszerz | 1)).filter(ImageFilter.GaussianBlur(3))
    rozmyte = img.filter(ImageFilter.GaussianBlur(a.rozmycie))
    wynik = Image.composite(img, rozmyte, miekka)

    out = os.path.join(ROOT, "assets", "ryby")
    os.makedirs(out, exist_ok=True)
    wynik.save(os.path.join(out, f"{a.nazwa}.jpg"), quality=92)
    wyc = img.copy()
    wyc.putalpha(miekka)
    wyc.crop(bbox).save(os.path.join(out, f"{a.nazwa}.png"))
    podglad = Image.blend(img, Image.new("RGB", img.size, (255, 0, 0)), 0.0)
    podglad.paste(Image.new("RGB", img.size, (255, 0, 0)), mask=Image.fromarray((~m * 140).astype("uint8")))
    podglad.thumbnail((900, 900))
    podglad.save(os.path.join(out, f"{a.nazwa}_maska.png"))

    rej = os.path.join(ROOT, "data", "zdjecia.json")
    dane = json.load(open(rej)) if os.path.exists(rej) else {}
    dane[a.nazwa] = {
        "plik": f"ryby/{a.nazwa}.jpg",
        "wycinek": f"ryby/{a.nazwa}.png",
        "oryginal": os.path.relpath(a.plik, os.path.join(ROOT, "assets")),
        "w": W, "h": H, "bbox": bbox,
        "autor": a.autor, "licencja": a.licencja, "zrodlo": a.zrodlo,
    }
    json.dump(dane, open(rej, "w"), ensure_ascii=False, indent=1)
    print(a.nazwa, (W, H), "bbox", bbox)


if __name__ == "__main__":
    main()
