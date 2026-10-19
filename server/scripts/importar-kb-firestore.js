// Importa la base de conocimiento de knowledge/ a Firestore (colección kb_chunks).
// Uso: node server/scripts/importar-kb-firestore.js [--dry-run]
// Lee los JSON normativos (kinedrik_normativa_kb_*) y el índice de entregables por área
// (kinedrik_indice_entregables_TODAS_AREAS). Cada fragmento se guarda literal, sin texto generado,
// con su embedding para la búsqueda vectorial del RAG.

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const KB_DIR = path.join(__dirname, '..', '..', 'knowledge');
const COLECCION = 'kb_chunks';
const EMBED_MODEL = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small';
const EMBED_DIM = 512;
const EMBED_BATCH = 96;
const WRITE_BATCH = 50;

const dryRun = process.argv.includes('--dry-run');

function id(...partes) {
  return crypto.createHash('sha1').update(partes.join('|')).digest('hex');
}

function leerNormativa() {
  const chunks = [];
  const archivos = fs.readdirSync(KB_DIR).filter(f => /^kinedrik_normativa_kb_.*\.json$/.test(f));
  for (const archivo of archivos) {
    const json = JSON.parse(fs.readFileSync(path.join(KB_DIR, archivo), 'utf8'));
    for (const c of json.chunks) {
      if (!c.extracto) continue;
      chunks.push({
        docId: id('norma', c.area_codigo, c.chunk_id),
        tipo: 'normativa',
        area_codigo: c.area_codigo,
        norma: c.norma_codigo,
        apartado: String(c.apartado ?? ''),
        titulo: c.titulo_apartado || '',
        texto: c.extracto,
        fuente: archivo,
        embedText: `${c.norma_codigo} · ${c.apartado} ${c.titulo_apartado || ''}: ${c.extracto}`
      });
    }
  }
  return chunks;
}

function leerEntregables() {
  const json = JSON.parse(fs.readFileSync(path.join(KB_DIR, 'kinedrik_indice_entregables_TODAS_AREAS_v0.1.0.json'), 'utf8'));
  const chunks = [];
  const fuente = 'kinedrik_indice_entregables_TODAS_AREAS_v0.1.0.json';
  const add = (area, etiqueta, texto) => {
    chunks.push({
      docId: id('entregable', area, etiqueta),
      tipo: 'entregables',
      area_codigo: area,
      norma: null,
      apartado: etiqueta,
      titulo: etiqueta,
      texto,
      fuente,
      embedText: `${etiqueta}: ${texto}`
    });
  };

  for (const a of json.areas) {
    // BIM (AMETBIM) trae el lote F como lista plana de entregables.
    if (Array.isArray(a.lote_F_cronograma_presupuesto)) {
      add(a.area_codigo, 'Lote F · Cronograma y presupuesto', a.lote_F_cronograma_presupuesto.join('; '));
    }
    if (a.lotes && typeof a.lotes === 'object') {
      for (const [letra, lote] of Object.entries(a.lotes)) {
        add(a.area_codigo, `Lote ${letra} · ${lote.nombre}`, (lote.entregables || []).join('; '));
      }
    }
    if (Array.isArray(a.tipologias)) {
      add(a.area_codigo, 'Tipologías de proyecto', a.tipologias.join('; '));
    }
    if (Array.isArray(a.normas_citadas_en_ppt)) {
      add(a.area_codigo, 'Normas citadas en el PPT', a.normas_citadas_en_ppt.join('; '));
    }
  }
  return chunks;
}

async function embed(inputs) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: EMBED_MODEL, input: inputs, dimensions: EMBED_DIM })
  });
  if (!res.ok) throw new Error(`Embeddings ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data.data.sort((a, b) => a.index - b.index).map(d => d.embedding.map(x => Math.round(x * 1e6) / 1e6));
}

async function main() {
  const chunks = [...leerNormativa(), ...leerEntregables()];
  const porTipo = chunks.reduce((acc, c) => ({ ...acc, [c.tipo]: (acc[c.tipo] || 0) + 1 }), {});
  console.log(`Fragmentos preparados: ${chunks.length}`, porTipo);

  if (dryRun) {
    console.log('--dry-run: no se genera embedding ni se escribe en Firestore.');
    return;
  }
  if (!process.env.OPENAI_API_KEY) throw new Error('Falta OPENAI_API_KEY para generar embeddings.');

  for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
    const vecs = await embed(chunks.slice(i, i + EMBED_BATCH).map(c => c.embedText));
    vecs.forEach((v, j) => { chunks[i + j].embedding = v; });
    console.log(`Embeddings: ${Math.min(i + EMBED_BATCH, chunks.length)}/${chunks.length}`);
  }

  initializeApp({
    credential: applicationDefault(),
    projectId: process.env.GOOGLE_CLOUD_PROJECT
  });
  const db = getFirestore();
  const col = db.collection(COLECCION);

  for (let i = 0; i < chunks.length; i += WRITE_BATCH) {
    const batch = db.batch();
    for (const c of chunks.slice(i, i + WRITE_BATCH)) {
      const { docId, embedText, ...datos } = c;
      batch.set(col.doc(docId), { ...datos, embedding: c.embedding, importedAt: new Date().toISOString() });
    }
    await batch.commit();
    console.log(`Firestore: ${Math.min(i + WRITE_BATCH, chunks.length)}/${chunks.length}`);
  }

  await db.collection('kb_meta').doc('estado').set({
    total: chunks.length,
    porTipo,
    embedModel: EMBED_MODEL,
    embedDim: EMBED_DIM,
    importedAt: new Date().toISOString()
  });
  console.log('Importación completa.');
}

main().catch(err => {
  console.error('Error en la importación:', err.message);
  process.exit(1);
});
