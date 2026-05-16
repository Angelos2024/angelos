/**
 * Corrección global: elimina notrans:"s/t" incorrecto de tokens con
 * morfología CC (conjunción waw), que fueron marcados erróneamente como
 * no-traducibles. Afecta a 10 501 tokens en 849 archivos.
 *
 * Regla: un token con morphs CC o Cc es una conjunción coordinante y
 * SIEMPRE debe aparecer en el interlineal (con español "y"/"pero"/etc.).
 * La supresión silenciosa rompe el alineamiento con el griego LXX.
 */
const fs   = require('fs');
const path = require('path');

const CHAP_DIR = path.resolve(
  __dirname, '..', 'IdiomaORIGEN', 'interlineal', 'chapters'
);

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
      const m = String(token.morphs || '');
      if ((m === 'CC' || m === 'Cc') && token.notrans != null) {
        delete token.notrans;
        // Si no tiene es, añadir "y" como glosa por defecto (waw/vav)
        if (!token.es) token.es = 'y';
        totalFixed++;
        changed = true;
      }
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

console.log('Iniciando corrección global CC notrans...');
walk(CHAP_DIR);
console.log(`\n✓ Corregidos ${totalFixed} tokens CC en ${filesFixed} archivos`);
