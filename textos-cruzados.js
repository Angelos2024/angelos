(function(){
  const DB_NAME = 'textos_cruzados_db';
  const STORE = 'links';
  const MAX_LINKS_PER_VERSE = 7;
  const RV_BASE = './librosRV1960/';

  const BOOK_ALIASES = {
    'genesis':'genesis','gen':'genesis','gn':'genesis','exodo':'exodo','exo':'exodo','ex':'exodo',
    'levitico':'levitico','lev':'levitico','lv':'levitico','numeros':'numeros','num':'numeros','nm':'numeros',
    'deuteronomio':'deuteronomio','deut':'deuteronomio','dt':'deuteronomio','josue':'josue','jos':'josue',
    'jueces':'jueces','jue':'jueces','rut':'rut','rt':'rut','1samuel':'1_samuel','1sam':'1_samuel','1sa':'1_samuel',
    '2samuel':'2_samuel','2sam':'2_samuel','2sa':'2_samuel','1reyes':'1_reyes','1rey':'1_reyes','2reyes':'2_reyes',
    '2rey':'2_reyes','1cronicas':'1_cronicas','1cro':'1_cronicas','2cronicas':'2_cronicas','2cro':'2_cronicas',
    'esdras':'esdras','esd':'esdras','nehemias':'nehemias','neh':'nehemias','ester':'ester','est':'ester',
    'job':'job','jb':'job','salmos':'salmos','sal':'salmos','ps':'salmos','proverbios':'proverbios','prov':'proverbios',
    'eclesiastes':'eclesiastes','ecl':'eclesiastes','cantares':'cantares','cant':'cantares','isaias':'isaias','isa':'isaias',
    'jeremias':'jeremias','jer':'jeremias','lamentaciones':'lamentaciones','lam':'lamentaciones','ezequiel':'ezequiel','ez':'ezequiel',
    'daniel':'daniel','dan':'daniel','oseas':'oseas','os':'oseas','joel':'joel','jl':'joel','amos':'amos','am':'amos',
    'abdias':'abdias','abd':'abdias','obadias':'abdias','jonas':'jonas','jon':'jonas','miqueas':'miqueas','miq':'miqueas',
    'nahum':'nahum','nah':'nahum','habacuc':'habacuc','hab':'habacuc','sofonias':'sofonias','sof':'sofonias','hageo':'hageo',
    'hag':'hageo','zacarias':'zacarias','zac':'zacarias','malaquias':'malaquias','mal':'malaquias','mateo':'mateo','mt':'mateo',
    'marcos':'marcos','mr':'marcos','mk':'marcos','lucas':'lucas','lc':'lucas','juan':'juan','jn':'juan','hechos':'hechos','hch':'hechos',
    'romanos':'romanos','rom':'romanos','1corintios':'1_corintios','1cor':'1_corintios','1co':'1_corintios','2corintios':'2_corintios',
    '2cor':'2_corintios','2co':'2_corintios','galatas':'galatas','gal':'galatas','efesios':'efesios','efe':'efesios','filipenses':'filipenses',
    'fil':'filipenses','colosenses':'colosenses','col':'colosenses','1tesalonicenses':'1_tesalonicenses','1tes':'1_tesalonicenses',
    '2tesalonicenses':'2_tesalonicenses','2tes':'2_tesalonicenses','1timoteo':'1_timoteo','1tim':'1_timoteo','2timoteo':'2_timoteo',
    '2tim':'2_timoteo','tito':'tito','tit':'tito','filemon':'filemon','flm':'filemon','hebreos':'hebreos','heb':'hebreos',
    'santiago':'santiago','stg':'santiago','1pedro':'1_pedro','1pe':'1_pedro','2pedro':'2_pedro','2pe':'2_pedro','1juan':'1_juan',
    '1jn':'1_juan','2juan':'2_juan','2jn':'2_juan','3juan':'3_juan','3jn':'3_juan','judas':'judas','jud':'judas',
    'apocalipsis':'apocalipsis','apoc':'apocalipsis','rev':'apocalipsis'
  };

  const BOOK_OPTIONS = [...new Set(Object.values(BOOK_ALIASES))].sort((a, b) => a.localeCompare(b, 'es'));

  const chapterCache = new Map();
  let dbPromise = null;

  function normalizeKey(s){
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\./g,'').replace(/\s+/g,'').trim();
  }
  function prettyBookName(slug){
    return String(slug || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
  function makeKey(book, ch, v){ return `${book}|${ch}|${v}`; }

  function ensureStyles(){
    if (document.getElementById('xrefs-style')) return;
    const style = document.createElement('style');
    style.id = 'xrefs-style';
    style.textContent = `
      .xrefs-inline-wrap{ display:inline-flex; align-items:center; gap:.25rem; margin-left:.45rem; vertical-align:middle; }
      .xrefs-add{ border:1px solid #cbd5e1; background:#f8fafc; color:#64748b; border-radius:8px; font-size:.78rem; line-height:1; padding:.1rem .34rem; cursor:pointer; }
      .xrefs-add:hover{ background:#eef2f7; }
      .xrefs-add.has-links{ background:#4b2743; border-color:#4b2743; color:#fff; }
      .xrefs-empty{ display:flex; align-items:center; gap:.45rem; }
      .xrefs-add-inline{ border:1px solid #cbd5e1; background:#fff; color:#1f2937; border-radius:7px; font-size:.72rem; padding:.08rem .45rem; line-height:1.2; }
      .xrefs-panel{ margin:.3rem 0 0 1.55rem; padding:.45rem .65rem; border-radius:10px; border:1px solid rgba(0,0,0,.11); background:#eef6ff; }
      .xrefs-panel ul{ margin:0; padding-left:1rem; }
      .xrefs-panel li{ margin:.2rem 0; }
      .xrefs-ref{ color:#0b57d0; cursor:pointer; text-decoration:underline; }
      .xrefs-remove{ margin-left:.35rem; border:0; background:#ffe4e6; border-radius:8px; font-size:.72rem; padding:.06rem .35rem; }
      .xrefs-tip{ position:fixed; z-index:99999; max-width:380px; background:#111827; color:#fff; border-radius:10px; padding:.5rem .65rem; font-size:.82rem; line-height:1.35; box-shadow:0 8px 24px rgba(0,0,0,.25); pointer-events:none; }
      .xrefs-modal{ position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:99998; display:flex; align-items:center; justify-content:center; padding:1rem; }
      .xrefs-modal-card{ width:min(520px,95vw); background:white; border-radius:12px; border:1px solid #d1d5db; padding:1rem; }
      .xrefs-modal-grid{ display:grid; grid-template-columns:1fr 1fr 1fr; gap:.5rem; margin:.75rem 0; }
      .xrefs-modal-actions{ display:flex; justify-content:flex-end; gap:.5rem; }
      .xrefs-msg{ font-size:.84rem; margin:.25rem 0 .6rem; color:#374151; }
    `;
    document.head.appendChild(style);
  }

  function openDB(){
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  async function getLinks(sourceKey){
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(sourceKey);
      req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
      req.onerror = () => reject(req.error);
    });
  }

  async function saveLinks(sourceKey, refs){
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(refs, sourceKey);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function loadBook(slug){
    if (chapterCache.has(slug)) return chapterCache.get(slug);
    const res = await fetch(`${RV_BASE}${encodeURIComponent(slug)}.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Libro no disponible');
    const data = await res.json();
  const chapters = data;
    if (!Array.isArray(chapters)) throw new Error('Formato inválido de libro');
    chapterCache.set(slug, chapters);
    return chapters;
  }

  async function validateRef(ref){
    const bookKey = normalizeKey(ref.book);
    const slug = BOOK_ALIASES[bookKey] || ref.book;
    const chapters = await loadBook(slug);
    const ch = Number(ref.chapter);
    const v = Number(ref.verse);
    if (!Number.isInteger(ch) || ch < 1 || ch > chapters.length) return null;
    const verses = Array.isArray(chapters[ch - 1]) ? chapters[ch - 1] : [];
    if (!Number.isInteger(v) || v < 1 || v > verses.length) return null;
    return { slug, chapter: ch, verse: v, text: String(verses[v - 1] || '') };
  }

  function parseSource(line){
    return {
      book: line.getAttribute('data-book'),
      chapter: Number(line.getAttribute('data-ch')),
      verse: Number(line.getAttribute('data-v'))
    };
  }

  function refLabel(ref){ return `${prettyBookName(ref.slug)} ${ref.chapter}:${ref.verse}`; }
function snippetText(text, maxLength = 180){
    const clean = String(text || '').trim().replace(/\s+/g, ' ');
    if (!clean) return '(sin texto)';
    if (clean.length <= maxLength) return clean;
    return `${clean.slice(0, maxLength).trim()}…`;
  }
  function setupTooltip(el, text){
    let tip = null;
    el.addEventListener('mouseenter', () => {
      tip = document.createElement('div');
      tip.className = 'xrefs-tip';
      tip.textContent = snippetText(text);
      document.body.appendChild(tip);
    });
    el.addEventListener('mousemove', (e) => {
      if (!tip) return;
      tip.style.left = `${e.clientX + 14}px`;
      tip.style.top = `${e.clientY + 14}px`;
    });
    el.addEventListener('mouseleave', () => {
      if (tip) tip.remove();
      tip = null;
    });
  }

  async function refreshAddButtonState(line, refs){
    const btnAdd = line.querySelector('.xrefs-add');
    if (!btnAdd) return;
    const list = Array.isArray(refs) ? refs : await getLinks(makeKey(line.getAttribute('data-book'), line.getAttribute('data-ch'), line.getAttribute('data-v')));
    btnAdd.classList.toggle('has-links', list.length > 0);
  }
  async function renderPanel(line, panel){
    const source = parseSource(line);
    const sourceKey = makeKey(source.book, source.chapter, source.verse);
    const refs = await getLinks(sourceKey);
        await refreshAddButtonState(line, refs);

    if (!refs.length) {
 panel.innerHTML = '';
      const empty = document.createElement('div');
      empty.className = 'xrefs-empty';

      const msg = document.createElement('span');
      msg.className = 'text-muted small';
      msg.textContent = 'No hay textos relacionados todavía.';

      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'xrefs-add-inline';
      addBtn.textContent = 'Agregar';
      addBtn.addEventListener('click', () => {
        createModalForVerse(line, async () => {
          panel.style.display = 'block';
          await renderPanel(line, panel);
        });
      });

      empty.appendChild(msg);
      empty.appendChild(addBtn);
      panel.appendChild(empty);
      return;
    }

    const ul = document.createElement('ul');
    refs.forEach((ref, idx) => {
      const li = document.createElement('li');

      const refEl = document.createElement('span');
      refEl.className = 'xrefs-ref';
      refEl.textContent = refLabel(ref);
      setupTooltip(refEl, ref.text || '(sin texto)');
      refEl.addEventListener('click', () => {
        const q = `${prettyBookName(ref.slug)} ${ref.chapter}:${ref.verse}`;
        window.location.href = `./index.html?book=${encodeURIComponent(ref.slug)}&name=${encodeURIComponent(prettyBookName(ref.slug))}&search=${encodeURIComponent(q)}`;
      });

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'xrefs-remove';
      removeBtn.textContent = 'Quitar';
      removeBtn.addEventListener('click', async () => {
        const next = refs.filter((_, i) => i !== idx);
        await saveLinks(sourceKey, next);
        await refreshAddButtonState(line, next);
        await renderPanel(line, panel);
      });

      li.appendChild(refEl);
      li.appendChild(removeBtn);
      ul.appendChild(li);
    });

    panel.innerHTML = '';
    panel.appendChild(ul);
  }

  function createModalForVerse(line, onSaved){
    const source = parseSource(line);
    const host = document.createElement('div');
    host.className = 'xrefs-modal';
    host.innerHTML = `
      <div class="xrefs-modal-card">
        <h6 class="mb-2">Relacionar texto para ${prettyBookName(source.book)} ${source.chapter}:${source.verse}</h6>
        <p class="xrefs-msg">Puedes agregar hasta ${MAX_LINKS_PER_VERSE} conexiones válidas.</p>
        <div class="xrefs-modal-grid">
          <select id="xBook" class="form-select form-select-sm"></select>
          <select id="xChapter" class="form-select form-select-sm"></select>
          <select id="xVerse" class="form-select form-select-sm"></select>
        </div>
        <div class="xrefs-modal-actions">
          <button type="button" class="btn btn-sm btn-light" data-act="cancel">Cancelar</button>
          <button type="button" class="btn btn-sm btn-primary" data-act="save">Agregar</button>
        </div>
      </div>
    `;

    const bookSel = host.querySelector('#xBook');
    const chSel = host.querySelector('#xChapter');
    const vSel = host.querySelector('#xVerse');

    BOOK_OPTIONS.forEach((slug) => {
      const op = document.createElement('option');
      op.value = slug;
      op.textContent = prettyBookName(slug);
      bookSel.appendChild(op);
    });
    bookSel.value = source.book;

    const fillChapters = async () => {
      const chapters = await loadBook(bookSel.value);
      chSel.innerHTML = '';
      for(let i = 1; i <= chapters.length; i++){
        const op = document.createElement('option');
        op.value = String(i);
        op.textContent = `Cap. ${i}`;
        chSel.appendChild(op);
      }
      chSel.value = String(Math.min(source.chapter, chapters.length));
      await fillVerses();
    };

    const fillVerses = async () => {
      const chapters = await loadBook(bookSel.value);
      const ch = Number(chSel.value);
      const verses = chapters[ch - 1] || [];
      vSel.innerHTML = '';
      for(let i = 1; i <= verses.length; i++){
        const op = document.createElement('option');
        op.value = String(i);
        op.textContent = `Verso ${i}`;
        vSel.appendChild(op);
      }
      vSel.value = String(Math.min(source.verse, verses.length || 1));
    };

    bookSel.addEventListener('change', () => fillChapters().catch(console.error));
    chSel.addEventListener('change', () => fillVerses().catch(console.error));

    host.addEventListener('click', async (ev) => {
      const action = ev.target?.getAttribute?.('data-act');
      if (ev.target === host || action === 'cancel') {
        host.remove();
        return;
      }
      if (action === 'save') {
        const sourceKey = makeKey(source.book, source.chapter, source.verse);
        const current = await getLinks(sourceKey);
        if (current.length >= MAX_LINKS_PER_VERSE) {
          alert(`Límite alcanzado (${MAX_LINKS_PER_VERSE}).`);
          return;
        }

        const valid = await validateRef({
          book: bookSel.value,
          chapter: chSel.value,
          verse: vSel.value
        });

        if (!valid) {
          alert('Solo se permiten referencias que existan.');
          return;
        }

        const exists = current.some((x) => x.slug === valid.slug && x.chapter === valid.chapter && x.verse === valid.verse);
        if (!exists) {
          current.push(valid);
          await saveLinks(sourceKey, current);
        }

        host.remove();
        await onSaved();
      }
    });

    document.body.appendChild(host);
    fillChapters().catch(console.error);
  }

  function ensurePanelAfterVerse(line){
    let panel = line.nextElementSibling;
    if (!(panel && panel.classList && panel.classList.contains('xrefs-panel'))) {
      panel = document.createElement('div');
      panel.className = 'xrefs-panel';
      panel.style.display = 'none';
      line.insertAdjacentElement('afterend', panel);
    }
    return panel;
  }

  function decorateVerse(line){
    if (line.querySelector('.xrefs-inline-wrap')) return;

    const textNode = line.querySelector('.verse-text') || line;
    const inlineWrap = document.createElement('span');
    inlineWrap.className = 'xrefs-inline-wrap';

    
    const btnAdd = document.createElement('button');
    btnAdd.type = 'button';
    btnAdd.className = 'xrefs-add';
    btnAdd.textContent = '+';
    btnAdd.setAttribute('aria-label', 'Textos cruzados');

    const panel = ensurePanelAfterVerse(line);

    btnAdd.addEventListener('click', async (event) => {
      event.preventDefault();
      const isHidden = panel.style.display === 'none';
      if (isHidden) {
        panel.style.display = 'block';
        await renderPanel(line, panel);
      } else {
        panel.style.display = 'none';
      }
    });

  

    
    inlineWrap.appendChild(btnAdd);
    textNode.insertAdjacentElement('afterend', inlineWrap);
    getLinks(makeKey(line.getAttribute('data-book'), line.getAttribute('data-ch'), line.getAttribute('data-v')))
      .then((refs) => {
              refreshAddButtonState(line, refs).catch(console.error);
      })
      .catch(console.error);
  }

  function decorateAllVerses(){
    document.querySelectorAll('#passageTextRV .verse-line[data-side="rv"]').forEach(decorateVerse);
  }

  function init(){
    ensureStyles();
  

    const container = document.getElementById('passageTextRV');
    if (!container) return;

let scheduled = false;
    const scheduleDecorate = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        decorateAllVerses();
      });
    };

    scheduleDecorate();

    const mo = new MutationObserver(() => scheduleDecorate());
    mo.observe(container, { childList: true });
  }
  

  window.addEventListener('DOMContentLoaded', init);
})();
