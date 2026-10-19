# Biblioteka efektów dźwiękowych (SFX)

Wygenerowane w ElevenLabs Sound Effects (model `eleven_text_to_sound_v2`, flow „Atlas Ryb Polski – biblioteka efektów”).
To licencjonowane źródło polecane w pluginie ai-music-and-sound. Każdy efekt był wygenerowany raz i jest używany ponownie we wszystkich odcinkach.
Koszt: ok. 17 kredytów za efekt. Pliki w `surowe/` to oryginały. Pliki `.wav` są przycięte, z wygaszeniem i znormalizowane (ffmpeg loudnorm).

| Plik | Kiedy gra | Prompt |
|---|---|---|
| plusk.wav | start rolki (hook) | Fish jumping out of a lake, single crisp water splash |
| przejscie.wav | zmiana sceny | Fast airy whoosh swipe, short, clean, close-mic |
| pop.wav | wejście elementu „pop” (tagi, kropki, karty) | Single soft water bubble pop, short and round, close-mic |
| slizg.wav | wjazd elementu z boku lub z dołu (listy, karty) | Quick light paper card slide, soft swish, very short |
| licznik.wav | nabijanie liczby | Rapid soft mechanical clicks, like a counter ticking up, one second |
| dzwonek.wav | „Rekord Polski” | Bright short success chime, two clear bell tones |

Uwagi licencyjne: dźwięki są wygenerowane przez AI na płatnym planie ElevenLabs, więc można ich używać komercyjnie zgodnie z warunkami ElevenLabs.
Czysto AI-owe audio może nie podlegać ochronie prawnoautorskiej. Licencję warto trzymać w dokumentacji konta.

Mix (`atlas/render_wideo.mjs`):
- Lektor jest normalizowany do -15 LUFS.
- Efekty mają głośność `--sfx 0.22` (ok. -13 dB względem lektora), a `--sfx 0` je wyłącza.
- Na końcu jest limiter.
- Listę zdarzeń buduje `window.zdarzeniaAudio()` w `atlas/wideo.html`: typ wejścia elementu przypisany do dźwięku. Atrybut `data-dzwiek` nadpisuje dźwięk elementu.
