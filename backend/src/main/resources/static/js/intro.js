/* =========================================================
   Presentación + test de gustos (solo en la primera visita)
   ---------------------------------------------------------
   1. Pantalla de entrada: un toque para empezar (los navegadores exigen un gesto para el sonido).
   2. Emblema de DinoGlosario que aparece y desaparece lentamente con una fanfarria original.
   3. 8 preguntas sobre animales y rasgos que te gustan → alimentan tu perfil de intereses.
   4. Tus dinosaurios recomendados y entrada al glosario.
   Repetible desde el pie de página («Repetir el test de gustos»).
   ========================================================= */
(() => {
  const CLAVE = "dg_intro_visto";
  const forzar = new URLSearchParams(location.search).has("test");
  if (localStorage.getItem(CLAVE) && !forzar) return;

  /* ---------- Emblema original: anillo dorado, fondo verde y esqueleto de T. rex en marcha ---------- */
  const EMBLEMA = `<img src="/img/logo.png" class="emblema" alt="Logo">`;

  /* ---------- Preguntas: cada opción suma señales al perfil ----------
     f = rasgos con su peso (1 = lo principal de esa opción, menos = secundario), i = etiqueta legible del interés,
     b = término suave (paisaje, región) que solo sirve para desempatar */
  const PREGUNTAS = [
    { p: "Para empezar… ¿qué animal de hoy te parece más fascinante?", o: [
      ["🦁", "León o tigre", { f: { "grupo:TEROPODO": 1, "dieta:CARNIVORO": 0.6 }, i: "grandes depredadores" }],
      ["🐘", "Elefante o jirafa", { f: { "grupo:SAUROPODO": 1, "dieta:HERBIVORO": 0.5 }, i: "gigantes tranquilos" }],
      ["🦏", "Rinoceronte", { f: { "grupo:CERATOPSIO": 1, "dieta:HERBIVORO": 0.5 }, i: "animales con cuernos" }],
      ["🦅", "Águila o halcón", { f: { "grupo:DROMEOSAURIO": 1, "dieta:CARNIVORO": 0.5 }, i: "cazadores ágiles con plumas" }],
      ["🐊", "Cocodrilo", { f: { "grupo:ESPINOSAURIDO": 1, "dieta:PISCIVORO": 0.6 }, i: "cazadores de ríos" }],
      ["🐢", "Tortuga o armadillo", { f: { "grupo:ANQUILOSAURIO": 1, "dieta:HERBIVORO": 0.5 }, i: "animales acorazados" }]] },
    { p: "¿Qué es lo que más te impresiona de un animal?", o: [
      ["💪", "Su fuerza y su mordida", { f: { "grupo:TEROPODO": 1, "dieta:CARNIVORO": 0.5 }, i: "mordida poderosa" }],
      ["🏔️", "Su tamaño gigantesco", { f: { "grupo:SAUROPODO": 1 }, i: "dinosaurios gigantes" }],
      ["⚡", "Su velocidad", { f: { "grupo:ORNITOMIMIDO": 1, "grupo:DROMEOSAURIO": 0.6 }, i: "dinosaurios veloces" }],
      ["🧠", "Su inteligencia y astucia", { f: { "grupo:DROMEOSAURIO": 1 }, i: "dinosaurios inteligentes" }],
      ["🛡️", "Cómo se defiende", { f: { "grupo:ANQUILOSAURIO": 1, "grupo:ESTEGOSAURIO": 0.8, "grupo:CERATOPSIO": 0.5 }, i: "defensas y armaduras" }],
      ["👑", "Sus adornos: cuernos, crestas…", { f: { "grupo:CERATOPSIO": 1, "grupo:ORNITOPODO": 0.6, "grupo:PAQUICEFALOSAURIO": 0.4 }, i: "cuernos y crestas" }]] },
    { p: "Si fueras un dinosaurio, ¿cómo conseguirías tu comida?", o: [
      ["🥩", "Cazando, por supuesto", { f: { "dieta:CARNIVORO": 1 }, i: "carnívoros" }],
      ["🌿", "Comiendo plantas tranquilamente", { f: { "dieta:HERBIVORO": 1 }, i: "herbívoros" }],
      ["🐟", "Pescando en el río", { f: { "dieta:PISCIVORO": 1, "grupo:ESPINOSAURIDO": 0.5 }, i: "dinosaurios pescadores" }],
      ["🍽️", "Comería de todo", { f: { "dieta:OMNIVORO": 1, "grupo:ORNITOMIMIDO": 0.4 }, i: "omnívoros" }]] },
    { p: "¿Qué tamaño de animal te gusta más?", o: [
      ["🐓", "Pequeño, como una gallina", { f: { "grupo:DROMEOSAURIO": 0.8 }, i: "dinosaurios pequeños" }],
      ["🐎", "Mediano, como un caballo", { f: { "grupo:ORNITOMIMIDO": 0.7, "grupo:PAQUICEFALOSAURIO": 0.7 }, i: "dinosaurios medianos" }],
      ["🚌", "Grande, como un autobús", { f: { "grupo:TEROPODO": 0.6, "grupo:CERATOPSIO": 0.6, "grupo:ORNITOPODO": 0.4 }, i: "dinosaurios grandes" }],
      ["🏢", "¡Enorme, como un edificio!", { f: { "grupo:SAUROPODO": 0.8 }, i: "los más grandes de la historia" }]] },
    { p: "¿En qué paisaje te gustaría encontrarte con uno?", o: [
      ["🌊", "Ríos y pantanos", { b: "rios pantanos" }],
      ["🏜️", "Desiertos y dunas", { b: "desierto", i: "dinosaurios del desierto" }],
      ["🌲", "Bosques frondosos", { b: "bosques" }],
      ["🌾", "Grandes llanuras", { b: "llanuras" }]] },
    { p: "¿Qué época de los dinosaurios te llama más?", o: [
      ["🌋", "Triásico: los primeros dinosaurios", { f: { "periodo:TRIASICO": 1 }, i: "los primeros dinosaurios" }],
      ["🌴", "Jurásico: la era de los gigantes", { f: { "periodo:JURASICO": 1 } }],
      ["☄️", "Cretácico: los últimos, hasta el asteroide", { f: { "periodo:CRETACICO": 1 } }],
      ["🤷", "Todavía no lo sé", {}]] },
    { p: "¿Qué rasgo te parece más genial?", o: [
      ["🦕", "Un cuello larguísimo", { f: { "grupo:SAUROPODO": 1 }, i: "cuellos largos" }],
      ["🔱", "Cuernos y gola", { f: { "grupo:CERATOPSIO": 1 }, i: "cuernos" }],
      ["🪶", "Plumas", { f: { "grupo:DROMEOSAURIO": 1, "grupo:ORNITOMIMIDO": 0.4 }, i: "dinosaurios con plumas" }],
      ["⛵", "Una vela en la espalda", { f: { "grupo:ESPINOSAURIDO": 1 }, i: "velas dorsales" }],
      ["🔺", "Placas y púas", { f: { "grupo:ESTEGOSAURIO": 1, "grupo:ANQUILOSAURIO": 0.4 }, i: "placas y púas" }],
      ["🎺", "Crestas que suenan", { f: { "grupo:ORNITOPODO": 1 }, i: "crestas sonoras" }]] },
    { p: "Por último: ¿de qué parte del mundo te gustaría conocer fósiles?", o: [
      ["🇺🇸", "Norteamérica", { b: "estados unidos canada" }],
      ["🇦🇷", "Sudamérica", { b: "argentina brasil", i: "dinosaurios de Sudamérica" }],
      ["🇲🇳", "Asia", { b: "mongolia china" }],
      ["🌍", "Europa y África", { b: "alemania inglaterra tanzania egipto marruecos" }],
      ["🗺️", "¡De todas partes!", {}]] }
  ];

  /* ---------- Estructura ---------- */
  document.documentElement.classList.add("con-intro");
  const capa = document.createElement("div");
  capa.className = "intro";
  capa.innerHTML = `
    <div class="intro-paso intro-entrada activo">
      <div class="intro-emblema-mini">${EMBLEMA}</div>
      <button type="button" class="btn btn-solido intro-comenzar">🔊 Comenzar la expedición</button>
      <p class="intro-nota">Activa el sonido para una mejor experiencia</p>
    </div>
    <div class="intro-paso intro-logo"><div class="intro-emblema">${EMBLEMA}</div>
      <p class="intro-lema">Un viaje de 165 millones de años</p></div>
    <div class="intro-paso intro-test"></div>
    <div class="intro-paso intro-resultado"></div>
    <button type="button" class="intro-saltar">Saltar ✕</button>`;
  document.body.prepend(capa);

  const mostrar = clase => capa.querySelectorAll(".intro-paso").forEach(p => p.classList.toggle("activo", p.classList.contains(clase)));
  const esperar = ms => new Promise(r => setTimeout(r, ms));
  let respuestas = [];

  function cerrar() {
    localStorage.setItem(CLAVE, "1");
    capa.classList.add("saliendo");
    document.documentElement.classList.remove("con-intro");
    setTimeout(() => capa.remove(), 1200);
    if (forzar) history.replaceState(null, "", location.pathname + "#glosario");
  }
  capa.querySelector(".intro-saltar").addEventListener("click", () => { window.Musica?.encender(); cerrar(); });

  /* ---------- 1–2. Entrada y emblema con fanfarria ---------- */
  capa.querySelector(".intro-comenzar").addEventListener("click", async () => {
    mostrar("intro-logo");
    const dur = (await window.Musica?.fanfarria().catch(() => 9)) || 9;
    await esperar(Math.max(8000, dur * 1000 - 1500));
    capa.querySelector(".intro-logo").classList.add("desvanecer");
    await esperar(2600);
    window.Musica?.encender();   // la música de fondo continúa durante el test
    preguntar(0);
  });

  /* ---------- 3. Test de gustos ---------- */
  function preguntar(n) {
    if (n >= PREGUNTAS.length) return terminar();
    const q = PREGUNTAS[n];
    const caja = capa.querySelector(".intro-test");
    caja.innerHTML = `
      <div class="test-cabecera">
        <div class="test-avatar">🦕</div>
        <div><small>Braqui · pregunta ${n + 1} de ${PREGUNTAS.length}</small>
          <div class="test-progreso"><span style="width:${(n / PREGUNTAS.length) * 100}%"></span></div></div>
      </div>
      <h2 class="test-pregunta">${esc(q.p)}</h2>
      <div class="test-opciones">
        ${q.o.map(([emoji, texto], i) => `
          <button type="button" class="test-opcion" data-i="${i}" style="--retraso:${i * 0.06}s">
            <span class="emoji">${emoji}</span><span>${esc(texto)}</span></button>`).join("")}
      </div>
      <div class="test-pie">
        ${n > 0 ? `<button type="button" class="enlace-sutil" data-atras>← Anterior</button>` : "<span></span>"}
        <button type="button" class="enlace-sutil" data-omitir>Me da igual →</button>
      </div>`;
    mostrar("intro-test");
    caja.querySelectorAll(".test-opcion").forEach(b => b.addEventListener("click", () => {
      b.classList.add("elegida");
      respuestas[n] = q.o[Number(b.dataset.i)];
      setTimeout(() => preguntar(n + 1), 350);
    }));
    caja.querySelector("[data-omitir]").addEventListener("click", () => { respuestas[n] = null; preguntar(n + 1); });
    caja.querySelector("[data-atras]")?.addEventListener("click", () => preguntar(n - 1));
  }

  /* ---------- 4. Guardar el perfil y mostrar las recomendaciones ---------- */
  async function terminar() {
    const caja = capa.querySelector(".intro-resultado");
    caja.innerHTML = `<div class="test-avatar grande">🦕</div>
      <h2>Analizando tus gustos…</h2><span class="escribiendo"><span></span><span></span><span></span></span>`;
    mostrar("intro-resultado");

    // Cada respuesta se guarda como señales del perfil (las mismas que usa el recomendador y Braqui)
    const envios = [];
    const enviar = (tipo, valor) => envios.push(api("/actividad", { metodo: "POST", cuerpo: { tipo, valor } }).catch(() => null));
    const elegidas = respuestas.filter(Boolean);
    // Prefijo «test|»: el servidor las trata como preferencias declaradas (más peso, sin análisis de texto)
    // y, si se repite el test, descarta las respuestas del test anterior.
    const sesion = "test|" + Date.now().toString(36) + "|";
    elegidas.forEach(([, , s]) => {
      Object.entries(s.f || {}).forEach(([filtro, peso]) => enviar("FILTRO", `${sesion}${peso}|${filtro}`));
      if (s.i) enviar("INTERES", sesion + s.i);
      if (s.b) enviar("BUSQUEDA", sesion + s.b);
    });
    await Promise.all(envios);
    await esperar(900);

    let p = null;
    try { p = await api("/recomendaciones?limite=3"); } catch { /* sin conexión */ }
    const recs = p?.recomendaciones || [];
    caja.innerHTML = `
      <div class="test-avatar grande">🦕</div>
      <span class="eyebrow">Tu expedición está lista</span>
      <h2>${recs.length ? "Creo que estos dinosaurios te van a encantar" : "¡Gracias por tus respuestas!"}</h2>
      ${p?.etiquetas?.length ? `<div class="intereses" style="justify-content:center">${p.etiquetas.map(e => `<span class="chip">${esc(e)}</span>`).join("")}</div>` : ""}
      <div class="recs intro-recs">${recs.map(r => tarjetaRecomendacion(r)).join("")}</div>
      <button type="button" class="btn btn-solido" data-entrar>Entrar al glosario</button>
      <p class="intro-nota">Braqui recordará tus gustos. Puedes repetir el test cuando quieras desde el pie de página.</p>`;
    activarImagenes(caja);
    completarImagenesWiki(caja);
    caja.querySelector("[data-entrar]").addEventListener("click", () => {
      cerrar();
      // Que Braqui salude sabiendo lo que contestaste
      try {
        const h = JSON.parse(sessionStorage.getItem("dg_chat")) || [];
        if (!h.length && recs.length) {
          h.push({ rol: "assistant", contenido: `¡Gracias por contarme tus gustos! Empieza por el ${recs[0].nombre}; cuando quieras, pídeme «muéstrame otro parecido» y te llevo. 🌿`, recs });
          sessionStorage.setItem("dg_chat", JSON.stringify(h));
        }
      } catch { /* sin almacenamiento */ }
      // La portada y Braqui se actualizan sin recargar (así la música no se corta)
      document.dispatchEvent(new CustomEvent("dg:perfil-actualizado"));
    });
  }
})();
