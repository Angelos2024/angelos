/* diccionario/greek-lexicon.js
   - Palabras griegas clickeables (popup lemma/translit + masterdiccionario)
   - Robusto: soporta distintos DOM/atributos para capítulo/verso
   - No interfiere con click derecho (subrayar/comentar)
   - Evita loop/freeze del MutationObserver (debounce + flags)
   - Carga el JSON correcto según ?book=
   - masterdiccionario.json en ./diccionario/
*/
(function () {
  var DICT_DIR = './diccionario/';
  var MASTER_DICT_URL = DICT_DIR + 'masterdiccionario.json';
    var EQUIV_DICT_URL = DICT_DIR + 'diccionario.equivalencias.json';
   var LXX_DIR = './LXX/';
  var masterDictIndex = null;   // Map<lemma, item>
  var masterDictLoaded = false;
   var equivDictIndex = null; // objeto { lemma_normalizado: [equivalencias...] }
  var equivDictLoaded = false;
   var lxxCache = new Map(); // Map<lemma_normalizado, samples[]>
     var popupDrag = null;
       var popupExpanded = false;

  // Cantidad de capítulos por libro MorphGNT abbr
  var ABBR_CHAPTERS = {
        mt: 28, mk: 16, lk: 24, jn: 21,
    ac: 28, ro: 16, '1co': 16, '2co': 13,
    ga: 6, eph: 6, php: 4, col: 4,
    '1th': 5, '2th': 3, '1ti': 6, '2ti': 4,
    tit: 3, phm: 1, heb: 13, jas: 5,
    '1pe': 5, '2pe': 3, '1jn': 5, '2jn': 1,
    '3jn': 1, jud: 1, re: 22
  };

  // Mapeo slug (?book=) -> abbr MorphGNT
  var BOOK_SLUG_TO_ABBR = {
    mateo: 'mt', mat: 'mt', mt: 'mt',
    marcos: 'mk', mc: 'mk', mr: 'mr',
      lucas: 'lk', lc: 'lk', lk: 'lk',
    juan: 'jn', jn: 'jn', joh: 'jn',

    hechos: 'ac', ac: 'ac',

    romanos: 'ro', ro: 'ro',
    '1corintios': '1co', '1co': '1co',
    '2corintios': '2co', '2co': '2co',
    galatas: 'ga', ga: 'ga',
    efesios: 'eph', eph: 'eph',
    filipenses: 'php', php: 'php',
    colosenses: 'col', col: 'col',
    '1tesalonicenses': '1th', '1th': '1th',
    '2tesalonicenses': '2th', '2th': '2th',
    '1timoteo': '1ti', '1ti': '1ti',
    '2timoteo': '2ti', '2ti': '2ti',
    tito: 'tit', tit: 'tit',
    filemon: 'phm', phm: 'phm',
    hebreos: 'heb', heb: 'heb',
    santiago: 'jas', jas: 'jas',
    '1pedro': '1pe', '1pe': '1pe',
    '2pedro': '2pe', '2pe': '2pe',
    '1juan': '1jn', '1jn': '1jn',
    '2juan': '2jn', '2jn': '2jn',
    '3juan': '3jn', '3jn': '3jn',
    judas: 'jud', jud: 'jud',
    apocalipsis: 're', re: 're'
  };
var LXX_FILES = [
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
    'lxx_rahlfs_1935_Zeph.json'
  ];
  // estado morph
  var morphKey = null; // abbr
  var morphMap = null; // {abbr,totalCh,segs}

  // observer flags
  var observing = false;
  var decorating = false;
  var scheduled = false;
  var scheduleTimer = null;

  // -------------------- util --------------------
  function normalizeTranslit(s) {
    if (!s) return '';
    return String(s).replace(/\s+/g, ' ').trim();
  }

   function normalizeGreekToken(s) {
    return String(s || '')
      .replace(/[⸀⸂⸃]/g, '')
      .replace(/[··.,;:!?“”"(){}\[\]<>«»]/g, '')
      .replace(/[\u2019\u02BC']/g, '’')
      .trim();
  }

  function normalizeGreekLemmaKey(s) {
    return normalizeGreekToken(s)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }
function normalizeBookKey(slug) {
  slug = (slug || '').toLowerCase().trim();

  // quita acentos
  try {
    slug = slug.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  } catch (e) {}

  // quita TODO lo que no sea letra o número (espacios, guiones, puntos, etc.)
  slug = slug.replace(/[^a-z0-9]/g, '');

  return slug;
}

function slugToAbbr(slug) {
  var key = normalizeBookKey(slug);
  if (!key) return null;

  // match directo
  if (Object.prototype.hasOwnProperty.call(BOOK_SLUG_TO_ABBR, key)) {
    return BOOK_SLUG_TO_ABBR[key];
  }

  // fallback útil: si viene como 1pe / 2ti etc ya está, pero por si acaso:
  // ejemplo: "1cor" -> "1co"
  if (key === '1cor') return '1co';
  if (key === '2cor') return '2co';
  if (key === '1tim') return '1ti';
  if (key === '2tim') return '2ti';
  if (key === '1pet') return '1pe';
  if (key === '2pet') return '2pe';

  return null;
}


  function getMorphUrl(abbr) {
    return DICT_DIR + abbr + '-morphgnt.translit.json';
  }

  function getBookSlug() {
    var qs = window.location.search || '';
    if (!qs) return '';
    if (qs.charAt(0) === '?') qs = qs.slice(1);

    var parts = qs.split('&');
    for (var i = 0; i < parts.length; i++) {
      var kv = parts[i].split('=');
      var k = decodeURIComponent(kv[0] || '');
      var v = decodeURIComponent(kv[1] || '');
      if (k === 'book') return (v || '').toLowerCase();
    }
    return '';
  }

  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

   
  function escAttr(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

   // -------------------- LXX lookup --------------------
  function findLxxSamples(lemma, max) {
    max = max || 4;
    var normalized = normalizeGreekLemmaKey(lemma);
    if (!normalized) return Promise.resolve([]);
     if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return Promise.resolve([]);
    }
    if (lxxCache.has(normalized)) return Promise.resolve(lxxCache.get(normalized));

    var results = [];
    var chain = Promise.resolve();

    LXX_FILES.forEach(function (file) {
      chain = chain.then(function () {
        if (results.length >= max) return;
        return fetch(LXX_DIR + file, { cache: 'no-store' })
          .then(function (r) {
            if (!r.ok) return null;
            return r.json();
          })
          .then(function (data) {
            if (!data || !data.text || results.length >= max) return;
            var text = data.text;
            Object.keys(text).some(function (book) {
              var chapters = text[book] || {};
              return Object.keys(chapters).some(function (chapter) {
                var verses = chapters[chapter] || {};
                return Object.keys(verses).some(function (verse) {
                  var tokens = verses[verse] || [];
                  for (var i = 0; i < tokens.length; i++) {
                    var t = tokens[i];
                    if (!t) continue;
                    var lemmaKey = normalizeGreekLemmaKey(t.lemma || '');
                    var wordKey = normalizeGreekLemmaKey(t.w || '');
                    if (lemmaKey !== normalized && wordKey !== normalized) continue;
                    results.push({
                      ref: book + ' ' + chapter + ':' + verse,
                      word: String(t.w || ''),
                      lemma: String(t.lemma || ''),
                      morph: String(t.morph || '')
                    });
                    if (results.length >= max) return true;
                  }
                  return false;
                });
              });
            });
          })
          .catch(function () {
            // ignora archivos con error sin romper la UI
          });
      });
    });

    return chain.then(function () {
      lxxCache.set(normalized, results);
      return results;
    });
  }

  function renderLxxItems(samples) {
    if (!samples || !samples.length) {
      return '<div class="lxx-row muted">Sin resultados en la LXX.</div>';
    }
    return samples.map(function (s) {
      var morph = s.morph ? ' <span class="muted">(' + escHtml(s.morph) + ')</span>' : '';
      return '<div class="lxx-row">• <b>' + escHtml(s.ref) + '</b> — ' +
        escHtml(s.word || '—') + ' <span class="muted">|</span> ' +
        escHtml(s.lemma || '—') + morph + '</div>';
    }).join('');
  }
  // -------------------- build morph index --------------------
  // JSON: { book, chapters:[ ... ] }
  // En tu formato:
  //  - Solo algunos índices de "chapters" son arrays (segmentos)
  //  - tokens en seg[idx] donde idx = chapter*100 + (verse-1) (para seg0)
  //  - seg1 arranca en 0 para cap 10, etc.
  function buildMorphIndex(data, abbr) {
    if (!data || !data.chapters || !Array.isArray(data.chapters)) return null;

    var segs = [];
    for (var i = 0; i < data.chapters.length; i++) {
      if (Array.isArray(data.chapters[i])) segs.push(data.chapters[i]);
    }
    if (!segs.length) return null;

    return {
      abbr: abbr,
      totalCh: ABBR_CHAPTERS[abbr] || 0,
      segs: segs
    };
  }

  function getTokens(ch, v) {
    if (!morphMap) return null;

    var segs = morphMap.segs;
    var totalCh = morphMap.totalCh || 0;
    if (!segs || !segs.length) return null;

    if (ch < 1 || v < 1) return null;
    if (totalCh && ch > totalCh) return null;

    // segIndex: 0 -> caps 1-9, 1 -> 10-19, etc.
    var segIndex = 0;
    if (ch >= 10) segIndex = 1 + Math.floor((ch - 10) / 10);
    if (segIndex < 0 || segIndex >= segs.length) return null;

    var base = segIndex * 10;
    var idx = (segIndex === 0)
      ? (ch * 100) + (v - 1)
      : ((ch - base) * 100) + (v - 1);

    var tokens = segs[segIndex][idx];
    return Array.isArray(tokens) ? tokens : null;
  }

  // -------------------- masterdiccionario (index por lemma) --------------------
  function sanitizeLooseJson(text) {
    return String(text || '')
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/^\uFEFF/, '');
  }

  function buildMasterIndex(masterObj) {
    if (!masterObj || !Array.isArray(masterObj.items)) return null;
    var m = new Map();
    for (var i = 0; i < masterObj.items.length; i++) {
      var it = masterObj.items[i];
      if (!it || !it.lemma) continue;
      m.set(it.lemma, it);
    }
    return m;
  }

  function loadMasterDictionaryOnce() {
    if (masterDictLoaded) return Promise.resolve(masterDictIndex);
    masterDictLoaded = true;

    return fetch(MASTER_DICT_URL, { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('No se pudo cargar masterdiccionario.json (' + r.status + ')');
        return r.text();
      })
      .then(function (txt) {
        var clean = sanitizeLooseJson(txt);
        var obj = JSON.parse(clean);
        masterDictIndex = buildMasterIndex(obj);
        return masterDictIndex;
      })
      .catch(function (e) {
        console.warn('[masterdiccionario] fallo:', e);
        masterDictIndex = null;
        return null;
      });
  }

  function getMasterEntryByLemma(lemma) {
    if (!lemma || !masterDictIndex) return null;
    return masterDictIndex.get(lemma) || null;
  }
     function loadEquivDictionaryOnce() {
    if (equivDictLoaded) return Promise.resolve(equivDictIndex);
    equivDictLoaded = true;

    return fetch(EQUIV_DICT_URL, { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('No se pudo cargar diccionario.equivalencias.json (' + r.status + ')');
        return r.json();
      })
      .then(function (obj) {
        equivDictIndex = (obj && typeof obj === 'object') ? obj : null;
        return equivDictIndex;
      })
      .catch(function (e) {
        console.warn('[diccionario.equivalencias] fallo:', e);
        equivDictIndex = null;
        return null;
      });
  }

  function getEquivDefByLemma(lemma) {
    if (!lemma || !equivDictIndex) return '';
    var key = normalizeGreekLemmaKey(lemma);
    if (!key) return '';
    var raw = equivDictIndex[key];
    if (!Array.isArray(raw) || !raw.length) return '';

    var cleaned = raw
      .map(function (it) { return String(it || '').trim(); })
      .filter(Boolean);

    if (!cleaned.length) return '';
    return cleaned.join('; ');
  }

  function isMissingValue(v) {
    var s = String(v == null ? '' : v).trim();
    return !s || s === '—' || s === '-';
  }

  // -------------------- popup --------------------
  function ensurePopup() {
    if (document.getElementById('gk-lex-popup')) return;

    var st = document.createElement('style');
    st.id = 'gk-lex-style';
    st.textContent =
      '.gk-w{ cursor:pointer; }' +
      '.gk-w:hover{ text-decoration: underline; }' +
      '.gk-lex-popup{ position:fixed; z-index:9997; min-width:260px; max-width:min(420px, calc(100vw - 24px));' +
      ' max-height:calc(100vh - 24px); overflow:auto; background:rgba(17,26,46,0.98);' +
      ' border:1px solid rgba(255,255,255,0.10); border-radius:14px;' +
      ' box-shadow:0 20px 50px rgba(0,0,0,0.35); padding:12px; color:#e9eefc; display:none; }' +
       '.gk-lex-popup.compact{ max-width:min(320px, calc(100vw - 24px)); }' +
      '.gk-lex-popup .t1{ font-weight:700; font-size:14px; margin-bottom:6px; }' +
      '.gk-lex-popup .head{ display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:8px; cursor:move; user-select:none; }' +
      '.gk-lex-popup .head .t1{ margin-bottom:0; text-align:center; }' +
      '.gk-lex-popup .head-controls{ display:flex; align-items:center; gap:6px; }' +
      '.gk-lex-popup .t2{ font-size:13px; opacity:.92; line-height:1.35; }' +
      '.gk-lex-popup .row{ margin-top:6px; }' +
      '.gk-lex-popup .lab{ opacity:.7; margin-right:6px; }' +
      '.gk-lex-popup .sep{ border:0; border-top:1px solid rgba(255,255,255,.12); margin:10px 0; }' +
      '.gk-lex-popup .def{ margin-top:6px; line-height:1.35; max-height:180px; overflow:auto; }' +
       '.gk-lex-popup .lxx{ margin-top:6px; max-height:160px; overflow:auto; }' +
     '.gk-lex-popup .lxx-row{ margin-top:4px; font-size:12px; line-height:1.3; }' +
      '.gk-lex-popup .muted{ opacity:.7; }' +
 '.gk-lex-popup .close{ background:transparent; border:0; color:#cbd6ff; cursor:pointer; font-size:16px; line-height:1; padding:0 2px; }' +
      '.gk-lex-popup .toggle{ border:1px solid rgba(255,255,255,.2); background:rgba(255,255,255,.08); color:#dbe5ff; border-radius:8px; font-size:11px; line-height:1; cursor:pointer; padding:4px 8px; }' +
      '.gk-lex-popup .content.collapsed .details{ display:none; }' +
      '.gk-lex-popup .content.expanded .details{ display:block; }';

    document.head.appendChild(st);

    var box = document.createElement('div');
    box.id = 'gk-lex-popup';
    box.className = 'gk-lex-popup';
    box.innerHTML =
'<div class="head"><button class="toggle" id="gk-lex-toggle" aria-expanded="false" type="button">Expandir</button><div class="t1" id="gk-lex-g"></div><button class="close" aria-label="Cerrar" type="button">×</button></div>' +
      '<div class="content collapsed" id="gk-lex-content">' +
      '<div class="summary">' +
      '<div class="t2"><span class="lab">Lemma:</span><span id="gk-lex-lemma"></span></div>' +
      '<div class="t2 row"><span class="lab">Forma léxica:</span><span id="gk-lex-forma-lex"></span></div>' +
            '<div class="t2 row"><span class="lab">Equivalencia trilingüe:</span><span id="gk-lex-tri"></span></div>' +
      '<div class="t2 row"><span class="lab">Entrada impresa:</span><span id="gk-lex-entrada"></span></div>' +
  '<div class="t2"><span class="lab">Definición:</span><div id="gk-lex-def" class="def"></div></div>' +
      '</div>' +
      '<div class="details">' +
      '<hr class="sep" />' +
      '<div class="t2"><span class="lab">LXX:</span></div>' +
'<div id="gk-lex-lxx" class="lxx"></div>' +
      '</div>' +
      '</div>';

    document.body.appendChild(box);

    box.querySelector('.close').addEventListener('click', function () {
      hidePopup();
    }, false);
box.querySelector('#gk-lex-toggle').addEventListener('click', function () {
      setPopupExpanded(!popupExpanded);
    }, false);

     var onPointerMove = function (ev) {
      if (!popupDrag) return;
      var popup = document.getElementById('gk-lex-popup');
      if (!popup) return;
      var pad = 10;
      var maxX = Math.max(pad, window.innerWidth - popup.offsetWidth - pad);
      var maxY = Math.max(pad, window.innerHeight - popup.offsetHeight - pad);
      var nx = Math.max(pad, Math.min(ev.clientX - popupDrag.offsetX, maxX));
      var ny = Math.max(pad, Math.min(ev.clientY - popupDrag.offsetY, maxY));
      popup.style.left = Math.round(nx) + 'px';
      popup.style.top = Math.round(ny) + 'px';
    };

    var stopDrag = function () {
      popupDrag = null;
      document.removeEventListener('pointermove', onPointerMove, true);
      document.removeEventListener('pointerup', stopDrag, true);
      document.removeEventListener('pointercancel', stopDrag, true);
    };

    box.querySelector('.head').addEventListener('pointerdown', function (ev) {
      if (ev.button !== 0) return;
      if (ev.target && ev.target.closest && ev.target.closest('.close, .toggle')) return;
            var r = box.getBoundingClientRect();
      popupDrag = { offsetX: ev.clientX - r.left, offsetY: ev.clientY - r.top };
      document.addEventListener('pointermove', onPointerMove, true);
      document.addEventListener('pointerup', stopDrag, true);
      document.addEventListener('pointercancel', stopDrag, true);
      ev.preventDefault();
    }, false);
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') hidePopup();
    }, false);

    document.addEventListener('click', function (ev) {
      var p = document.getElementById('gk-lex-popup');
      if (!p || p.style.display !== 'block') return;
      if (p.contains(ev.target)) return;
      if (ev.target && ev.target.classList && ev.target.classList.contains('gk-w')) return;
      hidePopup();
    }, false);
    setPopupExpanded(false);
  }

  function setPopupExpanded(expanded) {
    popupExpanded = !!expanded;
    var box = document.getElementById('gk-lex-popup');
    if (!box) return;
    var content = document.getElementById('gk-lex-content');
    var toggle = document.getElementById('gk-lex-toggle');
    if (content) {
      content.classList.toggle('expanded', popupExpanded);
      content.classList.toggle('collapsed', !popupExpanded);
    }
    box.classList.toggle('compact', !popupExpanded);
    if (toggle) {
      toggle.textContent = popupExpanded ? 'Contraer' : 'Expandir';
      toggle.setAttribute('aria-expanded', popupExpanded ? 'true' : 'false');
    }
  }

  function showPopupNear(anchorEl, g, lemma) {
    ensurePopup();
    var box = document.getElementById('gk-lex-popup');
    if (!box) return;
     

    document.getElementById('gk-lex-g').textContent = g || '';
    document.getElementById('gk-lex-lemma').textContent = lemma || '—';

    var formaLexEl = document.getElementById('gk-lex-forma-lex');
    var entradaEl = document.getElementById('gk-lex-entrada');
    var defEl = document.getElementById('gk-lex-def');
    var triEl = document.getElementById('gk-lex-tri');
      var lxxEl = document.getElementById('gk-lex-lxx');

if (triEl) triEl.textContent = 'Buscando…';
    loadEquivDictionaryOnce().then(function () {
      var p = document.getElementById('gk-lex-popup');
      if (!p || p.style.display !== 'block') return;
      var currentLemma = document.getElementById('gk-lex-lemma');
      if (!currentLemma || currentLemma.textContent !== (lemma || '—')) return;
      var equivDef = getEquivDefByLemma(lemma);
      if (triEl) triEl.textContent = equivDef || 'sin coincidencia';
    });

    if (!masterDictIndex) {
      loadMasterDictionaryOnce().then(function () {
        var p = document.getElementById('gk-lex-popup');
if (p && p.style.display === 'block') showPopupNear(anchorEl, g, lemma);
      });

      if (formaLexEl) formaLexEl.textContent = '…';
      if (entradaEl) entradaEl.textContent = '…';
      if (defEl) defEl.textContent = 'Cargando diccionario…';
    } else {
      var ent = getMasterEntryByLemma(lemma);

      if (!ent) {
        if (formaLexEl) formaLexEl.textContent = '—';
        if (entradaEl) entradaEl.textContent = '—';
        if (defEl) defEl.textContent = 'No hay entrada para este lemma en masterdiccionario.';
      } else {
        // Solo lo pedido, pero tolerante a variaciones de clave
        var formaLex = ent['Forma lexica'] || ent['forma_lexica'] || ent['formaLexica'] || '—';
        var entrada = ent['entrada_impresa'] || ent['entrada impresa'] || ent['entrada'] || '—';
        var definicion = ent['definicion'] || ent['definición'] || ent['def'] || '—';

        if (formaLexEl) formaLexEl.textContent = formaLex;
        if (entradaEl) entradaEl.textContent = entrada;
        if (defEl) defEl.textContent = definicion;
         // Solo cargar equivalencias si faltan campos clave.
        if (isMissingValue(definicion) || isMissingValue(entrada)) {
          loadEquivDictionaryOnce().then(function () {
            var p = document.getElementById('gk-lex-popup');
            if (!p || p.style.display !== 'block') return;
            var currentLemma = document.getElementById('gk-lex-lemma');
            if (!currentLemma || currentLemma.textContent !== (lemma || '—')) return;

            var equivDef = getEquivDefByLemma(lemma);
            if (!equivDef) return;

            var entradaNow = entradaEl ? entradaEl.textContent : '';
            var defNow = defEl ? defEl.textContent : '';

            if (defEl && isMissingValue(defNow)) {
              defEl.textContent = equivDef;
            }
            if (entradaEl && isMissingValue(entradaNow)) {
              entradaEl.textContent = equivDef;
            }
          });
        }
      }
    }
if (lxxEl) {
      lxxEl.innerHTML = '<div class="lxx-row muted">Buscando coincidencias en LXX…</div>';
    }

    box.style.display = 'block';
    setPopupExpanded(false);
    
    var r = anchorEl.getBoundingClientRect();
    var pad = 10;
box.style.maxHeight = 'calc(100vh - ' + (pad * 2) + 'px)';
    var bw = box.offsetWidth;
    var bh = box.offsetHeight;

    var left = r.left + (r.width / 2) - (bw / 2);
    var top = r.bottom + 8;

    if (left < pad) left = pad;
    if (left + bw > window.innerWidth - pad) left = window.innerWidth - pad - bw;

    if (top + bh > window.innerHeight - pad) {
      top = r.top - bh - 8;
      if (top < pad) top = pad;
    }

    box.style.left = Math.round(left) + 'px';
    box.style.top = Math.round(top) + 'px';
     var lxxKey = normalizeGreekLemmaKey(lemma || g);
    box.setAttribute('data-lxx-key', lxxKey);

    findLxxSamples(lemma || g, 4).then(function (samples) {
      var p = document.getElementById('gk-lex-popup');
      if (!p || p.style.display !== 'block') return;
      if (p.getAttribute('data-lxx-key') !== lxxKey) return;
      var lxxTarget = document.getElementById('gk-lex-lxx');
      if (!lxxTarget) return;
      lxxTarget.innerHTML = renderLxxItems(samples);
    });
  }

  function hidePopup() {
    var box = document.getElementById('gk-lex-popup');
    if (!box) return;
    popupDrag = null;
    box.style.display = 'none';
  }

  // -------------------- DOM robust: localizar versos + extraer capítulo/verso --------------------
  function parseRefString(s) {
    // soporta "1:1", "juan 1:1", "Jn 1:1", "1.1", etc.
    if (!s) return null;
    s = String(s).trim();

    // busca patrón capítulo:verso
    var m = s.match(/(\d{1,3})\s*[:.]\s*(\d{1,3})/);
    if (!m) return null;

    var ch = parseInt(m[1], 10);
    var v = parseInt(m[2], 10);
    if (!ch || !v) return null;

    return { ch: ch, v: v };
  }

  function getChVFromElement(lineEl) {
    if (!lineEl) return null;

    // intenta varias claves
    var ds = lineEl.dataset || {};

    var ch =
      parseInt(ds.chapter || ds.ch || ds.c || lineEl.getAttribute('data-chapter') || lineEl.getAttribute('data-ch') || lineEl.getAttribute('data-c') || '0', 10);

    var v =
      parseInt(ds.verse || ds.v || lineEl.getAttribute('data-verse') || lineEl.getAttribute('data-v') || '0', 10);

    if (ch && v) return { ch: ch, v: v };

    // intenta data-ref / data-vref / id / aria-label
    var ref =
      ds.ref || ds.vref || lineEl.getAttribute('data-ref') || lineEl.getAttribute('data-vref') ||
      lineEl.id || lineEl.getAttribute('aria-label') || '';

    var parsed = parseRefString(ref);
    if (parsed) return parsed;

    // si el elemento .verse-text trae el ref en parent/ancestro
    var p = lineEl.parentElement;
    while (p && p !== document.body) {
      var pds = p.dataset || {};
      var pref = pds.ref || pds.vref || p.getAttribute('data-ref') || p.getAttribute('data-vref') || p.id || '';
      parsed = parseRefString(pref);
      if (parsed) return parsed;
      p = p.parentElement;
    }

    return null;
  }

  function findGreekLines(rootEl) {
    // intenta varios selectores comunes
    var selectors = [
      '.verse-line[data-side="orig"]',
      '.verse-line[data-side="gr"]',
      '.verse-line.orig',
      '.verse-line.greek',
      '.verse[data-side="orig"]',
      '.verse.orig',
      '.verse.greek',
      '.verse-line',
      '.verse'
    ];

    for (var i = 0; i < selectors.length; i++) {
      var list = rootEl.querySelectorAll(selectors[i]);
      if (list && list.length) return list;
    }
    return [];
  }

  function findVerseTextNode(lineEl) {
    if (!lineEl) return null;
    // intenta varios contenedores típicos del texto
    return lineEl.querySelector('.verse-text') ||
           lineEl.querySelector('.text') ||
           lineEl.querySelector('[data-role="verse-text"]') ||
           lineEl;
  }

  // -------------------- decorate --------------------
  function decorateVerseText(vt, ch, v) {
    if (!vt) return;

    // evita redecorar
    if (vt.getAttribute('data-gk-decorated') === '1') return;

    var tokens = getTokens(ch, v);
    if (!tokens || !tokens.length) return;

    // Construye HTML preservando espacios básicos:
    // - Separa por espacio entre tokens de letras
    // - No agrega espacio antes de signos comunes
    var html = '';
    var prevWasWord = false;

    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      if (!t) continue;

      var g = (t.g != null) ? String(t.g) : '';
      var lemma = (t.lemma != null) ? String(t.lemma) : '';
      var tr = (t.tr != null) ? String(t.tr) : '';

      if (!g) continue;

      var isPunct = /^[··.,;:!?·…—–“”"'\)\]\}]+$/.test(g);
      var isOpenPunct = /^[\(\[\{“"']+$/.test(g);

      if (html) {
        if (!isPunct && !isOpenPunct && prevWasWord) html += ' ';
        if (isOpenPunct && prevWasWord) html += ' ';
      }

      html += '<span class="gk-w" data-lemma="' + escAttr(lemma) + '" data-tr="' + escAttr(tr) + '">' +
        escHtml(g) + '</span>';

      prevWasWord = !isPunct;
    }

    if (html) {
      vt.innerHTML = html;
      vt.setAttribute('data-gk-decorated', '1');
    }
  }

  function decorateVisibleOrigPanel(rootEl) {
    if (!rootEl) return;

    var lines = findGreekLines(rootEl);
    if (!lines || !lines.length) return;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
       if (line.classList && line.classList.contains('interlinear-verse')) continue;
      if (line.querySelector && line.querySelector('.interlinear-grid, .interlinear-original')) continue;
      var ref = getChVFromElement(line);
      if (!ref) continue;

      var vt = findVerseTextNode(line);
      if (!vt) continue;

      decorateVerseText(vt, ref.ch, ref.v);
    }
  }

  // -------------------- click handler --------------------
  function attachLeftClickHandler(rootEl) {
    if (!rootEl) return;

    if (rootEl.getAttribute('data-gk-leftclick') === '1') return;
    rootEl.setAttribute('data-gk-leftclick', '1');

    rootEl.addEventListener('click', function (ev) {
      if (ev.button !== 0) return;
      if (!morphMap) return;

      var t = ev.target;
      if (!t) return;
var interlinearWord = null;
      if (t.classList && t.classList.contains('interlinear-greek')) {
        interlinearWord = t;
      } else if (t.closest) {
        interlinearWord = t.closest('.interlinear-greek');
      }

      if (interlinearWord) {
        var line = interlinearWord.closest ? interlinearWord.closest('.verse-line') : null;
        var ref = getChVFromElement(line);
        if (!ref) return;

        var interlinearSurface = interlinearWord.textContent || '';
        var resolved = resolveLemmaFromMorph(ref.ch, ref.v, interlinearSurface);

        ev.stopPropagation();
        showPopupNear(interlinearWord, interlinearSurface, resolved.lemma);
        return;
      }
      if (!t.classList || !t.classList.contains('gk-w')) return;

      var sel = window.getSelection ? window.getSelection() : null;
      if (sel && String(sel).trim().length > 0) return;

      var lemma = t.getAttribute('data-lemma') || '';
      var tr = normalizeTranslit(t.getAttribute('data-tr') || '');
      var g = t.textContent || '';

      ev.stopPropagation();
showPopupNear(t, g, lemma);
    }, false);
  }
function resolveLemmaFromMorph(ch, v, surface) {
    var fallback = {
      lemma: normalizeGreekToken(surface || '') || String(surface || '').trim(),
      tr: ''
    };

    var tokens = getTokens(ch, v);
    if (!tokens || !tokens.length) return fallback;

    var normalizedSurface = normalizeGreekToken(surface || '');
    if (!normalizedSurface) return fallback;

    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];
      if (!token || token.g == null) continue;

      if (normalizeGreekToken(String(token.g)) !== normalizedSurface) continue;

      return {
        lemma: String(token.lemma || '').trim() || fallback.lemma,
        tr: normalizeTranslit(token.tr || '')
      };
    }

    return fallback;
  }
  // -------------------- load per book --------------------
  function clearMorph() {
    morphKey = null;
    morphMap = null;
    hidePopup();
  }

  function loadMorphForCurrentBook() {
    var slug = getBookSlug();
    var abbr = slugToAbbr(slug);

    if (!abbr) {
      clearMorph();
      return Promise.resolve(false);
    }

    if (morphKey === abbr && morphMap) return Promise.resolve(true);

    var url = getMorphUrl(abbr);

    return fetch(url, { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) {
          clearMorph();
          return false;
        }
        return res.json().then(function (data) {
          morphKey = abbr;
          morphMap = buildMorphIndex(data, abbr);
          if (!morphMap) {
            clearMorph();
            return false;
          }
          return true;
        });
      })
      .catch(function () {
        clearMorph();
        return false;
      });
  }

  // -------------------- scheduler (debounce) --------------------
  function scheduleWork(rootEl) {
    if (decorating) return;
    if (scheduled) return;

    scheduled = true;
    scheduleTimer = setTimeout(function () {
      scheduled = false;
      runWork(rootEl);
    }, 30);
  }

  function runWork(rootEl) {
    if (decorating) return;
    decorating = true;

    loadMorphForCurrentBook()
      .then(function () {
        decorateVisibleOrigPanel(rootEl);
        attachLeftClickHandler(rootEl);
      })
      .catch(function () {
        // si algo falla, al menos no rompe la UI
      })
      .finally(function () {
        decorating = false;
      });
  }

  // Polyfill simple para finally (por si acaso)
  if (!Promise.prototype.finally) {
    Promise.prototype.finally = function (cb) {
      var P = this.constructor;
      return this.then(
        function (value) { return P.resolve(cb()).then(function () { return value; }); },
        function (reason) { return P.resolve(cb()).then(function () { throw reason; }); }
      );
    };
  }

  // -------------------- observer --------------------
  function observeOrigPanel() {
    if (observing) return;

    var rootEl = document.getElementById('passageTextOrig');
    if (!rootEl) return;

    observing = true;

    var obs = new MutationObserver(function () {
      if (decorating) return;
      scheduleWork(rootEl);
    });

    obs.observe(rootEl, { childList: true, subtree: true });

    // primer run
    scheduleWork(rootEl);
  }

  function init() {
    // Carga masterdiccionario 1 vez
    loadMasterDictionaryOnce();
    observeOrigPanel();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.GreekLexicon = { init: init };
})();
