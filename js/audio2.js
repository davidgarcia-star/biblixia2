import { Sound } from './audio.js';

/* =========================================================
   SONIDO DE BIBLIXIA 2 – música "ejecutiva" (cinemática y moderna)
   Todo se genera en el navegador (sin archivos de audio).
   - Mezcla profesional: compresor, ecualización, reverberación propia
     y "bombeo" (los colchones respiran con el bombo).
   - Menú: pista cinemática en Re menor (piano de cola, cuerdas, pulso
     de reloj y timbales), solemne e imponente.
   - Al jugar: pista épica-corporativa en La menor (Lam–Fa–Do–Sol) con
     estructura de canción: intro, estrofa, subida con redoble,
     coro con metales y melodía, pausa y vuelta. 112 pulsos por minuto.
   - Motores: avión, helicóptero, tren (con pito), lancha, cascos del caballo.
   ========================================================= */
export class Sound2 extends Sound {
  unlock() {
    const a = super.unlock();
    if (a && !this._pro) this._buildMix(a);
    return a;
  }
  // music → graves limpios → compresor → volumen final → fade
  _buildMix(a) {
    try {
      this._pro = true;
      this.music.disconnect();
      const hp = a.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 32;
      const low = a.createBiquadFilter(); low.type = 'lowshelf'; low.frequency.value = 120; low.gain.value = 2;
      const air = a.createBiquadFilter(); air.type = 'highshelf'; air.frequency.value = 9000; air.gain.value = -3;
      const comp = a.createDynamicsCompressor(); comp.threshold.value = -20; comp.knee.value = 12; comp.ratio.value = 3.5; comp.attack.value = .012; comp.release.value = .22;
      const out = a.createGain(); out.gain.value = .26;
      this.music.connect(hp).connect(low).connect(air).connect(comp).connect(out).connect(this.fade);
      // reverberación de sala para la música (más larga y suave que la de efectos)
      const len = Math.floor(a.sampleRate * 2.2), buf = a.createBuffer(2, len, a.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6) * (i < a.sampleRate * .02 ? i / (a.sampleRate * .02) : 1); }
      const conv = a.createConvolver(); conv.buffer = buf;
      const rlp = a.createBiquadFilter(); rlp.type = 'lowpass'; rlp.frequency.value = 5000;
      this._revIn = a.createGain(); this._revIn.gain.value = 1;
      const rg = a.createGain(); rg.gain.value = .45;
      this._revIn.connect(conv).connect(rlp).connect(rg).connect(this.music);
      // bus que "bombea" con el bombo (colchones y bajo)
      this._pump = a.createGain(); this._pump.gain.value = 1; this._pump.connect(this.music);
    } catch (e) { try { this.music.connect(this.fade); } catch (er) {} this._pro = false; }
  }
  // ---------- instrumentos ----------
  _ins() {
    const self = this, a = this.ctx, M = this.music, P = this._pump || M, R = this._revIn;
    const env = (g, t, vol, atk, dur, rel = .08) => { g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + atk); g.gain.setValueAtTime(vol, t + Math.max(atk, dur - rel)); g.gain.exponentialRampToValueAtTime(.0001, t + dur); };
    this._sends = this._sends || {};
    const send = (node, amt) => { if (!R || !amt) return; let b = this._sends[amt]; if (!b) { b = this._sends[amt] = a.createGain(); b.gain.value = amt; b.connect(R); } node.connect(b); };
    const noise = (t, dur, type, freq, q, vol, out = M, rev = 0, f1 = 0) => {
      if (!this.noise) return; const s = a.createBufferSource(); s.buffer = this.noise; s.loop = dur > .24;
      const f = a.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur); f.Q.value = q;
      const g = a.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      s.connect(f).connect(g).connect(out); send(g, rev); s.start(t); s.stop(t + dur + .05);
    };
    const I = {
      // colchón de cuerdas: dos sierras desafinadas por nota, filtro que se abre despacio
      pad(t, freqs, dur, vol, bright = 1400) {
        const g = a.createGain(); env(g, t, vol, dur * .25, dur, dur * .3);
        const f = a.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = .7; f.frequency.setValueAtTime(bright * .45, t); f.frequency.linearRampToValueAtTime(bright, t + dur * .6);
        f.connect(g).connect(P); send(g, .55);
        for (const fr of freqs) for (const d of [-9, 8]) { const o = a.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.detune.value = d; o.connect(f); o.start(t); o.stop(t + dur + .05); }
      },
      // piano de cola: fundamental + armónicos con caída rápida
      piano(t, fr, dur, vol, rev = .35, lite = false) {
        const g = a.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .004); g.gain.exponentialRampToValueAtTime(vol * .35, t + .25); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
        g.connect(M); send(g, rev);
        const o = a.createOscillator(); o.type = 'triangle'; o.frequency.value = fr; o.connect(g); o.start(t); o.stop(t + dur + .05);
        if (!lite) { const o2 = a.createOscillator(), og = a.createGain(); o2.type = 'sine'; o2.frequency.value = fr * 2; o2.detune.value = 3; og.gain.value = .4; o2.connect(og).connect(g); o2.start(t); o2.stop(t + dur + .05); }
      },
      // pulso corto tipo cuerdas en staccato / pluck
      pluck(t, fr, dur, vol, rev = .25, out = M) {
        const g = a.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .005); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
        const f = a.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 2; f.frequency.value = 1800;
        const o = a.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.connect(f).connect(g).connect(out); send(g, rev); o.start(t); o.stop(t + dur + .05);
      },
      // bajo: seno grave + sierra filtrada para que se oiga en el celular
      bass(t, fr, dur, vol) {
        const g = a.createGain(); env(g, t, vol, .008, dur, .05);
        const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420; f.Q.value = 1.5; f.connect(g).connect(P);
        const o1 = a.createOscillator(); o1.type = 'sine'; o1.frequency.value = fr; o1.connect(f);
        const o2 = a.createOscillator(), og = a.createGain(); o2.type = 'sawtooth'; o2.frequency.value = fr; og.gain.value = .35; o2.connect(og).connect(f);
        [o1, o2].forEach(o => { o.start(t); o.stop(t + dur + .05); });
      },
      // metales (brass) en golpes cortos
      brass(t, freqs, dur, vol) {
        const g = a.createGain(); env(g, t, vol, .03, dur, .12);
        const f = a.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 2; f.frequency.setValueAtTime(500, t); f.frequency.exponentialRampToValueAtTime(2600, t + .06); f.frequency.exponentialRampToValueAtTime(900, t + dur);
        f.connect(g).connect(M); send(g, .4);
        for (const fr of freqs) for (const d of [-6, 6]) { const o = a.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.detune.value = d; o.connect(f); o.start(t); o.stop(t + dur + .05); }
      },
      // melodía principal: campana + sierra suave al unísono
      lead(t, fr, dur, vol) {
        const g = a.createGain(); env(g, t, vol, .02, dur, Math.min(.25, dur * .4));
        const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 3000; f.connect(g).connect(M); send(g, .5);
        const o1 = a.createOscillator(); o1.type = 'triangle'; o1.frequency.value = fr;
        const o2 = a.createOscillator(), o2g = a.createGain(); o2.type = 'sawtooth'; o2.frequency.value = fr; o2.detune.value = 7; o2g.gain.value = .25;
        const v = a.createOscillator(), vg = a.createGain(); v.frequency.value = 5.2; vg.gain.value = fr * .004; v.connect(vg); vg.connect(o1.frequency); vg.connect(o2.frequency);
        o1.connect(f); o2.connect(o2g).connect(f);
        [o1, o2, v].forEach(o => { o.start(t); o.stop(t + dur + .05); });
        I.piano(t, fr * 2, Math.min(1.2, dur), vol * .35, .5);
      },
      kick(t, vol, pump = true) {
        const o = a.createOscillator(), g = a.createGain(); o.frequency.setValueAtTime(155, t); o.frequency.exponentialRampToValueAtTime(42, t + .14);
        g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + .38); o.connect(g).connect(M); o.start(t); o.stop(t + .4);
        noise(t, .012, 'highpass', 2500, .7, vol * .25);
        if (pump && self._pump) { const p = self._pump.gain; p.cancelScheduledValues(t); p.setValueAtTime(.4, t); p.linearRampToValueAtTime(1, t + .28); }
      },
      snare(t, vol, rev = .25) {
        const o = a.createOscillator(), g = a.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(160, t + .08);
        g.gain.setValueAtTime(vol * .6, t); g.gain.exponentialRampToValueAtTime(.001, t + .12); o.connect(g).connect(M); o.start(t); o.stop(t + .15);
        noise(t, .2, 'bandpass', 2200, .7, vol, M, rev);
        noise(t, .1, 'highpass', 6000, .6, vol * .4);
      },
      clap(t, vol) { [0, .012, .024].forEach(d => noise(t + d, .09, 'bandpass', 1400, 1.2, vol, M, .35)); },
      hat(t, vol, open = false) { noise(t, open ? .22 : .035, 'highpass', open ? 7500 : 9000, .8, vol); },
      shaker(t, vol) { noise(t, .06, 'bandpass', 6000, 1.5, vol); },
      crash(t, vol) { noise(t, 2.2, 'highpass', 5000, .5, vol, M, .5); noise(t, 1.2, 'bandpass', 8000, .6, vol * .6, M, .4); },
      // timbal / golpe cinemático
      boom(t, vol) {
        const o = a.createOscillator(), g = a.createGain(); o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(38, t + .8);
        g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + 1.6); o.connect(g).connect(M); send(g, .5); o.start(t); o.stop(t + 1.7);
        noise(t, .5, 'lowpass', 600, .8, vol * .5, M, .5);
      },
      // subida de ruido antes del coro
      riser(t, dur, vol) {
        if (!self.noise) return; const s = a.createBufferSource(); s.buffer = self.noise; s.loop = true;
        const f = a.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2; f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(9000, t + dur);
        const g = a.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * .95); g.gain.linearRampToValueAtTime(.0001, t + dur + .02);
        s.connect(f).connect(g).connect(M); send(g, .4); s.start(t); s.stop(t + dur + .05);
      },
    };
    return I;
  }
  // corre un "secuenciador" en semicorcheas con tiempo exacto
  _seq(bpm, fn) {
    const a = this.ctx, S = 60 / bpm / 4; let step = 0, next = a.currentTime + .12;
    const schedule = () => {
      if (!this.musicOn) { next = Math.max(next, a.currentTime + .05); return; }
      while (next < a.currentTime + .3) { fn(next, step, S); step++; next += S; }
    };
    schedule(); this.timer = setInterval(schedule, 60);
  }

  // ---------- MENÚ: cinemático en Re menor, 76 bpm ----------
  _startMenu() {
    if (!this._pro) return super._startMenu();
    const I = this._ins();
    // Rem(add9) – Si♭maj7 – Fa – Do(sus)
    const pads = [[146.8, 220, 293.7, 329.6], [116.5, 174.6, 220, 293.7], [174.6, 220, 261.6, 349.2], [130.8, 196, 261.6, 293.7]];
    const roots = [73.4, 58.3, 87.3, 65.4];
    const arp = [[293.7, 349.2, 440, 523.3], [293.7, 349.2, 466.2, 587.3], [349.2, 440, 523.3, 698.5], [261.6, 392, 523.3, 587.3]];
    const A4 = 440, Bb4 = 466.2, C5 = 523.3, D5 = 587.3, E5 = 659.3, F5 = 698.5, G5 = 784, A5 = 880;
    // melodía de piano (una nota por negra; 0 = silencio)
    const mel = [A4, 0, D5, E5, F5, 0, E5, D5, D5, 0, C5, D5, F5, 0, 0, 0, C5, 0, F5, G5, A5, 0, G5, F5, E5, 0, D5, C5, D5, 0, 0, 0];
    this._seq(76, (t, step, S) => {
      const s = step % 16, bar = Math.floor(step / 16), c = bar % 4, cyc = Math.floor(bar / 4), sec = cyc % 4; // 0 intro, 1 tema, 2 tema + ritmo, 3 calma
      if (s === 0) {
        I.pad(t, pads[c], S * 16 + .3, sec === 3 ? .010 : .014, sec >= 2 ? 1800 : 1100);
        I.bass(t, roots[c], S * 15, sec === 0 ? .08 : .12);
        I.piano(t, roots[c] * 2, 3, .07, .45);
        if (c === 0) I.boom(t, sec === 3 ? .15 : .3);
      }
      // pulso de reloj en corcheas (cuerdas staccato)
      if (s % 2 === 0) I.pluck(t, arp[c][[0, 2, 1, 3, 2, 1, 3, 2][s / 2]] / 2, S * 1.6, sec === 0 ? .018 : .028, .3);
      // arpegio de piano agudo en semicorcheas suaves
      if (sec >= 1 && s % 4 === 2) I.piano(t, arp[c][(Math.floor(s / 4) + bar) % 4] * 2, .9, .018, .5, true);
      // melodía
      if (sec === 1 || sec === 2) { const n = mel[c * 8 + s / 2]; if (s % 2 === 0 && n) I.piano(t, n, 2.2, .08, .5); }
      // ritmo cinemático suave
      if (sec === 2) {
        if (s === 0 || s === 10) I.kick(t, .32);
        if (s === 8) I.snare(t, .07, .5);
        if (s % 2 === 1) I.shaker(t, .018);
      }
      if (sec === 3 && s === 0 && c === 3) I.riser(t, S * 16, .05);
    });
  }

  // ---------- JUEGO: épica-ejecutiva en La menor, 112 bpm ----------
  _startPlay() {
    if (!this._pro) return super._startPlay();
    const I = this._ins();
    // Lam9 – Famaj7 – Do(add9) – Sol
    const pads = [[220, 261.6, 329.6, 493.9], [174.6, 220, 261.6, 329.6], [196, 261.6, 293.7, 329.6], [196, 246.9, 293.7, 392]];
    const roots = [55, 43.65, 65.4, 49];
    const tri = [[220, 261.6, 329.6, 440], [174.6, 220, 261.6, 349.2], [196, 261.6, 329.6, 392], [196, 246.9, 293.7, 392]];
    const brass = [[220, 261.6, 329.6], [220, 261.6, 349.2], [196, 261.6, 329.6], [196, 246.9, 293.7]];
    const G4 = 392, A4 = 440, B4 = 493.9, C5 = 523.3, D5 = 587.3, E5 = 659.3, F5 = 698.5, G5 = 784, A5 = 880, B5 = 987.8;
    // melodía del coro en corcheas (8 por compás); 0 = silencio, -1 = sostener
    const hookA = [E5, -1, A5, -1, G5, E5, -1, D5,  C5, -1, F5, -1, E5, C5, -1, A4,  G4, -1, C5, -1, E5, G5, -1, E5,  D5, -1, -1, B4, D5, -1, G5, -1];
    const hookB = [E5, -1, A5, -1, B5, A5, -1, G5,  F5, -1, A5, -1, G5, F5, -1, E5,  E5, -1, G5, -1, C5 * 2, -1, B5, A5,  G5, -1, -1, -1, B4, D5, G5, -1];
    const lens = h => h.map((n, i) => { if (n <= 0) return 0; let k = 1; while (h[i + k] === -1) k++; return k; });
    const lA = lens(hookA), lB = lens(hookB);
    // estructura de 32 compases: intro 4 · estrofa 8 · subida 4 · coro 8 · pausa 4 · vuelta 4
    const sectionOf = bar => { const b = bar < 32 ? bar : 4 + (bar - 4) % 28; return b < 4 ? 'intro' : b < 12 ? 'verse' : b < 16 ? 'build' : b < 24 ? 'chorus' : b < 28 ? 'break' : 'pre'; };
    const inSec = bar => { const b = bar < 32 ? bar : 4 + (bar - 4) % 28; return [0, 4, 12, 16, 24, 28].reduce((x, y) => b >= y ? b - y : x, 0); };
    let chorusN = 0;
    this._seq(112, (t, step, S) => {
      const s = step % 16, bar = Math.floor(step / 16), c = bar % 4, sec = sectionOf(bar), k = inSec(bar);
      const full = sec === 'chorus', drums = sec === 'verse' || sec === 'build' || sec === 'chorus' || sec === 'pre';
      if (s === 0 && sec === 'chorus' && k === 0) chorusN++;
      // --- colchón, bajo y golpes de sección
      if (s === 0) {
        I.pad(t, full ? pads[c].concat(pads[c][0] * 2) : pads[c], S * 16 + .2, full ? .011 : sec === 'intro' || sec === 'break' ? .013 : .010, full ? 2600 : sec === 'build' ? 1200 + k * 400 : 1500);
        if (k === 0 && (sec === 'chorus' || sec === 'verse')) { I.crash(t, full ? .09 : .05); I.boom(t, full ? .35 : .22); }
        if (sec === 'intro' || sec === 'break') I.piano(t, roots[c] * 4, 3.5, .06, .5);
      }
      // --- piano en semicorcheas (motor del tema)
      if (sec !== 'break' || s % 4 === 0) {
        const pat = [0, 2, 1, 3, 2, 1, 3, 2, 0, 2, 1, 3, 2, 3, 1, 2][s];
        const v = sec === 'intro' ? .02 + k * .006 : sec === 'break' ? .03 : full ? .022 : .026;
        I.piano(t, tri[c][pat] * 2, .35, v, .3, true);
      }
      // --- bajo
      if (drums) {
        if (full) { if (s % 2 === 0) I.bass(t, roots[c] * (s % 4 === 2 ? 2 : 1), S * 1.8, .16); }
        else if (sec === 'build') { if (s % 2 === 0) I.bass(t, roots[c], S * 1.8, .1 + k * .015); }
        else { const bp = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 2, 0][s]; if (bp) I.bass(t, roots[c] * bp, S * 2.5, .14); }
      } else if (sec === 'break' && s === 0) I.bass(t, roots[c], S * 15, .08);
      // --- batería
      if (drums) {
        if (full || sec === 'pre') { if (s % 4 === 0) I.kick(t, .5); }
        else if (sec === 'verse') { if (s === 0 || s === 10 || (s === 7 && k % 2)) I.kick(t, .48); }
        else if (sec === 'build') { if (s % 4 === 0) I.kick(t, .3 + k * .05, false); }
        if (sec !== 'build') { if (s === 4 || s === 12) { I.snare(t, .14); if (full) I.clap(t, .06); } }
        // redoble que acelera en la subida
        if (sec === 'build') { const every = k < 2 ? 4 : k < 3 ? 2 : 1; if (s % every === 0) I.snare(t, .03 + (k * 16 + s) / 64 * .1, .2); }
        // platillos
        if (full) { I.hat(t, s % 2 ? .02 : .032); if (s % 4 === 2) I.hat(t, .025, true); }
        else if (sec !== 'build') { if (s % 2 === 0) I.hat(t, s % 4 ? .028 : .018); }
        if (sec === 'pre' && k === 3 && s >= 8 && s % 2 === 0) I.snare(t, .05 + (s - 8) * .012, .3);
      } else if (sec === 'intro' && k >= 2 && s === 0) I.kick(t, .25, false);
      // --- subida de ruido antes del coro y antes de volver
      if (s === 0 && ((sec === 'build' && k === 2) || (sec === 'pre' && k === 2))) I.riser(t, S * 32, .07);
      if (s === 0 && sec === 'break' && k === 0) I.boom(t, .3);
      // --- metales del coro: golpes en 1, 2y y 4
      if (full && (s === 0 || s === 6 || s === 12)) I.brass(t, brass[c].map(f => f), s === 0 ? S * 5 : S * 3, s === 0 ? .018 : .013);
      // --- melodía (coro, y suave en la pausa)
      if ((full || sec === 'break') && s % 2 === 0) {
        const useB = full ? (chorusN % 2 === 0 && k >= 4) : false, h = useB ? hookB : hookA, L = useB ? lB : lA, i = c * 8 + s / 2;
        if (h[i] > 0) I.lead(t, sec === 'break' ? h[i] / 2 : h[i], L[i] * S * 2, sec === 'break' ? .03 : .045);
      }
      // --- contramelodía de cuerdas en la estrofa (segunda mitad)
      if (sec === 'verse' && k >= 4 && s % 8 === 0) I.pluck(t, tri[c][s ? 3 : 2] * 2, S * 6, .025, .5);
    });
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
