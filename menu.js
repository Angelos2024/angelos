(function(){
  const OT_BOOKS = [
    ['genesis','Génesis'],['exodo','Éxodo'],['levitico','Levítico'],['numeros','Números'],['deuteronomio','Deuteronomio'],
    ['josue','Josué'],['jueces','Jueces'],['rut','Rut'],['1_samuel','1 Samuel'],['2_samuel','2 Samuel'],
    ['1_reyes','1 Reyes'],['2_reyes','2 Reyes'],['1_cronicas','1 Crónicas'],['2_cronicas','2 Crónicas'],['esdras','Esdras'],
    ['nehemias','Nehemías'],['ester','Ester'],['job','Job'],['salmos','Salmos'],['proverbios','Proverbios'],
    ['eclesiastes','Eclesiastés'],['cantares','Cantares'],['isaias','Isaías'],['jeremias','Jeremías'],['lamentaciones','Lamentaciones'],
    ['ezequiel','Ezequiel'],['daniel','Daniel'],['oseas','Oseas'],['joel','Joel'],['amos','Amós'],
    ['abdias','Abdías'],['jonas','Jonás'],['miqueas','Miqueas'],['nahum','Nahúm'],['habacuc','Habacuc'],
    ['sofonias','Sofonías'],['hageo','Hageo'],['zacarias','Zacarías'],['malaquias','Malaquías']
  ];

  const NT_BOOKS = [
    ['mateo','Mateo'],['marcos','Marcos'],['lucas','Lucas'],['juan','Juan'],['hechos','Hechos'],
    ['romanos','Romanos'],['1_corintios','1 Corintios'],['2_corintios','2 Corintios'],['galatas','Gálatas'],['efesios','Efesios'],
    ['filipenses','Filipenses'],['colosenses','Colosenses'],['1_tesalonicenses','1 Tesalonicenses'],['2_tesalonicenses','2 Tesalonicenses'],['1_timoteo','1 Timoteo'],
    ['2_timoteo','2 Timoteo'],['tito','Tito'],['filemon','Filemón'],['hebreos','Hebreos'],['santiago','Santiago'],
    ['1_pedro','1 Pedro'],['2_pedro','2 Pedro'],['1_juan','1 Juan'],['2_juan','2 Juan'],['3_juan','3 Juan'],
    ['judas','Judas'],['apocalipsis','Apocalipsis']
  ];

  const chapterCache = new Map();

  function byId(id){ return document.getElementById(id); }
  function closeMenu(dropdown, toggle){
    dropdown.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
  }

  function openMenu(dropdown, toggle){
    dropdown.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
  }

  async function getChapterCount(slug){
    if(chapterCache.has(slug)) return chapterCache.get(slug);
    const resp = await fetch(`./librosRV1960/${slug}.json`);
    if(!resp.ok) return 0;
    const json = await resp.json();
 let count = 0;

    if(Array.isArray(json?.chapters)){
      count = json.chapters.length;
    }else if(json && typeof json === 'object'){
      count = Object.keys(json).filter((key) => /^\d+$/.test(key)).length;
    }
    chapterCache.set(slug, count);
    return count;
  }

  function renderBookList(container, books, onSelect, activeSlug){
    container.innerHTML = '';
    books.forEach(([slug, label]) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `book-chip${slug === activeSlug ? ' is-active' : ''}`;
      btn.textContent = label;
      btn.dataset.slug = slug;
      btn.dataset.label = label;
      btn.addEventListener('click', () => onSelect(slug, label));
      container.appendChild(btn);
    });
  }

  async function init(){
    const toggle = byId('bookMenuToggle');
    const dropdown = byId('bookMenuDropdown');
    const searchInput = byId('searchInput');
    const searchForm = byId('searchForm');
    const otList = byId('bookListOT');
    const ntList = byId('bookListNT');
    const chapterList = byId('chapterList');
    const chapterTitle = byId('chapterTitle');

    if(!toggle || !dropdown || !searchInput || !searchForm) return;

    let selectedSlug = '';
    let selectedLabel = '';

    const selectBook = async (slug, label) => {
      selectedSlug = slug;
      selectedLabel = label;
      renderBookList(otList, OT_BOOKS, selectBook, selectedSlug);
      renderBookList(ntList, NT_BOOKS, selectBook, selectedSlug);

      chapterList.innerHTML = '<div class="chapter-empty">Cargando capítulos…</div>';
      const total = await getChapterCount(slug);
      chapterTitle.textContent = `${label} · capítulos`;
      chapterList.innerHTML = '';

      if(!total){
        chapterList.innerHTML = '<div class="chapter-empty">No se encontraron capítulos.</div>';
        return;
      }

      for(let i=1; i<=total; i++){
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chapter-chip';
        btn.textContent = String(i);
        btn.addEventListener('click', () => {
          searchInput.value = `${selectedLabel} ${i}`;
          closeMenu(dropdown, toggle);
          searchForm.requestSubmit();
        });
        chapterList.appendChild(btn);
      }
    };

    renderBookList(otList, OT_BOOKS, selectBook, selectedSlug);
    renderBookList(ntList, NT_BOOKS, selectBook, selectedSlug);

    toggle.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if(dropdown.hidden){
        openMenu(dropdown, toggle);
      }else{
        closeMenu(dropdown, toggle);
      }
    });

    dropdown.addEventListener('click', (event) => event.stopPropagation());

    document.addEventListener('click', (event) => {
      if(!dropdown.hidden && !dropdown.contains(event.target) && !toggle.contains(event.target)){
        closeMenu(dropdown, toggle);
      }
    });

    document.addEventListener('keydown', (event) => {
      if(event.key === 'Escape' && !dropdown.hidden){
        closeMenu(dropdown, toggle);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
