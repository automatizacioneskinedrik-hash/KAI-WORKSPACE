/* K·AI Workspace — AI Technical Reviewer (MVP)
   Frontend lógico: navegación de pantallas + llamadas reales al backend. */

const state = {
  tipo: 'BEP',
  nivel: 'Estándar',
  selectedFile: null,
  currentRecord: null,
  currentRiskId: null
};

/* ===== Navegación ===== */
const crumbs = {
  home: '<b>AI Skills</b>',
  usecase: 'AI Skills <span class="sep">/</span> <b>AI Technical Reviewer</b>',
  upload: 'AI Skills <span class="sep">/</span> AI Technical Reviewer <span class="sep">/</span> <b>Subir documento</b>',
  processing: 'AI Skills <span class="sep">/</span> AI Technical Reviewer <span class="sep">/</span> <b>Analizando…</b>',
  results: 'AI Skills <span class="sep">/</span> AI Technical Reviewer <span class="sep">/</span> <b>Informe</b>',
  history: '<b>Historial</b>'
};

function goTo(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.getElementById('crumb').innerHTML = crumbs[id] || '<b>AI Skills</b>';
  document.querySelector('.content').scrollTop = 0;

  document.getElementById('navHome').classList.toggle('active', id === 'home' || id === 'usecase' || id === 'upload' || id === 'processing' || id === 'results');
  document.getElementById('navHistory').classList.toggle('active', id === 'history');

  if (id === 'history') loadHistory(true);
  if (id === 'home') loadHomeStats();
}

/* ===== API status ===== */
async function checkApiStatus() {
  const chip = document.getElementById('apiStatusChip');
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    if (data.hasApiKey) {
      chip.textContent = '● IA conectada';
      chip.className = 'chip chip-green';
    } else {
      chip.textContent = '● Sin OPENAI_API_KEY — configura .env';
      chip.className = 'chip chip-red';
    }
  } catch {
    chip.textContent = '● Backend no disponible';
    chip.className = 'chip chip-red';
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

  try {
    const res = await fetch('/api/analyze', { method: 'POST', body: form });
    const data = await res.json();
    clearTimeout(stepTimer);

    if (!res.ok) {
      throw new Error(data.error || 'Error desconocido al analizar el documento.');
    }

    steps.forEach(s => { s.classList.remove('running'); s.classList.add('done'); });
    state.currentRecord = data;
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
  document.getElementById('scoreNum').innerHTML = `${score}<small>/ 100</small>`;
  const circumference = 251;
  document.getElementById('scoreArc').setAttribute('stroke-dashoffset', String(circumference - (circumference * score) / 100));
  document.getElementById('scoreCaption').textContent = r.summary ? truncate(r.summary, 140) : '—';

  const risks = r.risks || [];
  const checklist = r.checklist || [];
  const correct = r.correct_sections || [];
  const recs = r.recommendations || [];
  const checklistIssues = checklist.filter(c => c.status !== 'ok').length;

  setKpi('kpiRisks', 'kpiRisksBar', risks.length, Math.max(risks.length, 1) * 8, 'var(--red)');
  setKpi('kpiChecklistFail', 'kpiChecklistBar', checklistIssues, Math.max(checklist.length, 1), 'var(--amber)');
  setKpi('kpiCorrect', 'kpiCorrectBar', correct.length, Math.max(correct.length, 1), 'var(--green)');
  setKpi('kpiRecs', 'kpiRecsBar', recs.length, Math.max(recs.length, 1), 'var(--purple)');

  document.getElementById('summaryText').textContent = r.summary || 'Sin resumen disponible.';

  document.getElementById('riskCountChip').textContent = `${risks.length} · ordenados por severidad`;
  const riskList = document.getElementById('riskList');
  riskList.innerHTML = '';
  if (!risks.length) {
    riskList.appendChild(emptyRow('No se detectaron riesgos.'));
  }
  for (const risk of risks) {
    const row = document.createElement('div');
    row.className = 'risk-item';
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
  }

  const recList = document.getElementById('recList');
  recList.innerHTML = '';
  if (!recs.length) recList.appendChild(emptyRow('Sin recomendaciones.'));
  recs.forEach((rec, idx) => {
    const row = document.createElement('div');
    row.className = 'rec-item';
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
  for (const item of checklist) {
    const row = document.createElement('div');
    row.className = 'check-item';
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
  }

  document.getElementById('correctChip').textContent = String(correct.length);
  const correctEl = document.getElementById('correctList');
  correctEl.innerHTML = '';
  if (!correct.length) correctEl.appendChild(emptyRow('Sin apartados marcados como correctos.'));
  for (const item of correct) {
    const row = document.createElement('div');
    row.className = 'check-item';
    const ico = document.createElement('span');
    ico.className = 'check-ico check-ok';
    ico.textContent = '✓';
    const label = document.createElement('span');
    label.textContent = item;
    row.appendChild(ico);
    row.appendChild(label);
    correctEl.appendChild(row);
  }
}

function emptyRow(text) {
  const div = document.createElement('div');
  div.style.padding = '14px 20px';
  div.style.color = 'var(--text-3)';
  div.style.fontSize = '13px';
  div.textContent = text;
  return div;
}
function setKpi(numId, barId, value, base, color) {
  document.getElementById(numId).textContent = String(value);
  const pct = Math.min(100, Math.round((value / base) * 100));
  const bar = document.getElementById(barId);
  bar.style.width = pct + '%';
  bar.style.background = color;
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
  pending.textContent = 'Pensando…';
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
  for (const item of list) {
    const row = document.createElement('div');
    row.className = 'history-row';
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
  }
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
  document.getElementById('statCount').textContent = String(list.length);
  const high = list.reduce((sum, a) => sum + ((a.riskCounts && a.riskCounts.alto) || 0), 0);
  const total = list.reduce((sum, a) => sum + Object.values(a.riskCounts || {}).reduce((s, n) => s + n, 0), 0);
  document.getElementById('statHigh').textContent = String(high);
  document.getElementById('statTotal').textContent = String(total);
  const scored = list.filter(a => Number.isFinite(a.score));
  document.getElementById('statScore').textContent = scored.length
    ? Math.round(scored.reduce((s, a) => s + a.score, 0) / scored.length)
    : '—';
}

/* ===== Auth (login básico de demo, solo cliente) ===== */
const DEMO_USER = 'testing';
const DEMO_PASS = '123';

function showApp(username) {
  document.getElementById('loginScreen').hidden = true;
  document.getElementById('appRoot').hidden = false;
  document.getElementById('userName').textContent = username;
  document.getElementById('userAvatar').textContent = username.slice(0, 2).toUpperCase();
  checkApiStatus();
  loadHomeStats();
  loadHistory(false);
}

function handleLogin(event) {
  event.preventDefault();
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value;
  const errorBox = document.getElementById('loginError');

  if (user === DEMO_USER && pass === DEMO_PASS) {
    errorBox.style.display = 'none';
    sessionStorage.setItem('kaiUser', user);
    showApp(user);
  } else {
    errorBox.style.display = 'block';
  }
  return false;
}

function handleLogout() {
  sessionStorage.removeItem('kaiUser');
  document.getElementById('loginForm').reset();
  document.getElementById('loginError').style.display = 'none';
  document.getElementById('appRoot').hidden = true;
  document.getElementById('loginScreen').hidden = false;
}

/* ===== Init ===== */
const savedUser = sessionStorage.getItem('kaiUser');
if (savedUser === DEMO_USER) {
  showApp(savedUser);
}

window.goTo = goTo;
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
window.selectUsecase = selectUsecase;
window.onFilePicked = onFilePicked;
window.selectLevel = selectLevel;
window.startAnalysis = startAnalysis;
window.openDetail = openDetail;
window.closeDetail = closeDetail;
window.ask = ask;
