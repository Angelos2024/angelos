function normalizeSpanishSpaces(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}


// NUEVO: Detecta si una preposición B, K, L esconde el artículo definido (síncopa)
function hasHiddenArticle(queryRaw, prefixLetter) {
  if (!queryRaw || !['ב','כ','ל'].includes(prefixLetter)) return false;

  // En Unicode Hebreo:
  // ַ = Pathach (vocal 'a' corta)
  // ָ = Qamets (vocal 'a' larga)
  // Buscamos la letra prefijo, seguida opcionalmente por un Dagesh u otras marcas, y luego la vocal.
  // Modificado: Ahora detecta también el Segol (\u05B6) para letras guturales
  const regex = new RegExp(prefixLetter + '[\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C7]*([\u05B7\u05B8\u05B6])');
  const match = String(queryRaw).match(regex);

  // Si la preposición tiene Pathach o Qamets, el artículo está "escondido" ahí
  return match !== null;
}

// NUEVO: Validador fonético masorético para la preposición Min (מ)
function validateMinPreposition(queryRaw) {
  if (!queryRaw) return { ok: false };
  const cleanQ = String(queryRaw).replace(/[‎‏‪-‮⁦-⁩‌‍﻿\s]/g, "");
  if (!cleanQ.startsWith('מ')) return { ok: false };

  // 1. Alargamiento Compensatorio: Mem + Tsere ante gutural (א, ה, ח, ע) o Resh (ר)
  if (/^מ[֑-ֽֿׁ-ׇ]*ֵ[֑-ֽֿׁ-ׇ]*[אהחער]/.test(cleanQ)) {
    return { ok: true, rule: 'ALARGAMIENTO_COMPENSATORIO' };
  }

  // 2. Asimilación Fuerte: Mem + Hireq ante consonante con Dagesh Forte
  if (/^מ[֑-ֽֿׁ-ׇ]*ִ[֑-ֽֿׁ-ׇ]*[א-ת][֑-ֽֿׁ-ׇ]*ּ/.test(cleanQ)) {
    return { ok: true, rule: 'ASIMILACION_FUERTE' };
  }

  // 3. Duplicación Virtual: Mem + Hireq ante Het (ח) o He (ה) sin dagesh
  if (/^מ[֑-ֽֿׁ-ׇ]*ִ[֑-ֽֿׁ-ׇ]*[חה]/.test(cleanQ)) {
    return { ok: true, rule: 'DUPLICACION_VIRTUAL' };
  }

  return { ok: false };
}

// NUEVO: Validador fonético para la Conjunción Vav (ו)
function validateVavConjunction(queryRaw) {
  if (!queryRaw) return { ok: false };
  const cleanQ = String(queryRaw).replace(/[‎‏‪-‮⁦-⁩‌‍﻿\s]/g, "");
  if (!cleanQ.startsWith('ו')) return { ok: false };

  // 1. Shurek (וּ): Ante labiales (ב, מ, פ) o ante consonante con Sheva
  if (/^ו[֑-ֻֽֿׁ-ׇ]*ּ/.test(cleanQ)) {
    return { ok: true, rule: 'SHUREK_ANTE_LABIAL_O_SHEVA' };
  }

  // 2. Default: Vav con Sheva (וְ)
  if (/^ו[֑-ֽֿׁ-ׇ]*ְ/.test(cleanQ)) {
    return { ok: true, rule: 'VAV_DEFAULT_SHEVA' };
  }

  // 3. Chatef/Tónica: Vav con vocal corta (Pathach, Segol, Qamets)
  if (/^ו[֑-ֽֿׁ-ׇ]*[ֶַָ]/.test(cleanQ)) {
    return { ok: true, rule: 'VAV_ANTE_CHATEF_O_TONICA' };
  }

  return { ok: false };
}

function stripSpanishLeadingArticle(es) {
  return String(es || '').replace(/^(el|la|los|las|un|una|unos|unas)\s+/i, '').trim();
}

function spanishHasPossessive(es, poss) {
  const t = normalizeSpanishSpaces(es).toLowerCase();
  const p = String(poss || '').toLowerCase();
  return !!(t && p && t.includes(p));
}

function compactHebrewWithMarks(s) {
  return nfc(String(s || '').replace(/[\s־\-‐‑‒–—]+/g, ''));
}

function compactHebrewNoMarks(s) {
  return normalizeText(stripHebrewMarksAnywhere(compactHebrewWithMarks(s)));
}

function hebNoMarksHasArticleHe(ch) {
  return ch === 'ה';
}

function renderPrefixGloss(prefixLetters, opts = {}) {
  const letters = Array.isArray(prefixLetters) ? prefixLetters.slice() : [];
  const suppressArticle = !!opts.suppressArticle;
  const queryRaw = opts.queryRaw || ''; // Texto con vocales (si existe)
  if (!letters.length) return '';

  const out = [];
  let i = 0;

  // Conjunción ו inicial
  if (letters[i] === 'ו') {
    out.push('y');
    i++;
  }

  while (i < letters.length) {
    const cur = letters[i];
    const next = letters[i+1];

    // 1) Caso explícito: Preposición + He visible
    if ((cur === 'ב' || cur === 'כ' || cur === 'ל' || cur === 'מ' || cur === 'ש') && next === 'ה') {
      if (cur === 'ב') out.push(suppressArticle ? 'en' : 'en el/la');
      else if (cur === 'ל') out.push(suppressArticle ? 'a/para' : 'al/la');
      else if (cur === 'כ') out.push(suppressArticle ? 'como' : 'como el/la');
      else if (cur === 'מ') out.push(suppressArticle ? 'de/desde' : 'del/de la');
      else if (cur === 'ש') out.push(suppressArticle ? 'que' : 'que el/la');
      i += 2;
      continue;
    }

    // 2) Detección de síncopa: artículo oculto por vocalización (ב/כ/ל + pataj/qamets)
    const isHiddenArticle = hasHiddenArticle(queryRaw, cur);

    if (cur === 'ב') out.push((isHiddenArticle && !suppressArticle) ? 'en el/la' : 'en');
    else if (cur === 'כ') out.push((isHiddenArticle && !suppressArticle) ? 'como el/la' : 'como');
    else if (cur === 'ל') out.push((isHiddenArticle && !suppressArticle) ? 'al/la' : 'a/para');
    else if (cur === 'מ') out.push('de/desde');
    else if (cur === 'ש') out.push('que');
    else if (cur === 'ה') { if (!suppressArticle) out.push('el/la'); }
    else if (cur === 'ו') out.push('y');
    i++;
  }

  return normalizeSpanishSpaces(out.join(' '));
}

function tryMatchCoreToLemma(core, lemmaNo) {
  core = String(core || '');
  lemmaNo = String(lemmaNo || '');
  if (!core || !lemmaNo) return null;
  if (core === lemmaNo) return { kind:'exact', score: 100 };
  if ((core + 'ה') === lemmaNo) return { kind:'restore-he', score: 108 };
  if ((core + 'ת') === lemmaNo) return { kind:'restore-tav', score: 96 };
  if (lemmaNo.endsWith('ה') && core === lemmaNo.slice(0,-1)) return { kind:'core-minus-he', score: 106 };
  if (lemmaNo.endsWith('ת') && core === lemmaNo.slice(0,-1)) return { kind:'core-minus-tav', score: 94 };
  if (lemmaNo.endsWith('ים') && core === lemmaNo.slice(0,-2)) return { kind:'core-minus-im', score: 90 };
  if (lemmaNo.endsWith('ות') && core === lemmaNo.slice(0,-2)) return { kind:'core-minus-ot', score: 90 };
  return null;
}

function parseCandidatePrefixes(prefixStr) {
  const s = String(prefixStr || '');
  if (!s) return { letters: [], ok: true };
  const letters = [...s];
  // Conservador: solo letras inseparables frecuentes
  if (letters.some(ch => !'ובכלמשה'.includes(ch))) return { letters: [], ok: false };
  return { letters, ok: true };
}

function analyzeAffixCompositionForEntry(entry, queryRaw) {
  const qNo = compactHebrewNoMarks(queryRaw);
  const lNo = compactHebrewNoMarks(entry?.he || '');
  if (!qNo || !lNo) return null;

  // Análisis exacto especial (formas lexicalizadas que requieren partícula en ES)
  if (qNo === lNo) {
    return { qNo, lNo, prefixes: [], suffix: null, coreMatch:{kind:'exact', score:100}, exact:true };
  }

  let best = null;
  const maxPrefix = Math.min(4, Math.max(0, qNo.length - 1));

  // intentar primero sin sufijo
  const suffixCandidates = [null, ...ES_PRON_SUFFIX_RULES];

  for (const sfx of suffixCandidates) {
    const suf = sfx ? sfx.suf : '';
    if (suf && !qNo.endsWith(suf)) continue;
    const qMinusSuffix = suf ? qNo.slice(0, -suf.length) : qNo;

    for (let pLen = 0; pLen <= maxPrefix; pLen++) {
      if (qMinusSuffix.length - pLen < 2) continue;
      const prefixStr = qMinusSuffix.slice(0, pLen);
      const core = qMinusSuffix.slice(pLen);
      const pref = parseCandidatePrefixes(prefixStr);
      if (!pref.ok) continue;

      const coreMatch = tryMatchCoreToLemma(core, lNo);
      if (!coreMatch) continue;

      let score = coreMatch.score;
      score += pref.letters.length * 2;
      if (sfx) score += (sfx.low ? 1 : 4);

      // ==== INICIO DE INTELIGENCIA EXEGÉTICA ====
      if (hasHebrewMarks(queryRaw)) {
        // Evaluar Min (מ)
        if (pref.letters.includes('מ')) {
           const minPhonetics = validateMinPreposition(queryRaw);
           if (minPhonetics.ok) {
             score += 15; // Gran bonus: Cumple reglas masoréticas
           } else {
             score -= 20; // Penalidad: Es una 'מ' de la raíz, no una preposición
           }
        }

        // Evaluar Conjunción Vav (ו)
        if (pref.letters.includes('ו')) {
           const vavPhonetics = validateVavConjunction(queryRaw);
           if (vavPhonetics.ok) {
             score += 12; // Bonus: Vocalización legítima para conjunción
           } else {
             score -= 15; // Penalidad: Vocalización inválida para conjunción
           }
        }
      } else {
         // Sin vocales: leve penalidad por ambigüedad natural
         if (pref.letters.includes('ו')) score -= 1;
      }
      // ==== FIN DE INTELIGENCIA EXEGÉTICA ====

      const cand = { qNo, lNo, prefixes: pref.letters, suffix: sfx || null, core, coreMatch, exact:false, score };
      if (!best || cand.score > best.score) best = cand;
    }
  }
  return best;
}

function applySuffixPossessiveToSpanish(baseEs, suffixRule) {
  const es0 = normalizeSpanishSpaces(baseEs || '');
  if (!suffixRule || !es0) return es0;

  // Muy conservador: aplicar automático solo a posesivos y no a objetos directos verbales
  if (suffixRule.kind === 'obj' || suffixRule.kind === 'obj_or_poss') return es0;

  if (spanishHasPossessive(es0, suffixRule.poss)) return es0;

  if (suffixRule.kind === 'pre') {
    const naked = stripSpanishLeadingArticle(es0) || es0;
    return normalizeSpanishSpaces(`${suffixRule.poss} ${naked}`);
  }
  if (suffixRule.kind === 'post') {
    return normalizeSpanishSpaces(`${es0} ${suffixRule.poss}`);
  }
  return es0;
}

function applySpecialSpanishEnhancers(qNo, lNo, es) {
  const fn = ES_SPECIAL_FORM_ENHANCERS.get(qNo) || ES_SPECIAL_FORM_ENHANCERS.get(lNo);
  if (!fn) return normalizeSpanishSpaces(es);
  try { return normalizeSpanishSpaces(fn(es)); } catch { return normalizeSpanishSpaces(es); }
}

function composeSpanishGlossForDisplay(entry, queryRaw) {
  const baseEs = normalizeSpanishSpaces(entry?.es || '');
  if (!baseEs) return '—';

  const queryPart = String(queryRaw || '').trim();
  if (!queryPart || !RE_HEB.test(queryPart)) return baseEs;

  const analysis = analyzeAffixCompositionForEntry(entry, queryPart);
  const qNo = compactHebrewNoMarks(queryPart);
  const lNo = compactHebrewNoMarks(entry?.he || '');

  // 1) base + mejoras especiales (ej. בטרם -> antes de)
  let outEs = applySpecialSpanishEnhancers(qNo, lNo, baseEs);

  if (!analysis) return outEs;

  // 2) sufijos pronominales (si son claramente posesivos)
  const suffixRule = analysis.suffix && !analysis.suffix.low ? analysis.suffix : analysis.suffix;
  if (suffixRule) outEs = applySuffixPossessiveToSpanish(outEs, suffixRule);

  // 3) prefijos inseparables
  const suppressArticle = !!(suffixRule && suffixRule.kind === 'pre'); // con posesivo se suprime artículo
  const prefGloss = renderPrefixGloss(analysis.prefixes || [], { suppressArticle, queryRaw: queryPart });
  if (prefGloss) {
    // Evitar duplicar una preposición si ya quedó lexicalizada en el especial (ej. בטרם -> antes de)
    if (!(qNo === 'בטרם' && /\bantes de\b/i.test(outEs) && (analysis.prefixes || []).includes('ב'))) {
      outEs = normalizeSpanishSpaces(`${prefGloss} ${outEs}`);
    }
  }

  return outEs || baseEs;
}

function buildDisplayResults(items, rawQuery) {
  const out = [];
  const seen = new Set();
  for (const e of (items || [])) {
    if (!e) continue;
    const qPart = e._queryPart || rawQuery || '';
    const esDisplay = composeSpanishGlossForDisplay(e, qPart);
    const row = { ...e, es: esDisplay };
    const k = `${row.he || ''}\u0000${row.es || ''}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(row);
  }
  return out;
}

function renderResults(items, rawQuery = '') {
  const displayItems = buildDisplayResults(items, rawQuery);
  if (!displayItems || !displayItems.length) {
    resultsTbodyEl.innerHTML = '<tr><td colspan="2" class="muted">Sin resultados.</td></tr>';
    return;
  }
  resultsTbodyEl.innerHTML = displayItems.map(e => `\n<tr><td class="he">${escapeHtml(e.he)}</td><td class="es">${escapeHtml(e.es || '—')}</td></tr>`).join('');
}

function getEntriesFromIndices(indices) {
  const seen = new Set();
  const out = [];
  for (const idx of indices) {
    if (seen.has(idx)) continue;
    seen.add(idx);
    out.push(entries[idx]);
  }
  out.sort((a,b) => a.he.localeCompare(b.he, 'he') || a.es.localeCompare(b.es, 'es'));
  return out;
}

function extractHebrewQuerySpan(s) {
  const txt = String(s || '');
  const m = txt.match(/[֐-׿][֐-׿\s־\-‐‑‒–—]*/);
  if (!m) return '';
  return nfc(String(m[0]).trim());
}

function buildQueryForms(rawInput) {
  const span = extractHebrewQuerySpan(rawInput) || nfc(String(rawInput || '').trim());
  const aliases = buildHebrewAliases(span);
  const exactKeys = uniqueSortedShort([...aliases].map(x => nfc(x)).filter(Boolean), 500);
  const normKeys = uniqueSortedShort([...aliases].map(x => normalizeText(x)).filter(Boolean), 500);
  const noVKeys = uniqueSortedShort([...aliases].map(x => normalizeText(stripHebrewMarksAnywhere(x))).filter(Boolean), 500);
  const tokens = tokenizeHebrew(span);
  return { span, tokens, exactKeys, normKeys, noVKeys };
}

function uniqueSortedShort(arr, limit=120) {
  const seen = new Set();
  const out = [];
  for (const x of arr) {
    const k = String(x || '');
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
    if (out.length >= limit) break;
  }
  out.sort((a,b)=>a.length-b.length || a.localeCompare(b,'he'));
  return out;
}

function collectByIndexKey(map, keys) {
  const idxs = [];
  for (const key of keys) {
    const arr = map.get(key);
    if (!arr) continue;
    for (const idx of arr) idxs.push(idx);
  }
  return idxs;
}

function hebLettersOnly(s) {
  return String(stripHebrewMarksAnywhere(String(s || ''))).replace(/[^א-ת]/g, '');
}

function hasHebrewMarks(s) {
  return /[\u0591-\u05C7]/.test(String(s || ''));
}

function preferMarkedEntriesIfQueryHasMarks(items, queryHasMarks) {
  const arr = Array.isArray(items) ? items : [];
  if (!queryHasMarks || !arr.length) return arr;
  const marked = arr.filter(e => hasHebrewMarks(e?.he));
  return marked.length ? marked : arr;
}

const STRICT_PREFIX_LETTERS = new Set(['ו','ב','כ','ל','ה','ש','א','י','ת','נ']);
const STRICT_SUFFIXES = [
  'יהם','יהן','יכם','יכן','ינו','תם','תן','תי','יה','יו','יך','יכ','כם','כן','הם','הן',
  'נו','מו','הו','ני','נה','ים','ות','ם','ן','ו','י','ך','ה','ת'
];

function addScoredMorphCandidate(scoreMap, cand, score) {
  const raw = hebLettersOnly(cand);
  if (!raw || raw.length < 1) return;
  const norm = normalizeText(raw);
  const prev = scoreMap.get(norm);
  if (prev == null || score > prev) scoreMap.set(norm, score);
}

function addStrictSuffixHeuristics(seedNo, scoreMap, prefixPenalty = 0) {
  for (const suf of STRICT_SUFFIXES) {
    if (!(seedNo.length > suf.length) || !seedNo.endsWith(suf)) continue;
    const stem = seedNo.slice(0, -suf.length);
    if (!stem) continue;

    // Base tras quitar sufijo (moderada confianza)
    addScoredMorphCandidate(scoreMap, stem, 78 - prefixPenalty);

    // Restauración de ה cuando el stem termina en ת (caso muy frecuente: משפחתי -> משפחה)
    if (stem.length >= 2 && stem.endsWith('ת')) {
      addScoredMorphCandidate(scoreMap, stem.slice(0, -1) + 'ה', 99 - prefixPenalty);
    }

    // Constructo / posesivo nominal: stem + ה (ej. משפחי -> משפחה)
    if (stem.length >= 3 && ['י','יך','יכ','יו','יה','יהם','יהן','יכם','יכן','כם','כן','הם','הן','ני','נו','תם','תן','תי'].includes(suf)) {
      addScoredMorphCandidate(scoreMap, stem + 'ה', 92 - prefixPenalty);
    }

    // Plurales nominales más comunes
    if (suf === 'ים' && stem.length >= 2) {
      addScoredMorphCandidate(scoreMap, stem, 90 - prefixPenalty);
    }
    if (suf === 'ות' && stem.length >= 2) {
      addScoredMorphCandidate(scoreMap, stem, 88 - prefixPenalty);
      addScoredMorphCandidate(scoreMap, stem + 'ה', 89 - prefixPenalty);
    }
  }
}

function buildStrictMorphScoreMap(rawSpan, q) {
  const scoreMap = new Map();
  const seedSet = new Set();

  for (const t of (q?.tokens || [])) {
    const h = hebLettersOnly(t);
    if (h) seedSet.add(h);
  }
  const compactSeed = hebLettersOnly(String(rawSpan || '').replace(/[\s־\-‐‑‒–—]+/g, ''));
  if (compactSeed) seedSet.add(compactSeed);
  for (const alias of (q?.exactKeys || [])) {
    if (/[\s־\-‐‑‒–—]/.test(alias)) continue;
    const h = hebLettersOnly(alias);
    if (h) seedSet.add(h);
  }

  const processed = new Set();
  function processSeed(seedNo, opts = {}) {
    const s = hebLettersOnly(seedNo);
    if (!s || processed.has(`${s}|${opts.prefixPenalty||0}`)) return;
    processed.add(`${s}|${opts.prefixPenalty||0}`);

    const prefixPenalty = Number(opts.prefixPenalty || 0);

    // Conservar forma tal cual (si ya está en índice, F1/F2 la habrían capturado, pero la dejamos por trazabilidad)
    addScoredMorphCandidate(scoreMap, s, 60 - prefixPenalty);

    // Heurísticas directas de sufijos (más precisas)
    addStrictSuffixHeuristics(s, scoreMap, prefixPenalty);

    // Reglas del comparador (sin recursión amplia a raíces vecinas)
    for (const cand of expandMorphologyCandidates(s)) {
      const c = hebLettersOnly(cand);
      if (!c) continue;
      let score = 74 - prefixPenalty;

      // Bonus si preserva la consonante inicial (evita vecinas tipo שפח cuando la consulta es משפחתי)
      if (c[0] === s[0]) score += 8;

      // Bonus si es claramente una reducción por sufijo del mismo inicio
      if (s.startsWith(c) && s.length > c.length) score += 6;

      // Caso fuerte: terminación -תי con restauración a ה
      if (s.endsWith('תי') && c === s.slice(0, -2) + 'ה') score = 100 - prefixPenalty;
      else if (s.endsWith('תי') && c === s.slice(0, -2)) score = 86 - prefixPenalty;

      addScoredMorphCandidate(scoreMap, c, score);
    }
  }

  for (const s of seedSet) {
    processSeed(s, { prefixPenalty: 0 });

    // Prefijos desprendibles comunes (NO incluye מ para evitar ruido en sustantivos tipo משפחה)
    if (s.length >= 3 && STRICT_PREFIX_LETTERS.has(s[0])) {
      processSeed(s.slice(1), { prefixPenalty: 14 });

      // Doble prefijo común (ej. ו + י/ת/ל/ב/כ/ה/ש)
      if (s.length >= 4 && STRICT_PREFIX_LETTERS.has(s[1])) {
        processSeed(s.slice(2), { prefixPenalty: 24 });
      }
    }
  }

  return scoreMap;
}

function collectTopMorphMatches(scoreMap, qNorm, qNoVowels) {
  const matched = [];
  for (const [normKey, score] of scoreMap.entries()) {
    if (!normKey) continue;
    const idxs = indexNorm.get(normKey);
    if (!idxs || !idxs.length) continue;
    matched.push({ normKey, score, idxs });
  }
  if (!matched.length) return { matches: [], debug: [] };

  matched.sort((a,b) => b.score - a.score || b.normKey.length - a.normKey.length || a.normKey.localeCompare(b.normKey, 'he'));
  const topScore = matched[0].score;

  // Política de precisión: solo la banda superior. Si hay empate real, se conservan empatados.
  const keep = matched.filter(m => m.score === topScore);
  const idxSet = new Set();
  for (const m of keep) for (const idx of m.idxs) idxSet.add(idx);

  let candidates = getEntriesFromIndices([...idxSet]);

  // Desempate adicional: preferir los que preservan mejor la estructura inicial/longitud de la consulta
  // (ej. משפחה sobre משפח si ambos quedaran empatados por alguna regla futura)
  if (candidates.length > 1) {
    const qNo = hebLettersOnly(qNoVowels || '');
    const scoredEntries = candidates.map(e => {
      const heNo = hebLettersOnly(e.he);
      let s = 0;
      if (qNo && heNo && qNo[0] === heNo[0]) s += 3;
      if (qNo && heNo && qNo.startsWith(heNo)) s += 2;
      if (qNo && heNo && heNo.endsWith('ה')) s += 1; // favorece lemas nominales restaurados
      s += heNo.length * 0.01;
      return { e, s };
    });
    scoredEntries.sort((a,b) => b.s - a.s);
    const best = scoredEntries[0].s;
    candidates = scoredEntries.filter(x => x.s === best).map(x => x.e);
  }

  return {
    matches: candidates,
    debug: matched.slice(0, 20).map(m => `${m.normKey}:${m.score}`)
  };
}

