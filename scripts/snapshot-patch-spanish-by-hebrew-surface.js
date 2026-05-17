/**
 * Asigna la misma glosa española a todos los segmentos cuyo campo `hebrew`
 * coincide exactamente con una superficie (Unicode NFC + trim).
 *
 * Uso:
 *   node scripts/snapshot-patch-spanish-by-hebrew-surface.js "אֱלֹהִים" "Elohim"
 *   node scripts/snapshot-patch-spanish-by-hebrew-surface.js "אֱלֹהִים" "Elohim" --dry-run
 */
'use strict';

const fs = require('fs');
const path = require('path');

const REPO = path.join(__dirname, '..');
const CHAPTERS_DIR = path.join(
  REPO,
  'IdiomaORIGEN',
  'interlinear-snapshot',
  'chapters'
);

function walkJsonFiles(dir){
  const out = [];
  for(const ent of fs.readdirSync(dir, { withFileTypes: true })){
    const p = path.join(dir, ent.name);
    if(ent.isDirectory()) out.push(...walkJsonFiles(p));
    else if(ent.name.endsWith('.json')) out.push(p);
  }
  return out;
}

const dryRun = process.argv.includes('--dry-run');
const args = process.argv.slice(2).filter((a) => a !== '--dry-run');
const HE_TARGET = String(args[0] || '').normalize('NFC').trim();
const NEW_GLOSS = args[1] ?? '';

if(!HE_TARGET || NEW_GLOSS === ''){
  console.error(
    'Uso: node scripts/snapshot-patch-spanish-by-hebrew-surface.js "<hebreo>" "<glosa española>" [--dry-run]'
  );
  process.exit(1);
}

let filesTouched = 0;
let segmentsTouched = 0;

for(const file of walkJsonFiles(CHAPTERS_DIR)){
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  if(doc.schema !== 'interlinear-snapshot-chapter-v1') continue;
  let dirty = false;
  const verses = doc.verses || {};
  for(const vk of Object.keys(verses)){
    const segs = verses[vk]?.segments || [];
    for(const seg of segs){
      if(!seg) continue;
      const he = String(seg.hebrew || '').normalize('NFC').trim();
      if(he !== HE_TARGET) continue;
      if(String(seg.spanish || '') === NEW_GLOSS) continue;
      if(!dryRun) seg.spanish = NEW_GLOSS;
      dirty = true;
      segmentsTouched++;
    }
  }
  if(dirty){
    filesTouched++;
    if(!dryRun){
      fs.writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
    }
  }
}

console.log(
  JSON.stringify(
    {
      dryRun,
      hebrewTarget: HE_TARGET,
      newGloss: NEW_GLOSS,
      filesTouched,
      segmentsTouched
    },
    null,
    2
  )
);
