"""Szuka zdjęć gatunku w kilku źródłach naraz i składa arkusz podglądów do wyboru.

Źródła (wszystkie bez klucza API):
  - iNaturalist – wszystkie obserwacje (research, needs_id, casual, także hodowlane),
  - GBIF – zbiory muzealne i instytutowe, observation.org, PlutoF itd.,
  - Wikimedia Commons – kategoria gatunku + wyszukiwanie po nazwach (przy limicie 429 próbuje ponownie z przerwami),
  - Openverse – otwarta wyszukiwarka zdjęć CC (Flickr, Wikimedia, muzea, iNaturalist i inne) po nazwie łacińskiej
    i nazwach potocznych z --hasla (np. „troć jeziorowa;Seeforelle;lake trout”). Dużo żywych ryb pod wodą i w akwariach.
Każde źródło ma własny limit (--max dzieli się na źródła), żeby iNaturalist nie zajmował całej puli.
Brane są tylko licencje pozwalające na przycinanie i rozmywanie w rolce: CC0, CC BY, CC BY-SA
(opcjonalnie CC BY-NC z --nc). Licencje ND (bez utworów zależnych) są zawsze pomijane.

Użycie: python3 narzedzia/szukaj_zdjec.py "Vimba vimba" <katalog_wyjściowy> [--hasla "certa;Zährte;vimba bream"] [--nc] [--max 300]
Wynik: <katalog>/NNN.jpg, <katalog>/lista.json (autor, licencja, źródło, URL oryginału)
       oraz <katalog>/arkusz_*.jpg z numerami do wyboru.
"""
import argparse
import json
import os
import time
import urllib.parse
import urllib.request

from PIL import Image, ImageDraw

UA = {"User-Agent": "WisniaWedkujeAtlas/1.0 (https://www.instagram.com/wisnia_wedkuje/)"}


def pobierz_json(url, proby=4):
    for k in range(proby):
        try:
            return json.load(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60))
        except Exception as e:
            if k == proby - 1:
                print("  pominięto:", url[:80], e)
                return None
            time.sleep(20 * (k + 1))


def licencja_ok(lic, nc):
    lic = (lic or "").lower().replace("http://creativecommons.org/licenses/", "").replace("https://creativecommons.org/licenses/", "")
    if not lic or "nd" in lic or "reserved" in lic or "©" in lic:
        return None
    if "nc" in lic and not nc:
        return None
    if "publicdomain" in lic or lic.startswith("cc0") or lic == "pd":
        return "CC0"
    return "CC " + lic.strip("/").split("/")[0].upper().replace("CC-", "")


def inaturalist(nazwa, nc):
    t = pobierz_json("https://api.inaturalist.org/v1/taxa?q=" + urllib.parse.quote(nazwa))
    tid = next(x["id"] for x in t["results"] if x["name"] == nazwa)
    lic = "cc0,cc-by,cc-by-sa" + (",cc-by-nc" if nc else "")
    for page in range(1, 11):
        d = pobierz_json(f"https://api.inaturalist.org/v1/observations?taxon_id={tid}&photo_license={lic}&per_page=50&page={page}&photos=true&order_by=votes")
        if not d or not d["results"]:
            break
        for o in d["results"]:
            for p in o["photos"][:3]:
                L = licencja_ok(p.get("license_code", "").replace("cc-", ""), nc)
                if L:
                    yield {"zrodlo": "iNaturalist", "url": p["url"].replace("square", "original"), "podglad": p["url"].replace("square", "small"),
                           "autor": o["user"].get("name") or o["user"]["login"], "licencja": L,
                           "strona": f"https://www.inaturalist.org/observations/{o['id']}"}
        time.sleep(1)


def gbif(nazwa, nc):
    for off in range(0, 900, 300):
        d = pobierz_json(f"https://api.gbif.org/v1/occurrence/search?scientificName={urllib.parse.quote(nazwa)}&mediaType=StillImage&limit=300&offset={off}")
        if not d or not d["results"]:
            break
        for o in d["results"]:
            if "inaturalist" in (o.get("datasetName") or "").lower():
                continue
            for m in o.get("media", []):
                L = licencja_ok(m.get("license"), nc)
                if L and m.get("identifier"):
                    yield {"zrodlo": "GBIF: " + (o.get("datasetName") or o.get("institutionCode") or "?"), "url": m["identifier"], "podglad": m["identifier"],
                           "autor": m.get("rightsHolder") or m.get("creator") or o.get("institutionCode") or "?", "licencja": L,
                           "strona": m.get("references") or o.get("references") or f"https://www.gbif.org/occurrence/{o['key']}"}
        if d.get("endOfRecords"):
            break


def commons(nazwa, nc):
    kat = urllib.parse.quote("Category:" + nazwa.replace(" ", "_"))
    d = pobierz_json(f"https://commons.wikimedia.org/w/api.php?action=query&generator=categorymembers&gcmtitle={kat}&gcmtype=file&gcmlimit=200&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=500&format=json")
    import re
    for p in ((d or {}).get("query") or {}).get("pages", {}).values():
        ii = (p.get("imageinfo") or [{}])[0]
        if not p["title"].lower().endswith((".jpg", ".jpeg")):
            continue
        me = ii.get("extmetadata", {})
        L = licencja_ok(me.get("LicenseShortName", {}).get("value", "").lower().replace(" ", "-").replace("cc-", ""), nc)
        if L:
            yield {"zrodlo": "Wikimedia Commons", "url": ii["url"], "podglad": ii.get("thumburl", ii["url"]),
                   "autor": re.sub("<[^>]+>", "", me.get("Artist", {}).get("value", "?")).strip(), "licencja": L, "strona": ii.get("descriptionurl")}


def commons_szukaj(hasla, nc):
    import re
    for h in hasla:
        d = pobierz_json("https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrlimit=50&gsrsearch="
                         + urllib.parse.quote(h) + "&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=500&format=json")
        for p in ((d or {}).get("query") or {}).get("pages", {}).values():
            ii = (p.get("imageinfo") or [{}])[0]
            if not p["title"].lower().endswith((".jpg", ".jpeg")):
                continue
            me = ii.get("extmetadata", {})
            L = licencja_ok(me.get("LicenseShortName", {}).get("value", "").lower().replace(" ", "-").replace("cc-", ""), nc)
            if L:
                yield {"zrodlo": "Wikimedia Commons", "url": ii["url"], "podglad": ii.get("thumburl", ii["url"]),
                       "autor": re.sub("<[^>]+>", "", me.get("Artist", {}).get("value", "?")).strip(), "licencja": L, "strona": ii.get("descriptionurl")}
        time.sleep(3)


def openverse(hasla, nc):
    lic = "cc0,pdm,by,by-sa" + (",by-nc" if nc else "")
    for h in hasla:
        for page in range(1, 6):
            d = pobierz_json(f"https://api.openverse.org/v1/images/?q={urllib.parse.quote(h)}&license={lic}&page_size=20&page={page}")
            if not d or not d.get("results"):
                break
            for r in d["results"]:
                if (r.get("width") or 1000) < 700:
                    continue
                L = "CC0" if r["license"] in ("cc0", "pdm") else f"CC {r['license'].upper()} {r.get('license_version') or ''}".strip()
                yield {"zrodlo": "Openverse: " + (r.get("source") or "?"), "url": r["url"], "podglad": r.get("thumbnail") or r["url"],
                       "autor": r.get("creator") or "?", "licencja": L, "strona": r.get("foreign_landing_url") or r["url"]}
            time.sleep(2)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("nazwa")
    ap.add_argument("out")
    ap.add_argument("--nc", action="store_true", help="dopuść CC BY-NC (tylko jeśli profil nie jest komercyjny)")
    ap.add_argument("--max", type=int, default=300)
    ap.add_argument("--hasla", default="", help="dodatkowe nazwy (potoczne, inne języki) rozdzielone średnikiem – Commons i Openverse")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    lista, widziane = [], set()
    hasla = [a.nazwa] + [h.strip() for h in a.hasla.split(";") if h.strip()]
    zrodla = [("inaturalist", inaturalist(a.nazwa, a.nc)), ("gbif", gbif(a.nazwa, a.nc)), ("commons", commons(a.nazwa, a.nc)),
              ("commons (nazwy)", commons_szukaj(hasla, a.nc)), ("openverse", openverse(hasla, a.nc))]
    limit = max(30, a.max // len(zrodla))          # osobny limit na źródło
    for nazwa_zr, gen in zrodla:
        print("szukam:", nazwa_zr)
        n_zr = 0
        for x in gen:
            if n_zr >= limit:
                break
            if x["url"] in widziane:
                continue
            widziane.add(x["url"])
            fn = os.path.join(a.out, f"{len(lista):03d}.jpg")
            try:
                open(fn, "wb").write(urllib.request.urlopen(urllib.request.Request(x["podglad"], headers=UA), timeout=60).read())
                Image.open(fn).verify()
            except Exception:
                continue
            x["nr"] = len(lista)
            lista.append(x)
            n_zr += 1
    json.dump(lista, open(os.path.join(a.out, "lista.json"), "w"), ensure_ascii=False, indent=1)
    for s in range(0, len(lista), 48):
        o = Image.new("RGB", (8 * 300, 6 * 250), "black")
        d = ImageDraw.Draw(o)
        for k, x in enumerate(lista[s:s + 48]):
            im = Image.open(os.path.join(a.out, f"{x['nr']:03d}.jpg")).convert("RGB")
            im.thumbnail((296, 222))
            px, py = (k % 8) * 300, (k // 8) * 250
            o.paste(im, (px, py))
            d.text((px + 3, py + 226), f"{x['nr']} {x['zrodlo'][:22]} {x['licencja']}", fill="yellow")
        o.save(os.path.join(a.out, f"arkusz_{s // 48}.jpg"))
    from collections import Counter
    print(len(lista), "zdjęć:", dict(Counter(x["zrodlo"].split(":")[0] for x in lista)))


if __name__ == "__main__":
    main()
