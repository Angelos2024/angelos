(function () {

  const LXX_FREQ_MIN_URLS = [
    '../LXX/frecuencias/min.json',
    './LXX/frecuencias/min.json',
    '/LXX/frecuencias/min.json'
  ];

   const ES_FREQ_MIN_URLS = [
    '../librosRV1960/frecuencias/min.json',
    './librosRV1960/frecuencias/min.json',
    '/librosRV1960/frecuencias/min.json'
  ];
  const HE_FREQ_MIN_URLS = [
    '../IdiomaORIGEN/frecuencias/min.json',
    './IdiomaORIGEN/frecuencias/min.json',
    '/IdiomaORIGEN/frecuencias/min.json'
  ];
  const RKANT_FREQ_MIN_URLS = [
    '../RKANT/min.json',
    './RKANT/min.json',
    '/RKANT/min.json'
  ];

  const jsonCache = new Map();
   let hebrewRootsPromise = null;
  let hebrewRootsIndex = null;
    let hebrewRootsStrongIndex = null;
     let hebrewUnifiedPromise = null;
  let hebrewUnifiedStrongIndex = null;
  let lxxFrequencyIndexPromise = null;
  let esFrequencyIndexPromise = null;
  let heFrequencyIndexPromise = null;
  let rkantFrequencyIndexPromise = null;

  const state = {
    rows: [],
    rawQuery: '',
  selectedByLang: { he: '—', gr_lxx: '—', gr_nt: '—', es: '—' },
        activeGreekLang: null,
      loadingDonut: false
      };

  function escapeHtml(text) {
    return String(text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function splitWords(value, lang) {
    const raw = String(value || '').trim();
    if (!raw) return [];

let normalized = raw
      .replace(/[;,·/]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

     // Mantener el ajuste del maqaf restringido a hebreo para no tocar otros idiomas.
    if (lang === 'he') {
      return Array.from(new Set(tokenizeHebrewForLookup(normalized)));
          }

    const words = normalized.split(' ').map((w) => w.trim()).filter(Boolean);
    if (!words.length) return [];

    if (lang === 'es') {
      // Dedupe case-insensitive en español, preservando la forma original visible.
      const seen = new Set();
      const out = [];
      words.forEach((word) => {
        const key = normalizeSpanish(word);
        if (!key || seen.has(key)) return;
        seen.add(key);
        out.push(word);
      });
      return out;
    }
return Array.from(new Set(words));
  }

  function normalizeSpanish(text) {
    return String(text || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9ñ\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeGreek(text) {
    return String(text || '')
      .replace(/[··.,;:!?“”"(){}\[\]<>«»]/g, '')
      .replace(/\s/g, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function normalizeHebrew(text) {
     let value = String(text || '')
      .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069\u200C\u200D\uFEFF]/g, '');

    try {
      value = value.normalize('NFKC');
    } catch (_) {}

    return value
      .replace(/[\u05BE\-—]/g, ' ')
      .replace(/\u05BA/g, '\u05B9')
      .replace(/[^\u05D0-\u05EA\u05B0-\u05BB\u05BC\u05C1\u05C2\u05C7\s]/g, '')
      .normalize('NFC')
      .replace(/\s+/g, ' ')
      .trim();
  }
    function normalizeHebrewRootKey(text) {
    return normalizeHebrew(text)
      .normalize('NFD')
      .replace(/[\u0591-\u05C7]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .normalize('NFC');
  }
  function normalizeStrongKey(value) {
  const match = String(value || '').toUpperCase().match(/H?\s*0*(\d{1,4})/);
    return match ? `H${match[1]}` : '';
  }

  function getUnifiedStrongEntryByStrong(strong) {
    const key = normalizeStrongKey(strong);
    if (!key) return null;
    return hebrewUnifiedStrongIndex?.get(key) || null;
  }

  function getHebrewRootEntryByStrong(strong) {
    const key = normalizeStrongKey(strong);
    if (!key) return null;
    return hebrewRootsStrongIndex?.get(key) || null;
  }

   function tokenizeHebrewForLookup(text) {
    const normalized = normalizeHebrew(text);
    if (!normalized) return [];
    return normalized.match(/[^ \t\r\n]+/g) || [];
  }

async function ensureHebrewUnifiedLoaded() {
    if (hebrewUnifiedStrongIndex) return hebrewUnifiedStrongIndex;
    if (!hebrewUnifiedPromise) {
      hebrewUnifiedPromise = fetchJsonWithFallback([
        '../diccionario/diccionario_unificado.min.json'
      ]).then((payload) => {
        const entries = Array.isArray(payload) ? payload : [];
        const strongIndex = new Map();

        entries.forEach((entry) => {
          const strongKey = normalizeStrongKey(entry?.strong || entry?.strong_detail?.strong || '');
          if (strongKey && !strongIndex.has(strongKey)) strongIndex.set(strongKey, entry);
        });

        hebrewUnifiedStrongIndex = strongIndex;
        return strongIndex;
      }).catch((error) => {
        console.warn('No se pudo cargar diccionario/diccionario_unificado.min.json.', error);
        hebrewUnifiedStrongIndex = new Map();
        return hebrewUnifiedStrongIndex;
      });
    }
    return hebrewUnifiedPromise;
  }


 async function ensureHebrewRootsLoaded() {
    if (hebrewRootsIndex) return hebrewRootsIndex;
    if (!hebrewRootsPromise) {
      hebrewRootsPromise = fetchJsonWithFallback([
          '../dic/hebrew_roots.json'
      ]).then((payload) => {
        const entries = Array.isArray(payload) ? payload : [];
        const index = new Map();
        const strongIndex = new Map();

        entries.forEach((entry) => {
          const key = normalizeHebrewRootKey(entry?.lexeme || '');
        const strongKey = normalizeStrongKey(entry?.strong || '');

          if (key && !index.has(key)) index.set(key, entry);
          if (strongKey && !strongIndex.has(strongKey)) strongIndex.set(strongKey, entry);
           });
        
        hebrewRootsIndex = index;
        hebrewRootsStrongIndex = strongIndex;
        return index;
      }).catch((error) => {
        console.warn('No se pudo cargar dic/hebrew_roots.json.', error);
        hebrewRootsIndex = new Map();
         hebrewRootsStrongIndex = new Map();
        return hebrewRootsIndex;
      });
    }
    return hebrewRootsPromise;
  }

async function ensureHebrewUnifiedLoaded() {
    if (hebrewUnifiedStrongIndex) return hebrewUnifiedStrongIndex;
    if (!hebrewUnifiedPromise) {
      hebrewUnifiedPromise = fetchJsonWithFallback([
        '../diccionario/diccionario_unificado.min.json'
      ]).then((payload) => {
        const entries = Array.isArray(payload) ? payload : [];
        const strongIndex = new Map();

        entries.forEach((entry) => {
          const strongKey = normalizeStrongKey(entry?.strong || entry?.strong_detail?.strong || '');
          if (strongKey && !strongIndex.has(strongKey)) strongIndex.set(strongKey, entry);
        });

        hebrewUnifiedStrongIndex = strongIndex;
        return strongIndex;
      }).catch((error) => {
        console.warn('No se pudo cargar diccionario/diccionario_unificado.min.json.', error);
        hebrewUnifiedStrongIndex = new Map();
        return hebrewUnifiedStrongIndex;
      });
    }
    return hebrewUnifiedPromise;
  }

 function createRootReferenceButton(label, strong) {
    const strongKey = normalizeStrongKey(strong);
    if (!strongKey) return escapeHtml(label);
    return `<button type="button" class="root-ref-link hebrew" data-role="hebrew-root-link" data-strong="${escapeHtml(strongKey)}">${escapeHtml(label)}</button>`;
  }

function getStrongReferenceLabel(strong) {
    const key = normalizeStrongKey(strong);
    if (!key) return '';

    const entry = getUnifiedStrongEntryByStrong(key);
    if (!entry) return key;

    const lemma = entry?.strong_detail?.lemma || entry?.lemma || entry?.hebreo || entry?.forma || key;
    const translit = entry?.strong_detail?.transliteracion || entry?.transliteracion || '';
    return translit ? `${lemma} (${translit})` : String(lemma);
  }
  function renderRootTextWithLinks(text) {
    const raw = String(text || '').trim();
    if (!raw) return '—';

    const strongPattern = /H\d+/gi;
    let lastIndex = 0;
    let html = '';
    let match;

    while ((match = strongPattern.exec(raw))) {
      const strong = normalizeStrongKey(match[0]);
      const label = getStrongReferenceLabel(strong);
      const replacement = label ? createRootReferenceButton(label, strong) : escapeHtml(match[0]);
      html += escapeHtml(raw.slice(lastIndex, match.index));
      html += replacement;
      lastIndex = match.index + match[0].length;
    }

    html += escapeHtml(raw.slice(lastIndex));
    return html || '—';
  }
  function renderUnifiedHebrewRootsPanel(entry, strongKey) {
    const derivedEl = document.getElementById('hebrewRootDerivedFrom');
    const definitionEl = document.getElementById('hebrewRootDefinition');
    if (!derivedEl || !definitionEl) return;

    if (!entry) {
      renderHebrewRootsPanel(null);
      return;
    }

    const lemma = entry?.strong_detail?.lemma || entry?.lemma || entry?.hebreo || entry?.forma || strongKey || '—';
    const translit = entry?.strong_detail?.transliteracion || entry?.transliteracion || '';
    const derivation = entry?.strong_detail?.derivacion || entry?.derivacion || '';
    const definition = entry?.strong_detail?.definicion || entry?.definicion || entry?.strong_detail?.def_rv || entry?.def_rv || '—';

    derivedEl.innerHTML = `<span class="hebrew">${escapeHtml(lemma)}</span>${translit ? ` <span class="muted">(${escapeHtml(translit)})</span>` : ''}`;
    definitionEl.innerHTML = renderRootTextWithLinks([derivation, definition].filter(Boolean).join(' · '));
  }

  function renderHebrewRootsPanel(entry) {
    const derivedEl = document.getElementById('hebrewRootDerivedFrom');
    const definitionEl = document.getElementById('hebrewRootDefinition');
    if (!derivedEl || !definitionEl) return;

   if (!entry) {
      derivedEl.textContent = '—';
      definitionEl.textContent = '—';
      return;
    }

    derivedEl.innerHTML = `<span class="hebrew">${escapeHtml(entry?.lexeme || '—')}</span>`;
    definitionEl.innerHTML = renderRootTextWithLinks(entry?.definition_first_segment || entry?.root_first_segment || '—');
  }

  async function updateHebrewRootsPanel(wordOrStrong) {
      const derivedEl = document.getElementById('hebrewRootDerivedFrom');
    const definitionEl = document.getElementById('hebrewRootDefinition');
    if (!derivedEl || !definitionEl) return;

     const rawValue = String(wordOrStrong || '').trim();
    const normalizedWord = normalizeHebrewRootKey(rawValue);
    const normalizedStrong = normalizeStrongKey(rawValue);
    if ((!normalizedWord || normalizedWord === '—') && !normalizedStrong) {
      renderHebrewRootsPanel(null);
      return;
    }

    derivedEl.textContent = 'Consultando…';
    definitionEl.textContent = 'Consultando…';

    try {
      await Promise.all([ensureHebrewRootsLoaded(), ensureHebrewUnifiedLoaded()]);
      const index = hebrewRootsIndex || new Map();
      const rootEntry = (normalizedStrong && getHebrewRootEntryByStrong(normalizedStrong)) || index.get(normalizedWord) || null;
      if (rootEntry) {
        renderHebrewRootsPanel(rootEntry);
        return;
      }

    const unifiedEntry = normalizedStrong ? getUnifiedStrongEntryByStrong(normalizedStrong) : null;
      renderUnifiedHebrewRootsPanel(unifiedEntry, normalizedStrong);
    } catch (error) {
      console.warn('No se pudo actualizar el panel de raíces hebreas.', error);
      renderHebrewRootsPanel(null);
    }
      }

  async function fetchJsonWithFallback(urls) {
    let lastError = null;
    for (const url of urls || []) {
      try {
        if (jsonCache.has(url)) return jsonCache.get(url);
        const response = await fetch(url, { cache: 'force-cache' });
        if (!response.ok) {
          lastError = new Error(`No se pudo cargar ${url} (HTTP ${response.status}).`);
          continue;
        }
        const payload = await response.json();
        jsonCache.set(url, payload);
        return payload;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error('No se pudo cargar el índice de búsqueda.');
  }

  

function buildRowsFromBookCounts(bookCounts) {
    if (!bookCounts || typeof bookCounts !== 'object') return [];
    return Object.entries(bookCounts)
      .filter(([, count]) => Number.isFinite(Number(count)) && Number(count) > 0)
      .map(([book, count]) => ({
        book,
        label: book.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()),
        count: Number(count)
      }))
      .sort((a, b) => b.count - a.count);
  }

  async function buildFrequencyIndex(urls, normalizeWord) {
      const payload = await fetchJsonWithFallback(urls);
      const entries = Array.isArray(payload) ? payload : [];
      const index = new Map();

      entries.forEach((entry) => {
         const rawWord = entry?.palabra || '';
        const keys = normalizeWord === normalizeHebrew
          ? tokenizeHebrewForLookup(rawWord)
          : [normalizeWord(rawWord)].filter(Boolean);
        if (!keys.length) return;

        const sourceBooks = entry?.libros && typeof entry.libros === 'object' ? entry.libros : null;
        if (!sourceBooks) return;

         keys.forEach((key) => {
          const target = index.get(key) || Object.create(null);
          Object.entries(sourceBooks).forEach(([book, count]) => {
            const safeCount = Number(count) || 0;
            if (safeCount <= 0) return;
            target[book] = (target[book] || 0) + safeCount;
          });
          index.set(key, target);
        });
      });

      return index;
    }

 async function getLxxFrequencyIndex() {
    if (lxxFrequencyIndexPromise) return lxxFrequencyIndexPromise;
    lxxFrequencyIndexPromise = buildFrequencyIndex(LXX_FREQ_MIN_URLS, normalizeGreek);


    try {
      return await lxxFrequencyIndexPromise;
    } catch (error) {
      lxxFrequencyIndexPromise = null;
      throw error;
    }
  }

 async function getEsFrequencyIndex() {
    if (esFrequencyIndexPromise) return esFrequencyIndexPromise;
    esFrequencyIndexPromise = buildFrequencyIndex(ES_FREQ_MIN_URLS, normalizeSpanish);

    try {
      return await esFrequencyIndexPromise;
    } catch (error) {
      esFrequencyIndexPromise = null;
      throw error;
    }
  }

  async function getHeFrequencyIndex() {
    if (heFrequencyIndexPromise) return heFrequencyIndexPromise;
    heFrequencyIndexPromise = buildFrequencyIndex(HE_FREQ_MIN_URLS, normalizeHebrew);

    try {
      return await heFrequencyIndexPromise;
    } catch (error) {
      heFrequencyIndexPromise = null;
      throw error;
    }
  }

  async function getRkantFrequencyIndex() {
    if (rkantFrequencyIndexPromise) return rkantFrequencyIndexPromise;
    rkantFrequencyIndexPromise = buildFrequencyIndex(RKANT_FREQ_MIN_URLS, normalizeGreek);

    try {
      return await rkantFrequencyIndexPromise;
    } catch (error) {
      rkantFrequencyIndexPromise = null;
      throw error;
    }
  }

  async function rowsFromFrequencyIndex(word, normalizeWord, getIndex) {
    const key = normalizeWord(word);
    if (!key) return [];
    const index = await getIndex();
        return buildRowsFromBookCounts(index.get(key));
  }
   async function rowsForEsWord(word) {
    return rowsFromFrequencyIndex(word, normalizeSpanish, getEsFrequencyIndex);
  }

  async function rowsForHeWord(word) {
   const index = await getHeFrequencyIndex();
    const tokens = tokenizeHebrewForLookup(word);
    if (!tokens.length) return [];

    const merged = Object.create(null);
    tokens.forEach((token) => {
      const counts = index.get(token);
      if (!counts) return;
      Object.entries(counts).forEach(([book, count]) => {
        const safeCount = Number(count) || 0;
        if (safeCount <= 0) return;
        merged[book] = (merged[book] || 0) + safeCount;
      });
    });

    return buildRowsFromBookCounts(merged);
      }

  async function rowsForRkantWord(word) {
    return rowsFromFrequencyIndex(word, normalizeGreek, getRkantFrequencyIndex);
  }

 async function rowsForLxxWord(word) {
    return rowsFromFrequencyIndex(word, normalizeGreek, getLxxFrequencyIndex);
  }
  async function updateDonutFromSelection() {
    const donut = window.AnalisisComparativoOccurrenceDonut;
    if (!donut?.setData || state.loadingDonut) return;
    state.loadingDonut = true;
    try {
      const [esResult, heResult, grRkantResult, grLxxResult] = await Promise.allSettled([
        rowsForEsWord(state.selectedByLang.es),
        rowsForHeWord(state.selectedByLang.he),
         rowsForRkantWord(state.selectedByLang.gr_nt !== '—' ? state.selectedByLang.gr_nt : state.selectedByLang.gr_lxx),
        rowsForLxxWord(state.selectedByLang.gr_lxx)
      ]);

      const esRows = esResult.status === 'fulfilled' ? esResult.value : [];
      const heRows = heResult.status === 'fulfilled' ? heResult.value : [];
      const grRkantRows = grRkantResult.status === 'fulfilled' ? grRkantResult.value : [];
      const grLxxRows = grLxxResult.status === 'fulfilled' ? grLxxResult.value : [];

      donut.setData({
         es: esRows,
        he: heRows,
        gr_rkant: grRkantRows,
        gr_lxx: grLxxRows
      });
       } finally {
      state.loadingDonut = false;
    }
  }


  function createSelectableRow(entry) {
    const heRaw = entry?.he || entry?.hebrew || entry?.palabra || '';
    const grRaw = entry?.gr || entry?.equivalencia_griega || entry?.greek || '';
    const grNtRaw = entry?.gr_nt || entry?.equivalencia_griega_nt || entry?.greek_nt || '';
    const esRaw = entry?.es || entry?.equivalencia_espanol || entry?.equivalencia || '';

    return {
      entry,
      words: {
        he: splitWords(heRaw, 'he'),
  gr_lxx: splitWords(grRaw, 'gr'),
        gr_nt: splitWords(grNtRaw, 'gr'),
                es: splitWords(esRaw, 'es')
      }
    };
  }

  function ensureInitialSelection() {
    const first = state.rows[0];
    state.selectedByLang = {
      he: first?.words?.he?.[0] || '—',
gr_lxx: first?.words?.gr_lxx?.[0] || '—',
      gr_nt: first?.words?.gr_nt?.[0] || '—',
            es: first?.words?.es?.[0] || '—'
    };
     const initialGreek = state.selectedByLang.gr_lxx !== '—'
      ? state.selectedByLang.gr_lxx
      : state.selectedByLang.gr_nt;

    if (initialGreek && initialGreek !== '—') {
      applyGreekSelection(state.selectedByLang.gr_lxx !== '—' ? 'gr_lxx' : 'gr_nt', initialGreek);
    }
  }

  function greekWordExists(lang, word) {
    if (!word || word === '—') return false;
    return state.rows.some((row) => (row?.words?.[lang] || []).includes(word));
  }
 function applyGreekSelection(lang, wordValue) {
    const isLxx = lang === 'gr_lxx';
    const currentLang = isLxx ? 'gr_lxx' : 'gr_nt';
    const otherLang = isLxx ? 'gr_nt' : 'gr_lxx';
    const existsInOther = greekWordExists(otherLang, wordValue);

    state.selectedByLang[currentLang] = wordValue;
    state.selectedByLang[otherLang] = existsInOther ? wordValue : '—';
  }

  function isWordSelected(lang, word) {
    return String(state.selectedByLang?.[lang] || '') === String(word || '');
  }

  function renderWords(rowIndex, lang) {
    const words = state.rows[rowIndex]?.words?.[lang] || [];
    if (!words.length) return '<span class="result-option-text">—</span>';

    return words.map((word, wordIndex) => {
      const selected = isWordSelected(lang, word);
      return `<button type="button" class="result-word ${selected ? 'is-active' : ''}" data-role="result-word" data-row="${rowIndex}" data-lang="${lang}" data-word-index="${wordIndex}">${escapeHtml(word)}</button>`;
    }).join(' ');
  }

  function renderRows() {
    const tbody = document.getElementById('resultsTbody');
    if (!tbody) return;

    tbody.innerHTML = state.rows.map((row, rowIndex) => `
      <tr data-row-index="${rowIndex}">
        <td class="he">${renderWords(rowIndex, 'he')}</td>
 <td class="gr" data-gr-source="lxx" style="font-family: 'Times New Roman', serif; font-size: 1.2rem; color: #1e3a8a;">${renderWords(rowIndex, 'gr_lxx')}</td>
        <td class="gr gr-nt" data-gr-source="rknt" style="font-family: 'Times New Roman', serif; font-size: 1.2rem; color: #1e3a8a;">${renderWords(rowIndex, 'gr_nt')}</td>
                <td class="es">${row.entry._isSynthetic ? `<small style="color:var(--muted)">[Sintético]</small> ` : ''}${renderWords(rowIndex, 'es')}</td>
      </tr>
    `).join('');
  }

  function buildSelectedEntry() {
    const baseEntry = state.rows[0]?.entry;
    if (!baseEntry) return null;

    return {
      ...baseEntry,
      he: state.selectedByLang.he,
 gr: state.selectedByLang.gr_lxx,
      gr_nt: state.selectedByLang.gr_nt,
            es: state.selectedByLang.es
    };
  }

  function refreshComparisonAndSummary() {
    const selectedEntry = buildSelectedEntry();
    const api = window.TrilingueComparativoAPI;

    if (!selectedEntry) {
      api?.updateDictionaryComparison?.([], state.rawQuery);
      return;
    }

    api?.updateDictionaryComparison?.([selectedEntry], state.rawQuery);
    updateHebrewRootsPanel(selectedEntry.he).catch(() => {});

    const summaryApi = window.BuscadorResumenLema;
    if (summaryApi?.renderLemmaSummaryForSearch) {
      summaryApi.renderLemmaSummaryForSearch(state.rawQuery, {
        ok: true,
        matches: [selectedEntry],
        diag: 'Resumen actualizado con selección manual por palabra e idioma.'
      }).catch(() => {});
    }
  }

  function onResultsRendered(event) {
    const items = Array.isArray(event?.detail?.items) ? event.detail.items : [];
    state.rawQuery = String(event?.detail?.rawQuery || '');

    if (!items.length) {
      state.rows = [];
            updateHebrewRootsPanel('').catch(() => {});
      window.AnalisisComparativoOccurrenceDonut?.setData?.({ es: [], he: [], gr_rkant: [], gr_lxx: [] });      return;
      }

    state.rows = items.map((entry) => createSelectableRow(entry));
    ensureInitialSelection();
    renderRows();
    refreshComparisonAndSummary();
    updateDonutFromSelection();
  }
function onHebrewRootsClick(event) {
    const target = event.target instanceof HTMLElement
      ? event.target.closest('[data-role="hebrew-root-link"]')
      : null;
    if (!target) return;

    const strong = String(target.dataset.strong || '').trim();
    if (!strong) return;
    updateHebrewRootsPanel(strong).catch(() => {});
  }

  function onResultsClick(event) {
    const target = event.target instanceof HTMLElement
      ? event.target.closest('[data-role="result-word"]')
      : null;
    if (!target) return;

    const rowIndex = Number.parseInt(target.dataset.row || '', 10);
    const lang = String(target.dataset.lang || '');
    const wordIndex = Number.parseInt(target.dataset.wordIndex || '', 10);

    const words = state.rows[rowIndex]?.words?.[lang] || [];
    const wordValue = words[wordIndex];
 if (!wordValue || !['he', 'gr_lxx', 'gr_nt', 'es'].includes(lang)) return;


  if (lang === 'gr_lxx' || lang === 'gr_nt') {
      applyGreekSelection(lang, wordValue);
    } else {
      state.selectedByLang[lang] = wordValue;
    }
    
    if (!state.rawQuery) {
      state.rawQuery = String(document.getElementById('query')?.value || '').trim();
    }

    renderRows();
    refreshComparisonAndSummary();
    updateDonutFromSelection();
  }

  function init() {
    window.addEventListener('trilingue:results-rendered', onResultsRendered);
    const tbody = document.getElementById('resultsTbody');
    if (tbody) tbody.addEventListener('click', onResultsClick);

    const rootsPanel = document.getElementById('hebrewRootsPanel');
    if (rootsPanel) rootsPanel.addEventListener('click', onHebrewRootsClick);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
