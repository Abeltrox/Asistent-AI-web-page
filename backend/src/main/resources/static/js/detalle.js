/* Página de detalle de un dinosaurio: ficha, modelo 3D con sonido, Wikipedia y recomendaciones */
document.addEventListener("DOMContentLoaded", async () => {
  const main = document.getElementById("contenido");
  const id = new URLSearchParams(location.search).get("id");

  if (!id || !/^\d+$/.test(id)) {
    main.innerHTML = `<div class="acceso"><div class="vacio">Dinosaurio no especificado. <a href="/">Volver</a></div></div>`;
    return;
  }

  let d;
  try {
    d = await api(`/dinosaurios/${id}`);
  } catch (e) {
    main.innerHTML = `<div class="acceso"><div class="vacio">${esc(e.message)}<br><br><a href="/">← Volver al glosario</a></div></div>`;
    return;
  }

  // Contexto para Braqui y registro de la visita (aprende de tus intereses)
  window.DinoActual = { id: d.id, nombre: d.nombre };
  registrarActividad("VISTA", { dinosaurioId: d.id });

  document.title = `${d.nombre} · DinoGlosario`;
  const tituloWiki = Wiki.titulo(d);
  const portada = d.imagenes[0]?.url;
  const fecha = new Date(d.fechaActualizacion).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });
  const sonido = window.DinoAudio?.descripcion(d) || "sonido recreado";

  main.innerHTML = `
    <header class="detalle-hero">
      <div class="fondo" data-parallax="0.3">
        <img class="suave" src="${esc(portada || PLACEHOLDER)}" alt="" referrerpolicy="no-referrer"
             data-wiki="${esc(tituloWiki)}" ${portada ? "" : "data-sin-foto"}>
      </div>
      <div class="contenedor">
        <a href="/#glosario" class="revelar">← Glosario</a>
        <h1 class="revelar" style="--retraso:.1s;margin-top:.3em">${esc(d.nombre)}</h1>
        <div class="cientifico revelar" style="--retraso:.2s">${esc(d.nombreCientifico)}</div>
        ${d.significadoNombre ? `<p class="revelar" style="--retraso:.25s;color:var(--gris)">«${esc(d.significadoNombre)}»</p>` : ""}
        <div class="chips revelar" style="--retraso:.3s">
          <span class="chip">${esc(d.periodoNombre)} · ${esc(d.periodoRango)}</span>
          <span class="chip verde">${esc(d.dietaNombre)}</span>
          ${d.grupoNombre ? `<span class="chip" title="${esc(d.grupoDescripcion)}">${esc(d.grupoNombre)}</span>` : ""}
        </div>
        <div class="revelar" style="--retraso:.4s;display:flex;gap:10px;margin-top:24px;flex-wrap:wrap">
          <a class="btn btn-sm btn-solido" href="#modelo3d">Ver en 3D</a>
          <button class="btn btn-sm" type="button" data-rugir>🔊 Escuchar</button>
          ${Sesion.esPaleontologo() ? `
            <a class="btn btn-sm" href="/panel.html?id=${d.id}">Editar</a>
            <button class="btn btn-sm btn-peligro" id="btnEliminar" type="button">Eliminar</button>` : ""}
        </div>
      </div>
    </header>

    <div class="contenedor">
      <div class="medidas">
        <div class="medida revelar" style="--retraso:0s"><strong>${num(d.longitudMetros)}</strong><span>Longitud (m)</span></div>
        <div class="medida revelar" style="--retraso:.08s"><strong>${num(d.alturaMetros)}</strong><span>Altura (m)</span></div>
        <div class="medida revelar" style="--retraso:.16s"><strong>${num(d.pesoToneladas)}</strong><span>Peso (t)</span></div>
        <div class="medida revelar" style="--retraso:.24s"><strong>${num(d.velocidadKmh)}</strong><span>Velocidad (km/h)</span></div>
        <div class="medida revelar" style="--retraso:.32s"><strong>${d.anioDescubrimiento ?? "—"}</strong><span>Descubierto</span></div>
      </div>
    </div>

    <section class="seccion" id="modelo3d">
      <div class="contenedor">
        <div class="seccion-cabecera">
          <div class="revelar izq">
            <span class="eyebrow">Modelo interactivo</span>
            <h2>${esc(d.nombre)} en 3D</h2>
          </div>
          <p class="revelar der">Arrastra para girar, usa la rueda o pellizca para acercarte. La figura dorada es una
            persona de 1,75 m, a escala real.</p>
        </div>
        <div class="visor-marco revelar">
          <div class="visor3d" id="visor3d"><div class="visor-cargando"><span class="escribiendo"><span></span><span></span><span></span></span> Preparando el modelo…</div></div>
          <div class="visor-barra">
            <button class="btn btn-sm btn-solido" type="button" data-rugir>🦖 Rugir</button>
            <button class="btn btn-sm" type="button" id="btnHumano" aria-pressed="true">Persona a escala</button>
            <button class="btn btn-sm" type="button" id="btnGirar" aria-pressed="true">Giro automático</button>
          </div>
        </div>
        <p class="nota-sonido revelar">🔊 <strong>Sonido recreado:</strong> ${esc(sonido)}. Nadie sabe con certeza cómo
          sonaban los dinosaurios; estas recreaciones se basan en sus parientes vivos (aves y cocodrilos) y en su tamaño.
          ${d.modelo3dUrl ? "" : "El modelo es una reconstrucción simplificada generada a partir de su grupo anatómico."}</p>
      </div>
    </section>

    <section class="seccion" style="padding-top:0">
      <div class="contenedor detalle-grid">
        <div class="revelar izq">
          <span class="eyebrow">Descripción</span>
          <h2>Sobre el ${esc(d.nombre)}</h2>
          <p class="descripcion">${esc(d.descripcion)}</p>
          <div class="wiki-resumen" id="wikiResumen" hidden></div>
        </div>
        <aside class="tarjeta revelar der">
          <h3>Ficha técnica</h3>
          <dl class="ficha">
            ${d.grupoNombre ? `<dt>Grupo</dt><dd>${esc(d.grupoNombre)}</dd>` : ""}
            ${d.habitat ? `<dt>Hábitat</dt><dd>${esc(d.habitat)}</dd>` : ""}
            <dt>Región del hallazgo</dt><dd>${esc(d.regionDescubrimiento || "—")}</dd>
            <dt>Descubridor</dt><dd>${esc(d.descubridor || "—")}</dd>
            <dt>Registrado por</dt><dd>${esc(d.registradoPor || "—")}</dd>
            <dt>Última edición</dt><dd>${esc(d.actualizadoPor || "—")} · ${esc(fecha)}</dd>
          </dl>
        </aside>
      </div>
    </section>

    ${d.curiosidades?.length ? `
    <section class="seccion" style="padding-top:0">
      <div class="contenedor">
        <span class="eyebrow revelar">¿Sabías que…?</span>
        <h2 class="revelar">Curiosidades</h2>
        <div class="curiosidades">
          ${d.curiosidades.map((c, i) => `<div class="curiosidad revelar" style="--retraso:${(i % 3) * 0.1}s"><span>✦</span><p>${esc(c)}</p></div>`).join("")}
        </div>
      </div>
    </section>` : ""}

    ${d.caracteristicas.length ? `
    <section class="seccion" style="padding-top:0">
      <div class="contenedor">
        <div class="tarjeta revelar">
          <span class="eyebrow">Anatomía y comportamiento</span>
          <h2>Características</h2>
          <ul class="lista-caracteristicas">
            ${d.caracteristicas.map((c, i) => `
              <li class="revelar" style="--retraso:${i * 0.06}s"><span>${esc(c.nombre)}</span><span>${esc(c.valor)}</span></li>`).join("")}
          </ul>
        </div>
      </div>
    </section>` : ""}

    ${d.imagenes.length ? `
    <section class="seccion" style="padding-top:0">
      <div class="contenedor">
        <span class="eyebrow revelar">Archivo del glosario</span>
        <h2 class="revelar">Fotos de referencia</h2>
        <div class="galeria">
          ${d.imagenes.map((img, i) => `
            <figure class="revelar zoom" style="--retraso:${(i % 3) * 0.12}s">
              <img class="suave" src="${esc(img.url)}" alt="${esc(img.descripcion || d.nombre)}" loading="lazy"
                   referrerpolicy="no-referrer" data-wiki="${esc(tituloWiki)}">
              <figcaption>${esc(img.descripcion || d.nombre)}</figcaption>
            </figure>`).join("")}
        </div>
      </div>
    </section>` : ""}

    <section class="seccion" style="padding-top:0" id="seccionWikimedia" hidden>
      <div class="contenedor">
        <span class="eyebrow revelar">Wikimedia Commons</span>
        <h2 class="revelar">Fósiles, museos y reconstrucciones</h2>
        <div class="galeria" id="galeriaWiki"></div>
        <p class="nota-sonido">Imágenes de Wikimedia Commons; autor y licencia en cada una (pulsa para ampliar y ver la fuente).</p>
      </div>
    </section>

    <section class="seccion" style="padding-top:0" id="seccionRecs" hidden>
      <div class="contenedor">
        <span class="eyebrow revelar">Elegidos para ti</span>
        <h2 class="revelar">Te puede interesar</h2>
        <div class="recs" id="recs"></div>
      </div>
    </section>`;

  activarRevelado(main);
  activarImagenes(main);
  activarParallax();
  completarImagenesWiki(main);

  /* ---------- Sonido + modelo 3D ---------- */
  let visor = null;
  const rugir = () => {
    window.DinoAudio?.reproducir(d);
    visor?.rugir();
    registrarActividad("SONIDO", { dinosaurioId: d.id });
  };
  main.querySelectorAll("[data-rugir]").forEach(b => b.addEventListener("click", rugir));

  // Lo que Braqui puede hacer en esta página
  const ver3d = () => document.getElementById("modelo3d")?.scrollIntoView({ behavior: "smooth", block: "start" });
  window.BraquiPagina = {
    rugir() { ver3d(); setTimeout(rugir, visor ? 400 : 1800); },
    ver3d
  };

  const contVisor = document.getElementById("visor3d");
  const cargarVisor = async () => {
    try {
      const { montarVisor } = await import("/js/visor3d.js");
      contVisor.innerHTML = "";
      visor = montarVisor(contVisor, d, {
        alInteractuar: () => registrarActividad("MODELO3D", { dinosaurioId: d.id })
      });
    } catch (e) {
      console.error(e);
      contVisor.innerHTML = `<div class="visor-cargando">No se pudo cargar el visor 3D (¿sin conexión o navegador sin WebGL?).</div>`;
    }
  };
  // Se carga cuando el visor se acerca a la pantalla
  new IntersectionObserver((entradas, obs) => {
    if (entradas[0].isIntersecting) { obs.disconnect(); cargarVisor(); }
  }, { rootMargin: "300px" }).observe(contVisor);

  const alternarBoton = (btn, activo) => btn.setAttribute("aria-pressed", String(activo));
  document.getElementById("btnHumano").addEventListener("click", e => visor && alternarBoton(e.currentTarget, visor.alternarHumano()));
  document.getElementById("btnGirar").addEventListener("click", e => visor && alternarBoton(e.currentTarget, visor.girar()));

  /* ---------- Wikipedia: resumen y galería ---------- */
  Wiki.resumen(tituloWiki).then(r => {
    if (!r) return;
    const caja = document.getElementById("wikiResumen");
    caja.innerHTML = `
      <span class="eyebrow">Según Wikipedia ${r.lang === "en" ? "(en inglés)" : ""}</span>
      <p>${esc(r.extracto)}</p>
      ${r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">Leer el artículo completo ↗</a>` : ""}`;
    caja.hidden = false;
  });

  Wiki.galeria(tituloWiki).then(imgs => {
    if (!imgs.length) return;
    const cont = document.getElementById("galeriaWiki");
    cont.innerHTML = imgs.map((img, i) => `
      <figure class="revelar zoom" style="--retraso:${(i % 3) * 0.1}s" data-fuente="${esc(img.pagina || "")}"
              data-credito="${esc([img.autor, img.licencia].filter(Boolean).join(" · "))}">
        <img class="suave" src="${esc(img.url)}" alt="${esc(img.descripcion)}" loading="lazy" referrerpolicy="no-referrer">
        <figcaption>${esc(img.descripcion)}<small>${esc([img.autor, img.licencia].filter(Boolean).join(" · "))}</small></figcaption>
      </figure>`).join("");
    document.getElementById("seccionWikimedia").hidden = false;
    activarRevelado(cont);
    activarImagenes(cont);
    conectarLightbox(cont);
  });

  /* ---------- Recomendaciones personalizadas ---------- */
  api(`/recomendaciones?excluir=${d.id}&limite=4`).then(p => {
    if (!p?.recomendaciones?.length) return;
    const cont = document.getElementById("recs");
    cont.innerHTML = p.recomendaciones.map(r => tarjetaRecomendacion(r)).join("");
    document.getElementById("seccionRecs").hidden = false;
    activarImagenes(cont);
    completarImagenesWiki(cont);
  }).catch(() => { /* opcional */ });

  /* ---------- Lightbox ---------- */
  const lb = document.getElementById("lightbox");
  function conectarLightbox(raiz) {
    raiz.querySelectorAll(".galeria figure").forEach(fig => fig.addEventListener("click", () => {
      const img = fig.querySelector("img");
      lb.querySelector("img").src = img.src;
      const texto = img.alt + (fig.dataset.credito ? ` — ${fig.dataset.credito}` : "");
      const fuente = fig.dataset.fuente;
      lb.querySelector("p").innerHTML = esc(texto) +
        (fuente ? ` · <a href="${esc(fuente)}" target="_blank" rel="noopener">Ver fuente ↗</a>` : "");
      lb.classList.add("abierto");
    }));
  }
  conectarLightbox(main);
  const cerrar = () => lb.classList.remove("abierto");
  document.getElementById("cerrarLightbox").addEventListener("click", cerrar);
  lb.addEventListener("click", e => { if (e.target === lb) cerrar(); });
  document.addEventListener("keydown", e => e.key === "Escape" && cerrar());

  /* ---------- Eliminar (solo paleontólogos) ---------- */
  document.getElementById("btnEliminar")?.addEventListener("click", async () => {
    if (!confirm(`¿Eliminar definitivamente a ${d.nombre} del glosario?`)) return;
    try {
      await api(`/dinosaurios/${d.id}`, { metodo: "DELETE" });
      toast(`${d.nombre} fue eliminado del glosario`);
      setTimeout(() => (location.href = "/#glosario"), 800);
    } catch (e) {
      toast(e.message, "error");
    }
  });
});
