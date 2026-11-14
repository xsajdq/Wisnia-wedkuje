# Research: co może podnieść jakość filmów Atlas 3D (13.11.2026)

Stan wyjściowy: three.js w Chromium (llvmpipe na Xvfb, ok. 0,7–1 s/klatka 720p), własny kompozyt z tuszem i wodą, render po scenach,
x264 crf 16, lektor ElevenLabs, SFX z biblioteki. Poniżej propozycje uporządkowane od największego zysku.

## A. Obraz

| # | Co | Zysk | Koszt | Uwagi |
|---|---|---|---|---|
| A1 | **Supersampling**: render w 1,5–2× rozdzielczości, zmniejszenie filtrem lanczos | gładkie linie tuszu, żyłka i zęby bez „schodków” | 2,2–4× dłuższy render | Kompozyt rysuje do własnych buforów (rtC, rtN, rtM) bez MSAA – `antialias: true` działa tylko na ostatnim płótnie. Przy nowym renderze nadal szybciej niż przed zmianą. |
| A2 | **Motion blur z akumulacji pod-klatek** tylko w szybkich chwilach (zryw, szybki przelot kamery) | zryw czytelny i „szybki” zamiast skoku między klatkami | 4–8 pod-klatek na klatkę w tych momentach | Technika z Unity HDRP / Blender Eevee: średnia z kilku chwil w obrębie migawki; dodatkowe drgnięcie kamery daje też antyaliasing. |
| A3 | **Głębia ostrości (DOF)** w zbliżeniach (paszcza, przynęta, sprzęt) | wygląd kinowy, prowadzi wzrok | mały | Rozmycie zależne od głębi – mamy już bufor głębi w kompozycie. |
| A4 | **Pod wodą: okno Snella** (patrząc w górę widać jasny krąg nieba, dalej odbicie dna), lepsze promienie (wolumetryczne), kaustyki rozmyte z głębią | realizm ujęć spod tafli | średni | Brak gotowca dla three.js – własny shader w kompozycie. |
| A5 | Format publikacji **1080×1920** (zamiast 720p) | IG/TikTok i tak kompresują; z 1080 zostaje więcej szczegółu | ok. 2,2× pikseli | Teraz realne czasowo. |

## B. Ruch

| # | Co | Zysk | Uwagi |
|---|---|---|---|
| B1 | **Kalibracja ataku do pomiarów**: szczupak przy żerowaniu osiąga średnio ok. **3,1 m/s** i przyspieszenie ok. **96 m/s²**, dystans ataku ok. **0,09–0,44 m** (Harper i Blake 1991, cyt. w pracy MIT) | prawdziwa prędkość, a nie „za szybko” | Nasz test: luka 0,55 m w 0,2 s ⇒ szczyt ok. 5,5 m/s względem przynęty – **za szybko i z za daleka**. Poprawka: luka ok. 0,3 m, zryw ok. 0,15–0,2 s. |
| B2 | **S-start**: przed zrywem ciało szczupaka wygina się w „S” (typ B – czeka już wygięty, typ A – wygina się w trakcie) | charakterystyczny, rozpoznawalny atak szczupaka | Dodać wygięcie ciała (mamy falę boczną w modelu – wystarczy kształt „S” na 0,1–0,2 s przed zrywem). |
| B3 | **Pływanie: fala biegnąca z obwiednią amplitudy** rosnącą w tylnej 1/3 ciała (carangiform), sztywna głowa (Lighthill, Gates 2001) | naturalne pływanie bez „machania całym ciałem” | Sprawdzić parametry naszej fali u szczupaka, okonia i drobnicy. |
| B4 | **Automatyczna kontrola płynności**: zapis pozycji i kierunku każdej postaci w każdej klatce, alarm przy skoku prędkości, zwrotu albo pozy | wyłapuje przeskoki, zanim zobaczy je widz | Wdraża zasadę „ruchy zawsze płynne” jako test, nie tylko oglądanie. |
| B5 | Theatre.js (edytor klatek kluczowych z osią czasu) | wygodna choreografia kamery | Wymaga edycji w przeglądarce (GUI) – mało przydatne przy pracy przez czat; **pomijam**. |

## C. Dźwięk

- **Synchronizacja efektów z akcją**: plusk/„chlap” przy zrywie, świst żyłki przy zacięciu, terkot hamulca w holu – przypinane do chwil `atak()` (ts, ts+0,15).
- **Dźwięk pod wodą**: gdy kamera jest pod taflą – filtr dolnoprzepustowy na tło i efekty (stłumienie), nad taflą – pełne pasmo. Prosty efekt, duża immersja.
- Muzyka nadal tylko z biblioteki platformy (zasada projektu).

## D. Napisy i montaż

- Napisy słowo po słowie (podświetlane) są popularne, ale dowody na lepszą retencję pochodzą głównie od firm sprzedających narzędzia; badanie akademickie (NCSU 2026) nie dotyczy napisów. **Propozycja: test A/B** na jednej rolce (napisy lektora słowo po słowie vs obecne karty).
- Narzędzia z pluginów: `remotion:remotion-captions` (napisy), `social-media-skills:ai-music-and-sound`, `thumbnail-design`, `youtube-publishing-and-metadata` – do wykorzystania przy publikacji.

## E. Kodowanie

- Platformy kodują każdy plik od nowa; dostarczać czysty materiał 1080×1920, H.264 crf 16–18, AAC 192k.
- `-tune animation` przetestować na jednej scenie (dla płaskiej grafiki pomaga, przy gradientach wody bywa gorzej) – porównać na telefonie po wgraniu.

## Rekomendowana kolejność wdrożenia
1. **B1 + B2** (atak zgodny z pomiarami, S-start) – szybkie, widoczne w filmie o szczupaku.
2. **A1 + A5** (supersampling, publikacja 1080p).
3. **A2** (motion blur w zrywie i przelotach), **C** (efekty przypięte do ataku, stłumienie pod wodą).
4. **B4** (automatyczna kontrola płynności), **A3** (DOF w zbliżeniach), **B3** (przegląd fali pływania).
5. **A4** (okno Snella), **D** (test napisów), **E** (test tune).

## Źródła
- Harper D. G., Blake R. W. (1991) Prey capture and the fast-start performance of northern pike, *J. Exp. Biol.* 155: 175–192 – https://cob.silverchair.com/jeb/article-pdf/155/1/175/2578620/jexbio_155_1_175.pdf
- The Mechanics of Fast-Start Performance of Pike Studied Using a Mechanical Fish (MIT) – https://libmast.utm.my/Record/mit-1721.1%2F120737/Description
- Schriefer J. E., Hale M. E. (2004) Strikes and startles of northern pike, *J. Exp. Biol.* 207: 535 – https://cob.silverchair.com/jeb/article/207/3/535/15301/Strikes-and-startles-of-northern-pike-Esox-lucius
- Gates (2001) UBC TR-2001-19, animacja ryb – https://www.cs.ubc.ca/sites/default/files/tr/2001/TR-2001-19_0.pdf
- Bainbridge, J. Exp. Biol. 40 – https://cob.silverchair.com/jeb/article-pdf/2206652/jexbio_40_1_23.pdf
- Unity HDRP – accumulation motion blur – https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@15.0/manual/Accumulation.html
- Blender Eevee – motion blur – https://docs.blender.org/manual/en/3.6/render/eevee/render_settings/motion_blur.html
- three.js TAARenderPass – https://threejs.org/docs/pages/TAARenderPass.html
- Theatre.js – https://www.theatrejs.com/docs/0.5/getting-started/with-three-js
- Caustics w WebGL (M. Heckel) – https://blog.maximeheckel.com/posts/caustics-in-webgl
- Moebius-style post-processing (M. Heckel) – https://blog.maximeheckel.com/posts/moebius-style-post-processing
- FFmpeg H.264 guide – https://fftrac-bg.ffmpeg.org/wiki/Encode/H.264
- NCSU 2026, short- vs long-form educational video – https://library.iated.org/view/MCKEOWN2026DES
- Blitzcut – animated vs static captions (opinia branżowa) – https://blitzcutai.com/blog/animated-captions-vs-static-captions
