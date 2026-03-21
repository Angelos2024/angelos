/**
 * Build definitivo de búsqueda:
 * - Genera search/manifestv1.json
 * - Genera search/index-es.json, search/index-gr.json, search/index-he.json (índice invertido)
 * - Genera "text packs" por capítulo:
 *      search/texts/es/<slug>/<cap>.json
 *      search/texts/gr/<slug>/<cap>.json
 *      search/texts/he/<slug>/<cap>.json
 *
 * Ejecutar:
 *   node tools/build-search-index.mjs
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

// ==== AJUSTA ESTAS RUTAS SI TU REPO ES DIFERENTE ====
const RV_DIR = path.join(ROOT, "librosRV1960");        // ./librosRV1960/<slug>.json
const HEBREO_DIR = path.join(ROOT, "IdiomaORIGEN");    // ./IdiomaORIGEN/<Libro con espacios>.json
const GRIEGO_PATH = path.join(ROOT, "IdiomaORIGEN", "Bgriega.json"); // ./IdiomaORIGEN/Bgriega.json

const OUT_DIR = path.join(ROOT, "search");
const OUT_TEXTS = path.join(OUT_DIR, "texts");

// ==== CANON (igual al tuyo) ====
const ALL_SLUGS = [
  "genesis","exodo","levitico","numeros","deuteronomio",
  "josue","jueces","rut","1_samuel","2_samuel","1_reyes","2_reyes",
  "1_cronicas","2_cronicas","esdras","nehemias","ester",
  "job","salmos","proverbios","eclesiastes","cantares",
  "isaias","jeremias","lamentaciones","ezequiel","daniel",
  "oseas","joel","amos","abdias","jonas","miqueas","nahum","habacuc","sofonias","hageo","zacarias","malaquias",
  "mateo","marcos","lucas","juan","hechos",
  "romanos","1_corintios","2_corintios","galatas","efesios","filipenses","colosenses",
  "1_tesalonicenses","2_tesalonicenses","1_timoteo","2_timoteo","tito","filemon",
  "hebreos","santiago","1_pedro","2_pedro","1_juan","2_juan","3_juan","judas","apocalipsis"
];

const NT_SLUGS = new Set([
  "mateo","marcos","lucas","juan","hechos",
  "romanos","1_corintios","2_corintios","galatas","efesios","filipenses","colosenses",
  "1_tesalonicenses","2_tesalonicenses","1_timoteo","2_timoteo","tito","filemon",
  "hebreos","santiago","1_pedro","2_pedro","1_juan","2_juan","3_juan","judas","apocalipsis"
]);

const NT_TR_BOOKNAME = {
  mateo: "Matthew", marcos: "Mark", lucas: "Luke", juan: "John", hechos: "Acts",
  romanos: "Romans", "1_corintios": "1 Corinthians", "2_corintios": "2 Corinthians",
  galatas: "Galatians", efesios: "Ephesians", filipenses: "Philippians", colosenses: "Colossians",
  "1_tesalonicenses": "1 Thessalonians", "2_tesalonicenses": "2 Thessalonians",
  "1_timoteo": "1 Timothy", "2_timoteo": "2 Timothy", tito: "Titus", filemon: "Philemon",
  hebreos: "Hebrews", santiago: "James", "1_pedro": "1 Peter", "2_pedro": "2 Peter",
  "1_juan": "1 John", "2_juan": "2 John", "3_juan": "3 John", judas: "Jude", apocalipsis: "Revelation"
};
const EN_TO_SLUG = Object.fromEntries(Object.entries(NT_TR_BOOKNAME).map(([slug,en]) => [en, slug]));

// ==== Normalizadores (idénticos a tu lógica) ====
function normalizeLatin(s){
  return (s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^\p{L}\p{N}\s]/gu," ")
    .replace(/\s+/g," ")
    .trim();
}

function normalizeGreek(s){
  return (s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/ς/g,"σ")
    .replace(/[^\p{L}\p{N}\s]/gu," ")
    .replace(/\s+/g," ")
    .trim();
}

function normalizeHebrew(s){
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0591-\u05C7]/g,"")
    .replace(/[^\p{L}\p{N}\s]/gu," ")
    .replace(/\s+/g," ")
    .trim();
}

function tokenize(norm){
  if(!norm) return [];
  // filtro simple: ignora tokens de 1 char
  return norm.split(" ").map(t => t.trim()).filter(t => t.length >= 2);
}

function heSlugToFilename(slug){
  // tus archivos hebreos usan espacios
  return slug.replace(/_/g," ") + ".json";
}

function ensureDir(p){
  fs.mkdirSync(p, { recursive:true });
}

function writeJson(filePath, obj){
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), "utf8");
}

function readJson(filePath){
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function refKey(slug, ch, v){
  return `${slug}|${ch}|${v}`;
}

// ==== Construcción del índice y packs ====
function addToIndex(tokensMap, token, ref){
  // tokensMap es Object.create(null), pero igual blindamos:
  let arr = tokensMap[token];

  // Si por cualquier razón no es array (claves raras / datos corruptos), lo reiniciamos
  if(!Array.isArray(arr)){
    arr = [];
    tokensMap[token] = arr;
  }

  // Evita duplicado consecutivo
  if(arr.length === 0 || arr[arr.length - 1] !== ref){
    arr.push(ref);
  }
}


function buildFromChapters(lang, slug, chapters, normFn, indexTokens){
  // chapters: Array<Array<string>> 1-based implied
  // Generar packs por capítulo y llenar índice
  const baseDir = path.join(OUT_TEXTS, lang, slug);
  ensureDir(baseDir);

  for(let ch=1; ch<=chapters.length; ch++){
    const verses = chapters[ch-1] || [];
    // pack del capítulo
    writeJson(path.join(baseDir, `${ch}.json`), verses);

    for(let v=1; v<=verses.length; v++){
      const t = String(verses[v-1] ?? "");
      const norm = normFn(t);
      const toks = tokenize(norm);
      if(toks.length === 0) continue;

      const ref = refKey(slug, ch, v);
      for(const tok of toks){
        addToIndex(indexTokens, tok, ref);
      }
    }
  }

  return { chapters: chapters.length };
}

function main(){
  ensureDir(OUT_DIR);
  ensureDir(OUT_TEXTS);

  const manifest = {
    v: 1,
    generated_at: new Date().toISOString(),
    langs: {
      es: { books: [], chapterCounts: {} },
      he: { books: [], chapterCounts: {} },
      gr: { books: [], chapterCounts: {} }
    }
  };

  // ======================
  // ESPAÑOL (RVR)
  // ======================
const indexES = { v:1, lang:"es", tokens: Object.create(null) };

  for(const slug of ALL_SLUGS){
    const file = path.join(RV_DIR, `${slug}.json`);
    if(!fs.existsSync(file)) continue;

    const chapters = readJson(file);
    if(!Array.isArray(chapters)) continue;

    manifest.langs.es.books.push(slug);
    const info = buildFromChapters("es", slug, chapters, normalizeLatin, indexES.tokens);
    manifest.langs.es.chapterCounts[slug] = info.chapters;
  }

  // ======================
  // HEBREO (solo AT)
  // ======================
  const indexHE = { v:1, lang:"he", tokens: Object.create(null) };

  for(const slug of ALL_SLUGS){
    if(NT_SLUGS.has(slug)) continue;

    const file = path.join(HEBREO_DIR, heSlugToFilename(slug));
    if(!fs.existsSync(file)) continue;

    const he = readJson(file);
    if(!he || !Array.isArray(he.text)) continue;

    const chapters = he.text.map(ch => Array.isArray(ch) ? ch.map(v => (v ?? "")) : []);
    manifest.langs.he.books.push(slug);
    const info = buildFromChapters("he", slug, chapters, normalizeHebrew, indexHE.tokens);
    manifest.langs.he.chapterCounts[slug] = info.chapters;
  }

  // ======================
  // GRIEGO (Bgriega.json)
  // ======================
  const indexGR = { v:1, lang:"gr", tokens: Object.create(null) };

  if(fs.existsSync(GRIEGO_PATH)){
    const gr = readJson(GRIEGO_PATH);
    if(gr && Array.isArray(gr.verses)){
      // agrupamos por slug y cap para packs
      const bySlug = new Map(); // slug -> Map(ch -> Array(verses))
      for(const row of gr.verses){
        const slug = EN_TO_SLUG[row.book_name];
        if(!slug) continue;
        const ch = Number(row.chapter);
        const v = Number(row.verse);
        if(!Number.isFinite(ch) || !Number.isFinite(v)) continue;

        const text = String(row.text ?? "");
        // Índice
        const norm = normalizeGreek(text);
        const toks = tokenize(norm);
        if(toks.length){
          const ref = refKey(slug, ch, v);
          for(const tok of toks){
            addToIndex(indexGR.tokens, tok, ref);
          }
        }

        // Packs
        let bookMap = bySlug.get(slug);
        if(!bookMap){
          bookMap = new Map();
          bySlug.set(slug, bookMap);
        }
        let verses = bookMap.get(ch);
        if(!verses){
          verses = [];
          bookMap.set(ch, verses);
        }
        // aseguramos índice v-1
        verses[v-1] = text;
      }

      // escribir packs por slug/cap
      for(const [slug, chMap] of bySlug){
        manifest.langs.gr.books.push(slug);
        let maxCh = 0;
        for(const [ch, verses] of chMap){
          maxCh = Math.max(maxCh, ch);
          const baseDir = path.join(OUT_TEXTS, "gr", slug);
          ensureDir(baseDir);
          // rellenar huecos con ""
          const packed = Array.isArray(verses) ? verses.map(x => x ?? "") : [];
          writeJson(path.join(baseDir, `${ch}.json`), packed);
        }
        manifest.langs.gr.chapterCounts[slug] = maxCh;
      }
    }
  }

  // ======================
  // Guardar salidas
  // ======================
  writeJson(path.join(OUT_DIR, "manifestv1.json"), manifest);
  writeJson(path.join(OUT_DIR, "index-es.json"), indexES);
  writeJson(path.join(OUT_DIR, "index-he.json"), indexHE);
  writeJson(path.join(OUT_DIR, "index-gr.json"), indexGR);

  console.log("OK: generado search/manifestv1.json + índices + text packs");
  console.log("ES tokens:", Object.keys(indexES.tokens).length);
  console.log("HE tokens:", Object.keys(indexHE.tokens).length);
  console.log("GR tokens:", Object.keys(indexGR.tokens).length);
}

main();
