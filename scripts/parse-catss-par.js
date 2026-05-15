#!/usr/bin/env node
/**
 * Parser aislado para archivos CATSS "parallel" (.par) del CCAT.
 * Formato observado (ej. 01.Genesis.par):
 *   - Linea de versiculo: "Gen 1:1", "Ruth 2:3", "1Sam/K 12:1" (etiqueta libro + cap:verso)
 *   - Lineas de alineacion: columna hebrea (transliteracion CCAT) TAB columna griega (TLG-style)
 *   - Lineas con prefijo --+ : continuidad / aparato / remisiones (ver documentacion CATSS)
 *
 * Origen: https://ccat.sas.upenn.edu/gopher/text/religion/biblical/parallel/
 * Documentacion general: https://ccat.sas.upenn.edu/rak/catss.html
 *
 * IMPORTANTE: respeta la licencia y condiciones de uso de CCAT/CATSS al redistribuir datos.
 */
const fs = require('fs');
const path = require('path');

function parseArgs(){
  const argv = process.argv.slice(2);
  const out = { file: null, maxVerses: Infinity, outPath: null, bookOverride: null };
  for(let i = 0; i < argv.length; i += 1){
    const a = argv[i];
    if(a === '--maxVerses' && argv[i + 1]){ out.maxVerses = Number(argv[++i]); }
    else if(a === '--out' && argv[i + 1]){ out.outPath = argv[++i]; }
    else if(a === '--book' && argv[i + 1]){ out.bookOverride = argv[++i]; }
    else if(!a.startsWith('-')){ out.file = a; }
  }
  return out;
}

function bookFromFilename(base){
  const m = /^\d+\.(.+)\.par$/i.exec(base);
  return m ? m[1] : 'UNKNOWN';
}

function parseParText(text, opts = {}){
  const { maxVerses = Infinity, bookFromFile = 'Gen' } = opts;
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  const verses = [];
  let current = null;
  let book = bookFromFile;

  /** Incluye prefijos numericos y sufijos tipo K (p.ej. 1Sam/K) usados en algunos .par. */
  const verseHeader = /^(\S+)\s+(\d+):(\d+)\s*$/;

  for(const raw of lines){
    const line = raw;
    const vm = verseHeader.exec(line.trim());
    if(vm){
      book = vm[1];
      if(verses.length >= maxVerses){
        break;
      }
      current = {
        book,
        chapter: Number(vm[2]),
        verse: Number(vm[3]),
        ref: `${vm[1]} ${vm[2]}:${vm[3]}`,
        pairs: []
      };
      verses.push(current);
      continue;
    }

    if(!current) continue;
    if(!line.trim()) continue;

    const tab = line.indexOf('\t');
    if(tab === -1) continue;

    const he = line.slice(0, tab).trimEnd();
    const gr = line.slice(tab + 1).trim();

    const pair = {
      he,
      gr,
      kind: 'align',
      isApparatusPrefix: he.startsWith('--+'),
      isGreekOmitted: gr === '---' || gr === ''
    };
    if(pair.isApparatusPrefix) pair.kind = 'apparatus';
    current.pairs.push(pair);
  }

  return { book, verses };
}

function main(){
  const args = parseArgs();
  if(!args.file){
    console.error('Uso: node scripts/parse-catss-par.js <ruta/*.par> [--maxVerses N] [--out salida.json]');
    console.error('Ejemplo: node scripts/parse-catss-par.js catss-sample/01.Genesis.par --maxVerses 5 --out catss-sample/genesis-prefix.json');
    process.exit(1);
  }

  const abs = path.resolve(args.file);
  if(!fs.existsSync(abs)){
    console.error('No existe:', abs);
    process.exit(1);
  }

  const text = fs.readFileSync(abs, 'utf8');
  const base = path.basename(abs);
  const bookHint = args.bookOverride || bookFromFilename(base).replace(/^Genesis$/i, 'Gen');

  const { book, verses } = parseParText(text, {
    maxVerses: Number.isFinite(args.maxVerses) ? args.maxVerses : Infinity,
    bookFromFile: bookHint
  });

  const payload = {
    _schema: 'catss-par-parsed-v1',
    _source: 'https://ccat.sas.upenn.edu/gopher/text/religion/biblical/parallel/',
    _file: base,
    _book: book,
    verseCount: verses.length,
    verses
  };

  const json = JSON.stringify(payload, null, 2);
  if(args.outPath){
    const o = path.resolve(args.outPath);
    fs.mkdirSync(path.dirname(o), { recursive: true });
    fs.writeFileSync(o, json, 'utf8');
    console.log('Escrito', o, `(${verses.length} versiculos)`);
  }else{
    process.stdout.write(json);
  }
}

main();
