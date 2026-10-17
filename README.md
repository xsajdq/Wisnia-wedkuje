# Wiśnia Wędkuje — rolki IG / TikTok

Profil: **@wisnia_wedkuje**

Edukacyjne rolki o rybach występujących w Polsce: wygląd, występowanie, ciekawostki.
Lektor: głos ElevenLabs **„JA Paweł”** (`bHIh6fgsLVytKSOdaWBi`, sklonowany, PL).

## Format: Atlas Ryb Polski (dynamiczny)

Każdy gatunek to jedna rolka z 9 scen:
hook → karta gatunku → jak rozpoznać → rozmiary → występowanie → ciekawostka → **rekord Polski** → przepisy (wymiar/okres ochronny) → zachęta do obserwowania i zapowiedź następnego gatunku.

- `data/gatunki/<gatunek>.json`: treść rolki. Każdy fakt ma przypisane źródło.
- `data/rekordy_polski.json`: oficjalne rekordy Polski (masa i długość) dla 30 gatunków, z Wiadomości Wędkarskich.
- `data/przepisy_panstwowe.json`: wymiary i okresy ochronne z rozporządzenia z 2023 r. (Dz.U. 2023 poz. 1373).
- `atlas/szablon.html`: wygląd scen. `atlas/scenariusze/<gatunek>.md`: tekst lektora ze źródłami.
- Render: `node atlas/render.mjs szczupak` zapisuje klatki do `atlas/out/szczupak/`, a `python3 atlas/plansza.py atlas/out/szczupak` składa z nich planszę.

### Zdjęcia ryb: zawsze cała ryba, ludzie rozmyci
`narzedzia/przygotuj_zdjecie.py` wycina rybę modelem SAM (rembg). Wystarczy ramka wokół ryby, opcjonalnie punkty na rybie i punkty „to nie ryba”, np. twarz.
Narzędzie zapisuje do `assets/ryby/` zdjęcie, na którym wszystko poza rybą jest mocno rozmyte (ludzie, twarze, tło), oraz sam wycinek ryby.
Do `data/zdjecia.json` trafia obrys ryby. Szablon skaluje każde zdjęcie tak, żeby obrys zawsze mieścił się w kadrze, więc ryba nigdy nie jest ucięta.
Plik `assets/ryby/*_maska.png` służy do kontroli jakości: czerwone jest to, co zostanie rozmyte.

```
pip install -r narzedzia/requirements.txt
python3 narzedzia/przygotuj_zdjecie.py assets/photos/X.jpg --nazwa X --ramka x0,y0,x1,y1 --punkt x,y --tlo-punkt x,y --autor "..." --licencja "CC BY" --zrodlo URL
```

### Zasady weryfikacji
1. Przepisy biorę tylko z aktualnego rozporządzenia (ELI/ISAP). Regulaminy PZW różnią się między okręgami, więc w rolce jest tylko uwaga, żeby sprawdzić swój okręg.
2. Rekordy biorę tylko z oficjalnej listy Wiadomości Wędkarskich (PZW), z datą pobrania.
3. Biologię (rozmiary, wiek, siedlisko, ciekawostki) biorę z FishBase (Kottelat & Freyhof 2007) i polskiej Wikipedii z przypisami.
4. Faktu bez źródła nie ma w rolce. Wątpliwe rzeczy trafiają do sekcji „Celowo pominięte” w scenariuszu.

## Archiwum: pierwsze makiety stylów

Format 1080×1920 (9:16). Przykładowy gatunek: szczupak (style A–C) i okoń (quiz D).

| Styl | Charakter | Dla kogo / kiedy |
|---|---|---|
| **A — Dynamiczny** | pełnoekranowe zdjęcie, duże napisy jak na TikToku, podświetlane słowa, pasek postępu | max zasięg, szybkie cięcia co 1–2 s |
| **B — Atlas ryb** | karta gatunku jak z atlasu: zdjęcie, łacińska nazwa, wymiar/okres ochronny, cechy rozpoznawcze | seria „kolekcjonerska” #01, #02…, chętnie zapisywana |
| **C — Dokument** | kinowe pasy, szeryfowe tytuły, napisy jak w filmie przyrodniczym | spokojniejszy lektor, budowanie klimatu |
| **D — Quiz** | „Jaka to ryba?” — zbliżenie, odliczanie, odpowiedzi A/B/C, odsłonięcie | komentarze i zaangażowanie |

Pliki:
- `mockups/frames.html` — źródło wszystkich klatek (HTML/CSS)
- `mockups/out/*.png` — wyrenderowane klatki, `mockups/out/_wszystkie_style.jpg` — plansza zbiorcza
- `npm run mockups:guides` — wersja z zaznaczonymi strefami zasłanianymi przez interfejs IG/TikTok (czerwone)

Render: `npm run mockups` (Playwright + Chromium).

## Zdjęcia

Z iNaturalist, licencje CC BY / CC BY-SA — szczegóły w `assets/photos/CREDITS.md`.
Wymagają podania autora (w opisie rolki lub na planszy końcowej).

## (stary szkic scenariusza: zastąpiony przez atlas/scenariusze/szczupak.md)

> Ten drapieżnik ma setki zębów i poluje z zasadzki. To szczupak — król polskich jezior.
> Rośnie nawet do półtora metra, a największe sztuki to zawsze samice.
> Rozpoznasz go po długim pysku jak kaczy dziób i jasnych plamkach na oliwkowym tle — to idealny kamuflaż w trzcinach.
> Znajdziesz go w całej Polsce: w zarośniętych jeziorach, starorzeczach i spokojnych odcinkach rzek.
> Pamiętaj: wymiar ochronny to 45 centymetrów, a od stycznia do końca kwietnia szczupak ma okres ochronny.
> Obserwuj — jutro okoń.

Uwaga: w pierwszej wersji podałem 50 cm. Rozporządzenie z 2023 r. mówi 45 cm.

## Kolejne kroki

1. Wybór stylu (albo miks, np. hook z A + treść z B).
2. Lektor z ElevenLabs („JA Paweł”) + napisy zsynchronizowane ze słowami.
3. Animacja (zoomy, wjazdy tekstu, przejścia) i eksport MP4 przez ffmpeg.
4. Lista gatunków i harmonogram publikacji.
