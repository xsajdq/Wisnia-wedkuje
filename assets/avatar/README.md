# Avatar @wisnia_wedkuje

Źródło: własne zdjęcie (`zrodlo.jpg`). Wersja obecna (`zrodlo_dorysowane.jpg`):
- okoń razem z dłonią przesunięty w lewo (pod twarz), żeby twarz i ryba były na środku kadru,
- **dorysowane AI** (Stable Diffusion inpainting, model `Lykon/dreamshaper-8-inpainting`, lokalnie na CPU):
  czubek głowy z włosami (krótkie, ciemnobrązowe, płasko zaczesane na bok – wg zdjęć referencyjnych),
  lewe ramię uciętej krawędzi zdjęcia i miejsca odsłonięte po przesunięciu ryby,
- postać wycięta modelem rembg `isnet-general-use` (`maska_dorysowane.png`), tło w kolorach Atlasu (`--ziel #0f2a1f`, `--zolty #ffd400`).

Pliki (1080×1080, IG/TikTok przycinają do koła):
- `avatar_zielony.jpg` – polecany: cała postać z rybą, zielone tło, żółta obwódka
- `avatar_zielony_blizej.jpg` – bliższy kadr
- `avatar_zolty.jpg` – żółte tło, ciemna obwódka

Skrypty: `narzedzia/avatar_ai/` (uklad → dorysuj → wlosy; ścieżki robocze do dostosowania),
kompozycja: `python3 narzedzia/avatar.py assets/avatar/zrodlo_dorysowane.jpg assets/avatar/maska_dorysowane.png <wyjście.jpg> 1650 1480 1450 ziel 700`.
