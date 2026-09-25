// localStorage stays the source of truth game logic reads synchronously
// (a new record has to land on screen the instant a round ends, not
// after a network round-trip) — the backend API is a shared cache on
// top of it: synced down on startup so a record set on another device
// shows up here, and pushed up in the background whenever a new local
// record is set. Every call to the backend is best-effort: offline or
// with no backend running, the game plays exactly as before.
const PREFIX = 'arcadedopai_';
const SOUND_KEY = `${PREFIX}sound_enabled`;
const HAPTICS_KEY = `${PREFIX}haptics_enabled`;
const API_BASE = 'http://localhost:5001';

export const GameId = { TETRIS: 'tetris', ZUMA: 'zuma', CONNECT4: 'connect4', SEQUENCE: 'sequence' };

function highScoreKey(game) {
  return `${PREFIX}high_score_${game}`;
}

export function getHighScore(game) {
  const raw = localStorage.getItem(highScoreKey(game));
  return raw ? parseInt(raw, 10) : 0;
}

/// Saves [score] as the new high score only if it beats the current one.
/// Returns true when a new record was set. Synchronous — game code can
/// call this the moment a round ends and trust the result immediately.
export function reportScore(game, score) {
  const current = getHighScore(game);
  if (score > current) {
    localStorage.setItem(highScoreKey(game), String(score));
    _pushScoreInBackground(game, score);
    return true;
  }
  return false;
}

function _pushScoreInBackground(game, score) {
  fetch(`${API_BASE}/api/scores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ game, score }),
  }).catch(() => {
    // No backend reachable — the local record above already stuck, so
    // there's nothing more to do here.
  });
}

/// Pulls each game's all-time best from the backend and raises the local
/// record to match wherever the remote is ahead (e.g. a record set on
/// another device). Call once, early — e.g. from HomeScene.create().
/// Never throws: resolves quietly if the backend isn't reachable.
export async function syncRemoteScores() {
  try {
    const res = await fetch(`${API_BASE}/api/scores/best`);
    if (!res.ok) return;
    const remoteBest = await res.json();
    for (const [game, score] of Object.entries(remoteBest)) {
      if (typeof score === 'number' && score > getHighScore(game)) {
        localStorage.setItem(highScoreKey(game), String(score));
      }
    }
  } catch {
    // Offline or backend not running — keep whatever's local.
  }
}

/// Top [limit] scores for [game] from the backend, for a leaderboard
/// view. Returns [] (never throws) if the backend isn't reachable.
export async function fetchLeaderboard(game, limit = 5) {
  try {
    const res = await fetch(`${API_BASE}/api/scores?game=${encodeURIComponent(game)}&limit=${limit}`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export function getSoundEnabled() {
  const raw = localStorage.getItem(SOUND_KEY);
  return raw === null ? true : raw === 'true';
}

export function setSoundEnabled(value) {
  localStorage.setItem(SOUND_KEY, String(value));
}

export function getHapticsEnabled() {
  const raw = localStorage.getItem(HAPTICS_KEY);
  return raw === null ? true : raw === 'true';
}

export function setHapticsEnabled(value) {
  localStorage.setItem(HAPTICS_KEY, String(value));
}
