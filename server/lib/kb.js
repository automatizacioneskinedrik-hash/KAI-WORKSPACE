// Base de conocimiento normativa. La fuente principal es Firestore (colección kb_chunks, cargada
// con server/scripts/importar-kb-firestore.js). La búsqueda es léxica (BM25) sobre esos textos
// literales: las respuestas solo pueden citar lo que está en la base, sin llamadas de embeddings.
// Si Firestore está vacío, cae al índice local de /knowledge (PDF, DOCX, TXT, MD).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { getFirestore } = require('firebase-admin/firestore');
const { hasApiKey } = require('./llm');

// Nombre de área de la app -> código de área de la base de conocimiento.
const AREA_CODIGO_POR_NOMBRE = {
  'Infraestructuras Civiles y de Transporte': 'AINFRAT',
  'Estructuras, Materiales y Geotecnia': 'AESTGEO',
  'Obras Hidráulicas': 'AOHHEAM',
  'BIM': 'AMETBIM',
  'Gestión y Financiación de Empresas y Proyectos': 'AGESDIR',
  'Energía, Minas y Petróleo': 'AENERPM',
  'Transformación Digital': 'ATRDIGI',
  'Ingeniería, Aplicaciones e Instalaciones Industriales': 'AINDAPP'
};

const KB_DIR = path.join(__dirname, '..', '..', 'knowledge');
const CACHE_PATH = path.join(__dirname, '..', '..', 'data', 'kb-index.json');
const EMBED_MODEL = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small';
const EMBED_DIM = 512;
const CHUNK_CHARS = 1400;
const OVERLAP_CHARS = 200;
const BATCH = 96;

const STOP = new Set(['los', 'las', 'del', 'una', 'que', 'con', 'por', 'para', 'como', 'sus', 'este', 'esta', 'the', 'and', 'desde', 'entre', 'sobre', 'cada', 'pero', 'son', 'ser', 'hay', 'todo', 'todos']);

let index = null;   // { chunks, mode: 'embeddings' | 'lexical', sources, lex }
let building = null;

function normalizeText(s) {
  return s.replace(/\r/g, '').replace(/\s+/g, ' ').trim();
}

function chunkText(text, source) {
  const clean = normalizeText(text);
  const out = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + CHUNK_CHARS, clean.length);
    if (end < clean.length) {
      const sp = clean.lastIndexOf(' ', end);
      if (sp > start + CHUNK_CHARS / 2) end = sp;
    }
    const piece = clean.slice(start, end).trim();
    if (piece.length > 60) out.push({ source, text: piece });
    if (end >= clean.length) break;
    start = Math.max(end - OVERLAP_CHARS, start + 1);
  }
  return out;
}

function tokenize(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(t => t.length > 2 && !STOP.has(t));
}

function buildLexical(chunks) {
  const df = new Map();
  const tfs = chunks.map(c => {
    const toks = tokenize(c.text);
    const tf = new Map();
    for (const t of toks) tf.set(t, (tf.get(t) || 0) + 1);
    for (const t of tf.keys()) df.set(t, (df.get(t) || 0) + 1);
    return { tf, len: toks.length };
  });
  const avg = tfs.reduce((a, b) => a + b.len, 0) / Math.max(chunks.length, 1);
  return { df, tfs, N: chunks.length, avg };
}

function bm25(lex, queryTokens, i) {
  const k1 = 1.5;
  const b = 0.75;
  const { tf, len } = lex.tfs[i];
  let score = 0;
  for (const t of new Set(queryTokens)) {
    const f = tf.get(t);
    if (!f) continue;
    const n = lex.df.get(t) || 0;
    const idf = Math.log(1 + (lex.N - n + 0.5) / (n + 0.5));
    score += idf * (f * (k1 + 1)) / (f + k1 * (1 - b + (b * len) / lex.avg));
  }
  return score;
}

function cosine(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

async function embed(inputs) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: inputs, dimensions: EMBED_DIM })
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Embeddings ${res.status}: ${txt.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.data.sort((a, b) => a.index - b.index).map(d => d.embedding);
}

function listFiles() {
  if (!fs.existsSync(KB_DIR)) return [];
  return fs.readdirSync(KB_DIR)
    .filter(f => /\.(pdf|docx|txt|md)$/i.test(f))
    .sort();
}

async function readFileText(file) {
  const buf = fs.readFileSync(path.join(KB_DIR, file));
  const lower = file.toLowerCase();
  if (lower.endsWith('.pdf')) return (await pdfParse(buf)).text;
  if (lower.endsWith('.docx')) return (await mammoth.extractRawText({ buffer: buf })).value;
  return buf.toString('utf8');
}

function readCache() {
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
  } catch {
    return null;
  }
}

async function build() {
  const files = listFiles();
  if (!files.length) {
    console.warn('[kb] Carpeta knowledge/ vacía: el asistente responderá sin contexto normativo.');
    return { chunks: [], mode: 'lexical', sources: [], lex: buildLexical([]) };
  }

  const fingerprint = crypto.createHash('sha1')
    .update(files.map(f => {
      const st = fs.statSync(path.join(KB_DIR, f));
      return `${f}:${st.size}:${st.mtimeMs}`;
    }).join('|') + `|${EMBED_MODEL}|${EMBED_DIM}|${CHUNK_CHARS}`)
    .digest('hex');

  const cached = readCache();
  if (cached && cached.fingerprint === fingerprint && cached.mode === 'embeddings' && hasApiKey()) {
    console.log(`[kb] Índice cargado desde caché (${cached.chunks.length} fragmentos).`);
    return { chunks: cached.chunks, mode: 'embeddings', sources: files, lex: buildLexical(cached.chunks) };
  }

  let chunks = [];
  for (const f of files) {
    try {
      const text = await readFileText(f);
      chunks.push(...chunkText(text, f.replace(/\.[^.]+$/, '')));
    } catch (err) {
      console.warn(`[kb] No se pudo leer ${f}: ${err.message}`);
    }
  }

  let mode = 'lexical';
  if (chunks.length && hasApiKey()) {
    try {
      for (let i = 0; i < chunks.length; i += BATCH) {
        const vecs = await embed(chunks.slice(i, i + BATCH).map(c => c.text));
        vecs.forEach((v, j) => {
          chunks[i + j].vec = v.map(x => Math.round(x * 1e5) / 1e5);
        });
      }
      mode = 'embeddings';
      fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
      fs.writeFileSync(CACHE_PATH, JSON.stringify({ fingerprint, mode, chunks }), 'utf8');
    } catch (err) {
      console.warn(`[kb] Embeddings no disponibles, uso búsqueda léxica: ${err.message}`);
      chunks = chunks.map(({ source, text }) => ({ source, text }));
    }
  }

  console.log(`[kb] ${files.length} documentos, ${chunks.length} fragmentos, modo ${mode}.`);
  return { chunks, mode, sources: files, lex: buildLexical(chunks) };
}

// Carga la base normativa desde Firestore (kb_chunks). Devuelve null si está vacía o no hay acceso.
async function loadFromFirestore() {
  try {
    const snap = await getFirestore().collection('kb_chunks').get();
    if (snap.empty) return null;
    const chunks = snap.docs.map(d => {
      const c = d.data();
      const source = c.norma
        ? `${c.norma}, apartado ${c.apartado} (${c.titulo})`
        : `${c.area_codigo} · ${c.titulo}`;
      return { source, text: c.texto, area: c.area_codigo, tipo: c.tipo, vec: c.embedding };
    });
    console.log(`[kb] Base normativa cargada desde Firestore: ${chunks.length} fragmentos.`);
    return { chunks, mode: 'lexical', sources: ['firestore:kb_chunks'], lex: buildLexical(chunks) };
  } catch (err) {
    console.warn(`[kb] No se pudo leer Firestore, uso el índice local: ${err.message}`);
    return null;
  }
}

function ensureIndex() {
  if (index) return Promise.resolve(index);
  if (!building) {
    building = loadFromFirestore().then(idx => idx || build()).then(idx => {
      index = idx;
      return idx;
    }).catch(err => {
      console.error('[kb] Error construyendo el índice:', err);
      index = { chunks: [], mode: 'lexical', sources: [], lex: buildLexical([]) };
      return index;
    });
  }
  return building;
}

// Busca varias consultas y devuelve los k fragmentos más relevantes del área indicada
// (más los de BIM, que son transversales). Sin área, busca en toda la base.
async function searchMany(queries, k = 8, areaCodigo = null) {
  const idx = await ensureIndex();
  if (!idx.chunks.length) return [];
  const scores = new Float64Array(idx.chunks.length);
  const permitido = c => !areaCodigo || !c.area || c.area === areaCodigo || c.area === 'AMETBIM';

  for (const q of queries) {
    const qt = tokenize(q);
    idx.chunks.forEach((c, i) => {
      if (permitido(c)) scores[i] += bm25(idx.lex, qt, i);
    });
  }

  return Array.from(scores)
    .map((score, i) => ({ score, source: idx.chunks[i].source, text: idx.chunks[i].text, tipo: idx.chunks[i].tipo }))
    .filter(h => h.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

// Control de pertinencia: similitud máxima entre el documento y los fragmentos del área (o BIM, transversal).
// Calibrado con 3 textos de muestra: BEP real 0,76 · otra disciplina 0,54 · sin relación 0,28.
const UMBRAL_PERTINENCIA = 0.6;

async function pertinencia(texto, areaCodigo) {
  const idx = await ensureIndex();
  const candidatos = idx.chunks.filter(c => c.vec && (!areaCodigo || c.area === areaCodigo || c.area === 'AMETBIM'));
  if (!candidatos.length || !hasApiKey()) return { disponible: false };
  const [vec] = await embed([texto.slice(0, 4000)]);
  const max = candidatos.reduce((m, c) => Math.max(m, cosine(vec, c.vec)), -1);
  return { disponible: true, similitud: Math.round(max * 1000) / 1000, umbral: UMBRAL_PERTINENCIA, pertinente: max >= UMBRAL_PERTINENCIA };
}

function formatContext(hits) {
  return hits.map((h, i) => `[${i + 1}] Fuente: ${h.source}\n${h.text}`).join('\n\n');
}

function status() {
  if (!index) return { ready: false };
  return {
    ready: true,
    documents: index.sources.length,
    chunks: index.chunks.length,
    mode: index.mode
  };
}

// Arranca la indexación en segundo plano al iniciar el servidor.
function init() {
  ensureIndex();
}

module.exports = { init, searchMany, formatContext, pertinencia, status, KB_DIR, AREA_CODIGO_POR_NOMBRE };
