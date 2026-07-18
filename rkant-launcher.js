/**
 * rkant-launcher.js
 *
 * Sustituye el panel embebido antiguo de RKANT.
 *
 * Al hacer click en `#btnRKANTEs` monta un overlay a pantalla completa con un
 * iframe apuntando a `./rkant-new/index.html`. La página principal permanece
 * intacta detrás (misma URL, mismo estado en memoria y en el DOM). El botón
 * "Volver al inicio" dentro del iframe envía un `postMessage` que cierra el
 * overlay y descarta el iframe.
 *
 * También:
 *   - Recuerda el último `#hash` navegado dentro del RKANT (localStorage), de
 *     modo que al reabrirlo vuelva al mismo versículo.
 *   - Soporta cerrar con la tecla ESC como refuerzo.
 */
(() => {
  const RKANT_URL   = './rkant-new/index.html';
  const LS_HASH_KEY = 'rkant.newLastHash';

  const state = {
    overlay: null,
    iframe: null,
    prevOverflow: null,
    lastHash: null,
  };

  try { state.lastHash = localStorage.getItem(LS_HASH_KEY) || null; } catch (e) {}

  function injectStyles(){
    if (document.getElementById('rkant-launcher-styles')) return;
    const css = `
      #rkantOverlay {
        position: fixed;
        inset: 0;
        z-index: 99999;
        background: #2c1d1f;
        display: flex;
        flex-direction: column;
      }
      #rkantOverlay iframe {
        flex: 1;
        width: 100%;
        border: 0;
        background: #fdf6f2;
      }
      #rkantOverlay .rk-load {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #e0cdbd;
        font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        font-size: 14px;
        letter-spacing: 0.5px;
      }
      body.rkant-open { overflow: hidden !important; }
    `;
    const st = document.createElement('style');
    st.id = 'rkant-launcher-styles';
    st.textContent = css;
    document.head.appendChild(st);
  }

  function createOverlay(){
    injectStyles();
    const overlay = document.createElement('div');
    overlay.id = 'rkantOverlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'RKANT — Aparato crítico');

    const loading = document.createElement('div');
    loading.className = 'rk-load';
    loading.textContent = 'Cargando RKANT…';
    overlay.appendChild(loading);

    const iframe = document.createElement('iframe');
    iframe.title = 'RKANT — Aparato crítico del Nuevo Testamento';
    iframe.setAttribute('allow', 'clipboard-write');
    // Restaurar el último versículo visitado si existe
    iframe.src = RKANT_URL + (state.lastHash ? state.lastHash : '');
    iframe.addEventListener('load', () => { loading.remove(); });
    overlay.appendChild(iframe);

    state.overlay = overlay;
    state.iframe  = iframe;
    return overlay;
  }

  function openRKANT(){
    if (state.overlay) {
      // Reusar overlay/iframe: preserva scroll, búsqueda, versículo abierto…
      state.overlay.style.display = 'flex';
      // Si por algún motivo el hash guardado cambió estando cerrado (p.ej.
      // el usuario abrió otra pestaña), lo re-sincronizamos.
      try {
        if (state.iframe && state.lastHash) {
          const cur = state.iframe.contentWindow.location.hash || '';
          if (cur !== state.lastHash) {
            state.iframe.contentWindow.postMessage(
              { type: 'rkant-go', hash: state.lastHash }, '*'
            );
          }
        }
      } catch(e){}
    } else {
      const ov = createOverlay();
      document.body.appendChild(ov);
    }
    state.prevOverflow = document.body.style.overflow;
    document.body.classList.add('rkant-open');
  }

  function closeRKANT(){
    if (state.overlay) {
      // Ocultamos en vez de destruir para preservar todo el estado interno
      // (scroll dentro del versículo, resultados de búsqueda, tooltips…).
      state.overlay.style.display = 'none';
      // Guardamos el hash actual por si el navegador cierra la pestaña.
      try {
        const h = state.iframe && state.iframe.contentWindow.location.hash;
        if (h && h !== '#/') {
          state.lastHash = h;
          localStorage.setItem(LS_HASH_KEY, h);
        }
      } catch(e){}
    }
    document.body.classList.remove('rkant-open');
    if (state.prevOverflow !== null) {
      document.body.style.overflow = state.prevOverflow;
      state.prevOverflow = null;
    }
  }

  // -------- listener global de mensajes desde el iframe RKANT ----------------
  window.addEventListener('message', (ev) => {
    const d = ev && ev.data;
    if (!d || typeof d !== 'object') return;
    if (d.type === 'rkant-close') {
      if (d.hash && typeof d.hash === 'string' && d.hash !== '#/') {
        state.lastHash = d.hash;
        try { localStorage.setItem(LS_HASH_KEY, d.hash); } catch(e){}
      }
      closeRKANT();
    } else if (d.type === 'rkant-hash' && typeof d.hash === 'string') {
      state.lastHash = d.hash;
      try { localStorage.setItem(LS_HASH_KEY, d.hash); } catch(e){}
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.overlay) {
      closeRKANT();
    }
  });

  // -------- enlazar el botón principal --------------------------------------
  function attachButton(){
    const btn = document.getElementById('btnRKANTEs');
    if (!btn) {
      // Reintentar cuando el DOM crece; el botón se genera junto al panel
      // principal, así que ya suele existir en DOMContentLoaded.
      setTimeout(attachButton, 500);
      return;
    }
    // Evitar dobles bindings si el archivo se carga dos veces
    if (btn.dataset.rkantBound === '1') return;
    btn.dataset.rkantBound = '1';
    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      openRKANT();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachButton);
  } else {
    attachButton();
  }
})();
