// =========================================================================
// TRILINGUE.JS - ORQUESTADOR MULTI-IDIOMA (Hebreo, Griego, Español)
// =========================================================================

/**
 * Normalización avanzada para Griego y Español.
 * Elimina acentos, diacríticos y convierte a minúsculas para búsqueda "fuzzy".
 */
function normalizeFuzzy(str) {
    return String(str || '')
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Quita acentos/diacríticos
        .toLowerCase()
        .trim();
}

function normalizeBookKey(str) {
    return normalizeFuzzy(str)
        .replace(/[^a-z0-9]+/g, '');
}

// Lista de Stopwords Bíblicas Griegas (sin acentos para facilitar el matcheo)
const GREEK_BIBLICAL_STOPWORDS = new Set([
    // Artículos
    'ο', 'η', 'το', 'του', 'τησ', 'τω', 'τη', 'τον', 'την',
    'οι', 'αι', 'τα', 'των', 'τοισ', 'ταισ', 'τουσ', 'τασ',
    // Preposiciones (y sus variaciones por elisión)
    'εν', 'εισ', 'εκ', 'εξ', 'απο', 'απ', 'αφ', 'δια', 'δι', 'επι', 'επ', 'εφ',
    'κατα', 'κατ', 'καθ', 'μετα', 'μετ', 'μεθ', 'παρα', 'παρ', 'περι', 'προ',
    'προσ', 'συν', 'υπο', 'υπ', 'υφ', 'υπερ', 'αντι', 'αντ', 'ανθ', 'ανα', 'αν',
    'αχρι', 'αχρισ', 'μεχρι', 'μεχρισ', 'εωσ', 'αμα', 'ανευ', 'ενεκα', 'ενεκεν',
    'ενωπιον', 'εμπροσθεν', 'οπισω', 'εξω', 'εσω', 'χωρισ', 'περαν',
    // Conjunciones y Partículas Funcionales
    'και', 'δε', 'δ', 'γαρ', 'ουν', 'αλλα', 'αλλ', 'εαν', 'ει',
    'οτι', 'ωσ', 'ωσει', 'ωσπερ', 'ωστε', 'διο', 'διοτι', 'επει', 'τε',
    'επειδη', 'οπωσ', 'ινα', 'καθωσ', 'καθαπερ', 'μεν', 'ουδε', 'ουτε',
    'μηδε', 'μητε', 'μη', 'ου', 'ουκ', 'ουχ', 'ουχι', 'αν', 'καν', 'αρα',
    'αραγε', 'γε', 'ειτε', 'πλην',
    // Interjecciones y adverbios de uso común funcional
    'ιδου', 'ιδε', 'ουαι', 'αμην', 'ποθεν', 'πωσ', 'ποτε', 'ναι', 'νυν', 'τοτε'
]);

/**
 * Extrae la primera palabra útil de una frase griega, ignorando stopwords.
 * Solo procesa la primera entrada (antes de comas/puntos y comas).
 */
function getUsefulGreekWord(rawGreek) {
    if (!rawGreek) return '';

    const firstEntry = String(rawGreek).split(/[,;\/]/)[0].trim();
    const words = firstEntry.split(/\s+/).filter(Boolean);

    if (words.length <= 1) {
        return firstEntry;
    }

    for (const word of words) {
        const cleanWord = word.replace(/[.,;·!?:'’"()\[\]]/g, '');
        const normalizedForCheck = cleanWord
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/ς/g, 'σ');

        if (!GREEK_BIBLICAL_STOPWORDS.has(normalizedForCheck)) {
            return cleanWord;
        }
    }

    return words[0].replace(/[.,;·!?:'’"()\[\]]/g, '');
}

const CANONICAL_BOOK_ORDER = [
    { rank: 1, keys: ['01genesis', 'genesis', 'gen', 'génesis', 'gn'] },
    { rank: 2, keys: ['02exodo', '02éxodo', 'exodo', 'éxodo', 'ex', 'exo'] },
    { rank: 3, keys: ['03levitico', '03levítico', 'levitico', 'levítico', 'lev', 'lv'] },
    { rank: 4, keys: ['04numeros', '04números', 'numeros', 'números', 'num', 'nm'] },
    { rank: 5, keys: ['05deuteronomio', 'deuteronomio', 'deut', 'dt'] }
];

const entryOrderCache = new WeakMap();
const loadingOverlayEl = document.getElementById('loadingOverlay');
const MIN_LOADING_OVERLAY_MS = 450;
let loadingOverlayShownAt = 0;

function setSearchLoading(isLoading) {
    if (!loadingOverlayEl) return;
    loadingOverlayEl.classList.toggle('is-visible', !!isLoading);

if (isLoading) {
        loadingOverlayShownAt = Date.now();
        loadingOverlayEl.classList.remove('is-visible');
        void loadingOverlayEl.offsetWidth;
        loadingOverlayEl.classList.add('is-visible');
    } else {
        loadingOverlayEl.classList.remove('is-visible');
    }
    if (searchBtn) {
        searchBtn.disabled = !!isLoading;
        searchBtn.setAttribute('aria-busy', isLoading ? 'true' : 'false');
    }
}

function waitForNextPaint() {
    return new Promise(resolve => {
        requestAnimationFrame(() => {
            requestAnimationFrame(resolve);
        });
    });
}
function wait(ms) {
    if (!ms || ms <= 0) return Promise.resolve();
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isSingleWordQuery(rawQuery) {
    const parts = String(rawQuery || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    return parts.length <= 1;
}
function getEntryLoadOrder(entry) {
    if (!entry || typeof entry !== 'object') return Number.MAX_SAFE_INTEGER;
    if (entryOrderCache.has(entry)) return entryOrderCache.get(entry);

    const idx = Array.isArray(entries) ? entries.indexOf(entry) : -1;
    const safeIdx = idx >= 0 ? idx : Number.MAX_SAFE_INTEGER;
    entryOrderCache.set(entry, safeIdx);
    return safeIdx;
}

function extractBookStrings(entry) {
    return [
        entry.book,
        entry.bookName,
        entry.book_name,
        entry.libro,
        entry.nombre_libro,
        entry.sourceBook,
        entry._book,
        entry.archivo,
        entry.file,
        entry.filename,
        entry.source,
        entry.ref,
        entry.referencia,
        entry.ubicacion
    ]
        .filter(Boolean)
        .map(v => String(v).trim());
}

function getCanonicalBookRank(entry) {
    const rawValues = extractBookStrings(entry);
    for (const raw of rawValues) {
        const key = normalizeBookKey(raw);
        for (const book of CANONICAL_BOOK_ORDER) {
            if (book.keys.some(alias => key.includes(normalizeBookKey(alias)))) {
                return book.rank;
            }
        }
    }
    return Number.MAX_SAFE_INTEGER;
}

function sortMatchesByBookOrderStable(list) {
    return list
        .map((entry, index) => ({
            entry,
            index,
            bookRank: getCanonicalBookRank(entry),
            loadOrder: getEntryLoadOrder(entry)
        }))
        .sort((a, b) => {
            if (a.bookRank !== b.bookRank) return a.bookRank - b.bookRank;
            if (a.loadOrder !== b.loadOrder) return a.loadOrder - b.loadOrder;
            return a.index - b.index;
        })
        .map(item => item.entry);
}

function getIndexedComparativeCandidates(lang, keys) {
    const api = window.AlefatoIndexedSearchAPI;
    if (!api || typeof api.getCandidates !== 'function') return null;
    return api.getCandidates(lang, (keys || []).filter(Boolean));
}


/**
 * MOTOR DE BÚSQUEDA GRIEGA
 * Permite buscar palabras con o sin acentos.
 */
function searchGreek(query) {
    const normQ = normalizeFuzzy(query);
    if (!normQ) return { ok: false, matches: [] };

    function buildGreekSearchVariants(word) {
        const variants = new Set([word]);
        const add = value => {
            if (!value) return;
            if (Array.isArray(value)) {
                value.forEach(add);
                return;
            }
            variants.add(String(value));
        };
        const replaceEnding = (ending, replacements) => {
            if (!word.endsWith(ending) || word.length <= ending.length) return;
            const stem = word.slice(0, -ending.length);
            add([].concat(replacements || []).map(item => stem + item));
        };

        replaceEnding('ουν', ['ους', 'ου', 'οι']);
        replaceEnding('ους', ['ουν', 'ου', 'οι']);
        replaceEnding('ου', ['ους', 'ουν', 'οι']);
        replaceEnding('ον', ['ος', 'ου']);
        replaceEnding('ος', ['ον', 'ου', 'οι']);
        replaceEnding('οι', ['ος', 'ου', 'ον']);
        replaceEnding('ει', ['ω', 'εις']);
        replaceEnding('εις', ['ει', 'ω']);
        replaceEnding('ην', ['η', 'α']);
        replaceEnding('ης', ['η', 'α']);
        replaceEnding('ας', ['α', 'η']);

        if (word.endsWith('ν') && word.length > 2) add(word.slice(0, -1));

        return Array.from(variants).filter(Boolean);
    }

    function getMainGreekTexts(entry) {
        return [entry.gr, entry.equivalencia_griega, entry.greek]
            .filter(Boolean)
            .map(v => String(v).trim());
    }

    function getCandidateGreekTexts(entry) {
        return (entry.candidatos || [])
            .filter(Boolean)
            .map(v => String(v).trim());
    }

    function greekWordTokens(text) {
        return normalizeFuzzy(text)
            .replace(/[\[\]\{\}\(\)«»"“”'’`]/g, ' ')
            .split(/[^a-z\u0370-\u03ff\u1f00-\u1fff]+/i)
            .map(t => t.trim())
            .filter(Boolean);
    }

    function hasExactGreekToken(texts, token) {
        return texts.some(t => greekWordTokens(t).includes(token));
    }

    function hasExactGreekField(texts, token) {
        return texts.some(t => normalizeFuzzy(t) === token);
    }

    function greekListParts(text) {
        return String(text || '')
            .split(/[,;·/]+/)
            .map(x => String(x || '').trim())
            .filter(Boolean);
    }

    function getGreekTokenContextPriority(raw, token) {
        const cleanRaw = String(raw || '').trim();
        if (!cleanRaw) return 999;

        const normRaw = normalizeFuzzy(cleanRaw);
        if (normRaw === token) return 0;

        const listParts = greekListParts(cleanRaw);
        if (listParts.some(part => normalizeFuzzy(part) === token)) return 1;

        const tokens = greekWordTokens(cleanRaw);
        const idx = tokens.indexOf(token);
        if (idx === -1) return 9;

        const hasListSeparator = /[,;·/]/.test(cleanRaw);
        if (hasListSeparator) return 2;

        return 3;
    }

    function getGreekSpecificity(entry, token) {
        const raw = String(entry.gr || entry.equivalencia_griega || entry.greek || '').trim();
        const tokens = greekWordTokens(raw);
        return {
            matchPriority: getGreekTokenContextPriority(raw, token),
            tokenCount: tokens.length || 999,
            charCount: raw.length || 999,
            raw
        };
    }

    function getHebrewText(entry) {
        return String(entry.he || entry.hebrew || entry.palabra || '').trim();
    }

    function getHebrewPriority(entry) {
        const heb = getHebrewText(entry);
        if (!heb) return { wordCount: 999, charCount: 999 };

        const clean = heb.replace(/[\u05BE]/g, ' ').trim();
        const words = clean ? clean.split(/\s+/).filter(Boolean) : [];
        const wordCount = words.length || 999;

        return { wordCount, charCount: heb.length };
    }

    function sortGreekMatches(list, token) {
        return list.sort((a, b) => {
            const ga = getGreekSpecificity(a, token);
            const gb = getGreekSpecificity(b, token);
            const ha = getHebrewPriority(a);
            const hb = getHebrewPriority(b);

            if (ga.matchPriority !== gb.matchPriority) return ga.matchPriority - gb.matchPriority;
            if (ga.tokenCount !== gb.tokenCount) return ga.tokenCount - gb.tokenCount;
            if (ha.wordCount !== hb.wordCount) return ha.wordCount - hb.wordCount;
            if (ga.charCount !== gb.charCount) return ga.charCount - gb.charCount;
            if (ha.charCount !== hb.charCount) return ha.charCount - hb.charCount;

            const rawCmp = ga.raw.localeCompare(gb.raw, 'el');
            if (rawCmp !== 0) return rawCmp;

            return getHebrewText(a).localeCompare(getHebrewText(b), 'he');
        });
    }

    function getGreekPluralVariants(word) {
        const variants = new Set();
        if (!word) return variants;

        if (word.endsWith('ος')) variants.add(word.slice(0, -2) + 'οι');
        if (word.endsWith('οι') && word.length > 2) variants.add(word.slice(0, -2) + 'ος');

        if (word.endsWith('η')) variants.add(word.slice(0, -1) + 'αι');
        if (word.endsWith('αι') && word.length > 2) variants.add(word.slice(0, -2) + 'η');

        if (word.endsWith('α')) variants.add(word.slice(0, -1) + 'αι');
        if (word.endsWith('αι') && word.length > 2) variants.add(word.slice(0, -2) + 'α');

        if (word.endsWith('ον')) variants.add(word.slice(0, -2) + 'α');
        if (word.endsWith('α') && word.length > 1) variants.add(word.slice(0, -1) + 'ον');

        return variants;
    }

    const pluralVariants = getGreekPluralVariants(normQ);
    const morphologyVariants = buildGreekSearchVariants(normQ);
    const allVariants = Array.from(new Set([normQ, ...pluralVariants, ...morphologyVariants]));
    const candidatePool = getIndexedComparativeCandidates('gr', allVariants) || entries;

    const exactMainFieldMatches = [];
    const exactCandidateFieldMatches = [];
    const exactMainTokenMatches = [];
    const exactCandidateTokenMatches = [];
    const pluralMainFieldMatches = [];
    const pluralCandidateFieldMatches = [];
    const pluralMainTokenMatches = [];
    const pluralCandidateTokenMatches = [];

    candidatePool.forEach(e => {
        const mainTexts = getMainGreekTexts(e);
        const candidateTexts = getCandidateGreekTexts(e);
        if (!mainTexts.length && !candidateTexts.length) return;

        if (allVariants.some(v => hasExactGreekField(mainTexts, v))) {
            exactMainFieldMatches.push(e);
            return;
        }

        if (allVariants.some(v => hasExactGreekField(candidateTexts, v))) {
            exactCandidateFieldMatches.push(e);
            return;
        }

        if (allVariants.some(v => hasExactGreekToken(mainTexts, v))) {
            exactMainTokenMatches.push(e);
            return;
        }

        if (allVariants.some(v => hasExactGreekToken(candidateTexts, v))) {
            exactCandidateTokenMatches.push(e);
            return;
        }

        if (pluralVariants.size && Array.from(pluralVariants).some(v => hasExactGreekField(mainTexts, v))) {
            pluralMainFieldMatches.push(e);
            return;
        }

        if (pluralVariants.size && Array.from(pluralVariants).some(v => hasExactGreekField(candidateTexts, v))) {
            pluralCandidateFieldMatches.push(e);
            return;
        }

        if (pluralVariants.size && Array.from(pluralVariants).some(v => hasExactGreekToken(mainTexts, v))) {
            pluralMainTokenMatches.push(e);
            return;
        }

        if (pluralVariants.size && Array.from(pluralVariants).some(v => hasExactGreekToken(candidateTexts, v))) {
            pluralCandidateTokenMatches.push(e);
        }
    });

    sortGreekMatches(exactMainFieldMatches, normQ);
    sortGreekMatches(exactCandidateFieldMatches, normQ);
    sortGreekMatches(exactMainTokenMatches, normQ);
    sortGreekMatches(exactCandidateTokenMatches, normQ);
    sortGreekMatches(pluralMainFieldMatches, normQ);
    sortGreekMatches(pluralCandidateFieldMatches, normQ);
    sortGreekMatches(pluralMainTokenMatches, normQ);
    sortGreekMatches(pluralCandidateTokenMatches, normQ);

    const finalMatches = [
        ...exactMainFieldMatches,
        ...exactCandidateFieldMatches,
        ...exactMainTokenMatches,
        ...exactCandidateTokenMatches,
        ...pluralMainFieldMatches,
        ...pluralCandidateFieldMatches,
        ...pluralMainTokenMatches,
        ...pluralCandidateTokenMatches
    ].slice(0, 4);

    return {
        ok: finalMatches.length > 0,
        tier: 'Búsqueda Griega (Exacta)',
        matches: finalMatches,
        trace: [
            `Búsqueda exacta griega para: ${query}`,
            `Variantes griegas aceptadas: ${allVariants.join(', ') || 'ninguna'}`,
            candidatePool === entries ? 'Prefiltro indexado: no disponible; se escaneó la base cargada.' : `Prefiltro indexado: ${candidatePool.length} candidato(s).`,
            'Orden: exacto visible completo > exacto en listas léxicas (coma/punto y coma) > exacto como palabra completa en frase > variantes gramaticales/plurales.'
        ],
        diag: 'Se priorizan primero las coincidencias exactas de campo completo; después las coincidencias exactas como palabra completa; al final, variantes gramaticales griegas relacionadas.'
    };
}

/**
 * MOTOR DE BÚSQUEDA ESPAÑOL
 * Coincidencia exacta únicamente, con excepción de plurales regulares simples
 * (por ejemplo: boda <-> bodas, mar <-> mares). Los exactos visibles van primero.
 */
function searchSpanish(query) {
    const firstWord = (query || '').trim().split(/\s+/).filter(Boolean)[0] || '';
    const normQ = normalizeFuzzy(firstWord);

    if (!normQ) return { ok: false, matches: [] };

    function getMainSpanishTexts(entry) {
        return [entry.es, entry.equivalencia_espanol, entry.equivalencia]
            .filter(Boolean)
            .map(v => normalizeFuzzy(v));
    }

    function getCandidateSpanishTexts(entry) {
        return (entry.candidatos || [])
            .filter(Boolean)
            .map(v => normalizeFuzzy(v));
    }

    function getRegularPluralVariants(word) {
        const variants = new Set();
        if (!word) return variants;

        if (/[aeiouáéíóú]$/i.test(word)) {
            variants.add(word + 's');
        } else {
            variants.add(word + 'es');
        }

        if (word.endsWith('es') && word.length > 2) {
            variants.add(word.slice(0, -2));
        }
        if (word.endsWith('s') && word.length > 1) {
            variants.add(word.slice(0, -1));
        }

        return variants;
    }

    function getGreekText(entry) {
        return String(entry.gr || entry.equivalencia_griega || entry.greek || '').trim();
    }

 
    const GREEK_BIBLICAL_STOPWORDS = new Set([
        // 1. Artículos
        'ο', 'η', 'το', 'του', 'τησ', 'τω', 'τη', 'τον', 'την',
        'οι', 'αι', 'τα', 'των', 'τοισ', 'ταισ', 'τουσ', 'τασ',

        // 2. Pronombres (Personales, Demostrativos, Relativos, Indefinidos)
        'εγω', 'μου', 'μοι', 'με', 'ημεισ', 'ημων', 'ημιν', 'ημασ', 
        'συ', 'σου', 'σοι', 'σε', 'υμεισ', 'υμων', 'υμιν', 'υμασ', 
        'αυτοσ', 'αυτου', 'αυτω', 'αυτον', 'αυτη', 'αυτησ', 'αυτην', 
        'αυτο', 'αυτοι', 'αυται', 'αυτων', 'αυτοισ', 'αυταισ', 'αυτουσ', 
        'ταυτα', 'τουτο', 'τουτου', 'τουτω', 'ταυτησ', 'ταυτη', 'ταυτην', 
        'ουτοσ', 'εκεινοσ', 'εκεινη', 'εκεινο', 'τισ', 'τι', 'τινοσ', 
        'τινι', 'τινα', 'τινεσ', 'τινων', 'τισι', 'τινασ', 'οστισ', 
        'ητισ', 'οσ', 'ων', 'οισ', 'ουσ', 'αισ', 'ασ',

        // 3. Verbo Ser/Estar (Cópulas y funcionales)
        'ειμι', 'ει', 'εστι', 'εστιν', 'εσμεν', 'εστε', 'εισι', 'εισιν', 
        'ην', 'ησ', 'ημεθα', 'ητε', 'ησαν', 'εσομαι', 'εση', 'εσται', 
        'εσομεθα', 'εσεσθε', 'εσονται', 'ειναι', 'ων', 'ουσα', 'ον',

        // 4. Preposiciones (Propias, Impropias y sus elisiones)
        'εν', 'εισ', 'εκ', 'εξ', 'απο', 'απ', 'αφ', 'δια', 'δι', 'επι', 'επ', 'εφ',
        'κατα', 'κατ', 'καθ', 'μετα', 'μετ', 'μεθ', 'παρα', 'παρ', 'περι', 'προ', 
        'προσ', 'συν', 'υπο', 'υπ', 'υφ', 'υπερ', 'αντι', 'αντ', 'ανθ', 'ανα', 'αν',
        'αχρι', 'αχρισ', 'μεχρι', 'μεχρισ', 'εωσ', 'αμα', 'ανευ', 'ενεκα', 'ενεκεν', 
        'ενωπιον', 'εναντιον', 'εναντι', 'απεναντι', 'κατεναντι', 'εμπροσθεν', 
        'οπισω', 'οπισθεν', 'εξω', 'εσω', 'εσωθεν', 'εξωθεν', 'χωρισ', 'περαν', 
        'εκτοσ', 'εντοσ', 'ατερ', 'υποκατω', 'υπερανω', 'κυκλω', 'μεσον', 'μεσω',

        // 5. Conjunciones y Partículas Funcionales
        'και', 'δε', 'δ', 'γαρ', 'ουν', 'αλλα', 'αλλ', 'εαν', 'ει', 'ειγε', 'ειπερ',
        'οτι', 'ωσ', 'ωσει', 'ωσπερ', 'ωστε', 'διο', 'διοτι', 'διοπερ', 'επει', 'τε',
        'επειδη', 'επειδηπερ', 'οπωσ', 'ινα', 'καθωσ', 'καθαπερ', 'καθα', 'καθο', 
        'καθοτι', 'μεν', 'μεντοι', 'μενουν', 'μενουνγε', 'ουδε', 'ουτε', 'μηδε', 
        'μητε', 'μη', 'ου', 'ουκ', 'ουχ', 'ουχι', 'αν', 'καν', 'αρα', 'αραγε', 
        'γε', 'ειτε', 'πλην', 'τοινυν', 'τοιγαρουν', 'ουκουν',

        // 6. Interjecciones, Adverbios de tiempo/lugar/modo (Funcionales)
        'ιδου', 'ιδε', 'ουαι', 'αμην', 'ποθεν', 'πωσ', 'ποτε', 'τοτε', 'οτε', 'οταν', 
        'ναι', 'νυν', 'νυνι', 'ετι', 'ηδη', 'αρτι', 'που', 'οπου', 'εκει', 'ωδε', 
        'μαλλον', 'παλιν', 'πολλακισ', 'ευθυσ', 'ειτα', 'επειτα', 'αληθωσ', 'οντωσ', 
        'ισωσ', 'ταχα'
    ]);

    function normalizeGreekStopword(text) {
        return String(text || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/ς/g, 'σ')
            .trim();
    }

    function extractFirstGreekEntryForSpanish(text) {
        return String(text || '')
            .split(/[,;·/]+/)[0]
            ?.trim() || '';
    }

    function tokenizeGreekEntry(entryText) {
        return String(entryText || '')
            .replace(/[\[\]\{\}\(\)«»"“”'’`]/g, ' ')
            .split(/\s+/)
            .map(v => String(v || '').trim())
            .filter(Boolean);
    }

    function pickMeaningfulGreekTokenForSpanish(text) {
        const firstEntry = extractFirstGreekEntryForSpanish(text);
        const tokens = tokenizeGreekEntry(firstEntry);
 // Si la primera entrada griega ya es una sola palabra, no se altera.
        if (tokens.length <= 1) return String(firstEntry || tokens[0] || text || '').trim();

        for (const token of tokens) {
            const normalized = normalizeGreekStopword(token);
            if (!normalized) continue;
            if (!GREEK_BIBLICAL_STOPWORDS.has(normalized)) return token;
        }

 // Fallback: si toda la primera entrada son partículas/funcionales,
        // conservar la primera palabra original de esa entrada.
        return tokens[0] || '';
    }

    function getGreekPriority(entry) {
        const raw = getGreekText(entry);
        const firstPart = extractFirstGreekEntryForSpanish(raw) || raw;
        const firstPartTokens = tokenizeGreekEntry(firstPart);
        const preferredToken = pickMeaningfulGreekTokenForSpanish(firstPart);
const firstPartTokenCount = normalizeFuzzy(firstPart).split(/\s+/).filter(Boolean).length || 999;

        return {
           // Para búsquedas en español, la prioridad solo evalúa la primera entrada griega.
            singleWordPriority: firstPartTokens.length === 1 ? 0 : 1,
            partCount: firstPart ? 1 : 999,
            bestTokenCount: firstPartTokens.length || 999,
            bestCharCount: preferredToken ? preferredToken.length : (firstPart ? firstPart.length : 999),
           
           rawTokenCount: firstPartTokenCount,
            rawCharCount: firstPart ? firstPart.length : 999,
            bestPart: preferredToken || firstPart,
            raw
        };
    }

    function getHebrewText(entry) {
        return String(entry.he || entry.hebrew || entry.palabra || '').trim();
    }

    function getHebrewPriority(entry) {
        const heb = getHebrewText(entry);
        if (!heb) return { wordCount: 999, charCount: 999 };

        const clean = heb.replace(/[\u05BE]/g, ' ').trim();
        const words = clean ? clean.split(/\s+/).filter(Boolean) : [];
        const wordCount = words.length || 999;

        return {
            wordCount,
            charCount: heb.length
        };
    }

    function sortSpanishMatches(list) {
        return list.sort((a, b) => {
            const ga = getGreekPriority(a);
            const gb = getGreekPriority(b);
            const ha = getHebrewPriority(a);
            const hb = getHebrewPriority(b);
            const ba = getCanonicalBookRank(a);
            const bb = getCanonicalBookRank(b);
            const la = getEntryLoadOrder(a);
            const lb = getEntryLoadOrder(b);

            if (ga.singleWordPriority !== gb.singleWordPriority) return ga.singleWordPriority - gb.singleWordPriority;
            if (ga.bestTokenCount !== gb.bestTokenCount) return ga.bestTokenCount - gb.bestTokenCount;
            if (ga.bestCharCount !== gb.bestCharCount) return ga.bestCharCount - gb.bestCharCount;
            if (ga.partCount !== gb.partCount) return ga.partCount - gb.partCount;
            if (ga.rawTokenCount !== gb.rawTokenCount) return ga.rawTokenCount - gb.rawTokenCount;
            if (ga.rawCharCount !== gb.rawCharCount) return ga.rawCharCount - gb.rawCharCount;
            if (ha.wordCount !== hb.wordCount) return ha.wordCount - hb.wordCount;
            if (ha.charCount !== hb.charCount) return ha.charCount - hb.charCount;
            if (ba !== bb) return ba - bb;
            if (la !== lb) return la - lb;

            const greekCmp = ga.bestPart.localeCompare(gb.bestPart, 'el');
            if (greekCmp !== 0) return greekCmp;

            const haText = getHebrewText(a);
            const hbText = getHebrewText(b);
            return haText.localeCompare(hbText, 'he');
        });
    }

    const pluralVariants = getRegularPluralVariants(normQ);

    const exactMainMatches = [];
    const exactCandidateMatches = [];
    const pluralMainMatches = [];
    const pluralCandidateMatches = [];

    entries.forEach(e => {
        const mainTexts = getMainSpanishTexts(e);
        const candidateTexts = getCandidateSpanishTexts(e);
        if (!mainTexts.length && !candidateTexts.length) return;

        if (mainTexts.some(t => t === normQ)) {
            exactMainMatches.push(e);
            return;
        }

        if (candidateTexts.some(t => t === normQ)) {
            exactCandidateMatches.push(e);
            return;
        }

        if (mainTexts.some(t => pluralVariants.has(t))) {
            pluralMainMatches.push(e);
            return;
        }

        if (candidateTexts.some(t => pluralVariants.has(t))) {
            pluralCandidateMatches.push(e);
        }
    });

    sortSpanishMatches(exactMainMatches);
    sortSpanishMatches(exactCandidateMatches);
    sortSpanishMatches(pluralMainMatches);
    sortSpanishMatches(pluralCandidateMatches);

    const finalMatches = [
        ...exactMainMatches,
        ...exactCandidateMatches,
        ...pluralMainMatches,
        ...pluralCandidateMatches
    ];

    const finalMatchesAdjusted = finalMatches.map((entry, index) => {
        if (index !== 0) return entry;

        const greekOriginal = getGreekText(entry);
        const greekToUse = pickMeaningfulGreekTokenForSpanish(greekOriginal);

        return {
            ...entry,
            _grOriginal: greekOriginal,
            gr: greekToUse || greekOriginal || entry.gr || entry.equivalencia_griega || entry.greek || ''
        };
    });

    return {
        ok: finalMatchesAdjusted.length > 0,
        tier: 'Búsqueda Español (Exacta)',
        matches: finalMatchesAdjusted,
        trace: [
            `Búsqueda exacta para: ${firstWord}`,
            `Variantes plurales aceptadas: ${Array.from(pluralVariants).join(', ') || 'ninguna'}`,
            'Prefiltro indexado: desactivado para español para mantener coincidencia exacta completa.',
            'Orden: exacto visible > exacto en candidatos > plural visible > plural en candidatos.',
            'Dentro de cada grupo se prioriza primero una equivalencia griega exacta de una sola palabra; si la primera entrada griega es una frase, se toma su primera palabra útil; después, el hebreo más conciso y por último el orden canónico del libro.'
        ],
        diag: 'Se muestran primero las coincidencias exactas de la traducción visible; dentro de cada grupo se prioriza una equivalencia griega exacta de una sola palabra y, si la primera entrada griega es frase, se toma su primera palabra útil; luego el hebreo más conciso y finalmente el orden de libro.'
    };
}

/**
 * RENDERIZADO UNIFICADO
 * Asegura que se vean las 3 columnas pase lo que pase.
 */
function renderResults(items, rawQuery = '') {
    // Usamos la función de buscador2.js para procesar las glosas si vienen del hebreo
    const displayItems = typeof buildDisplayResults === 'function'
        ? buildDisplayResults(items, rawQuery)
        : items;
    

    if (!displayItems || !displayItems.length) {
        if (resultsTbodyEl) {
            resultsTbodyEl.innerHTML = '<tr><td colspan="4" class="muted">Sin resultados precisos para esta entrada.</td></tr>';
                    }
        updateDictionaryComparison([], rawQuery);
        notifyRenderedResults([], rawQuery);
        return;
    }

const limitedItems = displayItems.slice(0, 4).map(item => {
        const rkantMatches = getRkantMatchesForEntry(item);
        const ntGreekVariants = uniqueByKey(rkantMatches.map(m => m.gr).filter(Boolean), x => normalizeGreekComparable(x));
        const ntSpanishVariants = uniqueByKey(rkantMatches.map(m => m.es).filter(Boolean), x => normalizeSpanishComparable(x));
        const ntHebrewVariants = uniqueByKey(rkantMatches.map(m => m.he).filter(Boolean), x => normalizeHebrewComparable(x));

        return {
            ...item,
            gr_nt: item.gr_nt || ntGreekVariants[0] || '',
            es_nt: ntSpanishVariants[0] || '',
            he_nt: ntHebrewVariants[0] || '',
            gr_nt_variants: ntGreekVariants,
            es_nt_variants: ntSpanishVariants,
            he_nt_variants: ntHebrewVariants
        };
    });

    if (!resultsTbodyEl) return;


    resultsTbodyEl.innerHTML = limitedItems.map(e => {
        const griego = e.gr || e.equivalencia_griega || e.greek || '—';
        const griegoNt = e.gr_nt || e.equivalencia_griega_nt || e.greek_nt || '';
        return `
        <tr>
            <td class="he">${escapeHtml(e.he)}</td>
            <td class="gr" data-gr-source="lxx" style="font-family: 'Times New Roman', serif; font-size: 1.2rem; color: #1e3a8a;">
                            ${escapeHtml(griego)}
            </td>

             <td class="gr gr-nt" data-gr-source="rknt" style="font-family: 'Times New Roman', serif; font-size: 1.2rem; color: #1e3a8a;">
                ${escapeHtml(griegoNt || '—')}
            </td>
            <td class="es">
                ${e._isSynthetic ? `<small style="color:var(--muted)">[Sintético]</small> ` : ''}
                ${escapeHtml(e.es || '—')}
            </td>
        </tr>
    `}).join('');

 updateDictionaryComparison(limitedItems, rawQuery);
    notifyRenderedResults(limitedItems, rawQuery);
}

function notifyRenderedResults(items, rawQuery) {
    if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
    window.dispatchEvent(new CustomEvent('trilingue:results-rendered', {
        detail: {
            items: Array.isArray(items) ? items : [],
            rawQuery: String(rawQuery || '')
        }
    }));
}

if (typeof window !== 'undefined') {
    window.TrilingueComparativoAPI = Object.assign({}, window.TrilingueComparativoAPI || {}, {
        updateDictionaryComparison
    });
}

const RKANT_NT_STATE = {
    loadAttempted: false,
    loaded: false,
    entries: []
};

async function ensureRkantNtLoaded() {
    if (RKANT_NT_STATE.loaded || RKANT_NT_STATE.loadAttempted) return RKANT_NT_STATE;
    RKANT_NT_STATE.loadAttempted = true;
    try {
 const files = [
            '01JuanEF.json',
            '02MateoEf.json',
            '03MarcosEF.json',
            '04LucasEF.json',
            '05HechosEF.json',
            '06JacoboEF.json',
            '07Pedro1EF.json',
            '08Pedro2EF.json',
            '09JudasEF.json',
            '10Juan1EF.json',
            '11Juan2EF.json',
            '12Juan3EF.json',
            '13GálatasEF.json',
            '14Tesalonicenses1EF.json',
            '15Tesalonicenses2EF.json',
            '16Corintios1EF.json',
            '17Corintios2EF.json',
            '18RomanosEF.json',
            '19EfesiosEF.json',
            '20Filipenses.json',
            '21ColosensesEF.json',
            '22HebreosEF.json',
            '23FilemónEF.json',
            '24Timoteo1EF.json',
            '25TitoEF.json',
            '26Timoteo2EF.json',
            '27ApocalipsisEF.json'
        ];
                const payloads = await Promise.all(files.map(name =>
            fetchJsonWithFallback([
        `../dic/trilingueNT/${name}`
            ]).catch(() => [])
        ));
        RKANT_NT_STATE.entries = payloads.flat().filter(entry => entry && typeof entry === 'object').map(entry => ({
            he: String(entry.texto_hebreo || entry.he || '').trim(),
            gr: String(entry.equivalencia_griega || entry.gr || '').trim(),
            es: String(entry.equivalencia_espanol || entry.equivalencia_español || entry.es || '').trim(),
            candidatos: Array.isArray(entry.candidatos) ? entry.candidatos : []
        })).filter(entry => entry.he || entry.gr || entry.es);
    } catch (_) {
        RKANT_NT_STATE.entries = [];
    }
    RKANT_NT_STATE.loaded = true;
    return RKANT_NT_STATE;
}

function normalizeGreekComparable(text) {
    return normalizeFuzzy(String(text || '')).replace(/ς/g, 'σ').replace(/[^a-zͰ-Ͽἀ-῿0-9]+/g, '');
}

function normalizeHebrewComparable(text) {
    return normalizeHebrewComparableKey(text || '');
}

function normalizeSpanishComparable(text) {
    return normalizeFuzzy(String(text || '')).replace(/[^a-z0-9ñ\s]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokenizeGreekComparable(text) {
    return normalizeFuzzy(String(text || ''))
        .replace(/ς/g, 'σ')
        .split(/[^a-zͰ-Ͽἀ-῿0-9]+/i)
        .map(t => t.trim())
        .filter(Boolean);
}

function uniqueByKey(list, keyFn) {
    const seen = new Set();
    const out = [];
    list.forEach(item => {
        const key = keyFn(item);
        if (!key || seen.has(key)) return;
        seen.add(key);
        out.push(item);
    });
    return out;
}

function getRkantMatchesForEntry(baseEntry) {
    const source = Array.isArray(RKANT_NT_STATE.entries) ? RKANT_NT_STATE.entries : [];
    if (!source.length || !baseEntry) return [];

    const baseHeb = normalizeHebrewComparable(baseEntry.he || baseEntry.hebrew || '');
    const baseGreekTokens = tokenizeGreekComparable(baseEntry.gr || baseEntry.equivalencia_griega || baseEntry.greek || '');
    const baseGreekSet = new Set(baseGreekTokens);

    const byHebrew = baseHeb
        ? source.filter(entry => normalizeHebrewComparable(entry.he) === baseHeb)
        : [];

    const byGreek = baseGreekSet.size
        ? source.filter(entry => tokenizeGreekComparable(entry.gr).some(tok => baseGreekSet.has(tok)))
        : [];

    return uniqueByKey([...byGreek, ...byHebrew], item => `${item.he}|${item.gr}|${item.es}`);
}

function searchRkantNt(rawQuery) {
    const q = String(rawQuery || '').trim();
    const source = Array.isArray(RKANT_NT_STATE.entries) ? RKANT_NT_STATE.entries : [];
    if (!q || !source.length) return [];

    const isHebrew = /[֐-׿]/.test(q);
    const isGreek = /[Ͱ-Ͽἀ-῿]/.test(q);

    if (isHebrew) {
        const key = normalizeHebrewComparable(q);
        return source.filter(e => normalizeHebrewComparable(e.he) === key);
    }
    if (isGreek) {
        const token = normalizeGreekComparable(q);
        return source.filter(e => tokenizeGreekComparable(e.gr).includes(token));
    }

    const key = normalizeSpanishComparable(q.split(/\s+/)[0] || q);
    return source.filter(e => {
        const es = normalizeSpanishComparable(e.es);
        if (es.split(' ').includes(key)) return true;
        return (Array.isArray(e.candidatos) ? e.candidatos : []).some(c => normalizeSpanishComparable(c).split(' ').includes(key));
    });
}


const HEBREW_DICT_STATE = {
        loadAttempted: false,
    loaded: false,
    entries: [],
     index: {},
    lexico: [],
    unified: []
};

const UNIFIED_STRONG_INDEX = new Map();

function normalizeHebrewLemmaForLookup(text) {
    try {
        return String(text || '').normalize('NFC').replace(/\s+/g, ' ').trim();
    } catch (_) {
        return String(text || '').replace(/\s+/g, ' ').trim();
    }
}

async function fetchJsonWithFallback(urls) {
    let lastError = null;
    for (const url of urls) {
        try {
            const response = await fetch(url, { cache: 'force-cache' });
            if (!response.ok) {
                lastError = new Error(`No se pudo cargar ${url} (HTTP ${response.status}).`);
                continue;
            }
const rawText = await response.text();
            return parseJsonPayload(rawText, url);
                    } catch (error) {
            lastError = error;
        }
    }
    throw lastError || new Error('No se pudo cargar el recurso JSON solicitado.');
}

function parseJsonPayload(rawText, sourceLabel = 'JSON') {
    const text = String(rawText || '').trim();
    if (!text) return [];

    try {
        return JSON.parse(text);
    } catch (singleParseError) {
        const decoder = [];
        let index = 0;

        while (index < text.length) {
            while (index < text.length && /\s/.test(text[index])) index += 1;
            if (index >= text.length) break;

            let parsedChunk;
            try {
                parsedChunk = JSON.parse(text.slice(index));
            } catch (_) {
                parsedChunk = null;
            }

            if (parsedChunk !== null) {
                decoder.push(parsedChunk);
                break;
            }

            let end = index;
            let depth = 0;
            let inString = false;
            let escaping = false;
            for (; end < text.length; end += 1) {
                const char = text[end];
                if (inString) {
                    if (escaping) {
                        escaping = false;
                    } else if (char === '\\') {
                        escaping = true;
                    } else if (char === '"') {
                        inString = false;
                    }
                    continue;
                }

                if (char === '"') {
                    inString = true;
                    continue;
                }

                if (char === '[' || char === '{') {
                    depth += 1;
                } else if (char === ']' || char === '}') {
                    depth -= 1;
                    if (depth === 0) {
                        end += 1;
                        break;
                    }
                }
            }

            const chunk = text.slice(index, end).trim();
            if (!chunk) break;

            decoder.push(JSON.parse(chunk));
            index = end;
        }

        if (!decoder.length) {
            throw new Error(`No se pudo interpretar ${sourceLabel}: ${singleParseError.message}`);
        }

        if (decoder.length === 1) return decoder[0];
        return decoder.flatMap(part => Array.isArray(part) ? part : [part]);
    }
}

async function ensureHebrewDictionaryLoaded() {

if (HEBREW_DICT_STATE.loaded || HEBREW_DICT_STATE.loadAttempted) return HEBREW_DICT_STATE;
    HEBREW_DICT_STATE.loadAttempted = true;

    async function loadOptionalJson(urls, fallbackValue) {
        try {
            return await fetchJsonWithFallback(urls);
        } catch (_) {
            return fallbackValue;
        }
    }
        try {
        const [entriesData, indexData, lexicoData, unifiedData] = await Promise.all([
             loadOptionalJson(['../dic/hebrewdic.json'], []),
            loadOptionalJson(['../dic/diccionario_index_by_lemma.json'], {}),
            loadOptionalJson(['../diccionario/lexico_hebreo.json'], []),
            loadOptionalJson(['../diccionario/diccionario_unificado.min.json'], [])
        ]);

        HEBREW_DICT_STATE.entries = Array.isArray(entriesData) ? entriesData : [];
        HEBREW_DICT_STATE.index = indexData && typeof indexData === 'object' ? indexData : {};
        HEBREW_DICT_STATE.lexico = Array.isArray(lexicoData) ? lexicoData : [];
        HEBREW_DICT_STATE.unified = Array.isArray(unifiedData) ? unifiedData : [];
                buildUnifiedStrongIndex();
        HEBREW_DICT_STATE.loaded = true;
    } catch (error) {
         console.warn('No se pudieron cargar algunos recursos del diccionario hebreo.', error);
        HEBREW_DICT_STATE.loaded = true;
    }
    return HEBREW_DICT_STATE;
}

function findHebrewDictionaryEntry(rawHebrew) {
    const state = HEBREW_DICT_STATE;
    const source = Array.isArray(state.entries) ? state.entries : [];
    const index = state.index && typeof state.index === 'object' ? state.index : {};
    const query = normalizeHebrewLemmaForLookup(rawHebrew);
    const queryVariants = buildHebrewLookupVariants(rawHebrew);
    if (!query) return null;

    const byId = new Map(source.map(entry => [entry.id, entry]));
    const isExactHebrewDictionaryMatch = (entry) => {
        if (!entry || typeof entry !== 'object') return false;
        const entryVariants = new Set([
            ...buildHebrewLookupVariants(entry?.lemma),
            ...buildHebrewLookupVariants(entry?.headword_line)
        ]);
        return Array.from(queryVariants).some(variant => entryVariants.has(variant));
    };

    const indexedIds = index[query] || [];
    if (Array.isArray(indexedIds) && indexedIds.length) {
        for (const id of indexedIds) {
            const exactById = byId.get(id);
            if (isExactHebrewDictionaryMatch(exactById)) return exactById;
        }
    }

    for (const entry of source) {
        if (isExactHebrewDictionaryMatch(entry)) return entry;
    }

    return null;
}

function findHebrewLexicoEntries(rawHebrew) {
    const source = Array.isArray(HEBREW_DICT_STATE.lexico) ? HEBREW_DICT_STATE.lexico : [];
    const query = normalizeHebrewLemmaForLookup(rawHebrew);
    const queryVariants = buildHebrewLookupVariants(rawHebrew);
    if (!query || !source.length) return [];

    return source.filter(entry => {
        const entryVariants = buildHebrewLookupVariants(entry?.palabra);
        return Array.from(queryVariants).some(variant => entryVariants.has(variant));
    });
}

function normalizeHebrewComparableKey(text) {
    const normalized = normalizeHebrewLemmaForLookup(text);
    if (!normalized) return '';

    return normalized
        .normalize('NFD')
        .replace(/[֑-ׇ]/g, '')
        .replace(/[־\-‐‑‒–—]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .normalize('NFC');
}

function buildHebrewLookupVariants(value) {
    const variants = new Set();
    const base = normalizeHebrewLemmaForLookup(value);
    if (!base) return variants;

    variants.add(base);

    const comparable = normalizeHebrewComparableKey(base);
    if (comparable) variants.add(comparable);

    if (comparable.startsWith('ה') && comparable.length > 2) {
        variants.add(comparable.slice(1));
    }

    if (comparable.endsWith('ת') && comparable.length > 2) {
        const stem = comparable.slice(0, -1);
        variants.add(stem);
        variants.add(`${stem}ה`);
    }

    if (comparable.endsWith('י') && comparable.length > 2) {
        const stem = comparable.slice(0, -1);
        variants.add(stem);
        variants.add(`${stem}ים`);
        variants.add(`${stem}ות`);
        variants.add(`${stem}ה`);
    }

    return variants;
}

function normalizeStrongForLookup(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    const upper = text.toUpperCase();
    const match = upper.match(/H?\s*0*(\d{1,4})/);
    if (!match) return upper.replace(/\s+/g, '');
    return `H${match[1]}`;
}

function buildUnifiedStrongIndex() {
    UNIFIED_STRONG_INDEX.clear();
    const source = Array.isArray(HEBREW_DICT_STATE.unified) ? HEBREW_DICT_STATE.unified : [];

    source.forEach(entry => {
        const key = normalizeStrongForLookup(entry?.strong);
        if (!key || UNIFIED_STRONG_INDEX.has(key)) return;
        UNIFIED_STRONG_INDEX.set(key, entry);
    });
}

function formatUnifiedStrongReference(entry) {
    if (!entry || typeof entry !== 'object') return 'referencia no disponible';

    const lema = entry?.strong_detail?.lemma || entry?.lemma || entry?.hebreo || entry?.forma || '—';
    const forma = entry?.forma || entry?.strong_detail?.forma || '—';
    const transliteracion = entry?.strong_detail?.transliteracion || entry?.transliteracion || '—';

    return `lema ${lema} · forma ${forma} · transliteración ${transliteracion}`;
}

function resolveDerivacionStrongRefs(rawDerivacion) {
    const source = String(rawDerivacion || '').trim();
    if (!source) return '—';
    if (!/\d/.test(source)) return source;

    return source.replace(/\bH?\s*\d{1,4}\b/gi, match => {
        const key = normalizeStrongForLookup(match);
        const referenceEntry = UNIFIED_STRONG_INDEX.get(key);
        return formatUnifiedStrongReference(referenceEntry);
    });
}

function collectUnifiedLookupCandidates({ rawHebrew, lemmaCandidates = [], strongCandidates = [] } = {}) {
    const hebrewCandidates = new Set();
    const strongSet = new Set();

    const pushHebrew = (value) => {
        buildHebrewLookupVariants(value).forEach(candidate => hebrewCandidates.add(candidate));
    };

    const pushStrong = (value) => {
        const normalized = normalizeStrongForLookup(value);
        if (normalized) strongSet.add(normalized);
    };

    pushHebrew(rawHebrew);
    lemmaCandidates.forEach(pushHebrew);
    strongCandidates.forEach(pushStrong);

    return { hebrewCandidates, strongSet };
}

function findHebrewUnifiedEntries(rawHebrew, options = {}) {
    const source = Array.isArray(HEBREW_DICT_STATE.unified) ? HEBREW_DICT_STATE.unified : [];
    if (!source.length) return [];

    const { hebrewCandidates, strongSet } = collectUnifiedLookupCandidates({ rawHebrew, ...options });
    if (!hebrewCandidates.size && !strongSet.size) return [];

    const results = [];
    const seen = new Set();
  const hasHebrewMatches = source.some(entry => {
        const entryHebrew = new Set([
            entry?.strong_detail?.lemma,
            entry?.lemma,
            entry?.hebreo,
            entry?.forma,
            ...(Array.isArray(entry?.hebreos) ? entry.hebreos : []),
            ...(Array.isArray(entry?.formas) ? entry.formas : [])
        ].flatMap(value => Array.from(buildHebrewLookupVariants(value))).filter(Boolean));

        return Array.from(hebrewCandidates).some(candidate => entryHebrew.has(candidate));
    });
    source.forEach(entry => {
        const entryHebrew = new Set([
            entry?.strong_detail?.lemma,
            entry?.lemma,
            entry?.hebreo,
            entry?.forma,
            ...(Array.isArray(entry?.hebreos) ? entry.hebreos : []),
            ...(Array.isArray(entry?.formas) ? entry.formas : [])
        ].flatMap(value => Array.from(buildHebrewLookupVariants(value))).filter(Boolean));
         
        const entryStrong = normalizeStrongForLookup(entry?.strong);

        const hebrewMatch = Array.from(hebrewCandidates).some(candidate => entryHebrew.has(candidate));
        const strongMatch = !hasHebrewMatches && !!entryStrong && strongSet.has(entryStrong);
                if (!hebrewMatch && !strongMatch) return;

        const lemmaKey = normalizeHebrewLemmaForLookup(entry?.strong_detail?.lemma || entry?.lemma || entry?.hebreo || entry?.forma);
        const dedupeKey = `${entryStrong}|${lemmaKey}`;
        if (seen.has(dedupeKey)) return;
        seen.add(dedupeKey);
        results.push(entry);
    });

    return results;
}

function extractStrongCandidatesFromText(text) {
    const source = String(text || '');
    if (!source) return [];

    const matches = source.match(/\bH?\s*\d{1,4}\b/gi) || [];
    return matches.map(item => normalizeStrongForLookup(item)).filter(Boolean);
}

function buildDictionaryMetaFromComparison(primary, hebrewEntry, rawHebrew) {
    const lemmaCandidates = [
        rawHebrew,
        primary?.he,
        primary?.hebrew,
        primary?.palabra,
        primary?.lemma,
        primary?.lemmas,
        hebrewEntry?.lemma,
        hebrewEntry?.headword_line
    ].flat().filter(Boolean);

    const strongCandidates = [
        primary?.strong,
        primary?.strongs,
        primary?.strongNumber,
        hebrewEntry?.strong,
        hebrewEntry?.strongs,
        ...extractStrongCandidatesFromText(hebrewEntry?.gloss_es),
        ...extractStrongCandidatesFromText(hebrewEntry?.text)
    ].flat().filter(Boolean);

    return { lemmaCandidates, strongCandidates };
}

function renderHebrewLexicoSupplement(rawHebrew) {
    const lexicoEntries = findHebrewLexicoEntries(rawHebrew);
     if (!lexicoEntries.length) return '';

    return lexicoEntries.slice(0, 2).map(entry => {
        const morfologia = Array.isArray(entry?.morfologia) ? entry.morfologia.filter(Boolean) : [];
        const variantes = Array.isArray(entry?.variantes) ? entry.variantes.filter(Boolean) : [];
        const fraseologia = Array.isArray(entry?.fraseologia) ? entry.fraseologia.filter(Boolean) : [];
        const referencias = Array.isArray(entry?.referencias) ? entry.referencias.filter(Boolean) : [];

        return `
          <div class="trilingual-brief mt-3">
            <div class="dict-entry-kicker">Diccionario A</div>
            <div class="trilingual-line"><strong>Palabra:</strong> <span class="hebrew">${escapeHtml(entry?.palabra || rawHebrew || '—')}</span></div>
            <div class="trilingual-line"><strong>Descripción:</strong> ${escapeHtml(entry?.descripcion || '—')}</div>
            ${morfologia.length ? `<div class="trilingual-line"><strong>Morfología:</strong> ${morfologia.map(item => escapeHtml(item)).join(' · ')}</div>` : ''}
            ${variantes.length ? `<div class="trilingual-line"><strong>Variantes:</strong> ${variantes.map(item => `<span class="tag">${escapeHtml(item)}</span>`).join(' ')}</div>` : ''}
            ${fraseologia.length ? `<div class="trilingual-line"><strong>Fraseología:</strong> ${fraseologia.slice(0, 3).map(item => escapeHtml(item)).join(' | ')}</div>` : ''}
            ${referencias.length ? `<div class="trilingual-line"><strong>Referencias:</strong> ${referencias.map(item => escapeHtml(item)).join(' · ')}</div>` : ''}
          </div>
        `;
    }).join('');
}

function renderHebrewUnifiedSupplement(rawHebrew, options = {}) {
    const unifiedEntries = findHebrewUnifiedEntries(rawHebrew, options);
    if (!unifiedEntries.length) return '';

    return unifiedEntries.map(entry => {
        const lema = entry?.strong_detail?.lemma || entry?.lemma || entry?.hebreo || entry?.forma || rawHebrew || '—';
        const transliteracion = entry?.strong_detail?.transliteracion || entry?.transliteracion || '—';
        const glosa = entry?.glosa || entry?.strong_detail?.glosa || '—';
        const definicion = entry?.strong_detail?.definicion || entry?.definicion || '—';
        const defRv = entry?.strong_detail?.def_rv || entry?.def_rv || '—';
        const derivacion = resolveDerivacionStrongRefs(entry?.strong_detail?.derivacion || entry?.derivacion || '—');
        return `
          <div class="trilingual-brief mt-3 dict-entry">
            <div class="dict-entry-header">
              <div class="dict-entry-kicker">Diccionario B</div>
              <div class="dict-entry-title hebrew">${escapeHtml(lema)}</div>
            </div>
            <div class="trilingual-line"><strong>Lema:</strong> <span class="hebrew">${escapeHtml(lema)}</span></div>
            <div class="trilingual-line"><strong>Transliteración:</strong> ${escapeHtml(transliteracion)}</div>
            <div class="trilingual-line"><strong>Glosa:</strong> ${escapeHtml(glosa)}</div>
            <div class="trilingual-line"><strong>Definición:</strong> ${escapeHtml(definicion)}</div>
            <div class="trilingual-line"><strong>Definición RV:</strong> ${escapeHtml(defRv)}</div>
            <div class="trilingual-line"><strong>Derivación:</strong> ${escapeHtml(derivacion)}</div>
          </div>
        `;
    }).join('');
}
function splitParagraphsFromDictionaryText(text) {
    return String(text || '')
        .replace(/\r/g, '')
        .split(/\n{2,}/)
        .map(block => block.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim())
        .filter(Boolean);
}

function extractStructuredHebrewSections(entry) {
    const paragraphs = splitParagraphsFromDictionaryText(entry?.text || '');
    const sections = [];
    let currentSection = null;
    let currentSubsection = null;

    function ensureSection(title) {
        currentSection = { title, paragraphs: [], children: [] };
        sections.push(currentSection);
        currentSubsection = null;
    }

    function ensureSubsection(title) {
        if (!currentSection) ensureSection('Entrada');
        currentSubsection = { title, paragraphs: [] };
        currentSection.children.push(currentSubsection);
    }

    paragraphs.forEach((paragraph, idx) => {
        const cleaned = paragraph.trim();
        if (!cleaned) return;

        if (/^[A-ZÁÉÍÓÚÑ]\.\s+/.test(cleaned)) {
            ensureSection(cleaned);
            return;
        }

        if (/^\d+\.\s+/.test(cleaned)) {
            ensureSubsection(cleaned);
            return;
        }

        if (/^Nota\./i.test(cleaned)) {
            ensureSubsection('Nota');
            currentSubsection.paragraphs.push(cleaned);
            return;
        }

        if (idx === 0 && !currentSection) {
            ensureSection('Cabecera léxica');
            currentSection.paragraphs.push(cleaned);
            return;
        }

        if (currentSubsection) {
            currentSubsection.paragraphs.push(cleaned);
        } else if (currentSection) {
            currentSection.paragraphs.push(cleaned);
        } else {
            ensureSection('Entrada');
            currentSection.paragraphs.push(cleaned);
        }
    });

    return sections;
}

function formatReferencesInline(text) {
    return escapeHtml(String(text || ''))
        .replace(/\b((?:Gn|Ex|Lv|Nm|Dt|Jos|Jue|Rut|1\s?Sm|2\s?Sm|1\s?Re|2\s?Re|1\s?Cr|2\s?Cr|Esd|Neh|Est|Job|Sal|Prov|Ecl|Cant|Is|Jr|Lam|Ez|Dn|Os|Jl|Am|Abd|Jon|Miq|Nah|Hab|Sof|Ag|Zac|Mal|Eclo)\s+\d+(?:,\d+)?(?:s)?(?:\s+\d+(?:,\d+)?)*)/g, '<span class="tag">$1</span>');
}

function renderStructuredHebrewEntry(entry) {
    

    return `
        <div class="trilingual-brief mb-3">
          <div class="trilingual-title hebrew">${escapeHtml(entry.lemma || '—')}</div>
           <div class="trilingual-line"><strong>lema:</strong> ${escapeHtml(entry.lemma || '—')}</div>
          <div class="trilingual-line"><strong>headword_line:</strong> ${escapeHtml(entry.headword_line || '—')}</div>
          <div class="trilingual-line"><strong>gloss_es:</strong> ${escapeHtml(entry.gloss_es || '—')}</div>
          <div class="trilingual-line"><strong>text:</strong> ${escapeHtml(entry.text || 'Sin texto disponible.')}</div>
        </div>
        
    `;
}

function renderGreekComparisonCell(entry, rawQuery) {
    const greek = entry?.gr
        || entry?.equivalencia_griega
        || entry?.greek
        || entry?.gr_nt
        || entry?.equivalencia_griega_nt
        || entry?.greek_nt
        || (/[Ͱ-Ͽἀ-῿]/.test(String(rawQuery || '')) ? rawQuery : '')
        || '—';
    const blocks = [];
    if (window.AnalisisDiccionarioAGriego?.renderGreekDictionaryCell) {
        blocks.push(window.AnalisisDiccionarioAGriego.renderGreekDictionaryCell(greek, rawQuery));
            } else {
        blocks.push(`<pre class="comparison-pre comparison-pre--greek">${escapeHtml(greek)}</pre>`);    
    }

if (window.AnalisisDiccionarioBEric?.renderEricDictionaryCell) {
        blocks.push(window.AnalisisDiccionarioBEric.renderEricDictionaryCell(rawQuery, entry, { lang: 'gr', tableValue: greek }));
    }

    return Promise.all(blocks).then(items => items.join(''));
}

 
async function updateDictionaryComparison(items, rawQuery) {
    const tbody = document.getElementById('dictionaryComparisonTbody');
    if (!tbody) return;

const fallbackEricOnly = async (message, fallbackEntry = null, fallbackTableValue = '') => {
        tbody.innerHTML = '<tr><td colspan="2" class="muted">Consultando diccionario Eric…</td></tr>';
        if (window.AnalisisDiccionarioBEric?.ensureLoaded) {
            await window.AnalisisDiccionarioBEric.ensureLoaded();
        }
         const ericLookupValue = String(
            fallbackTableValue ||
            fallbackEntry?.he ||
            fallbackEntry?.hebrew ||
            fallbackEntry?.palabra ||
            fallbackEntry?.gr ||
            fallbackEntry?.equivalencia_griega ||
            fallbackEntry?.greek ||
            fallbackEntry?.texto_hebreo ||
            rawQuery ||
            ''
        ).trim();
        const ericBlock = window.AnalisisDiccionarioBEric?.renderEricDictionaryCell
              ? window.AnalisisDiccionarioBEric.renderEricDictionaryCell(rawQuery, fallbackEntry, { lang: 'he', tableValue: ericLookupValue })
            : '<div class="comparison-pre comparison-pre--hebrew">Sin datos en el diccionario Eric.</div>';

            tbody.innerHTML = `
          <tr>
            <td><div class="comparison-pre comparison-pre--greek">${escapeHtml(message)}</div></td>
            <td>${ericBlock}</td>
          </tr>
        `;
    };

    const primary = Array.isArray(items) && items.length ? items[0] : null;
    if (!primary) {
 await fallbackEricOnly('Sin candidato principal para comparar en el corpus trilingüe. Se muestra coincidencia directa por consulta.', null, rawQuery);
          return;
    }

    const hebrewCandidate = String(primary.he || primary.hebrew || primary.palabra || '').trim();
    if (!hebrewCandidate) {
await fallbackEricOnly('La primera fila no contiene hebreo utilizable para el comparador principal. Se muestra coincidencia directa por consulta.', primary, primary?.gr || primary?.equivalencia_griega || primary?.greek || primary?.texto_hebreo || rawQuery);
                return;
    }

    tbody.innerHTML = '<tr><td colspan="2" class="muted">Consultando diccionarios…</td></tr>';
    await ensureHebrewDictionaryLoaded();
     if (window.AnalisisDiccionarioAGriego?.ensureLoaded) {
        await window.AnalisisDiccionarioAGriego.ensureLoaded();
         }
    if (window.AnalisisDiccionarioBEric?.ensureLoaded) {
        await window.AnalisisDiccionarioBEric.ensureLoaded();
    }
      const hebrewEntry = findHebrewDictionaryEntry(hebrewCandidate);
    const hebrewBlocks = [];

    if (hebrewEntry) {
        hebrewBlocks.push(renderStructuredHebrewEntry(hebrewEntry));
    }

    const lexicoSupplement = renderHebrewLexicoSupplement(hebrewCandidate);
    if (lexicoSupplement) {
        hebrewBlocks.push(lexicoSupplement);
    }

 const unifiedLookupMeta = buildDictionaryMetaFromComparison(primary, hebrewEntry, hebrewCandidate);
    const unifiedSupplement = renderHebrewUnifiedSupplement(hebrewCandidate, unifiedLookupMeta);
        if (unifiedSupplement) {
        hebrewBlocks.push(unifiedSupplement);
    }
if (window.AnalisisDiccionarioBEric?.renderEricDictionaryCell) {
        hebrewBlocks.unshift(window.AnalisisDiccionarioBEric.renderEricDictionaryCell(rawQuery, primary, { lang: 'he', tableValue: hebrewCandidate }));
    }
    const hebrewHtml = hebrewBlocks.length
        ? hebrewBlocks.join('')
        : '<div class="comparison-pre comparison-pre--hebrew">Sin datos en el diccionario.</div>';
    const greekHtml = await renderGreekComparisonCell(primary, rawQuery);
            tbody.innerHTML = `
      <tr>
        <td>${greekHtml}</td>
        <td>${hebrewHtml}</td>
      </tr>
    `;
}

/**
 * SOBREESCRITURA DE DO-SEARCH
 * Detecta el idioma y dirige al motor correcto.
 */
async function doSearch() {
    setSearchLoading(true);
    await waitForNextPaint();
        try {
        if ((!entries || !entries.length) && typeof window.ensureRemoteAlefatoLoaded === 'function') {
            try {
                await window.ensureRemoteAlefatoLoaded();
            } catch (error) {
                setTierBadge('Sin Datos', false);
                if (diagEl) diagEl.textContent = 'No se pudo cargar la base remota para la consulta.';
                return;
            }
        }

        if (!entries || !entries.length) {
            setTierBadge('Sin Datos', false);
if (diagEl) diagEl.textContent = 'Por favor, cargue los archivos JSON de los libros primero.';
            return;
        }
    

    const rawQuery = queryEl?.value?.trim() || '';
    if (!rawQuery) return;
    if (!isSingleWordQuery(rawQuery)) {
        renderResults([], rawQuery);
        if (resultCountEl) resultCountEl.textContent = '0 resultado(s)';
        setTierBadge('Entrada no válida', false);
        if (diagEl) diagEl.textContent = 'Solo se aceptan entradas de palabras únicas, no frases.';
        if (traceEl) traceEl.textContent = 'Consulta rechazada: se recibió más de una palabra.';
        return;
    }

      // Rangos Unicode para detección
        const isHebrew = /[֐-׿]/.test(rawQuery);
        const isGreek = /[Ͱ-Ͽἀ-῿]/.test(rawQuery);

    await ensureRkantNtLoaded();
    let res;

    if (isHebrew) {
        // Mantiene la lógica avanzada de morfología de buscador3.js
        res = searchHebrewWord(rawQuery);
    } else if (isGreek) {
        // Nuevo motor para palabras como κατασπερεῖς
        res = searchGreek(rawQuery);
    } else {
        // Motor español limitado a una palabra
        res = searchSpanish(rawQuery);
    }

// Fallback RKANT: si LXX no devolvió resultados, usar NT
        if (!res.matches.length) {
            const ntMatches = searchRkantNt(rawQuery);
            if (ntMatches.length) {
                res = {
                    ...res,
                    ok: true,
                    tier: `${res.tier} + RKANT`,
                    matches: ntMatches.map(item => ({
                        he: item.he,
                        gr: '',
                        gr_nt: item.gr,
                        es: item.es,
                        candidatos: item.candidatos,
                        _rkntOnly: true
                    })),
                    diag: 'Sin coincidencias en LXX; se muestran coincidencias desde RKANT (NT).'
                };
            }
        }
    
     // Actualizar Interfaz
        renderResults(res.matches, rawQuery);

         if (resultCountEl) resultCountEl.textContent = `${res.matches.length} resultado(s)`;
        setTierBadge(res.tier, !!res.ok);
        if (diagEl) diagEl.textContent = res.diag;
        if (traceEl) traceEl.textContent = (res.trace || []).join('\n');
    } finally {
        const elapsed = Date.now() - loadingOverlayShownAt;
        await wait(MIN_LOADING_OVERLAY_MS - elapsed);
        setSearchLoading(false);
    }

}

function handleComparativeSearchTrigger(event) {
    if (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
    }
    void doSearch();
}

// Inicialización: centralizamos el disparo para evitar que listeners previos
// bloqueen el repintado del overlay antes de cada nueva búsqueda.
if (searchBtn) {
 searchBtn.onclick = null;
    searchBtn.addEventListener('click', handleComparativeSearchTrigger, true);
}

if (queryEl) {
    queryEl.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        handleComparativeSearchTrigger(event);
    }, true);
}
