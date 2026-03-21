/* split: gr */
function normalizeGreek(text) {
    return String(text || '')
      .replace(/[··.,;:!?“”"(){}\[\]<>«»]/g, '')
      .replace(/\s/g, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
           .replace(/ς/g, 'σ')
      .toLowerCase();
  }
  function normalizeGreekKey(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ς/g, 'σ')
      .replace(/[··.,;:!?\'"“”‘’()\[\]{}]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  function transliterateGreek(text) {
    const map = {
      α: 'a', β: 'b', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'e', θ: 'th',
      ι: 'i', κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'x', ο: 'o', π: 'p',
      ρ: 'r', σ: 's', ς: 's', τ: 't', υ: 'u', φ: 'f', χ: 'ch', ψ: 'ps', ω: 'o'
    };
    const normalized = String(text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    return normalized.split('').map((char) => map[char] || char).join('');
  }
  function buildGreekSearchKeys(normalized) {
    if (!normalized) return [];
    const variants = new Set();
    const chars = normalized.split('');
    const swapMap = {
      β: 'υ',
      υ: 'β'
    };
    const walk = (index, current) => {
      if (index >= chars.length) {
        variants.add(current);
        return;
      }
      const ch = chars[index];
      const swap = swapMap[ch];
      walk(index + 1, `${current}${ch}`);
      if (swap) {
        walk(index + 1, `${current}${swap}`);
      }
    };
    walk(0, '');
    return [...variants];
  }
 function escapeHtml(text) {
    return String(text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
