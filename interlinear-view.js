(function(){
  const HEBREW_INTERLINEAR_BASE = './IdiomaORIGEN/interlineal';
  const HEBREW_INTERLINEAR_BOOK_FILES = [
    '01_Génesis.json','02_Éxodo.json','03_Levítico.json','04_Números.json','05_Deuteronomio.json','06_Josué.json','07_Jueces.json','08_Rut.json','09_1_Samuel.json','10_2_Samuel.json',
    '11_1_Reyes.json','12_2_Reyes.json','13_1_Crónicas.json','14_2_Crónicas.json','15_Esdras.json','16_Nehemías.json','17_Ester.json','18_Job.json','19_Salmos.json','20_Proverbios.json',
    '21_Eclesiastés.json','22_Cantares.json','23_Isaías.json','24_Jeremías.json','25_Lamentaciones.json','26_Ezequiel.json','27_Daniel.json','28_Oseas.json','29_Joel.json','30_Amós.json',
    '31_Abdías.json','32_Jonás.json','33_Miqueas.json','34_Nahúm.json','35_Habacuc.json','36_Sofonías.json','37_Hageo.json','38_Zacarías.json','39_Malaquías.json'
  ];
  const HEBREW_INTERLINEAR_FILE_BY_SLUG = {
    genesis:'01_Génesis.json', exodo:'02_Éxodo.json', levitico:'03_Levítico.json', numeros:'04_Números.json', deuteronomio:'05_Deuteronomio.json',
    josue:'06_Josué.json', jueces:'07_Jueces.json', rut:'08_Rut.json', '1_samuel':'09_1_Samuel.json', '2_samuel':'10_2_Samuel.json',
    '1_reyes':'11_1_Reyes.json', '2_reyes':'12_2_Reyes.json', '1_cronicas':'13_1_Crónicas.json', '2_cronicas':'14_2_Crónicas.json',
    esdras:'15_Esdras.json', nehemias:'16_Nehemías.json', ester:'17_Ester.json', job:'18_Job.json', salmos:'19_Salmos.json',
    proverbios:'20_Proverbios.json', eclesiastes:'21_Eclesiastés.json', cantares:'22_Cantares.json', isaias:'23_Isaías.json',
    jeremias:'24_Jeremías.json', lamentaciones:'25_Lamentaciones.json', ezequiel:'26_Ezequiel.json', daniel:'27_Daniel.json',
    oseas:'28_Oseas.json', joel:'29_Joel.json', amos:'30_Amós.json', abdias:'31_Abdías.json', jonas:'32_Jonás.json',
    miqueas:'33_Miqueas.json', nahum:'34_Nahúm.json', habacuc:'35_Habacuc.json', sofonias:'36_Sofonías.json',
    hageo:'37_Hageo.json', zacarias:'38_Zacarías.json', malaquias:'39_Malaquías.json'
  };
  const GREEK_DICT_PATH = './diccionario/diccionarioG_unificado.min.json';

  let dictionariesPromise = null;

  function normalizeToken(token, isHebrew, isGreek = false, preserveHebrewPoints = false){
    let clean = String(token || '').trim();
    clean = clean.replace(/[\u200c-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, '');
    clean = clean
      .replace(/^[\s.,;:!?¡¿()\[\]{}"'“”‘’«»··;᾽᾿ʼʹʽ\-‐‑‒–—―]+|[\s.,;:!?¡¿()\[\]{}"'“”‘’«»··;᾽᾿ʼʹʽ\-‐‑‒–—―]+$/g, '');
    clean = clean.replace(/[\u200c-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, '');

    if(isHebrew){
      clean = clean.replace(/[\u0591-\u05AF]/g, '');
      if(!preserveHebrewPoints){
        clean = clean.replace(/[\u05B0-\u05BC\u05BD\u05BF\u05C1-\u05C2\u05C7]/g, '');
      }
      clean = clean.replace(/[\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4]/g, '');
    }

    if(isGreek){
      clean = clean.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    return clean.toLowerCase();
  }

  function normalizeGloss(gloss){
    const clean = String(gloss || '').replace(/\s+/g, ' ').trim();
    if(!clean) return '-';
    return clean;
  }

  function takeFirstGloss(value){
    if(!value) return '-';
    if(Array.isArray(value)){
      const first = value.find((item) => String(item || '').trim());
      return first ? String(first).trim() : '-';
    }
    return String(value).trim() || '-';
  }

  async function loadJson(path){
    const response = await fetch(path, { cache: 'force-cache' });
    if(!response.ok){
      throw new Error(`No se pudo cargar ${path} (HTTP ${response.status})`);
    }
    return response.json();
  }

  function setGlossCandidate(map, key, gloss, score, usage, exactLemmaMatch = false){
    if(!key) return;
    const normalizedGloss = normalizeGloss(gloss);
    if(!normalizedGloss || normalizedGloss === '-') return;
    const prev = map.get(key);

    if(
      !prev ||
      score > prev.score ||
      (score === prev.score && Number(exactLemmaMatch) > Number(prev.exactLemmaMatch)) ||
      (score === prev.score && exactLemmaMatch === prev.exactLemmaMatch && usage > prev.usage)
    ){
      map.set(key, { gloss: normalizedGloss, score, usage, exactLemmaMatch });
    }
  }

  function setHebrewInterlinearGlossCandidate(rankedMap, key, gloss, score){
    if(!key) return;
    const normalized = normalizeGloss(gloss);
    if(!normalized || normalized === '-') return;
   let byGloss = rankedMap.get(key);
    if(!byGloss){
      byGloss = new Map();
      rankedMap.set(key, byGloss);
    }
    const previous = byGloss.get(normalized) || { score, count: 0 };
    byGloss.set(normalized, {
      score: Math.max(previous.score, score),
      count: previous.count + 1
    });
  }


function getHebrewTokenLookupForms(orig){
    if(Array.isArray(orig)){
      const parts = orig
        .map((part) => String(part || '').trim())
        .filter(Boolean);
      if(parts.length === 0) return [];
      return [parts.join('')];
    }

    const clean = String(orig || '').trim();
    return clean ? [clean] : [];
  }

  function buildHebrewMapFromInterlinear(books){
    const pointedRankedMap = new Map();
    const unpointedRankedMap = new Map();

    for(const book of books || []){
      const chapters = book?.chapters && typeof book.chapters === 'object' ? Object.values(book.chapters) : [];
      for(const chapter of chapters){
        const verses = chapter && typeof chapter === 'object' ? Object.values(chapter) : [];
        for(const verse of verses){
          const tokens = Array.isArray(verse?.tokens) ? verse.tokens : [];
          for(const token of tokens){
          const hebrewForms = getHebrewTokenLookupForms(token?.orig);
            for(const hebrew of hebrewForms){
              const pointedKey = normalizeToken(hebrew, true, false, true);
              const plainKey = normalizeToken(hebrew, true);

              setHebrewInterlinearGlossCandidate(pointedRankedMap, pointedKey, token?.es, 3);
              setHebrewInterlinearGlossCandidate(unpointedRankedMap, plainKey, token?.es, 3);
              setHebrewInterlinearGlossCandidate(pointedRankedMap, pointedKey, token?.added, 2);
              setHebrewInterlinearGlossCandidate(unpointedRankedMap, plainKey, token?.added, 2);
              setHebrewInterlinearGlossCandidate(pointedRankedMap, pointedKey, token?.notrans, 1);
              setHebrewInterlinearGlossCandidate(unpointedRankedMap, plainKey, token?.notrans, 1);
            }
          }
        }
      }
    }

    const pointedMap = new Map();
    const unpointedMap = new Map();

   for(const [key, byGloss] of pointedRankedMap.entries()){
      let winner = null;
      for(const [gloss, meta] of byGloss.entries()){
        if(
          !winner ||
          meta.score > winner.score ||
          (meta.score === winner.score && meta.count > winner.count)
        ){
          winner = { gloss, score: meta.score, count: meta.count };
        }
      }
      if(winner) pointedMap.set(key, winner.gloss);
    }
     for(const [key, byGloss] of unpointedRankedMap.entries()){
      let winner = null;
      for(const [gloss, meta] of byGloss.entries()){
        if(
          !winner ||
          meta.score > winner.score ||
          (meta.score === winner.score && meta.count > winner.count)
        ){
          winner = { gloss, score: meta.score, count: meta.count };
        }
      }
      if(winner) unpointedMap.set(key, winner.gloss);
    }

    return { pointedMap, unpointedMap };
  }

  function buildGreekMap(rows){
    const map = new Map();

    for(const row of rows || []){
      if(Array.isArray(row)){
        const lemma = normalizeToken(row[0], false, true);
        const gloss = takeFirstGloss(row[1]);
        setGlossCandidate(map, lemma, gloss, 2, 0, true);
        continue;
      }

      if(!row || typeof row !== 'object') continue;
      const usage = Number(row?.stats?.tokens) || 0;
      const fallbackGloss = takeFirstGloss(row?.glosas || row?.glosa || row?.strong_detail?.def_rv);
      const normalizedLemma = normalizeToken(row?.griego, false, true);

      if(Array.isArray(row?.formas) && Array.isArray(row?.glosas)){
        const limit = Math.min(row.formas.length, row.glosas.length);
        for(let i = 0; i < limit; i++){
          const formKey = normalizeToken(row.formas[i], false, true);
          setGlossCandidate(map, formKey, row.glosas[i], 4, usage, formKey === normalizedLemma);
        }
      }

      const primaryFormKey = normalizeToken(row?.forma, false, true);
      setGlossCandidate(map, primaryFormKey, row?.glosa || fallbackGloss, 3, usage, primaryFormKey === normalizedLemma);
      setGlossCandidate(map, normalizedLemma, fallbackGloss, 2, usage, true);

      if(Array.isArray(row?.formas)){
        for(const form of row.formas){
          const formKey = normalizeToken(form, false, true);
          setGlossCandidate(map, formKey, fallbackGloss, 1, usage, formKey === normalizedLemma);
        }
      }

      if(Array.isArray(row?.griegos)){
        for(const variant of row.griegos){
          const variantKey = normalizeToken(variant, false, true);
          setGlossCandidate(map, variantKey, fallbackGloss, 1, usage, variantKey === normalizedLemma);
        }
      }
    }

    const plainMap = new Map();
    for(const [key, value] of map.entries()){
      plainMap.set(key, value.gloss);
    }

    return plainMap;
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

      if(map && map.has(normalizeToken(remaining, true))) break;

      const head = remaining.match(/^([\u05D0-\u05EA][\u0591-\u05AF\u05B0-\u05BC\u05BD\u05BF\u05C1-\u05C2\u05C7]*)/);
      if(!head) break;

      const baseLetter = head[1].charAt(0);
      if(!prefixLetters.has(baseLetter)) break;
      if(map && !map.has(normalizeToken(head[1], true))) break;

      parts.push(head[1]);
      remaining = remaining.slice(head[1].length);
    }

    if(parts.length === 0) return [token];
    if(remaining) parts.push(remaining);
    return parts;
  }

  function expandTokenForLookup(token, map){
    const directKey = normalizeToken(token, true);
    if(map.has(directKey)) return [token];

    const segmented = splitHebrewPrefixClusters(token, map);
    return segmented.length > 1 ? segmented : [token];
  }

 const hebrewInterlinearBookCache = new Map();

  async function loadHebrewInterlinearBookBySlug(slug){
    const file = HEBREW_INTERLINEAR_FILE_BY_SLUG[slug];
    if(!file) return null;
    if(!hebrewInterlinearBookCache.has(file)){
      hebrewInterlinearBookCache.set(
        file,
        loadJson(`${HEBREW_INTERLINEAR_BASE}/${file}`).catch(() => null)
      );
    }
    return hebrewInterlinearBookCache.get(file);
  }

  async function getHebrewRawVerse(slug, chapter, verse){
    const book = await loadHebrewInterlinearBookBySlug(slug);
    const chapterNode = book?.chapters?.[String(chapter)] || null;
    const verseNode = chapterNode?.[String(verse)] || null;
    const raw = String(verseNode?.raw || '').trim();
    return raw || '';
  }
  async function getHebrewInterlinearMaps(){
    const books = await Promise.all(
      HEBREW_INTERLINEAR_BOOK_FILES.map((file) => loadJson(`${HEBREW_INTERLINEAR_BASE}/${file}`).catch(() => null))
    );
    return buildHebrewMapFromInterlinear(books.filter(Boolean));
  }

  async function getDictionaries(){
    if(dictionariesPromise) return dictionariesPromise;
    dictionariesPromise = Promise.all([
      getHebrewInterlinearMaps(),
      loadJson(GREEK_DICT_PATH)
    ]).then(([hebrewMaps, greekRows]) => ({
      hebrewMaps,
      greekMap: buildGreekMap(greekRows)
    }));

    return dictionariesPromise;
  }
  async function preload(options = {}){
    const slug = String(options?.slug || '').trim();
    await getDictionaries();
    if(slug && HEBREW_INTERLINEAR_FILE_BY_SLUG[slug]){
      await loadHebrewInterlinearBookBySlug(slug);
    }
    return true;
  }

  function mapTokenToSpanish(token, map, isHebrew, isGreek = false){
    if(isHebrew){
      const direct = mapHebrewTokenToSpanish(token, map);
      return applyHebrewNominalFeaturesToGloss(token, direct);
    }

    const key = normalizeToken(token, false, isGreek);
    if(!key) return '-';
    return map.get(key) || '-';
  }

  function mapHebrewTokenToSpanish(token, map){
      if(!token) return '-';  
      const wayyiqtolSpecialCase = mapHebrewWayyiqtolSpecialCase(token);
      if(wayyiqtolSpecialCase) return wayyiqtolSpecialCase;
      const negativeExistential = mapHebrewNegativeExistentialToken(token);
      if(negativeExistential) return negativeExistential;
      const pointedKey = normalizeToken(token, true, false, true);
      const plainKey = normalizeToken(token, true);
      if(pointedKey && map.pointedMap?.has(pointedKey)) return map.pointedMap.get(pointedKey);
      if(plainKey && map.unpointedMap?.has(plainKey)) return map.unpointedMap.get(plainKey);
       const fallbackKeys = getHebrewFallbackLookupKeys(plainKey);
      for(const key of fallbackKeys){
        if(map.unpointedMap?.has(key)) return map.unpointedMap.get(key);
          const rebuilt = rebuildHebrewTokenGlossFromSuffix(key, token, map);
        if(rebuilt) return rebuilt;
        const rebuiltCompound = rebuildHebrewTokenGlossFromCompoundSuffix(key, token, map);
        if(rebuiltCompound) return rebuiltCompound;
      }
       const rebuiltDirect = rebuildHebrewTokenGlossFromSuffix(plainKey, token, map);
      if(rebuiltDirect) return rebuiltDirect;
      const rebuiltCompoundDirect = rebuildHebrewTokenGlossFromCompoundSuffix(plainKey, token, map);
      if(rebuiltCompoundDirect) return rebuiltCompoundDirect;
      return '-';
    }

  function mapHebrewWayyiqtolSpecialCase(token){
    const plain = normalizeToken(token, true);
    if(!plain) return '';

    // Vav consecutiva + אמר (וַיֹּאמֶר) en narrativa: "y dijo".
    if(plain === '\u05D5\u05D9\u05D0\u05DE\u05E8') return 'y dijo';

    return '';
  }
function mapHebrewNegativeExistentialToken(token){
    const pointed = normalizeToken(token, true, false, true);
    const plain = normalizeToken(token, true);
    if(!plain) return '';

    const prefixedWithVav = /^ו/.test(plain);
    const corePlain = prefixedWithVav ? plain.slice(1) : plain;
    const corePointed = prefixedWithVav
      ? pointed.replace(/^ו[\u0591-\u05C7]*/, '')
      : pointed;
    if(!corePlain) return '';

    const variants = {
      // Formas puntuadas (prioridad alta).
      'אֵינָם': 'ellos no están',
      'אֵינֶנּוּ': 'él no está',
      'אֵינֵנוּ': 'nosotros no estamos',
      'אֵינָהּ': 'ella no está',
      'אֵינֶנִּי': 'yo no estoy',
      'אֵינְךָ': 'tú no estás',
      'אֵינֵךְ': 'tú no estás',

      // Formas sin puntos (fallback).
      'אינם': 'ellos no están',
      'אינן': 'ellas no están',
      'איננו': 'él no está / no estamos',
      'אינה': 'ella no está',
      'אינני': 'yo no estoy',
      'אינך': 'tú no estás',
      'אינכם': 'ustedes no están (m)',
      'אינכן': 'ustedes no están (f)'
    };

    const resolved = variants[corePointed] || variants[corePlain] || '';
    if(!resolved) return '';
    return prefixedWithVav ? `y ${resolved}` : resolved;
  }
 
    function getHebrewFallbackLookupKeys(plainToken){
    const token = String(plainToken || '');
    if(!token) return [];
    const keys = new Set();
    const add = (value) => {
      if(value && value.length > 1) keys.add(value);
    };

    add(token.replace(/^ו/, ''));
    add(token.replace(/^ה/, ''));
    add(token.replace(/^[בכלמש]/, ''));
    add(token.replace(/^ו[בכלמש]/, ''));
    add(token.replace(/^[בכלמש]ה/, ''));
    add(token.replace(/^ו[בכלמש]ה/, ''));

    return Array.from(keys);
  }

 function normalizePossessiveSpanish(value){
    const clean = String(value || '').trim().toLowerCase();
    if(!clean) return '';
    if(clean.startsWith('nuestro') || clean.startsWith('nuestra')) return 'nuestra';
    if(clean.startsWith('vuestro') || clean.startsWith('vuestra')) return 'vuestra';
    if(clean.startsWith('mi')) return 'mi';
    if(clean.startsWith('tu')) return 'tu';
    if(clean.startsWith('su')) return 'su';
    return clean;
  }

  function stripSpanishLeadingArticle(value){
    return String(value || '')
      .replace(/^(el|la|los|las|un|una|unos|unas)\s+/i, '')
      .trim();
  }

  function rebuildHebrewTokenGlossFromSuffix(plainToken, originalToken, map){
    const token = String(plainToken || '');
    if(!token || token.length < 3) return '';

    const suffixRules = [
      { suffix: 'נו', type: 'poss', gloss: 'nuestra' },
      { suffix: 'כם', type: 'poss', gloss: 'vuestra' },
      { suffix: 'כן', type: 'poss', gloss: 'vuestra' },
      { suffix: 'ם', type: 'poss', gloss: 'su' },
      { suffix: 'ן', type: 'poss', gloss: 'su' },
      { suffix: 'י', type: 'poss', gloss: 'mi' },
      { suffix: 'ך', type: 'poss', gloss: 'tu' },
      { suffix: 'ו', type: 'poss', gloss: 'su' },
      { suffix: 'ה', type: 'mixed', gloss: 'la' }
    ];

    for(const rule of suffixRules){
      if(!token.endsWith(rule.suffix) || token.length <= rule.suffix.length + 1) continue;

      const stem = token.slice(0, -rule.suffix.length);
      const stemGloss = map.unpointedMap?.get(stem);
      if(!stemGloss || stemGloss === '-') continue;

      const original = String(originalToken || '');
      const forcePossessiveHe = /הּ[\u0591-\u05C7]*$/.test(original);
      const forceObjectHe = /הָ[\u0591-\u05C7]*$/.test(original);
      const normalizedStemGloss = stripSpanishLeadingArticle(stemGloss);

      if(rule.type === 'mixed'){
        if(forcePossessiveHe){
          return `su ${normalizedStemGloss}`.trim();
        }
        if(forceObjectHe){
          return `${normalizedStemGloss} la`.trim();
        }
        return `su ${normalizedStemGloss}`.trim();
      }

      const poss = normalizePossessiveSpanish(rule.gloss);
      if(rule.type === 'poss'){
        return `${poss} ${normalizedStemGloss}`.trim();
      }
    }

    return '';
  }

  function rebuildHebrewTokenGlossFromCompoundSuffix(plainToken, originalToken, map){
    const token = String(plainToken || '');
    if(!token || token.length < 4) return '';

    const compoundRules = [
      { suffix: 'יהם', gloss: 'su' },
      { suffix: 'יהן', gloss: 'su' },
      { suffix: 'יכם', gloss: 'vuestra' },
      { suffix: 'יכן', gloss: 'vuestra' }
    ];

    for(const rule of compoundRules){
      if(!token.endsWith(rule.suffix) || token.length <= rule.suffix.length + 1) continue;
      const stem = token.slice(0, -rule.suffix.length) + 'י';
      const stemGloss = map.unpointedMap?.get(stem);
      if(!stemGloss || stemGloss === '-') continue;
      const normalizedStemGloss = stripSpanishLeadingArticle(stemGloss);
      const poss = normalizePossessiveSpanish(rule.gloss);
      return `${poss} ${normalizedStemGloss}`.trim();
    }

    return '';
  }

  function pluralizeSpanishNoun(noun){
    const clean = String(noun || '').trim();
    if(!clean) return clean;
    if(/[sx]$/i.test(clean)) return clean;
    if(/z$/i.test(clean)) return `${clean.slice(0, -1)}ces`;
  if(/[aeiouáéó]$/i.test(clean)) return `${clean}s`;
    if(/[íú]$/i.test(clean)) return `${clean}es`;
        return `${clean}es`;
  }

  function applyHebrewNominalFeaturesToGloss(token, gloss){
    const cleanGloss = normalizeGloss(gloss);
    if(!token || cleanGloss === '-' || /\s/.test(cleanGloss)) return cleanGloss;

    const plain = normalizeToken(token, true);
    if(!plain) return cleanGloss;

 const originalArticleMatch = cleanGloss.match(/^(el|la|los|las|un|una|unos|unas)\s+/i);
    const originalArticle = originalArticleMatch ? originalArticleMatch[1].toLowerCase() : null;
    const withNoArticle = cleanGloss.replace(/^(el|la|los|las|un|una|unos|unas)\s+/i, '').trim();
        const isPlural = /(ים|ות)$/.test(plain);
    const isDual = /ים$/.test(plain) && /ַיִם|ָיִם/.test(String(token || ''));
    const shouldBePlural = isPlural || isDual;

    const base = shouldBePlural ? pluralizeSpanishNoun(withNoArticle) : withNoArticle;
    if(!originalArticle) return base;
    const isFeminine = ['la', 'las', 'una', 'unas'].includes(originalArticle);
    const article = shouldBePlural
     ? (isFeminine ? 'las' : 'los')
      : (isFeminine ? 'la' : 'el');

    return `${article} ${base}`;
  }

  async function buildInterlinearRows(originalText, options = {}){
    const { isGreek = false } = options;
    const { hebrewMaps, greekMap } = await getDictionaries();
    const targetMap = isGreek ? greekMap : hebrewMaps;
    const tokens = splitTokens(originalText)
      .flatMap((token) => (isGreek ? [token] : expandTokenForLookup(token, hebrewMaps.unpointedMap)));
    const spanish = tokens.map((token) => mapTokenToSpanish(token, targetMap, !isGreek, isGreek));

    return {
      tokens,
      spanishTokens: spanish,
      originalLine: tokens.join(' '),
      spanishLine: spanish.join(' ')
    };
  }

  window.InterlinearView = {
    buildInterlinearRows,
     getHebrewRawVerse,
    preload
  };
})();
