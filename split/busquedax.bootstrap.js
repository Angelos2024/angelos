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
  const LXX_SHARD_BASE_PATHS = ['./index', './search/index'];
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
  const LXX_BOOKS = [
    '1Chr', '1Esdr', '1Kgs', '1Macc', '1Sam', '2Chr', '2Esdr', '2Kgs', '2Macc', '2Sam',
    '3Macc', '4Macc', 'Amos', 'Bar', 'BelOG', 'BelTh', 'DanOG', 'DanTh', 'Deut', 'Eccl',
    'EpJer', 'Esth', 'Exod', 'Ezek', 'Gen', 'Hab', 'Hag', 'Hos', 'Isa', 'Jdt', 'Jer', 'Job',
    'Joel', 'Jonah', 'JoshA', 'JoshB', 'JudgA', 'JudgB', 'Lam', 'Lev', 'Mal', 'Mic', 'Nah',
    'Num', 'Obad', 'Odes', 'Prov', 'Ps', 'PsSol', 'Ruth', 'Sir', 'Song', 'SusOG', 'SusTh',
    'TobBA', 'TobS', 'Wis', 'Zech', 'Zeph'
  ];
  const LXX_FILE_BY_BOOK = LXX_FILES.reduce((acc, file) => {
    const match = file.match(/^lxx_rahlfs_1935_(.+)\.json$/);
    if (match?.[1]) acc[match[1]] = file;
    return acc;
  }, {});
 
   const langLabels = {
     es: 'RVR1960',
     gr: 'RKANT',
    he: 'Hebreo',
    lxx: 'LXX'
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
    
  // UI state para filtros + paginación
  pagination: {
    pageSize: 25,
    page: 1,
    selectedTestament: null, // 'ot' | 'nt' | null
    selectedBook: null,      // slug del libro o null
 activeLang: null,
    collapsedSections: { ot: true, nt: true }
      },
  // Cache de textos por verso para evitar recargas
  verseCache: {
    es: new Map(),
    gr: new Map(),
    he: new Map(),
    lxx: new Map()
  },
dict: null,
    dictMap: new Map(),
      dictSpanishMap: new Map(),
    hebrewDict: null,
    hebrewDictMap: new Map(),
    trilingualEquiv: null,
    trilingualByEs: new Map(),
    trilingualByGr: new Map(),
    trilingualByHe: new Map(),
     indexes: {},
     textCache: new Map(),
    lxxFileCache: new Map(),
    lxxBookCache: new Map(),
    lxxShardCache: new Map(),
    lxxShardBaseByBook: new Map(),
    lxxVerseCache: new Map(),
    lxxBookStatsCache: new Map(),
    lxxSearchCache: new Map(),
     filter: 'todo',
      languageScope: 'auto',
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

  
  const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
  const isAbortError = (error) => error?.name === 'AbortError';
