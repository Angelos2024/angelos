(function (global) {
  const state = {
    loaded: false,
    entries: [],
    index: {},
    unified: []
  };

  function normalizeHebrewLemmaForLookup(text) {
    try {
      return String(text || '').normalize('NFC').replace(/\s+/g, ' ').trim();
    } catch (_) {
      return String(text || '').replace(/\s+/g, ' ').trim();
    }
  }
  function normalizeHebrewComparableKey(text) {
    const normalized = normalizeHebrewLemmaForLookup(text);
    if (!normalized) return '';
    return normalized
      .normalize('NFD')
      .replace(/[\u0591-\u05C7]/g, '')
      .replace(/[־\-‐‑‒–—]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .normalize('NFC');
  }

  function buildHebrewLookupVariants(value) {
    const variants = new Set();
    const base = normalizeHebrewLemmaForLookup(value);
    if (!base) return variants;

    variants.add(base);

    const comparable = normalizeHebrewComparableKey(base);
    if (comparable) variants.add(comparable);

    if (comparable.startsWith('ה') && comparable.length > 2) {
      variants.add(comparable.slice(1));
    }

    if (comparable.endsWith('ת') && comparable.length > 2) {
      const stem = comparable.slice(0, -1);
      variants.add(stem);
      variants.add(`${stem}ה`);
    }

    if (comparable.endsWith('י') && comparable.length > 2) {
      const stem = comparable.slice(0, -1);
      variants.add(stem);
      variants.add(`${stem}ים`);
      variants.add(`${stem}ות`);
      variants.add(`${stem}ה`);
    }

    return variants;
  }

  function normalizeStrongForLookup(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    const upper = text.toUpperCase();
    const match = upper.match(/H?\s*0*(\d{1,4})/);
    if (!match) return upper.replace(/\s+/g, '');
    return `H${match[1]}`;
  }

  async function fetchJsonWithFallback(urls) {
    let lastError = null;
    for (const url of urls) {
      try {
        const response = await fetch(url, { cache: 'force-cache' });
        if (!response.ok) {
          lastError = new Error(`No se pudo cargar ${url} (HTTP ${response.status}).`);
          continue;
        }
        return await response.json();
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error('No se pudo cargar el recurso JSON solicitado.');
  }

  async function ensureLoaded() {
    if (state.loaded) return state;
    const [entriesData, indexData, unifiedData] = await Promise.all([
 fetchJsonWithFallback(['../dic/hebrewdic.json']),
      fetchJsonWithFallback(['../dic/diccionario_index_by_lemma.json']),
      fetchJsonWithFallback(['../diccionario/diccionario_unificado.min.json'])
    ]);

    state.entries = Array.isArray(entriesData) ? entriesData : [];
    state.index = indexData && typeof indexData === 'object' ? indexData : {};
    state.unified = Array.isArray(unifiedData) ? unifiedData : [];
    state.loaded = true;
    return state;
  }

  function extractStrongCandidatesFromText(text) {
    const source = String(text || '');
    if (!source) return [];
    const matches = source.match(/\bH?\s*\d{1,4}\b/gi) || [];
    return matches.map(item => normalizeStrongForLookup(item)).filter(Boolean);
  }

  function findPrimaryEntry(rawHebrew) {
    const query = normalizeHebrewLemmaForLookup(rawHebrew);
    const queryVariants = buildHebrewLookupVariants(rawHebrew);
    if (!query || !state.entries.length) return null;

    const byId = new Map(state.entries.map(entry => [entry.id, entry]));
    const matchesExact = (entry) => {
      const entryVariants = new Set([
        ...buildHebrewLookupVariants(entry?.lemma),
        ...buildHebrewLookupVariants(entry?.headword_line)
      ]);
      return Array.from(queryVariants).some((variant) => entryVariants.has(variant));
    };

    const indexedIds = state.index[query] || [];
    if (Array.isArray(indexedIds)) {
      for (const id of indexedIds) {
        const hit = byId.get(id);
        if (hit && matchesExact(hit)) return hit;
      }
    }

    for (const entry of state.entries) {
      if (matchesExact(entry)) return entry;
    }
    return null;
  }

  function collectUnifiedLookupCandidates({ rawHebrew, lemmaCandidates = [], strongCandidates = [] } = {}) {
    const hebrewCandidates = new Set();
    const strongSet = new Set();

    const pushHebrew = (value) => {
       buildHebrewLookupVariants(value).forEach((candidate) => hebrewCandidates.add(candidate));
    };

    const pushStrong = (value) => {
      const normalized = normalizeStrongForLookup(value);
      if (normalized) strongSet.add(normalized);
    };

    pushHebrew(rawHebrew);
    lemmaCandidates.forEach(pushHebrew);
    strongCandidates.forEach(pushStrong);

    return { hebrewCandidates, strongSet };
  }

  function buildUnifiedMeta(primary, primaryEntry, rawHebrew) {
    const lemmaCandidates = [
      rawHebrew,
      primary?.he,
      primary?.hebrew,
      primary?.palabra,
      primary?.lemma,
      primary?.lemmas,
      primaryEntry?.lemma,
      primaryEntry?.headword_line
    ].flat().filter(Boolean);

    const strongCandidates = [
      primary?.strong,
      primary?.strongs,
      primary?.strongNumber,
      primaryEntry?.strong,
      primaryEntry?.strongs,
      ...extractStrongCandidatesFromText(primaryEntry?.gloss_es),
      ...extractStrongCandidatesFromText(primaryEntry?.text)
    ].flat().filter(Boolean);

    return { lemmaCandidates, strongCandidates };
  }

  function findUnifiedEntries(rawHebrew, options = {}) {
    if (!state.unified.length) return [];
    const { hebrewCandidates, strongSet } = collectUnifiedLookupCandidates({ rawHebrew, ...options });
    if (!hebrewCandidates.size && !strongSet.size) return [];

    const results = [];
    const seen = new Set();

    state.unified.forEach(entry => {
      const detail = entry?.strong_detail || {};
      const entryHebrew = new Set([
        detail?.lemma,
        entry?.lemma,
        entry?.hebreo,
        entry?.forma,
        ...(Array.isArray(entry?.hebreos) ? entry.hebreos : []),
        ...(Array.isArray(entry?.formas) ? entry.formas : [])
      ].flatMap(value => Array.from(buildHebrewLookupVariants(value))).filter(Boolean));
      
      const entryStrong = normalizeStrongForLookup(entry?.strong);
      const hebrewMatch = Array.from(hebrewCandidates).some(candidate => entryHebrew.has(candidate));
      const strongMatch = !!entryStrong && strongSet.has(entryStrong);
      if (!hebrewMatch && !strongMatch) return;

      const dedupeKey = `${entryStrong}|${normalizeHebrewLemmaForLookup(detail?.lemma || entry?.lemma || entry?.hebreo)}|${normalizeHebrewLemmaForLookup(entry?.forma)}`;
      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);
      results.push(entry);
    });

    return results;
  }

  global.DiccionarioBHebreo = {
    ensureLoaded,
    findPrimaryEntry,
    buildUnifiedMeta,
    findUnifiedEntries,
    normalizeStrongForLookup
  };
})(window);
