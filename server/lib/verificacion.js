// Verificación determinista posterior al modelo: el código, no el modelo, decide
// los marcadores sin rellenar, la cita normativa de cada riesgo y la nota.
// Las citas salen siempre de la base real (kb_chunks), nunca de texto generado.

const kb = require('./kb');

const MARCADORES = [
  /nombre (del|de los) (m[oó]dulo|tema\(?s?\)?|estudiante|proyecto|documento)/gi,
  /nombre completo/gi,
  /dd\/mm\/aaaa/gi,
  /\bxx+\b/gi,
  /\[[^\]\n]{1,40}\]/g,
  /por definir/gi,
  /lorem ipsum/gi
];

const PESO = { alto: 15, medio: 8, bajo: 3 };
const ORDEN = { alto: 0, medio: 1, bajo: 2 };

function detectarMarcadores(text) {
  const encontrados = [];
  for (const re of MARCADORES) {
    encontrados.push(...(text.match(re) || []));
  }
  return { total: encontrados.length, ejemplos: [...new Set(encontrados)].slice(0, 5) };
}

// Cláusula de la base más parecida al texto dado (solo normativa, no entregables).
async function citar(query, areaCodigo) {
  const hits = await kb.searchMany([query], 8, areaCodigo);
  const norma = hits.find(h => h.tipo === 'normativa');
  return norma ? norma.source : null;
}

async function verificar(result, { text, area, pertinencia }) {
  if (!result || typeof result !== 'object') return result;

  const pertinente = !pertinencia || !pertinencia.disponible || pertinencia.pertinente;
  if (!pertinente) {
    return { ...result, risks: [], correct_sections: [], score: Math.min(result.score ?? 0, 15) };
  }

  const risks = Array.isArray(result.risks) ? [...result.risks] : [];
  const automaticos = new Set();

  const marcadores = detectarMarcadores(text);
  if (marcadores.total > 0) {
    const ref = await citar('plan de ejecución BIM contenido información entregables responsabilidades', area);
    const riesgo = {
      severity: marcadores.total >= 5 ? 'alto' : 'medio',
      title: 'Plantilla sin completar',
      location: 'No localizado',
      explanation: `El documento contiene ${marcadores.total} marcadores sin rellenar (por ejemplo: ${marcadores.ejemplos.map(e => `"${e}"`).join(', ')}).`,
      normative_reference: ref || 'No localizado en la base normativa',
      quote: marcadores.ejemplos[0] || '',
      suggested_fix: 'Sustituir cada marcador por el contenido real del proyecto antes de someter el BEP a revisión.'
    };
    risks.unshift(riesgo);
    automaticos.add(riesgo);
  }

  for (const r of risks) {
    if (automaticos.has(r)) continue;
    const ref = await citar(`${r.title || ''} ${r.explanation || ''}`, area);
    if (ref) r.normative_reference = ref;
  }

  risks.sort((a, b) => (ORDEN[a.severity] ?? 3) - (ORDEN[b.severity] ?? 3));
  risks.forEach((r, i) => { r.id = `R-${String(i + 1).padStart(2, '0')}`; });

  const penalizacion = risks.reduce((s, r) => s + (PESO[r.severity] || 0), 0);
  const score = Math.max(0, 100 - penalizacion);

  const recommendations = marcadores.total > 0
    ? ['Completar los marcadores sin rellenar del documento.', ...(result.recommendations || [])]
    : result.recommendations;

  return { ...result, risks, score, recommendations };
}

module.exports = { verificar, detectarMarcadores };
