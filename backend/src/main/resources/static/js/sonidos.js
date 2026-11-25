/* =========================================================
   Sonidos de dinosaurio sintetizados (Web Audio)
   ---------------------------------------------------------
   Nadie sabe con certeza cómo sonaban los dinosaurios. Estos sonidos son recreaciones
   inspiradas en sus parientes vivos (cocodrilos y aves) y en su anatomía: los animales
   grandes suenan más graves, los raptores chillan como aves rapaces, los hadrosaurios
   con cresta resuenan como una trompeta y los saurópodos emiten bramidos profundos.
   ========================================================= */
(() => {
  let ctx, salida;

  function iniciar() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    const reverb = ctx.createConvolver();
    const n = ctx.sampleRate * 2.2, buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
    }
    reverb.buffer = buf;
    salida = ctx.createGain();
    salida.gain.value = 0.9;
    const humedo = ctx.createGain(); humedo.gain.value = 0.35;
    salida.connect(comp);
    salida.connect(reverb).connect(humedo).connect(comp);
    comp.connect(ctx.destination);
  }

  function ruido(seg) {
    const n = Math.ceil(ctx.sampleRate * seg), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(); s.buffer = b;
    return s;
  }

  function distorsion(cantidad) {
    const ws = ctx.createWaveShaper(), k = cantidad, n = 1024, curva = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i / n) * 2 - 1; curva[i] = ((1 + k) * x) / (1 + k * Math.abs(x)); }
    ws.curve = curva;
    return ws;
  }

  /**
   * Voz genérica: oscilador con curva de tono + ruido, resonancias (formantes), aspereza por modulación
   * de amplitud y envolvente. Todos los tiempos en segundos relativos a `t`.
   */
  function voz({ t, dur, f0, curva = [1, 1.15, 0.8], tipo = "sawtooth", ruidoMezcla = 0.5, formantes = [300, 900, 2000],
                 q = 4, aspereza = 0, asperezaHz = 30, vibrato = 0, vol = 0.6, ataque = 0.08, brillo = 2500, dist = 3 }) {
    const o = ctx.createOscillator();
    o.type = tipo;
    o.frequency.setValueAtTime(f0 * curva[0], t);
    o.frequency.linearRampToValueAtTime(f0 * curva[1], t + dur * 0.3);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f0 * curva[2]), t + dur);
    if (vibrato) {
      const v = ctx.createOscillator(), vg = ctx.createGain();
      v.frequency.value = 6 + Math.random() * 3; vg.gain.value = f0 * vibrato;
      v.connect(vg).connect(o.frequency); v.start(t); v.stop(t + dur + 0.1);
    }
    const r = ruido(dur + 0.2);
    const gO = ctx.createGain(), gR = ctx.createGain();
    gO.gain.value = 1 - ruidoMezcla; gR.gain.value = ruidoMezcla;

    const mezcla = ctx.createGain();
    o.connect(gO).connect(mezcla);
    r.connect(gR).connect(mezcla);

    // Aspereza (gruñido): modulación de amplitud rápida
    const am = ctx.createGain();
    if (aspereza) {
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.type = "square"; lfo.frequency.value = asperezaHz; lg.gain.value = aspereza;
      am.gain.value = 1 - aspereza;
      lfo.connect(lg).connect(am.gain); lfo.start(t); lfo.stop(t + dur + 0.1);
    }
    mezcla.connect(am);

    const dst = distorsion(dist), lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = brillo;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(vol, t + ataque);
    env.gain.setValueAtTime(vol, t + dur * 0.55);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    const suma = ctx.createGain();
    formantes.forEach((f, i) => {
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass"; bp.frequency.value = f; bp.Q.value = q;
      const g = ctx.createGain(); g.gain.value = 1.6 / (i + 1);
      am.connect(bp).connect(g).connect(suma);
    });
    const directo = ctx.createGain(); directo.gain.value = 0.35;
    am.connect(directo).connect(suma);
    suma.connect(dst).connect(lp).connect(env).connect(salida);

    o.start(t); o.stop(t + dur + 0.1);
    r.start(t); r.stop(t + dur + 0.2);
  }

  /** Golpe seco (choque de cabezas, pisada) */
  function golpe(t, frec = 90, vol = 0.8) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(frec * 2, t); o.frequency.exponentialRampToValueAtTime(frec, t + 0.08);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g).connect(salida); o.start(t); o.stop(t + 0.4);
    const r = ruido(0.1), gr = ctx.createGain(), bp = ctx.createBiquadFilter();
    bp.type = "bandpass"; bp.frequency.value = 1200; gr.gain.setValueAtTime(0.5, t); gr.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    r.connect(bp).connect(gr).connect(salida); r.start(t);
  }

  /* Factor de tamaño: 1 = ~1 t. Más pesado → más grave y largo */
  const escala = peso => Math.min(2.2, Math.max(0.45, Math.pow(Math.max(peso || 1, 0.001), 0.18)));

  const RECETAS = {
    TEROPODO(t, s) {
      voz({ t, dur: 1.6 * s, f0: 120 / s, curva: [0.9, 1.25, 0.6], ruidoMezcla: 0.55, formantes: [220 / s, 700 / s, 1800],
            aspereza: 0.6, asperezaHz: 28, vol: 0.75, ataque: 0.15, brillo: 2200, dist: 6 });
      voz({ t: t + 0.05, dur: 1.7 * s, f0: 55 / s, tipo: "sine", ruidoMezcla: 0.1, formantes: [80, 160], q: 1, vol: 0.5, ataque: 0.25 });
      return 1.8 * s;
    },
    DROMEOSAURIO(t, s) {
      voz({ t, dur: 0.45, f0: 900 / s, curva: [0.8, 1.3, 0.7], tipo: "square", ruidoMezcla: 0.45, formantes: [1800, 3200, 5000],
            q: 6, vibrato: 0.04, vol: 0.4, ataque: 0.02, brillo: 7000, dist: 4 });
      voz({ t: t + 0.55, dur: 0.6, f0: 750 / s, curva: [1, 1.4, 0.6], tipo: "square", ruidoMezcla: 0.5, formantes: [1600, 3000],
            q: 6, vibrato: 0.05, vol: 0.4, ataque: 0.02, brillo: 7000, dist: 4 });
      voz({ t: t + 1.25, dur: 0.5, f0: 300, ruidoMezcla: 0.95, formantes: [3500, 6000], q: 2, vol: 0.25, ataque: 0.05, brillo: 9000 }); // siseo
      return 1.8;
    },
    ESPINOSAURIDO(t, s) {
      voz({ t, dur: 1.5 * s, f0: 140 / s, curva: [1, 1.1, 0.7], ruidoMezcla: 0.5, formantes: [300 / s, 900, 1600],
            aspereza: 0.7, asperezaHz: 13, vol: 0.7, ataque: 0.12, brillo: 2000, dist: 5 });
      return 1.6 * s;
    },
    ORNITOMIMIDO(t) {
      [0, 0.35, 0.7].forEach((d, i) => voz({ t: t + d, dur: 0.28, f0: 420 - i * 30, curva: [1, 1.2, 0.9], tipo: "square",
        ruidoMezcla: 0.2, formantes: [900, 2400], q: 5, vol: 0.4, ataque: 0.02, brillo: 5000 }));
      return 1.1;
    },
    SAUROPODO(t, s) {
      voz({ t, dur: 3.2 * s, f0: 52 / s, curva: [0.8, 1.15, 0.75], tipo: "sawtooth", ruidoMezcla: 0.25, formantes: [90, 220, 480],
            q: 3, vol: 0.85, ataque: 0.8, brillo: 900, dist: 2, vibrato: 0.01 });
      voz({ t, dur: 3.2 * s, f0: 30, tipo: "sine", ruidoMezcla: 0, formantes: [40, 70], q: 1, vol: 0.7, ataque: 1.0, brillo: 300 });
      return 3.4 * s;
    },
    PROSAUROPODO(t, s) {
      voz({ t, dur: 1.8 * s, f0: 95 / s, curva: [0.9, 1.1, 0.8], ruidoMezcla: 0.3, formantes: [200, 500, 1100], q: 3,
            vol: 0.7, ataque: 0.3, brillo: 1500 });
      return 2 * s;
    },
    ESTEGOSAURIO(t, s) {
      [0, 0.55, 1.05].forEach(d => voz({ t: t + d, dur: 0.42, f0: 110 / s, curva: [1, 1.05, 0.8], ruidoMezcla: 0.55,
        formantes: [250, 700], q: 3, aspereza: 0.4, asperezaHz: 22, vol: 0.6, ataque: 0.04, brillo: 1400 }));
      return 1.6;
    },
    ANQUILOSAURIO(t, s) {
      voz({ t, dur: 0.9 * s, f0: 85 / s, curva: [1, 1.1, 0.7], ruidoMezcla: 0.6, formantes: [180, 520], q: 3,
            aspereza: 0.55, asperezaHz: 18, vol: 0.7, ataque: 0.06, brillo: 1100 });
      golpe(t + 1.1 * s, 70, 0.9); // coletazo con el mazo
      return 1.6 * s;
    },
    CERATOPSIO(t, s) {
      voz({ t, dur: 0.35, f0: 200, ruidoMezcla: 0.95, formantes: [800, 2200], q: 2, vol: 0.45, ataque: 0.02, brillo: 4000 }); // resoplido
      voz({ t: t + 0.45, dur: 1.3 * s, f0: 105 / s, curva: [0.9, 1.15, 0.75], ruidoMezcla: 0.35, formantes: [240, 650, 1300],
            q: 4, aspereza: 0.3, asperezaHz: 20, vol: 0.7, ataque: 0.1, brillo: 1600 });
      return 1.9 * s;
    },
    ORNITOPODO(t, s) {
      // Trompeta resonante: formantes estrechos que imitan los tubos de la cresta
      voz({ t, dur: 2.2 * s, f0: 98 / s, curva: [0.92, 1.04, 0.9], tipo: "sawtooth", ruidoMezcla: 0.08,
            formantes: [196 / s, 392 / s, 588 / s, 980], q: 14, vol: 0.7, ataque: 0.25, brillo: 1800, vibrato: 0.012, dist: 1.5 });
      return 2.4 * s;
    },
    PAQUICEFALOSAURIO(t) {
      voz({ t, dur: 0.6, f0: 260, curva: [1, 1.2, 0.8], tipo: "square", ruidoMezcla: 0.3, formantes: [600, 1500], q: 5,
            vibrato: 0.03, vol: 0.45, ataque: 0.04, brillo: 3000 });
      golpe(t + 0.9, 110, 1); golpe(t + 1.25, 100, 0.6);
      return 1.6;
    }
  };

  const POR_DIETA = { CARNIVORO: "TEROPODO", PISCIVORO: "ESPINOSAURIDO", OMNIVORO: "ORNITOMIMIDO",
                      INSECTIVORO: "DROMEOSAURIO", HERBIVORO: "ORNITOPODO" };

  window.DinoAudio = {
    /** Reproduce el sonido del dinosaurio y devuelve su duración en segundos. */
    reproducir(d) {
      iniciar();
      if (ctx.state === "suspended") ctx.resume();
      const grupo = RECETAS[d.grupo] ? d.grupo : POR_DIETA[d.dieta] || "TEROPODO";
      const dur = RECETAS[grupo](ctx.currentTime + 0.05, escala(d.pesoToneladas));
      window.Musica?.atenuar(dur + 0.5);
      return dur;
    },
    descripcion(d) {
      const g = RECETAS[d.grupo] ? d.grupo : POR_DIETA[d.dieta] || "TEROPODO";
      return {
        TEROPODO: "rugido grave de boca cerrada, como un cocodrilo gigante",
        DROMEOSAURIO: "chillidos y siseos, como un ave rapaz",
        ESPINOSAURIDO: "gruñido gorgoteante de cazador de ríos",
        ORNITOMIMIDO: "graznidos cortos, como un avestruz",
        SAUROPODO: "bramido profundo casi infrasónico",
        PROSAUROPODO: "bramido medio",
        ESTEGOSAURIO: "gruñidos secos y cortos",
        ANQUILOSAURIO: "gruñido bajo y un golpe de su mazo",
        CERATOPSIO: "resoplido y bramido de advertencia",
        ORNITOPODO: "llamada resonante, como una trompeta grave",
        PAQUICEFALOSAURIO: "balido corto y choques de cabeza"
      }[g];
    }
  };
})();
