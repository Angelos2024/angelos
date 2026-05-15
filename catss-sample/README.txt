Prueba CATSS / CCAT — texto paralelo hebreo // griego
=====================================================

1) Descarga local del .par (no incluido en git por tamaño y licencia):

   Génesis:
   curl -sL "https://ccat.sas.upenn.edu/gopher/text/religion/biblical/parallel/01.Genesis.par" -o catss-sample/01.Genesis.par

   Éxodo y Levítico (dos en dos):
   mkdir -p catss-par
   curl -sL "https://ccat.sas.upenn.edu/gopher/text/religion/biblical/parallel/02.Exodus.par" -o catss-par/02.Exodus.par
   curl -sL "https://ccat.sas.upenn.edu/gopher/text/religion/biblical/parallel/03.Lev.par" -o catss-par/03.Lev.par

2) Documentación del proyecto:
   https://ccat.sas.upenn.edu/rak/catss.html

3) Parser de prueba (prefijo corto):
   node scripts/parse-catss-par.js catss-sample/01.Genesis.par --maxVerses 5 --out catss-sample/parsed-genesis-1-5.json

4) Libro completo → JSON grande (omitido del git como `*.full.json`):
   node scripts/parse-catss-par.js catss-par/02.Exodus.par --out catss-parsed/exodus.full.json
   node scripts/parse-catss-par.js catss-par/03.Lev.par --out catss-parsed/leviticus.full.json

5) Generar todas las pistas `lxx-mt-word-hints` por capítulo (requiere pars parseados):
   node scripts/batch-catss-hints-book.js --parsed catss-parsed/exodus.full.json --slug exodo --lxxBook Exod --interlinearDir "IdiomaORIGEN/interlineal/chapters/02_Éxodo"
   node scripts/batch-catss-hints-book.js --parsed catss-parsed/leviticus.full.json --slug levitico --lxxBook Lev --interlinearDir "IdiomaORIGEN/interlineal/chapters/03_Levítico"

Antes de publicar o redistribuir datos derivados, revisa las condiciones de uso en CCAT / Oxford Text Archive según corresponda.
