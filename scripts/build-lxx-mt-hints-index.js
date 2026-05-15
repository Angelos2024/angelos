#!/usr/bin/env node
/*
 * Indice liviano de cobertura IdiomaORIGEN/lxx-mt-word-hints/chapters/<slug>/<n>.json
 * frente al manifest interlineal (capitulos esperados por libro).
 *
 * Salida: IdiomaORIGEN/lxx-mt-hints-index.min.json
 *
 * Uso:
 *   node scripts/build-lxx-mt-hints-index.js
 *
 * Desde build-bible-indices.js (tras generar manifest) con el objeto manifest en memoria:
 *   const { buildLxxMtHintsIndex } = require('./build-lxx-mt-hints-index.js');
 *   buildLxxMtHintsIndex({ manifest, root: ROOT });
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_OUT = path.join(ROOT, 'IdiomaORIGEN', 'lxx-mt-hints-index.min.json');

function safeParseChapterHints(fp){
  try{
    const raw = fs.readFileSync(fp, 'utf8');
    const j = JSON.parse(raw);
    const verses = j && j.verses && typeof j.verses === 'object' ? j.verses : {};
    return {
      verseKeys: Object.keys(verses).length,
      bytes: Buffer.byteLength(raw, 'utf8')
    };
  }catch(_e){
    return { verseKeys: 0, bytes: 0 };
  }
}

/**
 * @param {object} opts
 * @param {object} opts.manifest - manifest visto en IdiomaORIGEN/manifest.json
 * @param {string} [opts.root]
 * @param {string} [opts.outPath]
 */
function buildLxxMtHintsIndex(opts = {}){
  const root = opts.root || ROOT;
  const manifest = opts.manifest;
  const outPath = opts.outPath || DEFAULT_OUT;
  const hintsBase = path.join(root, 'IdiomaORIGEN', 'lxx-mt-word-hints', 'chapters');

  if(!manifest || !Array.isArray(manifest.bookOrder) || !manifest.books){
    throw new Error('buildLxxMtHintsIndex: manifest invalido (falta bookOrder o books)');
  }

  let totalExpectedChapters = 0;
  let totalHintChapterFiles = 0;
  let totalMissingChapters = 0;
  let totalVersesIndexed = 0;
  let totalBytes = 0;
  const books = {};
  const booksWithGaps = [];

  for(const slug of manifest.bookOrder){
    const info = manifest.books[slug] || {};
    const expectedMax = Number(info.chapters);
    const expected = Number.isFinite(expectedMax) && expectedMax >= 1 ? Math.floor(expectedMax) : 0;
    totalExpectedChapters += expected;

    const bookDir = path.join(hintsBase, slug);
    const present = [];
    let bytes = 0;
    let versesSum = 0;

    if(fs.existsSync(bookDir)){
      for(const ent of fs.readdirSync(bookDir, { withFileTypes: true })){
        if(!ent.isFile() || !/^\d+\.json$/i.test(ent.name)) continue;
        const n = Number(path.basename(ent.name, '.json'));
        if(!Number.isFinite(n) || n < 1) continue;
        const fp = path.join(bookDir, ent.name);
        const st = safeParseChapterHints(fp);
        versesSum += st.verseKeys;
        bytes += st.bytes;
        present.push(n);
      }
    }

    present.sort((a, b) => a - b);
    const presentSet = new Set(present);
    const missingChapters = [];
    if(expected >= 1){
      for(let c = 1; c <= expected; c += 1){
        if(!presentSet.has(c)) missingChapters.push(c);
      }
    }
    const extraChapters = present.filter((c) => expected < 1 || c > expected);

    totalHintChapterFiles += present.length;
    totalVersesIndexed += versesSum;
    totalBytes += bytes;

    books[slug] = {
      label: info.label || slug,
      chaptersExpected: expected,
      chapterFiles: present.length,
      chaptersPresent: present,
      missingChapters,
      extraChapters,
      versesWithHints: versesSum,
      bytes
    };

    totalMissingChapters += missingChapters.length;

    if(missingChapters.length){
      booksWithGaps.push({
        slug,
        label: info.label || slug,
        missingCount: missingChapters.length,
        missingChapters
      });
    }
  }

  const chaptersCovered = Math.max(0, totalExpectedChapters - totalMissingChapters);
  const coverageChapterPct = totalExpectedChapters > 0
    ? Math.round((chaptersCovered / totalExpectedChapters) * 10000) / 100
    : 0;

  const payload = {
    schema: 'lxx-mt-hints-index-v1',
    version: manifest.version || null,
    generatedAt: new Date().toISOString(),
    basePath: 'IdiomaORIGEN/lxx-mt-word-hints/chapters',
    summary: {
      booksInManifest: manifest.bookOrder.length,
      totalChaptersExpected: totalExpectedChapters,
      totalChaptersMissing: totalMissingChapters,
      totalHintChapterFiles,
      chaptersCovered,
      coverageChapterPct,
      totalVersesWithHints: totalVersesIndexed,
      totalBytes,
      booksWithMissingChapters: booksWithGaps.length
    },
    books,
    booksWithGaps
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(payload), 'utf8');
  return { payload, outPath, byteLength: Buffer.byteLength(JSON.stringify(payload), 'utf8') };
}

function formatBytes(bytes){
  if(bytes < 1024) return `${bytes} B`;
  if(bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function main(){
  const manifestPath = path.join(ROOT, 'IdiomaORIGEN', 'manifest.json');
  if(!fs.existsSync(manifestPath)){
    console.error('Falta', manifestPath, '— ejecuta antes scripts/build-bible-indices.js');
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const { outPath, byteLength, payload } = buildLxxMtHintsIndex({ manifest, root: ROOT });
  console.log(`Escrito ${path.relative(ROOT, outPath)} (${formatBytes(byteLength)}).`);
  console.log(`  Cobertura capítulos (frente al manifest): ${payload.summary.coverageChapterPct}% (${payload.summary.chaptersCovered}/${payload.summary.totalChaptersExpected} con pista; ${payload.summary.totalHintChapterFiles} archivos en disco).`);
  if(payload.booksWithGaps.length){
    console.log(`  Libros con capítulos sin archivo de pistas: ${payload.booksWithGaps.length}`);
    for(const b of payload.booksWithGaps.slice(0, 12)){
      console.log(`    – ${b.slug}: faltan ${b.missingCount} (${b.missingChapters.slice(0, 8).join(', ')}${b.missingChapters.length > 8 ? '…' : ''})`);
    }
    if(payload.booksWithGaps.length > 12){
      console.log(`    … y ${payload.booksWithGaps.length - 12} más.`);
    }
  }
}

module.exports = { buildLxxMtHintsIndex };

if(require.main === module){
  main();
}
