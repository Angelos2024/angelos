/**
 * Política global de saneamiento de la columna griega en el laboratorio MT↔LXX.
 * Configuración viva: IdiomaORIGEN/lxx-global-align-policy.json
 *
 * Se ejecuta tras AdminLxxAlign → hints → AdminLxxAutoStrong.
 * También puede reubicar artículos griegos de una sola palabra (τὴν, τόν, ὁ…) que el DP dejó en conjunción o אֵת
 * hacia el siguiente casillero hebreo ART/XD vacío (orden de palabra LXX distinto; p. ej. «ha-árets» ↔ «τὴν γῆν»).
 * No sustituye pistas por versículo salvo saneamiento posterior; reduce errores sistemáticos (hebreo en griego,
 * artículo con el mismo lexema que el sustantivo siguiente, duplicados seguros tipo ἐπάνω).
 * Tras la reubicación de artículos: reglas léxicas MT↔LXX (H8432 + בְּ ~ ἐν μέσῳ; H1961 jussivo mal
 * etiquetado como conjunción cuando el LXX lleva imperativo aor. pas./pres. medio V.APD/V.PAD;
 * H1961 wayyiqtol (VqAm…): καί en el casillero del verbo → ἐγένετο donde el LXX tiene γίγνομαι V.AMI);
 * H1242 בֹּקֶר: rellenar πρωί desde el verso LXX si la casilla está vacía/Hebreo/καί;
 * ordinales de día (H8145, H7992, …): tomar δευτέρα/τρίτη/… del verso cuando la casilla griega está rota.
 */
(function(global){
  'use strict';

  const DEFAULT_POLICY = {
    version: 2,
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
    ],
    /** Desplazamientos LXX: artículo griegos (τὴν, τόν, ὁ…) en renglón de ו, אֵת, etc. → mover al siguiente XD/ART vacío */
    relocateStrayGreekArticles: true,
    relocateStrayArticleLookahead: 6,
    relocateStrayGreekArticlePasses: 2,
    /** Tras mover el artículo, si el renglón hebreo era conjunción (CC) y quedó vacío, poner καὶ (caso típico ו) */
    fillKaiForEmptyHebrewConjunction: true,
    /** תוֹךְ (H8432) tras בְּ~ἐν: tomar el segundo miembro de ἔν μέσῳ / ἐν μέσον del verso LXX */
    fixGlobalH8432EnMeso: true,
    /** יְהִי juss. (H1961 + etiqueta JUSS): no mostrar καί si el verso tiene V.APD/V.PAD (γενηθήτω, ἔστω…) */
    fixGlobalH1961JussiveKai: true,
    /** יְהִי wayyiqtol (H1961 + VqAm…): καί en el verbo → ἐγένετο (γίγνομαι V.AMI en el verso LXX) */
    fixGlobalH1961WayyiqtolKai: true,
    /** בֹּקֶר (H1242): superficie griega vacía/hebreo/conjunción → πρωί del verso LXX */
    fixGlobalH1242Proi: true,
    /** יוֹם + ordinal escolar (2.º–6.º día): casillero griego roto → forma ordinal del texto LXX del verso */
    fixGlobalOrdinalDayFromLxx: true
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

  function isHebrewConjunctionColumn(col){
    const lab = String(col?.label || '').trim().toUpperCase();
    if(lab === 'CC' || lab === 'CS') return true;
    if(/^CONJ(?:\.|$)/.test(lab)) return true;
    return false;
  }

  /** Una sola palabra griega que funciona como artículo (incl. formas acentuadas tras quitar diacríticos). */
  function isSingleGreekArticleToken(surface){
    let raw = String(surface || '').trim();
    if(!raw || raw === '—') return false;
    raw = raw.replace(/[,;:·.]+$/g, '').trim();
    if(/\s/.test(raw)) return false;
    const key = raw
      .normalize('NFD')
      .replace(/[\u0300-\u036f\u0345]/g, '')
      .toLowerCase();
    return /^(ο|η|το|οι|αι|τα|του|της|των|τω|τη|τοις|ταις|τον|την|τους|τας)$/.test(key);
  }

  /**
   * Cuando el algoritmo desplaza el artículo griego a un renglón funcional (conjunción, אֵת…),
   * coloca ese término en el siguiente casillero de artículo hebreo (הַ / הָ) que siga vacío.
   */
  function relocateStrayGreekArticlesPass(columns, surfaces, tiers, pol){
    const n = columns.length;
    const win = Math.max(1, Number(pol.relocateStrayArticleLookahead) || 6);
    const fillKai = pol.fillKaiForEmptyHebrewConjunction !== false;

    for(let i = 0; i < n; i += 1){
      const surf = String(surfaces[i] || '').trim();
      if(!surf || surf === '—') continue;
      if(!isSingleGreekArticleToken(surf)) continue;
      if(isArticleColumn(columns[i])) continue;

      let target = -1;
      for(let j = i + 1; j <= Math.min(i + win, n - 1); j += 1){
        if(!isArticleColumn(columns[j])) continue;
        const dest = String(surfaces[j] || '').trim();
        if(dest && dest !== '—') continue;
        target = j;
        break;
      }
      if(target < 0) continue;

      surfaces[target] = surf;
      surfaces[i] = '—';
      tiers[target] = tiers[target] || 'hint';
      tiers[i] = 'hint';

      if(fillKai && isHebrewConjunctionColumn(columns[i])){
        const now = String(surfaces[i] || '').trim();
        if(!now || now === '—'){
          surfaces[i] = 'καὶ';
          tiers[i] = 'hint';
        }
      }
    }
  }

  function lexemeInDedupeList(surface, list){
    const cur = String(surface || '').trim().normalize('NFC');
    if(!cur || !Array.isArray(list) || !list.length) return false;
    return list.some((g) => String(g || '').trim().normalize('NFC') === cur);
  }

  function normalizeStrongLocal(value){
    const text = String(value || '').trim().toUpperCase();
    if(!text) return '';
    if(/^H\d+$/.test(text)) return text;
    if(/^\d+$/.test(text)) return `H${text}`;
    return text;
  }

  /** Igual que normGr en admin-lxx-align: comparar superficie griega sin acentos. */
  function normGrPlain(s){
    let t = String(s || '').normalize('NFD');
    t = t.replace(/\u0390/g, '\u03B9\u0308').replace(/\u03B0/g, '\u03C5\u0308').replace(/\u0386/g, '\u03AC');
    t = t.replace(/[\u0300-\u036f\u0342]/g, '');
    return t.replace(/\u03C2/g, '\u03C3').toLowerCase().replace(/[^\u0370-\u03FF]/g, '');
  }

  function hebrewPrepLabel(lab){
    const L = String(lab || '').toUpperCase().replace(/\s+/g, '');
    return /^PB|^PM|^PL|^PU|^PP|^PX|^Pf|^Prep/i.test(L) || L.includes('PREP') || L === 'P';
  }

  function isHebrewJussiveVerbColumn(col){
    const lab = String(col?.label || '');
    const compact = lab.toUpperCase().replace(/\./g, '');
    if(/\bJUSS\b/.test(lab.toUpperCase())) return true;
    if(/V[HQN]AJ/i.test(compact)) return true;
    return false;
  }

  function isHebrewWayyiqtolVerbColumn(col){
    const lab = String(col?.label || '');
    const compact = lab.toUpperCase().replace(/\./g, '');
    if(/\bWAYYIQT\b/.test(lab.toUpperCase())) return true;
    if(/V[HQN]AM/i.test(compact)) return true;
    return false;
  }

  function tierAllowsGlobalOverride(tier){
    const t = String(tier || '').toLowerCase().trim();
    if(t === 'firm') return false;
    return true;
  }

  function buildEnMesoSecondWordQueue(gTokens){
    const q = [];
    if(!Array.isArray(gTokens)) return q;
    for(let k = 0; k < gTokens.length - 1; k += 1){
      const w0 = normGrPlain(gTokens[k]?.w);
      const w1 = normGrPlain(gTokens[k + 1]?.w);
      if(w0 === 'εν' && (w1 === 'μεσω' || w1 === 'μεσον')){
        const surf = String(gTokens[k + 1]?.w || '').trim();
        if(surf) q.push(surf);
      }
    }
    return q;
  }

  function buildLxxJussiveVerbSurfaceQueue(gTokens){
    const q = [];
    if(!Array.isArray(gTokens)) return q;
    for(const gt of gTokens){
      if(!gt || !gt.w) continue;
      const m = String(gt.morph || '').trim();
      if(/^V\.(APD|PAD)/.test(m)){
        q.push(String(gt.w).trim());
      }
    }
    return q;
  }

  function buildLxxGinomaiEgenetoQueue(gTokens){
    const q = [];
    if(!Array.isArray(gTokens)) return q;
    for(const gt of gTokens){
      if(!gt || !gt.w) continue;
      const lem = normGrPlain(gt.lemma || '');
      if(lem !== 'γιγνομαι') continue;
      const m = String(gt.morph || '').trim();
      if(/^V\.AMI/.test(m)){
        q.push(String(gt.w).trim());
      }
    }
    return q;
  }

  function greekSurfaceNeedsLxxLexicalFill(surf, conjWl){
    const s = String(surf || '').trim();
    if(!s || s === '—') return true;
    if(containsHebrew(s)) return true;
    if(isConjunctionGreek(s, conjWl)) return true;
    return false;
  }

  function buildLxxProoiSurfaceQueue(gTokens){
    const q = [];
    if(!Array.isArray(gTokens)) return q;
    for(const gt of gTokens){
      if(!gt?.w) continue;
      if(normGrPlain(gt.w) === 'πρωι'){
        q.push(String(gt.w).trim());
      }
    }
    return q;
  }

  const ORDINAL_DAY_STRONG_TO_GREEK_PREFIX = {
    H8145: 'δευτερ',
    H7992: 'τριτ',
    H7243: 'τεταρτ',
    H2549: 'πεμπτ',
    H8345: 'εκτ'
  };

  function ordinalDaySurfaceFromLxx(strong, gTokens){
    const H = normalizeStrongLocal(strong);
    const pref = ORDINAL_DAY_STRONG_TO_GREEK_PREFIX[H];
    if(!pref || !Array.isArray(gTokens)) return '';
    for(const gt of gTokens){
      if(!gt?.w) continue;
      const wN = normGrPlain(gt.w);
      const lN = normGrPlain(gt.lemma || '');
      if(wN.startsWith(pref) || lN.startsWith(pref)){
        return String(gt.w).trim();
      }
    }
    return '';
  }

  function fixGlobalH1242Proi(columns, surfaces, tiers, gTokens, pol){
    if(pol.fixGlobalH1242Proi === false) return;
    if(!Array.isArray(gTokens) || !gTokens.length) return;
    const queue = buildLxxProoiSurfaceQueue(gTokens);
    if(!queue.length) return;
    let qi = 0;
    const conjWl = pol.dedupeConjunctiveGreekWhitelist || DEFAULT_POLICY.dedupeConjunctiveGreekWhitelist;
    const n = columns.length;
    for(let i = 0; i < n; i += 1){
      if(normalizeStrongLocal(columns[i]?.strongs) !== 'H1242') continue;
      if(!tierAllowsGlobalOverride(tiers[i])) continue;
      const surf = String(surfaces[i] || '').trim();
      if(!greekSurfaceNeedsLxxLexicalFill(surf, conjWl)) continue;
      if(qi >= queue.length) continue;
      surfaces[i] = queue[qi];
      qi += 1;
      tiers[i] = tiers[i] || 'hint';
    }
  }

  function fixGlobalOrdinalDayFromLxx(columns, surfaces, tiers, gTokens, pol){
    if(pol.fixGlobalOrdinalDayFromLxx === false) return;
    if(!Array.isArray(gTokens) || !gTokens.length) return;
    const conjWl = pol.dedupeConjunctiveGreekWhitelist || DEFAULT_POLICY.dedupeConjunctiveGreekWhitelist;
    const n = columns.length;
    for(let i = 0; i < n; i += 1){
      const H = normalizeStrongLocal(columns[i]?.strongs);
      if(!ORDINAL_DAY_STRONG_TO_GREEK_PREFIX[H]) continue;
      if(!tierAllowsGlobalOverride(tiers[i])) continue;
      const surf = String(surfaces[i] || '').trim();
      if(!greekSurfaceNeedsLxxLexicalFill(surf, conjWl)) continue;
      const cand = ordinalDaySurfaceFromLxx(H, gTokens);
      if(!cand) continue;
      surfaces[i] = cand;
      tiers[i] = tiers[i] || 'hint';
    }
  }

  function fixGlobalH8432EnMeso(columns, surfaces, tiers, gTokens, pol){
    if(pol.fixGlobalH8432EnMeso === false) return;
    if(!Array.isArray(gTokens) || gTokens.length < 2) return;
    const queue = buildEnMesoSecondWordQueue(gTokens);
    let qi = 0;
    const n = columns.length;
    for(let i = 1; i < n; i += 1){
      if(normalizeStrongLocal(columns[i]?.strongs) !== 'H8432') continue;
      if(!hebrewPrepLabel(columns[i - 1]?.label)) continue;
      if(normGrPlain(surfaces[i - 1]) !== 'εν') continue;
      if(!tierAllowsGlobalOverride(tiers[i])) continue;
      const surf = String(surfaces[i] || '').trim();
      const sNorm = surf && surf !== '—' ? normGrPlain(surf) : '';
      if(sNorm === 'μεσω' || sNorm === 'μεσον') continue;
      if(qi >= queue.length) continue;
      if(surf && surf !== '—' && !isConjunctionGreek(surf, pol.dedupeConjunctiveGreekWhitelist)) continue;
      surfaces[i] = queue[qi];
      qi += 1;
      tiers[i] = tiers[i] || 'hint';
    }
  }

  function fixGlobalH1961JussiveKai(columns, surfaces, tiers, gTokens, pol){
    if(pol.fixGlobalH1961JussiveKai === false) return;
    if(!Array.isArray(gTokens) || !gTokens.length) return;
    const queue = buildLxxJussiveVerbSurfaceQueue(gTokens);
    if(!queue.length) return;
    let qi = 0;
    const conjWl = pol.dedupeConjunctiveGreekWhitelist || DEFAULT_POLICY.dedupeConjunctiveGreekWhitelist;
    const n = columns.length;
    for(let i = 0; i < n; i += 1){
      if(normalizeStrongLocal(columns[i]?.strongs) !== 'H1961') continue;
      if(isHebrewConjunctionColumn(columns[i])) continue;
      if(!isHebrewJussiveVerbColumn(columns[i])) continue;
      if(!tierAllowsGlobalOverride(tiers[i])) continue;
      const surf = String(surfaces[i] || '').trim();
      if(!isConjunctionGreek(surf, conjWl)) continue;
      if(qi >= queue.length) break;
      surfaces[i] = queue[qi];
      qi += 1;
      tiers[i] = tiers[i] || 'hint';
    }
  }

  function fixGlobalH1961WayyiqtolKai(columns, surfaces, tiers, gTokens, pol){
    if(pol.fixGlobalH1961WayyiqtolKai === false) return;
    if(!Array.isArray(gTokens) || !gTokens.length) return;
    const queue = buildLxxGinomaiEgenetoQueue(gTokens);
    if(!queue.length) return;
    let qi = 0;
    const conjWl = pol.dedupeConjunctiveGreekWhitelist || DEFAULT_POLICY.dedupeConjunctiveGreekWhitelist;
    const n = columns.length;
    for(let i = 0; i < n; i += 1){
      if(normalizeStrongLocal(columns[i]?.strongs) !== 'H1961') continue;
      if(isHebrewConjunctionColumn(columns[i])) continue;
      if(!isHebrewWayyiqtolVerbColumn(columns[i])) continue;
      if(isHebrewJussiveVerbColumn(columns[i])) continue;
      if(!tierAllowsGlobalOverride(tiers[i])) continue;
      const surf = String(surfaces[i] || '').trim();
      if(!isConjunctionGreek(surf, conjWl)) continue;
      if(qi >= queue.length) break;
      surfaces[i] = queue[qi];
      qi += 1;
      tiers[i] = tiers[i] || 'hint';
    }
  }

  /**
   * @param {object[]} columns
   * @param {string[]} surfaces
   * @param {string[]} tiers
   * @param {object[]} gTokens Tokens LXX del verso ({ w, morph, lemma, … })
   * @param {object} policy
   */
  function applyGlobalPolicy(columns, surfaces, tiers, gTokens, policy){
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

    if(pol.relocateStrayGreekArticles !== false){
      const passes = Math.min(5, Math.max(1, Number(pol.relocateStrayGreekArticlePasses) || 2));
      for(let p = 0; p < passes; p += 1){
        relocateStrayGreekArticlesPass(columns, surfaces, tiers, pol);
      }
    }

    if(Array.isArray(gTokens) && gTokens.length){
      fixGlobalH8432EnMeso(columns, surfaces, tiers, gTokens, pol);
      fixGlobalH1961JussiveKai(columns, surfaces, tiers, gTokens, pol);
      fixGlobalH1961WayyiqtolKai(columns, surfaces, tiers, gTokens, pol);
      fixGlobalH1242Proi(columns, surfaces, tiers, gTokens, pol);
      fixGlobalOrdinalDayFromLxx(columns, surfaces, tiers, gTokens, pol);
    }
  }

  global.AdminLxxGlobalPolicy = {
    DEFAULT_POLICY,
    ensurePolicy,
    getDefaultPolicy,
    apply: applyGlobalPolicy
  };
})(typeof window !== 'undefined' ? window : globalThis);
