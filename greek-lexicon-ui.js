/* greek-lexicon-ui.js
   Tooltip de “diccionario” para griego SIN alterar el DOM del verso,
   para no romper offsets/rangos de highlights/notas.
*/
(() => {
  'use strict';

  // Indice morfológico griego (NT completo por libros)
  const MORPH_FILES = [
    'mt-morphgnt.translit.json',
    'mk-morphgnt.translit.json',
    'lk-morphgnt.translit.json',
    'jn-morphgnt.translit.json',
    'ac-morphgnt.translit.json',
    'ro-morphgnt.translit.json',
    '1co-morphgnt.translit.json',
    '2co-morphgnt.translit.json',
    'ga-morphgnt.translit.json',
    'eph-morphgnt.translit.json',
    'php-morphgnt.translit.json',
    'col-morphgnt.translit.json',
    '1th-morphgnt.translit.json',
    '2th-morphgnt.translit.json',
    '1ti-morphgnt.translit.json',
    '2ti-morphgnt.translit.json',
    'tit-morphgnt.translit.json',
    'phm-morphgnt.translit.json',
    'heb-morphgnt.translit.json',
    'jas-morphgnt.translit.json',
    '1pe-morphgnt.translit.json',
    '2pe-morphgnt.translit.json',
    '1jn-morphgnt.translit.json',
    '2jn-morphgnt.translit.json',
    '3jn-morphgnt.translit.json',
    'jud-morphgnt.translit.json',
    're-morphgnt.translit.json'
  ];
  const MORPH_BASE = './diccionario/';
const TRILINGUE_NT_BASE = './dic/trilingueNT/';
  const TRILINGUE_NT_FILES = [
    '01JuanEF.json','02MateoEf.json','03MarcosEF.json','04LucasEF.json','05HechosEF.json','06JacoboEF.json',
    '07Pedro1EF.json','08Pedro2EF.json','09JudasEF.json','10Juan1EF.json','11Juan2EF.json','12Juan3EF.json',
    '13GálatasEF.json','14Tesalonicenses1EF.json','15Tesalonicenses2EF.json','16Corintios1EF.json','17Corintios2EF.json',
    '18RomanosEF.json','19EfesiosEF.json','20Filipenses.json','21ColosensesEF.json','22HebreosEF.json','23FilemónEF.json',
    '24Timoteo1EF.json','25TitoEF.json','26Timoteo2EF.json','27ApocalipsisEF.json'
  ];

  // Si luego tienes un diccionario por lema:
  // window.GREEK_DICTIONARY = { "λέγω": { gloss: "decir", ... }, ... }
  const getDictEntry = (lemma) => window.GREEK_DICTIONARY?.[lemma] || null;

  const state = {
    ready: false,
    bySurface: new Map(), // normalizedSurface -> { lemma, tr, surface }
    byLemma: new Map(), // normalizedLemma -> { lemma, tr, surface }
      lxxCache: new Map(), // normalizedLemma -> [{ ref, word, lemma, morph }]
    tipEl: null,
    tipDrag: null,
    tipRequestId: 0,
    tipStopDrag: null,
        tipExpanded: false,
            trilingueFallback: null,
  };


function normalizeSimpleText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

function normalizeGreekLookup(value) {
    return canonicalGreekKey(value);
  }

  function pickTrilingueGloss(row) {
    const direct = normalizeSimpleText(row?.equivalencia_espanol || row?.equivalencia_español);
    if (direct) return direct.split('/')[0].trim();
    const candidates = Array.isArray(row?.candidatos) ? row.candidatos : [];
    const firstCandidate = candidates.find((item) => normalizeSimpleText(item));
    return normalizeSimpleText(firstCandidate);
  }

  function parseJsonArrayChunks(raw) {
    const text = String(raw || '').trim();
    if (!text) return [];
    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      // Algunos archivos tienen arreglos JSON concatenados; parseamos por bloques "[...]".
    }

    const rows = [];
    let depth = 0;
    let chunkStart = -1;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '[') {
        if (depth === 0) chunkStart = i;
        depth++;
      } else if (ch === ']') {
        depth--;
        if (depth === 0 && chunkStart >= 0) {
          const chunk = text.slice(chunkStart, i + 1);
          try {
            const parsed = JSON.parse(chunk);
            if (Array.isArray(parsed)) rows.push(...parsed);
          } catch (_) {}
          chunkStart = -1;
        }
      }
    }
    return rows;
  }

  async function loadTrilingueRows(fileName) {
    const res = await fetch(`${TRILINGUE_NT_BASE}${fileName}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`No se pudo cargar ${fileName} (HTTP ${res.status})`);
    const raw = await res.text();
    return parseJsonArrayChunks(raw);
  }

  function buildTrilingueFallback(rowsByBook) {
    const byGreek = new Map();
    for (const rows of rowsByBook) {
      for (const row of rows || []) {
        const greek = normalizeSimpleText(row?.equivalencia_griega);
        const key = normalizeGreekLookup(greek);
        if (!key || byGreek.has(key)) continue;
        const gloss = pickTrilingueGloss(row);
        const hebrew = normalizeSimpleText(row?.texto_hebreo);
        byGreek.set(key, { gloss, hebrew, greek });
      }
    }
    return { byGreek };
  }

  async function loadTrilingueFallback() {
    if (state.trilingueFallback) return state.trilingueFallback;
    const rowsByBook = await Promise.all(
      TRILINGUE_NT_FILES.map((file) => loadTrilingueRows(file).catch(() => []))
    );
    state.trilingueFallback = buildTrilingueFallback(rowsByBook);
    return state.trilingueFallback;
  }

  function resolveTrilingueFallback(...greekValues) {
    const fallback = state.trilingueFallback;
    if (!fallback?.byGreek) return null;
    for (const value of greekValues) {
      const key = normalizeGreekLookup(value);
      if (!key) continue;
      const hit = fallback.byGreek.get(key);
      if (hit) return hit;
    }
    return null;
  }


  function ensureTip() {
    if (state.tipEl) return state.tipEl;

    const styleId = 'greek-lexicon-tip-style';
    if (!document.getElementById(styleId)) {
      const st = document.createElement('style');
      st.id = styleId;
      st.textContent = `
        .gr-lex-tip{
          position: fixed;
          z-index: 9999;
          max-width: min(420px, calc(100vw - 24px));
           max-height: calc(100vh - 24px);
          overflow: auto;
          background: rgba(0,0,0,.96);
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 12px;
          box-shadow: 0 18px 45px rgba(0,0,0,.45);
          padding: 10px 12px;
          color: #e5e7eb;
          font: 13px/1.35 system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
          display: none;
        }
                .gr-lex-tip.compact{ max-width:min(320px, calc(100vw - 24px)); }
        .gr-lex-tip{ cursor: default; }
        .gr-lex-tip .t1{ font-size: 14px; font-weight: 700; margin-bottom: 4px; }
        .gr-lex-tip .head{
          display:grid;
          grid-template-columns:auto 1fr auto;
           align-items:center;
          gap:8px;
          margin-bottom:4px;
          cursor:move;
          user-select:none;
          -webkit-user-select:none;
          touch-action:none;
        }
        .gr-lex-tip .head .t1{ margin-bottom:0; text-align:center; }
        .gr-lex-tip .close{ border:0; background:transparent; color:#cbd6ff; font-size:16px; line-height:1; cursor:pointer; padding:0 2px; }
        .gr-lex-tip .toggle{ border:1px solid rgba(255,255,255,.2); background:rgba(255,255,255,.08); color:#dbe5ff; border-radius:8px; font-size:11px; line-height:1; cursor:pointer; padding:4px 8px; }
        .gr-lex-tip .t2{ font-size: 12px; opacity: .9; }
        .gr-lex-tip .t3{ margin-top: 6px; font-size: 12px; opacity: .95; }
         .gr-lex-tip #gr-lex-content.collapsed .details{ display:none; }
        .gr-lex-tip #gr-lex-content .summary .t3{ display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
        .gr-lex-tip #gr-lex-content.expanded .summary .t3{ display:block; }
        .gr-lex-tip .muted{ opacity: .7; }
       .gr-lex-tip #gr-lex-content,
        .gr-lex-tip #gr-lex-content *{
          cursor:text;
          user-select:text;
          -webkit-user-select:text;
          touch-action: pan-y;
        }
       `;
      document.head.appendChild(st);
    }

    const el = document.createElement('div');
    el.className = 'gr-lex-tip';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-hidden', 'true');
     el.innerHTML = '<div class="head"><button type="button" class="toggle" id="gr-lex-toggle" aria-expanded="false">Expandir</button><div class="t1" id="gr-lex-word"></div><button type="button" class="close" aria-label="Cerrar">×</button></div><div id="gr-lex-content" class="collapsed"></div>';    // Cierra al click afuera
              document.addEventListener('pointerdown', (ev) => {
       if (!el || el.style.display === 'none') return;
      if (ev.target === el || el.contains(ev.target)) return;
      hideTip();
    }, true);

    // ESC cierra
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') hideTip();
    });
      const onPointerMove = (ev) => {
      const drag = state.tipDrag;
      if (!drag) return;
         if (ev.pointerId !== drag.pointerId) return;
      if ((ev.buttons & 1) !== 1) {
        stopDrag();
        return;
      }
      const box = state.tipEl;
      if (!box) return;
     const nx = ev.clientX - drag.offsetX;
      const ny = ev.clientY - drag.offsetY;
      box.style.left = `${Math.round(nx)}px`;
      box.style.top = `${Math.round(ny)}px`;
    };
    const stopDrag = () => {
      state.tipDrag = null;
      document.removeEventListener('pointermove', onPointerMove, true);
      document.removeEventListener('pointerup', stopDrag, true);
      document.removeEventListener('pointercancel', stopDrag, true);
    };
    state.tipStopDrag = stopDrag;
    const beginDrag = (ev) => {
      if (ev.button !== 0) return;
      if (ev.target?.closest?.('.close')) return;
             stopDrag();
      const r = el.getBoundingClientRect();
             state.tipDrag = {
        offsetX: ev.clientX - r.left,
        offsetY: ev.clientY - r.top,
        pointerId: ev.pointerId,
      };
      document.addEventListener('pointermove', onPointerMove, true);
      document.addEventListener('pointerup', stopDrag, true);
      document.addEventListener('pointercancel', stopDrag, true);
      ev.preventDefault();
      };

   
     const header = el.querySelector('.head');
     header?.addEventListener('pointerdown', beginDrag);
      el.querySelector('#gr-lex-toggle')?.addEventListener('click', () => {
      setTipExpanded(!state.tipExpanded);
    }, false);
    el.querySelector('.close')?.addEventListener('click', hideTip, false);
    document.body.appendChild(el);
    state.tipEl = el;
    return el;
  }

  function showTip(title, bodyHtml, x, y) {
    const el = ensureTip();
   const titleEl = el.querySelector('#gr-lex-word');
    const bodyEl = el.querySelector('#gr-lex-content');
    if (titleEl) titleEl.textContent = title || '—';
    if (bodyEl) bodyEl.innerHTML = bodyHtml;

    el.style.display = 'block';
    el.setAttribute('aria-hidden', 'false');

    // posicionamiento con clamp
    const pad = 10;
    // primer posicionamiento para medir
    el.style.left = (x + 12) + 'px';
    el.style.top  = (y + 12) + 'px';

    const r = el.getBoundingClientRect();
    const maxX = window.innerWidth - r.width - pad;
    const maxY = window.innerHeight - r.height - pad;

    const nx = Math.max(pad, Math.min(x + 12, maxX));
    const ny = Math.max(pad, Math.min(y + 12, maxY));

    el.style.left = nx + 'px';
    el.style.top  = ny + 'px';
  }
   function setTipExpanded(expanded) {
    state.tipExpanded = !!expanded;
    const el = state.tipEl;
    if (!el) return;
    const bodyEl = el.querySelector('#gr-lex-content');
    const toggleEl = el.querySelector('#gr-lex-toggle');
    if (bodyEl) {
      bodyEl.classList.toggle('expanded', state.tipExpanded);
      bodyEl.classList.toggle('collapsed', !state.tipExpanded);
    }
    el.classList.toggle('compact', !state.tipExpanded);
    if (toggleEl) {
      toggleEl.textContent = state.tipExpanded ? 'Contraer' : 'Expandir';
      toggleEl.setAttribute('aria-expanded', state.tipExpanded ? 'true' : 'false');
    }
  }


  function hideTip() {
   state.tipStopDrag?.();
    const el = state.tipEl;
    if (!el) return;
    el.style.display = 'none';
    el.setAttribute('aria-hidden', 'true');
  }

  function normalizeGreekToken(s) {
    // Quita signos críticos/NA (⸀ ⸂ ⸃), puntuación común, y deja letras+diacríticos
    return (s || '')
      .replace(/[⸀⸂⸃]/g, '')
      .replace(/[··.,;:!?“”"(){}\[\]<>«»]/g, '')
      .replace(/[\u2019\u02BC']/g, '’') // unifica apóstrofos si los hubiera
      .trim();
  }
  function canonicalGreekKey(s) {
    return normalizeGreekToken(s)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\u200b-\u200d\u2060\ufeff]/g, '')
      .replace(/\s+/g, '')
      .toLowerCase()
      .replace(/ς/g, 'σ')
      .replace(/ϲ/g, 'σ');
  }
 function normalizeGreekLemmaKey(s) {
    return canonicalGreekKey(s);
  }

  const LXX_FILES = [
    'lxx_rahlfs_1935_1Chr.json',
    'lxx_rahlfs_1935_1Esdr.json',
    'lxx_rahlfs_1935_1Kgs.json',
    'lxx_rahlfs_1935_1Macc.json',
    'lxx_rahlfs_1935_1Sam.json',
    'lxx_rahlfs_1935_2Chr.json',
    'lxx_rahlfs_1935_2Esdr.json',
    'lxx_rahlfs_1935_2Kgs.json',
    'lxx_rahlfs_1935_2Macc.json',
    'lxx_rahlfs_1935_2Sam.json',
    'lxx_rahlfs_1935_3Macc.json',
    'lxx_rahlfs_1935_4Macc.json',
    'lxx_rahlfs_1935_Amos.json',
    'lxx_rahlfs_1935_Bar.json',
    'lxx_rahlfs_1935_BelOG.json',
    'lxx_rahlfs_1935_BelTh.json',
    'lxx_rahlfs_1935_DanOG.json',
    'lxx_rahlfs_1935_DanTh.json',
    'lxx_rahlfs_1935_Deut.json',
    'lxx_rahlfs_1935_Eccl.json',
    'lxx_rahlfs_1935_EpJer.json',
    'lxx_rahlfs_1935_Esth.json',
    'lxx_rahlfs_1935_Exod.json',
    'lxx_rahlfs_1935_Ezek.json',
    'lxx_rahlfs_1935_Gen.json',
    'lxx_rahlfs_1935_Hab.json',
    'lxx_rahlfs_1935_Hag.json',
    'lxx_rahlfs_1935_Hos.json',
    'lxx_rahlfs_1935_Isa.json',
    'lxx_rahlfs_1935_Jdt.json',
    'lxx_rahlfs_1935_Jer.json',
    'lxx_rahlfs_1935_Job.json',
    'lxx_rahlfs_1935_Joel.json',
    'lxx_rahlfs_1935_Jonah.json',
    'lxx_rahlfs_1935_JoshA.json',
    'lxx_rahlfs_1935_JoshB.json',
    'lxx_rahlfs_1935_JudgA.json',
    'lxx_rahlfs_1935_JudgB.json',
    'lxx_rahlfs_1935_Lam.json',
    'lxx_rahlfs_1935_Lev.json',
    'lxx_rahlfs_1935_Mal.json',
    'lxx_rahlfs_1935_Mic.json',
    'lxx_rahlfs_1935_Nah.json',
    'lxx_rahlfs_1935_Num.json',
    'lxx_rahlfs_1935_Obad.json',
    'lxx_rahlfs_1935_Odes.json',
    'lxx_rahlfs_1935_Prov.json',
    'lxx_rahlfs_1935_Ps.json',
    'lxx_rahlfs_1935_PsSol.json',
    'lxx_rahlfs_1935_Ruth.json',
    'lxx_rahlfs_1935_Sir.json',
    'lxx_rahlfs_1935_Song.json',
    'lxx_rahlfs_1935_SusOG.json',
    'lxx_rahlfs_1935_SusTh.json',
    'lxx_rahlfs_1935_TobBA.json',
    'lxx_rahlfs_1935_TobS.json',
    'lxx_rahlfs_1935_Wis.json',
    'lxx_rahlfs_1935_Zech.json',
    'lxx_rahlfs_1935_Zeph.json',
  ];

  async function findLxxSamples(lemma, max = 4) {
    const normalized = normalizeGreekLemmaKey(lemma);
    if (!normalized) return [];
    if (state.lxxCache.has(normalized)) return state.lxxCache.get(normalized);

    const results = [];
    for (const file of LXX_FILES) {
      if (results.length >= max) break;
      try {
        const r = await fetch(`./LXX/${file}`, { cache: 'no-store' });
        if (!r.ok) continue;
        const data = await r.json();
        const text = data?.text || {};
        for (const [book, chapters] of Object.entries(text)) {
          for (const [chapter, verses] of Object.entries(chapters || {})) {
            for (const [verse, tokens] of Object.entries(verses || {})) {
              for (const t of tokens || []) {
                if (!t) continue;
                const lemmaKey = normalizeGreekLemmaKey(t.lemma || '');
                const wordKey = normalizeGreekLemmaKey(t.w || '');
                if (lemmaKey !== normalized && wordKey !== normalized) continue;
                results.push({
                  ref: `${book} ${chapter}:${verse}`,
                  word: String(t.w || ''),
                  lemma: String(t.lemma || ''),
                  morph: String(t.morph || ''),
                });
                if (results.length >= max) break;
              }
              if (results.length >= max) break;
            }
            if (results.length >= max) break;
          }
          if (results.length >= max) break;
        }
      } catch (e) {
        continue;
      }
    }

    state.lxxCache.set(normalized, results);
    return results;
  }

  function renderLxxSection(samples, loading = false) {
    if (loading) {
      return `<div class="t3 muted">LXX: buscando coincidencias...</div>`;
    }
    if (!samples || samples.length === 0) {
      return `<div class="t3 muted">LXX: sin resultados en la carpeta LXX</div>`;
    }
    const items = samples.map((s) => {
      const morph = s.morph ? ` <span class="muted">(${escapeHtml(s.morph)})</span>` : '';
      return `<div class="t3">• <b>${escapeHtml(s.ref)}</b> — ${escapeHtml(s.word || '—')} <span class="muted">|</span> ${escapeHtml(s.lemma || '—')}${morph}</div>`;
    }).join('');
    return `<div class="t3"><b>LXX:</b></div>${items}`;
  }
  async function loadMorphIndexOnce() {
    if (state.ready) return;
    const settled = await Promise.allSettled(
      MORPH_FILES.map(async (name) => {
        const path = `${MORPH_BASE}${name}`;
        const r = await fetch(path, { cache: 'no-store' });
        if (!r.ok) throw new Error(`No se pudo cargar ${path} (HTTP ${r.status})`);
        return r.json();
      })
    );
    const loaded = settled
      .filter((item) => item.status === 'fulfilled')
      .map((item) => item.value);
    if (loaded.length === 0) {
      throw new Error('No se pudo cargar ningun archivo morfologico del NT');
    }

    for (const data of loaded) {
      const chapters = Array.isArray(data) ? data : (Array.isArray(data?.chapters) ? data.chapters : []);
      for (const ch of chapters) {
        if (!Array.isArray(ch)) continue;
        for (const v of ch) {
          if (!Array.isArray(v)) continue;
          for (const t of v) {
            if (!t || typeof t !== 'object') continue;
            const surface = String(t.g || '');
            const norm = canonicalGreekKey(surface);
            const lemma = String(t.lemma || '');
            const lemmaKey = canonicalGreekKey(lemma);
            if (!norm) continue;
            if (!state.bySurface.has(norm)) {
              state.bySurface.set(norm, {
                surface,
                lemma,
                tr: String(t.tr || ''),
              });
            }
            if (lemmaKey && !state.byLemma.has(lemmaKey)) {
              state.byLemma.set(lemmaKey, {
                surface,
                lemma,
                tr: String(t.tr || ''),
              });
            }
          }
        }
      }
    }

    state.ready = true;
  }

  function caretFromPoint(x, y) {
    // Moderno
    if (document.caretPositionFromPoint) {
      const p = document.caretPositionFromPoint(x, y);
      if (!p) return null;
      return { node: p.offsetNode, offset: p.offset };
    }
    // Legacy (Chromium aún lo soporta)
    if (document.caretRangeFromPoint) {
      const r = document.caretRangeFromPoint(x, y);
      if (!r) return null;
      return { node: r.startContainer, offset: r.startOffset };
    }
    return null;
  }

  function expandWord(text, idx) {
    // Define “caracter de palabra” como letras griegas + marcas combinantes
    // (esto es deliberadamente conservador para no capturar puntuación).
    const isWordChar = (ch) => {
      const code = ch.codePointAt(0);
      // Greek & Coptic + Greek Extended + Combining Diacritics
      return (
        (code >= 0x0370 && code <= 0x03FF) ||
        (code >= 0x1F00 && code <= 0x1FFF) ||
        (code >= 0x0300 && code <= 0x036F)
      );
    };

    let start = idx;
    let end = idx;

    while (start > 0 && isWordChar(text[start - 1])) start--;
    while (end < text.length && isWordChar(text[end])) end++;

    const word = text.slice(start, end);
    return { word, start, end };
  }

  function isGreekPanel(target) {
    const panel = document.getElementById('passageTextOrig');
    if (!panel) return false;
    if (!panel.classList.contains('greek')) return false;
    return panel.contains(target);
  }

  // CLICK IZQUIERDO: abre “diccionario”
  document.addEventListener('click', async (ev) => {
    // Solo click izquierdo
    if (ev.button !== 0) return;

    // Solo en panel griego (original)
    if (!isGreekPanel(ev.target)) return;

    // Si click sobre nota, NO intervenir (tu handler de notas debe ganar):contentReference[oaicite:5]{index=5}
    if (ev.target?.closest?.('.note-mark')) return;

    // Si hay selección activa, respetarla (para subrayado/notas por menú contextual)
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) return;

    try {
      await loadMorphIndexOnce();
    } catch (e) {
      // Si el JSON no existe, no rompemos nada: solo no mostramos tip
      return;
    }

    const pos = caretFromPoint(ev.clientX, ev.clientY);
    if (!pos || !pos.node) return;

    // Necesitamos un text node
    let node = pos.node;
    let offset = pos.offset;

    if (node.nodeType === Node.ELEMENT_NODE) {
      // intenta caer a un textNode cercano
      const tw = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null);
      const tn = tw.nextNode();
      if (!tn) return;
      node = tn;
      offset = Math.min(offset, tn.nodeValue.length);
    }
    if (node.nodeType !== Node.TEXT_NODE) return;

    const text = node.nodeValue || '';
    if (!text) return;

    const { word } = expandWord(text, Math.max(0, Math.min(offset, text.length - 1)));
    const norm = canonicalGreekKey(word);
    if (!norm) return;

    const hit = state.bySurface.get(norm) || state.byLemma.get(norm);
 const requestId = ++state.tipRequestId;
    await loadTrilingueFallback().catch(() => null);

        if (!hit) {
                const triOnly = resolveTrilingueFallback(norm);
      showTip(
              word,
        renderTipBody({ lemma: '—', tr: '—' }, `<div class="t3 muted">Sin entrada (aún) en tu data</div>`, [], false, triOnly),
        ev.clientX,
        ev.clientY
      );
      setTipExpanded(false);
            return;
    }

    const dict = getDictEntry(hit.lemma);
        const trilingueFallback = resolveTrilingueFallback(norm, hit.lemma, hit.surface);

    const fallbackGloss = trilingueFallback?.gloss || '';
    const glossHtml = dict?.gloss
      ? `<div class="t3"><b>Definición:</b> ${escapeHtml(String(dict.gloss))}</div>`
      : fallbackGloss
        ? `<div class="t3"><b>Definición:</b> ${escapeHtml(fallbackGloss)} <span class="muted">(trilingüe NT)</span></div>`
                : `<div class="t3 muted">Definición: pendiente (no hay diccionario cargado)</div>`;
    showTip(
       word,
      renderTipBody(hit, glossHtml, [], true, trilingueFallback),
      ev.clientX,
      ev.clientY
    );
            setTipExpanded(false);

    const lxxSamples = await findLxxSamples(hit.lemma || norm, 4);

    if (requestId !== state.tipRequestId) return;
      if (state.tipEl && state.tipEl.style.display !== 'none') {
      const bodyEl = state.tipEl.querySelector('#gr-lex-content');
      if (bodyEl) bodyEl.innerHTML = renderTipBody(hit, glossHtml, lxxSamples, false, trilingueFallback);
    }
  }, false);

  function escapeHtml(s) {
    return String(s ?? '')
      .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
      .replaceAll('"','&quot;').replaceAll("'","&#39;");
  }
 function renderTrilingueSection(fallback) {
    if (!fallback) return `<div class="t3"><b>Equivalencia trilingüe:</b> <span class="muted">sin coincidencia</span></div>`;
        const gloss = escapeHtml(fallback.gloss || '—');
    const hebrew = escapeHtml(fallback.hebrew || '—');
    const greek = escapeHtml(fallback.greek || '—');
    return `<div class="t3"><b>Equivalencia trilingüe:</b> ${gloss}</div><div class="t3 muted">Hebreo puente: ${hebrew} · Griego: ${greek}</div>`;
      }

  function renderTipBody(hit, glossHtml, lxxSamples = [], lxxLoading = false, trilingueFallback = null) {
      return `
      <div class="summary">
        <div class="t2"><b>Lema:</b> ${escapeHtml(hit.lemma || '—')}</div>
        <div class="t2"><b>Forma léxica:</b> ${escapeHtml(hit.tr || '—')}</div>
        ${glossHtml}
      </div>
              ${renderTrilingueSection(trilingueFallback)}
      <div class="details">
        ${renderLxxSection(lxxSamples, lxxLoading)}
      </div>
    `;
  }
})();
