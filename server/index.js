require('dotenv').config();
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');

const db = require('./lib/db');
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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB, matches the reviewed BEP prototype's stated limit
});

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

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

app.get('/api/health', (req, res) => {
  res.json({ ok: true, hasApiKey: hasApiKey(), model: process.env.OPENAI_MODEL || 'gpt-4o-mini', trial: trialStatus() });
});

app.get('/api/analyses', (req, res) => {
  res.json(db.listAnalyses());
});

app.get('/api/analyses/:id', (req, res) => {
  const record = db.getAnalysis(req.params.id);
  if (!record) return res.status(404).json({ error: 'Análisis no encontrado.' });
  res.json(record);
});

app.post('/api/analyze', analyzeLimiter, upload.single('file'), async (req, res) => {
  try {
    const trial = trialStatus();
    if (trial.remaining <= 0) {
      return res.status(402).json({
        error: `Has alcanzado el límite de tu prueba gratuita (${FREE_TRIAL_LIMIT} análisis). Contacta con nosotros para continuar con un plan de pago.`,
        code: 'TRIAL_LIMIT_REACHED',
        trial
      });
    }

    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo.' });

    const tipo = pickValid(req.body.tipo, TIPOS, 'BEP');
    const normativa = pickValid(req.body.normativa, NORMATIVAS, 'ISO 19650-2:2018');
    const especialidad = pickValid(req.body.especialidad, ESPECIALIDADES, 'BIM Management');
    const nivel = pickValid(req.body.nivel, NIVELES, 'Estándar');

    const { text, truncated, fullLength } = await extractText(req.file.buffer, req.file.mimetype, req.file.originalname);

    const { system, user } = buildAnalysisPrompt({
      tipo, normativa, especialidad, nivel,
      fileName: req.file.originalname,
      text, truncated
    });

    const { result, usage, model } = await callAnalysisJson({ system, user });

    const riskCounts = { alto: 0, medio: 0, bajo: 0 };
    for (const r of result.risks || []) {
      if (riskCounts[r.severity] !== undefined) riskCounts[r.severity]++;
    }

    const record = {
      id: crypto.randomUUID(),
      fileName: req.file.originalname,
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

    db.insertAnalysis(record);
    res.json({ ...record, trial: trialStatus() });
  } catch (err) {
    handleApiError(res, err);
  }
});

app.post('/api/analyses/:id/chat', chatLimiter, async (req, res) => {
  try {
    const record = db.getAnalysis(req.params.id);
    if (!record) return res.status(404).json({ error: 'Análisis no encontrado.' });

    const { riskId, question } = req.body || {};
    if (!question || !question.trim()) return res.status(400).json({ error: 'Pregunta vacía.' });
    if (question.length > 2000) return res.status(400).json({ error: 'Pregunta demasiado larga (máx. 2000 caracteres).' });

    const risk = (record.result.risks || []).find(r => r.id === riskId);
    if (!risk) return res.status(404).json({ error: 'Riesgo no encontrado en este análisis.' });

    const { system, user } = buildChatPrompt({
      risk, question,
      tipo: record.tipo, normativa: record.normativa,
      docExcerpt: risk.quote
    });

    const { content, usage } = await callChat({ system, user, json: false });

    const chatLogs = record.chatLogs || {};
    chatLogs[riskId] = chatLogs[riskId] || [];
    chatLogs[riskId].push({ question, answer: content, at: new Date().toISOString(), usage });

    db.updateAnalysis(record.id, { chatLogs });
    res.json({ answer: content });
  } catch (err) {
    handleApiError(res, err);
  }
});

function pickValid(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
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
