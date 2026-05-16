/**
 * Corrige instancias de H6213 (עָשָׂה, raíz ע-ש-ה "hacer") donde el interlineal almacena
 * una forma compuesta del tipo "había ← hecho" (pluscuamperfecto auxiliar español) en lugar
 * de la traducción directa del Qal Perfecto: "hizo / hiciste / hicieron…".
 *
 * El Qal Perfecto de H6213 es un tiempo completado simple; en el interlineal
 * cada token hebreo debe recibir su glosa directa, no la forma perifrástica del español
 * moderno.
 *
 * Mapeo morfológico → glosa correcta:
 *   VqAsSM3 / VqAsSF3 (3ª m/f sg)   → "hizo"
 *   VqAsSM2 / VqAsSF2 (2ª m/f sg)   → "hiciste"
 *   VqAsSC1 / VqAsSM1 (1ª sg)       → "hice"
 *   VqAsPC3 (3ª pl)                  → "hicieron"
 *   VqAsPC2 (2ª pl)                  → "hicisteis"
 *   VqAsPC1 (1ª pl)                  → "hicimos"
 *
 * El campo `added` (con flechas del tipo "← hecho") se elimina ya que es parte del auxiliar
 * compuesto que se está desarmando; el `marks` asociado también se limpia.
 */
const fs = require('fs');
const path = require('path');

const INTER_ROOT = path.resolve(__dirname, '..', 'IdiomaORIGEN', 'interlineal', 'chapters');

const QAL_PERFECT_DIRECT_MAP = {
  // 3ª persona
  VqAsSM3: 'hizo',
  VqAsSF3: 'hizo',
  // 2ª persona
  VqAsSM2: 'hiciste',
  VqAsSF2: 'hiciste',
  // 1ª persona singular
  VqAsSC1: 'hice',
  VqAsSM1: 'hice',
  // Plural 3ª
  VqAsPC3: 'hicieron',
  VqAsPM3: 'hicieron',
  VqAsPF3: 'hicieron',
  // Plural 2ª
  VqAsPC2: 'hicisteis',
  VqAsPM2: 'hicisteis',
  // Plural 1ª
  VqAsPC1: 'hicimos'
};

function isQalPerfectHabiaMorphs(morphs){
  const m = Array.isArray(morphs) ? morphs[0] : String(morphs || '');
  return /^VqAs/.test(m);
}

function esIsHabiaCast(es){
  const first = Array.isArray(es) ? String(es[0] || '') : String(es || '');
  return /^hab/i.test(first.trim());
}

function addedLooksLikePastParticiple(added){
  if(!added) return false;
  const s = Array.isArray(added) ? added.join(' ') : String(added || '');
  // contiene "←" (indica palabra añadida por traducción compuesta)
  return s.includes('←');
}

function resolveDirectGloss(morphs){
  const m = Array.isArray(morphs) ? morphs[0] : String(morphs || '');
  // Buscar coincidencia exacta primero
  if(QAL_PERFECT_DIRECT_MAP[m]) return QAL_PERFECT_DIRECT_MAP[m];
  // Fallback por persona/número
  if(/VqAs[SC]M3|VqAsSF3/.test(m)) return 'hizo';
  if(/VqAs[SC]M2|VqAsSF2/.test(m)) return 'hiciste';
  if(/VqAs[SC]C1|VqAsSM1/.test(m)) return 'hice';
  if(/VqAs[PC]C3|VqAsP[MF]3/.test(m)) return 'hicieron';
  if(/VqAs[PC]C2|VqAsP[MF]2/.test(m)) return 'hicisteis';
  if(/VqAs[PC]C1|VqAsP[MF]1/.test(m)) return 'hicimos';
  return null;
}

function processFile(filePath){
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let changed = 0;

  for(const [vKey, verse] of Object.entries(data)){
    if(!verse || !Array.isArray(verse.tokens)) continue;
    for(const tok of verse.tokens){
      if(tok.strongs !== 'H6213') continue;
      if(!isQalPerfectHabiaMorphs(tok.morphs)) continue;
      if(!esIsHabiaCast(tok.es)) continue;
      if(!addedLooksLikePastParticiple(tok.added)) continue;

      const direct = resolveDirectGloss(tok.morphs);
      if(!direct) continue;

      tok.es = direct;
      delete tok.added;
      delete tok.marks;
      changed += 1;
    }
  }

  if(changed > 0){
    fs.writeFileSync(filePath, JSON.stringify(data) + '\n', 'utf8');
    const rel = path.relative(INTER_ROOT, filePath);
    console.log(`  ${rel}: ${changed} token(s) corregidos`);
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
  console.log(`Total tokens H6213 corregidos: ${total}`);
}else{
  console.error('No se encontró la carpeta interlineal:', INTER_ROOT);
}
