/* =========================================================
   Asistente virtual "Braqui" — braquiosaurio de caricatura
   ========================================================= */
(() => {
  const BRAQUI_SVG = `
  <svg viewBox="0 0 140 160" aria-hidden="true">
    <defs>
      <linearGradient id="bq-piel" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#5fb07c"/>
        <stop offset="1" stop-color="#2f6b4a"/>
      </linearGradient>
      <linearGradient id="bq-sombrero" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#e8cf8a"/>
        <stop offset="1" stop-color="#b08a35"/>
      </linearGradient>
    </defs>
    <ellipse cx="66" cy="152" rx="48" ry="6" fill="#000" opacity=".35"/>
    <g class="braqui-cuerpo">
      <path class="braqui-cola" d="M28 108 C 14 112, 6 122, 2 136 C 12 128, 22 124, 34 122 Z" fill="url(#bq-piel)"/>
      <rect x="32" y="120" width="13" height="30" rx="6" fill="#2a5e41"/>
      <rect x="80" y="120" width="13" height="30" rx="6" fill="#2a5e41"/>
      <ellipse cx="62" cy="112" rx="40" ry="24" fill="url(#bq-piel)"/>
      <ellipse cx="62" cy="122" rx="28" ry="10" fill="#8fd0a6" opacity=".45"/>
      <rect x="46" y="122" width="13" height="30" rx="6" fill="url(#bq-piel)"/>
      <rect x="66" y="122" width="13" height="30" rx="6" fill="url(#bq-piel)"/>
      <circle cx="44" cy="102" r="4" fill="#c9a24a" opacity=".85"/>
      <circle cx="58" cy="96" r="3" fill="#c9a24a" opacity=".85"/>
      <circle cx="72" cy="101" r="3.5" fill="#c9a24a" opacity=".85"/>
      <circle cx="52" cy="108" r="2.4" fill="#c9a24a" opacity=".7"/>
      <g class="braqui-cuello">
        <path d="M74 108 C 84 80, 90 52, 100 32" stroke="url(#bq-piel)" stroke-width="20" stroke-linecap="round" fill="none"/>
        <circle cx="88" cy="70" r="2.6" fill="#c9a24a" opacity=".8"/>
        <circle cx="94" cy="52" r="2.2" fill="#c9a24a" opacity=".8"/>
        <ellipse cx="108" cy="27" rx="19" ry="13.5" fill="#5fb07c"/>
        <circle cx="122" cy="24" r="1.4" fill="#1f4430"/>
        <circle cx="117" cy="31" r="3.4" fill="#f28c8c" opacity=".55"/>
        <circle cx="108" cy="22" r="5.6" fill="#fff"/>
        <circle cx="109.5" cy="22.5" r="3" fill="#10241a"/>
        <circle cx="110.6" cy="21.2" r="1.1" fill="#fff"/>
        <ellipse class="braqui-parpado" cx="108" cy="22" rx="6" ry="6" fill="#5fb07c"/>
        <path class="braqui-boca" d="M112 33 Q 118 37, 124 31" stroke="#10241a" stroke-width="1.6" fill="none" stroke-linecap="round"/>
        <!-- sombrero de explorador -->
        <ellipse cx="104" cy="15" rx="17" ry="3.6" fill="url(#bq-sombrero)"/>
        <path d="M94 15 Q 95 3, 104 3 Q 113 3, 114 15 Z" fill="url(#bq-sombrero)"/>
        <rect x="94.5" y="11" width="19" height="2.6" fill="#10241a" opacity=".75"/>
      </g>
    </g>
  </svg>`;

  /* ---------- Contexto: en qué página está el visitante ---------- */
  const ruta = location.pathname;
  const pagina = /dinosaurio\.html$/.test(ruta) ? "dinosaurio"
    : /panel\.html$/.test(ruta) ? "panel"
    : /acceso\.html$/.test(ruta) ? "acceso"
    : (ruta === "/" || /index\.html$/.test(ruta)) ? "inicio" : "otra";
  const contexto = () => ({ pagina, dinosaurioId: window.DinoActual?.id ?? null });

  function sugerencias() {
    const dino = window.DinoActual?.nombre;
    if (pagina === "dinosaurio" && dino) return [
      `¿Qué comía el ${dino}?`, `Cuéntame algo sorprendente del ${dino}`,
      "Recomiéndame dinosaurios parecidos", "¡Hazlo rugir!"];
    if (pagina === "panel") return [
      "¿Qué grupo elijo para mi dinosaurio?", "¿Cómo añado un modelo 3D?",
      "¿Qué imágenes puedo usar?", "¿Cómo escribo el nombre científico?"];
    if (pagina === "acceso") return [
      "¿Cómo inicio sesión?", "¿Qué necesito para ser paleontólogo?", "¿Qué diferencia hay entre los roles?"];
    return ["Recomiéndame un dinosaurio", "¿Cuál es el dinosaurio más grande?",
      "Muéstrame un dinosaurio bien feroz", "Pon la música", "Quiero crear una cuenta"];
  }

  const CLAVE = "dg_chat";
  let historial = [];
  try { historial = JSON.parse(sessionStorage.getItem(CLAVE)) || []; } catch { historial = []; }

  const raiz = document.createElement("div");
  raiz.className = "braqui";
  raiz.innerHTML = `
    <div class="braqui-chat" role="dialog" aria-label="Asistente Braqui">
      <div class="braqui-cabecera">
        <div class="avatar">🦕</div>
        <div><strong>Braqui</strong><small>● Asistente paleontológico</small></div>
        <button type="button" class="cerrar" aria-label="Cerrar">×</button>
      </div>
      <div class="braqui-mensajes" aria-live="polite"></div>
      <div class="sugerencias"></div>
      <form class="braqui-form" autocomplete="off">
        <input type="text" name="mensaje" maxlength="1000" placeholder="Pregúntale algo a Braqui…" aria-label="Tu pregunta">
        <button type="submit" aria-label="Enviar">➤</button>
      </form>
      <div class="braqui-pie">Braqui aprende de lo que exploras para recomendarte ·
        <button type="button" class="enlace-sutil" data-olvidar>Olvidar mis intereses</button></div>
    </div>
    <div class="braqui-burbuja">¡Hola! ¿Te ayudo? 🌿</div>
    <button type="button" class="braqui-boton" aria-label="Abrir asistente Braqui">${BRAQUI_SVG}</button>`;
  document.body.appendChild(raiz);

  const lista = raiz.querySelector(".braqui-mensajes");
  const form = raiz.querySelector(".braqui-form");
  const input = form.querySelector("input");
  const cajaSugerencias = raiz.querySelector(".sugerencias");

  /* Markdown mínimo y seguro: se escapa primero y luego se aplican formatos */
  function formatear(texto) {
    let html = esc(texto)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");
    const bloques = html.split(/\n{2,}/).map(b => {
      const lineas = b.split("\n");
      if (lineas.every(l => /^\s*([-*•]|\d+\.)\s+/.test(l))) {
        const ordenada = /^\s*\d+\./.test(lineas[0]);
        const items = lineas.map(l => `<li>${l.replace(/^\s*([-*•]|\d+\.)\s+/, "")}</li>`).join("");
        return ordenada ? `<ol>${items}</ol>` : `<ul>${items}</ul>`;
      }
      return `<p>${lineas.join("<br>")}</p>`;
    });
    return bloques.join("");
  }

  function pintar(rol, contenido, fuentes = [], recs = []) {
    const div = document.createElement("div");
    div.className = `msg ${rol === "user" ? "yo" : "bot"}`;
    div.innerHTML = rol === "user" ? esc(contenido) : formatear(contenido);
    if (fuentes.length) {
      const f = document.createElement("div");
      f.className = "fuentes";
      f.textContent = "Fuentes: " + fuentes.join(", ");
      div.appendChild(f);
    }
    lista.appendChild(div);
    if (recs.length) {
      const cont = document.createElement("div");
      cont.className = "chat-recs";
      cont.innerHTML = recs.map(r => tarjetaRecomendacion(r, { compacta: true })).join("");
      lista.appendChild(cont);
      activarImagenes(cont);
      completarImagenesWiki(cont);
    }
    lista.scrollTop = lista.scrollHeight;
    return div;
  }

  function pintarSugerencias() {
    cajaSugerencias.innerHTML = "";
    if (historial.length > 4) return;
    sugerencias().forEach(s => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = s;
      b.addEventListener("click", () => enviar(s));
      cajaSugerencias.appendChild(b);
    });
  }

  function guardar() {
    try { sessionStorage.setItem(CLAVE, JSON.stringify(historial.slice(-20))); } catch { /* sin almacenamiento */ }
  }

  function inicializar() {
    lista.innerHTML = "";
    if (!historial.length) {
      const nombre = Sesion.usuario?.nombre?.replace(/^(Dra?\.|Sr\.|Sra\.)\s+/, "").split(" ")[0];
      const dino = window.DinoActual?.nombre;
      const intro = dino
        ? `Veo que estás con el **${dino}**. Pregúntame lo que quieras sobre él, o pulsa **Rugir** en el modelo 3D para oírlo.`
        : "Puedo recomendarte dinosaurios según lo que te guste, contarte curiosidades o explicarte cómo usar el glosario.";
      pintar("assistant", `¡Hola${nombre ? " " + nombre : ""}! Soy **Braqui**, tu guía en el glosario 🦕.\n\n${intro}`);
    } else {
      historial.forEach(m => pintar(m.rol, m.contenido, [], m.recs || []));
    }
    pintarSugerencias();
  }

  async function enviar(texto) {
    texto = texto.trim();
    if (!texto) return;
    input.value = "";
    pintar("user", texto);
    cajaSugerencias.innerHTML = "";

    const pensando = document.createElement("div");
    pensando.className = "msg bot";
    pensando.innerHTML = `<span class="escribiendo"><span></span><span></span><span></span></span>`;
    lista.appendChild(pensando);
    lista.scrollTop = lista.scrollHeight;
    raiz.classList.add("hablando");
    form.querySelector("button").disabled = true;

    try {
      const r = await api("/asistente/chat", {
        metodo: "POST",
        cuerpo: {
          mensaje: texto,
          historial: historial.slice(-10).map(({ rol, contenido }) => ({ rol, contenido })),
          contexto: contexto()
        }
      });
      pensando.remove();
      const recs = r.recomendaciones || [];
      pintar("assistant", r.respuesta, r.fuentes || [], recs);
      historial.push({ rol: "user", contenido: texto },
        { rol: "assistant", contenido: r.respuesta.slice(0, 4000), recs });
      guardar();
      for (const accion of r.acciones || []) await ejecutar(accion);
    } catch (e) {
      pensando.remove();
      pintar("assistant", e.campos?.mensaje || e.message || "No pude responder ahora mismo. Inténtalo de nuevo.");
    } finally {
      raiz.classList.remove("hablando");
      form.querySelector("button").disabled = false;
      input.focus();
    }
  }

  const alternar = abrir => {
    raiz.classList.toggle("abierto", abrir);
    if (abrir) setTimeout(() => input.focus(), 300);
  };

  raiz.querySelector(".braqui-boton").addEventListener("click", () => alternar(!raiz.classList.contains("abierto")));
  raiz.querySelector(".cerrar").addEventListener("click", () => alternar(false));
  form.addEventListener("submit", e => { e.preventDefault(); enviar(input.value); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") alternar(false); });

  // «Olvidar mis intereses»
  raiz.querySelector("[data-olvidar]").addEventListener("click", async () => {
    if (!confirm("¿Borrar lo que Braqui ha aprendido de tus intereses en este navegador?")) return;
    await api("/actividad", { metodo: "DELETE" }).catch(() => null);
    historial = [];
    guardar();
    inicializar();
    toast("Listo: empezamos de cero 🦴");
  });

  // La burbuja de saludo se oculta sola tras unos segundos o al empezar a bajar
  const burbuja = raiz.querySelector(".braqui-burbuja");
  const ocultarBurbuja = () => raiz.classList.add("sin-burbuja");
  setTimeout(ocultarBurbuja, 9000);
  window.addEventListener("scroll", () => window.scrollY > 400 && ocultarBurbuja(), { passive: true });
  burbuja.addEventListener("click", () => alternar(true));

  // Saludo proactivo según lo que el visitante ha explorado
  api(`/recomendaciones?limite=1${window.DinoActual ? "&excluir=" + window.DinoActual.id : ""}`).then(p => {
    const r = p?.recomendaciones?.[0];
    if (!r || p.totalInteracciones < 3 || historial.length) return;
    burbuja.textContent = `¿Ya conoces al ${r.nombre}? Creo que te va a gustar 🌿`;
  }).catch(() => { /* sin datos: saludo por defecto */ });

  // La ficha de un dinosaurio se carga después: se actualiza el saludo y las sugerencias
  if (pagina === "dinosaurio") {
    const esperar = setInterval(() => {
      if (!window.DinoActual) return;
      clearInterval(esperar);
      if (!historial.length) inicializar(); else pintarSugerencias();
      setTimeout(retomarPendiente, 400);
    }, 300);
    setTimeout(() => clearInterval(esperar), 15000);
  }

  /* =========================================================
     Acciones: Braqui hace las cosas por ti
     ========================================================= */
  const PENDIENTE = "dg_braqui_pendiente", REABRIR = "dg_braqui_abierto";

  /** Avisa en el chat y navega tras un momento (para que se lea el mensaje). El chat sigue abierto en la otra página. */
  function navegar(url, etiqueta, accionAlLlegar = null) {
    sessionStorage.setItem(REABRIR, "1");
    if (accionAlLlegar) sessionStorage.setItem(PENDIENTE, JSON.stringify(accionAlLlegar));
    const aviso = document.createElement("div");
    aviso.className = "accion-aviso";
    aviso.innerHTML = `<span class="escribiendo"><span></span><span></span><span></span></span> ${esc(etiqueta)}`;
    lista.appendChild(aviso);
    lista.scrollTop = lista.scrollHeight;
    setTimeout(() => (location.href = url), 1300);
  }

  const enFicha = id => pagina === "dinosaurio" && window.DinoActual && Number(window.DinoActual.id) === Number(id);
  const urlDino = (id, ancla = "") => `/dinosaurio.html?id=${encodeURIComponent(id)}${ancla}`;

  async function ejecutar(a) {
    switch (a.tipo) {
      case "abrir_dinosaurio":
        if (enFicha(a.dinosaurio_id)) window.scrollTo({ top: 0, behavior: "smooth" });
        else navegar(urlDino(a.dinosaurio_id), "Abriendo la ficha…");
        break;
      case "rugir":
        if (enFicha(a.dinosaurio_id)) window.BraquiPagina?.rugir();
        else navegar(urlDino(a.dinosaurio_id, "#modelo3d"), "Yendo a escucharlo…", { tipo: "rugir", dinosaurio_id: a.dinosaurio_id });
        break;
      case "ver_modelo3d":
        if (enFicha(a.dinosaurio_id)) window.BraquiPagina?.ver3d();
        else navegar(urlDino(a.dinosaurio_id, "#modelo3d"), "Preparando el modelo 3D…", { tipo: "ver_modelo3d", dinosaurio_id: a.dinosaurio_id });
        break;
      case "buscar": {
        const filtros = { q: a.texto || "", periodo: a.periodo || "", dieta: a.dieta || "", grupo: a.grupo || "" };
        if (pagina === "inicio" && window.BraquiPagina?.filtrar) window.BraquiPagina.filtrar(filtros);
        else {
          const p = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v));
          navegar(`/?${p}#glosario`, "Buscando en el glosario…");
        }
        break;
      }
      case "ir_a": {
        const destinos = { inicio: "/", eras: "/#eras", panel: "/panel.html", acceso: "/acceso.html", test: "/?test" };
        if (a.pagina === "panel" && !Sesion.esPaleontologo()) {
          pintar("assistant", "El panel es solo para **paleontólogos**. Si tienes código de acreditación, dime y creo tu cuenta de paleontólogo ahora mismo.");
        } else if (a.pagina === "eras" && pagina === "inicio") {
          document.getElementById("eras")?.scrollIntoView({ behavior: "smooth" });
        } else if (destinos[a.pagina]) navegar(destinos[a.pagina], "Te llevo…");
        break;
      }
      case "musica":
        if (a.encender === false) window.Musica?.apagar(); else window.Musica?.encender();
        break;
      case "formulario_acceso":
        pintarFormularioAcceso(a);
        break;
      case "cerrar_sesion":
        Sesion.cerrar();
        renderNav();
        toast("Sesión cerrada. ¡Hasta la próxima era!");
        break;
      case "olvidar_intereses":
        await api("/actividad", { metodo: "DELETE" }).catch(() => null);
        break;
    }
  }

  /* ---------- Formulario seguro de acceso dentro del chat ----------
     La contraseña se escribe aquí y viaja SOLO a nuestro backend: nunca al chat ni a la IA. */
  function pintarFormularioAcceso(a) {
    const registro = a.modo === "registro";
    const paleo = a.rol === "PALEONTOLOGO";
    const caja = document.createElement("div");
    caja.className = "msg bot form-chat";
    caja.innerHTML = `
      <form novalidate autocomplete="on">
        <strong>${registro ? "Crear tu cuenta" : "Iniciar sesión"}</strong>
        ${registro ? `<input name="nombre" placeholder="Nombre completo" maxlength="80" autocomplete="name">` : ""}
        <input name="email" type="email" placeholder="Correo" maxlength="120" autocomplete="email">
        <input name="password" type="password" placeholder="Contraseña" maxlength="64"
               autocomplete="${registro ? "new-password" : "current-password"}">
        ${registro ? `
          <input name="confirmar" type="password" placeholder="Repite la contraseña" maxlength="64" autocomplete="new-password">
          <select name="rol">
            <option value="USUARIO">Explorador (solo consultar)</option>
            <option value="PALEONTOLOGO">Paleontólogo (registrar dinosaurios)</option>
          </select>
          <div class="solo-paleo">
            <input name="institucion" placeholder="Institución" maxlength="120">
            <input name="especialidad" placeholder="Especialidad" maxlength="120">
            <input name="codigoAcreditacion" placeholder="Código de acreditación" maxlength="40">
          </div>` : ""}
        <div class="form-chat-error" role="alert"></div>
        <button type="submit" class="btn btn-sm btn-solido">${registro ? "Crear cuenta" : "Entrar"}</button>
        <small>🔒 Tu contraseña va directa al servidor; Braqui no la ve.</small>
      </form>`;
    lista.appendChild(caja);
    const f = caja.querySelector("form");
    const error = caja.querySelector(".form-chat-error");
    const set = (n, v) => { if (f[n] && v) f[n].value = v; };
    set("nombre", a.nombre); set("email", a.email); set("institucion", a.institucion); set("especialidad", a.especialidad);
    if (registro) {
      f.rol.value = paleo ? "PALEONTOLOGO" : "USUARIO";
      const alternarPaleo = () => caja.querySelector(".solo-paleo").hidden = f.rol.value !== "PALEONTOLOGO";
      f.rol.addEventListener("change", alternarPaleo);
      alternarPaleo();
    }
    lista.scrollTop = lista.scrollHeight;
    (f.querySelector("input:placeholder-shown") || f.password).focus();

    f.addEventListener("submit", async e => {
      e.preventDefault();
      error.textContent = "";
      const v = n => (f[n]?.value || "").trim();
      if (registro) {
        if (v("password") !== v("confirmar")) { error.textContent = "Las contraseñas no coinciden."; return; }
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,64}$/.test(v("password"))) {
          error.textContent = "La contraseña necesita 8 caracteres o más, con mayúscula, minúscula y número."; return;
        }
      }
      const cuerpo = registro
        ? { nombre: v("nombre"), email: v("email"), password: f.password.value, rol: f.rol.value,
            institucion: v("institucion") || null, especialidad: v("especialidad") || null,
            codigoAcreditacion: v("codigoAcreditacion") || null }
        : { email: v("email"), password: f.password.value };
      const boton = f.querySelector("button");
      boton.disabled = true;
      try {
        const datos = await api(registro ? "/auth/registro" : "/auth/login", { metodo: "POST", cuerpo });
        Sesion.guardar(datos);
        renderNav();
        const u = datos.usuario;
        const nombre = u.nombre.replace(/^(Dra?\.|Sr\.|Sra\.)\s+/, "").split(" ")[0];
        const texto = (registro ? `✅ ¡Cuenta creada! Ya estás dentro, **${nombre}**.` : `✅ ¡Listo, ${nombre}! Ya iniciaste sesión.`)
          + (u.rol === "PALEONTOLOGO" ? " Como **paleontólogo** puedes registrar dinosaurios: dime «llévame al panel»." : " ¿Qué quieres explorar?");
        caja.replaceWith(pintar("assistant", texto));
        historial.push({ rol: "assistant", contenido: texto.replace(/\*\*/g, "") });
        guardar();
        toast(registro ? "Cuenta creada 🦕" : "Sesión iniciada 🦕");
      } catch (ex) {
        const campos = Object.values(ex.campos || {});
        error.textContent = campos.length ? campos.join(" · ") : ex.message;
        boton.disabled = false;
      }
    });
  }

  /** Acción que quedó pendiente al cambiar de página (p. ej. «hazlo rugir» desde la portada). */
  function retomarPendiente() {
    let a;
    try { a = JSON.parse(sessionStorage.getItem(PENDIENTE)); } catch { a = null; }
    if (!a) return;
    if (!enFicha(a.dinosaurio_id)) return;
    sessionStorage.removeItem(PENDIENTE);
    window.BraquiPagina?.ver3d();
    if (a.tipo !== "rugir") return;
    // Los navegadores solo permiten sonido tras un gesto del usuario en ESTA página
    const tocar = () => setTimeout(() => window.BraquiPagina?.rugir(), 250);
    if (navigator.userActivation?.hasBeenActive) tocar();
    else {
      pintar("assistant", "🔊 Toca cualquier parte de la página y lo escucharás rugir.");
      addEventListener("pointerdown", tocar, { once: true });
    }
  }

  // Al terminar el test de gustos: Braqui retoma la conversación con lo que contestaste
  document.addEventListener("dg:perfil-actualizado", () => {
    try { historial = JSON.parse(sessionStorage.getItem(CLAVE)) || []; } catch { historial = []; }
    inicializar();
    setTimeout(() => alternar(true), 1500);
  });

  if (sessionStorage.getItem(REABRIR)) {
    sessionStorage.removeItem(REABRIR);
    alternar(true);
  }

  inicializar();
})();
