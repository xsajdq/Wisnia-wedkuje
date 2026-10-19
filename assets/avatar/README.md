# Avatar @wisnia_wedkuje

Źródło: własne zdjęcie (`zrodlo.jpg`), postać z okoniem wycięta modelem rembg `isnet-general-use` (`maska.png`).
Tło i obwódka w kolorach Atlasu Ryb Polski (`--ziel #0f2a1f`, `--zolty #ffd400`). 1080×1080, IG/TikTok przycinają do koła.

- `avatar_zielony.jpg` – polecany: bliższy kadr, twarz i okoń czytelne nawet w małym kółku
- `avatar_zielony_szeroki.jpg` – szerszy kadr, widać więcej ryby
- `avatar_zolty.jpg` – żółte tło, mocniej odcina się w feedzie

Ponowne wygenerowanie: `python3 narzedzia/avatar.py assets/avatar/zrodlo.jpg assets/avatar/maska.png <wyjście.jpg> <cx> <cy> <R> ziel|zolty`
(np. `1600 1050 1350 ziel` dla wersji polecanej).
