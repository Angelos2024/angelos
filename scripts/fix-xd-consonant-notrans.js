/**
 * Corrección global: suprime tokens XD que tienen consonante hebrea (como הָ)
 * y que aparecen como columnas "ART el —" fantasma en el interlineal.
 *
 * Estos tokens son el artículo determinado hebreo separado (הָ/הַ/הֶ)
 * que OSHB fragmenta del sustantivo. En el interlineal generan una columna
 * extra con "ART el/la/los/las" sin contraparte griega, distorsionando la alineación LXX.
 *
 * La solución: marcar estos tokens como notrans:"s/t" y eliminar su campo `es`,
 * igual que ya se hace con los tokens XD de solo diacríticos.
 *
 * EXCEPCIÓN: tokens XD que forman parte de un compuesto mayor (ej: לָ = PREP+ART)
 * ya tienen morphs distinto (PB, etc.) y NO son alcanzados por este script.
 */
const fs   = require('fs');
const path = require('path');

const CHAP_DIR = path.resolve(
  __dirname, '..', 'IdiomaORIGEN', 'interlineal', 'chapters'
);

// Verifica si el orig tiene al menos una consonante hebrea (א-ת)
function hasHebrewConsonant(surface) {
  return /[\u05D0-\u05EA]/.test(String(surface || ''));
}

// Sólo artículos determinados: ה + vocal (no tienen strongs propio en OSHB)
function isStandaloneArticle(token) {
  return String(token.morphs || '') === 'XD'
    && hasHebrewConsonant(token.orig)
    && !token.strongs;  // Artículos determinados no tienen Strong's
}

let totalFixed = 0;
let filesFixed = 0;

function processFile(fp) {
  let raw;
  try { raw = fs.readFileSync(fp, 'utf8'); } catch { return; }
  let data;
  try { data = JSON.parse(raw); } catch { return; }

  let changed = false;

  for (const vk of Object.keys(data)) {
    const v = data[vk];
    if (!v || !Array.isArray(v.tokens)) continue;

    for (const token of v.tokens) {
      if (!isStandaloneArticle(token)) continue;
      // Solo actuar si tiene glosa española o no tiene notrans
      if (token.notrans === 's/t' && !token.es) continue;  // Ya correcto
      delete token.es;
      token.notrans = 's/t';
      totalFixed++;
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(fp, JSON.stringify(data) + '\n', 'utf8');
    filesFixed++;
  }
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

console.log('Suprimiendo tokens XD-artículo con consonante en todo el corpus...');
const t0 = Date.now();
walk(CHAP_DIR);
const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\n✓ ${totalFixed} tokens XD-artículo marcados notrans`);
console.log(`✓ ${filesFixed} archivos actualizados`);
console.log(`✓ Completado en ${elapsed}s`);
