// comentarios/comentarios.js
(function(){
    const chapterCommentsCache = new Map();
  async function ensureCommentsUI(){
    if (document.getElementById('cm-template')) return;

   if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      console.warn('[comentarios] sin conexión: se omite carga de UI de comentarios.');
      return;
    }

    try {
      const res = await fetch('./comentarios/ui.html', { cache: 'no-store' });
      if(!res.ok) throw new Error('No se pudo cargar comentarios/ui.html');

     const html = await res.text();
     const wrap = document.createElement('div');
     wrap.innerHTML = html;

    document.body.appendChild(wrap);
    } catch (err) {
      console.warn('[comentarios] fallo cargando UI:', err);
    }
  }

  function esc(s){
    return String(s ?? '').replace(/[&<>"']/g, m => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[m]));
  }

  function textToSafeHtml(t){
    const normalized = String(t ?? '').replace(/\r\n/g, '\n');
    return esc(normalized).replace(/\n/g, '<br>');
  }

function getCommentSlugCandidates(bookSlug){
    const raw = String(bookSlug ?? '').trim();
    if(!raw) return [];

    const candidates = new Set([raw]);

    // En comentarios usamos carpetas como "1tesalonicenses" y "2tesalonicenses",
    // mientras que el resto del sistema usa "1_tesalonicenses".
    if (/^[1-3]_[a-z]/i.test(raw)) {
      candidates.add(raw.replace('_', ''));
    }

    return [...candidates];
  }

  async function fetchCommentsBySlug(slug, chapter){
    const url = `./comentarios/${encodeURIComponent(slug)}/${encodeURIComponent(String(chapter))}.json`;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;

    try {
      const res = await fetch(url, { cache: 'no-store' });
      if(!res.ok) return null;
      const data = await res.json();
      if(!data || typeof data !== 'object') return null;
      return data;
    } catch {
      return null;
    }
  }
  function normalizeChapterCommentsShape(data, chapter){
    if(!data || typeof data !== 'object') return null;

    const chapterKey = String(chapter);
    const wrapped = data[chapterKey];

    // Compatibilidad: algunos archivos vienen como { "<cap>": { "<verso>": "..." } }
    // mientras que el formato esperado es { "<verso>": "..." }.
    if(
      wrapped &&
      typeof wrapped === 'object' &&
      !Array.isArray(wrapped) &&
      Object.values(wrapped).some(v => typeof v === 'string')
    ){
      return wrapped;
    }

    return data;
  }

async function loadChapterComments(bookSlug, chapter){
   const cacheKey = `${bookSlug}:${chapter}`;
    if (chapterCommentsCache.has(cacheKey)) {
      return chapterCommentsCache.get(cacheKey);
    }
    const slugCandidates = getCommentSlugCandidates(bookSlug);

    for (const slug of slugCandidates) {
 const rawComments = await fetchCommentsBySlug(slug, chapter);
      const comments = normalizeChapterCommentsShape(rawComments, chapter);
            if (comments) {
        chapterCommentsCache.set(cacheKey, comments);
        return comments;
      }
    }
    chapterCommentsCache.set(cacheKey, null);
    return null;
  }
  async function attachCommentsToRV(containerEl, bookSlug, chapter){
    await ensureCommentsUI();

    const chapterComments = await loadChapterComments(bookSlug, chapter);
    if(!chapterComments) return;

    const tpl = document.getElementById('cm-template');
    if(!tpl) return;

    const verseNodes = containerEl.querySelectorAll(
      `.verse-line[data-side="rv"][data-book="${CSS.escape(bookSlug)}"][data-ch="${CSS.escape(String(chapter))}"]`
    );

    verseNodes.forEach(p => {
      const v = p.getAttribute('data-v');
      if(!v) return;

      const comment = chapterComments[String(v)];
      if(!comment) return; // solo versos con comentario

      // ✅ Anti-duplicado: si ya hay un details justo debajo, no reinserta
      const next = p.nextElementSibling;
      if (next && next.classList && next.classList.contains('cm-details')) return;

      const frag = tpl.content.cloneNode(true);
      const details = frag.querySelector('.cm-details');
      const body = frag.querySelector('.cm-body');
      body.innerHTML = textToSafeHtml(comment);

      // ✅ Insertar el details COMPLETO debajo del verso
      p.after(details);
    });
  }

  window.BibleComments = { attachCommentsToRV };
})();
