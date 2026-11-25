/* Página principal: recomendaciones, listado, búsqueda, filtros y curiosidades */
document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById("grid");
  const form = document.getElementById("filtros");
  let todos = [];

  if (Sesion.usuario) {
    const cta = document.getElementById("ctaAcceso");
    if (Sesion.esPaleontologo()) { cta.textContent = "Registrar dinosaurio"; cta.href = "/panel.html"; }
    else cta.remove();
  }

  /* ---------- Recomendaciones personalizadas ---------- */
  async function cargarRecomendaciones() {
    let p;
    try { p = await api("/recomendaciones?limite=4"); } catch { return; }
    if (!p?.recomendaciones?.length) return;
    const nuevo = p.totalInteracciones === 0;
    const nombre = Sesion.usuario?.nombre?.replace(/^(Dra?\.|Sr\.|Sra\.)\s+/, "").split(" ")[0];
    document.getElementById("recsEyebrow").textContent = nuevo ? "Empieza aquí" : "Elegidos para ti";
    document.getElementById("recsTitulo").textContent = nuevo
      ? "Tu primera expedición"
      : `${nombre ? nombre + ", tu" : "Tu"} próxima expedición`;
    document.getElementById("recsTexto").textContent = nuevo
      ? "Una muestra variada para empezar. A medida que explores, Braqui y el glosario aprenderán qué te gusta."
      : "Según lo que has explorado, buscado y conversado con Braqui, creemos que estos te van a encantar.";
    const intereses = document.getElementById("recsIntereses");
    intereses.innerHTML = p.etiquetas.length
      ? `<span>Tus intereses:</span> ${p.etiquetas.map(e => `<span class="chip">${esc(e)}</span>`).join("")}
         <button type="button" class="enlace-sutil" id="olvidar">Olvidar mis intereses</button>`
      : "";
    document.getElementById("olvidar")?.addEventListener("click", async () => {
      if (!confirm("¿Borrar todo lo que el glosario ha aprendido de tus intereses en este navegador?")) return;
      await api("/actividad", { metodo: "DELETE" }).catch(() => null);
      toast("Listo: empezamos de cero 🦴");
      cargarRecomendaciones();
    });
    const cont = document.getElementById("recsInicio");
    cont.innerHTML = p.recomendaciones.map(r => tarjetaRecomendacion(r)).join("");
    document.getElementById("paraTi").hidden = false;
    activarRevelado(document.getElementById("paraTi"));
    activarImagenes(cont);
    completarImagenesWiki(cont);
  }
  cargarRecomendaciones();
  document.addEventListener("dg:perfil-actualizado", cargarRecomendaciones);

  /* ---------- Catálogos para los selects ---------- */
  try {
    const [periodos, dietas, grupos] = await Promise.all([
      api("/catalogos/periodos"), api("/catalogos/dietas"), api("/catalogos/grupos")]);
    periodos.forEach(p => form.periodo.add(new Option(p.nombre, p.valor)));
    dietas.forEach(d => form.dieta.add(new Option(d.nombre, d.valor)));
    grupos.forEach(g => { const o = new Option(g.nombre, g.valor); o.title = g.descripcion; form.grupo.add(o); });
  } catch { /* los filtros quedan con "Todos" */ }

  /* ---------- Tarjetas ---------- */
  const tarjeta = (d, i) => {
    const img = d.imagenes?.[0]?.url;
    return `
      <a class="dino-card revelar" style="--retraso:${(i % 3) * 0.12}s" href="/dinosaurio.html?id=${d.id}">
        <div class="foto">
          <span class="chip etiqueta-periodo">${esc(d.periodoNombre)}</span>
          <button type="button" class="card-sonido" data-sonido="${d.id}" aria-label="Escuchar a ${esc(d.nombre)}" title="Escuchar">🔊</button>
          <img class="suave" src="${esc(img || PLACEHOLDER)}" alt="${esc(d.nombre)}" loading="lazy" referrerpolicy="no-referrer"
               data-wiki="${esc(Wiki.titulo(d))}" ${img ? "" : "data-sin-foto"}>
        </div>
        <div class="cuerpo">
          <h3>${esc(d.nombre)}</h3>
          <span class="cientifico">${esc(d.nombreCientifico)}</span>
          <p class="resumen">${esc(d.descripcion)}</p>
          <div class="meta">
            <span>${esc(d.grupoNombre || d.dietaNombre)}</span>
            <span>${num(d.longitudMetros, " m")}</span>
            <span>${num(d.pesoToneladas, " t")}</span>
          </div>
        </div>
      </a>`;
  };

  // Escuchar desde la tarjeta sin abrir la ficha
  grid.addEventListener("click", e => {
    const b = e.target.closest("[data-sonido]");
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    const d = todos.find(x => String(x.id) === b.dataset.sonido);
    if (!d) return;
    window.DinoAudio?.reproducir(d);
    b.classList.add("sonando");
    setTimeout(() => b.classList.remove("sonando"), 1800);
    registrarActividad("SONIDO", { dinosaurioId: d.id });
  });

  let ultimaBusqueda = "";
  async function cargar() {
    grid.innerHTML = Array(3).fill('<div class="esqueleto"></div>').join("");
    const params = new URLSearchParams();
    ["q", "periodo", "dieta", "grupo"].forEach(k => form[k].value && params.set(k, form[k].value));
    try {
      const dinos = await api(`/dinosaurios?${params}`);
      if (!params.toString()) {
        document.getElementById("statTotal").textContent = dinos.length;
        todos = dinos;
        curiosidad();
      } else {
        dinos.forEach(d => { if (!todos.some(t => t.id === d.id)) todos.push(d); });
      }
      grid.innerHTML = dinos.length
        ? dinos.map(tarjeta).join("")
        : `<div class="vacio" style="grid-column:1/-1">No encontramos dinosaurios con esos filtros. Pregúntale a Braqui 🦕</div>`;
      activarRevelado(grid);
      activarImagenes(grid);
      completarImagenesWiki(grid);
    } catch (e) {
      grid.innerHTML = `<div class="vacio" style="grid-column:1/-1">${esc(e.message)}</div>`;
    }
  }

  /* ---------- Aprender de búsquedas y filtros ---------- */
  let esperaBusqueda;
  form.q.addEventListener("input", () => {
    clearTimeout(esperaBusqueda);
    esperaBusqueda = setTimeout(() => {
      const q = form.q.value.trim();
      if (q.length >= 3 && q.toLowerCase() !== ultimaBusqueda) {
        ultimaBusqueda = q.toLowerCase();
        registrarActividad("BUSQUEDA", { valor: q });
      }
    }, 1500);
  });
  ["periodo", "dieta", "grupo"].forEach(k => form[k].addEventListener("change", () => {
    if (form[k].value) registrarActividad("FILTRO", { valor: `${k}:${form[k].value}` });
  }));

  let espera;
  form.addEventListener("input", () => { clearTimeout(espera); espera = setTimeout(cargar, 300); });
  form.addEventListener("submit", e => { e.preventDefault(); cargar(); });

  // Filtros que llegan por la URL (p. ej. cuando Braqui busca por ti desde otra página)
  const deUrl = new URLSearchParams(location.search);
  ["q", "periodo", "dieta", "grupo"].forEach(k => deUrl.get(k) && (form[k].value = deUrl.get(k)));
  cargar();

  // Lo que Braqui puede hacer en esta página
  window.BraquiPagina = {
    filtrar(f) {
      ["q", "periodo", "dieta", "grupo"].forEach(k => (form[k].value = f[k] || ""));
      cargar();
      document.getElementById("glosario").scrollIntoView({ behavior: "smooth" });
    }
  };

  /* ---------- ¿Sabías que…? ---------- */
  function curiosidad() {
    const con = todos.filter(d => d.curiosidades?.length);
    if (!con.length) return;
    const d = con[Math.floor(Math.random() * con.length)];
    const texto = d.curiosidades[Math.floor(Math.random() * d.curiosidades.length)];
    const bloque = document.getElementById("sabiasTexto");
    bloque.classList.remove("aparecer");
    void bloque.offsetWidth; // reinicia la animación
    bloque.textContent = texto;
    bloque.classList.add("aparecer");
    const enlace = document.getElementById("sabiasEnlace");
    enlace.textContent = `Conoce al ${d.nombre} →`;
    enlace.href = `/dinosaurio.html?id=${d.id}`;
  }
  document.getElementById("sabiasOtra").addEventListener("click", curiosidad);
});
