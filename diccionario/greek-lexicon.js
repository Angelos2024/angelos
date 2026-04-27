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
  var TRILINGUE_NT_DIR = './dic/trilingueNT/';
  var LXX_DIR = './LXX/';
  var GREEK_INDEX_PATH = './search/index-gr.json';
  var TEXT_BASE = './search/texts';
  var masterDictIndex = null;   // Map<lemma, item>
  var masterDictNormIndex = null; // Map<lemma_normalizado, item>
  var masterDictLoaded = false;
  var masterDictItems = [];
  var trilingueNtLoaded = false;
  var trilingueNtEntries = [];
  var lxxCache = new Map(); // Map<lemma_normalizado, samples[]>
  var ntGreekIndexPromise = null;
  var ntGreekChapterCache = new Map();
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
  var TRILINGUE_NT_FILES = [
    '01JuanEF.json','02MateoEf.json','03MarcosEF.json','04LucasEF.json','05HechosEF.json','06JacoboEF.json',
    '07Pedro1EF.json','08Pedro2EF.json','09JudasEF.json','10Juan1EF.json','11Juan2EF.json','12Juan3EF.json',
    '13GálatasEF.json','14Tesalonicenses1EF.json','15Tesalonicenses2EF.json','16Corintios1EF.json','17Corintios2EF.json',
    '18RomanosEF.json','19EfesiosEF.json','20Filipenses.json','21ColosensesEF.json','22HebreosEF.json','23FilemónEF.json',
    '24Timoteo1EF.json','25TitoEF.json','26Timoteo2EF.json','27ApocalipsisEF.json'
  ];

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

  function canonicalGreekKey(s) {
    return normalizeGreekToken(s)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\u200b-\u200d\u2060\ufeff]/g, '')
      .replace(/\s+/g, '')
      .toLowerCase()
      .replace(/\u03c2/g, '\u03c3')
      .replace(/\u03f2/g, '\u03c3');
  }

  function normalizeGreekLemmaKey(s) {
    return canonicalGreekKey(s);
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

  function loadNtGreekIndexOnce() {
    if (ntGreekIndexPromise) return ntGreekIndexPromise;
    ntGreekIndexPromise = fetch(GREEK_INDEX_PATH, { cache: 'force-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('No se pudo cargar index-gr.json (' + r.status + ')');
        return r.json();
      })
      .catch(function () {
        ntGreekIndexPromise = Promise.resolve({ tokens: {} });
        return ntGreekIndexPromise;
      });
    return ntGreekIndexPromise;
  }

  function loadNtGreekChapterText(book, chapter) {
    var key = String(book || '') + '|' + String(chapter || '');
    if (ntGreekChapterCache.has(key)) return ntGreekChapterCache.get(key);
    var promise = fetch(TEXT_BASE + '/gr/' + book + '/' + chapter + '.json', { cache: 'force-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('No se pudo cargar texto griego');
        return r.json();
      })
      .catch(function () { return []; });
    ntGreekChapterCache.set(key, promise);
    return promise;
  }

  function formatNtRef(book, chapter, verse) {
    var label = String(book || '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, function (m) { return m.toUpperCase(); });
    return label + ' ' + chapter + ':' + verse;
  }

  function buildNtGreekSamples(normalizedGreek, max) {
    var normalized = normalizeGreekLemmaKey(normalizedGreek || '');
    if (!normalized) return Promise.resolve([]);
    return loadNtGreekIndexOnce().then(function (index) {
      var refs = (index && index.tokens && index.tokens[normalized]) || [];
      if (!refs.length) return [];
      var tasks = refs.slice(0, max || 4).map(function (ref) {
        var parts = String(ref || '').split('|');
        var book = parts[0] || '';
        var chapter = Number(parts[1]);
        var verse = Number(parts[2]);
        if (!book || !chapter || !verse) return Promise.resolve(null);
        return loadNtGreekChapterText(book, chapter).then(function (verses) {
          return {
            ref: formatNtRef(book, chapter, verse),
            text: String((verses && verses[verse - 1]) || '').trim()
          };
        }).catch(function () {
          return {
            ref: formatNtRef(book, chapter, verse),
            text: ''
          };
        });
      });
      return Promise.all(tasks).then(function (items) {
        return items.filter(Boolean);
      });
    });
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
    masterDictItems = masterObj.items.slice();
    var m = new Map();
    masterDictNormIndex = new Map();
    for (var i = 0; i < masterObj.items.length; i++) {
      var it = masterObj.items[i];
      if (!it || !it.lemma) continue;
      m.set(it.lemma, it);
      var norm = normalizeGreekLemmaKey(it.lemma);
      if (norm && !masterDictNormIndex.has(norm)) {
        masterDictNormIndex.set(norm, it);
      }
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
        masterDictNormIndex = null;
        return null;
      });
  }

  function getMasterEntryByLemma(lemma) {
    if (!lemma || !masterDictIndex) return null;
    var exact = masterDictIndex.get(lemma);
    if (exact) return exact;
    var norm = normalizeGreekLemmaKey(lemma);
    if (!norm || !masterDictNormIndex) return null;
    return masterDictNormIndex.get(norm) || null;
  }
  function parseJsonArrayChunks(raw) {
    var text = String(raw || '').trim();
    if (!text) return [];
    try {
      var parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {}

    var rows = [];
    var depth = 0;
    var chunkStart = -1;
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      if (ch === '[') {
        if (depth === 0) chunkStart = i;
        depth++;
      } else if (ch === ']') {
        depth--;
        if (depth === 0 && chunkStart >= 0) {
          try {
            var block = JSON.parse(text.slice(chunkStart, i + 1));
            if (Array.isArray(block)) rows = rows.concat(block);
          } catch (_) {}
          chunkStart = -1;
        }
      }
    }
    return rows;
  }

  function loadTrilingueNtOnce() {
    if (trilingueNtLoaded) return Promise.resolve(trilingueNtEntries);
    trilingueNtLoaded = true;
    return Promise.all(TRILINGUE_NT_FILES.map(function (file) {
      return fetch(TRILINGUE_NT_DIR + file, { cache: 'no-store' })
        .then(function (r) {
          if (!r.ok) return [];
          return r.text().then(parseJsonArrayChunks);
        })
        .catch(function () { return []; });
    })).then(function (payloads) {
      trilingueNtEntries = [].concat.apply([], payloads).filter(function (entry) {
        return entry && typeof entry === 'object';
      });
      return trilingueNtEntries;
    }).catch(function () {
      trilingueNtEntries = [];
      return trilingueNtEntries;
    });
  }

  function tokenizeGreekComparable(text) {
    return String(text || '')
      .split(/[^Ͱ-Ͽἀ-῿]+/i)
      .map(function (token) { return normalizeGreekLemmaKey(token); })
      .filter(Boolean);
  }

  function normalizeHebrewComparable(text) {
    return String(text || '')
      .normalize('NFC')
      .replace(/[\u0591-\u05C7]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function uniqueStrings(values) {
    var seen = new Set();
    var out = [];
    (values || []).forEach(function (value) {
      var text = String(value || '').trim();
      if (!text || seen.has(text)) return;
      seen.add(text);
      out.push(text);
    });
    return out;
  }

  function collectFormsForLemma(lemma, max) {
    var normalized = normalizeGreekLemmaKey(lemma);
    if (!normalized || !morphMap || !Array.isArray(morphMap.segs)) return [];
    var seen = new Set();
    var forms = [];
    for (var segIndex = 0; segIndex < morphMap.segs.length; segIndex++) {
      var segment = morphMap.segs[segIndex];
      if (!Array.isArray(segment)) continue;
      for (var i = 0; i < segment.length; i++) {
        var verseTokens = segment[i];
        if (!Array.isArray(verseTokens)) continue;
        for (var j = 0; j < verseTokens.length; j++) {
          var token = verseTokens[j];
          if (!token) continue;
          if (normalizeGreekLemmaKey(token.lemma || '') !== normalized) continue;
          var surface = String(token.w || '').trim();
          if (!surface || seen.has(surface)) continue;
          seen.add(surface);
          forms.push(surface);
          if (max && forms.length >= max) return forms;
        }
      }
    }
    return forms;
  }

  function getGreekStemCandidates(lemma) {
    var normalized = normalizeGreekLemmaKey(lemma);
    if (!normalized) return [];
    var endings = ['ομαι', 'εις', 'ειν', 'ειος', 'ικος', 'ικη', 'ικον', 'σιμος', 'σιμον', 'της', 'σις', 'μα', 'μος', 'τηρ', 'τον', 'τος', 'ον', 'ος', 'η', 'α', 'ω'];
    var stems = [];
    function pushStem(value) {
      if (!value || value.length < 3) return;
      if (stems.indexOf(value) >= 0) return;
      stems.push(value);
    }
    pushStem(normalized);
    for (var i = 0; i < endings.length; i++) {
      var ending = endings[i];
      if (normalized.length <= ending.length + 1) continue;
      if (!normalized.endsWith(ending)) continue;
      pushStem(normalized.slice(0, -ending.length));
    }
    return stems.sort(function (a, b) { return b.length - a.length; });
  }

  function extractGreekLemmaFromDefinition(definition) {
    var text = String(definition || '');
    if (!text) return '';
    var patterns = [
      /adj\.\s+verbal\s+de\s+([Ͱ-Ͽἀ-῿]+)/i,
      /del cual\s+([Ͱ-Ͽἀ-῿]+)\s+es el verbo/i,
      /\bde\s+([Ͱ-Ͽἀ-῿]+)\b/i
    ];
    for (var i = 0; i < patterns.length; i++) {
      var match = text.match(patterns[i]);
      if (match && match[1]) return match[1];
    }
    return '';
  }

  function resolveGreekRootInfo(entry, lemma) {
    var targetLemma = String((entry && entry.lemma) || lemma || '').trim();
    var targetNorm = normalizeGreekLemmaKey(targetLemma);
    var directRootLemma = extractGreekLemmaFromDefinition(entry && entry.definicion);
    var directRootEntry = directRootLemma ? getMasterEntryByLemma(directRootLemma) : null;
    if (directRootEntry) {
      return {
        lemma: directRootEntry.lemma || directRootLemma,
        definition: directRootEntry.definicion || (entry && entry.definicion) || '—'
      };
    }

    if (targetNorm && (targetNorm.endsWith('ω') || targetNorm.endsWith('ομαι'))) {
      return {
        lemma: targetLemma || '—',
        definition: (entry && entry.definicion) || '—'
      };
    }

    var stems = getGreekStemCandidates(targetLemma);
    var candidates = [];
    for (var i = 0; i < masterDictItems.length; i++) {
      var item = masterDictItems[i];
      if (!item || !item.lemma) continue;
      var itemNorm = normalizeGreekLemmaKey(item.lemma);
      if (!itemNorm || itemNorm === targetNorm) continue;
      for (var j = 0; j < stems.length; j++) {
        if (itemNorm.indexOf(stems[j]) === 0) {
          candidates.push(item);
          break;
        }
      }
    }
    candidates.sort(function (a, b) {
      var aNorm = normalizeGreekLemmaKey(a.lemma);
      var bNorm = normalizeGreekLemmaKey(b.lemma);
      var aVerb = /ω$|ομαι$/.test(aNorm) ? 1 : 0;
      var bVerb = /ω$|ομαι$/.test(bNorm) ? 1 : 0;
      if (aVerb !== bVerb) return bVerb - aVerb;
      return aNorm.length - bNorm.length;
    });
    var rootEntry = candidates[0] || entry || null;
    return {
      lemma: (rootEntry && rootEntry.lemma) || targetLemma || '—',
      definition: (rootEntry && rootEntry.definicion) || (entry && entry.definicion) || '—'
    };
  }

  function findHebrewCorrespondences(greekValues, max) {
    var normalizedSet = new Set();
    (greekValues || []).forEach(function (value) {
      tokenizeGreekComparable(value).forEach(function (token) {
        normalizedSet.add(token);
      });
    });
    if (!normalizedSet.size) return [];

    var results = [];
    var seen = new Set();
    for (var i = 0; i < trilingueNtEntries.length; i++) {
      var entry = trilingueNtEntries[i];
      var greekTokens = tokenizeGreekComparable(entry.equivalencia_griega || entry.gr || entry.greek || '');
      var score = 0;
      for (var tokenIndex = 0; tokenIndex < greekTokens.length; tokenIndex++) {
        if (normalizedSet.has(greekTokens[tokenIndex])) score++;
      }
      var matched = score > 0;
      if (!matched) continue;
      var hebrew = normalizeHebrewComparable(entry.texto_hebreo || entry.he || '');
      var greekText = String(entry.equivalencia_griega || entry.gr || entry.greek || '').trim();
      var gloss = String(entry.equivalencia_espanol || entry.equivalencia_español || entry.es || '').trim();
      var dedupeKey = [
        hebrew,
        normalizeGreekLemmaKey(greekText),
        gloss.toLowerCase()
      ].join('|');
      if (!hebrew || seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      results.push({
        hebrew: hebrew,
        greek: greekText,
        gloss: gloss,
        score: score
      });
    }
    results.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return a.hebrew.localeCompare(b.hebrew);
    });
    return max ? results.slice(0, max) : results;
  }

  function renderHebrewCorrespondences(items, verseSamples) {
    if (!items || !items.length) {
      return '<div class="lxx-row muted">Sin correspondencia hebrea en el trilingüe.</div>';
    }
    var samples = Array.isArray(verseSamples) ? verseSamples : [];
    return items.map(function (item, index) {
      var sample = samples[index] || null;
      var ref = sample && sample.ref ? '<b>' + escHtml(sample.ref) + '</b> — ' : '';
      var text = sample && sample.text ? '<div class="muted" style="margin-top:2px">' + escHtml(sample.text) + '</div>' : '';
      var greek = item.greek ? ' <span class="muted">|</span> ' + escHtml(item.greek) : '';
      var gloss = item.gloss ? ' <span class="muted">|</span> ' + escHtml(item.gloss) : '';
      return '<div class="lxx-row">• ' + ref + '<b dir="rtl">' + escHtml(item.hebrew) + '</b>' + greek + gloss + text + '</div>';
    }).join('');
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
      '.gk-lex-popup .chips{ display:flex; flex-wrap:wrap; gap:6px; margin-top:6px; }' +
      '.gk-lex-popup .chip{ display:inline-flex; align-items:center; border:1px solid rgba(134,182,255,.45); background:rgba(71,123,214,.16); color:#e9eefc; border-radius:999px; padding:2px 10px; font-size:12px; }' +
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
'<div class="head"><button class="toggle" id="gk-lex-toggle" aria-expanded="false" type="button">Expandir</button><div class="t1" id="gk-lex-g"></div><button class="close" aria-label="Cerrar" type="button">&times;</button></div>' +
      '<div class="content collapsed" id="gk-lex-content">' +
      '<div class="summary">' +
      '<div class="t2"><span class="lab">Lemma:</span><span id="gk-lex-lemma"></span></div>' +
      '<div class="t2 row"><span class="lab">Forma léxica:</span><span id="gk-lex-forma-lex"></span></div>' +
      '<div class="t2 row"><span class="lab">Entrada impresa:</span><span id="gk-lex-entrada"></span></div>' +
  '<div class="t2"><span class="lab">Definición:</span><div id="gk-lex-def" class="def"></div></div>' +
      '</div>' +
      '<div class="details">' +
      '<hr class="sep" />' +
      '<div class="t2 row"><span class="lab">Formas:</span><div id="gk-lex-forms" class="chips"></div></div>' +
      '<div class="t2 row"><span class="lab">Raíz de:</span><span id="gk-lex-root-lemma"></span></div>' +
      '<div class="t2 row"><span class="lab" id="gk-lex-root-label">Definición de Raíz:</span><div id="gk-lex-root-def" class="def"></div></div>' +
      '<div class="t2"><span class="lab">LXX:</span></div>' +
'<div id="gk-lex-lxx" class="lxx"></div>' +
      '<hr class="sep" />' +
      '<div class="t2"><span class="lab">Correspondencia Hebrea:</span></div>' +
'<div id="gk-lex-hebrew" class="lxx"></div>' +
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

  function showPopupNear(anchorEl, g, lemma, tr) {
    ensurePopup();
    var box = document.getElementById('gk-lex-popup');
    if (!box) return;
    var ent = null;

    document.getElementById('gk-lex-g').textContent = g || '';
    document.getElementById('gk-lex-lemma').textContent = lemma || '—';

    var formaLexEl = document.getElementById('gk-lex-forma-lex');
    var entradaEl = document.getElementById('gk-lex-entrada');
    var defEl = document.getElementById('gk-lex-def');
    var formsEl = document.getElementById('gk-lex-forms');
    var rootLemmaEl = document.getElementById('gk-lex-root-lemma');
    var rootLabelEl = document.getElementById('gk-lex-root-label');
    var rootDefEl = document.getElementById('gk-lex-root-def');
    var hebrewEl = document.getElementById('gk-lex-hebrew');
    var lxxEl = document.getElementById('gk-lex-lxx');

    if (formsEl) formsEl.innerHTML = '<span class="chip muted">Buscando…</span>';
    if (rootLemmaEl) rootLemmaEl.textContent = '—';
    if (rootLabelEl) rootLabelEl.textContent = 'Definición de Raíz:';
    if (rootDefEl) rootDefEl.textContent = '—';
    if (hebrewEl) hebrewEl.innerHTML = '<div class="lxx-row muted">Buscando correspondencia hebrea…</div>';

    if (!masterDictIndex) {
      loadMasterDictionaryOnce().then(function () {
        var p = document.getElementById('gk-lex-popup');
        if (p && p.style.display === 'block') showPopupNear(anchorEl, g, lemma, tr);
      });

      if (formaLexEl) formaLexEl.textContent = '—';
      if (entradaEl) entradaEl.textContent = '—';
      if (defEl) defEl.textContent = 'Cargando diccionario…';
    } else {
      ent = getMasterEntryByLemma(lemma);

      if (!ent) {
        if (formaLexEl) formaLexEl.textContent = tr || '—';
        if (entradaEl) entradaEl.textContent = '—';
        if (defEl) defEl.textContent = 'No hay entrada para este lemma en masterdiccionario.';
      } else {
        var formaLex = ent['Forma lexica'] || ent['forma_lexica'] || ent['formaLexica'] || '—';
        var entrada = ent['entrada_impresa'] || ent['entrada impresa'] || ent['entrada'] || '—';
        var definicion = ent['definicion'] || ent['definici?n'] || ent['def'] || '—';

        if (formaLexEl) formaLexEl.textContent = !isMissingValue(formaLex) ? formaLex : (tr || '—');
        if (entradaEl) entradaEl.textContent = entrada;
        if (defEl) defEl.textContent = definicion;
      }
    }

    var forms = uniqueStrings(collectFormsForLemma(lemma || g, 12));
    if (formsEl) {
      formsEl.innerHTML = forms.length
        ? forms.map(function (form) { return '<span class="chip">' + escHtml(form) + '</span>'; }).join('')
        : '<span class="chip muted">Sin formas registradas en este libro.</span>';
    }

    var rootInfo = resolveGreekRootInfo(ent, lemma || g);
    if (rootLemmaEl) rootLemmaEl.textContent = rootInfo.lemma || '—';
    if (rootLabelEl) rootLabelEl.textContent = rootInfo.lemma ? ('Definición de ' + rootInfo.lemma + ':') : 'Definición de Raíz:';
    if (rootDefEl) rootDefEl.textContent = rootInfo.definition || '—';

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

    Promise.all([
      loadTrilingueNtOnce(),
      buildNtGreekSamples(lxxKey, 4)
    ]).then(function (payload) {
      var p = document.getElementById('gk-lex-popup');
      if (!p || p.style.display !== 'block') return;
      if (p.getAttribute('data-lxx-key') !== lxxKey) return;
      var hebrewTarget = document.getElementById('gk-lex-hebrew');
      if (!hebrewTarget) return;
      var verseSamples = payload && payload[1] ? payload[1] : [];
      hebrewTarget.innerHTML = renderHebrewCorrespondences(findHebrewCorrespondences([lemma, g], 4), verseSamples);
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
        showPopupNear(interlinearWord, interlinearSurface, resolved.lemma, resolved.tr);
        return;
      }
      if (!t.classList || !t.classList.contains('gk-w')) return;

      var sel = window.getSelection ? window.getSelection() : null;
      if (sel && String(sel).trim().length > 0) return;

      var lemma = t.getAttribute('data-lemma') || '';
      var tr = normalizeTranslit(t.getAttribute('data-tr') || '');
      var g = t.textContent || '';

      ev.stopPropagation();
showPopupNear(t, g, lemma, tr);
    }, false);
  }
function resolveLemmaFromMorph(ch, v, surface) {
    var fallback = {
      lemma: normalizeGreekToken(surface || '') || String(surface || '').trim(),
      tr: ''
    };

    var tokens = getTokens(ch, v);
    if (!tokens || !tokens.length) return fallback;

    var normalizedSurface = canonicalGreekKey(surface || '');
    if (!normalizedSurface) return fallback;

    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];
      if (!token || token.g == null) continue;

      if (canonicalGreekKey(String(token.g)) !== normalizedSurface) continue;

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
