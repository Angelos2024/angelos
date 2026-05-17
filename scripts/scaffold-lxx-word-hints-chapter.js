#!/usr/bin/env node
/**
 * Crea plantilla vacia para pistas MT⇄LXX por capitulo.
 * Uso: node scripts/scaffold-lxx-word-hints-chapter.js <slug> <capitulo>
 * Ejemplo: node scripts/scaffold-lxx-word-hints-chapter.js salmos 119
 */
const fs = require('fs');
const path = require('path');

const slug = process.argv[2];
const ch = process.argv[3];
if(!slug || ch == null || String(ch).trim() === ''){
  console.error('Uso: node scripts/scaffold-lxx-word-hints-chapter.js <slug> <capitulo>');
  process.exit(1);
}

const chapterNum = /^\d+$/.test(String(ch)) ? Number(ch) : ch;
const root = path.join(__dirname, '..', 'IdiomaORIGEN', 'lxx-mt-word-hints', 'chapters', slug);
const file = path.join(root, `${ch}.json`);

if(fs.existsSync(file)){
  console.error('Ya existe:', file);
  process.exit(1);
}

fs.mkdirSync(root, { recursive: true });

const payload = {
  _schema: 'lxx-mt-word-hints-chapter-v1',
  _doc: 'Pistas MT⇄LXX opcionales; formato legacy compatible con datos existentes en lxx-mt-word-hints/.',
  slug,
  chapter: chapterNum,
  verses: {}
};

fs.writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log('OK', file);
