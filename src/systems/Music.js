// Trilha de fundo sintetizada (WebAudio) — tema de circo sombrio em Lá menor,
// compasso 3/4 (valsa "oom-pah-pah"). 100% instrumental, sem voz.
// Substitui o mp3 do Suno que vinha com vocais.

const N = {
  A2: 110.00, D3: 146.83, E3: 164.81, A3: 220.00,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, Gs4: 415.30,
  A4: 440.00, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25,
};

export default class Music {
  constructor(scene) {
    this.scene = scene;
    this._timer = null;
    this._master = null;
    this._ctx = null;
    this._base = 0.42; // volume base da trilha (antes da multiplicação global)
  }

  _gain() {
    const mgr = this.scene.sound;
    return mgr.mute ? 0.0001 : (mgr.volume ?? 1) * this._base;
  }

  start() {
    const mgr = this.scene.sound;
    const ctx = mgr?.context;
    if (!ctx || ctx.state === 'closed') return;
    if (ctx.state === 'suspended') ctx.resume();
    this._ctx = ctx;

    this._master = ctx.createGain();
    const now = ctx.currentTime;
    this._master.gain.setValueAtTime(0.0001, now);
    this._master.gain.linearRampToValueAtTime(this._gain(), now + 1.2); // fade-in
    this._master.connect(ctx.destination);

    this._beat    = 0.5;                 // s por tempo (~120 BPM)
    this._barDur  = this._beat * 3;      // 3/4
    this._bars    = 4;                   // frase de 4 compassos
    const phrase  = this._barDur * this._bars;

    this._schedulePhrase(now + 0.12);
    this._timer = this.scene.time.addEvent({
      delay: phrase * 1000, loop: true,
      callback: () => { if (this._ctx) this._schedulePhrase(this._ctx.currentTime + 0.04); },
    });
  }

  stop() {
    if (this._timer) { this._timer.remove(); this._timer = null; }
    if (this._master && this._ctx) {
      const now = this._ctx.currentTime;
      const g = this._master.gain;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(0.0001, now + 0.5);
    }
  }

  // Reaplica o volume global/mudo (chamado quando o usuário muda no menu/pause)
  refreshVolume() {
    if (this._master && this._ctx) {
      this._master.gain.setValueAtTime(this._gain(), this._ctx.currentTime);
    }
  }

  _voice(freq, t, dur, type = 'triangle', vol = 0.18) {
    const ctx = this._ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this._master);
    o.start(t); o.stop(t + dur + 0.03);
  }

  // Uma frase de 4 compassos: i - iv - V - i (Am - Dm - E - Am)
  _schedulePhrase(start) {
    const b = this._beat, bar = this._barDur;
    // [bass, [acordes]] por compasso
    const prog = [
      { bass: N.A2, chord: [N.A3, N.C4, N.E4] }, // Am
      { bass: N.D3, chord: [N.D4, N.F4, N.A4] }, // Dm
      { bass: N.E3, chord: [N.E4, N.Gs4, N.B4] }, // E (maior → tensão)
      { bass: N.A2, chord: [N.A3, N.C4, N.E4] }, // Am
    ];
    // Melodia (caixinha de música) sobre a frase
    const mel = [
      { t: 0,        f: N.E5, d: 0.9 },
      { t: b * 1.5,  f: N.C5, d: 0.6 },
      { t: bar,      f: N.D5, d: 0.9 },
      { t: bar + b*1.5, f: N.A4, d: 0.6 },
      { t: bar*2,    f: N.B4, d: 0.9 },
      { t: bar*2 + b*1.5, f: N.Gs4, d: 0.6 },
      { t: bar*3,    f: N.A4, d: 1.4 },
    ];

    prog.forEach((p, i) => {
      const t0 = start + i * bar;
      // "oom" — baixo no tempo 1
      this._voice(p.bass, t0, 0.42, 'sine', 0.30);
      // "pah-pah" — acorde nos tempos 2 e 3
      for (const beat of [1, 2]) {
        for (const note of p.chord) {
          this._voice(note, t0 + beat * b, 0.22, 'triangle', 0.07);
        }
      }
    });

    for (const m of mel) {
      this._voice(m.f, start + m.t, m.d, 'triangle', 0.13);
    }
  }
}
