# Jak łowić okonie? Gdzie i na jakie przynęty? (Atlas 3D, poradnik, makieta)

Format poradnikowy (decyzja użytkownika): nazwa gatunku pada w tytule i w hooku. Długość ok. 90 s (7 scen).
Silnik: `atlas3d/silnik.js`, film: `atlas3d/okon_jak.html`.
Makieta: `node atlas3d/render_makieta.mjs okon_jak` (11 kadrów + plansza).
Lektor (po akceptacji): „JA Paweł” (`bHIh6fgsLVytKSOdaWBi`), eleven_v4, jeden wariant, liczby słownie (jak niżej), przyspieszenie ×1,1.

Porady sprzętowe i techniczne to praktyka wędkarska. Użytkownik zaakceptował je bez źródeł, więc są oznaczone jako **porada**.
Fakty biologiczne mają źródła tam, gdzie się pojawiają.

| # | Czas | Obraz (makieta) | Tekst lektora (do ElevenLabs) | Typ / źródło |
|---|---|---|---|---|
| 1 | 0–5 s | Wędkarz na pomoście robi rzut, kamera schodzi pod wodę, okonie przy zatopionym drzewie, twister opada | Chcesz złowić okonia? Najpierw znajdź jego stanowisko, a dopiero potem dobieraj przynętę. Pokażę ci, gdzie szukać go na jeziorze i rzece oraz jak go łowić! | porada |
| 2 | 5–20 s | Przelot nad jeziorem (granica trzcin, pomost), zejście pod wodę: podwodna górka, spad, ławica drobnicy ucieka przy powierzchni, okoń w toni | Na jeziorze zacznij od granicy roślinności, podwodnych górek, spadów dna, pomostów i zatopionych drzew. Szukaj też ławic drobnicy. Jeżeli widzisz drobne ryby uciekające przy powierzchni, sprawdź tę okolicę! Pamiętaj, że okoń nie zawsze żeruje przy dnie: latem często poluje również w toni. | porada; drobnica jako pokarm: FishBase („feeds on fishes at about 12 cm SL”) |
| 3 | 20–34 s | Rzeka: główka, kamienie, filary mostu, podmyty brzeg, strzałki nurtu; okoń za główką na granicy nurtu | Na rzece szukaj spokojniejszych miejsc za główkami, przy kamieniach, filarach mostów i podmytych brzegach. Szczególnie interesujące są granice szybkiego i wolnego nurtu. Prowadź tam przynętę tak, żeby przechodziła przez stanowisko ryby. | porada; unika szybkiej wody: Wikipedia EN „European perch” |
| 4 | 34–49 s | Wędkarz na pomoście, kolejno wyskakują: wędka, kołowrotek, plecionka z przyponem, guma na główce (twister, ripper), obrotówka i wobler | Do klasycznego spinningu wybierz lekką wędkę o ciężarze wyrzutowym około dwóch do dziesięciu gramów, kołowrotek w rozmiarze od tysiąca do dwóch i pół tysiąca i cienką plecionkę z odpowiednio dobranym przyponem. Zacznij od gum o długości od czterech do siedmiu centymetrów na główce jigowej. Warto mieć też małe obrotówki i woblery. | porada |
| 5 | 49–70 s | Pod wodą nad górką: żółty tor gumy (opad, podbicie, opad), ripper go przechodzi, okoń płynie za nim i atakuje na ostatnim opadzie | Zacznij od opadu. Pozwól gumie opaść, wykonaj jedno lub dwa krótkie podbicia i ponownie daj jej opadać. Kontroluj linkę, bo branie często następuje właśnie podczas opadu. Możesz też prowadzić przynętę jednostajnie lub robić krótkie pauzy. Dobieraj ciężar główki do głębokości i nurtu: przynęta powinna pracować naturalnie, a ty musisz kontrolować jej położenie. | porada |
| 6 | 70–82 s | Okoń odprowadza twistera, wędkarz zdziwiony; potem drop shot na dnie i robak na spławiku | Jeżeli okonie odprowadzają przynętę, zwolnij, wydłuż pauzę albo zmniejsz jej rozmiar. Przy ostrożnych rybach spróbuj drop shota. Możesz też łowić na robaka metodą spławikową. | porada |
| 7 | 82–90 s | Wędkarz trzyma okonia i wypuszcza go do wody, kamera odjeżdża nad jezioro; napis końcowy | I pamiętaj: jeśli złowisz jednego okonia, nie zmieniaj od razu miejscówki. Obłów ponownie ten sam sektor! A ty wolisz łowić okonie na gumy czy obrotówki? | porada; młode okonie w ławicach, starsze w małych grupach: Wikipedia PL |

Napis końcowy: „Już wiesz, jak łowić okonie? Napisz swoją ulubioną przynętę!”

Tekst lektora ma ok. 280 słów, czyli ok. 90–95 s po przyspieszeniu ×1,1. Długości scen ustali transkrypcja, a napisy wejdą na słowa (`data-od`).

## Uwagi do obrazu
- Nazwy na ekranie (trzciny, górka, spad, pomost, ławica drobnicy, główka, filar mostu, podmyty brzeg, granica nurtu,
  opad, podbicie, drop shot, robak na spławiku) wchodzą w chwili, gdy lektor je wypowiada.
- Assety: `postacie.js` (okoń, płoć, wędkarz: rzut, hol, trzymanie ryby), `przynety.js` (twister, ripper, obrotówka,
  wobler), `sprzet.js` (wędka, kołowrotek, plecionka, przypon, drop shot, spławik z robakiem).
- Rekwizyty silnika: górka podwodna, zatopione drzewo, pomost, główka, most z filarami, podmyty brzeg, tor przynęty.

## Celowo pominięte
- Konkretne kolory przynęt i pory dnia: scenariusz ich nie podaje, a w tym filmie nie dokładamy nowych twierdzeń.
