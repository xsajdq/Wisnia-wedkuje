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
- **Nazwa gatunku pada dopiero w scenie 2 („To <gatunek>”)**. W hooku (scena 1) mów „ta ryba”, nigdy nazwy gatunku
  ani jej odmiany (np. „sumy”, „leszcz”), żeby odsłonięcie nazwy miało sens.
- **Rodzaj gatunku**: w `data/gatunki/<g>.json` pole `rodzaj` (`"z"` dla ryby żeńskiej, np. sieja, troć, płoć; `"m"` dla męskiej).
  Szablon dobiera z niego tytuł sceny 3 („Jak ją rozpoznać?” / „Jak go rozpoznać?”). Każdy napis i lektor w formie zgodnej z rodzajem ryby.
- **Liczby w scenie rozmiarów zawsze w jednej linii** (szablon zmniejsza zakresy typu „30–50”); etykieta „średnio” dla średniej długości.
- **Scena rekordu**: pod masą i pod długością osobno rekordzista i rok, każde w nowej linii (szablon robi to sam).
- Format i proces: patrz `README.md` (Atlas Ryb Polski, 9 scen, render `atlas/render_wideo.mjs`).
- Każdy fakt musi mieć źródło (rozporządzenie Dz.U. 2023 poz. 1373, oficjalne rekordy Wiadomości Wędkarskich,
  FishBase, Wikipedia). Wątpliwe fakty → sekcja „Celowo pominięte” w `atlas/scenariusze/<gatunek>.md`.
- Na każdej klatce ze zdjęciem ryba musi być widoczna w całości, a ludzie rozmyci (`narzedzia/przygotuj_zdjecie.py`).
- **Wycinanie ryb**: `przygotuj_zdjecie.py` domyka i zaokrągla kontur (`--wygladz`) i dodaje zapas pikseli (`--rozszerz`).
  Po każdym wycięciu porównaj maskę z oryginałem (cała ryba, wszystkie płetwy, koniec ogona) – brakujące
  fragmenty dopnij dodatkowymi `--punkt`.
- **Szukanie zdjęć w wielu źródłach**: `python3 narzedzia/szukaj_zdjec.py "<Nazwa łacińska>" <katalog>` – iNaturalist (wszystkie
  obserwacje), GBIF (muzea, observation.org, PlutoF), Wikimedia Commons. Tylko CC0 / CC BY / CC BY-SA (bez ND, bez NC).
- **Minimum 4 różne zdjęcia ryby w każdej rolce** (decyzja użytkownika), widoczne na scenach – nie licząc rozmytego tła.
  Jeśli iNaturalist nie wystarcza, szukaj osobno w GBIF (muzea) i Wikimedia Commons (`szukaj_zdjec.py` ma limit `--max`,
  który potrafi zająć sam iNaturalist). Zdjęcie z rybą leżącą pionowo można obrócić, żeby leżała poziomo.
- **Wybieraj zdjęcia, na których ryby nic nie zasłania** – bez dłoni na rybie, trawy/patyków/podbieraka na ciele,
  gałęzi przed rybą. Najlepiej ryba leżąca w całości na czystym tle (deska, kamienie, mata, woda). Zdjęcia „średnie”
  (ryba w dłoniach, przysłonięta) odrzucaj, nawet jeśli trzeba przejrzeć więcej wyników iNaturalist.
  Odrzucaj też zdjęcia „kuchenne” (deska do krojenia, noże, lada sklepowa, lód w sklepie) – atlas pokazuje rybę
  w naturze albo na łowisku; najlepiej żywą ryba pod wodą lub w akwarium (decyzja użytkownika).
- Profil: @wisnia_wedkuje. Do każdego odcinka opis posta w `opisy/<gatunek>.md` i MP4 w `wideo/`.
- **Opis posta**: numer odcinka bez znaku `#` (np. „ATLAS RYB POLSKI 08 – PŁOĆ”), zawsze **dokładnie 5 hashtagów** (te same na IG i TikTok).
- **Przepisy w rolce: dwa poziomy.** (1) wymiar/okres z rozporządzenia (państwowy), (2) typowy wymiar na wodach PZW
  liczony z regulaminów wielu okręgów: `python3 narzedzia/pzw_typowy.py <gatunek>` → wynik do `przepisy.pzw`
  w `data/gatunki/<g>.json` (pokazuje się jako żółta karta „na wodach PZW najczęściej”). Lektor mówi oba,
  np. „według przepisów państwowych 45 cm, ale na wodach PZW najczęściej 50 cm”. Dane okręgów: `data/przepisy_pzw.json`
  – dla nowego gatunku najpierw dopisz wartości z regulaminów okręgów (ze źródłem i rokiem).
- **Koniec sceny przepisów**: lektor zawsze mówi dokładnie „Zawsze sprawdź swoje zezwolenie.” (decyzja użytkownika).
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

## Opublikowane filmy – nie zmieniamy (decyzja użytkownika)
- Film „Okoń – gdzie i jak łowić” (Atlas 3D, `okon_jak2`, wersje 720p24 i YouTube 1080p24) jest opublikowany: nie poprawiamy go i nie renderujemy ponownie.
- Ulepszenia (atak z przynętą w pysku, płynna paszcza, szybszy render itp.) stosujemy tylko w kolejnych filmach – cel: jak najwyższa jakość w przyszłości.
  Zmiany we wspólnym kodzie (`silnik.js`, `postacie.js`) mogą zmienić wygląd starych plików HTML – to nie szkodzi, bo opublikowanych filmów nie renderujemy ponownie.

## Render (decyzja użytkownika)
- **Zawsze renderuj przez `atlas3d/przegladarka.mjs`** (wszystkie skrypty `atlas3d/*.mjs` już go używają): Chromium na Xvfb z Mesa llvmpipe
  i szybki zapis klatek przez CDP – ten sam obraz, ok. 5× szybciej niż SwiftShader + `page.screenshot`. Nowe skrypty też tylko przez ten moduł
  (`przegladarka()`, `zrzutnik()` / `zrzutStrony()`), nigdy bezpośrednio `chromium.launch` ze SwiftShaderem.
- Filmy: `node atlas3d/render_makieta.mjs <film> --film ...` renderuje PO SCENACH (bezstratnie), `--wznow` po awarii, `--wznow --popraw 5,7`
  dla poprawek pojedynczych scen. Sprawdzaj wypisaną na końcu kontrolę kadrów (czarne/białe plamy).

## Animacje 2.5D (Atlas 3D, decyzje użytkownika)
- Proces i assety opisuje skill `wisnia-animacja-2-5d` (`.claude/skills/wisnia-animacja-2-5d/SKILL.md`). Używaj go przy każdej animacji 3D.
- **Świat 3D nie może wisieć w powietrzu** (bez wyciętych dioram): brzegi, otoczenie i horyzont. Pod wodę wchodzimy ujęciem pół na pół.
- **Ryby i postacie nieprzezroczyste**, przezroczysta jest tylko woda.
- **Ryby nie wchodzą w dno, kamienie ani ponad taflę.** Płyną głową do przodu.
- **Ruchy WSZYSTKICH postaci zawsze płynne (decyzja użytkownika)**: ryby, ptaki (mewy), ważki, wędkarz, przynęty – bez przeskoków
  pozycji, kierunku i pozy. Tor musi mieć ciągłą prędkość (np. nurek mewy: profil cos, bez zawracania do stałego punktu), kierunek liczony
  z gładkiego okna czasu lub z ograniczoną prędkością obrotu, zmiany pozy (machanie ↔ szybowanie ↔ złożone skrzydła) mieszane wagą 0..1, nigdy przełącznikiem.
  Po każdej zmianie ruchu obejrzyj fragment klatka po klatce (10 fps) w miejscu zmiany kierunku.
- **Nigdy nie przyspieszaj ani nie zwalniaj ruchu, żeby dopasować go do lektora (decyzja użytkownika)**: ryby, mewy, kamera i akcje
  biegną w czasie rzeczywistym (`ruchRzeczywisty: true` w `uruchom`). Do słów lektora przypinamy tylko CHWILE (wejście napisu, dźwięk,
  start akcji: `T(czas projektu)`). Gdy akcja się nie mieści – wydłuż scenę (pauza w lektorze), zamiast ją ściskać.
- **Kolejne miejsca w tym samym świecie = jedno ciągłe ujęcie bez cięć (decyzja użytkownika)**: kamera szybko przelatuje z miejsca
  na miejsce (`ciagla`, `ujecie(off)`, klucze kamery z łukiem `przez`), obiekty żyją w czasie całego ujęcia, bez fali między scenami.
- **Ataki na przynętę – dokładnie jak w naturze (decyzja użytkownika)**: każdy atak kończy się przynętą W PYSKU ryby (nie znika, nie mija pyska),
  żyłka biegnie naturalnie od oczka przynęty (przy zacięciu płynnie się napina, bez przeskoku), paszcza otwiera się szybko (ok. 0,05 s) tuż przed
  chwyceniem i zamyka na przynęcie, zryw krótki i szybki (ok. 0,2 s), wszystko w czasie rzeczywistym. Używaj `atak(wedkarz, ryba, tor, { ts, ... })`
  z `silnik.js` (śledzenie albo zasadzka → zryw → przynęta w pysku → hol). Po zmianie obejrzyj atak klatka po klatce (24 kl./s).
- **Wędkarz łowi jak prawdziwy (decyzja użytkownika)**: wędka w PRAWEJ ręce, LEWA kręci korbką kołowrotka przy każdym prowadzeniu i holu
  (`wedkarz3d(..., { st: { korba: true } })` – kołowrotek wisi pod wędką, korbka od strony lewej ręki, dłoń na gałce z IK, wejście/wyjście płynne;
  przy prowadzeniu szczytówka nisko ku wodzie, w holu wyżej). Ręce nie mogą wchodzić w wędkę, siebie nawzajem ani w głowę, ręka zawsze połączona z barkiem.
- **Jakość całego filmu bez wydłużania renderu (decyzja użytkownika)**: dopracowujemy ruch, pozy, modele i dźwięk w każdym ujęciu, ale NIE dodajemy
  ulepszeń, które wydłużają render (supersampling `--ss` i rozmycie ruchu `--rozmycie` są tylko opcjami na wyraźne życzenie). Postacie 3D (wędkarz3d,
  okon3d, plotka3d, ukleja3d, szczupak, sandacz), dźwięk przypięty do akcji i stłumiony pod wodą. Przed renderem każdej sceny: `node atlas3d/kontrola_ruchu.mjs <film> <scena>`
  (skoki pozycji i zwroty) – zgłoszenia wyjaśnij albo popraw.
- **Płynne przejścia między scenami** (fala), dynamiczna kamera, detale otoczenia (bąbelki, rośliny, światło, owady).
- **Modele i tekstury rób dokładnie i wielokrotnego użytku**: postacie w `atlas3d/postacie.js`, przynęty w `atlas3d/przynety.js`
  (twister, ripper, wahadłówka, obrotówka, wobler, mormyszka). Wygląd bohaterów nie zmienia się między filmami.
