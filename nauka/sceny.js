// Budowa scen serii „Rybia nauka”. Dane odcinka: window.ODC (data/nauka/<odcinek>.json),
// zdjęcia: window.ZDJECIA (data/zdjecia.json), window.PROFIL.
// Atrybuty animacji jak w Atlasie (data-a, data-d, data-przy, data-licz) – w makiecie elementy są w stanie końcowym.
window.zbudujSceny = function () {
  const O = window.ODC, ZD = window.ZDJECIA, P = window.PROFIL, S = O.sceny;
  const N = S.length;
  const src = (p) => `../assets/${p}`;
  const zr = (ids) => ids?.length ? `<div class="zrodlo"${''}>Źródło: ${ids.map(i => O.zrodla[i]).join(' · ')}</div>` : '';
  const pasek = (i) => `
    <div class="progress">${Array.from({length: N}, (_, j) => `<i class="${j < i ? 'on' : j === i ? 'on teraz' : ''}"><b></b></i>`).join('')}</div>
    <div class="badge">${O.seria} <span class="nr">#${String(O.nr).padStart(2, '0')}</span></div>
    <div class="handle">@${P}</div>`;
  const wej = (przy, d) => przy ? `data-przy="${przy}"` : `data-d="${d ?? 0}"`;

  // Ryba (wycinek) w obszarze o = {x,y,w,h}; nakładka SVG w pikselach wycinka.
  // A = anatomia z ODC.anatomia[nazwa]: punkty jako ułamki szerokości/wysokości wycinka.
  function rtg(nazwa, o, opt = {}) {
    const Z = ZD[nazwa], A = O.anatomia[nazwa] || {};
    const [x0, y0, x1, y1] = Z.bbox, cw = x1 - x0, ch = y1 - y0;
    const s = Math.min(o.w / cw, o.h / ch), w = cw * s, h = ch * s;
    const L = o.x + (o.w - w) / 2, T = o.y + (o.h - h) / 2;
    const px = (p) => [p[0] * cw, p[1] * ch];
    const k = 1 / s; // grubości linii w px ekranu
    let svg = '';
    const defs = `<defs>
      <radialGradient id="g-${nazwa}" cx="40%" cy="35%"><stop offset="0" stop-color="#fff6b0"/><stop offset=".45" stop-color="#ffd400"/><stop offset="1" stop-color="#e0a800"/></radialGradient>
      <filter id="f-${nazwa}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${14 * k}"/></filter></defs>`;
    if (opt.pecherz && A.pecherz) { // jedna komora albo lista komór (karpiowate: dwie)
      const sk = opt.pecherz === true ? 1 : opt.pecherz;
      svg += `<g data-a="pop" ${wej(opt.przyPecherz, 0.3)}>` + [].concat(A.pecherz).map(b => {
        const [cx, cy] = px([b.cx, b.cy]), rx = b.rx * cw * sk, ry = b.ry * ch * sk;
        return `<g transform="rotate(${b.rot || 0} ${cx} ${cy})">
        <ellipse cx="${cx}" cy="${cy}" rx="${rx * 1.15}" ry="${ry * 1.5}" fill="#ffd400" opacity=".55" filter="url(#f-${nazwa})"/>
        <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#g-${nazwa})" stroke="#111" stroke-width="${4 * k}"/>
        <ellipse cx="${cx - rx * .35}" cy="${cy - ry * .35}" rx="${rx * .35}" ry="${ry * .22}" fill="#fff" opacity=".55"/></g>`; }).join('') + `</g>`;
    }
    if (opt.przewod && A.przewod) {
      const pts = A.przewod.map(px);
      const d = `M${pts[0]} Q${pts[1]} ${pts[2]}`;
      const kol = opt.przewod === 'brak' ? '#e0263b' : '#3ddc84';
      svg += `<g data-a="fade" ${wej(opt.przyPrzewod, 0.6)}><path d="${d}" fill="none" stroke="#111" stroke-width="${22 * k}" stroke-linecap="round"/>
        <path d="${d}" fill="none" stroke="${kol}" stroke-width="${13 * k}" stroke-linecap="round" ${opt.przewod === 'brak' ? `stroke-dasharray="${18 * k} ${16 * k}"` : ''}/></g>`;
      if (opt.przewod === 'brak') {
        const [mx, my] = pts[1], r = 34 * k;
        svg += `<g data-a="pop" ${wej(opt.przyKrzyz, 0.9)}><circle cx="${mx}" cy="${my}" r="${r * 1.5}" fill="#e0263b" stroke="#fff" stroke-width="${6 * k}"/>
          <path d="M${mx - r * .6} ${my - r * .6}L${mx + r * .6} ${my + r * .6}M${mx + r * .6} ${my - r * .6}L${mx - r * .6} ${my + r * .6}" stroke="#fff" stroke-width="${12 * k}" stroke-linecap="round"/></g>`;
      }
    }
    if (opt.babelki && A.pysk) {
      const [mx, my] = px(A.pysk), dir = A.pysk[0] < .5 ? -1 : 1;
      svg += `<g data-a="dol" ${wej(opt.przyBabelki, 1)}>${[[10, -10, 14], [50, -55, 20], [30, -115, 16], [80, -160, 24]].map(([dx, dy, r]) =>
        `<circle cx="${mx + dir * dx * k}" cy="${my + dy * k}" r="${r * k}" fill="rgba(200,245,255,.35)" stroke="#e8fbff" stroke-width="${4 * k}"/>`).join('')}</g>`;
    }
    if (opt.siec && A.pecherz) { // sieć naczyń (gruczoł gazowy) pod pęcherzem
      const b = [].concat(A.pecherz)[0], [cx, cy] = px([b.cx - b.rx * .45, b.cy + b.ry * .9]);
      let p = '';
      for (let i = 0; i < 7; i++) p += `<path d="M${cx - 60 * k + i * 20 * k} ${cy + 60 * k} C ${cx - 40 * k + i * 12 * k} ${cy + 20 * k}, ${cx - 30 * k + i * 10 * k} ${cy + 10 * k}, ${cx - 20 * k + i * 8 * k} ${cy - 6 * k}" stroke="${i % 2 ? '#ff5a6e' : '#7aa8ff'}" stroke-width="${6 * k}" fill="none"/>`;
      svg += `<g data-a="fade" ${wej(opt.przySiec, 1.2)}>${p}</g>`;
    }
    (opt.etykiety || []).forEach((e) => {
      const [x, y] = px(e.p);
      svg += `<g data-a="pop" ${wej(e.przy, e.d)}><text class="lbl-svg" x="${x + (e.dx || 0) * k}" y="${y + (e.dy || 0) * k}" text-anchor="${e.anchor || 'middle'}" style="font-size:${(e.r || 34) * k}px;stroke-width:${10 * k}px">${e.t}</text></g>`;
    });
    (opt.kropki || []).forEach((e, i) => {
      const [x, y] = px(e.p), r = 40 * k;
      svg += `<g data-a="pop" ${wej(e.przy, 0.3 + i * .3)}><circle cx="${x}" cy="${y}" r="${r * 1.35}" fill="rgba(255,212,0,.35)"/><circle cx="${x}" cy="${y}" r="${r}" fill="${e.kolor || '#ffd400'}" stroke="#111" stroke-width="${6 * k}"/>
        <text x="${x}" y="${y + 16 * k}" text-anchor="middle" style="font:400 ${46 * k}px Anton" fill="${e.kolor ? '#fff' : '#111'}">${i + 1}</text></g>`;
    });
    const fot = opt.fot === false ? '' : `<div class="fot" style="top:${T + h + 6}px;right:${1080 - L - w + 10}px">fot. ${Z.autor}, ${Z.licencja}</div>`;
    return `<div class="rtg ${opt.klasa || ''}" data-a="${opt.a || 'fade'}" data-d="0" style="left:${L}px;top:${T}px;width:${w}px;height:${h}px;${opt.styl || ''}">
      <img src="${src(Z.wycinek)}" style="${A.lustro ? 'transform:scaleX(-1)' : ''}">
      <svg viewBox="0 0 ${cw} ${ch}" ${A.lustro ? 'style="transform:scaleX(-1)"' : ''}>${defs}${svg}</svg></div>${fot}`;
  }

  const sceny = {
    hook: (c, i) => `${pasek(i)}
      <div class="powierzchnia" style="top:300px"></div>
      <div class="skala" style="top:300px;height:640px">${[0, 3, 6, 9, 12].map(m => `<div class="kr" style="top:${m / 12 * 640}px"><span>${m}&nbsp;m</span><i></i></div>`).join('')}<div class="os"></div></div>
      <div class="strz" style="left:560px;top:560px;height:380px;opacity:.6" data-a="fade" data-d="0"></div>
      <div class="kr-dno" style="top:940px">START</div>
      ${rtg(c.ryba, { x: 190, y: 330, w: 760, h: 280 }, { klasa: 'sylwetka', pecherz: c.pecherz || 1.6, fot: false, a: 'dol' })}
      <div class="hookn" style="top:1000px" data-a="pop" data-d="0.05"><span class="hk">${c.tekst}</span><br><span class="hl">${c.wyroznienie}</span></div>`,

    pecherz: (c, i) => `${pasek(i)}
      <h2 class="tyt" style="top:240px" data-a="lewo" data-d="0">${c.tytul}</h2>
      <div class="pod" style="top:${c.podTop || 470}px" data-a="lewo" ${wej(c.przyPod, .3)}>${c.pod}</div>
      ${rtg(c.ryba, { x: 50, y: 620, w: 880, h: 560 }, { klasa: 'przeswietl', pecherz: true, przyPecherz: c.przyPecherz, etykiety: c.etykiety })}
      ${zr(c.zrodla)}`,

    fizyka: (c, i) => {
      const y0 = 560, dy = 260; // 0 m, 10 m, 20 m
      const row = (m, k) => `<div class="atm" style="top:${y0 + k * dy}px" data-a="lewo" data-d="${.2 + k * .2}"><div class="gl">${m} m</div><div class="li"></div><div class="cis">${k + 1} atm</div></div>`;
      const kol = (x, gl, mn, przy) => { const k = gl / 10, r0 = 34, r1 = r0 * Math.sqrt(k + 1);
        return `<div class="balon" style="left:${x}px;top:${y0 + k * dy}px;width:${2 * r0}px;height:${2 * r0}px" data-a="pop" data-d=".4"></div>
          <div class="strz" style="left:${x}px;top:${y0 + 60}px;height:${k * dy - 110}px" data-a="fade" ${wej(przy)}></div>
          <div class="balon" style="left:${x}px;top:${y0}px;width:${2 * r1}px;height:${2 * r1}px" data-a="pop" ${wej(przy)}></div>
          <div class="mnoz" style="left:${x}px;top:${y0 - r1 - 70}px" data-a="pop" ${wej(przy)}>${mn}</div>
          <div class="kol-podpis" style="left:${x}px;top:${y0 + k * dy + 46}px" data-a="fade" ${wej(przy)}>z ${gl} m</div>`; };
      return `${pasek(i)}
        <h2 class="tyt" style="top:220px" data-a="lewo" data-d="0">${c.tytul}</h2>
        <div class="powierzchnia bez" style="top:${y0 - 2}px"></div>
        ${[0, 10, 20].map(row).join('')}
        ${kol(430, 10, '×2', c.przy2)}${kol(660, 20, '×3', c.przy3)}
        <div class="pod" style="top:1170px" data-a="dol" ${wej(c.przyPod, 1)}>${c.pod}</div>
        ${zr(c.zrodla)}`; },

    typ: (c, i) => `${pasek(i)}
      ${rtg(c.ryba, { x: 30, y: 290, w: 920, h: 460 }, { klasa: 'przeswietl', pecherz: true, przewod: c.przewod, babelki: c.babelki, siec: c.siec,
          przyPrzewod: c.przyPrzewod, przyKrzyz: c.przyKrzyz, przyBabelki: c.przyBabelki, przySiec: c.przySiec, etykiety: c.etykiety })}
      <div class="typ ${c.przewod === 'brak' ? 'zle' : 'ok'}" style="top:830px" data-a="prawo" ${wej(c.przyKarta, .2)}>
        <div class="k">${c.k}</div><div class="v">${c.v}</div><div class="op">${c.op}</div>
        <div class="gat">${c.gatunki.map(g => `<span>${g}</span>`).join('')}</div></div>
      ${zr(c.zrodla)}`,

    objawy: (c, i) => `${pasek(i)}
      ${rtg(c.ryba, { x: 50, y: 220, w: 880, h: 380 }, { klasa: 'przeswietl', pecherz: c.pecherz || 1.35, kropki: c.objawy.map(o => ({ p: o.p, przy: o.przy, kolor: o.grozne ? '#e0263b' : null })) })}
      <h2 class="tyt" style="top:650px;font-size:92px" data-a="lewo" data-d="0">${c.tytul}</h2>
      <ol class="lista objawy ciasna" style="top:770px">${c.objawy.map((o, k) => `<li class="${o.grozne ? 'grozne' : ''}" data-a="lewo" ${wej(o.przy, .3 + k * .4)}><span class="n">${k + 1}</span><span>${o.t}${o.m ? `<small>${o.m}</small>` : ''}</span></li>`).join('')}</ol>
      ${zr(c.zrodla)}`,

    liczby: (c, i) => { const R = 150, C = 2 * Math.PI * R, p = c.procent / 100, top = 530, H = 450, MAX = c.maxGl || 15;
      const y = (m) => top + m / MAX * H;
      return `${pasek(i)}
        <h2 class="tyt" style="top:220px" data-a="lewo" data-d="0">${c.tytul}</h2>
        <div class="glb" style="top:${top}px;height:${H}px">
          ${c.strefy.map((z, k) => { const y0 = y(z.od), y1 = y(c.strefy[k + 1]?.od ?? MAX);
            return `<div class="seg ${z.kol}" style="top:${y0 - top}px;height:${y1 - y0}px" data-a="fade" ${wej(z.przy, .2 + k * .4)}></div>
              <div class="seg-op" style="top:${y0 - top}px" data-a="lewo" ${wej(z.przy, .2 + k * .4)}><em>${z.gl}</em><span>${z.t}</span></div>`; }).join('')}
          ${[0, 5, 10, 15].map(m => `<div class="tick" style="top:${y(m) - top}px">${m} m</div>`).join('')}</div>
        <div class="donut" style="left:64px;top:1010px;width:340px;height:340px" data-a="pop" ${wej(c.przyProcent)}>
          <svg viewBox="0 0 340 340"><circle cx="170" cy="170" r="${R}" fill="rgba(4,24,36,.85)" stroke="rgba(255,255,255,.15)" stroke-width="34"/>
          <circle cx="170" cy="170" r="${R}" fill="none" stroke="#3ddc84" stroke-width="34" stroke-dasharray="${C * p} ${C}" transform="rotate(-90 170 170)"/></svg>
          <div class="w"><div><b>${c.procentNapis}</b></div></div></div>
        <div class="kuzyn" style="top:1050px;left:440px" data-a="prawo" ${wej(c.przyProcent, 1)}>${c.kuzyn}</div>
        ${zr(c.zrodla)}`; },

    rady: (c, i) => `${pasek(i)}
      <div class="prz" style="top:230px"><h2 data-a="lewo" data-d="0">${c.tytul}</h2>
        ${c.rady.map((r, k) => `<div class="rada ${r.typ || ''}" data-a="prawo" ${wej(r.przy, .3 + k * .4)}><div class="ic">${r.ic}</div><div><div class="k">${r.k}</div><div class="op">${r.op}</div></div></div>`).join('')}
        ${c.uwaga ? `<div class="uwaga" data-a="dol" ${wej(c.przyUwaga, 1.6)}>${c.uwaga}</div>` : ''}</div>
      ${zr(c.zrodla)}`,

    cta: (c, i) => `${pasek(i)}
      <div class="baro" style="top:230px;width:500px;height:500px" data-a="pop" data-d="0">
        <svg viewBox="0 0 500 500"><circle cx="250" cy="250" r="230" fill="#f1ead8" stroke="#0f2a1f" stroke-width="18"/>
        ${Array.from({length: 21}, (_, k) => { const a = (-135 + k * 13.5) * Math.PI / 180, r1 = 200, r2 = k % 5 ? 182 : 165;
          return `<line x1="${250 + r1 * Math.sin(a)}" y1="${250 - r1 * Math.cos(a)}" x2="${250 + r2 * Math.sin(a)}" y2="${250 - r2 * Math.cos(a)}" stroke="#0f2a1f" stroke-width="${k % 5 ? 4 : 8}"/>`; }).join('')}
        <text x="250" y="330" text-anchor="middle" style="font:900 34px Inter;letter-spacing:4px" fill="#0f2a1f">hPa</text>
        <text x="110" y="400" text-anchor="middle" style="font:400 40px Anton" fill="#e0263b">NIŻ</text><text x="390" y="400" text-anchor="middle" style="font:400 40px Anton" fill="#0f2a1f">WYŻ</text>
        <line x1="250" y1="250" x2="${250 - 150 * Math.sin(1.0)}" y2="${250 - 150 * Math.cos(1.0)}" stroke="#e0263b" stroke-width="14" stroke-linecap="round"/>
        <circle cx="250" cy="250" r="22" fill="#0f2a1f"/>
        <text x="250" y="170" text-anchor="middle" style="font:400 120px Anton" fill="#e0263b" opacity=".9">?</text></svg></div>
      <div class="cta2" style="top:800px"><h2 data-a="pop" data-d=".1">${c.tytul}</h2>
        <div class="btn" data-a="pop" ${wej(c.przyObserwuj || 'obserwuj')}>@${P}</div>
        <div class="next" data-a="dol" ${wej(c.przyNastepny)}>${c.nastepny}</div></div>`,
  };

  return S.map((c, i) => `<section class="frame woda" id="${String(i + 1).padStart(2, '0')}">${sceny[c.typ](c, i)}</section>`);
};
