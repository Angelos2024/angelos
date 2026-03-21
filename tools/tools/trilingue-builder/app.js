const worker = new Worker('./worker.js', { type: 'module' });

const els = {
  rvFolder: document.getElementById('rvFolder'),
  heFolder: document.getElementById('heFolder'),
  lxxFolder: document.getElementById('lxxFolder'),
  bgriegaFile: document.getElementById('bgriegaFile'),
  masterFile: document.getElementById('masterFile'),
  useRepoMode: document.getElementById('useRepoMode'),
  repoBase: document.getElementById('repoBase'),
  topK: document.getElementById('topK'),
  minCount: document.getElementById('minCount'),
  minTokenLen: document.getElementById('minTokenLen'),
  filterStopwords: document.getElementById('filterStopwords'),
  generateBtn: document.getElementById('generateBtn'),
  downloadBtn: document.getElementById('downloadBtn'),
  progressBar: document.getElementById('progressBar'),
  progressText: document.getElementById('progressText'),
  summaryText: document.getElementById('summaryText'),
};

let generatedBlob = null;
let generatedCount = 0;

function toNamedEntries(fileList) {
  const out = [];
  for (const file of fileList || []) out.push({ name: file.name, file });
  return out;
}

async function gatherInputs() {
  const repoMode = els.useRepoMode.checked;
  const payload = {
    mode: repoMode ? 'repo' : 'file',
    config: {
      topK: Number(els.topK.value || 10),
      minCount: Number(els.minCount.value || 2),
      minTokenLen: Number(els.minTokenLen.value || 2),
      filterStopwords: els.filterStopwords.checked,
    },
  };

  if (repoMode) {
    payload.repoBase = els.repoBase.value.trim().replace(/\/$/, '');
    return payload;
  }

  payload.rvFiles = toNamedEntries(els.rvFolder.files);
  payload.heFiles = toNamedEntries(els.heFolder.files);
  payload.lxxFiles = toNamedEntries(els.lxxFolder.files);
  payload.bgriega = els.bgriegaFile.files?.[0] || null;
  payload.master = els.masterFile.files?.[0] || null;

  if (!payload.rvFiles.length || !payload.heFiles.length || !payload.lxxFiles.length || !payload.bgriega) {
    throw new Error('Faltan archivos obligatorios: RV1960, Hebreo AT, LXX o Bgriega.json');
  }
  return payload;
}

function setBusy(busy) {
  els.generateBtn.disabled = busy;
  els.downloadBtn.disabled = busy || !generatedBlob;
}

els.generateBtn.addEventListener('click', async () => {
  try {
    generatedBlob = null;
    generatedCount = 0;
    els.downloadBtn.disabled = true;
    els.summaryText.textContent = 'Procesando...';
    els.progressText.textContent = 'Preparando worker...';
    els.progressBar.value = 0;
    setBusy(true);

    const payload = await gatherInputs();
    worker.postMessage({ type: 'start', payload });
  } catch (err) {
    els.summaryText.textContent = `Error: ${err.message || err}`;
    setBusy(false);
  }
});

els.downloadBtn.addEventListener('click', () => {
  if (!generatedBlob) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(generatedBlob);
  a.download = 'trilingue_generado_solo_3idiomas.min.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

worker.onmessage = ({ data }) => {
  if (data.type === 'progress') {
    els.progressBar.value = data.percent ?? 0;
    els.progressText.textContent = data.message;
    return;
  }

  if (data.type === 'result') {
    generatedCount = data.entries.length;
    const minified = JSON.stringify(data.entries);
    generatedBlob = new Blob([minified], { type: 'application/json' });
    els.downloadBtn.disabled = false;
    els.summaryText.textContent = JSON.stringify(data.summary, null, 2);
    els.progressBar.value = 100;
    els.progressText.textContent = `Completado. Entradas: ${generatedCount}`;
    setBusy(false);
    return;
  }

  if (data.type === 'error') {
    els.summaryText.textContent = `Error: ${data.message}`;
    setBusy(false);
  }
};
