(() => {
  const mount = document.getElementById('backupPanelMount');
  if (!mount) return;

  mount.innerHTML = `
    <section class="panel backup-panel" aria-label="Respaldo de notas y subrayados">
      <div class="panel-header">Respaldo</div>
      <div class="panel-body">
        <div class="backup-hint">
          Guarda tus datos, notas y subrayados en un archivo para restaurarlos o compartirlos si se borra la caché.
        </div>
        <div class="backup-actions d-grid gap-2">
          <button id="btnBackupDownload" class="btn btn-soft w-100" type="button">
            Descargar respaldo
          </button>
          <button id="btnBackupUpload" class="btn btn-outline-primary w-100" type="button">
            Cargar respaldo
          </button>
        </div>
        <input id="backupFileInput" class="d-none" type="file" accept="application/json">
        <div id="backupStatus" class="backup-status mt-2" role="status" aria-live="polite"></div>
      </div>
    </section>
  `;

  const btnDownload = mount.querySelector('#btnBackupDownload');
  const btnUpload = mount.querySelector('#btnBackupUpload');
  const fileInput = mount.querySelector('#backupFileInput');
  const statusEl = mount.querySelector('#backupStatus');

  const STORE_HL = 'highlights';
  const STORE_NOTES = 'notes';
    const XREF_DB = 'textos_cruzados_db';
  const XREF_STORE = 'links';

  const setStatus = (message, type = '') => {
    statusEl.textContent = message;
    statusEl.classList.remove('is-ok', 'is-error');
    if (type) statusEl.classList.add(type);
  };

  const setBusy = (busy) => {
    btnDownload.disabled = busy;
    btnUpload.disabled = busy;
  };

  const requestToPromise = (req) => new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  const waitTx = (tx) => new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transacción abortada'));
  });

  const getAll = async (db, storeName) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const rows = await requestToPromise(store.getAll());
    await waitTx(tx);
    return rows || [];
  };
const openCrossRefsDB = () => new Promise((resolve, reject) => {
    const req = indexedDB.open(XREF_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(XREF_STORE)) db.createObjectStore(XREF_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  const getCrossRefs = async (db) => {
    const tx = db.transaction(XREF_STORE, 'readonly');
    const store = tx.objectStore(XREF_STORE);
    const [keys, values] = await Promise.all([
      requestToPromise(store.getAllKeys()),
      requestToPromise(store.getAll()),
    ]);
    await waitTx(tx);
    return keys.map((key, index) => ({
      key,
      refs: Array.isArray(values[index]) ? values[index] : [],
    }));
  };

  const buildFilename = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
    return `respaldo-notas-${stamp}.json`;
  };

  const normalizePayload = (payload) => {
    const data = payload?.data || payload;
    const highlights = Array.isArray(data?.highlights) ? data.highlights : null;
    const notes = Array.isArray(data?.notes) ? data.notes : null;
const crossRefs = Array.isArray(data?.crossRefs) ? data.crossRefs : null;
   if (!highlights && !notes && !crossRefs) {
      throw new Error('El archivo no contiene notas, subrayados ni textos relacionados.');
    }

    return {
      highlights: highlights || [],
      notes: notes || [],
      crossRefs: crossRefs || [],
    };
  };

  const downloadBackup = async () => {
    setBusy(true);
    setStatus('Preparando respaldo…');

    try {
      const db = await window.AnnotationsDB?.openDB?.();
      if (!db) throw new Error('No se pudo abrir la base de datos local.');

      const [highlights, notes, crossRefs] = await Promise.all([
        getAll(db, STORE_HL),
        getAll(db, STORE_NOTES),
        openCrossRefsDB()
          .then((xrefDb) => getCrossRefs(xrefDb))
          .catch(() => []),
      ]);

      const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        data: { highlights, notes },
        data: { highlights, notes, crossRefs },
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = buildFilename();
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setStatus(
        `Respaldo listo: ${highlights.length} subrayados, ${notes.length} notas, ${crossRefs.length} textos relacionados.`,
        'is-ok'
      );
    } catch (error) {
      setStatus(error.message || 'No se pudo crear el respaldo.', 'is-error');
    } finally {
      setBusy(false);
    }
  };

  const loadBackup = async (file) => {
    setBusy(true);
    setStatus('Leyendo archivo…');

    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const { highlights, notes, crossRefs } = normalizePayload(payload);

      const confirmed = window.confirm(
        'Al cargar el respaldo se reemplazarán las notas, subrayados y textos relacionados actuales. ¿Deseas continuar?'
      );
      if (!confirmed) {
        setStatus('Carga cancelada.');
        return;
      }

      const db = await window.AnnotationsDB?.openDB?.();
      if (!db) throw new Error('No se pudo abrir la base de datos local.');
      const xrefDb = await openCrossRefsDB();

      const tx = db.transaction([STORE_HL, STORE_NOTES], 'readwrite');
      const hlStore = tx.objectStore(STORE_HL);
      const notesStore = tx.objectStore(STORE_NOTES);

      await requestToPromise(hlStore.clear());
      await requestToPromise(notesStore.clear());

      highlights.forEach((item) => hlStore.put(item));
      notes.forEach((item) => notesStore.put(item));

      await waitTx(tx);

      const xrefTx = xrefDb.transaction(XREF_STORE, 'readwrite');
      const xrefStore = xrefTx.objectStore(XREF_STORE);
      await requestToPromise(xrefStore.clear());
      crossRefs.forEach(({ key, refs }) => {
        if (key) xrefStore.put(refs || [], key);
      });
      await waitTx(xrefTx);

      setStatus(
        `Respaldo cargado: ${highlights.length} subrayados, ${notes.length} notas, ${crossRefs.length} textos relacionados.`,
        'is-ok'
      );
    } catch (error) {
      setStatus(error.message || 'No se pudo cargar el respaldo.', 'is-error');
    } finally {
      setBusy(false);
      fileInput.value = '';
    }
  };

  btnDownload.addEventListener('click', () => {
    downloadBackup();
  });

  btnUpload.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    loadBackup(file);
  });
})();
