/* Web Worker: búsqueda por índice invertido */

let indices = {
  es: null,
  gr: null,
  he: null
};

function normalizeLatin(s){
  return (s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g," ")
    .trim();
}
function normalizeGreek(s){
  return (s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/ς/g,"σ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g," ")
    .trim();
}
function normalizeHebrew(s){
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0591-\u05AF\u05B0-\u05BC\u05BD\u05BF\u05C1-\u05C2\u05C7]/g,"")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g," ")
    .trim();
}
function tokenize(norm){
  if(!norm) return [];
  return norm.split(" ").map(t => t.trim()).filter(t => t.length >= 2);
}

function intersectLists(a, b){
  if(!a || !b || !a.length || !b.length) return [];
  const small = a.length <= b.length ? a : b;
  const big = a.length <= b.length ? b : a;
  const set = new Set(small);
  return big.filter(x => set.has(x));
}
function collectRefsForToken(tokenMap, tok){
  if(!tokenMap) return [];
  if(tokenMap[tok]) return tokenMap[tok].slice();
  const refs = [];
  const seen = new Set();
  for(const [key, arr] of Object.entries(tokenMap)){
    if(!key.includes(tok)) continue;
    for(const ref of arr){
      if(seen.has(ref)) continue;
      seen.add(ref);
      refs.push(ref);
    }
  }
  return refs;
}
async function loadIndex(lang, url){
  const r = await fetch(url, { cache: "force-cache" });
  if(!r.ok) throw new Error(`No se pudo cargar índice ${lang}`);
  const data = await r.json();
  indices[lang] = data;
}

function searchOne(lang, query){
  const idx = indices[lang];
  if(!idx) return [];

  let norm = "";
  if(lang === "es") norm = normalizeLatin(query);
  else if(lang === "gr") norm = normalizeGreek(query);
  else norm = normalizeHebrew(query);

  const toks = tokenize(norm);
  if(!toks.length) return [];

  let hits = null;
  for(const tok of toks){
    const arr = collectRefsForToken(idx.tokens, tok);
    hits = hits === null ? arr.slice() : intersectLists(hits, arr);
    if(!hits.length) break;
  }
  return hits.map(ref => ({ lang, ref }));
}

self.onmessage = async (ev) => {
  const msg = ev.data || {};
  try{
    if(msg.type === "load"){
      await loadIndex(msg.lang, msg.url);
      self.postMessage({ type:"loaded", lang: msg.lang });
      return;
    }
 if(msg.type === "search"){
      const langs = msg.mode === "all" ? ["es", "gr", "he"] : [msg.mode];
      var items = [];
      for(const lang of langs){
        items = items.concat(searchOne(lang, msg.query));
      }
      self.postMessage({ type:"results", items });
      return;
    }
  }catch(err){
    self.postMessage({ type:"error", message: String(err.message || err) });
  }
};
