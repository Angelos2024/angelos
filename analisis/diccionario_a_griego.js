(function () {

  const state = {
    loaded: false,
    loadPromise: null,
    masterByLemma: new Map(),
    masterByForm: new Map(),
    masterEntries: [],
    chavezEntries: {},
    chavezAliases: {},
    chavezShardTemplate: 'strongs-greek-chavez.shards/{shard}.min.json',
    chavezShardCache: new Map()
  };

  function normalizeGreek(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[⸀⸂⸃]/g, '')
      .replace(/[.,;:!?“”"(){}\[\]<>«»]/g, '')
      .replace(/[\u2019\u02BC']/g, '’')
      .toLowerCase()
      .replace(/ς/g, 'σ')
      .trim();
  }

  function normalizeLatin(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
      .trim();
  }

  function splitGreekTokens(text) {
    const raw = String(text || '')
      .replace(/[·/,؛]/g, ' ')
      .replace(/[\u2014\u2013]/g, ' ');
    return raw.split(/\s+/).map(x => x.trim()).filter(Boolean);
  }

  function addToIndex(map, key, entry) {
    if (!key) return;
    if (!map.has(key)) map.set(key, entry);
  }

  function appendVariant(target, value) {
    if (Array.isArray(value)) {
      value.forEach(item => appendVariant(target, item));
      return;
    }
    if (!value) return;
    target.add(String(value));
  }

  function buildGreekLemmaCandidates(key) {
    const variants = new Set([key]);
    const replaceEnding = (ending, replacement) => {
      if (!key.endsWith(ending) || key.length <= ending.length) return;
      const stem = key.slice(0, -ending.length);
      appendVariant(variants, replacement instanceof Array ? replacement.map(item => stem + item) : stem + replacement);
    };

    replaceEnding('ου', ['ος', 'ον']);
    replaceEnding('ῳ', ['ος', 'ον', 'α']);
    replaceEnding('ον', 'ος');
    replaceEnding('οι', 'ος');
    replaceEnding('ους', 'ος');
    replaceEnding('α', ['ος', 'ον', 'η', 'ας']);
    replaceEnding('ης', ['η', 'α']);
    replaceEnding('ῃ', ['η', 'α']);
    replaceEnding('ην', ['η', 'α']);
    replaceEnding('αι', ['η', 'α']);
    replaceEnding('ων', ['ος', 'η', 'α', 'ις']);
    replaceEnding('ας', ['α', 'ης', 'η']);
    replaceEnding('ιος', 'ις');
    replaceEnding('εως', 'ις');
    replaceEnding('ει', 'ις');
    replaceEnding('ιν', 'ις');
    replaceEnding('ες', 'ις');
    replaceEnding('ειν', 'ω');
    replaceEnding('εις', 'ω');
    replaceEnding('ει', 'ω');
    replaceEnding('ομεν', 'ω');
    replaceEnding('ετε', 'ω');
    replaceEnding('ουσι', 'ω');
    replaceEnding('ουσιν', 'ω');
    replaceEnding('εται', 'ομαι');
    replaceEnding('ονται', 'ομαι');
    replaceEnding('εσθαι', 'ομαι');
    replaceEnding('ουται', 'οομαι');
    replaceEnding('οντος', 'ω');
    replaceEnding('οντα', 'ω');
    replaceEnding('μενος', ['ω', 'ομαι']);
    replaceEnding('μενον', ['ω', 'ομαι']);
    replaceEnding('μενου', ['ω', 'ομαι']);

    if (key.endsWith('ουν')) {
      const stem = key.slice(0, -3);
      appendVariant(variants, [stem + 'ους', stem + 'ου', stem + 'οι']);
    }
    if (key.endsWith('ους')) {
      const stem = key.slice(0, -3);
      appendVariant(variants, [stem + 'ουν', stem + 'ου', stem + 'οι']);
    }
    if (key.endsWith('ου')) {
      const stem = key.slice(0, -2);
      appendVariant(variants, [stem + 'ους', stem + 'ουν', stem + 'οι']);
    }

    if (key.endsWith('ν') && key.length > 2) variants.add(key.slice(0, -1));

    return Array.from(variants);
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a) return b.length;
    if (!b) return a.length;
    const rows = a.length + 1;
    const cols = b.length + 1;
    const matrix = Array.from({ length: rows }, () => new Array(cols).fill(0));
    for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
    for (let j = 0; j < cols; j += 1) matrix[0][j] = j;
    for (let i = 1; i < rows; i += 1) {
      for (let j = 1; j < cols; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    return matrix[rows - 1][cols - 1];
  }

  function findFuzzyMaster(key) {
    if (!key || key.length < 3) return null;
    const prefix = key.slice(0, 3);
    let best = null;

    for (const entry of state.masterEntries) {
      const lemmaKey = entry.key;
      if (!lemmaKey || (!lemmaKey.startsWith(prefix) && !prefix.startsWith(lemmaKey.slice(0, 2)))) continue;
      const distance = levenshtein(key, lemmaKey);
      if (distance > 2) continue;
      if (!best || distance < best.distance || (distance === best.distance && lemmaKey.length < best.entry.key.length)) {
        best = { entry, distance };
      }
    }

    return best?.entry || null;
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`No se pudo cargar ${url}`);
    return response.json();
  }

  function pickMasterDefinition(item) {
    return item?.definicion || item?.definición || item?.entrada_impresa || '';
  }

  async function loadMasterDictionary() {
    const payload = await fetchJson('../diccionario/masterdiccionario.json');
    const items = Array.isArray(payload?.items) ? payload.items : [];
    items.forEach(item => {
      const lemma = item?.lemma;
      const key = normalizeGreek(lemma);
      if (!key) return;
      const entry = {
        key,
        lemma: lemma || item?.['Forma lexica'] || '—',
        formaLexica: item?.['Forma lexica'] || '—',
        formaTexto: item?.['Forma flexionada del texto'] || '—',
        definicion: pickMasterDefinition(item) || 'Sin definición disponible.'
      };

      if (!state.masterByLemma.has(key)) {
        state.masterByLemma.set(key, entry);
        state.masterEntries.push(entry);
      }

      addToIndex(state.masterByForm, key, entry);
      splitGreekTokens(entry.formaTexto).forEach(token => {
        addToIndex(state.masterByForm, normalizeGreek(token), entry);
      });
    });
  }

  async function loadChavezIndex() {
    const payload = await fetchJson('../diccionario/strongs-greek-chavez.index.min.json');
    state.chavezEntries = payload?.e || {};
    state.chavezAliases = payload?.a || {};
    state.chavezShardTemplate = payload?.m?.detail_path_template || state.chavezShardTemplate;
  }

  function getChavezStrong(rowKey) {
    const row = state.chavezEntries[rowKey];
    if (!row || !Array.isArray(row)) return null;
    return {
      strong: rowKey,
      lemma: row[0] || '',
      transliteration: row[1] || '',
      pronunciation: row[2] || '',
      shortDefinition: row[3] || '',
      shard: row[4] || ''
    };
  }

  function resolveChavezStrong(rawGreek, result) {
    const variants = new Set();
    const push = value => {
      if (!value) return;
      variants.add(String(value).trim().toLowerCase());
      variants.add(normalizeGreek(value));
      variants.add(normalizeLatin(value));
    };

    push(rawGreek);
    push(result?.master?.lemma);
    push(result?.master?.formaLexica);
    push(result?.token);
    buildGreekLemmaCandidates(normalizeGreek(rawGreek)).forEach(value => variants.add(value));

    for (const variant of variants) {
      const hit = state.chavezAliases?.[variant];
      if (hit) return String(hit).toUpperCase();
    }
    return '';
  }

  async function loadChavezShard(shard) {
    const shardKey = String(shard || '').trim();
    if (!shardKey) return {};
    if (state.chavezShardCache.has(shardKey)) return state.chavezShardCache.get(shardKey);

    const path = `../diccionario/${state.chavezShardTemplate.replace('{shard}', shardKey)}`;
    const promise = fetchJson(path).then(payload => payload?.e || {}).catch(() => ({}));
    state.chavezShardCache.set(shardKey, promise);
    return promise;
  }

  function decodeHtmlEntities(text) {
    const area = document.createElement('textarea');
    area.innerHTML = String(text || '');
    return area.value || '';
  }

  function stripHtmlToText(html) {
    return decodeHtmlEntities(
      String(html || '')
        .replace(/<\s*(?:p|br)\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
    )
      .replace(/\r/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function esc(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function buildCombinedDefinition(primary, secondary) {
    const seen = new Set();
    const parts = [];
    [primary, secondary].forEach(value => {
      const text = String(value || '').trim();
      if (!text || text === '—') return;
      const key = text.replace(/\s+/g, ' ').trim();
      if (seen.has(key)) return;
      seen.add(key);
      parts.push(`<p class="dict-paragraph">${esc(text)}</p>`);
    });
    return parts.join('') || '<p class="dict-paragraph">Sin definición disponible.</p>';
  }

  function lookupGreekWord(rawGreek) {
    const token = splitGreekTokens(rawGreek)[0] || String(rawGreek || '').trim();
    const key = normalizeGreek(token);
    if (!key) return null;

    let master = state.masterByLemma.get(key)
      || state.masterByForm.get(key)
      || null;

    if (!master) {
      const variants = buildGreekLemmaCandidates(key);
      for (const variant of variants) {
        master = state.masterByLemma.get(variant) || state.masterByForm.get(variant) || null;
        if (master) break;
      }
    }

    if (!master) {
      master = findFuzzyMaster(key);
    }

    return { token, key, master };
  }

  async function ensureLoaded() {
    if (state.loaded) return;
    if (state.loadPromise) return state.loadPromise;

    state.loadPromise = Promise.all([
      loadMasterDictionary(),
      loadChavezIndex()
    ]).then(() => {
      state.loaded = true;
    }).catch(error => {
      console.error('[diccionario_a_griego] Error cargando recursos griegos', error);
      throw error;
    });

    return state.loadPromise;
  }

  async function renderGreekDictionaryCell(rawGreek, rawQuery) {
    const primarySource = String(rawGreek || '').trim();
    const querySource = String(rawQuery || '').trim();
    const result = lookupGreekWord(primarySource) || lookupGreekWord(querySource);

    if (!result) {
      return `<div class="comparison-pre comparison-pre--greek">Sin término griego utilizable para consulta.</div>`;
    }

    const chavezStrong = resolveChavezStrong(primarySource || querySource, result);
    const chavezMeta = chavezStrong ? getChavezStrong(chavezStrong) : null;
    let chavezDefinition = '';
    if (chavezMeta?.shard) {
      const shardEntries = await loadChavezShard(chavezMeta.shard);
      chavezDefinition = stripHtmlToText(shardEntries[chavezStrong] || '');
    }

    const title = result.master?.lemma || chavezMeta?.lemma || result.token || '—';
    const formaLexica = result.master?.formaLexica || chavezMeta?.transliteration || '—';
    const definitionHtml = buildCombinedDefinition(result.master?.definicion || '', chavezDefinition || chavezMeta?.shortDefinition || '');

    return result.master || chavezMeta
      ? `<div class="trilingual-brief mt-3 dict-entry">
          <div class="dict-entry-header">
            <div class="dict-entry-kicker">Diccionario A</div>
            <div class="dict-entry-title greek">${esc(title)}</div>
          </div>
          <div class="trilingual-line"><strong>Lema:</strong> <span class="greek">${esc(title)}</span></div>
          <div class="trilingual-line"><strong>Forma léxica:</strong> <span class="greek">${esc(formaLexica)}</span></div>
          <div class="trilingual-line mt-2"><strong>Definición:</strong><div class="mt-2">${definitionHtml}</div></div>
        </div>`
      : '<div class="trilingual-brief mt-3"><div class="dict-entry-kicker">Diccionario A</div><div class="muted">Sin entrada directa para este término.</div></div>';
  }

  window.AnalisisDiccionarioAGriego = {
    ensureLoaded,
    renderGreekDictionaryCell
  };
})();
