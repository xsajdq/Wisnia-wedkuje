# Gdzie łowić okonia? (Atlas 3D, makieta) – scenariusz lektora

Format: świat 3D (dioramy jeziora i rzeki z przekrojem, cieniowanie toon, czarny tusz), ryby i wędkarz jako płaskie karty 2D.
Styl i pipeline z `.claude/skills/cartoon-3d-short`. Silnik: `atlas3d/okon_gdzie.html`. Podgląd: `node atlas3d/render_makieta.mjs okon_gdzie`
(9 kadrów i plansza) oraz `... --animacja` (niemy podgląd ruchu, bez lektora).
Głos (po akceptacji makiety): „JA Paweł” (`bHIh6fgsLVytKSOdaWBi`), eleven_v4, jeden wariant. Ok. 150 słów, czyli ok. 55–60 s po przyspieszeniu ×1,1.

| # | Kadr | Tekst lektora | Źródło |
|---|---|---|---|
| 1 | Hook | Rzeka czy jezioro? Lato czy zima? Podpowiem ci, gdzie szukać tej ryby. | — |
| 2 | Karta | To okoń. Żyje i w wodach stojących, i w płynących, ale najliczniejszy jest w płytkich jeziorach z przejrzystą wodą. | wiki_pl (wody płynące i stojące), wiki_en (most abundant in shallow lakes with deep light penetration) |
| 3 | Jezioro | W jeziorze trzyma się zwykle trzech, czterech metrów głębokości, choć spotkasz go od metra aż do trzydziestu metrów. | fishbase (depth range 1–30 m, usually 3–4 m) |
| 4 | Rzeka | W rzece szukaj wolnego nurtu. Okoń unika zimnej i szybko płynącej wody. | wiki_en (slow-flowing rivers; avoids cold or fast-flowing waters) |
| 5 | Pora dnia | Najchętniej żeruje o wschodzie i o zachodzie słońca. | wiki_pl („Żeruje głównie o wschodzie i zachodzie słońca”), fishbase (preys mainly during sunrise and sunset) |
| 6 | Wiosna | Wiosną, od marca do czerwca, trze się na płyciznach. Ikrę w długich wstęgach przykleja do gałęzi, kamieni i roślin. | wiki_pl (tarło III–VI na płyciznach, wstęgi na kamieniach, gałęziach, roślinach) |
| 7 | Lato | Latem młode okonie podpływają bliżej brzegu i dna i trzymają się w ławicach. Duże sztuki chodzą w małych grupach albo samotnie. | wiki_en (juveniles nearer shore and bottom in first summer), wiki_pl (młode w ławicach, starsze w małych grupach lub samotnie) |
| 8 | Zima | Zimą okonia łowi się też spod lodu. Pod lodem najzimniejsza woda jest tuż pod taflą, a przy dnie ma około czterech stopni. | wiki_pl („łowiony … spod lodu”), fizyka: gęstość wody największa w ok. 4 °C (anomalia wody, Wikipedia „Woda”) |
| 9 | Przepisy + CTA | Przepisy państwowe nie dają okoniowi wymiaru ochronnego, ale na wodach PZW najczęściej obowiązuje dwadzieścia centymetrów. Zapisz i obserwuj Wiśnia Wędkuje. | rozp2023, pzw (`python3 narzedzia/pzw_typowy.py okon`: 20 cm, 11 okręgów, zakres 18–25 cm) |

## Źródła
- **fishbase**: FishBase, *Perca fluviatilis*: „depth range 1–30 m, usually 3–4 m”, „preys mainly during sunrise and sunset”, „lakes of all types to medium-sized streams”. https://www.fishbase.se/summary/Perca-fluviatilis.html
- **wiki_pl**: Wikipedia, Okoń pospolity (oldid 80309324): wody płynące i stojące; młode w ławicach, starsze w małych grupach lub samotnie; „Żeruje głównie o wschodzie i zachodzie słońca”; „Trze się od marca do czerwca na płyciznach”; ikra w długich wstęgach przyklejana do kamieni, zanurzonych gałęzi, roślin wodnych; „łowiony … spod lodu”. https://pl.wikipedia.org/wiki/Okoń_pospolity
- **wiki_en**: Wikipedia, European perch: „slow-flowing rivers, deep lakes and ponds. It tends to avoid cold or fast-flowing waters”; „most abundant in relatively shallow lakes and lakes with deep light penetration”; „Juveniles migrate to areas nearer the shore and bottom during their first summer”. https://en.wikipedia.org/wiki/European_perch
- **rozp2023**: Dz.U. 2023 poz. 1373: okonia nie ma na liście wymiarów ani okresów ochronnych.
- **pzw**: `data/przepisy_pzw.json` (regulaminy 11 okręgów).

## Celowo pominięte
- **„Zimą okoń schodzi na głębiny”**: popularne wśród wędkarzy, ale nie znalazłem tego w FishBase ani w Wikipedii. W rolce pada tylko fakt fizyczny (4 °C przy dnie) i to, że okonia łowi się spod lodu.
- **„Jesienią okonie zbijają się w duże stada”**: brak źródła, dlatego w rolce nie ma osobnej sceny jesiennej.
- **Miejsca w rzece (główki ostróg, filary mostów, cofki)**: wiedza wędkarska bez źródła z naszej listy. Zostaje ogólne „wolny nurt”.
- **„Okoń śpi w nocy przy dnie”** (wiki_pl): źródło słabe (czasopismo z 1974 r.), jak w odcinku 02.
- **Tarło: luty–lipiec** (FishBase, wiki_en) a **marzec–czerwiec** (wiki_pl): w rolce podaję zakres polski.
