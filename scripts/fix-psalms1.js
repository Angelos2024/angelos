/**
 * Correcciones de datos para Salmos 1:1-6:
 * 1. Re-ordena tokens por `num` (orden canónico del texto hebreo)
 * 2. Elimina notrans incorrecto de conjunciones CC waw
 * 3. Corrige glosas españolas específicas
 * 4. Marca artículos XD solitarios como notrans
 */
const fs = require('fs');
const path = require('path');

const PSALMS1 = path.resolve(
  __dirname, '..', 'IdiomaORIGEN', 'interlineal', 'chapters', '19_Salmos', '1.json'
);

const data = JSON.parse(fs.readFileSync(PSALMS1, 'utf8'));

// ─── helpers ────────────────────────────────────────────────────────────────

function sortTokensByNum(tokens) {
  return [...tokens].sort((a, b) => {
    const na = a.num == null ? -1 : parseFloat(String(a.num).split(',')[0]);
    const nb = b.num == null ? -1 : parseFloat(String(b.num).split(',')[0]);
    if (isNaN(na) && isNaN(nb)) return 0;
    if (isNaN(na)) return -1;
    if (isNaN(nb)) return 1;
    return na - nb;
  });
}

function fixToken(tokens, num, patch) {
  const t = tokens.find(x => String(x.num) === String(num));
  if (!t) { console.warn('  ⚠ token num', num, 'not found'); return; }
  const toDelete = patch._delete || [];
  const cleanPatch = Object.fromEntries(Object.entries(patch).filter(([k]) => k !== '_delete'));
  Object.assign(t, cleanPatch);
  toDelete.forEach(k => delete t[k]);
}

// ─── verse 1 ─────────────────────────────────────────────────────────────────
{
  const v = data['1'];
  v.tokens = sortTokensByNum(v.tokens);
  console.log('v1: tokens sorted by num');

  // הָ XD (artículo solo, absorbe al sustantivo) → notrans
  fixToken(v.tokens, '2', { notrans: 's/t', _delete: ['es'] });
  console.log('v1: הָ (num:2) → notrans');

  // וּ CC conjunciones incorrectamente silenciadas
  fixToken(v.tokens, '10', { es: 'y', _delete: ['notrans'] });
  fixToken(v.tokens, '16', { es: 'y', _delete: ['notrans'] });
  console.log('v1: וּ num:10,16 → es:"y", sin notrans');

  // יָשָׁב VqAsSM3 "sentado" → "se sentó"
  fixToken(v.tokens, '21', { es: 'se sentó;' });
  console.log('v1: יָשָׁב (num:21) → "se sentó;"');

  // לֹא num:20 no debe tener es mayúscula extra
  fixToken(v.tokens, '20', { es: 'no', _delete: ['added', 'marks'] });
}

// ─── verse 2 ─────────────────────────────────────────────────────────────────
{
  const v = data['2'];

  // כִּי (sin num, sin morphs, sin strongs): añadir num:"0", morphs, strongs para que ordene primero
  const ki = v.tokens.find(x => !x.num && !x.morphs && !x.strongs);
  if (ki) {
    ki.num = '0';
    ki.morphs = 'CK';
    ki.strongs = 'H3588';
    // No es (el bloque אִם ya lleva "Sino que")
    console.log('v2: כִּי → num:0, CK, H3588');
  } else {
    console.warn('v2: כִּי no encontrado');
  }

  v.tokens = sortTokensByNum(v.tokens);
  console.log('v2: tokens sorted');

  // Lowercase "Y" en וּ num:7
  fixToken(v.tokens, '7', { es: 'y' });

  // Asegurar que וָ (num:13) tenga morph CC
  fixToken(v.tokens, '13', { morphs: 'CC', _delete: ['added', 'marks'] });
  console.log('v2: וָ num:13 → CC');
}

// ─── verse 3 ─────────────────────────────────────────────────────────────────
{
  const v = data['3'];
  v.tokens = sortTokensByNum(v.tokens);
  console.log('v3: tokens sorted');

  // וְ (Cc/CC num:1) con notrans incorrecto → es:"y"
  fixToken(v.tokens, '1', { morphs: 'CC', es: 'y', _delete: ['notrans'] });
  console.log('v3: וְ num:1 → es:"y", sin notrans');
}

// ─── verse 4 ─────────────────────────────────────────────────────────────────
{
  const v = data['4'];

  // כִּי (sin num, sin morphs, sin strongs): debe ir entre הָרְשָׁעִים (num:4) y אִם (num:5)
  const ki = v.tokens.find(x => !x.num && !x.morphs && !x.strongs);
  if (ki) {
    ki.num = '4.5';
    ki.morphs = 'CK';
    ki.strongs = 'H3588';
    console.log('v4: כִּי → num:4.5, CK');
  } else {
    console.warn('v4: כִּי no encontrado');
  }

  v.tokens = sortTokensByNum(v.tokens);
  console.log('v4: tokens sorted');

  // הָ XD num:3 (ART fantasma) → notrans
  fixToken(v.tokens, '3', { notrans: 's/t', _delete: ['es'] });
  console.log('v4: הָ num:3 → notrans');

  // אִם (H3588, CC num:5) funciona como "sino" en כִּי אִם adversativo
  fixToken(v.tokens, '5', { morphs: 'CC', es: 'sino' });
  console.log('v4: אִם num:5 → es:"sino"');
}

// ─── verse 5 ─────────────────────────────────────────────────────────────────
{
  const v = data['5'];
  v.tokens = sortTokensByNum(v.tokens);
  console.log('v5: tokens sorted');

  // XD ַ num:7 ya tiene notrans (correcto, no cambiar)
  // וְ num:9 tiene es:["Ni","los"] — simplificar a "ni"
  fixToken(v.tokens, '9', { es: 'ni', _delete: ['added', 'marks'] });
  console.log('v5: וְ num:9 → es:"ni"');
}

// ─── verse 6 (sin errores según el usuario) ──────────────────────────────────
{
  const v = data['6'];
  v.tokens = sortTokensByNum(v.tokens);
  console.log('v6: tokens sorted');
}

// ─── guardar ─────────────────────────────────────────────────────────────────
fs.writeFileSync(PSALMS1, JSON.stringify(data) + '\n', 'utf8');
console.log('\n✓ Salmos 1.json guardado');
