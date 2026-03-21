const STOPWORDS_ES = new Set(['de', 'la', 'que', 'el', 'en', 'y', 'a', 'los', 'del', 'se', 'las', 'por', 'un', 'para', 'con', 'no', 'una', 'su', 'al', 'lo']);

onmessage = async ({ data }) => {
  if (data?.type !== 'start') return;
  try {
    const { payload } = data;
    const entries = await buildDictionary(payload);
    postMessage({ type: 'result', entries: entries.items, summary: entries.summary });
  } catch (err) {
    postMessage({ type: 'error', message: err.message || String(err) });
  }
};

async function buildDictionary(payload) {
  const config = payload.config || {};
  const topK = clamp(config.topK || 10, 1, 50);
  const minCount = clamp(config.minCount || 2, 1, 1000);
  const minTokenLen = clamp(config.minTokenLen || 2, 1, 20);
  const filterStopwords = !!config.filterStopwords;

  const ctx = {
    esByRef: new Map(),
    heByRef: new Map(),
    grByRef: new Map(),
    masterMap: new Map(),
    versesES: 0,
    versesHE: 0,
    versesGRAT: 0,
    versesGRNT: 0,
  };

  postProgress(2, 'Cargando fuentes...');
  if (payload.mode === 'repo') {
    await loadFromRepo(payload.repoBase, ctx);
  } else {
    await loadFromFiles(payload, ctx);
  }

  postProgress(45, 'Construyendo co-ocurrencias...');
  const pairES_HE = new Map();
  const pairES_GR = new Map();
  const uniqueESTokens = new Set();

  const refs = new Set([...ctx.esByRef.keys(), ...ctx.heByRef.keys(), ...ctx.grByRef.keys()]);
  let processed = 0;
  for (const ref of refs) {
    const esSet = ctx.esByRef.get(ref);
    if (!esSet?.size) continue;
    const heSet = ctx.heByRef.get(ref) || new Set();
    const grSet = ctx.grByRef.get(ref) || new Set();
    if (!heSet.size && !grSet.size) continue;

    for (const es of esSet) {
      if (!isValidToken(es, minTokenLen, filterStopwords)) continue;
      uniqueESTokens.add(es);
      for (const he of heSet) incNestedCount(pairES_HE, es, he);
      for (const gr of grSet) {
        const normalized = ctx.masterMap.get(gr) || gr;
        incNestedCount(pairES_GR, es, normalized);
      }
    }
    processed += 1;
    if (processed % 3000 === 0) {
      postProgress(45 + Math.min(45, Math.round((processed / refs.size) * 45)), `Versos procesados: ${processed}/${refs.size}`);
    }
  }

  postProgress(93, 'Construyendo salida final...');
  const items = [];
  let id = 1;
const allESTokens = new Set([...pairES_HE.keys(), ...pairES_GR.keys()]);
  for (const es of allESTokens) {
    const heMap = pairES_HE.get(es);
        const grMap = pairES_GR.get(es);
    const heList = heMap ? topFromMap(heMap, topK, minCount) : [];
    const grList = grMap ? topFromMap(grMap, topK, minCount) : [];
    if (!heList.length && !grList.length) continue;
    items.push({ id: id++, es, he: heList, gr: grList });
  }

  const summary = {
    verses: {
      es: ctx.versesES,
      he: ctx.versesHE,
      grAT: ctx.versesGRAT,
      grNT: ctx.versesGRNT,
    },
    uniqueESTokens: uniqueESTokens.size,
    pairESHEUnique: sumNestedSize(pairES_HE),
    pairESGRUnique: sumNestedSize(pairES_GR),
    finalEntries: items.length,
    topEvidence: items.slice(0, 20),
  };

  postProgress(100, `Listo. Entradas finales: ${items.length}`);
  return { items, summary };
}

async function loadFromFiles(payload, ctx) {
  for (const e of payload.rvFiles || []) {
    if (!e.name.endsWith('.json')) continue;
    const json = JSON.parse(await e.file.text());
    parseESBook(e.name, json, ctx);
  }
  postProgress(12, 'RV1960 cargado');

  for (const e of payload.heFiles || []) {
    if (!e.name.endsWith('.json') || e.name.toLowerCase() === 'bgriega.json') continue;
    const json = JSON.parse(await e.file.text());
    parseHEBook(e.name, json, ctx);
  }
  postProgress(25, 'Hebreo AT cargado');

  for (const e of payload.lxxFiles || []) {
    if (!e.name.endsWith('.json')) continue;
    const json = JSON.parse(await e.file.text());
    parseLXXBook(json, ctx);
  }
  postProgress(35, 'LXX cargado');

  if (payload.bgriega) {
    const bg = JSON.parse(await payload.bgriega.text());
    parseBgriega(bg, ctx);
  }
  postProgress(40, 'Griego NT cargado');

  if (payload.master) {
    const master = JSON.parse(await payload.master.text());
    parseMaster(master, ctx);
  }
}

async function loadFromRepo(base, ctx) {
  const clean = (base || '').replace(/\/$/, '');
  const [rv, he, lxx, bgr, master] = await Promise.all([
    fetchJson(`${clean}/librosRV1960/index.json`).catch(() => null),
    fetchJson(`${clean}/IdiomaORIGEN/index.json`).catch(() => null),
    fetchJson(`${clean}/LXX/index.json`).catch(() => null),
    fetchJson(`${clean}/IdiomaORIGEN/Bgriega.json`),
    fetchJson(`${clean}/diccionario/masterdiccionario.json`).catch(() => null),
  ]);

  if (!rv || !he || !lxx) {
    throw new Error('Modo repo requiere index.json de carpetas (librosRV1960, IdiomaORIGEN, LXX). Use modo A si no existen.');
  }

  for (const file of rv.files || []) parseESBook(file, await fetchJson(`${clean}/librosRV1960/${file}`), ctx);
  postProgress(12, 'RV1960 cargado');

  for (const file of he.files || []) {
    if (file === 'Bgriega.json') continue;
    parseHEBook(file, await fetchJson(`${clean}/IdiomaORIGEN/${file}`), ctx);
  }
  postProgress(25, 'Hebreo AT cargado');

  for (const file of lxx.files || []) parseLXXBook(await fetchJson(`${clean}/LXX/${file}`), ctx);
  postProgress(35, 'LXX cargado');

  parseBgriega(bgr, ctx);
  postProgress(40, 'Griego NT cargado');

  if (master) parseMaster(master, ctx);
}

function parseESBook(fileName, data, ctx) {
  const book = normalizeBookName(fileName);
  if (!Array.isArray(data)) return;
  data.forEach((chapterArr, cIdx) => {
    if (!Array.isArray(chapterArr)) return;
    chapterArr.forEach((verseText, vIdx) => {
      const ref = `${book}|${cIdx + 1}|${vIdx + 1}`;
      const tokens = tokenizeES(String(verseText || ''));
      if (!tokens.length) return;
      ctx.esByRef.set(ref, new Set(tokens));
      ctx.versesES += 1;
    });
  });
}

function parseHEBook(fileName, data, ctx) {
  const book = normalizeBookName(fileName);
  const chapters = Array.isArray(data?.text) ? data.text : null;
  if (!chapters) return;
  chapters.forEach((chapterArr, cIdx) => {
    if (!Array.isArray(chapterArr)) return;
    chapterArr.forEach((verseText, vIdx) => {
      const ref = `${book}|${cIdx + 1}|${vIdx + 1}`;
      const tokens = tokenizeHE(String(verseText || ''));
      if (!tokens.length) return;
      ctx.heByRef.set(ref, new Set(tokens));
      ctx.versesHE += 1;
    });
  });
}

function parseLXXBook(data, ctx) {
  const text = data?.text;
  if (!text || typeof text !== 'object') return;
  for (const code of Object.keys(text)) {
    const bookObj = text[code];
    const chapterNums = Object.keys(bookObj || {});
    const esBook = mapLXXCodeToESBook(code);
    if (!esBook) continue;
    for (const c of chapterNums) {
      const verses = bookObj[c] || {};
      for (const v of Object.keys(verses)) {
        const arr = verses[v] || [];
        const tokens = arr.map((t) => normGR(t?.lemma || t?.w || '')).filter(Boolean);
        if (!tokens.length) continue;
        const ref = `${esBook}|${Number(c)}|${Number(v)}`;
        mergeSetMap(ctx.grByRef, ref, tokens);
        ctx.versesGRAT += 1;
      }
    }
  }
}

function parseBgriega(data, ctx) {
  const verses = data?.verses;
  if (!Array.isArray(verses)) return;
  for (const row of verses) {
    const esBook = mapNTBookNumToESBook(Number(row.book));
    if (!esBook) continue;
    const ref = `${esBook}|${Number(row.chapter)}|${Number(row.verse)}`;
    const tokens = tokenizeGR(String(row.text || ''));
    if (!tokens.length) continue;
    mergeSetMap(ctx.grByRef, ref, tokens);
    ctx.versesGRNT += 1;
  }
}

function parseMaster(master, ctx) {
  const items = master?.items;
  if (!Array.isArray(items)) return;
  for (const it of items) {
    const form = normGR(it['Forma flexionada del texto'] || it.form || '');
    const lemma = normGR(it.lemma || '');
    if (form && lemma) ctx.masterMap.set(form, lemma);
  }
}

function tokenizeES(s) {
  return normES(s).split(' ').map((x) => x.trim()).filter(Boolean);
}
function tokenizeHE(s) {
  return normHE(s).split(/\s+/).map((x) => x.trim()).filter(Boolean);
}
function tokenizeGR(s) {
  return normGR(s).split(' ').map((x) => x.trim()).filter(Boolean);
}

function normES(s) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function normHE(s) {
  return s
    .replace(/[\u0591-\u05C7]/g, '')
    .replace(/־/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function normGR(s) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/ς/g, 'σ')
    .replace(/[^\p{Script=Greek}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isValidToken(token, minLen, filterStopwords) {
  if (!token || token.length < minLen) return false;
  if (/^\d+$/.test(token)) return false;
  if (filterStopwords && STOPWORDS_ES.has(token)) return false;
  return true;
}

function mapLXXCodeToESBook(code) {
  const c = String(code || '').toLowerCase();
  const map = {
    gen: 'genesis', exod: 'exodo', lev: 'levitico', num: 'numeros', deut: 'deuteronomio',
    josh: 'josue', judg: 'jueces', ruth: 'rut', '1sam': '1_samuel', '2sam': '2_samuel',
    '1kgs': '1_reyes', '2kgs': '2_reyes', '1chr': '1_cronicas', '2chr': '2_cronicas',
    '1esdr': 'esdras', neh: 'nehemias', esth: 'ester', job: 'job', ps: 'salmos', prov: 'proverbios',
    eccl: 'eclesiastes', song: 'cantares', isa: 'isaias', jer: 'jeremias', lam: 'lamentaciones',
    ezek: 'ezequiel', dan: 'daniel', hos: 'oseas', joel: 'joel', amos: 'amos', obad: 'abdias',
    jonah: 'jonas', mic: 'miqueas', nah: 'nahum', hab: 'habacuc', zeph: 'sofonias',
    hag: 'hageo', zech: 'zacarias', mal: 'malaquias'
  };
  return map[c] || null;
}

function mapNTBookNumToESBook(num) {
  const books = {
    40: 'mateo', 41: 'marcos', 42: 'lucas', 43: 'juan', 44: 'hechos', 45: 'romanos',
    46: '1_corintios', 47: '2_corintios', 48: 'galatas', 49: 'efesios', 50: 'filipenses',
    51: 'colosenses', 52: '1_tesalonicenses', 53: '2_tesalonicenses', 54: '1_timoteo', 55: '2_timoteo',
    56: 'tito', 57: 'filemon', 58: 'hebreos', 59: 'santiago', 60: '1_pedro', 61: '2_pedro',
    62: '1_juan', 63: '2_juan', 64: '3_juan', 65: 'judas', 66: 'apocalipsis'
  };
  return books[num] || null;
}

function normalizeBookName(name) {
  const base = String(name || '').replace(/\.json$/i, '').trim().toLowerCase();
  return base
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');
}

function incNestedCount(map, k1, k2) {
  if (!k2) return;
  let inner = map.get(k1);
  if (!inner) {
    inner = new Map();
    map.set(k1, inner);
  }
  inner.set(k2, (inner.get(k2) || 0) + 1);
}

function topFromMap(map, k, minCount) {
  return [...map.entries()]
    .filter(([, c]) => c >= minCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([token]) => token);
}

function sumNestedSize(map) {
  let n = 0;
  for (const inner of map.values()) n += inner.size;
  return n;
}

function mergeSetMap(map, key, tokens) {
  const set = map.get(key) || new Set();
  for (const t of tokens) if (t) set.add(t);
  map.set(key, set);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`No se pudo leer ${url}`);
  return r.json();
}

function postProgress(percent, message) {
  postMessage({ type: 'progress', percent, message });
}
