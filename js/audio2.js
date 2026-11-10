import { Sound } from './audio.js';

/* =========================================================
   SONIDO DE BIBLIXIA 2
   - Menú: la música tranquila de siempre.
   - Al jugar: una pista instrumental nueva con sabor dominicano (ritmo de merengue:
     tambora, güira, bajo y piano en "guajeo"), alegre y a volumen cómodo.
   - Motores: avión, helicóptero, tren (con pito), lancha, cascos del caballo.
   ========================================================= */
export class Sound2 extends Sound {
  _startPlay() {
    const a = this.ctx, BPM = 126, E = 60 / BPM / 2, m = { bus: 'music' };
    // Do – Fa – Sol – Do (I–IV–V–I), un compás por acorde
    const chords = [[261.6, 329.6, 392], [349.2, 440, 523.3], [392, 493.9, 587.3], [261.6, 329.6, 392]], roots = [65.4, 87.3, 98, 65.4];
    const at = t => Math.max(0, t - a.currentTime);
    const hit = (t, dur, type, freq, q, vol) => { if (!this.noise) return; const s = a.createBufferSource(); s.buffer = this.noise; const f = a.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = a.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + dur); s.connect(f).connect(g).connect(this.music); s.start(t); s.stop(t + dur + .03); };
    const drum = (t, f0, f1, dur, vol) => { const o = a.createOscillator(), g = a.createGain(); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g).connect(this.music); o.start(t); o.stop(t + dur + .02); };
    // melodía (acordeón suave) en escala de Do mayor
    const C5 = 523.3, D5 = 587.3, E5 = 659.3, F5 = 698.5, G5 = 784, A5 = 880;
    const mel = [E5, 0, G5, E5, 0, C5, D5, E5, F5, 0, A5, F5, 0, D5, E5, F5, G5, 0, F5, E5, D5, 0, E5, F5, E5, 0, D5, 0, C5, 0, 0, 0];
    let step = 0, next = a.currentTime + .1;
    const schedule = () => {
      if (!this.musicOn) { next = Math.max(next, a.currentTime + .05); return; }
      while (next < a.currentTime + .25) {
        const t = next, s = step % 8, bar = Math.floor(step / 8), c = bar % 4, ch = chords[c], w = at(t), phrase = Math.floor(bar / 4) % 3;
        // güira: raspado en cada corchea, más fuerte en el tiempo
        hit(t, .05, 'highpass', 7000, .6, s % 2 ? .028 : .045);
        if (s % 2 === 1) hit(t + E * .5, .03, 'highpass', 8000, .6, .02);
        // tambora: golpe grave en el 4 y repiques
        if (s === 6) drum(t, 140, 70, .2, .22);
        if (s === 0) drum(t, 110, 60, .25, .14);
        if (s === 3 || s === 7) hit(t, .06, 'bandpass', 900, 2, .06);
        // bajo de merengue (tónica y quinta)
        const bp = [1, 0, 0, 1.5, 1, 0, 1.5, 0][s];
        if (bp) this.note(roots[c] * bp, E * .9, { ...m, type: 'triangle', vol: .1, attack: .004, filter: 600, wet: false, when: w });
        // piano en guajeo (notas del acorde alternadas)
        const pn = [0, 2, 1, 2, 0, 2, 1, 2][s];
        this.note(ch[pn] * 2, E * .7, { ...m, type: 'triangle', vol: .02, attack: .003, filter: 2200, when: w });
        // acordeón
        if (phrase > 0) { const f = mel[(bar % 4) * 8 + s]; if (f) { this.note(f, E * 1.8, { ...m, type: 'sawtooth', vol: .012, attack: .01, filter: 1600, when: w }); this.note(f * 1.005, E * 1.8, { ...m, type: 'square', vol: .006, attack: .01, filter: 1400, when: w }); } }
        if (s === 0) ch.forEach(f => this.note(f, E * 8, { ...m, type: 'sine', vol: .016, attack: .2, filter: 1000, when: w }));
        step++; next += E;
      }
    };
    schedule(); this.timer = setInterval(schedule, 60);
  }
  // motor genérico con dos osciladores y ruido (avión, helicóptero, tren, lancha)
  engine(kind, vol = 0, rpm = 0) {
    const a = this.ctx; if (!a) return;
    if (this._eng && this._eng.kind !== kind) { const e = this._eng; try { e.g.gain.setTargetAtTime(0, a.currentTime, .1); setTimeout(() => { try { e.o1.stop(); e.o2.stop(); e.src.stop(); e.lfo.stop(); } catch (er) {} }, 400); } catch (er) {} this._eng = null; }
    if (!this._eng) {
      if (vol <= 0) return;
      const o1 = a.createOscillator(), o2 = a.createOscillator(), lp = a.createBiquadFilter(), g = a.createGain(), src = a.createBufferSource(), ng = a.createGain(), lfo = a.createOscillator(), lg = a.createGain();
      o1.type = 'sawtooth'; o2.type = 'square'; lp.type = 'lowpass'; lp.frequency.value = 800; g.gain.value = 0;
      src.buffer = this.noise; src.loop = true; src.playbackRate.value = .6; ng.gain.value = kind === 'avion' ? .5 : .25;
      lfo.frequency.value = kind === 'heli' ? 7 : kind === 'tren' ? 3 : 0; lg.gain.value = kind === 'heli' || kind === 'tren' ? .5 : 0;
      const am = a.createGain(); am.gain.value = .6; lfo.connect(lg).connect(am.gain);
      o1.connect(lp); o2.connect(lp); src.connect(ng).connect(lp); lp.connect(am).connect(g).connect(this.sfx);
      o1.start(); o2.start(); src.start(); lfo.start();
      this._eng = { kind, o1, o2, lp, g, src, lfo };
    }
    const e = this._eng, t = a.currentTime;
    const base = { avion: 70, heli: 45, tren: 38, lancha: 55, moto: 70, carro: 45, jeepeta: 42, guagua: 34 }[kind] || 45;
    const f = base + rpm * base * 1.6;
    e.o1.frequency.setTargetAtTime(f, t, .15); e.o2.frequency.setTargetAtTime(f * .5, t, .15);
    e.lp.frequency.setTargetAtTime((kind === 'avion' ? 900 : 500) + rpm * 1500, t, .2);
    if (kind === 'heli') e.lfo.frequency.setTargetAtTime(6 + rpm * 4, t, .3);
    if (kind === 'tren') e.lfo.frequency.setTargetAtTime(.5 + rpm * 5, t, .3);
    e.g.gain.setTargetAtTime(this.sfxOn ? vol * (kind === 'avion' ? .07 : .055) : 0, t, .25);
  }
  engineOff() { this.engine(this._eng ? this._eng.kind : 'x', 0); if (this._eng) { const e = this._eng, a = this.ctx; e.g.gain.setTargetAtTime(0, a.currentTime, .2); setTimeout(() => { if (this._eng === e) { try { e.o1.stop(); e.o2.stop(); e.src.stop(); e.lfo.stop(); } catch (er) {} this._eng = null; } }, 900); } }
  whistle() { // pito del tren
    const a = this.unlock(); if (!a || !this.sfxOn) return;
    for (const f of [587, 740, 880]) this.note(f, 1.3, { type: 'triangle', vol: .05, attack: .05, filter: 2400 });
  }
  hoof() { this.step('hard', true); }
  bell() { this.note(1568, .6, { type: 'sine', vol: .08 }); this.note(2093, .8, { type: 'sine', vol: .05, when: .05 }); }
  cash() { [1318, 1568, 2093].forEach((f, i) => this.note(f, .25, { type: 'triangle', vol: .08, when: i * .07 })); }
  fuelTick() { this.note(880 + Math.random() * 40, .05, { type: 'square', vol: .02, wet: false }); }
}
