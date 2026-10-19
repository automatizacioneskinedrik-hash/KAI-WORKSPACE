require('dotenv').config();
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');

const db = require('./lib/db');
const config = require('./lib/config');
const { extractText } = require('./lib/extract');
const { buildAnalysisPrompt, buildChatPrompt } = require('./lib/prompts');
const { callAnalysisJson, callChat, hasApiKey } = require('./lib/llm');
const kb = require('./lib/kb');
const credits = require('./lib/credits');
const { verificar } = require('./lib/verificacion');
const { buscarLicitaciones } = require('./lib/licitaciones');

const app = express();
const PORT = process.env.PORT || 8080;
// Detrás de Cloud Run / un proxy, pon TRUST_PROXY=1 para que la IP real del cliente sea la que cuente en la prueba gratuita.
app.set('trust proxy', process.env.TRUST_PROXY === '1' ? 1 : false);

const AREAS = [
  'Infraestructuras Civiles y de Transporte',
  'Estructuras, Materiales y Geotecnia',
  'Obras Hidráulicas',
  'BIM',
  'Gestión y Financiación de Empresas y Proyectos',
  'Energía, Minas y Petróleo',
  'Transformación Digital',
  'Ingeniería, Aplicaciones e Instalaciones Industriales'
];
const TIPOS = ['EIR', 'BEP', 'IFC / Modelo BIM', 'Memoria técnica', 'Verificación ISO', 'Cronograma', 'BEP por área'];
const NORMATIVAS = ['ISO 19650-2:2018', 'ISO 19650-1:2018', 'UNE-EN 17412', 'PAS 1192 (legado)'];
const ESPECIALIDADES = ['BIM Management', 'Estructuras', 'MEP', 'Arquitectura'];
const NIVELES = ['Rápido', 'Estándar', 'Exhaustivo'];
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

initializeApp({
  projectId: process.env.GOOGLE_CLOUD_PROJECT || 'tu-proyecto-id'
});
const firestore = getFirestore();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB, matches the reviewed BEP prototype's stated limit
});

const publicDir = process.env.NODE_ENV === 'production'
  ? path.join(__dirname, '..', 'dist')
  : path.join(__dirname, '..');

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.static(publicDir, {
  setHeaders: (res, filePath) => {
    // El HTML siempre se revalida para que los cambios de interfaz no queden en caché del navegador.
    if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
  }
}));

const analyzeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones. Espera unos minutos antes de volver a intentarlo.', code: 'RATE_LIMITED' }
});
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas preguntas seguidas. Espera unos minutos.', code: 'RATE_LIMITED' }
});

function clientIp(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

/* ===== Sesiones demo (usuario/contraseña del formulario de login) ===== */
// Las credenciales se validan aquí y no en el navegador. El servidor emite un
// token firmado con HMAC que requireAuth acepta igual que un token de Firebase.
const DEMO_ACCOUNTS = {
  testing: { pass: process.env.DEMO_TESTING_PASS || '123', role: 'estudiante' },
  admin: { pass: process.env.DEMO_ADMIN_PASS || 'kinedrik2026', role: 'admin' }
};
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const DEMO_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function signDemoSession(user, role) {
  const payload = Buffer.from(JSON.stringify({ user, role, exp: Date.now() + DEMO_SESSION_TTL_MS })).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `demo.${payload}.${sig}`;
}

function verifyDemoSession(token) {
  const [prefix, payload, sig] = token.split('.');
  if (prefix !== 'demo' || !payload || !sig) return null;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}

async function requireAuth(req, res, next) {
  //Verificación de Administrador
  const adminHeader = req.get('x-admin-token');
  if (adminHeader && adminHeader === process.env.ADMIN_TOKEN) {
    req.user = { uid: 'admin_system', role: 'admin' };
    return next();
  }

  //Verificación de Usuario Google
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acceso no autorizado. Provea credenciales.', code: 'UNAUTHORIZED' });
  }

  const token = authHeader.split('Bearer ')[1];

  //Verificación de sesión demo
  if (token.startsWith('demo.')) {
    const session = verifyDemoSession(token);
    if (!session) return res.status(401).json({ error: 'Sesión expirada. Vuelve a iniciar sesión.', code: 'INVALID_TOKEN' });
    req.user = { uid: `demo_${session.user}`, role: session.role };
    return next();
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    req.user = { uid: decodedToken.uid, role: credits.roleForEmail(decodedToken.email), email: decodedToken.email };
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token inválido o expirado.', code: 'INVALID_TOKEN' });
  }
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, hasApiKey: hasApiKey(), model: process.env.OPENAI_MODEL || 'gpt-4o-mini', knowledge: kb.status() });
});

// Saldo de créditos del usuario autenticado (crea la cuenta y aplica la prueba por IP la primera vez).
app.get('/api/credits', requireAuth, async (req, res) => {
  try {
    res.json(await credits.getStatus(req.user, clientIp(req)));
  } catch (err) {
    handleApiError(res, err);
  }
});

app.get('/api/analyses', requireAuth, async (req, res) => {
  try {
    // Si es admin, podríamos decidir retornar todo, pero por ahora aislamos por el UID inyectado
    const snapshot = await firestore.collection('users').doc(req.user.uid).collection('analyses')
      .orderBy('createdAt', 'desc').get();
      
    const analyses = [];
    snapshot.forEach(doc => analyses.push({ id: doc.id, ...doc.data() }));
    res.json(analyses);
  } catch (err) {
    handleApiError(res, err);
  }
});

app.get('/api/analyses/:id', requireAuth, async (req, res) => {
  try {
    const doc = await firestore.collection('users').doc(req.user.uid).collection('analyses').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Análisis no encontrado.' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    handleApiError(res, err);
  }
});

// Consultas fijas que cubren los temas clave de ISO 19650/29481 en cualquier revisión BIM.
const KB_TOPIC_QUERIES = [
  'requisitos de intercambio de información EIR criterios de aceptación nivel de información necesario',
  'entorno común de datos CDE estados de los contenedores de información revisión y aprobación',
  'plan de ejecución BIM TIDP MIDP matriz de responsabilidades movilización del equipo',
  'seguridad de la información sensible triaje de seguridad plan de gestión de la seguridad',
  'proceso de gestión de la información entrega del modelo de información aceptación del adjudicador'
];

app.post('/api/analyze', analyzeLimiter, requireAuth, upload.single('file'), async (req, res) => {
  let reservation = null;
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo.' });

    const area = pickValid(req.body.area, AREAS, 'Infraestructuras Civiles y de Transporte');
    const tipo = pickValid(req.body.tipo, TIPOS, 'BEP');
    if (tipo.startsWith('BEP') && area !== 'BIM') {
      return res.status(400).json({ error: 'Los tipos BEP solo aplican al área BIM.', code: 'TIPO_NO_APLICA' });
    }
    const normativa = pickValid(req.body.normativa, NORMATIVAS, 'ISO 19650-2:2018');
    const especialidad = pickValid(req.body.especialidad, ESPECIALIDADES, 'BIM Management');
    const nivel = pickValid(req.body.nivel, NIVELES, 'Estándar');
    const fileName = fixFileNameEncoding(req.file.originalname);

    // Cobro antes de llamar a la IA; si algo falla más adelante, se devuelve (ver catch).
    reservation = await credits.reserve(req.user, clientIp(req));

    const { text, truncated, fullLength } = await extractText(req.file.buffer, req.file.mimetype, fileName);

    // RAG: recupera del marco normativo los fragmentos relevantes para este documento.
    const hits = await kb.searchMany([
      `${tipo} ${normativa} ${area}. ${text.slice(0, 1200)}`,
      ...KB_TOPIC_QUERIES
    ], 10, kb.AREA_CODIGO_POR_NOMBRE[area] || null);

    // Control automático de pertinencia frente a la base normativa del área (decide el código, no el modelo).
    const pert = await kb.pertinencia(text, kb.AREA_CODIGO_POR_NOMBRE[area] || null);

    const { system, user } = buildAnalysisPrompt({
      area, tipo, normativa, especialidad, nivel,
      fileName,
      text, truncated,
      pertinencia: pert,
      context: kb.formatContext(hits),
      customInstructions: config.getConfig().customInstructions
    });

    const { result: resultadoModelo, usage, model } = await callAnalysisJson({ system, user });
    const result = await verificar(resultadoModelo, { text, area: kb.AREA_CODIGO_POR_NOMBRE[area] || null, pertinencia: pert });

    const riskCounts = { alto: 0, medio: 0, bajo: 0 };
    for (const r of result.risks || []) {
      if (riskCounts[r.severity] !== undefined) riskCounts[r.severity]++;
    }

    const recordId = crypto.randomUUID();
    const record = {
      fileName,
      fileSizeBytes: req.file.size,
      area, tipo, normativa, especialidad, nivel,
      createdAt: new Date().toISOString(),
      docTextLength: fullLength,
      docTruncated: truncated,
      model,
      usage,
      score: result.score,
      riskCounts,
      result,
      chatLogs: {}
    };

    await firestore.collection('users').doc(req.user.uid).collection('analyses').doc(recordId).set(record);
    res.json({
      id: recordId,
      ...record,
      sources: [...new Set(hits.map(h => h.source))],
      credits: {
        unlimited: Boolean(reservation?.unlimited),
        balance: reservation?.unlimited ? null : reservation.balance,
        cost: credits.ANALYSIS_COST
      }
    });
  } catch (err) {
    // Si el análisis no se completó, devolvemos los créditos cobrados.
    await credits.refund(reservation).catch(e => console.error('No se pudo devolver el crédito:', e));
    handleApiError(res, err);
  }
});

app.post('/api/analyses/:id/chat', chatLimiter, requireAuth, async (req, res) => {
  try {
    const analysisRef = firestore.collection('users').doc(req.user.uid).collection('analyses').doc(req.params.id);
    const doc = await analysisRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Análisis no encontrado.' });

    const record = doc.data();
    const { riskId, question } = req.body || {};
    if (!question || !question.trim()) return res.status(400).json({ error: 'Pregunta vacía.' });
    if (question.length > 2000) return res.status(400).json({ error: 'Pregunta demasiado larga (máx. 2000 caracteres).' });

    const risk = (record.result.risks || []).find(r => r.id === riskId);
    if (!risk) return res.status(404).json({ error: 'Riesgo no encontrado en este análisis.' });

    const hits = await kb.searchMany([`${risk.title}. ${risk.normative_reference}`, question], 4);

    const { system, user } = buildChatPrompt({
      risk, question,
      tipo: record.tipo, normativa: record.normativa,
      docExcerpt: risk.quote,
      context: kb.formatContext(hits),
      customInstructions: config.getConfig().customInstructions
    });

    const { content, usage } = await callChat({ system, user, json: false });

    const chatLogs = record.chatLogs || {};
    chatLogs[riskId] = chatLogs[riskId] || [];
    chatLogs[riskId].push({ question, answer: content, at: new Date().toISOString(), usage });

    await analysisRef.update({ chatLogs });
    res.json({ answer: content });
  } catch (err) {
    handleApiError(res, err);
  }
});

app.get('/api/stats', (req, res) => {
  const full = db.listFullAnalyses();
  const scoreTrend = full
    .filter(a => Number.isFinite(a.score))
    .map(a => ({ id: a.id, fileName: a.fileName, createdAt: a.createdAt, score: a.score }))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const riskTotals = { alto: 0, medio: 0, bajo: 0 };
  const checklistTotals = { ok: 0, warn: 0, fail: 0 };
  const riskTitleCounts = {};
  for (const a of full) {
    const rc = a.riskCounts || {};
    riskTotals.alto += rc.alto || 0;
    riskTotals.medio += rc.medio || 0;
    riskTotals.bajo += rc.bajo || 0;
    for (const item of (a.result && a.result.checklist) || []) {
      if (checklistTotals[item.status] !== undefined) checklistTotals[item.status]++;
    }
    for (const risk of (a.result && a.result.risks) || []) {
      riskTitleCounts[risk.title] = (riskTitleCounts[risk.title] || 0) + 1;
    }
  }
  const topRisks = Object.entries(riskTitleCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([title, count]) => ({ title, count }));

  const scored = scoreTrend.map(s => s.score);
  const avgScore = scored.length ? Math.round(scored.reduce((s, v) => s + v, 0) / scored.length) : null;

  res.json({
    totalAnalyses: full.length,
    avgScore,
    scoreTrend,
    riskTotals,
    checklistTotals,
    topRisks
  });
});

function requireAdmin(req, res, next) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) {
    return res.status(501).json({ error: 'ADMIN_TOKEN no configurado en el servidor. Añádelo a .env para habilitar el panel de admin.', code: 'ADMIN_NOT_CONFIGURED' });
  }
  if (req.get('x-admin-token') !== token) {
    return res.status(401).json({ error: 'Token de administrador inválido.', code: 'UNAUTHORIZED' });
  }
  next();
}

app.get('/api/admin/prompt', requireAdmin, (req, res) => {
  res.json({ customInstructions: config.getConfig().customInstructions });
});

app.post('/api/admin/prompt', requireAdmin, (req, res) => {
  const { customInstructions } = req.body || {};
  const updated = config.setCustomInstructions(customInstructions);
  res.json({ customInstructions: updated.customInstructions });
});

app.post('/api/auth/demo', (req, res) => {
  const { user, pass } = req.body || {};
  const account = DEMO_ACCOUNTS[user];
  if (!account || account.pass !== pass) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos.', code: 'BAD_CREDENTIALS' });
  }
  res.json({ user, role: account.role, token: signDemoSession(user, account.role) });
});

app.post('/api/auth/google', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token requerido' });

  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    const { uid, name, email, picture } = decodedToken;
    const userRef = firestore.collection('users').doc(uid);
    const userDoc = await userRef.get();

    const userData = {
      uid, name, email, picture,
      lastLogin: FieldValue.serverTimestamp()
    };

    if (!userDoc.exists) {
      userData.createdAt = FieldValue.serverTimestamp();
      await userRef.set(userData);
    } else {
      await userRef.update({ lastLogin: userData.lastLogin });
    }

    res.json(userData);
  } catch (error) {
    res.status(401).json({ error: 'Validación de token fallida' });
  }
});

function pickValid(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

// Los navegadores envían el nombre de archivo del multipart en UTF-8, pero
// busboy/multer lo decodifican como latin1 por defecto: sin esto, cualquier
// tilde o ñ en el nombre llega corrupta ("transformación").
function fixFileNameEncoding(name) {
  try {
    return Buffer.from(name, 'latin1').toString('utf8');
  } catch {
    return name;
  }
}

function handleApiError(res, err) {
  console.error(err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'El archivo supera los 50 MB permitidos.', code: 'FILE_TOO_LARGE' });
  }
  const status = err.status || (err.code === 'NO_API_KEY' ? 412 : err.code === 'BAD_JSON' ? 502 : err.code === 'BAD_FORMAT' ? 400 : 500);
  const body = { error: err.message, code: err.code || 'UNKNOWN' };
  if (err.code === 'INSUFFICIENT_CREDITS') {
    body.credits = { balance: err.balance, cost: err.cost, unlimited: false };
  }
  res.status(status).json(body);
}

app.get('/api/licitaciones', requireAuth, async (req, res) => {
  const areaCodigo = String(req.query.area || '').toUpperCase();
  const q = String(req.query.q || '').trim().slice(0, 120);
  const result = await buscarLicitaciones({ areaCodigo, q: q || null });
  if (result.error) return res.status(400).json({ error: result.error, code: 'AREA_INVALIDA' });
  res.json(result);
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.', code: 'NOT_FOUND' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  handleApiError(res, err);
});

app.listen(PORT, () => {
  console.log(`K·AI Workspace MVP escuchando en http://localhost:${PORT}`);
  if (!hasApiKey()) {
    console.warn('⚠ OPENAI_API_KEY no configurada. Copia .env.example a .env para habilitar el análisis real.');
  }
  kb.init(); // indexa knowledge/ en segundo plano
});
