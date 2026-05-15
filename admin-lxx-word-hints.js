/**
 * Modulo editorial MT ⇄ token LXX (Rahlfs por versiculo ya desfasado).
 * Datos: IdiomaORIGEN/lxx-mt-word-hints/chapters/<slug>/<capitulo>.json
 *
 * Las pistas sobrescriben la salida heuristica de AdminLxxAlign (tier `hint`).
 */
(function(global){
  'use strict';

  function normalizeTokenNumKey(token){
    const n = token && token.num;
    if(Array.isArray(n)){ return n.map((x) => String(x)).join(','); }
    return String(n ?? '');
  }

  /**
   * @param {object[]} columns Metadatos por celda (tokenNum, morphemeIdx, …)
   * @param {string[]} surfaces Salida mutable alineacion griega
   * @param {string[]} tiers Salida mutable ('firm'|'soft'|'hint'|'')
   * @param {object[]} gTokens Tokens LXX del versiculo activo
   * @param {object[]} hints Lista desde JSON hints para ese versiculo MT
   */
  function applyHintsToAlignment(columns, surfaces, tiers, gTokens, hints){
    if(!Array.isArray(columns) || !Array.isArray(surfaces) || !Array.isArray(tiers)){
      return;
    }
    if(!Array.isArray(hints) || !hints.length || !Array.isArray(gTokens)){
      return;
    }

    const addrToIdx = new Map();
    columns.forEach((col, idx) => {
      const tk = String(col.tokenNum ?? '');
      const mi = Number(col.morphemeIdx);
      const morIdx = Number.isFinite(mi) ? mi : 0;
      addrToIdx.set(`${tk}|${morIdx}`, idx);
    });

    hints.forEach((h, ord) => {
      const tk = String(h.tokenNum ?? '').trim();
      const mi = Number(h.morphemeIdx);
      const morIdx = Number.isFinite(mi) ? mi : 0;
      const li = Number(h.lxxIdx);

      if(!tk || !Number.isFinite(li) || li < 0 || li >= gTokens.length){
        return;
      }

      const colIdx = addrToIdx.get(`${tk}|${morIdx}`);
      if(colIdx == null){
        return;
      }

      const col = columns[colIdx];
      const strongWant = h.strong ? String(h.strong).trim().toUpperCase() : '';
      if(strongWant){
        const colS = String(col?.strongs || '').trim().toUpperCase();
        if(colS !== strongWant){ return; }
      }

      let surf = h.surface != null && String(h.surface).trim()
        ? String(h.surface).trim()
        : String(gTokens[li]?.w || '').trim();
      if(!surf) return;

      surfaces[colIdx] = surf;
      const tierHint = String(h.tier || 'hint').toLowerCase();
      tiers[colIdx] = tierHint === 'soft' ? 'soft' : 'hint';
      void ord;
    });
  }

  global.AdminLxxWordHints = {
    normalizeTokenNumKey,
    applyHintsToAlignment
  };
})(typeof window !== 'undefined' ? window : globalThis);
