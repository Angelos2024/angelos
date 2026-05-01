
const REMOTE_ALEFATO_FILE_NAMES = [
  '01genesis.json',
  '02Éxodo.json',
  '03Levítico.json',
  '04Números.json',
  '05Deuteronomio.json',
  '06Josué.json',
  '07Jueces.json',
  '08Rut.json',
  '09Samuel1.json',
  '10Samuel2.json',
  '11Reyes1.json',
  '12Reyes2.json',
  '13Crónicas1.json',
  '14Crónicas2.json',
  '15Esdras.json',
  '16Nehemías.json',
  '17Ester.json',
  '18Job.json',
  '19Salmos.json',
  '20Proverbios.json',
  '21Eclesiastes.json',
  '22Cantares.json',
  '23Isaías.json',
  '24Jeremías.json',
  '25Lamentaciones.json',
  '26Ezequiel.json',
  '27Daniel.json',
  '28Oseas.json',
  '29Joel.json',
  '30Amós.json',
  '31Abdías.json',
  '32Jonás.json',
  '33Miqueas.json',
  '34Nahúm.json',
  '35Habacuc.json',
  '36Sofonías.json',
  '37Hageo.json',
  '38zacarias.json',
  '39malaquias.json'
];

const REMOTE_ALEFATO_SOURCES = REMOTE_ALEFATO_FILE_NAMES.map(name => ({
  name,
  url: `../dic/trilingue/${encodeURIComponent(name)}`
}));

const REMOTE_ALEFATO_INDEX_SOURCES = [
  {
    name: 'trilingue_at_search_index.min.json',
    url: '../dic/trilingue_at_search_index.min.json'
  },
  {
    name: 'trilingue_at_search_index.json',
    url: '../dic/trilingue_at_search_index.json'
  }
];

const HE_INFLECTION_MAP = [
  { suffix: 'ַיִם', type: 'dual', label: '(Dual)' },
  { suffix: 'ַיִן', type: 'plural_arameo', label: '(Plur. Arameo)' },
  { suffix: 'ון', type: 'plural_arcaico', label: '(Plur. Arcaico)' },
  { suffix: 'ים', type: 'plural_masc', label: '(Plural)' },
  { suffix: 'ות', type: 'plural_fem', label: '(Plural)' },
  { suffix: 'י',  type: 'constructo_plural', label: '(Const. Plural)' },
  { suffix: 'ה',  type: 'femenino_singular', label: '(Fem.)' }
];

const HE_PLURALE_TANTUM = [
  'מים', 'שמים', 'פנים', 'מצרים', 'חיים', 'אלהים', 'אֱלֹהִים'
].map(x => normalizeText(stripHebrewMarksAnywhere(x)));

function getLemma(word) {
  const clean = normalizeText(stripHebrewMarksAnywhere(word));
  if (!clean || HE_PLURALE_TANTUM.includes(clean)) return null;

  for (const rule of HE_INFLECTION_MAP) {
    if (!clean.endsWith(rule.suffix)) continue;
    if (clean.length <= rule.suffix.length + 1) continue;

    const base = clean.slice(0, -rule.suffix.length);
    if (!base || base.length < 2) continue;

    // Evitar falsos cortes como יָם <- suffix 'ים'
    if ((rule.suffix === 'ים' || rule.suffix === 'ות' || rule.suffix === 'י') && base.length < 3) continue;

    return {
      base,
      label: rule.label,
      type: rule.type
    };
  }

  return null;
}

function findLemmaMatches(rawSpan, q, queryHasMarks) {
  const lemma = getLemma(rawSpan);
  if (!lemma) return null;

  const exactIdxs = collectByIndexKey(indexExact, [lemma.base]);
  const normIdxs = collectByIndexKey(indexNorm, [lemma.base]);
  const noVIdxs = collectByIndexKey(indexNoVowels, [normalizeText(stripHebrewMarksAnywhere(lemma.base))]);

  const merged = dedupeResultEntries(preferMarkedEntriesIfQueryHasMarks(
    getEntriesFromIndices([...exactIdxs, ...normIdxs, ...noVIdxs]),
    queryHasMarks
  ));

  if (!merged.length) return null;

  return {
    lemma,
    matches: merged.map(m => ({
      ...m,
      _lemmaBase: lemma.base,
      _lemmaLabel: lemma.label
    }))
  };
}

function searchHebrewWordSingle(rawInput) {
  const q = buildQueryForms(rawInput);
  const rawSpan = q.span;
  const rawToken = q.tokens[0] || rawSpan;
  const qNorm = q.normKeys[0] || normalizeText(rawSpan);
  const qNoVowels = q.noVKeys[0] || normalizeText(stripHebrewMarksAnywhere(rawSpan));
  const queryHasMarks = hasHebrewMarks(rawSpan);

  const trace = [];
  trace.push(`Consulta: ${rawInput || ''}`);
  trace.push(`Span hebreo tomado: ${rawSpan || '∅'}`);
  trace.push(`Tokens: ${q.tokens.length ? q.tokens.join(' | ') : '∅'}`);
  trace.push(`Aliases exactos consulta: ${q.exactKeys.length}`);
  trace.push(`Normalizado (principal): ${qNorm || '∅'}`);
  trace.push(`Sin vocales (principal): ${qNoVowels || '∅'}`);

  if (!rawSpan || !RE_HEB.test(rawSpan)) {
    return { ok:false, tier:'Sin token hebreo', matches:[], trace, diag:'No se detectó una palabra/expresión hebrea en la entrada.' };
  }

  const rawExactIdxs = collectByIndexKey(indexExact, [nfc(rawSpan)]);
  if (rawExactIdxs.length) {
    const rawExactMatches = preferMarkedEntriesIfQueryHasMarks(getEntriesFromIndices(rawExactIdxs), queryHasMarks);
    trace.push(`Filtro 1a (exacto literal): ${rawExactMatches.length} coincidencia(s) devuelta(s).`);
    return { ok:true, tier:'Filtro 1: exacto tal cual', matches:rawExactMatches, trace, diag:'Se encontró coincidencia exacta literal de la forma consultada; no se ejecutaron filtros posteriores ni variantes sin vocales.' };
  }
  trace.push('Filtro 1a (exacto literal): sin resultados.');

  const exactIdxs = collectByIndexKey(indexExact, q.exactKeys);
  if (exactIdxs.length) {
    let exactMatches = getEntriesFromIndices(exactIdxs);
    exactMatches = preferMarkedEntriesIfQueryHasMarks(exactMatches, queryHasMarks);
    trace.push(`Filtro 1b (exacto/compuesto): ${exactMatches.length} coincidencia(s) devuelta(s).`);
    return { ok:true, tier:'Filtro 1: exacto tal cual', matches:exactMatches, trace, diag:'Se encontró coincidencia exacta (incluyendo variantes compuestas con guion/maqaf/espacios si aplica); no se ejecutaron filtros posteriores.' };
  }
  trace.push('Filtro 1b (exacto/compuesto): sin resultados.');

  const lemmaRes = findLemmaMatches(rawSpan, q, queryHasMarks);
  if (lemmaRes) {
    trace.push(`Filtro 1c (lema gramatical): ${lemmaRes.matches.length} coincidencia(s) desde lema ${lemmaRes.lemma.base} ${lemmaRes.lemma.label}.`);
    return {
      ok:true,
      tier:'Filtro 1c: lema gramatical',
      matches: lemmaRes.matches,
      trace,
      diag:`No hubo coincidencia exacta para la forma flexionada; se resolvió por lema ${lemmaRes.lemma.base} ${lemmaRes.lemma.label}.`
    };
  }
  trace.push('Filtro 1c (lema gramatical): sin resultados.');

  if (q.normKeys.length) {
    const normIdxs = collectByIndexKey(indexNorm, q.normKeys);
    if (normIdxs.length) {
      let normMatches = getEntriesFromIndices(normIdxs);
      normMatches = preferMarkedEntriesIfQueryHasMarks(normMatches, queryHasMarks);
      trace.push(`Filtro 2 (normalizado/compuesto): ${normMatches.length} coincidencia(s) devuelta(s).`);
      return { ok:true, tier:'Filtro 2: exacto normalizado', matches:normMatches, trace, diag:'Se encontró coincidencia por normalización (niqqud/cantillación/puntuación/maqaf) y variantes compuestas.' };
    }
  }
  trace.push('Filtro 2 (normalizado/compuesto): sin resultados.');

  const strictMorphScoreMap = buildStrictMorphScoreMap(rawSpan, q);
  if (qNorm) strictMorphScoreMap.delete(qNorm);
  if (rawToken) strictMorphScoreMap.delete(normalizeText(hebLettersOnly(rawToken)));
  if (rawSpan) strictMorphScoreMap.delete(normalizeText(hebLettersOnly(rawSpan)));

  const strictMorphKeys = uniqueSortedShort([...strictMorphScoreMap.keys()], 1200);
  trace.push(`Filtro 3 (morfológico preciso): ${strictMorphKeys.length} candidato(s) normalizados generados.`);
  if (strictMorphKeys.length) {
    trace.push('Ejemplos candidatos (F3 preciso): ' + strictMorphKeys.slice(0,40).join(', '));
    const morphTop = collectTopMorphMatches(strictMorphScoreMap, qNorm, qNoVowels);
    if (morphTop.matches.length) {
      trace.push('Ranking F3 (top): ' + (morphTop.debug.join(', ') || '∅'));
      trace.push(`Filtro 3 (morfológico preciso): ${morphTop.matches.length} coincidencia(s) final(es).`);
      return { ok:true, tier:'Filtro 3: morfológico (prefijos/sufijos, preciso)', matches:morphTop.matches, trace, diag:'Se encontró coincidencia morfológica con criterio de precisión (priorizando el lema objetivo y evitando palabras cercanas).' };
    }
  }
  trace.push('Filtro 3 (morfológico preciso): sin resultados.');

  const rootNoVowelsKeys = uniqueSortedShort([
    ...q.noVKeys,
    ...strictMorphKeys.map(k => normalizeText(stripHebrewMarksAnywhere(k)))
  ].filter(Boolean), 1200);
  trace.push(`Filtro 4 (sin vocales): ${rootNoVowelsKeys.length} clave(s) de raíz.`);
  if (rootNoVowelsKeys.length) {
    trace.push('Ejemplos claves (F4): ' + rootNoVowelsKeys.slice(0,40).join(', '));
    const noVIdxs = collectByIndexKey(indexNoVowels, rootNoVowelsKeys);
    if (noVIdxs.length) {
      trace.push(`Filtro 4 (sin vocales): ${noVIdxs.length} coincidencia(s).`);
      return { ok:true, tier:'Filtro 4: raíz sin vocales', matches:getEntriesFromIndices(noVIdxs), trace, diag:'Se encontró coincidencia por consonantes/raíz sin vocales, restringida a candidatos morfológicos precisos.' };
    }
  }
  trace.push('Filtro 4 (sin vocales): sin resultados.');

  return { ok:false, tier:'Sin resultados', matches:[], trace, diag:'No hubo coincidencias tras pasar los filtros exactos, lema, normalización y morfología.' };
}

function hasCompoundConnector(span) {
  return /[־\-‐‑‒–—]/.test(String(span || ''));
}

function compactHebrewNoVowels(s) {
  return normalizeText(stripHebrewMarksAnywhere(String(s || '').replace(/[\s־\-‐‑‒–—]+/g, '')));
}

const KNOWN_LEXICALIZED_COMPOUND_SPLITS = (() => {
  const raw = [
    ['בארשבע', ['באר', 'שבע']],
    ['באר-שבע', ['באר', 'שבע']],
    ['ביתספר', ['בית', 'ספר']],
    ['בןאדם', ['בן', 'אדם']],
    ['קריתארבע', ['קרית', 'ארבע']],
    ['ביתאל', ['בית', 'אל']],
    ['ביתלחם', ['בית', 'לחם']]
  ];
  const m = new Map();
  for (const [whole, parts] of raw) {
    const k = compactHebrewNoVowels(whole);
    const normParts = (parts || []).map(compactHebrewNoVowels).filter(Boolean);
    if (!k || normParts.length < 2) continue;
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(normParts);
  }
  return m;
})();

function scoreCompoundSplit(parts, wholeKey) {
  const lens = parts.map(p => p.length);
  const minLen = Math.min(...lens);
  const maxLen = Math.max(...lens);
  const diff = maxLen - minLen;
  const joined = parts.join('');
  const joinedPenalty = (joined === wholeKey ? 0 : 5);
  const shortPenalty = lens.reduce((acc, n) => acc + (n < 2 ? 20 : 0), 0);
  const oneLetterPenalty = lens.reduce((acc, n) => acc + (n === 1 ? 100 : 0), 0);
  const partsPenalty = (parts.length - 2) * 4;
  return oneLetterPenalty + shortPenalty + partsPenalty + diff + joinedPenalty;
}

function dedupeSplitPlans(plans) {
  const seen = new Set();
  const out = [];
  for (const p of (plans || [])) {
    const parts = Array.isArray(p?.parts) ? p.parts.map(String).filter(Boolean) : [];
    if (parts.length < 2) continue;
    const key = parts.join('+');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      kind: p.kind || 'heuristic',
      parts,
      score: Number.isFinite(p.score) ? p.score : 999
    });
  }
  out.sort((a,b) => {
    const kindRank = (x) => x.kind === 'known' ? 0 : 1;
    return kindRank(a) - kindRank(b) || a.score - b.score || a.parts.length - b.parts.length;
  });
  return out;
}

function findLexicalizedCompoundPlans(rawSpan) {
  const plans = [];
  const wholeKey = compactHebrewNoVowels(rawSpan);
  if (!wholeKey || wholeKey.length < 4) return plans;

  const known = KNOWN_LEXICALIZED_COMPOUND_SPLITS.get(wholeKey) || [];
  for (const parts of known) {
    plans.push({ kind:'known', parts, score: scoreCompoundSplit(parts, wholeKey) });
  }

  const wholeExists = indexNoVowels.has(wholeKey);

  for (let i = 2; i <= wholeKey.length - 2; i++) {
    const a = wholeKey.slice(0, i);
    const b = wholeKey.slice(i);
    if (a.length < 2 || b.length < 2) continue;
    if (!indexNoVowels.has(a) || !indexNoVowels.has(b)) continue;
    if (wholeExists && !known.length) continue; 
    const parts = [a, b];
    plans.push({ kind:'heuristic', parts, score: scoreCompoundSplit(parts, wholeKey) });
  }

  if (wholeKey.length >= 6) {
    for (let i = 2; i <= wholeKey.length - 4; i++) {
      for (let j = i + 2; j <= wholeKey.length - 2; j++) {
        const a = wholeKey.slice(0, i);
        const b = wholeKey.slice(i, j);
        const c = wholeKey.slice(j);
        if (a.length < 2 || b.length < 2 || c.length < 2) continue;
        if (!indexNoVowels.has(a) || !indexNoVowels.has(b) || !indexNoVowels.has(c)) continue;
        if (wholeExists && !known.length) continue;
        const parts = [a, b, c];
        plans.push({ kind:'heuristic', parts, score: scoreCompoundSplit(parts, wholeKey) + 3 });
      }
    }
  }

  return dedupeSplitPlans(plans).slice(0, 8);
}

// ==== NUEVA VERSIÓN: Con combinación de traducciones (Entrada Sintética) ====
function resolveBySeparatedParts(parts, rawSpan, label, options = {}) {
  const requireAllParts = options.requireAllParts !== false;
  const allMatches = [];
  const partsTrace = [];
  const partsFound = [];
  const partsMissing = [];
  const topTranslations = [];

  for (const part of (parts || [])) {
    const sub = searchHebrewWordSingle(part);
    partsTrace.push(`\n[Parte: ${part}]`);
    partsTrace.push(...sub.trace);
    
    if (sub.ok && sub.matches.length) {
      const partMatches = sub.matches.map(m => ({ ...m, _queryPart: part }));
      allMatches.push(...partMatches);
      partsFound.push(`${part} → ${sub.tier} (${sub.matches.length})`);
      
      // Extraer la mejor traducción de esta parte para la combinación sintética
      const bestEs = partMatches[0].es ? partMatches[0].es.split(/[,/]/)[0].trim() : part;
      topTranslations.push(bestEs);
    } else {
      partsMissing.push(part);
      topTranslations.push(`[${part}?]`); // Placeholder si no se encuentra
    }
  }

  if (requireAllParts && partsMissing.length) {
    return null;
  }

  let merged = dedupeResultEntries(allMatches);
  if (!merged.length) return null;

  // GENERAR ENTRADA SINTÉTICA (Ej. "todo + pueblo")
  if (parts.length > 1 && partsFound.length === parts.length) {
      const combinedHe = parts.join(' ־ '); // Mostramos con Maqaf visual
      const combinedEs = topTranslations.join(' + ');
      const topGreekTranslations = [];
      for (const part of (parts || [])) {
        const partMatch = allMatches.find(m => (m?._queryPart || '') === part && (m.gr || m.equivalencia_griega || m.greek));
        if (!partMatch) continue;
        topGreekTranslations.push(partMatch.gr || partMatch.equivalencia_griega || partMatch.greek);
      }
      const combinedGr = topGreekTranslations.join(' + ');
      const syntheticEntry = {
          he: combinedHe,
          gr: combinedGr,
          es: combinedEs,
          source: "Traducción combinada automática",
          _queryPart: rawSpan,
          _isSynthetic: true
      };
      // Colocar la entrada sintética al inicio de los resultados
      merged = [syntheticEntry, ...merged];
  }

  const trace = [
    `${label}: ${rawSpan}`,
    `Se divide en partes: ${parts.join(' + ')}`,
    'Política aplicada: devolver resultados por palabra separada y generar traducción combinada.',
    ...(partsFound.length ? [`Partes con resultado: ${partsFound.join(' | ')}`] : []),
    ...(partsMissing.length ? [`Partes sin resultado: ${partsMissing.join(' | ')}`] : []),
    ...partsTrace
  ];

  return {
    ok: true,
    tier: label.includes('lexicalizado') ? 'Compuesto dividido (Traducción combinada)' : 'Compuesto dividido (Traducción combinada)',
    matches: merged,
    trace,
    diag: `Se detectó compuesto, se buscaron ${parts.length} componente(s) y se generó una traducción unificada.`
  };
}

function dedupeResultEntries(list) {
  const seen = new Set();
  const out = [];
  for (const e of (list || [])) {
    if (!e) continue;
    const greekKey = e.gr || e.equivalencia_griega || e.greek || '';
    const k = `${e.he || ''}\u0000${e.es || ''}\u0000${greekKey}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(e);
  }
  return out; // Eliminamos el sort general para que la entrada sintética se quede arriba
}

function searchHebrewWord(rawInput) {
  const q = buildQueryForms(rawInput);
  const rawSpan = q.span;

  if (!rawSpan || !RE_HEB.test(rawSpan)) {
    return searchHebrewWordSingle(rawInput);
  }

  // MODIFICADO: Si hay guion/maqaf, forzar la búsqueda por partes de inmediato
  if (hasCompoundConnector(rawSpan)) {
    // Usamos split explícito para asegurar que se divida aunque tokenizeHebrew no lo haya hecho bien
    const partsToUse = rawSpan.split(/[־\-‐‑‒–—\s]+/).filter(Boolean);
    if (partsToUse.length >= 2) {
      const resParts = resolveBySeparatedParts(partsToUse, rawSpan, 'Consulta compuesta detectada (guion/maqaf)', { requireAllParts:false });
      if (resParts) return resParts;
    }

    const fallback = searchHebrewWordSingle(rawInput);
    fallback.trace = [
      `Consulta compuesta detectada (guion/maqaf): ${rawSpan}`,
      `Se intentó por partes sin éxito.`,
      'Respaldo: búsqueda de la expresión completa.',
      ...fallback.trace
    ];
    return fallback;
  }

  const singleRes = searchHebrewWordSingle(rawInput);
  if (singleRes.ok) {
    return singleRes;
  }

  if (!hasCompoundConnector(rawSpan) && q.tokens.length === 1) {
    const plans = findLexicalizedCompoundPlans(rawSpan);
    if (plans.length) {
      for (const plan of plans) {
        const parts = plan.parts;
        const label = `Consulta compuesta lexicalizada sin guion (${plan.kind})`;
        const resParts = resolveBySeparatedParts(parts, rawSpan, label, { requireAllParts:true });
        if (resParts) {
          resParts.trace.unshift(`Plan de segmentación elegido: ${parts.join(' + ')} · tipo=${plan.kind} · score=${plan.score}`);
          return resParts;
        }
      }
    }
  }

  return singleRes;
}

async function handleFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;

  const collected = [];
  let okFiles = 0;
  const errs = [];

  for (const f of files) {
    try {
      const txt = await f.text();
      const data = parseAlefatoJsonFlexible(txt);
      const tmp = [];
      collectAlefatoEntries(data, f.name, tmp);
      if (!tmp.length) throw new Error('No se detectaron objetos con texto hebreo');
      collected.push(...tmp);
      okFiles++;
    } catch (e) {
      errs.push(`${f.name}: ${e?.message || e}`);
    }
  }

  if (collected.length) {
    entries = dedupeEntries(entries.concat(collected));
    loadedFiles += okFiles;
    rebuildIndexes();
  }

  renderLoadInfo();

  if (errs.length) {
    if (diagEl) diagEl.textContent = 'Errores de carga: ' + errs.join(' | ');
      } else if (collected.length) {
    if (diagEl) diagEl.textContent = '';
      }
}

let remoteAlefatoLoadPromise = null;

async function loadRemoteAlefatoIndex() {
  for (const source of REMOTE_ALEFATO_INDEX_SOURCES) {
    try {
      const resp = await fetch(source.url, { cache: 'force-cache' });
      if (!resp.ok) continue;
      const payload = JSON.parse(await resp.text());
      const rows = Array.isArray(payload?.rows) ? payload.rows : [];
      if (!rows.length) continue;

      const hydrated = window.AlefatoIndexedSearchAPI?.hydrateEntries
        ? window.AlefatoIndexedSearchAPI.hydrateEntries(rows, source.name)
        : [];
      if (!hydrated.length) continue;

      entries = hydrated;
      loadedFiles = 1;
      clearIndexes();
      rebuildIndexes();
      if (window.AlefatoIndexedSearchAPI?.setPayload) {
        window.AlefatoIndexedSearchAPI.setPayload(payload);
      }
      renderLoadInfo();
      if (diagEl) diagEl.textContent = `Base indexada cargada: ${entries.length.toLocaleString()} entradas desde ${source.name}.`;
      return true;
    } catch (_) {
      continue;
    }
  }
  return false;
}

async function loadRemoteAlefatoFiles() {
  if (await loadRemoteAlefatoIndex()) return;

  const collected = [];
  const errs = [];

  if (diagEl) diagEl.textContent = 'Cargando diccionario…';
  if (searchBtn) searchBtn.disabled = true;

  const results = await Promise.all(REMOTE_ALEFATO_SOURCES.map(async (source) => {
    try {
      const resp = await fetch(source.url, { cache: 'force-cache' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const txt = await resp.text();
      const data = parseAlefatoJsonFlexible(txt);
      const tmp = [];
      collectAlefatoEntries(data, source.name, tmp);
      if (!tmp.length) throw new Error('No se detectaron objetos con texto hebreo');
      return { ok: true, source, rows: tmp };
    } catch (error) {
      return { ok: false, source, error };
    }
  }));

  let okFiles = 0;
  for (const result of results) {
    if (result.ok) {
      collected.push(...result.rows);
      okFiles++;
      continue;
    }
    errs.push(`${result.source.name}: ${result.error?.message || result.error}`);
  }

  entries = collected.length ? dedupeEntries(collected) : [];
  loadedFiles = okFiles;
  clearIndexes();
  if (entries.length) rebuildIndexes();
  renderLoadInfo();

  if (errs.length) {
    if (diagEl) diagEl.textContent = 'Se cargó la base con incidencias: ' + errs.join(' | ');
  } else if (collected.length) {
    if (diagEl) diagEl.textContent = `Base remota cargada al consultar: ${collected.length.toLocaleString()} entradas detectadas antes de deduplicar.`;
      } else {
    if (diagEl) diagEl.textContent = 'No se pudo cargar la base remota.';
  }
}

function ensureRemoteAlefatoLoaded() {
  if (entries.length) return Promise.resolve(entries);
  if (remoteAlefatoLoadPromise) return remoteAlefatoLoadPromise;

  remoteAlefatoLoadPromise = loadRemoteAlefatoFiles()
    .catch((error) => {
      remoteAlefatoLoadPromise = null;
      throw error;
    })
    .then(() => entries);

  return remoteAlefatoLoadPromise;
}

async function doSearch() {
  if (!entries.length) {
    try {
      await ensureRemoteAlefatoLoaded();
    } catch (error) {
      setTierBadge('Sin base cargada', false);
    if (diagEl) diagEl.textContent = 'No se pudo cargar la base remota.';
          return;
    }
  }
    if (!entries.length) {
    setTierBadge('Sin base cargada', false);
    if (diagEl) diagEl.textContent = 'Primero cargue uno o más archivos JSON del alefato.';    return;
  }
const query = queryEl ? queryEl.value : '';
  const res = searchHebrewWord(query);
  renderResults(res.matches, query);
  if (resultCountEl) resultCountEl.textContent = `${res.matches.length.toLocaleString()} resultado(s)`;
  setTierBadge(res.tier, !!res.ok);
if (diagEl) diagEl.textContent = res.diag;
  if (traceEl) traceEl.textContent = res.trace.join('\n');
}

function clearAll() {
  entries = [];
  loadedFiles = 0;
  remoteAlefatoLoadPromise = null;
  clearIndexes();
  if (window.AlefatoIndexedSearchAPI?.clearLookups) {
    window.AlefatoIndexedSearchAPI.clearLookups();
  }
  renderLoadInfo();
  renderResults([]);
  setTierBadge('Sin búsqueda', false);
if (resultCountEl) resultCountEl.textContent = '0 resultados';
  if (diagEl) diagEl.textContent = 'Base reiniciada.';
  if (traceEl) traceEl.textContent = '—';
  if (alefatoFilesEl) alefatoFilesEl.value = '';
}

if (alefatoFilesEl) alefatoFilesEl.addEventListener('change', (e) => handleFiles(e.target.files));
if (clearBtn) clearBtn.addEventListener('click', clearAll);
if (searchBtn) searchBtn.addEventListener('click', doSearch);
if (queryEl) queryEl.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  if (searchBtn && typeof searchBtn.click === 'function') {
    searchBtn.click();
    return;
  }
  doSearch();
});
  if (normalizeEl) normalizeEl.addEventListener('change', () => { if (entries.length) rebuildIndexes(); if (queryEl && queryEl.value.trim()) doSearch(); });
if (splitHyphenatedEl) splitHyphenatedEl.addEventListener('change', () => { if (entries.length) rebuildIndexes(); if (queryEl && queryEl.value.trim()) doSearch(); });

renderLoadInfo();
if (diagEl) diagEl.textContent = 'La base remota se cargará cuando hagas la primera consulta.';

if (typeof window !== 'undefined') {
  window.ensureRemoteAlefatoLoaded = ensureRemoteAlefatoLoaded;
}
