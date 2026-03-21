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


/**
 * MOTOR DE BÚSQUEDA GRIEGA
 * Permite buscar palabras con o sin acentos.
 */
function searchGreek(query) {
    const normQ = normalizeFuzzy(query);
    if (!normQ) return { ok: false, matches: [] };

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

    const exactMainFieldMatches = [];
    const exactCandidateFieldMatches = [];
    const exactMainTokenMatches = [];
    const exactCandidateTokenMatches = [];
    const pluralMainFieldMatches = [];
    const pluralCandidateFieldMatches = [];
    const pluralMainTokenMatches = [];
    const pluralCandidateTokenMatches = [];

    entries.forEach(e => {
        const mainTexts = getMainGreekTexts(e);
        const candidateTexts = getCandidateGreekTexts(e);
        if (!mainTexts.length && !candidateTexts.length) return;

        if (hasExactGreekField(mainTexts, normQ)) {
            exactMainFieldMatches.push(e);
            return;
        }

        if (hasExactGreekField(candidateTexts, normQ)) {
            exactCandidateFieldMatches.push(e);
            return;
        }

        if (hasExactGreekToken(mainTexts, normQ)) {
            exactMainTokenMatches.push(e);
            return;
        }

        if (hasExactGreekToken(candidateTexts, normQ)) {
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
            `Variantes plurales aceptadas: ${Array.from(pluralVariants).join(', ') || 'ninguna'}`,
            'Orden: exacto visible completo > exacto en listas léxicas (coma/punto y coma) > exacto como palabra completa en frase > plurales exactos.'
        ],
        diag: 'Se priorizan primero las coincidencias exactas de campo completo; después las coincidencias exactas como palabra completa; al final, plurales griegos relacionados.'
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
            resultsTbodyEl.innerHTML = '<tr><td colspan="3" class="muted">Sin resultados precisos para esta entrada.</td></tr>';
        }
        return;
    }

    const limitedItems = displayItems.slice(0, 4);

    if (!resultsTbodyEl) return;

    resultsTbodyEl.innerHTML = limitedItems.map(e => {
        // Extraer griego de cualquier posible llave en el JSON
        const griego = e.gr || e.equivalencia_griega || e.greek || '—';
        return `
        <tr>
            <td class="he">${escapeHtml(e.he)}</td>
            <td class="gr" style="font-family: 'Times New Roman', serif; font-size: 1.2rem; color: #1e3a8a;">
                ${escapeHtml(griego)}
            </td>
            <td class="es">
                ${e._isSynthetic ? `<small style="color:var(--muted)">[Sintético]</small> ` : ''}
                ${escapeHtml(e.es || '—')}
            </td>
        </tr>
    `}).join('');
}

/**
 * SOBREESCRITURA DE DO-SEARCH
 * Detecta el idioma y dirige al motor correcto.
 */
function doSearch() {
    if (!entries || !entries.length) {
        setTierBadge('Sin Datos', false);
        if (diagEl) diagEl.textContent = 'Por favor, cargue los archivos JSON de los libros primero.';
        return;
    }

    const rawQuery = queryEl?.value?.trim() || '';
        if (!rawQuery) return;

    // Rangos Unicode para detección
    const isHebrew = /[\u0590-\u05FF]/.test(rawQuery);
    const isGreek = /[\u0370-\u03FF\u1F00-\u1FFF]/.test(rawQuery);

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

    // Actualizar Interfaz
    renderResults(res.matches, rawQuery);
    
    if (resultCountEl) resultCountEl.textContent = `${res.matches.length} resultado(s)`;
    setTierBadge(res.tier, !!res.ok);
    if (diagEl) diagEl.textContent = res.diag;
    if (traceEl) traceEl.textContent = (res.trace || []).join('\n');

}

// Inicialización: Asegurarnos de que el botón use esta nueva función
if (searchBtn) {
    searchBtn.onclick = doSearch;
}