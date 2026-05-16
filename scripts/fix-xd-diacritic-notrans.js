/**
 * Recorre todos los archivos interlineales JSON y marca como `notrans:"s/t"` (y elimina `es`)
 * los tokens cuyo `orig` es EXCLUSIVAMENTE marcas diacríticas/vocalizaciones sin ninguna letra
 * consonante hebrea (U+05D0–U+05EA).
 *
 * Estos tokens aparecen cuando la raíz OSHB separa el artículo fusionado en preposiciones
 * del tipo לָ → ל (PL) + ָ (XD). El XD diacrítico no representa un texto hebreo independiente
 * y no debe atraer artículos griegos ni glosas españolas.
 *
 * Modo idempotente: si ya tiene notrans:"s/t" y no tiene es, lo salta.
 */
const fs = require('fs');
const path = require('path');

const INTER_ROOT = path.resolve(__dirname, '..', 'IdiomaORIGEN', 'interlineal', 'chapters');

// Consonantes hebreas U+05D0–U+05EA
function hasHebrewConsonant(str){
  return /[\u05D0-\u05EA]/.test(String(str || ''));
}

function processFile(filePath){
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let changed = 0;

  for(const [vKey, verse] of Object.entries(data)){
    if(!verse || !Array.isArray(verse.tokens)) continue;
    for(const tok of verse.tokens){
      const orig = Array.isArray(tok.orig) ? tok.orig.join('') : String(tok.orig || '');
      if(!orig.trim()) continue;
      if(hasHebrewConsonant(orig)) continue;
      // orig es solo diacríticos, vocales o puntuación: marcar notrans
      if(tok.notrans === 's/t' && !tok.es) continue; // ya correcto
      tok.notrans = 's/t';
      delete tok.es;
      changed += 1;
    }
  }

  if(changed > 0){
    fs.writeFileSync(filePath, JSON.stringify(data) + '\n', 'utf8');
    console.log(`  ${path.relative(INTER_ROOT, filePath)}: ${changed} token(s) marcados`);
  }
  return changed;
}

let total = 0;
function walk(dir){
  for(const entry of fs.readdirSync(dir, { withFileTypes: true })){
    const full = path.join(dir, entry.name);
    if(entry.isDirectory()){
      walk(full);
    }else if(entry.name.endsWith('.json')){
      total += processFile(full);
    }
  }
}

if(fs.existsSync(INTER_ROOT)){
  walk(INTER_ROOT);
  console.log(`Total de tokens marcados como notrans: ${total}`);
}else{
  console.error('No se encontró la carpeta interlineal:', INTER_ROOT);
}
