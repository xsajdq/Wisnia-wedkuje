# Zasady projektu Wiśnia Wędkuje (dla Claude)

## ElevenLabs – oszczędzanie kredytów
- **Lektora generuj zawsze w JEDNYM wariancie**: `creative_generate_speech` z `generations_count: 1`.
  Nie generuj 4 wariantów do wyboru (decyzja użytkownika – za dużo zużytych kredytów).
- Nie ponawiaj generowania „na próbę”. Nową generację rób tylko, jeśli transkrypcja pokaże błąd w czytaniu
  (słowo przekręcone lub pominięte) albo użytkownik o to poprosi.
- Głos: „JA Paweł” (`bHIh6fgsLVytKSOdaWBi`), model `eleven_v4`. Liczby w tekście lektora zapisuj słownie.
- Transkrypcja (Scribe) jest darmowa – zawsze ją rób, żeby sprawdzić tekst i zbudować napisy.

## Rolki
- Format i proces: patrz `README.md` (Atlas Ryb Polski, 9 scen, render `atlas/render_wideo.mjs`).
- Każdy fakt musi mieć źródło (rozporządzenie Dz.U. 2023 poz. 1373, oficjalne rekordy Wiadomości Wędkarskich,
  FishBase, Wikipedia). Wątpliwe fakty → sekcja „Celowo pominięte” w `atlas/scenariusze/<gatunek>.md`.
- Na każdej klatce ze zdjęciem ryba musi być widoczna w całości, a ludzie rozmyci (`narzedzia/przygotuj_zdjecie.py`).
- Profil: @wisnia_wedkuje. Do każdego odcinka opis posta w `opisy/<gatunek>.md` i MP4 w `wideo/`.
- **Przepisy w rolce: dwa poziomy.** (1) wymiar/okres z rozporządzenia (państwowy), (2) typowy wymiar na wodach PZW
  liczony z regulaminów wielu okręgów: `python3 narzedzia/pzw_typowy.py <gatunek>` → wynik do `przepisy.pzw`
  w `data/gatunki/<g>.json` (pokazuje się jako żółta karta „na wodach PZW najczęściej”). Lektor mówi oba,
  np. „według przepisów państwowych 45 cm, ale na wodach PZW najczęściej 50 cm”. Dane okręgów: `data/przepisy_pzw.json`
  – dla nowego gatunku najpierw dopisz wartości z regulaminów okręgów (ze źródłem i rokiem).
- Docelowa długość rolki: 60–80 s (zaakceptowane przez użytkownika; lektor przyspieszany ×1,1). Nie skracaj tekstu na siłę.
