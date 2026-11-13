# Rybia Nauka #01: Dlaczego ryba z głębi wypływa z żołądkiem w pysku? (barotrauma)

Dane do renderu: `data/nauka/barotrauma.json` · makieta: `node nauka/render.mjs barotrauma` + `python3 atlas/plansza.py nauka/out/barotrauma`
Research: `research_notes/Barotrauma i pęcherz pławny/` (anatomia_fizyka.md, barotrauma_okon_sandacz.md)

Ok. 240 słów, przewidywane ok. 75 s (lektor ×1,1).

## Tekst lektora

| # | Scena | Lektor | Źródło |
|---|---|---|---|
| 1 | Hook | Wyciągasz rybę z dwunastu metrów. Oczy na wierzchu, a z pyska wychodzi jej… żołądek. Co tu się stało? | objawy: ND Game & Fish 2021; Madden i in. 2024 |
| 2 | Pęcherz pławny | Winowajca siedzi w środku ryby. To pęcherz pławny – worek z gazem, dzięki któremu ryba unosi się w toni bez wysiłku. | ZPE (gov.pl); Wikipedia: Swim bladder |
| 3 | Fizyka | Każde dziesięć metrów wody to dodatkowa atmosfera ciśnienia. Wyciągnij rybę z dziesięciu metrów, a gaz w pęcherzu rozpręży się dwa razy. Z dwudziestu – prawie trzy razy. Najmocniej rośnie przy samej powierzchni. | 10 m ≈ 0,98 bar (ND G&F); prawo Boyle'a: 2,0× z 10 m, 2,9× z 20 m; 20→10 m tylko 1,5× (wyliczenie) |
| 4 | Ryby z „wentylem” | Karp, szczupak czy pstrąg mają na to wentyl. Ich pęcherz łączy przewód z przełykiem, więc nadmiar gazu mogą wypuścić. Barotrauma grozi im mniej – choć z dużej głębi też. | ZPE (karpiowate: przewód do przełyku); Wikipedia: Physostome (karpie, pstrągi); ND G&F (fizostomy oddają gaz w czasie holu; szczupak „nie cierpi na barotraumę tak jak sandacz i okoń”); Webster 1983 (szczupak – fizostom); fizostomy też mogą mieć barotraumę: PNNL 2007 (łosoś), Maine IFW (pstrąg jeziorowy z >9 m) |
| 5 | Ryby bez „wentyla” | Sandacz, okoń i miętus takiego przewodu nie mają. Gaz oddają powoli, przez krew. Okoń bez kłopotu znosi spadek ciśnienia o jedną szóstą. Wyciągnięty z dziesięciu metrów dostaje spadek o połowę. | IRŚ Instrukcja 13-RD-2023 (okoniowate – zamkniętopęcherzowe); Aquaculture Int. 2013 (miętus: przewód zarasta u larw); Pelster 2015 (gaz przez krew, wolno); Harden Jones 1952, J Exp Biol 29:94 (okoń: 16% spadku ciśnienia); 10 m→0: 2 atm→1 atm = −50% (wyliczenie) |
| 6 | Objawy | Rozdęty pęcherz wypycha żołądek przez pysk. Oczy wychodzą na wierzch. Brzuch puchnie, a ryba nie może zejść w dół. Groźne są też urazy, których nie widać: krwotoki i pęcherzyki gazu we krwi. Mogą zabić rybę później, nawet jeśli odpłynie. | Madden i in. 2024 (objawy widoczne i niewidoczne, potencjalnie śmiertelne); ND G&F 2021 (urazy wewnętrzne zabijają z opóźnieniem, nawet gdy ryba wygląda dobrze) |
| 7 | Ile metrów? | Ile metrów to za dużo? U amerykańskiego kuzyna sandacza objawy pojawiają się zwykle od sześciu, siedmiu metrów, a od około dziesięciu ryzyko gwałtownie rośnie. Z ryb, które unoszą się na powierzchni, przeżywa najwyżej co druga. | Madden i in. 2024, Can. J. Fish. Aquat. Sci. 81:212 (przegląd: notowane już od 3 m, najczęściej od 6–7 m, ostry wzrost ok. 9–10 m; Schreer 2009: pierwsze objawy przy 6,1 m – abstrakt; ryba na powierzchni ≤50% szans); Eberts i in. 2018 (do ok. 50% nieleczonych walleye ginie) |
| 8 | Co robić | Co z tego wynika? Sandacza i okonia, które chcesz wypuścić, łów płycej. Nie przekłuwaj pęcherza na własną rękę. A wymiarową rybę z objawami lepiej zabrać, niż wypuścić z barotraumą. Zawsze sprawdź swoje zezwolenie. | Madden 2024 i Eberts 2018 (najlepsza profilaktyka: nie łowić no-kill z głębi); ND G&F, agencje Ontario/Waszyngton (odradzają nakłuwanie amatorom); NY Sea Grant (rybę z objawami zatrzymać) |
| 9 | CTA | Skoro ryba tak mocno czuje każdy metr wody… czy spadek ciśnienia przed frontem naprawdę psuje brania? Sprawdzimy w następnym odcinku. Obserwuj, żeby go nie przegapić. | zapowiedź odc. 2 (bez tezy) |

Linki do źródeł: pole `linki` w `data/nauka/barotrauma.json`.

## Pewność źródeł (stan po weryfikacji)

- **Pełny tekst przeczytany:** Madden i in. 2024 (progi głębokości z przeglądu, ≤50% przeżycia ryby na powierzchni, objawy), ND Game & Fish 2021, IRŚ 13-RD-2023, ZPE, Pelster 2015.
- **Tylko abstrakt / streszczenie:** Harden Jones 1952 (próg ⅙ dla okonia – pełny tekst płatny), Eberts i in. 2018 (do ok. 50% nieleczonych ginie), Schreer i in. 2009 (pierwsze objawy przy 6,1 m). Wnioski użyte ogólnie, bez szczegółowych liczb.
- **Wyliczenia własne (fizyka):** ×2 z 10 m, ×2,9 z 20 m, „spadek o połowę” z 10 m (prawo Boyle'a, 10 m wody ≈ 0,98 bar).
- **Miętus jako fizoklista:** przewód zarasta u larw (Aquaculture Int. 2013 – pewne), przynależność dorosłych do fizoklistów wg IISD – prawdopodobne.
- **Wszystkie liczby śmiertelności dotyczą ryb z Ameryki Płn.** (walleye, yellow perch). Polskich ani europejskich badań barotraumy sandacza i okonia nie znaleziono – lektor mówi to wprost („amerykański kuzyn sandacza”).

## Celowo pominięte

- **„Krytyczne 8 m” (Österreichs Fischerei)**: PDF niedostępny, brak autora i metody.
- **„95% okoni z 18 m ginie” (jezioro Erie)**: tylko artykuł prasowy.
- **„20% martwych z 12 m, 35% z 15 m” (Talmage & Staples 2011)**: liczby tylko z niemieckiej strony wędkarskiej.
- **Descender (zapuszczacz)**: metaanaliza Eberts & Somers 2017 nie wskazuje zwycięzcy, a Madden 2024 pokazał duże problemy (ryby wracają na powierzchnię albo leżą brzuchem do góry). W Polsce urządzenie mało znane – temat na osobny odcinek.
- **Instrukcja nakłuwania pęcherza**: tylko dla przeszkolonych; nie uczymy tego w rolce.
- **„Wolny hol pomaga”**: brak dowodów (Madden 2024: brak związku czasu holu z objawami).
- **Sum, lipień, jazgarz jako fizostomy/fizoklisty**: przypisanie tylko z rodziny, brak źródła dla gatunku.
- **Ile godzin sandacz/okoń wyrównuje pęcherz**: brak liczby (Pelster 2015: pełne napełnienie zwykle 1–2 dni – ogólnie, nie dla okonia).
- **Pęcherz to „7% objętości ciała”**: źródło forumowe.
- **Polskie dane o barotraumie sandacza/okonia**: nie znaleziono żadnych – stąd „amerykański kuzyn sandacza” w lektorze.

## Do opisu posta (rozwinięcie)

- Miętusy wyciągane prosto z ponad 10 m: 22% padło, przy jednym przystanku dekompresyjnym 6%; co piąty z wywiniętym żołądkiem (Neufeld & Spence, AFS).
- Najgłębsze polskie jeziora: Hańcza ok. 108 m, Drawsko ok. 80 m, Wigry ok. 73 m.
- Gaz w pęcherzu ryby zamkniętopęcherzowej dostarcza gruczoł gazowy i „cudowna sieć” naczyń (rete mirabile).
