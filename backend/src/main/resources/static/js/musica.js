/* =========================================================
   Música de fondo: banda sonora orquestal suave y ambiente de selva
   ---------------------------------------------------------
   Composición ORIGINAL generada en tiempo real con Web Audio (sin archivos ni derechos de terceros):
   cuerdas con acordes amplios, una trompa lejana que canta un motivo, timbales suaves en los cambios
   de acorde y un fondo de viento y pájaros.

   ¿Prefieres tu propia pista? Coloca un archivo con licencia de uso en  static/audio/fondo.mp3
   y se reproducirá en bucle en lugar de la música generada.
   ========================================================= */
(() => {
  const CLAVE = "dg_musica";
  const VOLUMEN = 0.2;
  const ARCHIVO = "/audio/fondo.mp3";
  const SEG_ACORDE = 7.5;

  let ctx, maestro, bus, encendida = false, temporizador = null, pajaros = null, viento = null;
  let audioArchivo = null, compas = 0;
  let hayArchivo = null; // null = sin comprobar

  /* ---------- Armonía (MIDI) ---------- */
  const nota = m => 440 * Math.pow(2, (m - 69) / 12);
  // Re mayor con préstamos modales (bVI, bVII) para un aire épico y luminoso
  const PROGRESION = [
    { bajo: 38, acorde: [50, 54, 57, 62] },        // D
    { bajo: 43, acorde: [50, 55, 59, 62] },        // G/D
    { bajo: 35, acorde: [50, 54, 59, 62] },        // Bm
    { bajo: 45, acorde: [49, 52, 57, 64] },        // A
    { bajo: 38, acorde: [50, 54, 57, 66] },        // D
    { bajo: 46, acorde: [50, 53, 58, 62] },        // Bb (bVI)
    { bajo: 48, acorde: [52, 55, 60, 64] },        // C (bVII)
    { bajo: 45, acorde: [49, 52, 57, 61] }         // A
  ];
  // Motivos de la trompa (grados en semitonos sobre Re4 = 62) — [nota, duración en tiempos]
  const MOTIVOS = [
    [[66, 1], [69, 1], [71, 2], [69, 1], [66, 1], [64, 2]],
    [[62, 1], [64, 1], [66, 2], [69, 1.5], [71, .5], [69, 2]],
    [[74, 2], [71, 1], [69, 1], [66, 2], [64, 2]],
    [[69, 1], [71, 1], [74, 3], [71, 1], [69, 2]]
  ];

  /* ---------- Motor de audio ---------- */
  function impulso(segundos, caida) {
    const n = ctx.sampleRate * segundos, buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, caida);
    }
    return buf;
  }

  function crearMotor() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    maestro = ctx.createGain();
    maestro.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    maestro.connect(comp).connect(ctx.destination);

    bus = ctx.createGain();
    const reverb = ctx.createConvolver();
    reverb.buffer = impulso(5, 2.6);
    const seco = ctx.createGain(); seco.gain.value = 0.45;
    const humedo = ctx.createGain(); humedo.gain.value = 0.75;
    bus.connect(seco).connect(maestro);
    bus.connect(reverb).connect(humedo).connect(maestro);
  }

  function ruidoBuffer(seg = 2) {
    const n = ctx.sampleRate * seg, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    let ult = 0;
    for (let i = 0; i < n; i++) { ult = (ult + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = ult * 3.5; } // ruido marrón
    return b;
  }

  /* Cuerdas: dos dientes de sierra desafinados por nota, filtro suave y envolvente lenta */
  function cuerdas(midi, t, dur, vol) {
    const filtro = ctx.createBiquadFilter();
    filtro.type = "lowpass";
    filtro.frequency.setValueAtTime(500, t);
    filtro.frequency.linearRampToValueAtTime(1100, t + dur * 0.5);
    filtro.frequency.linearRampToValueAtTime(600, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 2.2);
    g.gain.setValueAtTime(vol, t + dur - 0.4);
    g.gain.linearRampToValueAtTime(0, t + dur + 2.5);
    filtro.connect(g).connect(bus);
    [-7, 6].forEach(cents => {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = nota(midi);
      o.detune.value = cents;
      o.connect(filtro);
      o.start(t);
      o.stop(t + dur + 2.6);
    });
  }

  /* Trompa: triángulo + seno con vibrato y ataque suave */
  function trompa(midi, t, dur, vol = 0.07) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator();
    o.type = "triangle"; o2.type = "sine";
    o.frequency.value = nota(midi); o2.frequency.value = nota(midi) * 2;
    const vib = ctx.createOscillator(), vibG = ctx.createGain();
    vib.frequency.value = 4.8; vibG.gain.value = nota(midi) * 0.006;
    vib.connect(vibG); vibG.connect(o.frequency); vibG.connect(o2.frequency);
    const filtro = ctx.createBiquadFilter();
    filtro.type = "lowpass"; filtro.frequency.value = 1400;
    const g = ctx.createGain(), g2 = ctx.createGain();
    g2.gain.value = 0.25;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.18);
    g.gain.setValueAtTime(vol, t + dur * 0.8);
    g.gain.linearRampToValueAtTime(0, t + dur + 0.35);
    o.connect(filtro); o2.connect(g2).connect(filtro);
    filtro.connect(g).connect(bus);
    [o, o2, vib].forEach(x => { x.start(t); x.stop(t + dur + 0.4); });
  }

  /* Timbal suave en el cambio de acorde */
  function timbal(midi, t, vol = 0.18) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(nota(midi) * 1.5, t);
    o.frequency.exponentialRampToValueAtTime(nota(midi), t + 0.15);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 2.2);
    o.connect(g).connect(bus);
    o.start(t); o.stop(t + 2.3);
  }

  function tocarCompas() {
    if (!encendida) return;
    const t = ctx.currentTime + 0.1;
    const { bajo, acorde } = PROGRESION[compas % PROGRESION.length];
    cuerdas(bajo, t, SEG_ACORDE, 0.05);
    cuerdas(bajo + 12, t, SEG_ACORDE, 0.03);
    acorde.forEach((m, i) => cuerdas(m, t + i * 0.12, SEG_ACORDE, 0.022));
    if (compas % 2 === 0) timbal(bajo, t, compas % 8 === 0 ? 0.22 : 0.12);

    // La trompa canta en la mitad de los compases, a partir del segundo ciclo de acordes
    if (compas >= 2 && compas % 2 === 1) {
      const motivo = MOTIVOS[Math.floor(compas / 2) % MOTIVOS.length];
      const tiempo = SEG_ACORDE / 8;
      let cursor = t + 0.4;
      const octava = compas % 8 === 7 ? 0 : -12; // la última frase del ciclo, una octava más brillante
      motivo.forEach(([m, d]) => { trompa(m + octava, cursor, d * tiempo * 0.95); cursor += d * tiempo; });
    }
    compas++;
    temporizador = setTimeout(tocarCompas, SEG_ACORDE * 1000 - 120);
  }

  /* Ambiente: viento suave y pájaros lejanos */
  function ambiente() {
    const fuente = ctx.createBufferSource();
    fuente.buffer = ruidoBuffer(4); fuente.loop = true;
    const filtro = ctx.createBiquadFilter();
    filtro.type = "bandpass"; filtro.frequency.value = 420; filtro.Q.value = 0.6;
    const g = ctx.createGain(); g.gain.value = 0.05;
    const lfo = ctx.createOscillator(), lfoG = ctx.createGain();
    lfo.frequency.value = 0.07; lfoG.gain.value = 0.03;
    lfo.connect(lfoG).connect(g.gain);
    fuente.connect(filtro).connect(g).connect(maestro);
    fuente.start(); lfo.start();
    viento = [fuente, lfo];

    const pajaro = () => {
      if (!encendida) return;
      const t = ctx.currentTime + 0.05, base = 2200 + Math.random() * 2200, notas = 2 + Math.floor(Math.random() * 4);
      for (let i = 0; i < notas; i++) {
        const o = ctx.createOscillator(), g2 = ctx.createGain(), p = ctx.createStereoPanner?.();
        const ti = t + i * (0.11 + Math.random() * 0.08);
        o.type = "sine";
        o.frequency.setValueAtTime(base * (1 + Math.random() * 0.2), ti);
        o.frequency.exponentialRampToValueAtTime(base * (0.75 + Math.random() * 0.6), ti + 0.08);
        g2.gain.setValueAtTime(0, ti);
        g2.gain.linearRampToValueAtTime(0.012, ti + 0.01);
        g2.gain.exponentialRampToValueAtTime(0.0005, ti + 0.1);
        if (p) { p.pan.value = Math.random() * 1.6 - 0.8; o.connect(g2).connect(p).connect(bus); }
        else o.connect(g2).connect(bus);
        o.start(ti); o.stop(ti + 0.12);
      }
      pajaros = setTimeout(pajaro, 3500 + Math.random() * 9000);
    };
    pajaros = setTimeout(pajaro, 2500);
  }

  /* ---------- Archivo propio opcional ---------- */
  async function comprobarArchivo() {
    if (hayArchivo !== null) return hayArchivo;
    try {
      const r = await fetch(ARCHIVO, { method: "HEAD" });
      hayArchivo = r.ok && (r.headers.get("content-type") || "").startsWith("audio");
    } catch { hayArchivo = false; }
    return hayArchivo;
  }

  function fundido(audio, destino, ms = 1500) {
    const inicio = audio.volume, t0 = performance.now();
    const paso = ahora => {
      const k = Math.min(1, (ahora - t0) / ms);
      audio.volume = inicio + (destino - inicio) * k;
      if (k < 1) requestAnimationFrame(paso); else if (destino === 0) audio.pause();
    };
    requestAnimationFrame(paso);
  }

  /* ---------- Control ---------- */
  async function encender() {
    encendida = true;
    localStorage.setItem(CLAVE, "on");
    sincronizarBoton();

    if (await comprobarArchivo()) {
      audioArchivo ??= Object.assign(new Audio(ARCHIVO), { loop: true, volume: 0 });
      try { await audioArchivo.play(); fundido(audioArchivo, 0.35, 3000); }
      catch { esperarGesto(); }
      return;
    }

    if (!ctx) crearMotor();
    if (ctx.state === "suspended") {
      const huboGesto = navigator.userActivation ? navigator.userActivation.hasBeenActive : true;
      if (!huboGesto) { esperarGesto(); return; }
      try { await Promise.race([ctx.resume(), new Promise(r => setTimeout(r, 800))]); } catch { /* bloqueado */ }
      if (ctx.state === "suspended") { esperarGesto(); return; }
    }
    maestro.gain.cancelScheduledValues(ctx.currentTime);
    maestro.gain.setValueAtTime(maestro.gain.value, ctx.currentTime);
    maestro.gain.linearRampToValueAtTime(VOLUMEN, ctx.currentTime + 4);
    if (!temporizador) { compas = 0; tocarCompas(); ambiente(); }
  }

  function apagar() {
    encendida = false;
    localStorage.setItem(CLAVE, "off");
    sincronizarBoton();
    if (audioArchivo) fundido(audioArchivo, 0, 1200);
    if (ctx) {
      maestro.gain.cancelScheduledValues(ctx.currentTime);
      maestro.gain.setValueAtTime(maestro.gain.value, ctx.currentTime);
      maestro.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2);
      clearTimeout(temporizador); clearTimeout(pajaros);
      temporizador = pajaros = null;
      viento?.forEach(n => n.stop(ctx.currentTime + 1.3));
      viento = null;
    }
  }

  /* Los navegadores bloquean el audio hasta que el usuario interactúa: se arranca en el primer gesto */
  function esperarGesto() {
    const arrancar = () => {
      ["pointerdown", "keydown", "touchstart"].forEach(e => removeEventListener(e, arrancar, true));
      if (encendida) encender();
    };
    ["pointerdown", "keydown", "touchstart"].forEach(e => addEventListener(e, arrancar, { capture: true, once: true }));
  }

  function sincronizarBoton() {
    const b = document.getElementById("btnMusica");
    if (!b) return;
    b.classList.toggle("sonando", encendida);
    b.setAttribute("aria-pressed", String(encendida));
    b.title = encendida ? "Pausar la música de fondo" : "Reproducir música de fondo";
  }

  /** Baja la música un momento (p. ej. mientras ruge un dinosaurio). */
  function atenuar(segundos = 2.5) {
    if (audioArchivo && encendida) {
      fundido(audioArchivo, 0.08, 200);
      setTimeout(() => encendida && fundido(audioArchivo, 0.35, 1200), segundos * 1000);
    }
    if (!ctx || !encendida) return;
    const t = ctx.currentTime;
    maestro.gain.cancelScheduledValues(t);
    maestro.gain.setValueAtTime(maestro.gain.value, t);
    maestro.gain.linearRampToValueAtTime(VOLUMEN * 0.25, t + 0.2);
    maestro.gain.setValueAtTime(VOLUMEN * 0.25, t + segundos);
    maestro.gain.linearRampToValueAtTime(VOLUMEN, t + segundos + 1.5);
  }

  /* ---------- Fanfarria de la presentación (composición original, ~11 s) ----------
     Redoble de timbales que crece, acorde de cuerdas que se abre y una llamada de trompas en quintas. */
  let audioIntro = null;
  async function fanfarria() {
    // ¿Hay una pista propia con licencia en /audio/intro.mp3? Se usa esa.
    try {
      const r = await fetch("/audio/intro.mp3", { method: "HEAD" });
      if (r.ok && (r.headers.get("content-type") || "").startsWith("audio")) {
        audioIntro = new Audio("/audio/intro.mp3");
        audioIntro.volume = 0.6;
        await audioIntro.play();
        return Math.min(14, Number.isFinite(audioIntro.duration) ? audioIntro.duration : 12);
      }
    } catch { /* sin pista propia: se genera */ }

    if (!ctx) crearMotor();
    if (ctx.state === "suspended") { try { await ctx.resume(); } catch { /* bloqueado */ } }
    const t0 = ctx.currentTime + 0.1;
    maestro.gain.cancelScheduledValues(t0);
    maestro.gain.setValueAtTime(VOLUMEN * 1.6, t0);

    // Redoble creciente (2.4 s)
    for (let i = 0; i < 28; i++) timbal(38, t0 + i * 0.085, 0.03 + (i / 28) * 0.16);
    timbal(38, t0 + 2.4, 0.35);

    // Acordes de cuerdas: D – G/D – A – D
    const acordes = [[38, [50, 57, 62, 66]], [43, [50, 55, 59, 62]], [45, [49, 52, 57, 64]], [38, [50, 54, 57, 62]]];
    acordes.forEach(([bajo, notas], i) => {
      const t = t0 + 2.4 + i * 2.1;
      cuerdas(bajo, t, 2.3, 0.07);
      cuerdas(bajo + 12, t, 2.3, 0.045);
      notas.forEach(m => cuerdas(m, t + 0.05, 2.3, 0.03));
      if (i > 0) timbal(bajo, t, 0.2);
    });

    // Llamada de trompas (motivo original en quintas ascendentes)
    const motivo = [[50, 0.5], [57, 0.5], [62, 1.2], [64, 0.4], [66, 0.4], [69, 1.6], [66, 0.6], [69, 0.6], [74, 2.4]];
    let c = t0 + 2.6;
    motivo.forEach(([m, d]) => { trompa(m, c, d * 0.95, 0.11); trompa(m - 12, c, d * 0.95, 0.05); c += d; });
    timbal(38, t0 + 10.6, 0.3);

    maestro.gain.setValueAtTime(VOLUMEN * 1.6, t0 + 10.5);
    maestro.gain.linearRampToValueAtTime(VOLUMEN, t0 + 13);
    return 11.5;
  }

  window.Musica = {
    fanfarria,
    alternar: () => (encendida ? apagar() : encender()),
    encender: () => encendida || encender(),
    apagar: () => encendida && apagar(),
    sincronizarBoton,
    atenuar,
    get encendida() { return encendida; }
  };

  // Recordar la preferencia entre páginas (arranca con el primer gesto si el navegador lo exige)
  if (localStorage.getItem(CLAVE) === "on") {
    encendida = true;
    document.addEventListener("DOMContentLoaded", () => { sincronizarBoton(); encender(); });
  }
})();
