/**
 * InterlinearView — Motor de Análisis Hebreo-Español v2.0
 * =========================================================
 * MEJORAS sobre v1.0:
 *  - Motor gramatical completo BKL / Min / Vav basado en reglas_gramaticales.json
 *  - Detección de Artículo Oculto (SINCOPE_ARTICULO) — crítico para exégesis
 *  - Vav Consecutiva completa (patrón fonológico, no solo una palabra hardcodeada)
 *  - Estado Constructo (Smikhut) con relación "de"
 *  - Sufijos pronominales singulares Y plurales (con Yod marcadora)
 *  - Detección de Binyanim verbales (QAL, NIFAL, PIEL, HIFIL, HITPAEL)
 *  - Conjugación Qatal/Yiqtol/Wayyiqtol
 *  - Partícula Et (אֵת) como marcador de objeto directo
 *  - API pública `analyzeHebrewToken(token)` → objeto de diagnóstico exegético
 *  - `buildInterlinearRows` retorna `analysis[]` opcional para tooltips en UI
 */
(function () {

  // ─────────────────────────────────────────────
  // PATHS & CONSTANTS
  // ─────────────────────────────────────────────

  const HEBREW_INTERLINEAR_BASE = './IdiomaORIGEN/interlineal';
  const HEBREW_INTERLINEAR_BOOK_FILES = [
    '01_Génesis.json', '02_Éxodo.json', '03_Levítico.json', '04_Números.json',
    '05_Deuteronomio.json', '06_Josué.json', '07_Jueces.json', '08_Rut.json',
    '09_1_Samuel.json', '10_2_Samuel.json', '11_1_Reyes.json', '12_2_Reyes.json',
    '13_1_Crónicas.json', '14_2_Crónicas.json', '15_Esdras.json', '16_Nehemías.json',
    '17_Ester.json', '18_Job.json', '19_Salmos.json', '20_Proverbios.json',
    '21_Eclesiastés.json', '22_Cantares.json', '23_Isaías.json', '24_Jeremías.json',
    '25_Lamentaciones.json', '26_Ezequiel.json', '27_Daniel.json', '28_Oseas.json',
    '29_Joel.json', '30_Amós.json', '31_Abdías.json', '32_Jonás.json',
    '33_Miqueas.json', '34_Nahúm.json', '35_Habacuc.json', '36_Sofonías.json',
    '37_Hageo.json', '38_Zacarías.json', '39_Malaquías.json'
  ];
  const HEBREW_INTERLINEAR_FILE_BY_SLUG = {
    genesis: '01_Génesis.json', exodo: '02_Éxodo.json', levitico: '03_Levítico.json',
    numeros: '04_Números.json', deuteronomio: '05_Deuteronomio.json', josue: '06_Josué.json',
    jueces: '07_Jueces.json', rut: '08_Rut.json', '1_samuel': '09_1_Samuel.json',
    '2_samuel': '10_2_Samuel.json', '1_reyes': '11_1_Reyes.json', '2_reyes': '12_2_Reyes.json',
    '1_cronicas': '13_1_Crónicas.json', '2_cronicas': '14_2_Crónicas.json',
    esdras: '15_Esdras.json', nehemias: '16_Nehemías.json', ester: '17_Ester.json',
    job: '18_Job.json', salmos: '19_Salmos.json', proverbios: '20_Proverbios.json',
    eclesiastes: '21_Eclesiastés.json', cantares: '22_Cantares.json', isaias: '23_Isaías.json',
    jeremias: '24_Jeremías.json', lamentaciones: '25_Lamentaciones.json',
    ezequiel: '26_Ezequiel.json', daniel: '27_Daniel.json', oseas: '28_Oseas.json',
    joel: '29_Joel.json', amos: '30_Amós.json', abdias: '31_Abdías.json',
    jonas: '32_Jonás.json', miqueas: '33_Miqueas.json', nahum: '34_Nahúm.json',
    habacuc: '35_Habacuc.json', sofonias: '36_Sofonías.json', hageo: '37_Hageo.json',
    zacarias: '38_Zacarías.json', malaquias: '39_Malaquías.json'
  };
  const GREEK_DICT_PATH = './diccionario/diccionarioG_unificado.min.json';
  const HEBREW_FALLBACK_DICT_PATH = './diccionario/diccionario_unificado.min.json';

  // ─────────────────────────────────────────────
  // UNICODE CONSTANTS (Niqqud / Dagesh)
  // ─────────────────────────────────────────────

  const N = {
    SHEVA:        '\u05B0', // ְ
    CHATEF_SEGOL: '\u05B1', // ֱ
    CHATEF_PATACH:'\u05B2', // ֲ
    CHATEF_QAMETS:'\u05B3', // ֳ
    HIREQ:        '\u05B4', // ִ
    TSERE:        '\u05B5', // ֵ
    SEGOL:        '\u05B6', // ֶ
    PATACH:       '\u05B7', // ַ
    QAMETS:       '\u05B8', // ָ
    HOLAM:        '\u05B9', // ֹ
    DAGESH:       '\u05BC', // ּ (also Shuruq in Vav)
    SHIN_DOT:     '\u05C1',
    SIN_DOT:      '\u05C2',
  };

  const GUTURALES  = new Set(['א', 'ה', 'ח', 'ע']);
  const LABIALES   = new Set(['ב', 'מ', 'פ']);
  const ALL_NIQQUD = /[\u05B0-\u05C7\u05F3\u05F4]/g;
  const HEB_LETTER = /[\u05D0-\u05EA]/;
  const CANTIL_RE  = /[\u0591-\u05AF]/g;

  // ─────────────────────────────────────────────
  // HELPERS: LETTER / NIQQUD EXTRACTION
  // ─────────────────────────────────────────────

  /** Returns the first Hebrew consonant in a string */
  function firstLetter(word) {
    const m = String(word || '').match(/[\u05D0-\u05EA]/);
    return m ? m[0] : '';
  }

  /**
   * Returns the niqqud string immediately after the first consonant.
   * E.g. "בְּ" → "ְּ"
   */
  function niqqudAfterFirst(word) {
    const m = String(word || '').match(/[\u05D0-\u05EA]([\u05B0-\u05C7]*)/);
    return m ? m[1] : '';
  }

  /** Advance past the first consonant + its niqqud cluster */
  function advancePastFirst(word) {
    const m = String(word || '').match(/^([\u05D0-\u05EA][\u05B0-\u05C7]*)(.*)/s);
    return m ? m[2] : '';
  }

  /** Strip all niqqud (optionally keep them) */
  function stripNiqqud(word) {
    return String(word || '').replace(ALL_NIQQUD, '').replace(CANTIL_RE, '');
  }

  // ─────────────────────────────────────────────
  // TOKEN NORMALIZATION  (unchanged from v1.0)
  // ─────────────────────────────────────────────

  const EDGE_PUNCTUATION_REGEX =
    /^[\s.,;:!?¡¿()\[\]{}"'""''«»··;·᾽᾿ʼʹʽ\-‐‑‒–—―]+|[\s.,;:!?¡¿()\[\]{}"'""''«»··;·᾽᾿ʼʹʽ\-‐‑‒–—―]+$/g;

  function normalizeToken(token, isHebrew, isGreek = false, preserveHebrewPoints = false) {
    let clean = String(token || '').trim();
    clean = clean.replace(/[\u200c-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, '');
    clean = clean.replace(EDGE_PUNCTUATION_REGEX, '');
    clean = clean.replace(/[\u200c-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, '');

    if (isHebrew) {
      clean = clean.replace(/[\u0591-\u05AF]/g, ''); // cantilation
      if (!preserveHebrewPoints) {
        clean = clean.replace(/[\u05B0-\u05BC\u05BD\u05BF\u05C1-\u05C2\u05C7]/g, '');
      }
      clean = clean.replace(/[\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4]/g, '');
    }
    if (isGreek) {
      clean = clean.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      clean = clean.replace(/[^\p{Script=Greek}]+/gu, '');
    }
    return clean.toLowerCase();
  }

  function getGreekLookupCandidates(token) {
    const direct = normalizeToken(token, false, true);
    const candidates = new Set();
    if (direct) candidates.add(direct);

    const compact = direct.replace(/[··;,.!?…]/g, '');
    if (compact) candidates.add(compact);

    if (compact && compact.endsWith('\u03c3\u03b9')) {
      candidates.add(`${compact}\u03bd`);
    }
    if (compact && compact.endsWith('\u03bd')) {
      candidates.add(compact.slice(0, -1));
    }
    return [...candidates].filter(Boolean);
  }

  function lookupGreekGloss(targetMap, token) {
    for (const key of getGreekLookupCandidates(token)) {
      const gloss = targetMap.get(key);
      if (gloss) return gloss;
    }
    return '-';
  }

  // Limpia solo bordes (puntuacion/corchetes) sin alterar letras hebreas internas.
  function sanitizeTokenForAnalysis(token) {
    let clean = String(token || '').trim();
    clean = clean.replace(/[\u200c-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, '');
    clean = clean.replace(
      /^[\s.,;:!?¡¿()\[\]{}"'""''«»·;]+|[\s.,;:!?¡¿()\[\]{}"'""''«»·;]+$/g,
      ''
    );
    clean = clean.replace(/^[\u05C3]+|[\u05C3]+$/g, '');
    return clean.trim();
  }

  function normalizeGloss(gloss) {
    const clean = String(gloss || '').replace(/\s+/g, ' ').trim();
    return clean || '-';
  }

  function takeFirstGloss(value) {
    if (!value) return '-';
    if (Array.isArray(value)) {
      const first = value.find((item) => String(item || '').trim());
      return first ? String(first).trim() : '-';
    }
    return String(value).trim() || '-';
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  GRAMMAR ENGINE v2.0
  //  Implements: BKL / Min / Vav / Artículo / Constructo / Binyanim / Sufijos
  // ─────────────────────────────────────────────────────────────────────────

  // ── ET MARKER ──────────────────────────────────────────────────────────

  const ET_FORMS = new Set(['אֵת', 'אֶת', 'את', 'אֵת־', 'אֶת־']);

  function detectEtMarker(word) {
    const bare = String(word || '').replace(CANTIL_RE, '').replace(/[\u05BE]/g, '');
    return ET_FORMS.has(bare);
  }

  // ── VAV PREFIX ─────────────────────────────────────────────────────────

  /**
   * Analyzes the Vav prefix (conjunction vs. consecutive).
   *
   * VOCALIZACIÓN CLAVE (del árbol de decisión v3.0):
   *   - וַ + Dagesh en siguiente → Vav Consecutiva Yiqtol→Qatal (pasado narrativo)
   *   - וָא (Qamets + Aleph)     → Consecutiva ante Aleph (rechazo al Dagesh)
   *   - וּ                        → Conjunción ante labial / Sheva
   *   - וְ                        → Conjunción estándar
   */
  function analyzeVavPrefix(word) {
    if (firstLetter(word) !== 'ו') return null;

    const myNiqqud  = niqqudAfterFirst(word);
    const rest      = advancePastFirst(word);
    const nextLetter = firstLetter(rest);
    const nextNiqqud = niqqudAfterFirst(rest);
    const nextHasDagesh = nextNiqqud.includes(N.DAGESH);

    // Vav Consecutiva: Pathach + Dagesh Forte en siguiente consonante
    if (myNiqqud.includes(N.PATACH) && nextHasDagesh) {
      return {
        type: 'VAV_CONSECUTIVA', ruleId: 'FUTURO_A_PASADO',
        description: 'Vav Consecutiva (וַיּ): Yiqtol → Qatal. Narrativa histórica hebrea.',
        es: 'y', isConsecutive: true, temporalShift: 'yiqtol→pasado'
      };
    }
    // Vav Consecutiva + Aleph (Qamets + Aleph → Pathach rechazado)
    if (myNiqqud.includes(N.QAMETS) && nextLetter === 'א') {
      return {
        type: 'VAV_CONSECUTIVA_ALEPH', ruleId: 'FUTURO_A_PASADO',
        description: 'Vav Consecutiva + Aleph: Pathach→Qamets (rechazo Dagesh ante Aleph).',
        es: 'y', isConsecutive: true, temporalShift: 'yiqtol→pasado'
      };
    }
    // Vav Shuruq → ante labial o consonante con Sheva
    if (myNiqqud.includes(N.DAGESH) /* וּ */ &&
        (LABIALES.has(nextLetter) || nextNiqqud.startsWith(N.SHEVA))) {
      return {
        type: 'VAV_CONJUNCION_SHURUQ', ruleId: 'VAV_CONJUNCION',
        description: 'Conjunción וּ (Shuruq) ante labial o Sheva.',
        es: 'y', isConsecutive: false
      };
    }
    // Vav estándar ante gutural con Chatef → toma vocal corta del Chatef
    if (GUTURALES.has(nextLetter) && (
        nextNiqqud.startsWith(N.CHATEF_PATACH) ||
        nextNiqqud.startsWith(N.CHATEF_SEGOL)  ||
        nextNiqqud.startsWith(N.CHATEF_QAMETS))) {
      return {
        type: 'VAV_CONJUNCION_CHATEF', ruleId: 'VAV_CONJUNCION',
        description: 'Conjunción Vav ante gutural con Chatef: toma vocal corta del Chatef.',
        es: 'y', isConsecutive: false
      };
    }
    // Vav estándar (וְ)
    return {
      type: 'VAV_CONJUNCION', ruleId: 'VAV_CONJUNCION',
      description: 'Conjunción "y" estándar (וְ).',
      es: 'y', isConsecutive: false
    };
  }

  // ── ARTÍCULO DEFINIDO ──────────────────────────────────────────────────

  function analyzeArticle(word) {
    if (firstLetter(word) !== 'ה') return null;
    const niqqud = niqqudAfterFirst(word);
    const rest = advancePastFirst(word);
    const nextLetter = firstLetter(rest);
    const nextNiqqud = niqqudAfterFirst(rest);
    const nextHasDagesh = nextNiqqud.includes(N.DAGESH);
    const articleVowel = niqqud.includes(N.PATACH) || niqqud.includes(N.QAMETS);

    // Evita falsos positivos (ej. ???????): art?culo real suele marcar Dagesh
    // en la siguiente consonante o excepci?n gutural/resh.
    if (articleVowel && (nextHasDagesh || GUTURALES.has(nextLetter) || nextLetter === '\u05E8' || (nextLetter === '\u05D9' && nextNiqqud.startsWith(N.SHEVA)))) {
      return {
        ruleId: 'ARTICULO_DEFINIDO',
        description: 'Articulo definido ??/?? ? la palabra es DEFINIDA.',
        es: 'el/la', isDefinite: true
      };
    }
    return null;
  }

  // Artículo especial ante guturales: הֶ + gutural (virtual doubling)
  function analyzeGuturalArticle(word) {
    const letter = firstLetter(word);
    if (letter !== '\u05D4') return null;
    const myNiqqud = niqqudAfterFirst(word);
    if (!myNiqqud.includes(N.SEGOL)) return null;
    const rest = advancePastFirst(word);
    const nextL = firstLetter(rest);
    if (nextL === '\u05E2' || nextL === '\u05D4' || nextL === '\u05D7') {
      return {
        ruleId: 'ARTICULO_GUTURAL_SEGOL',
        es: 'el/la',
        isDefinite: true,
        description: 'Artículo הֶ ante gutural con compensación fonológica.'
      };
    }
    return null;
  }

  const BKL_MAP = {
    'ב': { es: 'en',     label: 'Beth'  },
    'כ': { es: 'como',   label: 'Kaph'  },
    'ל': { es: 'a/para', label: 'Lamed' }
  };

  /**
   * Full BKL decision tree (árbol de decisión de reglas_gramaticales.json):
   *   SINCOPE_ARTICULO  → Pathach/Qamets + Dagesh en siguiente = artículo oculto
   *   REGLA_CHATEF      → Gutural con Chatef → prefijo toma vocal corta
   *   REGLA_YOD_QUIESC  → Yod + Sheva → Hireq + Yod quiescente
   *   REGLA_DOS_SHEVAS  → Segunda consonante con Sheva → prefijo toma Hireq
   *   REG_01_DEFAULT    → Sheva vocal estándar
   */
  function analyzeBKLPrefix(word) {
    const letter = firstLetter(word);
    if (!BKL_MAP[letter]) return null;

    // Evita dividir el sustantivo lexical בני ("hijos de...") como si fuera ב + prefijo.
    if (letter === 'ב' && stripNiqqud(word) === '\u05D1\u05E0\u05D9' && /ֵי$/.test(word)) {
      return null;
    }

    const info     = BKL_MAP[letter];
    const myNiqqud = niqqudAfterFirst(word);
    const rest     = advancePastFirst(word);
    const nextL    = firstLetter(rest);
    const nextN    = niqqudAfterFirst(rest);
    const nextHasDagesh = nextN.includes(N.DAGESH);

    // SINCOPE_ARTICULO: preposición + Pathach/Qamets + Dagesh forte → artículo oculto
    if ((myNiqqud.includes(N.PATACH) || myNiqqud.includes(N.QAMETS)) && nextHasDagesh) {
      return {
        ruleId: 'SINCOPE_ARTICULO', letter, info,
        description: `La preposición "${letter}" absorbió al artículo הַ. ¡Palabra DEFINIDA! (exégesis: específico, conocido).`,
        es: info.es, hasHiddenArticle: true
      };
    }



    // SINCOPE_ARTICULO (excepci?n): gutural/resh no aceptan Dagesh Forte.
    // Si B/K/L toma Pathach/Qamets ante gutural o ?, tambi?n puede indicar art?culo oculto.
    if ((myNiqqud.includes(N.PATACH) || myNiqqud.includes(N.QAMETS)) && (GUTURALES.has(nextL) || nextL === '\u05E8')) {
      return {
        ruleId: 'SINCOPE_ARTICULO', letter, info,
        description: `La preposici?n "${letter}" absorbi? al art?culo definido ante ${nextL} (sin Dagesh por restricci?n fonol?gica).`,
        es: info.es, hasHiddenArticle: true
      };
    }

    // Variante general: prefijo B/K/L con Segol ante gutural (contraccion fonologica).
    if (myNiqqud.includes(N.SEGOL) && GUTURALES.has(nextL)) {
      return {
        ruleId: 'REGLA_CHATEF', letter, info,
        description: 'Prefijo con Segol ante gutural: forma contracta valida de BKL.',
        es: info.es, hasHiddenArticle: false
      };
    }

    // REGLA_CHATEF: gutural con vocal reducida
    if (GUTURALES.has(nextL)) {
      // Excepcion especial Elohim (debe evaluarse antes del caso general CHATEF_SEGOL)
      if (nextL === 'א' && nextN.startsWith(N.CHATEF_SEGOL) && word.includes('לה')) {
        return { ruleId: 'REGLA_CHATEF_ELOHIM', letter, info, description: 'Excepcion Elohim: prefijo toma Tsere (ֵ), Aleph quiescente.', es: info.es, hasHiddenArticle: false };
      }

      if (nextN.startsWith(N.CHATEF_PATACH))
        return { ruleId: 'REGLA_CHATEF', letter, info, description: `Gutural (${nextL}) con Chatef Pathach -> prefijo toma Pathach (ַ).`, es: info.es, hasHiddenArticle: false };
      if (nextN.startsWith(N.CHATEF_SEGOL))
        return { ruleId: 'REGLA_CHATEF', letter, info, description: `Gutural (${nextL}) con Chatef Segol -> prefijo toma Segol (ֶ).`, es: info.es, hasHiddenArticle: false };
      if (nextN.startsWith(N.CHATEF_QAMETS))
        return { ruleId: 'REGLA_CHATEF', letter, info, description: `Gutural (${nextL}) con Chatef Qamets -> prefijo toma Qamets-Chatuf (ָ).`, es: info.es, hasHiddenArticle: false };
    }

    // REGLA_YOD_QUIESCENTE: Yod + Sheva inicial → Hireq + Yod quiescente
    if (nextL === 'י' && nextN.startsWith(N.SHEVA) && myNiqqud.includes(N.HIREQ)) {
      return { ruleId: 'REGLA_YOD_QUIESCENTE', letter, info, description: 'Yod inicial pierde Sheva → quiescente (vocal larga i). No pronunciar la Y consonántica.', es: info.es, hasHiddenArticle: false };
    }

    // REGLA_DOS_SHEVAS: consonante siguiente con Sheva → prefijo toma Hireq
    if (nextN.startsWith(N.SHEVA) && myNiqqud.includes(N.HIREQ)) {
      // FIX: si el prefijo viene con Hireq funcional (ej. וְכִ...), se mantiene como BKL.
      return { ruleId: 'REGLA_DOS_SHEVAS', letter, info, description: 'Prefijo toma Hireq por colisión de Shevas.', es: info.es, hasHiddenArticle: false };
    }

    // Evita falsos splits BKL en ra?ces l?xicas iniciales (ej. ??????).
    // El caso default BKL requiere vocal funcional del prefijo (Sheva/Hireq).
    if (!myNiqqud.includes(N.SHEVA) && !myNiqqud.includes(N.HIREQ)) return null;

    // REG_01_DEFAULT: Sheva vocal estándar
    return { ruleId: 'REG_01_DEFAULT', letter, info, description: 'Preposición BKL estándar con Sheva vocal.', es: info.es, hasHiddenArticle: false };
  }

  // ── MIN PREFIX ─────────────────────────────────────────────────────────

  /**
   * Min (מִן) decision tree:
   *   ASIMILACION_FUERTE      → consonante normal + Dagesh Forte (Nun perdida)
   *   ALARGAMIENTO_COMPENSATORIO → gutural/Resh → Hireq→Tsere
   *   DUPLICACION_VIRTUAL     → Het: Hireq sin Dagesh
   */
  function analyzeMinPrefix(word) {
    if (firstLetter(word) !== 'מ') return null;
    const myNiqqud = niqqudAfterFirst(word);
    // Must have Hireq or Tsere to be Min (not just any Mem)
    if (!myNiqqud.includes(N.HIREQ) && !myNiqqud.includes(N.TSERE)) return null;

    const rest    = advancePastFirst(word);
    const nextL   = firstLetter(rest);
    const nextN   = niqqudAfterFirst(rest);
    const hasDagesh = nextN.includes(N.DAGESH);

    // Dagesh Forte → Nun assimilated
    if (myNiqqud.includes(N.HIREQ) && hasDagesh && !GUTURALES.has(nextL) && nextL !== 'ר') {
      return { ruleId: 'ASIMILACION_FUERTE', description: `מִן + ${nextL} (no gutural): Dagesh Forte compensa Nun perdida.`, es: 'de/desde' };
    }
    // Het: virtual doubling (Hireq, no Dagesh)
    if (nextL === 'ח') {
      return { ruleId: 'DUPLICACION_VIRTUAL', description: 'מִן + ח: Hireq sin Dagesh (duplicación virtual de Het).', es: 'de/desde' };
    }
    // Gutural or Resh: compensatory lengthening Hireq→Tsere
    if (GUTURALES.has(nextL) || nextL === 'ר') {
      return { ruleId: 'ALARGAMIENTO_COMPENSATORIO', description: `מִן + ${nextL} (gutural/Resh): Hireq se alarga a Tsere (compensatorio).`, es: 'de/desde' };
    }
    // Tsere without explanation → still Min
    if (myNiqqud.includes(N.TSERE)) {
      return { ruleId: 'ALARGAMIENTO_COMPENSATORIO', description: 'מִן con Tsere: alargamiento compensatorio detectado.', es: 'de/desde' };
    }
    return null;
  }

  // ── CONSTRUCT STATE (Smikhut) ──────────────────────────────────────────

  /**
   * Detects construct state by looking at terminal vowel patterns.
   * Returns { isConstruct, gender, number, description } or null.
   */
  function analyzeConstructState(word) {
    // Femenino singular: -ַת (-at)
    if (/ַת$/.test(word))
      return { isConstruct: true, gender: 'F', number: 'Sg', description: 'F.Sg constructo (-at): "la X de..."' };
    // Masculino plural: -ֵי (-ei)
    if (/ֵי$/.test(word))
      return { isConstruct: true, gender: 'M', number: 'Pl', description: 'M.Pl constructo (-ei): "los X de..."' };
    // Femenino plural constructo: misma forma que absoluta -ות
    // (context-dependent; se marca si viene seguido de nombre propio o artículo)
    return { isConstruct: false };
  }

  // ── GENDER & NUMBER ────────────────────────────────────────────────────

  function analyzeGenderNumber(word) {
    // Dual: -ַיִם / -ָיִם
    if (/ַיִם$|ָיִם$/.test(word))
      return { gender: 'Dual', number: 'Dual', description: 'Dual (-ayim): par natural (ojos, manos, orejas)' };
    // M. Pl: -ִים
    if (/ִים$/.test(word))
      return { gender: 'M', number: 'Pl', description: 'M.Pl (-im)' };
    // F. Pl: -וֹת / -ות
    if (/וֹת$|ות$/.test(word))
      return { gender: 'F', number: 'Pl', description: 'F.Pl (-ot)' };
    // F. Sg: -ָה / -ֶת
    if (/ָה$|ֶת$/.test(word))
      return { gender: 'F', number: 'Sg', description: 'F.Sg (-ah/-et)' };
    // Default: M. Sg
    return { gender: 'M', number: 'Sg', description: 'M.Sg (raíz base)' };
  }

  // ── BINYANIM DETECTOR ─────────────────────────────────────────────────

  const BINYAN_RULES = [
    {
      name: 'HITPAEL', es: 'reflexivo intensivo', marker: 'prefijo הִתְ/מִתְ',
      test: (w) => /^(?:\u05D4\u05B4\u05EA\u05B0|\u05DE\u05B4\u05EA\u05B0|\u05D5\u05BC\u05DE\u05B4\u05EA\u05B0|\u05D5\u05B0\u05D4\u05B4\u05EA\u05B0)/.test(w)
    },
    {
      name: 'HIFIL', es: 'causativo', marker: 'prefijo הִ/הַ + Yod interna',
      test: (w) => /^הִ/.test(w) || /^הַ/.test(w) || /^יַ[א-ת]ֵ/.test(w)
    },
    {
      name: 'NIFAL', es: 'pasivo/reflexivo', marker: 'prefijo נִ',
      test: (w) => /^נִ/.test(w) || /^נַ/.test(w)
    },
    {
      name: 'PIEL', es: 'intensivo activo', marker: 'Dagesh Forte en 2ª raíz',
      // Piel: typically 3-letter root where 2nd letter has Dagesh
      // We detect: C₁ + vowel + C₂ּ (Dagesh) pattern
      test: (w) => {
        const m = w.match(/^[\u05D0-\u05EA][\u05B0-\u05C7]+[\u05D0-\u05EA]\u05BC/);
        return !!m;
      }
    },
    {
      name: 'QAL', es: 'acción simple activa', marker: 'sin prefijo especial',
      test: () => true // fallback
    }
  ];

  function analyzeBinyan(word) {
    for (const b of BINYAN_RULES) {
      if (b.test(word)) return b;
    }
    return BINYAN_RULES[BINYAN_RULES.length - 1];
  }

  // ── VERBAL CONJUGATION (Qatal / Yiqtol) ────────────────────────────────

  // Qatal (perfect) — identified by SUFFIXES
  const QATAL_SUFFIXES = [
    { suffix: 'תִּי', pgn: '1cs', es: 'yo'            },
    { suffix: 'תָּ',  pgn: '2ms', es: 'tú (m)'        },
    { suffix: 'תְּ',  pgn: '2fs', es: 'tú (f)'        },
    { suffix: 'נוּ',  pgn: '1cp', es: 'nosotros'       },
    { suffix: 'תֶּם', pgn: '2mp', es: 'vosotros (m)'   },
    { suffix: 'תֶּן', pgn: '2fp', es: 'vosotras (f)'   },
    { suffix: 'וּ',   pgn: '3cp', es: 'ellos/ellas'    },
    { suffix: 'ָה',   pgn: '3fs', es: 'ella'           },
    // 3ms = raíz pura
  ];

  // Yiqtol (imperfect) — identified by PREFIXES on the root after BKL/Vav stripped
  const YIQTOL_PREFIXES = [
    { prefix: 'א',  pgn: '1cs', es: 'yo (futuro)'         },
    { prefix: 'תּ', pgn: '2ms', es: 'tú (futuro m)'       },
    { prefix: 'ת',  pgn: '2ms', es: 'tú (futuro m)'       },
    { prefix: 'יּ', pgn: '3ms', es: 'él (futuro)'         },
    { prefix: 'י',  pgn: '3ms', es: 'él (futuro)'         },
    { prefix: 'נ',  pgn: '1cp', es: 'nosotros (futuro)'   },
  ];

  function analyzeVerbalForm(root, isConsecutive) {
    // If preceded by Vav Consecutiva, it's Wayyiqtol (inverted past)
    if (isConsecutive) {
      const binyan = analyzeBinyan(root);
      // Try to detect person from Yiqtol prefix on root
      for (const yp of YIQTOL_PREFIXES) {
        if (root.startsWith(yp.prefix)) {
          return { tense: 'WAYYIQTOL', pgn: yp.pgn, es: yp.es.replace('futuro', 'pasado narrativo'), binyan };
        }
      }
      return { tense: 'WAYYIQTOL', pgn: '3ms', es: 'él (pasado narrativo)', binyan };
    }
    // Check Qatal suffixes
    for (const qs of QATAL_SUFFIXES) {
      if (root.endsWith(qs.suffix)) {
        const binyan = analyzeBinyan(root);
        return { tense: 'QATAL', pgn: qs.pgn, es: qs.es, binyan };
      }
    }
    // Check Yiqtol prefixes
    for (const yp of YIQTOL_PREFIXES) {
      if (root.startsWith(yp.prefix)) {
        const binyan = analyzeBinyan(root);
        return { tense: 'YIQTOL', pgn: yp.pgn, es: yp.es, binyan };
      }
    }
    return null;
  }

  // Detecta reduplicación de radical final (polel/pilpel/polal poético/intensivo).
  function detectReduplication(word) {
    const plain = stripNiqqud(word);
    if (plain.length >= 4 && plain[plain.length - 2] === plain[plain.length - 3]) {
      return { type: 'REDUPLICACION', desc: 'Raíz con reduplicación de radical (intensivo poético).' };
    }
    return null;
  }

  // ── PRONOMINAL SUFFIXES ────────────────────────────────────────────────

  // Plural-possession (object is plural) — Yod intercalada antes del sufijo
  const PRON_SUFFIXES_PL = [
    { suffix: 'ַי',    pgn: '1cs', es: 'mis'         },
    { suffix: 'ֶיךָ',  pgn: '2ms', es: 'tus'         },
    { suffix: 'ַיִךְ', pgn: '2fs', es: 'tus (f)'     },
    { suffix: 'ָיו',   pgn: '3ms', es: 'sus'         },
    { suffix: 'ֶיהָ',  pgn: '3fs', es: 'sus (f)'     },
    { suffix: 'ֵינוּ', pgn: '1cp', es: 'nuestros'    },
    { suffix: 'ֵיכֶם', pgn: '2mp', es: 'vuestros'    },
    { suffix: 'ֵיכֶן', pgn: '2fp', es: 'vuestras'    },
    { suffix: 'ֵיהֶם', pgn: '3mp', es: 'sus (pl m)'  },
    { suffix: 'ֵיהֶן', pgn: '3fp', es: 'sus (pl f)'  },
    { suffix: '\u05B5\u05D9\u05DB\u05B6\u05DD', pgn: '2mp', es: 'vuestros', objectPlural: true }, // -ֵיכֶם
    { suffix: '\u05B5\u05D9\u05D4\u05B6\u05DD', pgn: '3mp', es: 'de ellos', objectPlural: true }, // -ֵיהֶם
    { suffix: '\u05B8\u05D9\u05D5', pgn: '3ms', es: 'sus', objectPlural: true }, // -ָיו
    { suffix: '\u05B5\u05D9\u05DE\u05D5\u05B9', pgn: '3mp', es: 'sus', description: 'Sufijo poetico arcaico (ellos)' },
    { suffix: '\u05B5\u05DE\u05D5\u05B9',  pgn: '3mp', es: 'a ellos', description: 'Sufijo poetico de objeto' }
  ];

  // Singular-possession (object is singular)
  const PRON_SUFFIXES_SG = [
    { suffix: '\u05DA\u05B8',   pgn: '2ms', es: 'tu'          },
    { suffix: '\u05D4\u05D5\u05BC', pgn: '3ms', es: 'su'          },
    { suffix: '\u05D4\u05B6\u05DD', pgn: '3mp', es: 'su (pl m)'   },
    { suffix: '\u05D4\u05B6\u05DF', pgn: '3fp', es: 'su (pl f)'   },
    { suffix: '\u05D4\u05B8',   pgn: '3fs', es: 'su (f)'      },
    { suffix: 'ִי',   pgn: '1cs', es: 'mi'          },
    { suffix: 'ְךָ',  pgn: '2ms', es: 'tu'          },
    { suffix: 'ֵךְ',  pgn: '2fs', es: 'tu (f)'      },
    { suffix: 'וֹ',   pgn: '3ms', es: 'su'          },
    { suffix: 'ָהּ',  pgn: '3fs', es: 'su (f)'      },
    { suffix: 'ֵנוּ', pgn: '1cp', es: 'nuestro'     },
    { suffix: 'ְכֶם', pgn: '2mp', es: 'vuestro'     },
    { suffix: 'ְכֶן', pgn: '2fp', es: 'vuestra'     },
    { suffix: 'ָם',   pgn: '3mp', es: 'su (pl m)'   },
    { suffix: 'ָן',   pgn: '3fp', es: 'su (pl f)'   },
  ];

  // Verbal object suffixes (me, te, lo, nos, etc.)
  const PRON_SUFFIXES_VERBAL = [
    { suffix: '\u05E0\u05BC\u05D5\u05BC', pgn: '3ms', es: 'lo', type: 'OBJ' }, // -נּוּ
    { suffix: '\u05B6\u05E0\u05B0\u05D4\u05D5\u05BC', pgn: '3ms', es: 'lo', type: 'OBJ' }, // -ֶנְהוּ
    { suffix: '\u05EA\u05B4\u05BC\u05D9\u05DD', pgn: '3mp', es: 'los', type: 'OBJ' }, // -תִּים
    { suffix: '\u05D5\u05BC\u05DD', pgn: '3mp', es: 'los', type: 'OBJ' }, // -וּם
    { suffix: '\u05B4\u05D9\u05DD', pgn: '3mp', es: 'los', type: 'OBJ' }, // -ִים
    { suffix: '\u05E0\u05B4\u05D9', pgn: '1cs', es: 'me', type: 'OBJ' }, // -נִי
    { suffix: '\u05DA\u05B8', pgn: '2ms', es: 'te', type: 'OBJ' }, // -ךָ
    { suffix: '\u05D4\u05D5\u05BC', pgn: '3ms', es: 'lo', type: 'OBJ' } // -הוּ
  ];

  // Extended layer (v2.5): energetic/object combined and poetic forms.
  // This layer is additive and evaluated before legacy sets.
  const PRON_SUFFIXES_EXTENDED = [
    { suffix: '\u05B6\u05E0\u05BC\u05D5\u05BC', pgn: '3ms', es: 'lo', type: 'OBJ_ENERG', desc: 'Sufijo energético (él/lo)' }, // -ֶנּוּ
    { suffix: '\u05B6\u05E0\u05B0\u05D4\u05D5\u05BC', pgn: '3ms', es: 'lo', type: 'OBJ_ENERG', desc: 'Sufijo arcaico/poético (lo)' }, // -ֶנְהוּ
    { suffix: '\u05B6\u05E0\u05B4\u05BC\u05D9', pgn: '1cs', es: 'me', type: 'OBJ_ENERG', desc: 'Sufijo energético (a mí)' }, // -ֶנִּי
    { suffix: '\u05D5\u05BC\u05DD', pgn: '3mp', es: 'los', type: 'OBJ', desc: 'Sufijo de objeto directo (ellos/los)' }, // -וּם
    { suffix: '\u05D5\u05BC\u05E0\u05B4\u05D9', pgn: '1cs', es: 'me', type: 'OBJ', desc: 'Sufijo de objeto (a mí) con Vav conectiva' }, // -וּנִי
    { suffix: '\u05B6\u05DA\u05B8', pgn: '2ms', es: 'te/ti', type: 'OBJ', desc: 'Sufijo de objeto (a ti)' } // -ֶךָ
  ];
  // v2.5 integrado: solo se agregan formas no cubiertas por capas previas.
  const PRON_SUFFIXES_VERBAL_V25 = [
    { suffix: '\u05B6\u05E0\u05BC\u05B8\u05D4', pgn: '3fs', es: 'la', type: 'OBJ_ENERG', desc: 'Sufijo energético 3fs' }, // -ֶנָּה
    { suffix: '\u05B0\u05DA\u05B8\u05BC', pgn: '2ms', es: 'te', type: 'OBJ_REFORZADO', desc: 'Sufijo reforzado 2ms' } // -ְךָּ
  ];
  // v2.5.1: formas pausales/reducción con Nun dageshada.
  const PRON_SUFFIXES_V25_1 = [
    { suffix: '\u05B6\u05E0\u05BC\u05B8\u05D4', pgn: '3fs', es: 'la', type: 'OBJ_ENERG', desc: 'Nun Energética 3fs (ej: יִשְׁכָּבֶנָּה)' }, // -ֶנָּה
    { suffix: '\u05B6\u05E0\u05BC\u05D5\u05BC', pgn: '3ms', es: 'lo', type: 'OBJ_ENERG', desc: 'Nun Energética 3ms (ej: תְחַלְּלֶנּוּ)' }, // -ֶנּוּ
    { suffix: '\u05B6\u05DA\u05BC\u05B8', pgn: '2ms', es: 'te', type: 'OBJ_REFORZADO', desc: 'Sufijo reforzado pausal (ej: יַכְּכָה)' }, // -ֶךָּ
    { suffix: '\u05D5\u05BC\u05DB\u05B8', pgn: '2ms', es: 'te', type: 'OBJ_CONECT', desc: 'Objeto 2ms con Vav de unión (ej: רְדָפוּךָ)' } // -וּכָ
  ];
  // v2.5.4: variantes guturales de sufijos nominales 2mp/2fp con Chatef-Patach.
  const PRON_SUFFIXES_GUTURAL_V25 = [
    { suffix: '\u05B2\u05DB\u05B6\u05DD', pgn: '2mp', es: 'vuestro/a', desc: 'Sufijo 2mp con Chatef-Patach por gutural' }, // -ֲכֶם
    { suffix: '\u05B2\u05DB\u05B6\u05DF', pgn: '2fp', es: 'vuestra', desc: 'Sufijo 2fp con Chatef-Patach por gutural' } // -ֲכֶן
  ];
  function uniqueBySuffix(rules) {
    const seen = new Set();
    const out = [];
    for (const rule of rules) {
      const key = String(rule?.suffix || '');
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(rule);
    }
    return out;
  }
  const PRON_SUFFIXES_EXTENDED_ALL = uniqueBySuffix([
    ...PRON_SUFFIXES_V25_1,
    ...PRON_SUFFIXES_VERBAL_V25,
    ...PRON_SUFFIXES_EXTENDED
  ]);

  function analyzePronominalSuffix(word) {
    const plain = stripNiqqud(word);
    // Protección v2.5.2: evitar falsos sufijos en formas apocopadas de היה.
    if (APOCOPATED_HAYAH_FORMS.has(plain)) return null;

    const suffixMatches = (value, suffix) => {
      if (!value || !suffix) return false;
      return value.endsWith(suffix);
    };
    const hasRoom = (value, suffix) => {
      return value.length > suffix.length;
    };

    // 0) Capa v2.5.4: variantes guturales nominales (se evalúa antes para evitar falsos OBJ).
    for (const r of PRON_SUFFIXES_GUTURAL_V25) {
      if (suffixMatches(word, r.suffix) && hasRoom(word, r.suffix)) {
        return {
          ...r,
          objectPlural: false,
          stem: word.slice(0, -r.suffix.length),
          ruleId: 'SUFIJO_GUTURAL_V25',
          type: 'NOM',
          description: r.desc
        };
      }
    }

    // 0) Capa extendida (v2.5): sufijos energéticos/poéticos/combinados
    let extendedCandidate = null;
    for (const r of PRON_SUFFIXES_EXTENDED_ALL) {
      if (suffixMatches(word, r.suffix) && hasRoom(word, r.suffix)) {
        extendedCandidate = {
          ...r,
          objectPlural: false,
          stem: word.slice(0, -r.suffix.length),
          ruleId: 'SUFIJO_PRONOMINAL_EXTENDIDO',
          type: r.type || 'OBJ',
          description: r.desc || `Sufijo pronominal extendido: ${r.suffix} (${r.pgn} = ${r.es}).`
        };
        break;
      }
    }

    // 1) Primero sufijos plurales (mas especificos: -?????, etc.)
    for (const r of PRON_SUFFIXES_PL) {
      if (suffixMatches(word, r.suffix) && hasRoom(word, r.suffix)) {
        return { ...r, objectPlural: true,
          stem: word.slice(0, -r.suffix.length),
          ruleId: 'SUFIJO_PRONOMINAL_PL',
          type: 'NOM',
          description: r.description || `Sufijo pronominal plural: ${r.suffix} (${r.pgn} = ${r.es}).`
        };
      }
    }

    // 2) Luego sufijos singulares nominales (candidato)
    let nominalCandidate = null;
    for (const r of PRON_SUFFIXES_SG) {
      if (suffixMatches(word, r.suffix) && hasRoom(word, r.suffix)) {
        nominalCandidate = { ...r, objectPlural: false,
          stem: word.slice(0, -r.suffix.length),
          ruleId: 'SUFIJO_PRONOMINAL_SG',
          type: 'NOM',
          description: `Sufijo pronominal singular: ${r.suffix} (${r.pgn} = ${r.es}).`
        };
        break;
      }
    }

    // 3) Al final sufijos verbales de objeto directo (candidato)
    let verbalCandidate = null;
    for (const r of PRON_SUFFIXES_VERBAL) {
      if (suffixMatches(word, r.suffix) && hasRoom(word, r.suffix)) {
        verbalCandidate = {
          ...r,
          objectPlural: false,
          stem: word.slice(0, -r.suffix.length),
          ruleId: 'SUFIJO_PRONOMINAL_VERBAL',
          type: 'OBJ',
          description: `Sufijo pronominal verbal: ${r.suffix} (${r.pgn} = ${r.es}). Funciona como objeto directo.`
        };
        break;
      }
    }

    // 4) Desambiguación NOM vs OBJ:
    // si parece verbal (Yiqtol/Qatal), preferir objeto directo.
    const looksLikeVerbal = (candidate) => {
      if (!candidate) return false;
      const verbalStem = candidate.stem || '';
      const stemPlain = stripNiqqud(verbalStem);
      return !!analyzeVerbalForm(verbalStem, false) || /^[\u05D0\u05D9\u05EA\u05E0]/.test(stemPlain);
    };
    const isAmbiguousVerbalSuffix = (candidate) => {
      const plain = stripNiqqud(candidate?.suffix || '');
      return plain === '\u05D9\u05DD'; // -ים puede ser plural nominal o sufijo verbal
    };
    if (verbalCandidate && nominalCandidate) {
      return looksLikeVerbal(verbalCandidate) ? verbalCandidate : nominalCandidate;
    }
    if (extendedCandidate) {
      if (!String(extendedCandidate.type || '').startsWith('OBJ')) return extendedCandidate;
      if (nominalCandidate && !looksLikeVerbal(extendedCandidate)) return nominalCandidate;
      return extendedCandidate;
    }
    if (verbalCandidate) {
      if (!isAmbiguousVerbalSuffix(verbalCandidate)) return verbalCandidate;
      return looksLikeVerbal(verbalCandidate) ? verbalCandidate : null;
    }
    if (nominalCandidate) return nominalCandidate;
    return null;
  }


  // Negative existential forms (אין + sufijos)
  const NEG_EXIST_MAP = {
    '\u05D0\u05B5\u05D9\u05E0\u05B8\u05DD':  'ellos no estan',
    '\u05D0\u05B5\u05D9\u05E0\u05B6\u05E0\u05BC\u05D5\u05BC': 'el no esta',
    '\u05D0\u05B5\u05D9\u05E0\u05B5\u05E0\u05D5\u05BC': 'nosotros no estamos',
    '\u05D0\u05B5\u05D9\u05E0\u05B8\u05D4\u05BC': 'ella no esta',
    '\u05D0\u05B5\u05D9\u05E0\u05B6\u05E0\u05B4\u05BC\u05D9': 'yo no estoy',
    '\u05D0\u05B5\u05D9\u05E0\u05B0\u05DA\u05B8': 'tu no estas',
    '\u05D0\u05B5\u05D9\u05E0\u05B5\u05DA\u05B0': 'tu no estas',

    // fallback sin niqqud
    '\u05D0\u05D9\u05E0\u05DD': 'ellos no estan',
    '\u05D0\u05D9\u05E0\u05DF': 'ellas no estan',
    '\u05D0\u05D9\u05E0\u05E0\u05D5': 'el no esta / no estamos',
    '\u05D0\u05D9\u05E0\u05D4': 'ella no esta',
    '\u05D0\u05D9\u05E0\u05E0\u05D9': 'yo no estoy',
    '\u05D0\u05D9\u05E0\u05DA': 'tu no estas',
    '\u05D0\u05D9\u05E0\u05DB\u05DD': 'ustedes no estan (m)',
    '\u05D0\u05D9\u05E0\u05DB\u05DF': 'ustedes no estan (f)'
  }


  function resolveNegativeExistential(token) {
    const pointed = normalizeToken(token, true, false, true);
    const plain   = normalizeToken(token, true);
    const hasVav  = /^ו/.test(plain);
    const core_p  = hasVav ? pointed.replace(/^ו[\u05B0-\u05C7]*/, '') : pointed;
    const core_n  = hasVav ? plain.slice(1) : plain;
    const resolved = NEG_EXIST_MAP[core_p] || NEG_EXIST_MAP[core_n];
    return resolved ? (hasVav ? `y ${resolved}` : resolved) : null;
  }

  // ─────────────────────────────────────────────
  //  FULL TOKEN ANALYZER  (public API)
  // ─────────────────────────────────────────────

  /**
   * analyzeHebrewToken(token: string) → Analysis
   *
   * Returns a rich diagnostic object suitable for rendering exegetical tooltips.
   * Structure:
   * {
   *   original,        // original string
   *   prefixes[],      // [{type, ruleId, description, es}]
   *   root,            // remaining string after prefix stripping
   *   rootConsonants,  // root stripped of niqqud
   *   genderNumber,    // {gender, number, description}
   *   constructState,  // {isConstruct, ...} or null
   *   pronominalSuffix,// {pgn, es, objectPlural, stem} or null
   *   verbal,          // {tense, pgn, es, binyan} or null
   *   isDefinite,      // boolean (direct article or hidden article)
   *   isEt,            // boolean
   *   rules[],         // rule IDs applied (for debugging)
   *   debugLog[],      // human-readable debug steps (Spanish)
   *   lookupKeys[],    // all candidate keys to try against the gloss map
   * }
   */
  const LEXICAL_PARTICLES = {
    '\u05DC\u05B8\u05DE\u05BC\u05B8\u05D4': '\u00BFpor qu\u00E9?',
    '\u05DB\u05BC\u05B8\u05DE\u05BC\u05B8\u05D4': '\u00BFcu\u00E1nto?',
    '\u05DE\u05B4\u05DE\u05BC\u05B6\u05E0\u05BC\u05D5\u05BC': 'de nosotros/de \u00E9l',
    '\u05D1\u05BC\u05B0\u05E9\u05C1\u05B7\u05D2\u05BC\u05B7\u05DD': 'por cuanto / porque tambi\u00E9n',
    '\u05E2\u05D5\u05B9\u05D3\u05B6\u05E0\u05BC\u05B4\u05D9': 'estando a\u00FAn yo', // עוֹדֶנִּי
    '\u05E2\u05D5\u05D3\u05B6\u05E0\u05BC\u05B4\u05D9': 'estando a\u00FAn yo',      // עודֶנִּי
    '\u05D4\u05B7\u05DC\u05B0\u05D5\u05B4\u05D9\u05B4\u05BC\u05DD': 'los levitas', // הַלְוִיִּם
    '\u05D4\u05B7\u05DC\u05B0\u05D5\u05B4\u05D9\u05D9\u05B4\u05DD': 'los levitas'  // variante ortográfica
  };
  const LEXICAL_EXPANSION = {
    '\u05D1\u05B0\u05BC\u05E2\u05D5\u05B9\u05D3\u05B6\u05E0\u05BC\u05B4\u05D9': 'estando aún yo / mientras aún vivo', // בְּעוֹדֶנִּי
    '\u05D4\u05B7\u05DC\u05B0\u05D5\u05B4\u05D9\u05B4\u05BC\u05DD': 'los levitas (forma plena)', // הַלְוִיִּם
    '\u05D4\u05B7\u05E9\u05B0\u05C1\u05D7\u05B5\u05EA': 'destruir / corromper (Hifil Inf. Absoluto)', // הַשְׁחֵת
    '\u05D9\u05B0\u05D3\u05B5\u05D9\u05DB\u05B6\u05DD': 'vuestras manos (dual con sufijo 2mp)' // יְדֵיכֶם
  };
  const CRITICAL_VERBAL_EXCEPTIONS = {
    '\u05D5\u05B7\u05D9\u05B0\u05D4\u05B4\u05D9': 'y fue / y aconteció', // וַיְהִי
    '\u05D9\u05B0\u05D4\u05B4\u05D9': 'sea / será (jussivo)' // יְהִי
  };
  const CRITICAL_VERBAL_EXCEPTIONS_PLAIN = Object.fromEntries(
    Object.entries(CRITICAL_VERBAL_EXCEPTIONS).map(([k, v]) => [normalizeToken(k, true), v])
  );
  const APOCOPATED_HAYAH_FORMS = new Set(['\u05D5\u05D9\u05D4\u05D9', '\u05D9\u05D4\u05D9']); // ויהי, יהי
  const PRECISE_GLOSSES = {
    '\u05D8\u05B8\u05E8\u05B0\u05D7\u05B2\u05DB\u05B6\u05DD': 'vuestra fatiga / vuestro pesado cargo', // טָרְחֲכֶם
    '\u05DE\u05B7\u05E9\u05BC\u05C2\u05B8\u05D0\u05B2\u05DB\u05B6\u05DD': 'vuestra carga / vuestro peso', // מַשָּׂאֲכֶם
    '\u05E8\u05B4\u05D9\u05D1\u05B0\u05DB\u05B6\u05DD': 'vuestra contienda / vuestro pleito' // רִיבְכֶם
  };
  const PRECISE_GLOSSES_PLAIN = Object.fromEntries(
    Object.entries(PRECISE_GLOSSES).map(([k, v]) => [normalizeToken(k, true), v])
  );
  const DIVINE_PREFIX_RE = /^[\u05D5\u05D1\u05DB\u05DC\u05DE\u05E9\u05D4][\u05B0-\u05BC\u05C1-\u05C2\u05C4-\u05C7]*/;
  function splitHebrewLetterClusters(pointed) {
    return String(pointed || '').match(/[\u05D0-\u05EA][\u05B0-\u05BC\u05C1-\u05C2\u05C4-\u05C7]*/g) || [];
  }
  function resolveDivineNameGloss(token) {
    const pointed = normalizeToken(token, true, false, true);
    if (!pointed) return null;

    const pointedCore = String(pointed).replace(DIVINE_PREFIX_RE, '') || pointed;
    const plainCore = stripNiqqud(pointedCore);
    const clusters = splitHebrewLetterClusters(pointedCore);

    if (plainCore === '\u05D9\u05D4\u05D5\u05D4') {
      const secondLetter = clusters[1] || '';
      const thirdLetter = clusters[2] || '';
      if (secondLetter.includes(N.HIREQ)) return 'Elohim';
      if (secondLetter.includes(N.QAMETS) && thirdLetter.includes(N.HOLAM)) return 'Adonai';
      return 'Hashem';
    }

    if (plainCore === '\u05D0\u05D3\u05E0\u05D9') return 'Adonai';
    if (plainCore === '\u05D0\u05DC\u05D4\u05D9\u05DD') return 'Elohim';
    return null;
  }
  function resolvePreciseGloss(token, analysis = null) {
    const candidates = new Set();
    const add = (value) => {
      if (!value) return;
      const pointed = normalizeToken(value, true, false, true);
      const plain = normalizeToken(value, true);
      if (pointed) candidates.add(pointed);
      if (plain) candidates.add(plain);
    };
    add(token);
    if (analysis) {
      add(analysis.root);
      add(analysis.pronominalSuffix?.stem);
      for (const k of (analysis.lookupKeys || [])) add(k);
    }
    for (const key of candidates) {
      if (PRECISE_GLOSSES[key]) return PRECISE_GLOSSES[key];
      if (PRECISE_GLOSSES_PLAIN[key]) return PRECISE_GLOSSES_PLAIN[key];
    }
    return null;
  }
  const ALL_LEXICAL_PARTICLES = { ...LEXICAL_PARTICLES, ...LEXICAL_EXPANSION };
  const ALL_LEXICAL_PARTICLES_PLAIN = Object.fromEntries(
    Object.entries(ALL_LEXICAL_PARTICLES).map(([k, v]) => [normalizeToken(k, true), v])
  );

  function analyzeHebrewToken(token) {
    const surface = sanitizeTokenForAnalysis(token);
    const analysis = {
      original: surface || token, prefixes: [], root: '', rootConsonants: '',
      genderNumber: null, constructState: null, pronominalSuffix: null,
      verbal: null, isDefinite: false, isEt: false,
      rules: [], debugLog: [], lookupKeys: []
    };
    if (!surface) return analysis;

    const pointed = normalizeToken(surface, true, false, true);
    const plainLex = normalizeToken(surface, true);
    const lexicalHit = ALL_LEXICAL_PARTICLES[pointed] || ALL_LEXICAL_PARTICLES_PLAIN[plainLex];
    if (lexicalHit) {
      return {
        original: surface,
        isLexical: true,
        gloss: lexicalHit,
        prefixes: [],
        root: surface,
        rootConsonants: stripNiqqud(surface),
        genderNumber: null,
        constructState: null,
        pronominalSuffix: null,
        verbal: null,
        isDefinite: false,
        isEt: false,
        rules: ['LEXICAL_PARTICLE'],
        debugLog: ['Excepcion lexico-gramatical detectada'],
        lookupKeys: []
      };
    }

    // ── Step 0: Et marker ──────────────────────────────────────────────
    if (detectEtMarker(surface)) {
      analysis.isEt = true;
      analysis.rules.push('ET_MARKER');
      analysis.debugLog.push('⚡ אֵת: Marcador de objeto directo definido. Sin traducción al español. Señala el destinatario de la acción verbal.');
      analysis.lookupKeys = [];
      return analysis;
    }

    let remainder = surface;

    // ── Step 1: Vav prefix ─────────────────────────────────────────────
    const vav = analyzeVavPrefix(remainder);
    if (vav) {
      analysis.prefixes.push(vav);
      analysis.rules.push(vav.ruleId);
      analysis.debugLog.push(`📌 VAV [${vav.ruleId}]: ${vav.description}`);
      remainder = advancePastFirst(remainder);
    }

    // ── Step 2: Definite article (standalone He) ───────────────────────
    const art = analyzeGuturalArticle(remainder) || analyzeArticle(remainder);
    if (art) {
      analysis.isDefinite = true;
      analysis.prefixes.push({ type: 'ARTICULO', ...art });
      analysis.rules.push(art.ruleId);
      analysis.debugLog.push(`📌 ARTÍCULO [${art.ruleId}]: ${art.description}`);
      remainder = advancePastFirst(remainder);
    }

    // ── Step 3: Min prefix ─────────────────────────────────────────────
    const min = analyzeMinPrefix(remainder);
    if (min) {
      analysis.prefixes.push({ type: 'MIN', ...min });
      analysis.rules.push(min.ruleId);
      analysis.debugLog.push(`📌 MIN [${min.ruleId}]: ${min.description}`);
      remainder = advancePastFirst(remainder); // consume the מ
    }

    // ── Step 4: BKL prefix ─────────────────────────────────────────────
    const bkl = art ? null : analyzeBKLPrefix(remainder);
    if (bkl) {
      if (bkl.hasHiddenArticle) {
        analysis.isDefinite = true;
        analysis.debugLog.push(`🔍 ARTÍCULO OCULTO [${bkl.ruleId}]: ${bkl.description}`);
      }
      analysis.prefixes.push({ type: 'BKL', ...bkl });
      analysis.rules.push(bkl.ruleId);
      analysis.debugLog.push(`📌 BKL [${bkl.ruleId}]: ${bkl.description}`);
      remainder = advancePastFirst(remainder);
    }

    // ── Step 5: Store root ─────────────────────────────────────────────
    analysis.root          = remainder;
    analysis.rootConsonants = stripNiqqud(remainder);
    const redup = detectReduplication(remainder);
    if (redup) {
      analysis.reduplication = redup;
      analysis.rules.push(redup.type);
      analysis.debugLog.push(`REDUPLICACION [${redup.type}]: ${redup.desc}`);
    }

    // ── Step 6: Construct state ────────────────────────────────────────
    const cs = analyzeConstructState(remainder);
    if (cs.isConstruct) {
      analysis.constructState = cs;
      analysis.rules.push('ESTADO_CONSTRUCTO');
      analysis.debugLog.push(`🔗 CONSTRUCTO [${cs.description}]: Estado regente. Esperar sustantivo siguiente para completar la frase genitiva.`);
    }

    // ── Step 7: Gender & Number ────────────────────────────────────────
    analysis.genderNumber = analyzeGenderNumber(remainder);
    analysis.debugLog.push(`📊 GÉN/NÚM: ${analysis.genderNumber.description}`);

    // ── Step 8: Pronominal suffix ──────────────────────────────────────
    const pron = analyzePronominalSuffix(remainder);
    if (pron) {
      analysis.pronominalSuffix = pron;
      analysis.rules.push(pron.ruleId);
      analysis.debugLog.push(`👤 SUFIJO [${pron.ruleId}]: ${pron.description}`);
    }

    // Step 9: Verbal analysis
    const pronType = analysis.pronominalSuffix?.type || '';
    if (!analysis.pronominalSuffix || pronType.startsWith('OBJ')) {
      const isConsecutive = vav?.isConsecutive || false;
      const verbalRoot = (pronType.startsWith('OBJ') && analysis.pronominalSuffix?.stem)
        ? analysis.pronominalSuffix.stem
        : remainder;
      const verbal = analyzeVerbalForm(verbalRoot, isConsecutive);
      if (verbal) {
        analysis.verbal = verbal;
        analysis.rules.push(`VERBO_${verbal.tense}`);
        analysis.debugLog.push(`VERBO [${verbal.tense}] ${verbal.binyan.name}: ${verbal.pgn} = "${verbal.es}".`);
      }
    }

    // Step 10: Build lookup keys
    analysis.lookupKeys = _buildLookupKeys(analysis);

    return analysis;
  }

  /**
   * verifySystemForms(word)
   * Capa de verificación para formas críticas sin alterar la ruta base.
   */
  function verifySystemForms(word) {
    const analysis = analyzeHebrewToken(word);
    const pointed = normalizeToken(word, true, false, true);
    const plain = normalizeToken(word, true);
    const pushRule = (rule) => {
      if (!analysis.rules.includes(rule)) analysis.rules.push(rule);
    };

    // אֲבִיאֶנּוּ -> HIFIL + YIQTOL + OBJ (nun energética)
    if (pointed.includes('\u05D0\u05B2\u05D1\u05B4\u05D9\u05D0\u05B6\u05E0\u05BC\u05D5\u05BC')) {
      analysis.verbal = {
        ...(analysis.verbal || {}),
        binyan: { name: 'HIFIL', es: 'causativo' },
        tense: 'YIQTOL',
        pgn: '1cs',
        es: 'traeré'
      };
      analysis.pronominalSuffix = {
        ...(analysis.pronominalSuffix || {}),
        type: 'OBJ',
        es: 'lo',
        pgn: '3ms',
        rule: 'NUN_ENERGETICA'
      };
      pushRule('NUN_ENERGETICA');
    }

    // וַעֲבָדוּם -> Vav + objeto plural
    if (pointed.includes('\u05D5\u05B7\u05E2\u05B2\u05D1\u05B8\u05D3\u05D5\u05BC\u05DD') || plain.includes('\u05D5\u05E2\u05D1\u05D3\u05D5\u05DD')) {
      if (!Array.isArray(analysis.prefixes)) analysis.prefixes = [];
      const hasVav = analysis.prefixes.some((p) => (p?.type || '').toString().startsWith('VAV'));
      if (!hasVav) {
        analysis.prefixes.push({ type: 'VAV', es: 'y' });
      }
      analysis.pronominalSuffix = {
        ...(analysis.pronominalSuffix || {}),
        type: 'OBJ',
        es: 'los',
        pgn: '3mp'
      };
      pushRule('SUFIJO_OBJETO_3MP');
    }

    // יְסֹבְבֶנְהוּ -> forma poética de objeto 3ms
    if (pointed.endsWith('\u05B6\u05E0\u05B0\u05D4\u05D5\u05BC') || plain.endsWith('\u05E0\u05D4\u05D5')) {
      analysis.pronominalSuffix = {
        ...(analysis.pronominalSuffix || {}),
        type: 'OBJ_POETICO',
        es: 'lo',
        pgn: '3ms',
        desc: 'Forma arcaica de objeto 3ms'
      };
      pushRule('SUFIJO_POETICO_3MS');
    }

    return analysis;
  }

  // v2.5.1: verificación avanzada de formas pausales, energéticas y reduplicación.
  function verifySystemFormsV25(word) {
    const analysis = verifySystemForms(word);
    const pointed = normalizeToken(word, true, false, true);
    const plain = normalizeToken(word, true);

    // יַכְּכָה -> HIFIL YIQTOL + objeto 2ms reforzado
    if (pointed.includes('\u05D9\u05B7\u05DB\u05BC\u05B0\u05DB\u05B8\u05D4')) {
      analysis.verbal = { binyan: { name: 'HIFIL', es: 'causativo' }, tense: 'YIQTOL', pgn: '3ms', es: 'herirá' };
      analysis.pronominalSuffix = { type: 'OBJ', es: 'te', pgn: '2ms', rule: 'PAUSAL_REFORZADO' };
      if (!analysis.rules.includes('PAUSAL_REFORZADO')) analysis.rules.push('PAUSAL_REFORZADO');
    }

    // וַנַּכֵּם -> WAYYIQTOL + objeto 3mp
    if (pointed.includes('\u05D5\u05B7\u05E0\u05BC\u05B7\u05DB\u05BC\u05B5\u05DD')) {
      analysis.verbal = { binyan: { name: 'HIFIL', es: 'causativo' }, tense: 'WAYYIQTOL', pgn: '1cp', es: 'herimos' };
      analysis.pronominalSuffix = { type: 'OBJ', es: 'los', pgn: '3mp' };
      if (!analysis.rules.includes('SUFIJO_OBJETO_3MP')) analysis.rules.push('SUFIJO_OBJETO_3MP');
    }

    // ...לֶנּוּ -> objeto directo con refuerzo energético
    if (pointed.endsWith('\u05DC\u05B6\u05E0\u05BC\u05D5\u05BC')) {
      if (!analysis.rules.includes('NUN_ENERGETICA')) analysis.rules.push('NUN_ENERGETICA');
      analysis.debugLog.push('Detección de objeto directo con refuerzo energético.');
    }

    // v2.5.2: excepciones verbales apocopadas de היה (evita lectura nominal con sufijos).
    const criticalGloss = CRITICAL_VERBAL_EXCEPTIONS[pointed] || CRITICAL_VERBAL_EXCEPTIONS_PLAIN[plain];
    if (criticalGloss && APOCOPATED_HAYAH_FORMS.has(plain)) {
      if (plain === '\u05D5\u05D9\u05D4\u05D9') {
        analysis.verbal = { binyan: { name: 'QAL', es: 'simple activo' }, tense: 'WAYYIQTOL', pgn: '3ms', es: 'fue / aconteció' };
      } else {
        analysis.verbal = { binyan: { name: 'QAL', es: 'simple activo' }, tense: 'YIQTOL', pgn: '3ms', es: 'sea / será (jussivo)' };
      }
      analysis.pronominalSuffix = null;
      if (!analysis.rules.includes('VERBO_APOCOPADO_HAYAH')) analysis.rules.push('VERBO_APOCOPADO_HAYAH');
      analysis.debugLog.push(`Excepción verbal crítica: ${criticalGloss}.`);
    }

    const redup = detectReduplication(analysis.root || word);
    if (redup && !analysis.rules.includes(redup.type)) {
      analysis.rules.push(redup.type);
      analysis.reduplication = redup;
    }

    return analysis;
  }

  /**
   * Builds a prioritized list of keys to try against the gloss map.
   * Keys closer to index 0 are tried first.
   */
  function _buildLookupKeys(analysis) {
    const keys = new Set();
    const add = (value) => {
      if (!value) return;
      const pointed = normalizeToken(value, true, false, true);
      const plain = normalizeToken(value, true);
      if (pointed) keys.add(pointed);
      if (plain) keys.add(plain);
    };

    const root = analysis.root || '';
    const stem = analysis.pronominalSuffix?.stem || '';
    const plainRoot = stripNiqqud(root);

    // 0) Siempre probar primero la forma superficial completa.
    add(analysis.original || '');

    // v2.5.2: formas apocopadas de היה -> forzar lookup a la raíz canónica.
    if (APOCOPATED_HAYAH_FORMS.has(plainRoot)) {
      add('\u05D4\u05D9\u05D4'); // היה
    }
    // v2.5.4: ajuste puntual de Qamets-Chatuf/Chatef en טָרְחֲ...
    if (root.startsWith('\u05D8\u05B8\u05E8\u05D7\u05B2')) {
      add('\u05D8\u05B9\u05E8\u05D7'); // טֹרַח
    }

    // 1) Si el stem termina en Tav, intentar restaurar He final (F.Sg en estado constructo/sufijado)
    if (stem.endsWith('\u05EA')) {
      add(stem.slice(0, -1) + '\u05D4');
      add(stripNiqqud(stem.slice(0, -1) + '\u05D4'));
    }

    // 2) Ruta verbal: base pelada + eliminación prefijo verbal inicial + intento Lamed-He
    if (analysis.verbal) {
      const verbalBase = stripNiqqud(stem || root).replace(/^[\u05D0\u05D9\u05EA\u05E0]/, '');
      add(verbalBase);
      add(verbalBase + '\u05D4');
    }

    // 3) Claves base (stem preferido; si no, root)
    add(stem || root);
    add(stripNiqqud(stem || root));
    add(root);
    add(stripNiqqud(root));

    return Array.from(keys);
  }

  function _spanishDefArticle(gloss) {
    const clean = String(gloss || '').trim();
    if (/^(el|la|los|las)\s/i.test(clean)) return clean;
    const base = clean.replace(/^(un|una|unos|unas)\s+/i, '');
    // Guess gender from terminal vowel
    if (/[ao]s$/.test(base)) return (/as$/.test(base) ? 'las' : 'los') + ' ' + base;
    if (/a$/.test(base)) return 'la ' + base;
    return 'el ' + base;
  }

  function stripSpanishArticle(gloss) {
    return String(gloss || '').replace(/^(el|la|los|las|un|una|unos|unas)\s+/i, '').trim();
  }

  function pluralizeSpanish(noun) {
    const c = String(noun || '').trim();
    if (!c) return c;
    if (/[sx]$/i.test(c))  return c;
    if (/z$/i.test(c))     return c.slice(0, -1) + 'ces';
    if (/[aeiouáéó]$/i.test(c)) return c + 's';
    if (/[íú]$/i.test(c))  return c + 'es';
    return c + 'es';
  }

  function applyGlossFeatures(analysis, baseGloss) {
    let gloss = String(baseGloss || '').trim();
    if (!gloss || gloss === '-') return gloss;

    // Apply plural number
    if (analysis.genderNumber?.number === 'Pl' || analysis.genderNumber?.number === 'Dual') {
      const hasArt = /^(el|la|los|las|un|una|unos|unas)\s/i.exec(gloss);
      const base   = hasArt ? gloss.slice(hasArt[0].length) : gloss;
      const plural = pluralizeSpanish(base);
      if (hasArt) {
        const art = hasArt[1].toLowerCase();
        const defArt = ['la', 'el'].includes(art)
          ? (art === 'la' ? 'las' : 'los')
          : (art === 'una' ? 'unas' : 'unos');
        gloss = `${defArt} ${plural}`;
      } else {
        gloss = plural;
      }
    }

    // Apply definiteness (add article if word is definite and gloss is indefinite)
    if (analysis.isDefinite) {
      gloss = _spanishDefArticle(gloss);
    }

    // Apply pronominal suffix
    if (analysis.pronominalSuffix) {
      const base = stripSpanishArticle(gloss);
      const pron = analysis.pronominalSuffix.es;
      if (analysis.pronominalSuffix.type === 'OBJ') {
        gloss = `${base} ${pron}`.trim();
      } else {
        gloss = `${pron} ${base}`.trim();
      }
    }

    // Apply construct state: strip article, add implied "de"
    if (analysis.constructState?.isConstruct && !analysis.pronominalSuffix) {
      gloss = stripSpanishArticle(gloss);
    }

    // Prepend preposition/conjunction prefixes
    const prefixParts = analysis.prefixes
      .filter(p => p.es && p.type !== 'ARTICULO')
      .map(p => p.es);

    if (prefixParts.length > 0) {
      gloss = `${prefixParts.join(' ')} ${gloss}`;
    } else if (analysis.prefixes.some(p => p.type === 'VAV_CONJUNCION' || p.type === 'VAV_CONJUNCION_SHURUQ' || p.type === 'VAV_CONJUNCION_CHATEF')) {
      gloss = 'y ' + gloss;
    } else if (analysis.prefixes.some(p => p.isConsecutive)) {
      gloss = 'y ' + gloss; // Vav consecutive: prefix handled in verbal
    }

    return gloss.trim();
  }

  // ─────────────────────────────────────────────
  //  MAP LOOKUP HELPERS
  // ─────────────────────────────────────────────

  function lookupInMaps(keys, maps) {
    for (const key of keys) {
      if (maps.pointedMap?.has(key))   return maps.pointedMap.get(key);
      if (maps.unpointedMap?.has(key)) return maps.unpointedMap.get(key);
    }
    return null;
  }

  function normalizeGlossResult(g) {
    const s = String(g || '').trim();
    return s && s !== '-' ? s : null;
  }

  // ─────────────────────────────────────────────
  //  FULL TOKEN → SPANISH MAPPING
  // ─────────────────────────────────────────────

  function mapHebrewTokenToSpanish(token, maps) {
    const surface = sanitizeTokenForAnalysis(token);
    if (!surface) return '-';

    const plain = normalizeToken(surface, true);
    const pointed = normalizeToken(surface, true, false, true);
    if (plain === '\u05D4\u05D9\u05D4') return 'existir/ser';
    const divineName = resolveDivineNameGloss(surface);
    if (divineName) return divineName;
    const precise = PRECISE_GLOSSES[pointed] || PRECISE_GLOSSES_PLAIN[plain];
    if (precise) return precise;

    // ── Negative existential (אֵין forms) ──
    const neg = resolveNegativeExistential(surface);
    if (neg) return neg;

    // ── Run full grammar analysis ──
    const analysis = analyzeHebrewToken(surface);
    if (analysis.isLexical && analysis.gloss) return analysis.gloss;
    const preciseResolved = resolvePreciseGloss(surface, analysis);
    if (preciseResolved) return preciseResolved;

    // ── Et marker ──
    if (analysis.isEt) return '[obj]';

    // ── Lookup using prioritized keys ──
    const rawGloss = lookupInMaps(analysis.lookupKeys, maps);
    const gloss    = normalizeGlossResult(rawGloss);

    if (!gloss) return '-';

    // ── Apply grammar features to the base gloss ──
    return applyGlossFeatures(analysis, gloss) || '-';
  }

  // ─────────────────────────────────────────────
  //  HEBREW MAP BUILDER  (unchanged logic, improved)
  // ─────────────────────────────────────────────

  function setHebrewInterlinearGlossCandidate(rankedMap, key, gloss, score) {
    if (!key) return;
    const normalized = normalizeGloss(gloss);
    if (!normalized || normalized === '-') return;
    let byGloss = rankedMap.get(key);
    if (!byGloss) { byGloss = new Map(); rankedMap.set(key, byGloss); }
    const prev = byGloss.get(normalized) || { score, count: 0 };
    byGloss.set(normalized, { score: Math.max(prev.score, score), count: prev.count + 1 });
  }

  function getHebrewTokenLookupForms(orig) {
    if (Array.isArray(orig)) {
      const parts = orig.map((p) => String(p || '').trim()).filter(Boolean);
      return parts.length === 0 ? [] : [parts.join('')];
    }
    const clean = String(orig || '').trim();
    return clean ? [clean] : [];
  }

  function buildHebrewMapFromInterlinear(books) {
    const pointedRanked   = new Map();
    const unpointedRanked = new Map();

    for (const book of books || []) {
      const chapters = book?.chapters && typeof book.chapters === 'object'
        ? Object.values(book.chapters) : [];
      for (const chapter of chapters) {
        const verses = chapter && typeof chapter === 'object' ? Object.values(chapter) : [];
        for (const verse of verses) {
          const tokens = Array.isArray(verse?.tokens) ? verse.tokens : [];
          for (const token of tokens) {
            const forms = getHebrewTokenLookupForms(token?.orig);
            for (const heb of forms) {
              const pk = normalizeToken(heb, true, false, true);
              const uk = normalizeToken(heb, true);
              setHebrewInterlinearGlossCandidate(pointedRanked,   pk, token?.es,     3);
              setHebrewInterlinearGlossCandidate(unpointedRanked, uk, token?.es,     3);
              setHebrewInterlinearGlossCandidate(pointedRanked,   pk, token?.added,  2);
              setHebrewInterlinearGlossCandidate(unpointedRanked, uk, token?.added,  2);
              setHebrewInterlinearGlossCandidate(pointedRanked,   pk, token?.notrans,1);
              setHebrewInterlinearGlossCandidate(unpointedRanked, uk, token?.notrans,1);
            }
          }
        }
      }
    }

    const resolve = (ranked) => {
      const flat = new Map();
      for (const [key, byGloss] of ranked.entries()) {
        let winner = null;
        for (const [gloss, meta] of byGloss.entries()) {
          if (!winner || meta.score > winner.score ||
             (meta.score === winner.score && meta.count > winner.count)) {
            winner = { gloss, ...meta };
          }
        }
        if (winner) flat.set(key, winner.gloss);
      }
      return flat;
    };

    return { pointedMap: resolve(pointedRanked), unpointedMap: resolve(unpointedRanked) };
  }

  function setHebrewFallbackCandidate(map, key, gloss, score, usage) {
    if (!key) return;
    const normalized = normalizeGloss(gloss);
    if (!normalized || normalized === '-') return;
    const prev = map.get(key);
    if (!prev || score > prev.score || (score === prev.score && usage > prev.usage)) {
      map.set(key, { gloss: normalized, score, usage });
    }
  }

  function buildHebrewFallbackMap(rows) {
    const pointedRanked = new Map();
    const unpointedRanked = new Map();
    const add = (value, gloss, score, usage) => {
      const pk = normalizeToken(value, true, false, true);
      const uk = normalizeToken(value, true);
      setHebrewFallbackCandidate(pointedRanked, pk, gloss, score, usage);
      setHebrewFallbackCandidate(unpointedRanked, uk, gloss, score, usage);
    };

    for (const row of rows || []) {
      if (!row || typeof row !== 'object') continue;
      const usage = Number(row?.stats?.tokens) || 0;
      const gloss = takeFirstGloss(row?.glosa || row?.glosas || row?.strong_detail?.def_rv || row?.strong_detail?.definicion);
      if (!gloss || gloss === '-') continue;

      if (row.forma) add(row.forma, gloss, 4, usage);
      if (Array.isArray(row.formas)) {
        for (const form of row.formas) add(form, gloss, 4, usage);
      }
      if (row.hebreo) add(row.hebreo, gloss, 3, usage);
      if (Array.isArray(row.hebreos)) {
        for (const form of row.hebreos) add(form, gloss, 3, usage);
      }
      if (row?.strong_detail?.lemma) add(row.strong_detail.lemma, gloss, 2, usage);
    }

    const resolve = (ranked) => {
      const out = new Map();
      for (const [key, meta] of ranked.entries()) out.set(key, meta.gloss);
      return out;
    };

    return { pointedMap: resolve(pointedRanked), unpointedMap: resolve(unpointedRanked) };
  }

  function mergeHebrewMaps(primary, fallback) {
    const pointedMap = new Map((fallback?.pointedMap || new Map()).entries());
    const unpointedMap = new Map((fallback?.unpointedMap || new Map()).entries());
    for (const [k, v] of (primary?.pointedMap || new Map()).entries()) pointedMap.set(k, v);
    for (const [k, v] of (primary?.unpointedMap || new Map()).entries()) unpointedMap.set(k, v);
    return { pointedMap, unpointedMap };
  }

  // ─────────────────────────────────────────────
  //  GREEK MAP BUILDER  (unchanged from v1.0)
  // ─────────────────────────────────────────────

  function setGlossCandidate(map, key, gloss, score, usage, exactLemmaMatch = false) {
    if (!key) return;
    const ng = normalizeGloss(gloss);
    if (!ng || ng === '-') return;
    const prev = map.get(key);
    if (!prev || score > prev.score ||
       (score === prev.score && Number(exactLemmaMatch) > Number(prev.exactLemmaMatch)) ||
       (score === prev.score && exactLemmaMatch === prev.exactLemmaMatch && usage > prev.usage)) {
      map.set(key, { gloss: ng, score, usage, exactLemmaMatch });
    }
  }

  function buildGreekMap(rows) {
    const map = new Map();
    for (const row of rows || []) {
      if (Array.isArray(row)) {
        const lemma = normalizeToken(row[0], false, true);
        const gloss = takeFirstGloss(row[1]);
        setGlossCandidate(map, lemma, gloss, 2, 0, true);
        continue;
      }
      if (!row || typeof row !== 'object') continue;
      const usage         = Number(row?.stats?.tokens) || 0;
      const fallbackGloss = takeFirstGloss(row?.glosas || row?.glosa || row?.strong_detail?.def_rv);
      const normalizedLemma = normalizeToken(row?.griego, false, true);

      if (Array.isArray(row?.formas) && Array.isArray(row?.glosas)) {
        const limit = Math.min(row.formas.length, row.glosas.length);
        for (let i = 0; i < limit; i++) {
          const fk = normalizeToken(row.formas[i], false, true);
          setGlossCandidate(map, fk, row.glosas[i], 4, usage, fk === normalizedLemma);
        }
      }
      const pfk = normalizeToken(row?.forma, false, true);
      setGlossCandidate(map, pfk, row?.glosa || fallbackGloss, 3, usage, pfk === normalizedLemma);
      setGlossCandidate(map, normalizedLemma, fallbackGloss, 2, usage, true);

      if (Array.isArray(row?.formas)) {
        for (const form of row.formas) {
          const fk = normalizeToken(form, false, true);
          setGlossCandidate(map, fk, fallbackGloss, 1, usage, fk === normalizedLemma);
        }
      }
      if (Array.isArray(row?.griegos)) {
        for (const v of row.griegos) {
          const vk = normalizeToken(v, false, true);
          setGlossCandidate(map, vk, fallbackGloss, 1, usage, vk === normalizedLemma);
        }
      }
    }
    const plain = new Map();
    for (const [k, v] of map.entries()) plain.set(k, v.gloss);
    return plain;
  }

  // ─────────────────────────────────────────────
  //  TOKEN SPLITTER
  // ─────────────────────────────────────────────

  function splitTokens(text) {
    return String(text || '')
      .replace(/[\u05BE]/g, ' ')
      .replace(/[\u05C3,;]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(sanitizeTokenForAnalysis)
      .filter(Boolean);
  }

  /**
   * Improved prefix cluster expansion.
   * Now uses the grammar analysis to decide if a prefix can be peeled off.
   */
  function expandTokenForLookup(token, unpointedMap) {
    const surface = sanitizeTokenForAnalysis(token);
    if (!surface) return [];
    return [surface];
  }

  // ─────────────────────────────────────────────
  //  LOADING / CACHING
  // ─────────────────────────────────────────────

  let greekDictionaryPromise = null;
  let hebrewFallbackPromise = null;
  const hebrewInterlinearBookCache = new Map();
  const hebrewInterlinearMapCache = new Map();

  async function loadJson(path) {
    const response = await fetch(path, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`No se pudo cargar ${path} (HTTP ${response.status})`);
    return response.json();
  }

  async function loadHebrewInterlinearBookBySlug(slug) {
    const file = HEBREW_INTERLINEAR_FILE_BY_SLUG[slug];
    if (!file) return null;
    if (!hebrewInterlinearBookCache.has(file)) {
      hebrewInterlinearBookCache.set(
        file,
        loadJson(`${HEBREW_INTERLINEAR_BASE}/${file}`).catch(() => null)
      );
    }
    return hebrewInterlinearBookCache.get(file);
  }

  async function getGreekMap() {
    if (!greekDictionaryPromise) {
      greekDictionaryPromise = loadJson(GREEK_DICT_PATH).then((rows) => buildGreekMap(rows));
    }
    return greekDictionaryPromise;
  }

  async function getHebrewFallbackMaps() {
    if (!hebrewFallbackPromise) {
      hebrewFallbackPromise = loadJson(HEBREW_FALLBACK_DICT_PATH)
        .catch(() => [])
        .then((rows) => buildHebrewFallbackMap(rows));
    }
    return hebrewFallbackPromise;
  }

  async function getHebrewInterlinearMaps(slug) {
    const file = HEBREW_INTERLINEAR_FILE_BY_SLUG[String(slug || '').trim()];
    if (!file) return { pointedMap: new Map(), unpointedMap: new Map() };
    if (!hebrewInterlinearMapCache.has(file)) {
      const mapPromise = loadHebrewInterlinearBookBySlug(slug)
        .then((book) => buildHebrewMapFromInterlinear(book ? [book] : []))
        .catch(() => ({ pointedMap: new Map(), unpointedMap: new Map() }));
      hebrewInterlinearMapCache.set(file, mapPromise);
    }
    return hebrewInterlinearMapCache.get(file);
  }

  async function getHebrewMaps(slug) {
    const [primary, fallback] = await Promise.all([
      getHebrewInterlinearMaps(slug),
      getHebrewFallbackMaps()
    ]);
    return mergeHebrewMaps(primary, fallback);
  }

  async function preload(options = {}) {
    const slug = String(options?.slug || '').trim();
    const isGreek = Boolean(options?.isGreek);

    if (isGreek) {
      await getGreekMap();
      return true;
    }

    await getHebrewFallbackMaps();
    if (slug && HEBREW_INTERLINEAR_FILE_BY_SLUG[slug]) {
      await Promise.all([
        loadHebrewInterlinearBookBySlug(slug),
        getHebrewInterlinearMaps(slug)
      ]);
    }
    return true;
  }

  async function getHebrewRawVerse(slug, chapter, verse) {
    const book = await loadHebrewInterlinearBookBySlug(slug);
    const chapterNode = book?.chapters?.[String(chapter)] || null;
    const verseNode   = chapterNode?.[String(verse)] || null;
    const raw = String(verseNode?.raw || '').trim();
    return raw || '';
  }

  // ─────────────────────────────────────────────
  //  MAIN INTERLINEAR ROW BUILDER
  // ─────────────────────────────────────────────

  /**
   * buildInterlinearRows(originalText, options)
   *
   * options:
   *   isGreek  — boolean
   *   withAnalysis — boolean (default false)
   *     If true, returns `analysisData[]` alongside tokens,
   *     where each entry is the full analyzeHebrewToken result.
   *     Useful for rendering exegetical tooltips in the UI.
   *
   * Returns:
   * {
   *   tokens[],
   *   spanishTokens[],
   *   originalLine,
   *   spanishLine,
   *   analysisData[]   // only if options.withAnalysis = true
   * }
   */
  async function buildInterlinearRows(originalText, options = {}) {
    const { isGreek = false, withAnalysis = false, slug = '' } = options;
    const greekMap = isGreek ? await getGreekMap() : null;
    const hebrewMaps = isGreek ? null : await getHebrewMaps(slug);
    const targetMap = isGreek ? greekMap : hebrewMaps;

    const tokens = splitTokens(originalText)
      .flatMap((token) => (isGreek ? [token] : expandTokenForLookup(token, hebrewMaps.unpointedMap)));

    let analysisData = null;
    let spanishTokens;

    if (isGreek) {
      spanishTokens = tokens.map((token) => {
        return lookupGreekGloss(targetMap, token);
      });
    } else {
      spanishTokens = [];
      if (withAnalysis) analysisData = [];

      for (const token of tokens) {
        const spanish = mapHebrewTokenToSpanish(token, hebrewMaps);
        spanishTokens.push(spanish);
        if (withAnalysis) {
          analysisData.push(analyzeHebrewToken(token));
        }
      }
    }

    const result = {
      tokens,
      spanishTokens,
      originalLine: tokens.join(' '),
      spanishLine:  spanishTokens.join(' ')
    };
    if (withAnalysis && analysisData) result.analysisData = analysisData;
    return result;
  }

  // ─────────────────────────────────────────────
  //  PUBLIC API
  // ─────────────────────────────────────────────

  window.verifySystemFormsV25 = verifySystemFormsV25;

  window.InterlinearView = {
    /** Core rendering function */
    buildInterlinearRows,

    /** Fetch raw verse text from JSON */
    getHebrewRawVerse,

    /** Preload dictionaries for a given book slug */
    preload,

    /**
     * analyzeHebrewToken(token) → Analysis object
     *
     * Use this in your UI to render:
     *   - Exegetical tooltip on hover
     *   - Color-coded prefix badges
     *   - Grammar annotation below each word
     *
     * Example usage in your UI code:
     *   const a = InterlinearView.analyzeHebrewToken('בְּרֵאשִׁית');
     *   console.log(a.debugLog);   // step-by-step Hebrew grammar
     *   console.log(a.isDefinite); // false (sin artículo = indefinido)
     *   console.log(a.prefixes);   // [{type:'BKL', ruleId:'REG_01_DEFAULT', es:'en', ...}]
     */
    analyzeHebrewToken,
    verifySystemForms,
    verifySystemFormsV25,

    /**
     * Convenience: analyze multiple tokens at once.
     * Returns Analysis[] in the same order.
     */
    analyzeVerse(text) {
      return splitTokens(String(text || '')).map(analyzeHebrewToken);
    }
  };

})();

