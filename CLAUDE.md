# Zasady projektu Wiśnia Wędkuje (dla Claude)

## ElevenLabs – oszczędzanie kredytów
- **Lektora generuj zawsze w JEDNYM wariancie**: `creative_generate_speech` z `generations_count: 1`.
  Nie generuj 4 wariantów do wyboru (decyzja użytkownika – za dużo zużytych kredytów).
- Nie ponawiaj generowania „na próbę”. Nową generację rób tylko, jeśli transkrypcja pokaże błąd w czytaniu
  (słowo przekręcone lub pominięte) albo użytkownik o to poprosi.
- Głos: „JA Paweł” (`bHIh6fgsLVytKSOdaWBi`), model `eleven_v4`. Liczby w tekście lektora zapisuj słownie.
- Transkrypcja (Scribe) jest darmowa – zawsze ją rób, żeby sprawdzić tekst i zbudować napisy.

## Rolki
- **Najpierw makieta, potem film (decyzja użytkownika).** Dla każdego odcinka (i każdej poprawki zdjęć/tekstów):
  1. przygotuj dane, zdjęcia i tekst lektora, wyrenderuj statyczną makietę WSZYSTKICH 9 slajdów
     (`node atlas/render.mjs <g>` + `python3 atlas/plansza.py atlas/out/<g>`) i wyślij ją użytkownikowi
     (`_plansza.jpg` + tekst lektora do przeczytania),
  2. **czekaj na potwierdzenie** – bez akceptacji nie generuj lektora w ElevenLabs i nie renderuj MP4,
  3. dopiero po „OK” użytkownika: lektor (1 wariant) → transkrypcja → oś czasu → `render_wideo.mjs`.
- **Elementy na ekranie muszą pasować do słów lektora**: tekst każdego kafelka/punktu ma odpowiadać frazie, przy której
  wchodzi (`przy` = pierwsze słowo tej frazy). Nie łącz w jednym kafelku rzeczy mówionych w różnych momentach.
- Format i proces: patrz `README.md` (Atlas Ryb Polski, 9 scen, render `atlas/render_wideo.mjs`).
- Każdy fakt musi mieć źródło (rozporządzenie Dz.U. 2023 poz. 1373, oficjalne rekordy Wiadomości Wędkarskich,
  FishBase, Wikipedia). Wątpliwe fakty → sekcja „Celowo pominięte” w `atlas/scenariusze/<gatunek>.md`.
- Na każdej klatce ze zdjęciem ryba musi być widoczna w całości, a ludzie rozmyci (`narzedzia/przygotuj_zdjecie.py`).
- **Wybieraj zdjęcia, na których ryby nic nie zasłania** – bez dłoni na rybie, trawy/patyków/podbieraka na ciele,
  gałęzi przed rybą. Najlepiej ryba leżąca w całości na czystym tle (deska, kamienie, mata, woda). Zdjęcia „średnie”
  (ryba w dłoniach, przysłonięta) odrzucaj, nawet jeśli trzeba przejrzeć więcej wyników iNaturalist.
- Profil: @wisnia_wedkuje. Do każdego odcinka opis posta w `opisy/<gatunek>.md` i MP4 w `wideo/`.
- **Przepisy w rolce: dwa poziomy.** (1) wymiar/okres z rozporządzenia (państwowy), (2) typowy wymiar na wodach PZW
  liczony z regulaminów wielu okręgów: `python3 narzedzia/pzw_typowy.py <gatunek>` → wynik do `przepisy.pzw`
  w `data/gatunki/<g>.json` (pokazuje się jako żółta karta „na wodach PZW najczęściej”). Lektor mówi oba,
  np. „według przepisów państwowych 45 cm, ale na wodach PZW najczęściej 50 cm”. Dane okręgów: `data/przepisy_pzw.json`
  – dla nowego gatunku najpierw dopisz wartości z regulaminów okręgów (ze źródłem i rokiem).
- Docelowa długość rolki: 60–80 s (zaakceptowane przez użytkownika; lektor przyspieszany ×1,1). Nie skracaj tekstu na siłę.

## Dźwięk i montaż
- **Efekty dźwiękowe w każdej rolce**: biblioteka `audio/sfx/*.wav` (ElevenLabs SFX, wygenerowana raz – nie generuj ponownie).
  `render_wideo.mjs` sam dokłada plusk na start, whoosh przy zmianie sceny, pop/ślizg przy wejściu elementów,
  tykanie przy liczbach i dzwonek przy rekordzie. **Efekty zawsze ciszej niż lektor** (domyślnie `--sfx 0.22` ≈ -13 dB),
  lektor normalizowany do -15 LUFS. Po renderze sprawdź poziom: `ffmpeg -i wideo/<g>.mp4 -af ebur128 -f null -`.
- Muzykę w tle dodaje użytkownik w aplikacji IG/TikTok (licencjonowana biblioteka platformy) – nie wgrywamy cudzej muzyki.

## Pluginy social media (używaj przy każdym odcinku)
- `social-media-skills:hook-writer` – 2–3 warianty hooka przed napisaniem lektora; wybierz najmocniejszy zgodny ze źródłami.
- `social-media-skills:reels-script` / `short-form-video-script` – kontrola struktury i tempa scenariusza.
- `social-media-skills:caption-writer` + `hashtag-strategy` + `instagram-seo` – opis posta w `opisy/<g>.md`.
- `social-media-skills:ai-music-and-sound` – zasady dźwięku (licencjonowane źródła, SFX pod lektorem).
- `social-media-skills:instagram-reels-publishing` / `tiktok-video-publishing` – wskazówki publikacji (okładka, pierwsze sekundy).
- Fakty nadal tylko ze źródeł (rozporządzenie, rekordy WW, FishBase, Wikipedia) – pluginy nie zastępują weryfikacji.
