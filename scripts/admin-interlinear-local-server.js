/**
 * Servidor local solo para admin interlineal: sirve el repo y permite
 * escribir JSON de capítulo directamente en IdiomaORIGEN/interlinear-snapshot/chapters.
 *
 * Uso (desde la raíz del repo): node scripts/admin-interlinear-local-server.js
 * Puerto: variable de entorno ADMIN_INTERLINEAL_PORT (por defecto 8787).
 *
 * Tras muchos cambios globales por Strong, regenera el índice:
 *   node scripts/build-interlinear-snapshot-index.js
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = Number(process.env.ADMIN_INTERLINEAL_PORT || 8787);
const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_CHAPTERS = path.join(ROOT, 'IdiomaORIGEN', 'interlinear-snapshot', 'chapters');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8'
};

function isPathInsideRoot(resolvedFilePath){
  const rel = path.relative(ROOT, resolvedFilePath);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function safeSlug(value){
  return typeof value === 'string' && /^[a-z0-9_]+$/.test(value);
}

function sendJson(res, status, obj){
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function readBody(req, maxBytes){
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if(total > maxBytes){
        reject(new Error('Body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function handleSaveChapter(req, res){
  let raw;
  try {
    raw = await readBody(req, 24 * 1024 * 1024);
  }catch(e){
    sendJson(res, 413, { ok: false, error: String(e.message || e) });
    return;
  }

  let data;
  try {
    data = JSON.parse(raw.toString('utf8'));
  }catch(_e){
    sendJson(res, 400, { ok: false, error: 'JSON invalido' });
    return;
  }

  const slug = data.slug;
  const chapter = Number(data.chapter);
  const document = data.document;

  if(!safeSlug(slug) || !Number.isInteger(chapter) || chapter < 1){
    sendJson(res, 400, { ok: false, error: 'slug o capitulo invalido' });
    return;
  }
  if(!document || typeof document !== 'object'){
    sendJson(res, 400, { ok: false, error: 'document requerido' });
    return;
  }
  if(document.schema !== 'interlinear-snapshot-chapter-v1'){
    sendJson(res, 400, { ok: false, error: 'schema debe ser interlinear-snapshot-chapter-v1' });
    return;
  }

  const dir = path.join(SNAPSHOT_CHAPTERS, slug);
  const target = path.join(dir, `${chapter}.json`);
  const resolvedDir = path.resolve(dir);
  const resolvedTarget = path.resolve(target);

  if(!resolvedDir.startsWith(path.resolve(SNAPSHOT_CHAPTERS)) || !resolvedTarget.startsWith(path.resolve(SNAPSHOT_CHAPTERS))){
    sendJson(res, 400, { ok: false, error: 'Ruta no permitida' });
    return;
  }

  try {
    await fs.promises.mkdir(dir, { recursive: true });
    const text = JSON.stringify(document, null, 2);
    await fs.promises.writeFile(target, text, 'utf8');
  }catch(e){
    sendJson(res, 500, { ok: false, error: String(e.message || e) });
    return;
  }

  sendJson(res, 200, {
    ok: true,
    relativePath: path.relative(ROOT, target).replace(/\\/g, '/')
  });
}

function serveStatic(req, res, url){
  let pathname = decodeURIComponent(url.pathname);
  if(pathname === '/') pathname = '/index.html';

  const filePath = path.join(ROOT, pathname);
  const resolved = path.resolve(filePath);

  if(!isPathInsideRoot(resolved)){
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(resolved, (err, st) => {
    if(err || !st.isFile()){
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(resolved).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(resolved).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const host = req.headers.host || `127.0.0.1:${PORT}`;
  let url;
  try {
    url = new URL(req.url || '/', `http://${host}`);
  }catch(_e){
    res.writeHead(400);
    res.end('Bad URL');
    return;
  }

  if(req.method === 'POST' && url.pathname === '/api/save-interlinear-chapter'){
    await handleSaveChapter(req, res);
    return;
  }

  if(req.method === 'GET' && url.pathname === '/api/interlinear-local-status'){
    sendJson(res, 200, { ok: true, directSave: true, snapshotRoot: path.relative(ROOT, SNAPSHOT_CHAPTERS).replace(/\\/g, '/') });
    return;
  }

  if(req.method === 'GET' || req.method === 'HEAD'){
    serveStatic(req, res, url);
    return;
  }

  res.writeHead(405);
  res.end('Method not allowed');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log(`  Admin interlineal (guardado directo en disco)`);
  console.log(`  http://127.0.0.1:${PORT}/admin-interlinear.html`);
  console.log('');
  console.log('  Cierra esta ventana con Ctrl+C para detener el servidor.');
  console.log('');
});
