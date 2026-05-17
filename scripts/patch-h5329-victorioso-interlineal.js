/**
 * One-off / repeatable: set Spanish gloss for Strong's H5329 (מְנַצֵּחַ) to "victorioso"
 * in IdiomaORIGEN/interlineal (all .json files; tokens + embedded raw markup).
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "IdiomaORIGEN", "interlineal");
const RAW_RX_E = /<s>H5329<\/s>\s*<m>[^<]*<\/m>\s*<E>[^<]*<e>/g;
const RAW_RX_Z = /<s>H5329<\/s>\s*<m>[^<]*<\/m>\s*<z>s\/t<\/z>/g;

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (ent.name.endsWith(".json")) processFile(p);
  }
}

function deep(obj, fn) {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    for (const x of obj) deep(x, fn);
    return;
  }
  fn(obj);
  for (const k of Object.keys(obj)) deep(obj[k], fn);
}

/** @returns {boolean} whether `es` was changed */
function applyVictoriosoEs(node) {
  const es = node.es;
  if (Array.isArray(es)) {
    let ch = false;
    for (let i = 0; i < es.length; i++) {
      if (es[i] !== "victorioso") {
        es[i] = "victorioso";
        ch = true;
      }
    }
    return ch;
  }
  if (typeof es === "string" && es !== "victorioso") {
    node.es = "victorioso";
    return true;
  }
  return false;
}

function fixRaw(s) {
  if (typeof s !== "string" || !s.includes("H5329")) return s;
  let out = s.replace(RAW_RX_E, (block) =>
    block.replace(/<E>[^<]*<e>/, "<E>victorioso<e>")
  );
  out = out.replace(RAW_RX_Z, (block) =>
    block.replace(/<z>s\/t<\/z>/, "<E>victorioso<e>")
  );
  return out;
}

function processFile(fp) {
  const txt = fs.readFileSync(fp, "utf8");
  if (!txt.includes("H5329")) return;
  let data;
  try {
    data = JSON.parse(txt);
  } catch {
    console.error("skip parse:", fp);
    return;
  }
  let changed = false;
  deep(data, (node) => {
    if (!node || node.strongs !== "H5329") return;
    if (!Object.prototype.hasOwnProperty.call(node, "es")) {
      node.es = "victorioso";
      delete node.notrans;
      changed = true;
      return;
    }
    if (node.notrans) {
      delete node.notrans;
      changed = true;
    }
    if (applyVictoriosoEs(node)) changed = true;
  });
  deep(data, (node) => {
    if (!node || typeof node.raw !== "string") return;
    const nr = fixRaw(node.raw);
    if (nr !== node.raw) {
      node.raw = nr;
      changed = true;
    }
  });
  if (changed) {
    fs.writeFileSync(fp, JSON.stringify(data), "utf8");
    console.log("updated", fp);
  }
}

walk(ROOT);
console.log("patch-h5329-victorioso-interlineal: done");
