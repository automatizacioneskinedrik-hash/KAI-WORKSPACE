// Opportunity Scout: busca licitaciones públicas reales en SECOP II (Colombia) y TED (UE).
// Fuentes y palabras clave: knowledge/licitaciones_secop2.py y knowledge/licitaciones_ted.py.
// Si una fuente falla, se devuelve su error real; nunca se rellena con resultados de ejemplo.

const SECOP2_ENDPOINT = 'https://www.datos.gov.co/resource/p6dx-8zbt.json';
const TED_ENDPOINT = 'https://api.ted.europa.eu/v3/notices/search';
const TIMEOUT_MS = 20000;

const SECOP_KEYWORDS_POR_AREA = {
  AMETBIM: ['BIM', 'modelado de información', 'building information modeling'],
  AINFRAT: ['carretera', 'vial', 'infraestructura de transporte'],
  AOHHEAM: ['hidráulica', 'alcantarillado', 'medio ambiente', 'acueducto'],
  ARQYURB: ['arquitectura', 'urbanismo', 'edificación', 'eficiencia energética edificios'],
  AINDAPP: ['ingeniería industrial', 'automatización industrial'],
  AGESDIR: ['gestión de proyectos', 'dirección de proyectos', 'PMO'],
  ATRDIGI: ['transformación digital', 'ciberseguridad', 'seguridad de la información'],
  AESTGEO: ['estructuras', 'geotecnia', 'cimentación'],
  AENERPM: ['energía solar', 'energía eólica', 'minería']
};

const TED_QUERY_POR_AREA = {
  AMETBIM: 'BIM OR "building information modelling"',
  AINFRAT: 'carretera OR road infrastructure',
  AOHHEAM: 'hydraulic OR wastewater OR water treatment',
  ARQYURB: 'architecture OR urban planning OR energy efficiency buildings',
  AINDAPP: 'industrial engineering OR automation',
  AGESDIR: 'project management OR PMO',
  ATRDIGI: 'digital transformation OR cybersecurity OR information security',
  AESTGEO: 'structural engineering OR geotechnical',
  AENERPM: 'solar energy OR wind energy OR mining'
};

async function fetchJson(url, options = {}) {
  const res = await fetch(url, { ...options, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function buscarSecop2(keywords, limite) {
  const vistos = new Set();
  const resultados = [];
  for (const kw of keywords) {
    const params = new URLSearchParams({ $limit: String(limite), $q: kw });
    const data = await fetchJson(`${SECOP2_ENDPOINT}?${params}`);
    for (const r of data) {
      const url = r.urlproceso && r.urlproceso.url;
      if (url && vistos.has(url)) continue;
      if (url) vistos.add(url);
      resultados.push({
        portal: 'SECOP II (Colombia)',
        titulo: r.nombre_del_procedimiento || r.descripci_n_del_procedimiento || 'Proceso sin título descriptivo',
        entidad: r.entidad || r.nombre_entidad || null,
        fechaPublicacion: r.fecha_de_publicacion_del || null,
        precioBase: r.precio_base || null,
        estado: r.estado_del_procedimiento || null,
        url: url || null,
        keyword: kw
      });
    }
  }
  return resultados;
}

// TED v3 exige sintaxis experta: FT ~ (...) busca en el texto completo del anuncio.
function tituloTed(notice) {
  const t = notice['notice-title'];
  if (typeof t === 'string') return t;
  if (t && typeof t === 'object') return t.spa || t.eng || Object.values(t)[0];
  return 'Anuncio sin título';
}

async function buscarTed(query, limite) {
  const data = await fetchJson(TED_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `FT ~ (${query})`,
      limit: limite,
      fields: ['notice-title', 'publication-date', 'publication-number']
    })
  });
  const notices = data.notices || [];
  return notices.map(n => ({
    portal: 'TED (Unión Europea)',
    titulo: tituloTed(n),
    entidad: null,
    fechaPublicacion: n['publication-date'] || null,
    precioBase: null,
    estado: null,
    url: n['publication-number'] ? `https://ted.europa.eu/es/notice/${n['publication-number']}` : null,
    keyword: query
  }));
}

// areaCodigo: código de área KINEDRIK (p. ej. 'AMETBIM'). q: búsqueda libre opcional que sustituye a las palabras clave del área.
async function buscarLicitaciones({ areaCodigo, q, limite = 8 }) {
  const secopKeywords = q ? [q] : SECOP_KEYWORDS_POR_AREA[areaCodigo];
  const tedQuery = q || TED_QUERY_POR_AREA[areaCodigo];
  if (!secopKeywords || !tedQuery) {
    return { error: `Área '${areaCodigo}' sin palabras clave definidas.` };
  }

  const [secop, ted] = await Promise.allSettled([
    buscarSecop2(secopKeywords, limite),
    buscarTed(tedQuery, limite)
  ]);

  return {
    area: areaCodigo || null,
    busqueda: q || null,
    fuentes: {
      secop2: secop.status === 'fulfilled'
        ? { ok: true, resultados: secop.value }
        : { ok: false, error: secop.reason.message, resultados: [] },
      ted: ted.status === 'fulfilled'
        ? { ok: true, resultados: ted.value }
        : { ok: false, error: ted.reason.message, resultados: [] }
    }
  };
}

module.exports = { buscarLicitaciones, SECOP_KEYWORDS_POR_AREA };
