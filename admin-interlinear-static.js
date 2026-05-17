(function(){
  const ACCESS_KEY = 'angelos.admin.interlinear.access';
  const ACCESS_TTL_MS = 8 * 60 * 60 * 1000;
  const ADMIN_PASSWORD_HASH = '9ece8d19ac8b4bb531ad35e6e6ef440e9e4815868d0f8912585b97f0e6dc2d8c';
  const RENDER_BATCH_SIZE = 6;
  const SNAPSHOT_BASE = './IdiomaORIGEN/interlinear-snapshot/chapters';
  const MANIFEST_PATH = './IdiomaORIGEN/manifest.json';

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
    ['ezra', 'Ezra', '15_Esdras.json'],
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

  let renderToken = 0;
  let chapterListSlug = null;
  let manifestPromise = null;
  let chapterCountCache = new Map();

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
    chapter: 1,
    bookLabelDisplay: 'Génesis'
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
    if(els.draftState) els.draftState.textContent = 'Snapshot AT (solo lectura)';
  }

  async function loadJson(url){
    const response = await fetch(url, { cache: 'default' });
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async function getManifest(){
    if(!manifestPromise){
      manifestPromise = loadJson(MANIFEST_PATH).catch((error) => {
        manifestPromise = null;
        throw error;
      });
    }
    return manifestPromise;
  }

  function getBookManifestInfo(manifest, slug){
    return manifest?.books?.[slug] || null;
  }

  async function getChapterCount(slug){
    if(chapterCountCache.has(slug)) return chapterCountCache.get(slug);
    try {
      const manifest = await getManifest();
      const n = manifest?.books?.[slug]?.chapters;
      if(Number.isInteger(n) && n > 0){
        chapterCountCache.set(slug, n);
        return n;
      }
    }catch(_e){ /* fallthrough */ }
    chapterCountCache.set(slug, 1);
    return 1;
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

  function snapshotChapterUrl(slug, chapter){
    return `${SNAPSHOT_BASE}/${encodeURIComponent(slug)}/${chapter}.json`;
  }

  function hasHebrewConsonantSurf(str){
    return /[\u05D0-\u05EA]/.test(String(str || ''));
  }

  function greekLineFromSnapshot(seg){
    const greekSurf = String(seg.greek_lxx || '').trim();
    const tier = String(seg.lxx_tier || '').trim();
    if(!greekSurf && tier === '') return '';

    if(greekSurf && greekSurf !== '—'){
      let lxxClass = 'admin-morph-segment-lxx';
      let lxxTitle = '';
      if(tier === 'soft'){
        lxxClass += ' admin-morph-segment-lxx-soft';
        lxxTitle = ' title="Sugerencia algoritmica (MT y LXX pueden divergir)"';
      }else if(tier === 'hint'){
        lxxClass += ' admin-morph-segment-lxx-hint';
        lxxTitle = ' title="Alineacion editorial (modulo lxx-mt-word-hints)"';
      }else if(tier === 'auto'){
        lxxClass += ' admin-morph-segment-lxx-auto';
        lxxTitle = ' title="Concordancia Strong↔griego (equivalencias_trilingue); revisar si el sentido diverge"';
      }
      return `<div class="${lxxClass}"${lxxTitle}>${escapeHtml(greekSurf)}</div>`;
    }
    if(greekSurf === '—'){
      return '<div class="admin-morph-segment-lxx">—</div>';
    }
    return '';
  }

  /**
   * Agrupa segmentos visibles en tokens (misma estructura que mergeDisplayMorphemes + render).
   */
  function groupSegmentsForVerse(segments){
    const visible = (Array.isArray(segments) ? segments : []).filter((s) => s && s.visible_in_admin_ui !== false);
    const rows = [];
    let cur = null;
    for(const seg of visible){
      const tk = String(seg.token_num ?? '');
      if(!cur || cur.token_num !== tk){
        cur = { token_num: tk, morphemes: [] };
        rows.push(cur);
      }
      cur.morphemes.push(seg);
    }
    return rows;
  }

  function buildVerseCardFromSnapshot(bookLabel, chapterVerseKey, verse){
    const segments = verse?.segments || [];
    const mergedRows = groupSegmentsForVerse(segments);

    let lxxChipHtml = '';
    const edition = String(verse?.lxx_edition || '').trim();
    const lxxV = verse?.lxx_verse;
    const mtV = verse?.mt_verse;
    const mtCh = verse?.mt_chapter;
    const shifted = Boolean(verse?.mt_lxx_verse_shifted);
    if(edition && Number.isFinite(Number(lxxV))){
      const shiftNote = shifted
        ? ` · Masora v${mtV}→LXX v${lxxV}`
        : '';
      lxxChipHtml = `<div class="admin-lxx-verse-chip" dir="ltr" lang="el">LXX (${escapeHtml(edition)}) ${escapeHtml(String(mtCh))}:${escapeHtml(String(lxxV))}${shiftNote}</div>`;
    }

    const rows = mergedRows.map(({ token_num: tkNum, morphemes }) => {
      const morphemeHtml = morphemes.map((morpheme) => {
        const hebrewSurface = String(morpheme.hebrew || '').trim();
        const gloss = String(morpheme.spanish || '').trim();
        const label = String(morpheme.morphology || '-').trim();
        const type = String(morpheme.morpheme_type || 'base').trim();
        const greekLine = greekLineFromSnapshot(morpheme);

        const greekSurf = String(morpheme.greek_lxx || '').trim();
        const hasRealGreek = greekSurf && greekSurf !== '—';
        if(!hasHebrewConsonantSurf(hebrewSurface) && !gloss && !hasRealGreek){
          return '';
        }

        return `
        <div class="admin-morph-segment admin-morph-segment-${escapeHtml(type)}">
          <div class="admin-morph-segment-hebrew">${escapeHtml(hebrewSurface)}</div>
          <div class="admin-morph-segment-label">${escapeHtml(label)}</div>
          <div class="admin-morph-segment-gloss">${escapeHtml(gloss)}</div>
          ${greekLine}
        </div>
      `;
      }).join('');

      if(!morphemeHtml.trim()) return '';

      return `
        <div class="admin-morph-token" data-num="${escapeHtml(tkNum)}">
          <div class="admin-morph-token-strip-inner">${morphemeHtml}</div>
        </div>
      `;
    });

    return `
      <article class="admin-verse-card" data-verse="${escapeHtml(chapterVerseKey)}">
        <div class="admin-verse-head">
          <div>
            <div class="admin-verse-ref">${escapeHtml(bookLabel)} ${escapeHtml(chapterVerseKey)}</div>
          </div>
        </div>
        <div class="admin-morph-card-body">
          ${lxxChipHtml}
          <div class="admin-morph-token-strip">${rows.join('') || '<div class="admin-morph-empty">No hay tokens hebreos en este versiculo.</div>'}</div>
        </div>
      </article>
    `;
  }

  function paintCardsInBatches(mount, cards, isAlive){
    mount.innerHTML = '';
    return new Promise((resolve) => {
      let cursor = 0;
      const scheduler = window.requestAnimationFrame
        ? (cb) => window.requestAnimationFrame(cb)
        : (cb) => setTimeout(cb, 16);
      const step = () => {
        if(typeof isAlive === 'function' && !isAlive()){ resolve(); return; }
        const end = Math.min(cursor + RENDER_BATCH_SIZE, cards.length);
        if(end > cursor){
          const tmp = document.createElement('div');
          tmp.innerHTML = cards.slice(cursor, end).join('');
          const fragment = document.createDocumentFragment();
          while(tmp.firstChild) fragment.appendChild(tmp.firstChild);
          mount.appendChild(fragment);
        }
        cursor = end;
        if(cursor >= cards.length){ resolve(); return; }
        scheduler(step);
      };
      scheduler(step);
    });
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

    if(chapterListSlug !== slug){
      chapterListSlug = slug;
      const fragment = document.createDocumentFragment();
      for(let i = 1; i <= total; i += 1){
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'chapter-chip';
        button.dataset.chapter = String(i);
        button.textContent = String(i);
        fragment.appendChild(button);
      }
      els.chapterList.innerHTML = '';
      els.chapterList.appendChild(fragment);
    }

    const activeIndex = (slug === state.slug) ? state.chapter : -1;
    els.chapterList.querySelectorAll('.chapter-chip').forEach((btn) => {
      const idx = Number(btn.dataset.chapter);
      btn.classList.toggle('is-active', idx === activeIndex);
    });
  }

  function bindChapterListDelegation(){
    if(!els.chapterList || els.chapterList.dataset.delegated === '1') return;
    els.chapterList.dataset.delegated = '1';
    els.chapterList.addEventListener('click', async (event) => {
      const button = event.target.closest('.chapter-chip');
      if(!button || !els.chapterList.contains(button)) return;
      const idx = Number(button.dataset.chapter);
      if(!Number.isInteger(idx) || idx < 1) return;
      const slug = chapterListSlug || state.slug;
      closeBookMenu();
      try { await navigateTo(slug, idx); }
      catch(error){ handleError(error); }
    });
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

  function handleError(error){
    const message = error instanceof Error ? error.message : String(error);
    if(els.mount) els.mount.innerHTML = `<div class="admin-empty-state">${escapeHtml(message)}</div>`;
    setBadge('No se pudo abrir el capitulo', 'err');
  }

  async function renderEditor(){
    const token = ++renderToken;
    const isAlive = () => token === renderToken;

    setBadge('', '');
    if(els.mount) els.mount.innerHTML = '<div class="text-muted">Cargando snapshot...</div>';

    const chapterTotal = await getChapterCount(state.slug);
    if(!isAlive()) return;
    if(chapterTotal > 0 && state.chapter > chapterTotal) state.chapter = chapterTotal;

    const url = snapshotChapterUrl(state.slug, state.chapter);
    let chapterDoc;
    try {
      chapterDoc = await loadJson(url);
    }catch(error){
      if(!isAlive()) return;
      handleError(new Error(`No hay snapshot para este capitulo (${url}). Ejecuta scripts/export-interlinear-snapshot.js.`));
      return;
    }
    if(!isAlive()) return;

    if(chapterDoc?.book_label){
      state.bookLabelDisplay = String(chapterDoc.book_label);
    }

    const verses = chapterDoc?.verses && typeof chapterDoc.verses === 'object' ? chapterDoc.verses : {};
    const verseKeys = Object.keys(verses).sort((a, b) => Number(a) - Number(b));
    if(!verseKeys.length){
      if(els.mount) els.mount.innerHTML = '<div class="admin-empty-state">Snapshot sin versiculos.</div>';
      return;
    }

    const bookLabel = state.bookLabelDisplay || BOOK_MAP.get(state.slug)?.label || state.label;

    const cards = verseKeys.map((vk) => {
      const verse = verses[vk];
      const chapterVerseKey = `${state.chapter}:${vk}`;
      return buildVerseCardFromSnapshot(bookLabel, chapterVerseKey, verse);
    });

    let tokenTally = 0;
    for(const vk of verseKeys){
      const verse = verses[vk];
      const segs = verse?.segments || [];
      const vis = segs.filter((s) => s && s.visible_in_admin_ui !== false);
      const nums = new Set(vis.map((s) => String(s.token_num ?? '')));
      tokenTally += nums.size;
    }

    if(els.mount) await paintCardsInBatches(els.mount, cards, isAlive);
    if(!isAlive()) return;

    if(els.title) els.title.textContent = `Laboratorio morfologico · ${state.label} ${state.chapter}`;
    if(els.meta) els.meta.textContent = `${state.label} ${state.chapter}`;
    if(els.panelTitle) els.panelTitle.textContent = `${state.label} ${state.chapter}`;
    if(els.input) els.input.value = `${state.label} ${state.chapter}`;
    if(els.verseCount) els.verseCount.textContent = String(verseKeys.length);
    if(els.tokenCount) els.tokenCount.textContent = String(tokenTally);
    updateDraftStateLabel();
    renderBookLists(state.slug);
    await renderChapterList(state.slug);
    if(!isAlive()) return;
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
    bindChapterListDelegation();
    bindEvents();
    try{
      await renderEditor();
    }catch(error){
      handleError(error);
    }
  }

  void init();
})();
