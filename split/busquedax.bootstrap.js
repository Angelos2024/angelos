/* split: bootstrap */
   const DICT_URL = './diccionario/masterdiccionario.json';
   const HEBREW_DICT_URL = './diccionario/diccionario_unificado.min.json';
   const TRILINGUAL_EQUIV_URL = './diccionario/equivalencias_trilingue.min.json';
  const SEARCH_INDEX = {
      es: [
       './search/index-es.json'
     ],
     gr: './search/index-gr.json',
     he: './search/index-he.json'
   };
  const TEXT_BASE = './search/texts';
  
   const stopwords = new Set([
    'de', 'la', 'el', 'los', 'las', 'y', 'o', 'a', 'en', 'por', 'para',
    'un', 'una', 'unos', 'unas', 'del', 'al', 'que', 'se', 'con', 'como',
    'su', 'sus', 'es', 'son', 'lo', 'una', 'uno', 'tambien'
  ]);
  const greekStopwords = new Set([
    'και', 'δε', 'ο', 'η', 'το', 'του', 'της', 'των', 'τω', 'τον', 'την',
    'εις', 'εν', 'αυτος', 'αυτη', 'αυτο', 'ου', 'μη', 'γαρ', 'δε',
    'ως', 'επι', 'προς', 'δια', 'μετα', 'κατα', 'εκ', 'υπο'
  ]);
  const hebrewStopwords = new Set([
    'ו', 'ה', 'את', 'יהוה', 'אלהים', 'אשר', 'כל', 'על', 'אל', 'ב', 'ל', 'מ', 'עם', 'כי'
  ]);
 
   const TORAH = ['genesis', 'exodo', 'levitico', 'numeros', 'deuteronomio'];
   const HISTORICAL = [
     'josue', 'jueces', 'rut', '1_samuel', '2_samuel', '1_reyes', '2_reyes',
     '1_cronicas', '2_cronicas', 'esdras', 'nehemias', 'ester'   ];
   const WISDOM = ['job', 'salmos', 'proverbios', 'eclesiastes', 'cantares'];
   const PROPHETS = [
     'isaias', 'jeremias', 'lamentaciones', 'ezequiel', 'daniel', 'oseas', 'joel', 'amos',
     'abdias', 'jonas', 'miqueas', 'nahum', 'habacuc', 'sofonias', 'hageo',
     'zacarias', 'malaquias'
   ];
   
   const GOSPELS = ['mateo', 'marcos', 'lucas', 'juan'];
   const ACTS = ['hechos'];
   const LETTERS = [
     'romanos', '1_corintios', '2_corintios', 'galatas', 'efesios', 'filipenses',
     'colosenses', '1_tesalonicenses', '2_tesalonicenses', '1_timoteo',
     '2_timoteo', 'tito', 'filemon', 'hebreos', 'santiago', '1_pedro',
     '2_pedro', '1_juan', '2_juan', '3_juan', 'judas'
   ];
   const APOCALYPSE = ['apocalipsis'];

// Orden canónico (Génesis → Apocalipsis) por slugs internos
const CANONICAL_BOOK_ORDER = [
  ...TORAH,
  ...HISTORICAL,
  ...WISDOM,
  ...PROPHETS,
  ...GOSPELS,
  ...ACTS,
  ...LETTERS,
  ...APOCALYPSE
];
const CANON_INDEX = new Map(CANONICAL_BOOK_ORDER.map((slug, i) => [slug, i]));
const OT_SET = new Set([...TORAH, ...HISTORICAL, ...WISDOM, ...PROPHETS]);
const NT_SET = new Set([...GOSPELS, ...ACTS, ...LETTERS, ...APOCALYPSE]);

  const NT_BOOKS = new Set([...GOSPELS, ...ACTS, ...LETTERS, ...APOCALYPSE]);
  
 
   const langLabels = {
     es: 'RVR1960',
     gr: 'RKANT',
    he: 'Hebreo'
   };
 const SEARCH_EQUIVALENCE_GROUPS = [
    {
      id: 'jesus-josue',
      es: ['jesus', 'jesús', 'josue', 'josué'],
      gr: ['Ἰησοῦς'],
      he: ['יֵשׁוּעַ', 'ישוע', 'יְהוֹשֻׁעַ', 'יהושע'],
      relatedLabels: {
        es: ['Josué'],
        he: ['יְהוֹשֻׁעַ']
      }
    }
  ];
 const state = {

  pagination: {
    pageSize: 25,
    page: 1,
    selectedTestament: null,
    selectedBook: null,
    activeLang: null,
    collapsedSections: { ot: true, nt: true },
    enabledTestaments: { ot: true, nt: true }

          },
  verseCache: {
    es: new Map(),
    gr: new Map(),
    he: new Map()
      },

  last: null,
      isLoading: false
};
  const jsonCache = new Map();
  const failedJsonRequests = new Map();
  const JSON_RETRY_COOLDOWN_MS = 15000;
  const DEBOUNCE_DELAY_MS = 250;
  const MAX_REFS_PER_CORPUS = 800;
  let activeSearchController = null;
  let activeSearchRunId = 0;
 
   const queryInput = document.getElementById('bxQueryInput');
   const analyzeBtn = document.getElementById('bxAnalyzeBtn');
      const validationMessage = document.getElementById('bxValidationMessage');
   const lemmaTags = document.getElementById('bxLemmaTags');
   const lemmaSummary = document.getElementById('bxLemmaSummary');
  const lemmaCorrespondence = document.getElementById('bxLemmaCorrespondence');
   const lemmaExamples = document.getElementById('bxLemmaExamples');
  const resultsByCorpus = document.getElementById('bxResultsByCorpus');
  const resultsList = document.getElementById('bxResultsList');
  const paginationEl = document.getElementById('bxPagination');
  const filtersPanel = document.getElementById('bxFiltersPanel');
  const resultsLoadingIndicator = document.getElementById('bxResultsLoadingIndicator');
  const resultsLoadingStage = document.getElementById('bxResultsLoadingStage');
  const analysisResultsSection = document.getElementById('bxAnalysisResultsSection');
  const lemmaSummaryPanel = document.getElementById('bxLemmaSummaryPanel');
    const languageScopeSelect = document.getElementById('bxLanguageScope');
     const filterOTCheckbox = document.getElementById('bxFilterOT');
  const filterNTCheckbox = document.getElementById('bxFilterNT');

  
  const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
  const isAbortError = (error) => error?.name === 'AbortError';
