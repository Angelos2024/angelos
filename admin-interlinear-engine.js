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
      isVerbal: /^VERBO(?:\.|$)/.test(upper),
      isPlural: /\.PL(?:$|\.)/.test(upper),
      isDual: /\.DU(?:$|\.)/.test(upper),
      isFeminine: /\.F(?:$|\.)/.test(upper),
      isInfinitive: /INFC|INFA|INFINIT|---C$/.test(upper),
      isImperative: /IMPV|IMPERAT/.test(upper),
      isVolitive: /COHORT|YUSIV|JUSS/.test(upper)
    };
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

  function normalizeSpanishPhrase(text){
    return String(text || '')
      .replace(/\s+/g, ' ')
      .replace(/\bde el\b/gi, 'del')
      .trim();
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
    if(['CK', 'CI', 'AYT', 'AM', 'INTJ', 'AQB', 'AJ', 'AGT', 'ANT'].includes(morph)){
      return true;
    }
    return [
      'si',
      'porque',
      'que',
      'antes',
      'antes que',
      'cuando',
      'entonces',
      'ahora',
      'he aqui',
      'pues'
    ].includes(gloss);
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
      const bridgeGloss = tail.viaArticle && tail.articleIndex >= 0
        ? resolveDependentArticle(dependentFeatures)
        : '';
      const phraseGloss = tail.viaArticle
        ? buildConstructPhrase(tokenGloss, `${bridgeGloss} ${dependentGloss}`.trim())
        : buildConstructPhrase(tokenGloss, dependentGloss);

      updated[index] = {
        ...entry,
        tokenGloss: tail.viaArticle ? tokenGloss : (/\bde$/i.test(tokenGloss) ? tokenGloss : `${tokenGloss} de`),
        phraseGloss,
        semanticRole: 'construct-head',
        constructTargetIndex: tail.index,
        constructViaArticle: tail.viaArticle
      };

      if(tail.viaArticle && tail.articleIndex >= 0 && updated[tail.articleIndex]){
        updated[tail.articleIndex] = {
          ...updated[tail.articleIndex],
          tokenGloss: resolveDependentArticle(dependentFeatures),
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

  function findSubjectBeforeVerb(items, verbIndex){
    for(let index = verbIndex - 1; index >= 0; index -= 1){
      const entry = items[index];
      const features = extractMorphFeatures(entry?.baseMorph || entry?.layer?.baseLabel || '');
      if(isDirectObjectMarker(entry) || isArticleOnlyToken(entry) || isPrepositionEntry(entry)){
        continue;
      }
      if(features.isNominal || features.isProper){
        const gloss = getEntryGloss(entry);
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
        const gloss = getEntryGloss(entry);
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
          gloss,
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
        const gloss = getEntryGloss(entry);
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

  function collectClauseOpeners(items, boundaryIndex, excludedIndex){
    const openers = [];
    const seen = new Set();
    for(let index = 0; index < boundaryIndex; index += 1){
      if(index === excludedIndex) continue;
      const entry = items[index];
      if(isConjunctionEntry(entry)) continue;
      if(!isClauseParticleEntry(entry)) continue;
      const gloss = getEntryGloss(entry);
      if(gloss && !seen.has(gloss)){
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

      if(isConjunctionEntry(entry)){
        const gloss = getEntryGloss(entry);
        pendingConjunction = gloss || 'y';
        continue;
      }

      if(features.isNominal || features.isProper){
        const gloss = getEntryGloss(entry);
        if(gloss){
          complements.push(pendingConjunction ? `${pendingConjunction} ${gloss}` : gloss);
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

  function findNominalPredicatePair(items){
    for(let index = 0; index < items.length - 1; index += 1){
      const left = items[index];
      const right = items[index + 1];
      const leftFeatures = extractMorphFeatures(left?.baseMorph || left?.layer?.baseLabel || '');
      const rightFeatures = extractMorphFeatures(right?.baseMorph || right?.layer?.baseLabel || '');
      if(leftFeatures.isVerbal || rightFeatures.isVerbal) continue;
      if(isConjunctionEntry(left) || isConjunctionEntry(right)) continue;
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
    const phraseGloss = normalizeSpanishPhrase(`${subjectGloss} es ${predicateGloss}`);
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

      const target = findPhraseTargetAfter(updated, index);
      if(!target) return;

      const targetEntry = updated[target.index];
      const targetFeatures = extractMorphFeatures(targetEntry?.baseMorph || targetEntry?.layer?.baseLabel || '');
      let targetGloss = getEntryGloss(targetEntry);
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
        targetGloss = `${resolveStandaloneArticle(targetFeatures)} ${targetGloss}`.trim();
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
      if(!features.isVerbal) return;

      const verbGloss = String(entry?.tokenGloss || '').trim();
      if(!verbGloss) return;

      const { subject, directObject } = determineVerbArguments(updated, index);
      const prepStartIndex = directObject?.index ?? index;
      const predicateComplements = !directObject && isCopularVerb(entry)
        ? collectPredicateComplementsAfterVerb(updated, index)
        : [];
      const complements = collectTrailingPrepositionPhrases(updated, prepStartIndex);
      const leadingConjunction = findLeadingClauseConjunction(updated, index, subject?.index ?? -1);
      const clauseOpeners = collectClauseOpeners(updated, subject?.index >= 0 ? subject.index : index, subject?.index ?? -1);
      const negations = collectPreVerbNegations(updated, index, subject?.index ?? -1);
      const speechFormula = collectSpeechFormulaAfterVerb(updated, index);

      const parts = [];
      if(leadingConjunction?.gloss) parts.push(leadingConjunction.gloss);
      if(clauseOpeners.length) parts.push(...clauseOpeners);
      if(subject?.gloss) parts.push(subject.gloss);
      if(negations.length) parts.push(...negations);
      parts.push(verbGloss);
      if(speechFormula) parts.push(speechFormula);
      if(directObject?.gloss) parts.push(directObject.gloss);
      if(predicateComplements.length) parts.push(...predicateComplements);
      if(complements.length) parts.push(...complements);

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

  function buildAdminVersePlan(verseNode, oshbVerseNode){
    const tokens = getAdminVerseTokens(verseNode);
    const baseItems = tokens.map((token, posIndex) => buildSpanishLayerForToken(token, {
      oshbVerseNode,
      posIndex
    }));
    const constructItems = applyConstructSemantics(baseItems);
    const phraseItems = applySyntacticPhraseSemantics(constructItems);
    const clauseItems = applyClauseSemantics(phraseItems);
    const items = applyNominalPredicateSemantics(clauseItems);

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
