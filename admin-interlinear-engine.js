(function(global){
  const Rules = global.HebrewGrammarRules || null;

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

    return sourceTokens
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

  function buildSpanishLayerForToken(token, context = {}){
    const baseMorph = getOshbMorphAt(context.oshbVerseNode, token, context.posIndex);
    const baseGloss = String(token?.es || '').trim();
    const layer = Rules?.buildSpanishInterlinearPlan
      ? Rules.buildSpanishInterlinearPlan(token?.orig || '', baseMorph, baseGloss, {
          strong: normalizeStrong(token?.strongs)
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
      layer,
      tokenGloss
    };
  }

  function extractMorphFeatures(label){
    const upper = String(label || '').trim().toUpperCase();
    return {
      isConstruct: /\.C(?:$|\.)/.test(upper),
      isNominal: /^(SUBS|ADJ|NPROP)(?:\.|$)/.test(upper),
      isProper: /^NPROP(?:\.|$)/.test(upper),
      isVerbal: /^VERBO(?:\.|$)/.test(upper)
    };
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
    for(let index = startIndex + 1; index < items.length; index += 1){
      const entry = items[index];
      const features = extractMorphFeatures(entry?.baseMorph || entry?.layer?.baseLabel || '');
      if(isArticleOnlyToken(entry)){
        sawArticleBridge = true;
        continue;
      }
      if(features.isNominal || features.isProper){
        return {
          index,
          viaArticle: sawArticleBridge || hasArticleMorpheme(entry)
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
    return items.map((entry, index) => {
      const features = extractMorphFeatures(entry?.baseMorph || entry?.layer?.baseLabel || '');
      const hasPronominalSuffix = Boolean(entry?.layer?.hasPronominalSuffix);
      const tokenGloss = String(entry?.tokenGloss || '').trim();
      if(!features.isConstruct || !features.isNominal || hasPronominalSuffix || !tokenGloss){
        return entry;
      }

      const tail = findConstructTailIndex(items, index);
      if(!tail) return entry;

      const normalizedGloss = /\bde$/i.test(tokenGloss) ? tokenGloss : `${tokenGloss} de`;
      return {
        ...entry,
        tokenGloss: normalizedGloss,
        semanticRole: 'construct-head',
        constructTargetIndex: tail.index,
        constructViaArticle: tail.viaArticle
      };
    });
  }

  function buildAdminVersePlan(verseNode, oshbVerseNode){
    const tokens = getAdminVerseTokens(verseNode);
    const baseItems = tokens.map((token, posIndex) => buildSpanishLayerForToken(token, {
      oshbVerseNode,
      posIndex
    }));
    const items = applyConstructSemantics(baseItems);

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
