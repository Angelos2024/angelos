/* split: core */
  function debounce(fn, delayMs = 250) {
    let timerId = null;
    return (...args) => {
      if (timerId) clearTimeout(timerId);
      timerId = setTimeout(() => {
        timerId = null;
        fn(...args);
      }, delayMs);
    };
  }

  function hasTokenWithMinLength(query, minLength = 3) {
    return String(query || '')
      .split(/\s+/)
      .map((token) => token.trim())
      .some((token) => token.length >= minLength);
  }

function countHebrewConsonants(text) {
    return (String(text || '').match(/[א-ת]/g) || []).length;
  }

  function getSearchValidation(term) {
    const raw = String(term || '').trim();
    if (!raw) return { ok: false, message: '' };

    const lang = detectLang(raw);
    const normalized = normalizeByLang(raw, lang);
    const minLetters = lang === 'he' ? countHebrewConsonants(normalized) : normalized.length;

    if (minLetters < 2) {
      return {
        ok: false,
        lang,
        message: lang === 'he'
          ? 'En hebreo debes escribir al menos 2 consonantes para buscar.'
          : 'Debes escribir al menos 2 letras para buscar en español o griego.'
      };
    }

    return { ok: true, lang, normalized };
  }

  function setValidationMessage(message = '') {
    if (!validationMessage) return;
    validationMessage.textContent = message;
  }
  function throwIfAborted(signal) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
  }
  function scrollToLemmaSummary() {
    if (!lemmaSummaryPanel) {
      analysisResultsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const topbar = document.querySelector('.topbar');
    const topbarHeight = topbar ? topbar.getBoundingClientRect().height : 0;
    const top = window.scrollY + lemmaSummaryPanel.getBoundingClientRect().top - topbarHeight - 12;
    window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
  }

  function setLoading(isLoading) {
    state.isLoading = isLoading;
  
   if (resultsLoadingIndicator) resultsLoadingIndicator.hidden = !isLoading;
    if (resultsLoadingStage) resultsLoadingStage.hidden = !isLoading;
    if (resultsByCorpus) resultsByCorpus.hidden = isLoading;
    if (analyzeBtn) analyzeBtn.disabled = isLoading;
  }
 

  function normalizePhraseByLang(text, lang) {
    if (lang === 'he') {
      return String(text || '')
        .replace(/[\u200C-\u200F\u202A-\u202E]/g, '')
        .replace(/[\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C7]/g, '')
        .replace(/[׃.,;:!?()"“”'׳״]/g, ' ')
        .replace(/[\u05BE\-\u2010-\u2015\u2212]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
    if (lang === 'gr' || lang === 'lxx') {
      return String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .replace(/[··.,;:!?(){}\[\]<>«»]/g, ' ')
        .replace(/ς/g, 'σ')
        .replace(/\s+/g, ' ')
        .trim();
    }
    return String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9ñ\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function getNormalizedQueryTokens(term, lang, minLength = 3) {
    return String(term || '')
      .split(/\s+/)
      .map((token) => normalizeByLang(token, lang).trim())
      .filter((token) => token.length >= minLength);
  }
  function getRefsForTokenByLang(lang, token, index) {
    if (!token) return [];
    if (lang === 'gr') return getGreekRefs(token, index);
    if (lang === 'he') return getHebrewRefs(token, index);
return getSpanishRefs(token, index);
  }
  function getSpanishRefs(normalized, index) {
    if (!normalized) return [];
    const tokensMap = index.tokens || {};
    const direct = tokensMap[normalized] || [];
    const refs = direct.slice();
    const seen = new Set(refs);

    // Rendimiento: buckets por prefijo (2 letras) construidos una sola vez.
    if (!index.__tokenBucketsBuilt) {
      const buckets = new Map();
      Object.keys(tokensMap).forEach((tok) => {
        const t = String(tok || '');
        if (!t) return;
        const key = t.slice(0, 2);
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(t);
      });
      index.__tokenBuckets = buckets;
      index.__tokenBucketsBuilt = true;
    }

    const buckets = index.__tokenBuckets || new Map();
    const prefixKey = normalized.slice(0, 2);
    const candidates = buckets.get(prefixKey) || [];

    // Coincidencia parcial: token que contiene el término (mar => marcos, marítimo, etc.)
    for (let i = 0; i < candidates.length; i += 1) {
      const token = candidates[i];
      if (!token || token === normalized) continue;
      if (!token.includes(normalized)) continue;
      const matches = tokensMap[token] || [];
      for (let j = 0; j < matches.length; j += 1) {
        const ref = matches[j];
        if (seen.has(ref)) continue;
        seen.add(ref);
        refs.push(ref);
      }
    }

    return refs;
  }

  
  function getVerseTextFromChapter(verses, verseNumber) {
    if (!verses || !Number.isFinite(verseNumber)) return '';
    if (Array.isArray(verses)) return String(verses[verseNumber - 1] || '');
    if (typeof verses === 'object') {
      return String(
        verses[verseNumber] ??
        verses[String(verseNumber)] ??
        verses[verseNumber - 1] ??
        verses[String(verseNumber - 1)] ??
        ''
      );
    }
    return '';
  }

function containsHebrewTokenPhrase(normalizedVerse, phrase) {
    const verseTokens = String(normalizedVerse || '').split(/\s+/).filter(Boolean);
    const phraseTokens = String(phrase || '').split(/\s+/).filter(Boolean);
    if (!verseTokens.length || !phraseTokens.length) return false;
    for (let i = 0; i <= verseTokens.length - phraseTokens.length; i += 1) {
      let ok = true;
      for (let j = 0; j < phraseTokens.length; j += 1) {
        if (verseTokens[i + j] !== phraseTokens[j]) { ok = false; break; }
      }
      if (ok) return true;
    }
    return false;
  }

  async function filterRefsByPhrase(refs, lang, term, options = {}) {
    const phrase = normalizePhraseByLang(term, lang);
    if (!phrase || !refs.length) return refs;

    const filtered = [];
    for (const ref of refs) {
      throwIfAborted(options.signal);
      const [book, chapterRaw, verseRaw] = String(ref || '').split('|');
      const chapter = Number(chapterRaw);
      const verse = Number(verseRaw);
      if (!book || !Number.isFinite(chapter) || !Number.isFinite(verse)) continue;
      try {
        const verses = await loadChapterText(lang, book, chapter, options);
        const verseText = getVerseTextFromChapter(verses, verse);
        const normalizedVerse = normalizePhraseByLang(verseText, lang);
        const phraseMatch = lang === 'he'
          ? containsHebrewTokenPhrase(normalizedVerse, phrase)
          : normalizedVerse.includes(phrase);
        if (phraseMatch) {
          filtered.push(ref);
        }
      } catch (error) {
        if (isAbortError(error)) throw error;
      }
    }
    return filtered;
  }
  async function getRefsForQuery(term, lang, index, options = {}) {
    const normalized = normalizeByLang(term, lang);

    if (!normalized) return [];

    const tokenMinLength = lang === 'he' ? 2 : 3;
    const tokens = getNormalizedQueryTokens(term, lang, tokenMinLength);
    if (!tokens.length) return getRefsForTokenByLang(lang, normalized, index);

    const uniqueTokens = [...new Set(tokens)];
    const tokenRefLists = uniqueTokens
      .map((token) => getRefsForTokenByLang(lang, token, index))
      .filter((list) => Array.isArray(list) && list.length);

    if (!tokenRefLists.length) return [];

    let refs = tokenRefLists[0].slice();
    for (let i = 1; i < tokenRefLists.length; i += 1) {
      const lookup = new Set(tokenRefLists[i]);
      refs = refs.filter((ref) => lookup.has(ref));
      if (!refs.length) break;
    }

    if (uniqueTokens.length >= 2 && refs.length) {
      refs = await filterRefsByPhrase(refs, lang, term, options);
    }
    return refs;
  }
function getGreekRefs(normalized, index) {
    if (!normalized) return [];
    const keys = buildGreekSearchKeys(normalized);
    const refs = [];
    const seen = new Set();
    keys.forEach((key) => {
      const matches = index.tokens?.[key] || [];
      matches.forEach((ref) => {
        if (seen.has(ref)) return;
        seen.add(ref);
        refs.push(ref);
      });
    });
    return refs;
  }
   function getHebrewRefs(normalized, index) {
    if (!normalized) return [];
    const direct = index.tokens?.[normalized] || [];
    if (direct.length) return direct;

    const refs = [];
    const seen = new Set();
    Object.entries(index.tokens || {}).forEach(([token, matches]) => {
      if (!token || token === normalized) return;
      if (!token.endsWith(normalized)) return;
     const prefixLen = token.length - normalized.length;
      if (prefixLen < 0 || prefixLen > 3) return;
     (matches || []).forEach((ref) => {
        if (seen.has(ref)) return;
        seen.add(ref);
        refs.push(ref);
      });
    });
    return refs;
  }
async function loadJson(url, options = {}) {
   const { signal } = options;
 const failedRequest = failedJsonRequests.get(url);
    if (failedRequest && (Date.now() - failedRequest.timestamp) < JSON_RETRY_COOLDOWN_MS) {
      throw failedRequest.error;
    }

   if (jsonCache.has(url)) return jsonCache.get(url);
    const promise = fetch(url, { cache: 'force-cache', signal, priority: 'high'}).then((res) => {
     if (!res.ok) throw new Error(`No se pudo cargar ${url}`);
      return res.json();
    });
    jsonCache.set(url, promise);
    try {
    failedJsonRequests.delete(url);
      return await promise;
    } catch (error) {
      jsonCache.delete(url);
      if (isAbortError(error)) {
        throw error;
      }
const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      const isNetworkError = offline || error instanceof TypeError;
      const normalizedError = isNetworkError
        ? new Error(
          `Error de red cargando ${url}. Revisa si el navegador está en modo Offline (DevTools), ` +
          'si el servidor local está activo y si no hay un bloqueador/proxy interrumpiendo peticiones locales.'
        )
        : error;

      failedJsonRequests.set(url, { timestamp: Date.now(), error: normalizedError });
      throw normalizedError;
    }
  }

  async function loadDictionary(options = {}) {
   if (state.dict) return state.dict;
    const data = await loadJson(DICT_URL, options);
   state.dict = data;
    const map = new Map();
    const translitMap = new Map();
   const spanishMap = new Map();
    const definitionEntries = [];
   (data.items || []).forEach((item) => {
      const lemmaKey = normalizeGreek(item.lemma);
      const formKey = normalizeGreek(item['Forma flexionada del texto']);
      if (lemmaKey && !map.has(lemmaKey)) map.set(lemmaKey, item);
      if (formKey && !map.has(formKey)) map.set(formKey, item);
      const translitKeys = [
        ...buildTranslitVariants(item['Forma lexica']),
        ...buildTranslitVariants(item['Forma flexionada del texto'])
      ];
      translitKeys.forEach((key) => {
        if (!key || translitMap.has(key)) return;
        translitMap.set(key, item);
      });
      extractSpanishTokensFromDefinition(item?.definicion || '').forEach((token) => {
        if (!token) return;
        if (!spanishMap.has(token)) spanishMap.set(token, []);
        spanishMap.get(token).push(item);
      });
      definitionEntries.push({
        item,
        definitionPhrase: normalizeSpanishPhrase(item?.definicion || '')
      }); 
    });
    state.dictMap = map;
    state.dictTranslitMap = translitMap;
state.dictSpanishMap = spanishMap;
    state.dictDefinitionEntries = definitionEntries;
   return data;
  }
  async function findGreekEntryFromSpanish(term, options = {}) {
   if (!term) return null;
    await loadDictionary(options);
const tokens = String(term || '').split(/\s+/).filter(Boolean);
    const isMultiWord = tokens.length > 1;
    const stopwords = new Set(['el', 'la', 'los', 'las', 'de', 'del', 'y', 'o', 'en', 'un', 'una', 'al']);
    const normalizedPhrase = normalizeSpanishPhrase(term);
    const searchableTokens = tokens
      .map((token) => normalizeSpanish(token))
      .filter((token) => token && token.length >= 3 && !stopwords.has(token));
   const candidates = [term, ...tokens];
    for (const candidate of candidates) {
      const key = normalizeTransliteration(candidate);
      if (!key) continue;
      const entry = state.dictTranslitMap.get(key);
      if (entry) return entry;
    }
   if (isMultiWord && normalizedPhrase.length >= 5) {
      const ranked = (state.dictDefinitionEntries || [])
        .map(({ item, definitionPhrase }) => {
          if (!definitionPhrase) return null;
          let score = 0;
          if (definitionPhrase.includes(normalizedPhrase)) score += 8;
          if (definitionPhrase.startsWith(normalizedPhrase)) score += 2;
          searchableTokens.forEach((token) => {
            if (definitionPhrase.includes(token)) score += 1;
          });
          return score > 0 ? { item, score } : null;
        })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score);
      if (ranked[0]?.score >= 8) return ranked[0].item;
      return null;
    }
    for (const candidate of candidates) {
      const key = normalizeSpanish(candidate);
      if (!key || stopwords.has(key) || key.length < 3) continue;
     const spanishMatches = state.dictSpanishMap.get(key) || [];
      if (!spanishMatches.length) continue;
      const ranked = [...spanishMatches].sort((a, b) => {
        const score = (item) => {
          const def = normalizeSpanish(item?.definicion || '');
          const rawDef = String(item?.definicion || '').toLowerCase();
          let value = 0;
          const headDef = rawDef.replace(/nombre\s+prop\.?\s*/g, '').trim();
          if (rawDef.includes('nombre prop')) value -= 2;
         if (normalizeSpanish(headDef).startsWith(key)) value += 4;
          if (def.startsWith(key)) value += 3;
          if (def.includes(key)) value += 2;
          if (normalizeTransliteration(item?.['Forma flexionada del texto']).includes(key)) value += 1;
          return value;
        };
        return score(b) - score(a);
      });
      if (ranked[0]) return ranked[0];
    }
    return null;
  }
 async function loadHebrewDictionary(options = {}) {
  if (state.hebrewDict) return state.hebrewDict;
    const data = await loadJson(HEBREW_DICT_URL, options);
  state.hebrewDict = data;
    const map = new Map();
    (data || []).forEach((item) => {
     const keys = [
        item?.palabra,
        item?.lemma,
        item?.hebreo,
        item?.forma,
        ...(item?.forms || []),
        ...(item?.formas || []),
        ...(item?.hebreos || [])
      ]
        .map((token) => normalizeHebrew(token || ''))
        .filter(Boolean);
      keys.forEach((key) => {
        if (!map.has(key)) map.set(key, item);
      });
    });
    state.hebrewDictMap = map;
    return data;
  }
   async function loadIndex(lang, options = {}) {
    if (state.indexes[lang]) return state.indexes[lang];
   const candidates = Array.isArray(SEARCH_INDEX[lang]) ? SEARCH_INDEX[lang] : [SEARCH_INDEX[lang]];
    let lastError = null;

    for (const url of candidates) {
      if (!url) continue;
      try {
        const data = await loadJson(url, options);
        state.indexes[lang] = data;
        return data;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error(`No se pudo cargar el índice para ${lang}`);
   }

async function loadEsShard(term, options = {}) {
  const tokens = String(term || '')
    .split(/\s+/)
    .map(t => normalizeSpanish(t.trim()))
    .filter(t => t.length >= 3);

  const letters = tokens.length > 0
    ? [...new Set(tokens.map(t => t[0] || '_'))]
    : [(normalizeSpanish(String(term || ''))[0] || '_').toLowerCase()];

  let loadedCount = 0;
  let anyError = false;

  const shards = await Promise.all(
    letters.map(async (letter) => {
      const cacheKey = 'es_shard_' + letter;
      if (state.indexes[cacheKey]) {
        loadedCount++;
        return state.indexes[cacheKey];
      }
      try {
        const url = './search/shards/index-es-' + letter + '.json';
        const data = await loadJson(url, options);
        state.indexes[cacheKey] = data;
        loadedCount++;
        return data;
      } catch (e) {
        anyError = true;
        return null;
      }
    })
  );

  // Fallback al índice completo si no cargó ningún shard o hubo errores
  if (loadedCount === 0 || anyError) {
    return loadIndex('es', options);
  }

  const combined = { tokens: {} };
  for (const shard of shards) {
    if (!shard) continue;
    Object.assign(combined.tokens, shard.tokens || {});
  }
  return combined;
}


   async function loadChapterText(lang, book, chapter, options = {}) {
    const key = `${lang}/${book}/${chapter}`;
     if (state.textCache.has(key)) return state.textCache.get(key);
     const url = `${TEXT_BASE}/${lang}/${book}/${chapter}.json`;
     const data = await loadJson(url, options);
    state.textCache.set(key, data);
     return data;
   }
 
  async function loadLxxFile(file) {
    if (state.lxxFileCache.has(file)) return state.lxxFileCache.get(file);
    const res = await fetch(`./LXX/${file}`);
    if (!res.ok) throw new Error(`No se pudo cargar ${file}`);
    const data = await res.json();
    state.lxxFileCache.set(file, data);
    return data;
  }
async function loadLxxBookData(bookCode) {
    if (state.lxxBookCache.has(bookCode)) return state.lxxBookCache.get(bookCode);
    const file = LXX_FILE_BY_BOOK[bookCode];
    if (!file) {
      state.lxxBookCache.set(bookCode, null);
      return null;
    }
    try {
      const data = await loadLxxFile(file);
      state.lxxBookCache.set(bookCode, data);
      return data;
    } catch (error) {
      if (isAbortError(error)) throw error;
    }
    state.lxxBookCache.set(bookCode, null);
    return null;
  }

  async function loadLxxShard(bookId, shardKey) {
    const cacheKey = `${bookId}|${shardKey}`;
    if (state.lxxShardCache.has(cacheKey)) return state.lxxShardCache.get(cacheKey);
    const knownBase = state.lxxShardBaseByBook.get(bookId);
    const baseCandidates = knownBase
      ? [knownBase, ...LXX_SHARD_BASE_PATHS.filter((base) => base !== knownBase)]
      : LXX_SHARD_BASE_PATHS;
    for (const basePath of baseCandidates) {
      try {
        const res = await fetch(`${basePath}/${bookId}/index_${shardKey}.json`);
        if (!res.ok) {
          if (res.status === 404) continue;
          throw new Error(`No se pudo cargar shard LXX ${bookId}/${shardKey}`);
        }
        const data = await res.json();
        const tokens = data?.tokens || {};
        state.lxxShardBaseByBook.set(bookId, basePath);
        state.lxxShardCache.set(cacheKey, tokens);
        return tokens;
      } catch (error) {
        if (isAbortError(error)) throw error;
      }
    }
    state.lxxShardCache.set(cacheKey, {});
    return {};
  }

  async function getLxxMatchesFromIndex(query, options = {}) {
    const maxRefs = Number.isFinite(options.maxRefs) ? options.maxRefs : 40;
    const key = normalizeGreekKey(query);
    if (!key) return { refs: [], texts: new Map(), highlightTerms: [] };

    const qRaw = String(query || '').trim();
    const keyNoSpaces = key.replace(/\s+/g, '');

    const lookupTerms = new Set([keyNoSpaces]);

    if (/^lemma:/i.test(qRaw)) {
      lookupTerms.clear();
      lookupTerms.add(`#${normalizeGreekKey(qRaw.slice(6)).replace(/\s+/g, '')}`);
    } else if (qRaw.startsWith('#')) {
      lookupTerms.clear();
      lookupTerms.add(`#${normalizeGreekKey(qRaw.slice(1)).replace(/\s+/g, '')}`);
    }
    const refs = [];
    const texts = new Map();
    const highlightTerms = new Set();
    const seenRefs = new Set();

    for (const term of lookupTerms) {
      const shardKey = term.slice(0, 2);
      if (!shardKey) continue;
      const bookBatches = [];
      const batchSize = 8;
      for (let index = 0; index < LXX_BOOKS.length; index += batchSize) {
        bookBatches.push(LXX_BOOKS.slice(index, index + batchSize));
      }
      for (const batch of bookBatches) {
        if (refs.length >= maxRefs) break;
        const batchResults = await Promise.all(batch.map((bookId) => loadLxxShard(bookId, shardKey)));
        for (let i = 0; i < batch.length; i += 1) {
          if (refs.length >= maxRefs) break;
          const bookId = batch[i];
          const tokens = batchResults[i] || {};
          const hits = tokens[term] || [];
          for (const hit of hits) {
            if (refs.length >= maxRefs) break;
            const hitBook = hit?.book || bookId;
            const chapter = String(hit?.ch || '');
            const verse = String(hit?.v || '');
            if (!hitBook || !chapter || !verse) continue;
            const ref = `${hitBook}|${chapter}|${verse}`;
            if (!seenRefs.has(ref)) {
              seenRefs.add(ref);
              refs.push(ref);
            }
            if (hit?.w) highlightTerms.add(hit.w);
          }
        }
      }
    }

    for (const ref of refs) {
      const [book, chapterRaw, verseRaw] = ref.split('|');
      const chapter = Number(chapterRaw);
      const verse = Number(verseRaw);
      const tokens = await loadLxxVerseTokens(book, chapter, verse);
      const verseText = Array.isArray(tokens)
        ? tokens.map((token) => token?.w).filter(Boolean).join(' ')
        : '';
      texts.set(ref, verseText || 'Texto no disponible.');
    }

    return { refs, texts, highlightTerms: [...highlightTerms] };
  }

  async function loadLxxVerseTokens(bookCode, chapter, verse) {
    const key = `${bookCode}|${chapter}|${verse}`;
    if (state.lxxVerseCache.has(key)) return state.lxxVerseCache.get(key);
    const data = await loadLxxBookData(bookCode);
    const tokens = data?.text?.[bookCode]?.[chapter]?.[verse] || null;
    state.lxxVerseCache.set(key, tokens);
    return tokens;
  }
  async function loadLxxBookStats(bookCode) {
    if (state.lxxBookStatsCache.has(bookCode)) return state.lxxBookStatsCache.get(bookCode);
    const data = await loadLxxBookData(bookCode);
    const verseFreq = new Map();
    let totalVerses = 0;
    const chapters = data?.text?.[bookCode] || {};
    Object.values(chapters).forEach((verses) => {
      Object.values(verses || {}).forEach((tokens) => {
        totalVerses += 1;
        const verseLemmas = new Set();
        (tokens || []).forEach((token) => {
          const normalized = normalizeGreek(token?.lemma || token?.w || '');
          if (!normalized || greekStopwords.has(normalized)) return;
          verseLemmas.add(normalized);
        });
        verseLemmas.forEach((lemma) => {
          verseFreq.set(lemma, (verseFreq.get(lemma) || 0) + 1);
        });
      });
    });
    const stats = { totalVerses, verseFreq };
    state.lxxBookStatsCache.set(bookCode, stats);
    return stats;
  }

  async function rankGreekCandidatesByLxxStats(counts, samples, usedBooks) {
    if (!counts.size) return null;
    let totalVerses = 0;
    const verseFreq = new Map();
    for (const bookCode of usedBooks) {
      const stats = await loadLxxBookStats(bookCode);
      totalVerses += stats.totalVerses;
      stats.verseFreq.forEach((count, lemma) => {
        verseFreq.set(lemma, (verseFreq.get(lemma) || 0) + count);
      });
    }
    if (!totalVerses) return pickBestCandidate(counts, samples);
    const ranked = [...counts.entries()].map(([lemma, hits]) => {
      const df = verseFreq.get(lemma) || 0;
      const score = hits * Math.log((totalVerses + 1) / (df + 1));
      return { lemma, hits, score };
    }).sort((a, b) => (b.score - a.score) || (b.hits - a.hits));
    const best = ranked[0];
    if (!best) return null;
    return {
      normalized: best.lemma,
      lemma: samples.get(best.lemma) || best.lemma,
      count: best.hits
    };
  }
  function transliterateHebrew(word) {
    if (!word) return '—';
    const consonants = {
      'א': '',
      'ב': 'b',
      'ג': 'g',
      'ד': 'd',
      'ה': 'h',
      'ו': 'v',
      'ז': 'z',
      'ח': 'j',
      'ט': 't',
      'י': 'y',
      'כ': 'k',
      'ך': 'k',
      'ל': 'l',
      'מ': 'm',
      'ם': 'm',
      'נ': 'n',
      'ן': 'n',
      'ס': 's',
      'ע': '\'',
      'פ': 'p',
      'ף': 'p',
      'צ': 'ts',
      'ץ': 'ts',
      'ק': 'q',
      'ר': 'r',
      'ש': 'sh',
      'ת': 't'
    };
    const vowelMap = {
      '\u05B0': 'e',
      '\u05B1': 'e',
      '\u05B2': 'a',
      '\u05B3': 'a',
      '\u05B4': 'i',
      '\u05B5': 'e',
      '\u05B6': 'e',
      '\u05B7': 'a',
      '\u05B8': 'a',
      '\u05B9': 'o',
      '\u05BB': 'u',
      '\u05C7': 'o'
    };
    const decomposed = word.normalize('NFD');
    let output = '';
     for (let i = 0; i < decomposed.length; i += 1) {
      const char = decomposed[i];
      if (!consonants.hasOwnProperty(char)) {
        const vowel = vowelMap[char];
        if (vowel) output += vowel;
        continue;
      }
      let consonant = consonants[char];
      let j = i + 1;
      let vowel = '';
      let hasShinDot = false;
      let hasSinDot = false;
      while (j < decomposed.length && /[\u0591-\u05C7]/.test(decomposed[j])) {
        if (decomposed[j] === '\u05C1') hasShinDot = true;
        if (decomposed[j] === '\u05C2') hasSinDot = true;
        vowel = vowelMap[decomposed[j]] || '';
        j += 1;
      }
      if (char === 'ש') {
        consonant = hasSinDot ? 's' : 'sh';
      }
      if (char === 'ו' && vowel) {
        consonant = '';
      }
      output = `${consonant}${vowel}`;
    }
    return output.replace(/''/g, '\'').trim() || '—';
  }

  async function buildLxxMatches(normalizedGreek, maxRefs = 40) {
    if (!normalizedGreek) return { refs: [], texts: new Map(), highlightTerms: [] };
   if (state.lxxSearchCache.has(normalizedGreek)) return state.lxxSearchCache.get(normalizedGreek);
    const payload = await getLxxMatchesFromIndex(normalizedGreek, { maxRefs });
   state.lxxSearchCache.set(normalizedGreek, payload);
    return payload;
  }

   function pickBestCandidate(counts, samples) {
    if (!counts.size) return null;
    const [best, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    return {
      normalized: best,
      lemma: samples.get(best) || best,
      count
    };
  }

  function cleanGreekToken(token) {
    return String(token || '').replace(/[··.,;:!?“”"(){}\[\]<>«»]/g, '');
  }

  async function buildGreekCandidateFromHebrewRefs(refs) {
    if (!refs.length) return null;
    const counts = new Map();
    const samples = new Map();
   const usedBooks = new Set();
    for (const ref of refs.slice(0, 40)) {
      const [slug, chapterRaw, verseRaw] = ref.split('|');
      const chapter = Number(chapterRaw);
      const verse = Number(verseRaw);
      const lxxCodes = HEBREW_SLUG_TO_LXX[slug] || [];
      for (const lxxCode of lxxCodes) {
        const tokens = await loadLxxVerseTokens(lxxCode, chapter, verse);
        if (!tokens) continue;
       usedBooks.add(lxxCode);
        const verseLemmas = new Set();
        tokens.forEach((token) => {
          const lemma = token?.lemma || token?.w || '';
          const normalized = normalizeGreek(lemma);
          if (!normalized) return;
          if (greekStopwords.has(normalized)) return;
         verseLemmas.add(normalized);
          if (!samples.has(normalized) && token?.lemma) samples.set(normalized, token.lemma);
        });
        verseLemmas.forEach((lemma) => {
          counts.set(lemma, (counts.get(lemma) || 0) + 1);
        });
      }
    }
   return rankGreekCandidatesByLxxStats(counts, samples, usedBooks);
  }

  async function buildGreekCandidateFromGreekRefs(refs, options = {}) {
   if (!refs.length) return null;
    const counts = new Map();
    const samples = new Map();
   const usedBooks = new Set();
    for (const ref of refs.slice(0, 40)) {
      const [book, chapterRaw, verseRaw] = ref.split('|');
      const chapter = Number(chapterRaw);
      const verse = Number(verseRaw);
      try {
        const verses = await loadChapterText('gr', book, chapter, options);
       const verseText = getVerseTextFromChapter(verses, verse);
        const tokens = verseText.split(/\s+/).filter(Boolean);
        tokens.forEach((token) => {
          const cleaned = cleanGreekToken(token);
          const normalized = normalizeGreek(cleaned);
          if (!normalized || greekStopwords.has(normalized)) return;
          counts.set(normalized, (counts.get(normalized) || 0) + 1);
          if (!samples.has(normalized)) samples.set(normalized, cleaned);
        });
      } catch (error) {
               if (isAbortError(error)) throw error;
        continue;
      }
    }
    return pickBestCandidate(counts, samples);
  }

  async function buildGreekCandidateFromLxxRefs(refs) {
    if (!refs.length) return null;
    const counts = new Map();
    const samples = new Map();
    const usedBooks = new Set();
    for (const ref of refs.slice(0, 40)) {
      const [book, chapterRaw, verseRaw] = ref.split('|');
      const chapter = Number(chapterRaw);
      const verse = Number(verseRaw);
      const tokens = await loadLxxVerseTokens(book, chapter, verse);
      if (!tokens) continue;
      usedBooks.add(book);
      const verseLemmas = new Set();
      tokens.forEach((token) => {
        const lemma = token?.lemma || token?.w || '';
        const normalized = normalizeGreek(lemma);
        if (!normalized || greekStopwords.has(normalized)) return;
        verseLemmas.add(normalized);
        if (!samples.has(normalized) && token?.lemma) samples.set(normalized, token.lemma);
      });
     verseLemmas.forEach((lemma) => {
        counts.set(lemma, (counts.get(lemma) || 0) + 1);
      });
    }
    return rankGreekCandidatesByLxxStats(counts, samples, usedBooks);
  }

  function extractPos(entry) {
     if (!entry) return '—';
     const raw = entry.entrada_impresa || '';
     if (!raw) return '—';
     const parts = raw.split('.');
     if (parts.length < 2) return raw.trim();
     return parts[1].trim() || '—';
   }
 
   function shortDefinition(text) {
     if (!text) return '';
     const trimmed = text.replace(/\s/g, ' ').trim();
     const split = trimmed.split('. ');
     return split[0] || trimmed;
   }
 
   function keywordList(text) {
     if (!text) return [];
     const cleaned = text
       .replace(/[()]/g, ' ')
       .replace(/[^a-zA-ZáéíóúñüÁÉÍÓÚÑÜ\s]/g, ' ')
       .toLowerCase();
     const words = cleaned.split(/\s/).filter(Boolean);
     const keywords = [];
     for (const word of words) {
       if (stopwords.has(word)) continue;
       if (!keywords.includes(word)) keywords.push(word);
       if (keywords.length >= 6) break;
     }
    return keywords;
  }

  function extractSpanishTokensFromDefinition(definition) {
    if (!definition) return [];
    const cleaned = definition
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zñ\s]/g, ' ');
    const words = cleaned.split(/\s+/).filter((word) => word.length >= 3);
    const extraStopwords = new Set([
      'lit', 'nt', 'lxx', 'pl', 'sg', 'adj', 'adv', 'pron', 'conj', 'prep',
      'part', 'indecl', 'num', 'prop', 'pers', 'rel', 'dem', 'interj', 'fig',
      'met', 'art'
    ]);
    const tokens = [];
    words.forEach((word) => {
      if (stopwords.has(word) || extraStopwords.has(word)) return;
      if (!tokens.includes(word)) tokens.push(word);
    });
    return tokens;
  }
 
  function splitRefsByTestament(refs) {
    const ot = [];
    const nt = [];
    refs.forEach((ref) => {
      const [book] = ref.split('|');
      if (NT_BOOKS.has(book)) {
        nt.push(ref);
      } else {
        ot.push(ref);
      }
    });
    return { ot, nt };
  }

function mapOtRefsToLxxRefs(refs) {
    return refs
      .flatMap((ref) => {
        const [book, chapter, verse] = ref.split('|');
        const lxxCodes = HEBREW_SLUG_TO_LXX[book] || [];
        return lxxCodes.map((code) => `${code}|${chapter}|${verse}`);
      })
      .filter(Boolean);
  }
function mapLxxRefsToHebrewRefs(refs) {
    return refs
      .map((ref) => {
        const [book, chapter, verse] = ref.split('|');
        const slug = LXX_TO_HEBREW_SLUG[book];
        if (!slug) return null;
        return `${slug}|${chapter}|${verse}`;
      })
      .filter(Boolean);
  }

  async function buildHebrewCandidateFromRefs(refs, options = {}) {
    const counts = new Map();
    const samples = new Map();
    const limitedRefs = refs.slice(0, 40);
    for (const ref of limitedRefs) {
      const [book, chapterRaw, verseRaw] = ref.split('|');
      const chapter = Number(chapterRaw);
      const verse = Number(verseRaw);
      try {
        const verses = await loadChapterText('he', book, chapter, options);
        const verseText = getVerseTextFromChapter(verses, verse);
        const tokens = verseText.split(/\s/).filter(Boolean);
        tokens.forEach((token) => {
          const cleaned = token.replace(/[׃,:;.!?()"“”]/g, '');
          const normalized = normalizeHebrew(cleaned);
          if (!normalized || hebrewStopwords.has(normalized)) return;
          counts.set(normalized, (counts.get(normalized) || 0) + 1);
          if (!samples.has(normalized)) samples.set(normalized, cleaned);
        });
      } catch (error) {
        if (isAbortError(error)) throw error;
        continue;
      }
    }
    const candidate = pickBestCandidate(counts, samples);
    if (!candidate) return null;
    const word = candidate.lemma || candidate.normalized;
    return {
      normalized: candidate.normalized,
      word,
      transliteration: transliterateHebrew(word),
      count: candidate.count
    };
  }

   async function buildHebrewCandidateFromLxxRefs(refs, options = {}) {
    const mappedRefs = refs
      .map((ref) => {
        const [book, chapter, verse] = ref.split('|');
        const slug = LXX_TO_HEBREW_SLUG[book];
        if (!slug) return null;
        return `${slug}|${chapter}|${verse}`;
      })
      .filter(Boolean);
    return buildHebrewCandidateFromRefs(mappedRefs, options);
  }

  function groupForBook(book) {
     const slug = LXX_TO_HEBREW_SLUG[book] || book;
     if (TORAH.includes(slug)) return { key: 'torah', label: 'Torah' };
    if (HISTORICAL.includes(slug)) return { key: 'historicos', label: 'Históricos' };
     if (WISDOM.includes(slug)) return { key: 'sabiduria', label: 'Sabiduría' };
     if (PROPHETS.includes(slug)) return { key: 'profetas', label: 'Profetas' };
     if (GOSPELS.includes(slug)) return { key: 'evangelios', label: 'Evangelios' };
     if (LETTERS.includes(slug)) return { key: 'cartas', label: 'Cartas' };
     if (APOCALYPSE.includes(slug)) return { key: 'apocalipsis', label: 'Apocalipsis' };
     return { key: 'otros', label: 'Otros' };
   }

  function prettyBookLabel(book) {
     return (book || '').replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
   }

   function buildBookCountRows(refs) {
     const counts = new Map();
     refs.forEach((ref) => {
       const [book] = String(ref || '').split('|');
       if (!book) return;
       const slug = LXX_TO_HEBREW_SLUG[book] || book;
       counts.set(slug, (counts.get(slug) || 0) + 1);
     });
     return [...counts.entries()]
       .map(([book, count]) => ({ book, label: prettyBookLabel(book), count }))
       .sort((a, b) => b.count - a.count);
   }
   function formatRef(book, chapter, verse) {
     const bookLabel = prettyBookLabel(book);
    return `${bookLabel} ${chapter}:${verse}`;
   }
 
    function classForLang(lang) {
    if (lang === 'gr' || lang === 'lxx') return 'greek';
     if (lang === 'he') return 'hebrew';
     return 'mono';
   }
 
   function renderTags(tags) {
     if (!lemmaTags) return;
     lemmaTags.innerHTML = '';
     tags.forEach((tag) => {
       const span = document.createElement('span');
       span.className = 'tag';
       span.innerHTML = tag;
       lemmaTags.appendChild(span);
     });
   }
 
   function renderExamples(cards) {
     if (!lemmaExamples) return;
     lemmaExamples.innerHTML = '';
     cards.forEach((card) => {
       const div = document.createElement('div');
       div.className = 'example-card';
       div.innerHTML = card;
       lemmaExamples.appendChild(div);
     });
   }
 
  function renderCorrespondence(cards) {
       if (!lemmaCorrespondence) return;
    lemmaCorrespondence.innerHTML = '';
    if (!cards.length) {
      lemmaCorrespondence.innerHTML = '<div class="small muted">Sin correspondencias disponibles.</div>';
      return;
    }
    cards.forEach((card) => {
      const div = document.createElement('div');
      div.className = 'example-card';
      div.innerHTML = card;
      lemmaCorrespondence.appendChild(div);
     });
   }
 
  async function buildSamplesForRefs(refs, lang, max = 3, preloadedTexts = null, options = {}) {
    const samples = [];
    for (const ref of refs.slice(0, max)) {
      const [book, chapterRaw, verseRaw] = ref.split('|');
      const chapter = Number(chapterRaw);
      const verse = Number(verseRaw);
      let verseText = '';
     const canonicalRef = `${book}|${chapter}|${verse}`;
      if (preloadedTexts?.has?.(ref) || preloadedTexts?.has?.(canonicalRef)) {
        verseText = preloadedTexts.get(ref) || preloadedTexts.get(canonicalRef) || '';
      } else {
        try {
        if (lang === 'lxx') {
            const tokens = await loadLxxVerseTokens(book, chapter, verse);
            verseText = Array.isArray(tokens)
              ? tokens.map((token) => token?.w).filter(Boolean).join(' ')
              : '';
          } else {
            const verses = await loadChapterText(lang, book, chapter, options);
            verseText = getVerseTextFromChapter(verses, verse) || '';
          }
        } catch (error) {
          if (isAbortError(error)) throw error;
          verseText = 'Texto no disponible.';
        }
      }
      samples.push({
        ref: formatRef(book, chapter, verse),
        text: verseText
      });
    }
    return samples;
  }

  function buildCorrespondenceCard({ title, word, transliteration, samples, lang, highlightQuery }) {
    const wordLine = word
      ? `<div class="${classForLang(lang)} fw-semibold">${highlightText(word, highlightQuery, lang)}</div>`
      : '<div class="muted">—</div>';
    const translitLine = transliteration ? `<div class="small muted">Translit.: ${transliteration}</div>` : '';
    const sampleLines = samples.length
      ? samples.map((sample) => `<div class="small">${escapeHtml(sample.ref)} · ${highlightText(sample.text, highlightQuery, lang)}</div>`).join('')
      : '<div class="small muted">Sin ejemplos.</div>';
    return `
      <div class="fw-semibold">${title}</div>
      ${wordLine}
      ${translitLine}
      <div class="mt-1 d-grid gap-1">${sampleLines}</div>
    `;
  }

 

  function sortRefsCanonically(refs = []) {
    return [...refs].sort((a, b) => {
      const [ba, ca, va] = String(a).split('|');
      const [bb, cb, vb] = String(b).split('|');
      const sa = LXX_TO_HEBREW_SLUG[ba] || ba;
      const sb = LXX_TO_HEBREW_SLUG[bb] || bb;
      const ia = CANON_INDEX.has(sa) ? CANON_INDEX.get(sa) : 9999;
      const ib = CANON_INDEX.has(sb) ? CANON_INDEX.get(sb) : 9999;
      if (ia !== ib) return ia - ib;
      const c1 = Number(ca) || 0, c2 = Number(cb) || 0;
      if (c1 !== c2) return c1 - c2;
      const v1 = Number(va) || 0, v2 = Number(vb) || 0;
      return v1 - v2;
    });
  }

  function getActiveLangForNewUI() {
    // Priorizamos un solo idioma: el scope seleccionado o el detectado
    const last = state.last;
    if (!last) return null;
    const scope = state.languageScope || 'auto';
    if (scope && scope !== 'auto' && scope !== 'all') return scope;
    return last.lang || null;
  }

  function pickCorpus(groupsByCorpus, lang) {
    return (groupsByCorpus || []).find((c) => c.lang === lang) || null;
  }

  function buildFilterAggFromGroups(groups = [], lang = 'es') {
    // groups: salida de buildBookGroups (por libro)
    const byBook = new Map();
    groups.forEach((g) => {
      const bookSlug = LXX_TO_HEBREW_SLUG[g.items?.[0]?.book] || LXX_TO_HEBREW_SLUG[g.refs?.[0]?.split?.('|')?.[0]] || (g.refs?.[0]?.split?.('|')?.[0]) || g.book || g.slug || null;
      const slug = LXX_TO_HEBREW_SLUG[bookSlug] || bookSlug;
      if (!slug) return;
      byBook.set(slug, {
        slug,
        label: prettyBookLabel(slug),
        count: g.count || (g.refs?.length || 0),
        refs: g.refs || [],
        group: g
      });
    });

    // orden canónico
    const orderedBooks = CANONICAL_BOOK_ORDER
      .filter((slug) => byBook.has(slug))
      .map((slug) => byBook.get(slug));

    // por si hay libros fuera de lista
    const extras = [...byBook.values()].filter((b) => !CANON_INDEX.has(b.slug))
      .sort((a, b) => a.label.localeCompare(b.label));
    const books = [...orderedBooks, ...extras];

    const ot = books.filter((b) => OT_SET.has(b.slug));
    const nt = books.filter((b) => NT_SET.has(b.slug));
    const otCount = ot.reduce((s, b) => s + (b.count || 0), 0);
    const ntCount = nt.reduce((s, b) => s + (b.count || 0), 0);
    const allCount = otCount + ntCount;

    return { lang, books, ot, nt, otCount, ntCount, allCount };
  }

  function renderFiltersPanel(agg) {
    if (!filtersPanel) return;
    const { books, ot, nt, otCount, ntCount, allCount } = agg;

    const mkBtn = (id, label, count, active) => {
      return `
        <button class="bx-filter-item ${active ? 'is-active' : ''}" type="button"
          data-bx-filter="${id}">
          <span>${escapeHtml(label)}</span>
          <span class="bx-count">(${count})</span>
        </button>
      `;
    };

    const isAll = !state.pagination.selectedBook && !state.pagination.selectedTestament;
    const isOT = state.pagination.selectedTestament === 'ot';
    const isNT = state.pagination.selectedTestament === 'nt';

    const otItems = ot.map((b) => mkBtn(`book:${b.slug}`, b.label, b.count, state.pagination.selectedBook === b.slug)).join('');
    const ntItems = nt.map((b) => mkBtn(`book:${b.slug}`, b.label, b.count, state.pagination.selectedBook === b.slug)).join('');

    filtersPanel.innerHTML = `
      <div class="d-grid gap-2">
        ${mkBtn('all', 'Todos', allCount, isAll)}
        ${mkBtn('ot', 'Toráh', otCount, isOT)}
        <div class="ps-1 d-grid gap-2">${otItems || '<div class="small muted ps-2">Sin resultados.</div>'}</div>
        ${mkBtn('nt', 'Evangelios', ntCount, isNT)}
        <div class="ps-1 d-grid gap-2">${ntItems || '<div class="small muted ps-2">Sin resultados.</div>'}</div>
      </div>
    `;
  }

  function flattenRefsForSelection(agg) {
    const selBook = state.pagination.selectedBook;
    const selTest = state.pagination.selectedTestament;

    if (selBook) {
      const b = agg.books.find((x) => x.slug === selBook);
      return sortRefsCanonically(b?.refs || []);
    }
    const pool = selTest === 'ot'
      ? agg.ot
      : selTest === 'nt'
        ? agg.nt
        : agg.books;

    const refs = [];
    pool.forEach((b) => refs.push(...(b.refs || [])));
    return sortRefsCanonically(refs);
  }

  async function resolveVerseTextsForRefs(refs, lang, options = {}) {
    // Agrupa por libro+capítulo para minimizar lecturas.
    const cache = state.verseCache?.[lang] || new Map();
    const result = [];
    const byChapter = new Map(); // key: book|chapter -> [verseNumbers]
    const parsed = refs.map((ref) => {
const [bookRaw, cRaw, vRaw] = String(ref).split('|');
      const book = String(bookRaw || '').trim();
            const chapter = Number(cRaw);
      const verse = Number(vRaw);
      const key = `${book}|${chapter}`;
      return { ref, book, chapter, verse, key };
     }).filter((p) => p.book && Number.isFinite(p.chapter) && Number.isFinite(p.verse));

    parsed.forEach((p) => {
      const canonicalRef = `${p.book}|${p.chapter}|${p.verse}`;
      if (cache.has(canonicalRef)) return;
      if (!byChapter.has(p.key)) byChapter.set(p.key, []);
      byChapter.get(p.key).push(p.verse);
    });

    for (const [key, versesNeeded] of byChapter.entries()) {
      const [book, chapterRaw] = key.split('|');
      const chapter = Number(chapterRaw);
      try {
        if (lang === 'lxx') {
          // LXX se resuelve por tokens verso a verso
          await Promise.all(versesNeeded.map(async (v) => {
            const canonicalRef = `${book}|${chapter}|${v}`;
            if (cache.has(canonicalRef)) return;
            const tokens = await loadLxxVerseTokens(book, chapter, v);
            const resolvedText = Array.isArray(tokens) ? tokens.map((t) => t?.w).filter(Boolean).join(' ') : '';
            cache.set(canonicalRef, resolvedText);
          }));
        } else {
          const verses = await loadChapterText(lang, book, chapter, options);
          versesNeeded.forEach((v) => {
            const canonicalRef = `${book}|${chapter}|${v}`;
            let text = '';
            if (Array.isArray(verses)) {
              text = verses[v - 1] || '';
            } else if (verses && typeof verses === 'object') {
              text = verses[v] || verses[String(v)] || verses[String(v - 1)] || '';
            }

            cache.set(canonicalRef, text);
          });
        }
      } catch (e) {
        if (isAbortError(e)) throw e;
        // Evita cachear vacío ante fallos transitorios para permitir reintentos.
      }
    }

    parsed.forEach((p) => {
      const canonicalRef = `${p.book}|${p.chapter}|${p.verse}`;
      result.push({
        ref: formatRef(p.book, p.chapter, p.verse),
        text: cache.get(canonicalRef) || '',
        rawRef: canonicalRef,
        book: p.book,
        chapter: p.chapter,
        verse: p.verse
      });
    });

    state.verseCache[lang] = cache;
    return result;
  }

  async function renderResultsPage(agg, highlightQueries = {}, options = {}) {
    if (!resultsList || !paginationEl) return;
    const allRefs = flattenRefsForSelection(agg);
    const total = allRefs.length;

    const pageSize = state.pagination.pageSize || 25;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    state.pagination.page = Math.min(Math.max(1, state.pagination.page || 1), totalPages);

    const start = (state.pagination.page - 1) * pageSize;
    const slice = allRefs.slice(start, start + pageSize);

    // UI loading
    if (resultsLoadingStage) resultsLoadingStage.hidden = false;
    resultsList.innerHTML = '';
    paginationEl.innerHTML = '';

    const items = await resolveVerseTextsForRefs(slice, agg.lang, options);

    if (resultsLoadingStage) resultsLoadingStage.hidden = true;

    const highlightQuery = highlightQueries?.[agg.lang] || state.last?.term || '';
    resultsList.innerHTML = items.map((it) => {
      const tBook = it.book;
      const tName = prettyBookLabel(tBook);
      const qs = new URLSearchParams();
      qs.set('book', tBook);
      qs.set('name', tName);
      qs.set('search', `${it.chapter}:${it.verse}`);
      qs.set('view', 'parallel');
      if (state?.version) qs.set('version', String(state.version));
      qs.set('orig', '1');
      const openHref = `./index.html?${qs.toString()}`;
      const safeText = it.text || '—';
      return `
        <div class="bx-result-item d-flex gap-2">
          <div class="flex-grow-1">
            <div class="bx-ref">${escapeHtml(it.ref)}</div>
            <div class="bx-text">${highlightText(escapeHtml(safeText), highlightQuery, agg.lang)}</div>
          </div>
          <div class="bx-actions">
            <a class="btn btn-primary btn-sm" href="${openHref}">Abrir</a>
          </div>
        </div>
      `;
    }).join('') || '<div class="muted small">Sin resultados.</div>';

    // Paginación
    const mkPageBtn = (label, page, disabled = false, active = false) => {
      return `
        <li class="page-item ${disabled ? 'disabled' : ''} ${active ? 'active' : ''}">
          <button class="page-link" type="button" data-bx-page="${page}">${label}</button>
        </li>
      `;
    };

    if (total > pageSize) {
      const prev = state.pagination.page - 1;
      const next = state.pagination.page + 1;
      let html = '';
      html += mkPageBtn('«', prev, prev < 1);
      // ventana simple
      const windowSize = 5;
      const half = Math.floor(windowSize / 2);
      let from = Math.max(1, state.pagination.page - half);
      let to = Math.min(totalPages, from + windowSize - 1);
      from = Math.max(1, to - windowSize + 1);

      if (from > 1) html += mkPageBtn('1', 1, false, state.pagination.page === 1);
      if (from > 2) html += `<li class="page-item disabled"><span class="page-link">…</span></li>`;
      for (let p = from; p <= to; p++) {
        html += mkPageBtn(String(p), p, false, p === state.pagination.page);
      }
      if (to < totalPages - 1) html += `<li class="page-item disabled"><span class="page-link">…</span></li>`;
      if (to < totalPages) html += mkPageBtn(String(totalPages), totalPages, false, state.pagination.page === totalPages);

      html += mkPageBtn('»', next, next > totalPages);
      paginationEl.innerHTML = html;
    } else {
      paginationEl.innerHTML = '';
    }
  }

  async function renderSearchUI(groupsByCorpus, highlightQueries = {}, relatedTerms = {}, options = {}) {
    // Si el usuario pide "Todos", caemos al modo legacy (multi-corpus)
    const scope = state.languageScope || 'auto';
    const activeLang = getActiveLangForNewUI();
    state.pagination.activeLang = activeLang;

    if (!activeLang || scope === 'all') {
      // legacy
      if (resultsByCorpus) resultsByCorpus.hidden = false;
      if (filtersPanel) filtersPanel.innerHTML = '<div class="small muted">Selecciona un idioma específico para usar filtros por libro.</div>';
      if (resultsList) resultsList.innerHTML = '';
      if (paginationEl) paginationEl.innerHTML = '';
      renderResults(groupsByCorpus, highlightQueries, relatedTerms);
      return;
    }

    // Nuevo UI: un solo idioma
    if (resultsByCorpus) resultsByCorpus.hidden = true;

    const corpus = pickCorpus(groupsByCorpus, activeLang);
    const groups = corpus?.groups || [];
    const filteredGroups = groups.filter((g) => {
      if (state.filter === 'todo') return true;
      return g.category === state.filter;
    });

    const agg = buildFilterAggFromGroups(filteredGroups, activeLang);

    // Si el filtro por categoría dejó vacío, reset
    if (!agg.allCount) {
      if (filtersPanel) filtersPanel.innerHTML = '<div class="small muted">Sin resultados para el filtro seleccionado.</div>';
      if (resultsList) resultsList.innerHTML = '<div class="muted small">Sin resultados.</div>';
      if (paginationEl) paginationEl.innerHTML = '';
      return;
    }

    renderFiltersPanel(agg);
    await renderResultsPage(agg, highlightQueries, options);
  }



function renderResults(groupsByCorpus, highlightQueries = state.last?.highlightQueries || {}, relatedTerms = state.last?.relatedTerms || {}) {
    resultsByCorpus.innerHTML = '';
    if (!groupsByCorpus.length) {
      resultsByCorpus.innerHTML = '<div class="col-12"><div class="muted small">Sin resultados en el corpus.</div></div>';
       return;
     }

   groupsByCorpus.forEach((corpus) => {
      const { lang, groups } = corpus;
      const wrapper = document.createElement('div');
      wrapper.className = 'col-12';
       const header = document.createElement('div');
      header.className = 'fw-semibold mb-2';
      header.textContent = langLabels[lang] || lang;
      wrapper.appendChild(header);

       if (corpus.loading) return;
      
      const filteredGroups = groups.filter((group) => {
        if (state.filter === 'todo') return true;
        return group.category === state.filter;
       });
 

      if (!filteredGroups.length) {
        const empty = document.createElement('div');
        empty.className = 'muted small';
        empty.textContent = 'No hay resultados para el filtro seleccionado.';
        wrapper.appendChild(empty);
        resultsByCorpus.appendChild(wrapper);
        return;
      }

            const totalCount = filteredGroups.reduce((sum, group) => sum + group.count, 0);
      const info = document.createElement('div');
      info.className = 'd-flex align-items-center justify-content-between mb-2';
      const meta = document.createElement('div');
      meta.innerHTML = `
        <div class="fw-semibold">Resultados en ${filteredGroups.length} libro(s)</div>
        <div class="small muted">${totalCount} ocurrencia(s) en total.</div>
      `;
      const button = document.createElement('button');
      button.className = `btn btn-sm result-toggle-btn${corpus.expanded ? ' is-open' : ''}`;
    button.type = 'button';
      button.textContent = corpus.expanded ? 'Ocultar resultados' : 'Ver resultados';
      info.appendChild(meta);
      info.appendChild(button);
      wrapper.appendChild(info);

      const list = document.createElement('div');
      list.className = 'd-grid gap-2';
      if (corpus.expanded) {
        filteredGroups.forEach((group) => {
          const bookBlock = document.createElement('div');
 bookBlock.className = 'book-result-card';
          const bookTop = document.createElement('div');
          bookTop.className = 'd-flex flex-wrap justify-content-between align-items-center gap-2';
         
         const bookHeader = document.createElement('div');
          bookHeader.className = 'fw-semibold';
          bookHeader.textContent = group.label;
          const bookMeta = document.createElement('div');
          bookMeta.className = 'small muted';
         if (lang === 'es' && group.limit) {
            bookMeta.textContent = `${group.loadedCount} de ${group.count} ocurrencia(s).`;
          } else {
            bookMeta.textContent = `${group.count} ocurrencia(s).`;
          }
         const bookHeadText = document.createElement('div');
          bookHeadText.appendChild(bookHeader);
          bookHeadText.appendChild(bookMeta);
          const toggleBookBtn = document.createElement('button');
          toggleBookBtn.className = `btn btn-sm result-toggle-btn${group.expanded ? ' is-open' : ''}`;
         toggleBookBtn.type = 'button';
          toggleBookBtn.textContent = group.expanded ? 'Ocultar resultados' : 'Ver resultados';
          bookTop.appendChild(bookHeadText);
          bookTop.appendChild(toggleBookBtn);
          bookBlock.appendChild(bookTop);
         
          const bookList = document.createElement('div');
bookList.className = 'mt-2 d-grid gap-1';
         const highlightQuery = highlightQueries[lang] || '';
         const relatedLabels = relatedTerms[lang] || [];
          if (group.expanded) {
            group.items.forEach((item) => {
              const row = document.createElement('div');
              row.className = 'verse-row';
              const textWrap = document.createElement('div');
              textWrap.className = `${classForLang(lang)} mb-2`;
              const relatedBadge = (lang === 'es' && relatedLabels.length && relatedLabels.some((label) => normalizeSpanish(item.text).includes(normalizeSpanish(label))))
                ? `<span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle ms-1">Coincidencia relacionada: ${escapeHtml(relatedLabels.join(', '))}</span>`
                : '';
              textWrap.innerHTML = `<span class="verse-ref">${escapeHtml(item.ref)}</span>${relatedBadge} · ${highlightText(item.text, highlightQuery, lang)}`;
              const actions = document.createElement('div');
              actions.className = 'd-flex justify-content-end';
              const openBtn = document.createElement('button');
              openBtn.className = 'btn btn-primary btn-sm';
              openBtn.type = 'button';
              openBtn.textContent = 'Abrir';
              openBtn.addEventListener('click', () => {
               const targetBook = LXX_TO_HEBREW_SLUG[item.book] || item.book;
                const targetName = prettyBookLabel(targetBook);
                const p = new URLSearchParams();
                p.set('book', targetBook);
                p.set('name', targetName);
                p.set('search', `${item.chapter}:${item.verse}`);
                p.set('version', 'RVR1960');
                p.set('orig', '1');
                p.set('view', 'parallel');
                location.href = `./index.html?${p.toString()}`;
              });
              actions.appendChild(openBtn);
              row.appendChild(textWrap);
              row.appendChild(actions);
              bookList.appendChild(row);
            });
            bookBlock.appendChild(bookList);
          }
         if (group.expanded && lang === 'es' && group.hasMore) {
           const loadMoreWrapper = document.createElement('div');
            loadMoreWrapper.className = 'mt-2';
            const loadMoreButton = document.createElement('button');
            loadMoreButton.className = 'btn btn-soft btn-sm';
            loadMoreButton.type = 'button';
            loadMoreButton.disabled = group.loadingMore;
            loadMoreButton.textContent = group.loadingMore
              ? 'Cargando...'
              : 'Cargar más en RVR1960';
            loadMoreButton.addEventListener('click', async () => {
              if (group.loadingMore) return;
              group.loadingMore = true;
              renderResults(groupsByCorpus);
              await loadMoreRvr1960(group, {});
              group.loadingMore = false;
              renderResults(groupsByCorpus);
            });
            loadMoreWrapper.appendChild(loadMoreButton);
            bookBlock.appendChild(loadMoreWrapper);
          }
          toggleBookBtn.addEventListener('click', () => {
            group.expanded = !group.expanded;
            renderResults(groupsByCorpus);
          });
          list.appendChild(bookBlock);
        });
       }
      wrapper.appendChild(list);
    
       button.addEventListener('click', () => {
        corpus.expanded = !corpus.expanded;
        renderResults(groupsByCorpus);
      });
 

      resultsByCorpus.appendChild(wrapper);
     });
   }
 

  async function buildBookGroups(refs, lang, preloadedTexts = null, options = {}) {
     const grouped = new Map();
     refs.forEach((ref) => {
       const [book] = ref.split('|');
       if (!grouped.has(book)) grouped.set(book, []);
       grouped.get(book).push(ref);
     });
     
        const limit = lang === 'es' ? 20 : 12;
     const groups = [];
     for (const [book, bookRefs] of grouped.entries()) {
       const { key, label } = groupForBook(book);
       const group = {
         label: book.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()),
         items: [],
         count: bookRefs.length,
         expanded: false,
         category: key,
         categoryLabel: label,
         refs: bookRefs,
         limit,
         loadedCount: 0,
         hasMore: false,
         loadingMore: false
       };
       const refsToLoad = bookRefs.slice(0, limit);
       for (const ref of refsToLoad) {
         const [bookName, chapterRaw, verseRaw] = ref.split('|');
         const chapter = Number(chapterRaw);
         const verse = Number(verseRaw);
         try {

 const canonicalRef = `${bookName}|${chapter}|${verse}`;
          const verseText = preloadedTexts?.get?.(ref) || preloadedTexts?.get?.(canonicalRef);
          if (!verseText) throw new Error('no preloaded');
           group.items.push({
             book: bookName,
              chapter,
              verse,
             ref: formatRef(bookName, chapter, verse),
             text: verseText
           });
         } catch (error) {
          try {
            let resolvedText = '';
             if (lang === 'lxx') {
               const tokens = await loadLxxVerseTokens(bookName, chapter, verse);
               resolvedText = Array.isArray(tokens)
                 ? tokens.map((token) => token?.w).filter(Boolean).join(' ')
                 : '';
             } else {
               const verses = await loadChapterText(lang, bookName, chapter, options);
               resolvedText = getVerseTextFromChapter(verses, verse) || '';
             }
             group.items.push({
               book: bookName,
               chapter,
               verse,
               ref: formatRef(bookName, chapter, verse),
               text: resolvedText
             });
           } catch (innerError) {
             if (isAbortError(innerError)) throw innerError;
             group.items.push({
                  book: bookName,
               chapter,
               verse,
               ref: formatRef(bookName, chapter, verse),
               text: 'Texto no disponible.'
             });
           }
         }
       }
      group.loadedCount = group.items.length;
       group.hasMore = lang === 'es' && group.loadedCount < group.count;
       groups.push(group);
       }
    return groups.sort((a, b) => b.count - a.count);
   }
 async function loadMoreRvr1960(group, options = {}) {
    const refsToLoad = group.refs.slice(group.loadedCount);
    for (const ref of refsToLoad) {
      const [book, chapterRaw, verseRaw] = ref.split('|');
      const chapter = Number(chapterRaw);
      const verse = Number(verseRaw);
      try {
        const verses = await loadChapterText('es', book, chapter, options);
        const verseText = getVerseTextFromChapter(verses, verse);
        group.items.push({
          book,
          chapter,
          verse,
          ref: formatRef(book, chapter, verse),
          text: verseText
        });
      } catch (error) {
        if (isAbortError(error)) throw error;
        group.items.push({
          book,
          chapter,
          verse,
          ref: formatRef(book, chapter, verse),
          text: 'Texto no disponible.'
        });
      }
    }
    group.loadedCount = group.items.length;
    group.hasMore = false;
  }
  async function buildSummary(term, lang, entry, hebrewEntry, refs, highlightQueries = {}, options = {}) {
     const lemma = entry?.lemma || term;
     const transliteration = entry?.['Forma lexica'] || '—';
     const pos = extractPos(entry);
     const hebrewDefinition = getHebrewDefinition(hebrewEntry);
     const definition = lang === 'he' ? hebrewDefinition : (entry?.definicion || '');
     const defShort = definition ? shortDefinition(definition) : '';
     const keywords = keywordList(definition);
    const summaryParts = [];
    if (defShort) summaryParts.push(defShort);
    if (definition && definition !== defShort) summaryParts.push(definition);

    let sampleRef = null;
    let sampleText = '';
    let sampleEs = '';
    if (refs.length) {
      const [book, chapterRaw, verseRaw] = refs[0].split('|');
      const chapter = Number(chapterRaw);
      const verse = Number(verseRaw);
      sampleRef = formatRef(book, chapter, verse);
      try {
        const verses = await loadChapterText(lang, book, chapter, options);
        sampleText = getVerseTextFromChapter(verses, verse) || '';
        if (lang !== 'es') {
          const versesEs = await loadChapterText('es', book, chapter, options);
          sampleEs = versesEs?.[verse - 1] || '';
        }
      } catch (error) {
        if (isAbortError(error)) throw error;
        sampleText = '';
        sampleEs = '';
      }
    }
    if (!summaryParts.length) summaryParts.push('No se encontró definición directa, se usa la concordancia del corpus para contexto.');
    const summaryQuery = highlightQueries.es || (lang === 'es' ? term : '');
 if (lemmaSummary) {
      lemmaSummary.innerHTML = highlightText(summaryParts.join(' '), summaryQuery, 'es');
    }     const cards = [];
     const primaryQuery = highlightQueries[lang] || term;
    const spanishQuery = highlightQueries.es || '';
    if (sampleRef && sampleText) {
      cards.push(`
        <div class="fw-semibold">Ejemplo en ${langLabels[lang]}</div>
        <div class="small muted">${sampleRef}</div>
        <div class="${classForLang(lang)}">${highlightText(sampleText, primaryQuery, lang)}</div>
      `);
    }
    if (sampleEs) {
      cards.push(`
        <div class="fw-semibold">Traducción RVR1960</div>
        <div class="small muted">Ejemplo contextual</div>
        <div>${highlightText(sampleEs, spanishQuery, 'es')}</div>
      `);
    }
     
     if (keywords.length) {
       cards.push(`
         <div class="fw-semibold">Campos semánticos</div>
         <div class="small muted">${keywords.join(', ')}</div>
       `);
     }
     renderExamples(cards);

   }
 
