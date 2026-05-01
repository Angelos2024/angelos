# Chávez Strong Compact

Estructura pensada para UI rápida:

1. Cargar una sola vez el índice `*.index.min.json`.
2. Resolver la palabra clicada por `strong`, lema normalizado o transliteración.
3. Leer `entry[4]` para saber qué shard contiene la definición completa.
4. Cargar solo ese shard cuando haga falta mostrar detalle HTML.

## Índice

Archivos:

- `strongs-greek-chavez.index.min.json`
- `strongs-hebrew-chavez.index.min.json`

Forma:

```json
{
  "m": {
    "name": "Multiléxico Strong-Chávez-Tuggy-Vine-Swanson",
    "language": "griego",
    "code": "gr",
    "is_strong": true,
    "source": "Multi.dictionary.SQLite3",
    "generated_at": "2026-05-01T00:00:00+00:00",
    "entry_count": 5524,
    "alias_count": 11048,
    "lookup": ["strong", "lexeme_normalized", "transliteration_normalized"],
    "shard_size": 500,
    "detail_path_template": "strongs-greek-chavez.shards/{shard}.min.json"
  },
  "f": ["lexeme", "transliteration", "pronunciation", "short_definition", "shard"],
  "e": {
    "G2": ["Ἀαρών", "Aarṓn", "ah-ar-ohn'", "Aarón, hermano de Moisés...", "g0001"]
  },
  "a": {
    "g2": "G2",
    "ἀαρων": "G2",
    "aaron": "G2"
  },
  "c": {
    "G2": ["G2"]
  }
}
```

## Shards

Directorios:

- `strongs-greek-chavez.shards/`
- `strongs-hebrew-chavez.shards/`

Forma:

```json
{
  "m": {
    "code": "gr",
    "shard": "g0001",
    "entry_count": 500
  },
  "e": {
    "G2": "Ἀαρών<p/>Aarón</b><p/>de origen hebreo..."
  }
}
```

## Notas

- `short_definition` se genera automáticamente porque la columna original viene vacía.
- `definition_html` queda preservada completa dentro del shard.
- `topic` ya no se repite dentro del registro porque la clave del objeto es el Strong.
- `c` devuelve cognados por Strong para acceso directo desde el popup.
