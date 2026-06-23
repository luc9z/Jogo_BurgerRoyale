// Efeitos sonoros sintetizados (WebAudio) — sem arquivos. Cada função pega o
// contexto do Phaser, respeita mute/volume, e agenda osciladores/ruído.

function audio(scene, vol = 1) {
  const mgr = scene.sound;
  const ctx = mgr?.context;
  if (!ctx || ctx.state === 'closed' || mgr.mute) return null;
  if (ctx.state === 'suspended') ctx.resume();
  const master = ctx.createGain();
  master.gain.value = (mgr.volume ?? 1) * vol;
  master.connect(ctx.destination);
  return { ctx, master };
}

function tone(ctx, master, freq, t, dur, type = 'sine', vol = 0.2, slideTo = null) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.03);
}

let _noise = null;
function noiseBuf(ctx) {
  if (_noise && _noise.sampleRate === ctx.sampleRate) return _noise;
  const len = Math.floor(ctx.sampleRate * 0.3);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  _noise = buf;
  return buf;
}

// Passo: thud grave e curtinho, bem discreto
export function footstep(scene) {
  const a = audio(scene, 0.5); if (!a) return;
  const { ctx, master } = a;
  const now = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf(ctx);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 380;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.07, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
  src.connect(lp); lp.connect(g); g.connect(master);
  src.start(now); src.stop(now + 0.09);
  tone(ctx, master, 90, now, 0.06, 'sine', 0.05, 60);
}

// Horn de início de round: fanfarra ascendente de metais
export function roundHorn(scene) {
  const a = audio(scene, 0.5); if (!a) return;
  const { ctx, master } = a;
  const now = ctx.currentTime + 0.02;
  // G3 → C4 → E4 (clarinada)
  const notes = [196.0, 261.63, 329.63];
  notes.forEach((f, i) => {
    const t = now + i * 0.12;
    tone(ctx, master, f, t, 0.5, 'sawtooth', 0.16);
    tone(ctx, master, f * 0.5, t, 0.5, 'triangle', 0.10); // oitava grave
  });
  // acorde final sustentado
  const tEnd = now + 0.36;
  [261.63, 329.63, 392.0].forEach(f => tone(ctx, master, f, tEnd, 0.8, 'sawtooth', 0.10));
}

// Batida cardíaca "lub-dub" (HP crítico)
export function heartbeat(scene) {
  const a = audio(scene, 0.6); if (!a) return;
  const { ctx, master } = a;
  const now = ctx.currentTime;
  tone(ctx, master, 70, now,        0.12, 'sine', 0.26, 45);
  tone(ctx, master, 64, now + 0.18, 0.16, 'sine', 0.22, 40);
}

// Blip curtinho de interface (hover/seleção)
export function uiBlip(scene, high = false) {
  const a = audio(scene, 0.4); if (!a) return;
  const { ctx, master } = a;
  const now = ctx.currentTime;
  tone(ctx, master, high ? 880 : 560, now, 0.07, 'square', 0.10, high ? 1100 : 700);
}
