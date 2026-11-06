/**
 * Spoken cues for the workout player. Uses the device voice (offline on iPhone).
 * Urdu speaks only when an Urdu voice is installed; otherwise English.
 * Beeps + vibration work even with voice off.
 */
let ctx: AudioContext | null = null;

function pickVoice(lang: 'en' | 'ur'): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === 'undefined') return null;
  const voices = speechSynthesis.getVoices();
  if (lang === 'ur') return voices.find((v) => v.lang.toLowerCase().startsWith('ur')) ?? null;
  return voices.find((v) => /^en[-_](in|gb|us)/i.test(v.lang)) ?? voices.find((v) => v.lang.startsWith('en')) ?? null;
}

export function hasUrduVoice(): boolean {
  return pickVoice('ur') != null;
}

/** Speak `en`, or `ur` when the app is in Urdu and an Urdu voice exists. */
export function speak(en: string, ur?: string, lang: 'en' | 'ur' = 'en') {
  if (typeof speechSynthesis === 'undefined') return;
  const useUr = lang === 'ur' && ur != null && hasUrduVoice();
  const u = new SpeechSynthesisUtterance(useUr ? ur : en);
  const v = pickVoice(useUr ? 'ur' : 'en');
  if (v) {
    u.voice = v;
    u.lang = v.lang;
  }
  u.rate = 0.95;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
}

/** Short tone; `high` for "go". Must first run inside a tap (iOS unlocks audio on gesture). */
export function beep(high = false) {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = high ? 1046 : 784;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (high ? 0.35 : 0.15));
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.4);
  } catch {
    /* no audio */
  }
  navigator.vibrate?.(high ? [120, 60, 120] : 60);
}
