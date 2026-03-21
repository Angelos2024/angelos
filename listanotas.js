// listanotas.js — IndexedDB
// Panel "Notas" (global) — NO confundir con comentarios de Eric
(function () {

  function escapeHtml(str){
    return String(str ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function abbrevBook(slug){
    const s = String(slug || "").toLowerCase();
    const map = {
      genesis:"Gn", exodo:"Ex", levitico:"Lv", numeros:"Nm", deuteronomio:"Dt",
      josue:"Jos", jueces:"Jue", rut:"Rt",
      mateo:"Mt", marcos:"Mr", lucas:"Lc", juan:"Jn", hechos:"Hch",
      romanos:"Ro", galatas:"Ga", efesios:"Ef", filipenses:"Fil", colosenses:"Col",
      "1corintios":"1Co", "2corintios":"2Co",
      "1tesalonicenses":"1Ts", "2tesalonicenses":"2Ts",
      "1timoteo":"1Ti", "2timoteo":"2Ti",
      tito:"Tit", filemon:"Flm", hebreos:"Heb",
      santiago:"Stg", "1pedro":"1P", "2pedro":"2P",
      "1juan":"1Jn", "2juan":"2Jn", "3juan":"3Jn",
      judas:"Jud", apocalipsis:"Ap"
    };
    if(map[s]) return map[s];
    return s ? (s.slice(0,3).replace(/^\w/, c => c.toUpperCase())) : "—";
  }

  async function getAllNotes(){
    if (window.NotesDB && typeof window.NotesDB.listAllNotes === "function"){
      const arr = await window.NotesDB.listAllNotes();
      return Array.isArray(arr) ? arr : [];
    }
    return [];
  }

  function firstWordFrom(note){
    const anchor = (note.quote || "").trim();
    const base = anchor || (note.text || "").trim();
    if(!base) return "";
    const w = base.split(/\s+/)[0] || "";
    return w.replace(/[.,;:!?¿¡()[\]{}"“”'’]/g, "");
  }

  function buildLabel(note){
    const book = abbrevBook(note.book);
    const ch = Number(note.ch || 0);
    const v  = Number(note.v  || 0);
    const ref = (ch && v) ? `${book} ${ch}:${v}` : book;
    const fw = firstWordFrom(note);
    return { ref, fw };
  }

  function renderNotasList(notes){
    const list = document.getElementById("notasList");
    if(!list) return;

    if(!notes.length){
      list.innerHTML = `<div class="text-muted small p-2">No hay notas guardadas.</div>`;
      return;
    }

    notes.sort((a,b)=> (b.updated_at || b.created_at || 0) - (a.updated_at || a.created_at || 0));

    list.innerHTML = notes.map(n=>{
      const { ref, fw } = buildLabel(n);
      const id = String(n.id ?? "");

      return `
        <button type="button"
          class="list-group-item list-group-item-action notas-item"
          data-note-id="${escapeHtml(id)}">
          <div>
            <strong>${escapeHtml(ref)}</strong>
            ${fw ? `<span class="note-firstword">${escapeHtml(fw)}</span>` : ""}
          </div>
          <small></small>
        </button>
      `;
    }).join("");

    list.querySelectorAll("[data-note-id]").forEach(btn=>{
      btn.addEventListener("click", (ev)=>{
        ev.preventDefault();
        ev.stopPropagation();
        const id = btn.dataset.noteId;
        if(window.openNoteById && id) window.openNoteById(id);
      });
    });
  }

  async function refreshNotasListIfOpen(){
    const panel = document.getElementById("notasPanel");
    if(!panel) return;

    const isOpen = !panel.classList.contains("d-none");
    if(!isOpen) return;

    const search = document.getElementById("notasSearch");
    const q = (search ? search.value.trim().toLowerCase() : "");

    const all = await getAllNotes();

    if(!q){
      renderNotasList(all);
      return;
    }

    renderNotasList(
      all.filter(n=>{
        const { ref, fw } = buildLabel(n);
        const text = String(n.text || "").toLowerCase();
        return (
          ref.toLowerCase().includes(q) ||
          fw.toLowerCase().includes(q) ||
          text.includes(q)
        );
      })
    );
  }

  async function toggleNotasPanel(force){
    const panel = document.getElementById("notasPanel");
    if(!panel) return;

    const open = !panel.classList.contains("d-none");
    const next = (typeof force === "boolean") ? force : !open;

    panel.classList.toggle("d-none", !next);

    if(next){
      await refreshNotasListIfOpen();
      const s = document.getElementById("notasSearch");
      if(s) s.focus();
    }
  }

  function initNotasUI(){
    const btn = document.getElementById("btnNotas");
    const search = document.getElementById("notasSearch");

    if(btn){
      btn.disabled = false;
      btn.addEventListener("click", (ev)=>{
        ev.preventDefault();
        toggleNotasPanel();
      });
    }

    if(search){
      search.addEventListener("input", ()=>{
        refreshNotasListIfOpen();
      });
    }
  }

  // API pública
  window.refreshNotasList = function(){ refreshNotasListIfOpen(); };
  window.dispatchNotasChanged = function(){
    window.dispatchEvent(new CustomEvent("notas:changed"));
  };
  window.addEventListener("notas:changed", () => { refreshNotasListIfOpen(); });

  document.addEventListener("DOMContentLoaded", initNotasUI);

})();
