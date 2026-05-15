/**
 * Política global de saneamiento de la columna griega en el laboratorio MT↔LXX.
 * Configuración viva: IdiomaORIGEN/lxx-global-align-policy.json
 *
 * Se ejecuta tras AdminLxxAlign → hints → AdminLxxAutoStrong.
 * No sustituye pistas por versículo; reduce errores sistemáticos (hebreo en griego,
 * artículo con el mismo lexema que el sustantivo siguiente, duplicados seguros tipo ἐπάνω).
 */
(function(global){
  'use strict';

  const DEFAULT_POLICY = {
    version: 1,
    stripHebrewFromGreek: true,
    stripHebrewMarksTier: 'hint',
    collapseArticleDuplicateLexicalGreek: true,
    dedupeConsecutiveIdenticalGreek: true,
    dedupeAllConsecutiveIdenticalExceptConjunctions: false,
    dedupeConjunctiveGreekWhitelist: [
      'καί', 'καὶ', 'δέ', 'δὲ', 'τε', 'ἀλλά', 'ἀλλὰ', 'μηδέ', 'μηδὲ', 'οὐδέ', 'οὐδὲ'
    ],
    dedupeGreekLexemesForSecondBlank: [
      'ἐπάνω', 'ὑποκάτω', 'διά', 'διὰ', 'μετά', 'μετὰ', 'ἀνά', 'ἀνὰ', 'πρός', 'πρὸς'
    ]
  };

  let policyCache = null;

  function mergePolicyFromJson(raw){
    if(!raw || typeof raw !== 'object') return { ...DEFAULT_POLICY };
    const clean = {};
    Object.keys(raw).forEach((k) => {
      if(k.startsWith('_')) return;
      clean[k] = raw[k];
    });
    return { ...DEFAULT_POLICY, ...clean };
  }

  /**
   * @param {function(string): Promise<any>} [loadJsonFn]
   */
  async function ensurePolicy(loadJsonFn){
    if(policyCache) return policyCache;
    try{
      if(typeof loadJsonFn === 'function'){
        const j = await loadJsonFn('./IdiomaORIGEN/lxx-global-align-policy.json');
        policyCache = mergePolicyFromJson(j);
      }else{
        policyCache = { ...DEFAULT_POLICY };
      }
    }catch(_e){
      policyCache = { ...DEFAULT_POLICY };
    }
    return policyCache;
  }

  function getDefaultPolicy(){
    return { ...DEFAULT_POLICY };
  }

  function containsHebrew(s){
    return /[\u0590-\u05FF]/.test(String(s || ''));
  }

  function isConjunctionGreek(s, whitelist){
    const t = String(s || '').trim();
    const list = Array.isArray(whitelist) ? whitelist : [];
    const lower = t.toLowerCase();
    return list.some((w) => String(w || '').trim().toLowerCase() === lower);
  }

  function isArticleColumn(col){
    const lab = String(col?.label || '').trim().toUpperCase();
    if(lab === 'ART' || lab === 'XD' || lab === 'RD' || lab === 'TD') return true;
    if(/^ART(\.|$)/.test(lab)) return true;
    return false;
  }

  function lexemeInDedupeList(surface, list){
    const cur = String(surface || '').trim().normalize('NFC');
    if(!cur || !Array.isArray(list) || !list.length) return false;
    return list.some((g) => String(g || '').trim().normalize('NFC') === cur);
  }

  /**
   * @param {object[]} columns
   * @param {string[]} surfaces
   * @param {string[]} tiers
   * @param {object[]} _gTokens Reservado para reglas futuras que necesiten índice LXX
   * @param {object} policy
   */
  function applyGlobalPolicy(columns, surfaces, tiers, _gTokens, policy){
    if(!policy || !Array.isArray(columns) || !Array.isArray(surfaces) || !Array.isArray(tiers)){
      return;
    }
    const pol = { ...DEFAULT_POLICY, ...policy };
    const n = surfaces.length;
    const conjWl = pol.dedupeConjunctiveGreekWhitelist || DEFAULT_POLICY.dedupeConjunctiveGreekWhitelist;
    const dedupeLexList = pol.dedupeGreekLexemesForSecondBlank || DEFAULT_POLICY.dedupeGreekLexemesForSecondBlank;

    if(pol.stripHebrewFromGreek){
      const markTier = pol.stripHebrewMarksTier || 'hint';
      for(let i = 0; i < n; i += 1){
        const s = String(surfaces[i] || '').trim();
        if(!s) continue;
        if(containsHebrew(s)){
          surfaces[i] = '—';
          tiers[i] = markTier;
        }
      }
    }

    if(pol.collapseArticleDuplicateLexicalGreek){
      for(let i = 0; i < n - 1; i += 1){
        const a = String(surfaces[i] || '').trim();
        const b = String(surfaces[i + 1] || '').trim();
        if(!a || !b || a !== b) continue;
        if(!isArticleColumn(columns[i])) continue;
        if(isArticleColumn(columns[i + 1])) continue;
        surfaces[i] = '—';
        tiers[i] = 'hint';
      }
    }

    if(pol.dedupeConsecutiveIdenticalGreek){
      const restrict = !pol.dedupeAllConsecutiveIdenticalExceptConjunctions;
      for(let i = 1; i < n; i += 1){
        const prev = String(surfaces[i - 1] || '').trim();
        const cur = String(surfaces[i] || '').trim();
        if(!prev || !cur || prev !== cur) continue;
        if(isConjunctionGreek(cur, conjWl)) continue;
        if(restrict && !lexemeInDedupeList(cur, dedupeLexList)) continue;
        surfaces[i] = '—';
        tiers[i] = 'hint';
      }
    }
  }

  global.AdminLxxGlobalPolicy = {
    DEFAULT_POLICY,
    ensurePolicy,
    getDefaultPolicy,
    apply: applyGlobalPolicy
  };
})(typeof window !== 'undefined' ? window : globalThis);
