const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'db.json');

function load() {
  if (!fs.existsSync(DB_PATH)) {
    return { analyses: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return { analyses: [] };
  }
}

function save(data) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function listAnalyses() {
  const { analyses } = load();
  return analyses
    .map(({ id, fileName, tipo, normativa, especialidad, nivel, createdAt, score, riskCounts }) => ({
      id, fileName, tipo, normativa, especialidad, nivel, createdAt, score, riskCounts
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getAnalysis(id) {
  const { analyses } = load();
  return analyses.find(a => a.id === id) || null;
}

function listFullAnalyses() {
  return load().analyses;
}

function insertAnalysis(record) {
  const data = load();
  data.analyses.push(record);
  save(data);
  return record;
}

function updateAnalysis(id, patch) {
  const data = load();
  const idx = data.analyses.findIndex(a => a.id === id);
  if (idx === -1) return null;
  data.analyses[idx] = { ...data.analyses[idx], ...patch };
  save(data);
  return data.analyses[idx];
}

module.exports = { listAnalyses, getAnalysis, listFullAnalyses, insertAnalysis, updateAnalysis };
