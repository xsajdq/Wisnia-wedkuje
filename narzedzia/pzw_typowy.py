"""Liczy typowy wymiar ochronny na wodach PZW z data/przepisy_pzw.json.

Użycie: python3 narzedzia/pzw_typowy.py sandacz
Podaje: najczęstszy dolny wymiar (dominanta), zakres, najczęstszy górny wymiar (widełki)
i liczbę okręgów. Wynik wklej do data/gatunki/<g>.json → przepisy.pzw.
"""
import json
import os
import sys
from collections import Counter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
gat = sys.argv[1]
d = json.load(open(os.path.join(ROOT, "data", "przepisy_pzw.json")))
dol, gor, okr = [], [], []
for nazwa, o in d["okregi"].items():
    if gat in o:
        a, b = o[gat]
        dol.append(a)
        okr.append(nazwa)
        if b:
            gor.append(b)
if not dol:
    sys.exit(f"Brak danych dla: {gat}")
moda = Counter(dol).most_common(1)[0][0]
wynik = {"wymiar": f"{moda} cm", "zakres": [min(dol), max(dol)], "n": len(dol),
         "gorny": f"{Counter(gor).most_common(1)[0][0]} cm" if gor else None,
         "gorny_n": len(gor), "okregi": okr}
okresy = [o[f"{gat}_okres"] for o in d["okregi"].values() if f"{gat}_okres" in o]
if okresy:
    wynik["okres"] = Counter(okresy).most_common(1)[0][0]
    wynik["okres_n"] = len(okresy)
print(json.dumps(wynik, ensure_ascii=False, indent=1))
