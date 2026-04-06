(function (global) {


  const state = {
    loaded: false,
    loadPromise: null,
    entries: []
  };

  // Se consulta SOLAMENTE la carpeta solicitada por el usuario.
  const JSON_SOURCES = [
    { url: '../dic/diccionario_eric/diccionario_1tesalonicenses.json', book: '1 Tesalonicenses' },
    { url: '../dic/diccionario_eric/diccionario_2tesalonicenses.json', book: '2 Tesalonicenses' },
    { url: '../dic/diccionario_eric/diccionario_apocalipsis.json', book: 'Apocalipsis' },
    { url: '../dic/diccionario_eric/diccionario_salmos.json', book: 'Salmos' },
    { url: '../dic/diccionario_eric/diccionario_qohelet.json', book: 'Qohelet' },
    { url: '../dic/diccionario_eric/diccionario_shir_hashirim.json', book: 'Shir Hashirim' },
    { url: '../dic/diccionario_eric/diccionario_parashot.json', book: 'Parashot' }
  ];

  function normalize(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/ς/g, 'σ')
      .replace(/[\u0591-\u05C7]/g, '')
      .replace(/[.,;:!?“”"(){}\[\]<>«»'`´]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

 function normalizeSourceDisplay(value, lang) {
    const text = String(value || '').trim();
    if (!text) return '';

    if (lang === 'he') {
      return text
        .normalize('NFD')
        .replace(/[\u0591-\u05C7]/g, '')
        .normalize('NFC')
        .trim();
    }

    if (lang === 'gr') {
      return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .normalize('NFC')
        .trim();
    }

    return text;
  }

  function flattenPayload(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.entries)) return payload.entries;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  }

function extractJsonObjects(text) {
    const source = String(text || '');
    const objects = [];
    let depth = 0;
    let start = -1;
    let inString = false;
    let escape = false;

    for (let i = 0; i < source.length; i += 1) {
      const char = source[i];

      if (inString) {
        if (escape) {
          escape = false;
        } else if (char === '\\') {
          escape = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
        continue;
      }

      if (char === '{') {
        if (depth === 0) start = i;
        depth += 1;
        continue;
      }

      if (char === '}') {
        if (depth > 0) depth -= 1;
        if (depth === 0 && start >= 0) {
          const chunk = source.slice(start, i + 1);
          try {
            objects.push(JSON.parse(chunk));
          } catch (_) {
            // Ignora objetos aislados que sigan malformados.
          }
          start = -1;
        }
      }
    }

    return objects;
  }

  function parsePayloadFromText(text) {
    const source = String(text || '').trim();
    if (!source) return [];

    try {
      return flattenPayload(JSON.parse(source));
    } catch (_) {
      return extractJsonObjects(source);
    }
  }

  function hasHebrewChars(value) {
    return /[\u0590-\u05FF]/.test(String(value || ''));
  }

  function hasGreekChars(value) {
    return /[\u0370-\u03FF\u1F00-\u1FFF]/.test(String(value || ''));
  }

  function detectEntryLang(entry) {
    const sourceText = String(
      entry?.texto_hebreo ??
      entry?.he ??
      entry?.hebrew ??
      entry?.hebreo ??
      entry?.gr ??
      entry?.greek ??
      entry?.griego ??
      ''
    ).trim();

    if (hasHebrewChars(sourceText)) return 'he';
    if (hasGreekChars(sourceText)) return 'gr';
    return '';
  }

  async function fetchAllJsonCollections() {
    const merged = [];

    for (const source of JSON_SOURCES) {
      try {
        const response = await fetch(source.url, { cache: 'no-store' });
        if (!response.ok) continue;

         const rawText = await response.text();
        const rows = parsePayloadFromText(rawText);

        rows.forEach((entry) => {
          if (!entry || typeof entry !== 'object') return;

          merged.push({
            ...entry,
            book: entry.book || entry.libro || entry.book_name || entry.nombre_libro || source.book,
            __lang: detectEntryLang(entry),
            __sourceIndex: merged.length
                      });
        });
      } catch (_) {
        // Continúa con el siguiente archivo.
      }
    }

    return merged;
  }

  function ensureLoaded() {
    if (state.loaded) return Promise.resolve(state);
    if (state.loadPromise) return state.loadPromise;

    state.loadPromise = fetchAllJsonCollections()
      .then((rows) => {
        state.entries = rows;
        state.loaded = true;
        return state;
      })
      .catch(() => {
        state.entries = [];
        state.loaded = true;
        return state;
      });

    return state.loadPromise;
  }



  function getSourceText(entry) {
    return String(
      entry?.texto_hebreo ??
      entry?.he ??
      entry?.hebrew ??
      entry?.hebreo ??
      entry?.gr ??
      entry?.greek ??
      entry?.griego ??
      ''
    ).trim();
  }

  function getTexts(entry, lang) {
    const fields = lang === 'he'
      ? ['he', 'hebrew', 'hebreo', 'palabra', 'lemma', 'lemmas', 'texto_hebreo']
      : ['gr', 'greek', 'griego', 'lxx', 'lemma', 'lemmas', 'texto_hebreo'];

    const values = [];
    fields.forEach((field) => {
      const value = entry?.[field];
      if (Array.isArray(value)) {
        value.forEach((v) => values.push(String(v || '').trim()));
      } else if (value != null) {
        values.push(String(value).trim());
      }
    });

    return values
      .filter(Boolean)
      .filter((value) => (lang === 'he' ? hasHebrewChars(value) : hasGreekChars(value)));
  }

  function getSpanishTexts(entry) {
    const fields = ['es', 'spanish', 'espanol', 'español', 'equivalencia_espanol', 'equivalencia_español', 'traduccion'];
    const values = [];
    fields.forEach((field) => {
      const value = entry?.[field];
      if (Array.isArray(value)) {
        value.forEach(v => values.push(String(v || '').trim()));
      } else if (value != null) {
        values.push(String(value).trim());
      }
    });
    return values.filter(Boolean);
  }

  function collectSearchTerms(rawTerms, lang) {
    return rawTerms
      .map((term) => String(term || '').trim())
      .filter(Boolean)
      .filter((term) => (lang === 'he' ? hasHebrewChars(term) : hasGreekChars(term)))
      .map(normalize)
      .filter(Boolean);
  }

  function collectSpanishTerms(rawTerms) {
    return rawTerms
      .map((term) => String(term || '').trim())
      .filter(Boolean)
      .filter((term) => !hasHebrewChars(term) && !hasGreekChars(term))
      .map(normalize)
      .filter(Boolean);
  }

  function isExactNormalizedMatch(text, term) {
    return text === term;
  }

  
  function isPartialNormalizedMatch(text, term) {
    if (!text || !term) return false;
    if (text === term) return true;

 if (term.includes(' ')) {
      return text.includes(term);
          }

     const tokens = text.split(' ').filter(Boolean);
    return tokens.includes(term);
  }
       function filterMatchesByLanguageAndTerms(lang, terms, mode) {
    if (!terms.length) return [];

        const matcher = mode === 'partial' ? isPartialNormalizedMatch : isExactNormalizedMatch;

     return state.entries.filter((entry) => {
      if (lang === 'he' || lang === 'gr') {
        if ((entry?.__lang || detectEntryLang(entry)) !== lang) return false;
      }

      const texts = (lang === 'es' ? getSpanishTexts(entry) : getTexts(entry, lang)).map(normalize);
      if (!texts.length) return false;

      return terms.some((term) => texts.some((text) => matcher(text, term)));
    });
     }


  function runOrderedSearch(terms, mode) {
      const hebrewTerms = collectSearchTerms(terms, 'he');
    

   const hebrewMatches = filterMatchesByLanguageAndTerms('he', hebrewTerms, mode);
    if (hebrewMatches.length) return sortMatches(hebrewMatches);

    const greekTerms = collectSearchTerms(terms, 'gr');
   

       const greekMatches = filterMatchesByLanguageAndTerms('gr', greekTerms, mode);
    if (greekMatches.length) return sortMatches(greekMatches);


    const spanishTerms = collectSpanishTerms(terms);
 const spanishMatches = filterMatchesByLanguageAndTerms('es', spanishTerms, mode);
    if (spanishMatches.length) return sortMatches(spanishMatches);

    return [];
  }

  function sortMatches(entries) {
    return entries
      .map((entry, index) => ({ entry, index, rank: Number(entry?.__sourceIndex ?? Number.MAX_SAFE_INTEGER) }))
            .sort((a, b) => (a.rank - b.rank) || (a.index - b.index))
      .map((item) => item.entry);
  }

  function findFirstMatchByLanguageOrder(terms) {
    const exactMatches = runOrderedSearch(terms, 'exact');
    if (exactMatches.length) return exactMatches[0];

    const partialMatches = runOrderedSearch(terms, 'partial');
    return partialMatches[0] || null;
  }

function findMatchesByLanguageOrder(terms) {
    const exactMatches = runOrderedSearch(terms, 'exact');
    if (exactMatches.length) return exactMatches;

    return runOrderedSearch(terms, 'partial');
  }
  

  function collectDefinitions(matches, lang) {
    const seen = new Set();
    const out = [];

    for (const entry of matches) {
      const entryLang = entry?.__lang || detectEntryLang(entry);
      if (lang && entryLang && entryLang !== lang) continue;

      const text = String(entry?.observacion || '').trim();
      const key = normalize(text);
      if (!text || !key || seen.has(key)) continue;
      seen.add(key);
      out.push(text);
    }

    return out;
  }

   function buildEntryUniquenessKey(entry, lang) {
    return [
      lang || entry?.__lang || detectEntryLang(entry),
      normalize(getSourceText(entry)),
      normalize(String(entry?.transliteracion || '')),
      normalize((getSpanishTexts(entry)[0] || '')),
      normalize(String(entry?.observacion || ''))
    ].join('||');
  }

  function selectPrioritizedMatches(matches, lang, minCount = 3, maxCount = 4) {
    const byBook = new Map();
    const seenContent = new Set();

    for (const entry of matches) {
      const entryLang = entry?.__lang || detectEntryLang(entry);
      if (lang && entryLang && entryLang !== lang) continue;

      const uniqKey = buildEntryUniquenessKey(entry, entryLang);
      if (!uniqKey || seenContent.has(uniqKey)) continue;
      seenContent.add(uniqKey);

      const book = String(entry?.book || 'Sin contexto').trim() || 'Sin contexto';
      if (!byBook.has(book)) byBook.set(book, []);
      byBook.get(book).push(entry);
    }

    const selected = [];
    const selectedKeys = new Set();
    const books = Array.from(byBook.keys());

    for (const book of books) {
      const first = byBook.get(book)?.[0];
      if (!first) continue;
      const key = buildEntryUniquenessKey(first, first?.__lang || detectEntryLang(first));
      if (selectedKeys.has(key)) continue;
      selected.push(first);
      selectedKeys.add(key);
      if (selected.length >= maxCount) return selected;
    }

    if (selected.length >= minCount) return selected.slice(0, maxCount);

    for (const book of books) {
      const entries = byBook.get(book) || [];
      for (let i = 1; i < entries.length; i += 1) {
        const entry = entries[i];
        const key = buildEntryUniquenessKey(entry, entry?.__lang || detectEntryLang(entry));
        if (selectedKeys.has(key)) continue;
        selected.push(entry);
        selectedKeys.add(key);
        if (selected.length >= minCount) return selected.slice(0, maxCount);
      }
    }

    return selected.slice(0, maxCount);
  }

  function esc(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

function findMatchesByModeAndLanguage(terms, preferredLang, mode) {
    if (!(preferredLang === 'he' || preferredLang === 'gr')) return [];

    const languageTerms = collectSearchTerms(terms, preferredLang);
    const languageMatches = filterMatchesByLanguageAndTerms(preferredLang, languageTerms, mode);
    if (languageMatches.length) return sortMatches(languageMatches);

    const spanishTerms = collectSpanishTerms(terms);
    const spanishMatches = filterMatchesByLanguageAndTerms('es', spanishTerms, mode);
    if (spanishMatches.length) {
      return sortMatches(spanishMatches).filter((entry) => (entry?.__lang || detectEntryLang(entry)) === preferredLang);
    }

    return [];
  }

  function findMatchesForLanguage(terms, preferredLang) {
      if (preferredLang === 'he' || preferredLang === 'gr') {
     const exactMatches = findMatchesByModeAndLanguage(terms, preferredLang, 'exact');
      if (exactMatches.length) return exactMatches;

      const partialMatches = findMatchesByModeAndLanguage(terms, preferredLang, 'partial');
      if (partialMatches.length) return partialMatches;

      const fallbackLang = preferredLang === 'he' ? 'gr' : 'he';
      const fallbackExactMatches = findMatchesByModeAndLanguage(terms, fallbackLang, 'exact');
      if (fallbackExactMatches.length) return fallbackExactMatches;

      const fallbackPartialMatches = findMatchesByModeAndLanguage(terms, fallbackLang, 'partial');
      if (fallbackPartialMatches.length) return fallbackPartialMatches;

      return [];
    }

    return findMatchesByLanguageOrder(terms);
  }

  function buildPreferredTerms(rawQuery, primaryEntry, options = {}) {
    const preferredLang = options?.lang === 'he' || options?.lang === 'gr' ? options.lang : '';
    const tableValue = String(options?.tableValue || '').trim();
    const languageSpecificTerms = preferredLang === 'gr'
      ? [
          tableValue,
          primaryEntry?.gr,
          primaryEntry?.greek,
          primaryEntry?.griego,
          primaryEntry?.equivalencia_griega,
          primaryEntry?.texto_hebreo
        ]
      : preferredLang === 'he'
        ? [
            tableValue,
            primaryEntry?.he,
            primaryEntry?.hebrew,
            primaryEntry?.hebreo,
            primaryEntry?.palabra,
            primaryEntry?.lemma,
            primaryEntry?.lemmas,
            primaryEntry?.texto_hebreo
          ]
        : [];

    return [
      ...languageSpecificTerms,
      rawQuery,
      
      primaryEntry?.equivalencia_espanol,
      primaryEntry?.equivalencia_español,
      primaryEntry?.es,
      primaryEntry?.spanish
    ].filter(Boolean);
 }

  function renderEricDictionaryCell(rawQuery, primaryEntry, options = {}) {
    const preferredLang = options?.lang === 'he' || options?.lang === 'gr' ? options.lang : '';
    const terms = buildPreferredTerms(rawQuery, primaryEntry, options);

    const matches = findMatchesForLanguage(terms, preferredLang);
 const strictMatches = preferredLang
      ? matches.filter((entry) => (entry?.__lang || detectEntryLang(entry)) === preferredLang)
      : matches;
    const hit = strictMatches[0] || null;

    if (!hit) {
 return '';
    }

    const sourceText = getSourceText(hit);
    const detectedLang = hit?.__lang || detectEntryLang(hit) || preferredLang;
    const prioritized = selectPrioritizedMatches(strictMatches, detectedLang, 3, 4);
     const renderedEntries = prioritized.map((entry, index) => {
      const entryLang = entry?.__lang || detectEntryLang(entry);
      const sourceTextValue = getSourceText(entry) || sourceText || '—';
      const normalizedSource = normalizeSourceDisplay(sourceTextValue, entryLang) || '—';
      const spanish = getSpanishTexts(entry)[0] || '—';
      const transliteracion = String(entry?.transliteracion || '').trim() || '—';
      const definicion = String(entry?.observacion || '').trim() || '—';
      const book = String(entry?.book || 'Sin contexto').trim() || 'Sin contexto';
              const langLabel = entryLang === 'gr' ? 'Griego' : entryLang === 'he' ? 'Hebreo' : 'Sin clasificar';

      
 const contextLine = `<div class="trilingual-line"><strong>Contexto:</strong> ${esc(book)}</div>`;
       const details = index === 0
        ? `
          <div class="trilingual-line"><strong>Idioma detectado:</strong> ${esc(langLabel)}</div>          <div class="trilingual-line"><strong>Transliteración:</strong> ${esc(transliteracion)}</div>
          <div class="trilingual-line"><strong>Equivalencia español:</strong> ${esc(spanish)}</div>
           <div class="trilingual-line"><strong>Fuente normalizada:</strong> ${esc(normalizedSource)}</div>
          ${contextLine}
          <div class="trilingual-line"><strong>Definición:</strong> ${esc(definicion).replace(/\n/g, '<br>')}</div>
        `
        : `
          ${contextLine}
          <div class="trilingual-line"><strong>Definición:</strong> ${esc(definicion).replace(/\n/g, '<br>')}</div>
            `;

      return `
        <div class="dict-entry${index ? ' mt-3' : ''}">
          ${details}
        </div>
      `;
    }).join('');

    return `
      <div class="trilingual-brief mt-3 dict-entry">
        <div class="dict-entry-header">
          <div class="dict-entry-kicker">Diccionario · Prof. Eric de Jesús Rodríguez Mendoza</div>
        </div>
  ${renderedEntries}
      </div>
    `;
  }

  global.AnalisisDiccionarioBEric = {
    ensureLoaded,
    renderEricDictionaryCell
  };
})(window);
