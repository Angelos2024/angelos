/* hebrew-lexicon-ui.js
   Tooltip de diccionario para hebreo, con correspondencias RKANT usando LXX como puente.
*/
(() => {
  'use strict';

 const HEBREW_DICT_PATH = './diccionario/diccionario_unificado.min.json';
  const TRILINGUE_BASE = './dic/trilingue/';
  const TRILINGUE_BOOK_FILES = [
    '01genesis.json','02Éxodo.json','03Levítico.json','04Números.json','05Deuteronomio.json','06Josué.json','07Jueces.json','08Rut.json','09Samuel1.json','10Samuel2.json',
    '11Reyes1.json','12Reyes2.json','13Crónicas1.json','14Crónicas2.json','15Esdras.json','16Nehemías.json','17Ester.json','18Job.json','19Salmos.json','20Proverbios.json',
    '21Eclesiastes.json','22Cantares.json','23Isaías.json','24Jeremías.json','25Lamentaciones.json','26Ezequiel.json','27Daniel.json','28Oseas.json','29Joel.json','30Amós.json',
    '31Abdías.json','32Jonás.json','33Miqueas.json','34Nahúm.json','35Habacuc.json','36Sofonías.json','37Hageo.json','38zacarias.json','39malaquias.json'
  ];
  const HEBREW_INDEX_PATH = './search/index-he.json';
    const HEBREW_ROOTS_PATH = './dic/hebrew_roots.json';
  const GREEK_INDEX_PATH = './search/index-gr.json';
  const TEXT_BASE = './search/texts';
  const LXX_FILES = [
    'lxx_rahlfs_1935_1Chr.json',
    'lxx_rahlfs_1935_1Esdr.json',
    'lxx_rahlfs_1935_1Kgs.json',
    'lxx_rahlfs_1935_1Macc.json',
    'lxx_rahlfs_1935_1Sam.json',
    'lxx_rahlfs_1935_2Chr.json',
    'lxx_rahlfs_1935_2Esdr.json',
    'lxx_rahlfs_1935_2Kgs.json',
    'lxx_rahlfs_1935_2Macc.json',
    'lxx_rahlfs_1935_2Sam.json',
    'lxx_rahlfs_1935_3Macc.json',
    'lxx_rahlfs_1935_4Macc.json',
    'lxx_rahlfs_1935_Amos.json',
    'lxx_rahlfs_1935_Bar.json',
    'lxx_rahlfs_1935_BelOG.json',
    'lxx_rahlfs_1935_BelTh.json',
    'lxx_rahlfs_1935_DanOG.json',
    'lxx_rahlfs_1935_DanTh.json',
    'lxx_rahlfs_1935_Deut.json',
    'lxx_rahlfs_1935_Eccl.json',
    'lxx_rahlfs_1935_EpJer.json',
    'lxx_rahlfs_1935_Esth.json',
    'lxx_rahlfs_1935_Exod.json',
    'lxx_rahlfs_1935_Ezek.json',
    'lxx_rahlfs_1935_Gen.json',
    'lxx_rahlfs_1935_Hab.json',
    'lxx_rahlfs_1935_Hag.json',
    'lxx_rahlfs_1935_Hos.json',
    'lxx_rahlfs_1935_Isa.json',
    'lxx_rahlfs_1935_Jdt.json',
    'lxx_rahlfs_1935_Jer.json',
    'lxx_rahlfs_1935_Job.json',
    'lxx_rahlfs_1935_Joel.json',
    'lxx_rahlfs_1935_Jonah.json',
    'lxx_rahlfs_1935_JoshA.json',
    'lxx_rahlfs_1935_JoshB.json',
    'lxx_rahlfs_1935_JudgA.json',
    'lxx_rahlfs_1935_JudgB.json',
    'lxx_rahlfs_1935_Lam.json',
    'lxx_rahlfs_1935_Lev.json',
    'lxx_rahlfs_1935_Mal.json',
    'lxx_rahlfs_1935_Mic.json',
    'lxx_rahlfs_1935_Nah.json',
    'lxx_rahlfs_1935_Num.json',
    'lxx_rahlfs_1935_Obad.json',
    'lxx_rahlfs_1935_Odes.json',
    'lxx_rahlfs_1935_Prov.json',
    'lxx_rahlfs_1935_Ps.json',
    'lxx_rahlfs_1935_PsSol.json',
    'lxx_rahlfs_1935_Ruth.json',
    'lxx_rahlfs_1935_Sir.json',
    'lxx_rahlfs_1935_Song.json',
    'lxx_rahlfs_1935_SusOG.json',
    'lxx_rahlfs_1935_SusTh.json',
    'lxx_rahlfs_1935_TobBA.json',
    'lxx_rahlfs_1935_TobS.json',
    'lxx_rahlfs_1935_Wis.json',
    'lxx_rahlfs_1935_Zech.json',
    'lxx_rahlfs_1935_Zeph.json',
  ];
  const LXX_TO_HEBREW_SLUG = {
    Gen: 'genesis',
    Exod: 'exodo',
    Lev: 'levitico',
    Num: 'numeros',
    Deut: 'deuteronomio',
    JoshA: 'josue',
    JoshB: 'josue',
    JudgA: 'jueces',
    JudgB: 'jueces',
    Ruth: 'rut',
    '1Sam': '1_samuel',
    '2Sam': '2_samuel',
    '1Kgs': '1_reyes',
    '2Kgs': '2_reyes',
    '1Chr': '1_cronicas',
    '2Chr': '2_cronicas',
    '1Esdr': 'esdras',
    '2Esdr': 'nehemias',
    Esth: 'ester',
    Job: 'job',
    Ps: 'salmos',
    Prov: 'proverbios',
    Eccl: 'eclesiastes',
    Song: 'cantares',
    Isa: 'isaias',
    Jer: 'jeremias',
    Lam: 'lamentaciones',
    Ezek: 'ezequiel',
    DanOG: 'daniel',
    DanTh: 'daniel',
    Hos: 'oseas',
    Joel: 'joel',
    Amos: 'amos',
    Obad: 'abdias',
    Jonah: 'jonas',
    Mic: 'miqueas',
    Nah: 'nahum',
    Hab: 'habacuc',
    Zeph: 'sofonias',
    Hag: 'hageo',
    Zech: 'zacarias',
    Mal: 'malaquias'
  };
  const HEBREW_SLUG_TO_LXX = Object.entries(LXX_TO_HEBREW_SLUG).reduce((acc, [lxx, slug]) => {
    if (!acc[slug]) acc[slug] = [];
    acc[slug].push(lxx);
    return acc;
  }, {});
 const greekStopwords = new Set([
    'και', 'δε', 'ο', 'η', 'το', 'του', 'της', 'των', 'τω', 'τον', 'την',
    'εις', 'εν', 'αυτος', 'αυτη', 'αυτο', 'ου', 'μη', 'γαρ',
    'ως', 'επι', 'προς', 'δια', 'μετα', 'κατα', 'εκ', 'υπο'
  ]);
  const state = {
    dictMap: new Map(),
    dictPointedMap: new Map(),
   dictByStrong: new Map(),
    dictLoaded: false,
    indexes: {},
    textCache: new Map(),
    lxxFileCache: new Map(),
    lxxBookCache: new Map(),
    lxxVerseCache: new Map(),
    lxxBookStatsCache: new Map(),
    popupEl: null,
     popupDrag: null,
popupRequestId: 0,
    popupExpanded: false,
trilingueFallback: null,
    rootsLoaded: false,
    rootsByStrong: new Map(),
    rootsByLexeme: new Map()
          };
 const HEBREW_PREFIX_LETTERS = new Set(['ו', 'ה', 'ב', 'ל', 'כ', 'מ', 'ש']);
  const jsonCache = new Map();
  function normalizeHebrew(text) {
    return String(text || '')
      .replace(/[\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C7]/g, '')
      .replace(/[\s\u05BE]/g, '')
      .replace(/[׃,:;.!?()"“”]/g, '');
    }
  function splitHebrewCompoundTokens(text) {
    return uniqueList(
      String(text || '')
        .split(/[\u05BE\-]/g)
        .map((part) => normalizeHebrew(part))
        .filter(Boolean)
    ); 
  }
   function stripHebrewCantillation(text) {
    return String(text || '').replace(/[\u0591-\u05AF]/g, '');
  }

function normalizeHebrewPointed(text) {
 return stripHebrewCantillation(text)
    .replace(/[\s\u05BE]/g, '')
      .replace(/[׃,:;.!?()"“”]/g, '');
   }
    function normalizeHebrewSkeleton(text) {
    return normalizeHebrew(text).replace(/[וי]/g, '');
  }
function hasHebrewNikkud(text) {
    return /[\u0591-\u05C7]/.test(String(text || ''));
  }
  function levenshteinDistance(a, b) {
    const left = String(a || '');
    const right = String(b || '');
    if (!left) return right.length;
    if (!right) return left.length;
    const prev = new Array(right.length + 1).fill(0);
    const curr = new Array(right.length + 1).fill(0);
    for (let j = 0; j <= right.length; j++) prev[j] = j;
    for (let i = 1; i <= left.length; i++) {
      curr[0] = i;
      for (let j = 1; j <= right.length; j++) {
        const cost = left[i - 1] === right[j - 1] ? 0 : 1;
        curr[j] = Math.min(
          prev[j] + 1,
          curr[j - 1] + 1,
          prev[j - 1] + cost
        );
      }
      for (let j = 0; j <= right.length; j++) prev[j] = curr[j];
    }
    return prev[right.length];
  }
   
  function normalizeGreek(text) {
    return String(text || '')
      .replace(/[··.,;:!?“”"(){}\[\]<>«»]/g, '')
      .replace(/\s/g, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }
function toArray(value) {
    if (Array.isArray(value)) return value;
    if (value == null || value === '') return [];
    return [value];
  }

  function uniqueList(values) {
    return [...new Set(toArray(values).map((item) => String(item || '').trim()).filter(Boolean))];
      }
      function normalizeSimpleText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }
  function pickTrilingueGloss(row) {
    const direct = normalizeSimpleText(row?.equivalencia_español);
    if (direct) return direct.split('/')[0].trim();
    const candidates = Array.isArray(row?.candidatos) ? row.candidatos : [];
    const firstCandidate = candidates.find((item) => normalizeSimpleText(item));
    return normalizeSimpleText(firstCandidate);
  }
  function buildTrilingueFallback(rowsByBook) {
    const pointedMap = new Map();
    const unpointedMap = new Map();
    const greekHintMap = new Map();

    for (const rows of rowsByBook) {
      for (const row of rows || []) {
        const hebrew = normalizeSimpleText(row?.texto_hebreo);
        if (!hebrew) continue;
        const pointedKey = normalizeHebrewPointed(hebrew);
        const plainKey = normalizeHebrew(hebrew);
        const gloss = pickTrilingueGloss(row);
        const greekHint = normalizeSimpleText(row?.equivalencia_griega);

        if (pointedKey && gloss && !pointedMap.has(pointedKey)) pointedMap.set(pointedKey, gloss);
        if (plainKey && gloss && !unpointedMap.has(plainKey)) unpointedMap.set(plainKey, gloss);
        if (pointedKey && greekHint && !greekHintMap.has(pointedKey)) greekHintMap.set(pointedKey, greekHint);
        if (plainKey && greekHint && !greekHintMap.has(plainKey)) greekHintMap.set(plainKey, greekHint);
      }
    }

    return { pointedMap, unpointedMap, greekHintMap };
  }
  async function loadTrilingueFallback() {
    if (state.trilingueFallback) return state.trilingueFallback;
    const rowsByBook = await Promise.all(
      TRILINGUE_BOOK_FILES.map((file) => loadJson(`${TRILINGUE_BASE}${file}`).catch(() => []))
    );
    state.trilingueFallback = buildTrilingueFallback(rowsByBook);
    return state.trilingueFallback;
  }
  function resolveTrilingueFallback(word) {
    const fallback = state.trilingueFallback;
    if (!fallback || !word) return null;
    const pointedKey = normalizeHebrewPointed(word);
    const plainKey = normalizeHebrew(word);
    const gloss = (pointedKey && fallback.pointedMap.get(pointedKey)) || (plainKey && fallback.unpointedMap.get(plainKey)) || '';
    const greekHint = (pointedKey && fallback.greekHintMap.get(pointedKey)) || (plainKey && fallback.greekHintMap.get(plainKey)) || '';
    if (!gloss && !greekHint) return null;
    return { gloss, greekHint };
  }
  function extractHebrewFromStrongHeader(header) {
    const text = String(header || '');
    if (!text) return '';
    const match = text.match(/[\u05D0-\u05EA\u0591-\u05C7]+/g);
    if (!match?.length) return '';
    return match[0] || '';
  }
   function buildHebrewEntryTokens(entry) {
    return uniqueList([
      entry?.palabra,
      entry?.lemma,
      entry?.hebreo,
      entry?.forma,
      entry?.strong_detail?.lemma,
      extractHebrewFromStrongHeader(entry?.strong_detail?.header),
      ...(entry?.forms || []),
      ...(entry?.formas || []),
      ...(entry?.hebreos || [])
    ]);
  }

  function getHebrewLemma(entry) {
    return entry?.lemma || entry?.strong_detail?.lemma || entry?.hebreo || entry?.palabra || '—';
  }


 function getDisplayedHebrewLemma(entry, clickedWord = '') {
    const lemma = getHebrewLemma(entry);
    const clicked = stripHebrewCantillation(clickedWord) || clickedWord;
    const clickedPointed = normalizeHebrewPointed(clickedWord);
    const clickedUnpointed = normalizeHebrew(clicked);
    if (!clickedPointed && !clickedUnpointed) return lemma;

    const lemmaPointed = normalizeHebrewPointed(lemma);
    const lemmaUnpointed = normalizeHebrew(lemma);
    const forms = getHebrewForms(entry);
    const hasExactClickedForm = forms.some((form) => {
      return normalizeHebrewPointed(form) === clickedPointed || normalizeHebrew(form) === clickedUnpointed;
    });

    if (
      hasExactClickedForm &&
      (clickedPointed !== lemmaPointed || clickedUnpointed !== lemmaUnpointed) &&
      clickedUnpointed.length > lemmaUnpointed.length
    ) {
      return clicked;
    }

    return lemma;
  }

  function getHebrewTranslit(entry) {
    return entry?.translit || entry?.transliteracion || entry?.strong_detail?.transliteracion || '—';
  }
function cleanPrintedEntry(value) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (!text) return '';
    if (/\bstrong\b/i.test(text)) return '';
    if (/\b(?:hebreo|hebrew)\s*#?\d+/i.test(text)) return '';
    return text;
  }
 function getHebrewPrintedEntry(entry) {
  const candidates = [
      entry?.printed_entry,
      entry?.entrada_impresa,
      entry?.entrada,
      entry?.composicion,
      entry?.composición,
      entry?.morfologia_impresa,
      entry?.morfología_impresa,
      entry?.morfologia,
      entry?.morfología
    ];
    for (const candidate of candidates) {
      const cleaned = cleanPrintedEntry(candidate);
      if (cleaned) return cleaned;
    }
    return '';
  }

  function getHebrewDefinition(entry) {
    return entry?.definitions?.short || entry?.strong_detail?.definicion || entry?.descripcion || '—';
  }
function getDisplayedHebrewDefinition(entry, clickedWord = '') {
    const fullDefinition = getHebrewDefinition(entry);
    const clickedContext = resolveClickedFormContext(entry, clickedWord);
    const formGloss = String(clickedContext?.gloss || '').trim();
    if (!formGloss) return fullDefinition;

    if (!fullDefinition || fullDefinition === '—') {
      return `Glosa de forma: ${formGloss}`;
    }

    const normalizedFull = fullDefinition.toLowerCase();
    const normalizedGloss = formGloss.toLowerCase();
    if (normalizedFull.includes(normalizedGloss)) {
      return fullDefinition;
    }

    return `${fullDefinition}\n\nGlosa de forma: ${formGloss}`;
  }

  function getHebrewForms(entry) {
    return uniqueList([entry?.forma, ...(entry?.forms || []), ...(entry?.formas || []), ...(entry?.variantes || [])]);
  }

  function getHebrewLxx(entry) {
    return entry?.LXX || entry?.lxx || entry?.lxx_refs || null;
  }
 function getStrongKey(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const normalized = raw.toUpperCase();
if (/^[HG]\d+$/.test(normalized)) return normalized;
    if (/^\d+$/.test(normalized)) return `H${normalized}`;
    return normalized;
  }

  function getHebrewStrong(entry) {
    return getStrongKey(entry?.strong || entry?.strongs || entry?.strong_detail?.strong || '');
  }

  function registerRootCandidate(map, key, item) {
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }

  async function loadHebrewRoots() {
    if (state.rootsLoaded) return state.rootsByStrong;
    const data = await loadJson(HEBREW_ROOTS_PATH);
    (data || []).forEach((item) => {
      const strongKey = String(item?.strong || '').trim().toUpperCase();
      if (strongKey) registerRootCandidate(state.rootsByStrong, strongKey, item);

      uniqueList([item?.lexeme, item?.root_lexeme]).forEach((token) => {
        const plain = normalizeHebrew(token);
        const pointed = normalizeHebrewPointed(token);
        registerRootCandidate(state.rootsByLexeme, plain, item);
        if (pointed && pointed !== plain) registerRootCandidate(state.rootsByLexeme, pointed, item);
      });
    });
    state.rootsLoaded = true;
    return state.rootsByStrong;
  }
  function resolveStrongReferenceLexeme(strongRef) {
    const strongKey = getStrongKey(strongRef);
     if (!/^H\d+$/.test(strongKey)) return '';
    const direct = state.rootsByStrong.get(strongKey) || [];
    const candidate = direct.find((item) => normalizeSimpleText(item?.lexeme)) || direct.find((item) => normalizeSimpleText(item?.root_lexeme));
 const rootLexeme = normalizeSimpleText(candidate?.lexeme || candidate?.root_lexeme || '');
    if (rootLexeme) return rootLexeme;

    const dictEntry = state.dictByStrong.get(strongKey) || null;
    if (!dictEntry) return '';
    return normalizeSimpleText(
      dictEntry?.strong_detail?.lemma
      || dictEntry?.lemma
      || dictEntry?.hebreo
      || dictEntry?.palabra
      || dictEntry?.forma
      || ''
    );
  }

  function replaceStrongReferencesWithLexemes(text) {
    return String(text || '').replace(/\bH(\d+)\b/gi, (match, digits) => {
      const lexeme = resolveStrongReferenceLexeme(`H${digits}`);
      return lexeme || '';
    }).replace(/\s{2,}/g, ' ').replace(/\s+([;:,.])/g, '$1').trim();
  }

  function formatRootDefinitionSegment(item, fieldName) {
    const raw = normalizeSimpleText(item?.[fieldName]);
    if (!raw) return '';
    const replaced = replaceStrongReferencesWithLexemes(raw);
    return replaced || raw;
  }

  function getHebrewRootData(entry) {
    if (!entry) return [];
    const matches = [];
    const seen = new Set();
    const strongKey = getHebrewStrong(entry);
    const addUnique = (item) => {
      if (!item) return;
      const key = `${item?.strong || ''}|${item?.root_lexeme || ''}|${item?.root_first_segment || ''}`;
      if (seen.has(key)) return;
      seen.add(key);
      matches.push(item);
    };

    (state.rootsByStrong.get(strongKey) || []).forEach(addUnique);

    uniqueList([
      entry?.strong_detail?.lemma,
      entry?.lemma,
      entry?.hebreo,
      entry?.palabra,
      entry?.forma
    ]).forEach((token) => {
      const plain = normalizeHebrew(token);
      const pointed = normalizeHebrewPointed(token);
      (state.rootsByLexeme.get(plain) || []).forEach(addUnique);
      if (pointed && pointed !== plain) (state.rootsByLexeme.get(pointed) || []).forEach(addUnique);
    });

    return matches.filter((item) => item?.root_lexeme || item?.root_first_segment);
  }
   function resolveClickedFormContext(entry, clickedWord = '') {
    if (!entry) return null;
    const clickedPointed = normalizeHebrewPointed(clickedWord);
    const clickedUnpointed = normalizeHebrew(clickedWord);
    if (!clickedPointed && !clickedUnpointed) return null;

    const forms = toArray(entry?.formas);
    const morphs = toArray(entry?.morfs);
    const glosses = toArray(entry?.glosas);

    const idx = forms.findIndex((form) => {
      return normalizeHebrewPointed(form) === clickedPointed || normalizeHebrew(form) === clickedUnpointed;
    });
    if (idx < 0) return null;

    const gloss = glosses[idx] || '';
    const morph = morphs[idx] || '';
    return {
      form: forms[idx] || '',
      gloss: String(gloss || '').trim(),
      morph: String(morph || '').trim()
    };
  }
function scoreHebrewEntryForLookup(entry, normalizedWord, pointedWord = '') {
    if (pointedWord) {
      const pointedTokens = buildHebrewEntryTokens(entry).map((token) => normalizeHebrewPointed(token));
      if (pointedTokens.includes(pointedWord)) return 5;
       const pointedCandidates = buildHebrewEntryTokens(entry)
        .filter((token) => hasHebrewNikkud(token))
        .map((token) => normalizeHebrewPointed(token))
        .filter(Boolean);
      if (pointedCandidates.length) {
        const minDistance = pointedCandidates.reduce((best, token) => {
          const distance = levenshteinDistance(pointedWord, token);
          return distance < best ? distance : best;
        }, Number.POSITIVE_INFINITY);
        if (Number.isFinite(minDistance)) {
          if (minDistance <= 1) return 4.5;
          if (minDistance <= 2) return 4;
        }
      }
    }
   const primaryKeys = uniqueList([
      entry?.palabra,
      entry?.lemma,
      entry?.hebreo
    ]).map((token) => normalizeHebrew(token));
    if (primaryKeys.includes(normalizedWord)) return 3;

    const querySkeleton = normalizeHebrewSkeleton(normalizedWord);
    if (querySkeleton) {
      const primarySkeletons = uniqueList([
        entry?.palabra,
        entry?.lemma,
        entry?.hebreo
      ]).map((token) => normalizeHebrewSkeleton(token));
      if (primarySkeletons.includes(querySkeleton)) return 2.5;
    }
    const formKeys = getHebrewForms(entry).map((token) => normalizeHebrew(token));
    if (formKeys.includes(normalizedWord)) return 2;

    const extraKeys = uniqueList([...(entry?.hebreos || [])]).map((token) => normalizeHebrew(token));
    if (extraKeys.includes(normalizedWord)) return 1;

    return 0;
  }
function isLikelyVerbEntry(entry) {
    const morphTags = toArray(entry?.morfs).map((tag) => String(tag || '').toUpperCase());
    return morphTags.some((tag) => tag.includes('VERBO') || tag.startsWith('V.'));
  }
  function pickBestHebrewEntry(entries, normalizedWord, pointedWord = '') {
     if (!Array.isArray(entries) || !entries.length) return null;
    return entries
      .map((entry, idx) => ({
        entry,
        idx,
        score: scoreHebrewEntryForLookup(entry, normalizedWord, pointedWord),
        verbPenalty: isLikelyVerbEntry(entry) ? 1 : 0
      }))
       .sort((a, b) => (b.score - a.score) || (a.verbPenalty - b.verbPenalty) || (a.idx - b.idx))[0]?.entry || null;
  }

  function findHebrewEntry(normalizedWord, pointedWord = '') {
     if (!normalizedWord) return null;

    if (pointedWord) {
      const pointed = pickBestHebrewEntry(state.dictPointedMap.get(pointedWord), normalizedWord, pointedWord);
      if (pointed) {
        return { entry: pointed, lookup: normalizedWord, mode: 'pointed' };
      }
    }

    const direct = pickBestHebrewEntry(state.dictMap.get(normalizedWord), normalizedWord, pointedWord);
     if (direct) {
      return { entry: direct, lookup: normalizedWord, mode: 'direct' };
    }

    // Soporte para palabras compuestas con prefijos inseparables (ej. בראשית = ב + ראשית).
    let trimmed = normalizedWord;
    for (let i = 0; i < 3 && trimmed.length > 1; i++) {
      const first = trimmed[0];
      if (!HEBREW_PREFIX_LETTERS.has(first)) break;
      trimmed = trimmed.slice(1);
 const hit = pickBestHebrewEntry(state.dictMap.get(trimmed), trimmed, pointedWord);
       if (hit) {
        return { entry: hit, lookup: trimmed, mode: 'prefixed' };
      }
    }

    return null;
  }
  function formatHebrewLxx(lxxData) {
    if (!lxxData) return '—';
    if (typeof lxxData === 'string') return lxxData;
    if (Array.isArray(lxxData)) return lxxData.map((item) => {
      if (typeof item === 'string') return item;
      const ref = item?.ref || item?.reference || item?.cita || '';
      const form = item?.forma || item?.form || item?.word || '';
      const lemma = item?.lemma || '';
      return [ref, form, lemma].filter(Boolean).join(' — ');
    }).filter(Boolean).join('\n');
    if (typeof lxxData === 'object') {
      return Object.entries(lxxData)
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
        .join('\n');
    }
    return String(lxxData);
  }
    function isMissingLxxData(value) {
    const normalized = String(value || '').replace(/[\s\u200E\u200F]/g, '');
    return !normalized || normalized === '-' || normalized === '—';
  }

  function formatLxxRef(bookCode, chapter, verse) {
    return `${bookCode} ${chapter}:${verse}`;
  }

  async function buildLxxSamplesFromHebrewRefs(refs, preferredLemma = '', max = 4) {
    if (!refs.length) return [];
    const normalizedPreferred = normalizeGreek(preferredLemma);
    const samples = [];
    const seen = new Set();

    for (const ref of refs.slice(0, 120)) {
      if (samples.length >= max) break;
      const [slug, chapterRaw, verseRaw] = ref.split('|');
      const chapter = Number(chapterRaw);
      const verse = Number(verseRaw);
      const lxxCodes = HEBREW_SLUG_TO_LXX[slug] || [];

      for (const lxxCode of lxxCodes) {
        if (samples.length >= max) break;
        const tokens = await loadLxxVerseTokens(lxxCode, chapter, verse);
        if (!tokens?.length) continue;

        const matches = tokens.filter((token) => {
          const lemmaNorm = normalizeGreek(token?.lemma || token?.w || '');
          if (!lemmaNorm || greekStopwords.has(lemmaNorm)) return false;
          if (!normalizedPreferred) return true;
          return lemmaNorm === normalizedPreferred;
        });
        const candidate = matches[0] || tokens.find((token) => {
          const lemmaNorm = normalizeGreek(token?.lemma || token?.w || '');
          return lemmaNorm && !greekStopwords.has(lemmaNorm);
        });
        if (!candidate) continue;

        const sample = {
          ref: formatLxxRef(lxxCode, chapter, verse),
          word: String(candidate?.w || ''),
          lemma: String(candidate?.lemma || candidate?.w || '')
        };
        const key = `${sample.ref}|${normalizeGreek(sample.lemma)}|${normalizeGreek(sample.word)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        samples.push(sample);
      }
    }

    return samples;
  }
  async function loadJson(url) {
    if (jsonCache.has(url)) return jsonCache.get(url);
    const promise = fetch(url, { cache: 'force-cache' }).then((res) => {
      if (!res.ok) throw new Error(`No se pudo cargar ${url}`);
      return res.json();
        });
    jsonCache.set(url, promise);
    try {
      return await promise;
    } catch (error) {
      jsonCache.delete(url);
      throw error;
    }
  }

  async function loadHebrewDict() {
    if (state.dictLoaded) return state.dictMap;
    const data = await loadJson(HEBREW_DICT_PATH);
    (data || []).forEach((item) => {
       const strongKey = getHebrewStrong(item);
      if (strongKey && !state.dictByStrong.has(strongKey)) state.dictByStrong.set(strongKey, item);
    const rawKeys = buildHebrewEntryTokens(item);
      rawKeys.map((token) => normalizeHebrew(token)).forEach((key) => {
        if (!key) return;
        if (!state.dictMap.has(key)) state.dictMap.set(key, []);
        state.dictMap.get(key).push(item);
      });
       rawKeys.map((token) => normalizeHebrewPointed(token)).forEach((key) => {
        if (!key) return;
        if (!state.dictPointedMap.has(key)) state.dictPointedMap.set(key, []);
        state.dictPointedMap.get(key).push(item);
      });
    });
    state.dictLoaded = true;
    return state.dictMap;
  }

  async function loadIndex(lang) {
    if (state.indexes[lang]) return state.indexes[lang];
    const url = lang === 'he' ? HEBREW_INDEX_PATH : GREEK_INDEX_PATH;
    const data = await loadJson(url);
    state.indexes[lang] = data;
    return data;
  }

  async function loadChapterText(lang, book, chapter) {
    const key = `${lang}/${book}/${chapter}`;
    if (state.textCache.has(key)) return state.textCache.get(key);
    const url = `${TEXT_BASE}/${lang}/${book}/${chapter}.json`;
    const data = await loadJson(url);
    state.textCache.set(key, data);
    return data;
  }

  async function loadLxxFile(file) {
    if (state.lxxFileCache.has(file)) return state.lxxFileCache.get(file);
    const data = await loadJson(`./LXX/${file}`);
    state.lxxFileCache.set(file, data);
    return data;
  }

  async function loadLxxBookData(bookCode) {
    if (state.lxxBookCache.has(bookCode)) return state.lxxBookCache.get(bookCode);
    for (const file of LXX_FILES) {
      try {
        const data = await loadLxxFile(file);
        if (data?.text?.[bookCode]) {
          state.lxxBookCache.set(bookCode, data);
          return data;
        }
      } catch (error) {
        continue;
      }
    }
    state.lxxBookCache.set(bookCode, null);
    return null;
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


  async function buildGreekCandidateFromHebrewRefs(refs) {
    if (!refs.length) return null;
    const counts = new Map();
    const samples = new Map();
      const usedBooks = new Set();
    for (const ref of refs.slice(0, 50)) {
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
          if (!normalized || greekStopwords.has(normalized)) return;
          verseLemmas.add(normalized);
          if (!samples.has(normalized) && token?.lemma) samples.set(normalized, token.lemma);
        });
          verseLemmas.forEach((lemma) => {
          counts.set(lemma, (counts.get(lemma) || 0) + 1);
        });
      }
    }
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

    const ranked = [...counts.entries()].map(([lemma, hits]) => {
      const df = verseFreq.get(lemma) || 0;
      const score = hits * Math.log((totalVerses + 1) / (df + 1));
      return { lemma, hits, score };
    }).sort((a, b) => (b.score - a.score) || (b.hits - a.hits));

    const best = ranked[0]?.lemma;
    if (!best) return null;
    return {
      normalized: best,
      lemma: samples.get(best) || best
    };
  }

  function formatRef(book, chapter, verse) {
    const bookLabel = book.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
    return `${bookLabel} ${chapter}:${verse}`;
  }

  async function buildNa28Samples(normalizedGreek, max = 4) {
    if (!normalizedGreek) return [];
    const grIndex = await loadIndex('gr');
    const refs = grIndex.tokens?.[normalizedGreek] || [];
    const samples = [];
    for (const ref of refs.slice(0, max)) {
      const [book, chapterRaw, verseRaw] = ref.split('|');
      const chapter = Number(chapterRaw);
      const verse = Number(verseRaw);
      let verseText = '';
      try {
        const verses = await loadChapterText('gr', book, chapter);
        verseText = verses?.[verse - 1] || '';
      } catch (error) {
        verseText = 'Texto no disponible.';
      }
      samples.push({
        ref: formatRef(book, chapter, verse),
        text: verseText
      });
    }
    return samples;
  }

  function ensurePopup() {
    if (state.popupEl) return state.popupEl;
    const styleId = 'he-lexicon-style';
    if (!document.getElementById(styleId)) {
      const st = document.createElement('style');
      st.id = styleId;
      st.textContent = `
        .he-lex-popup{
          position:fixed;
          z-index:9997;
          min-width:260px;
          max-width:min(440px, calc(100vw - 24px));
          max-height:calc(100vh - 24px);
          overflow:auto;
          background:rgba(17,26,46,0.98);
          border:1px solid rgba(255,255,255,0.10);
          border-radius:14px;
          box-shadow:0 20px 50px rgba(0,0,0,0.35);
          padding:12px;
          color:#e9eefc;
          display:none;
        }
                .he-lex-popup.compact{ max-width:min(320px, calc(100vw - 24px)); }
        .he-lex-popup .t1{ font-weight:700; font-size:15px; margin-bottom:6px; direction:rtl; }
                 .he-lex-popup .head{ display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:8px; cursor:move; user-select:none; }
        .he-lex-popup .head .t1{ margin-bottom:0; text-align:center; }
                .he-lex-popup .toggle{ border:1px solid rgba(255,255,255,.2); background:rgba(255,255,255,.08); color:#dbe5ff; border-radius:8px; font-size:11px; line-height:1; cursor:pointer; padding:4px 8px; }
        .he-lex-popup .t2{ font-size:13px; opacity:.92; line-height:1.35; }
        .he-lex-popup .row{ margin-top:6px; }
        .he-lex-popup .lab{ opacity:.7; margin-right:6px; }
        .he-lex-popup .sep{ border:0; border-top:1px solid rgba(255,255,255,.12); margin:10px 0; }
        .he-lex-popup .def{ margin-top:4px; line-height:1.35; max-height:160px; overflow:auto; }
        .he-lex-popup .rkant{ margin-top:6px; max-height:180px; overflow:auto; }
        .he-lex-popup .rkant-row{ margin-top:4px; font-size:12px; line-height:1.3; }
        .he-lex-popup .muted{ opacity:.7; }
        .he-lex-popup .close{ background:transparent; border:0; color:#cbd6ff; cursor:pointer; font-size:16px; line-height:1; padding:0 2px; }
        .he-lex-popup .he-lex-chip{ display:inline-flex; align-items:center; gap:4px; margin:2px 6px 2px 0; border:1px solid rgba(134,182,255,.45); background:rgba(71,123,214,.16); color:#e9eefc; border-radius:999px; padding:2px 10px; font-size:12px; cursor:pointer; }
        .he-lex-popup .he-lex-chip:hover{ background:rgba(71,123,214,.28); }
                 .he-lex-popup .content.collapsed .details{ display:none; }
        .he-lex-popup .content.expanded .details{ display:block; }
        .he-lex-active-word{
          text-decoration: underline;
          text-decoration-thickness: 2px;
          text-underline-offset: 3px;
          text-decoration-color: currentColor;
        }
      `;
      document.head.appendChild(st);
    }

    const box = document.createElement('div');
    box.id = 'he-lex-popup';
    box.className = 'he-lex-popup';
    box.innerHTML =
 '<div class="head"><button class="toggle" id="he-lex-toggle" aria-expanded="false" type="button">Expandir</button><div class="t1" id="he-lex-word"></div><button class="close" aria-label="Cerrar" type="button">×</button></div>' +
       '<div class="content collapsed" id="he-lex-content">' +
     '<div class="summary">' +
          '<div class="t2 row"><span class="lab">Lemma:</span><span id="he-lex-entry"></span></div>' +
      '<div class="t2 row"><span class="lab">Forma léxica:</span><span id="he-lex-translit"></span></div>' +
      '<div class="t2 row"><span class="lab">Definición:</span><div id="he-lex-desc" class="def"></div></div>' +
      '</div>' +
      '<div class="details">' +
'<div class="t2 row" id="he-lex-printed-row"><span class="lab">Entrada impresa:</span><span id="he-lex-printed"></span></div>' +
      '<div class="t2 row"><span class="lab">Formas:</span><span id="he-lex-variants"></span></div>' +
'<div class="t2 row" id="he-lex-root-lexeme-row" style="display:none"><span class="lab">Raíz de:</span><span id="he-lex-root-lexeme"></span></div>' +
      '<div class="t2 row" id="he-lex-root-definition-row" style="display:none"><span class="lab" id="he-lex-root-definition-label">Definición de Raíz:</span><div id="he-lex-root-definition" class="def"></div></div>' +
            '<div class="t2 row"><span class="lab">LXX:</span><div id="he-lex-lxx" class="def"></div></div>' +
      '<hr class="sep" />' +
      '<div class="t2"><span class="lab">Correspondencia RKANT:</span></div>' +
'<div id="he-lex-rkant" class="rkant"></div>' +
      '</div>' +
      '</div>';
    document.body.appendChild(box);
    state.popupEl = box;

    box.querySelector('.close').addEventListener('click', hidePopup, false);
     box.querySelector('#he-lex-toggle')?.addEventListener('click', () => {
      setPopupExpanded(!state.popupExpanded);
    }, false);
      const onPointerMove = (ev) => {
      const drag = state.popupDrag;
      if (!drag) return;
      const popup = state.popupEl;
      if (!popup) return;
      const nx = ev.clientX - drag.offsetX;
      const ny = ev.clientY - drag.offsetY;
      popup.style.left = `${Math.round(nx)}px`;
      popup.style.top = `${Math.round(ny)}px`;
    };

    const stopDrag = () => {
      state.popupDrag = null;
      document.removeEventListener('pointermove', onPointerMove, true);
      document.removeEventListener('pointerup', stopDrag, true);
      document.removeEventListener('pointercancel', stopDrag, true);
    };

    box.querySelector('.head')?.addEventListener('pointerdown', (ev) => {
      if (ev.button !== 0) return;
      if (ev.target?.closest?.('.close')) return;
      const r = box.getBoundingClientRect();
      state.popupDrag = { offsetX: ev.clientX - r.left, offsetY: ev.clientY - r.top };
      document.addEventListener('pointermove', onPointerMove, true);
      document.addEventListener('pointerup', stopDrag, true);
      document.addEventListener('pointercancel', stopDrag, true);
      ev.preventDefault();
    });
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') hidePopup();
    }, false);
   document.addEventListener('pointerdown', (ev) => {
      const p = state.popupEl;
      if (!p || p.style.display !== 'block') return;
      if (p.contains(ev.target)) return;
      hidePopup();
     }, true);

    return box;
  }

  function showPopupNear(anchorEl) {
    const box = ensurePopup();
    const rect = anchorEl.getBoundingClientRect();
    const pad = 10;
    box.style.display = 'block';
    const bw = box.offsetWidth;
    const bh = box.offsetHeight;
    let left = rect.left + (rect.width / 2) - (bw / 2);
    let top = rect.bottom + 8;
    if (left < pad) left = pad;
    if (left + bw > window.innerWidth - pad) left = window.innerWidth - pad - bw;
    if (top + bh > window.innerHeight - pad) {
      top = rect.top - bh - 8;
      if (top < pad) top = pad;
    }
    box.style.left = Math.round(left) + 'px';
    box.style.top = Math.round(top) + 'px';
  }

  function hidePopup() {
    if (!state.popupEl) return;
    state.popupEl.style.display = 'none';
     clearActiveWordMarker();
  }

function setPopupExpanded(expanded) {
    state.popupExpanded = !!expanded;
    const popup = state.popupEl;
    if (!popup) return;
    const content = popup.querySelector('#he-lex-content');
    const toggle = popup.querySelector('#he-lex-toggle');
    if (content) {
      content.classList.toggle('expanded', state.popupExpanded);
      content.classList.toggle('collapsed', !state.popupExpanded);
    }
    popup.classList.toggle('compact', !state.popupExpanded);
    if (toggle) {
      toggle.textContent = state.popupExpanded ? 'Contraer' : 'Expandir';
      toggle.setAttribute('aria-expanded', state.popupExpanded ? 'true' : 'false');
    }
  }

  function clearActiveWordMarker() {
    const markers = document.querySelectorAll('.he-lex-active-word');
    markers.forEach((marker) => {
      const parent = marker.parentNode;
      if (!parent) return;
      while (marker.firstChild) parent.insertBefore(marker.firstChild, marker);
      parent.removeChild(marker);
      if (parent.normalize) parent.normalize();
    });
  }

  function markActiveWord(node, start, end) {
    if (!node || node.nodeType !== Node.TEXT_NODE) return null;
    if (start < 0 || end <= start) return null;
    clearActiveWordMarker();
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, end);
    const marker = document.createElement('span');
    marker.className = 'he-lex-active-word';
    try {
      range.surroundContents(marker);
      return marker;
    } catch (error) {
      return null;
    }
  }

  function caretFromPoint(x, y) {
    if (document.caretPositionFromPoint) {
      const p = document.caretPositionFromPoint(x, y);
      if (!p) return null;
      return { node: p.offsetNode, offset: p.offset };
    }
    if (document.caretRangeFromPoint) {
      const r = document.caretRangeFromPoint(x, y);
      if (!r) return null;
      return { node: r.startContainer, offset: r.startOffset };
    }
    return null;
  }

   function resolveTextNode(pos) {
    if (!pos || !pos.node) return null;
    if (pos.node.nodeType === Node.TEXT_NODE) {
      return { node: pos.node, offset: pos.offset };
    }
    if (pos.node.nodeType !== Node.ELEMENT_NODE) return null;

    const element = pos.node;
    const children = element.childNodes || [];
    if (!children.length) return null;

    const idx = Math.max(0, Math.min(pos.offset, children.length - 1));
    const candidates = [children[idx], children[idx - 1], children[idx + 1]].filter(Boolean);

    for (const candidate of candidates) {
      if (candidate.nodeType === Node.TEXT_NODE && candidate.nodeValue) {
        return { node: candidate, offset: Math.min(pos.offset, candidate.nodeValue.length) };
      }
      if (candidate.nodeType === Node.ELEMENT_NODE) {
        const walker = document.createTreeWalker(candidate, NodeFilter.SHOW_TEXT, null);
        const textNode = walker.nextNode();
        if (textNode) return { node: textNode, offset: 0 };
      }
    }

    return null;
  }
   function isHebrewWordChar(ch) {
    if (!ch) return false;
    const code = ch.codePointAt(0);
      // El maqaf (U+05BE) separa palabras en hebreo bíblico y debe tratarse
    // como límite de clic, no como parte de una sola palabra compuesta.
    if (code === 0x05BE) return false;
    return (
      (code >= 0x0590 && code <= 0x05FF) ||
      (code >= 0x0300 && code <= 0x036F)
    );
  }

  function pointInsideWordRect(node, start, end, x, y) {
    if (!node || start < 0 || end <= start) return false;
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, end);
    const rects = range.getClientRects();
    const pad = 2;
    for (const rect of rects) {
      if (
        x >= rect.left - pad &&
        x <= rect.right + pad &&
        y >= rect.top - pad &&
        y <= rect.bottom + pad
      ) return true;
    }
    return false;
  }
  function expandWord(text, idx) {
    const isWordChar = isHebrewWordChar;
    let start = idx;
    let end = idx;
    while (start > 0 && isWordChar(text[start - 1])) start--;
    while (end < text.length && isWordChar(text[end])) end++;
    const word = text.slice(start, end);
    return { word, start, end };
  }

  function isHebrewPanel(target) {
    const panel = document.getElementById('passageTextOrig');
    if (!panel) return false;
    if (!panel.classList.contains('hebrew')) return false;
    return panel.contains(target);
  }

  function escapeHtml(s) {
    return String(s ?? '')
      .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
  }

  document.addEventListener('click', async (ev) => {
    if (ev.button !== 0) return;
    if (!isHebrewPanel(ev.target)) return;
    if (ev.target?.closest?.('.note-mark')) return;
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) return;

  const pos = caretFromPoint(ev.clientX, ev.clientY);
    const resolved = resolveTextNode(pos);
    if (!resolved) return;
    const text = resolved.node.nodeValue || '';
    if (!text) return;
    const pivot = Math.max(0, Math.min(resolved.offset, text.length - 1));
    let idx = pivot;
    if (!isHebrewWordChar(text[idx]) && idx > 0 && isHebrewWordChar(text[idx - 1])) idx -= 1;
    if (!isHebrewWordChar(text[idx])) return;
    const { word, start, end } = expandWord(text, idx);
    if (!pointInsideWordRect(resolved.node, start, end, ev.clientX, ev.clientY)) return;
    const compoundTokens = splitHebrewCompoundTokens(word);
    const normalized = normalizeHebrew(word);
    const pointed = normalizeHebrewPointed(word);
    if (!normalized) return;

     const marker = markActiveWord(resolved.node, start, end);
     const requestId = ++state.popupRequestId;
    ensurePopup();

    const wordEl = document.getElementById('he-lex-word');
    const entryEl = document.getElementById('he-lex-entry');
    const descEl = document.getElementById('he-lex-desc');
    const translitEl = document.getElementById('he-lex-translit');
    const printedEl = document.getElementById('he-lex-printed');
     const printedRowEl = document.getElementById('he-lex-printed-row');
      const trilingueEl = document.getElementById('he-lex-tri');
    const trilingueRowEl = document.getElementById('he-lex-tri-row');
    const variantsEl = document.getElementById('he-lex-variants');
    const lxxEl = document.getElementById('he-lex-lxx');
    const rkantEl = document.getElementById('he-lex-rkant');
     const rootLexemeEl = document.getElementById('he-lex-root-lexeme');
    const rootLexemeRowEl = document.getElementById('he-lex-root-lexeme-row');
    const rootDefinitionEl = document.getElementById('he-lex-root-definition');
    const rootDefinitionRowEl = document.getElementById('he-lex-root-definition-row');
    const rootDefinitionLabelEl = document.getElementById('he-lex-root-definition-label');

    let currentLxxData = '—';
    const displayWord = stripHebrewCantillation(word) || word || normalized;
    if (wordEl) wordEl.textContent = displayWord;
    if (entryEl) entryEl.textContent = 'Cargando…';
    if (translitEl) translitEl.textContent = '—';
    if (printedEl) printedEl.textContent = '—';
     if (printedRowEl) printedRowEl.style.display = '';
         if (trilingueEl) trilingueEl.textContent = '—';
    if (trilingueRowEl) trilingueRowEl.style.display = 'none';
    if (descEl) descEl.textContent = 'Buscando entrada en el diccionario hebreo…';
    if (variantsEl) variantsEl.textContent = '—';
    if (lxxEl) lxxEl.textContent = '—';
    if (rootLexemeEl) rootLexemeEl.textContent = '—';
    if (rootLexemeRowEl) rootLexemeRowEl.style.display = 'none';
    if (rootDefinitionEl) rootDefinitionEl.textContent = '—';
    if (rootDefinitionRowEl) rootDefinitionRowEl.style.display = 'none';
    if (rootDefinitionLabelEl) rootDefinitionLabelEl.textContent = 'Definición de Raíz:';
    if (rkantEl) rkantEl.innerHTML = '<div class="rkant-row muted">Buscando correspondencias RKANT…</div>';
    showPopupNear(marker || ev.target);
        setPopupExpanded(false);

    let entry = null;
    try {
            await loadTrilingueFallback();
      await Promise.all([loadHebrewDict(), loadHebrewRoots()]);
            if (requestId !== state.popupRequestId) return;
    const lookupCandidates = uniqueList([
        ...compoundTokens.sort((a, b) => b.length - a.length),
        normalized
      ]);
      let found = null;
      for (const candidate of lookupCandidates) {
        found = findHebrewEntry(candidate, pointed);
        if (found) break;
      }
      const lookupWord = found?.lookup || lookupCandidates[0] || normalized;
      entry = found?.entry || null;
       const trilingueFallback = resolveTrilingueFallback(word) || resolveTrilingueFallback(lookupWord);
      if (trilingueFallback?.gloss) {
        if (trilingueEl) trilingueEl.textContent = trilingueFallback.gloss;
        if (trilingueRowEl) trilingueRowEl.style.display = '';
      }
      if (!entry) {
        if (entryEl) entryEl.textContent = '—';
        if (descEl) descEl.textContent = trilingueFallback?.gloss ? `Sin entrada directa. Sugerencia trilingüe: ${trilingueFallback.gloss}` : 'Sin entrada para esta palabra.';
        if (translitEl) translitEl.textContent = trilingueFallback?.greekHint || '—';
        if (printedEl) printedEl.textContent = '—';
        if (printedRowEl) printedRowEl.style.display = 'none';
        if (variantsEl) variantsEl.textContent = '—';
        if (rootLexemeEl) rootLexemeEl.textContent = '—';
        if (rootLexemeRowEl) rootLexemeRowEl.style.display = 'none';
        if (rootDefinitionEl) rootDefinitionEl.textContent = '—';
        if (rootDefinitionRowEl) rootDefinitionRowEl.style.display = 'none';
         if (lxxEl) lxxEl.textContent = '—';
      } else {
        if (entryEl) entryEl.textContent = getDisplayedHebrewLemma(entry, word);
        const translitValue = normalizeSimpleText(getHebrewTranslit(entry));
        if (translitEl) translitEl.textContent = translitValue && translitValue !== '—' ? translitValue : (trilingueFallback?.greekHint || '—');
              const printedEntry = getHebrewPrintedEntry(entry);
        if (printedEl) printedEl.textContent = printedEntry || '—';
        if (printedRowEl) printedRowEl.style.display = printedEntry ? '' : 'none';
 const displayDefinition = getDisplayedHebrewDefinition(entry, word);
       if (descEl) descEl.textContent = (displayDefinition && displayDefinition !== '—') ? displayDefinition : (trilingueFallback?.gloss || '—');
        if (variantsEl) variantsEl.textContent = getHebrewForms(entry).join(', ') || '—';
 const rootData = getHebrewRootData(entry);
        const rootLexemes = uniqueList(rootData.map((item) => item?.root_lexeme));
        const rootDefinitions = uniqueList(rootData.map((item) => formatRootDefinitionSegment(item, 'root_first_segment')));
      const rootLexemeMarkup = rootLexemes.length
          ? rootLexemes.map((lexeme) => `<button type="button" class="he-lex-chip" data-he-lex-root="${escapeHtml(lexeme)}">${escapeHtml(lexeme)}</button>`).join(' ')
          : '—';
                if (rootLexemeEl) rootLexemeEl.innerHTML = rootLexemeMarkup;
         if (rootLexemeRowEl) rootLexemeRowEl.style.display = rootLexemes.length ? '' : 'none';
        const rootLabelWord = rootLexemes[0] || '';
        if (rootDefinitionLabelEl) rootDefinitionLabelEl.textContent = rootLabelWord ? `Definición de ${rootLabelWord}:` : 'Definición de derivación:';
        if (rootDefinitionEl) rootDefinitionEl.textContent = rootDefinitions.join('\n\n') || '—';
        if (rootDefinitionRowEl) rootDefinitionRowEl.style.display = rootDefinitions.length ? '' : 'none';
        currentLxxData = formatHebrewLxx(getHebrewLxx(entry));
                if (lxxEl) lxxEl.textContent = currentLxxData;
      }
  
      const heIndex = await loadIndex('he');
        if (requestId !== state.popupRequestId) return;
const refCandidates = uniqueList([lookupWord, normalized, ...compoundTokens]);
      const refs = [...new Set(refCandidates.flatMap((token) => heIndex.tokens?.[token] || []))];
       if (!refs.length) {
        if (rkantEl) rkantEl.innerHTML = '<div class="rkant-row muted">Sin referencias hebreas en el índice.</div>';
        return;
      }
      const greekCandidate = await buildGreekCandidateFromHebrewRefs(refs);
           if (requestId !== state.popupRequestId) return;
       if (lxxEl && isMissingLxxData(currentLxxData)) {
        const lxxSamples = await buildLxxSamplesFromHebrewRefs(refs, greekCandidate?.normalized || '', 4);
        if (requestId !== state.popupRequestId) return;
        if (lxxSamples.length) {
          lxxEl.innerHTML = lxxSamples.map((sample) => (
            `<div>• <b>${escapeHtml(sample.ref)}</b> — ${escapeHtml(sample.word || '—')} <span class="muted">|</span> ${escapeHtml(sample.lemma || '—')}</div>`
          )).join('');
        } else if (greekCandidate?.lemma) {
          lxxEl.textContent = greekCandidate.lemma;
        }
      }

      if (!greekCandidate) {
        if (rkantEl) rkantEl.innerHTML = '<div class="rkant-row muted">No se pudo determinar correspondencia griega.</div>';
        return;
      }
      const rkantSamples = await buildNa28Samples(greekCandidate.normalized, 4);
          if (requestId !== state.popupRequestId) return;
      if (!rkantSamples.length) {
        if (rkantEl) rkantEl.innerHTML = `<div class="rkant-row muted">Lema griego: ${escapeHtml(greekCandidate.lemma)} · Sin ocurrencias en RKANT.</div>`;
        return;
      }
      const items = rkantSamples.map((sample) => (
        `<div class="rkant-row">• <b>${escapeHtml(sample.ref)}</b> — ${escapeHtml(sample.text)}</div>`
      )).join('');
      if (rkantEl) {
        rkantEl.innerHTML = `
          <div class="rkant-row"><span class="muted">Lema griego:</span> ${escapeHtml(greekCandidate.lemma)}</div>
          ${items}
        `;
      }
    } catch (error) {
        if (requestId !== state.popupRequestId) return;
      if (entryEl) entryEl.textContent = '—';
      if (descEl) descEl.textContent = 'No se pudo cargar el diccionario hebreo.';
      if (translitEl) translitEl.textContent = '—';
      if (printedEl) printedEl.textContent = '—';
       if (printedRowEl) printedRowEl.style.display = 'none';
      if (variantsEl) variantsEl.textContent = '—';
      if (rootLexemeEl) rootLexemeEl.textContent = '—';
      if (rootLexemeRowEl) rootLexemeRowEl.style.display = 'none';
      if (rootDefinitionEl) rootDefinitionEl.textContent = '—';
      if (rootDefinitionRowEl) rootDefinitionRowEl.style.display = 'none';
      if (lxxEl) lxxEl.textContent = '—';
      if (rkantEl) rkantEl.innerHTML = '<div class="rkant-row muted">No se pudo cargar la correspondencia RKANT.</div>';
    }
  }, false);
})();
