(function(global){
  const Rules = global.HebrewGrammarRules || null;
  const SPANISH_RENDER_POLICY = {
    preserveHebrewPriority: true,
    namingOrder: 'name-first',
    repeatedPairStyle: 'contrastive',
    capitalizeAssignedNames: true
  };

  function normalizeHebrew(value, preservePoints = true){
    return Rules?.normalizeHebrew
      ? Rules.normalizeHebrew(value, preservePoints)
      : String(value || '').trim();
  }

  function normalizeStrong(value){
    const text = String(value || '').trim().toUpperCase();
    if(!text) return '';
    if(/^H\d+$/.test(text)) return text;
    if(/^\d+$/.test(text)) return `H${text}`;
    return text;
  }

  function normalizeSpanishSourceText(value){
    return String(value || '')
      .replace(/[«»*]/g, ' ')
      .replace(/[‹›►]/g, ' ')
      .replace(/[→←]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[,:;.]+$/g, '')
      .trim();
  }

  function normalizeSpanishLexicalCase(text, baseMorph = ''){
    const value = normalizeSpanishSourceText(text);
    if(!value) return '';
    const upperMorph = String(baseMorph || '').trim().toUpperCase();
    if(/^NPROP(?:\.|$)/.test(upperMorph)) return value;
    if(/^(Dios|YHWH|Yehoshua|Israel|Jud[aá]|Jerusal[eé]n)$/i.test(value)){
      return value.charAt(0).toUpperCase() + value.slice(1);
    }
    return value.charAt(0).toLowerCase() + value.slice(1);
  }

  function splitSpanishSourceParts(value){
    if(Array.isArray(value)){
      return value.flatMap((item) => splitSpanishSourceParts(item));
    }
    const text = normalizeSpanishSourceText(value);
    return text ? [text] : [];
  }

  function compactSpanishSourceParts(parts){
    return parts
      .map((part) => normalizeSpanishSourceText(part))
      .filter(Boolean)
      .filter((part, index, array) => array.indexOf(part) === index);
  }

  function isSpanishFunctionGloss(text){
    return /^(y|e|o|u|ni|mas|pero|sino|entonces|pues|que|si|porque|cuando|donde|antes|antes que|para|como|he|aqui|he aqui|me|te|se|le|les|lo|la|los|las|un|una|unos|unas|el|del|de la|de los|de las)$/i.test(String(text || '').trim());
  }

  function isSpanishAuxiliaryGloss(text){
    return /^(es|era|eran|fue|fueron|esta|estan|estaba|estaban|sera|seran|seria|serian|habia|habian|ha|han|habra|habran|haya|hayan|soy|eres|somos|son|fui|fueramos)$/i.test(String(text || '').trim());
  }

  function classifySourceGlossPart(part){
    const text = normalizeSpanishSourceText(part).toLowerCase();
    if(!text) return 'empty';
    if(isSpanishAuxiliaryGloss(text)) return 'aux';
    if(isSpanishFunctionGloss(text)) return 'func';
    if(text.split(/\s+/).length > 2) return 'editorial';
    return 'lex';
  }

  function normalizeLexicalGlossCandidate(text){
    let candidate = normalizeSpanishSourceText(text);
    let articleHint = '';
    const match = candidate.match(/^(el|la|los|las|un|una|unos|unas)\s+(.+)$/i);
    if(match){
      articleHint = match[1].toLowerCase();
      candidate = match[2].trim();
    }
    candidate = candidate
      .replace(/^[([{"'“”]+/, '')
      .replace(/[)\]}"'“”]+$/g, '')
      .replace(/\bde$/i, '')
      .replace(/[,:;.]+$/g, '')
      .trim();
    return {
      gloss: candidate,
      articleHint
    };
  }

  function hasUsefulLexicalContent(text){
    const value = normalizeSpanishSourceText(text).toLowerCase();
    if(!value) return false;
    if(/^(el|la|los|las|un|una|unos|unas)\s+de$/i.test(value)) return false;
    if(/^(de|del|de la|de los|de las)$/i.test(value)) return false;
    return true;
  }

  function isHebrewMarkOnly(value){
    return /^[\u0591-\u05BD\u05BE\u05BF-\u05C7]+$/.test(String(value || '').trim());
  }

  function isDefectiveConstructGloss(text){
    const value = normalizeSpanishSourceText(text).toLowerCase();
    return /^(el|la|los|las)\s+de$/i.test(value) || /^(de|del|de la|de los|de las)$/i.test(value);
  }

  function canonicalFunctionGloss(baseMorph, token){
    const upperMorph = String(baseMorph || '').trim().toUpperCase();
    if(upperMorph === 'PART.OBJ.DIR') return '';
    if(upperMorph === 'CONJ') return 'y';
    if(upperMorph === 'REL') return 'que';
    if(upperMorph === 'PREP'){
      return resolveSurfacePrepositionGloss(token);
    }
    return '';
  }

  function getLexiconEntriesByStrong(strong){
    const key = normalizeStrong(strong);
    if(!key) return [];
    const lexicon = global.AdminHebrewLexicon || null;
    if(!lexicon?.byStrong) return [];
    if(typeof lexicon.byStrong.get === 'function'){
      return lexicon.byStrong.get(key) || [];
    }
    return lexicon.byStrong[key] || [];
  }

  function resolveConstructHeadLexeme(entry){
    const items = getLexiconEntriesByStrong(entry?.token?.strongs);
    const normalizedForm = normalizeHebrew(entry?.token?.orig || '', false);
    for(const item of items){
      const candidates = [];
      const add = (value) => {
        const normalized = normalizeLexicalGlossCandidate(value);
        if(normalized.gloss && hasUsefulLexicalContent(normalized.gloss)){
          candidates.push(normalized.gloss);
        }
      };
      add(item?.glosa);
      (Array.isArray(item?.glosas) ? item.glosas : []).forEach(add);
      const chosen = candidates
        .map((candidate, index) => {
          let score = 0;
          const lower = candidate.toLowerCase();
          const words = lower.split(/\s+/).filter(Boolean);
          if(words.length === 1) score += 6;
          if(words.length === 2) score += 2;
          if(normalizedForm === 'פני' && /\b(faz|rostro|superficie|frente|presencia)\b/i.test(lower)) score += 10;
          if(normalizedForm === 'בני' && /\bhijo\b/i.test(lower)) score += 10;
          if(normalizedForm === 'דברי' && /\bpalabra\b/i.test(lower)) score += 10;
          if(!/\bde\b/.test(lower) && !/\b(delante|ante|contra|hacia|antes|sobre|debajo|frente)\b/.test(lower)) score += 4;
          if(!startsWithDeterminer(candidate)) score += 2;
          if(/\b(faz|rostro|cara|frente|presencia|superficie|medio|reuni[oó]n|esp[ií]ritu|palabra|hijo|nombre)\b/i.test(lower)) score += 6;
          if(/\b(vosotros|ellos|ellas|m[ií]|ti|nosotros|su|sus|tu)\b/.test(lower)) score -= 6;
          if(/\bde\b/.test(lower)) score -= 3;
          if(/\b(delante|ante|contra|hacia|antes|sobre|debajo|frente a)\b/.test(lower)) score -= 4;
          return { candidate, score, index };
        })
        .sort((left, right) => right.score - left.score || left.index - right.index)[0]?.candidate;
      if(chosen) return normalizeSpanishPhrase(chosen);
    }
    return '';
  }

  function chooseLexicalGlossFromEntry(entry, token, baseMorph){
    const candidates = [];
    const add = (value) => {
      const raw = normalizeSpanishSourceText(value);
      if(raw) candidates.push(raw);
    };

    add(entry?.glosa);
    (Array.isArray(entry?.glosas) ? entry.glosas : []).forEach(add);

    const upperMorph = String(baseMorph || '').trim().toUpperCase();
    const normalizedForm = normalizeHebrew(token?.orig || '', false);
    const scored = candidates.map((candidate, index) => {
      let score = 0;
      const lower = candidate.toLowerCase();
      const normalized = normalizeLexicalGlossCandidate(candidate);
      if(!normalized.gloss) score -= 10;
      if(classifySourceGlossPart(candidate) === 'lex') score += 4;
      if(normalized.articleHint) score += 2;
      if(/^(la|el)\s+.+\s+de$/i.test(candidate)) score += 4;
      if(/\bde$/i.test(candidate)) score += /\.C(?:$|\.)/.test(upperMorph) ? 4 : -1;
      if(/\bde\b/i.test(candidate) && /\.A(?:$|\.)/.test(upperMorph)) score -= 1;
      if(/^(antes|delante|ahora|entonces|porque|si|que)$/i.test(lower)) score -= 3;
      if(/\?$/.test(candidate) || /[¿!]/.test(candidate)) score -= 2;
      if(upperMorph.startsWith('SUBS') && /\b(faz|rostro|rostros|esp[ií]ritu|agua|aguas|abismo|profundidad|cielo|cielos|tierra)\b/i.test(lower)) score += 3;
      if(upperMorph.startsWith('VERBO') && classifySourceGlossPart(candidate) === 'lex') score += 2;
      if(normalizedForm && Array.isArray(entry?.formas) && entry.formas.some((form) => normalizeHebrew(form, false) === normalizedForm)) score += 2;
      return { candidate, score, index, normalized };
    }).sort((left, right) => right.score - left.score || left.index - right.index);

    const winner = scored.find((item) => item.normalized?.gloss) || scored[0];
    return winner?.normalized || { gloss: '', articleHint: '' };
  }

  function resolveLexicalFallback(token, baseMorph, sourceGloss){
    const current = normalizeSpanishLexicalCase(sourceGloss, baseMorph);
    const currentClass = classifySourceGlossPart(current);
    const upperMorph = String(baseMorph || '').trim().toUpperCase();
    const strong = normalizeStrong(token?.strongs || '');
    const entries = getLexiconEntriesByStrong(token?.strongs);
    const lexiconResolved = entries
      .map((entry) => chooseLexicalGlossFromEntry(entry, token, baseMorph))
      .find((resolved) => resolved?.gloss) || { gloss: '', articleHint: '' };
    const canonical = canonicalFunctionGloss(baseMorph, token);

    if(canonical || upperMorph === 'PART.OBJ.DIR'){
      return {
        gloss: canonical,
        articleHint: lexiconResolved.articleHint || ''
      };
    }
    if(current && currentClass === 'lex' && !(extractMorphFeatures(upperMorph).isConstruct && isDefectiveConstructGloss(current))) {
      return {
        gloss: current,
        articleHint: lexiconResolved.articleHint || ''
      };
    }
    if(current && /^VERBO(?:\.|$)/.test(upperMorph) && currentClass !== 'func'){
      return { gloss: current, articleHint: lexiconResolved.articleHint || '' };
    }
    if(strong === 'H1961'){
      if(/JUSS|YUSIV|JUSS/.test(upperMorph)) return { gloss: 'sea', articleHint: '' };
      return { gloss: 'fue', articleHint: '' };
    }
    if(strong === 'H3426'){
      return { gloss: '[hay]', articleHint: '' };
    }
    if(strong === 'H369'){
      return { gloss: '[no hay]', articleHint: '' };
    }
    if(strong === 'H259' && /^NUM\.CARD/.test(upperMorph)){
      return { gloss: 'uno', articleHint: '' };
    }
    if(lexiconResolved.gloss){
      return lexiconResolved;
    }
    return { gloss: current, articleHint: '' };
  }

  function resolveTokenSourceGloss(token){
    const esParts = compactSpanishSourceParts(splitSpanishSourceParts(token?.es));
    const addedParts = compactSpanishSourceParts(splitSpanishSourceParts(token?.added));
    const morph = String(token?.morphs || '').trim().toUpperCase();

    if(esParts.length === 1){
      return esParts[0];
    }

    if(esParts.length > 1){
      const first = esParts[0];
      const second = esParts[1] || '';
      const joined = normalizeSpanishSourceText(esParts.join(' '));
      const lexicalParts = esParts.filter((part) => classifySourceGlossPart(part) === 'lex');
      const functionalParts = esParts.filter((part) => classifySourceGlossPart(part) !== 'lex');

      if(/^(y|e|o|u|ni|mas|pero|sino|entonces|pues)$/i.test(first)){
        return first;
      }
      if(/^(el|la|los|las|un|una|unos|unas|mi|mis|tu|tus|su|sus|nuestro|nuestra|vuestro|vuestra)$/i.test(second)){
        return first;
      }
      if(/^(que|si|porque|cuando|donde|antes|antes que|para|como)$/i.test(first)){
        return first;
      }
      if(/^(es|era|eran|fue|fueron|esta|estan|estaba|estaban|sera|seran|habia|habían)$/i.test(second)){
        return first;
      }
      if(/^(he|ha|han|habia|habían|voy|vaya|os|me|se|le|les)$/i.test(first)){
        return second || first;
      }
      if(/^VERBO(?:\.|$)/.test(morph) && lexicalParts.length){
        return lexicalParts[0];
      }
      if(/^(SUBS|ADJ|NPROP)(?:\.|$)/.test(morph) && lexicalParts.length){
        return lexicalParts[0];
      }
      if(functionalParts.length && lexicalParts.length === 1){
        return lexicalParts[0];
      }
      if(lexicalParts.length > 1){
        return lexicalParts.sort((left, right) => right.length - left.length)[0];
      }
      return joined;
    }

    if(addedParts.length){
      return normalizeSpanishSourceText(addedParts.join(' '));
    }

    return '';
  }

  function flattenMorphValues(value){
    if(Array.isArray(value)){
      return value.flatMap((item) => flattenMorphValues(item)).filter(Boolean);
    }
    return String(value || '')
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item && item !== ',');
  }

  function expandCompositeToken(token){
    const origParts = Array.isArray(token?.orig) ? token.orig : [token?.orig];
    if(origParts.length <= 1){
      return [{ ...token }];
    }

    const morphParts = flattenMorphValues(token?.morphs);
    const numParts = Array.isArray(token?.num) ? token.num : [token?.num];
    const strongParts = Array.isArray(token?.strongs) ? token.strongs : [token?.strongs];

    return origParts.map((origPart, index) => ({
      orig: origPart,
      morphs: morphParts[index] || '',
      num: numParts[index] || String(index + 1),
      strongs: strongParts.length === origParts.length ? strongParts[index] : '',
      es: Array.isArray(token?.es) ? token.es[index] || '' : (index === 0 ? token?.es : ''),
      added: Array.isArray(token?.added) ? token.added[index] || '' : '',
      marks: Array.isArray(token?.marks) ? token.marks[index] || '' : ''
    }));
  }

  function tokensFromFormsMorphs(verseNode){
    const forms = Array.isArray(verseNode?.forms) ? verseNode.forms : [];
    const morphs = Array.isArray(verseNode?.morphs) ? verseNode.morphs : [];
    return forms.map((orig, index) => ({
      orig,
      morphs: morphs[index] || '',
      num: String(index + 1)
    }));
  }

  function getAdminVerseTokens(verseNode){
    const sourceTokens = Array.isArray(verseNode?.tokens) && verseNode.tokens.length
      ? verseNode.tokens
      : tokensFromFormsMorphs(verseNode);

    const expanded = sourceTokens
      .flatMap((token, index) => expandCompositeToken(token).map((part, partIndex) => ({
        ...part,
        __order: `${index}:${partIndex}`
      })))
      .sort((left, right) => {
        const leftNum = Number(left?.num);
        const rightNum = Number(right?.num);
        const leftHasNum = Number.isFinite(leftNum) && leftNum > 0;
        const rightHasNum = Number.isFinite(rightNum) && rightNum > 0;
        if(leftHasNum && rightHasNum && leftNum !== rightNum) return leftNum - rightNum;
        if(leftHasNum && !rightHasNum) return -1;
        if(!leftHasNum && rightHasNum) return 1;
        return String(left?.__order || '').localeCompare(String(right?.__order || ''));
      })
      .map(({ __order, ...token }) => token);

    const merged = [];
    expanded.forEach((token) => {
      const orig = String(token?.orig || '').trim();
      if(isHebrewMarkOnly(orig) && merged.length){
        const previous = merged[merged.length - 1];
        previous.orig = `${previous.orig || ''}${orig}`;
        const nextMorph = String(token?.morphs || '').trim();
        const prevMorph = String(previous?.morphs || '').trim();
        if(nextMorph){
          previous.morphs = prevMorph && nextMorph ? `${prevMorph}+${nextMorph}` : (prevMorph || nextMorph);
        }
        const nextGloss = String(token?.es || '').trim();
        if(nextGloss && !String(previous?.es || '').trim()){
          previous.es = nextGloss;
        }
        return;
      }
      merged.push({ ...token });
    });

    return merged;
  }

  function getOshbMorphAt(oshbVerseNode, token, posIndex){
    const forms = Array.isArray(oshbVerseNode?.forms) ? oshbVerseNode.forms : [];
    const morphs = Array.isArray(oshbVerseNode?.morphs) ? oshbVerseNode.morphs : [];
    if(!forms.length || !morphs.length) return '';

    const rawNum = Number(token?.num);
    const tokenIndex = Number.isInteger(rawNum) && rawNum >= 1 ? rawNum - 1 : posIndex;
    const indexedForm = forms[tokenIndex];
    const indexedMorph = String(morphs[tokenIndex] || '').trim();
    const tokenPointed = normalizeHebrew(token?.orig || '', true);
    const tokenPlain = normalizeHebrew(token?.orig || '', false);

    if(indexedForm && indexedMorph){
      const indexedPointed = normalizeHebrew(indexedForm, true);
      const indexedPlain = normalizeHebrew(indexedForm, false);
      if(
        (indexedPointed && indexedPointed === tokenPointed) ||
        (indexedPlain && indexedPlain === tokenPlain)
      ){
        return indexedMorph;
      }
    }

    for(let i = 0; i < forms.length; i += 1){
      const form = forms[i];
      const morph = String(morphs[i] || '').trim();
      if(!morph) continue;
      const formPointed = normalizeHebrew(form, true);
      const formPlain = normalizeHebrew(form, false);
      if((formPointed && formPointed === tokenPointed) || (formPlain && formPlain === tokenPlain)){
        return morph;
      }
    }

    return '';
  }

  function resolveSourceMorphFallback(token){
    const raw = String(token?.morphs || '').trim();
    if(!raw) return '';
    if(raw === 'XD') return 'ART';
    if(raw === 'PA') return 'PART.OBJ.DIR';
    if(raw === 'CC' || raw === 'Cc') return 'CONJ';
    if(/^P[BLKM]?$/i.test(raw)) return 'PREP';
    return raw;
  }

  function isNominalLikeMorph(label){
    const upper = String(label || '').trim().toUpperCase();
    return /^(SUBS|ADJ|NPROP)(?:\.|$)/.test(upper);
  }

  function hasArticleSignal(token){
    const morph = String(token?.morphs || '').trim().toUpperCase();
    return morph === 'XD' || /\bXD\b/.test(morph) || normalizeHebrew(token?.orig || '', true).startsWith('ה');
  }

  function buildConstructContext(tokens, oshbVerseNode, posIndex){
    const nextToken = tokens[posIndex + 1] || null;
    if(!nextToken){
      return {
        nextStrong: '',
        followedByNominal: false,
        nextIsDefinedOrDivine: false
      };
    }
    const nextMorph = getOshbMorphAt(oshbVerseNode, nextToken, posIndex + 1) || resolveSourceMorphFallback(nextToken);
    const nextStrong = normalizeStrong(nextToken?.strongs || '');
    const followedByNominal = isNominalLikeMorph(nextMorph);
    const nextIsDefinedOrDivine = followedByNominal && (
      hasArticleSignal(nextToken) ||
      nextStrong === 'H430' ||
      /^NPROP(?:\.|$)/.test(String(nextMorph || '').trim().toUpperCase())
    );
    return {
      nextStrong,
      followedByNominal,
      nextIsDefinedOrDivine
    };
  }

  function resolveSurfacePrepositionGloss(token){
    const plain = normalizeHebrew(token?.orig || '', false);
    if(plain === 'בין') return 'entre';
    if(plain === 'על') return 'sobre';
    if(plain === 'אל') return 'hacia';
    if(plain === 'עם') return 'con';
    if(plain === 'תחת') return 'debajo de';
    if(plain === 'מן' || plain === 'מ') return 'de';
    if(plain === 'ל') return 'a';
    if(plain === 'ב') return 'en';
    if(plain === 'כ') return 'como';
    return '';
  }

  function buildSpanishLayerForToken(token, context = {}){
    const baseMorph = getOshbMorphAt(context.oshbVerseNode, token, context.posIndex) || resolveSourceMorphFallback(token);
    const sourceGloss = resolveTokenSourceGloss(token);
    const lexical = resolveLexicalFallback(token, baseMorph, sourceGloss);
    const baseGloss = lexical.gloss || sourceGloss;
    const layer = Rules?.buildSpanishInterlinearPlan
      ? Rules.buildSpanishInterlinearPlan(token?.orig || '', baseMorph, baseGloss, {
          strong: normalizeStrong(token?.strongs),
          nextStrong: context.nextStrong || '',
          followedByNominal: context.followedByNominal === true,
          nextIsDefinedOrDivine: context.nextIsDefinedOrDivine === true
        })
      : {
          original: String(token?.orig || ''),
          morphemes: [{
            surface: String(token?.orig || ''),
            label: baseMorph || String(token?.morphs || ''),
            type: 'base',
            gloss: baseGloss
          }]
        };
    const tokenGloss = Rules?.composeSpanishTokenGloss
      ? Rules.composeSpanishTokenGloss(layer)
      : baseGloss;

    return {
      token,
      baseMorph,
      baseGloss,
      spanishArticleHint: lexical.articleHint || '',
      layer,
      tokenGloss
    };
  }

  function extractMorphFeatures(label){
    const upper = String(label || '').trim().toUpperCase();
    const isParticiple = /PTCA|PTCP|PTC|(?:^|\.)(AP|AV)(?:$|[A-Z.])/.test(upper);
    return {
      isConstruct: /\.C(?:$|\.)/.test(upper),
      isNominal: /^(SUBS|ADJ|NPROP)(?:\.|$)/.test(upper),
      isProper: /^NPROP(?:\.|$)/.test(upper),
      isVerbal: /^VERBO(?:\.|$)/.test(upper),
      isParticiple,
      isAdjective: /^ADJ(?:\.|$)/.test(upper),
      isPlural: /\.PL(?:$|\.)/.test(upper),
      isDual: /\.DU(?:$|\.)/.test(upper),
      isFeminine: /\.F(?:$|\.)/.test(upper),
      isInfinitive: /INFC|INFA|INFINIT|---C$/.test(upper),
      isImperative: /IMPV|IMPERAT/.test(upper),
      isVolitive: /COHORT|YUSIV|JUSS/.test(upper),
      isFinite: /^VERBO(?:\.|$)/.test(upper) && !isParticiple && !/INFC|INFA|INFINIT|---C$/.test(upper)
    };
  }

  function findLastActiveFiniteVerb(items, startIndex){
    for(let index = startIndex - 1; index >= 0; index -= 1){
      const entry = items[index];
      const features = extractMorphFeatures(entry?.baseMorph || entry?.layer?.baseLabel || '');
      if(features.isFinite){
        return { entry, index };
      }
    }
    return null;
  }

  function resolveVirtualCopulaGloss(items, insertionIndex, options = {}){
    const subjectGloss = String(options.subjectGloss || '').trim().toLowerCase();
    if(subjectGloss === 'yo') return '[soy]';

    const lastFinite = findLastActiveFiniteVerb(items, insertionIndex);
    if(lastFinite){
      const label = String(lastFinite.entry?.baseMorph || lastFinite.entry?.layer?.baseLabel || '').trim().toUpperCase();
      if(/WAYYIQT|PERF|QATAL/.test(label)) return '[era]';
      if(/IMPF|YIQTOL|JUSS|YUSIV|COHORT/.test(label)) return '[es]';
    }

    return '[es]';
  }

  function resolveDependentArticle(features){
    if(features.isPlural || features.isDual){
      return features.isFeminine ? 'de las' : 'de los';
    }
    return features.isFeminine ? 'de la' : 'del';
  }

  function resolveStandaloneArticle(features){
    if(features.isPlural || features.isDual){
      return features.isFeminine ? 'las' : 'los';
    }
    return features.isFeminine ? 'la' : 'el';
  }

  function resolveStandaloneArticleForEntry(entry, features){
    const gloss = normalizeSpanishSourceText(entry?.baseGloss || entry?.tokenGloss || '').toLowerCase();
    if(/(ion|ión|cion|sion|ción|sión|dad|tud|umbre|ie|ez|a)$/.test(gloss) && !/(dia|mapa|planeta|tema|poema|problema)$/.test(gloss)){
      if(features.isPlural || features.isDual) return 'las';
      return 'la';
    }
    const hint = String(entry?.spanishArticleHint || '').trim().toLowerCase();
    if(['el', 'la', 'los', 'las'].includes(hint)) return hint;
    return resolveStandaloneArticle(features);
  }

  function resolveDependentArticleForEntry(entry, features){
    const article = resolveStandaloneArticleForEntry(entry, features);
    if(article === 'el') return 'del';
    if(article === 'la') return 'de la';
    if(article === 'los') return 'de los';
    if(article === 'las') return 'de las';
    return resolveDependentArticle(features);
  }

  function normalizeSpanishPhrase(text){
    return String(text || '')
      .replace(/\s+/g, ' ')
      .replace(/\bde el\b/gi, 'del')
      .replace(/\ba el\b/gi, 'al')
      .replace(/\blo lo\b/gi, 'lo')
      .replace(/\bla la\b/gi, 'la')
      .replace(/\blos los\b/gi, 'los')
      .replace(/\blas las\b/gi, 'las')
      .replace(/\bhe aqui que\b/gi, 'he aqui')
      .replace(/\bque que\b/gi, 'que')
      .replace(/\by y\b/gi, 'y')
      .replace(/\bno no\b/gi, 'no')
      .replace(/\bdiciendo decir\b/gi, 'diciendo')
      .replace(/\bdecir diciendo\b/gi, 'diciendo')
      .replace(/\s+,/g, ',')
      .replace(/\s+:/g, ':')
      .trim();
  }

  function capitalizeSpanishLabel(text){
    const value = normalizeSpanishPhrase(text);
    if(!value) return '';
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function normalizeDayOrdinalPhrase(text){
    const value = normalizeSpanishPhrase(text);
    if(/^día uno$/i.test(value)) return 'primer día';
    if(/^día primero$/i.test(value)) return 'primer día';
    if(/^día segundo$/i.test(value)) return 'segundo día';
    if(/^día tercero$/i.test(value)) return 'tercer día';
    return value;
  }

  function normalizeRepeatedPairPhrase(firstGloss, secondGloss){
    const left = normalizeSpanishPhrase(firstGloss);
    const right = normalizeSpanishPhrase(secondGloss);
    if(!left || !right) return '';
    if(
      SPANISH_RENDER_POLICY.repeatedPairStyle === 'contrastive' &&
      left.toLowerCase() === right.toLowerCase() &&
      /^aguas$/i.test(left)
    ){
      return 'unas aguas y otras';
    }
    return `${left} y ${right}`;
  }

  function shouldCapitalizeAssignedName(text){
    const value = normalizeSpanishPhrase(text);
    if(!value) return false;
    return /^(dia|día|noche|cielos|tierra|mares)$/i.test(value);
  }

  function formatAssignedName(text){
    const value = normalizeSpanishPhrase(text);
    if(!value) return '';
    return SPANISH_RENDER_POLICY.capitalizeAssignedNames && shouldCapitalizeAssignedName(value)
      ? capitalizeSpanishLabel(value)
      : value;
  }

  function buildConstructPhrase(headGloss, dependentGloss){
    const head = String(headGloss || '').trim();
    const dependent = String(dependentGloss || '').trim();
    if(!head) return dependent;
    if(!dependent) return head;
    if(/^(el|la|los|las)\b/i.test(dependent)){
      return normalizeSpanishPhrase(`${head} de ${dependent}`);
    }
    if(/^(del|de la|de los|de las)\b/i.test(dependent)){
      return normalizeSpanishPhrase(`${head} ${dependent}`);
    }
    return normalizeSpanishPhrase(`${head} de ${dependent}`);
  }

  function getEntryGloss(entry){
    return String(entry?.phraseGloss || entry?.tokenGloss || entry?.baseGloss || '').trim();
  }

  function isNameLikeGloss(text){
    return /^[A-ZÁÉÍÓÚÑ][^\s,.;:!?]+$/.test(String(text || '').trim());
  }

  function toDependentArticleGloss(articleGloss, entry, features){
    const text = String(articleGloss || '').trim().toLowerCase();
    if(text === 'el') return 'del';
    if(text === 'la') return 'de la';
    if(text === 'los') return 'de los';
    if(text === 'las') return 'de las';
    return resolveDependentArticleForEntry(entry, features);
  }

  function getNominalPhraseAt(items, index){
    const entry = items[index];
    if(!entry) return '';
    let gloss = getEntryGloss(entry);
    if(!gloss) return '';
    const features = extractMorphFeatures(entry?.baseMorph || entry?.layer?.baseLabel || '');
    if(index > 0 && isArticleOnlyToken(items[index - 1]) && !features.isProper && !startsWithDeterminer(gloss)){
      gloss = `${getEntryGloss(items[index - 1]) || resolveStandaloneArticleForEntry(entry, features)} ${gloss}`.trim();
    }
    return normalizeSpanishPhrase(gloss);
  }

  function getNominalPhraseBundleAt(items, index){
    let phrase = getNominalPhraseAt(items, index);
    if(!phrase) return { phrase: '', endIndex: index };
    let endIndex = index;
    for(let j = index + 1; j < items.length; j += 1){
      const entry = items[j];
      const label = String(entry?.baseMorph || entry?.layer?.baseLabel || '').trim().toUpperCase();
      if(isArticleOnlyToken(entry) || isConjunctionEntry(entry) || isDirectObjectMarker(entry) || isPrepositionEntry(entry)) break;
      const gloss = getEntryGloss(entry);
      if(!gloss) break;
      if(/^NUM\.CARD/.test(label) && /^(uno|una)$/i.test(gloss) && !startsWithDeterminer(phrase)){
        phrase = normalizeSpanishPhrase(`un ${phrase}`);
        endIndex = j;
        continue;
      }
      if(/^NUM\.(CARD|ORD)|^ADJ/.test(label)){
        phrase = normalizeSpanishPhrase(`${phrase} ${gloss}`);
        endIndex = j;
        continue;
      }
      break;
    }
    return { phrase, endIndex };
  }

  function isDirectObjectMarker(entry){
    const baseLabel = String(entry?.baseMorph || entry?.layer?.baseLabel || '').trim().toUpperCase();
    if(baseLabel === 'PART.OBJ.DIR') return true;
    const morphemes = Array.isArray(entry?.layer?.morphemes) ? entry.layer.morphemes : [];
    return morphemes.some((morpheme) => String(morpheme?.label || '').trim().toUpperCase() === 'PART.OBJ.DIR');
  }

  function isPrepositionEntry(entry){
    const baseLabel = String(entry?.baseMorph || entry?.layer?.baseLabel || '').trim().toUpperCase();
    if(baseLabel === 'PREP' || baseLabel.startsWith('PREP.')) return true;
    const morphemes = Array.isArray(entry?.layer?.morphemes) ? entry.layer.morphemes : [];
    return morphemes.some((morpheme) => String(morpheme?.label || '').trim().toUpperCase() === 'PREP');
  }

  function startsWithDeterminer(text){
    return /^(el|la|los|las|del|de la|de los|de las|mi|mis|tu|tus|su|sus|nuestro|nuestra|nuestros|nuestras|vuestro|vuestra|vuestros|vuestras)\b/i.test(String(text || '').trim());
  }

  function isConjunctionEntry(entry){
    const baseLabel = String(entry?.baseMorph || entry?.layer?.baseLabel || '').trim().toUpperCase();
    if(baseLabel === 'CONJ') return true;
    const morphemes = Array.isArray(entry?.layer?.morphemes) ? entry.layer.morphemes : [];
    return morphemes.some((morpheme) => String(morpheme?.label || '').trim().toUpperCase() === 'CONJ');
  }

  function isCopularVerb(entry){
    const strong = normalizeStrong(entry?.token?.strongs || '');
    if(strong === 'H1961') return true;
    const gloss = String(entry?.tokenGloss || '').trim().toLowerCase();
    return /^(es|era|eran|fue|fueron|sera|seran|seria|serian|esta|estan|estaba|estaban|estuvo|estuvieron)\b/.test(gloss);
  }

  function isNegationEntry(entry){
    const gloss = getEntryGloss(entry).toLowerCase();
    const morph = String(entry?.baseMorph || entry?.layer?.baseLabel || '').trim().toUpperCase();
    return gloss === 'no' || gloss === 'ni' || morph === 'ANN' || morph === 'AND' || morph === 'AQN';
  }

  function isVolitiveNegationEntry(entry){
    const morph = String(entry?.baseMorph || entry?.layer?.baseLabel || '').trim().toUpperCase();
    const strong = normalizeStrong(entry?.token?.strongs || '');
    return morph === 'AND' || strong === 'H408';
  }

  function isClauseParticleEntry(entry){
    const gloss = getEntryGloss(entry).toLowerCase();
    const morph = String(entry?.baseMorph || entry?.layer?.baseLabel || '').trim().toUpperCase();
    const strong = normalizeStrong(entry?.token?.strongs || '');
    if(strong === 'H3588') return true;
    if(['CK', 'CI', 'AYT', 'AM', 'INTJ', 'AQB', 'AJ', 'AGT', 'ANT'].includes(morph)){
      return true;
    }
    return [
      'si',
      'porque',
      'que',
      'ciertamente',
      'antes',
      'antes que',
      'cuando',
      'entonces',
      'ahora',
      'he aqui',
      'pues'
    ].includes(gloss);
  }

  function findPreviousSignificantEntry(items, startIndex){
    for(let index = startIndex - 1; index >= 0; index -= 1){
      const entry = items[index];
      if(!entry) continue;
      if(isArticleOnlyToken(entry)) continue;
      const gloss = getEntryGloss(entry);
      const features = extractMorphFeatures(entry?.baseMorph || entry?.layer?.baseLabel || '');
      if(isConjunctionEntry(entry) && !gloss) continue;
      if(!gloss && !features.isVerbal && !features.isNominal && !features.isProper) continue;
      return { entry, index };
    }
    return null;
  }

  function findNextSignificantEntry(items, startIndex){
    for(let index = startIndex + 1; index < items.length; index += 1){
      const entry = items[index];
      if(!entry) continue;
      if(isArticleOnlyToken(entry)) continue;
      const gloss = getEntryGloss(entry);
      const features = extractMorphFeatures(entry?.baseMorph || entry?.layer?.baseLabel || '');
      if(!gloss && !features.isVerbal && !features.isNominal && !features.isProper) continue;
      return { entry, index };
    }
    return null;
  }

  function isSensoryOrCognitiveVerb(entry){
    const strong = normalizeStrong(entry?.token?.strongs || '');
    return ['H7200', 'H3045', 'H559', 'H8085'].includes(strong);
  }

  function resolveKiGloss(items, index){
    const previous = findPreviousSignificantEntry(items, index);
    const next = findNextSignificantEntry(items, index);
    const previousFinite = findLastActiveFiniteVerb(items, index);

    if(previous?.entry && isNegationEntry(previous.entry)){
      return 'sino';
    }

    if(previous?.entry && isSensoryOrCognitiveVerb(previous.entry)){
      return 'que';
    }

    if(previousFinite?.entry && isSensoryOrCognitiveVerb(previousFinite.entry)){
      return 'que';
    }

    const hasNoPriorClause = !previous || isConjunctionEntry(previous.entry);
    if(hasNoPriorClause){
      const nextFeatures = extractMorphFeatures(next?.entry?.baseMorph || next?.entry?.layer?.baseLabel || '');
      if(nextFeatures.isVerbal && !nextFeatures.isVolitive){
        return 'si';
      }
      return 'ciertamente';
    }

    return 'porque';
  }

  function applyKiParticleSemantics(items){
    return items.map((entry, index, array) => {
      if(normalizeStrong(entry?.token?.strongs || '') !== 'H3588'){
        return { ...entry };
      }
      const gloss = resolveKiGloss(array, index);
      return {
        ...entry,
        baseGloss: gloss,
        tokenGloss: gloss,
        phraseGloss: '',
        semanticRole: 'ki-particle'
      };
    });
  }

  function isSpeechFormulaEntry(entry){
    const strong = normalizeStrong(entry?.token?.strongs || '');
    const features = extractMorphFeatures(entry?.baseMorph || entry?.layer?.baseLabel || '');
    const gloss = getEntryGloss(entry).toLowerCase();
    return strong === 'H559' && (features.isInfinitive || gloss.includes('decir') || gloss.includes('diciendo'));
  }

  function hasArticleMorpheme(entry){
    const morphemes = Array.isArray(entry?.layer?.morphemes) ? entry.layer.morphemes : [];
    return morphemes.some((morpheme) => String(morpheme?.label || '').trim().toUpperCase() === 'ART');
  }

  function isArticleOnlyToken(entry){
    const morphemes = Array.isArray(entry?.layer?.morphemes) ? entry.layer.morphemes : [];
    return morphemes.length > 0 && morphemes.every((morpheme) => String(morpheme?.label || '').trim().toUpperCase() === 'ART');
  }

  function findConstructTailIndex(items, startIndex){
    let sawArticleBridge = false;
    let articleIndex = -1;
    for(let index = startIndex + 1; index < items.length; index += 1){
      const entry = items[index];
      const features = extractMorphFeatures(entry?.baseMorph || entry?.layer?.baseLabel || '');
      if(isArticleOnlyToken(entry)){
        sawArticleBridge = true;
        if(articleIndex < 0) articleIndex = index;
        continue;
      }
      if(features.isNominal || features.isProper){
        return {
          index,
          viaArticle: sawArticleBridge || hasArticleMorpheme(entry),
          articleIndex
        };
      }
      if(features.isVerbal){
        return null;
      }
      const gloss = String(entry?.tokenGloss || entry?.baseGloss || '').trim();
      if(gloss){
        return null;
      }
    }
    return null;
  }

  function applyConstructSemantics(items){
    const updated = items.map((entry) => ({ ...entry }));

    updated.forEach((entry, index) => {
      const features = extractMorphFeatures(entry?.baseMorph || entry?.layer?.baseLabel || '');
      const hasPronominalSuffix = Boolean(entry?.layer?.hasPronominalSuffix);
      const tokenGloss = String(entry?.tokenGloss || '').trim();
      if(!features.isConstruct || !features.isNominal || hasPronominalSuffix || !tokenGloss) return;

      const tail = findConstructTailIndex(updated, index);
      if(!tail) return;

      const dependentEntry = updated[tail.index];
      const dependentFeatures = extractMorphFeatures(dependentEntry?.baseMorph || dependentEntry?.layer?.baseLabel || '');
      const dependentGloss = String(dependentEntry?.tokenGloss || dependentEntry?.baseGloss || '').trim();
      const articleSourceGloss = tail.articleIndex >= 0 ? getEntryGloss(updated[tail.articleIndex]) : '';
      const lexicalHead = resolveConstructHeadLexeme(entry);
      const currentHead = tokenGloss.replace(/\bde$/i, '').trim();
      const rawHeadGloss = currentHead && !isDefectiveConstructGloss(tokenGloss) && hasUsefulLexicalContent(currentHead)
        ? currentHead
        : (lexicalHead || currentHead);
      const headPhrase = entry?.spanishArticleHint && !startsWithDeterminer(tokenGloss)
        ? `${entry.spanishArticleHint} ${rawHeadGloss}`.trim()
        : rawHeadGloss;
      const bridgeGloss = tail.viaArticle && tail.articleIndex >= 0
        ? toDependentArticleGloss(articleSourceGloss, dependentEntry, dependentFeatures)
        : '';
      const dependentPhrase = tail.viaArticle
        ? `${bridgeGloss} ${dependentGloss}`.trim()
        : dependentFeatures.isProper || isNameLikeGloss(dependentGloss) || startsWithDeterminer(dependentGloss)
          ? dependentGloss
          : `${resolveDependentArticleForEntry(dependentEntry, dependentFeatures)} ${dependentGloss}`.trim();
      const phraseGloss = tail.viaArticle
        ? buildConstructPhrase(headPhrase, dependentPhrase)
        : buildConstructPhrase(headPhrase, dependentPhrase);

      updated[index] = {
        ...entry,
        tokenGloss: tail.viaArticle ? rawHeadGloss : (/\bde$/i.test(rawHeadGloss) ? rawHeadGloss : `${rawHeadGloss} de`),
        phraseGloss,
        semanticRole: 'construct-head',
        constructTargetIndex: tail.index,
        constructViaArticle: tail.viaArticle
      };

      if(tail.viaArticle && tail.articleIndex >= 0 && updated[tail.articleIndex]){
        updated[tail.articleIndex] = {
          ...updated[tail.articleIndex],
          tokenGloss: bridgeGloss,
          semanticRole: 'construct-bridge-article',
          constructHeadIndex: index,
          constructTargetIndex: tail.index
        };
      }
    });

    return updated;
  }

  function findPhraseTargetAfter(items, startIndex){
    let articleIndex = -1;
    for(let index = startIndex + 1; index < items.length; index += 1){
      const entry = items[index];
      const features = extractMorphFeatures(entry?.baseMorph || entry?.layer?.baseLabel || '');
      if(isDirectObjectMarker(entry)){
        continue;
      }
      if(isArticleOnlyToken(entry)){
        if(articleIndex < 0) articleIndex = index;
        continue;
      }
      if(features.isVerbal && features.isInfinitive){
        return { index, articleIndex: -1, infinitive: true };
      }
      if(features.isNominal || features.isProper){
        return { index, articleIndex };
      }
      if(features.isVerbal) return null;
      const gloss = getEntryGloss(entry);
      if(gloss) return null;
    }
    return null;
  }

  function collectRelativeLocationQualifier(items, nominalIndex){
    const relEntry = items[nominalIndex + 1];
    if(!relEntry || String(relEntry?.baseMorph || relEntry?.layer?.baseLabel || '').trim().toUpperCase() !== 'REL'){
      return '';
    }
    const prepPieces = [];
    let articleIndex = -1;
    let targetIndex = -1;
    for(let index = nominalIndex + 2; index < items.length; index += 1){
      const entry = items[index];
      const features = extractMorphFeatures(entry?.baseMorph || entry?.layer?.baseLabel || '');
      if(isArticleOnlyToken(entry)){
        if(articleIndex < 0) articleIndex = index;
        continue;
      }
      if(isPrepositionEntry(entry)){
        const gloss = getEntryGloss(entry);
        if(gloss) prepPieces.push(gloss.toLowerCase());
        continue;
      }
      if(features.isNominal || features.isProper){
        targetIndex = index;
      }
      break;
    }
    if(targetIndex < 0 || !prepPieces.length) return '';
    let prepPhrase = prepPieces.join(' ').trim();
    prepPhrase = prepPhrase
      .replace(/^de debajo de\b/i, 'debajo de')
      .replace(/^de sobre\b/i, 'sobre')
      .replace(/^debajo de a\b/i, 'debajo de')
      .replace(/^sobre a\b/i, 'sobre');
    let targetGloss = getNominalPhraseAt(items, targetIndex);
    if(!targetGloss){
      const targetEntry = items[targetIndex];
      const targetFeatures = extractMorphFeatures(targetEntry?.baseMorph || targetEntry?.layer?.baseLabel || '');
      const raw = getEntryGloss(targetEntry);
      if(raw){
        targetGloss = articleIndex >= 0 && !targetFeatures.isProper && !startsWithDeterminer(raw)
          ? `${getEntryGloss(items[articleIndex]) || resolveStandaloneArticleForEntry(targetEntry, targetFeatures)} ${raw}`.trim()
          : raw;
      }
    }
    if(!targetGloss) return '';
    return normalizeSpanishPhrase(`que estaban ${prepPhrase} ${targetGloss}`);
  }

  function findSubjectBeforeVerb(items, verbIndex){
    for(let index = verbIndex - 1; index >= 0; index -= 1){
      const entry = items[index];
      const features = extractMorphFeatures(entry?.baseMorph || entry?.layer?.baseLabel || '');
      if(isConjunctionEntry(entry)){
        return null;
      }
      if(isDirectObjectMarker(entry) || isArticleOnlyToken(entry) || isPrepositionEntry(entry)){
        continue;
      }
      if(index > 0 && items[index - 1]?.semanticRole === 'construct-head' && items[index - 1]?.constructTargetIndex === index){
        continue;
      }
      if(index > 0 && isPrepositionEntry(items[index - 1])){
        continue;
      }
      if(index > 1 && isArticleOnlyToken(items[index - 1]) && isPrepositionEntry(items[index - 2])){
        continue;
      }
      if(
        index > 1 &&
        items[index - 2]?.semanticRole === 'construct-head' &&
        items[index - 2]?.constructTargetIndex === index &&
        isArticleOnlyToken(items[index - 1])
      ){
        continue;
      }
      if(index > 0 && isClauseParticleEntry(items[index - 1])){
        continue;
      }
      if(features.isNominal || features.isProper){
        const gloss = getNominalPhraseAt(items, index);
        if(gloss) return { index, gloss };
      }
      if(features.isVerbal){
        return null;
      }
    }
    return null;
  }

  function findSubjectAfterVerb(items, verbIndex){
    for(let index = verbIndex + 1; index < items.length; index += 1){
      const entry = items[index];
      const features = extractMorphFeatures(entry?.baseMorph || entry?.layer?.baseLabel || '');
      if(isDirectObjectMarker(entry) || isArticleOnlyToken(entry)){
        continue;
      }
      if(isPrepositionEntry(entry)){
        return null;
      }
      if(features.isNominal || features.isProper){
        const gloss = getNominalPhraseAt(items, index);
        if(gloss){
          return { index, gloss };
        }
      }
      if(features.isVerbal){
        return null;
      }
      const gloss = getEntryGloss(entry);
      if(gloss){
        return null;
      }
    }
    return null;
  }

  function collectPostVerbNominalCandidates(items, verbIndex){
    const candidates = [];
    let sawObjectMarker = false;
    let articleIndex = -1;

    for(let index = verbIndex + 1; index < items.length; index += 1){
      const entry = items[index];
      const features = extractMorphFeatures(entry?.baseMorph || entry?.layer?.baseLabel || '');

      if(isDirectObjectMarker(entry)){
        sawObjectMarker = true;
        continue;
      }
      if(isArticleOnlyToken(entry)){
        if(articleIndex < 0) articleIndex = index;
        continue;
      }
      if(isConjunctionEntry(entry)){
        continue;
      }
      if(isPrepositionEntry(entry) || features.isVerbal){
        break;
      }

      const gloss = getEntryGloss(entry);
      if(features.isNominal || features.isProper){
        candidates.push({
          index,
          gloss: getNominalPhraseAt(items, index) || gloss,
          explicitObjectMarker: sawObjectMarker,
          articleIndex,
          hasArticle: articleIndex >= 0 || hasArticleMorpheme(entry),
          isProper: features.isProper
        });
        sawObjectMarker = false;
        articleIndex = -1;
        continue;
      }

      if(gloss){
        break;
      }
    }

    return candidates;
  }

  function findDirectObjectAfterVerb(items, verbIndex){
    let sawObjectMarker = false;
    for(let index = verbIndex + 1; index < items.length; index += 1){
      const entry = items[index];
      const features = extractMorphFeatures(entry?.baseMorph || entry?.layer?.baseLabel || '');
      if(isDirectObjectMarker(entry)){
        sawObjectMarker = true;
        continue;
      }
      if(isArticleOnlyToken(entry)){
        continue;
      }
      if(isPrepositionEntry(entry) || features.isVerbal){
        return null;
      }
      if(!sawObjectMarker && (features.isProper || /^NPROP(?:\.|$)/.test(String(entry?.baseMorph || '').trim().toUpperCase()))){
        return null;
      }
      if(features.isNominal || features.isProper){
        const gloss = getNominalPhraseAt(items, index);
        if(gloss){
          return {
            index,
            gloss,
            explicitMarker: sawObjectMarker
          };
        }
      }
      const gloss = getEntryGloss(entry);
      if(gloss && !sawObjectMarker){
        return null;
      }
    }
    return null;
  }

  function collectDirectObjectPhrasesAfterVerb(items, verbIndex){
    const phrases = [];
    let pendingConjunction = '';
    let sawObjectMarker = false;
    let articleIndex = -1;

    for(let index = verbIndex + 1; index < items.length; index += 1){
      const entry = items[index];
      const features = extractMorphFeatures(entry?.baseMorph || entry?.layer?.baseLabel || '');

      if(isDirectObjectMarker(entry)){
        sawObjectMarker = true;
        continue;
      }
      if(isArticleOnlyToken(entry)){
        if(articleIndex < 0) articleIndex = index;
        continue;
      }
      if(isConjunctionEntry(entry)){
        pendingConjunction = getEntryGloss(entry) || 'y';
        continue;
      }
      if(isPrepositionEntry(entry) || features.isVerbal){
        break;
      }
      if(features.isNominal || features.isProper){
        let gloss = getNominalPhraseAt(items, index);
        if(!gloss && articleIndex >= 0 && !features.isProper){
          gloss = `${getEntryGloss(items[articleIndex]) || resolveStandaloneArticleForEntry(entry, features)} ${getEntryGloss(entry)}`.trim();
        }
        if(gloss && (sawObjectMarker || phrases.length > 0)){
          phrases.push(pendingConjunction ? `${pendingConjunction} ${gloss}` : gloss);
          pendingConjunction = '';
        }
        sawObjectMarker = false;
        articleIndex = -1;
        continue;
      }
      if(getEntryGloss(entry)){
        break;
      }
    }

    return phrases;
  }

  function determineVerbArguments(items, verbIndex){
    const subjectBefore = findSubjectBeforeVerb(items, verbIndex);
    if(subjectBefore){
      return {
        subject: subjectBefore,
        directObject: findDirectObjectAfterVerb(items, verbIndex)
      };
    }

    const candidates = collectPostVerbNominalCandidates(items, verbIndex);
    if(!candidates.length){
      return {
        subject: null,
        directObject: null
      };
    }

    const explicitObject = candidates.find((candidate) => candidate.explicitObjectMarker) || null;
    if(explicitObject){
      const subject = candidates.find((candidate) => candidate.index < explicitObject.index) || null;
      return {
        subject,
        directObject: explicitObject
      };
    }

    if(candidates.length === 1){
      return {
        subject: candidates[0],
        directObject: null
      };
    }

    const [first, second] = candidates;

    if(first.isProper && second && !second.isProper){
      return {
        subject: first,
        directObject: second
      };
    }

    if(!first.hasArticle && second.hasArticle){
      return {
        subject: first,
        directObject: second
      };
    }

    if(first.isProper && second.isProper){
      return {
        subject: first,
        directObject: second
      };
    }

    return {
      subject: first,
      directObject: second || null
    };
  }

  function collectTrailingPrepositionPhrases(items, startIndex){
    const phrases = [];
    const seen = new Set();
    for(let index = startIndex + 1; index < items.length; index += 1){
      const entry = items[index];
      const features = extractMorphFeatures(entry?.baseMorph || entry?.layer?.baseLabel || '');
      if(features.isVerbal) break;
      if(isPrepositionEntry(entry)){
        const gloss = getEntryGloss(entry);
        if(gloss && !seen.has(index)){
          phrases.push(gloss);
          seen.add(index);
        }
        continue;
      }
    }
    return phrases;
  }

  function stripLeadingConjunction(text){
    return normalizeSpanishPhrase(String(text || '').replace(/^(y|e)\s+/i, ''));
  }

  function findSpeechClauseAfter(items, verbIndex){
    for(let index = verbIndex + 1; index < items.length; index += 1){
      const entry = items[index];
      const features = extractMorphFeatures(entry?.baseMorph || entry?.layer?.baseLabel || '');
      if(features.isVerbal && (features.isVolitive || features.isFinite || features.isParticiple)){
        return { index, gloss: getEntryGloss(entry) };
      }
    }
    return null;
  }

  function collectBetweenPair(items, startIndex){
    const first = items[startIndex];
    if(!first || String(first?.tokenGloss || '').trim().toLowerCase() !== 'entre') return null;
    const firstTarget = findPhraseTargetAfter(items, startIndex);
    if(!firstTarget) return null;
    const firstBundle = getNominalPhraseBundleAt(items, firstTarget.index);
    const firstGloss = firstBundle.phrase;
    const firstQualifier = collectRelativeLocationQualifier(items, firstTarget.index);
    if(!firstGloss) return null;
    for(let index = firstBundle.endIndex + 1; index < items.length; index += 1){
      const entry = items[index];
      if(isConjunctionEntry(entry)) continue;
      const lowerPrep = String(entry?.tokenGloss || '').trim().toLowerCase();
      const allowSimpleA = lowerPrep === 'a' && index === firstBundle.endIndex + 1;
      if(isPrepositionEntry(entry) && (lowerPrep === 'entre' || allowSimpleA)){
        const secondTarget = findPhraseTargetAfter(items, index);
        const secondBundle = secondTarget ? getNominalPhraseBundleAt(items, secondTarget.index) : { phrase: '' };
        const secondGloss = secondBundle.phrase;
        const secondQualifier = secondTarget ? collectRelativeLocationQualifier(items, secondTarget.index) : '';
        if(secondGloss){
          const pairCore = normalizeRepeatedPairPhrase(
            `${firstGloss}${firstQualifier ? ` ${firstQualifier}` : ''}`,
            `${secondGloss}${secondQualifier ? ` ${secondQualifier}` : ''}`
          );
          return {
            startIndex,
            secondIndex: index,
            phrase: normalizeSpanishPhrase(`entre ${pairCore}`)
          };
        }
      }
      if(extractMorphFeatures(entry?.baseMorph || entry?.layer?.baseLabel || '').isVerbal) break;
    }
    return null;
  }

  function collectNamingPhrase(items, verbIndex){
    const strong = normalizeStrong(items[verbIndex]?.token?.strongs || '');
    if(strong !== 'H7121') return null;
    let preVerbObject = null;
    for(let index = verbIndex - 1; index >= 0; index -= 1){
      const entry = items[index];
      if(isConjunctionEntry(entry)) break;
      if(isPrepositionEntry(entry) && String(entry?.tokenGloss || '').trim().toLowerCase() === 'a'){
        preVerbObject = getEntryGloss(entry);
        break;
      }
    }
    for(let index = verbIndex + 1; index < items.length; index += 1){
      const entry = items[index];
      if(!isPrepositionEntry(entry) || String(entry?.tokenGloss || '').trim().toLowerCase() !== 'a') continue;
      const target = findPhraseTargetAfter(items, index);
      if(!target) return null;
      const objectGloss = getEntryGloss(entry);
      let nameGloss = '';
      for(let j = target.index + 1; j < items.length; j += 1){
        const next = items[j];
        const features = extractMorphFeatures(next?.baseMorph || next?.layer?.baseLabel || '');
        if(features.isNominal || features.isProper){
          nameGloss = formatAssignedName(getNominalPhraseAt(items, j) || getEntryGloss(next));
          break;
        }
        if(features.isVerbal || isPrepositionEntry(next)) break;
      }
      if(objectGloss && nameGloss){
        return normalizeSpanishPhrase(`${nameGloss} a ${objectGloss.replace(/^a\s+/i, '')}`);
      }
      return objectGloss || '';
    }
    if(preVerbObject){
      for(let j = verbIndex + 1; j < items.length; j += 1){
        const next = items[j];
        const features = extractMorphFeatures(next?.baseMorph || next?.layer?.baseLabel || '');
        if(features.isNominal || features.isProper){
          const nameGloss = formatAssignedName(getNominalPhraseAt(items, j) || getEntryGloss(next));
          if(nameGloss){
            return normalizeSpanishPhrase(`${nameGloss} a ${preVerbObject.replace(/^a\s+/i, '')}`);
          }
        }
        if(features.isVerbal || isPrepositionEntry(next)) break;
      }
    }
    return null;
  }

  function collectClauseOpeners(items, boundaryIndex, excludedIndex){
    const openers = [];
    const seen = new Set();
    for(let index = 0; index < boundaryIndex; index += 1){
      if(index === excludedIndex) continue;
      const entry = items[index];
      if(isConjunctionEntry(entry)) continue;
      if(!isClauseParticleEntry(entry)) continue;
      const gloss = getEntryGloss(entry);
      if(gloss && !seen.has(gloss) && !isSpanishAuxiliaryGloss(gloss)){
        openers.push(gloss);
        seen.add(gloss);
      }
    }
    return openers;
  }

  function collectPreVerbNegations(items, verbIndex, subjectIndex){
    const negations = [];
    const start = Number.isInteger(subjectIndex) && subjectIndex >= 0 ? subjectIndex + 1 : 0;
    for(let index = start; index < verbIndex; index += 1){
      const entry = items[index];
      if(isConjunctionEntry(entry) || isClauseParticleEntry(entry)) continue;
      if(isNegationEntry(entry)){
        const gloss = getEntryGloss(entry);
        if(gloss) negations.push(gloss);
        continue;
      }
    }
    return negations;
  }

  function collectSpeechFormulaAfterVerb(items, verbIndex){
    for(let index = verbIndex + 1; index < items.length; index += 1){
      const entry = items[index];
      if(isDirectObjectMarker(entry) || isArticleOnlyToken(entry)) continue;
      if(isSpeechFormulaEntry(entry)){
        const gloss = getEntryGloss(entry);
        return gloss || 'diciendo';
      }
      if(isConjunctionEntry(entry)) continue;
      if(isPrepositionEntry(entry)) return '';
      const features = extractMorphFeatures(entry?.baseMorph || entry?.layer?.baseLabel || '');
      if(features.isVerbal || features.isNominal || features.isProper) return '';
    }
    return '';
  }

  function findLeadingClauseConjunction(items, verbIndex, subjectIndex){
    const stopIndex = Math.min(
      verbIndex,
      Number.isInteger(subjectIndex) && subjectIndex >= 0 ? subjectIndex : verbIndex
    );
    for(let index = 0; index < stopIndex; index += 1){
      const entry = items[index];
      if(!isConjunctionEntry(entry)) continue;
      const gloss = getEntryGloss(entry);
      if(gloss) return { index, gloss };
    }
    return null;
  }

  function collectPredicateComplementsAfterVerb(items, verbIndex){
    const complements = [];
    let pendingConjunction = '';
    for(let index = verbIndex + 1; index < items.length; index += 1){
      const entry = items[index];
      const features = extractMorphFeatures(entry?.baseMorph || entry?.layer?.baseLabel || '');
      if(isDirectObjectMarker(entry) || isArticleOnlyToken(entry)) continue;
      if(isPrepositionEntry(entry) || features.isVerbal) break;
      if(isClauseParticleEntry(entry)) continue;

      if(isConjunctionEntry(entry)){
        const gloss = getEntryGloss(entry);
        pendingConjunction = gloss || 'y';
        continue;
      }

      if(features.isNominal || features.isProper){
        const gloss = getEntryGloss(entry);
        if(gloss){
          const phrase = getNominalPhraseAt(items, index) || gloss;
          complements.push(pendingConjunction ? `${pendingConjunction} ${phrase}` : phrase);
          pendingConjunction = '';
          continue;
        }
      }

      const gloss = getEntryGloss(entry);
      if(gloss){
        complements.push(pendingConjunction ? `${pendingConjunction} ${gloss}` : gloss);
        pendingConjunction = '';
        continue;
      }
      break;
    }
    return complements;
  }

  function collectNarrativeHayahComplements(items, verbIndex){
    const pieces = [];
    const labels = [];
    for(let index = verbIndex + 1; index < items.length; index += 1){
      const entry = items[index];
      const features = extractMorphFeatures(entry?.baseMorph || entry?.layer?.baseLabel || '');
      if(isDirectObjectMarker(entry) || isArticleOnlyToken(entry)) continue;
      if(isConjunctionEntry(entry)) break;
      if(isPrepositionEntry(entry) || features.isVerbal) break;
      const gloss = getNominalPhraseAt(items, index) || getEntryGloss(entry);
      if(!gloss) break;
      pieces.push(gloss);
      labels.push(String(entry?.baseMorph || entry?.layer?.baseLabel || '').trim().toUpperCase());
    }
    if(!pieces.length) return '';
    if(pieces.length === 1) return pieces[0];
    if(pieces.length === 2 && /^NUM\.CARD/.test(labels[1])){
      return normalizeSpanishPhrase(`${pieces[0]} ${pieces[1]}`);
    }
    if(
      pieces.length === 3 &&
      (/^NUM\.(CARD|ORD)/.test(labels[2]) || /^ADJ/.test(labels[2])) &&
      /^(SUBS|ADJ|NPROP)/.test(labels[1])
    ){
      return normalizeDayOrdinalPhrase(`${pieces[1]} ${pieces[2]}`) === `${pieces[1]} ${pieces[2]}`
        ? normalizeSpanishPhrase(`${pieces[0]}, ${pieces[1]} ${pieces[2]}`)
        : normalizeSpanishPhrase(`${pieces[0]}, ${normalizeDayOrdinalPhrase(`${pieces[1]} ${pieces[2]}`)}`);
    }
    const last = pieces[pieces.length - 1];
    const head = pieces.slice(0, -1).join(' ');
    return normalizeSpanishPhrase(`${head}, ${last}`);
  }

  function findNominalPredicatePair(items){
    for(let index = 0; index < items.length - 1; index += 1){
      const left = items[index];
      const right = items[index + 1];
      const leftFeatures = extractMorphFeatures(left?.baseMorph || left?.layer?.baseLabel || '');
      const rightFeatures = extractMorphFeatures(right?.baseMorph || right?.layer?.baseLabel || '');
      if(leftFeatures.isVerbal || rightFeatures.isVerbal) continue;
      if(isConjunctionEntry(left) || isConjunctionEntry(right)) continue;
      if(isClauseParticleEntry(left) || isClauseParticleEntry(right)) continue;
      if(isPrepositionEntry(left) || isPrepositionEntry(right)) continue;
      if(isDirectObjectMarker(left) || isDirectObjectMarker(right)) continue;
      if(!getEntryGloss(left) || !getEntryGloss(right)) continue;
      if(leftFeatures.isNominal || leftFeatures.isProper){
        if(rightFeatures.isNominal || rightFeatures.isProper){
          return { subjectIndex: index, predicateIndex: index + 1 };
        }
      }
    }
    return null;
  }

  function applyNominalPredicateSemantics(items){
    const updated = items.map((entry) => ({ ...entry }));
    const hasFiniteVerb = updated.some((entry) => {
      const features = extractMorphFeatures(entry?.baseMorph || entry?.layer?.baseLabel || '');
      return features.isVerbal && !features.isInfinitive;
    });
    if(hasFiniteVerb) return updated;

    const pair = findNominalPredicatePair(updated);
    if(!pair) return updated;

    const subjectGloss = getEntryGloss(updated[pair.subjectIndex]);
    const predicateGloss = getEntryGloss(updated[pair.predicateIndex]);
    const copula = resolveVirtualCopulaGloss(updated, pair.predicateIndex, { subjectGloss });
    const phraseGloss = normalizeSpanishPhrase(`${subjectGloss} ${copula} ${predicateGloss}`);
    updated[pair.predicateIndex] = {
      ...updated[pair.predicateIndex],
      phraseGloss,
      semanticRole: 'nominal-predicate',
      clauseSubjectIndex: pair.subjectIndex
    };
    return updated;
  }

  function applySyntacticPhraseSemantics(items){
    const updated = items.map((entry) => ({ ...entry }));

    updated.forEach((entry, index) => {
      if(isDirectObjectMarker(entry)){
        updated[index] = {
          ...entry,
          phraseGloss: '',
          semanticRole: 'direct-object-marker'
        };
        return;
      }

      if(!isPrepositionEntry(entry)) return;
      const prepGloss = String(entry?.tokenGloss || '').trim();
      if(!prepGloss) return;
      if(
        /^a$/i.test(prepGloss) &&
        index > 0 &&
        isPrepositionEntry(updated[index - 1]) &&
        /^(debajo de|sobre|hacia|entre)$/i.test(String(updated[index - 1]?.tokenGloss || '').trim())
      ){
        return;
      }

      const target = findPhraseTargetAfter(updated, index);
      if(!target) return;

      const targetEntry = updated[target.index];
      const targetFeatures = extractMorphFeatures(targetEntry?.baseMorph || targetEntry?.layer?.baseLabel || '');
      let targetGloss = getNominalPhraseBundleAt(updated, target.index).phrase || getEntryGloss(targetEntry);
      if(!targetGloss) return;

      if(target.infinitive){
        const loweredPrep = prepGloss.toLowerCase();
        const phraseGloss = loweredPrep === 'a'
          ? `para ${targetGloss}`
          : loweredPrep === 'en'
            ? `al ${targetGloss}`
            : `${prepGloss} ${targetGloss}`;
        updated[index] = {
          ...entry,
          phraseGloss: normalizeSpanishPhrase(phraseGloss),
          semanticRole: 'preposition-infinitive',
          phraseTargetIndex: target.index
        };
        return;
      }

      if(target.articleIndex >= 0 && !targetFeatures.isProper && !startsWithDeterminer(targetGloss)){
        const articleSourceGloss = getEntryGloss(updated[target.articleIndex]);
        targetGloss = `${articleSourceGloss || resolveStandaloneArticleForEntry(targetEntry, targetFeatures)} ${targetGloss}`.trim();
      }
      if(
        targetEntry?.semanticRole === 'construct-head' &&
        !startsWithDeterminer(targetGloss) &&
        !/^(medio|faz|rostro|cara|frente|presencia)\b/i.test(targetGloss)
      ){
        targetGloss = `${resolveStandaloneArticleForEntry(targetEntry, targetFeatures)} ${targetGloss}`.trim();
      }

      updated[index] = {
        ...entry,
        phraseGloss: normalizeSpanishPhrase(`${prepGloss} ${targetGloss}`),
        semanticRole: 'preposition-head',
        phraseTargetIndex: target.index
      };
    });

    return updated;
  }

  function applyClauseSemantics(items){
    const updated = items.map((entry) => ({ ...entry }));

    updated.forEach((entry, index) => {
      const features = extractMorphFeatures(entry?.baseMorph || entry?.layer?.baseLabel || '');
      if(!features.isVerbal || !features.isFinite) return;

      const verbGloss = String(entry?.tokenGloss || '').trim();
      if(!verbGloss) return;

      const detected = determineVerbArguments(updated, index);
      let subject = features.isVolitive ? null : detected.subject;
      let directObject = detected.directObject;
      const strong = normalizeStrong(entry?.token?.strongs || '');
      const isNarrativeHayah = strong === 'H1961' && !findSubjectBeforeVerb(updated, index);
      if(isNarrativeHayah){
        subject = null;
        directObject = null;
      }
      const prepStartIndex = directObject?.index ?? index;
      const objectPhrases = collectDirectObjectPhrasesAfterVerb(updated, index);
      const predicateComplements = !directObject && isCopularVerb(entry)
        ? collectPredicateComplementsAfterVerb(updated, index)
        : [];
      const complements = collectTrailingPrepositionPhrases(updated, prepStartIndex);
      const leadingConjunction = findLeadingClauseConjunction(updated, index, subject?.index ?? -1);
      const clauseOpeners = collectClauseOpeners(updated, subject?.index >= 0 ? subject.index : index, subject?.index ?? -1);
      const negations = collectPreVerbNegations(updated, index, subject?.index ?? -1);
      const speechFormula = collectSpeechFormulaAfterVerb(updated, index);

      const parts = [];
      if(!features.isVolitive && leadingConjunction?.gloss) parts.push(leadingConjunction.gloss);
      if(!features.isVolitive && clauseOpeners.length) parts.push(...clauseOpeners);
      if(subject?.gloss) parts.push(subject.gloss);
      if(negations.length) parts.push(...negations);
      parts.push(verbGloss);
      if(speechFormula) parts.push(speechFormula);
      if(objectPhrases.length){
        parts.push(...objectPhrases);
      }else if(directObject?.gloss){
        parts.push(directObject.gloss);
      }
      if(predicateComplements.length) parts.push(...predicateComplements);
      if(complements.length) parts.push(...complements);

      if(isNarrativeHayah && !subject && !directObject){
        const narrativeComplement = collectNarrativeHayahComplements(updated, index);
        if(narrativeComplement){
          const narrativeParts = [];
          if(leadingConjunction?.gloss) narrativeParts.push(leadingConjunction.gloss);
          const existentialVerb = /^(luz|expansi[oó]n|tinieblas|as[ií])$/i.test(narrativeComplement)
            ? (String(narrativeComplement).toLowerCase() === 'así' ? verbGloss : 'hubo')
            : /^(tarde|mañana|primer d[ií]a|segundo d[ií]a|tercer d[ií]a)/i.test(narrativeComplement)
              ? verbGloss
              : verbGloss;
          narrativeParts.push(existentialVerb);
          narrativeParts.push(narrativeComplement);
          updated[index] = {
            ...entry,
            phraseGloss: normalizeSpanishPhrase(narrativeParts.join(' ')),
            semanticRole: 'narrative-hayah'
          };
          return;
        }
      }

      const clauseGloss = normalizeSpanishPhrase(parts.join(' '));
      if(!clauseGloss) return;

      updated[index] = {
        ...entry,
        phraseGloss: clauseGloss,
        semanticRole: features.isImperative || features.isVolitive ? 'volitive-verb' : 'clause-verb',
        clauseSubjectIndex: subject?.index ?? -1,
        clauseObjectIndex: directObject?.index ?? -1,
        clauseVolitiveNegation: negations.some((gloss, negIndex) => {
          const negEntry = updated.find((candidate) => getEntryGloss(candidate) === gloss);
          return negEntry ? isVolitiveNegationEntry(negEntry) : false;
        })
      };
    });

    return updated;
  }

  function applyParticipleClauseSemantics(items){
    const updated = items.map((entry) => ({ ...entry }));

    updated.forEach((entry, index) => {
      const features = extractMorphFeatures(entry?.baseMorph || entry?.layer?.baseLabel || '');
      if(!features.isVerbal || !features.isParticiple) return;

      const verbGloss = String(entry?.tokenGloss || '').trim();
      if(!verbGloss) return;

      const subject = findSubjectBeforeVerb(updated, index) || findSubjectAfterVerb(updated, index);
      const complements = collectTrailingPrepositionPhrases(updated, index);
      const parts = [];
      if(subject?.gloss) parts.push(subject.gloss);
      if(findLastActiveFiniteVerb(updated, index)){
        parts.push(verbGloss);
      }else{
        parts.push(resolveVirtualCopulaGloss(updated, index, { subjectGloss: subject?.gloss || '' }));
        parts.push(verbGloss);
      }
      if(complements.length) parts.push(...complements);

      const clauseGloss = normalizeSpanishPhrase(parts.join(' '));
      if(!clauseGloss) return;

      updated[index] = {
        ...entry,
        phraseGloss: clauseGloss,
        semanticRole: 'participle-clause',
        clauseSubjectIndex: subject?.index ?? -1
      };
    });

    return updated;
  }

  function applySpecialClauseSemantics(items){
    const updated = items.map((entry) => ({ ...entry }));

    updated.forEach((entry, index) => {
      const strong = normalizeStrong(entry?.token?.strongs || '');
      const phrase = getEntryGloss(entry);
      if(!phrase) return;

      if(strong === 'H559'){
        const speech = findSpeechClauseAfter(updated, index);
        if(speech?.gloss){
          updated[index] = {
            ...entry,
            phraseGloss: normalizeSpanishPhrase(`${phrase}: ${stripLeadingConjunction(speech.gloss)}`)
          };
          return;
        }
      }

      if(strong === 'H1961'){
        const next = updated[index + 1];
        const nextFeatures = extractMorphFeatures(next?.baseMorph || next?.layer?.baseLabel || '');
        if(nextFeatures.isParticiple){
          const lead = findLeadingClauseConjunction(updated, index, -1);
          let nextPhrase = stripLeadingConjunction(next?.phraseGloss || getEntryGloss(next));
          if(normalizeStrong(next?.token?.strongs || '') === 'H914'){
            const betweenIndex = updated.findIndex((candidate, candidateIndex) => (
              candidateIndex > index &&
              String(candidate?.tokenGloss || '').trim().toLowerCase() === 'entre'
            ));
            if(betweenIndex > index){
              const between = collectBetweenPair(updated, betweenIndex);
              if(between?.phrase){
                nextPhrase = normalizeSpanishPhrase(`separe ${between.phrase}`);
              }
            }
          }
          if(nextPhrase){
            updated[index] = {
              ...entry,
              phraseGloss: normalizeSpanishPhrase(`${lead?.gloss || ''} que ${nextPhrase}`),
              semanticRole: 'hayah-participle-bridge'
            };
            updated[index + 1] = {
              ...next,
              phraseGloss: normalizeSpanishPhrase(`que ${nextPhrase}`)
            };
          }
        }
      }

      if(strong === 'H914'){
        for(let j = index + 1; j < updated.length; j += 1){
          const between = collectBetweenPair(updated, j);
          if(between){
            const subject = findSubjectBeforeVerb(updated, index) || findSubjectAfterVerb(updated, index);
            const lead = findLeadingClauseConjunction(updated, index, subject?.index ?? -1);
            const parts = [];
            if(lead?.gloss) parts.push(lead.gloss);
            if(subject?.gloss) parts.push(subject.gloss);
            parts.push(String(entry.tokenGloss || '').trim());
            parts.push(between.phrase);
            updated[index] = {
              ...entry,
              phraseGloss: normalizeSpanishPhrase(parts.join(' '))
            };
            if(updated[between.startIndex]){
              updated[between.startIndex] = {
                ...updated[between.startIndex],
                phraseGloss: between.phrase
              };
            }
            if(updated[between.secondIndex]){
              updated[between.secondIndex] = {
                ...updated[between.secondIndex],
                phraseGloss: ''
              };
            }
            break;
          }
        }
      }

      const between = collectBetweenPair(updated, index);
      if(between){
        updated[index] = {
          ...entry,
          phraseGloss: between.phrase
        };
        if(updated[between.secondIndex]){
          updated[between.secondIndex] = {
            ...updated[between.secondIndex],
            phraseGloss: ''
          };
        }
        return;
      }

      if(strong === 'H7121'){
        const naming = collectNamingPhrase(updated, index);
        if(naming){
          const hasPreVerbA = (() => {
            for(let k = index - 1; k >= 0; k -= 1){
              const candidate = updated[k];
              if(isConjunctionEntry(candidate)) break;
              if(isPrepositionEntry(candidate) && String(candidate?.tokenGloss || '').trim().toLowerCase() === 'a'){
                return true;
              }
            }
            return false;
          })();
          const subject = findSubjectBeforeVerb(updated, index) || (!hasPreVerbA ? findSubjectAfterVerb(updated, index) : null);
          const lead = findLeadingClauseConjunction(updated, index, subject?.index ?? -1);
          const pieces = [];
          if(lead?.gloss) pieces.push(lead.gloss);
          if(subject?.gloss) pieces.push(subject.gloss);
          if(/llam/i.test(naming)){
            pieces.push(naming);
          }else{
            pieces.push(String(entry.tokenGloss || '').trim());
            pieces.push(naming);
          }
          updated[index] = {
            ...entry,
            phraseGloss: normalizeSpanishPhrase(pieces.join(' '))
          };
        }
      }

      if(strong === 'H7200'){
        const subject = findSubjectBeforeVerb(updated, index) || findSubjectAfterVerb(updated, index);
        const lead = findLeadingClauseConjunction(updated, index, subject?.index ?? -1);
        const objectPhrases = collectDirectObjectPhrasesAfterVerb(updated, index);
        const objectPhrase = objectPhrases[0] || '';
        const kiIndex = updated.findIndex((candidate, candidateIndex) => (
          candidateIndex > index &&
          normalizeStrong(candidate?.token?.strongs || '') === 'H3588'
        ));
        if(objectPhrase && kiIndex > index){
          for(let j = kiIndex + 1; j < updated.length; j += 1){
            const next = updated[j];
            const features = extractMorphFeatures(next?.baseMorph || next?.layer?.baseLabel || '');
            if(features.isVerbal || isPrepositionEntry(next)) break;
            if(/^(ADJ|SUBS)(?:\.|$)/.test(String(next?.baseMorph || '').trim().toUpperCase())){
              const predicate = getNominalPhraseAt(updated, j) || getEntryGloss(next);
              if(predicate){
                const copula = resolveVirtualCopulaGloss(updated, j, { subjectGloss: objectPhrase });
                const pieces = [];
                if(lead?.gloss) pieces.push(lead.gloss);
                if(subject?.gloss) pieces.push(subject.gloss);
                pieces.push(String(entry.tokenGloss || '').trim());
                pieces.push(`que ${objectPhrase} ${copula} ${predicate}`);
                updated[index] = {
                  ...entry,
                  phraseGloss: normalizeSpanishPhrase(pieces.join(' '))
                };
              }
              break;
            }
          }
        }
        if(!objectPhrase && kiIndex > index){
          for(let j = kiIndex + 1; j < updated.length; j += 1){
            const next = updated[j];
            const features = extractMorphFeatures(next?.baseMorph || next?.layer?.baseLabel || '');
            if(features.isVerbal || isPrepositionEntry(next)) break;
            if(/^(ADJ|SUBS)(?:\.|$)/.test(String(next?.baseMorph || '').trim().toUpperCase())){
              const predicate = getNominalPhraseAt(updated, j) || getEntryGloss(next);
              if(predicate){
                const copula = resolveVirtualCopulaGloss(updated, j, { subjectGloss: '' });
                const pieces = [];
                if(lead?.gloss) pieces.push(lead.gloss);
                if(subject?.gloss) pieces.push(subject.gloss);
                pieces.push(String(entry.tokenGloss || '').trim());
                pieces.push(`que ${copula} ${predicate}`);
                updated[index] = {
                  ...entry,
                  phraseGloss: normalizeSpanishPhrase(pieces.join(' '))
                };
              }
              break;
            }
          }
        }
      }
    });

    return updated;
  }

  function buildAdminVersePlan(verseNode, oshbVerseNode){
    const tokens = getAdminVerseTokens(verseNode);
    const baseItems = tokens.map((token, posIndex) => buildSpanishLayerForToken(token, {
      oshbVerseNode,
      posIndex,
      ...buildConstructContext(tokens, oshbVerseNode, posIndex)
    }));
    const kiItems = applyKiParticleSemantics(baseItems);
    const constructItems = applyConstructSemantics(kiItems);
    const phraseItems = applySyntacticPhraseSemantics(constructItems);
    const clauseItems = applyClauseSemantics(phraseItems);
    const participleItems = applyParticipleClauseSemantics(clauseItems);
    const specialItems = applySpecialClauseSemantics(participleItems);
    const items = applyNominalPredicateSemantics(specialItems);

    return {
      tokenCount: items.length,
      items
    };
  }

  global.AdminHebrewInterlinearEngine = {
    normalizeHebrew,
    normalizeStrong,
    getAdminVerseTokens,
    getOshbMorphAt,
    buildSpanishLayerForToken,
    buildAdminVersePlan
  };
})(typeof window !== 'undefined' ? window : globalThis);
