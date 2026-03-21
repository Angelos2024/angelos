(function(){
  const HEBREW_INTERLINEAR_BASE = './IdiomaORIGEN/interlineal';
  const HEBREW_INTERLINEAR_BOOK_FILES = [
    '01_Génesis.json','02_Éxodo.json','03_Levítico.json','04_Números.json','05_Deuteronomio.json','06_Josué.json','07_Jueces.json','08_Rut.json','09_1_Samuel.json','10_2_Samuel.json',
    '11_1_Reyes.json','12_2_Reyes.json','13_1_Crónicas.json','14_2_Crónicas.json','15_Esdras.json','16_Nehemías.json','17_Ester.json','18_Job.json','19_Salmos.json','20_Proverbios.json',
    '21_Eclesiastés.json','22_Cantares.json','23_Isaías.json','24_Jeremías.json','25_Lamentaciones.json','26_Ezequiel.json','27_Daniel.json','28_Oseas.json','29_Joel.json','30_Amós.json',
    '31_Abdías.json','32_Jonás.json','33_Miqueas.json','34_Nahúm.json','35_Habacuc.json','36_Sofonías.json','37_Hageo.json','38_Zacarías.json','39_Malaquías.json'
  ];
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
    const previous = rankedMap.get(key);
    if(!previous || score > previous.score){
      rankedMap.set(key, { gloss: normalized, score });
    }
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

    for(const [key, value] of pointedRankedMap.entries()){
      pointedMap.set(key, value.gloss);
    }
    for(const [key, value] of unpointedRankedMap.entries()){
      unpointedMap.set(key, value.gloss);
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

  function mapTokenToSpanish(token, map, isHebrew, isGreek = false){
    if(isHebrew){
      const pointedKey = normalizeToken(token, true, false, true);
      const plainKey = normalizeToken(token, true);
      if(pointedKey && map.pointedMap?.has(pointedKey)) return map.pointedMap.get(pointedKey);
      if(plainKey && map.unpointedMap?.has(plainKey)) return map.unpointedMap.get(plainKey);
      return '-';
    }

    const key = normalizeToken(token, false, isGreek);
    if(!key) return '-';
    return map.get(key) || '-';
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
    buildInterlinearRows
  };
})();