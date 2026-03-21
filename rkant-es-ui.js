(() => {
  function $(id){ return document.getElementById(id); }

  function show(el){
if(!el) return;
    el.classList.remove('d-none');
    el.style.display = '';
  }
  function hide(el){
    if(!el) return;
    el.classList.add('d-none');
    el.style.display = 'none';
  }
 
   async function initRKANT(){
     const btn = $("btnRKANTEs");
     const rkantPanel = $("rkantPanel");
     const biblePanel = $("biblePanel"); // ✅ lo agregaste en tu panel-body
     const selBook = $("rkantBook");
     const selCh = $("rkantChapter");
     const selV = $("rkantVerse");
     const viewer = $("rkantViewer");
        const panelHeaderTitle = $("panelHeaderTitle");
 
     // Si aún no están en el DOM, no hacemos nada (evita errores silenciosos)
    if(!btn || !rkantPanel || !biblePanel || !selBook || !selCh || !selV || !viewer || !panelHeaderTitle){
       console.warn("[RKANT-Es] Faltan elementos en el DOM. Revisa ids: btnRKANTEs, biblePanel, rkantPanel, rkantBook, rkantChapter, rkantVerse, rkantViewer, panelHeaderTitle");
       return;
     }

   

    const RKANT_BOOKS = [
     'mateo','marcos','lucas','juan','hechos',
      'romanos','1_corintios','2_corintios','galatas','efesios','filipenses','colosenses',
      '1tesalonicenses','2tesalonicenses','1_timoteo','2_timoteo','tito','filemon',
      'hebreos','santiago','1_pedro','2_pedro','1_juan','2_juan','3_juan','judas','apocalipsis'
  ];

 const STORAGE_KEYS = {
      enabled: 'rkant.es.enabled',
      selection: 'rkant.es.selection'
    };
     let enabled = false;
      const INDEX_PATH = './RKANT/out/index.json';
    let rkantIndex = null;
 
     // Cache del último estado seleccionado
     let lastSel = { book: null, ch: null, v: null };
  function saveSelectionState(){
      try{
        localStorage.setItem(STORAGE_KEYS.selection, JSON.stringify(lastSel));
      }catch(err){
        console.warn('[RKANT-Es] No se pudo guardar la selección.', err);
      }
     }

     function saveEnabledState(){
      try{
        localStorage.setItem(STORAGE_KEYS.enabled, enabled ? '1' : '0');
      }catch(err){
        console.warn('[RKANT-Es] No se pudo guardar el estado del panel.', err);
      }
     }

     function loadSavedState(){
      try{
        const savedSelection = localStorage.getItem(STORAGE_KEYS.selection);
        if(savedSelection){
          const parsed = JSON.parse(savedSelection);
          if(parsed && typeof parsed === 'object'){
            lastSel = {
              book: parsed.book || null,
              ch: parsed.ch || null,
              v: parsed.v || null
            };
          }
        }
      }catch(err){
        console.warn('[RKANT-Es] No se pudo recuperar la selección guardada.', err);
      }

      try{
        return localStorage.getItem(STORAGE_KEYS.enabled) === '1';
      }catch(err){
        console.warn('[RKANT-Es] No se pudo recuperar el estado del panel.', err);
        return false;
      }
     }
     function setButtonState(){
    btn.classList.toggle('btn-primary', !enabled);
       btn.classList.toggle('btn-rkant-active', enabled);
        btn.textContent = enabled
         ? 'Volver al Texto del pasaje'
         : 'Aparato crítico RKANT';
     }
 
   

   async function loadIndex(){
      try{
        const res = await fetch(`${INDEX_PATH}?v=${Date.now()}`, { cache: "no-store" });
        if(!res.ok) throw new Error(`No se pudo cargar index.json (HTTP ${res.status})`);
        const data = await res.json();
        if(!data || typeof data !== "object") throw new Error("Formato inválido en index.json");
        return data;
      }catch(err){
        console.warn("[RKANT-Es]", err);
     return null;
      }

      }
   
function getAvailableBooks(index){
      const available = index ? Object.keys(index) : [];
      return RKANT_BOOKS.filter(book => available.includes(book));
    }
       function numericKeys(obj){
      return Object.keys(obj || {}).sort((a, b) => Number(a) - Number(b));
    }
 
 function fillBooks(){
      const books = getAvailableBooks(rkantIndex);
      if(books.length === 0){
        selBook.innerHTML = `<option value="">No hay libros disponibles</option>`;
        return;
      }
      selBook.innerHTML = books.map(b => `<option value="${b}">${b}</option>`).join("");
    }

    function fillChapters(book){
      const chapters = numericKeys(rkantIndex?.[book]);
      if(chapters.length === 0){
        selCh.innerHTML = `<option value="">No hay capítulos</option>`;
        return;
      }
      selCh.innerHTML = chapters.map(value => `<option value="${value}">${value}</option>`).join("");
    }

    function fillVerses(book, ch){
      const verses = numericKeys(rkantIndex?.[book]?.[ch]);
      if(verses.length === 0){
        selV.innerHTML = `<option value="">No hay versos</option>`;
        return;
      }
      selV.innerHTML = verses.map(value => `<option value="${value}">${value}</option>`).join("");
    }

    async function syncSelection(useLastSelection = false){
      if(useLastSelection && lastSel.book && rkantIndex?.[lastSel.book]){
        selBook.value = lastSel.book;
      }

       if(!selBook.value){
        selCh.innerHTML = "";
        selV.innerHTML = "";
        return;
      }

     fillChapters(selBook.value);
      if(useLastSelection && lastSel.ch && rkantIndex?.[selBook.value]?.[lastSel.ch]){
        selCh.value = lastSel.ch;
      }

      fillVerses(selBook.value, selCh.value);
      if(useLastSelection && lastSel.v && rkantIndex?.[selBook.value]?.[selCh.value]?.[lastSel.v]){
        selV.value = lastSel.v;
      }
    }
   function buildRKANTPaths(book, ch, v){
      return [
        `./RKANT/out/libros/${book}/${ch}/${ch}_${v}.html`,
        `./RKANT/out/libros/${book}/${ch}/${v}.html`
      ];
    }

 async function renderCurrent(){
   const book = selBook.value;
   const ch = selCh.value;
   const v = selV.value;
 
   lastSel = { book, ch, v };
      saveSelectionState();
    if(!book || !ch || !v){
    viewer.innerHTML = `<div class="text-muted">No hay selección disponible.</div>`;
    return;
  }

   const candidates = [];
  const indexedPath = rkantIndex?.[book]?.[ch]?.[v];
  if(indexedPath){
    candidates.push(`./RKANT/out/${indexedPath}`);
    if(indexedPath.includes('1tesalonicenses/')){
      candidates.push(`./RKANT/out/${indexedPath.replace('1tesalonicenses/', '1tesalonicences/')}`);
    }
  }
  candidates.push(...buildRKANTPaths(book, ch, v));
  let htmlText = null;
  let lastError = null;

  for(const path of candidates){
    try{
      const res = await fetch(`${path}?v=1`, { cache: "no-store" });
      if(res.ok){
       htmlText = await res.text();
       break;
      }
      if(res.status !== 404){
        lastError = `HTTP ${res.status}`;
        break;
      }
    }catch(err){
      lastError = err?.message || String(err);
      break;
   }
   }
 

  if(!htmlText){
    const detail = lastError ? ` (${lastError})` : "";
    viewer.innerHTML = `<div class="text-muted">No hay archivo para ${book} ${ch}:${v}${detail}</div>`;
    return;
  }
 
   // 🔒 Encapsular para que el CSS RKANT-Es aplique solo aquí
   viewer.innerHTML = `<div class="rkantes-container">${htmlText}</div>`;
 
   // 🧹 Quitar doctype si llega como texto (algunos HTML lo traen)
   const wrap = viewer.querySelector(".rkantes-container");
   if (wrap) {
     wrap.innerHTML = wrap.innerHTML.replace(/<!doctype[^>]*>/ig, "");
   }
 }
 
 
     async function enable(){
        rkantIndex = await loadIndex();
      fillBooks();
 const availableBooks = getAvailableBooks(rkantIndex);
     if(!selBook.value) selBook.value = availableBooks[0] || "";
    await syncSelection(true);
 
       // mostrar RKANT y ocultar Biblia normal
       hide(biblePanel);
       show(rkantPanel);
 panelHeaderTitle.textContent = "Roans Kritischer Apparat Neuen Testament";
       enabled = true;
       setButtonState();
       saveEnabledState();
 
       await renderCurrent();
     }
 
     function disable(){
       hide(rkantPanel);
       show(biblePanel);
 panelHeaderTitle.textContent = "Texto del pasaje";
       
       enabled = false;
       setButtonState();
       saveEnabledState();
     }
 
     // Eventos UI
     btn.addEventListener("click", async () => {
       try{
         if(!enabled) await enable();
         else disable();
       }catch(e){
         console.error(e);
         viewer.innerHTML = `<div class="text-danger">No se pudo activar RKANT-Es. Revisa consola.</div>`;
       }
     });
 
     selBook.addEventListener("change", async () => {
      await syncSelection(false);
       await renderCurrent();
     });
 
     selCh.addEventListener("change", async () => {
      fillVerses(selBook.value, selCh.value);
       await renderCurrent();
     });
 
     selV.addEventListener("change", renderCurrent);
 
     // Estado inicial del botón
     setButtonState();
      const shouldRestoreRKANT = loadSavedState();
     if(shouldRestoreRKANT){
      try{
        await enable();
      }catch(err){
        console.error('[RKANT-Es] No se pudo restaurar el panel tras recargar.', err);
      }
     }
   }
 
   // ✅ Garantiza que los elementos existan aunque el script esté en <head>
   if(document.readyState === "loading"){
     document.addEventListener("DOMContentLoaded", initRKANT);
   } else {
     initRKANT();
   }
 })();
;
