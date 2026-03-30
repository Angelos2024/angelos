/* Auto-generated split from busquedax.js (main/UI) */

  async function buildLxxMatches(normalizedGreek, maxRefs = 40) {
    if (!normalizedGreek) return { refs: [], texts: new Map(), highlightTerms: [] };
   if (state.lxxSearchCache.has(normalizedGreek)) return state.lxxSearchCache.get(normalizedGreek);
    const payload = await getLxxMatchesFromIndex(normalizedGreek, { maxRefs });
   state.lxxSearchCache.set(normalizedGreek, payload);
    return payload;
  }

   function pickBestCandidate(counts, samples) {
    if (!counts.size) return null;
    const [best, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    return {
      normalized: best,
      lemma: samples.get(best) || best,
      count
    };
  }

  function cleanGreekToken(token) {
    return String(token || '').replace(/[··.,;:!?“”"(){}\[\]<>«»]/g, '');
  }

  async function buildGreekCandidateFromHebrewRefs(refs) {
    if (!refs.length) return null;
    const counts = new Map();
    const samples = new Map();
   const usedBooks = new Set();
    for (const ref of refs.slice(0, 40)) {
      const [slug, chapterRaw, verseRaw] = ref.split('|');
      const chapter = Number(chapterRaw);
      const verse = Number(verseRaw);
      const lxxCodes = HEBREW_SLUG_TO_LXX[slug] || [];
      for (const lxxCode of lxxCodes) {
        const tokens = await loadLxxVerseTokens(lxxCode, chapter, verse);
        if (!tokens) continue;
       usedBooks.add(lxxCode);
        const verseLemmas = new Set();
        tokens.forEach((token) => {
          const lemma = token?.lemma || token?.w || '';
          const normalized = normalizeGreek(lemma);
          if (!normalized) return;
          if (greekStopwords.has(normalized)) return;
         verseLemmas.add(normalized);
          if (!samples.has(normalized) && token?.lemma) samples.set(normalized, token.lemma);
        });
        verseLemmas.forEach((lemma) => {
          counts.set(lemma, (counts.get(lemma) || 0) + 1);
        });
      }
    }
   return rankGreekCandidatesByLxxStats(counts, samples, usedBooks);
  }

  async function buildGreekCandidateFromGreekRefs(refs, options = {}) {
   if (!refs.length) return null;
    const counts = new Map();
    const samples = new Map();
   const usedBooks = new Set();
    for (const ref of refs.slice(0, 40)) {
      const [book, chapterRaw, verseRaw] = ref.split('|');
      const chapter = Number(chapterRaw);
      const verse = Number(verseRaw);
      try {
        const verses = await loadChapterText('gr', book, chapter, options);
       const verseText = getVerseTextFromChapter(verses, verse);
        const tokens = verseText.split(/\s+/).filter(Boolean);
        tokens.forEach((token) => {
          const cleaned = cleanGreekToken(token);
          const normalized = normalizeGreek(cleaned);
          if (!normalized || greekStopwords.has(normalized)) return;
          counts.set(normalized, (counts.get(normalized) || 0) + 1);
          if (!samples.has(normalized)) samples.set(normalized, cleaned);
        });
      } catch (error) {
               if (isAbortError(error)) throw error;
        continue;
      }
    }
    return pickBestCandidate(counts, samples);
  }

  async function buildGreekCandidateFromLxxRefs(refs) {
    if (!refs.length) return null;
    const counts = new Map();
    const samples = new Map();
    const usedBooks = new Set();
    for (const ref of refs.slice(0, 40)) {
      const [book, chapterRaw, verseRaw] = ref.split('|');
      const chapter = Number(chapterRaw);
      const verse = Number(verseRaw);
      const tokens = await loadLxxVerseTokens(book, chapter, verse);
      if (!tokens) continue;
      usedBooks.add(book);
      const verseLemmas = new Set();
      tokens.forEach((token) => {
        const lemma = token?.lemma || token?.w || '';
        const normalized = normalizeGreek(lemma);
        if (!normalized || greekStopwords.has(normalized)) return;
        verseLemmas.add(normalized);
        if (!samples.has(normalized) && token?.lemma) samples.set(normalized, token.lemma);
      });
     verseLemmas.forEach((lemma) => {
        counts.set(lemma, (counts.get(lemma) || 0) + 1);
      });
    }
    return rankGreekCandidatesByLxxStats(counts, samples, usedBooks);
  }

  function extractPos(entry) {
     if (!entry) return '—';
     const raw = entry.entrada_impresa || '';
     if (!raw) return '—';
     const parts = raw.split('.');
     if (parts.length < 2) return raw.trim();
     return parts[1].trim() || '—';
   }
 
   function shortDefinition(text) {
     if (!text) return '';
     const trimmed = text.replace(/\s/g, ' ').trim();
     const split = trimmed.split('. ');
     return split[0] || trimmed;
   }
 
   function keywordList(text) {
     if (!text) return [];
     const cleaned = text
       .replace(/[()]/g, ' ')
       .replace(/[^a-zA-ZáéíóúñüÁÉÍÓÚÑÜ\s]/g, ' ')
       .toLowerCase();
     const words = cleaned.split(/\s/).filter(Boolean);
     const keywords = [];
     for (const word of words) {
       if (stopwords.has(word)) continue;
       if (!keywords.includes(word)) keywords.push(word);
       if (keywords.length >= 6) break;
     }
    return keywords;
  }

  function extractSpanishTokensFromDefinition(definition) {
    if (!definition) return [];
    const cleaned = definition
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zñ\s]/g, ' ');
    const words = cleaned.split(/\s+/).filter((word) => word.length >= 3);
    const extraStopwords = new Set([
      'lit', 'nt', 'lxx', 'pl', 'sg', 'adj', 'adv', 'pron', 'conj', 'prep',
      'part', 'indecl', 'num', 'prop', 'pers', 'rel', 'dem', 'interj', 'fig',
      'met', 'art'
    ]);
    const tokens = [];
    words.forEach((word) => {
      if (stopwords.has(word) || extraStopwords.has(word)) return;
      if (!tokens.includes(word)) tokens.push(word);
    });
    return tokens;
  }
 
  function splitRefsByTestament(refs) {
    const ot = [];
    const nt = [];
    refs.forEach((ref) => {
      const [book] = ref.split('|');
      if (NT_BOOKS.has(book)) {
        nt.push(ref);
      } else {
        ot.push(ref);
      }
    });
    return { ot, nt };
  }

function mapOtRefsToLxxRefs(refs) {
    return refs
      .flatMap((ref) => {
        const [book, chapter, verse] = ref.split('|');
        const lxxCodes = HEBREW_SLUG_TO_LXX[book] || [];
        return lxxCodes.map((code) => `${code}|${chapter}|${verse}`);
      })
      .filter(Boolean);
  }
function mapLxxRefsToHebrewRefs(refs) {
    return refs
      .map((ref) => {
        const [book, chapter, verse] = ref.split('|');
        const slug = LXX_TO_HEBREW_SLUG[book];
        if (!slug) return null;
        return `${slug}|${chapter}|${verse}`;
      })
      .filter(Boolean);
  }

  async function buildHebrewCandidateFromRefs(refs, options = {}) {
    const counts = new Map();
    const samples = new Map();
    const limitedRefs = refs.slice(0, 40);
    for (const ref of limitedRefs) {
      const [book, chapterRaw, verseRaw] = ref.split('|');
      const chapter = Number(chapterRaw);
      const verse = Number(verseRaw);
      try {
        const verses = await loadChapterText('he', book, chapter, options);
        const verseText = getVerseTextFromChapter(verses, verse);
        const tokens = verseText.split(/\s/).filter(Boolean);
        tokens.forEach((token) => {
          const cleaned = token.replace(/[׃,:;.!?()"“”]/g, '');
          const normalized = normalizeHebrew(cleaned);
          if (!normalized || hebrewStopwords.has(normalized)) return;
          counts.set(normalized, (counts.get(normalized) || 0) + 1);
          if (!samples.has(normalized)) samples.set(normalized, cleaned);
        });
      } catch (error) {
        if (isAbortError(error)) throw error;
        continue;
      }
    }
    const candidate = pickBestCandidate(counts, samples);
    if (!candidate) return null;
    const word = candidate.lemma || candidate.normalized;
    return {
      normalized: candidate.normalized,
      word,
      transliteration: transliterateHebrew(word),
      count: candidate.count
    };
  }

   async function buildHebrewCandidateFromLxxRefs(refs, options = {}) {
    const mappedRefs = refs
      .map((ref) => {
        const [book, chapter, verse] = ref.split('|');
        const slug = LXX_TO_HEBREW_SLUG[book];
        if (!slug) return null;
        return `${slug}|${chapter}|${verse}`;
      })
      .filter(Boolean);
    return buildHebrewCandidateFromRefs(mappedRefs, options);
  }

  function groupForBook(book) {
     const slug = LXX_TO_HEBREW_SLUG[book] || book;
     if (TORAH.includes(slug)) return { key: 'torah', label: 'Torah' };
    if (HISTORICAL.includes(slug)) return { key: 'historicos', label: 'Históricos' };
     if (WISDOM.includes(slug)) return { key: 'sabiduria', label: 'Sabiduría' };
     if (PROPHETS.includes(slug)) return { key: 'profetas', label: 'Profetas' };
     if (GOSPELS.includes(slug)) return { key: 'evangelios', label: 'Evangelios' };
     if (LETTERS.includes(slug)) return { key: 'cartas', label: 'Cartas' };
     if (APOCALYPSE.includes(slug)) return { key: 'apocalipsis', label: 'Apocalipsis' };
     return { key: 'otros', label: 'Otros' };
   }

  function prettyBookLabel(book) {
     return (book || '').replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
   }

   function buildBookCountRows(refs) {
     const counts = new Map();
     refs.forEach((ref) => {
       const [book] = String(ref || '').split('|');
       if (!book) return;
       const slug = LXX_TO_HEBREW_SLUG[book] || book;
       counts.set(slug, (counts.get(slug) || 0) + 1);
     });
     return [...counts.entries()]
       .map(([book, count]) => ({ book, label: prettyBookLabel(book), count }))
       .sort((a, b) => b.count - a.count);
   }
   function formatRef(book, chapter, verse) {
     const bookLabel = prettyBookLabel(book);
    return `${bookLabel} ${chapter}:${verse}`;
   }
 
    function classForLang(lang) {
    if (lang === 'gr' || lang === 'lxx') return 'greek';
     if (lang === 'he') return 'hebrew';
     return 'mono';
   }
 
   function renderTags(tags) {
     if (!lemmaTags) return;
     lemmaTags.innerHTML = '';
     tags.forEach((tag) => {
       const span = document.createElement('span');
       span.className = 'tag';
       span.innerHTML = tag;
       lemmaTags.appendChild(span);
     });
   }
 
   function renderExamples(cards) {
     if (!lemmaExamples) return;
     lemmaExamples.innerHTML = '';
     cards.forEach((card) => {
       const div = document.createElement('div');
       div.className = 'example-card';
       div.innerHTML = card;
       lemmaExamples.appendChild(div);
     });
   }
 
  function renderCorrespondence(cards) {
       if (!lemmaCorrespondence) return;
    lemmaCorrespondence.innerHTML = '';
    if (!cards.length) {
      lemmaCorrespondence.innerHTML = '<div class="small muted">Sin correspondencias disponibles.</div>';
      return;
    }
    cards.forEach((card) => {
      const div = document.createElement('div');
      div.className = 'example-card';
      div.innerHTML = card;
      lemmaCorrespondence.appendChild(div);
     });
   }
 
  async function buildSamplesForRefs(refs, lang, max = 3, preloadedTexts = null, options = {}) {
    const samples = [];
    for (const ref of refs.slice(0, max)) {
      const [book, chapterRaw, verseRaw] = ref.split('|');
      const chapter = Number(chapterRaw);
      const verse = Number(verseRaw);
      let verseText = '';
     const canonicalRef = `${book}|${chapter}|${verse}`;
      if (preloadedTexts?.has?.(ref) || preloadedTexts?.has?.(canonicalRef)) {
        verseText = preloadedTexts.get(ref) || preloadedTexts.get(canonicalRef) || '';
      } else {
        try {
        if (lang === 'lxx') {
            const tokens = await loadLxxVerseTokens(book, chapter, verse);
            verseText = Array.isArray(tokens)
              ? tokens.map((token) => token?.w).filter(Boolean).join(' ')
              : '';
          } else {
            const verses = await loadChapterText(lang, book, chapter, options);
            verseText = getVerseTextFromChapter(verses, verse) || '';
          }
        } catch (error) {
          if (isAbortError(error)) throw error;
          verseText = 'Texto no disponible.';
        }
      }
      samples.push({
        ref: formatRef(book, chapter, verse),
        text: verseText
      });
    }
    return samples;
  }

  function buildCorrespondenceCard({ title, word, transliteration, samples, lang, highlightQuery }) {
    const wordLine = word
      ? `<div class="${classForLang(lang)} fw-semibold">${highlightText(word, highlightQuery, lang)}</div>`
      : '<div class="muted">—</div>';
    const translitLine = transliteration ? `<div class="small muted">Translit.: ${transliteration}</div>` : '';
    const sampleLines = samples.length
      ? samples.map((sample) => `<div class="small">${escapeHtml(sample.ref)} · ${highlightText(sample.text, highlightQuery, lang)}</div>`).join('')
      : '<div class="small muted">Sin ejemplos.</div>';
    return `
      <div class="fw-semibold">${title}</div>
      ${wordLine}
      ${translitLine}
      <div class="mt-1 d-grid gap-1">${sampleLines}</div>
    `;
  }

 

  function sortRefsCanonically(refs = []) {
    return [...refs].sort((a, b) => {
      const [ba, ca, va] = String(a).split('|');
      const [bb, cb, vb] = String(b).split('|');
      const sa = LXX_TO_HEBREW_SLUG[ba] || ba;
      const sb = LXX_TO_HEBREW_SLUG[bb] || bb;
      const ia = CANON_INDEX.has(sa) ? CANON_INDEX.get(sa) : 9999;
      const ib = CANON_INDEX.has(sb) ? CANON_INDEX.get(sb) : 9999;
      if (ia !== ib) return ia - ib;
      const c1 = Number(ca) || 0, c2 = Number(cb) || 0;
      if (c1 !== c2) return c1 - c2;
      const v1 = Number(va) || 0, v2 = Number(vb) || 0;
      return v1 - v2;
    });
  }

  function getActiveLangForNewUI() {
    // Priorizamos un solo idioma: el scope seleccionado o el detectado
    const last = state.last;
    if (!last) return null;
    const scope = state.languageScope || 'auto';
    if (scope && scope !== 'auto' && scope !== 'all') return scope;
    return last.lang || null;
  }

  function pickCorpus(groupsByCorpus, lang) {
    return (groupsByCorpus || []).find((c) => c.lang === lang) || null;
  }

  function buildFilterAggFromGroups(groups = [], lang = 'es') {
    // groups: salida de buildBookGroups (por libro)
    const byBook = new Map();
    groups.forEach((g) => {
      const bookSlug = LXX_TO_HEBREW_SLUG[g.items?.[0]?.book] || LXX_TO_HEBREW_SLUG[g.refs?.[0]?.split?.('|')?.[0]] || (g.refs?.[0]?.split?.('|')?.[0]) || g.book || g.slug || null;
      const slug = LXX_TO_HEBREW_SLUG[bookSlug] || bookSlug;
      if (!slug) return;
      byBook.set(slug, {
        slug,
        label: prettyBookLabel(slug),
        count: g.count || (g.refs?.length || 0),
        refs: g.refs || [],
        group: g
      });
    });

    // orden canónico
    const orderedBooks = CANONICAL_BOOK_ORDER
      .filter((slug) => byBook.has(slug))
      .map((slug) => byBook.get(slug));

    // por si hay libros fuera de lista
    const extras = [...byBook.values()].filter((b) => !CANON_INDEX.has(b.slug))
      .sort((a, b) => a.label.localeCompare(b.label));
    const books = [...orderedBooks, ...extras];

    const ot = books.filter((b) => OT_SET.has(b.slug));
    const nt = books.filter((b) => NT_SET.has(b.slug));
    const otCount = ot.reduce((s, b) => s + (b.count || 0), 0);
    const ntCount = nt.reduce((s, b) => s + (b.count || 0), 0);
    const allCount = otCount + ntCount;

    return { lang, books, ot, nt, otCount, ntCount, allCount };
  }

 function resetFilterSectionsCollapsed() {
    state.pagination.collapsedSections = { ot: true, nt: true };
  }
 function toggleFilterSection(sectionId) {
    if (sectionId !== 'ot' && sectionId !== 'nt') return;
    const current = state.pagination.collapsedSections || { ot: true, nt: true };
    state.pagination.collapsedSections = {
      ...current,
      [sectionId]: !Boolean(current[sectionId])
    };
  }

  function renderFiltersPanel(agg) {
    if (!filtersPanel) return;
    const { books, ot, nt, otCount, ntCount, allCount } = agg;
        const collapsed = state.pagination.collapsedSections || { ot: true, nt: true };

 const mkBtn = (id, label, count, active, variant = '') => {
      const variantClass = variant ? ` bx-filter-item--${variant}` : '';
      const isSectionToggle = id === 'ot' || id === 'nt';
      const sectionCollapsed = isSectionToggle ? Boolean(collapsed[id]) : false;
      const toggleLabel = isSectionToggle ? `<span class="bx-collapse-indicator">${sectionCollapsed ? '▸' : '▾'}</span>` : '';
            return `
        <button class="bx-filter-item${variantClass} ${active ? 'is-active' : ''}" type="button"
 data-bx-filter="${id}" ${isSectionToggle ? `aria-expanded="${sectionCollapsed ? 'false' : 'true'}"` : ''}>
           <span>${escapeHtml(label)}</span>
           ${toggleLabel}
          <span class="bx-count">(${count})</span>
        </button>
      `;
    };

    const isAll = !state.pagination.selectedBook && !state.pagination.selectedTestament;
    const isOT = state.pagination.selectedTestament === 'ot';
    const isNT = state.pagination.selectedTestament === 'nt';

    const otItems = ot.map((b) => mkBtn(`book:${b.slug}`, b.label, b.count, state.pagination.selectedBook === b.slug)).join('');
    const ntItems = nt.map((b) => mkBtn(`book:${b.slug}`, b.label, b.count, state.pagination.selectedBook === b.slug)).join('');
    const otSectionHtml = collapsed.ot
      ? ''
      : `<div class="ps-1 d-grid gap-2" data-bx-section="ot">${otItems || '<div class="small muted ps-2">Sin resultados.</div>'}</div>`;
    const ntSectionHtml = collapsed.nt
      ? ''
      : `<div class="ps-1 d-grid gap-2" data-bx-section="nt">${ntItems || '<div class="small muted ps-2">Sin resultados.</div>'}</div>`;

    filtersPanel.innerHTML = `
      <div class="d-grid gap-2">
         ${mkBtn('all', 'Todos', allCount, isAll, 'all')}
        ${mkBtn('ot', 'Toráh', otCount, isOT, 'ot')}
  ${otSectionHtml}
        ${mkBtn('nt', 'Evangelios', ntCount, isNT, 'nt')}
        ${ntSectionHtml}
                      </div>
    `;
  }

  function flattenRefsForSelection(agg) {
    const selBook = state.pagination.selectedBook;
    const selTest = state.pagination.selectedTestament;

    if (selBook) {
      const b = agg.books.find((x) => x.slug === selBook);
      return sortRefsCanonically(b?.refs || []);
    }
    const pool = selTest === 'ot'
      ? agg.ot
      : selTest === 'nt'
        ? agg.nt
        : agg.books;

    const refs = [];
    pool.forEach((b) => refs.push(...(b.refs || [])));
    return sortRefsCanonically(refs);
  }

  async function resolveVerseTextsForRefs(refs, lang, options = {}) {
    // Agrupa por libro+capítulo para minimizar lecturas.
    const cache = state.verseCache?.[lang] || new Map();
    const result = [];
    const byChapter = new Map(); // key: book|chapter -> [verseNumbers]
    const parsed = refs.map((ref) => {
      const [book, cRaw, vRaw] = String(ref).split('|');
      const chapter = Number(cRaw);
      const verse = Number(vRaw);
      const key = `${book}|${chapter}`;
      return { ref, book, chapter, verse, key };
    });

    parsed.forEach((p) => {
      const canonicalRef = `${p.book}|${p.chapter}|${p.verse}`;
      if (cache.has(canonicalRef)) return;
      if (!byChapter.has(p.key)) byChapter.set(p.key, []);
      byChapter.get(p.key).push(p.verse);
    });

    for (const [key, versesNeeded] of byChapter.entries()) {
      const [book, chapterRaw] = key.split('|');
      const chapter = Number(chapterRaw);
      try {
        if (lang === 'lxx') {
          // LXX se resuelve por tokens verso a verso
          await Promise.all(versesNeeded.map(async (v) => {
            const canonicalRef = `${book}|${chapter}|${v}`;
            if (cache.has(canonicalRef)) return;
            const tokens = await loadLxxVerseTokens(book, chapter, v);
            const resolvedText = Array.isArray(tokens) ? tokens.map((t) => t?.w).filter(Boolean).join(' ') : '';
            cache.set(canonicalRef, resolvedText);
          }));
        } else {
          const verses = await loadChapterText(lang, book, chapter, options);
          versesNeeded.forEach((v) => {
            const canonicalRef = `${book}|${chapter}|${v}`;
            let text = '';
            if (Array.isArray(verses)) {
              text = verses[v - 1] || '';
            } else if (verses && typeof verses === 'object') {
              text = verses[v] || verses[String(v)] || verses[String(v - 1)] || '';
            }

            cache.set(canonicalRef, text);
          });
        }
      } catch (e) {
        // Deja vacío si falla.
        versesNeeded.forEach((v) => {
          const canonicalRef = `${book}|${chapter}|${v}`;
          if (!cache.has(canonicalRef)) cache.set(canonicalRef, '');
        });
      }
    }

    parsed.forEach((p) => {
      const canonicalRef = `${p.book}|${p.chapter}|${p.verse}`;
      result.push({
        ref: formatRef(p.book, p.chapter, p.verse),
        text: cache.get(canonicalRef) || '',
        rawRef: canonicalRef,
        book: p.book,
        chapter: p.chapter,
        verse: p.verse
      });
    });

    state.verseCache[lang] = cache;
    return result;
  }

  async function renderResultsPage(agg, highlightQueries = {}, options = {}) {
    if (!resultsList || !paginationEl) return;
    const allRefs = flattenRefsForSelection(agg);
    const total = allRefs.length;

    const pageSize = state.pagination.pageSize || 25;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    state.pagination.page = Math.min(Math.max(1, state.pagination.page || 1), totalPages);

    const start = (state.pagination.page - 1) * pageSize;
    const slice = allRefs.slice(start, start + pageSize);

    // UI loading
    if (resultsLoadingStage) resultsLoadingStage.hidden = false;
    resultsList.innerHTML = '';
    paginationEl.innerHTML = '';

    const items = await resolveVerseTextsForRefs(slice, agg.lang, options);

    if (resultsLoadingStage) resultsLoadingStage.hidden = true;

    const highlightQuery = highlightQueries?.[agg.lang] || state.last?.term || '';
    resultsList.innerHTML = items.map((it) => {
      const tBook = it.book;
      const tName = prettyBookLabel(tBook);
      const qs = new URLSearchParams();
      qs.set('book', tBook);
      qs.set('name', tName);
      qs.set('search', `${it.chapter}:${it.verse}`);
      qs.set('view', 'parallel');
      if (state?.version) qs.set('version', String(state.version));
      qs.set('orig', '1');
      const openHref = `./index.html?${qs.toString()}`;
      const safeText = it.text || '—';
      return `
        <div class="bx-result-item d-flex gap-2">
          <div class="flex-grow-1">
            <div class="bx-ref">${escapeHtml(it.ref)}</div>
            <div class="bx-text">${highlightText(escapeHtml(safeText), highlightQuery, agg.lang)}</div>
          </div>
          <div class="bx-actions">
            <a class="btn btn-primary btn-sm" href="${openHref}">Abrir</a>
          </div>
        </div>
      `;
    }).join('') || '<div class="muted small">Sin resultados.</div>';

    // Paginación
    const mkPageBtn = (label, page, disabled = false, active = false) => {
      return `
        <li class="page-item ${disabled ? 'disabled' : ''} ${active ? 'active' : ''}">
          <button class="page-link" type="button" data-bx-page="${page}">${label}</button>
        </li>
      `;
    };

    if (total > pageSize) {
      const prev = state.pagination.page - 1;
      const next = state.pagination.page + 1;
      let html = '';
      html += mkPageBtn('«', prev, prev < 1);
      // ventana simple
      const windowSize = 5;
      const half = Math.floor(windowSize / 2);
      let from = Math.max(1, state.pagination.page - half);
      let to = Math.min(totalPages, from + windowSize - 1);
      from = Math.max(1, to - windowSize + 1);

      if (from > 1) html += mkPageBtn('1', 1, false, state.pagination.page === 1);
      if (from > 2) html += `<li class="page-item disabled"><span class="page-link">…</span></li>`;
      for (let p = from; p <= to; p++) {
        html += mkPageBtn(String(p), p, false, p === state.pagination.page);
      }
      if (to < totalPages - 1) html += `<li class="page-item disabled"><span class="page-link">…</span></li>`;
      if (to < totalPages) html += mkPageBtn(String(totalPages), totalPages, false, state.pagination.page === totalPages);

      html += mkPageBtn('»', next, next > totalPages);
      paginationEl.innerHTML = html;
    } else {
      paginationEl.innerHTML = '';
    }
  }

  async function renderSearchUI(groupsByCorpus, highlightQueries = {}, relatedTerms = {}, options = {}) {
    // Si el usuario pide "Todos", caemos al modo legacy (multi-corpus)
    const scope = state.languageScope || 'auto';
    const activeLang = getActiveLangForNewUI();
    state.pagination.activeLang = activeLang;

    if (!activeLang || scope === 'all') {
      // legacy
      if (resultsByCorpus) resultsByCorpus.hidden = false;
      if (filtersPanel) filtersPanel.innerHTML = '<div class="small muted">Selecciona un idioma específico para usar filtros por libro.</div>';
      if (resultsList) resultsList.innerHTML = '';
      if (paginationEl) paginationEl.innerHTML = '';
      renderResults(groupsByCorpus, highlightQueries, relatedTerms);
      return;
    }

    // Nuevo UI: un solo idioma
    if (resultsByCorpus) resultsByCorpus.hidden = true;

    const corpus = pickCorpus(groupsByCorpus, activeLang);
    const groups = corpus?.groups || [];
    const filteredGroups = groups.filter((g) => {
      if (state.filter === 'todo') return true;
      return g.category === state.filter;
    });

    const agg = buildFilterAggFromGroups(filteredGroups, activeLang);

    // Si el filtro por categoría dejó vacío, reset
    if (!agg.allCount) {
      if (filtersPanel) filtersPanel.innerHTML = '<div class="small muted">Sin resultados para el filtro seleccionado.</div>';
      if (resultsList) resultsList.innerHTML = '<div class="muted small">Sin resultados.</div>';
      if (paginationEl) paginationEl.innerHTML = '';
      return;
    }

    renderFiltersPanel(agg);
    await renderResultsPage(agg, highlightQueries, options);
  }



function renderResults(groupsByCorpus, highlightQueries = state.last?.highlightQueries || {}, relatedTerms = state.last?.relatedTerms || {}) {
    resultsByCorpus.innerHTML = '';
    if (!groupsByCorpus.length) {
      resultsByCorpus.innerHTML = '<div class="col-12"><div class="muted small">Sin resultados en el corpus.</div></div>';
       return;
     }

   groupsByCorpus.forEach((corpus) => {
      const { lang, groups } = corpus;
      const wrapper = document.createElement('div');
      wrapper.className = 'col-12';
       const header = document.createElement('div');
      header.className = 'fw-semibold mb-2';
      header.textContent = langLabels[lang] || lang;
      wrapper.appendChild(header);

    if (corpus.loading) {
        const loading = document.createElement('div');
        loading.className = 'muted small';
        loading.textContent = 'Cargando resultados...';
        wrapper.appendChild(loading);
        resultsByCorpus.appendChild(wrapper);
        return;
      }
      const filteredGroups = groups.filter((group) => {
        if (state.filter === 'todo') return true;
        return group.category === state.filter;
       });
 

      if (!filteredGroups.length) {
        const empty = document.createElement('div');
        empty.className = 'muted small';
        empty.textContent = 'No hay resultados para el filtro seleccionado.';
        wrapper.appendChild(empty);
        resultsByCorpus.appendChild(wrapper);
        return;
      }

            const totalCount = filteredGroups.reduce((sum, group) => sum + group.count, 0);
      const info = document.createElement('div');
      info.className = 'd-flex align-items-center justify-content-between mb-2';
      const meta = document.createElement('div');
      meta.innerHTML = `
        <div class="fw-semibold">Resultados en ${filteredGroups.length} libro(s)</div>
        <div class="small muted">${totalCount} ocurrencia(s) en total.</div>
      `;
      const button = document.createElement('button');
      button.className = `btn btn-sm result-toggle-btn${corpus.expanded ? ' is-open' : ''}`;
    button.type = 'button';
      button.textContent = corpus.expanded ? 'Ocultar resultados' : 'Ver resultados';
      info.appendChild(meta);
      info.appendChild(button);
      wrapper.appendChild(info);

      const list = document.createElement('div');
      list.className = 'd-grid gap-2';
      if (corpus.expanded) {
        filteredGroups.forEach((group) => {
          const bookBlock = document.createElement('div');
 bookBlock.className = 'book-result-card';
          const bookTop = document.createElement('div');
          bookTop.className = 'd-flex flex-wrap justify-content-between align-items-center gap-2';
         
         const bookHeader = document.createElement('div');
          bookHeader.className = 'fw-semibold';
          bookHeader.textContent = group.label;
          const bookMeta = document.createElement('div');
          bookMeta.className = 'small muted';
         if (lang === 'es' && group.limit) {
            bookMeta.textContent = `${group.loadedCount} de ${group.count} ocurrencia(s).`;
          } else {
            bookMeta.textContent = `${group.count} ocurrencia(s).`;
          }
         const bookHeadText = document.createElement('div');
          bookHeadText.appendChild(bookHeader);
          bookHeadText.appendChild(bookMeta);
          const toggleBookBtn = document.createElement('button');
          toggleBookBtn.className = `btn btn-sm result-toggle-btn${group.expanded ? ' is-open' : ''}`;
         toggleBookBtn.type = 'button';
          toggleBookBtn.textContent = group.expanded ? 'Ocultar resultados' : 'Ver resultados';
          bookTop.appendChild(bookHeadText);
          bookTop.appendChild(toggleBookBtn);
          bookBlock.appendChild(bookTop);
         
          const bookList = document.createElement('div');
bookList.className = 'mt-2 d-grid gap-1';
         const highlightQuery = highlightQueries[lang] || '';
         const relatedLabels = relatedTerms[lang] || [];
          if (group.expanded) {
            group.items.forEach((item) => {
              const row = document.createElement('div');
              row.className = 'verse-row';
              const textWrap = document.createElement('div');
              textWrap.className = `${classForLang(lang)} mb-2`;
              const relatedBadge = (lang === 'es' && relatedLabels.length && relatedLabels.some((label) => normalizeSpanish(item.text).includes(normalizeSpanish(label))))
                ? `<span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle ms-1">Coincidencia relacionada: ${escapeHtml(relatedLabels.join(', '))}</span>`
                : '';
              textWrap.innerHTML = `<span class="verse-ref">${escapeHtml(item.ref)}</span>${relatedBadge} · ${highlightText(item.text, highlightQuery, lang)}`;
              const actions = document.createElement('div');
              actions.className = 'd-flex justify-content-end';
              const openBtn = document.createElement('button');
              openBtn.className = 'btn btn-primary btn-sm';
              openBtn.type = 'button';
              openBtn.textContent = 'Abrir';
              openBtn.addEventListener('click', () => {
               const targetBook = LXX_TO_HEBREW_SLUG[item.book] || item.book;
                const targetName = prettyBookLabel(targetBook);
                const p = new URLSearchParams();
                p.set('book', targetBook);
                p.set('name', targetName);
                p.set('search', `${item.chapter}:${item.verse}`);
                p.set('version', 'RVR1960');
                p.set('orig', '1');
                p.set('view', 'parallel');
                location.href = `./index.html?${p.toString()}`;
              });
              actions.appendChild(openBtn);
              row.appendChild(textWrap);
              row.appendChild(actions);
              bookList.appendChild(row);
            });
            bookBlock.appendChild(bookList);
          }
         if (group.expanded && lang === 'es' && group.hasMore) {
           const loadMoreWrapper = document.createElement('div');
            loadMoreWrapper.className = 'mt-2';
            const loadMoreButton = document.createElement('button');
            loadMoreButton.className = 'btn btn-soft btn-sm';
            loadMoreButton.type = 'button';
            loadMoreButton.disabled = group.loadingMore;
            loadMoreButton.textContent = group.loadingMore
              ? 'Cargando...'
              : 'Cargar más en RVR1960';
            loadMoreButton.addEventListener('click', async () => {
              if (group.loadingMore) return;
              group.loadingMore = true;
              renderResults(groupsByCorpus);
              await loadMoreRvr1960(group, {});
              group.loadingMore = false;
              renderResults(groupsByCorpus);
            });
            loadMoreWrapper.appendChild(loadMoreButton);
            bookBlock.appendChild(loadMoreWrapper);
          }
          toggleBookBtn.addEventListener('click', () => {
            group.expanded = !group.expanded;
            renderResults(groupsByCorpus);
          });
          list.appendChild(bookBlock);
        });
       }
      wrapper.appendChild(list);
    
       button.addEventListener('click', () => {
        corpus.expanded = !corpus.expanded;
        renderResults(groupsByCorpus);
      });
 

      resultsByCorpus.appendChild(wrapper);
     });
   }
 

  async function buildBookGroups(refs, lang, preloadedTexts = null, options = {}) {
     const grouped = new Map();
     refs.forEach((ref) => {
       const [book] = ref.split('|');
       if (!grouped.has(book)) grouped.set(book, []);
       grouped.get(book).push(ref);
     });
     
        const limit = lang === 'es' ? 20 : 12;
     const groups = [];
     for (const [book, bookRefs] of grouped.entries()) {
       const { key, label } = groupForBook(book);
       const group = {
         label: book.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()),
         items: [],
         count: bookRefs.length,
         expanded: false,
         category: key,
         categoryLabel: label,
         refs: bookRefs,
         limit,
         loadedCount: 0,
         hasMore: false,
         loadingMore: false
       };
       const refsToLoad = bookRefs.slice(0, limit);
       for (const ref of refsToLoad) {
         const [bookName, chapterRaw, verseRaw] = ref.split('|');
         const chapter = Number(chapterRaw);
         const verse = Number(verseRaw);
         try {

 const canonicalRef = `${bookName}|${chapter}|${verse}`;
          const verseText = preloadedTexts?.get?.(ref) || preloadedTexts?.get?.(canonicalRef);
          if (!verseText) throw new Error('no preloaded');
           group.items.push({
             book: bookName,
              chapter,
              verse,
             ref: formatRef(bookName, chapter, verse),
             text: verseText
           });
         } catch (error) {
          try {
            let resolvedText = '';
             if (lang === 'lxx') {
               const tokens = await loadLxxVerseTokens(bookName, chapter, verse);
               resolvedText = Array.isArray(tokens)
                 ? tokens.map((token) => token?.w).filter(Boolean).join(' ')
                 : '';
             } else {
               const verses = await loadChapterText(lang, bookName, chapter, options);
               resolvedText = getVerseTextFromChapter(verses, verse) || '';
             }
             group.items.push({
               book: bookName,
               chapter,
               verse,
               ref: formatRef(bookName, chapter, verse),
               text: resolvedText
             });
           } catch (innerError) {
             if (isAbortError(innerError)) throw innerError;
             group.items.push({
                  book: bookName,
               chapter,
               verse,
               ref: formatRef(bookName, chapter, verse),
               text: 'Texto no disponible.'
             });
           }
         }
       }
      group.loadedCount = group.items.length;
       group.hasMore = lang === 'es' && group.loadedCount < group.count;
       groups.push(group);
       }
    return groups.sort((a, b) => b.count - a.count);
   }
 async function loadMoreRvr1960(group, options = {}) {
    const refsToLoad = group.refs.slice(group.loadedCount);
    for (const ref of refsToLoad) {
      const [book, chapterRaw, verseRaw] = ref.split('|');
      const chapter = Number(chapterRaw);
      const verse = Number(verseRaw);
      try {
        const verses = await loadChapterText('es', book, chapter, options);
        const verseText = getVerseTextFromChapter(verses, verse);
        group.items.push({
          book,
          chapter,
          verse,
          ref: formatRef(book, chapter, verse),
          text: verseText
        });
      } catch (error) {
        if (isAbortError(error)) throw error;
        group.items.push({
          book,
          chapter,
          verse,
          ref: formatRef(book, chapter, verse),
          text: 'Texto no disponible.'
        });
      }
    }
    group.loadedCount = group.items.length;
    group.hasMore = false;
  }
  async function buildSummary(term, lang, entry, hebrewEntry, refs, highlightQueries = {}, options = {}) {
     const lemma = entry?.lemma || term;
     const transliteration = entry?.['Forma lexica'] || '—';
     const pos = extractPos(entry);
     const hebrewDefinition = getHebrewDefinition(hebrewEntry);
     const definition = lang === 'he' ? hebrewDefinition : (entry?.definicion || '');
     const defShort = definition ? shortDefinition(definition) : '';
     const keywords = keywordList(definition);
    const summaryParts = [];
    if (defShort) summaryParts.push(defShort);
    if (definition && definition !== defShort) summaryParts.push(definition);

    let sampleRef = null;
    let sampleText = '';
    let sampleEs = '';
    if (refs.length) {
      const [book, chapterRaw, verseRaw] = refs[0].split('|');
      const chapter = Number(chapterRaw);
      const verse = Number(verseRaw);
      sampleRef = formatRef(book, chapter, verse);
      try {
        const verses = await loadChapterText(lang, book, chapter, options);
        sampleText = getVerseTextFromChapter(verses, verse) || '';
        if (lang !== 'es') {
          const versesEs = await loadChapterText('es', book, chapter, options);
          sampleEs = versesEs?.[verse - 1] || '';
        }
      } catch (error) {
        if (isAbortError(error)) throw error;
        sampleText = '';
        sampleEs = '';
      }
    }
    if (!summaryParts.length) summaryParts.push('No se encontró definición directa, se usa la concordancia del corpus para contexto.');
    const summaryQuery = highlightQueries.es || (lang === 'es' ? term : '');
 if (lemmaSummary) {
      lemmaSummary.innerHTML = highlightText(summaryParts.join(' '), summaryQuery, 'es');
    }     const cards = [];
     const primaryQuery = highlightQueries[lang] || term;
    const spanishQuery = highlightQueries.es || '';
    if (sampleRef && sampleText) {
      cards.push(`
        <div class="fw-semibold">Ejemplo en ${langLabels[lang]}</div>
        <div class="small muted">${sampleRef}</div>
        <div class="${classForLang(lang)}">${highlightText(sampleText, primaryQuery, lang)}</div>
      `);
    }
    if (sampleEs) {
      cards.push(`
        <div class="fw-semibold">Traducción RVR1960</div>
        <div class="small muted">Ejemplo contextual</div>
        <div>${highlightText(sampleEs, spanishQuery, 'es')}</div>
      `);
    }
     
     if (keywords.length) {
       cards.push(`
         <div class="fw-semibold">Campos semánticos</div>
         <div class="small muted">${keywords.join(', ')}</div>
       `);
     }
     renderExamples(cards);

   }
 async function warmSearchAssets(term = '') {
    const detectedLang = detectLang(String(term || '').trim());
    const targetLangs = detectedLang && detectedLang !== 'es'
      ? [detectedLang, 'es']
      : ['es'];
    const preloadTasks = targetLangs.map((lang) => loadIndex(lang).catch(() => null));
    if (targetLangs.includes('gr')) preloadTasks.push(loadDictionary().catch(() => null));
    if (targetLangs.includes('he')) preloadTasks.push(loadHebrewDictionary().catch(() => null));
    await Promise.all(preloadTasks);
  }
  async function analyze() {
    const term = queryInput.value.trim();
if (!term) {
      setValidationMessage('');
      return;
    }

    const validation = getSearchValidation(term);
    if (!validation.ok) {
      setValidationMessage(validation.message);
      renderCorrespondence([]);
      renderExamples([]);
      if (lemmaSummary) lemmaSummary.textContent = validation.message || '';
      if (resultsByCorpus) resultsByCorpus.hidden = true;
      if (resultsList) resultsList.innerHTML = '';
      if (paginationEl) paginationEl.innerHTML = '';
      return;
    }
    setValidationMessage('');


 const maybeReference = /\d/.test(term)
      && /[:\-–]|\b\d+\s*:\s*\d+|\b[a-záéíóúñü]+\s+\d+/i.test(term);
    if (maybeReference) {
      const params = new URLSearchParams();
      params.set('search', term);
      params.set('version', 'RVR1960');
      params.set('orig', '1');

      const shortReferenceOnly = /^\d+(?::\d+(?:\s*[-–]\s*\d+)?)?$/.test(term);
      if (shortReferenceOnly) {
        try {
          const rawState = sessionStorage.getItem('lectorState');
          if (rawState) {
            const state = JSON.parse(rawState);
            const book = String(state?.currentBookSlug || '').trim();
            const name = String(state?.currentBookName || '').trim();
            if (book) params.set('book', book);
            if (name) params.set('name', name);
          }
        } catch {}
      }

      location.href = `./index.html?${params.toString()}`;
      return;
    }
    
    if (activeSearchController) {
      activeSearchController.abort();
    }
    const controller = new AbortController();
    activeSearchController = controller;
    const options = { signal: controller.signal };
    const runId = ++activeSearchRunId;

    scrollToLemmaSummary();
    setLoading(true);
    await nextFrame();
    try {
      throwIfAborted(options.signal);

       const detectedLang = detectLang(term);
      const selectedScope = getLanguageScope(term);
      const searchLang = (selectedScope === 'es' || selectedScope === 'gr' || selectedScope === 'he')
        ? selectedScope
        : detectedLang;

  updateDetectedLanguageLabel(searchLang);

      state.pagination.page = 1;
      state.pagination.selectedBook = null;
      state.pagination.selectedTestament = null;
      state.pagination.activeLang = searchLang;

  const normalized = validation.normalized && validation.lang === searchLang
        ? validation.normalized
        : normalizeByLang(term, searchLang);
              let tags = [
        `Idioma: <span class="fw-semibold">${langLabels[searchLang] || searchLang}</span>`,
        `Búsqueda: <span class="fw-semibold">${escapeHtml(term)}</span>`
      ];

       let indexPromise = loadIndex(searchLang, options);
      let dictionaryPromise = null;
      if (searchLang === 'gr') {
        dictionaryPromise = loadDictionary(options);
      } else if (searchLang === 'he') {
        dictionaryPromise = loadHebrewDictionary(options);
      }

      const [index] = await Promise.all([
        indexPromise,
        dictionaryPromise
      ]);
      throwIfAborted(options.signal);
      
      if (searchLang === 'gr') {
       
        const entry = state.dictMap.get(normalized) || null;
        tags = [
          `Lema: <span class="fw-semibold">${entry?.lemma || term}</span>`,
          `Transliteración: ${entry?.['Forma lexica'] || entry?.['Forma flexionada transliterada'] || '—'}`,
          `POS: ${extractPos(entry)}`
        ];
      } else if (searchLang === 'he') {
        
       const entry = state.hebrewDictMap.get(normalized) || null;
        tags = [
          `Palabra: <span class="fw-semibold">${entry?.hebrew || term}</span>`,
          `Transliteración: ${entry?.transliteracion || '—'}`,
          `POS: ${entry?.categoria || '—'}`
        ];
      }

 renderTags(tags);
      renderCorrespondence([]);
      renderExamples([]);
            resetFilterSectionsCollapsed();

      throwIfAborted(options.signal);
      const refs = await getRefsForQuery(term, searchLang, index, options);


      throwIfAborted(options.signal);

      const highlightQueries = { [searchLang]: term };
      const relatedTerms = { es: [], gr: [], he: [] };

 const groupsByCorpus = [{
        lang: searchLang,
        groups: [],
        expanded: false,
        loading: true
    }];

      await renderSearchUI(groupsByCorpus, highlightQueries, relatedTerms, options);
     
      
 const shouldCapRefs = searchLang !== 'es';
      const safeRefs = shouldCapRefs ? refs.slice(0, MAX_REFS_PER_CORPUS) : refs;
            const groups = await buildBookGroups(safeRefs, searchLang, null, options);
      groupsByCorpus[0].groups = groups;
      groupsByCorpus[0].loading = false;
      state.last = { term, lang: searchLang, refs, groupsByCorpus, highlightQueries, relatedTerms };

      if (!refs.length && lemmaSummary) {
        lemmaSummary.textContent = 'No se encontraron ocurrencias en el idioma seleccionado.';
      }

      await renderSearchUI(groupsByCorpus, highlightQueries, relatedTerms, options);
    } catch (error) {
      if (!isAbortError(error)) {
        console.error('Error en el análisis:', error);
      }
    } finally {
      if (runId === activeSearchRunId) {
        setLoading(false);
        if (activeSearchController === controller) {
          activeSearchController = null;
        }
      }
    }
  }

 
   function handleFilterClick(event) {
     // Panel derecho: filtros (All / OT / NT / Libro)
     const bxFilterBtn = event.target.closest('button[data-bx-filter]');
     if (bxFilterBtn) {
       const id = bxFilterBtn.dataset.bxFilter || 'all';
       if (id === 'all') {
         state.pagination.selectedTestament = null;
         state.pagination.selectedBook = null;
                  resetFilterSectionsCollapsed();
       } else if (id === 'ot' || id === 'nt') {
                      toggleFilterSection(id);
         state.pagination.selectedTestament = id;
         state.pagination.selectedBook = null;
       } else if (id.startsWith('book:')) {
          const slug = id.slice(5);
         state.pagination.selectedBook = slug;
         state.pagination.selectedTestament = OT_SET.has(slug) ? 'ot' : (NT_SET.has(slug) ? 'nt' : null);
         resetFilterSectionsCollapsed();
          state.pagination.selectedTestament = OT_SET.has(state.pagination.selectedBook) ? 'ot' : (NT_SET.has(state.pagination.selectedBook) ? 'nt' : null);
         const collapsed = state.pagination.collapsedSections || { ot: true, nt: true };
         if (state.pagination.selectedTestament === 'ot') collapsed.ot = false;
         if (state.pagination.selectedTestament === 'nt') collapsed.nt = false;
         state.pagination.collapsedSections = collapsed;
       }
       state.pagination.page = 1;
       if (state.last?.groupsByCorpus) {
         void renderSearchUI(state.last.groupsByCorpus || [], state.last.highlightQueries || {}, state.last.relatedTerms || {});
       }
       return;
     }

     // Paginación
     const pageBtn = event.target.closest('button[data-bx-page]');
     if (pageBtn) {
       const nextPage = Number(pageBtn.dataset.bxPage);
       if (!Number.isFinite(nextPage) || nextPage < 1) return;
       state.pagination.page = nextPage;
       if (state.last?.groupsByCorpus) {
         void renderSearchUI(state.last.groupsByCorpus || [], state.last.highlightQueries || {}, state.last.relatedTerms || {});
       }
       return;
     }

     // Botones superiores por corpus (Torah/Profetas/Evangelios/etc.)
     const button = event.target.closest('button[data-filter]');
     if (!button) return;
     state.filter = button.dataset.filter || 'todo';
     document.querySelectorAll('button[data-filter]').forEach((btn) => {
       if (btn.dataset.filter === state.filter) {
         btn.classList.add('btn-primary');
         btn.classList.remove('btn-soft');
       } else {
         btn.classList.remove('btn-primary');
         btn.classList.add('btn-soft');
       }
     });

     // Al cambiar de categoría, volvemos a "All" (pero mantenemos el panel a la derecha)
     state.pagination.page = 1;
     state.pagination.selectedTestament = null;
     state.pagination.selectedBook = null;

     if (state.last?.groupsByCorpus) {
       void renderSearchUI(state.last.groupsByCorpus || [], state.last.highlightQueries || {}, state.last.relatedTerms || {});
     }
   }

function updateDetectedLanguageLabel(lang) {
    if (!languageScopeSelect) return;
    const label = langLabels?.[lang] || lang || '—';
    languageScopeSelect.innerHTML = `<option value="auto">Idioma detectado: ${escapeHtml(label)}</option>`;
    languageScopeSelect.value = 'auto';
  }

  function handleLanguageScopeChange() {
    // El selector queda fijo en detección automática.
    state.languageScope = 'auto';
  }
 
 
   

analyzeBtn?.addEventListener('click', analyze);
// Precarga inmediata: dispara al focus sin esperar idle
queryInput?.addEventListener('focus', () => {
  void warmSearchAssets(queryInput?.value || '');
}, { once: true });

queryInput?.addEventListener('input', () => {
  const term = queryInput?.value.trim() || '';
  if (!term) {
    setValidationMessage('');
    return;
  }
  // Precarga inmediata sin esperar idle
  void warmSearchAssets(term);
  const validation = getSearchValidation(term);
  setValidationMessage(validation.ok ? '' : validation.message);
});

   queryInput?.addEventListener('keydown', (event) => {
     if (event.key === 'Enter') {
       event.preventDefault();
       analyze();
     }
   });
 
   document.body.addEventListener('click', handleFilterClick);
    languageScopeSelect?.addEventListener('change', handleLanguageScopeChange);
  function applyQueryFromUrl() {
     state.languageScope = 'auto';
    updateDetectedLanguageLabel('—');
    const params = new URLSearchParams(window.location.search);
    const q = String(params.get('q') || '').trim();
    if (!q || !queryInput) return;
    queryInput.value = q;
    analyze();
  }

void warmSearchAssets();
  applyQueryFromUrl();
