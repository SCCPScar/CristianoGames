// Thin wrapper around localStorage: local-only persistence for high
// scores and the two settings toggles. No backend, no login.
const PREFIX = 'arcadedopai_';
const SOUND_KEY = `${PREFIX}sound_enabled`;
const HAPTICS_KEY = `${PREFIX}haptics_enabled`;

export const GameId = { TETRIS: 'tetris', ZUMA: 'zuma' };

function highScoreKey(game) {
  return `${PREFIX}high_score_${game}`;
}

export function getHighScore(game) {
  const raw = localStorage.getItem(highScoreKey(game));
  return raw ? parseInt(raw, 10) : 0;
}

/// Saves [score] as the new high score only if it beats the current one.
/// Returns true when a new record was set.
export function reportScore(game, score) {
  const current = getHighScore(game);
  if (score > current) {
    localStorage.setItem(highScoreKey(game), String(score));
    return true;
  }
  return false;
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
