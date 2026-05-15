Prueba CATSS / CCAT — texto paralelo hebreo // griego
=====================================================

1) Descarga local del .par (no incluido en git por tamano y licencia):
   https://ccat.sas.upenn.edu/gopher/text/religion/biblical/parallel/01.Genesis.par

   curl -sL "https://ccat.sas.upenn.edu/gopher/text/religion/biblical/parallel/01.Genesis.par" -o catss-sample/01.Genesis.par

2) Documentacion del proyecto:
   https://ccat.sas.upenn.edu/rak/catss.html

3) Parser de prueba:
   node scripts/parse-catss-par.js catss-sample/01.Genesis.par --maxVerses 5 --out catss-sample/parsed-genesis-1-5.json

El .par usa transliteracion CCAT en la columna hebrea y griego en estilo TLG (beta code / acentos ASCII).

Antes de publicar o redistribuir datos derivados, revisa las condiciones de uso en los sitios CCAT / Oxford Text Archive segun corresponda.
