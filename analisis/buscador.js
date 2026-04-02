const $ = id => document.getElementById(id);

const alefatoFilesEl = $("alefatoFiles");
const clearBtn = $("clearBtn");
const queryEl = $("query");
const searchBtn = $("searchBtn");
const resultsTbodyEl = $("resultsTbody");
const matchTierEl = $("matchTier");
const resultCountEl = $("resultCount");
const diagEl = $("diag");
const traceEl = $("trace");

// Compatibilidad con funciones extraídas del comparador
const normalizeEl = $("normalize");
const splitHyphenatedEl = $("splitHyphenated");

// Regex y constantes (tomadas del comparador)
const RE_HEB = /[\u0590-\u05FF]/;
const RE_DIAC = /[\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C7]/g;
const RE_INVIS = /[\u200E\u200F\u202A-\u202E\u2066-\u2069\u200C\u200D\uFEFF]/g;
const RE_PUNCT = /[׃׀״׳.,;:!?(){}\[\]<>\\"'“”‘’…/\\|+=_*~`@#$%^&]/g;
const RE_SPACES = /[\s\u00A0]+/g;
const PREFIX_LETTERS = new Set(["ו","ה","ב","ל","כ","מ","ש"]);
const PREP_PREFIX_LETTERS = new Set(["ב","ל","כ"]);
const MIN_PREFIX_LETTER = "מ";
const CONJ_PREFIX_LETTER = "ו";

// ===== Funciones extraídas del comparador =====
function normalizeText(s){
  let x = String(s ?? "");
  x = x.replace(RE_INVIS, "");
  try { x = x.normalize("NFKD"); } catch(_){}
  if (splitHyphenatedEl && splitHyphenatedEl.checked) x = x.replace(/[\u05BE\-‐‑‒–—]/g, " "); // maqaf/guiones => espacio
  else x = x.replace(/\u05BE/g, " "); // maqaf => espacio
  if (normalizeEl.checked) x = x.replace(RE_DIAC, "");
  x = x.replace(RE_PUNCT, " ");
  x = x.replace(/\s+/g, " ").trim();
  return x;
}

function preprocessBracketPairs(line){
  // Si aparece "X [Y]", conservar Y (útil cuando hay normalización/glosa bracket)
  return String(line).replace(/(^|\s)\S+\s+\[([^\]]+)\]/g, (m, sp, inside) => sp + inside);
}

function tokenizeHebrew(line){
  const prepared = preprocessBracketPairs(line);
  const t = normalizeText(prepared);
  if (!t) return [];
  return t.split(RE_SPACES).filter(Boolean).filter(x => RE_HEB.test(x));
}

function stripLeadingHebrewMarks(s){
  return String(s || "").replace(/^[\u0591-\u05C7]+/, "");
}

function stripHebrewMarksAnywhere(s){
  return String(s || "").replace(/[\u0591-\u05C7]/g, "");
}

function pushCandidate(cands, s){
  const raw = String(s || "");
  if (!raw) return;
  cands.add(raw);
  const n = normalizeText(raw);
  if (n) cands.add(n);
  const noMarks = stripHebrewMarksAnywhere(raw);
  if (noMarks) cands.add(noMarks);
  const noMarksNorm = normalizeText(noMarks);
  if (noMarksNorm) cands.add(noMarksNorm);
}

function expandMorphologyCandidates(input){
  const out = new Set();
  const base = stripHebrewMarksAnywhere(String(input || ""));
  if (!base || !/[א-ת]/.test(base)) return out;

  // Función para corregir Letras Finales (Sofiyot)
  const fixFinal = (str) => {
    const map = { 'כ':'ך', 'מ':'ם', 'נ':'ן', 'פ':'ף', 'צ':'ץ' };
    const last = str[str.length-1];
    return map[last] ? str.slice(0,-1) + map[last] : str;
  };

  const push = (x) => { 
    if (x && /[א-ת]/.test(x)) {
      out.add(x); 
      const fixed = fixFinal(x);
      if(fixed !== x) out.add(fixed);

      // Inteligencia de Ortografía Plena vs Defectiva en la raíz resultante
      if (fixed.length >= 4) {
        if (fixed[fixed.length - 2] === 'ו' || fixed[fixed.length - 2] === 'י') {
          const defectiva = fixed.slice(0, -2) + fixed.slice(-1);
          out.add(defectiva);
          out.add(fixFinal(defectiva));
        }
      }
      // Inteligencia para Participios Activos (Qal Qotel)
      if (fixed.length >= 4 && fixed[1] === 'ו') {
        const sinVav = fixed[0] + fixed.slice(2);
        out.add(sinVav);
        out.add(fixFinal(sinVav));
      }
    }
  };

  push(base);

  // 1. Sufijos pronominales y verbales unidos
  const suffixes = ["יהם","יהן","יכם","יכן","ינו","מו","הו","ני","נה","יה","יו","יך","יכ","כם","כן","הם","הן","נו","תם","תן","תי","ם","ן","ו","י","ך","ה","ת"];
  for (const suf of suffixes){
    if (base.length > suf.length && base.endsWith(suf)) {
      const stem = base.slice(0, -suf.length);
      if (stem.length > 1) {
        push(stem);
        if (stem.endsWith("ת")) push(stem.slice(0,-1) + "ה");
        if (stem.endsWith("י")) { 
          push(stem + "ם"); push(stem + "ים"); push(stem + "ות"); 
          push(stem.slice(0,-1) + "ה"); 
        }
        // Restauración automática si la raíz quedó en 2 letras
        if (stem.length === 2 && ["ו","ם","ן","ת","י","נה","ני","הו"].includes(suf)) {
          push(stem + "ה"); 
          push("י" + stem); 
          push("נ" + stem); 
        }
        push(stem + "ים"); push(stem + "ות");
      } else if (stem.length === 1 && ["ב","כ","ל","מ","ש","ה","ו"].includes(stem)) {
        push(stem); 
      }
    }
  }

  // 2. Constructos, plurales y femeninos
  if (base.endsWith("י") && base.length > 2){
    const stem = base.slice(0,-1);
    push(stem); push(stem + "ים"); push(stem + "ות"); push(stem + "ה");
  }
  if (base.endsWith("ת") && base.length > 2){
    const stem = base.slice(0,-1);
    push(stem); push(stem + "ה"); push(stem + "ות");
    if (!stem.includes("ו")) push(stem + "ו" + "ת");
  }
  if (base.endsWith("ים") && base.length > 3) push(base.slice(0,-2));
  if (base.endsWith("ות") && base.length > 3) {
    push(base.slice(0,-2)); push(base.slice(0,-2) + "ה");
  }
  
  // 3. Terminación Aramea Definitiva
  if (base.endsWith("א") && base.length > 2) {
    const stem = base.slice(0,-1);
    push(stem);
    push(stem + "ה");
  }

  // =================================================================
  // 4. NUEVO: METÁTESIS EN BINIÁN HITPAEL (Sibilantes)
  // Invierte y restaura la raíz cuando la 'ת' del prefijo se ha asimilado.
  // =================================================================
  if (base.length >= 3) {
    // A) Letras Shin (ש) y Samej (ס)
    if (/^[שס]ת/.test(base)) {
      push(base[0] + base.slice(2));
      if (base.length === 3) push(base[0] + base.slice(2) + "ה");
    }
    // B) Letra Zayin (ז)
    if (/^זד/.test(base)) {
      push("ז" + base.slice(2));
      if (base.length === 3) push("ז" + base.slice(2) + "ה");
    }
    // C) Letra Tsadi (צ)
    if (/^צט/.test(base)) {
      push("צ" + base.slice(2));
      if (base.length === 3) push("צ" + base.slice(2) + "ה");
    }
  }

  return out;
}

function generatePureWordCandidates(tok, depth = 0, seen = new Set()){
  const IRREGULARS = {
    // 1. BLINDAJE DE FALSOS PREFIJOS (Palabras comunes que tu código mutilaría)
    "לחם": "לחם", "מים": "מים", "שמים": "שמים", "כהן": "כהן", "מדבר": "מדבר", 
    "מלך": "מלך", "מקום": "מקום", "שלום": "שלום", "שנה": "שנה", "שם": "שם",
    "משפחה": "משפחה", "מזבח": "מזבח", "מנחה": "מנחה", "מטה": "מטה",

    // 2. SUSTANTIVOS IRREGULARES BÍBLICOS
    "אנשים": "איש", "אנשי": "איש", 
    "נשים": "אשה", "נשי": "אשה", "אשת": "אשה",
    "אבות": "אב", "אבותי": "אב",      
    "בנים": "בן", "בני": "בן",        
    "בנות": "בת", 
    "ערים": "עיר", "ערי": "עיר", 
    "פנים": "פנים", "פני": "פנים",
    "עינים": "עין", "עיני": "עין",
    "ידים": "יד", "ידי": "יד",
    "רגלים": "רגל", "רגלי": "רגל",
    "פה": "פה", "פיהו": "פה", "פי": "פה", "פיו": "פה", "פיך": "פה", "פיהם": "פה",

    // 3. PREPOSICIONES INFLEXIONADAS (Marca objeto directo, hacia, sobre, con)
    "אתי": "את", "אתך": "את", "אתו": "את", "אתנו": "את", "אתכם": "את", "אתם": "את", 
    "אותי": "את", "אותך": "את", "אותו": "את", "אותנו": "את", "אותם": "את",
    "אלי": "אל", "אליך": "אל", "אליו": "אל", "אלינו": "אל", "אליכם": "אל", "אליהם": "אל",
    "עלי": "על", "עליך": "על", "עליו": "על", "עלינו": "על", "עליכם": "על", "עליהם": "על",
    "עמי": "עם", "עמך": "עם", "עמו": "עם",
    "ממך": "מן", "ממנו": "מן", "ממני": "מן", "מהם": "מן",

    // 4. INFINITIVOS CONSTRUCTOS DE VERBOS LAMED-HE
    "ראות": "ראה", "עשות": "עשה", "בנות": "בנה", "חנות": "חנה", "בכות": "בכה", 
    "ענות": "ענה", "קנות": "קנה", "שתות": "שתה",

    // 5. VERBOS IRREGULARES TRUNCADOS / APÓCOPES
    "לתת": "נתן", "תת": "נתן", "תתי": "נתן", "תן": "נתן",      
    "ויך": "נכה", "יך": "נכה", "ונך": "נכה",       
    "מות": "מת", "מותו": "מת",
    "קח": "לקח", "קחו": "לקח", "קחי": "לקח", "קחת": "לקח", "ויקחהו": "לקח",
    "יודע": "ידע", "יודעים": "ידע", "יודעי": "ידע", "נודע": "ידע", "דע": "ידע",
    "שתחו": "שחה", "שתחוה": "שחה", "שתחוו": "שחה", "להשתחות": "שחה",
    "צא": "יצא", "צאו": "יצא", "לצאת": "יצא", "מוצא": "יצא", "יוצא": "יצא", "ויוצא": "יצא", "הוציא": "יצא", "להוציא": "יצא", "תוציא": "יצא",
    "רד": "ירד", "רדו": "ירד", "לרדת": "ירד", "יורד": "ירד", "הוריד": "ירד", "להוריד": "ירד",
    "שא": "נשא", "שאו": "נשא", "לשאת": "נשא", "שאת": "נשא",
    "קם": "קום", "וקם": "קום", "יקם": "קום", "הקים": "קום", "מקים": "קום",
    "סר": "סור", "וסר": "סור", "יסר": "סור", "הסיר": "סור", "מסיר": "סור",
    "מושיע": "ישע", "הושיע": "ישע", "להושיע": "ישע", "יושיע": "ישע", "ויושיעם": "ישע",
    "מציל": "נצל", "הציל": "נצל", "להציל": "נצל", "יציל": "נצל", "יצילנו": "נצל", "תציל": "נצל",
    "ויט": "נטה", "יט": "נטה", "ויטו": "נטה", "יטו": "נטה",
    "ויסב": "סבב", "יסב": "סבב", "סב": "סבב", "ונסב": "סבב",
    "וירץ": "רוץ", "ירץ": "רוץ", "רץ": "רוץ",
    "ויגידו": "נגד", "יגידו": "נגד", "הגידו": "נגד", "מגיד": "נגד", "תגידו": "נגד",
    "קראתו": "קרא", "לקראתו": "קרא", "לקראת": "קרא", "לקראתנו": "קרא",
    "שימו": "שום", "ישימו": "שום", "תשימו": "שום", "וישימו": "שום",
    "נורא": "ירא", "והנורא": "ירא",
    "מגיע": "נגע",
    "ויעש": "עשה", "ותעש": "עשה", "יעש": "עשה", "תעש": "עשה", "אעש": "עשה", "נעש": "עשה", 
    "וירא": "ראה", "ירא": "ראה", "תרא": "ראה", "ארא": "ראה", "נרא": "ראה", 
    "ויצו": "צוה", "יצו": "צוה", "ויבך": "בכה", "יבך": "בכה",
    "כל": "כל", "ככל": "כל", "בכל": "כל", "לכל": "כל"
  };

  const cands = new Set();
  const raw = String(tok || "");

  if (IRREGULARS[raw]) cands.add(IRREGULARS[raw]);
  const rawNoPrefix = raw.replace(/^[והבלכמש]/, "");
  if (IRREGULARS[rawNoPrefix]) cands.add(IRREGULARS[rawNoPrefix]);

  if (!raw || depth > 3) return cands;
  if (seen.has(raw + "|" + depth)) return cands;
  seen.add(raw + "|" + depth);

  pushCandidate(cands, raw);
  for (const m of expandMorphologyCandidates(raw)) pushCandidate(cands, m);

  const m = raw.match(/^([א-ת])([\s\S]*)$/);
  if (!m) return cands;
  const first = m[1];
  let tail = stripLeadingHebrewMarks(m[2] || "");
  if (!/[א-ת]/.test(tail)) return cands;

  if (PREP_PREFIX_LETTERS.has(first)) {
    pushCandidate(cands, tail);         
    for (const m of expandMorphologyCandidates(tail)) pushCandidate(cands, m);
    pushCandidate(cands, "ה" + tail);   
    const tailNoMarks = stripHebrewMarksAnywhere(tail);
    if (/^ה[א-ת]/.test(tailNoMarks)) pushCandidate(cands, tailNoMarks.slice(1)); 
    for (const sub of generatePureWordCandidates(tail, depth + 1, seen)) cands.add(sub);
    return cands;
  }

  if (first === MIN_PREFIX_LETTER) {
    pushCandidate(cands, tail);         
    for (const m of expandMorphologyCandidates(tail)) pushCandidate(cands, m);
    pushCandidate(cands, "ה" + tail);   
    const tailNoMarks = stripHebrewMarksAnywhere(tail);
    if (/^ה[א-ת]/.test(tailNoMarks)) pushCandidate(cands, tailNoMarks.slice(1));
    for (const sub of generatePureWordCandidates(tail, depth + 1, seen)) cands.add(sub);
    return cands;
  }

  if (first === CONJ_PREFIX_LETTER) {
    pushCandidate(cands, tail); 
    for (const m of expandMorphologyCandidates(tail)) pushCandidate(cands, m);
    for (const sub of generatePureWordCandidates(tail, depth + 1, seen)) cands.add(sub);
    return cands;
  }

  const eitanAndBinyanim = new Set(["א","י","ת","נ","ה"]);
  if (eitanAndBinyanim.has(first) && tail.length >= 2) {
    pushCandidate(cands, tail);

    if (tail.startsWith("ת") && tail.length > 2) {
      pushCandidate(cands, tail.slice(1));
      for (const m of expandMorphologyCandidates(tail.slice(1))) pushCandidate(cands, m);
    }

    if (tail.length === 2 || tail.length === 3) {
       pushCandidate(cands, "נ" + tail);
       pushCandidate(cands, "י" + tail);
       pushCandidate(cands, "ה" + tail);
       if (tail.length === 2) pushCandidate(cands, tail + "ה"); // NUEVO: Restaura verbos terminados en He (Ej: ויעש -> עש -> עשה)
    }

    for (const m of expandMorphologyCandidates(tail)) {
      pushCandidate(cands, m);
      if (m.length === 2) {
        pushCandidate(cands, "נ" + m); 
        pushCandidate(cands, "י" + m); 
        pushCandidate(cands, "ה" + m);
        pushCandidate(cands, m + "ה");
      }
    }
    for (const sub of generatePureWordCandidates(tail, depth + 1, seen)) cands.add(sub);
  }

  return cands;
}
function parseAlefatoJsonFlexible(txt){
  const s = String(txt||"").replace(/^\uFEFF/, "");
  try { return JSON.parse(s); } catch (_) {}

  // Rescate para archivos con corchetes/fragmentos extra: extrae objetos JSON de primer nivel.
  const objs = [];
  let depth = 0, inStr = false, esc = false, start = -1;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') { inStr = true; continue; }
    if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}') {
      if (depth > 0) depth--;
      if (depth === 0 && start !== -1) {
        const frag = s.slice(start, i + 1);
        try { objs.push(JSON.parse(frag)); } catch (_) {}
        start = -1;
      }
    }
  }
  if (objs.length) return objs;

  // Respaldo: texto plano con una forma hebrea por línea
  const lines = s.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  const hebOnly = lines.filter(x => /[\u0590-\u05FF]/.test(x) && !/[\[\]{}:,]/.test(x));
  if (hebOnly.length) return hebOnly.map((h, idx) => ({ id: idx + 1, texto_hebreo: h }));

  throw new Error('JSON inválido (ni parseo normal ni rescate flexible)');
}
// ===== Fin de funciones extraídas =====

let entries = []; // {he, es, source, heExactKey, heNormKey, heNoVowelsKey}
let loadedFiles = 0;

const indexExact = new Map();       // he tal cual (NFC)
const indexNorm = new Map();        // normalizeText(he)
const indexNoVowels = new Map();    // normalizeText(stripHebrewMarksAnywhere(he))

function nfc(s) {
  try { return String(s ?? "").normalize("NFC"); } catch(_) { return String(s ?? ""); }
}

function addToIndex(map, key, idx) {
  if (!key) return;
  let arr = map.get(key);
  if (!arr) { arr = []; map.set(key, arr); }
  arr.push(idx);
}

function isPrefixToken(tok){
  const letters = (String(tok).match(/[א-ת]/g) || []);
  if (!letters.length || letters.length > 2) return false;
  return letters.every(ch => PREFIX_LETTERS.has(ch));
}

function addTokenAndComposites(tokens, outSet){
  const add = (x) => {
    const v = nfc(String(x || '').trim());
    if (!v) return;
    outSet.add(v);
    const compact = nfc(v.replace(/[\s־\-‐‑‒–—]+/g, ''));
    if (compact && compact !== v) outSet.add(compact);
  };
   const addDefiniteArticleVariants = (token) => {
    const t = nfc(String(token || '').trim());
    if (!t || !/^ה[א-ת]{2,}$/.test(t)) return;
    add(t.slice(1));
  };

  for (let i=0; i<tokens.length; i++){
    const t0 = tokens[i];
    if (!t0) continue;
    add(t0);
        addDefiniteArticleVariants(t0);
    const t1 = tokens[i+1];
    const t2 = tokens[i+2];
   if (isPrefixToken(t0) && t1) {
      const combo01 = t0 + t1;
      add(combo01);
      addDefiniteArticleVariants(combo01);
    }
    if (t1) {
      const combo01 = t0 + t1;
      add(combo01);
      addDefiniteArticleVariants(combo01);
    }
    if (isPrefixToken(t0) && isPrefixToken(t1) && t2) {
       const combo012 = t0 + t1 + t2;
      const comboNested = t0 + (t1 + t2);
      add(combo012);
      add(comboNested);
      addDefiniteArticleVariants(combo012);
      addDefiniteArticleVariants(comboNested);
    }
    if (isPrefixToken(t0) && t1 && t2) {
      const combo012 = t0 + t1 + t2;
      const combo12 = t1 + t2;
      add(combo012);
      add(combo12);
      addDefiniteArticleVariants(combo012);
      addDefiniteArticleVariants(combo12);
    }
  }
}

function buildHebrewAliases(rawText) {
  const aliases = new Set();
  const raw = nfc(String(rawText || '').trim());
  if (!raw) return aliases;
  aliases.add(raw);
  const compactRaw = nfc(raw.replace(/[\s־\-‐‑‒–—]+/g, ''));
  if (compactRaw && compactRaw !== raw) aliases.add(compactRaw);
  const toks = tokenizeHebrew(raw);
  if (toks.length) addTokenAndComposites(toks, aliases);
  const noMarksRaw = nfc(stripHebrewMarksAnywhere(raw));
  if (noMarksRaw) aliases.add(noMarksRaw);
  const normRaw = nfc(normalizeText(raw));
  if (normRaw) aliases.add(normRaw);
  return aliases;
}

function clearIndexes() {
  indexExact.clear();
  indexNorm.clear();
  indexNoVowels.clear();
}

function rebuildIndexes() {
  clearIndexes();
  entries.forEach((e, i) => {
    e.heExactKey = nfc(e.he);
    e.heNormKey = normalizeText(e.he);
    e.heNoVowelsKey = normalizeText(stripHebrewMarksAnywhere(e.he));
    addToIndex(indexExact, e.heExactKey, i);
    addToIndex(indexNorm, e.heNormKey, i);
    addToIndex(indexNoVowels, e.heNoVowelsKey, i);

    // Alias compuestos / maqaf / espacios (alineado con el comparador)
    const aliases = buildHebrewAliases(e.he);
    for (const a of aliases) {
      const aExact = nfc(a);
      const aNorm = normalizeText(a);
      const aNoV = normalizeText(stripHebrewMarksAnywhere(a));
      addToIndex(indexExact, aExact, i);
      addToIndex(indexNorm, aNorm, i);
      addToIndex(indexNoVowels, aNoV, i);
    }
  });
}

function isObj(x) { return x && typeof x === 'object' && !Array.isArray(x); }

function pickSpanish(obj) {
  if (!obj || typeof obj !== 'object') return '';
  const cands = Array.isArray(obj.candidatos) ? obj.candidatos : [];
  const cand1 = cands.length ? String(cands[0] ?? '').trim() : '';
  const eq = [
    obj.equivalencia_espanol,
    obj['equivalencia_español'],
    obj.equivalencia,
    obj.espanol,
    obj['español']
  ].find(v => typeof v === 'string' && v.trim());
  return cand1 || (typeof eq === 'string' ? eq.trim() : '');
}

function pickGreek(obj) {
  if (!obj || typeof obj !== 'object') return '';
  const keys = ['equivalencia_griega', 'griego', 'gr', 'greek', 'lxx', 'septuaginta'];
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

function pickHebrew(obj) {
  if (!obj || typeof obj !== 'object') return '';
  const keys = ['texto_hebreo','hebreo','forma_hebrea','forma','lemma','lexema','word','token'];
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && RE_HEB.test(v)) return v.trim();
  }
  return '';
}

function collectAlefatoEntries(node, sourceName, out, seenObjects = new WeakSet()) {
  if (node == null) return;
  if (Array.isArray(node)) {
    for (const item of node) collectAlefatoEntries(item, sourceName, out, seenObjects);
    return;
  }
  if (!isObj(node)) return;
  if (seenObjects.has(node)) return;
  seenObjects.add(node);

  const he = pickHebrew(node);
  if (he) {
    const es = pickSpanish(node);
    const gr = pickGreek(node);
    const candidatos = Array.isArray(node.candidatos)
      ? node.candidatos.map(v => String(v ?? '').trim()).filter(Boolean)
      : [];
    out.push({ he: nfc(he), es: es || '', gr: gr || '', candidatos, source: sourceName });
  }

  for (const v of Object.values(node)) {
    if (Array.isArray(v) || isObj(v)) collectAlefatoEntries(v, sourceName, out, seenObjects);
  }
}

function dedupeEntries(list) {
  const seen = new Set();
  const out = [];
  for (const e of list) {
    const key = `${e.he}\u0000${e.es}\u0000${e.gr || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

function renderLoadInfo() {
  if (searchBtn) searchBtn.disabled = false;
}

function setTierBadge(text, ok=false) {
    if (!matchTierEl) return;
  matchTierEl.textContent = text;
  matchTierEl.className = 'badge ' + (ok ? 'ok' : 'warn');
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

// ================== Glosa gramatical ES (prefijos/sufijos inseparables) ==================
const ES_PRON_SUFFIX_RULES = [
  { suf:'יהם', poss:'de ellos', kind:'post' },
  { suf:'יהן', poss:'de ellas', kind:'post' },
  { suf:'יכם', poss:'vuestro/a(s)', kind:'pre' },
  { suf:'יכן', poss:'vuestra(s)', kind:'pre' },
  { suf:'ינו', poss:'nuestro/a(s)', kind:'pre' },
  { suf:'יה',  poss:'su', kind:'pre' },
  { suf:'יו',  poss:'su', kind:'pre' },
  { suf:'יך',  poss:'tu', kind:'pre' },
  { suf:'יכ',  poss:'tu', kind:'pre' },
  { suf:'כם',  poss:'vuestro/a(s)', kind:'pre' },
  { suf:'כן',  poss:'vuestra(s)', kind:'pre' },
  { suf:'הם',  poss:'de ellos', kind:'post' },
  { suf:'הן',  poss:'de ellas', kind:'post' },
  { suf:'נו',  poss:'nuestro/a(s)', kind:'pre' },
  { suf:'תי',  poss:'mi', kind:'pre' },
  { suf:'ני',  poss:'me', kind:'obj' },
  { suf:'מו',  poss:'de ellos', kind:'post' }, // forma poética/arcaica
  { suf:'הו',  poss:'lo/su', kind:'obj_or_poss' },
  { suf:'ם',   poss:'de ellos', kind:'post', low:true },
  { suf:'ן',   poss:'de ellas', kind:'post', low:true },
  { suf:'ו',   poss:'su', kind:'pre', low:true },
  { suf:'י',   poss:'mi', kind:'pre', low:true },
  { suf:'ך',   poss:'tu', kind:'pre', low:true },
  { suf:'ה',   poss:'su', kind:'pre', low:true }
];

const ES_SPECIAL_FORM_ENHANCERS = new Map([
  ['בטרם', (es) => {
    const t = normalizeSpanishSpaces(es || '');
    if (!t) return t;
    if (/^antes(?:\s+de)?$/i.test(t)) return /de$/i.test(t) ? t : (t + ' de');
    if (/^antes\b/i.test(t) && !/\bde\b/i.test(t)) return t + ' de';
    return t;
  }]
]);

