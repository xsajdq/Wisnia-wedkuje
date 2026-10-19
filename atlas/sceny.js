// Budowa scen rolki „Atlas Ryb Polski”. Wspólne dla podglądu klatek (szablon.html) i wideo (wideo.html).
// Dane wstrzykuje render: window.GATUNEK, window.REKORDY, window.ZDJECIA, window.PROFIL, window.ROK.
//
// Atrybuty animacji (używa ich tylko wideo.html, w podglądzie elementy są w stanie końcowym):
//   data-a="dol|pop|lewo|prawo|fade"  rodzaj wejścia
//   data-d="0.4"                      opóźnienie wejścia od początku sceny [s]
//   data-przy="kaczy"                 wejście w chwili, gdy lektor mówi słowo zaczynające się od „kaczy”
//   data-licz                         liczba w elemencie „nabija się” od zera
window.zbudujSceny = function () {
  const G = window.GATUNEK, R = window.REKORDY.rekordy[G.rekord], ZD = window.ZDJECIA, P = window.PROFIL;
  const ROK = window.ROK || new Date().getFullYear();
  const zr = (ids) => 'Źródło: ' + ids.map(i => G.zrodla[i]).join(' · ');
  const N = 9;
  const pasek = (i) => `
    <div class="progress">${Array.from({length: N}, (_, j) => `<i class="${j < i ? 'on' : j === i ? 'on teraz' : ''}"><b></b></i>`).join('')}</div>
    <div class="badge">ATLAS RYB POLSKI <span class="nr">#${String(G.nr).padStart(2, '0')}</span></div>
    <div class="handle">@${P}</div>`;
  const kg = (v) => v.toFixed(2).replace('.', ',');
  const cm = (v) => Number.isInteger(v) ? v : String(v).replace('.', ',');
  const src = (p) => `../assets/${p}`;

  // Ryba zawsze w całości: skaluje zdjęcie tak, by ramka ryby (bbox) zmieściła się w obszarze `o`
  // ({x, y, w, h} w px rodzica). Opcje: wycinek (sama ryba bez tła), tlo: false (bez rozmytego tła),
  // punkty (współrzędne w px oryginału → numerowane kropki, z wejściem przy słowach `przy`), margines.
  function ryba(scena, o, opt = {}) {
    const cfg = G.zdjecia[scena], Z = ZD[cfg.nazwa], L = !!cfg.lustro;
    const [x0, y0, x1, y1] = Z.bbox, bw = x1 - x0, bh = y1 - y0, m = opt.margines ?? 0.04;
    const s = Math.min(o.w * (1 - 2 * m) / bw, o.h * (1 - 2 * m) / bh);
    const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
    const bcx = L ? Z.w - (x0 + bw / 2) : x0 + bw / 2;
    const left = cx - bcx * s, top = cy - (y0 + bh / 2) * s;
    // punkt zaczepienia „Ken Burns” = środek ryby
    const origin = `transform-origin:${cx}px ${cy}px`;
    let h = opt.tlo === false ? '' : `<img class="tlo ${L ? 'lustro' : ''}" src="${src(Z.plik)}">`;
    if (opt.wycinek)
      h += `<div class="kb" style="${origin}"><img class="wyc ${L ? 'lustro' : ''}" src="${src(Z.wycinek)}" style="left:${cx - bw * s / 2}px;top:${cy - bh * s / 2}px;width:${bw * s}px"></div>`;
    else
      h += `<div class="kb" style="${origin}"><img class="foto ${L ? 'lustro' : ''}" src="${src(Z.plik)}" style="left:${left}px;top:${top}px;width:${Z.w * s}px"></div>`;
    (opt.punkty || []).forEach((p, i) => {
      const px = L ? left + (Z.w - p[0]) * s : left + p[0] * s;
      h += `<div class="dot" data-a="pop" ${opt.przy?.[i] ? `data-przy="${opt.przy[i]}"` : `data-d="${0.3 + i * 0.4}"`} style="left:${px}px;top:${top + p[1] * s}px">${i + 1}</div>`;
    });
    return `<div class="warstwa">${h}</div>`;
  }
  const fot = (scena, y) => { const Z = ZD[G.zdjecia[scena].nazwa]; return `<div class="fot" style="top:${y}px">fot. ${Z.autor}, ${Z.licencja}</div>`; };
  const tlo = (scena, f = '') => { const Z = ZD[G.zdjecia[scena].nazwa]; return `<div class="warstwa"><div class="kb" style="transform-origin:50% 50%"><img class="tlo" src="${src(Z.plik)}" style="${f}"></div></div>`; };

  // Obszar na rybę: pod górnym paskiem, z dala od prawej kolumny przycisków IG/TikTok
  const SZER = { x: 40, w: 900 };
  const przyRozp = G.rozpoznanie.map(r => r.przy);
  const PZW = G.przepisy.pzw;
  const RP = G.rekord_przy || { masa: '', dlugosc: '', kto: '' };
  const wiekRek = ROK - Number(R.masa.rok);
  const opisRek = wiekRek >= 10 ? ` – niepobity od ${wiekRek} lat` : wiekRek <= 1 ? ' – świeży rekord!' : '';

  return [
    // 1. hook – cała ryba u góry, tekst pod nią
    () => `${ryba('hook', { ...SZER, y: 230, h: 640 }, { margines: 0.02 })}<div class="shade"></div>${pasek(0)}
      <div class="hook" data-a="pop" data-d="0.05">${G.hook.tekst}<br><span class="hl">${G.hook.wyroznienie}</span></div>${fot('hook', 1230)}`,
    // 2. karta gatunku
    () => `${tlo('karta')}${pasek(1)}
      <div class="karta" data-a="prawo" data-d="0"><div class="pic">${ryba('karta', { x: 0, y: 0, w: 1020, h: 560 }, { margines: 0.03 })}</div>
        <div class="nm">${G.nazwa}</div><div class="lat">${G.lacina}</div>
        <div class="tags">${G.tagi.map((t, i) => `<span class="tag" data-a="pop" data-d="${0.5 + i * 0.25}">${t}</span>`).join('')}</div></div>${fot('karta', 1190)}`,
    // 3. rozpoznanie – cała ryba z boku, kropki na cechach
    () => `${ryba('rozpoznanie', { ...SZER, y: 240, h: 460 }, { punkty: G.rozpoznanie.map(r => r.px), przy: przyRozp, margines: 0.06 })}${pasek(2)}
      <h2 class="tytul" style="top:730px" data-a="lewo" data-d="0">Jak go <span>rozpoznać?</span></h2>
      <ol class="lista" style="top:850px">${G.rozpoznanie.map((r, i) => `<li data-a="lewo" ${r.przy ? `data-przy="${r.przy}"` : `data-d="${0.3 + i * 0.4}"`}><span class="n">${i + 1}</span><span>${r.tekst}</span></li>`).join('')}</ol>
      ${fot('rozpoznanie', 690)}`,
    // 4. rozmiary
    () => `${ryba('rozmiary', { ...SZER, y: 240, h: 450 }, { margines: 0.03 })}${pasek(3)}
      <div class="liczby">${G.rozmiary.map((r, i) => `<div class="liczba" data-a="lewo" ${r.przy ? `data-przy="${r.przy}"` : `data-d="${0.2 + i * 0.5}"`}><div class="val"><span data-licz>${r.wartosc}</span><small>${r.jednostka}</small></div>
        <div><div class="lbl">${r.etykieta}</div><div class="op">${r.opis}</div></div></div>`).join('')}</div>
      <div class="zrodlo">${zr(['fishbase'])}</div>${fot('rozmiary', 700)}`,
    // 5. występowanie
    () => `${tlo('tlo')}${pasek(4)}
      <div class="gdzie"><h2 data-a="lewo" data-d="0">${G.wystepowanie.tytul.replace(/(\S+)\?$/, '<span>$1?</span>')}</h2>
        ${G.wystepowanie.miejsca.map((m, i) => `<div class="chip" data-a="prawo" ${m.przy ? `data-przy="${m.przy}"` : `data-d="${0.3 + i * 0.4}"`}><div class="ic">${m.ikona}</div>${m.tekst}</div>`).join('')}</div>
      <div class="zrodlo">${zr(G.wystepowanie.zrodla)}</div>`,
    // 6. ciekawostka
    () => `${ryba('ciekawostka', { ...SZER, y: 240, h: 520 }, { margines: 0.04 })}${pasek(5)}
      <div class="ciek" data-a="pop" data-d="0.1"><div class="k"><i>🤯</i>${G.ciekawostka.naglowek}</div><p>${G.ciekawostka.tekst}</p></div>
      <div class="zrodlo">${zr(G.ciekawostka.zrodla)}</div>`,
    // 7. rekord Polski
    () => `${ryba('rekord', { ...SZER, y: 240, h: 480 }, { wycinek: true, margines: 0.02 })}${pasek(6)}
      <div class="rekord"><h2 data-a="pop" data-d="0.25" data-dzwiek="dzwonek">🏆 Rekord <span>Polski</span></h2>
        <div class="rek-box"><div class="rek" data-a="dol" data-przy="${RP.masa}"><div class="k">masa</div><div class="v"><span data-licz>${kg(R.masa.kg)}</span><small>kg</small></div></div>
          <div class="rek" data-a="dol" data-przy="${RP.dlugosc}"><div class="k">długość</div><div class="v"><span data-licz>${cm(R.dlugosc.cm)}</span><small>cm</small></div></div></div>
        <div class="rek-kto" data-a="dol" data-przy="${RP.kto}">${R.masa.rekordzista}<span>rok ${R.masa.rok}${opisRek}${R.dlugosc.rekordzista !== R.masa.rekordzista ? ` · długość: ${R.dlugosc.rekordzista} (${R.dlugosc.rok})` : ''}</span></div></div>
      <div class="zrodlo">${zr(['ww'])} · na zdjęciu inny okaz</div>`,
    // 8. przepisy
    () => `${tlo('tlo', 'filter:blur(30px) brightness(.4)')}${pasek(7)}
      <div class="prz"><h2 data-a="lewo" data-d="0">Zanim <span>zabierzesz</span></h2>
        <div class="karta-p" data-a="prawo" data-przy="wymiar"><div class="ic">📏</div><div><div class="k">${PZW ? 'wymiar państwowy' : 'wymiar ochronny'}</div><div class="v">${G.przepisy.wymiar}</div></div></div>
        <div class="karta-p" data-a="prawo" data-przy="okres"><div class="ic">🚫</div><div><div class="k">okres ochronny</div><div class="v">${G.przepisy.okres}</div></div></div>
        ${PZW ? `<div class="karta-p pzw" data-a="prawo" data-przy="${PZW.przy || 'pzw'}"><div class="ic">🎣</div><div><div class="k">na wodach PZW najczęściej</div><div class="v">${PZW.wymiar}</div>
          <div class="op">${PZW.zakres[0] === PZW.zakres[1] ? '' : `w okręgach od ${PZW.zakres[0]} do ${PZW.zakres[1]} cm`}${PZW.gorny ? ` · często też górny limit ${PZW.gorny}` : ''}${PZW.okres ? ` · okres ochronny często ${PZW.okres}` : ''} · ${PZW.n} okręgów</div></div></div>` : ''}
        <div class="uwaga" data-a="dol" data-przy="${PZW ? (PZW.przy_uwaga || 'sprawdź') : 'pzw'}">${G.przepisy.dopisek}</div></div>
      <div class="zrodlo">${zr(G.przepisy.zrodla)}${PZW ? ` · regulaminy ${PZW.n} okręgów PZW (2023–2026)` : ''}</div>`,
    // 9. CTA
    () => `${ryba('cta', { ...SZER, y: 240, h: 480 }, { wycinek: true, margines: 0.03 })}${pasek(8)}
      <div class="cta"><h2 data-a="pop" data-d="0">Zapisz <span>atlas</span><br>i obserwuj</h2>
        <div class="btn" data-a="pop" data-przy="obserwuj">@${P}</div>
        <div class="next" data-a="dol" data-przy="następny">Następny gatunek: <b>${G.nastepny}</b></div>
        <div class="row" data-a="dol" data-d="2.2"><span class="pill">🔖 Zapisz</span><span class="pill">💬 Twój rekord?</span></div></div>`,
  ].map((s, i) => `<section class="frame" id="${String(i + 1).padStart(2, '0')}">${s()}</section>`);
};
