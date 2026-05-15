#!/usr/bin/env node
'use strict';

/**
 * Genera todos los capitulos `lxx-mt-word-hints` para un libro AT desde un CATSS .par ya parseado.
 *
 * Requiere:
 *   - JSON parseado (parse-catss-par.js --out ...)
 *   - Capitulos interlineales en IdiomaORIGEN/interlineal/chapters/<carpeta>/
 *   - Capitulos LXX atomizados en LXX/chapters/<codigoRahlfs>/
 *
 * Ejemplo:
 *   node scripts/batch-catss-hints-book.js ^
 *     --parsed catss-parsed/exodus.full.json ^
 *     --slug exodo ^
 *     --lxxBook Exod ^
 *     --interlinearDir "IdiomaORIGEN/interlineal/chapters/02_Éxodo"
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

function parseArgs(argv){
  const o = {};
  for(let i = 2; i < argv.length; i += 2){
    const k = argv[i];
    const v = argv[i + 1];
    if(!k || k[0] !== '-') break;
    o[k.replace(/^--/, '')] = v;
  }
  return o;
}

function ensureDir(p){
  fs.mkdirSync(p, { recursive: true });
}

function readShiftCfg(absPath){
  try{
    return JSON.parse(fs.readFileSync(absPath, 'utf8'));
  }catch(_e){
    return { chapters: {} };
  }
}

/** Fusiona varios `N.json` masoréticos en un objeto con claves `capituloMT:verso` (p. ej. 1 Esdras vs Esdras MT). */
function mergeInterlinearByMtChapters(interAbs, mtChapterNums){
  const merged = {};
  const list = Array.isArray(mtChapterNums) ? mtChapterNums : [];
  for(const mc of list){
    const n = Number(mc);
    if(!Number.isFinite(n) || n < 1) continue;
    const jp = path.join(interAbs, `${n}.json`);
    if(!fs.existsSync(jp)){
      console.warn(`[warn] merge interlineal: no existe ${jp}`);
      continue;
    }
    const j = JSON.parse(fs.readFileSync(jp, 'utf8'));
    for(const [k, v] of Object.entries(j)){
      if(/^\d+$/.test(k)) merged[`${n}:${k}`] = v;
    }
  }
  return merged;
}

function main(){
  const args = parseArgs(process.argv);
  const parsedPath = args.parsed;
  const slug = args.slug;
  const lxxBook = args.lxxBook;
  const interlinearDir = args.interlinearDir;
  const shiftPath = args.shift || 'IdiomaORIGEN/lxx-mt-verse-shift.min.json';
  const sliceDir = args.sliceDir || path.join(ROOT, 'catss-parsed');
  const dryRun = args.dryRun === '1' || args.dryRun === 'true';

  if(!parsedPath || !slug || !lxxBook || !interlinearDir){
    console.error('Uso: node scripts/batch-catss-hints-book.js --parsed <full.json> --slug exodo --lxxBook Exod --interlinearDir "IdiomaORIGEN/interlineal/chapters/02_Éxodo" [--shift ...] [--dryRun 1]');
    process.exit(1);
  }

  const parsedAbs = path.isAbsolute(parsedPath) ? parsedPath : path.join(ROOT, parsedPath);
  const parsed = JSON.parse(fs.readFileSync(parsedAbs, 'utf8'));
  const chaptersCatss = new Set();
  for(const v of parsed.verses || []){
    const c = Number(v.chapter);
    if(Number.isFinite(c)){ chaptersCatss.add(c); }
  }

  const interAbs = path.isAbsolute(interlinearDir) ? interlinearDir : path.join(ROOT, interlinearDir);
  const chaptersDisk = new Set();
  for(const ent of fs.readdirSync(interAbs, { withFileTypes: true })){
    if(!ent.isFile() || !/^\d+\.json$/i.test(ent.name)) continue;
    chaptersDisk.add(Number(path.basename(ent.name, '.json')));
  }

  const chapters = [...chaptersCatss].filter((c) => chaptersDisk.has(c)).sort((a, b) => a - b);
  const missingInter = [...chaptersCatss].filter((c) => !chaptersDisk.has(c)).sort((a, b) => a - b);
  const missingCatss = [...chaptersDisk].filter((c) => !chaptersCatss.has(c)).sort((a, b) => a - b);

  console.log(`Libro ${slug}: capitulos a generar (${chapters.length}):`, chapters.join(', ') || '(ninguno)');
  if(missingInter.length){
    console.warn(`[warn] CATSS tiene capitulos sin JSON interlineal local:`, missingInter.join(', '));
  }
  if(missingCatss.length){
    console.warn(`[warn] Hay JSON interlineal sin versos CATSS en este .parsed (omitidos):`, missingCatss.join(', '));
  }

  ensureDir(sliceDir);
  const genScript = path.join(ROOT, 'scripts', 'generate-catss-hints.js');
  const shiftResolved = path.isAbsolute(shiftPath)
    ? shiftPath
    : path.join(ROOT, shiftPath.replace(/^\.\//, ''));
  const shiftCfg = readShiftCfg(shiftResolved);
  const lxxChapterOffset = Number(shiftCfg.bookSlugRules?.[slug]?.lxxFileChapterOffset);
  const lxxChapterOffsetN = Number.isFinite(lxxChapterOffset) ? lxxChapterOffset : 0;
  let ok = 0;
  let fail = 0;
  let skippedShift = 0;

  for(const ch of chapters){
    const slicePayload = {
      _schema: parsed._schema || 'catss-par-parsed-v1',
      _source: parsed._source,
      _file: parsed._file,
      _book: parsed._book,
      verseCount: 0,
      verses: (parsed.verses || []).filter((v) => Number(v.chapter) === ch)
    };
    slicePayload.verseCount = slicePayload.verses.length;

    const slicePath = path.join(sliceDir, `_slice-${slug}-${ch}.json`);
    fs.writeFileSync(slicePath, JSON.stringify(slicePayload), 'utf8');

    const chapterKey = `${slug}::${ch}`;
    const chRule = shiftCfg.chapters?.[chapterKey] || {};
    if(chRule.skipHints){
      console.log(`[skip cap ${ch}] skipHints (${chapterKey})`);
      const outJsonStale = path.join(ROOT, 'IdiomaORIGEN', 'lxx-mt-word-hints', 'chapters', slug, `${ch}.json`);
      if(fs.existsSync(outJsonStale)){
        try{
          fs.unlinkSync(outJsonStale);
          console.log(`[skip cap ${ch}] eliminado hints obsoleto`);
        }catch(_e){ /* */ }
      }
      try{ fs.unlinkSync(slicePath); }catch(_e){ /* */ }
      skippedShift += 1;
      continue;
    }

    let interJson = path.join(interAbs, `${ch}.json`);
    let mergePath = null;
    if(Array.isArray(chRule.interlinearMtChapters) && chRule.interlinearMtChapters.length){
      const merged = mergeInterlinearByMtChapters(interAbs, chRule.interlinearMtChapters);
      mergePath = path.join(sliceDir, `_intermerge-${slug}-${ch}.json`);
      fs.writeFileSync(mergePath, JSON.stringify(merged), 'utf8');
      interJson = mergePath;
    }

    const lxxOverride = Number(chRule.lxxFileChapter);
    const lxxFileChapter = Number.isFinite(lxxOverride) && lxxOverride >= 1
      ? lxxOverride
      : ch + lxxChapterOffsetN;
    const lxxJson = path.join(ROOT, 'LXX', 'chapters', lxxBook, `${lxxFileChapter}.json`);
    const outJson = path.join(ROOT, 'IdiomaORIGEN', 'lxx-mt-word-hints', 'chapters', slug, `${ch}.json`);

    if(!fs.existsSync(lxxJson)){
      const via = Number.isFinite(lxxOverride) && lxxOverride >= 1
        ? `override lxxFileChapter=${lxxFileChapter}`
        : `CATSS ${ch} + offset ${lxxChapterOffsetN}`;
      console.error(`[skip cap ${ch}] no existe LXX: ${lxxJson} (${via} -> cap.LXX ${lxxFileChapter})`);
      fail += 1;
      continue;
    }

    ensureDir(path.dirname(outJson));

    if(dryRun){
      console.log(`[dryRun] capitulo ${ch} -> ${outJson}`);
      ok += 1;
      continue;
    }

    const r = spawnSync(process.execPath, [
      genScript,
      '--catss', slicePath,
      '--interlinear', interJson,
      '--lxx', lxxJson,
      '--slug', slug,
      '--chapter', String(ch),
      '--shift', shiftResolved,
      '--out', outJson
    ], { encoding: 'utf8', cwd: ROOT });

    if(r.status !== 0){
      console.error(`[fallo cap ${ch}]`, r.stderr || r.stdout);
      try{ fs.unlinkSync(slicePath); }catch(_e){ /* */ }
      if(mergePath){
        try{ fs.unlinkSync(mergePath); }catch(_e){ /* */ }
      }
      fail += 1;
    }else{
      try{ fs.unlinkSync(slicePath); }catch(_e){ /* opcional */ }
      if(mergePath){
        try{ fs.unlinkSync(mergePath); }catch(_e){ /* */ }
      }
      const repLine = (r.stdout || '').split('\n').find((l) => l.includes('Pares emparejados'));
      console.log(`cap ${ch}:`, repLine || '(sin salida)');
      ok += 1;
    }
  }

  console.log(`Hecho ${slug}: ok=${ok} fallos=${fail} omitidosShift=${skippedShift}`);
  if(fail){ process.exit(1); }
}

main();
