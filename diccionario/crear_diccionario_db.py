import json
import os
import sqlite3
import unicodedata
from pathlib import Path

# =========================================================
# CONFIGURACIÓN
# =========================================================

BASE_DIR = Path(r"C:\Users\pik_y\Documents\GitHub\Local-consults\estudio\angelos\diccionario")
INPUT_JSON = BASE_DIR / "diccionarioG_unificado.min.json"
OUTPUT_DB = BASE_DIR / "diccionarioG_compacto.db"

# =========================================================
# UTILIDADES
# =========================================================

def normalize_text(text: str) -> str:
    """
    Normaliza texto para búsquedas:
    - minúsculas
    - quita acentos/diacríticos
    - recorta espacios
    """
    if not text:
        return ""
    text = text.strip().lower()
    text = unicodedata.normalize("NFD", text)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    return unicodedata.normalize("NFC", text)

def ensure_input_exists(path: Path):
    if not path.exists():
        raise FileNotFoundError(f"No se encontró el archivo JSON: {path}")

def load_json_pairs(path: Path):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, list):
        raise ValueError("El JSON debe ser una lista de pares [griego, español].")

    cleaned = []
    for i, item in enumerate(data):
        if (
            isinstance(item, list)
            and len(item) == 2
            and isinstance(item[0], str)
            and isinstance(item[1], str)
        ):
            greek = item[0].strip()
            spanish = item[1].strip()
            if greek and spanish:
                cleaned.append((greek, spanish))
        else:
            print(f"Aviso: registro inválido en posición {i}: {item}")

    return cleaned

# =========================================================
# CREACIÓN DE BD
# =========================================================

def create_database(db_path: Path):
    if db_path.exists():
        db_path.unlink()

    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()

    # PRAGMAs útiles para construir rápido y compacto
    cur.execute("PRAGMA journal_mode = OFF;")
    cur.execute("PRAGMA synchronous = OFF;")
    cur.execute("PRAGMA temp_store = MEMORY;")
    cur.execute("PRAGMA cache_size = -200000;")  # aprox 200 MB de caché
    cur.execute("PRAGMA foreign_keys = ON;")

    # =====================================================
    # TABLA PRINCIPAL: entradas secuenciales
    # Mantiene el orden original del archivo JSON
    # =====================================================
    cur.execute("""
        CREATE TABLE entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            seq INTEGER NOT NULL,
            greek TEXT NOT NULL,
            greek_norm TEXT NOT NULL,
            spanish TEXT NOT NULL,
            spanish_norm TEXT NOT NULL
        );
    """)

    # =====================================================
    # TABLA SECUNDARIA: términos únicos
    # Una fila por término griego único, con conteo
    # =====================================================
    cur.execute("""
        CREATE TABLE greek_terms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            greek TEXT NOT NULL UNIQUE,
            greek_norm TEXT NOT NULL,
            occurrences INTEGER NOT NULL DEFAULT 0
        );
    """)

    # =====================================================
    # TABLA RELACIONAL: una palabra única -> muchas entradas
    # =====================================================
    cur.execute("""
        CREATE TABLE greek_term_entries (
            greek_term_id INTEGER NOT NULL,
            entry_id INTEGER NOT NULL,
            PRIMARY KEY (greek_term_id, entry_id),
            FOREIGN KEY (greek_term_id) REFERENCES greek_terms(id) ON DELETE CASCADE,
            FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
        );
    """)

    # =====================================================
    # METADATOS
    # =====================================================
    cur.execute("""
        CREATE TABLE metadata (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
    """)

    # Índices
    cur.execute("CREATE INDEX idx_entries_seq ON entries(seq);")
    cur.execute("CREATE INDEX idx_entries_greek ON entries(greek);")
    cur.execute("CREATE INDEX idx_entries_greek_norm ON entries(greek_norm);")
    cur.execute("CREATE INDEX idx_entries_spanish_norm ON entries(spanish_norm);")
    cur.execute("CREATE INDEX idx_greek_terms_greek_norm ON greek_terms(greek_norm);")

    conn.commit()
    return conn

# =========================================================
# INSERCIÓN
# =========================================================

def populate_database(conn: sqlite3.Connection, pairs):
    cur = conn.cursor()

    entry_rows = []
    for seq, (greek, spanish) in enumerate(pairs, start=1):
        entry_rows.append((
            seq,
            greek,
            normalize_text(greek),
            spanish,
            normalize_text(spanish)
        ))

    cur.executemany("""
        INSERT INTO entries (seq, greek, greek_norm, spanish, spanish_norm)
        VALUES (?, ?, ?, ?, ?)
    """, entry_rows)
    conn.commit()

    # Crear tabla de términos únicos
    cur.execute("""
        INSERT INTO greek_terms (greek, greek_norm, occurrences)
        SELECT greek, greek_norm, COUNT(*)
        FROM entries
        GROUP BY greek, greek_norm
        ORDER BY greek_norm, greek;
    """)
    conn.commit()

    # Relacionar términos únicos con entradas
    cur.execute("""
        INSERT INTO greek_term_entries (greek_term_id, entry_id)
        SELECT gt.id, e.id
        FROM entries e
        JOIN greek_terms gt
          ON gt.greek = e.greek
    """)
    conn.commit()

    # Metadatos
    total_entries = cur.execute("SELECT COUNT(*) FROM entries").fetchone()[0]
    total_unique_greek = cur.execute("SELECT COUNT(*) FROM greek_terms").fetchone()[0]

    metadata = [
        ("name", "Diccionario griego-español compacto"),
        ("source_file", "diccionarioG_unificado.min.json"),
        ("language_from", "griego"),
        ("language_to", "español"),
        ("total_entries", str(total_entries)),
        ("total_unique_greek", str(total_unique_greek)),
        ("format", "json_pairs_to_sqlite"),
    ]

    cur.executemany("""
        INSERT INTO metadata (key, value)
        VALUES (?, ?)
    """, metadata)
    conn.commit()

# =========================================================
# OPTIMIZACIÓN FINAL
# =========================================================

def optimize_database(conn: sqlite3.Connection):
    cur = conn.cursor()

    # Analiza índices y compacta
    cur.execute("ANALYZE;")
    conn.commit()

    cur.execute("VACUUM;")
    conn.commit()

# =========================================================
# MAIN
# =========================================================

def main():
    ensure_input_exists(INPUT_JSON)

    print(f"Leyendo: {INPUT_JSON}")
    pairs = load_json_pairs(INPUT_JSON)
    print(f"Registros válidos: {len(pairs):,}")

    print(f"Creando base: {OUTPUT_DB}")
    conn = create_database(OUTPUT_DB)

    try:
        populate_database(conn, pairs)
        optimize_database(conn)
    finally:
        conn.close()

    print("Proceso completado.")
    print(f"Base generada en: {OUTPUT_DB}")
    print(f"Tamaño final: {OUTPUT_DB.stat().st_size / 1024 / 1024:.2f} MB")

if __name__ == "__main__":
    main()