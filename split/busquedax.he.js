/* split: he */
   function normalizeHebrew(text) {
     return String(text || '')
        .replace(/[\u200C-\u200F\u202A-\u202E]/g, '')
       .replace(/[\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C7]/g, '')
.replace(/[\s\u05BE\-\u2010-\u2015\u2212]/g, '')
       .replace(/[׃.,;:!?()"“”'׳״]/g, '');
   }
 
