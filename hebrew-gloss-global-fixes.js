/**
 * Correcciones globales hebreo→español para el interlineal (todos los libros).
 * Se aplican en runtime al mostrar glosas; no sustituyen editar datos fuente cuando haga falta,
 * pero evitan errores sistemáticos repetidos (fórmula tarde/mañana, ו como «Y», artículo colado, פְּנֵי).
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

  /** ו / waw como conjunción (etiquetas CC / Cc del corpus). */
  function isHebrewWawConjunctionToken(token){
    const m = String(token?.morphs || '').trim();
    return /^(CC|CS|Cc|Cs)$/i.test(m);
  }

  function fixConjWawSpanishLowercase(token){
    if(!isHebrewWawConjunctionToken(token)) return token;
    const es = token.es;
    const yre = /^Y$/i;
    if(typeof es === 'string' && yre.test(es.trim())){
      return { ...token, es: 'y' };
    }
    if(Array.isArray(es) && es.length && yre.test(String(es[0] || '').trim())){
      return { ...token, es: ['y', ...es.slice(1)] };
    }
    return token;
  }

  function isSpanishDeterminerOnly(text){
    const t = String(text || '')
      .replace(/[←→]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/[,:;.!?¿]+$/g, '')
      .trim()
      .toLowerCase();
    if(!t) return false;
    return /^(el|la|los|las|lo|un|una|unos|unas|del|al)$/.test(t);
  }

  /** Sólo artículo colado tras «mañana» en fórmula יֹום בֹּקֶר (H1242). */
  function fixH1242BoqerStripSpuriousEl(token){
    if(normalizeStrong(token.strongs) !== 'H1242') return token;
    if(!Array.isArray(token.es) || token.es.length < 2) return token;
    const a = String(token.es[0] || '').trim();
    const b = String(token.es[1] || '').trim();
    if(!/^mañana/i.test(a)) return token;
    if(!/^el$/i.test(b.replace(/[,:;.!?¿]+$/g, '').trim())) return token;
    return { ...token, es: a };
  }

  function isH1961JussiveMorph(token){
    const cmp = morphUpper(token).replace(/\s+/g, '');
    if(/\bJUSS\b/.test(String(token?.label || '').toUpperCase())) return true;
    if(/V[HQN]AJ/i.test(cmp)) return true;
    return false;
  }

  function isH1961WayyiqtolMorph(token){
    const cmp = morphUpper(token).replace(/\s+/g, '');
    if(/\bWAYYIQT\b/.test(String(token?.label || '').toUpperCase())) return true;
    return /V[HQN]AM/i.test(cmp);
  }

  function fixH1961WayyiqtolSeaToFueSpanish(gloss, token){
    if(!token || typeof token !== 'object') return gloss;
    if(normalizeStrong(token.strongs) !== 'H1961') return gloss;
    if(!isH1961WayyiqtolMorph(token) || isH1961JussiveMorph(token)) return gloss;
    const g = String(gloss ?? '').trim();
    if(!/^sea$/i.test(g)) return gloss;
    return 'fue';
  }

  /**
   * יְהִי wayyiqtol: quitar «la»/«el» colgados, «sea»→«fue», glosa sólo artículo → «fue» en la fórmula.
   */
  function fixH1961WayyiqtolEveningMorningSpanish(token){
    if(!token || typeof token !== 'object') return token;
    if(normalizeStrong(token.strongs) !== 'H1961') return token;
    if(!isH1961WayyiqtolMorph(token) || isH1961JussiveMorph(token)) return token;

    let t = { ...token };
    let changed = false;
    let es = t.es;

    if(Array.isArray(es)){
      const rest = es.slice(1);
      if(rest.length && rest.every((p) => isSpanishDeterminerOnly(p))){
        es = [es[0]];
        changed = true;
      }
      let first = fixH1961WayyiqtolSeaToFueSpanish(String(es[0] ?? '').trim(), t);
      if(first !== String(es[0] ?? '').trim()){
        es = [first, ...es.slice(1)];
        changed = true;
      }
      if(es.length === 1){
        const sole = String(es[0] || '').trim().replace(/[,:;.!?¿]+$/g, '').trim();
        if(/^(la|el)$/i.test(sole)){
          es = 'fue';
          changed = true;
        }
      }
    }else{
      let g = String(es ?? '').trim();
      const bare = g.replace(/[,:;.!?¿]+$/g, '').trim();
      if(/^sea$/i.test(bare)){
        es = 'fue';
        changed = true;
      }else if(/^(la|el)$/i.test(bare)){
        es = 'fue';
        changed = true;
      }
    }

    if(!changed) return token;
    t = { ...t, es };
    if(t.notrans != null && String(t.notrans).trim()){
      const { notrans, ...rest } = t;
      t = rest;
    }
    return t;
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
   * Glosas españolas estándar para los sufijos pronominales hebreos
   * (etiquetas RB / PRS. del corpus OSHB usado en este proyecto).
   *
   * Convención: clave «<N><G><P>» donde N = S|P (sg./pl.), G = M|F|C (m/f/com.),
   * P = 1|2|3 (persona). Se devuelve el tónico («mí, ti, él…») para que se
   * componga con la preposición delante («en él», «a vosotros», «de ellos…»).
   */
  const HEBREW_PRONOMINAL_SUFFIX_SPANISH = {
    SC1: 'mí',
    SM2: 'ti',
    SF2: 'ti',
    SM3: 'él',
    SF3: 'ella',
    PC1: 'nosotros',
    PM2: 'vosotros',
    PF2: 'vosotras',
    PM3: 'ellos',
    PF3: 'ellas'
  };

  /** Glosas estándar para preposiciones prefijadas. */
  const HEBREW_PREP_PREFIX_SPANISH = {
    PB: 'en',
    PL: 'a',
    PM: 'de',
    PR: 'de',
    PU: 'sobre',
    PK: 'como'
  };

  function pronominalSuffixSpanish(rawMorph){
    const m = String(rawMorph || '').trim().toUpperCase();
    const match = m.match(/^(?:RB|PRS\.?)([SP])([MFC])([123])$/);
    if(!match) return '';
    const key = `${match[1]}${match[2]}${match[3]}`;
    return HEBREW_PRONOMINAL_SUFFIX_SPANISH[key] || '';
  }

  function prepPrefixSpanish(rawMorph){
    const m = String(rawMorph || '').trim().toUpperCase();
    return HEBREW_PREP_PREFIX_SPANISH[m] || '';
  }

  function isVerbalMorph(rawMorph){
    const m = String(rawMorph || '').trim().toUpperCase();
    return /^V[HQNPHT]?[A-Z]/.test(m);
  }

  function flattenMorphArray(value){
    if(Array.isArray(value)){
      const out = [];
      for(const item of value){
        const s = String(item || '').trim();
        if(!s || s === ',') continue;
        out.push(s);
      }
      return out;
    }
    return String(value || '')
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p && p !== ',');
  }

  function joinSpanishAddedParts(added){
    const parts = Array.isArray(added) ? added : [added];
    return parts
      .map((p) => String(p ?? '').replace(/[←→]/g, '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .join(' ')
      .trim();
  }

  /**
   * Chips compuestos prep+sufijo (לָכֶם, בּוֹ, מִמֶּנּוּ, …) y verbo+prep+sufijo (נָתַתִּי+לָ+כֶם, …):
   * cuando el campo `es` es UN string (la glosa proclítica del español como «os», «me»,
   * «le»), el motor lo deposita sólo en el morfema léxico (el verbo) y deja la prep.
   * y el sufijo sin glosa. Esta regla reparte la glosa en el array completo:
   *   - 2 morfemas (prep + sufijo): [prep, pronombre]
   *   - 3+ morfemas (verbo + … + prep + sufijo): [<existing/added en idx 0>, …, prep, pronombre]
   *
   * No se aplica cuando `es` ya es array con el mismo tamaño que `orig` o cuando los
   * morfemas no encajan en el patrón esperado.
   */
  function fixHebrewPrepSuffixChipSpanish(token){
    if(!token || typeof token !== 'object') return token;
    const orig = Array.isArray(token.orig) ? token.orig : null;
    if(!orig || orig.length < 2) return token;
    if(Array.isArray(token.es) && token.es.length >= orig.length) return token;

    const morphs = flattenMorphArray(token.morphs);
    if(morphs.length !== orig.length) return token;

    const lastIdx = morphs.length - 1;
    const prepIdx = lastIdx - 1;
    if(prepIdx < 0) return token;

    const prepGloss = prepPrefixSpanish(morphs[prepIdx]);
    const pronGloss = pronominalSuffixSpanish(morphs[lastIdx]);
    if(!prepGloss || !pronGloss) return token;

    if(prepIdx > 0){
      for(let i = 0; i < prepIdx; i += 1){
        if(!isVerbalMorph(morphs[i])){
          return token;
        }
      }
    }

    const existingArray = Array.isArray(token.es) ? token.es.slice() : null;
    const existingString = !Array.isArray(token.es) ? String(token.es ?? '').trim() : '';
    const addedJoined = joinSpanishAddedParts(token.added);

    const newEs = new Array(orig.length).fill('');

    if(prepIdx === 0){
      newEs[0] = prepGloss;
      newEs[1] = pronGloss;
    }else{
      let verbGloss = '';
      if(addedJoined){
        verbGloss = addedJoined;
      }else if(existingArray && existingArray[0]){
        verbGloss = String(existingArray[0]).trim();
      }else if(existingString){
        verbGloss = existingString;
      }
      newEs[0] = verbGloss;
      newEs[prepIdx] = prepGloss;
      newEs[lastIdx] = pronGloss;
    }

    if(existingArray){
      for(let i = 0; i < orig.length; i += 1){
        if(!newEs[i] && existingArray[i]){
          newEs[i] = String(existingArray[i]).trim();
        }
      }
    }

    const result = { ...token, es: newEs };
    if(prepIdx > 0 && token.added){
      const rest = { ...result };
      delete rest.added;
      return rest;
    }
    return result;
  }

  /**
   * Detecta si `orig` de un token es EXCLUSIVAMENTE marcas diacríticas / vocalizaciones
   * sin ninguna letra consonante hebrea (U+05D0–U+05EA).
   * Esto ocurre en los tokens XD generados por OSHB para el artículo fusionado en
   * preposiciones prefijadas (לָ → ל PL + ָ XD), p.ej. token orig="ָ" o "ַ".
   */
  function isOrigDiacriticOnly(token){
    const raw = Array.isArray(token?.orig) ? token.orig.join('') : String(token?.orig || '');
    if(!raw.trim()) return false;
    return !/[\u05D0-\u05EA]/.test(raw);
  }

  /**
   * Elimina la glosa española de tokens ART/XD cuyo `orig` es solo vocalización
   * (artículo fusionado en preposición). Estos tokens tienen `notrans:"s/t"` en los
   * datos después del script de normalización, pero puede que lleguen al engine sin él.
   * La regla garantiza que en ningún caso se muestre "el/la/los/las" para una casilla
   * que no corresponde a un texto hebreo real.
   */
  function fixDiacriticOnlyXdSpanish(token){
    if(!token || typeof token !== 'object') return token;
    const morph = Array.isArray(token.morphs) ? token.morphs[0] : String(token.morphs || '');
    const isArtMorph = /^XD$/i.test(String(morph || '').trim());
    if(!isArtMorph) return token;
    if(!isOrigDiacriticOnly(token)) return token;
    if(token.notrans === 's/t' && !token.es) return token; // ya correcto
    const result = { ...token, notrans: 's/t' };
    delete result.es;
    return result;
  }

  /**
   * H853 (אֶת / אֶת־) — Partícula de objeto directo (PART.OBJ.DIR).
   *
   * אֶת es un marcador gramatical puro: indica que la siguiente palabra es el
   * objeto directo definido del verbo. No tiene equivalente propio en español
   * (a diferencia de otros idiomas que usan "a" con personas, en el interlineal
   * cada token hebreo debe mostrar su morfema propio, no palabras funcionales del
   * traductor).
   *
   * Regla: si el morph raíz es PA (PART.OBJ.DIR) → notrans:"s/t", borrar es.
   * Los compuestos אֹתִי / אֹתְךָ / etc. tienen morph PA+RB… y resolveSourceMorphFallback
   * los devuelve como PRON.OBJ, por lo que no son afectados.
   */
  function fixH853DirectObjectMarker(token){
    if(!token) return token;
    if(normalizeStrong(token.strongs) !== 'H853') return token;
    const raw = Array.isArray(token.morphs) ? String(token.morphs[0] || '') : String(token.morphs || '');
    if(raw.trim() !== 'PA') return token; // sólo el marcador simple, no compuestos con pronombre
    if(token.notrans === 's/t' && !token.es) return token; // ya correcto
    const result = { ...token, notrans: 's/t' };
    delete result.es;
    return result;
  }

  /**
   * H6213 (עָשָׂה, raíz ע-ש-ה "hacer") — Corrección de tiempo verbal.
   *
   * El corpus almacena en algunos casos "había ← hecho" (forma compuesta, pluscuamperfecto)
   * como glosa del Qal Perfecto. En el interlineal cada token hebreo debe mostrar la
   * traducción directa de su forma morfológica:
   *
   *   Qal Perfecto 3ms → "hizo"   |  3fs → "hizo"
   *   Qal Perfecto 2ms → "hiciste"
   *   Qal Perfecto 1cs → "hice"
   *   Qal Perfecto 3cp → "hicieron"
   *   Qal Perfecto 2cp → "hicisteis"
   *   Qal Perfecto 1cp → "hicimos"
   *
   * Nota: el Qal Wayyiqtol de H6213 ("וַיַּעַשׂ") se gestiona por su propia regla si hiciese falta;
   * esta función sólo actúa sobre Qal Perfecto (VqAs…).
   */
  function fixH6213QalPerfectSpanish(token){
    if(!token) return token;
    if(normalizeStrong(token.strongs) !== 'H6213') return token;
    const morph = Array.isArray(token.morphs) ? token.morphs[0] : String(token.morphs || '');
    if(!/^VqAs/.test(morph)) return token; // sólo Qal Perfecto

    const esRaw = Array.isArray(token.es) ? token.es[0] : token.es;
    const es0 = String(esRaw ?? '').trim().toLowerCase();
    // Actuar sólo si la glosa actual es una forma auxiliar "haber" (había/habían/habéis/habiendo…)
    if(!/^hab/i.test(es0)) return token;

    // Resolver persona/número desde el código morfológico
    // Formato OSHB: VqAs[S|P][M|F|C][1|2|3]
    const persNumMatch = morph.match(/^VqAs([SP])([MFC])([123])/i);
    let direct = 'hizo'; // fallback
    if(persNumMatch){
      const [, sp, gen, per] = persNumMatch;
      const plural = sp.toUpperCase() === 'P';
      if(!plural){
        if(per === '3') direct = 'hizo';
        else if(per === '2') direct = 'hiciste';
        else direct = 'hice';
      }else{
        if(per === '3') direct = 'hicieron';
        else if(per === '2') direct = 'hicisteis';
        else direct = 'hicimos';
      }
    }

    const result = { ...token, es: direct };
    delete result.added;
    delete result.marks;
    return result;
  }

  /**
   * Ajusta el campo `es` del token (string o array) aplicando reglas globales en cadena.
   */
  function patchTokenEsForGlobalFixes(token){
    if(!token || typeof token !== 'object') return token;

    let t = fixDiacriticOnlyXdSpanish({ ...token });
    t = fixH853DirectObjectMarker(t);
    t = fixConjWawSpanishLowercase(t);
    t = fixH1242BoqerStripSpuriousEl(t);
    t = fixH1961WayyiqtolEveningMorningSpanish(t);
    t = fixH6213QalPerfectSpanish(t);
    t = fixHebrewPrepSuffixChipSpanish(t);

    const es0 = Array.isArray(t.es) ? t.es[0] : t.es;
    const prev0 = String(es0 ?? '').trim();
    const next0 = fixH6440ConstructPeneSpanish(es0, t);
    if(next0 && next0 !== prev0){
      if(Array.isArray(t.es)){
        t = { ...t, es: [next0, ...t.es.slice(1)] };
      }else{
        t = { ...t, es: next0 };
      }
    }

    return t;
  }

  global.HebrewGlossGlobalFixes = {
    normalizeStrong,
    hebrewPlainLetters,
    morphUpper,
    isHebrewWawConjunctionToken,
    isLikelyNominalConstructForPene,
    isSpanishDeterminerOnly,
    isOrigDiacriticOnly,
    fixH6440ConstructPeneSpanish,
    fixH1961WayyiqtolSeaToFueSpanish,
    fixConjWawSpanishLowercase,
    fixH1242BoqerStripSpuriousEl,
    fixH1961WayyiqtolEveningMorningSpanish,
    fixDiacriticOnlyXdSpanish,
    fixH853DirectObjectMarker,
    fixH6213QalPerfectSpanish,
    fixHebrewPrepSuffixChipSpanish,
    pronominalSuffixSpanish,
    prepPrefixSpanish,
    HEBREW_PRONOMINAL_SUFFIX_SPANISH,
    HEBREW_PREP_PREFIX_SPANISH,
    patchTokenEsForGlobalFixes
  };
})(typeof window !== 'undefined' ? window : globalThis);
