(function(){
  const ACCESS_KEY = 'angelos.admin.interlinear.access';
  const ACCESS_TTL_MS = 8 * 60 * 60 * 1000;
  const ADMIN_PASSWORD_HASH = '9ece8d19ac8b4bb531ad35e6e6ef440e9e4815868d0f8912585b97f0e6dc2d8c';
  const DRAFT_PREFIX = 'angelos.admin.interlinear.draft.';

  const OT_BOOKS = [
    ['genesis', 'Génesis', '01_Génesis.json'],
    ['exodo', 'Éxodo', '02_Éxodo.json'],
    ['levitico', 'Levítico', '03_Levítico.json'],
    ['numeros', 'Números', '04_Números.json'],
    ['deuteronomio', 'Deuteronomio', '05_Deuteronomio.json'],
    ['josue', 'Josué', '06_Josué.json'],
    ['jueces', 'Jueces', '07_Jueces.json'],
    ['rut', 'Rut', '08_Rut.json'],
    ['1_samuel', '1 Samuel', '09_1_Samuel.json'],
    ['2_samuel', '2 Samuel', '10_2_Samuel.json'],
    ['1_reyes', '1 Reyes', '11_1_Reyes.json'],
    ['2_reyes', '2 Reyes', '12_2_Reyes.json'],
    ['1_cronicas', '1 Crónicas', '13_1_Crónicas.json'],
    ['2_cronicas', '2 Crónicas', '14_2_Crónicas.json'],
    ['esdras', 'Esdras', '15_Esdras.json'],
    ['nehemias', 'Nehemías', '16_Nehemías.json'],
    ['ester', 'Ester', '17_Ester.json'],
    ['job', 'Job', '18_Job.json'],
    ['salmos', 'Salmos', '19_Salmos.json'],
    ['proverbios', 'Proverbios', '20_Proverbios.json'],
    ['eclesiastes', 'Eclesiastés', '21_Eclesiastés.json'],
    ['cantares', 'Cantares', '22_Cantares.json'],
    ['isaias', 'Isaías', '23_Isaías.json'],
    ['jeremias', 'Jeremías', '24_Jeremías.json'],
    ['lamentaciones', 'Lamentaciones', '25_Lamentaciones.json'],
    ['ezequiel', 'Ezequiel', '26_Ezequiel.json'],
    ['daniel', 'Daniel', '27_Daniel.json'],
    ['oseas', 'Oseas', '28_Oseas.json'],
    ['joel', 'Joel', '29_Joel.json'],
    ['amos', 'Amós', '30_Amós.json'],
    ['abdias', 'Abdías', '31_Abdías.json'],
    ['jonas', 'Jonás', '32_Jonás.json'],
    ['miqueas', 'Miqueas', '33_Miqueas.json'],
    ['nahum', 'Nahúm', '34_Nahúm.json'],
    ['habacuc', 'Habacuc', '35_Habacuc.json'],
    ['sofonias', 'Sofonías', '36_Sofonías.json'],
    ['hageo', 'Hageo', '37_Hageo.json'],
    ['zacarias', 'Zacarías', '38_Zacarías.json'],
    ['malaquias', 'Malaquías', '39_Malaquías.json']
  ];

  const NT_BOOKS = [
    ['mateo', 'Mateo', '40_Mateo.json'],
    ['marcos', 'Marcos', '41_Marcos.json'],
    ['lucas', 'Lucas', '42_Lucas.json'],
    ['juan', 'Juan', '43_Juan.json'],
    ['hechos', 'Hechos', '44_Hechos.json'],
    ['romanos', 'Romanos', '45_Romanos.json'],
    ['1_corintios', '1 Corintios', '46_1_Corintios.json'],
    ['2_corintios', '2 Corintios', '47_2_Corintios.json'],
    ['galatas', 'Gálatas', '48_Gálatas.json'],
    ['efesios', 'Efesios', '49_Efesios.json'],
    ['filipenses', 'Filipenses', '50_Filipenses.json'],
    ['colosenses', 'Colosenses', '51_Colosenses.json'],
    ['1_tesalonicenses', '1 Tesalonicenses', '52_1_Tesalonicenses.json'],
    ['2_tesalonicenses', '2 Tesalonicenses', '53_2_Tesalonicenses.json'],
    ['1_timoteo', '1 Timoteo', '54_1_Timoteo.json'],
    ['2_timoteo', '2 Timoteo', '55_2_Timoteo.json'],
    ['tito', 'Tito', '56_Tito.json'],
    ['filemon', 'Filemón', '57_Filemón.json'],
    ['hebreos', 'Hebreos', '58_Hebreos.json'],
    ['santiago', 'Santiago', '59_Santiago.json'],
    ['1_pedro', '1 Pedro', '60_1_Pedro.json'],
    ['2_pedro', '2 Pedro', '61_2_Pedro.json'],
    ['1_juan', '1 Juan', '62_1_Juan.json'],
    ['2_juan', '2 Juan', '63_2_Juan.json'],
    ['3_juan', '3 Juan', '64_3_Juan.json'],
    ['judas', 'Judas', '65_Judas.json'],
    ['apocalipsis', 'Apocalipsis', '66_Apocalipsis.json']
  ];

  const ALL_BOOKS = [...OT_BOOKS, ...NT_BOOKS];
  const BOOK_MAP = new Map(ALL_BOOKS.map(([slug, label, file]) => [slug, { slug, label, file }]));
  const LABEL_TO_SLUG = new Map(ALL_BOOKS.map(([slug, label]) => [normalizeKey(label), slug]));
  const chapterCountCache = new Map();
  const spanishCache = new Map();
  const interlinearCache = new Map();

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

  let state = {
    slug: 'genesis',
    label: 'Génesis',
    chapter: 1,
    draft: null
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

  function draftStorageKey(slug, chapter){
    return `${DRAFT_PREFIX}${slug}.${chapter}`;
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
    const raw = localStorage.getItem(draftStorageKey(state.slug, state.chapter));
    els.draftState.textContent = raw ? 'Disponible' : 'Vacío';
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
    const password = window.prompt('Contraseña de admin');
    if(!password) return false;
    const candidateHash = await sha256(password.trim());
    if(candidateHash !== ADMIN_PASSWORD_HASH){
      window.alert('Contraseña incorrecta.');
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

  async function getSpanishBook(slug){
    if(!spanishCache.has(slug)){
      spanishCache.set(slug, loadJson(`./librosRV1960/${slug}.json`));
    }
    return spanishCache.get(slug);
  }

  async function getInterlinearBook(slug){
    const book = BOOK_MAP.get(slug);
    if(!book) throw new Error('Libro no soportado en el editor.');
    if(!interlinearCache.has(slug)){
      interlinearCache.set(slug, loadJson(`./IdiomaORIGEN/interlineal/${book.file}`));
    }
    return interlinearCache.get(slug);
  }

  async function getChapterCount(slug){
    if(chapterCountCache.has(slug)) return chapterCountCache.get(slug);
    const spanishBook = await getSpanishBook(slug);
    const count = Array.isArray(spanishBook) ? spanishBook.length : 0;
    chapterCountCache.set(slug, count);
    return count;
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
    renderBookListSection(els.bookListNT, NT_BOOKS, activeSlug);
  }

  async function renderChapterList(slug){
    const total = await getChapterCount(slug);
    const book = BOOK_MAP.get(slug);
    els.chapterTitle.textContent = `${book?.label || ''} · capítulos`;
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
    els.bookDropdown.hidden = false;
    els.bookToggle.setAttribute('aria-expanded', 'true');
  }

  function closeBookMenu(){
    els.bookDropdown.hidden = true;
    els.bookToggle.setAttribute('aria-expanded', 'false');
  }

  function getSpanishVerses(book, chapter){
    return Array.isArray(book?.[chapter - 1]) ? book[chapter - 1] : [];
  }

  function getInterlinearVerses(book, chapter){
    return book?.chapters?.[String(chapter)] || {};
  }

  function readDraft(slug, chapter){
    try{
      const raw = localStorage.getItem(draftStorageKey(slug, chapter));
      return raw ? JSON.parse(raw) : null;
    }catch(_error){
      return null;
    }
  }

  function listDraftsForBook(slug){
    const drafts = [];
    const prefix = `${DRAFT_PREFIX}${slug}.`;
    for(let i = 0; i < localStorage.length; i += 1){
      const key = localStorage.key(i);
      if(!key || !key.startsWith(prefix)) continue;
      try{
        const raw = localStorage.getItem(key);
        if(!raw) continue;
        const parsed = JSON.parse(raw);
        if(parsed?.slug === slug) drafts.push(parsed);
      }catch(_error){
        // Ignorar entradas corruptas para no bloquear la exportación.
      }
    }
    drafts.sort((a, b) => Number(a.chapter || 0) - Number(b.chapter || 0));
    return drafts;
  }

  function cloneJson(value){
    return JSON.parse(JSON.stringify(value));
  }

  function mergeDraftTokens(baseTokens, draftTokens){
    const base = Array.isArray(baseTokens) ? baseTokens.map((token) => ({ ...token })) : [];
    if(!Array.isArray(draftTokens) || !draftTokens.length) return base;

    const byNum = new Map(base.map((token) => [String(token.num || ''), token]));
    draftTokens.forEach((draftToken) => {
      const key = String(draftToken?.num || '');
      const target = byNum.get(key);
      if(!target) return;
      target.morphs = draftToken.morphs ?? target.morphs ?? '';
      target.es = draftToken.es ?? target.es ?? '';
      target.added = draftToken.added ?? target.added ?? '';
      target.notrans = draftToken.notrans ?? target.notrans ?? '';
    });
    return base;
  }

  function mergeDraftsIntoBook(bookData, drafts){
    const merged = cloneJson(bookData);
    drafts.forEach((draft) => {
      (draft?.verses || []).forEach((verse) => {
        const ref = String(verse?.verse || '');
        const parts = ref.split(':');
        if(parts.length !== 2) return;
        const [chapterKey, verseKey] = parts;
        const verseNode = merged?.chapters?.[chapterKey]?.[verseKey];
        if(!verseNode) return;
        verseNode.tokens = mergeDraftTokens(verseNode.tokens, verse.tokens);
      });
    });
    return merged;
  }

  function writeDraft(){
    const payload = collectDraftPayload();
    localStorage.setItem(draftStorageKey(state.slug, state.chapter), JSON.stringify(payload));
    updateDraftStateLabel();
    setBadge('Borrador guardado', 'ok');
  }

  function collectDraftPayload(){
    const verses = Array.from(els.mount.querySelectorAll('.admin-verse-card')).map((verseCard) => {
      const verse = verseCard.dataset.verse;
      const tokens = Array.from(verseCard.querySelectorAll('.admin-token-row')).map((row) => ({
        num: row.dataset.num || '',
        orig: row.dataset.orig || '',
        strongs: row.dataset.strongs || '',
        morphs: row.querySelector('[data-field="morphs"]')?.value || '',
        es: row.querySelector('[data-field="es"]')?.value || '',
        added: row.querySelector('[data-field="added"]')?.value || '',
        notrans: row.querySelector('[data-field="notrans"]')?.value || ''
      }));
      return { verse, tokens };
    });

    return {
      slug: state.slug,
      label: state.label,
      chapter: state.chapter,
      updatedAt: new Date().toISOString(),
      verses
    };
  }

  function applyDraftToTokens(tokens, draftVerse){
    if(!draftVerse?.tokens?.length) return tokens;
    const draftByNum = new Map(draftVerse.tokens.map((token) => [String(token.num || ''), token]));
    return tokens.map((token) => {
      const override = draftByNum.get(String(token.num || ''));
      if(!override) return token;
      return {
        ...token,
        morphs: override.morphs ?? token.morphs ?? '',
        es: override.es ?? token.es ?? '',
        added: override.added ?? token.added ?? '',
        notrans: override.notrans ?? token.notrans ?? ''
      };
    });
  }

  function isGreekToken(text){
    return /[\u0370-\u03FF\u1F00-\u1FFF]/.test(String(text || ''));
  }

  function isSimpleEditableToken(token){
    return !String(token?.strongs || '').trim() && !String(token?.morphs || '').trim();
  }

  async function withGreekSuggestions(verseNode){
    const tokens = Array.isArray(verseNode?.tokens) ? verseNode.tokens.map((token) => ({ ...token })) : [];
    if(!tokens.length) return tokens;
    if(!tokens.some((token) => isGreekToken(token.orig))) return tokens;
    if(!window.InterlinearView?.buildInterlinearRows) return tokens;

    try{
      const rows = await window.InterlinearView.buildInterlinearRows(verseNode?.raw || '', {
        isGreek: true,
        slug: state.slug
      });
      const spanishTokens = Array.isArray(rows?.spanishTokens) ? rows.spanishTokens : [];
      return tokens.map((token, idx) => ({
        ...token,
        es: String(token?.es || '').trim() || String(spanishTokens[idx] || '').trim()
      }));
    }catch(_error){
      return tokens;
    }
  }

  function buildVerseCardHtml(verseNumber, spanishText, verseNode, draftVerse){
    const sourceTokens = Array.isArray(verseNode?.tokens) ? verseNode.tokens : [];
    const tokens = applyDraftToTokens(sourceTokens, draftVerse);
    const rows = tokens.map((token) => `
      <div class="admin-token-row${isSimpleEditableToken(token) ? ' admin-token-row-simple' : ''}" data-num="${escapeHtml(token.num || '')}" data-orig="${escapeHtml(token.orig || '')}" data-strongs="${escapeHtml(token.strongs || '')}">
        <div class="admin-token-meta">
          <div class="admin-token-order">Token ${escapeHtml(token.num || '—')}</div>
          <div class="admin-token-orig${isGreekToken(token.orig) ? ' is-greek' : ''}">${escapeHtml(token.orig || '')}</div>
          ${isSimpleEditableToken(token)
            ? `<div class="admin-token-helper">${escapeHtml([token.lemma || '', token.translit || ''].filter(Boolean).join(' · ') || 'Edición simple')}</div>`
            : `<div class="admin-token-strongs">${escapeHtml(token.strongs || 'Sin strongs')}</div>`
          }
        </div>
        ${isSimpleEditableToken(token) ? '' : `
          <div class="admin-field">
            <label>Morfo</label>
            <input data-field="morphs" type="text" value="${escapeHtml(token.morphs || '')}"/>
          </div>
        `}
        <div class="admin-field">
          <label>${isSimpleEditableToken(token) ? 'Español' : 'Glosa ES'}</label>
          <input data-field="es" type="text" value="${escapeHtml(token.es || '')}"/>
        </div>
        ${isSimpleEditableToken(token) ? '' : `
          <div class="admin-field">
            <label>Añadido</label>
            <input data-field="added" type="text" value="${escapeHtml(token.added || '')}"/>
          </div>
          <div class="admin-field">
            <label>Sin trad.</label>
            <input data-field="notrans" type="text" value="${escapeHtml(token.notrans || '')}"/>
          </div>
          <div class="admin-field">
            <label>Original base</label>
            <input type="text" readonly value="${escapeHtml(token.orig || '')}"/>
          </div>
        `}
      </div>
    `).join('');

    return `
      <article class="admin-verse-card" data-verse="${verseNumber}">
        <div class="admin-verse-head">
          <div>
            <div class="admin-verse-ref">${escapeHtml(state.label)} ${verseNumber}</div>
            <p class="admin-verse-translation">${escapeHtml(spanishText || 'Sin texto español')}</p>
          </div>
          <div class="admin-verse-raw">${escapeHtml(verseNode?.raw || 'Sin texto original')}</div>
        </div>
        <div class="admin-token-grid">${rows || '<div class="admin-empty-state">No hay tokens en este versículo.</div>'}</div>
      </article>
    `;
  }

  function bindDirtyTracking(){
    els.mount.querySelectorAll('input[data-field]').forEach((input) => {
      input.addEventListener('input', () => {
        setBadge('Cambios sin guardar', 'err');
      });
    });
  }

  async function renderEditor(){
    setBadge('', '');
    els.mount.innerHTML = '<div class="text-muted">Cargando capítulo…</div>';

    const [spanishBook, interlinearBook] = await Promise.all([
      getSpanishBook(state.slug),
      getInterlinearBook(state.slug)
    ]);

    const chapterTotal = await getChapterCount(state.slug);
    if(state.chapter > chapterTotal){
      state.chapter = chapterTotal;
    }

    const spanishVerses = getSpanishVerses(spanishBook, state.chapter);
    const interlinearVerses = getInterlinearVerses(interlinearBook, state.chapter);
    const draft = readDraft(state.slug, state.chapter);
    const draftVersesByNumber = new Map((draft?.verses || []).map((verse) => [String(verse.verse), verse]));

    const verseNumbers = Object.keys(interlinearVerses).sort((a, b) => Number(a) - Number(b));
    if(!verseNumbers.length){
      els.mount.innerHTML = '<div class="admin-empty-state">No se encontró interlineal para este capítulo.</div>';
      els.verseCount.textContent = '0';
      els.tokenCount.textContent = '0';
      updateDraftStateLabel();
      return;
    }

    let tokenCount = 0;
    const cards = [];
    for(const verseNumber of verseNumbers){
      const verseNode = interlinearVerses[verseNumber];
      const enrichedVerseNode = {
        ...verseNode,
        tokens: await withGreekSuggestions(verseNode)
      };
      tokenCount += Array.isArray(enrichedVerseNode?.tokens) ? enrichedVerseNode.tokens.length : 0;
      cards.push(buildVerseCardHtml(
        `${state.chapter}:${verseNumber}`,
        spanishVerses[Number(verseNumber) - 1] || '',
        enrichedVerseNode,
        draftVersesByNumber.get(`${state.chapter}:${verseNumber}`) || draftVersesByNumber.get(String(verseNumber))
      ));
    }
    els.mount.innerHTML = cards.join('');

    state.draft = draft;
    els.title.textContent = `Editor interlineal · ${state.label} ${state.chapter}`;
    els.meta.textContent = `${state.label} ${state.chapter}`;
    els.panelTitle.textContent = `${state.label} ${state.chapter}`;
    els.input.value = `${state.label} ${state.chapter}`;
    els.verseCount.textContent = String(verseNumbers.length);
    els.tokenCount.textContent = String(tokenCount);
    updateDraftStateLabel();
    bindDirtyTracking();
    renderBookLists(state.slug);
    await renderChapterList(state.slug);
    updateChapterButtons(chapterTotal);
  }

  function updateChapterButtons(total){
    els.prevBtn.disabled = state.chapter <= 1;
    els.nextBtn.disabled = state.chapter >= total;
  }

  async function navigateTo(slug, chapter){
    const book = BOOK_MAP.get(slug);
    if(!book) throw new Error('Libro no disponible.');
    state.slug = slug;
    state.label = book.label;
    state.chapter = chapter;
    await renderEditor();
  }

  function downloadJson(filename, payload){
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function exportBookChanges(){
    const bookMeta = BOOK_MAP.get(state.slug);
    if(!bookMeta) throw new Error('Libro no disponible para exportación.');
    writeDraft();
    const baseBook = await getInterlinearBook(state.slug);
    const drafts = listDraftsForBook(state.slug);
    const payload = mergeDraftsIntoBook(baseBook, drafts);
    downloadJson(bookMeta.file, payload);
    setBadge(`Archivo listo: ${bookMeta.file}`, 'ok');
  }

  async function resetDraft(){
    const confirmed = window.confirm(`Se eliminará el borrador local de ${state.label} ${state.chapter}.`);
    if(!confirmed) return;
    localStorage.removeItem(draftStorageKey(state.slug, state.chapter));
    await renderEditor();
    setBadge('Borrador eliminado', 'ok');
  }

  function handleError(error){
    const message = error instanceof Error ? error.message : String(error);
    els.mount.innerHTML = `<div class="admin-empty-state">${escapeHtml(message)}</div>`;
    setBadge('No se pudo abrir el capítulo', 'err');
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
      if(els.bookDropdown.hidden){
        openBookMenu();
      }else{
        closeBookMenu();
      }
    });
    els.bookDropdown?.addEventListener('click', (event) => event.stopPropagation());
    document.addEventListener('click', (event) => {
      if(!els.bookDropdown.hidden && !els.bookDropdown.contains(event.target) && !els.bookToggle.contains(event.target)){
        closeBookMenu();
      }
    });
    document.addEventListener('keydown', (event) => {
      if(event.key === 'Escape' && !els.bookDropdown.hidden){
        closeBookMenu();
      }
    });
  }

  function bindEvents(){
    els.form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const parsed = parseReference(els.input?.value);
      if(!parsed){
        setBadge('Usa el formato "Libro capítulo"', 'err');
        return;
      }
      try{
        await navigateTo(parsed.slug, parsed.chapter);
      }catch(error){
        handleError(error);
      }
    });

    els.saveBtn?.addEventListener('click', writeDraft);
    els.exportBtn?.addEventListener('click', async () => {
      try{
        await exportBookChanges();
      }catch(error){
        handleError(error);
      }
    });
    els.resetBtn?.addEventListener('click', resetDraft);
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
