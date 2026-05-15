Prueba CATSS / CCAT — texto paralelo hebreo // griego
=====================================================

Criterios del proyecto (angelos):

- Solo libros donde ya tenemos **interlineal hebreo** local; el LXX se toma de la edición Rahlfs que usa el admin (`LXX/chapters/...`), **sin añadir apócrifos** como fuente de pistas MT⇄LXX.
- Josué y Jueces: paralelo CATSS **`JoshB`** y **`JudgesB`** (“edición B”), alineado con `admin-lxx-layer.js` (`JoshB`, `JudgB`).

1) Descarga local del .par (no incluido en git por tamaño y licencia):

   Génesis:
   curl -sL "https://ccat.sas.upenn.edu/gopher/text/religion/biblical/parallel/01.Genesis.par" -o catss-sample/01.Genesis.par

   Éxodo y Levítico (dos en dos):
   mkdir -p catss-par
   curl -sL "https://ccat.sas.upenn.edu/gopher/text/religion/biblical/parallel/02.Exodus.par" -o catss-par/02.Exodus.par
   curl -sL "https://ccat.sas.upenn.edu/gopher/text/religion/biblical/parallel/03.Lev.par" -o catss-par/03.Lev.par
   curl -sL "https://ccat.sas.upenn.edu/gopher/text/religion/biblical/parallel/04.Num.par" -o catss-par/04.Num.par
   curl -sL "https://ccat.sas.upenn.edu/gopher/text/religion/biblical/parallel/05.Deut.par" -o catss-par/05.Deut.par
   curl -sL "https://ccat.sas.upenn.edu/gopher/text/religion/biblical/parallel/06.JoshB.par" -o catss-par/06.JoshB.par
   curl -sL "https://ccat.sas.upenn.edu/gopher/text/religion/biblical/parallel/08.JudgesB.par" -o catss-par/08.JudgesB.par

2) Documentación del proyecto:
   https://ccat.sas.upenn.edu/rak/catss.html

3) Parser de prueba (prefijo corto):
   node scripts/parse-catss-par.js catss-sample/01.Genesis.par --maxVerses 5 --out catss-sample/parsed-genesis-1-5.json

4) Libro completo → JSON grande (omitido del git como `*.full.json`):
   node scripts/parse-catss-par.js catss-par/02.Exodus.par --out catss-parsed/exodus.full.json
   node scripts/parse-catss-par.js catss-par/03.Lev.par --out catss-parsed/leviticus.full.json
   node scripts/parse-catss-par.js catss-par/04.Num.par --out catss-parsed/numeros.full.json
   node scripts/parse-catss-par.js catss-par/05.Deut.par --out catss-parsed/deuteronomio.full.json
   node scripts/parse-catss-par.js catss-par/06.JoshB.par --out catss-parsed/josue-joshb.full.json
   node scripts/parse-catss-par.js catss-par/08.JudgesB.par --out catss-parsed/jueces-judgb.full.json

5) Generar todas las pistas `lxx-mt-word-hints` por capítulo (requiere pars parseados):
   node scripts/batch-catss-hints-book.js --parsed catss-parsed/exodus.full.json --slug exodo --lxxBook Exod --interlinearDir "IdiomaORIGEN/interlineal/chapters/02_Éxodo"
   node scripts/batch-catss-hints-book.js --parsed catss-parsed/leviticus.full.json --slug levitico --lxxBook Lev --interlinearDir "IdiomaORIGEN/interlineal/chapters/03_Levítico"
   node scripts/batch-catss-hints-book.js --parsed catss-parsed/numeros.full.json --slug numeros --lxxBook Num --interlinearDir "IdiomaORIGEN/interlineal/chapters/04_Números"
   node scripts/batch-catss-hints-book.js --parsed catss-parsed/deuteronomio.full.json --slug deuteronomio --lxxBook Deut --interlinearDir "IdiomaORIGEN/interlineal/chapters/05_Deuteronomio"
   node scripts/batch-catss-hints-book.js --parsed catss-parsed/josue-joshb.full.json --slug josue --lxxBook JoshB --interlinearDir "IdiomaORIGEN/interlineal/chapters/06_Josué"
   node scripts/batch-catss-hints-book.js --parsed catss-parsed/jueces-judgb.full.json --slug jueces --lxxBook JudgB --interlinearDir "IdiomaORIGEN/interlineal/chapters/07_Jueces"

Antes de publicar o redistribuir datos derivados, revisa las condiciones de uso en CCAT / Oxford Text Archive según corresponda.
