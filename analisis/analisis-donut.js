(() => {
  const CATEGORY_ORDER = ['torah', 'historicos', 'sabiduria', 'profetas', 'evangelios', 'cartas', 'apocalipsis'];
  const CATEGORY_META = {
    torah: { label: 'Torah', color: '#1f77b4' },
    historicos: { label: 'Históricos', color: '#ff7f0e' },
    sabiduria: { label: 'Sabiduría', color: '#2ca02c' },
    profetas: { label: 'Profetas', color: '#9467bd' },
    evangelios: { label: 'Evangelios', color: '#d62728' },
    cartas: { label: 'Cartas', color: '#17becf' },
    apocalipsis: { label: 'Apocalipsis', color: '#bcbd22' }
  };

  const BOOK_GROUPS = {
    torah: new Set(['genesis', 'exodo', 'levitico', 'numeros', 'deuteronomio']),
    historicos: new Set([
      'josue', 'jueces', 'rut', '1_samuel', '2_samuel', '1_reyes', '2_reyes',
      '1_cronicas', '2_cronicas', 'esdras', 'nehemias', 'ester', 'hechos'
    ]),
    sabiduria: new Set(['job', 'salmos', 'proverbios', 'eclesiastes', 'cantares']),
    profetas: new Set([
      'isaias', 'jeremias', 'lamentaciones', 'ezequiel', 'daniel', 'oseas', 'joel', 'amos',
      'abdias', 'jonas', 'miqueas', 'nahum', 'habacuc', 'sofonias', 'hageo', 'zacarias', 'malaquias'
    ]),
    evangelios: new Set(['mateo', 'marcos', 'lucas', 'juan']),
    cartas: new Set([
      'romanos', '1_corintios', '2_corintios', 'galatas', 'efesios', 'filipenses', 'colosenses',
      '1_tesalonicenses', '2_tesalonicenses', '1_timoteo', '2_timoteo', 'tito', 'filemon', 'hebreos',
      'santiago', '1_pedro', '2_pedro', '1_juan', '2_juan', '3_juan', 'judas'
    ]),
    apocalipsis: new Set(['apocalipsis'])
  };

 const BOOK_ALIASES = {
      // Códigos/abreviaturas habituales
    gen: 'genesis',
    exod: 'exodo',
    lev: 'levitico',
    num: 'numeros',
    deut: 'deuteronomio',
    josha: 'josue',
    joshb: 'josue',
    judga: 'jueces',
    judgb: 'jueces',
    ruth: 'rut',
    '1sam': '1_samuel',
    '2sam': '2_samuel',
    '1kgs': '1_reyes',
    '2kgs': '2_reyes',
    '1chr': '1_cronicas',
    '2chr': '2_cronicas',
    '1esdr': 'esdras',
    '2esdr': 'nehemias',
    esth: 'ester',
    job: 'job',
    ps: 'salmos',
    prov: 'proverbios',
    eccl: 'eclesiastes',
    song: 'cantares',
    isa: 'isaias',
    jer: 'jeremias',
    lam: 'lamentaciones',
    ezek: 'ezequiel',
    danog: 'daniel',
    danth: 'daniel',
    hos: 'oseas',
    joel: 'joel',
    amos: 'amos',
    obad: 'abdias',
    jonah: 'jonas',
    mic: 'miqueas',
    nah: 'nahum',
    hab: 'habacuc',
    zeph: 'sofonias',
    hag: 'hageo',
    zech: 'zacarias',
    mal: 'malaquias',
    
    // RKANT (nombres completos en inglés)
    matthew: 'mateo',
    mark: 'marcos',
    luke: 'lucas',
    john: 'juan',
    acts: 'hechos',
    romans: 'romanos',
    '1_corinthians': '1_corintios',
    '2_corinthians': '2_corintios',
    galatians: 'galatas',
    ephesians: 'efesios',
    philippians: 'filipenses',
    colossians: 'colosenses',
    '1_thessalonians': '1_tesalonicenses',
    '2_thessalonians': '2_tesalonicenses',
    '1_timothy': '1_timoteo',
    '2_timothy': '2_timoteo',
    titus: 'tito',
    philemon: 'filemon',
    hebrews: 'hebreos',
    james: 'santiago',
    '1_peter': '1_pedro',
    '2_peter': '2_pedro',
    '1_john': '1_juan',
    '2_john': '2_juan',
    '3_john': '3_juan',
    jude: 'judas',
    revelation: 'apocalipsis',

    // Hebreo (IdiomaORIGEN/frecuencias)
    'בראשית': 'genesis',
    'שמות': 'exodo',
    'ויקרא': 'levitico',
    'במדבר': 'numeros',
    'דברים': 'deuteronomio',
    'יהושע': 'josue',
    'שופטים': 'jueces',
    'רות': 'rut',
    'שמואל_א': '1_samuel',
    'שמואל_ב': '2_samuel',
    'מלכים_א': '1_reyes',
    'מלכים_ב': '2_reyes',
    'דברי_הימים_א': '1_cronicas',
    'דברי_הימים_ב': '2_cronicas',
    'עזרא': 'esdras',
    'נחמיה': 'nehemias',
    'אסתר': 'ester',
    'איוב': 'job',
    'תהילים': 'salmos',
    'משלי': 'proverbios',
    'קהלת': 'eclesiastes',
    'שיר_השירים': 'cantares',
    'ישעיהו': 'isaias',
    'ירמיהו': 'jeremias',
    'איכה': 'lamentaciones',
    'יחזקאל': 'ezequiel',
    'דניאל': 'daniel',
    'הושע': 'oseas',
    'יואל': 'joel',
    'עמוס': 'amos',
    'עובדיה': 'abdias',
    'יונה': 'jonas',
    'מיכה': 'miqueas',
    'נחום': 'nahum',
    'חבקוק': 'habacuc',
    'צפניה': 'sofonias',
    'חגי': 'hageo',
    'זכריה': 'zacarias',
    'מלאכי': 'malaquias'  };

  function normalizeBookKey(book) {
    const raw = String(book || '').trim().toLowerCase();
    if (!raw) return '';
    const safe = raw.replace(/\s+/g, '_');
    return BOOK_ALIASES[safe] || BOOK_ALIASES[safe.replace(/[^a-z0-9_]/g, '')] || safe;
  }

  function categoryForBook(book) {
        const normalizedBook = normalizeBookKey(book);
    for (const key of CATEGORY_ORDER) {
      if (BOOK_GROUPS[key].has(normalizedBook)) return key;
          }
    return null;
  }

  function lighten(hex, amount = 0.35) {
    const clean = hex.replace('#', '');
    const num = Number.parseInt(clean, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    const blend = (c) => Math.round(c + (255 - c) * amount);
    return `rgb(${blend(r)}, ${blend(g)}, ${blend(b)})`;
  }

  function polar(cx, cy, radius, angle) {
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  }

  function arcPath(cx, cy, rOuter, rInner, start, end) {
    const [x1, y1] = polar(cx, cy, rOuter, start);
    const [x2, y2] = polar(cx, cy, rOuter, end);
    const [x3, y3] = polar(cx, cy, rInner, end);
    const [x4, y4] = polar(cx, cy, rInner, start);
    const largeArc = end - start > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4} ${y4} Z`;
  }

  function createDonut(container) {
    if (!container) return null;
    container.innerHTML = `
      <div class="occurrence-donut card-like">
        <div class="d-flex justify-content-between align-items-center gap-2 flex-wrap mb-2">
          <div class="fw-semibold">Distribución de ocurrencias</div>
          <div class="btn-group btn-group-sm" role="group" aria-label="Idioma">
            <button type="button" class="btn btn-soft active" data-language="es">Español</button>
            <button type="button" class="btn btn-soft" data-language="he">Hebreo</button>
<button type="button" class="btn btn-soft" data-language="gr_rkant">Griego RKANT</button>
            <button type="button" class="btn btn-soft" data-language="gr_lxx">Griego LXX</button>
                      </div>
        </div>
        <div class="occurrence-donut-layout">
          <div class="donut-stage">
            <svg viewBox="0 0 240 240" class="donut-svg" aria-label="Gráfica de ocurrencias"></svg>
            <div class="donut-center">
              <div class="donut-total" data-role="total">0</div>
              <div class="donut-subtitle" data-role="subtitle">Toda la Escritura</div>
              <button type="button" class="donut-subtitle" data-role="reset" hidden>Volver al total</button>
            </div>
          </div>
          <div class="donut-legend" data-role="legend"></div>
        </div>
      </div>
    `;

    const state = {
      lang: 'es',
      activeCategory: null,
      hoverCategory: null,
      dataByLang: { es: [], he: [], gr_rkant: [], gr_lxx: [] }
          };

    const svg = container.querySelector('.donut-svg');
    const legend = container.querySelector('[data-role="legend"]');
    const totalEl = container.querySelector('[data-role="total"]');
    const subtitleEl = container.querySelector('[data-role="subtitle"]');
    const resetBtn = container.querySelector('[data-role="reset"]');

    function summarize(langData) {
      const categories = new Map(CATEGORY_ORDER.map((key) => [key, { key, count: 0, books: [] }]));
      langData.forEach((entry) => {
        const key = categoryForBook(entry.book);
        if (!key || entry.count <= 0) return;
        const group = categories.get(key);
        group.count += entry.count;
        group.books.push(entry);
      });
      return CATEGORY_ORDER.map((key) => categories.get(key));
    }

    function currentRows() {
      const all = summarize(state.dataByLang[state.lang] || []);
      if (!state.activeCategory) return all.filter((row) => row.count > 0).map((row) => ({ ...row, label: CATEGORY_META[row.key].label, color: CATEGORY_META[row.key].color }));
      const selected = all.find((row) => row.key === state.activeCategory);
      if (!selected) return [];
      const base = CATEGORY_META[selected.key].color;
      return selected.books
        .filter((book) => book.count > 0)
        .sort((a, b) => b.count - a.count)
        .map((book, index, list) => ({
          key: `${selected.key}:${book.book}`,
          parent: selected.key,
          label: book.label,
          count: book.count,
          color: lighten(base, Math.min(0.75, (index / Math.max(1, list.length)) * 0.75))
        }));
    }

    function render() {
      const rows = currentRows();
      const total = rows.reduce((sum, row) => sum + row.count, 0);
      const globalTotal = summarize(state.dataByLang[state.lang] || []).reduce((sum, row) => sum + row.count, 0);
      const displayTotal = state.activeCategory ? total : globalTotal;
      totalEl.textContent = String(displayTotal);
      const activeLabel = state.activeCategory ? CATEGORY_META[state.activeCategory].label : 'Toda la Escritura';
      const hover = state.hoverCategory;
      subtitleEl.textContent = hover ? hover : activeLabel;
      resetBtn.hidden = !state.activeCategory;

      if (!rows.length || total <= 0) {
        svg.innerHTML = '<circle cx="120" cy="120" r="72" fill="none" stroke="#e5e7eb" stroke-width="42"></circle>';
        legend.innerHTML = '<div class="small muted">Sin datos para este idioma.</div>';
        return;
      }

      let angle = -Math.PI / 2;
      const cx = 120;
      const cy = 120;
      const rOuter = 105;
      const rInner = 63;
      svg.innerHTML = '';

      rows.forEach((row) => {
        const slice = (row.count / total) * Math.PI * 2;
        const end = angle + slice;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', arcPath(cx, cy, rOuter, rInner, angle, end));
        path.setAttribute('fill', row.color);
        path.dataset.rowKey = row.key;
        const pct = ((row.count / total) * 100).toFixed(1);
        path.setAttribute('title', `${row.label}: ${pct}% (${row.count})`);
        path.style.cursor = state.activeCategory ? 'default' : 'pointer';
        path.addEventListener('mouseenter', () => {
          state.hoverCategory = `${row.label}: ${pct}%`;
          subtitleEl.textContent = state.hoverCategory;
        });
        path.addEventListener('mouseleave', () => {
          state.hoverCategory = null;
          subtitleEl.textContent = state.activeCategory ? CATEGORY_META[state.activeCategory].label : 'Toda la Escritura';
        });
        if (!state.activeCategory && row.key) {
          path.addEventListener('click', () => {
            state.activeCategory = row.key;
            render();
          });
        }
        svg.appendChild(path);
        angle = end;
      });

      legend.innerHTML = rows
        .map((row) => {
          const pct = ((row.count / total) * 100).toFixed(1);
          return `
            <button type="button" class="legend-row" data-key="${row.key}" title="${pct}%">
              <span class="legend-dot" style="background:${row.color}"></span>
              <span class="legend-label">${row.label}</span>
              <span class="legend-value">${row.count}</span>
            </button>
          `;
        })
        .join('');

      legend.querySelectorAll('.legend-row').forEach((button) => {
        button.addEventListener('mouseenter', () => {
          const title = button.getAttribute('title');
          const label = button.querySelector('.legend-label')?.textContent || '';
          state.hoverCategory = `${label}: ${title}`;
          subtitleEl.textContent = state.hoverCategory;
        });
        button.addEventListener('mouseleave', () => {
          state.hoverCategory = null;
          subtitleEl.textContent = state.activeCategory ? CATEGORY_META[state.activeCategory].label : 'Toda la Escritura';
        });
        button.addEventListener('click', () => {
          if (!state.activeCategory) {
            state.activeCategory = button.dataset.key;
          }
          render();
        });
      });
    }

    container.querySelectorAll('[data-language]').forEach((button) => {
      button.addEventListener('click', () => {
        state.lang = button.dataset.language;
        state.activeCategory = null;
        state.hoverCategory = null;
        container.querySelectorAll('[data-language]').forEach((btn) => {
          btn.classList.toggle('active', btn === button);
          btn.classList.toggle('btn-primary', btn === button);
          if (btn !== button) btn.classList.remove('btn-primary');
        });
        render();
      });
    });

    resetBtn.addEventListener('click', () => {
      state.activeCategory = null;
      state.hoverCategory = null;
      render();
    });

    render();

    return {
      setData(nextDataByLang) {
        state.dataByLang = {
          es: Array.isArray(nextDataByLang?.es) ? nextDataByLang.es : [],
          he: Array.isArray(nextDataByLang?.he) ? nextDataByLang.he : [],
 gr_rkant: Array.isArray(nextDataByLang?.gr_rkant) ? nextDataByLang.gr_rkant : (Array.isArray(nextDataByLang?.gr) ? nextDataByLang.gr : []),
          gr_lxx: Array.isArray(nextDataByLang?.gr_lxx) ? nextDataByLang.gr_lxx : []
                  };
        state.activeCategory = null;
        state.hoverCategory = null;
        render();
      }
    };
  }

  window.AnalisisOccurrenceDonut = { create: createDonut };
})();
