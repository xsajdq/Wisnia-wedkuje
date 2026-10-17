"""Buduje oś czasu rolki z transkrypcji lektora (czasy słów z ElevenLabs Scribe).

Dopasowuje słowa scenariusza (data/gatunki/<g>.json → "lektor", po jednym akapicie na scenę)
do słów z transkrypcji, liczy początek każdej sceny i układa napisy (po kilka słów)
z zamianą liczb pisanych słownie na cyfry ("napisy_zamiany").

Użycie: python3 narzedzia/os_czasu.py szczupak audio/szczupak/transkrypcja.json [--tempo 1.1]
Wynik:  data/os_czasu/<g>.json  (czasy już przeliczone na przyspieszone audio)
"""
import argparse
import difflib
import json
import os
import re

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
MAX_SLOW, MAX_ZNAKOW = 3, 20


def norm(s):
    return re.sub(r"[^\wąćęłńóśźż]", "", s.lower())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("gatunek")
    ap.add_argument("transkrypcja")
    ap.add_argument("--tempo", type=float, default=1.0)
    a = ap.parse_args()

    G = json.load(open(os.path.join(ROOT, "data", "gatunki", f"{a.gatunek}.json")))
    tr = json.load(open(a.transkrypcja))
    tr = tr.get("words", tr) if isinstance(tr, dict) else tr
    slowa_tr = [w for w in tr if w.get("type", "word") == "word" and norm(w["text"])]

    # słowa scenariusza z numerem sceny
    skrypt = [(i, w) for i, akapit in enumerate(G["lektor"]) for w in akapit.split()]
    A = [norm(w) for _, w in skrypt]
    B = [norm(w["text"]) for w in slowa_tr]
    czasy = [None] * len(skrypt)
    for blk in difflib.SequenceMatcher(None, A, B, autojunk=False).get_matching_blocks():
        for k in range(blk.size):
            w = slowa_tr[blk.b + k]
            czasy[blk.a + k] = [w["start"], w["end"]]
    # słowa bez dopasowania (np. liczby zapisane cyframi w transkrypcji) – interpolacja między kotwicami
    i = 0
    while i < len(czasy):
        if czasy[i] is None:
            j = i
            while j < len(czasy) and czasy[j] is None:
                j += 1
            t0 = czasy[i - 1][1] if i > 0 else 0.0
            t1 = czasy[j][0] if j < len(czasy) else slowa_tr[-1]["end"]
            n = j - i
            for k in range(n):
                czasy[i + k] = [t0 + (t1 - t0) * k / n, t0 + (t1 - t0) * (k + 1) / n]
            i = j
        i += 1
    dopasowane = sum(1 for x, y in zip(A, B) if x == y)

    T = 1 / a.tempo
    koniec = slowa_tr[-1]["end"] * T
    starty = []
    for sc in range(len(G["lektor"])):
        idx = [k for k, (s, _) in enumerate(skrypt) if s == sc]
        starty.append(0.0 if sc == 0 else czasy[idx[0]][0] * T - 0.12)

    zamiany = [([norm(x) for x in z[0].split()], z[1]) for z in G.get("napisy_zamiany", [])]
    sceny, napisy = [], []
    for sc in range(len(G["lektor"])):
        idx = [k for k, (s, _) in enumerate(skrypt) if s == sc]
        tok = [{"w": skrypt[k][1], "n": A[k], "s": czasy[k][0] * T, "e": czasy[k][1] * T} for k in idx]
        sceny.append({"start": round(starty[sc], 3),
                      "end": round(starty[sc + 1] if sc + 1 < len(starty) else koniec + 1.2, 3),
                      "slowa": [{"n": t["n"], "s": round(t["s"], 3)} for t in tok]})
        # zamiany na cyfry: kilka słów → jeden token napisu
        wyn, k = [], 0
        while k < len(tok):
            for fraza, nap in zamiany:
                if [t["n"] for t in tok[k:k + len(fraza)]] == fraza:
                    ost = tok[k + len(fraza) - 1]
                    kon = re.sub(r"^[^\W]+", "", ost["w"], flags=re.U)  # zachowaj interpunkcję
                    wyn.append({"w": nap + kon, "t": nap, "s": tok[k]["s"], "e": ost["e"]})
                    k += len(fraza)
                    break
            else:
                wyn.append({"w": tok[k]["w"], "t": re.sub(r"[.,:;!]+$", "", tok[k]["w"]), "s": tok[k]["s"], "e": tok[k]["e"]})
                k += 1
        # podział na krótkie linie, łamanie po interpunkcji
        linia = []
        for t in wyn:
            tekst = " ".join(x["w"] for x in linia + [t])
            if linia and (len(linia) >= MAX_SLOW or len(tekst) > MAX_ZNAKOW):
                napisy.append(linia)
                linia = []
            linia.append(t)
            if re.search(r"[.,:;?!]$", t["w"]):
                napisy.append(linia)
                linia = []
        if linia:
            napisy.append(linia)

    out = {"dlugosc": round(koniec + 1.2, 3), "tempo": a.tempo,
           "sceny": sceny,
           "napisy": [{"s": round(l[0]["s"], 3), "e": round(l[-1]["e"], 3),
                       "slowa": [{"t": x["t"], "s": round(x["s"], 3)} for x in l]}
                      for l in napisy]}
    os.makedirs(os.path.join(ROOT, "data", "os_czasu"), exist_ok=True)
    json.dump(out, open(os.path.join(ROOT, "data", "os_czasu", f"{a.gatunek}.json"), "w"), ensure_ascii=False, indent=1)
    print(f"słowa: skrypt {len(A)}, transkrypcja {len(B)}, długość {out['dlugosc']} s, linii napisów {len(out['napisy'])}")
    for i, s in enumerate(sceny):
        print(f"  scena {i + 1}: {s['start']:6.2f} – {s['end']:6.2f}")


if __name__ == "__main__":
    main()
