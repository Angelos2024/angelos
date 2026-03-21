(() => {
  const HEBREW_DICT_PATH = './diccionario/diccionario_unificado.min.json';
  const ORIG_DIR = './IdiomaORIGEN';

  const OT_BOOKS = [
    'genesis','exodo','levitico','numeros','deuteronomio','josue','jueces','rut','1 samuel','2 samuel',
    '1 reyes','2 reyes','1 cronicas','2 cronicas','esdras','nehemias','ester','job','salmos','proverbios',
    'eclesiastes','cantares','isaias','jeremias','lamentaciones','ezequiel','daniel','oseas','joel','amos',
    'abdias','jonas','miqueas','nahum','habacuc','sofonias','hageo','zacarias','malaquias'
  ];

  const state = {
    hebrewMaps: null,
    cache: new Map(),
    rows: []
  };

  const els = {
    bookSelect: document.getElementById('bookSelect'),
    scanBookBtn: document.getElementById('scanBookBtn'),
    scanAllBtn: document.getElementById('scanAllBtn'),
        exportAllBtn: document.getElementById('exportAllBtn'),
    filterInput: document.getElementById('filterInput'),
    summary: document.getElementById('summary'),
    resultsBody: document.getElementById('resultsBody')
  };
const BOOK_INDEX = new Map(OT_BOOKS.map((book, index) => [book, index]));
  
  function normalizeToken(token, preserveHebrewPoints = false){
    let clean = String(token || '').trim();
    clean = clean.replace(/[\u200c-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, '');
    clean = clean
      .replace(/^[\s.,;:!?¡¿()\[\]{}"'“”‘’«»·]+|[\s.,;:!?¡¿()\[\]{}"'“”‘’«»·]+$/g, '');
    clean = clean.replace(/[\u0591-\u05AF]/g, '');
    if(!preserveHebrewPoints){
      clean = clean.replace(/[\u05B0-\u05BC\u05BD\u05BF\u05C1-\u05C2\u05C7]/g, '');
    }
    clean = clean.replace(/[\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4]/g, '');
    return clean.toLowerCase();
  }

  function hasHebrewNikkud(token){
    return /[\u05B0-\u05BC\u05BD\u05BF\u05C1-\u05C2\u05C7]/.test(String(token || ''));
  }

  function splitTokens(text){
    return String(text || '')
      .replace(/[\u05BE]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(Boolean);
  }

  function splitHebrewPrefixClusters(token, map){
    const parts = [];
    let remaining = String(token || '');
    const prefixLetters = new Set(['ו', 'ב', 'כ', 'ל', 'מ', 'ה', 'ש']);

    while(remaining){
      const matches = remaining.match(/[\u05D0-\u05EA]/g) || [];
      if(matches.length <= 1 || parts.length >= 2) break;
      if(map && map.has(normalizeToken(remaining))) break;

      const head = remaining.match(/^([\u05D0-\u05EA][\u0591-\u05AF\u05B0-\u05BC\u05BD\u05BF\u05C1-\u05C2\u05C7]*)/);
      if(!head) break;
      const baseLetter = head[1].charAt(0);
      if(!prefixLetters.has(baseLetter)) break;
      if(map && !map.has(normalizeToken(head[1]))) break;

      parts.push(head[1]);
      remaining = remaining.slice(head[1].length);
    }

    if(parts.length === 0) return [token];
    if(remaining) parts.push(remaining);
    return parts;
  }

  function expandTokenForLookup(token, map){
    const directKey = normalizeToken(token);
    if(map.has(directKey)) return [token];
    const segmented = splitHebrewPrefixClusters(token, map);
    return segmented.length > 1 ? segmented : [token];
  }

  function setGlossCandidate(map, key, gloss, score){
    if(!key) return;
    const txt = String(gloss || '').trim();
    if(!txt || txt === '-') return;
    const prev = map.get(key);
    if(!prev || score > prev.score) map.set(key, { gloss: txt, score });
  }

  function buildHebrewMaps(rows){
    const pointedMap = new Map();
    const unpointedMap = new Map();

    for(const row of rows || []){
      const fallbackGloss = Array.isArray(row?.glosas)
        ? (row.glosas.find(Boolean) || row?.glosa || row?.strong_detail?.def_rv || '')
        : (row?.glosa || row?.strong_detail?.def_rv || '');

      const lemma = normalizeToken(row?.hebreo);
      if(Array.isArray(row?.formas) && Array.isArray(row?.glosas)){
        const limit = Math.min(row.formas.length, row.glosas.length);
        for(let i = 0; i < limit; i++){
          const f = row.formas[i];
          const g = row.glosas[i];
          setGlossCandidate(unpointedMap, normalizeToken(f), g, 4);
          if(hasHebrewNikkud(f)) setGlossCandidate(pointedMap, normalizeToken(f, true), g, 6);
        }
      }

      setGlossCandidate(unpointedMap, normalizeToken(row?.forma), row?.glosa || fallbackGloss, 3);
      setGlossCandidate(unpointedMap, lemma, fallbackGloss, 2);
      if(hasHebrewNikkud(row?.forma)) setGlossCandidate(pointedMap, normalizeToken(row?.forma, true), row?.glosa || fallbackGloss, 5);

      if(Array.isArray(row?.formas)){
        for(const form of row.formas){
          setGlossCandidate(unpointedMap, normalizeToken(form), fallbackGloss, 1);
          if(hasHebrewNikkud(form)) setGlossCandidate(pointedMap, normalizeToken(form, true), fallbackGloss, 2.5);
        }
      }
    }

    return {
      pointedMap: new Map([...pointedMap.entries()].map(([k, v]) => [k, v.gloss])),
      unpointedMap: new Map([...unpointedMap.entries()].map(([k, v]) => [k, v.gloss]))
    };
  }

  function tokenToGloss(token, maps){
    const pointed = normalizeToken(token, true);
    const plain = normalizeToken(token);
    if(pointed && maps.pointedMap.has(pointed)) return maps.pointedMap.get(pointed);
    if(plain && maps.unpointedMap.has(plain)) return maps.unpointedMap.get(plain);
    return '-';
  }

  async function loadJson(path){
    const res = await fetch(path, { cache: 'force-cache' });
    if(!res.ok) throw new Error(`No se pudo cargar ${path}: HTTP ${res.status}`);
    return res.json();
  }

  async function ensureMaps(){
    if(state.hebrewMaps) return state.hebrewMaps;
    const rows = await loadJson(HEBREW_DICT_PATH);
    state.hebrewMaps = buildHebrewMaps(rows);
    return state.hebrewMaps;
  }

  async function loadBook(book){
    if(state.cache.has(book)) return state.cache.get(book);
    const data = await loadJson(`${ORIG_DIR}/${book}.json`);
    state.cache.set(book, data);
    return data;
  }

  async function scanBook(book){
    const maps = await ensureMaps();
    const data = await loadBook(book);
    const out = [];
    const chapters = Array.isArray(data?.text) ? data.text : [];

    chapters.forEach((chapter, ci) => {
      (chapter || []).forEach((verse, vi) => {
        const baseTokens = splitTokens(verse);
        const tokens = baseTokens.flatMap((t) => expandTokenForLookup(t, maps.unpointedMap));
        tokens.forEach((token) => {
          if(tokenToGloss(token, maps) === '-'){
            out.push({
              book,
              chapter: ci + 1,
              verse: vi + 1,
              token,
              normalized: normalizeToken(token),
              verseText: verse
            });
          }
        });
      });
    });

    return out;
  }


  async function scanAllBooks(){
    const acc = [];
    for(const book of OT_BOOKS){
      const rows = await scanBook(book);
      acc.push(...rows);
    }
    return acc;
  }

  function sortRows(rows){
    return [...rows].sort((a, b) => {
      const bookDiff = (BOOK_INDEX.get(a.book) ?? Number.MAX_SAFE_INTEGER) - (BOOK_INDEX.get(b.book) ?? Number.MAX_SAFE_INTEGER);
      if(bookDiff !== 0) return bookDiff;
      if(a.chapter !== b.chapter) return a.chapter - b.chapter;
      if(a.verse !== b.verse) return a.verse - b.verse;
      return a.normalized.localeCompare(b.normalized, 'he');
    });
  }

  function downloadJson(filename, data){
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }
  function renderRows(){
    const filter = normalizeToken(els.filterInput.value || '');
    const rows = filter
      ? state.rows.filter((r) => normalizeToken(r.token).includes(filter))
      : state.rows;

    els.summary.textContent = `${rows.length} coincidencias (de ${state.rows.length} huecos detectados)`;
    els.resultsBody.innerHTML = rows.map((r) => `
      <tr>
        <td>${r.book}</td>
        <td>${r.chapter}</td>
        <td>${r.verse}</td>
        <td class="mono">${r.token}</td>
        <td class="mono">${r.normalized}</td>
        <td class="mono">${r.verseText}</td>
      </tr>
    `).join('');
  }

  async function init(){
    OT_BOOKS.forEach((b) => {
      const opt = document.createElement('option');
      opt.value = b;
      opt.textContent = b;
      els.bookSelect.appendChild(opt);
    });
    els.bookSelect.value = 'salmos';

    els.scanBookBtn.addEventListener('click', async () => {
      state.rows = await scanBook(els.bookSelect.value);
      renderRows();
    });

    els.scanAllBtn.addEventListener('click', async () => {
    state.rows = await scanAllBooks();
      renderRows();
    });

    els.exportAllBtn.addEventListener('click', async () => {
      const allRows = sortRows(await scanAllBooks());
      state.rows = allRows;
      renderRows();
       downloadJson('examinador-huecos-at.json', allRows);
      els.summary.textContent = `${allRows.length} huecos detectados. JSON generado y descargado.`;
    });

    els.filterInput.addEventListener('input', renderRows);
  }

  init().catch((err) => {
    els.summary.textContent = `Error: ${err.message}`;
    console.error(err);
  });
})();
