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

const app = express();
const PORT = process.env.PORT || 8080;
const FREE_TRIAL_LIMIT = Number(process.env.FREE_TRIAL_LIMIT || 5);

const TIPOS = ['EIR', 'BEP', 'IFC / Modelo BIM', 'Memoria técnica', 'Verificación ISO'];
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
app.use(express.static(publicDir));

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

function trialStatus() {
  const used = db.listAnalyses().length;
  return { used, limit: FREE_TRIAL_LIMIT, remaining: Math.max(0, FREE_TRIAL_LIMIT - used) };
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
  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    req.user = { uid: decodedToken.uid, role: 'user', email: decodedToken.email };
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token inválido o expirado.', code: 'INVALID_TOKEN' });
  }
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, hasApiKey: hasApiKey(), model: process.env.OPENAI_MODEL || 'gpt-4o-mini', trial: trialStatus() });
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

app.post('/api/analyze', analyzeLimiter, requireAuth, upload.single('file'), async (req, res) => {
  try {
    
    const recordId = crypto.randomUUID();
    const record = {
      fileName,
      fileSizeBytes: req.file.size,
      tipo, normativa, especialidad, nivel,
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
    res.json({ id: recordId, ...record });
  } catch (err) {
    handleApiError(res, err);
  }
});

app.post('/api/analyses/:id/chat', chatLimiter, requireAuth, async (req, res) => {
  try {
    const analysisRef = firestore.collection('users').doc(req.user.uid).collection('analyses').doc(req.params.id);
    const doc = await analysisRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Análisis no encontrado.' });

    const record = doc.data();
    // ... tu lógica de validación del riskId y pregunta intacta ...

    // ... llamada al LLM (callChat) ...

    const newChatLog = {
      question,
      answer: content, // respuesta del LLM
      at: new Date().toISOString(),
      usage
    };

    // Usar la actualización con notación de puntos o reescribiendo el objeto
    const chatLogs = record.chatLogs || {};
    if (!chatLogs[riskId]) chatLogs[riskId] = [];
    chatLogs[riskId].push(newChatLog);

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
// tilde o ñ en el nombre llega corrupta ("transformaciÃ³n").
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
  const status = err.code === 'NO_API_KEY' ? 412 : err.code === 'BAD_JSON' ? 502 : err.code === 'BAD_FORMAT' ? 400 : 500;
  res.status(status).json({ error: err.message, code: err.code || 'UNKNOWN' });
}

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
});
