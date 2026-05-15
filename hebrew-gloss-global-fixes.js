/**
 * Correcciones globales hebreo→español para el interlineal.
 * Evita que tokens léxicos queden con una glosa que sólo es artículo u objeto directo
 * cuando el sentido exige el sustantivo (p. ej. פְּנֵי en constructo = «faz», no «la»).
 */
(function(global){
  'use strict';

  function normalizeStrong(value){
    const text = String(value || '').trim().toUpperCase();
    if(!text) return '';
    if(/^H\d+$/.test(text)) return text;
    if(/^\d+$/.test(text)) return `H${text}`;
    return text;
  }

  function hebrewPlainLetters(surface){
    return String(surface || '')
      .normalize('NFC')
      .replace(/[\u0591-\u05C7]/g, '')
      .replace(/\u05BE/g, '')
      .trim();
  }

  function morphUpper(token){
    const m = token?.morphs;
    return Array.isArray(m) ? m.join(' ').trim().toUpperCase() : String(m || '').trim().toUpperCase();
  }

  /**
   * Constructo sustantivo en etiquetas tipo OSHB/corpus: «…C» segmentado, PMC (pl. m. cons.),
   * o la forma aparente פְּנֵי (sin mater lectionis: פני).
   */
  function isLikelyNominalConstructForPene(token){
    const plain = hebrewPlainLetters(token?.orig);
    if(plain === 'פני') return true;
    const m = morphUpper(token);
    if(/\.C(?:$|\.)/.test(m)) return true;
    if(/PMC/i.test(m.replace(/\s+/g, ''))) return true;
    return false;
  }

  function isSpanishDeterminerOnly(text){
    const t = String(text || '')
      .replace(/[←→]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/[,:;.!?¿]+$/g, '')
      .trim()
      .toLowerCase();
    if(!t) return true;
    return /^(el|la|los|las|lo|un|una|unos|unas|del|al)$/.test(t);
  }

  /**
   * H6440 (פָּנֶה / פְּנֵי …): en estado constructo nunca debe mostrarse sólo un determinante.
   * @param {string} gloss - Glosa ya normalizada o bruta de una sola parte (p. ej. token.es principal).
   * @param {object} token - Token del interlineal ({ strongs, morphs, notrans, … }).
   * @returns {string}
   */
  function fixH6440ConstructPeneSpanish(gloss, token){
    if(!token || typeof token !== 'object') return gloss;
    if(token.notrans != null && String(token.notrans).trim()) return gloss;
    if(normalizeStrong(token.strongs) !== 'H6440') return gloss;
    if(!isLikelyNominalConstructForPene(token)) return gloss;
    const g = String(gloss ?? '').trim();
    if(g && !isSpanishDeterminerOnly(g)) return gloss;
    return 'faz';
  }

  /**
   * Ajusta el campo `es` del token (string o array) si aplica la regla anterior.
   */
  function patchTokenEsForGlobalFixes(token){
    if(!token || typeof token !== 'object') return token;
    const es0 = Array.isArray(token.es) ? token.es[0] : token.es;
    const fixed = fixH6440ConstructPeneSpanish(es0, token);
    const prev = String(es0 ?? '').trim();
    if(!fixed || fixed === prev) return token;
    if(Array.isArray(token.es)){
      return { ...token, es: [fixed, ...token.es.slice(1)] };
    }
    return { ...token, es: fixed };
  }

  global.HebrewGlossGlobalFixes = {
    normalizeStrong,
    hebrewPlainLetters,
    isLikelyNominalConstructForPene,
    isSpanishDeterminerOnly,
    fixH6440ConstructPeneSpanish,
    patchTokenEsForGlobalFixes
  };
})(typeof window !== 'undefined' ? window : globalThis);
