# Jak łowić okonie? – scenariusz v2 (do akceptacji)

Wersja 1 (`okon_jak.md`, film `wideo/okon_jak.mp4`, 108 s) zmierzona narzędziem `atlas3d/kontrola_czasu.mjs`.
Wynik pomiaru: `atlas3d/out/okon_jak/czas_ekranowy.json`. Wersja 2 poprawia tempo i dokłada brakujące ujęcia. Makieta v2: `atlas3d/okon_jak2.html` (12 scen, około 138 s bez lektora), plansza `atlas3d/out/okon_jak2/_plansza.jpg`.

## 1. Diagnoza wersji 1

| Scena | Problem | Pomiar |
|---|---|---|
| 1 Hook | Hook mówi „to błąd”, ale obraz go nie pokazuje (rzut i okonie, bez „złego” wyboru) | 1,8–5,8 s: brak nowego elementu |
| 2 Jezioro | Lektor wylicza 7 miejsc w 5 s, a obraz pokazuje je po kolei przez 15 s. Etykiety trzcin i grzybieni znikają po 1,0–1,4 s. Zatopione drzewo jest tylko na liście, nie w obrazie | trzciny 1,4 s, grzybienie 1,0 s, 12,0–16,2 s pusto |
| 3 Rzeka | Najgorsze miejsce filmu: 4 miejsca w 1,4 s, etykiety przez 0,4–0,8 s, nie da się ich przeczytać | główka 0,6 s, okoń za główką 0,4 s, filar 0,8 s, okoń przy filarze 0,6 s; „tłok” 2× |
| 4 Sprzęt | Dobre tempo do 12 s, potem 4,4 s bez zmian. Ostatnia etykieta (obrotówki i woblery) przez 1,0 s | |
| 5 Prowadzenie | 5 s i 6,3 s bez nowego elementu. Branie jest, ale holu prawie nie widać: ryba szybko znika z kadru | pusto 7,8–12,8 i 14,4–20,7 s |
| 6 Nie biorą | Za szybko na końcu: „robak na spławiku” przez 0,8 s | |
| 7 Zasady | Dwa długie przestoje: 4 s i 5,4 s | |

**Wniosek:** film jest nierówny. Rzeka i lista miejsc na jeziorze lecą za szybko, a prowadzenie i zakończenie stoją w miejscu.
Przyczyną jest tekst lektora: wylicza miejsca jednym zdaniem, a obraz potrzebuje około 4–6 s na każde miejsce (pokazać, wskazać, dodać okonia).

## 2. Zasady tempa (stosuję w v2 i w kolejnych filmach)
- Jedno miejsce na łowisku to jedno zdanie lektora i jedno ujęcie: **4–6 s**. Kamera dojeżdża, strzałka i okoń są widoczne **co najmniej 2,5 s**.
- Etykieta albo karta: co najmniej 0,8 s + 0,3 s na słowo, minimum 1,5 s. Nie znika szybciej, niż da się ją przeczytać.
- Nowy element (napis, ruch kamery, akcja ryby) co **2–4 s**. Więcej niż 4 s bez zmiany tylko przy akcji, np. hol.
- Najwyżej 3 nowe elementy w ciągu 1,5 s.
- Kontrola przed każdym renderem: `kontrola_czasu.mjs`, `kontrola_napisow.mjs`, `kontrola_strzalek.mjs`. Test: `render_makieta.mjs <film> --test --lektor …` (5 kl./s, 540×960).

## 3. Scenariusz v2 – ujęcia

Czasy są orientacyjne (po przyspieszeniu lektora ×1,1). Dokładne ustali transkrypcja.
„Nowe” = ujęcie, którego nie było w v1. **Porada** = praktyka wędkarska bez źródła naukowego (zgoda użytkownika).

| # | Czas | Ujęcie / kamera | Co widać (min. czas) | Lektor | Dźwięk |
|---|---|---|---|---|---|
| 1 | 0–4 s | **Nowe:** wędkarz rzuca w otwartą, pustą wodę. Pod wodą pusto, czerwony ✗ „bez stanowiska” | ✗ 1,5 s | Wybierasz przynętę, zanim znajdziesz okonie? To błąd. | rzut, plusk |
| 2 | 4–9 s | Kamera płynie pod wodą do zatopionego drzewa: stado okoni, zielony ✓ „stanowisko” | tytuł „Jak łowić okonie?” 3 s, ✓ 2 s | Najpierw stanowisko, potem przynęta. Pokażę ci, gdzie ich szukać na jeziorze i na rzece, i jak je łowić. | przejście |
| 3 | 9–14 s | Jezioro: zbliżenie na trzciny i grzybienie (z ważką), pod liśćmi okoń | „trzciny”, „grzybienie” po 2,5 s | Na jeziorze zacznij od granicy roślinności. Okonie kryją się przy trzcinach i pod liśćmi grzybieni. | porada |
| 4 | 14–18 s | **Nowe:** pod pomostem, pale, 2–3 okonie w cieniu | „pomost” 2,5 s | Sprawdź pomosty. W cieniu pali często stoi kilka okoni. | porada |
| 5 | 18–24 s | Pod wodą: przelot nad górką, potem spad w głąb | „górka” 2,5 s, „spad” 2,5 s | Szukaj podwodnych górek i spadów dna, czyli miejsc, gdzie głębokość szybko się zmienia. | porada |
| 6 | 24–28 s | **Nowe:** zatopione drzewo z gałęziami (to samo co w hooku, inny kąt) | „zatopione drzewa” 2,5 s | Dobre są też zatopione drzewa i gałęzie. | porada |
| 7 | 28–35 s | Ławica drobnicy ucieka przy powierzchni, okoń atakuje w toni | „ławica drobnicy”, „okoń poluje w toni” po 2,5 s | Obserwuj ławice drobnicy. Jeśli drobne ryby uciekają przy powierzchni, okoń poluje w pobliżu! Latem często żeruje nie przy dnie, ale w toni. | plusk drobnicy; FishBase (drobnica jako pokarm) |
| 8 | 35–40 s | Rzeka: główka, za nią spokojna woda i okoń | „główka”, „okoń za główką” po 2,5 s | Na rzece szukaj spokojniejszej wody. Za główką nurt zwalnia i okoń czeka tam na pokarm. | szum rzeki; porada; Wikipedia EN (unika szybkiej wody) |
| 9 | 40–44 s | Filar mostu, okoń w zastoisku za filarem | „filar mostu”, „okoń przy filarze” po 2,5 s | Podobnie jest za filarami mostów. | porada |
| 10 | 44–49 s | Podmyty brzeg (jaskinia z korzeniami) i duży kamień | „podmyty brzeg”, „okoń w jaskini” po 2,5 s | Sprawdź podmyte brzegi i duże kamienie. | porada |
| 11 | 49–56 s | Linia nurtu, granica nurtu, karta „Prowadź przynętę…” | „główny nurt”, „granica nurtu” 2,5 s, karta 3,5 s | Najciekawsza jest granica szybkiego i wolnego nurtu. Prowadź tam przynętę tak, żeby przeszła przez stanowisko ryby. | porada |
| 12 | 56–72 s | Sprzęt: wędkarz na pomoście, kolejno wędka, kołowrotek, szpula plecionki, przypon, gumy, obrotówki i woblery (każdy element w zbliżeniu, potem w kolumnie) | każdy element ≥ 2,5 s | Do spinningu wybierz lekką wędkę o ciężarze wyrzutowym od dwóch do dziesięciu gramów, kołowrotek w rozmiarze od tysiąca do dwóch i pół tysiąca i cienką plecionkę z przyponem. Zacznij od gum od czterech do siedmiu centymetrów na główce jigowej. Przydadzą się też małe obrotówki i woblery. | korbka, „pop” |
| 13 | 72–83 s | Pod wodą nad górką: tor gumy (opad, podbicie, opad), okoń płynie za gumą | „1. opad”, „2. podbicie” ≥ 2,5 s, karta „Kontroluj linkę” 3 s | Zacznij od opadu. Pozwól gumie opaść, zrób jedno lub dwa krótkie podbicia i znów daj jej opadać. Kontroluj linkę, bo branie często przychodzi właśnie na opadzie. | porada |
| 14 | 83–87 s | Okoń atakuje na opadzie, guma znika w pysku | „Branie!” 2 s | Ciężar główki dobieraj do głębokości i nurtu, żeby przynęta pracowała naturalnie. | pop |
| 15 | 87–96 s | **Nowe – hol widoczny:** ujęcie pół na pół. U góry wędkarz z wygiętą wędką, pod wodą żyłka napięta do okonia, który szarpie i odjeżdża (hamulec), potem podchodzi pod pomost. Na koniec wędkarz wyjmuje okonia z wody | „Hol” 2,5 s, dymek „Jest!”, okoń w dłoni 2 s | Jest branie! Zatnij krótko i holuj spokojnie, bez szarpania. Hamulec ustaw tak, żeby oddawał linkę, gdy ryba mocno odjeżdża. | zacięcie, terkot hamulca ×2, plusk przy wyjęciu; porada |
| 16 | 96–107 s | Nie biorą: okoń odprowadza przynętę; mniejsza przynęta i atak; drop shot; spławik z robakiem | każda karta ≥ 2,5 s, „robak na spławiku” ≥ 2,5 s | Jeśli okonie tylko odprowadzają przynętę, zwolnij, wydłuż pauzę albo zmniejsz przynętę. Przy ostrożnych rybach spróbuj drop shota albo robaka na spławiku. | porada |
| 17 | 107–113 s | Stado okoni w łowisku (pod wodą) | „stado w łowisku” 2,5 s | I pamiętaj: jeśli złowisz jednego okonia, nie zmieniaj od razu miejsca. Okonie często trzymają się w grupach, więc obłów ten sam sektor jeszcze raz! | Wikipedia PL (młode w ławicach, starsze w grupach) |
| 18 | 113–119 s | Wędkarz wypuszcza okonia kawałek dalej („Do wody!”), okoń odpływa w drugą stronę niż stado | karta „Wypuść go kawałek dalej” 3,5 s | Rybę, którą wypuszczasz, puść kawałek dalej, a nie w łowisku. Spłoszony okoń może pociągnąć za sobą resztę stada. | plusk; porada (decyzja użytkownika) |
| 19 | 119–124 s | Okoń dołącza do innej grupy, napis końcowy | CTA 3,5 s | A ty wolisz gumy czy obrotówki? Napisz w komentarzu. | |

Tekst lektora v2 ma około 330 słów, czyli około 120–125 s po przyspieszeniu ×1,1 (v1: 280 słów, 105 s).

## 4. Co przyspieszyć, a co zwolnić (względem v1)
- **Zwolnić:** rzeka (z 12 s do około 21 s, po jednym zdaniu na miejsce), lista miejsc na jeziorze (z 5 s mówienia do około 26 s w 5 ujęciach), koniec sceny „nie biorą” (spławik).
- **Przyspieszyć lub wypełnić:** prowadzenie (5–6 s przestojów → dochodzi branie i hol w kadrze), zakończenie (przestój 5,4 s → stado, wypuszczenie, odpływający okoń), sprzęt po 12 s (zbliżenia przynęt zamiast stojącej kolumny).
- **Dodać:** hook z „błędem” (✗/✓), ujęcie pod pomostem, zatopione drzewo na jeziorze, widoczny hol i wyjęcie ryby.
- **Usunąć:** zdanie o ciężarze główki jako osobną kartę na końcu prowadzenia (lektor mówi je przy braniu).

## 5. Do decyzji użytkownika
1. Długość około 2 minut zamiast 108 s. Alternatywa: skrócić sprzęt do 10 s i połączyć ujęcia 9–10, wtedy około 110 s.
2. Nowy lektor według tekstu v2, czyli jedna generacja (około 2200 kredytów).
3. Modele 3D ryb i wędkarza zamiast kart 2D: styl i zakres (patrz pytania w czacie).
