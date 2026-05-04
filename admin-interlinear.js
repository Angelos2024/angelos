(function(){
  const ACCESS_KEY = 'angelos.admin.interlinear.access';
  const ACCESS_TTL_MS = 8 * 60 * 60 * 1000;
  const ADMIN_PASSWORD_HASH = '9ece8d19ac8b4bb531ad35e6e6ef440e9e4815868d0f8912585b97f0e6dc2d8c';
  const LAB_MODE_LABEL = 'Hebreo AT';

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

  const BOOK_MAP = new Map(OT_BOOKS.map(([slug, label, file]) => [slug, { slug, label, file }]));
  const LABEL_TO_SLUG = new Map(OT_BOOKS.map(([slug, label]) => [normalizeKey(label), slug]));
  const chapterCountCache = new Map();
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

  const state = {
    slug: 'genesis',
    label: 'Génesis',
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

  async function getInterlinearBook(slug){
    const book = BOOK_MAP.get(slug);
    if(!book) throw new Error('Libro no soportado en el laboratorio hebreo.');
    if(!interlinearCache.has(slug)){
      interlinearCache.set(slug, loadJson(`./IdiomaORIGEN/interlineal/${book.file}`));
    }
    return interlinearCache.get(slug);
  }

  async function getChapterCount(slug){
    if(chapterCountCache.has(slug)) return chapterCountCache.get(slug);
    const book = await getInterlinearBook(slug);
    const count = Object.keys(book?.chapters || {}).length;
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
    if(els.bookListNT) els.bookListNT.textContent = 'Reservado para fases posteriores.';
  }

  async function renderChapterList(slug){
    const total = await getChapterCount(slug);
    const book = BOOK_MAP.get(slug);
    if(els.chapterTitle) els.chapterTitle.textContent = `${book?.label || ''} · capítulos`;
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
    const sourceTokens = Array.isArray(tokens) ? tokens : [];
    if(sourceTokens.length){
      return sourceTokens
        .map((token) => String(token?.orig || '').trim())
        .filter(Boolean)
        .join(' ');
    }
    return String(rawText || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || 'Sin texto hebreo';
  }

  function buildVerseCardHtml(verseNumber, verseNode){
    const tokens = Array.isArray(verseNode?.tokens) ? verseNode.tokens : [];
    const hebrewLine = buildHebrewVerseText(tokens, verseNode?.raw);
    const rows = tokens.map((token) => `
      <div class="admin-token-row admin-token-row-hebrew" data-num="${escapeHtml(token.num || '')}" data-orig="${escapeHtml(token.orig || '')}">
        <div class="admin-token-meta">
          <div class="admin-token-order">Token ${escapeHtml(token.num || '—')}</div>
          <div class="admin-token-orig">${escapeHtml(token.orig || '')}</div>
        </div>
      </div>
    `).join('');

    return `
      <article class="admin-verse-card" data-verse="${verseNumber}">
        <div class="admin-verse-head">
          <div>
            <div class="admin-verse-ref">${escapeHtml(state.label)} ${verseNumber}</div>
            <p class="admin-verse-translation hebrew-only">${escapeHtml(hebrewLine)}</p>
          </div>
        </div>
        <div class="admin-token-grid admin-token-grid-hebrew">${rows || '<div class="admin-empty-state">No hay tokens hebreos en este versículo.</div>'}</div>
      </article>
    `;
  }

  async function renderEditor(){
    setBadge('', '');
    if(els.mount) els.mount.innerHTML = '<div class="text-muted">Cargando texto hebreo…</div>';

    const interlinearBook = await getInterlinearBook(state.slug);
    const chapterTotal = await getChapterCount(state.slug);
    if(state.chapter > chapterTotal) state.chapter = chapterTotal;

    const interlinearVerses = getInterlinearVerses(interlinearBook, state.chapter);
    const verseNumbers = Object.keys(interlinearVerses).sort((a, b) => Number(a) - Number(b));
    if(!verseNumbers.length){
      if(els.mount) els.mount.innerHTML = '<div class="admin-empty-state">No se encontró texto hebreo para este capítulo.</div>';
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
      cards.push(buildVerseCardHtml(`${state.chapter}:${verseNumber}`, verseNode));
    }

    if(els.mount) els.mount.innerHTML = cards.join('');
    if(els.title) els.title.textContent = `Laboratorio hebreo · ${state.label} ${state.chapter}`;
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
        setBadge('Usa el formato "Libro capítulo"', 'err');
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
