(function(){
  const ACCESS_KEY = 'angelos.admin.interlinear.access';
  const ACCESS_TTL_MS = 8 * 60 * 60 * 1000;
  const ADMIN_PASSWORD_HASH = '9ece8d19ac8b4bb531ad35e6e6ef440e9e4815868d0f8912585b97f0e6dc2d8c';
  const LAB_MODE_LABEL = 'Morfologia AT';

  const OT_BOOKS = [
    ['genesis', 'Genesis', '01_Génesis.json'],
    ['exodo', 'Exodo', '02_Éxodo.json'],
    ['levitico', 'Levitico', '03_Levítico.json'],
    ['numeros', 'Numeros', '04_Números.json'],
    ['deuteronomio', 'Deuteronomio', '05_Deuteronomio.json'],
    ['josue', 'Josue', '06_Josué.json'],
    ['jueces', 'Jueces', '07_Jueces.json'],
    ['rut', 'Rut', '08_Rut.json'],
    ['1_samuel', '1 Samuel', '09_1_Samuel.json'],
    ['2_samuel', '2 Samuel', '10_2_Samuel.json'],
    ['1_reyes', '1 Reyes', '11_1_Reyes.json'],
    ['2_reyes', '2 Reyes', '12_2_Reyes.json'],
    ['1_cronicas', '1 Cronicas', '13_1_Crónicas.json'],
    ['2_cronicas', '2 Cronicas', '14_2_Crónicas.json'],
    ['esdras', 'Esdras', '15_Esdras.json'],
    ['nehemias', 'Nehemias', '16_Nehemías.json'],
    ['ester', 'Ester', '17_Ester.json'],
    ['job', 'Job', '18_Job.json'],
    ['salmos', 'Salmos', '19_Salmos.json'],
    ['proverbios', 'Proverbios', '20_Proverbios.json'],
    ['eclesiastes', 'Eclesiastes', '21_Eclesiastés.json'],
    ['cantares', 'Cantares', '22_Cantares.json'],
    ['isaias', 'Isaias', '23_Isaías.json'],
    ['jeremias', 'Jeremias', '24_Jeremías.json'],
    ['lamentaciones', 'Lamentaciones', '25_Lamentaciones.json'],
    ['ezequiel', 'Ezequiel', '26_Ezequiel.json'],
    ['daniel', 'Daniel', '27_Daniel.json'],
    ['oseas', 'Oseas', '28_Oseas.json'],
    ['joel', 'Joel', '29_Joel.json'],
    ['amos', 'Amos', '30_Amós.json'],
    ['abdias', 'Abdias', '31_Abdías.json'],
    ['jonas', 'Jonas', '32_Jonás.json'],
    ['miqueas', 'Miqueas', '33_Miqueas.json'],
    ['nahum', 'Nahum', '34_Nahúm.json'],
    ['habacuc', 'Habacuc', '35_Habacuc.json'],
    ['sofonias', 'Sofonias', '36_Sofonías.json'],
    ['hageo', 'Hageo', '37_Hageo.json'],
    ['zacarias', 'Zacarias', '38_Zacarías.json'],
    ['malaquias', 'Malaquias', '39_Malaquías.json']
  ];

  const BOOK_MAP = new Map(OT_BOOKS.map(([slug, label, file]) => [slug, { slug, label, file }]));
  const LABEL_TO_SLUG = new Map(OT_BOOKS.map(([slug, label]) => [normalizeKey(label), slug]));
  const chapterCountCache = new Map();
  const interlinearCache = new Map();
  const oshbMorphCache = new Map();
  let hebrewDictionaryPromise = null;
  let hebrewMorphIndexPromise = null;

  const els = {
    form: document.getElementById('adminSearchForm'),
    input: document.getElementById('adminSearchInput'),
    title: document.getElementById('adminPageTitle'),
    meta: document.getElementById('adminMetaReference'),
    panelTitle: document.getElementById('adminPanelHeaderTitle'),
    mount: document.getElementById('adminEditorMount'),
    statusBadge: document.getElementById('adminStatusBadge'),
    saveBtn: document.getElementById('adminSaveDraftBtn'),
    exportBtn: document.getElementById('adminExportBtn'),
    resetBtn: document.getElementById('adminResetChapterBtn'),
    prevBtn: document.getElementById('adminPrevChapterBtn'),
    nextBtn: document.getElementById('adminNextChapterBtn'),
    verseCount: document.getElementById('adminVerseCount'),
    tokenCount: document.getElementById('adminTokenCount'),
    draftState: document.getElementById('adminDraftState'),
    themeMenuBtn: document.getElementById('adminThemeMenuBtn'),
    bookToggle: document.getElementById('adminBookMenuToggle'),
    bookDropdown: document.getElementById('adminBookMenuDropdown'),
    bookListOT: document.getElementById('adminBookListOT'),
    bookListNT: document.getElementById('adminBookListNT'),
    chapterList: document.getElementById('adminChapterList'),
    chapterTitle: document.getElementById('adminChapterTitle')
  };

  const state = {
    slug: 'genesis',
    label: 'Genesis',
    chapter: 1
  };

  function normalizeKey(value){
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function escapeHtml(value){
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function normalizeHebrew(value, preservePoints = false){
    let clean = String(value || '')
      .replace(/[\u200c-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, '')
      .replace(/[\u0591-\u05AF]/g, '')
      .replace(/[\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4]/g, '')
      .trim();
    if(!preservePoints){
      clean = clean.replace(/[\u05B0-\u05BC\u05BD\u05BF\u05C1-\u05C2\u05C7]/g, '');
    }
    return clean;
  }

  function setBadge(message, tone){
    if(!els.statusBadge) return;
    if(!message){
      els.statusBadge.style.display = 'none';
      els.statusBadge.textContent = '';
      els.statusBadge.classList.remove('ok', 'err');
      return;
    }
    els.statusBadge.style.display = 'inline-flex';
    els.statusBadge.textContent = message;
    els.statusBadge.classList.toggle('ok', tone === 'ok');
    els.statusBadge.classList.toggle('err', tone === 'err');
  }

  function updateDraftStateLabel(){
    if(els.draftState) els.draftState.textContent = LAB_MODE_LABEL;
  }

  async function sha256(text){
    const bytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
  }

  function hasFreshAccess(){
    const raw = Number(sessionStorage.getItem(ACCESS_KEY) || 0);
    return raw > 0 && (Date.now() - raw) < ACCESS_TTL_MS;
  }

  async function ensureAccess(){
    if(hasFreshAccess()){
      sessionStorage.setItem(ACCESS_KEY, String(Date.now()));
      return true;
    }
    const password = window.prompt('Contrasena de admin');
    if(!password) return false;
    const candidateHash = await sha256(password.trim());
    if(candidateHash !== ADMIN_PASSWORD_HASH){
      window.alert('Contrasena incorrecta.');
      return false;
    }
    sessionStorage.setItem(ACCESS_KEY, String(Date.now()));
    return true;
  }

  async function loadJson(path){
    const response = await fetch(path, { cache: 'no-store' });
    if(!response.ok) throw new Error(`No se pudo cargar ${path} (HTTP ${response.status})`);
    return response.json();
  }

  async function getInterlinearBook(slug){
    const book = BOOK_MAP.get(slug);
    if(!book) throw new Error('Libro no soportado en el laboratorio hebreo.');
    if(!interlinearCache.has(slug)){
      interlinearCache.set(slug, loadJson(`./IdiomaORIGEN/interlineal/${book.file}`));
    }
    return interlinearCache.get(slug);
  }

  async function getOshbMorphBook(slug){
    const book = BOOK_MAP.get(slug);
    if(!book) throw new Error('Libro no soportado en la capa OSHB2.');
    if(!oshbMorphCache.has(slug)){
      oshbMorphCache.set(slug, loadJson(`./IdiomaORIGEN/oshb-morph/${book.file}`).catch((error) => {
        oshbMorphCache.delete(slug);
        throw error;
      }));
    }
    return oshbMorphCache.get(slug);
  }

  async function getChapterCount(slug){
    if(chapterCountCache.has(slug)) return chapterCountCache.get(slug);
    const book = await getInterlinearBook(slug);
    const count = Object.keys(book?.chapters || {}).length;
    chapterCountCache.set(slug, count);
    return count;
  }

  async function getHebrewDictionary(){
    if(!hebrewDictionaryPromise){
      hebrewDictionaryPromise = loadJson('./diccionario/diccionario_unificado.min.json').catch((error) => {
        hebrewDictionaryPromise = null;
        throw error;
      });
    }
    return hebrewDictionaryPromise;
  }

  function getEntryPrintedMorph(entry){
    const candidates = [
      entry?.morfologia_impresa,
      entry?.morfologia,
      entry?.printed_entry,
      entry?.entrada_impresa
    ];
    for(const candidate of candidates){
      const text = String(candidate || '').replace(/\s+/g, ' ').trim();
      if(text && !/\bstrong\b/i.test(text)) return text;
    }
    return '';
  }

  function buildEntryMorphValues(entry){
    const values = [];
    const add = (value) => {
      const text = String(value || '').replace(/\s+/g, ' ').trim();
      if(text && !values.includes(text)) values.push(text);
    };

    add(getEntryPrintedMorph(entry));
    const morphs = Array.isArray(entry?.morfs) ? entry.morfs : [];
    morphs.forEach(add);
    return values;
  }

  function normalizeStrong(value){
    const text = String(value || '').trim().toUpperCase();
    if(!text) return '';
    if(/^H\d+$/.test(text)) return text;
    if(/^\d+$/.test(text)) return `H${text}`;
    return text;
  }

  function findOshbMorphLabel(oshbVerseNode, token, tokenIndex){
    const forms = Array.isArray(oshbVerseNode?.forms) ? oshbVerseNode.forms : [];
    const morphs = Array.isArray(oshbVerseNode?.morphs) ? oshbVerseNode.morphs : [];
    if(!forms.length || !morphs.length) return '';

    const tokenPointed = normalizeHebrew(token?.orig || '', true);
    const tokenPlain = normalizeHebrew(token?.orig || '', false);

    const indexedForm = forms[tokenIndex];
    const indexedMorph = String(morphs[tokenIndex] || '').trim();
    if(indexedForm && indexedMorph){
      const indexedPointed = normalizeHebrew(indexedForm, true);
      const indexedPlain = normalizeHebrew(indexedForm, false);
      if(
        (indexedPointed && indexedPointed === tokenPointed) ||
        (indexedPlain && indexedPlain === tokenPlain)
      ){
        return indexedMorph;
      }
    }

    for(let i = 0; i < forms.length; i += 1){
      const form = forms[i];
      const morph = String(morphs[i] || '').trim();
      if(!morph) continue;
      const formPointed = normalizeHebrew(form, true);
      const formPlain = normalizeHebrew(form, false);
      if((formPointed && formPointed === tokenPointed) || (formPlain && formPlain === tokenPlain)){
        return morph;
      }
    }

    return '';
  }

  async function getHebrewMorphIndex(){
    if(!hebrewMorphIndexPromise){
      hebrewMorphIndexPromise = (async () => {
        const raw = await getHebrewDictionary();
        const entries = Array.isArray(raw) ? raw : (raw?.items || raw?.entries || []);
        const pointed = new Map();
        const plain = new Map();
        const byStrong = new Map();

        const register = (map, key, payload) => {
          if(!key) return;
          if(!map.has(key)) map.set(key, []);
          map.get(key).push(payload);
        };

        entries.forEach((entry) => {
          const strongKey = normalizeStrong(entry?.strong || entry?.strongs || entry?.strong_detail?.strong);
          if(strongKey){
            if(!byStrong.has(strongKey)) byStrong.set(strongKey, []);
            byStrong.get(strongKey).push(entry);
          }
          const forms = [
            entry?.palabra,
            entry?.lemma,
            entry?.hebreo,
            entry?.forma,
            ...(Array.isArray(entry?.formas) ? entry.formas : []),
            ...(Array.isArray(entry?.forms) ? entry.forms : []),
            ...(Array.isArray(entry?.variantes) ? entry.variantes : [])
          ];
          const morphValues = buildEntryMorphValues(entry);
          forms.forEach((form, index) => {
            const rawForm = String(form || '').trim();
            if(!rawForm) return;
            const payload = {
              form: rawForm,
              morph: morphValues[index] || morphValues[0] || ''
            };
            register(pointed, normalizeHebrew(rawForm, true), payload);
            register(plain, normalizeHebrew(rawForm, false), payload);
          });
        });

        return { pointed, plain, byStrong };
      })().catch((error) => {
        hebrewMorphIndexPromise = null;
        throw error;
      });
    }
    return hebrewMorphIndexPromise;
  }

  function pickMorphCandidate(candidates, token){
    if(!Array.isArray(candidates) || !candidates.length) return '';
    const tokenPointed = normalizeHebrew(token?.orig || '', true);
    const tokenPlain = normalizeHebrew(token?.orig || '', false);
    const exactPointed = candidates.find((candidate) => normalizeHebrew(candidate?.form || '', true) === tokenPointed && candidate?.morph);
    if(exactPointed) return exactPointed.morph;
    const exactPlain = candidates.find((candidate) => normalizeHebrew(candidate?.form || '', false) === tokenPlain && candidate?.morph);
    if(exactPlain) return exactPlain.morph;
    return candidates.find((candidate) => candidate?.morph)?.morph || '';
  }

  function pickStrongMorphCandidate(entries, token){
    if(!Array.isArray(entries) || !entries.length) return '';
    const firstEntry = entries[0] || null;
    const tokenPointed = normalizeHebrew(token?.orig || '', true);
    const tokenPlain = normalizeHebrew(token?.orig || '', false);
    const forms = Array.isArray(firstEntry?.formas) ? firstEntry.formas : [];
    const morphs = Array.isArray(firstEntry?.morfs) ? firstEntry.morfs : [];

    for(let i = 0; i < forms.length; i += 1){
      const formPointed = normalizeHebrew(forms[i], true);
      const formPlain = normalizeHebrew(forms[i], false);
      const morph = String(morphs[i] || '').trim();
      if(!morph) continue;
      if((formPointed && formPointed === tokenPointed) || (formPlain && formPlain === tokenPlain)){
        return /^INTJ\./i.test(morph) ? 'INTJ' : morph;
      }
    }

    const fallbackMorph = String(morphs[0] || '').trim();
    return /^INTJ\./i.test(fallbackMorph) ? 'INTJ' : fallbackMorph;
  }

  function decodeHebrewMorphCode(rawCode){
    const code = String(rawCode || '').trim().toUpperCase();
    if(!code) return '';
    if(/^INTJ\./.test(code)) return 'INTJ';
    if(code.includes('.')) return code;

    const exact = {
      PB: 'PREP',
      PM: 'PREP',
      PA: 'PART.OBJ.DIR',
      CC: 'CONJ',
      CS: 'CONJ',
      CO: 'CONJ',
      AA: 'ADJ',
      AC: 'ADJ',
      AV: 'ADV',
      RD: 'ART',
      RI: 'INTERR',
      RP: 'PRON',
      RR: 'REL',
      TD: 'ART',
      TI: 'INTERR',
      TN: 'NEG',
      TP: 'PRON',
      TR: 'REL',
      XC: 'CONJ',
      XD: 'ART',
      XN: 'NEG',
      XP: 'PART',
      XR: 'REL',
      XT: 'PART'
    };
    if(exact[code]) return exact[code];

    const stemMap = {
      Q: 'QAL',
      N: 'NIF',
      P: 'PIEL',
      H: 'HIF',
      T: 'HIT',
      V: 'HOF',
      O: 'POLEL',
      M: 'POAL'
    };
    const verbalFormMap = {
      S: 'PERF',
      F: 'IMPF',
      M: 'WAYQ',
      J: 'JUSS',
      I: 'IMPV',
      T: 'INFC',
      P: 'PTCA',
      R: 'PTCP'
    };
    const numberMap = {
      S: 'SG',
      P: 'PL',
      D: 'DU'
    };
    const genderMap = {
      M: 'M',
      F: 'F',
      C: 'C',
      U: 'U'
    };

    const simpleVerb = code.match(/^V([A-Z])A([A-Z])([SPD])([MFCU])([123])$/);
    if(simpleVerb){
      const [, stemCode, formCode, numberCode, genderCode, personCode] = simpleVerb;
      const stem = stemMap[stemCode] || stemCode;
      const form = verbalFormMap[formCode] || formCode;
      const number = numberMap[numberCode] || numberCode;
      const gender = genderMap[genderCode] || genderCode;
      return `VERBO.${stem}.${form}.P${personCode}.${gender}.${number}`;
    }

    return code;
  }

  async function resolveMorphLabel(token, context = {}){
    const oshbLabel = findOshbMorphLabel(context.oshbVerseNode, token, context.tokenIndex ?? -1);
    if(oshbLabel) return oshbLabel;

    const strongKey = normalizeStrong(token?.strongs);
    const decodedTokenMorph = decodeHebrewMorphCode(token?.morphs);

    if(/^VERBO\./.test(decodedTokenMorph) || /^PART\.OBJ\.DIR$/.test(decodedTokenMorph)){
      return decodedTokenMorph;
    }

    try{
      const index = await getHebrewMorphIndex();
      if(strongKey){
        const strongLabel = pickStrongMorphCandidate(index.byStrong.get(strongKey), token);
        if(strongLabel) return strongLabel;
      }

      if(!strongKey && decodedTokenMorph && decodedTokenMorph !== String(token?.morphs || '').trim().toUpperCase()){
        return decodedTokenMorph;
      }

      const pointedKey = normalizeHebrew(token?.orig || '', true);
      const plainKey = normalizeHebrew(token?.orig || '', false);
      const label = pickMorphCandidate(index.pointed.get(pointedKey), token)
        || pickMorphCandidate(index.plain.get(plainKey), token);
      if(label) return label;
    }catch(_error){
      // Seguimos con la morfologia del interlineal.
    }

    if(decodedTokenMorph) return decodedTokenMorph;
    return String(token?.morphs || '').trim();
  }

  function parseReference(text){
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    const match = clean.match(/^(.+?)\s+(\d+)$/);
    if(!match) return null;
    const slug = LABEL_TO_SLUG.get(normalizeKey(match[1]));
    const chapter = Number(match[2]);
    if(!slug || !Number.isInteger(chapter) || chapter < 1) return null;
    return { slug, chapter };
  }

  function renderBookListSection(container, books, activeSlug){
    if(!container) return;
    container.innerHTML = '';
    books.forEach(([slug, label]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `book-chip${slug === activeSlug ? ' is-active' : ''}`;
      button.textContent = label;
      button.addEventListener('click', async () => {
        state.slug = slug;
        state.label = label;
        renderBookLists(slug);
        await renderChapterList(slug);
      });
      container.appendChild(button);
    });
  }

  function renderBookLists(activeSlug){
    renderBookListSection(els.bookListOT, OT_BOOKS, activeSlug);
    if(els.bookListNT) els.bookListNT.textContent = 'Reservado para fases posteriores.';
  }

  async function renderChapterList(slug){
    const total = await getChapterCount(slug);
    const book = BOOK_MAP.get(slug);
    if(els.chapterTitle) els.chapterTitle.textContent = `${book?.label || ''} · capitulos`;
    if(!els.chapterList) return;
    els.chapterList.innerHTML = '';
    for(let i = 1; i <= total; i += 1){
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `chapter-chip${i === state.chapter && slug === state.slug ? ' is-active' : ''}`;
      button.textContent = String(i);
      button.addEventListener('click', async () => {
        closeBookMenu();
        await navigateTo(slug, i);
      });
      els.chapterList.appendChild(button);
    }
  }

  function openBookMenu(){
    if(!els.bookDropdown || !els.bookToggle) return;
    els.bookDropdown.hidden = false;
    els.bookToggle.setAttribute('aria-expanded', 'true');
  }

  function closeBookMenu(){
    if(!els.bookDropdown || !els.bookToggle) return;
    els.bookDropdown.hidden = true;
    els.bookToggle.setAttribute('aria-expanded', 'false');
  }

  function getInterlinearVerses(book, chapter){
    return book?.chapters?.[String(chapter)] || {};
  }

  function buildHebrewVerseText(tokens, rawText){
    const rawMatches = Array.from(
      String(rawText || '').matchAll(/<l>(.*?)<\/l>/g),
      (match) => String(match[1] || '').trim()
    ).filter(Boolean);
    if(rawMatches.length) return rawMatches.join(' ');

    const sourceTokens = Array.isArray(tokens) ? tokens : [];
    if(sourceTokens.length){
      return sourceTokens
        .map((token) => String(token?.orig || '').trim())
        .filter(Boolean)
        .join(' ');
    }
    return String(rawText || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || 'Sin texto hebreo';
  }

  async function buildVerseCardHtml(verseNumber, verseNode){
    const tokens = Array.isArray(verseNode?.tokens) ? verseNode.tokens : [];
    const [chapterNumber, localVerseNumber] = String(verseNumber).split(':');
    let oshbVerseNode = null;
    try{
      const oshbBook = await getOshbMorphBook(state.slug);
      oshbVerseNode = oshbBook?.chapters?.[chapterNumber]?.[localVerseNumber] || null;
    }catch(_error){
      oshbVerseNode = null;
    }
    const rows = await Promise.all(tokens.map(async (token) => {
      const morphLabel = await resolveMorphLabel(token, {
        oshbVerseNode,
        tokenIndex: Math.max(Number(token?.num || 0) - 1, 0)
      });
      return `
        <div class="admin-morph-token" data-num="${escapeHtml(token.num || '')}">
          <div class="admin-morph-token-hebrew">${escapeHtml(token.orig || '')}</div>
          <div class="admin-morph-token-label">${escapeHtml(morphLabel || '-')}</div>
        </div>
      `;
    }));

    return `
      <article class="admin-verse-card" data-verse="${verseNumber}">
        <div class="admin-verse-head">
          <div>
            <div class="admin-verse-ref">${escapeHtml(state.label)} ${verseNumber}</div>
          </div>
        </div>
        <div class="admin-morph-card-body">
          <div class="admin-morph-token-strip">${rows.join('') || '<div class="admin-morph-empty">No hay tokens hebreos en este versiculo.</div>'}</div>
        </div>
      </article>
    `;
  }

  async function renderEditor(){
    setBadge('', '');
    if(els.mount) els.mount.innerHTML = '<div class="text-muted">Cargando morfologia...</div>';

    const interlinearBook = await getInterlinearBook(state.slug);
    const chapterTotal = await getChapterCount(state.slug);
    if(state.chapter > chapterTotal) state.chapter = chapterTotal;

    const interlinearVerses = getInterlinearVerses(interlinearBook, state.chapter);
    const verseNumbers = Object.keys(interlinearVerses).sort((a, b) => Number(a) - Number(b));
    if(!verseNumbers.length){
      if(els.mount) els.mount.innerHTML = '<div class="admin-empty-state">No se encontro texto hebreo para este capitulo.</div>';
      if(els.verseCount) els.verseCount.textContent = '0';
      if(els.tokenCount) els.tokenCount.textContent = '0';
      updateDraftStateLabel();
      return;
    }

    let tokenCount = 0;
    const cards = [];
    for(const verseNumber of verseNumbers){
      const verseNode = interlinearVerses[verseNumber];
      tokenCount += Array.isArray(verseNode?.tokens) ? verseNode.tokens.length : 0;
      cards.push(await buildVerseCardHtml(`${state.chapter}:${verseNumber}`, verseNode));
    }

    if(els.mount) els.mount.innerHTML = cards.join('');
    if(els.title) els.title.textContent = `Laboratorio morfologico · ${state.label} ${state.chapter}`;
    if(els.meta) els.meta.textContent = `${state.label} ${state.chapter}`;
    if(els.panelTitle) els.panelTitle.textContent = `${state.label} ${state.chapter}`;
    if(els.input) els.input.value = `${state.label} ${state.chapter}`;
    if(els.verseCount) els.verseCount.textContent = String(verseNumbers.length);
    if(els.tokenCount) els.tokenCount.textContent = String(tokenCount);
    updateDraftStateLabel();
    renderBookLists(state.slug);
    await renderChapterList(state.slug);
    updateChapterButtons(chapterTotal);
  }

  function updateChapterButtons(total){
    if(els.prevBtn) els.prevBtn.disabled = state.chapter <= 1;
    if(els.nextBtn) els.nextBtn.disabled = state.chapter >= total;
  }

  async function navigateTo(slug, chapter){
    const book = BOOK_MAP.get(slug);
    if(!book) throw new Error('Libro no disponible.');
    state.slug = slug;
    state.label = book.label;
    state.chapter = chapter;
    await renderEditor();
  }

  function handleError(error){
    const message = error instanceof Error ? error.message : String(error);
    if(els.mount) els.mount.innerHTML = `<div class="admin-empty-state">${escapeHtml(message)}</div>`;
    setBadge('No se pudo abrir el capitulo', 'err');
  }

  function setupThemeMenu(){
    const menu = els.themeMenuBtn?.nextElementSibling;
    els.themeMenuBtn?.addEventListener('click', (event) => {
      event.preventDefault();
      menu?.classList.toggle('show');
    });
    document.addEventListener('click', (event) => {
      if(menu && els.themeMenuBtn && !menu.contains(event.target) && !els.themeMenuBtn.contains(event.target)){
        menu.classList.remove('show');
      }
    });
    menu?.querySelectorAll('[data-theme]').forEach((button) => {
      button.addEventListener('click', () => {
        const theme = button.getAttribute('data-theme') || 'cream';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('angelos.admin.interlinear.theme', theme);
        menu.classList.remove('show');
      });
    });

    document.documentElement.setAttribute('data-theme', localStorage.getItem('angelos.admin.interlinear.theme') || 'cream');
  }

  function setupBookMenu(){
    renderBookLists(state.slug);
    els.bookToggle?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if(els.bookDropdown?.hidden){
        openBookMenu();
      }else{
        closeBookMenu();
      }
    });
    els.bookDropdown?.addEventListener('click', (event) => event.stopPropagation());
    document.addEventListener('click', (event) => {
      if(els.bookDropdown && els.bookToggle && !els.bookDropdown.hidden && !els.bookDropdown.contains(event.target) && !els.bookToggle.contains(event.target)){
        closeBookMenu();
      }
    });
    document.addEventListener('keydown', (event) => {
      if(event.key === 'Escape' && els.bookDropdown && !els.bookDropdown.hidden){
        closeBookMenu();
      }
    });
  }

  function bindEvents(){
    els.form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const parsed = parseReference(els.input?.value);
      if(!parsed){
        setBadge('Usa el formato "Libro capitulo"', 'err');
        return;
      }
      try{
        await navigateTo(parsed.slug, parsed.chapter);
      }catch(error){
        handleError(error);
      }
    });

    els.prevBtn?.addEventListener('click', async () => {
      if(state.chapter <= 1) return;
      await navigateTo(state.slug, state.chapter - 1);
    });

    els.nextBtn?.addEventListener('click', async () => {
      const total = await getChapterCount(state.slug);
      if(state.chapter >= total) return;
      await navigateTo(state.slug, state.chapter + 1);
    });
  }

  async function init(){
    const allowed = await ensureAccess();
    if(!allowed){
      window.location.href = './index.html';
      return;
    }

    if(els.saveBtn) els.saveBtn.disabled = true;
    if(els.exportBtn) els.exportBtn.disabled = true;
    if(els.resetBtn) els.resetBtn.disabled = true;

    setupThemeMenu();
    setupBookMenu();
    bindEvents();
    try{
      await renderEditor();
    }catch(error){
      handleError(error);
    }
  }

  void init();
})();
