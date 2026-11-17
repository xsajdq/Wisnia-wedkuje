"""Kontrola wejść elementów: dla każdego `przy` pokazuje słowo lektora, przy którym element wejdzie.

Użycie: python3 narzedzia/kontrola_przy.py <gatunek>   (po os_czasu.py, przed render_wideo.mjs)
Dopasowanie jak w atlas/wideo.html: najpierw dokładnie to słowo, potem pierwsze słowo zaczynające się od niego.
Ostrzega, gdy element wchodzi przed poprzednim elementem tej samej sceny albo gdy dopasowanie jest tylko po prefiksie
(np. „nie” → „niebieskich”) – wtedy zmień `przy` w data/gatunki/<g>.json.
"""
import json
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
g = sys.argv[1]
G = json.load(open(os.path.join(ROOT, "data", "gatunki", f"{g}.json")))
OS = json.load(open(os.path.join(ROOT, "data", "os_czasu", f"{g}.json")))
SC = OS.get("sceny") or OS
norm = lambda s: re.sub(r"[^\wąćęłńóśźż]", "", s.lower())


def znajdz(i, p):
    sl, p = SC[i]["slowa"], norm(p)
    for k, x in enumerate(sl):
        if x["n"] == p:
            return k, True
    for k, x in enumerate(sl):
        if x["n"].startswith(p):
            return k, False
    return None, False


RP = G.get("rekord_przy", {})
grupy = {2: [(r["tekst"], r.get("przy")) for r in G["rozpoznanie"]],
         3: [(r["etykieta"], r.get("przy")) for r in G["rozmiary"]],
         4: [(m["tekst"], m.get("przy")) for m in G["wystepowanie"]["miejsca"]],
         6: [("masa", RP.get("masa")), ("długość", RP.get("dlugosc")), ("opis", RP.get("kto"))]}
bledy = 0
for i, el in grupy.items():
    poprz = -1
    for tekst, p in el:
        if not p:
            continue
        k, dokladne = znajdz(i, p)
        sl = SC[i]["slowa"]
        kontekst = " ".join(x["n"] for x in sl[k:k + 4]) if k is not None else "BRAK"
        uwaga = []
        if k is None:
            uwaga.append("BRAK SŁOWA")
        elif k < poprz:
            uwaga.append("WCHODZI PRZED POPRZEDNIM")
        if k is not None and not dokladne:
            uwaga.append("tylko prefiks – sprawdź")
        if uwaga and "tylko prefiks – sprawdź" != uwaga[-1] or "BRAK SŁOWA" in uwaga or "WCHODZI PRZED POPRZEDNIM" in uwaga:
            bledy += 1
        print(f"scena {i + 1}: {tekst[:40]:40} przy „{p}” → {kontekst}  {' · '.join(uwaga)}")
        if k is not None:
            poprz = k
print("OK" if not bledy else f"{bledy} problem(ów) – popraw `przy`")
