(function(){
  const ACCESS_KEY = 'angelos.admin.interlinear.access';
  const ACCESS_TTL_MS = 8 * 60 * 60 * 1000;
  const ADMIN_PASSWORD_HASH = '9ece8d19ac8b4bb531ad35e6e6ef440e9e4815868d0f8912585b97f0e6dc2d8c';
  const LAB_MODE_LABEL = 'Morfologia AT';

  // Tanda 1: versionado de datos + ajustes de carga.
  // Cambia DATA_VERSION cuando se actualicen los JSON fuente para invalidar caches.
  const DATA_VERSION = '2026-05-16';
  const RENDER_BATCH_SIZE = 6;
  const IDB_NAME = 'angelos-admin-cache';
  const IDB_STORE = 'json-blobs';
  const IDB_VERSION = 1;
  const NORMALIZE_CACHE_LIMIT = 50000;

  // Tanda 2: índices precompilados (genéralos con scripts/build-bible-indices.js).
  const MANIFEST_PATH = './IdiomaORIGEN/manifest.json';
  const MORPH_INDEX_PATH = './IdiomaORIGEN/morph-index.min.json';
  const LXX_SHIFT_PATH = './IdiomaORIGEN/lxx-mt-verse-shift.min.json';
  /** Pistas editoriales MT⇄token LXX: capitulos opcionales en IdiomaORIGEN/lxx-mt-word-hints/chapters/<slug>/<n>.json */
  const lxxWordHintsChapterUrl = (slug, chapter) =>
    `./IdiomaORIGEN/lxx-mt-word-hints/chapters/${slug}/${chapter}.json`;
  /** Fragmentos opcionales: generados por `node scripts/atomize-lxx-chapters.js` */
  const LXX_ATOMIZED_DIR = './LXX/chapters';

  let renderToken = 0;
  let chapterListSlug = null;
  let idbPromise = null;
  let manifestPromise = null;
  let lxxShiftPromise = null;
  const otLxxChapterCache = new Map();

  const OT_BOOKS = [
    ['genesis', 'Genesis', '01_Génesis.json'],
    ['exodo', 'Exodo', '02_Éxodo.json'],
    ['levitico', 'Levitico', '03_Levítico.json'],
    ['numeros', 'Numeros', '04_Números.json'],
    ['deuteronomio', 'Deuteronomio', '05_Deuteronomio.json'],
    ['josue', 'Josue', '06_Josué.json'],
    ['jueces', 'Jueces', '07_Jueces.json'],
    ['rut', 'Rut', '08_Rut.json'],
    ['1_samuel', '1 Samuel', '09_1_Samuel.json'],
    ['2_samuel', '2 Samuel', '10_2_Samuel.json'],
    ['1_reyes', '1 Reyes', '11_1_Reyes.json'],
    ['2_reyes', '2 Reyes', '12_2_Reyes.json'],
    ['1_cronicas', '1 Cronicas', '13_1_Crónicas.json'],
    ['2_cronicas', '2 Cronicas', '14_2_Crónicas.json'],
    ['esdras', 'Esdras', '15_Esdras.json'],
    ['nehemias', 'Nehemias', '16_Nehemías.json'],
    ['ester', 'Ester', '17_Ester.json'],
    ['job', 'Job', '18_Job.json'],
    ['salmos', 'Salmos', '19_Salmos.json'],
    ['proverbios', 'Proverbios', '20_Proverbios.json'],
    ['eclesiastes', 'Eclesiastes', '21_Eclesiastés.json'],
    ['cantares', 'Cantares', '22_Cantares.json'],
    ['isaias', 'Isaias', '23_Isaías.json'],
    ['jeremias', 'Jeremias', '24_Jeremías.json'],
    ['lamentaciones', 'Lamentaciones', '25_Lamentaciones.json'],
    ['ezequiel', 'Ezequiel', '26_Ezequiel.json'],
    ['daniel', 'Daniel', '27_Daniel.json'],
    ['oseas', 'Oseas', '28_Oseas.json'],
    ['joel', 'Joel', '29_Joel.json'],
    ['amos', 'Amos', '30_Amós.json'],
    ['abdias', 'Abdias', '31_Abdías.json'],
    ['jonas', 'Jonas', '32_Jonás.json'],
    ['miqueas', 'Miqueas', '33_Miqueas.json'],
    ['nahum', 'Nahum', '34_Nahúm.json'],
    ['habacuc', 'Habacuc', '35_Habacuc.json'],
    ['sofonias', 'Sofonias', '36_Sofonías.json'],
    ['hageo', 'Hageo', '37_Hageo.json'],
    ['zacarias', 'Zacarias', '38_Zacarías.json'],
    ['malaquias', 'Malaquias', '39_Malaquías.json']
  ];

  const BOOK_MAP = new Map(OT_BOOKS.map(([slug, label, file]) => [slug, { slug, label, file }]));
  const LABEL_TO_SLUG = new Map(OT_BOOKS.map(([slug, label]) => [normalizeKey(label), slug]));
  const chapterCountCache = new Map();
  const interlinearCache = new Map();
  const oshbMorphCache = new Map();
  // Tanda 3: caches por capítulo (clave "slug:N"). Liviano y separado del libro completo.
  const interlinearChapterCache = new Map();
  const oshbChapterCache = new Map();
  let hebrewDictionaryPromise = null;
  let hebrewMorphIndexPromise = null;

  const els = {
    form: document.getElementById('adminSearchForm'),
    input: document.getElementById('adminSearchInput'),
    title: document.getElementById('adminPageTitle'),
    meta: document.getElementById('adminMetaReference'),
    panelTitle: document.getElementById('adminPanelHeaderTitle'),
    mount: document.getElementById('adminEditorMount'),
    statusBadge: document.getElementById('adminStatusBadge'),
    saveBtn: document.getElementById('adminSaveDraftBtn'),
    exportBtn: document.getElementById('adminExportBtn'),
    resetBtn: document.getElementById('adminResetChapterBtn'),
    prevBtn: document.getElementById('adminPrevChapterBtn'),
    nextBtn: document.getElementById('adminNextChapterBtn'),
    verseCount: document.getElementById('adminVerseCount'),
    tokenCount: document.getElementById('adminTokenCount'),
    draftState: document.getElementById('adminDraftState'),
    themeMenuBtn: document.getElementById('adminThemeMenuBtn'),
    bookToggle: document.getElementById('adminBookMenuToggle'),
    bookDropdown: document.getElementById('adminBookMenuDropdown'),
    bookListOT: document.getElementById('adminBookListOT'),
    bookListNT: document.getElementById('adminBookListNT'),
    chapterList: document.getElementById('adminChapterList'),
    chapterTitle: document.getElementById('adminChapterTitle')
  };

  const state = {
    slug: 'genesis',
    label: 'Genesis',
    chapter: 1
  };
  const AdminEngine = window.AdminHebrewInterlinearEngine || null;

  function normalizeKey(value){
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function escapeHtml(value){
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  const normalizeHebrewCachePointed = new Map();
  const normalizeHebrewCachePlain = new Map();

  function normalizeHebrew(value, preservePoints = false){
    const key = String(value || '');
    if(!key) return '';
    const cache = preservePoints ? normalizeHebrewCachePointed : normalizeHebrewCachePlain;
    const hit = cache.get(key);
    if(hit !== undefined) return hit;
    let clean = key
      .replace(/[\u200c-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, '')
      .replace(/[\u0591-\u05AF]/g, '')
      .replace(/[\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4]/g, '')
      .trim();
    if(!preservePoints){
      clean = clean.replace(/[\u05B0-\u05BC\u05BD\u05BF\u05C1-\u05C2\u05C7]/g, '');
    }
    if(cache.size >= NORMALIZE_CACHE_LIMIT) cache.clear();
    cache.set(key, clean);
    return clean;
  }

  function setBadge(message, tone){
    if(!els.statusBadge) return;
    if(!message){
      els.statusBadge.style.display = 'none';
      els.statusBadge.textContent = '';
      els.statusBadge.classList.remove('ok', 'err');
      return;
    }
    els.statusBadge.style.display = 'inline-flex';
    els.statusBadge.textContent = message;
    els.statusBadge.classList.toggle('ok', tone === 'ok');
    els.statusBadge.classList.toggle('err', tone === 'err');
  }

  function updateDraftStateLabel(){
    if(els.draftState) els.draftState.textContent = LAB_MODE_LABEL;
  }

  async function sha256(text){
    const bytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
  }

  function hasFreshAccess(){
    const raw = Number(sessionStorage.getItem(ACCESS_KEY) || 0);
    return raw > 0 && (Date.now() - raw) < ACCESS_TTL_MS;
  }

  async function ensureAccess(){
    if(hasFreshAccess()){
      sessionStorage.setItem(ACCESS_KEY, String(Date.now()));
      return true;
    }
    const password = window.prompt('Contrasena de admin');
    if(!password) return false;
    const candidateHash = await sha256(password.trim());
    if(candidateHash !== ADMIN_PASSWORD_HASH){
      window.alert('Contrasena incorrecta.');
      return false;
    }
    sessionStorage.setItem(ACCESS_KEY, String(Date.now()));
    return true;
  }

  function openIdb(){
    if(idbPromise) return idbPromise;
    idbPromise = new Promise((resolve, reject) => {
      if(typeof indexedDB === 'undefined'){ reject(new Error('IndexedDB no disponible')); return; }
      let req;
      try { req = indexedDB.open(IDB_NAME, IDB_VERSION); }
      catch(error){ reject(error); return; }
      req.onupgradeneeded = () => {
        const db = req.result;
        if(!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('IndexedDB bloqueada'));
    }).catch((error) => { idbPromise = null; throw error; });
    return idbPromise;
  }

  async function idbGet(key){
    try {
      const db = await openIdb();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch(_error){
      return null;
    }
  }

  async function idbPut(key, payload){
    try {
      const db = await openIdb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        const req = tx.objectStore(IDB_STORE).put(payload, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch(_error){
      // Sin persistencia: continuamos con el cache en memoria.
    }
  }

  async function loadJson(path){
    const cacheKey = `${DATA_VERSION}::${path}`;
    const cached = await idbGet(cacheKey);
    if(cached && cached.version === DATA_VERSION && cached.data !== undefined){
      return cached.data;
    }
    const url = path.includes('?') ? path : `${path}?v=${encodeURIComponent(DATA_VERSION)}`;
    const response = await fetch(url, { cache: 'default' });
    if(!response.ok) throw new Error(`No se pudo cargar ${path} (HTTP ${response.status})`);
    const data = await response.json();
    idbPut(cacheKey, { version: DATA_VERSION, data, ts: Date.now() });
    return data;
  }

  async function getInterlinearBook(slug){
    const book = BOOK_MAP.get(slug);
    if(!book) throw new Error('Libro no soportado en el laboratorio hebreo.');
    if(!interlinearCache.has(slug)){
      interlinearCache.set(slug, loadJson(`./IdiomaORIGEN/interlineal/${book.file}`));
    }
    return interlinearCache.get(slug);
  }

  async function getOshbMorphBook(slug){
    const book = BOOK_MAP.get(slug);
    if(!book) throw new Error('Libro no soportado en la capa OSHB2.');
    if(!oshbMorphCache.has(slug)){
      oshbMorphCache.set(slug, loadJson(`./IdiomaORIGEN/oshb-morph/${book.file}`).catch((error) => {
        oshbMorphCache.delete(slug);
        throw error;
      }));
    }
    return oshbMorphCache.get(slug);
  }

  function getBookManifestInfo(manifest, slug){
    return manifest && manifest.books ? manifest.books[slug] : null;
  }

  function buildChapterUrl(scope, baseName, chapter){
    const safeBase = encodeURIComponent(baseName);
    return `./IdiomaORIGEN/${scope}/chapters/${safeBase}/${chapter}.json`;
  }

  async function getInterlinearChapter(slug, chapter){
    const cacheKey = `${slug}:${chapter}`;
    if(interlinearChapterCache.has(cacheKey)) return interlinearChapterCache.get(cacheKey);

    const book = BOOK_MAP.get(slug);
    if(!book) throw new Error('Libro no soportado en el laboratorio hebreo.');

    const manifest = await getManifest().catch(() => null);
    const info = getBookManifestInfo(manifest, slug);
    const baseName = (info && info.base) || book.file.replace(/\.json$/i, '');

    if(info && info.hasInterlinearChapters){
      const url = buildChapterUrl('interlineal', baseName, chapter);
      const promise = loadJson(url).catch(async (error) => {
        interlinearChapterCache.delete(cacheKey);
        // Fallback: extraer del libro entero.
        const full = await getInterlinearBook(slug);
        const node = full?.chapters?.[String(chapter)] || null;
        if(!node) throw error;
        return node;
      });
      interlinearChapterCache.set(cacheKey, promise);
      return promise;
    }

    // Sin chapter files: derivamos del libro completo (compatibilidad legada).
    const full = await getInterlinearBook(slug);
    const node = full?.chapters?.[String(chapter)] || null;
    interlinearChapterCache.set(cacheKey, Promise.resolve(node));
    return node;
  }

  async function getOshbMorphChapter(slug, chapter){
    const cacheKey = `${slug}:${chapter}`;
    if(oshbChapterCache.has(cacheKey)) return oshbChapterCache.get(cacheKey);

    const book = BOOK_MAP.get(slug);
    if(!book){
      oshbChapterCache.set(cacheKey, Promise.resolve(null));
      return null;
    }

    const manifest = await getManifest().catch(() => null);
    const info = getBookManifestInfo(manifest, slug);
    const baseName = (info && info.base) || book.file.replace(/\.json$/i, '');

    if(info && info.hasOshbChapters){
      const url = buildChapterUrl('oshb-morph', baseName, chapter);
      const promise = loadJson(url).catch(async () => {
        oshbChapterCache.delete(cacheKey);
        const full = await getOshbMorphBook(slug).catch(() => null);
        return full?.chapters?.[String(chapter)] || null;
      });
      oshbChapterCache.set(cacheKey, promise);
      return promise;
    }

    // Sin OSHB atomizado: el libro completo (puede ser pequeño o estar vacío).
    const full = await getOshbMorphBook(slug).catch(() => null);
    const node = full?.chapters?.[String(chapter)] || null;
    oshbChapterCache.set(cacheKey, Promise.resolve(node));
    return node;
  }

  async function getManifest(){
    if(manifestPromise) return manifestPromise;
    manifestPromise = loadJson(MANIFEST_PATH).then((manifest) => {
      if(manifest && manifest.books && typeof manifest.books === 'object'){
        for(const [slug, info] of Object.entries(manifest.books)){
          if(info && Number.isInteger(info.chapters) && info.chapters > 0){
            chapterCountCache.set(slug, info.chapters);
          }
        }
      }
      return manifest;
    }).catch((error) => {
      // Sin manifest seguimos con la ruta antigua (descarga libro completo).
      manifestPromise = null;
      throw error;
    });
    return manifestPromise;
  }

  async function getChapterCount(slug){
    if(chapterCountCache.has(slug)) return chapterCountCache.get(slug);
    try {
      const manifest = await getManifest();
      const fromManifest = manifest?.books?.[slug]?.chapters;
      if(Number.isInteger(fromManifest) && fromManifest > 0){
        chapterCountCache.set(slug, fromManifest);
        return fromManifest;
      }
    } catch(_error){
      // Caemos al fallback de descargar el libro entero.
    }
    const book = await getInterlinearBook(slug);
    const count = Object.keys(book?.chapters || {}).length;
    chapterCountCache.set(slug, count);
    return count;
  }

  async function getLxxShiftConfig(){
    if(lxxShiftPromise) return lxxShiftPromise;
    lxxShiftPromise = loadJson(LXX_SHIFT_PATH)
      .then((raw) => (raw && typeof raw === 'object' ? raw : { chapters: {} }))
      .catch(() => ({ chapters: {} }));
    return lxxShiftPromise;
  }

  async function getOtLxxChapterBundle(slug, chapterNum){
    const Layer = window.AdminOtLxxLayer;
    const key = `${DATA_VERSION}::lxx::${slug}::${chapterNum}`;
    if(otLxxChapterCache.has(key)) return otLxxChapterCache.get(key);
    if(!Layer){
      const empty = Promise.resolve(null);
      otLxxChapterCache.set(key, empty);
      return empty;
    }
    const picked = Layer.pickEdition(slug);
    if(!picked){
      const empty = Promise.resolve(null);
      otLxxChapterCache.set(key, empty);
      return empty;
    }
    const atomizedUrl = `${LXX_ATOMIZED_DIR}/${picked.code}/${chapterNum}.json`;
    const fallbackUrl = `./LXX/${picked.file}`;

    const promise = loadJson(atomizedUrl)
      .then((chunk) => {
        const versesFromChunk = chunk?.verses;
        const ec = chunk?.edition ? String(chunk.edition) : picked.code;
        if(versesFromChunk && typeof versesFromChunk === 'object' && Object.keys(versesFromChunk).length){
          return { edition: ec, verses: versesFromChunk, source: 'atom' };
        }
        return Promise.reject(new Error('LXX atomizado incompleto'));
      })
      .catch(() => loadJson(fallbackUrl).then((data) => {
        const verses = data?.text?.[picked.code]?.[String(chapterNum)];
        if(!verses || typeof verses !== 'object') return null;
        return { edition: picked.code, verses, source: 'whole' };
      }))
      .catch(() => null);
    otLxxChapterCache.set(key, promise);
    return promise;
  }

  async function getHebrewDictionary(){
    if(!hebrewDictionaryPromise){
      hebrewDictionaryPromise = loadJson('./diccionario/diccionario_unificado.min.json').catch((error) => {
        hebrewDictionaryPromise = null;
        throw error;
      });
    }
    return hebrewDictionaryPromise;
  }

  function getEntryPrintedMorph(entry){
    const candidates = [
      entry?.morfologia_impresa,
      entry?.morfologia,
      entry?.printed_entry,
      entry?.entrada_impresa
    ];
    for(const candidate of candidates){
      const text = String(candidate || '').replace(/\s+/g, ' ').trim();
      if(text && !/\bstrong\b/i.test(text)) return text;
    }
    return '';
  }

  function buildEntryMorphValues(entry){
    const values = [];
    const add = (value) => {
      const text = String(value || '').replace(/\s+/g, ' ').trim();
      if(text && !values.includes(text)) values.push(text);
    };

    add(getEntryPrintedMorph(entry));
    const morphs = Array.isArray(entry?.morfs) ? entry.morfs : [];
    morphs.forEach(add);
    return values;
  }

  function normalizeStrong(value){
    const text = String(value || '').trim().toUpperCase();
    if(!text) return '';
    if(/^H\d+$/.test(text)) return text;
    if(/^\d+$/.test(text)) return `H${text}`;
    return text;
  }

  function findOshbMorphLabel(oshbVerseNode, token, tokenIndex){
    if(AdminEngine?.getOshbMorphAt){
      return AdminEngine.getOshbMorphAt(oshbVerseNode, token, tokenIndex);
    }
    const forms = Array.isArray(oshbVerseNode?.forms) ? oshbVerseNode.forms : [];
    const morphs = Array.isArray(oshbVerseNode?.morphs) ? oshbVerseNode.morphs : [];
    if(!forms.length || !morphs.length) return '';

    const tokenPointed = normalizeHebrew(token?.orig || '', true);
    const tokenPlain = normalizeHebrew(token?.orig || '', false);

    const indexedForm = forms[tokenIndex];
    const indexedMorph = String(morphs[tokenIndex] || '').trim();
    if(indexedForm && indexedMorph){
      const indexedPointed = normalizeHebrew(indexedForm, true);
      const indexedPlain = normalizeHebrew(indexedForm, false);
      if(
        (indexedPointed && indexedPointed === tokenPointed) ||
        (indexedPlain && indexedPlain === tokenPlain)
      ){
        return indexedMorph;
      }
    }

    for(let i = 0; i < forms.length; i += 1){
      const form = forms[i];
      const morph = String(morphs[i] || '').trim();
      if(!morph) continue;
      const formPointed = normalizeHebrew(form, true);
      const formPlain = normalizeHebrew(form, false);
      if((formPointed && formPointed === tokenPointed) || (formPlain && formPlain === tokenPlain)){
        return morph;
      }
    }

    return '';
  }

  function hydrateMorphIndexFromPrecomputed(precomputed){
    if(!precomputed || typeof precomputed !== 'object') return null;
    const sourcePointed = precomputed.byPointed || precomputed.pointed;
    const sourcePlain = precomputed.byPlain || precomputed.plain;
    const sourceStrong = precomputed.byStrong;
    if(!sourcePointed || !sourcePlain || !sourceStrong) return null;
    const toMap = (obj) => {
      const result = new Map();
      if(!obj) return result;
      for(const key of Object.keys(obj)){
        const value = obj[key];
        if(Array.isArray(value)) result.set(key, value);
      }
      return result;
    };
    return {
      pointed: toMap(sourcePointed),
      plain: toMap(sourcePlain),
      byStrong: toMap(sourceStrong)
    };
  }

  async function getHebrewMorphIndex(){
    if(!hebrewMorphIndexPromise){
      hebrewMorphIndexPromise = (async () => {
        // Ruta rápida: morph-index.min.json generado por scripts/build-bible-indices.js
        try {
          const precomputed = await loadJson(MORPH_INDEX_PATH);
          const hydrated = hydrateMorphIndexFromPrecomputed(precomputed);
          if(hydrated) return hydrated;
        } catch(_error){
          // Sin morph-index precomputado: caemos al reindexado legado.
        }

        // Fallback: reconstruir el índice desde el diccionario unificado.
        const raw = await getHebrewDictionary();
        const entries = Array.isArray(raw) ? raw : (raw?.items || raw?.entries || []);
        const pointed = new Map();
        const plain = new Map();
        const byStrong = new Map();

        const register = (map, key, payload) => {
          if(!key) return;
          if(!map.has(key)) map.set(key, []);
          map.get(key).push(payload);
        };

        entries.forEach((entry) => {
          const strongKey = normalizeStrong(entry?.strong || entry?.strongs || entry?.strong_detail?.strong);
          if(strongKey){
            if(!byStrong.has(strongKey)) byStrong.set(strongKey, []);
            byStrong.get(strongKey).push(entry);
          }
          const forms = [
            entry?.palabra,
            entry?.lemma,
            entry?.hebreo,
            entry?.forma,
            ...(Array.isArray(entry?.formas) ? entry.formas : []),
            ...(Array.isArray(entry?.forms) ? entry.forms : []),
            ...(Array.isArray(entry?.variantes) ? entry.variantes : [])
          ];
          const morphValues = buildEntryMorphValues(entry);
          forms.forEach((form, index) => {
            const rawForm = String(form || '').trim();
            if(!rawForm) return;
            const payload = {
              form: rawForm,
              morph: morphValues[index] || morphValues[0] || ''
            };
            register(pointed, normalizeHebrew(rawForm, true), payload);
            register(plain, normalizeHebrew(rawForm, false), payload);
          });
        });

        return { pointed, plain, byStrong };
      })().catch((error) => {
        hebrewMorphIndexPromise = null;
        throw error;
      });
    }
    return hebrewMorphIndexPromise;
  }

  function pickMorphCandidate(candidates, token){
    if(!Array.isArray(candidates) || !candidates.length) return '';
    const tokenPointed = normalizeHebrew(token?.orig || '', true);
    const tokenPlain = normalizeHebrew(token?.orig || '', false);
    const exactPointed = candidates.find((candidate) => normalizeHebrew(candidate?.form || '', true) === tokenPointed && candidate?.morph);
    if(exactPointed) return exactPointed.morph;
    const exactPlain = candidates.find((candidate) => normalizeHebrew(candidate?.form || '', false) === tokenPlain && candidate?.morph);
    if(exactPlain) return exactPlain.morph;
    return candidates.find((candidate) => candidate?.morph)?.morph || '';
  }

  function pickStrongMorphCandidate(entries, token){
    if(!Array.isArray(entries) || !entries.length) return '';
    const firstEntry = entries[0] || null;
    const tokenPointed = normalizeHebrew(token?.orig || '', true);
    const tokenPlain = normalizeHebrew(token?.orig || '', false);
    const forms = Array.isArray(firstEntry?.formas) ? firstEntry.formas : [];
    const morphs = Array.isArray(firstEntry?.morfs) ? firstEntry.morfs : [];

    for(let i = 0; i < forms.length; i += 1){
      const formPointed = normalizeHebrew(forms[i], true);
      const formPlain = normalizeHebrew(forms[i], false);
      const morph = String(morphs[i] || '').trim();
      if(!morph) continue;
      if((formPointed && formPointed === tokenPointed) || (formPlain && formPlain === tokenPlain)){
        return /^INTJ\./i.test(morph) ? 'INTJ' : morph;
      }
    }

    const fallbackMorph = String(morphs[0] || '').trim();
    return /^INTJ\./i.test(fallbackMorph) ? 'INTJ' : fallbackMorph;
  }

  // El corpus usa case-sensitive en la LETRA DE FORMA verbal:
  //   's' (lower) PERF qatal     vs  'S' (upper) — no usado
  //   'm' (lower) WAYYIQT        vs  'M' (upper) IMPF yiqtol futuro
  //   'f' (lower) SEQ.PERF weqatal vs 'F' (upper) — IMPF (alias OSHB)
  //   'C' (upper) COHORT          vs  'c' (lower) — no usado
  //   'J' (upper) JUSS jussive
  //   'I' (upper) IMPV imperativo
  //   'T' (upper) INFC infinitivo construct
  //   'p'/'v' (lower) PTCA participio activo (los del corpus usan guiones, no entran al regex simple)
  // El resto de los segmentos (stem, número, género, persona) sí son case-insensitive.
  const VERBAL_FORM_MAP = {
    s: 'PERF',
    m: 'WAYYIQT',
    f: 'SEQ.PERF',
    p: 'PTCA',
    v: 'PTCA',
    t: 'PTCP',
    r: 'PTCP',
    S: 'PERF',
    M: 'IMPF',
    F: 'IMPF',
    C: 'COHORT',
    J: 'JUSS',
    I: 'IMPV',
    T: 'INFC',
    A: 'INFA',
    P: 'PTCA',
    R: 'PTCP'
  };

  function decodeHebrewMorphCode(rawCode){
    const code = String(rawCode || '').trim();
    if(!code) return '';
    const upper = code.toUpperCase();
    if(/^INTJ\./.test(upper)) return 'INTJ';
    if(code.includes('.')) return code;

    const exact = {
      PB: 'PREP',
      PM: 'PREP',
      PA: 'PART.OBJ.DIR',
      CC: 'CONJ',
      CS: 'CONJ',
      CO: 'CONJ',
      AA: 'ADJ',
      AC: 'ADJ',
      AV: 'ADV',
      RD: 'ART',
      RI: 'INTERR',
      RP: 'PRON',
      RR: 'REL',
      TD: 'ART',
      TI: 'INTERR',
      TN: 'NEG',
      TP: 'PRON',
      TR: 'REL',
      XC: 'CONJ',
      XD: 'ART',
      XN: 'NEG',
      XP: 'PART',
      XR: 'REL',
      XT: 'PART'
    };
    if(exact[upper]) return exact[upper];

    const stemMap = {
      Q: 'QAL',
      N: 'NIF',
      P: 'PIEL',
      H: 'HIF',
      T: 'HIT',
      V: 'HOF',
      O: 'POLEL',
      M: 'POAL'
    };
    const numberMap = {
      S: 'SG',
      P: 'PL',
      D: 'DU'
    };
    const genderMap = {
      M: 'M',
      F: 'F',
      C: 'C',
      U: 'U'
    };

    // OJO: el match preserva el case de la 4ª letra (forma verbal) — ahí está la distinción m/M, s/f, etc.
    const simpleVerb = code.match(/^V([A-Za-z])A([A-Za-z])([SPDspd])([MFCUmfcu])([123])$/);
    if(simpleVerb){
      const [, stemCode, formCode, numberCode, genderCode, personCode] = simpleVerb;
      const stemKey = stemCode.toUpperCase();
      const stem = stemMap[stemKey] || stemKey;
      const form = VERBAL_FORM_MAP[formCode] || VERBAL_FORM_MAP[formCode.toUpperCase()] || formCode.toUpperCase();
      const number = numberMap[numberCode.toUpperCase()] || numberCode.toUpperCase();
      const gender = genderMap[genderCode.toUpperCase()] || genderCode.toUpperCase();
      return `VERBO.${stem}.${form}.P${personCode}.${gender}.${number}`;
    }

    return upper;
  }

  async function resolveMorphLabel(token, context = {}){
    const oshbLabel = findOshbMorphLabel(context.oshbVerseNode, token, context.tokenIndex ?? -1);
    if(oshbLabel) return oshbLabel;

    const strongKey = normalizeStrong(token?.strongs);
    const decodedTokenMorph = decodeHebrewMorphCode(token?.morphs);

    if(/^VERBO\./.test(decodedTokenMorph) || /^PART\.OBJ\.DIR$/.test(decodedTokenMorph)){
      return decodedTokenMorph;
    }

    try{
      const index = await getHebrewMorphIndex();
      if(strongKey){
        const strongLabel = pickStrongMorphCandidate(index.byStrong.get(strongKey), token);
        if(strongLabel) return strongLabel;
      }

      if(!strongKey && decodedTokenMorph && decodedTokenMorph !== String(token?.morphs || '').trim().toUpperCase()){
        return decodedTokenMorph;
      }

      const pointedKey = normalizeHebrew(token?.orig || '', true);
      const plainKey = normalizeHebrew(token?.orig || '', false);
      const label = pickMorphCandidate(index.pointed.get(pointedKey), token)
        || pickMorphCandidate(index.plain.get(plainKey), token);
      if(label) return label;
    }catch(_error){
      // Seguimos con la morfologia del interlineal.
    }

    if(decodedTokenMorph) return decodedTokenMorph;
    return String(token?.morphs || '').trim();
  }

  function parseReference(text){
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    const match = clean.match(/^(.+?)\s+(\d+)$/);
    if(!match) return null;
    const slug = LABEL_TO_SLUG.get(normalizeKey(match[1]));
    const chapter = Number(match[2]);
    if(!slug || !Number.isInteger(chapter) || chapter < 1) return null;
    return { slug, chapter };
  }

  function renderBookListSection(container, books, activeSlug){
    if(!container) return;
    container.innerHTML = '';
    books.forEach(([slug, label]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `book-chip${slug === activeSlug ? ' is-active' : ''}`;
      button.textContent = label;
      button.addEventListener('click', async () => {
        state.slug = slug;
        state.label = label;
        renderBookLists(slug);
        await renderChapterList(slug);
      });
      container.appendChild(button);
    });
  }

  function renderBookLists(activeSlug){
    renderBookListSection(els.bookListOT, OT_BOOKS, activeSlug);
    if(els.bookListNT) els.bookListNT.textContent = 'Reservado para fases posteriores.';
  }

  async function renderChapterList(slug){
    const total = await getChapterCount(slug);
    const book = BOOK_MAP.get(slug);
    if(els.chapterTitle) els.chapterTitle.textContent = `${book?.label || ''} · capitulos`;
    if(!els.chapterList) return;

    if(chapterListSlug !== slug){
      chapterListSlug = slug;
      const fragment = document.createDocumentFragment();
      for(let i = 1; i <= total; i += 1){
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'chapter-chip';
        button.dataset.chapter = String(i);
        button.textContent = String(i);
        fragment.appendChild(button);
      }
      els.chapterList.innerHTML = '';
      els.chapterList.appendChild(fragment);
    }

    const activeIndex = (slug === state.slug) ? state.chapter : -1;
    els.chapterList.querySelectorAll('.chapter-chip').forEach((btn) => {
      const idx = Number(btn.dataset.chapter);
      btn.classList.toggle('is-active', idx === activeIndex);
    });
  }

  function bindChapterListDelegation(){
    if(!els.chapterList || els.chapterList.dataset.delegated === '1') return;
    els.chapterList.dataset.delegated = '1';
    els.chapterList.addEventListener('click', async (event) => {
      const button = event.target.closest('.chapter-chip');
      if(!button || !els.chapterList.contains(button)) return;
      const idx = Number(button.dataset.chapter);
      if(!Number.isInteger(idx) || idx < 1) return;
      const slug = chapterListSlug || state.slug;
      closeBookMenu();
      try { await navigateTo(slug, idx); }
      catch(error){ handleError(error); }
    });
  }

  function openBookMenu(){
    if(!els.bookDropdown || !els.bookToggle) return;
    els.bookDropdown.hidden = false;
    els.bookToggle.setAttribute('aria-expanded', 'true');
  }

  function closeBookMenu(){
    if(!els.bookDropdown || !els.bookToggle) return;
    els.bookDropdown.hidden = true;
    els.bookToggle.setAttribute('aria-expanded', 'false');
  }

  function getInterlinearVerses(book, chapter){
    return book?.chapters?.[String(chapter)] || {};
  }

  function buildHebrewVerseText(tokens, rawText){
    const rawMatches = Array.from(
      String(rawText || '').matchAll(/<l>(.*?)<\/l>/g),
      (match) => String(match[1] || '').trim()
    ).filter(Boolean);
    if(rawMatches.length) return rawMatches.join(' ');

    const sourceTokens = Array.isArray(tokens) ? tokens : [];
    if(sourceTokens.length){
      return sourceTokens
        .map((token) => String(token?.orig || '').trim())
        .filter(Boolean)
        .join(' ');
    }
    return String(rawText || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || 'Sin texto hebreo';
  }

  function isNiqqudOnlySurface(value){
    return /^[\u0591-\u05BD\u05BF-\u05C7]+$/.test(String(value || '').trim());
  }

  function isMaqafOnlySurface(value){
    return /^[\u05BE]+$/.test(String(value || '').trim());
  }

  function isArticleOnlyMorphemeRow(morphemes){
    const items = Array.isArray(morphemes) ? morphemes : [];
    return items.length > 0 && items.every((morpheme) => String(morpheme?.label || '').trim().toUpperCase() === 'ART');
  }

  function countHebrewLetters(value){
    const match = String(value || '').match(/[\u05D0-\u05EA]/g);
    return match ? match.length : 0;
  }

  function canDisplayMaqafOnRow(token, morphemes){
    const items = Array.isArray(morphemes) ? morphemes : [];
    if(!items.length) return false;
    if(isArticleOnlyMorphemeRow(items)) return false;

    const baseMorphemes = items.filter((morpheme) => String(morpheme?.type || '').trim().toLowerCase() === 'base');
    if(!baseMorphemes.length) return false;

    const baseLabels = baseMorphemes.map((morpheme) => String(morpheme?.label || '').trim().toUpperCase());
    const strong = String(token?.strong || token?.strongs || '').trim().toUpperCase();
    const surface = String(token?.orig || '');
    const letterCount = countHebrewLetters(surface);

    if(strong){
      if(letterCount <= 1 && baseLabels.every((label) => /^(PREP|CONJ|REL|ART)$/.test(label))) return false;
      return true;
    }

    if(baseLabels.every((label) => /^(ART|CONJ)$/.test(label))) return false;
    if(letterCount <= 1 && baseLabels.every((label) => /^(PREP|CONJ|REL|ART)$/.test(label))) return false;

    return true;
  }

  function appendVisibleMaqafToRow(token, morphemes){
    const tokenSurface = String(token?.orig || '');
    if(!tokenSurface.includes('\u05BE')) return morphemes;
    if(!canDisplayMaqafOnRow(token, morphemes)) return morphemes;
    const cloned = (Array.isArray(morphemes) ? morphemes : []).map((morpheme) => ({ ...morpheme }));
    if(!cloned.length) return cloned;
    if(cloned.some((morpheme) => String(morpheme?.surface || '').includes('\u05BE'))){
      return cloned;
    }
    const lastMorpheme = cloned[cloned.length - 1];
    lastMorpheme.surface = `${lastMorpheme.surface || ''}\u05BE`;
    return cloned;
  }

  function appendVisibleMaqafFromOshb(token, tokenIndex, oshbVerseNode, morphemes){
    const forms = Array.isArray(oshbVerseNode?.forms) ? oshbVerseNode.forms : [];
    if(!forms.length || !Number.isInteger(tokenIndex) || tokenIndex < 0) return morphemes;
    if(!canDisplayMaqafOnRow(token, morphemes)) return morphemes;
    const currentIndex = resolveOshbFormIndex(token, tokenIndex, oshbVerseNode);
    if(currentIndex < 0) return morphemes;
    const currentForm = String(forms[currentIndex] || '');
    const nextForm = String(forms[currentIndex + 1] || '');
    const maqafOnCurrentLeft = currentForm.includes('\u05BE') && !currentForm.startsWith('\u05BE');
    const maqafOnNextRight = nextForm.startsWith('\u05BE');
    const shouldShowMaqaf = maqafOnCurrentLeft || maqafOnNextRight;
    if(!shouldShowMaqaf) return morphemes;

    const cloned = (Array.isArray(morphemes) ? morphemes : []).map((morpheme) => ({ ...morpheme }));
    if(!cloned.length) return cloned;
    if(cloned.some((morpheme) => String(morpheme?.surface || '').includes('\u05BE'))){
      return cloned;
    }

    const lastMorpheme = cloned[cloned.length - 1];
    lastMorpheme.surface = `${lastMorpheme.surface || ''}\u05BE`;
    return cloned;
  }

  function resolveOshbFormIndex(token, tokenIndex, oshbVerseNode){
    const forms = Array.isArray(oshbVerseNode?.forms) ? oshbVerseNode.forms : [];
    if(!forms.length) return -1;

    const tokenPointed = normalizeHebrew(token?.orig || '', true);
    const tokenPlain = normalizeHebrew(token?.orig || '', false);
    const matchesToken = (form) => {
      const pointed = normalizeHebrew(form, true);
      const plain = normalizeHebrew(form, false);
      return (tokenPointed && pointed === tokenPointed) || (tokenPlain && plain === tokenPlain);
    };

    if(Number.isInteger(tokenIndex) && tokenIndex >= 0 && tokenIndex < forms.length && matchesToken(forms[tokenIndex])){
      return tokenIndex;
    }

    const start = Math.max(0, tokenIndex - 2);
    const end = Math.min(forms.length - 1, tokenIndex + 2);
    for(let index = start; index <= end; index += 1){
      if(matchesToken(forms[index])) return index;
    }

    for(let index = 0; index < forms.length; index += 1){
      if(matchesToken(forms[index])) return index;
    }

    return -1;
  }

  function mergeDisplayMorphemes(items){
    const merged = [];
    items.forEach((item) => {
      const current = {
        token: item.token,
        morphemes: (Array.isArray(item.morphemes) ? item.morphemes : []).map((morpheme) => ({ ...morpheme }))
      };
      if(
        current.morphemes.length === 1 &&
        isNiqqudOnlySurface(current.morphemes[0]?.surface) &&
        merged.length
      ){
        const previous = merged[merged.length - 1];
        const lastMorpheme = previous.morphemes[previous.morphemes.length - 1];
        if(lastMorpheme){
          lastMorpheme.surface = `${lastMorpheme.surface || ''}${current.morphemes[0].surface || ''}`;
          const extraLabel = String(current.morphemes[0].label || '').trim();
          const extraGloss = String(current.morphemes[0].gloss || '').trim();
          if(extraLabel){
            lastMorpheme.label = lastMorpheme.label && lastMorpheme.label !== extraLabel
              ? `${lastMorpheme.label}+${extraLabel}`
              : (lastMorpheme.label || extraLabel);
          }
          if(extraGloss){
            lastMorpheme.gloss = lastMorpheme.gloss && lastMorpheme.gloss !== extraGloss
              ? `${lastMorpheme.gloss} ${extraGloss}`.trim()
              : (lastMorpheme.gloss || extraGloss);
          }
        }
        return;
      }
      if(
        current.morphemes.length === 1 &&
        isMaqafOnlySurface(current.morphemes[0]?.surface) &&
        merged.length
      ){
        const previous = merged[merged.length - 1];
        const lastMorpheme = previous.morphemes[previous.morphemes.length - 1];
        if(lastMorpheme){
          lastMorpheme.surface = `${lastMorpheme.surface || ''}${current.morphemes[0].surface || ''}`;
        }
        return;
      }
      merged.push(current);
    });
    return merged;
  }

  async function buildVerseCardHtml(verseNumber, verseNode, oshbVerseNode = null, precomputedPlan = null, lxxCtx = null, wordHintsChapter = null){
    const versePlan = precomputedPlan || (AdminEngine?.buildAdminVersePlan
      ? AdminEngine.buildAdminVersePlan(verseNode, oshbVerseNode)
      : { items: [] });
    const rawRows = await Promise.all(versePlan.items.map(async (entry, posIndex) => {
      const token = entry.token || {};
      const parsedNum = Number(token?.num);
      const tokenIndex = Number.isInteger(parsedNum) && parsedNum >= 1
        ? parsedNum - 1
        : posIndex;
      const fallbackMorphLabel = await resolveMorphLabel(token, {
        oshbVerseNode,
        tokenIndex
      });
      const morphemes = Array.isArray(entry?.layer?.morphemes) && entry.layer.morphemes.length
        ? entry.layer.morphemes
        : [{
            surface: token.orig || '',
            label: fallbackMorphLabel || '-',
            type: 'base',
            gloss: entry?.baseGloss || ''
          }];
      const maqafByToken = appendVisibleMaqafToRow(token, morphemes);
      const maqafByOshb = appendVisibleMaqafFromOshb(token, tokenIndex, oshbVerseNode, maqafByToken);
      return { token, morphemes: maqafByOshb };
    }));
    const mergedRows = mergeDisplayMorphemes(rawRows);

    let lxxChipHtml = '';
    let lxxSurfaces = null;
    let lxxTiers = null;
    const Align = window.AdminLxxAlign;
    const LxxLayer = window.AdminOtLxxLayer;
    if(lxxCtx?.bundle?.verses && LxxLayer && Align){
      await Align.ensureMaps(loadJson).catch(() => {});
      const verseStr = String(verseNumber || '').split(':')[1] || '';
      const hv = Number(verseStr);
      if(Number.isFinite(hv) && hv >= 1){
        const lxxVN = LxxLayer.targetLxxVerseFromShiftTable(
          lxxCtx.slug,
          lxxCtx.chapterNum,
          hv,
          lxxCtx.shiftCfg
        );
        const gTok = lxxCtx.bundle.verses[String(lxxVN)];
        if(Array.isArray(gTok) && gTok.length){
          const columns = [];
          mergedRows.forEach(({ token, morphemes }) => {
            const tkKey = window.AdminLxxWordHints
              ? window.AdminLxxWordHints.normalizeTokenNumKey(token)
              : (Array.isArray(token?.num) ? token.num.map(String).join(',') : String(token?.num ?? ''));
            const strongs = String(token?.strongs || '').trim();
            (morphemes || []).forEach((m, morphemeIdx) => {
              columns.push({
                gloss: String(m.gloss || ''),
                label: String(m.label || ''),
                hebrew: String(m.surface || ''),
                tokenNum: tkKey,
                morphemeIdx,
                strongs
              });
            });
          });
          const pack = Align.pairColumnsToGreek(columns, gTok);
          lxxSurfaces = pack.surfaces;
          lxxTiers = pack.tiers;
          const verseHints = wordHintsChapter?.verses && Array.isArray(wordHintsChapter.verses[String(hv)])
            ? wordHintsChapter.verses[String(hv)]
            : [];
          if(verseHints.length && window.AdminLxxWordHints){
            window.AdminLxxWordHints.applyHintsToAlignment(columns, lxxSurfaces, lxxTiers, gTok, verseHints);
          }
          const shifted = Number(lxxVN) !== hv;
          const shiftNote = shifted
            ? ` · Masora v${hv}→LXX v${lxxVN}`
            : '';
          lxxChipHtml = `<div class="admin-lxx-verse-chip" dir="ltr" lang="el">LXX (${escapeHtml(String(lxxCtx.bundle.edition || ''))}) ${escapeHtml(String(lxxCtx.chapterNum))}:${escapeHtml(String(lxxVN))}${shiftNote}</div>`;
        }
      }
    }

    let greekCol = 0;
    const rows = mergedRows.map(({ token, morphemes }) => {
      const morphemeHtml = morphemes.map((morpheme) => {
        let greekLine = '';
        if(lxxSurfaces){
          const surf = String(lxxSurfaces[greekCol] || '').trim();
          const tier = lxxTiers && lxxTiers[greekCol];
          greekCol += 1;
          if(surf){
            let lxxClass = 'admin-morph-segment-lxx';
            let lxxTitle = '';
            if(tier === 'soft'){
              lxxClass += ' admin-morph-segment-lxx-soft';
              lxxTitle = ' title="Sugerencia algoritmica (MT y LXX pueden divergir)"';
            }else if(tier === 'hint'){
              lxxClass += ' admin-morph-segment-lxx-hint';
              lxxTitle = ' title="Alineacion editorial (modulo lxx-mt-word-hints)"';
            }
            greekLine = `<div class="${lxxClass}"${lxxTitle}>${escapeHtml(surf)}</div>`;
          }
        }
        return `
        <div class="admin-morph-segment admin-morph-segment-${escapeHtml(morpheme.type || 'base')}">
          <div class="admin-morph-segment-hebrew">${escapeHtml(morpheme.surface || '')}</div>
          <div class="admin-morph-segment-label">${escapeHtml(morpheme.label || '-')}</div>
          <div class="admin-morph-segment-gloss">${escapeHtml(morpheme.gloss || '')}</div>
          ${greekLine}
        </div>
      `;
      }).join('');
      return `
        <div class="admin-morph-token" data-num="${escapeHtml(token.num || '')}">
          <div class="admin-morph-token-strip-inner">${morphemeHtml}</div>
        </div>
      `;
    });

    return `
      <article class="admin-verse-card" data-verse="${verseNumber}">
        <div class="admin-verse-head">
          <div>
            <div class="admin-verse-ref">${escapeHtml(state.label)} ${verseNumber}</div>
          </div>
        </div>
        <div class="admin-morph-card-body">
          ${lxxChipHtml}
          <div class="admin-morph-token-strip">${rows.join('') || '<div class="admin-morph-empty">No hay tokens hebreos en este versiculo.</div>'}</div>
        </div>
      </article>
    `;
  }

  function paintCardsInBatches(mount, cards, isAlive){
    mount.innerHTML = '';
    return new Promise((resolve) => {
      let cursor = 0;
      const scheduler = window.requestAnimationFrame
        ? (cb) => window.requestAnimationFrame(cb)
        : (cb) => setTimeout(cb, 16);
      const step = () => {
        if(typeof isAlive === 'function' && !isAlive()){ resolve(); return; }
        const end = Math.min(cursor + RENDER_BATCH_SIZE, cards.length);
        if(end > cursor){
          const tmp = document.createElement('div');
          tmp.innerHTML = cards.slice(cursor, end).join('');
          const fragment = document.createDocumentFragment();
          while(tmp.firstChild) fragment.appendChild(tmp.firstChild);
          mount.appendChild(fragment);
        }
        cursor = end;
        if(cursor >= cards.length){ resolve(); return; }
        scheduler(step);
      };
      scheduler(step);
    });
  }

  function schedulePrefetch(slug, chapter, chapterTotal){
    if(!Array.isArray(OT_BOOKS) || !OT_BOOKS.length) return;

    const sameBookChapters = [];
    if(Number.isInteger(chapter)){
      if(chapter + 1 <= chapterTotal) sameBookChapters.push(chapter + 1);
      if(chapter - 1 >= 1) sameBookChapters.push(chapter - 1);
    }

    const adjacentBooks = [];
    const currentIndex = OT_BOOKS.findIndex(([entrySlug]) => entrySlug === slug);
    if(currentIndex >= 0){
      if(chapter >= chapterTotal && currentIndex + 1 < OT_BOOKS.length){
        adjacentBooks.push(OT_BOOKS[currentIndex + 1][0]);
      }
      if(chapter <= 1 && currentIndex > 0){
        adjacentBooks.push(OT_BOOKS[currentIndex - 1][0]);
      }
    }

    if(!sameBookChapters.length && !adjacentBooks.length) return;

    const run = () => {
      // Capítulos vecinos del mismo libro (Tanda 3): pequeños y baratos.
      sameBookChapters.forEach((targetChapter) => {
        getInterlinearChapter(slug, targetChapter).catch(() => {});
        getOshbMorphChapter(slug, targetChapter).catch(() => {});
        getOtLxxChapterBundle(slug, targetChapter).catch(() => {});
      });
      // Libro vecino: pre-caliente del capítulo 1 si el manifest lo permite.
      adjacentBooks.forEach((targetSlug) => {
        getInterlinearChapter(targetSlug, 1).catch(() => {
          // Si el chapter file no está disponible para ese libro, caemos al libro completo.
          getInterlinearBook(targetSlug).catch(() => {});
        });
      });
    };

    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 800));
    idle(run);
  }

  async function renderEditor(){
    const token = ++renderToken;
    const isAlive = () => token === renderToken;

    setBadge('', '');
    if(els.mount) els.mount.innerHTML = '<div class="text-muted">Cargando morfologia...</div>';

    if(!window.AdminHebrewLexicon){
      window.AdminHebrewLexicon = await getHebrewMorphIndex().catch(() => null);
      if(!isAlive()) return;
    }

    // Resolvemos el total de capítulos vía manifest (sin descargar libro entero).
    const manifest = await getManifest().catch(() => null);
    if(!isAlive()) return;
    const bookInfo = getBookManifestInfo(manifest, state.slug);
    let chapterTotal = bookInfo && Number.isInteger(bookInfo.chapters) && bookInfo.chapters > 0
      ? bookInfo.chapters
      : await getChapterCount(state.slug).catch(() => 0);
    if(!isAlive()) return;
    if(chapterTotal > 0 && state.chapter > chapterTotal) state.chapter = chapterTotal;

    // Tanda 3: traemos solo el capítulo en juego (interlineal + OSHB + versículos LXX del capitulo).
    const [interlinearChapter, oshbChapter, lxxBundle, shiftCfg, lxxWordHintsChapter] = await Promise.all([
      getInterlinearChapter(state.slug, state.chapter),
      getOshbMorphChapter(state.slug, state.chapter).catch(() => null),
      getOtLxxChapterBundle(state.slug, state.chapter).catch(() => null),
      getLxxShiftConfig().catch(() => ({ chapters: {} })),
      loadJson(lxxWordHintsChapterUrl(state.slug, state.chapter)).catch(() => null)
    ]);
    if(!isAlive()) return;

    const interlinearVerses = interlinearChapter && typeof interlinearChapter === 'object'
      ? interlinearChapter
      : {};
    const verseNumbers = Object.keys(interlinearVerses).sort((a, b) => Number(a) - Number(b));
    if(!verseNumbers.length){
      if(els.mount) els.mount.innerHTML = '<div class="admin-empty-state">No se encontro texto hebreo para este capitulo.</div>';
      if(els.verseCount) els.verseCount.textContent = '0';
      if(els.tokenCount) els.tokenCount.textContent = '0';
      updateDraftStateLabel();
      return;
    }

    // Si no obtuvimos chapterTotal del manifest, usamos lo que hay localmente.
    if(!chapterTotal) chapterTotal = Math.max(state.chapter, 1);

    const versePlans = verseNumbers.map((verseNumber) => {
      const verseNode = interlinearVerses[verseNumber];
      const oshbVerseNode = oshbChapter && typeof oshbChapter === 'object'
        ? (oshbChapter[verseNumber] || null)
        : null;
      const plan = AdminEngine?.buildAdminVersePlan
        ? AdminEngine.buildAdminVersePlan(verseNode, oshbVerseNode)
        : { items: [], tokenCount: 0 };
      return { verseNumber, verseNode, oshbVerseNode, plan };
    });

    const tokenCount = versePlans.reduce((acc, item) => acc + (item.plan.tokenCount || 0), 0);

    const lxxCtx = lxxBundle
      ? { bundle: lxxBundle, shiftCfg, slug: state.slug, chapterNum: state.chapter }
      : null;

    const cards = await Promise.all(versePlans.map(({ verseNumber, verseNode, oshbVerseNode, plan }) =>
      buildVerseCardHtml(`${state.chapter}:${verseNumber}`, verseNode, oshbVerseNode, plan, lxxCtx, lxxWordHintsChapter)
    ));
    if(!isAlive()) return;

    if(els.mount) await paintCardsInBatches(els.mount, cards, isAlive);
    if(!isAlive()) return;

    if(els.title) els.title.textContent = `Laboratorio morfologico · ${state.label} ${state.chapter}`;
    if(els.meta) els.meta.textContent = `${state.label} ${state.chapter}`;
    if(els.panelTitle) els.panelTitle.textContent = `${state.label} ${state.chapter}`;
    if(els.input) els.input.value = `${state.label} ${state.chapter}`;
    if(els.verseCount) els.verseCount.textContent = String(verseNumbers.length);
    if(els.tokenCount) els.tokenCount.textContent = String(tokenCount);
    updateDraftStateLabel();
    renderBookLists(state.slug);
    await renderChapterList(state.slug);
    if(!isAlive()) return;
    updateChapterButtons(chapterTotal);
    schedulePrefetch(state.slug, state.chapter, chapterTotal);
  }

  function updateChapterButtons(total){
    if(els.prevBtn) els.prevBtn.disabled = state.chapter <= 1;
    if(els.nextBtn) els.nextBtn.disabled = state.chapter >= total;
  }

  async function navigateTo(slug, chapter){
    const book = BOOK_MAP.get(slug);
    if(!book) throw new Error('Libro no disponible.');
    state.slug = slug;
    state.label = book.label;
    state.chapter = chapter;
    await renderEditor();
  }

  function handleError(error){
    const message = error instanceof Error ? error.message : String(error);
    if(els.mount) els.mount.innerHTML = `<div class="admin-empty-state">${escapeHtml(message)}</div>`;
    setBadge('No se pudo abrir el capitulo', 'err');
  }

  function setupThemeMenu(){
    const menu = els.themeMenuBtn?.nextElementSibling;
    els.themeMenuBtn?.addEventListener('click', (event) => {
      event.preventDefault();
      menu?.classList.toggle('show');
    });
    document.addEventListener('click', (event) => {
      if(menu && els.themeMenuBtn && !menu.contains(event.target) && !els.themeMenuBtn.contains(event.target)){
        menu.classList.remove('show');
      }
    });
    menu?.querySelectorAll('[data-theme]').forEach((button) => {
      button.addEventListener('click', () => {
        const theme = button.getAttribute('data-theme') || 'cream';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('angelos.admin.interlinear.theme', theme);
        menu.classList.remove('show');
      });
    });

    document.documentElement.setAttribute('data-theme', localStorage.getItem('angelos.admin.interlinear.theme') || 'cream');
  }

  function setupBookMenu(){
    renderBookLists(state.slug);
    els.bookToggle?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if(els.bookDropdown?.hidden){
        openBookMenu();
      }else{
        closeBookMenu();
      }
    });
    els.bookDropdown?.addEventListener('click', (event) => event.stopPropagation());
    document.addEventListener('click', (event) => {
      if(els.bookDropdown && els.bookToggle && !els.bookDropdown.hidden && !els.bookDropdown.contains(event.target) && !els.bookToggle.contains(event.target)){
        closeBookMenu();
      }
    });
    document.addEventListener('keydown', (event) => {
      if(event.key === 'Escape' && els.bookDropdown && !els.bookDropdown.hidden){
        closeBookMenu();
      }
    });
  }

  function bindEvents(){
    els.form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const parsed = parseReference(els.input?.value);
      if(!parsed){
        setBadge('Usa el formato "Libro capitulo"', 'err');
        return;
      }
      try{
        await navigateTo(parsed.slug, parsed.chapter);
      }catch(error){
        handleError(error);
      }
    });

    els.prevBtn?.addEventListener('click', async () => {
      if(state.chapter <= 1) return;
      await navigateTo(state.slug, state.chapter - 1);
    });

    els.nextBtn?.addEventListener('click', async () => {
      const total = await getChapterCount(state.slug);
      if(state.chapter >= total) return;
      await navigateTo(state.slug, state.chapter + 1);
    });
  }

  async function init(){
    const allowed = await ensureAccess();
    if(!allowed){
      window.location.href = './index.html';
      return;
    }

    if(els.saveBtn) els.saveBtn.disabled = true;
    if(els.exportBtn) els.exportBtn.disabled = true;
    if(els.resetBtn) els.resetBtn.disabled = true;

    setupThemeMenu();
    setupBookMenu();
    bindChapterListDelegation();
    bindEvents();
    try{
      await renderEditor();
    }catch(error){
      handleError(error);
    }
  }

  void init();
})();
