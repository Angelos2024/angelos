// annotations-ui.js (COMPLETO) — Ventana flotante de notas + highlights
(() => {
  // Ejecutar cuando el DOM esté listo (evita early return)
  function onReady(fn){
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  onReady(() => {
    const menu = document.getElementById('ctxMenu');
    if (!menu) {
      console.warn('[annotations-ui] Falta #ctxMenu en el HTML.');
      return;
    }

    // ==============================
    // Config
    // ==============================
    const COLORS = [
      { key: 'clear',  css: 'transparent', label: '✕', title: 'Quitar subrayado' },
      { key: 'yellow', css: '#fbbf24' },
      { key: 'pink',   css: '#fb7185' },
      { key: 'blue',   css: '#60a5fa' },
      { key: 'green',  css: '#4ade80' },
    ];

    let lastTarget = null;     // .verse-line
    let lastSelection = '';
    let lastRange = null;      // Range clonado

    // ==============================
    // Helpers DOM
    // ==============================
    function getVerseNodeFromEvent(e) {
      return e.target.closest?.('.verse-line') || null;
    }
    function getVerseTextNode(verseNode) {
      return verseNode?.querySelector?.('.verse-text') || null;
    }
    function getRefFromNode(node) {
      return {
        side: node.dataset.side,     // "rv" | "orig"
        book: node.dataset.book,
        ch: Number(node.dataset.ch),
        v: Number(node.dataset.v),
      };
    }

    function clampMenu(x, y) {
      const pad = 10;
      const rect = menu.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width - pad;
      const maxY = window.innerHeight - rect.height - pad;
      return { x: Math.max(pad, Math.min(x, maxX)), y: Math.max(pad, Math.min(y, maxY)) };
    }
    function hideMenu() {
      menu.style.display = 'none';
      menu.setAttribute('aria-hidden', 'true');
      lastTarget = null;
    }
    function showMenu(x, y) {
      menu.style.display = 'flex';
      menu.setAttribute('aria-hidden', 'false');
      const pos = clampMenu(x, y);
      menu.style.left = pos.x + 'px';
      menu.style.top  = pos.y + 'px';
    }
    function clearSelection() {
      const sel = window.getSelection();
      if (sel) sel.removeAllRanges();
      lastRange = null;
      lastSelection = '';
    }

    // ==============================
    // Offsets dentro del verso
    // ==============================
    function getOffsetInVerseText(verseTextEl, range) {
      const pre = document.createRange();
      pre.selectNodeContents(verseTextEl);
      pre.setEnd(range.startContainer, range.startOffset);
      return pre.toString().length;
    }

    function resolveTextRangeByOffset(verseTextEl, offset, length) {
      const walker = document.createTreeWalker(verseTextEl, NodeFilter.SHOW_TEXT, null);
      let node, pos = 0;
      let startNode = null, startOffset = 0;
      let endNode = null, endOffset = 0;

      const endPos = offset + length;

      while ((node = walker.nextNode())) {
        const nLen = node.nodeValue.length;
        const nextPos = pos + nLen;

        if (!startNode && offset >= pos && offset <= nextPos) {
          startNode = node;
          startOffset = offset - pos;
        }
        if (!endNode && endPos >= pos && endPos <= nextPos) {
          endNode = node;
          endOffset = endPos - pos;
          break;
        }
        pos = nextPos;
      }

      if (!startNode || !endNode) return null;

      const r = document.createRange();
      r.setStart(startNode, startOffset);
      r.setEnd(endNode, endOffset);
      return r;
    }

    // ==============================
    // Highlights
    // ==============================
    function wrapHighlight(verseTextEl, offset, length, colorKey, annId) {
      const colors = {
        yellow: '#fbbf24',
        pink:   '#fb7185',
        blue:   '#60a5fa',
        green:  '#4ade80',
      };

      const r = resolveTextRangeByOffset(verseTextEl, offset, length);
      if (!r) return false;

      const span = document.createElement('span');
      span.className = 'hl';
      span.style.backgroundColor = colors[colorKey] || colors.yellow;
      span.style.padding = '0 2px';
      span.style.borderRadius = '4px';
      span.dataset.hlColor = colorKey;
      span.dataset.annId = String(annId);

      try {
        r.surroundContents(span);
      } catch {
        const frag = r.extractContents();
        span.appendChild(frag);
        r.insertNode(span);
      }
      return true;
    }

    function unwrapHighlights(verseTextEl) {
      verseTextEl.querySelectorAll('span.hl').forEach(hl => {
        const parent = hl.parentNode;
        while (hl.firstChild) parent.insertBefore(hl.firstChild, hl);
        parent.removeChild(hl);
      });
    }

    async function applyHighlightsToPassage(book, ch, vStart, vEnd) {
      if (!window.AnnotationsDB?.getHighlightsForPassage) return;

      const sides = ['rv', 'orig'];
      for (const side of sides) {
        const rows = await window.AnnotationsDB.getHighlightsForPassage(side, book, ch, vStart, vEnd);

        const byV = new Map();
        for (const r of rows) {
          if (!byV.has(r.v)) byV.set(r.v, []);
          byV.get(r.v).push(r);
        }

        for (const [v, list] of byV.entries()) {
          const verseNode = document.querySelector(
            `.verse-line[data-side="${side}"][data-book="${book}"][data-ch="${ch}"][data-v="${v}"]`
          );
          if (!verseNode) continue;

          const verseTextEl = verseNode.querySelector('.verse-text');
          if (!verseTextEl) continue;

          unwrapHighlights(verseTextEl);

          list.sort((a, b) => (b.offset - a.offset));
          for (const h of list) {
            wrapHighlight(verseTextEl, h.offset, h.length, h.color, h.id);
          }
        }
      }
    }

    window.AnnotationsUI_applyHighlightsToPassage = applyHighlightsToPassage;

    // ==============================
    // Notes UI: CSS + ventana flotante inyectada
    // ==============================
// ==============================
// Notes UI: CSS + ventana flotante inyectada
// ==============================
function ensureNotesUI() {
  // CSS
  if (!document.getElementById('notes-ui-style')) {
    const st = document.createElement('style');
    st.id = 'notes-ui-style';
    st.textContent = `
      .note-overlay{ position:fixed; inset:0; background:rgba(0,0,0,.25); display:none; z-index:9998; }

      .note-window{
        position:fixed; left:40px; top:60px;
        width:min(520px, calc(100vw - 20px));
        background:rgba(17,26,46,.98);
        border:1px solid rgba(255,255,255,.10);
        border-radius:16px;
        box-shadow:0 20px 50px rgba(0,0,0,.45);
        display:none; z-index:9999; overflow:hidden;
        backdrop-filter: blur(10px);
        color:#f8fafc;
        font-family:system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      }

      .note-header{
        display:flex; align-items:center; justify-content:space-between; gap:10px;
        padding:10px 12px; background:rgba(255,255,255,.04);
        border-bottom:1px solid rgba(255,255,255,.10);
        cursor:move; user-select:none;
      }

      .note-title{display:flex; flex-direction:column; gap:2px; min-width:0}
      .note-title strong{
        font-size:13px; color:#ffffff; font-weight:700;
        white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
      }
      .note-title span{
        font-size:12px; color:#e5e7eb;
        white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
      }

      .note-actions{display:flex;gap:8px;align-items:center}
      .note-iconbtn{
        width:34px;height:34px;border-radius:12px;
        border:1px solid rgba(255,255,255,.10);
        background:rgba(255,255,255,.06);
        cursor:pointer;
        color:#f8fafc;
        display:flex;align-items:center;justify-content:center;
        user-select:none;
      }
      .note-iconbtn:hover{background:rgba(255,255,255,.09)}

      .note-body{padding:12px}
      .note-meta{
        font-size:12px;color:#f1f5f9;
        background:rgba(255,255,255,.03);
        border:1px solid rgba(255,255,255,.10);
        border-radius:12px;
        padding:10px; margin-bottom:10px;
        line-height:1.35; white-space:pre-wrap;
      }

      .note-textarea{
        width:100%; min-height:160px; resize:vertical;
        border-radius:14px;
        border:1px solid rgba(255,255,255,.10);
        background:rgba(15,23,42,.65);
        color:#ffffff;
        padding:12px;
        outline:none;
        font-size:14px; line-height:1.5;
      }
      .note-textarea::placeholder{ color:#cbd5f5; }
      .note-textarea:focus{
        border-color:rgba(96,165,250,.45);
        box-shadow:0 0 0 3px rgba(96,165,250,.12);
      }

      .note-footer{
        display:flex; gap:10px; justify-content:flex-end;
        padding:10px 12px 12px;
        border-top:1px solid rgba(255,255,255,.10);
        background:rgba(255,255,255,.03);
      }

      .note-btn{
        border:1px solid rgba(255,255,255,.10);
        background:rgba(255,255,255,.06);
        color:#f8fafc;
        padding:8px 10px;
        border-radius:10px;
        cursor:pointer;
        font-weight:650; font-size:13px;
        display:inline-flex; align-items:center; gap:8px;
        user-select:none;
      }
      .note-btn:hover{background:rgba(255,255,255,.09)}
      .note-btn.primary{border-color:rgba(96,165,250,.35); background:rgba(96,165,250,.12)}
      .note-btn.danger{border-color:rgba(239,68,68,.35); background:rgba(239,68,68,.10)}

      .note-mark{
        position:relative;
        text-decoration: underline;
        text-decoration-color: #ef4444;
        text-decoration-thickness: 2px;
        text-underline-offset: 3px;
        cursor:pointer;
        border-radius:6px;
        padding:0 1px;
      }
      .note-mark:hover{background:rgba(239,68,68,.08)}
      .note-mark .note-icon{
        display:none;
        position:absolute;
        top:-18px; right:-10px;
        width:22px;height:22px;border-radius:999px;
        border:1px solid rgba(255,255,255,.10);
        background:rgba(17,26,46,.95);
        box-shadow:0 8px 18px rgba(0,0,0,.35);
        align-items:center;justify-content:center;
        font-size:12px;
        color:#f8fafc;
      }
      .note-mark:hover .note-icon{display:flex}
    `;
    document.head.appendChild(st);
  }

  // HTML overlay + window
  let overlay = document.getElementById('noteOverlay');
  let win = document.getElementById('noteWin');

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'noteOverlay';
    overlay.className = 'note-overlay';
    document.body.appendChild(overlay);
  }

  if (!win) {
    win = document.createElement('div');
    win.id = 'noteWin';
    win.className = 'note-window';
    win.setAttribute('role', 'dialog');
    win.setAttribute('aria-modal', 'true');
    win.setAttribute('aria-hidden', 'true');
    win.innerHTML = `
      <div class="note-header" id="noteHeader">
        <div class="note-title">
          <strong id="noteTitle">Nota</strong>
          <span id="noteSub">—</span>
        </div>
        <div class="note-actions">
          <button class="note-iconbtn" id="noteDelete" title="Borrar nota">🗑</button>
          <button class="note-iconbtn" id="noteCloseX" title="Cerrar">✕</button>
        </div>
      </div>
      <div class="note-body">
        <div class="note-meta" id="noteMeta">—</div>
        <textarea class="note-textarea" id="noteText" placeholder="Escribe aquí tu nota…"></textarea>
      </div>
      <div class="note-footer">
        <button class="note-btn" id="noteCancel">Cancelar</button>
        <button class="note-btn primary" id="noteSave">Guardar</button>
      </div>
    `;
    document.body.appendChild(win);
  }

  return { overlay, win };
}

const NotesUI = (() => {
  const { overlay, win } = ensureNotesUI();

  const hdr = win.querySelector('#noteHeader');
  const titleEl = win.querySelector('#noteTitle');
  const subEl = win.querySelector('#noteSub');
  const metaEl = win.querySelector('#noteMeta');
  const textEl = win.querySelector('#noteText');

  const btnSave = win.querySelector('#noteSave');
  const btnCancel = win.querySelector('#noteCancel');
  const btnCloseX = win.querySelector('#noteCloseX');
  const btnDelete = win.querySelector('#noteDelete');

  let state = {
    mode: 'new',
    ref: null,
    anchor: null,
    note: null,
    anchorEl: null,
    verseTextEl: null,
  };

  function show() {
    overlay.style.display = 'block';
    win.style.display = 'block';
    win.setAttribute('aria-hidden', 'false');
    setTimeout(() => textEl.focus(), 0);
  }

  function close() {
    overlay.style.display = 'none';
    win.style.display = 'none';
    win.setAttribute('aria-hidden', 'true');
    textEl.value = '';
    state = { mode:'new', ref:null, anchor:null, note:null, anchorEl:null, verseTextEl:null };
  }

  function setMetaNew(ref, anchor) {
    titleEl.textContent = 'Nueva nota';
    subEl.textContent = `${ref.book} ${ref.ch}:${ref.v} (${ref.side})`;
    metaEl.textContent = `Selección: "${anchor.quote}"\nOffset: ${anchor.offset} | Len: ${anchor.length}`;
    btnDelete.style.display = 'none';
  }

  function setMetaEdit(note) {
    titleEl.textContent = 'Editar nota';
    subEl.textContent = `${note.book} ${note.ch}:${note.v} (${note.side})`;
    metaEl.textContent =
      `Selección: "${note.quote}"\nOffset: ${note.offset} | Len: ${note.length}\nCreada: ${new Date(note.created_at).toLocaleString()}`;
    btnDelete.style.display = '';
  }

  function openNew({ ref, anchor, verseTextEl }) {
    state.mode = 'new';
    state.ref = ref;
    state.anchor = anchor;
    state.verseTextEl = verseTextEl;

    textEl.value = '';
    setMetaNew(ref, anchor);
    show();
  }

  function openEdit({ note, anchorEl }) {
    state.mode = 'edit';
    state.note = note;
    state.anchorEl = anchorEl || null;

    textEl.value = note.text || '';
    setMetaEdit(note);
    show();
  }

  // Drag
  (function makeDraggable() {
    let dragging = false, startX=0, startY=0, origX=0, origY=0;

    hdr.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      dragging = true;
      const rect = win.getBoundingClientRect();
      startX = e.clientX; startY = e.clientY;
      origX = rect.left; origY = rect.top;
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      const w = win.getBoundingClientRect().width;
      const h = win.getBoundingClientRect().height;

      const x = Math.max(8, Math.min(origX + dx, window.innerWidth - w - 8));
      const y = Math.max(8, Math.min(origY + dy, window.innerHeight - h - 8));
      win.style.left = x + 'px';
      win.style.top  = y + 'px';
    });

    window.addEventListener('mouseup', () => dragging = false);
  })();

  overlay.addEventListener('mousedown', close);
  btnCloseX.addEventListener('click', close);
  btnCancel.addEventListener('click', close);

  btnSave.addEventListener('click', async () => {
    const txt = textEl.value.trim();
    if (!txt) { alert('Escribe una nota antes de guardar.'); textEl.focus(); return; }
    if (!window.AnnotationsDB) { alert('AnnotationsDB no está disponible.'); return; }

    if (state.mode === 'new') {
      const ref = state.ref;
      const a = state.anchor;

      const existing = await window.AnnotationsDB.getNoteByAnchor?.(
        ref.side, ref.book, ref.ch, ref.v, a.offset, a.length
      );
      if (existing) {
        const mark = document.querySelector(`.note-mark[data-note-id="${existing.id}"]`);
        openEdit({ note: existing, anchorEl: mark });
        return;
      }

      const note = {
        side: ref.side, book: ref.book, ch: ref.ch, v: ref.v,
        offset: a.offset, length: a.length, quote: a.quote,
        text: txt, created_at: Date.now(), updated_at: Date.now(),
      };

const id = await window.AnnotationsDB.addNote(note);

// marcar el texto
wrapNoteMark(state.verseTextEl, a.offset, a.length, id);

// ✅ avisar al panel "Notas" que cambió el dataset
if (window.dispatchNotasChanged) window.dispatchNotasChanged();

close();
clearSelection();
return;
    }

    // edit
    if (!state.note) return;
    state.note.text = txt;
    state.note.updated_at = Date.now();
 await window.AnnotationsDB.updateNote(state.note);

// ✅ refrescar lista si está abierta
if (window.dispatchNotasChanged) window.dispatchNotasChanged();

close();

  });

  btnDelete.addEventListener('click', async () => {
    if (state.mode !== 'edit' || !state.note) return;
    if (!confirm('¿Borrar esta nota?')) return;

    const id = state.note.id;
await window.AnnotationsDB.deleteNote(id);

const el = state.anchorEl || document.querySelector(`.note-mark[data-note-id="${id}"]`);
if (el) unwrapNoteMark(el);

// ✅ refrescar lista si está abierta
if (window.dispatchNotasChanged) window.dispatchNotasChanged();

close();

  });

  return { openNew, openEdit, close };
})();

    // ✅ puente para abrir una nota desde el panel "Notas"
window.openNoteById = async function(id){
  const note = await window.AnnotationsDB?.getNote?.(Number(id));
  if(!note) return;

  const mark = document.querySelector(`.note-mark[data-note-id="${note.id}"]`);
  NotesUI.openEdit({ note, anchorEl: mark || null });
};


// ✅ Delegación global: abrir nota aunque haya highlight encima o re-render
document.addEventListener('click', async (ev) => {
  const mark = ev.target?.closest?.('.note-mark');
  if (!mark) return;

  const id = Number(mark.dataset.noteId || 0);
  if (!id) return;

  const note = await window.AnnotationsDB?.getNote?.(id);
  if (!note) return;

  ev.preventDefault();
  ev.stopPropagation();
  NotesUI.openEdit({ note, anchorEl: mark });
}, true);

    // ==============================
    // Notes: wrap / unwrap / apply
    // ==============================
    function wrapNoteMark(verseTextEl, offset, length, noteId) {
      const r = resolveTextRangeByOffset(verseTextEl, offset, length);
      if (!r) return false;

      const anc = (r.commonAncestorContainer.nodeType === 1)
        ? r.commonAncestorContainer
        : r.commonAncestorContainer.parentElement;
      if (anc?.closest?.('.note-mark')) return false;

      const span = document.createElement('span');
      span.className = 'note-mark';
      span.dataset.noteId = String(noteId);

      const icon = document.createElement('span');
      icon.className = 'note-icon';
      icon.title = 'Leer / editar nota';
      icon.textContent = '✎';
      span.appendChild(icon);

      try {
        r.surroundContents(span);
      } catch {
        const frag = r.extractContents();
        span.appendChild(frag);
        r.insertNode(span);
      }


      return true;
    }

    function unwrapNoteMark(span) {
      const parent = span.parentNode;
      const icon = span.querySelector?.('.note-icon');
      if (icon) icon.remove();

      while (span.firstChild) parent.insertBefore(span.firstChild, span);
      parent.removeChild(span);
    }

    function unwrapNotes(verseTextEl) {
      verseTextEl.querySelectorAll('.note-mark').forEach(unwrapNoteMark);
    }

    async function getNotesForPassage(side, book, ch, vStart, vEnd) {
      const out = [];
      if (!window.AnnotationsDB?.getNotesForVerse) return out;
      for (let v = vStart; v <= vEnd; v++) {
        const rows = await window.AnnotationsDB.getNotesForVerse(side, book, ch, v);
        if (rows?.length) out.push(...rows);
      }
      return out;
    }

    async function applyNotesToPassage(book, ch, vStart, vEnd) {
      if (!window.AnnotationsDB) return;

      const sides = ['rv', 'orig'];
      for (const side of sides) {
        const rows = await getNotesForPassage(side, book, ch, vStart, vEnd);

        const byV = new Map();
        for (const n of rows) {
          if (!byV.has(n.v)) byV.set(n.v, []);
          byV.get(n.v).push(n);
        }

        for (const [v, list] of byV.entries()) {
          const verseNode = document.querySelector(
            `.verse-line[data-side="${side}"][data-book="${book}"][data-ch="${ch}"][data-v="${v}"]`
          );
          if (!verseNode) continue;

          const verseTextEl = verseNode.querySelector('.verse-text');
          if (!verseTextEl) continue;

          unwrapNotes(verseTextEl);

          list.sort((a, b) => (b.offset - a.offset));
          for (const n of list) {
            wrapNoteMark(verseTextEl, n.offset, n.length, n.id);
          }
        }
      }
    }

    window.AnnotationsUI_applyNotesToPassage = applyNotesToPassage;

    // ==============================
    // Menu UI
    // ==============================
    function buildMenuUI() {
      menu.innerHTML = '';

      // Dots de color
      for (const c of COLORS) {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'ctx-dot';

        if (c.key === 'clear') {
          dot.textContent = '✕';
          dot.title = 'Quitar subrayado';
          dot.style.background = '#ffffff';
          dot.style.border = '2px solid #111827';
          dot.style.color = '#111827';
          dot.style.display = 'flex';
          dot.style.alignItems = 'center';
          dot.style.justifyContent = 'center';
          dot.style.fontWeight = '900';
          dot.style.fontSize = '16px';
          dot.style.lineHeight = '1';
        } else {
          dot.style.background = c.css;
          dot.title = `Subrayar (${c.key})`;
        }

        dot.addEventListener('mousedown', (ev) => ev.preventDefault());
        dot.addEventListener('click', async () => {
          if (!lastTarget) return;
          if (!window.AnnotationsDB) return hideMenu();

          if (c.key === 'clear') {
            await clearHighlightAtSelection();
          } else {
            const ref = getRefFromNode(lastTarget);
            await highlightSelection(ref, c.key);
          }
          hideMenu();
        });

        menu.appendChild(dot);
      }

      const sep = document.createElement('div');
      sep.className = 'ctx-sep';
      menu.appendChild(sep);

      // Botón nota (lápiz)
      const noteBtn = document.createElement('button');
      noteBtn.type = 'button';
      noteBtn.className = 'ctx-btn';
      noteBtn.title = 'Añadir / editar nota';
      noteBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 20h4l10.5-10.5a2 2 0 0 0 0-2.8L16.3 4.5a2 2 0 0 0-2.8 0L3 15v5Z" stroke="currentColor" stroke-width="2" />
          <path d="M13.5 6.5l4 4" stroke="currentColor" stroke-width="2" />
        </svg>
      `;
      noteBtn.addEventListener('mousedown', (ev) => ev.preventDefault());
      noteBtn.addEventListener('click', async () => {
        if (!lastTarget) return;
        if (!window.AnnotationsDB) return hideMenu();

        const ref = getRefFromNode(lastTarget);
        await openNoteFromSelection(ref);
        hideMenu();
      });

      menu.appendChild(noteBtn);
    }

    async function highlightSelection(ref, colorKey) {
      if (!lastTarget || !lastRange || !lastSelection) return;

      const verseTextEl = lastTarget.querySelector('.verse-text');
      if (!verseTextEl) return;
      if (!verseTextEl.contains(lastRange.commonAncestorContainer)) return;

      const offset = getOffsetInVerseText(verseTextEl, lastRange);
      const length = lastRange.toString().length;

      const payload = {
        side: ref.side,
        book: ref.book,
        ch: ref.ch,
        v: ref.v,
        offset,
        length,
        quote: lastSelection,
        color: colorKey,
        created_at: Date.now(),
      };

      const id = await window.AnnotationsDB.addHighlight(payload);
      wrapHighlight(verseTextEl, offset, length, colorKey, id);
      clearSelection();
    }

    async function clearHighlightAtSelection() {
      let node = null;

      if (lastRange) node = lastRange.commonAncestorContainer;
      else {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) node = sel.getRangeAt(0).commonAncestorContainer;
      }
      if (!node) return;

      const el = (node.nodeType === 1 ? node : node.parentElement);
      const hl = el?.closest?.('span.hl');
      if (!hl) return;

      const annId = Number(hl.dataset.annId || 0);
      if (annId && window.AnnotationsDB) await window.AnnotationsDB.deleteHighlight(annId);

      const parent = hl.parentNode;
      while (hl.firstChild) parent.insertBefore(hl.firstChild, hl);
      parent.removeChild(hl);

      clearSelection();
    }

    async function openNoteFromSelection(ref) {
      if (!lastTarget || !lastRange || !lastSelection) return;

      const verseTextEl = lastTarget.querySelector('.verse-text');
      if (!verseTextEl) return;
      if (!verseTextEl.contains(lastRange.commonAncestorContainer)) return;

      const offset = getOffsetInVerseText(verseTextEl, lastRange);
      const length = lastRange.toString().length;

      const existing = await window.AnnotationsDB.getNoteByAnchor?.(
        ref.side, ref.book, ref.ch, ref.v, offset, length
      );

      if (existing) {
        const mark = document.querySelector(`.note-mark[data-note-id="${existing.id}"]`);
        NotesUI.openEdit({ note: existing, anchorEl: mark });
        return;
      }

      NotesUI.openNew({
        ref,
        anchor: { offset, length, quote: lastSelection },
        verseTextEl,
      });
    }

    // ==============================
    // Init
    // ==============================
    buildMenuUI();

    document.addEventListener('selectionchange', () => {
      const sel = window.getSelection();
      lastSelection = (sel && !sel.isCollapsed) ? String(sel).trim() : '';
    });

    document.addEventListener('contextmenu', (e) => {
      const node = getVerseNodeFromEvent(e);
      if (!node) return;

      const sel = window.getSelection();
      lastRange = null;
      lastSelection = '';

      const verseTextEl = getVerseTextNode(node);
      if (sel && sel.rangeCount > 0 && !sel.isCollapsed && verseTextEl) {
        const r = sel.getRangeAt(0);
        if (verseTextEl.contains(r.commonAncestorContainer)) {
          lastRange = r.cloneRange();
          lastSelection = String(sel).trim();
        }
      }

      e.preventDefault();
      lastTarget = node;
      showMenu(e.clientX, e.clientY);
    });

    document.addEventListener('mousedown', (e) => {
      if (menu.style.display !== 'none' && !menu.contains(e.target)) hideMenu();
    });
    document.addEventListener('scroll', hideMenu, true);
    window.addEventListener('resize', hideMenu);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hideMenu();
    });

    // Cerrar ventana flotante con Escape (si está abierta)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const w = document.getElementById('noteWin');
        const o = document.getElementById('noteOverlay');
        if (w && o && w.style.display !== 'none') {
          o.dispatchEvent(new MouseEvent('mousedown'));
        }
      }
    });
  });
})();
