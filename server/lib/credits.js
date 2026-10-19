// Créditos por usuario y prueba gratuita limitada por IP.
// - Cada cuenta registrada recibe TRIAL_CREDITS (15) solo si su IP aún no reclamó la prueba.
//   Así crear otro correo desde la misma IP no da créditos nuevos.
// - Un análisis cuesta ANALYSIS_COST (15) créditos.
// - Los administradores (rol admin) tienen créditos ilimitados.
// Los saldos viven en Firestore (colección "credits"); las IPs reclamadas en "ipTrials".

const crypto = require('crypto');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const TRIAL_CREDITS = Number(process.env.TRIAL_CREDITS || 15);
const ANALYSIS_COST = Number(process.env.ANALYSIS_COST || 15);
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

function roleForEmail(email) {
  return email && ADMIN_EMAILS.includes(String(email).toLowerCase()) ? 'admin' : 'user';
}

function isAdmin(user) {
  return user?.role === 'admin';
}

function ipHash(ip) {
  return crypto.createHash('sha256').update(String(ip || 'unknown')).digest('hex').slice(0, 40);
}

function insufficient(balance) {
  const err = new Error(
    `Necesitas ${ANALYSIS_COST} créditos para generar un análisis y tienes ${balance}. ` +
    'La recarga de créditos estará disponible próximamente.'
  );
  err.status = 402;
  err.code = 'INSUFFICIENT_CREDITS';
  err.balance = balance;
  err.cost = ANALYSIS_COST;
  return err;
}

// Crea la cuenta de créditos la primera vez (aplica la prueba por IP).
async function ensureAccount(uid, ip) {
  const db = getFirestore();
  const accRef = db.collection('credits').doc(uid);
  const ipRef = db.collection('ipTrials').doc(ipHash(ip));

  await db.runTransaction(async tx => {
    const acc = await tx.get(accRef);
    if (acc.exists && acc.data().initialized) return;
    const ipSnap = await tx.get(ipRef);

    const claimedByOther = ipSnap.exists && ipSnap.data().claimedBy !== uid;
    const grant = claimedByOther ? 0 : TRIAL_CREDITS;

    if (!ipSnap.exists) {
      tx.set(ipRef, { claimedBy: uid, claimedAt: FieldValue.serverTimestamp() });
    }
    tx.set(accRef, {
      balance: grant,
      initialized: true,
      trialGranted: grant > 0,
      createdAt: FieldValue.serverTimestamp()
    }, { merge: true });
  });
}

async function getStatus(user, ip) {
  if (isAdmin(user)) {
    return { unlimited: true, balance: null, cost: ANALYSIS_COST, trialCredits: TRIAL_CREDITS };
  }
  await ensureAccount(user.uid, ip);
  const snap = await getFirestore().collection('credits').doc(user.uid).get();
  return {
    unlimited: false,
    balance: snap.data()?.balance ?? 0,
    cost: ANALYSIS_COST,
    trialCredits: TRIAL_CREDITS,
    trialGranted: Boolean(snap.data()?.trialGranted)
  };
}

// Descuenta el costo antes de analizar. Devuelve la reserva para poder devolverla si falla.
async function reserve(user, ip) {
  if (isAdmin(user)) return { charged: 0, unlimited: true };
  await ensureAccount(user.uid, ip);
  const db = getFirestore();
  const ref = db.collection('credits').doc(user.uid);

  const balance = await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const current = snap.data()?.balance ?? 0;
    if (current < ANALYSIS_COST) throw insufficient(current);
    tx.update(ref, { balance: current - ANALYSIS_COST, updatedAt: FieldValue.serverTimestamp() });
    return current - ANALYSIS_COST;
  });

  return { charged: ANALYSIS_COST, uid: user.uid, balance, unlimited: false };
}

async function refund(reservation) {
  if (!reservation || !reservation.charged) return;
  await getFirestore().collection('credits').doc(reservation.uid).update({
    balance: FieldValue.increment(reservation.charged)
  });
}

module.exports = {
  ANALYSIS_COST,
  TRIAL_CREDITS,
  roleForEmail,
  isAdmin,
  getStatus,
  reserve,
  refund
};
