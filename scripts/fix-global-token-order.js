/**
 * Corrección global: re-ordena los tokens de cada versículo por su campo `num`
 * (número canónico de palabra en el texto hebreo OSHB).
 *
 * El problema: en 927 archivos, 58 376 tokens están almacenados en orden
 * distinto al canónico, lo que hace que las columnas del interlineal aparezcan
 * en posición incorrecta al renderizar de derecha a izquierda.
 *
 * Regla: tokens sin `num` quedan al principio (índice -1 en la ordenación),
 * tokens con `num` se ordenan por parseFloat(num).
 */
const fs   = require('fs');
const path = require('path');

const CHAP_DIR = path.resolve(
  __dirname, '..', 'IdiomaORIGEN', 'interlineal', 'chapters'
);

let totalTokensMoved = 0;
let filesFixed = 0;
let filesProcessed = 0;

function sortKey(token) {
  if (token.num == null) return -1;
  const v = parseFloat(String(token.num).split(',')[0]);
  return isNaN(v) ? -1 : v;
}

function processFile(fp) {
  let raw;
  try { raw = fs.readFileSync(fp, 'utf8'); } catch { return; }
  let data;
  try { data = JSON.parse(raw); } catch { return; }

  let fileChanged = false;

  for (const vk of Object.keys(data)) {
    const v = data[vk];
    if (!v || !Array.isArray(v.tokens) || v.tokens.length < 2) continue;

    // Check if already sorted
    let needsSort = false;
    let prev = -Infinity;
    for (const t of v.tokens) {
      const k = sortKey(t);
      if (k < prev) { needsSort = true; break; }
      prev = k;
    }

    if (!needsSort) continue;

    // Count how many tokens move
    const before = v.tokens.map(t => sortKey(t));
    const sorted = [...v.tokens].sort((a, b) => sortKey(a) - sortKey(b));
    const after  = sorted.map(t => sortKey(t));
    let moved = 0;
    for (let i = 0; i < before.length; i++) {
      if (before[i] !== after[i]) moved++;
    }
    totalTokensMoved += moved;
    v.tokens = sorted;
    fileChanged = true;
  }

  if (fileChanged) {
    fs.writeFileSync(fp, JSON.stringify(data) + '\n', 'utf8');
    filesFixed++;
  }
  filesProcessed++;
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir)) {
    const fp = path.join(dir, entry);
    const stat = fs.statSync(fp);
    if (stat.isDirectory()) {
      walk(fp);
    } else if (entry.endsWith('.json') && !entry.includes('manifest')) {
      processFile(fp);
    }
  }
}

console.log('Ordenando tokens por num en todo el corpus...');
const t0 = Date.now();
walk(CHAP_DIR);
const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\n✓ ${totalTokensMoved} tokens reposicionados`);
console.log(`✓ ${filesFixed} archivos actualizados de ${filesProcessed} procesados`);
console.log(`✓ Completado en ${elapsed}s`);
