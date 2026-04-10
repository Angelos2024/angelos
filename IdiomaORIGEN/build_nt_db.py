#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json, sqlite3, pathlib, sys

# ← Cambia aquí la ruta del JSON y la de la BD que se generará
SRC  = pathlib.Path(r"C:\Users\pik_y\Documents\GitHub\Local-consults\estudio\angelos\IdiomaORIGEN\Bgriega.json")
DEST = pathlib.Path(r"C:\Users\pik_y\Documents\GitHub\Local-consults\estudio\angelos\IdiomaORIGEN\nt_greek_compact.db")

# Códigos de libro (Textus Receptus - OpenGNT)
CANON = [
    40, 41, 42, 43,          # Mateo-Juan
    44,                      # Hechos
    45, 46, 47, 48, 49, 50, 51,            # Romanos-Efesios
    52, 53, 54, 55, 56, 57, 58,            # Filipenses-Hebreos
    59, 60, 61, 62, 63, 64,                # Santiago-Judas
    65, 66                                 # Apocalipsis
]

def init_schema(cx: sqlite3.Connection) -> None:
    cx.executescript("""
    PRAGMA foreign_keys = ON;
    DROP TABLE IF EXISTS verses;
    DROP TABLE IF EXISTS books;
    CREATE TABLE books(
        id    INTEGER PRIMARY KEY,
        code  INTEGER UNIQUE,
        name  TEXT
    );
    CREATE TABLE verses(
        id      INTEGER PRIMARY KEY,
        book_id INTEGER REFERENCES books(id),
        chapter INTEGER,
        verse   INTEGER,
        text    TEXT,
        UNIQUE(book_id, chapter, verse)
    );
    """)

def main() -> None:
    if not SRC.exists():
        sys.exit(f"No se encontró el archivo: {SRC}")

    data = json.loads(SRC.read_text(encoding="utf-8"))["verses"]

    with sqlite3.connect(DEST) as cx:
        init_schema(cx)

        # Insertar libros en el orden canónico
        book_id_map = {}
        for code in CANON:
            first = next(v for v in data if v["book"] == code)
            cur = cx.execute(
                "INSERT INTO books(code,name) VALUES(?,?)",
                (code, first["book_name"])
            )
            book_id_map[code] = cur.lastrowid

        # Insertar todos los versículos
        rows = [
            (book_id_map[v["book"]], v["chapter"], v["verse"], v["text"])
            for v in data
        ]
        cx.executemany(
            "INSERT INTO verses(book_id,chapter,verse,text) VALUES(?,?,?,?)",
            rows
        )
        cx.commit()

    print(f"✓ Base creada: {DEST}")

if __name__ == "__main__":
    main()