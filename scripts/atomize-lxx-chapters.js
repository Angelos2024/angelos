#!/usr/bin/env node
/*
 * Atomiza cada libro LXX Rahlfs (lxx_rahlfs_1935_*.json) en archivos por capítulo:
 *   LXX/chapters/<Edition>/<numero>.json
 *
 * Contrato: cada archivo lleva `verses` = mapa versículo→tokens (array griego).
 * Si no existen los fragmentos, el cargador puede caer al JSON completo del libro.
 *
 * Uso:
 *   node scripts/atomize-lxx-chapters.js
 *   CLEAN_LXX_CHAPTERS=1 node scripts/atomize-lxx-chapters.js   # borra LXX/chapters antes
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LXX_DIR = path.join(ROOT, 'LXX');
const OUT_DIR = path.join(LXX_DIR, 'chapters');
const MANIFEST_OUT = path.join(LXX_DIR, 'lxx-chapters-manifest.json');

function safeReadJson(filePath){
  if(!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch(error){
    console.error(`  ! No se pudo parsear ${filePath}: ${error.message}`);
    return null;
  }
}

function chapterNumFromKey(key){
  const n = Number(key);
  return Number.isFinite(n) && n >= 1 ? n : 0;
}

function ensureEditionDir(bookCode){
  const dir = path.join(OUT_DIR, bookCode);
  if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function wipeChaptersRoot(){
  if(fs.existsSync(OUT_DIR)){
    fs.rmSync(OUT_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function main(){
  const clean = process.env.CLEAN_LXX_CHAPTERS === '1';
  if(!fs.existsSync(LXX_DIR)){
    console.error('No existe carpeta LXX/, abortando.');
    process.exit(1);
  }

  if(clean){
    console.log('[atomize-lxx] Limpiando', OUT_DIR);
    wipeChaptersRoot();
  } else if(!fs.existsSync(OUT_DIR)){
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const manifest = {
    schema: 'lxx-chapters-manifest-v1',
    generated: new Date().toISOString().slice(0, 16).replace('T', ' ') + 'Z',
    basePath: 'LXX/chapters',
    editions: {}
  };

  let fileCount = 0;
  let byteTotal = 0;
  const files = fs.readdirSync(LXX_DIR).filter((name) =>
    /^lxx_rahlfs_1935_[A-Za-z0-9_-]+\.json$/i.test(name)
  ).sort();

  if(!files.length){
    console.error('No hay archivos lxx_rahlfs_1935_*.json en LXX/');
    process.exit(1);
  }

  for(const fname of files){
    const fp = path.join(LXX_DIR, fname);
    const data = safeReadJson(fp);
    if(!data || typeof data.text !== 'object'){
      console.warn(`  ! Sin data.text válido: ${fname}`);
      continue;
    }

    for(const [edition, chaptersObjRaw] of Object.entries(data.text)){
      if(!chaptersObjRaw || typeof chaptersObjRaw !== 'object'){
        console.warn(`  ! Edición ${edition}: capítulos no objeto (${fname})`);
        continue;
      }

      ensureEditionDir(edition);
      const chapterCounts = [];

      for(const chKey of Object.keys(chaptersObjRaw)){
        const chNum = chapterNumFromKey(chKey);
        if(!chNum) continue;

        const verses = chaptersObjRaw[chKey];
        if(!verses || typeof verses !== 'object'){
          continue;
        }

        const meta = data.meta && typeof data.meta === 'object' ? data.meta : null;
        const parentMetaSlug = meta
          ? {
            source: meta.source || null,
            license: meta.license || null,
            schema: meta.schema || null
          }
          : null;

        const payload = {
          _schema: 'lxx-chapter-v1',
          edition,
          chapter: chNum,
          sourceFile: fname,
          parentMeta: parentMetaSlug,
          verses
        };

        const body = JSON.stringify(payload);
        const outPath = path.join(OUT_DIR, edition, `${chNum}.json`);
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, body);
        fileCount += 1;
        byteTotal += Buffer.byteLength(body, 'utf8');
        chapterCounts.push(chNum);
      }

      if(chapterCounts.length){
        const maxCh = Math.max.apply(null, chapterCounts);
        manifest.editions[edition] = {
          sourceFile: fname,
          chaptersWritten: chapterCounts.length,
          chapterMaxSeen: maxCh
        };
      }
    }

    console.log(`  ✓ ${fname}`);
  }

  fs.writeFileSync(MANIFEST_OUT, JSON.stringify(manifest, null, 2));

  console.log(`
[atomize-lxx] Terminado
  Fragmentos escritos : ${fileCount}
  Bytes aproximados : ${Math.round(byteTotal / 1024)} KiB
  Manifest          : ${path.relative(ROOT, MANIFEST_OUT)}
  Salida           : ${path.relative(ROOT, OUT_DIR)}
`);
}

main();

