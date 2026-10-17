# Wiśnia Wędkuje — rolki IG / TikTok

Edukacyjne rolki o rybach występujących w Polsce: wygląd, występowanie, ciekawostki.
Lektor: głos ElevenLabs **„JA Paweł”** (`bHIh6fgsLVytKSOdaWBi`, sklonowany, PL).

## Etap 1 — makiety stylów (tylko grafika)

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

## Przykładowy scenariusz lektora (szczupak, ~30 s) — do dopracowania

> Ten drapieżnik ma setki zębów i poluje z zasadzki. To szczupak — król polskich jezior.
> Rośnie nawet do półtora metra, a największe sztuki to zawsze samice.
> Rozpoznasz go po długim pysku jak kaczy dziób i jasnych plamkach na oliwkowym tle — to idealny kamuflaż w trzcinach.
> Znajdziesz go w całej Polsce: w zarośniętych jeziorach, starorzeczach i spokojnych odcinkach rzek.
> Pamiętaj: wymiar ochronny to 50 centymetrów, a od stycznia do końca kwietnia szczupak ma okres ochronny.
> Obserwuj — jutro okoń.

Liczby (wymiar i okres ochronny) trzeba sprawdzić z aktualnym rozporządzeniem i regulaminem PZW przed publikacją.

## Kolejne kroki

1. Wybór stylu (albo miks, np. hook z A + treść z B).
2. Lektor z ElevenLabs („JA Paweł”) + napisy zsynchronizowane ze słowami.
3. Animacja (zoomy, wjazdy tekstu, przejścia) i eksport MP4 przez ffmpeg.
4. Lista gatunków i harmonogram publikacji.
