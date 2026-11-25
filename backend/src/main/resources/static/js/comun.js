/* =========================================================
   Utilidades compartidas: API, sesión, navegación, animaciones
   ========================================================= */
const PLACEHOLDER = "/img/placeholder.svg";

const Sesion = {
  get token() { return localStorage.getItem("dg_token"); },
  get usuario() {
    try { return JSON.parse(localStorage.getItem("dg_usuario")); } catch { return null; }
  },
  guardar({ token, usuario }) {
    localStorage.setItem("dg_token", token);
    localStorage.setItem("dg_usuario", JSON.stringify(usuario));
  },
  cerrar() {
    localStorage.removeItem("dg_token");
    localStorage.removeItem("dg_usuario");
  },
  esPaleontologo() { return this.usuario?.rol === "PALEONTOLOGO"; }
};

/* -------- Visitante anónimo: identifica este navegador para aprender sus intereses sin pedir cuenta -------- */
const Visitante = {
  get id() {
    let id = localStorage.getItem("dg_visitante");
    if (!id || !/^[A-Za-z0-9-]{8,64}$/.test(id)) {
      id = crypto.randomUUID?.() || ("v-" + Date.now() + "-" + Math.random().toString(36).slice(2, 12));
      localStorage.setItem("dg_visitante", id);
    }
    return id;
  }
};

class ApiError extends Error {
  constructor(estado, cuerpo) {
    super(cuerpo?.mensaje || "Error de comunicación con el servidor");
    this.estado = estado;
    this.campos = cuerpo?.campos || {};
  }
}

async function api(ruta, { metodo = "GET", cuerpo, formData } = {}) {
  const headers = { "X-Visitante-Id": Visitante.id };
  if (Sesion.token) headers.Authorization = `Bearer ${Sesion.token}`;
  if (cuerpo !== undefined) headers["Content-Type"] = "application/json";

  let res;
  try {
    res = await fetch(`/api${ruta}`, {
      method: metodo,
      headers,
      body: formData ?? (cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined)
    });
  } catch {
    throw new ApiError(0, { mensaje: "No se pudo conectar con el servidor" });
  }

  if (res.status === 401 && Sesion.token) {
    Sesion.cerrar(); // token expirado
  }
  if (res.status === 204) return null;
  const datos = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, datos);
  return datos;
}

/* -------- Seguridad: escapar texto antes de insertarlo en HTML -------- */
function esc(texto) {
  return String(texto ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function num(valor, sufijo = "") {
  if (valor === null || valor === undefined) return "—";
  return Number(valor).toLocaleString("es", { maximumFractionDigits: 3 }) + sufijo;
}

/* -------- Notificaciones -------- */
function toast(mensaje, tipo = "ok") {
  let cont = document.querySelector(".toasts");
  if (!cont) {
    cont = document.createElement("div");
    cont.className = "toasts";
    document.body.appendChild(cont);
  }
  const t = document.createElement("div");
  t.className = `toast ${tipo === "error" ? "error" : ""}`;
  t.textContent = mensaje;
  cont.appendChild(t);
  setTimeout(() => {
    t.classList.add("saliendo");
    t.addEventListener("animationend", () => t.remove());
  }, 3800);
}

/* -------- Navegación -------- */
const LOGO_SVG = `<img src="/img/logo.png" alt="" style="width:40px;height:40px;border-radius:50%">`;

function renderNav() {
  const nav = document.querySelector(".nav");
  if (!nav) return;
  const u = Sesion.usuario;
  const enlacesSesion = u
    ? `${Sesion.esPaleontologo() ? `<a href="/panel.html" class="btn btn-sm">+ Nuevo dinosaurio</a>` : ""}
       <span class="usuario-chip ocultar-movil"><span class="nombre-chip">${esc(u.nombre)}</span>
         <span class="rol">${u.rol === "PALEONTOLOGO" ? "Paleontólogo" : "Explorador"}</span></span>
       <a href="#" id="btnSalir">Salir</a>`
    : `<a href="/acceso.html" class="btn btn-sm">Acceder</a>`;

  nav.innerHTML = `
    <div class="contenedor">
      <a href="/" class="logo">${LOGO_SVG}<span>Dino<em>Glosario</em></span></a>
      <div class="nav-links">
        <button type="button" class="btn-musica" id="btnMusica" aria-pressed="false" title="Música de fondo">
          <span class="ecualizador" aria-hidden="true"><i></i><i></i><i></i></span><span class="ocultar-movil">Música</span>
        </button>
        <a href="/#glosario" class="ocultar-movil">Glosario</a>
        <a href="/#eras" class="ocultar-movil">Eras</a>
        ${enlacesSesion}
      </div>
    </div>`;

  document.getElementById("btnSalir")?.addEventListener("click", e => {
    e.preventDefault();
    Sesion.cerrar();
    toast("Sesión cerrada. ¡Hasta la próxima era!");
    setTimeout(() => (location.href = "/"), 600);
  });

  document.getElementById("btnMusica").addEventListener("click", () => window.Musica?.alternar());
  window.Musica?.sincronizarBoton();

  const alScroll = () => nav.classList.toggle("scrolled", window.scrollY > 30);
  alScroll();
  window.addEventListener("scroll", alScroll, { passive: true });
}

/* -------- Revelado suave al hacer scroll -------- */
const observadorRevelar = new IntersectionObserver(entradas => {
  entradas.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add("visible");
      observadorRevelar.unobserve(e.target);
    }
  });
}, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

function activarRevelado(raiz = document) {
  raiz.querySelectorAll(".revelar:not(.visible)").forEach(el => observadorRevelar.observe(el));
}

/* -------- Imágenes: aparición suave + respaldo si fallan -------- */
function activarImagenes(raiz = document) {
  raiz.querySelectorAll("img.suave:not([data-lista])").forEach(img => {
    img.dataset.lista = "1";
    const listo = () => requestAnimationFrame(() => img.classList.add("cargada"));
    img.addEventListener("error", async () => {
      // 1º respaldo: la imagen del artículo de Wikipedia; 2º: el marcador de posición
      const titulo = img.dataset.wiki;
      if (titulo && !img.dataset.wikiIntentado) {
        img.dataset.wikiIntentado = "1";
        const url = (await Wiki.miniaturas([titulo]))[titulo];
        if (url && url !== img.src) { img.src = url; return; }
      }
      if (!img.src.endsWith(PLACEHOLDER)) img.src = PLACEHOLDER;
      else listo();
    });
    if (img.complete && img.naturalWidth) listo();
    else img.addEventListener("load", listo);
  });
}

/* -------- Parallax ligero -------- */
function activarParallax() {
  const capas = [...document.querySelectorAll("[data-parallax]")];
  if (!capas.length || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let pendiente = false;
  const mover = () => {
    const y = window.scrollY;
    capas.forEach(c => (c.style.transform = `translate3d(0, ${y * Number(c.dataset.parallax)}px, 0)`));
    pendiente = false;
  };
  window.addEventListener("scroll", () => {
    if (!pendiente) { pendiente = true; requestAnimationFrame(mover); }
  }, { passive: true });
}

/* -------- Formularios: mostrar errores por campo -------- */
function limpiarErrores(form) {
  form.querySelectorAll(".campo.invalido").forEach(c => c.classList.remove("invalido"));
}

function marcarError(form, nombre, mensaje) {
  const input = form.querySelector(`[name="${nombre}"]`);
  const campo = input?.closest(".campo") || form.querySelector(`[data-campo="${nombre}"]`);
  if (!campo) return false;
  campo.classList.add("invalido");
  let msg = campo.querySelector(".error-msg");
  if (!msg) {
    msg = document.createElement("div");
    msg.className = "error-msg";
    campo.appendChild(msg);
  }
  msg.textContent = mensaje;
  return true;
}

function mostrarErroresServidor(form, error, alerta) {
  let sinCampo = [];
  Object.entries(error.campos || {}).forEach(([campo, msg]) => {
    const base = campo.replace(/\[\d+\].*$/, ""); // caracteristicas[0].nombre -> caracteristicas
    if (!marcarError(form, campo, msg) && !marcarError(form, base, msg)) sinCampo.push(msg);
  });
  const texto = sinCampo.length ? sinCampo.join(" · ") : error.message;
  if (alerta) {
    alerta.textContent = texto;
    alerta.classList.add("visible");
  } else {
    toast(texto, "error");
  }
  form.querySelector(".campo.invalido input, .campo.invalido select, .campo.invalido textarea")?.focus();
}

document.addEventListener("DOMContentLoaded", () => {
  renderNav();
  activarRevelado();
  activarImagenes();
  activarParallax();
});

/* =========================================================
   Actividad: alimenta el perfil de intereses (fire-and-forget)
   ========================================================= */
function registrarActividad(tipo, { dinosaurioId = null, valor = null } = {}) {
  const headers = { "Content-Type": "application/json", "X-Visitante-Id": Visitante.id };
  if (Sesion.token) headers.Authorization = `Bearer ${Sesion.token}`;
  fetch("/api/actividad", {
    method: "POST", headers, keepalive: true,
    body: JSON.stringify({ tipo, dinosaurioId, valor: valor ? String(valor).slice(0, 300) : null })
  }).catch(() => { /* sin conexión: no es crítico */ });
}

/* =========================================================
   Wikipedia / Wikimedia Commons: imágenes y resúmenes reales
   (con caché local de 7 días y peticiones agrupadas)
   ========================================================= */
const Wiki = {
  CLAVE: "dg_wiki_v1",
  TTL: 7 * 24 * 3600 * 1000,
  _c: null,
  _pendientes: new Map(),
  _cache() {
    if (!this._c) { try { this._c = JSON.parse(localStorage.getItem(this.CLAVE)) || {}; } catch { this._c = {}; } }
    return this._c;
  },
  _guardar() { try { localStorage.setItem(this.CLAVE, JSON.stringify(this._c)); } catch { /* almacenamiento lleno */ } },
  _vigente(k) { const e = this._cache()[k]; return e && Date.now() - e.t < this.TTL ? e : null; },
  _poner(k, v) { this._cache()[k] = { t: Date.now(), v }; },

  titulo(d) { return d?.wikipediaTitulo || String(d?.nombreCientifico || "").split(" ")[0]; },

  /** Miniaturas de muchos artículos en UNA sola petición (máx. 50 títulos por llamada). */
  async miniaturas(titulos) {
    titulos = [...new Set(titulos.filter(Boolean))];
    const faltan = titulos.filter(t => !this._vigente("m:" + t));
    for (let i = 0; i < faltan.length; i += 50) {
      const lote = faltan.slice(i, i + 50);
      const clave = lote.join("|");
      if (!this._pendientes.has(clave)) {
        this._pendientes.set(clave, (async () => {
          const params = new URLSearchParams({
            action: "query", format: "json", formatversion: "2", redirects: "1", origin: "*",
            prop: "pageimages", piprop: "thumbnail", pithumbsize: "800", titles: clave
          });
          try {
            const j = await (await fetch(`https://en.wikipedia.org/w/api.php?${params}`)).json();
            const alias = {};
            (j.query?.normalized || []).forEach(n => (alias[n.to] = n.from));
            (j.query?.redirects || []).forEach(n => (alias[n.to] = alias[n.from] || n.from));
            (j.query?.pages || []).forEach(p => this._poner("m:" + (alias[p.title] || p.title), p.thumbnail?.source || null));
            lote.forEach(t => { if (!this._vigente("m:" + t)) this._poner("m:" + t, null); });
            this._guardar();
          } catch { /* sin conexión: se reintenta en la próxima visita */ }
        })());
      }
      await this._pendientes.get(clave);
      this._pendientes.delete(clave);
    }
    return Object.fromEntries(titulos.map(t => [t, this._vigente("m:" + t)?.v || null]));
  },

  /** Resumen del artículo: primero en español y, si no existe, en inglés. */
  async resumen(titulo) {
    const k = "r:" + titulo;
    const enCache = this._vigente(k);
    if (enCache) return enCache.v;
    for (const lang of ["es", "en"]) {
      try {
        const r = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(titulo)}`);
        if (!r.ok) continue;
        const j = await r.json();
        if (j.type === "disambiguation" || !j.extract) continue;
        const v = { lang, extracto: j.extract, url: j.content_urls?.desktop?.page, titulo: j.title };
        this._poner(k, v); this._guardar();
        return v;
      } catch { /* probar el siguiente idioma */ }
    }
    return null;
  },

  /** Galería de imágenes del artículo, con autor y licencia para atribuirlas correctamente. */
  async galeria(titulo, max = 9) {
    const k = "g:" + titulo;
    const enCache = this._vigente(k);
    if (enCache) return enCache.v;
    const params = new URLSearchParams({
      action: "query", format: "json", formatversion: "2", redirects: "1", origin: "*",
      generator: "images", titles: titulo, gimlimit: "50", prop: "imageinfo",
      iiprop: "url|extmetadata|mime", iiurlwidth: "720",
      iiextmetadatafilter: "ImageDescription|Artist|LicenseShortName"
    });
    try {
      const j = await (await fetch(`https://en.wikipedia.org/w/api.php?${params}`)).json();
      const texto = html => new DOMParser().parseFromString(html || "", "text/html").body.textContent.trim();
      const genero = titulo.split(" ")[0].toLowerCase();
      const imgs = (j.query?.pages || [])
        .map(p => ({ p, ii: p.imageinfo?.[0] }))
        .filter(({ p, ii }) => ii && /image\/(jpeg|png)/.test(ii.mime) && !/logo|icon|symbol|flag|commons-|wiki|question|ambox/i.test(p.title))
        .sort((a, b) => b.p.title.toLowerCase().includes(genero) - a.p.title.toLowerCase().includes(genero))
        .slice(0, max)
        .map(({ p, ii }) => {
          const m = ii.extmetadata || {};
          return {
            url: ii.thumburl || ii.url,
            grande: ii.url,
            pagina: ii.descriptionurl,
            descripcion: texto(m.ImageDescription?.value).slice(0, 160) || p.title.replace(/^File:|\.\w+$/g, ""),
            autor: texto(m.Artist?.value).slice(0, 80),
            licencia: m.LicenseShortName?.value || ""
          };
        });
      this._poner(k, imgs); this._guardar();
      return imgs;
    } catch {
      return [];
    }
  }
};

/** Pone la imagen de Wikipedia en las <img data-wiki data-sin-foto> que no tienen foto propia. */
async function completarImagenesWiki(raiz = document) {
  const imgs = [...raiz.querySelectorAll("img[data-wiki][data-sin-foto]")];
  if (!imgs.length) return;
  const mapa = await Wiki.miniaturas(imgs.map(i => i.dataset.wiki));
  imgs.forEach(img => {
    const url = mapa[img.dataset.wiki];
    img.removeAttribute("data-sin-foto");
    if (url) img.src = url;
  });
}

/* -------- Tarjeta compacta de recomendación (inicio, ficha y chat) -------- */
function tarjetaRecomendacion(r, { compacta = false } = {}) {
  const titulo = r.wikipediaTitulo || String(r.nombreCientifico).split(" ")[0];
  return `
    <a class="rec-card ${compacta ? "compacta" : ""}" href="/dinosaurio.html?id=${r.id}">
      <img class="suave" src="${esc(r.imagen || PLACEHOLDER)}" alt="${esc(r.nombre)}" loading="lazy"
           referrerpolicy="no-referrer" data-wiki="${esc(titulo)}" ${r.imagen ? "" : "data-sin-foto"}>
      <div>
        <strong>${esc(r.nombre)}</strong>
        <span class="cientifico">${esc(r.nombreCientifico)}</span>
        ${r.motivo ? `<span class="motivo">✦ ${esc(r.motivo)}</span>` : ""}
      </div>
    </a>`;
}
