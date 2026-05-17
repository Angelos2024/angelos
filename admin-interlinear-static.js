(function(){
  const ACCESS_KEY = 'angelos.admin.interlinear.access';
  const ACCESS_TTL_MS = 8 * 60 * 60 * 1000;
  const ADMIN_PASSWORD_HASH = '9ece8d19ac8b4bb531ad35e6e6ef440e9e4815868d0f8912585b97f0e6dc2d8c';
  const RENDER_BATCH_SIZE = 6;
  const SNAPSHOT_BASE = './IdiomaORIGEN/interlinear-snapshot/chapters';
  const INDEX_BY_STRONGS_URL = './IdiomaORIGEN/interlinear-snapshot/index.by-strongs.json';
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
  /** @type {Map<string, object>} clave `${slug}/${chapter}` → documento JSON mutado */
  const chapterCache = new Map();
  /** @type {Set<string>} capítulos con cambios sin volcar a disco */
  const dirtyChapters = new Set();
  let strongsIndexPromise = null;
  /** True si la página se sirve con scripts/admin-interlinear-local-server.js (guardado POST). */
  let directSaveEnabled = false;

  /** Contexto del modal de edición (versículo dentro del capítulo cargado). */
  let editSession = {
    verseNum: '',
    globalRows: [],
    globalRefsLoaded: false,
    /** Strong elegido por chip hebreo o select opcional */
    selectedGlobalStrong: '',
    /** 'strong' | 'hebrewEmptyStrong' */
    globalSearchKind: 'strong',
    /** Superficie NFC para búsqueda sin Strong */
    globalHebrewTarget: ''
  };

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
    chapterTitle: document.getElementById('adminChapterTitle'),
    verseEditBackdrop: document.getElementById('adminVerseEditBackdrop'),
    verseEditModal: document.getElementById('adminVerseEditModal'),
    verseEditTitle: document.getElementById('adminVerseEditTitle'),
    verseEditCloseBtn: document.getElementById('adminVerseEditCloseBtn'),
    verseEditCancelBtn: document.getElementById('adminVerseEditCancelBtn'),
    verseEditSaveBtn: document.getElementById('adminVerseEditSaveBtn'),
    editUniquePanel: document.getElementById('adminEditUniquePanel'),
    editGlobalPanel: document.getElementById('adminEditGlobalPanel'),
    globalStrongSelect: document.getElementById('adminGlobalStrongSelect'),
    globalWordPick: document.getElementById('adminGlobalWordPick'),
    globalLoadBtn: document.getElementById('adminGlobalLoadBtn'),
    globalStatus: document.getElementById('adminGlobalStatus'),
    globalTableWrap: document.getElementById('adminGlobalTableWrap')
  };

  const state = {
    slug: 'genesis',
    label: 'Genesis',
    chapter: 1,
    bookLabelDisplay: 'Génesis',
    chapterDoc: null
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

  function escapeAttr(value){
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }

  function normalizeHebrewSurface(value){
    return String(value || '').normalize('NFC').trim();
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

  function chapterCacheKey(slug, chapterNum){
    return `${slug}/${chapterNum}`;
  }

  function isCurrentChapterDirty(){
    return dirtyChapters.has(chapterCacheKey(state.slug, state.chapter));
  }

  function markChapterDirty(slug, chapterNum){
    dirtyChapters.add(chapterCacheKey(slug, chapterNum));
    updateDraftStateLabel();
  }

  function updateDraftStateLabel(){
    if(!els.draftState) return;
    if(isCurrentChapterDirty()){
      els.draftState.textContent = directSaveEnabled
        ? 'Capítulo editado · Guardar en disco escribe en los JSON'
        : 'Capítulo editado en memoria · Guardar en disco (o servidor local)';
      return;
    }
    els.draftState.textContent = directSaveEnabled
      ? 'Servidor local · guardado directo activo'
      : 'Snapshot AT';
  }

  async function probeDirectSave(){
    directSaveEnabled = false;
    try{
      const response = await fetch('/api/interlinear-local-status', { cache: 'no-store' });
      if(!response.ok) return;
      const data = await response.json();
      directSaveEnabled = Boolean(data.directSave);
    }catch(_e){
      directSaveEnabled = false;
    }
    updateDraftStateLabel();
  }

  async function getChapterDocument(slug, chapterNum){
    const key = chapterCacheKey(slug, chapterNum);
    if(chapterCache.has(key)) return chapterCache.get(key);
    const doc = await loadJson(snapshotChapterUrl(slug, chapterNum));
    chapterCache.set(key, doc);
    return doc;
  }

  /** Garantiza que el documento en curso es la referencia única del cache para ese capítulo. */
  function attachCurrentChapterDoc(doc){
    state.chapterDoc = doc;
    chapterCache.set(chapterCacheKey(state.slug, state.chapter), doc);
  }

  async function getStrongsIndex(){
    if(!strongsIndexPromise){
      strongsIndexPromise = loadJson(INDEX_BY_STRONGS_URL).catch((error) => {
        strongsIndexPromise = null;
        throw error;
      });
    }
    return strongsIndexPromise;
  }

  function parseSegmentRef(ref){
    const parts = String(ref || '').split('/');
    if(parts.length !== 4) return null;
    const slug = parts[0];
    const chapter = Number(parts[1]);
    const verseKey = parts[2];
    const segmentIndex = Number(parts[3]);
    if(!BOOK_MAP.has(slug) || !Number.isInteger(chapter) || chapter < 1) return null;
    if(!verseKey || !Number.isInteger(segmentIndex) || segmentIndex < 0) return null;
    return { slug, chapter, verseKey, segmentIndex };
  }

  function segmentEditRowsForVerse(verse){
    const segments = verse?.segments || [];
    const rows = [];
    segments.forEach((seg, idx) => {
      if(seg && seg.visible_in_admin_ui !== false){
        rows.push({ seg, idx });
      }
    });
    return rows;
  }

  function collectStrongsInVerse(verse){
    const seen = new Set();
    const rows = segmentEditRowsForVerse(verse);
    for(const { seg } of rows){
      const s = String(seg?.strongs || '').trim();
      if(s) seen.add(s);
    }
    return [...seen].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }

  /** Mini strip del versículo completo resaltando el segmento Strong correspondiente. */
  function renderOccurrenceVerseContextHtml(doc, verseKey, highlightSegmentIndex){
    const verse = doc?.verses?.[verseKey];
    if(!verse?.segments?.length){
      return '<p class="small opacity-75 mb-0">Sin datos de versículo.</p>';
    }
    const parts = [];
    for(let idx = 0; idx < verse.segments.length; idx++){
      const seg = verse.segments[idx];
      if(!seg || seg.visible_in_admin_ui === false) continue;
      const he = escapeHtml(String(seg.hebrew || '').trim()) || '·';
      const gl = escapeHtml(String(seg.spanish || '').trim());
      const morph = escapeHtml(String(seg.morphology || '').trim());
      const hit = idx === highlightSegmentIndex;
      parts.push(
        `<div class="admin-global-ctx-cell${hit ? ' admin-global-ctx-hit' : ''}">
          <div class="admin-global-ctx-he" dir="rtl">${he}</div>
          <div class="admin-global-ctx-gl" dir="ltr">${gl}</div>
          <div class="admin-global-ctx-morph">${morph}</div>
        </div>`
      );
    }
    if(!parts.length){
      return '<p class="small opacity-75 mb-0">Sin segmentos visibles.</p>';
    }
    return `<div class="admin-global-ctx-strip" dir="rtl">${parts.join('')}</div>`;
  }

  function renderGlobalWordPicker(verseNum){
    const wrap = els.globalWordPick;
    if(!wrap) return;
    wrap.replaceChildren();
    editSession.selectedGlobalStrong = '';
    editSession.globalSearchKind = 'strong';
    editSession.globalHebrewTarget = '';
    if(els.globalStrongSelect) els.globalStrongSelect.value = '';
    const verse = state.chapterDoc?.verses?.[verseNum];
    const rows = segmentEditRowsForVerse(verse);
    if(!rows.length){
      const p = document.createElement('p');
      p.className = 'small opacity-75 mb-0';
      p.textContent = 'No hay segmentos en este versículo.';
      wrap.appendChild(p);
      return;
    }
    for(const { seg } of rows){
      const he = String(seg.hebrew || '').trim();
      const st = String(seg.strongs || '').trim();
      const morph = String(seg.morphology || '').trim();
      if(!he && !st) continue;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'admin-global-word-chip';
      const heSp = document.createElement('span');
      heSp.className = 'admin-global-word-chip-he';
      heSp.textContent = he || (st ? '·' : '∅');
      const meta = document.createElement('span');
      meta.className = 'admin-global-word-chip-meta';
      if(st){
        btn.dataset.globalKind = 'strong';
        btn.dataset.strong = st;
        meta.textContent = morph ? `${st} · ${morph}` : st;
      }else{
        const key = normalizeHebrewSurface(he);
        if(!key){
          btn.disabled = true;
          meta.textContent = 'vacío';
          btn.title = 'Sin texto hebreo para buscar.';
        }else{
          btn.dataset.globalKind = 'hebrew';
          btn.dataset.hebrewTarget = key;
          btn.title = 'Busca en todo el snapshot la misma escritura con Strong vacío (puede tardar). Homónimos posibles.';
          meta.textContent = morph ? `sin Strong · ${morph}` : 'sin Strong · por texto';
        }
      }
      btn.append(heSp, meta);
      wrap.appendChild(btn);
    }
  }

  /**
   * Segmentos con Strong vacío no están en index.by-strongs; recorremos capítulos del AT.
   * Iguala superficie hebrea en NFC y exige strongs vacío (articulos, vacíos de datos, etc.).
   */
  async function findRefsHebrewEmptyStrong(hebrewTarget){
    const target = normalizeHebrewSurface(hebrewTarget);
    if(!target) return [];
    const refs = [];
    const slugs = [...new Set(OT_BOOKS.map((row) => row[0]))];
    let scanned = 0;
    for(const slug of slugs){
      const total = await getChapterCount(slug);
      for(let ch = 1; ch <= total; ch++){
        scanned += 1;
        if(scanned % 60 === 0 && els.globalStatus){
          els.globalStatus.textContent = `Buscando sin Strong… ${scanned} capítulos (${slug} ${ch})`;
        }
        if(scanned % 25 === 0){
          await new Promise((r) => setTimeout(r, 0));
        }
        let doc;
        try{
          doc = await getChapterDocument(slug, ch);
        }catch(_e){
          continue;
        }
        const verses = doc?.verses || {};
        for(const vk of Object.keys(verses)){
          const segs = verses[vk]?.segments || [];
          for(let si = 0; si < segs.length; si++){
            const seg = segs[si];
            if(!seg || seg.visible_in_admin_ui === false) continue;
            const he = normalizeHebrewSurface(seg.hebrew);
            if(he !== target) continue;
            const st = String(seg.strongs || '').trim();
            if(st) continue;
            refs.push(`${slug}/${ch}/${vk}/${si}`);
          }
        }
      }
    }
    return refs;
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

  function buildVerseCardFromSnapshot(bookLabel, chapterVerseKey, verseNum, verse){
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
          <div class="admin-morph-card-toolbar">
            <button type="button" class="admin-btn-edit-verse" data-action="edit-verse" data-verse-num="${escapeHtml(verseNum)}">Modificar versículo</button>
          </div>
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

  function buildCardsArrayFromDoc(chapterDoc, chapterNum, bookLabel){
    const verses = chapterDoc?.verses && typeof chapterDoc.verses === 'object' ? chapterDoc.verses : {};
    const verseKeys = Object.keys(verses).sort((a, b) => Number(a) - Number(b));
    return verseKeys.map((vk) => {
      const verse = verses[vk];
      const chapterVerseKey = `${chapterNum}:${vk}`;
      return buildVerseCardFromSnapshot(bookLabel, chapterVerseKey, vk, verse);
    });
  }

  async function refreshChapterCards(){
    const token = renderToken;
    const isAlive = () => token === renderToken;
    if(!state.chapterDoc || !els.mount) return;
    const bookLabel = state.bookLabelDisplay || BOOK_MAP.get(state.slug)?.label || state.label;
    const cards = buildCardsArrayFromDoc(state.chapterDoc, state.chapter, bookLabel);
    await paintCardsInBatches(els.mount, cards, isAlive);
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
      chapterDoc = await getChapterDocument(state.slug, state.chapter);
      attachCurrentChapterDoc(chapterDoc);
    }catch(error){
      if(!isAlive()) return;
      chapterCache.delete(chapterCacheKey(state.slug, state.chapter));
      handleError(new Error(`No hay snapshot para este capitulo (${url}). Coloca JSON en IdiomaORIGEN/interlinear-snapshot/chapters/… o recuperalo desde tu respaldo.`));
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

    const cards = buildCardsArrayFromDoc(chapterDoc, state.chapter, bookLabel);

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

  function getEditMode(){
    const radio = document.querySelector('input[name="adminEditMode"]:checked');
    return radio?.value === 'global' ? 'global' : 'unique';
  }

  function openVerseModal(){
    if(els.verseEditBackdrop){
      els.verseEditBackdrop.hidden = false;
      els.verseEditBackdrop.setAttribute('aria-hidden', 'false');
    }
    if(els.verseEditModal){
      els.verseEditModal.hidden = false;
    }
  }

  function closeVerseModal(){
    if(els.verseEditBackdrop){
      els.verseEditBackdrop.hidden = true;
      els.verseEditBackdrop.setAttribute('aria-hidden', 'true');
    }
    if(els.verseEditModal){
      els.verseEditModal.hidden = true;
    }
    editSession.globalRows = [];
    editSession.globalRefsLoaded = false;
    editSession.selectedGlobalStrong = '';
    editSession.globalSearchKind = 'strong';
    editSession.globalHebrewTarget = '';
    if(els.globalTableWrap) els.globalTableWrap.innerHTML = '';
    if(els.globalStatus) els.globalStatus.textContent = '';
  }

  function syncEditModePanels(){
    const mode = getEditMode();
    if(els.editUniquePanel) els.editUniquePanel.hidden = mode === 'global';
    if(els.editGlobalPanel) els.editGlobalPanel.hidden = mode !== 'global';
  }

  function renderUniquePanelHtml(verseNum){
    const verse = state.chapterDoc?.verses?.[verseNum];
    const rows = segmentEditRowsForVerse(verse);
    if(!rows.length){
      return '<p class="small mb-0 opacity-75">No hay segmentos editables en este versículo.</p>';
    }
    const blocks = rows.map(({ seg, idx }) => {
      const he = escapeHtml(String(seg.hebrew || '').trim());
      const morph = escapeHtml(String(seg.morphology || '').trim());
      const strong = escapeHtml(String(seg.strongs || '').trim());
      const sp = String(seg.spanish || '');
      const gr = String(seg.greek_lxx || '');
      const metaBits = [
        strong ? `<code class="admin-unique-strong">${strong}</code>` : '',
        morph ? `<span class="admin-unique-morph">${morph}</span>` : ''
      ].filter(Boolean).join(' · ');
      return `
<div class="admin-unique-seg">
  <div class="admin-unique-seg-main">
    <div class="admin-unique-seg-hewrap">
      <div class="admin-unique-seg-he" dir="rtl">${he || '·'}</div>
      ${metaBits ? `<div class="admin-unique-seg-meta" dir="ltr">${metaBits}</div>` : ''}
    </div>
    <div class="admin-unique-seg-fields">
      <label class="admin-unique-field-label">Glosa (español)
        <input type="text" class="form-control form-control-sm admin-unique-spanish" data-seg-index="${idx}" value="${escapeAttr(sp)}" autocomplete="off"/>
      </label>
      <details class="admin-unique-lxx-details">
        <summary class="admin-unique-lxx-sum">Griego LXX (opcional)</summary>
        <input type="text" class="form-control form-control-sm admin-unique-greek mt-2" data-seg-index="${idx}" value="${escapeAttr(gr)}" autocomplete="off"/>
      </details>
    </div>
  </div>
</div>`;
    });
    return `<div class="admin-unique-list">${blocks.join('')}</div>`;
  }

  function populateGlobalStrongSelect(verseNum){
    const verse = state.chapterDoc?.verses?.[verseNum];
    const strongs = collectStrongsInVerse(verse);
    if(!els.globalStrongSelect) return;
    els.globalStrongSelect.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = strongs.length ? 'Elige Strong…' : 'Sin Strong en este versículo';
    els.globalStrongSelect.appendChild(placeholder);
    for(const s of strongs){
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      els.globalStrongSelect.appendChild(opt);
    }
  }

  function openVerseEditor(verseNum){
    if(!state.chapterDoc || !verseNum) return;
    editSession.verseNum = String(verseNum);
    editSession.globalRows = [];
    editSession.globalRefsLoaded = false;
    if(els.verseEditTitle){
      els.verseEditTitle.textContent = `Editar · ${state.bookLabelDisplay || state.label} ${state.chapter}:${editSession.verseNum}`;
    }
    const uniqueRadio = document.querySelector('input[name="adminEditMode"][value="unique"]');
    if(uniqueRadio) uniqueRadio.checked = true;
    syncEditModePanels();
    if(els.editUniquePanel) els.editUniquePanel.innerHTML = renderUniquePanelHtml(editSession.verseNum);
    populateGlobalStrongSelect(editSession.verseNum);
    renderGlobalWordPicker(editSession.verseNum);
    if(els.globalTableWrap) els.globalTableWrap.innerHTML = '';
    if(els.globalStatus) els.globalStatus.textContent = '';
    openVerseModal();
  }

  async function hydrateGlobalOccurrencesFromParsed(parsed, statusSuffix){
    parsed.sort((a, b) => {
      const A = a.p;
      const B = b.p;
      if(A.slug !== B.slug) return String(A.slug).localeCompare(B.slug);
      if(A.chapter !== B.chapter) return A.chapter - B.chapter;
      if(Number(A.verseKey) !== Number(B.verseKey)) return Number(A.verseKey) - Number(B.verseKey);
      return A.segmentIndex - B.segmentIndex;
    });
    const chapterKeys = [...new Set(parsed.map((x) => chapterCacheKey(x.p.slug, x.p.chapter)))];
    if(els.globalStatus) els.globalStatus.textContent = `Cargando ${parsed.length} ocurrencias en ${chapterKeys.length} archivos de capítulo…`;
    await Promise.all(chapterKeys.map((key) => {
      const [slug, ch] = key.split('/');
      return getChapterDocument(slug, Number(ch));
    }));

    const rows = [];
    const tableRows = [];
    for(const { raw, p } of parsed){
      const doc = chapterCache.get(chapterCacheKey(p.slug, p.chapter));
      const seg = doc?.verses?.[p.verseKey]?.segments?.[p.segmentIndex];
      if(!seg){
        tableRows.push(`<tr><td colspan="3"><span class="text-warning">Falta segmento ${escapeHtml(raw)}</span></td></tr>`);
        continue;
      }
      const book = BOOK_MAP.get(p.slug)?.label || p.slug;
      const refLabel = `${book} ${p.chapter}:${p.verseKey}`;
      const gloss = String(seg.spanish || '');
      const ctxHtml = renderOccurrenceVerseContextHtml(doc, p.verseKey, p.segmentIndex);
      rows.push({ ref: raw, slug: p.slug, chapter: p.chapter });
      tableRows.push(`
<tr>
  <td class="admin-global-col-ref"><div class="admin-global-ref-label">${escapeHtml(refLabel)}</div><code class="small opacity-75">${escapeHtml(raw)}</code></td>
  <td class="admin-global-col-ctx">${ctxHtml}</td>
  <td class="admin-global-col-gloss"><span class="admin-field-label small d-block mb-1">Glosa en este contexto</span><input type="text" class="admin-global-gloss-input form-control form-control-sm" data-ref="${escapeAttr(raw)}" value="${escapeAttr(gloss)}"/></td>
</tr>`);
    }
    editSession.globalRows = rows;
    editSession.globalRefsLoaded = true;
    if(els.globalTableWrap){
      els.globalTableWrap.innerHTML = `
<table class="admin-global-table admin-global-table-context">
<thead><tr><th>Referencia</th><th>Versículo completo (la celda resaltada es la forma que editas)</th><th>Tu glosa</th></tr></thead>
<tbody>${tableRows.join('')}</tbody>
</table>`;
    }
    if(els.globalStatus) els.globalStatus.textContent = `${parsed.length} pasajes · ${statusSuffix}`;
  }

  async function loadGlobalOccurrencesTable(){
    if(els.globalLoadBtn) els.globalLoadBtn.disabled = true;
    try{
      let parsed = [];
      let statusSuffix = '';

      if(editSession.globalSearchKind === 'hebrewEmptyStrong'){
        const target = normalizeHebrewSurface(editSession.globalHebrewTarget);
        if(!target){
          window.alert('Elige un fragmento marcado como «sin Strong · por texto» en las palabras del versículo.');
          return;
        }
        if(els.globalStatus) els.globalStatus.textContent = 'Buscando en todo el snapshot (Strong vacío, misma escritura hebrea). Puede tardar la primera vez…';
        const refs = await findRefsHebrewEmptyStrong(target);
        if(!refs.length){
          editSession.globalRows = [];
          if(els.globalTableWrap) els.globalTableWrap.innerHTML = '<p class="small mb-0">No hay coincidencias con Strong vacío para ese texto.</p>';
          if(els.globalStatus) els.globalStatus.textContent = '';
          return;
        }
        parsed = refs.map((r) => ({ raw: r, p: parseSegmentRef(r) })).filter((x) => x.p);
        statusSuffix = `texto «${target}» (sin Strong)`;
      }else{
        const strong = (editSession.selectedGlobalStrong || els.globalStrongSelect?.value || '').trim();
        if(!strong){
          window.alert('Toca primero una palabra hebrea en «Palabras de este versículo», o elige un número en «Lista Strong (opcional)».');
          return;
        }
        if(els.globalStatus) els.globalStatus.textContent = 'Cargando índice Strong…';
        const index = await getStrongsIndex();
        const refs = index?.refsByStrongs?.[strong];
        if(!Array.isArray(refs) || !refs.length){
          editSession.globalRows = [];
          if(els.globalTableWrap) els.globalTableWrap.innerHTML = '<p class="small mb-0">No hay referencias para esa entrada en el snapshot.</p>';
          if(els.globalStatus) els.globalStatus.textContent = '';
          return;
        }
        parsed = refs.map((r) => ({ raw: r, p: parseSegmentRef(r) })).filter((x) => x.p);
        statusSuffix = `Strong ${strong}`;
      }

      await hydrateGlobalOccurrencesFromParsed(parsed, statusSuffix);
    }catch(e){
      console.error(e);
      window.alert(`No se pudo cargar el listado global: ${e instanceof Error ? e.message : e}`);
      if(els.globalStatus) els.globalStatus.textContent = '';
    }finally{
      if(els.globalLoadBtn) els.globalLoadBtn.disabled = false;
    }
  }

  function applyUniqueEditsFromModal(){
    const verseNum = editSession.verseNum;
    const verse = state.chapterDoc?.verses?.[verseNum];
    if(!verse?.segments) return;
    let touched = false;
    els.editUniquePanel?.querySelectorAll('.admin-unique-spanish[data-seg-index]').forEach((input) => {
      const idx = Number(input.dataset.segIndex);
      if(!Number.isInteger(idx) || idx < 0 || idx >= verse.segments.length) return;
      const seg = verse.segments[idx];
      if(!seg) return;
      const next = input.value;
      if(String(seg.spanish || '') !== next){
        seg.spanish = next;
        touched = true;
      }
    });
    els.editUniquePanel?.querySelectorAll('.admin-unique-greek[data-seg-index]').forEach((input) => {
      const idx = Number(input.dataset.segIndex);
      if(!Number.isInteger(idx) || idx < 0 || idx >= verse.segments.length) return;
      const seg = verse.segments[idx];
      if(!seg) return;
      const next = input.value;
      if(String(seg.greek_lxx || '') !== next){
        seg.greek_lxx = next;
        touched = true;
      }
    });
    if(touched) markChapterDirty(state.slug, state.chapter);
  }

  function applyGlobalEditsFromModal(){
    const inputs = els.globalTableWrap?.querySelectorAll('.admin-global-gloss-input[data-ref]');
    if(!inputs || !inputs.length){
      window.alert('Primero pulsa «Todas las formas».');
      return false;
    }
    const touchedChapters = new Set();
    inputs.forEach((input) => {
      const raw = input.dataset.ref;
      const p = parseSegmentRef(raw);
      if(!p) return;
      const doc = chapterCache.get(chapterCacheKey(p.slug, p.chapter));
      const seg = doc?.verses?.[p.verseKey]?.segments?.[p.segmentIndex];
      if(!seg) return;
      const next = input.value;
      if(String(seg.spanish || '') === next) return;
      seg.spanish = next;
      touchedChapters.add(chapterCacheKey(p.slug, p.chapter));
    });
    touchedChapters.forEach((key) => {
      const [slug, ch] = key.split('/');
      markChapterDirty(slug, Number(ch));
    });
    return true;
  }

  /**
   * Escribe en disco los capítulos indicados (servidor local).
   * Quita de dirtyChapters los que se guardaron bien.
   */
  async function persistChapterKeysToDisk(keysIterable){
    const keys = [...keysIterable];
    if(!keys.length){
      return { ok: true, saved: 0 };
    }
    if(!directSaveEnabled){
      window.alert(
        'Para escribir en los archivos del proyecto (IdiomaORIGEN/interlinear-snapshot/chapters/), abre Admin Interlineal con admin-interlinear-local.bat y usa de nuevo Guardar.'
      );
      return { ok: false, saved: 0 };
    }
    const failed = [];
    let saved = 0;
    for(const key of keys){
      const slash = key.indexOf('/');
      if(slash < 1){
        failed.push(`${key} (clave invalida)`);
        continue;
      }
      const slug = key.slice(0, slash);
      const chapterNum = Number(key.slice(slash + 1));
      if(!Number.isInteger(chapterNum) || chapterNum < 1){
        failed.push(`${key} (capitulo invalido)`);
        continue;
      }
      const doc = chapterCache.get(key);
      if(!doc){
        failed.push(`${key} (sin cache)`);
        continue;
      }
      try{
        const response = await fetch('/api/save-interlinear-chapter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, chapter: chapterNum, document: doc })
        });
        const payload = await response.json().catch(() => ({}));
        if(response.ok && payload.ok){
          dirtyChapters.delete(key);
          saved += 1;
        }else{
          failed.push(`${key}: ${payload.error || response.status}`);
        }
      }catch(e){
        failed.push(`${key}: ${e instanceof Error ? e.message : e}`);
      }
    }
    updateDraftStateLabel();
    if(failed.length){
      window.alert('No se pudieron guardar:\n\n' + failed.join('\n'));
      return { ok: false, saved };
    }
    return { ok: true, saved };
  }

  async function saveVerseModalChanges(){
    const btn = els.verseEditSaveBtn;
    const prevLabel = btn ? btn.textContent : '';
    if(btn){
      btn.disabled = true;
      btn.textContent = 'Guardando…';
    }
    try{
      const mode = getEditMode();
      if(mode === 'unique'){
        applyUniqueEditsFromModal();
      }else{
        const ok = applyGlobalEditsFromModal();
        if(!ok) return;
      }
      const result = await persistChapterKeysToDisk(new Set(dirtyChapters));
      closeVerseModal();
      void refreshChapterCards();
      if(result.ok){
        setBadge(
          result.saved > 0
            ? `Guardado en archivos del snapshot (${result.saved} capítulo(s)).`
            : 'Sin cambios nuevos que guardar.',
          'ok'
        );
      }else if(!directSaveEnabled){
        setBadge('En memoria solamente. Ejecuta admin-interlinear-local.bat y guarda de nuevo.', 'err');
      }else{
        setBadge('No todo se pudo guardar; revisa el aviso.', 'err');
      }
    }finally{
      if(btn){
        btn.disabled = false;
        btn.textContent = prevLabel || 'Guardar';
      }
    }
  }

  async function saveChapterJsonToDisk(){
    if(!state.chapterDoc){
      window.alert('No hay capítulo cargado.');
      return;
    }
    const keys = new Set(dirtyChapters);
    keys.add(chapterCacheKey(state.slug, state.chapter));
    const result = await persistChapterKeysToDisk(keys);
    if(result.ok){
      setBadge(
        result.saved > 0
          ? `Guardado en disco (${result.saved} archivo(s)).`
          : `Capítulo visible guardado (${state.slug} ${state.chapter}).`,
        'ok'
      );
      return;
    }
    if(directSaveEnabled){
      return;
    }

    const json = JSON.stringify(state.chapterDoc, null, 2);
    const suggested = `${state.slug}-${state.chapter}.json`;

    if(window.showSaveFilePicker){
      try{
        const handle = await window.showSaveFilePicker({
          suggestedName: suggested,
          types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
        });
        const writable = await handle.createWritable();
        await writable.write(json);
        await writable.close();
        setBadge('Archivo guardado.', 'ok');
        dirtyChapters.delete(chapterCacheKey(state.slug, state.chapter));
        updateDraftStateLabel();
        return;
      }catch(e){
        if(e && e.name === 'AbortError') return;
      }
    }
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = suggested;
    a.click();
    URL.revokeObjectURL(url);
    setBadge('Descarga iniciada; sustituye el archivo en interlinear-snapshot/chapters/…', 'ok');
    dirtyChapters.delete(chapterCacheKey(state.slug, state.chapter));
    updateDraftStateLabel();
  }

  function setupVerseEditModal(){
    document.querySelectorAll('input[name="adminEditMode"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        syncEditModePanels();
      });
    });
    els.verseEditCloseBtn?.addEventListener('click', () => closeVerseModal());
    els.verseEditCancelBtn?.addEventListener('click', () => closeVerseModal());
    els.verseEditSaveBtn?.addEventListener('click', () => void saveVerseModalChanges());
    els.globalStrongSelect?.addEventListener('change', () => {
      const v = els.globalStrongSelect?.value?.trim() || '';
      editSession.globalSearchKind = 'strong';
      editSession.selectedGlobalStrong = v;
      editSession.globalHebrewTarget = '';
      editSession.globalRefsLoaded = false;
      if(els.globalTableWrap) els.globalTableWrap.innerHTML = '';
      if(els.globalStatus) els.globalStatus.textContent = '';
      els.globalWordPick?.querySelectorAll('.admin-global-word-chip').forEach((chip) => {
        if(chip.disabled) return;
        const on = Boolean(v) && chip.dataset.globalKind === 'strong' && chip.dataset.strong === v;
        chip.classList.toggle('is-selected', on);
      });
    });
    els.globalWordPick?.addEventListener('click', (event) => {
      const chip = event.target.closest('.admin-global-word-chip');
      if(!chip || !els.globalWordPick?.contains(chip) || chip.disabled) return;
      const kind = chip.dataset.globalKind;
      editSession.globalRefsLoaded = false;
      if(els.globalTableWrap) els.globalTableWrap.innerHTML = '';
      if(els.globalStatus) els.globalStatus.textContent = '';
      els.globalWordPick.querySelectorAll('.admin-global-word-chip.is-selected').forEach((el) => el.classList.remove('is-selected'));
      chip.classList.add('is-selected');
      if(kind === 'strong'){
        const st = chip.dataset.strong || '';
        editSession.globalSearchKind = 'strong';
        editSession.selectedGlobalStrong = st;
        editSession.globalHebrewTarget = '';
        if(els.globalStrongSelect) els.globalStrongSelect.value = st;
      }else if(kind === 'hebrew'){
        const ht = chip.dataset.hebrewTarget || '';
        editSession.globalSearchKind = 'hebrewEmptyStrong';
        editSession.selectedGlobalStrong = '';
        editSession.globalHebrewTarget = ht;
        if(els.globalStrongSelect) els.globalStrongSelect.value = '';
      }
    });
    els.globalLoadBtn?.addEventListener('click', () => void loadGlobalOccurrencesTable());
    els.verseEditBackdrop?.addEventListener('click', () => closeVerseModal());
    document.addEventListener('keydown', (event) => {
      if(event.key !== 'Escape') return;
      if(els.verseEditModal && !els.verseEditModal.hidden){
        closeVerseModal();
      }
    });
    els.mount?.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-action="edit-verse"]');
      if(!btn || !els.mount.contains(btn)) return;
      const verseNum = btn.dataset.verseNum;
      if(verseNum) openVerseEditor(verseNum);
    });
    els.saveBtn?.addEventListener('click', () => void saveChapterJsonToDisk());
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

    if(els.exportBtn) els.exportBtn.disabled = true;
    if(els.resetBtn) els.resetBtn.disabled = true;

    setupThemeMenu();
    setupBookMenu();
    bindChapterListDelegation();
    setupVerseEditModal();
    bindEvents();
    await probeDirectSave();
    try{
      await renderEditor();
    }catch(error){
      handleError(error);
    }
  }

  void init();
})();
