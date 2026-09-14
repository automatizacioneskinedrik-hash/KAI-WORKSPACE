/* K·AI Workspace — AI Technical Reviewer (MVP)
   Frontend lógico: navegación de pantallas + llamadas reales al backend. */

const state = {
  tipo: 'BEP',
  nivel: 'Estándar',
  selectedFile: null,
  currentRecord: null,
  currentRiskId: null,
  trial: null,
  role: 'estudiante'
};

/* ===== Navegación ===== */
const crumbs = {
  home: '<b>AI Skills</b>',
  usecase: 'AI Skills <span class="sep">/</span> <b>AI Technical Reviewer</b>',
  upload: 'AI Skills <span class="sep">/</span> AI Technical Reviewer <span class="sep">/</span> <b>Subir documento</b>',
  processing: 'AI Skills <span class="sep">/</span> AI Technical Reviewer <span class="sep">/</span> <b>Analizando…</b>',
  results: 'AI Skills <span class="sep">/</span> AI Technical Reviewer <span class="sep">/</span> <b>Informe</b>',
  history: '<b>Historial</b>',
  progress: '<b>Mi progreso</b>',
  admin: '<b>Administración</b> <span class="sep">/</span> System prompt'
};

function goTo(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const screen = document.getElementById(id);
  screen.classList.add('active');
  document.getElementById('crumb').innerHTML = crumbs[id] || '<b>AI Skills</b>';
  document.querySelector('.content').scrollTop = 0;

  document.getElementById('navHome').classList.toggle('active', id === 'home' || id === 'usecase' || id === 'upload' || id === 'processing' || id === 'results');
  document.getElementById('navHistory').classList.toggle('active', id === 'history');
  document.getElementById('navProgress').classList.toggle('active', id === 'progress');
  const navAdmin = document.getElementById('navAdmin');
  if (navAdmin) navAdmin.classList.toggle('active', id === 'admin');

  if (id === 'history') loadHistory(true);
  if (id === 'home') loadHomeStats();
  if (id === 'progress') loadProgress();
  if (id === 'admin') loadAdminPrompt();
  revealIn(screen);
}

/* ===== Entrance animations + count-up ===== */
function revealIn(scope) {
  const els = (scope || document).querySelectorAll('.reveal:not(.in)');
  els.forEach(el => el.classList.remove('in'));
  // force reflow so the transition replays even if the nodes were already in the DOM
  void (scope || document.body).offsetHeight;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => els.forEach(el => el.classList.add('in')));
  });
}

function animateNumber(el, target, duration = 700) {
  const from = 0;
  const start = performance.now();
  const isInt = Number.isInteger(target);
  function tick(now) {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    const value = from + (target - from) * eased;
    el.textContent = isInt ? Math.round(value) : value.toFixed(0);
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = String(target);
  }
  requestAnimationFrame(tick);
}

/* ===== API status ===== */
async function checkApiStatus() {
  const chip = document.getElementById('apiStatusChip');
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    if (data.hasApiKey) {
      chip.textContent = `● IA conectada · ${data.model || 'gpt-4o-mini'}`;
      chip.className = 'chip chip-green';
    } else {
      chip.textContent = '● Sin OPENAI_API_KEY — configura .env';
      chip.className = 'chip chip-red';
    }
    if (data.trial) renderTrialChip(data.trial);
  } catch {
    chip.textContent = '● Backend no disponible';
    chip.className = 'chip chip-red';
  }
}

function renderTrialChip(trial) {
  state.trial = trial;
  const chip = document.getElementById('trialChip');
  chip.hidden = false;
  chip.textContent = `Prueba gratuita: ${trial.used}/${trial.limit} análisis usados`;
  chip.className = trial.remaining > 0 ? 'chip chip-gold' : 'chip chip-red';
  const analyzeBtn = document.getElementById('analyzeBtn');
  if (trial.remaining <= 0) {
    analyzeBtn.disabled = true;
    analyzeBtn.title = 'Límite de prueba gratuita alcanzado';
  } else if (state.selectedFile) {
    analyzeBtn.disabled = false;
    analyzeBtn.title = '';
  }
}

/* ===== Use case ===== */
function selectUsecase(el) {
  document.querySelectorAll('.usecase').forEach(u => u.classList.remove('selected'));
  el.classList.add('selected');
  state.tipo = el.dataset.tipo;
}

/* ===== Upload ===== */
const dropzone = document.getElementById('dropzone');
['dragenter', 'dragover'].forEach(evt =>
  dropzone.addEventListener(evt, e => { e.preventDefault(); dropzone.classList.add('dragover'); })
);
['dragleave', 'drop'].forEach(evt =>
  dropzone.addEventListener(evt, e => { e.preventDefault(); dropzone.classList.remove('dragover'); })
);
dropzone.addEventListener('drop', e => {
  const file = e.dataTransfer.files[0];
  if (file) onFilePicked(file);
});

function onFilePicked(file) {
  hideError();
  if (!file) return;
  const okExt = /\.(pdf|docx)$/i.test(file.name);
  if (!okExt) {
    showError('Formato no soportado. Usa un archivo PDF o DOCX.');
    return;
  }
  if (file.size > 50 * 1024 * 1024) {
    showError('El archivo supera los 50 MB permitidos.');
    return;
  }
  state.selectedFile = file;
  document.getElementById('fileRow').classList.add('visible');
  document.getElementById('fileIcon').textContent = file.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'DOC';
  document.getElementById('fileName').textContent = file.name;
  document.getElementById('fileMeta').textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB · subido ahora`;
  document.getElementById('analyzeBtn').disabled = false;
}

function selectLevel(el) {
  document.querySelectorAll('.level-opt').forEach(l => l.classList.remove('selected'));
  el.classList.add('selected');
  state.nivel = el.dataset.nivel;
}

function showError(msg) {
  const box = document.getElementById('errorBox');
  box.textContent = msg;
  box.style.display = 'block';
}
function hideError() {
  document.getElementById('errorBox').style.display = 'none';
}

/* ===== Analysis (real backend call) ===== */
async function startAnalysis() {
  if (!state.selectedFile) return;
  hideError();
  goTo('processing');

  const steps = [...document.querySelectorAll('#procSteps .proc-step')];
  steps.forEach(s => s.classList.remove('running', 'done'));
  let stepTimer = null;
  let i = 0;
  function tickStep() {
    if (i > 0) steps[i - 1].classList.replace('running', 'done');
    if (i >= steps.length) return;
    steps[i].classList.add('running');
    i++;
    stepTimer = setTimeout(tickStep, 1400);
  }
  tickStep();

  const form = new FormData();
  form.append('file', state.selectedFile);
  form.append('tipo', state.tipo);
  form.append('normativa', document.getElementById('normativa').value);
  form.append('especialidad', document.getElementById('especialidad').value);
  form.append('nivel', state.nivel);

  let data = null;
  try {
    const res = await fetch('/api/analyze', { method: 'POST', body: form });
    data = await res.json();
    clearTimeout(stepTimer);

    if (!res.ok) {
      if (data.trial) renderTrialChip(data.trial);
      throw new Error(data.error || 'Error desconocido al analizar el documento.');
    }

    steps.forEach(s => { s.classList.remove('running'); s.classList.add('done'); });
    state.currentRecord = data;
    if (data.trial) renderTrialChip(data.trial);
    renderResults(data);
    setTimeout(() => goTo('results'), 400);
  } catch (err) {
    clearTimeout(stepTimer);
    goTo('upload');
    showError(err.message || 'No se pudo completar el análisis.');
  }
}

/* ===== Results rendering ===== */
function renderResults(record) {
  const r = record.result;

  document.getElementById('resTitle').textContent = `Informe de revisión · ${record.fileName}`;
  document.getElementById('resSub').textContent =
    `${record.normativa} · ${record.especialidad} · Nivel ${record.nivel} · ${new Date(record.createdAt).toLocaleString('es-ES')}`;

  const score = Number.isFinite(r.score) ? Math.max(0, Math.min(100, Math.round(r.score))) : 0;
  const scoreNumEl = document.getElementById('scoreNum');
  scoreNumEl.innerHTML = `<span id="scoreNumVal">0</span><small>/ 100</small>`;
  animateNumber(document.getElementById('scoreNumVal'), score, 1000);
  const circumference = 295.3;
  const scoreArc = document.getElementById('scoreArc');
  scoreArc.setAttribute('stroke-dashoffset', String(circumference));
  requestAnimationFrame(() => requestAnimationFrame(() => {
    scoreArc.setAttribute('stroke-dashoffset', String(circumference - (circumference * score) / 100));
  }));
  document.getElementById('scoreCaption').textContent = r.summary ? truncate(r.summary, 140) : '—';

  const risks = r.risks || [];
  const checklist = r.checklist || [];
  const correct = r.correct_sections || [];
  const recs = r.recommendations || [];
  const checklistIssues = checklist.filter(c => c.status !== 'ok').length;

  setKpi('kpiRisks', 'kpiRisksBar', risks.length, Math.max(risks.length, 1) * 8);
  setKpi('kpiChecklistFail', 'kpiChecklistBar', checklistIssues, Math.max(checklist.length, 1));
  setKpi('kpiCorrect', 'kpiCorrectBar', correct.length, Math.max(correct.length, 1));
  setKpi('kpiRecs', 'kpiRecsBar', recs.length, Math.max(recs.length, 1));

  document.getElementById('summaryText').textContent = r.summary || 'Sin resumen disponible.';

  document.getElementById('riskCountChip').textContent = `${risks.length} · ordenados por severidad`;
  const riskList = document.getElementById('riskList');
  riskList.innerHTML = '';
  if (!risks.length) {
    riskList.appendChild(emptyRow('No se detectaron riesgos.'));
  }
  risks.forEach((risk, idx) => {
    const row = document.createElement('div');
    row.className = 'risk-item reveal';
    row.style.setProperty('--d', idx);
    row.style.setProperty('--sev-color', risk.severity === 'alto' ? 'var(--red)' : risk.severity === 'medio' ? 'var(--amber)' : 'var(--blue)');
    row.onclick = () => openDetail(risk.id);

    const sev = document.createElement('span');
    sev.className = `sev sev-${risk.severity}`;
    row.appendChild(sev);

    const mid = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'risk-title';
    title.textContent = risk.title;
    const loc = document.createElement('div');
    loc.className = 'risk-loc';
    loc.textContent = risk.location || '';
    mid.appendChild(title);
    mid.appendChild(loc);
    row.appendChild(mid);

    const chip = document.createElement('span');
    chip.className = `chip ${sevChipClass(risk.severity)}`;
    chip.textContent = sevLabel(risk.severity);
    row.appendChild(chip);

    const arrow = document.createElement('span');
    arrow.className = 'risk-arrow';
    arrow.textContent = '→';
    row.appendChild(arrow);

    riskList.appendChild(row);
  });

  const recList = document.getElementById('recList');
  recList.innerHTML = '';
  if (!recs.length) recList.appendChild(emptyRow('Sin recomendaciones.'));
  recs.forEach((rec, idx) => {
    const row = document.createElement('div');
    row.className = 'rec-item reveal';
    row.style.setProperty('--d', idx);
    const num = document.createElement('span');
    num.className = 'rec-num';
    num.textContent = String(idx + 1);
    const text = document.createElement('div');
    text.textContent = rec;
    row.appendChild(num);
    row.appendChild(text);
    recList.appendChild(row);
  });

  document.getElementById('checklistChip').textContent = `${checklist.length - checklistIssues}/${checklist.length} ✓`;
  const checklistEl = document.getElementById('checklist');
  checklistEl.innerHTML = '';
  if (!checklist.length) checklistEl.appendChild(emptyRow('Sin checklist disponible.'));
  checklist.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'check-item reveal';
    row.style.setProperty('--d', idx);
    const ico = document.createElement('span');
    ico.className = `check-ico ${checkIcoClass(item.status)}`;
    ico.textContent = checkIcoSymbol(item.status);
    const label = document.createElement('span');
    label.textContent = item.item;
    const ref = document.createElement('span');
    ref.className = 'check-ref';
    ref.textContent = item.ref || '';
    row.appendChild(ico);
    row.appendChild(label);
    row.appendChild(ref);
    checklistEl.appendChild(row);
  });

  document.getElementById('correctChip').textContent = String(correct.length);
  const correctEl = document.getElementById('correctList');
  correctEl.innerHTML = '';
  if (!correct.length) correctEl.appendChild(emptyRow('Sin apartados marcados como correctos.'));
  correct.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'check-item reveal';
    row.style.setProperty('--d', idx);
    const ico = document.createElement('span');
    ico.className = 'check-ico check-ok';
    ico.textContent = '✓';
    const label = document.createElement('span');
    label.textContent = item;
    row.appendChild(ico);
    row.appendChild(label);
    correctEl.appendChild(row);
  });
}

function emptyRow(text) {
  const div = document.createElement('div');
  div.style.padding = '14px 20px';
  div.style.color = 'var(--text-3)';
  div.style.fontSize = '13px';
  div.textContent = text;
  return div;
}
function setKpi(numId, barId, value, base) {
  animateNumber(document.getElementById(numId), value, 800);
  const pct = Math.min(100, Math.round((value / base) * 100));
  const bar = document.getElementById(barId);
  requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.width = pct + '%'; }));
}
function sevChipClass(sev) {
  return sev === 'alto' ? 'chip-red' : sev === 'medio' ? 'chip-amber' : 'chip-blue';
}
function sevLabel(sev) {
  return sev === 'alto' ? 'Alto' : sev === 'medio' ? 'Medio' : 'Bajo';
}
function checkIcoClass(status) {
  return status === 'ok' ? 'check-ok' : status === 'warn' ? 'check-warn' : 'check-fail';
}
function checkIcoSymbol(status) {
  return status === 'ok' ? '✓' : status === 'warn' ? '!' : '✕';
}
function truncate(str, n) {
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
}

/* ===== Detail drawer + chat ===== */
function openDetail(riskId) {
  const record = state.currentRecord;
  if (!record) return;
  const risk = (record.result.risks || []).find(r => r.id === riskId);
  if (!risk) return;

  state.currentRiskId = riskId;

  document.getElementById('dSev').textContent = `Riesgo ${risk.severity}`;
  document.getElementById('dSev').className = `chip ${sevChipClass(risk.severity)}`;
  document.getElementById('dLoc').textContent = risk.location || '';
  document.getElementById('dTitle').textContent = risk.title;
  document.getElementById('dExp').textContent = risk.explanation;
  document.getElementById('dNorm').textContent = risk.normative_reference || '—';
  document.getElementById('dFix').textContent = risk.suggested_fix || '—';

  const quoteSection = document.getElementById('dQuoteSection');
  if (risk.quote) {
    quoteSection.style.display = 'block';
    document.getElementById('dQuote').textContent = risk.quote;
  } else {
    quoteSection.style.display = 'none';
  }

  const log = document.getElementById('askLog');
  log.innerHTML = '';
  const existing = (record.chatLogs && record.chatLogs[riskId]) || [];
  if (existing.length) {
    log.classList.add('visible');
    for (const turn of existing) appendChatTurn(turn.question, turn.answer);
  } else {
    log.classList.remove('visible');
  }

  document.getElementById('overlay').classList.add('open');
  document.getElementById('drawer').classList.add('open');
}
function closeDetail() {
  document.getElementById('overlay').classList.remove('open');
  document.getElementById('drawer').classList.remove('open');
}

function appendChatTurn(question, answer) {
  const log = document.getElementById('askLog');
  const q = document.createElement('div');
  q.className = 'ask-msg q';
  q.textContent = 'Tú: ' + question;
  log.appendChild(q);
  const a = document.createElement('div');
  a.className = 'ask-msg a';
  a.textContent = answer;
  log.appendChild(a);
  log.scrollTop = log.scrollHeight;
}

async function ask(question) {
  question = (question || '').trim();
  if (!question) return;
  const record = state.currentRecord;
  const riskId = state.currentRiskId;
  if (!record || !riskId) return;

  const log = document.getElementById('askLog');
  log.classList.add('visible');
  const qDiv = document.createElement('div');
  qDiv.className = 'ask-msg q';
  qDiv.textContent = 'Tú: ' + question;
  log.appendChild(qDiv);
  log.scrollTop = log.scrollHeight;

  document.getElementById('askInput').value = '';
  const sendBtn = document.getElementById('askSendBtn');
  sendBtn.disabled = true;

  const pending = document.createElement('div');
  pending.className = 'ask-msg a';
  pending.innerHTML = 'Pensando <span class="typing-dots"><span></span><span></span><span></span></span>';
  log.appendChild(pending);
  log.scrollTop = log.scrollHeight;

  try {
    const res = await fetch(`/api/analyses/${record.id}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ riskId, question })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al consultar la IA.');

    pending.textContent = data.answer;

    record.chatLogs = record.chatLogs || {};
    record.chatLogs[riskId] = record.chatLogs[riskId] || [];
    record.chatLogs[riskId].push({ question, answer: data.answer });
  } catch (err) {
    pending.textContent = 'Error: ' + err.message;
  } finally {
    sendBtn.disabled = false;
  }
}

/* ===== History ===== */
async function loadHistory(render) {
  try {
    const res = await fetch('/api/analyses');
    const list = await res.json();
    document.getElementById('historyBadge').textContent = String(list.length);
    if (render) renderHistory(list);
    return list;
  } catch {
    return [];
  }
}

function renderHistory(list) {
  const empty = document.getElementById('historyEmpty');
  const container = document.getElementById('historyList');
  container.querySelectorAll('.history-row').forEach(el => el.remove());
  if (!list.length) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  list.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'history-row reveal';
    row.style.setProperty('--d', idx);
    row.onclick = () => openHistoryItem(item.id);

    const name = document.createElement('div');
    name.style.flex = '1';
    const title = document.createElement('div');
    title.className = 'history-name';
    title.textContent = item.fileName;
    const meta = document.createElement('div');
    meta.className = 'history-meta';
    const rc = item.riskCounts || {};
    meta.textContent = `${item.tipo} · ${item.normativa} · ${new Date(item.createdAt).toLocaleString('es-ES')} · Riesgos: ${rc.alto || 0} altos, ${rc.medio || 0} medios, ${rc.bajo || 0} bajos`;
    name.appendChild(title);
    name.appendChild(meta);
    row.appendChild(name);

    const score = document.createElement('span');
    score.className = 'chip chip-blue';
    score.textContent = Number.isFinite(item.score) ? `Score ${item.score}` : 'Score —';
    row.appendChild(score);

    container.appendChild(row);
  });
  revealIn(container);
}

async function openHistoryItem(id) {
  const res = await fetch(`/api/analyses/${id}`);
  if (!res.ok) return;
  const record = await res.json();
  state.currentRecord = record;
  renderResults(record);
  goTo('results');
}

/* ===== Home stats ===== */
async function loadHomeStats() {
  const list = await loadHistory(false);
  animateNumber(document.getElementById('statCount'), list.length, 600);

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentCount = list.filter(a => new Date(a.createdAt).getTime() >= weekAgo).length;
  const deltaEl = document.getElementById('statCountDelta');
  if (recentCount > 0) {
    deltaEl.hidden = false;
    deltaEl.textContent = `+${recentCount} esta semana`;
  } else {
    deltaEl.hidden = true;
  }

  const high = list.reduce((sum, a) => sum + ((a.riskCounts && a.riskCounts.alto) || 0), 0);
  const total = list.reduce((sum, a) => sum + Object.values(a.riskCounts || {}).reduce((s, n) => s + n, 0), 0);
  animateNumber(document.getElementById('statHigh'), high, 600);
  animateNumber(document.getElementById('statTotal'), total, 600);
  const scored = list.filter(a => Number.isFinite(a.score));
  const statScore = document.getElementById('statScore');
  if (scored.length) animateNumber(statScore, Math.round(scored.reduce((s, a) => s + a.score, 0) / scored.length), 600);
  else statScore.textContent = '—';
}

/* ===== Mi progreso (analítica real sobre el historial) ===== */
async function loadProgress() {
  let stats;
  try {
    const res = await fetch('/api/stats');
    stats = await res.json();
  } catch {
    return;
  }

  const empty = document.getElementById('progressEmpty');
  const content = document.getElementById('progressContent');
  if (!stats.totalAnalyses) {
    empty.style.display = 'block';
    content.style.display = 'none';
    return;
  }
  empty.style.display = 'none';
  content.style.display = 'block';

  animateNumber(document.getElementById('progTotal'), stats.totalAnalyses, 600);
  const avgScoreEl = document.getElementById('progAvgScore');
  if (Number.isFinite(stats.avgScore)) animateNumber(avgScoreEl, stats.avgScore, 600);
  else avgScoreEl.textContent = '—';
  const totalRisks = stats.riskTotals.alto + stats.riskTotals.medio + stats.riskTotals.bajo;
  animateNumber(document.getElementById('progTotalRisks'), totalRisks, 600);

  const trendEl = document.getElementById('progScoreTrend');
  trendEl.innerHTML = '';
  stats.scoreTrend.forEach((s, idx) => {
    const row = document.createElement('div');
    row.className = 'trend-row reveal';
    row.style.setProperty('--d', idx);
    row.innerHTML = `
      <div class="trend-info">
        <div class="trend-name">${escapeHtml(s.fileName)}</div>
        <div class="trend-date">${new Date(s.createdAt).toLocaleDateString('es-ES')}</div>
      </div>
      <div class="trend-bar-track"><i style="width:0%"></i></div>
      <div class="trend-score">${s.score}</div>`;
    trendEl.appendChild(row);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      row.querySelector('i').style.width = Math.max(3, s.score) + '%';
    }));
  });
  if (!stats.scoreTrend.length) trendEl.appendChild(emptyRow('Sin datos todavía.'));

  const sevEl = document.getElementById('progRiskSeverity');
  sevEl.innerHTML = '';
  const sevConfig = [
    ['alto', 'Alto', 'var(--red)'],
    ['medio', 'Medio', 'var(--amber)'],
    ['bajo', 'Bajo', 'var(--blue)']
  ];
  sevConfig.forEach(([key, label, color], idx) => {
    const count = stats.riskTotals[key] || 0;
    const pct = totalRisks ? Math.round((count / totalRisks) * 100) : 0;
    const row = document.createElement('div');
    row.className = 'sev-row reveal';
    row.style.setProperty('--d', idx);
    row.innerHTML = `<div class="sev-row-label">${label}</div><div class="sev-row-bar"><i style="width:0%;background:${color}"></i></div><div class="sev-row-num">${count}</div>`;
    sevEl.appendChild(row);
    requestAnimationFrame(() => requestAnimationFrame(() => { row.querySelector('i').style.width = pct + '%'; }));
  });

  const checkEl = document.getElementById('progChecklist');
  checkEl.innerHTML = '';
  const checklistTotal = stats.checklistTotals.ok + stats.checklistTotals.warn + stats.checklistTotals.fail;
  const checkConfig = [
    ['ok', 'Cumple', 'var(--green)'],
    ['warn', 'Aviso', 'var(--amber)'],
    ['fail', 'Falla', 'var(--red)']
  ];
  checkConfig.forEach(([key, label, color], idx) => {
    const count = stats.checklistTotals[key] || 0;
    const pct = checklistTotal ? Math.round((count / checklistTotal) * 100) : 0;
    const row = document.createElement('div');
    row.className = 'sev-row reveal';
    row.style.setProperty('--d', idx);
    row.innerHTML = `<div class="sev-row-label">${label}</div><div class="sev-row-bar"><i style="width:0%;background:${color}"></i></div><div class="sev-row-num">${count}</div>`;
    checkEl.appendChild(row);
    requestAnimationFrame(() => requestAnimationFrame(() => { row.querySelector('i').style.width = pct + '%'; }));
  });

  const topEl = document.getElementById('progTopRisks');
  topEl.innerHTML = '';
  if (!stats.topRisks.length) topEl.appendChild(emptyRow('Todavía no hay suficientes revisiones para detectar patrones.'));
  stats.topRisks.forEach((r, idx) => {
    const row = document.createElement('div');
    row.className = 'rec-item reveal';
    row.style.setProperty('--d', idx);
    const num = document.createElement('span');
    num.className = 'rec-num';
    num.textContent = String(r.count);
    const text = document.createElement('div');
    text.textContent = r.title;
    row.appendChild(num);
    row.appendChild(text);
    topEl.appendChild(row);
  });

  revealIn(content);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

/* ===== Admin: system prompt =====
   Sin backend de autenticación real todavía: el token de admin no vive en
   el código, lo pega el propio admin y se guarda solo en su navegador. */
function getAdminToken() {
  return localStorage.getItem('kaiAdminToken') || '';
}

function saveAdminToken() {
  const input = document.getElementById('adminTokenInput');
  localStorage.setItem('kaiAdminToken', input.value.trim());
  document.getElementById('adminStatus').textContent = 'Token guardado en este navegador.';
  loadAdminPrompt();
}

async function loadAdminPrompt() {
  const status = document.getElementById('adminStatus');
  const textarea = document.getElementById('adminPromptText');
  const tokenInput = document.getElementById('adminTokenInput');
  tokenInput.value = getAdminToken();

  const token = getAdminToken();
  if (!token) {
    status.textContent = 'Pega tu ADMIN_TOKEN arriba para cargar las instrucciones.';
    return;
  }
  status.textContent = 'Cargando…';
  try {
    const res = await fetch('/api/admin/prompt', { headers: { 'x-admin-token': token } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo cargar.');
    textarea.value = data.customInstructions || '';
    status.textContent = '';
  } catch (err) {
    status.textContent = 'Error: ' + err.message;
  }
}

async function saveAdminPrompt() {
  const status = document.getElementById('adminStatus');
  const textarea = document.getElementById('adminPromptText');
  const btn = document.getElementById('adminSaveBtn');
  const token = getAdminToken();
  if (!token) {
    status.textContent = 'Pega y guarda tu ADMIN_TOKEN arriba primero.';
    return;
  }
  btn.disabled = true;
  status.textContent = 'Guardando…';
  try {
    const res = await fetch('/api/admin/prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
      body: JSON.stringify({ customInstructions: textarea.value })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo guardar.');
    status.textContent = '✓ Guardado. Se aplicará en el próximo análisis o pregunta a la IA.';
  } catch (err) {
    status.textContent = 'Error: ' + err.message;
  } finally {
    btn.disabled = false;
  }
}

/* ===== Auth (login básico de demo, solo cliente — sin backend de usuarios real todavía) ===== */
const DEMO_ACCOUNTS = {
  testing: { pass: '123', role: 'estudiante' },
  admin: { pass: 'kinedrik2026', role: 'admin' }
};

function showApp(username, role) {
  state.role = role || 'estudiante';
  document.getElementById('loginScreen').hidden = true;
  document.getElementById('appRoot').hidden = false;
  document.getElementById('userName').textContent = username;
  document.getElementById('userAvatar').textContent = username.slice(0, 2).toUpperCase();
  document.getElementById('userRole').textContent = state.role === 'admin' ? 'Administrador' : 'Estudiante · MVP';
  document.getElementById('navAdminSection').hidden = state.role !== 'admin';
  document.getElementById('navAdmin').hidden = state.role !== 'admin';
  checkApiStatus();
  loadHomeStats();
  loadHistory(false);
  revealIn(document.getElementById('home'));
}

function handleLogin(event) {
  event.preventDefault();
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value;
  const errorBox = document.getElementById('loginError');
  const account = DEMO_ACCOUNTS[user];

  if (account && account.pass === pass) {
    errorBox.style.display = 'none';
    sessionStorage.setItem('kaiUser', user);
    sessionStorage.setItem('kaiRole', account.role);
    showApp(user, account.role);
  } else {
    errorBox.style.display = 'block';
  }
  return false;
}

function handleLogout() {
  sessionStorage.removeItem('kaiUser');
  sessionStorage.removeItem('kaiRole');
  document.getElementById('loginForm').reset();
  document.getElementById('loginError').style.display = 'none';
  document.getElementById('appRoot').hidden = true;
  document.getElementById('loginScreen').hidden = false;
}

/* ===== Init ===== */
const savedUser = sessionStorage.getItem('kaiUser');
if (savedUser && DEMO_ACCOUNTS[savedUser]) {
  showApp(savedUser, sessionStorage.getItem('kaiRole') || DEMO_ACCOUNTS[savedUser].role);
}
