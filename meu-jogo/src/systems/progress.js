// ═══════════════════════════════════════════════════════════
//  Progresso persistente (localStorage)
//  • fase desbloqueada mais alta
//  • snapshot do estado do jogador na ENTRADA de cada fase
//    (arma/vidas/score/bônus) → permite começar direto numa fase
//    liberada com o "estado anterior" em que você chegou nela.
// ═══════════════════════════════════════════════════════════

const UNLOCK_KEY = 'burgerRoyale_unlocked';
const SNAP_KEY   = lvl => `burgerRoyale_snap_${lvl}`;
const BEST_KEY   = 'burgerRoyale_best';
const DONE_KEY   = 'burgerRoyale_completed';

export function getUnlocked() {
  return Math.max(1, parseInt(localStorage.getItem(UNLOCK_KEY) || '1'));
}

export function unlockLevel(lvl) {
  if (lvl > getUnlocked()) localStorage.setItem(UNLOCK_KEY, String(lvl));
}

export function saveSnapshot(lvl, snap) {
  try { localStorage.setItem(SNAP_KEY(lvl), JSON.stringify(snap)); } catch (e) { /* quota */ }
}

export function loadSnapshot(lvl) {
  try {
    const raw = localStorage.getItem(SNAP_KEY(lvl));
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

export function isCompleted() {
  return localStorage.getItem(DONE_KEY) === '1';
}

export function markCompleted() {
  localStorage.setItem(DONE_KEY, '1');
}

export function getBest() {
  return parseInt(localStorage.getItem(BEST_KEY) || '0');
}

export function saveBest(score) {
  if (score > getBest()) { localStorage.setItem(BEST_KEY, String(score)); return true; }
  return false;
}
