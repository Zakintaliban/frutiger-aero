/* =====================================================================
   AeroMusic: a tiny Web Audio synth that plays original, generated
   loops for the four demo tracks. No samples, no libraries.

   Signal path:
   voices → bus → 5-band EQ (60 Hz … 14 kHz) → analyser → master → limiter → out
               ↘ echo send ↗
   ===================================================================== */
window.AeroMusic = (() => {
  "use strict";

  const mtof = (m) => 440 * 2 ** ((m - 69) / 12);

  // Band centre frequencies match the EQ card on the page.
  const EQ_BANDS = [
    ["lowshelf", 60],
    ["peaking", 230],
    ["peaking", 910],
    ["peaking", 3600],
    ["highshelf", 14000],
  ];

  function createRig(ctx) {
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -14;
    limiter.knee.value = 10;
    limiter.ratio.value = 4;
    limiter.attack.value = 0.004;
    limiter.release.value = 0.25;
    limiter.connect(ctx.destination);

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(limiter);

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.8;
    analyser.connect(master);

    const bus = ctx.createGain();
    bus.gain.value = 0.55;

    const eq = EQ_BANDS.map(([type, frequency]) => {
      const band = ctx.createBiquadFilter();
      band.type = type;
      band.frequency.value = frequency;
      band.Q.value = 1.1;
      return band;
    });
    bus.connect(eq[0]);
    for (let i = 0; i < eq.length - 1; i++) eq[i].connect(eq[i + 1]);
    eq[eq.length - 1].connect(analyser);

    // Echo: filtered feedback delay, returned into the bus so the EQ shapes it too.
    const send = ctx.createGain();
    const delay = ctx.createDelay(2);
    delay.delayTime.value = 0.4;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.36;
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 2600;
    const wet = ctx.createGain();
    wet.gain.value = 0.5;
    send.connect(delay);
    delay.connect(tone);
    tone.connect(feedback);
    feedback.connect(delay);
    tone.connect(wet);
    wet.connect(bus);

    const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const samples = noise.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;

    // A gain node feeding the bus, with an optional echo send.
    function voice(echo = 0) {
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(bus);
      if (echo) {
        const s = ctx.createGain();
        s.gain.value = echo;
        g.connect(s);
        s.connect(send);
      }
      return g;
    }

    function osc(type, freq, start, stop, dest, detune = 0) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(freq, start);
      o.detune.value = detune;
      o.connect(dest);
      o.start(start);
      o.stop(stop);
      return o;
    }

    function noiseBurst(start, length, filterType, frequency, q, dest) {
      const src = ctx.createBufferSource();
      src.buffer = noise;
      const f = ctx.createBiquadFilter();
      f.type = filterType;
      f.frequency.value = frequency;
      f.Q.value = q;
      src.connect(f);
      f.connect(dest);
      src.start(start, Math.random() * 0.5);
      src.stop(start + length);
    }

    const inst = {
      // Warm, slow pad: detuned saw + triangle through a breathing low-pass.
      pad(t, notes, dur, vel = 1) {
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.Q.value = 0.6;
        lp.frequency.setValueAtTime(700, t);
        lp.frequency.linearRampToValueAtTime(1500, t + dur * 0.5);
        lp.frequency.linearRampToValueAtTime(900, t + dur);
        const g = voice(0.25);
        lp.connect(g);
        const peak = 0.04 * vel;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(peak, t + 0.5);
        g.gain.setValueAtTime(peak, t + dur - 0.1);
        g.gain.linearRampToValueAtTime(0, t + dur + 1.2);
        const end = t + dur + 1.3;
        for (const m of notes) {
          osc("sawtooth", mtof(m), t, end, lp, -7);
          osc("triangle", mtof(m), t, end, lp, 7);
        }
      },

      bass(t, m, dur, vel = 1) {
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 520;
        const g = voice();
        lp.connect(g);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.3 * vel, t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.16 * vel, t + 0.18);
        g.gain.setTargetAtTime(0, t + dur, 0.05);
        osc("sine", mtof(m), t, t + dur + 0.4, lp);
        osc("triangle", mtof(m), t, t + dur + 0.4, lp);
      },

      // Glassy FM bell: carrier + 3.5× modulator with a fast-decaying index.
      bell(t, m, vel = 1, echo = 0.45) {
        const f = mtof(m);
        const g = voice(echo);
        const mod = ctx.createOscillator();
        mod.frequency.value = f * 3.5;
        const depth = ctx.createGain();
        depth.gain.setValueAtTime(f * 2.2, t);
        depth.gain.exponentialRampToValueAtTime(f * 0.05, t + 1);
        mod.connect(depth);
        const car = ctx.createOscillator();
        car.frequency.value = f;
        depth.connect(car.frequency);
        car.connect(g);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.1 * vel, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 1.6);
        mod.start(t);
        car.start(t);
        mod.stop(t + 1.7);
        car.stop(t + 1.7);
      },

      // Square-wave chiptune pluck.
      chip(t, m, dur, vel = 1) {
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 2600;
        const g = voice(0.2);
        lp.connect(g);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.045 * vel, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.012 * vel, t + dur);
        g.gain.linearRampToValueAtTime(0, t + dur + 0.04);
        osc("square", mtof(m), t, t + dur + 0.06, lp);
      },

      // Water drop: a sine that falls in pitch. Frutiger Aero's favourite sound.
      drop(t, m, vel = 1) {
        const f = mtof(m);
        const g = voice(0.5);
        const o = ctx.createOscillator();
        o.frequency.setValueAtTime(f * 1.9, t);
        o.frequency.exponentialRampToValueAtTime(f, t + 0.07);
        o.connect(g);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.13 * vel, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 0.24);
        o.start(t);
        o.stop(t + 0.26);
      },

      kick(t, vel = 1) {
        const g = voice();
        const o = ctx.createOscillator();
        o.frequency.setValueAtTime(150, t);
        o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
        o.connect(g);
        g.gain.setValueAtTime(0.55 * vel, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
        o.start(t);
        o.stop(t + 0.4);
      },

      hat(t, vel = 1, open = false) {
        const g = voice();
        const len = open ? 0.22 : 0.045;
        g.gain.setValueAtTime(0.05 * vel, t);
        g.gain.exponentialRampToValueAtTime(0.0008, t + len);
        noiseBurst(t, len + 0.02, "highpass", 7500, 0.7, g);
      },

      snare(t, vel = 1) {
        const g = voice(0.15);
        g.gain.setValueAtTime(0.18 * vel, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.17);
        noiseBurst(t, 0.2, "bandpass", 1900, 0.8, g);
        const body = voice();
        body.gain.setValueAtTime(0.1 * vel, t);
        body.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
        osc("triangle", 185, t, t + 0.1, body);
      },

      shaker(t, vel = 1) {
        const g = voice();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.04 * vel, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 0.08);
        noiseBurst(t, 0.1, "bandpass", 6000, 1.2, g);
      },
    };

    // Two-note notification chime, outside the EQ so it always sounds the same.
    function chime(t) {
      const g = ctx.createGain();
      g.connect(limiter);
      g.gain.value = 0;
      [[88, 0], [95, 0.11]].forEach(([m, offset]) => {
        const start = t + offset;
        g.gain.setValueAtTime(0.06, start);
        g.gain.exponentialRampToValueAtTime(0.0008, start + 0.55);
        osc("sine", mtof(m), start, start + 0.6, g);
        osc("sine", mtof(m + 12), start, start + 0.3, g);
      });
    }

    return { ctx, master, analyser, eq, delay, inst, chime };
  }

  /* ---------- The four demo tracks (4-bar loops, 16 steps per bar) ---------- */
  const TRACKS = [
    {
      // Glass Lagoon · Sora Lake: chillout in D, bells and water drops
      bpm: 92,
      chords: [[62, 66, 69, 73], [59, 62, 66, 69], [55, 59, 62, 66], [57, 61, 64, 66]],
      bass: [38, 35, 43, 45],
      play(r, s, t, spb) {
        const bar = s >> 4;
        const i = s & 15;
        const ch = this.chords[bar];
        if (i === 0) r.inst.pad(t, ch, spb * 16);
        if (i === 0 || i === 6 || i === 10) r.inst.bass(t, this.bass[bar] + (i === 10 ? 12 : 0), spb * (i === 0 ? 5 : 3));
        const arp = { 0: 0, 3: 2, 6: 1, 8: 3, 11: 2, 14: 1 };
        if (i in arp) r.inst.bell(t, ch[arp[i]] + 12, i === 0 ? 1 : 0.7);
        if ((i === 5 && bar % 2 === 0) || (i === 13 && bar === 3)) r.inst.drop(t, [86, 88, 90, 93, 95][(bar + i) % 5]);
        if (i === 0 || i === 8) r.inst.kick(t, i === 0 ? 0.8 : 0.55);
        if (i % 4 === 2) r.inst.shaker(t);
        if (i === 12) r.inst.snare(t, 0.35);
      },
    },
    {
      // Dewdrop Protocol · Lumen Koi: chiptune in F
      bpm: 104,
      chords: [[65, 69, 72, 76], [67, 71, 74, 76], [64, 67, 71, 74], [69, 72, 76, 79]],
      bass: [41, 43, 40, 45],
      arp: [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 0, 1, 2, 3],
      play(r, s, t, spb) {
        const bar = s >> 4;
        const i = s & 15;
        const ch = this.chords[bar];
        if (i === 0) r.inst.pad(t, ch, spb * 16, 0.55);
        if (i % 2 === 0) r.inst.bass(t, this.bass[bar] + (i % 4 === 2 ? 12 : 0), spb * 1.6, 0.85);
        r.inst.chip(t, ch[this.arp[i]] + 12, spb * 0.9, i % 4 === 0 ? 1 : 0.7);
        if (i === 0 || i === 8 || (i === 10 && bar === 3)) r.inst.kick(t, 0.8);
        if (i === 4 || i === 12) r.inst.snare(t, 0.6);
        if (i % 2 === 1) r.inst.hat(t, 0.6);
        if (i === 14) r.inst.hat(t, 0.5, true);
        if (i === 15 && bar % 2 === 1) r.inst.drop(t, 84);
      },
    },
    {
      // Aurora.exe · Neo Meadow: slow ambient in C# minor
      bpm: 76,
      chords: [[61, 64, 68, 71, 75], [57, 61, 64, 68], [64, 68, 71, 75], [59, 63, 66, 68]],
      bass: [37, 33, 40, 35],
      play(r, s, t, spb) {
        const bar = s >> 4;
        const i = s & 15;
        const ch = this.chords[bar];
        if (i === 0) {
          r.inst.pad(t, ch, spb * 16, 1.15);
          r.inst.bass(t, this.bass[bar], spb * 15, 0.75);
          r.inst.bell(t, ch[ch.length - 1] + 12, 0.6, 0.6);
          r.inst.kick(t, 0.45);
        }
        if (i === 3) r.inst.kick(t, 0.3);
        if (i === 10) r.inst.bell(t, ch[2] + 12, 0.45, 0.6);
        if (i === 7 && bar % 2 === 1) r.inst.bell(t, ch[1] + 24, 0.3, 0.7);
        if (i === 4 && bar === 1) r.inst.drop(t, 80);
        if (i === 12 && bar === 3) r.inst.drop(t, 83);
        if (i % 8 === 4) r.inst.shaker(t, 0.5);
      },
    },
    {
      // Koi Pond Sunrise · The Bubble Theory: upbeat Y2K pop in G
      bpm: 118,
      chords: [[67, 71, 74], [66, 69, 74], [64, 67, 71], [64, 67, 72]],
      bass: [43, 38, 40, 36],
      melody: [
        { 0: 74, 3: 76, 6: 79, 10: 78, 12: 76 },
        { 0: 78, 3: 76, 6: 74, 10: 69, 12: 74 },
        { 0: 71, 3: 74, 6: 76, 10: 79, 12: 78 },
        { 0: 76, 3: 74, 6: 72, 8: 71, 10: 72, 14: 74 },
      ],
      play(r, s, t, spb) {
        const bar = s >> 4;
        const i = s & 15;
        if (i === 0) r.inst.pad(t, this.chords[bar], spb * 16, 0.7);
        if (i % 2 === 0) r.inst.bass(t, this.bass[bar] + (i % 4 === 2 ? 12 : 0), spb * 1.5, 0.9);
        const note = this.melody[bar][i];
        if (note) r.inst.bell(t, note, 0.85, 0.35);
        if (i % 4 === 0) r.inst.kick(t, 0.85);
        if (i === 4 || i === 12) r.inst.snare(t, 0.6);
        if (i % 4 === 2) r.inst.hat(t, 0.7, true);
        else if (i % 2 === 1) r.inst.hat(t, 0.4);
        if (i === 15 && bar === 3) r.inst.drop(t, 91);
      },
    },
  ];

  /* ---------- Real-time player ---------- */
  const AC = window.AudioContext || window.webkitAudioContext;
  let rig = null;
  let timer = null;
  let suspendTimer = null;
  let nextTime = 0;
  let step = 0;
  let trackIndex = 0;
  let eqGains = [0, 0, 0, 0, 0];

  const lookahead = () => (document.hidden ? 1.2 : 0.15);
  const spbOf = (track) => 60 / track.bpm / 4;

  function ensureRig() {
    if (!rig && AC) {
      rig = createRig(new AC());
      applyEq();
    }
    return rig;
  }

  function setEcho() {
    if (!rig) return;
    // Dotted-eighth echo, locked to the track tempo.
    rig.delay.delayTime.setTargetAtTime(spbOf(TRACKS[trackIndex]) * 3, rig.ctx.currentTime, 0.05);
  }

  function tick() {
    const track = TRACKS[trackIndex];
    const spb = spbOf(track);
    while (nextTime < rig.ctx.currentTime + lookahead()) {
      track.play(rig, step % 64, nextTime, spb);
      nextTime += spb;
      step++;
    }
  }

  function applyEq() {
    if (!rig) return;
    const now = rig.ctx.currentTime;
    rig.eq.forEach((band, i) => band.gain.setTargetAtTime(eqGains[i], now, 0.08));
  }

  return {
    supported: Boolean(AC),
    tracks: TRACKS,
    createRig,

    play(index) {
      if (!ensureRig()) return;
      clearTimeout(suspendTimer);
      rig.ctx.resume();
      trackIndex = index;
      setEcho();
      const now = rig.ctx.currentTime;
      rig.master.gain.cancelScheduledValues(now);
      rig.master.gain.setTargetAtTime(0.75, now, 0.04);
      nextTime = now + 0.05;
      step = 0;
      clearInterval(timer);
      timer = setInterval(tick, 25);
      tick();
    },

    pause() {
      if (!rig) return;
      clearInterval(timer);
      timer = null;
      rig.master.gain.setTargetAtTime(0, rig.ctx.currentTime, 0.05);
      clearTimeout(suspendTimer);
      suspendTimer = setTimeout(() => rig.ctx.suspend(), 400);
    },

    setTrack(index) {
      trackIndex = index;
      if (!rig || !timer) return;
      setEcho();
      step = 0;
      nextTime = Math.max(nextTime, rig.ctx.currentTime + 0.05);
    },

    // EQ gains in dB, one per band.
    setEq(gains) {
      eqGains = gains.slice();
      applyEq();
    },

    // Frequency data for the visualizers, or null before audio has started.
    analyser() {
      return rig ? rig.analyser : null;
    },

    sampleRate() {
      return rig ? rig.ctx.sampleRate : 48000;
    },

    chime() {
      if (rig && rig.ctx.state === "running") rig.chime(rig.ctx.currentTime + 0.01);
    },
  };
})();
