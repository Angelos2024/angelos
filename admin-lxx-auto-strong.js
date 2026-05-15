/**
 * Relleno conservador MT⇄LXX usando Strong hebreo ↔ familias griegas del corpus
 * genealogico (equivalencias_trilingue.min.json). Solo escribe en celdas vacias cuando
 * hay un unico candidato griego compatible (tras filtro morfologico opcional).
 */
(function(global){
  'use strict';

  const EQUIV_URL = './diccionario/equivalencias_trilingue.min.json';
  let strongMapPromise = null;
  /** @type {Map<string, Set<string>>} */
  let strongToGrNorm = null;

  function normGr(s){
    let t = String(s || '').normalize('NFD');
    t = t.replace(/\u0390/g, '\u03B9\u0308').replace(/\u03B0/g, '\u03C5\u0308').replace(/\u0386/g, '\u03AC');
    t = t.replace(/[\u0300-\u036f\u0342]/g, '');
    return t.replace(/\u03C2/g, '\u03C3').toLowerCase().replace(/[^\u0370-\u03FF]/g, '');
  }

  function normStrongHe(s){
    const m = /^H(\d{1,5})$/i.exec(String(s || '').trim());
    return m ? `H${m[1]}` : '';
  }

  function extractStrongFromHeField(entry){
    const m = /^H(\d{3,5})\b/i.exec(String(entry || '').trim());
    return m ? `H${m[1]}` : '';
  }

  function gSurfaceMatchesNormSet(gt, normSet){
    const w = normGr(gt?.w);
    const lem = normGr(gt?.lemma);
    if(!w && !lem) return false;
    for(const ng of normSet){
      if(!ng || ng.length < 2) continue;
      if(w === ng || lem === ng) return true;
      /** Flexion vocalica corta */
      if(ng.length >= 5 && (w.startsWith(ng) || lem.startsWith(ng))) return true;
      if((w.length >= 5 || lem.length >= 5) && (ng.startsWith(w) || ng.startsWith(lem)) && Math.min(w.length, lem.length) >= 4){
        return true;
      }
    }
    return false;
  }

  function morphCoarseOk(col, gt){
    const lab = String(col?.label || '').toUpperCase().replace(/\s+/g, '');
    const gm = String(gt?.morph || '').trim();
    if(/^PB|^PM|^PL|^PU|^PP|^PX|^Pf|^Prep/i.test(lab) || lab.includes('PREP') || lab === 'P'){
      return gm === 'P';
    }
    if(/^CC|^CONJ|^C$|^XC|^CO|^CK/i.test(lab)){ return gm === 'C'; }
    if(/^ART|^XD|^DET/.test(lab)){ return /^ra\./i.test(gm); }
    if(/^AND|^XN|^TN|NEG/i.test(lab)){ return /^[Dd]$/i.test(gm); }
    if(/SUBS|NC|PROP|NPROP|NP/.test(lab)){ return /^N\./.test(gm); }
    if(/VERBO|VERB|VQ|VH|VN/.test(lab)){ return /^V\./.test(gm); }
    if(/ADJ/.test(lab)){ return /^A\./.test(gm); }
    if(/SUF|PRS|PRON|RBSC|RBPM|RBPC|RBS/i.test(lab)){ return /^RP/i.test(gm); }
    return true;
  }

  /**
   * Griegos ya cubiertos por alineacion previa (superficie igual, orden izquierda-derecha).
   */
  function buildClaimedGreekIndices(surfaces, gTok){
    const claimed = new Set();
    let searchFrom = 0;
    for(let ci = 0; ci < surfaces.length; ci += 1){
      const surf = String(surfaces[ci] || '').trim();
      if(!surf) continue;
      const target = normGr(surf);
      if(!target) continue;
      for(let gj = searchFrom; gj < gTok.length; gj += 1){
        if(claimed.has(gj)) continue;
        if(normGr(gTok[gj]?.w) === target || normGr(gTok[gj]?.lemma) === target){
          claimed.add(gj);
          searchFrom = gj + 1;
          break;
        }
      }
    }
    return claimed;
  }

  function hydrateStrongMap(data){
    const map = new Map();
    const rows = Array.isArray(data) ? data : (data?.rows || []);

    rows.forEach((row) => {
      const heSide = Array.isArray(row.he) ? row.he : [];
      const grSide = Array.isArray(row.gr) ? row.gr : [];
      const strongKeys = new Set();
      heSide.forEach((cell) => {
        const hk = extractStrongFromHeField(cell);
        if(hk) strongKeys.add(hk);
      });

      const norms = new Set();
      grSide.forEach((tok) => {
        const n = normGr(tok);
        if(n.length >= 2 && n.length <= 24){ norms.add(n); }
      });

      if(!strongKeys.size || !norms.size) return;

      strongKeys.forEach((hk) => {
        if(!map.has(hk)) map.set(hk, new Set());
        const bucket = map.get(hk);
        norms.forEach((n) => bucket.add(n));
      });
    });

    strongToGrNorm = map;
  }

  function ensureStrongMap(loadJsonFn){
    if(strongMapPromise) return strongMapPromise;
    strongMapPromise = loadJsonFn(EQUIV_URL)
      .then((payload) => { hydrateStrongMap(payload); })
      .catch(() => { strongToGrNorm = new Map(); });
    return strongMapPromise;
  }

  /**
   * @param {object[]} columns
   * @param {string[]} surfaces
   * @param {string[]} tiers
   * @param {object[]} gTok
   */
  function fillVerifiedByStrong(columns, surfaces, tiers, gTok){
    if(!strongToGrNorm || !(strongToGrNorm instanceof Map)) return;
    if(!Array.isArray(columns) || !Array.isArray(surfaces) || !Array.isArray(gTok)) return;

    const claimed = buildClaimedGreekIndices(surfaces, gTok);
    let minGreek = 0;

    for(let ci = 0; ci < columns.length; ci += 1){
      if(String(surfaces[ci] || '').trim()) continue;

      const hk = normStrongHe(columns[ci]?.strongs);
      if(!hk) continue;

      const normSet = strongToGrNorm.get(hk);
      if(!normSet || !normSet.size) continue;

      const candidates = [];
      for(let gj = Math.max(0, minGreek); gj < gTok.length; gj += 1){
        if(claimed.has(gj)) continue;
        if(!gSurfaceMatchesNormSet(gTok[gj], normSet)) continue;
        candidates.push(gj);
      }

      let chosen = null;
      if(candidates.length === 1){
        chosen = candidates[0];
      }else if(candidates.length > 1){
        const narrowed = candidates.filter((gj) => morphCoarseOk(columns[ci], gTok[gj]));
        if(narrowed.length === 1){ chosen = narrowed[0]; }
      }

      if(chosen == null) continue;

      const surf = String(gTok[chosen]?.w || '').trim();
      if(!surf) continue;

      surfaces[ci] = surf;
      if(!tiers[ci]) tiers[ci] = 'auto';
      claimed.add(chosen);
      minGreek = chosen + 1;
    }
  }

  global.AdminLxxAutoStrong = {
    ensureMap(loadJsonFn){
      return ensureStrongMap(loadJsonFn);
    },
    fillVerifiedByStrong
  };
})(typeof window !== 'undefined' ? window : globalThis);
