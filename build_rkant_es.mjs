
 import fs from "fs";
 import path from "path";
 
 const ROOT = process.cwd();
 
 // Entradas/salidas (ajustadas a tu estructura)
 const INPUT_DIR = path.join(ROOT, "RKANT", "libros");
 const OUT_DIR   = path.join(ROOT, "RKANT", "out");
const OUT_LIBROS_DIR = path.join(OUT_DIR, "libros");
 
 // CSS central (se carga 1 sola vez)
 const CSS = `

/* RKANT-Es (scoped): replica 1.html pero sin tocar body del sitio */

/* Caja principal del aparato */
 .rkantes-container{

  background-color:#fff;
   padding:10px;

border-radius:5px;
box-shadow:0 0 10px rgba(0,0,0,0.2);
margin-bottom:50px;
+
font-family: Arial, sans-serif;
line-height:1.6;
color:#333;
}

/* IMPORTANTE: tus fragmentos traen <div class="container">...
 Bootstrap aplica .container con max-width/paddings.
 Neutralizamos eso SOLO dentro de RKANT. */
.rkantes-container .container{
max-width: none !important;
width: 100% !important;
padding: 0 !important;
margin: 0 !important;
background: transparent !important;
border-radius: 0 !important;
box-shadow: none !important;
 }

/* títulos */
.rkantes-container h2,
.rkantes-container h3{
color:#333 !important;
margin: 10px 0 8px 0 !important;
}

/* griego */
 .rkantes-container .greek{

font-family:"Times New Roman", serif !important;
font-size:1.4em !important;
color:#444 !important;
 }

/* =========================
 TABLA (igual a 1.html)
 ========================= */

/* Bootstrap a veces mete estilos generales; forzamos aquí */
 .rkantes-container table{

width:100% !important;
border-collapse:collapse !important;
margin-top:10px !important;
+
/* evita que Bootstrap aplique bordes/espaciados raros */
border-spacing:0 !important;
}

/* celdas */
.rkantes-container table th,
.rkantes-container table td{
border:1px solid #ddd !important;
padding:8px !important;
vertical-align: top !important;

/* asegura fondo blanco en celdas normales */
background: #fff !important;
}

/* encabezado */
.rkantes-container table th{
background-color:#f4f4f4 !important;
font-weight:600 !important;
 }


/* enlaces / crossrefs */
.rkantes-container .crossrefs{
color:#0066cc !important;
 }

 `;
 
 // Utilidades
 function ensureDir(p){ fs.mkdirSync(p, { recursive: true }); }
 function readUtf8(fp){ return fs.readFileSync(fp, "utf8"); }
 function writeUtf8(fp, content){
   ensureDir(path.dirname(fp));
   fs.writeFileSync(fp, content, "utf8");
 }
 
 function listDirs(dir){
if(!fs.existsSync(dir)) return [];
   return fs.readdirSync(dir, { withFileTypes: true })
     .filter(d => d.isDirectory())
     .map(d => d.name);
 }
 
 function listFiles(dir){
if(!fs.existsSync(dir)) return [];
   return fs.readdirSync(dir, { withFileTypes: true })
     .filter(d => d.isFile())
     .map(d => d.name);
 }
 
 // Extrae <div class="container"> ... </div> (robusto ante HTML truncado)
 function extractContainer(html){
   const start = html.search(/<div\s+class=["']container["']\s*>/i);
   if (start === -1) return null;
 
   const from = html.slice(start);
 
   // cortar antes de </body> o </html> si existen
   const cutAtBody = from.search(/<\/body\s*>/i);
   const cutAtHtml = from.search(/<\/html\s*>/i);
 
   let end = -1;
   if (cutAtBody !== -1) end = cutAtBody;
   else if (cutAtHtml !== -1) end = cutAtHtml;
 
   const containerBlock = (end !== -1) ? from.slice(0, end) : from;
 
   // envolver en clase propia (evita choques con Bootstrap y estilos globales)
   return `<div class="rkantes-container">\n${containerBlock}\n</div>`;
 }
 
 // Parse filename: <libro><cap>_<verso>.html  (ej. galatas5_12.html)
 function parseRefFromFilename(book, filename){
   const re = new RegExp(`^${book}(\\d+)_([0-9]+)\\.html$`, "i");
   const m = filename.match(re);
   if(!m) return null;
   return { ch: String(Number(m[1])), v: String(Number(m[2])) };
 }
 

function parseRefFromOutFilename(chapterDir, filename){
const chapterVerse = filename.match(/^(\d+)_([0-9]+)\.html$/i);
if(chapterVerse){
  return { ch: String(Number(chapterVerse[1])), v: String(Number(chapterVerse[2])) };
   }
const verseOnly = filename.match(/^([0-9]+)\.html$/i);
if(verseOnly){
  return { ch: String(Number(chapterDir)), v: String(Number(verseOnly[1])) };
}
return null;
}

function addIndexEntry(index, book, ref, outPath){
index[book] = index[book] || {};
index[book][ref.ch] = index[book][ref.ch] || {};
index[book][ref.ch][ref.v] = outPath.replaceAll("\\", "/");
}
 

function buildIndexFromOut(){
   const index = {};

   const problems = [];
const books = listDirs(OUT_LIBROS_DIR);
let processed = 0;
 
   for(const book of books){

  const bookDir = path.join(OUT_LIBROS_DIR, book);
  const bookFiles = listFiles(bookDir).filter(f => f.toLowerCase().endsWith(".html"));
 

  for(const f of bookFiles){
    const ref = parseRefFromOutFilename("1", f);
       if(!ref){
        
      problems.push(`[SKIP] ${book}/${f} (nombre no coincide con <cap>_<verso>.html)`);
         continue;
       }
    const outRel = path.join("libros", book, f);
    addIndexEntry(index, book, ref, outRel);
    processed++;
  }
 

  const chapterDirs = listDirs(bookDir);
  for(const chapterDir of chapterDirs){
    const chapterPath = path.join(bookDir, chapterDir);
    const files = listFiles(chapterPath).filter(f => f.toLowerCase().endsWith(".html"));
    for(const f of files){
      const ref = parseRefFromOutFilename(chapterDir, f);
      if(!ref){
        problems.push(`[SKIP] ${book}/${chapterDir}/${f} (nombre no coincide con <cap>_<verso>.html o <verso>.html)`);
        continue;
      }
      const outRel = path.join("libros", book, chapterDir, f);
      addIndexEntry(index, book, ref, outRel);
      processed++;
       }
  }
}
 

return { index, problems, processed, books: books.length };
}
 

function main(){
ensureDir(OUT_DIR);

// 1) CSS
writeUtf8(path.join(OUT_DIR, "rkant-es.css"), CSS.trim() + "\n");

let mode = "out";
let indexResult = null;
let books = 0;
let processed = 0;
let problems = [];

if(fs.existsSync(INPUT_DIR)){
  mode = "build";
  // 2) Recorrer libros y construir index.json
  const index = {};
  const inputBooks = listDirs(INPUT_DIR);

  for(const book of inputBooks){
    const bookDir = path.join(INPUT_DIR, book);
    const files = listFiles(bookDir).filter(f => f.toLowerCase().endsWith(".html"));

    index[book] = index[book] || {};

    for(const f of files){
      const ref = parseRefFromFilename(book, f);
      if(!ref){
        problems.push(`[SKIP] ${book}/${f} (nombre no coincide con ${book}<cap>_<verso>.html)`);
        continue;
      }

      const inPath = path.join(bookDir, f);
      const raw = readUtf8(inPath);
      const frag = extractContainer(raw);

      if(!frag){
        problems.push(`[BAD] ${book}/${f} (no encontró <div class="container">)`);
        continue;
      }

      // salida: RKANT/out/libros/<book>/<cap>/<verso>.html
      const outRel = path.join("libros", book, ref.ch, `${ref.v}.html`);
      const outPath = path.join(OUT_DIR, outRel);
      writeUtf8(outPath, frag + "\n");

      addIndexEntry(index, book, ref, outRel);
      processed++;
    }
     }

  writeUtf8(path.join(OUT_DIR, "index.json"), JSON.stringify(index, null, 2) + "\n");
  books = inputBooks.length;
} else if(fs.existsSync(OUT_LIBROS_DIR)){
  indexResult = buildIndexFromOut();
  writeUtf8(path.join(OUT_DIR, "index.json"), JSON.stringify(indexResult.index, null, 2) + "\n");
  books = indexResult.books;
  processed = indexResult.processed;
  problems = indexResult.problems;
} else {
  console.error("No existe:", INPUT_DIR, "ni", OUT_LIBROS_DIR);
  process.exit(1);
}
 
   console.log("=== RKANT-Es build ===");
console.log("MODO  :", mode);
   console.log("INPUT :", INPUT_DIR);
   console.log("OUTPUT:", OUT_DIR);
console.log("LIBROS:", books);
   console.log("PROCESADOS:", processed);
   console.log("PROBLEMAS:", problems.length);
   if(problems.length){
     console.log("\nDetalles:");
     problems.slice(0, 200).forEach(p => console.log(" -", p));
     if(problems.length > 200) console.log(" ... (mostrando solo 200)");
   }
   console.log("\nOK: RKANT/out/index.json y RKANT/out/rkant-es.css generados.");
 }
 
 main();
