require('dotenv').config();
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const multer = require('multer');

const db = require('./lib/db');
const { extractText } = require('./lib/extract');
const { buildAnalysisPrompt, buildChatPrompt } = require('./lib/prompts');
const { callAnalysisJson, callChat, hasApiKey } = require('./lib/llm');

const app = express();
const PORT = process.env.PORT || 8080;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB, matches the reviewed BEP prototype's stated limit
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, hasApiKey: hasApiKey() });
});

app.get('/api/analyses', (req, res) => {
  res.json(db.listAnalyses());
});

app.get('/api/analyses/:id', (req, res) => {
  const record = db.getAnalysis(req.params.id);
  if (!record) return res.status(404).json({ error: 'Análisis no encontrado.' });
  res.json(record);
});

app.post('/api/analyze', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo.' });

    const { tipo = 'BEP', normativa = 'ISO 19650-2:2018', especialidad = 'BIM Management', nivel = 'Estándar' } = req.body;

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
    res.json(record);
  } catch (err) {
    console.error(err);
    const status = err.code === 'NO_API_KEY' ? 412 : 500;
    res.status(status).json({ error: err.message, code: err.code || 'UNKNOWN' });
  }
});

app.post('/api/analyses/:id/chat', async (req, res) => {
  try {
    const record = db.getAnalysis(req.params.id);
    if (!record) return res.status(404).json({ error: 'Análisis no encontrado.' });

    const { riskId, question } = req.body;
    if (!question || !question.trim()) return res.status(400).json({ error: 'Pregunta vacía.' });

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
    console.error(err);
    const status = err.code === 'NO_API_KEY' ? 412 : 500;
    res.status(status).json({ error: err.message, code: err.code || 'UNKNOWN' });
  }
});

app.listen(PORT, () => {
  console.log(`K·AI Workspace MVP escuchando en http://localhost:${PORT}`);
  if (!hasApiKey()) {
    console.warn('⚠ OPENAI_API_KEY no configurada. Copia .env.example a .env para habilitar el análisis real.');
  }
});
