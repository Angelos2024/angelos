(function () {

  const state = {
    loaded: false,
    loadPromise: null,
     masterByLemma: new Map(),
    masterByForm: new Map(),
    masterEntries: []
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

  function buildGreekLemmaCandidates(key) {
    const variants = new Set([key]);
    const replaceEnding = (ending, replacement) => {
      if (!key.endsWith(ending) || key.length <= ending.length) return;
      variants.add(key.slice(0, -ending.length) + replacement);
    };
// --- 1. SUSTANTIVOS Y ADJETIVOS (Segunda y Primera Declinación) ---
  // Casos oblicuos de masculinos/neutros -> Nominativo -ος / -ον
  replaceEnding('ου', ['ος', 'ον']);
  replaceEnding('ῳ',  ['ος', 'ον', 'α']);
  replaceEnding('ον', 'ος'); // Podría ser neutro o acusativo masc.
  replaceEnding('οι', 'ος');
  replaceEnding('ους', 'ος');
  replaceEnding('α',  ['ος', 'ον', 'η', 'ας']); // Neutros plurales o casos de la 1ra
  
  // Casos de la Primera Declinación (Femeninos) -> Nominativo -η / -α / -ας
  replaceEnding('ης', ['η', 'α']);
  replaceEnding('ῃ',  ['η', 'α']);
  replaceEnding('ην', ['η', 'α']);
  replaceEnding('αι', ['η', 'α']);
  replaceEnding('ων', ['ος', 'η', 'α', 'ις']); // Genitivos plurales (muy común)
  replaceEnding('ας', ['α', 'ης', 'η']);

  // --- 2. TERCERA DECLINACIÓN (Temas en consonante e -ις) ---
  replaceEnding('ιος', 'ις');
  replaceEnding('εως', 'ις');
  replaceEnding('ει',  'ις');
  replaceEnding('ιν',  'ις');
  replaceEnding('ες',  'ις');
  
  // --- 3. VERBOS (Formas Flexionadas a Lemas -ω o -ομαι) ---
  // El griego bíblico está lleno de verbos en presente, aoristo y participios
  replaceEnding('ειν', 'ω');       // Infinitivos
  replaceEnding('εις', 'ω');       // 2da persona
  replaceEnding('ει',  'ω');       // 3ra persona
  replaceEnding('ομεν', 'ω');      // 1ra plural
  replaceEnding('ετε',  'ω');      // 2da plural
  replaceEnding('ουσι', 'ω');      // 3ra plural
  replaceEnding('ουσιν', 'ω');     // 3ra plural con n-efelquística
  
  // Formas de verbos deponentes o pasivos -> -ομαι
  replaceEnding('εται', 'ομαι');
  replaceEnding('ονται', 'ομαι');
  replaceEnding('εσθαι', 'ομαι');
  replaceEnding('ουται', 'οομαι'); // Verbos contractos

  // --- 4. PARTICIPIOS (Clave para la lectura bíblica) ---
  // Los participios suelen terminar en -ων, -οντος, -μενος
  replaceEnding('οντος', 'ω');
  replaceEnding('οντα',  'ω');
  replaceEnding('μενος', ['ω', 'ομαι']);
  replaceEnding('μενον', ['ω', 'ομαι']);
  replaceEnding('μενου', ['ω', 'ομαι']);

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

  
  function ensureLoaded() {
    if (state.loaded) return Promise.resolve();
    if (state.loadPromise) return state.loadPromise;

    state.loadPromise = Promise.all([
            loadMasterDictionary()
    ]).then(() => {
      state.loaded = true;
    }).catch(error => {
      console.error('[diccionario_a_griego] Error cargando recursos griegos', error);
    });

    return state.loadPromise;
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

  function esc(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function renderGreekDictionaryCell(rawGreek, rawQuery) {
    const result = lookupGreekWord(rawGreek);

    if (!result) {
      return `<div class="comparison-pre comparison-pre--greek">Sin término griego utilizable para consulta.</div>`;
    }

    const masterBlock = result.master
            ? `<div class="trilingual-brief mt-3 dict-entry">
          <div class="dict-entry-header">
            <div class="dict-entry-kicker">Diccionario A</div>
            <div class="dict-entry-title greek">${esc(result.master.lemma)}</div>
          </div>
          <div class="trilingual-line"><strong>Lema:</strong> <span class="greek">${esc(result.master.lemma)}</span></div>
          <div class="trilingual-line"><strong>Forma léxica:</strong> <span class="greek">${esc(result.master.formaLexica)}</span></div>
          <div class="trilingual-line mt-2"><strong>Definición:</strong> ${esc(result.master.definicion)}</div>
        </div>`
    : '<div class="trilingual-brief mt-3"><div class="dict-entry-kicker">Diccionario A</div><div class="muted">Sin entrada directa para este término.</div></div>';

        return masterBlock;
  }

  window.AnalisisDiccionarioAGriego = {
    ensureLoaded,
    renderGreekDictionaryCell
  };
})();
