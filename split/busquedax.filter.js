/* split: filter */
;(() => {
  'use strict';

  // ---------------------------------
  //  Resaltado (mark) multi-idioma
  // ---------------------------------
  function getNormalizedQuery(lang, query) {
      if (lang === 'gr') return normalizeGreek(query);
      if (lang === 'he') return normalizeHebrew(query);
      return normalizeSpanish(query);
    }

  function buildTokenRegex(token, lang) {
      const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (lang === 'es') {
        const accentMap = {
          a: '[aáàâäãå]',
          e: '[eéèêë]',
          i: '[iíìîï]',
          o: '[oóòôöõ]',
          u: '[uúùûü]',
          n: '[nñ]'
        };
        const pattern = escaped.split('').map((ch) => accentMap[ch] || ch).join('');
        return new RegExp(pattern, 'giu');
      }

      const letters = [];
      for (const ch of escaped) {
        if (ch === '\\') continue;
         if (lang === 'gr' && ch === 'σ') {
          letters.push('[σς]');
        } else {
          letters.push(ch);
        }
      }
      const pattern = letters.map((letter) => `${letter}\\p{M}*`).join('');
      return new RegExp(pattern, 'giu');
    }

  function buildPhraseRegex(tokens, lang) {
      const parts = (tokens || []).map((token) => String(token || '').trim()).filter(Boolean);
      if (!parts.length) return null;
      const joiner = lang === 'he' ? '(?:\\s+|\\u05BE|-)+': '(?:\\s+)+';
      
      const tokenPatterns = parts.map((token) => {
        const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const letters = [];
        for (const ch of escaped) {
          if (ch === '\\') continue;
          if (lang === 'gr' && ch === 'σ') {
                      letters.push('[σς]');
          } else {
            letters.push(ch);
          }
        }
        return letters.map((letter) => `${letter}\\p{M}*`).join('');
      });

      const core = tokenPatterns.join(joiner);
      return new RegExp(`(^|[^\\p{L}\\p{M}])(${core})(?![\\p{L}\\p{M}])`, 'giu');
    }

  function highlightText(text, query, lang) {
      const raw = String(text ?? '');
      const normalizedQuery = String(query ?? '').trim();
      if (!raw || !normalizedQuery) return escapeHtml(raw);

      const safe = escapeHtml(raw);
       const highlightSource = (lang === 'gr' || lang === 'he')
               ? safe.normalize('NFD')
        : safe;    
        // Hebrew: when searching a phrase (or multiple phrase variants separated by "||"),
  // highlight ONLY the full phrase, not each token separately.
  if (lang === 'he') {
    const variants = String(normalizedQuery || '')
      .split('||')
      .map((part) => part.trim())
      .filter(Boolean);

    const phraseRegexes = [];
    for (const variant of variants) {
      const phrase = normalizePhraseByLang(variant, 'he');
      const phraseTokens = phrase.split(/\s+/).filter(Boolean);
      if (phraseTokens.length < 2) continue;
      const re = buildPhraseRegex(phraseTokens, 'he');
      if (re) phraseRegexes.push(re);
    }

    if (phraseRegexes.length) {
      let output = highlightSource;
      for (const re of phraseRegexes) {
        output = output.replace(
          re,
          (match, lead, coreText) => `${lead}<mark class="phrase">${coreText}</mark>`
        );
      }
      return output;
    }
    // Sin frases múltiples en hebreo: caer al resaltado por token general
  }


      const normalizedQueryClean = normalizedQuery.replace(/\|\|/g, ' ');
      const cleanedQuery = (lang === 'gr')
              ? normalizedQueryClean.replace(/[⸀··.,;:!?“”"(){}\[\]<>«»]/g, ' ')
        : normalizedQueryClean;
      const tokens = cleanedQuery
        .split(/\s+/)
        .map((part) => getNormalizedQuery(lang, part))
        .map((token) => token.trim())
        .filter((token) => token.length >= 2);
      if (!tokens.length) return safe;

      let output = highlightSource;
     for (const token of tokens) {
        const re = buildTokenRegex(token, lang);
        output = output.replace(re, (match) => `<mark>${match}</mark>`);
      }
      return output;
    }

  // ---------------------------------
  //  Detección / Scope
  // ---------------------------------
  function detectLang(text) {
      const sample = String(text || '');
      if (/[\u0590-\u05FF]/.test(sample)) return 'he';
      if (/[\u0370-\u03FF\u1F00-\u1FFF]/.test(sample)) return 'gr';
      return 'es';
    }

  function getLanguageScope(term = '') {
        // El idioma se detecta siempre por el texto ingresado.
    return detectLang(term);
  }

  function getCorporaForScope(scope) {
      if (scope === 'es') return ['es'];
      if (scope === 'gr') return ['gr'];
      if (scope === 'he') return ['he'];
      return ['es'];
               }

  function normalizeByLang(text, lang) {
      if (lang === 'gr') return normalizeGreek(text);
      if (lang === 'he') return normalizeHebrew(text);
      return normalizeSpanish(text);
    }

  function pickPreferredHebrewAlias(candidates = []) {
      if (!Array.isArray(candidates) || !candidates.length) return null;
      return candidates.find((item) => item === 'יהוה')
        || candidates.find((item) => item === 'אלהים')
        || candidates.find((item) => item === 'אלוהים')
        || candidates.find((item) => item === 'אדני')
        || candidates.find((item) => item === 'אל')
        || candidates.find((item) => item === 'אלה')
        || candidates.find((item) => item === 'יהושע')
        || candidates.find((item) => item === 'ישוע')
        || candidates.slice().sort((a, b) => b.length - a.length)[0];
    }

  // ---------------------------------
  //  Alias candidates (fallback liviano)
  // ---------------------------------
  function getAliasCandidates(term, langHint = detectLang(term)) {
      const esTokens = String(term || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .split(/\s+/)
        .filter(Boolean);
      const sourceTokens = langHint === 'he'
        ? esTokens.map((token) => normalizeHebrew(token))
        : (langHint === 'gr' ? esTokens.map((token) => normalizeGreek(token)) : esTokens);

      const gr = new Set();
      const he = new Set();
      const es = new Set();
      const relatedLabels = { es: new Set(), he: new Set() };

      SEARCH_EQUIVALENCE_GROUPS.forEach((group) => {
        const normalizedGroup = {
          es: new Set((group.es || []).map((value) => normalizeSpanish(value)).filter(Boolean)),
          gr: new Set((group.gr || []).map((value) => normalizeGreek(value)).filter(Boolean)),
          he: new Set((group.he || []).map((value) => normalizeHebrew(value)).filter(Boolean))
        };
        const matched = sourceTokens.some((token) => normalizedGroup[langHint]?.has(token));
        if (!matched) return;

        normalizedGroup.gr.forEach((value) => gr.add(value));
        normalizedGroup.he.forEach((value) => he.add(value));
        normalizedGroup.es.forEach((value) => es.add(value));
        (group.relatedLabels?.es || []).forEach((value) => relatedLabels.es.add(value));
        (group.relatedLabels?.he || []).forEach((value) => relatedLabels.he.add(value));
      });

      return {
        gr: [...gr],
        he: [...he],
        es: [...es],
        relatedLabels: {
          es: [...relatedLabels.es],
          he: [...relatedLabels.he]
        }
      };
    }

  // ---------------------------------------
  //  Equivalencias trilingües (JSON externo)
  //  Estructura soportada:
  //   1) { "dios": { "gr":[...], "he":[...], "s":[...] }, ... }
  //   2) { "by_es": {...}, "by_gr": {...}, "by_he": {...} }  (legacy)
  // ---------------------------------------
  const TRI = {
    loaded: false,
    loading: null,
    byEs: new Map(), // es -> {he:Set, gr:Set}
    byHe: new Map(), // he -> Set(es)
    byGr: new Map()  // gr -> Set(es)
  };

  function _normEs(s) {
    try { if (typeof normalizeSpanishPhrase === 'function') return normalizeSpanishPhrase(s); } catch (_) {}
    return String(s || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
  function _normHe(s) {
    try { if (typeof normalizeHebrew === 'function') return normalizeHebrew(s); } catch (_) {}
    return String(s || '').trim().replace(/[\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C7]/g, '');
  }
  function _normGr(s) {
    try { if (typeof normalizeGreek === 'function') return normalizeGreek(s); } catch (_) {}
    return String(s || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ς/g, 'σ');
  }

  function _addEquivalence(esTerm, heTerm, grTerm) {
    const esN = _normEs(esTerm);
    const heN = _normHe(heTerm);
    const grN = _normGr(grTerm);

    if (esN) {
      if (!TRI.byEs.has(esN)) TRI.byEs.set(esN, { he: new Set(), gr: new Set() });
      const entry = TRI.byEs.get(esN);
      if (heN) entry.he.add(heN);
      if (grN) entry.gr.add(grN);
    }
    if (heN && esN) {
      if (!TRI.byHe.has(heN)) TRI.byHe.set(heN, new Set());
      TRI.byHe.get(heN).add(esN);
    }
    if (grN && esN) {
      if (!TRI.byGr.has(grN)) TRI.byGr.set(grN, new Set());
      TRI.byGr.get(grN).add(esN);
    }
  }

  // Heurística para arrays: detecta si el orden es [es,he,gr] o [he,es,gr], etc.
  function _classifyToken(x) {
    const s = String(x || '');
    if (/[\u0590-\u05FF\uFB1D-\uFB4F]/.test(s)) return 'he';
    if (/[\u0370-\u03FF\u1F00-\u1FFF]/.test(s)) return 'gr';
    return 'es';
  }

  async function loadTrilingualEquivalences(options = {}) {
    if (TRI.loaded) return TRI;
    if (TRI.loading) return TRI.loading;

    TRI.loading = (async () => {
      const data = await loadJson(TRILINGUAL_EQUIV_URL, options);

      // 2) Legacy format (by_es/by_gr/by_he)
      if (data && typeof data === 'object' && (data.by_es || data.by_gr || data.by_he)) {
        const byEs = data.by_es || {};
        Object.entries(byEs).forEach(([esTerm, payload]) => {
          const heList = Array.isArray(payload?.he) ? payload.he : (payload?.he ? [payload.he] : []);
          const grList = Array.isArray(payload?.gr) ? payload.gr : (payload?.gr ? [payload.gr] : []);
          if (!heList.length && !grList.length) return;
          if (!heList.length) grList.forEach((gr) => _addEquivalence(esTerm, '', gr));
          else if (!grList.length) heList.forEach((he) => _addEquivalence(esTerm, he, ''));
          else heList.forEach((he) => grList.forEach((gr) => _addEquivalence(esTerm, he, gr)));
        });

        // by_gr / by_he son puentes a ES
        const byGr = data.by_gr || {};
        Object.entries(byGr).forEach(([grTerm, esList]) => {
          const grN = _normGr(grTerm);
          if (!grN) return;
          (esList || []).forEach((esTerm) => _addEquivalence(esTerm, '', grTerm));
        });
        const byHe = data.by_he || {};
        Object.entries(byHe).forEach(([heTerm, esList]) => {
          const heN = _normHe(heTerm);
          if (!heN) return;
          (esList || []).forEach((esTerm) => _addEquivalence(esTerm, heTerm, ''));
        });

        TRI.loaded = true;
        return TRI;
      }

      // 1) Object mapping ES -> {he/gr}
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        for (const [esTerm, v] of Object.entries(data)) {
          if (!v) continue;
          const heList = Array.isArray(v.he) ? v.he : (v.he ? [v.he] : (Array.isArray(v.hebreo) ? v.hebreo : (v.hebreo ? [v.hebreo] : [])));
          const grList = Array.isArray(v.gr) ? v.gr : (v.gr ? [v.gr] : (Array.isArray(v.griego) ? v.griego : (v.griego ? [v.griego] : [])));
          if (!heList.length && !grList.length) continue;
          if (!heList.length) for (const grTerm of grList) _addEquivalence(esTerm, '', grTerm);
          else if (!grList.length) for (const heTerm of heList) _addEquivalence(esTerm, heTerm, '');
          else for (const heTerm of heList) for (const grTerm of grList) _addEquivalence(esTerm, heTerm, grTerm);
        }
        TRI.loaded = true;
        return TRI;
      }

      // 3) Array format (best-effort)
      if (Array.isArray(data)) {
        for (const row of data) {
          if (!row) continue;
          // row could be [es, he, gr] or permutations, or an object
          if (Array.isArray(row)) {
            const parts = row.flat().filter(Boolean);
            const esList = [];
            const heList = [];
            const grList = [];
            for (const p of parts) {
              const kind = _classifyToken(p);
              if (kind === 'es') esList.push(p);
              else if (kind === 'he') heList.push(p);
              else grList.push(p);
            }
            if (!esList.length) continue;
            if (!heList.length && !grList.length) continue;
            for (const esTerm of esList) {
              if (!heList.length) for (const grTerm of grList) _addEquivalence(esTerm, '', grTerm);
              else if (!grList.length) for (const heTerm of heList) _addEquivalence(esTerm, heTerm, '');
              else for (const heTerm of heList) for (const grTerm of grList) _addEquivalence(esTerm, heTerm, grTerm);
            }
          } else if (typeof row === 'object') {
            const esTerm = row.es || row.s || row.spanish || row.palabra || row.word;
            const heList = Array.isArray(row.he) ? row.he : (row.he ? [row.he] : []);
            const grList = Array.isArray(row.gr) ? row.gr : (row.gr ? [row.gr] : []);
            if (!esTerm) continue;
            if (!heList.length && !grList.length) continue;
            if (!heList.length) for (const grTerm of grList) _addEquivalence(esTerm, '', grTerm);
            else if (!grList.length) for (const heTerm of heList) _addEquivalence(esTerm, heTerm, '');
            else for (const heTerm of heList) for (const grTerm of grList) _addEquivalence(esTerm, heTerm, grTerm);
          }
        }
        TRI.loaded = true;
        return TRI;
      }

      TRI.loaded = true;
      return TRI;
    })();

    return TRI.loading;
  }

  function getEquivalenceSearchTerms(term, lang) {
    const out = { es: [], he: [], gr: [] };
    const t = String(term || '').trim();
    if (!t || !TRI.loaded) return out;

    if (lang === 'es') {
      const key = _normEs(t);
      const entry = TRI.byEs.get(key);
      if (entry) {
        out.he = Array.from(entry.he);
        out.gr = Array.from(entry.gr);
      }
      return out;
    }

    if (lang === 'he') {
      const key = _normHe(t);
      const esSet = TRI.byHe.get(key);
      if (!esSet) return out;

      const esOut = new Set();
      const heOut = new Set([key]);
      const grOut = new Set();

      for (const esWord of esSet) {
        esOut.add(esWord);
        const entry = TRI.byEs.get(esWord);
        if (!entry) continue;
        entry.he.forEach((h) => heOut.add(h));
        entry.gr.forEach((g) => grOut.add(g));
      }

      out.es = Array.from(esOut);
      out.he = Array.from(heOut);
      out.gr = Array.from(grOut);
      return out;
    }

    if (lang === 'gr') {
          const key = _normGr(t);
      const esSet = TRI.byGr.get(key);
      if (!esSet) return out;

      const esOut = new Set();
      const heOut = new Set();
      const grOut = new Set([key]);

      for (const esWord of esSet) {
        esOut.add(esWord);
        const entry = TRI.byEs.get(esWord);
        if (!entry) continue;
        entry.he.forEach((h) => heOut.add(h));
        entry.gr.forEach((g) => grOut.add(g));
      }

      out.es = Array.from(esOut);
      out.he = Array.from(heOut);
      out.gr = Array.from(grOut);
      return out;
    }

    return out;
  }

  // Exponer al ámbito global (para main.js)
  window.highlightText = highlightText;
  window.detectLang = detectLang;
  window.getLanguageScope = getLanguageScope;
  window.getCorporaForScope = getCorporaForScope;
  window.normalizeByLang = normalizeByLang;
  window.pickPreferredHebrewAlias = pickPreferredHebrewAlias;
  window.getAliasCandidates = getAliasCandidates;
  window.loadTrilingualEquivalences = loadTrilingualEquivalences;
  window.getEquivalenceSearchTerms = getEquivalenceSearchTerms;
  window.__BX_TRILINGUAL = TRI;
})();