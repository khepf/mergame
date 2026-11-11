// One shared Web Audio context for all synthesized sounds (fountain, cave, ...).
// Browsers only allow audio to start after the player interacts with the page,
// so call unlockAudio() from a key press or click.

let ctx = null;

export function getAudioContext() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  return ctx;
}

export function unlockAudio() {
  const c = getAudioContext();
  if (c?.state === 'suspended') c.resume();
  return c;
}
