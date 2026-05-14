#!/usr/bin/env node
/*
 * Genera los índices que consume el modo admin de la biblia interlineal:
 *
 *   IdiomaORIGEN/manifest.json
 *     Resumen liviano por libro (label, archivo, total de capítulos y
 *     versículos por capítulo). Permite poblar el menú sin descargar
 *     libros completos.
 *
 *   IdiomaORIGEN/morph-index.min.json
 *     Mapas precomputados (byStrong, byPointed, byPlain) extraídos de
 *     diccionario/diccionario_unificado.min.json. Reemplaza el
 *     reindexado runtime que hacía admin-morfologia.js.
 *
 *   IdiomaORIGEN/interlineal/chapters/<base>/<N>.json
 *   IdiomaORIGEN/oshb-morph/chapters/<base>/<N>.json
 *     Atomización por capítulo (Tanda 3). admin-morfologia.js los pide
 *     uno a uno cuando el manifest los anuncia, evitando descargar
 *     libros completos.
 *
 * Uso:
 *   node scripts/build-bible-indices.js
 *   DATA_VERSION=2026-05-14 node scripts/build-bible-indices.js
 *   SKIP_CHAPTERS=1 node scripts/build-bible-indices.js    # solo manifest + morph-index
 *
 * Si el diccionario fuente no existe, sólo se genera el manifest y se
 * informa por consola. admin-morfologia.js cae en su ruta legada en ese
 * caso, así que el sitio sigue funcionando.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const INTERLINEAL_DIR = path.join(ROOT, 'IdiomaORIGEN', 'interlineal');
const OSHB_DIR = path.join(ROOT, 'IdiomaORIGEN', 'oshb-morph');
const DICT_PATH = path.join(ROOT, 'diccionario', 'diccionario_unificado.min.json');
const OUTPUT_DIR = path.join(ROOT, 'IdiomaORIGEN');
const MANIFEST_PATH = path.join(OUTPUT_DIR, 'manifest.json');
const MORPH_INDEX_PATH = path.join(OUTPUT_DIR, 'morph-index.min.json');

const DATA_VERSION = process.env.DATA_VERSION
  || new Date().toISOString().slice(0, 10);

const OT_BOOKS = [
  ['genesis', 'Génesis', '01_Génesis.json'],
  ['exodo', 'Éxodo', '02_Éxodo.json'],
  ['levitico', 'Levítico', '03_Levítico.json'],
  ['numeros', 'Números', '04_Números.json'],
  ['deuteronomio', 'Deuteronomio', '05_Deuteronomio.json'],
  ['josue', 'Josué', '06_Josué.json'],
  ['jueces', 'Jueces', '07_Jueces.json'],
  ['rut', 'Rut', '08_Rut.json'],
  ['1_samuel', '1 Samuel', '09_1_Samuel.json'],
  ['2_samuel', '2 Samuel', '10_2_Samuel.json'],
  ['1_reyes', '1 Reyes', '11_1_Reyes.json'],
  ['2_reyes', '2 Reyes', '12_2_Reyes.json'],
  ['1_cronicas', '1 Crónicas', '13_1_Crónicas.json'],
  ['2_cronicas', '2 Crónicas', '14_2_Crónicas.json'],
  ['esdras', 'Esdras', '15_Esdras.json'],
  ['nehemias', 'Nehemías', '16_Nehemías.json'],
  ['ester', 'Ester', '17_Ester.json'],
  ['job', 'Job', '18_Job.json'],
  ['salmos', 'Salmos', '19_Salmos.json'],
  ['proverbios', 'Proverbios', '20_Proverbios.json'],
  ['eclesiastes', 'Eclesiastés', '21_Eclesiastés.json'],
  ['cantares', 'Cantares', '22_Cantares.json'],
  ['isaias', 'Isaías', '23_Isaías.json'],
  ['jeremias', 'Jeremías', '24_Jeremías.json'],
  ['lamentaciones', 'Lamentaciones', '25_Lamentaciones.json'],
  ['ezequiel', 'Ezequiel', '26_Ezequiel.json'],
  ['daniel', 'Daniel', '27_Daniel.json'],
  ['oseas', 'Oseas', '28_Oseas.json'],
  ['joel', 'Joel', '29_Joel.json'],
  ['amos', 'Amós', '30_Amós.json'],
  ['abdias', 'Abdías', '31_Abdías.json'],
  ['jonas', 'Jonás', '32_Jonás.json'],
  ['miqueas', 'Miqueas', '33_Miqueas.json'],
  ['nahum', 'Nahúm', '34_Nahúm.json'],
  ['habacuc', 'Habacuc', '35_Habacuc.json'],
  ['sofonias', 'Sofonías', '36_Sofonías.json'],
  ['hageo', 'Hageo', '37_Hageo.json'],
  ['zacarias', 'Zacarías', '38_Zacarías.json'],
  ['malaquias', 'Malaquías', '39_Malaquías.json']
];

function normalizeHebrew(value, preservePoints){
  let clean = String(value || '')
    .replace(/[\u200c-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, '')
    .replace(/[\u0591-\u05AF]/g, '')
    .replace(/[\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4]/g, '')
    .trim();
  if(!preservePoints){
    clean = clean.replace(/[\u05B0-\u05BC\u05BD\u05BF\u05C1-\u05C2\u05C7]/g, '');
  }
  return clean;
}

function normalizeStrong(value){
  const text = String(value || '').trim().toUpperCase();
  if(!text) return '';
  if(/^H\d+$/.test(text)) return text;
  if(/^\d+$/.test(text)) return `H${text}`;
  return text;
}

function getEntryPrintedMorph(entry){
  const candidates = [
    entry && entry.morfologia_impresa,
    entry && entry['morfología_impresa'],
    entry && entry.morfologia,
    entry && entry['morfología'],
    entry && entry.printed_entry,
    entry && entry.entrada_impresa
  ];
  for(const candidate of candidates){
    const text = String(candidate || '').replace(/\s+/g, ' ').trim();
    if(text && !/\bstrong\b/i.test(text)) return text;
  }
  return '';
}

function buildEntryMorphValues(entry){
  const values = [];
  const add = (value) => {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if(text && !values.includes(text)) values.push(text);
  };
  add(getEntryPrintedMorph(entry));
  const morphs = Array.isArray(entry && entry.morfs) ? entry.morfs : [];
  morphs.forEach(add);
  return values;
}

function safeReadJson(filePath){
  if(!fs.existsSync(filePath)) return null;
  const text = fs.readFileSync(filePath, 'utf8');
  try {
    return { text, json: JSON.parse(text) };
  } catch(error){
    console.error(`No se pudo parsear ${filePath}: ${error.message}`);
    return null;
  }
}

function ensureCleanChapterDir(dir){
  if(fs.existsSync(dir)){
    for(const entry of fs.readdirSync(dir)){
      const target = path.join(dir, entry);
      const stat = fs.statSync(target);
      if(stat.isFile() && /\.json$/i.test(entry)) fs.unlinkSync(target);
    }
  } else {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writeChapterFiles(baseDir, baseName, chaptersObj){
  if(!chaptersObj || typeof chaptersObj !== 'object') return { written: 0, bytes: 0 };
  const targetDir = path.join(baseDir, 'chapters', baseName);
  ensureCleanChapterDir(targetDir);
  let written = 0;
  let bytes = 0;
  for(const [chapterKey, chapterValue] of Object.entries(chaptersObj)){
    const chapterNum = Number(chapterKey);
    if(!Number.isFinite(chapterNum) || chapterNum < 1) continue;
    const minified = JSON.stringify(chapterValue);
    const filePath = path.join(targetDir, `${chapterNum}.json`);
    fs.writeFileSync(filePath, minified);
    written += 1;
    bytes += Buffer.byteLength(minified, 'utf8');
  }
  return { written, bytes };
}

function buildManifest(options){
  const splitChapters = options && options.splitChapters === true;
  const books = {};
  const chapterStats = { interlineal: { books: 0, files: 0, bytes: 0 }, oshb: { books: 0, files: 0, bytes: 0 } };
  let missing = 0;
  for(const [slug, label, file] of OT_BOOKS){
    const filePath = path.join(INTERLINEAL_DIR, file);
    const result = safeReadJson(filePath);
    if(!result){
      console.warn(`  ! Falta o ilegible: IdiomaORIGEN/interlineal/${file}`);
      missing += 1;
      continue;
    }
    const chaptersObj = (result.json && result.json.chapters) || {};
    const chapterKeys = Object.keys(chaptersObj)
      .map((k) => Number(k))
      .filter((n) => Number.isFinite(n) && n >= 1);
    const chapterMax = chapterKeys.length ? Math.max.apply(null, chapterKeys) : 0;
    const versesByChapter = {};
    for(const key of Object.keys(chaptersObj)){
      const verseObj = chaptersObj[key] || {};
      versesByChapter[String(key)] = Object.keys(verseObj).length;
    }

    const baseName = path.parse(file).name;
    const oshbPath = path.join(OSHB_DIR, file);
    const oshbExists = fs.existsSync(oshbPath);

    let hasInterlinearChapters = false;
    let hasOshbChapters = false;

    if(splitChapters){
      const interStats = writeChapterFiles(INTERLINEAL_DIR, baseName, chaptersObj);
      if(interStats.written > 0){
        hasInterlinearChapters = true;
        chapterStats.interlineal.books += 1;
        chapterStats.interlineal.files += interStats.written;
        chapterStats.interlineal.bytes += interStats.bytes;
      }

      if(oshbExists){
        const oshbResult = safeReadJson(oshbPath);
        const oshbChaptersObj = (oshbResult && oshbResult.json && oshbResult.json.chapters) || {};
        const oshbStats = writeChapterFiles(OSHB_DIR, baseName, oshbChaptersObj);
        if(oshbStats.written > 0){
          hasOshbChapters = true;
          chapterStats.oshb.books += 1;
          chapterStats.oshb.files += oshbStats.written;
          chapterStats.oshb.bytes += oshbStats.bytes;
        }
      }
    }

    books[slug] = {
      label,
      file,
      base: baseName,
      chapters: chapterMax,
      verses: result.json && Number.isFinite(result.json.verses_count)
        ? result.json.verses_count
        : Object.values(versesByChapter).reduce((a, b) => a + b, 0),
      versesByChapter,
      bytes: Buffer.byteLength(result.text, 'utf8'),
      hasOshbMorph: oshbExists,
      hasInterlinearChapters,
      hasOshbChapters
    };
  }
  return {
    manifest: {
      version: DATA_VERSION,
      generatedAt: new Date().toISOString(),
      bookOrder: OT_BOOKS.map(([slug]) => slug),
      missing,
      chapterLayout: {
        interlineal: 'IdiomaORIGEN/interlineal/chapters/<base>/<N>.json',
        oshb: 'IdiomaORIGEN/oshb-morph/chapters/<base>/<N>.json'
      },
      books
    },
    chapterStats
  };
}

function buildMorphIndex(){
  const result = safeReadJson(DICT_PATH);
  if(!result){
    console.warn(`  ! No se encontró ${path.relative(ROOT, DICT_PATH)}; se omite morph-index.`);
    return null;
  }
  const raw = result.json;
  const entries = Array.isArray(raw)
    ? raw
    : (raw && (raw.items || raw.entries)) || [];

  const pointed = Object.create(null);
  const plain = Object.create(null);
  const byStrong = Object.create(null);

  const pushUnique = (bucket, payload) => {
    for(const existing of bucket){
      if(existing.form === payload.form && existing.morph === payload.morph) return;
    }
    bucket.push(payload);
  };

  entries.forEach((entry) => {
    const strongKey = normalizeStrong(
      (entry && entry.strong)
      || (entry && entry.strongs)
      || (entry && entry.strong_detail && entry.strong_detail.strong)
    );
    if(strongKey){
      if(!byStrong[strongKey]) byStrong[strongKey] = [];
      byStrong[strongKey].push({
        formas: Array.isArray(entry && entry.formas) ? entry.formas : [],
        morfs: Array.isArray(entry && entry.morfs) ? entry.morfs : []
      });
    }

    const forms = [
      entry && entry.palabra,
      entry && entry.lemma,
      entry && entry.hebreo,
      entry && entry.forma,
      ...(Array.isArray(entry && entry.formas) ? entry.formas : []),
      ...(Array.isArray(entry && entry.forms) ? entry.forms : []),
      ...(Array.isArray(entry && entry.variantes) ? entry.variantes : [])
    ];
    const morphValues = buildEntryMorphValues(entry);
    forms.forEach((form, index) => {
      const rawForm = String(form || '').trim();
      if(!rawForm) return;
      const payload = {
        form: rawForm,
        morph: morphValues[index] || morphValues[0] || ''
      };
      const pointedKey = normalizeHebrew(rawForm, true);
      const plainKey = normalizeHebrew(rawForm, false);
      if(pointedKey){
        if(!pointed[pointedKey]) pointed[pointedKey] = [];
        pushUnique(pointed[pointedKey], payload);
      }
      if(plainKey){
        if(!plain[plainKey]) plain[plainKey] = [];
        pushUnique(plain[plainKey], payload);
      }
    });
  });

  return {
    version: DATA_VERSION,
    generatedAt: new Date().toISOString(),
    counts: {
      entries: entries.length,
      byStrong: Object.keys(byStrong).length,
      pointed: Object.keys(pointed).length,
      plain: Object.keys(plain).length
    },
    byStrong,
    byPointed: pointed,
    byPlain: plain
  };
}

function writeJson(filePath, data){
  const minified = JSON.stringify(data);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, minified);
  return Buffer.byteLength(minified, 'utf8');
}

function formatBytes(bytes){
  if(bytes < 1024) return `${bytes} B`;
  if(bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function main(){
  const splitChapters = process.env.SKIP_CHAPTERS !== '1';
  console.log(`build-bible-indices :: DATA_VERSION=${DATA_VERSION}${splitChapters ? '' : ' (sin atomizar capítulos)'}`);

  console.log(splitChapters ? '• Generando manifest + chapter files...' : '• Generando manifest...');
  const { manifest, chapterStats } = buildManifest({ splitChapters });
  const manifestBytes = writeJson(MANIFEST_PATH, manifest);
  console.log(`  ✓ ${path.relative(ROOT, MANIFEST_PATH)} (${formatBytes(manifestBytes)}, ${Object.keys(manifest.books).length} libros).`);
  if(splitChapters){
    console.log(`  ✓ Interlineal: ${chapterStats.interlineal.books} libros, ${chapterStats.interlineal.files} archivos (${formatBytes(chapterStats.interlineal.bytes)}).`);
    console.log(`  ✓ OSHB-morph : ${chapterStats.oshb.books} libros, ${chapterStats.oshb.files} archivos (${formatBytes(chapterStats.oshb.bytes)}).`);
  }

  console.log('• Generando morph-index...');
  const morphIndex = buildMorphIndex();
  if(morphIndex){
    const morphBytes = writeJson(MORPH_INDEX_PATH, morphIndex);
    console.log(`  ✓ ${path.relative(ROOT, MORPH_INDEX_PATH)} (${formatBytes(morphBytes)}; ${morphIndex.counts.byStrong} strongs, ${morphIndex.counts.pointed} formas con niqud, ${morphIndex.counts.plain} formas sin niqud).`);
  } else {
    console.log('  – morph-index omitido (falta diccionario fuente).');
  }

  console.log('Listo.');
}

main();
