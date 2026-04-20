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

  function normalizeToken(token, isHebrew, isGreek = false, preserveHebrewPoints = false) {
    let clean = String(token || '').trim();
    clean = clean.replace(/[\u200c-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, '');
    clean = clean.replace(
      /^[\s.,;:!?¡¿()\[\]{}"'""''«»··;᾽᾿ʼʹʽ\-‐‑‒–—―]+|[\s.,;:!?¡¿()\[\]{}"'""''«»··;᾽᾿ʼʹʽ\-‐‑‒–—―]+$/g,
      ''
    );
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
    }
    return clean.toLowerCase();
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
    // הַ (Patach) o הָ (Qamets)
    if (niqqud.includes(N.PATACH) || niqqud.includes(N.QAMETS)) {
      return {
        ruleId: 'ARTICULO_DEFINIDO',
        description: 'Artículo definido הַ/הָ — la palabra es DEFINIDA.',
        es: 'el/la', isDefinite: true
      };
    }
    return null;
  }

  // ── BKL PREPOSITIONS ───────────────────────────────────────────────────

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

    // SINCOPE_ARTICULO (excepción): gutural/resh no aceptan Dagesh Forte.
    // Si B/K/L toma Pathach/Qamets ante gutural o ר, también puede indicar artículo oculto.
    if ((myNiqqud.includes(N.PATACH) || myNiqqud.includes(N.QAMETS)) && (GUTURALES.has(nextL) || nextL === 'ר')) {
      return {
        ruleId: 'SINCOPE_ARTICULO', letter, info,
        description: `La preposición "${letter}" absorbió al artículo definido ante ${nextL} (sin Dagesh por restricción fonológica).`,
        es: info.es, hasHiddenArticle: true
      };
    }

    // REGLA_CHATEF: gutural con vocal reducida
    if (GUTURALES.has(nextL)) {
      if (nextN.startsWith(N.CHATEF_PATACH))
        return { ruleId: 'REGLA_CHATEF', letter, info, description: `Gutural (${nextL}) con Chatef Pathach → prefijo toma Pathach (ַ).`, es: info.es, hasHiddenArticle: false };
      if (nextN.startsWith(N.CHATEF_SEGOL))
        return { ruleId: 'REGLA_CHATEF', letter, info, description: `Gutural (${nextL}) con Chatef Segol → prefijo toma Segol (ֶ).`, es: info.es, hasHiddenArticle: false };
      if (nextN.startsWith(N.CHATEF_QAMETS))
        return { ruleId: 'REGLA_CHATEF', letter, info, description: `Gutural (${nextL}) con Chatef Qamets → prefijo toma Qamets-Chatuf (ָ).`, es: info.es, hasHiddenArticle: false };

      // Excepción especial: Aleph en אֱלֹהִים → prefijo toma Tsere
      if (nextL === 'א' && nextN.startsWith(N.CHATEF_SEGOL) && word.includes('לה')) {
        return { ruleId: 'REGLA_CHATEF_ELOHIM', letter, info, description: 'Excepción Elohim: prefijo toma Tsere (ֵ), Aleph quiescente.', es: info.es, hasHiddenArticle: false };
      }
    }

    // REGLA_YOD_QUIESCENTE: Yod + Sheva inicial → Hireq + Yod quiescente
    if (nextL === 'י' && nextN.startsWith(N.SHEVA) && myNiqqud.includes(N.HIREQ)) {
      return { ruleId: 'REGLA_YOD_QUIESCENTE', letter, info, description: 'Yod inicial pierde Sheva → quiescente (vocal larga i). No pronunciar la Y consonántica.', es: info.es, hasHiddenArticle: false };
    }

    // REGLA_DOS_SHEVAS: consonante siguiente con Sheva → prefijo toma Hireq
    if (nextN.startsWith(N.SHEVA) && myNiqqud.includes(N.HIREQ)) {
      return { ruleId: 'REGLA_DOS_SHEVAS', letter, info, description: 'Dos Shevas seguidos prohibidos → prefijo toma Hireq (ִ). Segunda Sheva se vuelve muda.', es: info.es, hasHiddenArticle: false };
    }
    // Evita falsos splits BKL en raices lexicales iniciales (ej. bara).
    // El default BKL solo aplica con vocal funcional de prefijo (Sheva/Hireq).
    if (!myNiqqud.includes(N.SHEVA) && !myNiqqud.includes(N.HIREQ)) {
      return null;
    }

    // REG_01_DEFAULT: Sheva vocal estÃ¡ndar
    return { ruleId: 'REG_01_DEFAULT', letter, info, description: 'PreposiciÃ³n BKL estÃ¡ndar con Sheva vocal.', es: info.es, hasHiddenArticle: false };
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
      name: 'HITPAEL', es: 'reflexivo intensivo', marker: 'prefijo הִתְ',
      test: (w) => /^הִתְ/.test(w) || /^וְהִתְ/.test(w)
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
  ];

  // Singular-possession (object is singular)
  const PRON_SUFFIXES_SG = [
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

  function analyzePronominalSuffix(word) {
    // Check plural suffixes first (they include Yod → higher specificity)
    for (const r of PRON_SUFFIXES_PL) {
      if (word.endsWith(r.suffix) && word.length > r.suffix.length + 1) {
        return { ...r, objectPlural: true,
          stem: word.slice(0, -r.suffix.length),
          ruleId: 'SUFIJO_PRONOMINAL_PL',
          description: `Sufijo pronominal plural: ${r.suffix} (${r.pgn} = ${r.es}). El poseído es PLURAL (marcado por Yod).`
        };
      }
    }
    for (const r of PRON_SUFFIXES_SG) {
      if (word.endsWith(r.suffix) && word.length > r.suffix.length + 1) {
        return { ...r, objectPlural: false,
          stem: word.slice(0, -r.suffix.length),
          ruleId: 'SUFIJO_PRONOMINAL_SG',
          description: `Sufijo pronominal singular: ${r.suffix} (${r.pgn} = ${r.es}). El poseído es SINGULAR.`
        };
      }
    }
    return null;
  }

  // ── NEGATIVE EXISTENTIAL (אֵין forms) ─────────────────────────────────

  const NEG_EXIST_MAP = {
    'אֵינָם':  'ellos no están',   'אֵינֶנּוּ': 'él no está',
    'אֵינֵנוּ':'nosotros no estamos','אֵינָהּ':  'ella no está',
    'אֵינֶנִּי':'yo no estoy',     'אֵינְךָ':  'tú no estás',
    'אֵינֵךְ': 'tú no estás',
    // unpointed fallbacks
    'אינם':   'ellos no están',   'אינן':    'ellas no están',
    'איננו':  'él no está / no estamos', 'אינה': 'ella no está',
    'אינני':  'yo no estoy',      'אינך':    'tú no estás',
    'אינכם':  'ustedes no están (m)', 'אינכן': 'ustedes no están (f)'
  };

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
  function analyzeHebrewToken(token) {
    const analysis = {
      original: token, prefixes: [], root: '', rootConsonants: '',
      genderNumber: null, constructState: null, pronominalSuffix: null,
      verbal: null, isDefinite: false, isEt: false,
      rules: [], debugLog: [], lookupKeys: []
    };
    if (!token) return analysis;

    // ── Step 0: Et marker ──────────────────────────────────────────────
    if (detectEtMarker(token)) {
      analysis.isEt = true;
      analysis.rules.push('ET_MARKER');
      analysis.debugLog.push('⚡ אֵת: Marcador de objeto directo definido. Sin traducción al español. Señala el destinatario de la acción verbal.');
      analysis.lookupKeys = [];
      return analysis;
    }

    let remainder = token;

    // ── Step 1: Vav prefix ─────────────────────────────────────────────
    const vav = analyzeVavPrefix(remainder);
    if (vav) {
      analysis.prefixes.push(vav);
      analysis.rules.push(vav.ruleId);
      analysis.debugLog.push(`📌 VAV [${vav.ruleId}]: ${vav.description}`);
      remainder = advancePastFirst(remainder);
    }

    // ── Step 2: Definite article (standalone He) ───────────────────────
    const art = analyzeArticle(remainder);
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
    const bkl = analyzeBKLPrefix(remainder);
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

    // ── Step 9: Verbal analysis ────────────────────────────────────────
    const isConsecutive = vav?.isConsecutive || false;
    const verbal = analyzeVerbalForm(remainder, isConsecutive);
    if (verbal) {
      analysis.verbal = verbal;
      analysis.rules.push(`VERBO_${verbal.tense}`);
      analysis.debugLog.push(`⚡ VERBO [${verbal.tense}] ${verbal.binyan.name}: ${verbal.pgn} = "${verbal.es}".`);
    }

    // ── Step 10: Build lookup keys ─────────────────────────────────────
    // Priority order: most specific → most general
    analysis.lookupKeys = _buildLookupKeys(analysis);

    return analysis;
  }

  /**
   * Builds a prioritized list of keys to try against the gloss map.
   * Keys closer to index 0 are tried first.
   */
  function _buildLookupKeys(analysis) {
    const keys = new Set();
    const add  = (k) => { if (k && k.length > 0) keys.add(k); };

    const orig    = String(analysis.original || '');
    const root    = String(analysis.root || '');
    const rootCon = String(analysis.rootConsonants || '');

    // 1. Pointed root
    add(normalizeToken(root, true, false, true));
    // 2. Unpointed root
    add(normalizeToken(root, true));
    // 3. Unpointed root consonants
    add(normalizeToken(rootCon, true));

    // 4. If has pronominal suffix, try stem
    if (analysis.pronominalSuffix?.stem) {
      const stem = analysis.pronominalSuffix.stem;
      add(normalizeToken(stem, true, false, true));
      add(normalizeToken(stem, true));
    }

    // 5. Fallback: strip common endings to get closer to lexical root
    const plainRoot = normalizeToken(root, true);
    // Strip plural endings
    if (/ים$/.test(plainRoot))  add(plainRoot.replace(/ים$/, ''));
    if (/ות$/.test(plainRoot))  add(plainRoot.replace(/ות$/, 'ה'));
    if (/ות$/.test(plainRoot))  add(plainRoot.replace(/ות$/, ''));

    // 6. Full original word (pointed and unpointed) — as last resort
    add(normalizeToken(orig, true, false, true));
    add(normalizeToken(orig, true));

    return Array.from(keys).filter(Boolean);
  }

  // ─────────────────────────────────────────────
  //  GLOSS ASSEMBLY
  // ─────────────────────────────────────────────

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

    // Apply pronominal suffix: "su X", "mis Y", etc.
    if (analysis.pronominalSuffix) {
      const base = stripSpanishArticle(gloss);
      const poss = analysis.pronominalSuffix.es;
      gloss = `${poss} ${base}`;
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
    if (!token) return '-';

    // ── Negative existential (אֵין forms) ──
    const neg = resolveNegativeExistential(token);
    if (neg) return neg;

    // ── Run full grammar analysis ──
    const analysis = analyzeHebrewToken(token);

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
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(Boolean);
  }

  /**
   * Improved prefix cluster expansion.
   * Now uses the grammar analysis to decide if a prefix can be peeled off.
   */
  function expandTokenForLookup(token, unpointedMap) {
    const directKey = normalizeToken(token, true);
    if (unpointedMap.has(directKey)) return [token];

    // Use grammar engine to identify peelable prefixes
    const analysis = analyzeHebrewToken(token);
    const root = analysis.root;
    if (root && root !== token) {
      const rootKey = normalizeToken(root, true);
      if (unpointedMap.has(rootKey)) {
        // Return: prefix tokens (as individual chars for now) + root
        const prefixTokens = analysis.prefixes.map(p => p.es || '').filter(Boolean);
        return prefixTokens.length ? [token] : [token]; // Keep original for display, root used in lookup
      }
    }

    return [token];
  }

  // ─────────────────────────────────────────────
  //  LOADING / CACHING
  // ─────────────────────────────────────────────

  let dictionariesPromise = null;
  const hebrewInterlinearBookCache = new Map();

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

  async function getHebrewInterlinearMaps() {
    const books = await Promise.all(
      HEBREW_INTERLINEAR_BOOK_FILES.map((f) =>
        loadJson(`${HEBREW_INTERLINEAR_BASE}/${f}`).catch(() => null)
      )
    );
    return buildHebrewMapFromInterlinear(books.filter(Boolean));
  }

  async function getDictionaries() {
    if (dictionariesPromise) return dictionariesPromise;
    dictionariesPromise = Promise.all([
      getHebrewInterlinearMaps(),
      loadJson(GREEK_DICT_PATH)
    ]).then(([hebrewMaps, greekRows]) => ({
      hebrewMaps,
      greekMap: buildGreekMap(greekRows)
    }));
    return dictionariesPromise;
  }

  async function preload(options = {}) {
    const slug = String(options?.slug || '').trim();
    await getDictionaries();
    if (slug && HEBREW_INTERLINEAR_FILE_BY_SLUG[slug]) {
      await loadHebrewInterlinearBookBySlug(slug);
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
    const { isGreek = false, withAnalysis = false } = options;
    const { hebrewMaps, greekMap } = await getDictionaries();
    const targetMap = isGreek ? greekMap : hebrewMaps;

    const tokens = splitTokens(originalText)
      .flatMap((token) => (isGreek ? [token] : expandTokenForLookup(token, hebrewMaps.unpointedMap)));

    let analysisData = null;
    let spanishTokens;

    if (isGreek) {
      spanishTokens = tokens.map((token) => {
        const key = normalizeToken(token, false, true);
        return key ? (targetMap.get(key) || '-') : '-';
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

    /**
     * Convenience: analyze multiple tokens at once.
     * Returns Analysis[] in the same order.
     */
    analyzeVerse(text) {
      return splitTokens(String(text || '')).map(analyzeHebrewToken);
    }
  };

})();


