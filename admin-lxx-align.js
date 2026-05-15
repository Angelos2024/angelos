/**
 * Alineacion español (gloss laboratorio) ⇄ tokens LXX del verso (orden griego).
 * DP monotono + parejas firm / soft + relleno monotono de huecos.
 * La capa 'soft' amplia cobertura sin indice verso-a-verso completo.
 */
(function(global){
  'use strict';

  const EQUIV_URL = './diccionario/equivalencias_trilingue.min.json';
  let weakEsToGrPromise = null;
  let weakEsToGr = null;

  const NEG = -1e12;
  const EPS = 1e-9;

  function normEsPhrase(s){
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zñ0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function esHeadWord(gloss){
    const txt = normEsPhrase(gloss || '');
    if(!txt) return '';
    return txt.split(/\s+/).filter(Boolean)[0] || '';
  }

  function normGr(s){
    let t = String(s || '').normalize('NFD');
    t = t.replace(/\u0390/g, '\u03B9\u0308').replace(/\u03B0/g, '\u03C5\u0308').replace(/\u0386/g, '\u03AC');
    t = t.replace(/[\u0300-\u036f\u0342]/g, '');
    return t.replace(/\u03C2/g, '\u03C3').toLowerCase().replace(/[^\u0370-\u03FF]/g, '');
  }

  function bridgeScore(esH, gSurfNorm, gLemmaNorm, gmorphRaw){
    if(!esH) return 0;
    const g = gSurfNorm || '';
    const lem = gLemmaNorm || '';
    const bundles = [
      { es: ['en'], targets: ['εν'], score: 98 },
      { es: ['de', 'del', 'des'], targets: ['απο', 'απ', 'εκ'], score: 90 },
      { es: ['a', 'al', 'hacia'], targets: ['εις', 'επι', 'προσ', 'προς'], score: 88 },
      { es: ['con'], targets: ['εν', 'μετα', 'μετ'], score: 75 },
      { es: ['para', 'por'], targets: ['επι', 'υπερ', 'περι', 'δια', 'ινα'], score: 70 },
      { es: ['y', 'e', 'ni'], targets: ['και'], score: 95 },
      { es: ['que'], targets: ['οτι', 'ο'], score: 65 },
      { es: ['no'], targets: ['ου', 'ουκ', 'μη'], score: 85 },
      { es: ['pues'], targets: ['γαρ'], score: 88 },
      { es: ['pero'], targets: ['δε'], score: 80 },
      { es: ['yo', 'me', 'mi', 'mis', 'nos', 'nosotros'], targets: ['εγω', 'μοι', 'με', 'μου', 'ημιν'], score: 78 },
      { es: ['tu', 'te', 'tus', 'ti'], targets: ['συ', 'σοι', 'σε', 'σου'], score: 78 }
    ];

    for(const b of bundles){
      if(!b.es.includes(esH)) continue;
      if(b.targets.some((t) => (g.startsWith(t) || lem.startsWith(t)))) return b.score;
    }

    if(/^(el|los|las|la|un|una)$/i.test(esH)){
      if(/^ra\./i.test(String(gmorphRaw || '').trim())) return 86;
      if(g.length <= 5 && /^τ/.test(g)) return 72;
    }
    return 0;
  }

  function morphAgreementBonus(colLabel, gmorphRaw){
    const lab = String(colLabel || '').toUpperCase().replace(/\s+/g, '');
    const gm = String(gmorphRaw || '').trim();
    let b = 0;
    if(/^PB|^PM|^PL|^PU|^PP|^PX|^Pf|^Prep/i.test(lab) || lab.includes('PREP') || lab === 'P'){
      if(gm === 'P') b = Math.max(b, 74);
    }
    if(/^CC|^C$|^XC|^CO/.test(lab) || lab.includes('CONJ')){
      if(gm === 'C') b = Math.max(b, 76);
    }
    if(/^AND|^XN|^TN|NEG/.test(lab) && /^[Dd]$/i.test(gm)) b = Math.max(b, 58);
    if(/^ART|^XD|^DET/i.test(lab) && /^ra\./i.test(gm)) b = Math.max(b, 72);
    /** Nombre / verbo / adjetivo (Hebreo laboratorio vs etiquetas LXX RA/N/V/A) */
    if(/SUBS|NC|PROP|NPROP|NP/.test(lab) && /^N\./.test(gm)) b = Math.max(b, 54);
    if(/VERBO|VERB|VQ|VH|VN/.test(lab) && /^V\./.test(gm)) b = Math.max(b, 54);
    if(/ADJ/.test(lab) && /^A\./.test(gm)) b = Math.max(b, 50);
    if(/SUF|PRS|PRON|SUFFIX|POS/i.test(lab) && /^RP/.test(gm)) b = Math.max(b, 58);
    return b;
  }

  function hebrewPrepLabel(lab){
    return /^PB|^PM|^PL|^PU|^PP|^PX|^Pf|^Prep/i.test(lab) || lab.includes('PREP') || lab === 'P';
  }

  function weakExactHit(esH, g1, g2, weakBag){
    if(!weakBag || typeof weakBag.has !== 'function' || esH.length < 3 || !weakBag.has(esH)){
      return false;
    }
    for(const gv of weakBag.get(esH)){
      const ng = normGr(gv);
      if(ng && (ng === g1 || ng === g2)) return true;
    }
    return false;
  }

  /**
   * Devuelve true solo si hay evidencia combinada (puente lexical fuerte o coincidencia debil+morfologia).
   */
  function isCertifiedPair(col, gt, weakBag){
    const glossHead = esHeadWord(col.gloss);
    const morph = String(gt?.morph || '').trim();
    const lab = String(col.label || '').toUpperCase().replace(/\s+/g, '');
    const g1 = normGr(gt?.w);
    const g2 = normGr(gt?.lemma);

    const br = bridgeScore(glossHead, g1, g2, morph);
    const morphB = morphAgreementBonus(col.label, morph);
    const weak = weakExactHit(glossHead, g1, g2, weakBag);

    if(br >= 88) return true;

    if(/^(el|los|las|la|un|una)$/.test(glossHead) && /^ra\./i.test(morph)) return true;

    if(/^ART|^XD|^DET/i.test(lab) && /^ra\./i.test(morph) && morphB >= 72) return true;

    if(morph === 'C' && (/^CC|^C$|^XC|^CO/.test(lab) || lab.includes('CONJ')) && morphB >= 74){
      return true;
    }

    if(['yo', 'me', 'mi', 'mis', 'nos', 'nosotros'].includes(glossHead)){
      return br >= 75 && /^rp/i.test(morph);
    }
    if(['tu', 'te', 'tus', 'ti'].includes(glossHead)){
      return br >= 75 && /^rp/i.test(morph);
    }

    if(morph === 'P' && hebrewPrepLabel(lab)){
      if(glossHead && br >= 55 && morphB >= 72) return true;
      if(br >= 70 && morphB >= 72) return true;
      return false;
    }

    if(br >= 80 && (/^xn|^tn|neg/i.test(lab) || glossHead === 'no')) return true;

    if(weak && morphB >= 58) return true;
    if(weak && br >= 68 && morphB >= 48) return true;

    const risky = ['que', 'para', 'por', 'con', 'a', 'al', 'de', 'del', 'des'].includes(glossHead);
    if(risky){
      return br >= 85 || (br >= 72 && morphB >= 62) || weak;
    }

    if(br >= 82 && morphB >= 58) return true;
    if(br >= 72 && morphB >= 68) return true;

    /** Sustantivo / verbo / adj: evidencia debil + columna morfologica alineada */
    const labN = String(col.label || '');
    if(weak && /SUBS|NC|PROP|NPROP|NP/.test(labN) && /^N\./.test(morph)) return morphB >= 45;
    if(weak && /VERBO|VERB|VQ|VH|VN/.test(labN) && /^V\./.test(morph)) return morphB >= 45;
    if(weak && /ADJ/.test(labN) && /^A\./.test(morph)) return morphB >= 42;
    if(weak && /^RP/.test(morph) && morphB >= 48) return true;

    return false;
  }

  /** Emparejamientos DP con buena puntuacion pero criterio lexical menos estricto */
  function isSoftPair(col, gt, weakBag){
    if(isCertifiedPair(col, gt, weakBag)) return false;
    const glossHead = esHeadWord(col.gloss);
    const morph = String(gt?.morph || '').trim();
    const lab = String(col.label || '').toUpperCase();
    const g1 = normGr(gt?.w);
    const g2 = normGr(gt?.lemma);
    const br = bridgeScore(glossHead, g1, g2, morph);
    const morphB = morphAgreementBonus(col.label, morph);
    const weak = weakExactHit(glossHead, g1, g2, weakBag);
    const ms = matchScore(col, gt, weakBag);

    if(ms >= 92) return true;
    if(ms >= 82 && morphB >= 50) return true;
    if(weak && morphB >= 40) return true;
    if(br >= 58 && morphB >= 55) return true;
    if(/SUBS|NC|PROP|NPROP|VERB|VERBO|VQ|VH|VN|ADJ/.test(lab) && ms >= 72 && morphB >= 42) return true;
    return false;
  }

  /** Relleno monotono de huecos restantes (orden preservado) */
  function isGapFillPair(col, gt, weakBag){
    const glossHead = esHeadWord(col.gloss);
    if(!String(col.hebrew || '').replace(/[^\u0590-\u05FF]/g, '').trim() && !glossHead){
      return false;
    }
    const morph = String(gt?.morph || '').trim();
    const lab = String(col.label || '').toUpperCase();
    const g1 = normGr(gt?.w);
    const g2 = normGr(gt?.lemma);
    const morphB = morphAgreementBonus(col.label, morph);
    const weak = weakExactHit(glossHead, g1, g2, weakBag);
    const ms = matchScore(col, gt, weakBag);

    if(ms < 48) return false;
    if(isCertifiedPair(col, gt, weakBag) || isSoftPair(col, gt, weakBag)) return true;
    if(ms >= 76) return true;
    if(weak && morphB >= 32) return true;
    if(ms >= 62 && morphB >= 48) return true;
    if(/SUBS|NC|VERB|VERBO|VQ|ADJ/.test(lab) && ms >= 58) return true;
    return false;
  }

  function columnSkipPenalty(col){
    const gloss = String(col.gloss || '').trim();
    const hb = String(col.hebrew || '').replace(/[^\u0590-\u05FF]/g, '').trim();

    if(!gloss && hb.length <= 1) return 16;

    const heavyLbl = /VERBO|VERB|VQ|VH|VN|ADJ|SUBS|NC|PROP|NP/i.test(String(col.label || ''));
    const heavyGloss = esHeadWord(gloss).length >= 6;
    if(heavyLbl || heavyGloss) return 92;
    return 54;
  }

  function greekSkipPenalty(gt){
    const morph = String(gt?.morph || '').trim();
    const wnorm = normGr(gt?.w);
    if(morph === 'C') return 22;
    if(/^ra\./i.test(morph)) return 34;
    if(morph === 'P') return 34;
    if(/^[Dd]$/i.test(morph)) return 40;
    if(/^V\.|^v\./i.test(morph)) return 94;
    if(wnorm.length >= 15) return 88;
    return 56;
  }

  function matchScore(col, gt, weakBag){
    const esH = esHeadWord(col.gloss);
    const g1 = normGr(gt?.w);
    const g2 = normGr(gt?.lemma);
    let s = bridgeScore(esH, g1, g2, gt?.morph);

    if(weakBag && weakBag.has(esH)){
      for(const gv of weakBag.get(esH)){
        const ng = normGr(gv);
        if(!ng) continue;
        if(g1 === ng || g2 === ng){ s = Math.max(s, 66); break; }
      }
    }
    s += morphAgreementBonus(String(col.label || ''), gt?.morph || '');
    return s;
  }

  function hydrateWeakFromArray(data){
    const map = new Map();
    const rows = Array.isArray(data) ? data : (data?.rows || []);
    rows.forEach((row) => {
      const rawEs = typeof row.es === 'string' ? row.es.trim() : '';
      if(rawEs.length < 2) return;
      const esKey = normEsPhrase(rawEs).split(/\s+/).filter(Boolean)[0] || '';
      if(esKey.length < 3) return;
      if(!map.has(esKey)) map.set(esKey, new Set());
      const target = map.get(esKey);
      const grSide = Array.isArray(row.gr) ? row.gr : [];
      grSide.slice(0, 12).forEach((tok) => {
        const clipped = normGr(String(tok || ''));
        if(clipped.length >= 2 && clipped.length <= 22){ target.add(clipped); }
      });
    });
    weakEsToGr = map;
  }

  function ensureWeakMaps(loadJsonFn){
    if(weakEsToGrPromise) return weakEsToGrPromise;
    weakEsToGrPromise = loadJsonFn(EQUIV_URL)
      .then((payload) => { hydrateWeakFromArray(payload); })
      .catch(() => { weakEsToGr = new Map(); });
    return weakEsToGrPromise;
  }

  function dpAlignColumns(columns, gTokens){
    const cols = columns || [];
    const gTok = Array.isArray(gTokens) ? gTokens : [];
    const n = cols.length;
    const m = gTok.length;
    const weakBag = weakEsToGr instanceof Map ? weakEsToGr : new Map();
    const out = Array(n).fill('');
    const tier = Array(n).fill('');

    if(!n || !m) return { surfaces: out, tiers: tier };

    const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(NEG));
    const bt = Array.from({ length: n + 1 }, () => Array(m + 1).fill(null));

    dp[0][0] = 0;

    function relax(pi, pj, ni, nj, delta, mv){
      const base = dp[pi][pj];
      if(base <= NEG / 10) return;
      const cand = base + delta;
      if(cand > dp[ni][nj] + EPS || (Math.abs(cand - dp[ni][nj]) <= EPS && mv === 'M')){
        dp[ni][nj] = cand;
        bt[ni][nj] = { pi, pj, move: mv };
      }
    }

    for(let pi = 0; pi <= n; pi += 1){
      for(let pj = 0; pj <= m; pj += 1){
        if(dp[pi][pj] <= NEG / 10) continue;
        if(pi < n && pj < m){
          relax(pi, pj, pi + 1, pj + 1, matchScore(cols[pi], gTok[pj], weakBag), 'M');
        }
        if(pi < n){
          relax(pi, pj, pi + 1, pj, -columnSkipPenalty(cols[pi]), 'C');
        }
        if(pj < m){
          relax(pi, pj, pi, pj + 1, -greekSkipPenalty(gTok[pj]), 'G');
        }
      }
    }

    let i = n;
    let j = m;
    if(dp[i][j] <= NEG / 5){ return { surfaces: out, tiers: tier }; }

    const matches = [];

    while(i > 0 || j > 0){
      const node = bt[i][j];
      if(!node) break;
      const { pi, pj, move } = node;

      if(move === 'M'){
        matches.push({ pi, pj });
        if(pi >= 0 && pi < n){ out[pi] = String(gTok[pj]?.w || '').trim(); }
      }
      if(pi <= 0 && pj <= 0) break;
      i = pi;
      j = pj;
    }

    const ordered = matches.slice().reverse();
    const usedG = new Set();

    ordered.forEach(({ pi, pj }) => {
      if(!out[pi]) return;
      if(usedG.has(pj)){
        out[pi] = '';
        tier[pi] = '';
        return;
      }
      if(isCertifiedPair(cols[pi], gTok[pj], weakBag)){
        tier[pi] = 'firm';
        usedG.add(pj);
      }else if(isSoftPair(cols[pi], gTok[pj], weakBag)){
        tier[pi] = 'soft';
        usedG.add(pj);
      }else{
        out[pi] = '';
        tier[pi] = '';
      }
    });

    let scanJ = 0;
    for(let ci = 0; ci < n; ci += 1){
      if(out[ci]) continue;
      while(scanJ < m && usedG.has(scanJ)) scanJ += 1;
      let placed = false;
      for(let gj = scanJ; gj < m; gj += 1){
        if(usedG.has(gj)) continue;
        if(isGapFillPair(cols[ci], gTok[gj], weakBag)){
          out[ci] = String(gTok[gj]?.w || '').trim();
          tier[ci] = 'soft';
          usedG.add(gj);
          scanJ = gj + 1;
          placed = true;
          break;
        }
      }
    }

    return { surfaces: out, tiers: tier };
  }

  global.AdminLxxAlign = {
    ensureMaps(loadJsonFn){
      return ensureWeakMaps(loadJsonFn);
    },
    pairColumnsToGreek(columns, gTokens){
      return dpAlignColumns(columns, gTokens);
    },
    normalizeEsHead: esHeadWord
  };
})(typeof window !== 'undefined' ? window : globalThis);
