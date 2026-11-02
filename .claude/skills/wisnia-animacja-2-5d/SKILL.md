---
name: wisnia-animacja-2-5d
description: Tworzenie animowanych rolek Wiśnia Wędkuje w stylu 2.5D (ryby, wędkarz i przynęty jako ilustracje 2D w świecie 3D bez krawędzi, ujęcia pół na pół na tafli, przejścia falą, efekty dźwiękowe). Używaj przy każdym nowym filmie/makiecie 3D, przy dodawaniu gatunku ryby, postaci, przynęty albo lokacji, i gdy użytkownik mówi „jak film o okoniu 3D”, „w stylu 2D + 3D”, „animacja wędkarska”.
---

# Animacje 2.5D Wiśnia Wędkuje („Fishing Animation Universe”)

Silnik: `atlas3d/silnik.js` (+ `styl3d.css`). Film = plik `atlas3d/<film>.html`: importuje narzędzia z silnika, definiuje `SCENY`
i woła `uruchom({ sceny, liczba, tytul, dlugosc(n), tlo(n), kadry: [[scena, czas], …] })`.
Wzorce: `atlas3d/okon_gdzie.html` (9 scen po ok. 4 s) i `atlas3d/okon_jak.html` (poradnik, 7 scen, 90 s). Styl bazowy: skill `cartoon-3d-short` (tusz, toon, kamera),
ale bez Remotion: three.js w Chromium (SwiftShader), render klatka po klatce przez Playwright.

## Zasady użytkownika (obowiązują zawsze)
1. **Najpierw makieta** (9 kadrów + `_plansza.jpg`), potem film. Lektor tylko po akceptacji tekstu (patrz CLAUDE.md).
2. **Świat nie może wisieć w powietrzu.** Żadnych wyciętych dioram: teren ciągnie się po horyzont (brzegi, pagórki, las,
   mgła). Pod wodę zaglądamy ujęciem „pół na pół” na poziomie tafli albo kamerą pod wodą.
3. **Ryby nieprzezroczyste, tylko woda przezroczysta.** Postacie są na warstwie `POSTACIE` z własną maską w kompozycji,
   więc tusz świata ich nie przecina.
4. **Ryby nie wchodzą w dno, kamienie ani ponad taflę/lód.** `trzymajRybe()` sprawdza dno na całej długości ryby.
   Każdy nowy przeszkodzony obiekt (kamień, konar, gałąź) dopisuj do `kamienie` (x, z, r, top).
5. **Ryba płynie głową do przodu** (zwrot karty przez profil). Nie ustawiaj ruchu „tam i z powrotem” w krótkiej scenie
   ataku, użyj monotonicznego `ruch(t)`.
6. **Assety do wielokrotnego użycia**, dokładne modele i tekstury: postacie w `atlas3d/postacie.js`, przynęty
   w `atlas3d/przynety.js`. Nie rysuj postaci/przynęt w pliku sceny. Wygląd bohaterów się nie zmienia między filmami.
7. Każdy fakt w napisach ma źródło (`atlas3d/scenariusze/<film>.md`, sekcja „Celowo pominięte” dla wątpliwych).
8. Elementy na ekranie wchodzą razem z frazą (`data-od`), dymki wędkarza to humor, nie fakty.

## Biblioteki assetów
- `atlas3d/postacie.js`
  - `stworzOkonia({ wys, mina })`: części ogon, płetwy grzbietowe 1 i 2, odbytowa, brzuszna, ciało (z falą), piersiowa,
    źrenica i brew. `anim(t, { tempo, mina, patrz, kolce })`.
  - `stworzWedkarza({ wys, zima, siedzi })`: „Ekspert”. Miny: spokojny, usmiech, zdziwiony, skupiony, mrug.
    `anim(t, { mina, podrywanie, glowa, reka })`, `czubek()` to punkt na żyłkę.
  - `stworzPlotke({ wys })`: drobnica.
  - `narzedzia`: gladko, obrys, wypelnij, lg, czesc, odmiany, zloz. Każda nowa biblioteka rysuje tymi samymi funkcjami.
- `atlas3d/sprzet.js` → `SPRZET`: wędka (prosta / wygięta), kołowrotek (korbka się kręci), plecionka, przypon, dropShot,
  splawikRobak (`wodaY`: poziom wody na anteny). W scenie: `postaw(element(SPRZET.x({ dl }), st), x, y, z)`; `pokaz(m, od)` = wyskakuje w czasie.
- **Wędka spinningowa**: przelotki ZAWSZE po tej samej stronie blanku co kołowrotek (pod wędką), a ugięcie (hol)
  zawsze na tę samą stronę – szczytówka idzie w dół, w stronę przelotek. Dotyczy `sprzet.js` i ręki wędkarza w `postacie.js`.
- Wędkarz – pozy w `st`: `rzut` (postęp 0…1), `hol` (wędka wygięta, drży), `trzyma` (ręka do przodu, `postac.dlon()` = dłoń),
  `podrywanie`, `mina`. Ryba w rękach: `userData.bezKolizji = true`.
- `atlas3d/przynety.js` → `PRZYNETY`
  - twister, ripper, wahadłówka, obrotówka, wobler (malowanie: plotka, okon, firetiger), mormyszka.
  - `anim(t, { predkosc })`, `nos` to punkt wiązania żyłki.
- Karty kontrolne: `node atlas3d/render_karta.mjs` (postacie) i `node atlas3d/render_karta.mjs przynety`.
  Po każdej zmianie assetu wyrenderuj kartę i obejrzyj ją.

### Nowy gatunek / postać / przynęta
- Gatunek: funkcja `stworzX` w `postacie.js` według wzoru okonia. Wymagania:
  - rysunek w widoku z boku, głowa w prawo, środek układu w środku ciała;
  - osobne części z piwotami: ogon u nasady, płetwy u podstawy, źrenica;
  - anatomia z FishBase lub Wikipedii: kształt pyska, układ i liczba płetw, ubarwienie, łuski, linia boczna;
  - miny tylko przez brew i źrenicę, bez ludzkich kończyn.

  Dodaj gatunek do karty postaci.
- Postać (Amator, Stary wyjadacz): ta sama konstrukcja co Ekspert (głowa z odmianami min, tułów, nogi, ręka z wędką).
  Ustal stałe cechy w komentarzu (twarz, ubranie, paleta) i nigdy ich nie zmieniaj.
- Przynęta: nos w prawo, dopisz ją do `PRZYNETY` i do karty przynęt. **Precyzja mocowań**:
  - część nośna obraca się wokół oczka na żyłkę (`nos`), więc żyłka zawsze trafia w oczko;
  - elementy doczepione (ogonek, kopyto, kotwice, paletka) są dziećmi części nośnej (`podepnij`), z piwotem w punkcie mocowania;
  - bryły sztywne (wobler + ster, blacha) to jedna część;
  - hak główki jigowej: z grzbietu gumy okrągłym łukiem w górę, końcówka z grotem RÓWNOLEGLE do przynęty, w stronę główki;
  - kotwice w obrotówce, woblerze i blasze są duże (r ok. 44 w pikselach projektu);
  - wobler kołysze się na boki (skrót długości + lekki przechył), nie tylko góra–dół;
  - po zmianie: `node atlas3d/render_karta.mjs przynety --animacja` i obejrzyj MP4.
- **Żyłka w scenach** (`zylka`): od przynęty zawsze wychodzi w bok (styczna pozioma wzdłuż osi przynęty), potem łukiem
  do szczytówki. Mormyszka: zawsze pionowo z przerębli. Żyłka to cienka rurka na warstwie POSTACIE (widoczna, z własną głębią).

## Scena (`atlas3d/<film>.html`)
- Świat:
  - `swiatJezioro({ snieg, zlota })` albo `swiatRzeka()` (z zatoką `ZATOKA` i zatopionym drzewem);
  - teren z funkcji `TEREN(x, z)`, las z instancji, tafla, lód;
  - rekwizyty: `pomost`, `konar`, `zatopioneDrzewo`, `kamien`, `roslinaWodna`, `grzybienie`, `trzciny`;
    jezioro: `swiatJezioro({ gorka: { x, z, r, top } })` (podwodna górka); rzeka: `glowka`, `most`, `podmytyBrzeg`;
    tor przynęty: `sciezka(pts)` (kreski, `ustaw(0…1)`, `punkt(f)`) – odcinki proste.
- Pory dnia: `LATO`, `ZLOTA` (świt i zmierzch), `ZIMA` (lód, ciemniejsza woda). `TINT` i `TINT_WODA` barwią postacie,
  żeby pasowały do światła.
- Kamera: `kam(p0, cel, { p1, l1, najazd, orbita, stalaY, fov, panorama, klucze: [[czas, pozycja, cel], …] })`. Ujęcie pół na pół to `stalaY: 0`.
  Zimą kamera jest tuż nad cienkim lodem przy przerębli (`stalaY: .14`).
- **Kadrowanie w pionie**: poziome pole widzenia to tylko ok. 30° przy `fov: 48`. Obiekt 2 m w bok w odległości 5 m
  wypada z kadru. Kluczowe obiekty stawiaj na osi kamera → cel, a pozycje sprawdzaj rzutowaniem (`v.project(camera)`).
- Efekty (wołaj po `kam`, bo używają `OBSZAR`): `babelki`, `mul` (z `nurt` w rzece), `promienie`, `kregi`, `wazka`,
  `snieg`, `przedplan` (rośliny i kamienie na pierwszym planie). Żyłka: `zylka(wedkarz, cel, splawik, { typ, dl })`.
- Napisy: chip, h1, opis i karty z `data-od`. `etykieta(tekst, x, y, z, klasa, od, do)` dla etykiet w świecie
  i dymków (`klasa 'dymek'`, tekst krótki, dwie linie). U góry jest pasek postępu 9 scen.
- Przejścia: `window.ustawPrzejscie(jpg)`. Render podaje ostatnią klatkę poprzedniej sceny, a nowa odsłania się falą.

## Render i kontrola
```
node atlas3d/render_makieta.mjs <film>                 # 9 kadrów + _plansza.jpg (makieta do akceptacji)
node atlas3d/render_makieta.mjs <film> 3,5             # wybrane kadry
node atlas3d/render_makieta.mjs <film> --animacja      # niemy podgląd ruchu
node atlas3d/render_makieta.mjs <film> --film --dl 4.3 # film z SFX (audio/sfx) i tłem, bez lektora → wideo/<film>_bez_lektora.mp4
ffmpeg -i wideo/<film>_bez_lektora.mp4 -af ebur128 -f null -   # głośność ok. -15/-16 LUFS
```
Czas: ok. 2 min na scenę 4,3 s przy 30 kl./s (SwiftShader). Długie rendery uruchamiaj w tle.
QA po każdej zmianie:
1. Plansza: czy na każdym kadrze widać rybę, wędkarza i przynętę, czy nic nie jest ucięte ani zasłonięte tekstem.
2. Wycinki 1:1 (PIL crop) najważniejszych miejsc.
3. Z filmu wytnij klatki co ok. 2 s (`fps=1/2.2,tile`) i sprawdź przejścia oraz zwroty ryb.

**Przed renderem**: `node atlas3d/diagnostyka.mjs <film> <scena> <czas…>` – lista elementów z pozycją na ekranie; `!!` = poza kadrem.

## Pułapki, które już się zdarzyły
- Brokat i inne „kropki” rysowane po wypełnieniu zmieniają bieżącą ścieżkę Canvas: przed `obrys()` narysuj kształt jeszcze raz.
- Ster woblera jako osobna część „pływał” względem korpusu: musi być w tej samej bryle.
- Ujęć z dwoma ważnymi miejscami (np. nurt i zatoka) nie mieści pionowy kadr: użyj panoramy (`kam(..., { l1, panorama: true })`)
  i licz rzuty `window.rzut(x, y, z)`, zamiast ustawiać kamerę na oko.
- Diorama z przekrojem wyglądała na wyciętą: użytkownik ją odrzucił. Zostaje świat ciągły.
- Tusz rysowany na całym obrazie przebijał przez ryby: potrzebna maska postaci (`rtM`).
- Przy wolnym pływaniu `tanh(v*3)` ustawiało rybę bokiem: używaj `tanh(v*30)`.
- Dymki i etykiety nad głową wędkarza wychodzą poza kadr albo wchodzą pod nagłówek: kotwicz je obok głowy.
- Małe przynęty (realne 10 cm) giną w toni: w kadrze stylizuj je większe (0,4–0,6 m) i bliżej kamery.
- `alphaTest` w częściach postaci ok. 0,35: półprzezroczyste płetwy (alfa 0,8) zostają, cień kontaktowy ma własne ustawienia.

## Pomysły na kolejne filmy (backlog)
- Postacie Amator i Stary wyjadacz (humor, pytania). Gatunki: szczupak, sandacz, karp, sum, kleń, płoć.
- Ujęcie z perspektywy ryby, śledzenie przynęty kamerą, zbliżenie na pracę przynęty z podpisem.
- Pracownia wędkarska (wnętrze 3D), przekroje zestawów (grunt, koszyk zanętowy, przypony).
- Plansza-ściągawka na końcu (podsumowanie do zapisania), ikony w napisach, mapa głębokości.
