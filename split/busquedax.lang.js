/* split: lang */
;(() => {
  'use strict';

  function detectLang(text) {
    const sample = String(text || '');
    if (/[\u0590-\u05FF]/.test(sample)) return 'he';
    if (/[\u0370-\u03FF\u1F00-\u1FFF]/.test(sample)) return 'gr';
    return 'es';
  }

  function normalizeByLang(text, lang) {
    if (lang === 'gr') return normalizeGreek(text);
        if (lang === 'he') return normalizeHebrew(text);
    return normalizeSpanish(text);
  }

  function getLanguageScope(term = '') {
    return detectLang(term);
  }

  function getCorporaForScope(scope) {
    if (scope === 'es') return ['es'];
    if (scope === 'gr') return ['gr'];
    if (scope === 'he') return ['he'];
    return ['es'];
  }

  window.detectLang = window.detectLang || detectLang;
  window.normalizeByLang = window.normalizeByLang || normalizeByLang;
  window.getLanguageScope = window.getLanguageScope || getLanguageScope;
  window.getCorporaForScope = window.getCorporaForScope || getCorporaForScope;
})();
