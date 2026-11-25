/* Panel del paleontólogo: crear y editar dinosaurios */
document.addEventListener("DOMContentLoaded", async () => {
  if (!Sesion.esPaleontologo()) {
    toast("Necesitas una cuenta de paleontólogo para acceder al panel", "error");
    setTimeout(() => (location.href = "/acceso.html"), 900);
    return;
  }

  const form = document.getElementById("formDino");
  const alerta = form.querySelector(".alerta");
  const contCaracs = document.getElementById("caracteristicas");
  const previews = document.getElementById("previews");
  const id = new URLSearchParams(location.search).get("id");
  let imagenes = []; // [{url, descripcion}]

  const MAX_IMG = 12, MAX_CARAC = 30;
  const CIENTIFICO = /^[A-Z][a-z]+( [a-z]+){0,2}$/;
  const URL_IMG = /^(https?:\/\/\S+|\/uploads\/[\w.-]+|\/img\/[\w./-]+)$/;

  /* ---------- Catálogos ---------- */
  const [periodos, dietas, grupos] = await Promise.all([
    api("/catalogos/periodos"), api("/catalogos/dietas"), api("/catalogos/grupos")]);
  periodos.forEach(p => form.periodo.add(new Option(`${p.nombre} (${p.rango})`, p.valor)));
  dietas.forEach(d => form.dieta.add(new Option(d.nombre, d.valor)));
  grupos.forEach(g => form.grupo.add(new Option(g.nombre, g.valor)));
  const ayudaGrupo = document.getElementById("grupoAyuda"), ayudaBase = ayudaGrupo.textContent;
  form.grupo.addEventListener("change", () => {
    ayudaGrupo.textContent = grupos.find(g => g.valor === form.grupo.value)?.descripcion || ayudaBase;
  });

  /* ---------- Características dinámicas ---------- */
  function agregarCaracteristica(nombre = "", valor = "") {
    if (contCaracs.children.length >= MAX_CARAC) return toast("Máximo 30 características", "error");
    const fila = document.createElement("div");
    fila.className = "fila-dinamica";
    fila.innerHTML = `
      <input class="c-nombre" maxlength="60" placeholder="Ej. Garras" aria-label="Nombre de la característica">
      <input class="c-valor" maxlength="300" placeholder="Ej. Garra en hoz de 6.5 cm" aria-label="Valor de la característica">
      <button type="button" class="btn-icono" aria-label="Quitar">×</button>`;
    fila.querySelector(".c-nombre").value = nombre;
    fila.querySelector(".c-valor").value = valor;
    fila.querySelector("button").addEventListener("click", () => fila.remove());
    contCaracs.appendChild(fila);
  }
  document.getElementById("agregarCaracteristica").addEventListener("click", () => {
    agregarCaracteristica();
    contCaracs.lastElementChild?.querySelector("input").focus();
  });

  /* ---------- Imágenes ---------- */
  function pintarImagenes() {
    previews.innerHTML = "";
    imagenes.forEach((img, i) => {
      const div = document.createElement("div");
      div.className = "preview";
      div.innerHTML = `
        <img class="suave" src="${esc(img.url)}" alt="" referrerpolicy="no-referrer">
        <button type="button" aria-label="Quitar imagen">×</button>
        <input maxlength="200" placeholder="Descripción" aria-label="Descripción de la imagen">`;
      const desc = div.querySelector("input");
      desc.value = img.descripcion || "";
      desc.addEventListener("input", () => (img.descripcion = desc.value));
      div.querySelector("button").addEventListener("click", () => { imagenes.splice(i, 1); pintarImagenes(); });
      previews.appendChild(div);
    });
    activarImagenes(previews);
  }

  async function subir(archivos) {
    for (const archivo of archivos) {
      if (imagenes.length >= MAX_IMG) { toast("Máximo 12 imágenes", "error"); break; }
      if (!/^image\/(jpeg|png|webp|gif)$/.test(archivo.type)) { toast(`${archivo.name}: formato no permitido`, "error"); continue; }
      if (archivo.size > 5 * 1024 * 1024) { toast(`${archivo.name}: supera 5 MB`, "error"); continue; }
      const fd = new FormData();
      fd.append("archivo", archivo);
      try {
        const { url } = await api("/archivos/imagen", { metodo: "POST", formData: fd });
        imagenes.push({ url, descripcion: "" });
        pintarImagenes();
      } catch (e) {
        toast(`${archivo.name}: ${e.message}`, "error");
      }
    }
  }

  const zona = document.getElementById("zonaSubida");
  document.getElementById("archivo").addEventListener("change", e => { subir([...e.target.files]); e.target.value = ""; });
  ["dragenter", "dragover"].forEach(t => zona.addEventListener(t, e => { e.preventDefault(); zona.classList.add("arrastrando"); }));
  ["dragleave", "drop"].forEach(t => zona.addEventListener(t, e => { e.preventDefault(); zona.classList.remove("arrastrando"); }));
  zona.addEventListener("drop", e => subir([...e.dataTransfer.files]));

  document.getElementById("agregarUrl").addEventListener("click", () => {
    const input = document.getElementById("urlImagen");
    const url = input.value.trim();
    if (!/^https?:\/\/\S+$/.test(url)) return toast("La URL debe empezar por http:// o https://", "error");
    if (imagenes.length >= MAX_IMG) return toast("Máximo 12 imágenes", "error");
    imagenes.push({ url, descripcion: "" });
    input.value = "";
    pintarImagenes();
  });

  /* ---------- Contador de descripción ---------- */
  const contador = document.getElementById("contador");
  form.descripcion.addEventListener("input", () => (contador.textContent = form.descripcion.value.length));
  form.addEventListener("input", e => e.target.closest(".campo")?.classList.remove("invalido"));

  /* ---------- Modo edición ---------- */
  if (id) {
    document.getElementById("titulo").textContent = "Editar dinosaurio";
    document.getElementById("cancelar").href = `/dinosaurio.html?id=${encodeURIComponent(id)}`;
    try {
      const d = await api(`/dinosaurios/${encodeURIComponent(id)}`);
      ["nombre", "nombreCientifico", "significadoNombre", "periodo", "dieta", "grupo", "longitudMetros", "alturaMetros",
        "pesoToneladas", "velocidadKmh", "habitat", "regionDescubrimiento", "anioDescubrimiento", "descubridor",
        "descripcion", "modelo3dUrl", "wikipediaTitulo"]
        .forEach(k => (form[k].value = d[k] ?? ""));
      form.curiosidades.value = (d.curiosidades || []).join("\n");
      contador.textContent = form.descripcion.value.length;
      d.caracteristicas.forEach(c => agregarCaracteristica(c.nombre, c.valor));
      imagenes = d.imagenes.map(i => ({ ...i }));
      pintarImagenes();
    } catch (e) {
      toast(e.message, "error");
    }
  } else {
    agregarCaracteristica();
  }

  /* ---------- Envío ---------- */
  const numero = v => (v === "" ? null : Number(v));
  const texto = v => (v.trim() === "" ? null : v.trim());

  form.addEventListener("submit", async e => {
    e.preventDefault();
    limpiarErrores(form);
    alerta.classList.remove("visible");

    const caracteristicas = [...contCaracs.children]
      .map(f => ({ nombre: f.querySelector(".c-nombre").value.trim(), valor: f.querySelector(".c-valor").value.trim() }))
      .filter(c => c.nombre || c.valor);

    const datos = {
      nombre: form.nombre.value.trim(),
      nombreCientifico: form.nombreCientifico.value.trim(),
      significadoNombre: texto(form.significadoNombre.value),
      periodo: form.periodo.value || null,
      dieta: form.dieta.value || null,
      grupo: form.grupo.value || null,
      velocidadKmh: numero(form.velocidadKmh.value),
      habitat: texto(form.habitat.value),
      curiosidades: form.curiosidades.value.split("\n").map(l => l.trim()).filter(Boolean),
      modelo3dUrl: texto(form.modelo3dUrl.value),
      wikipediaTitulo: texto(form.wikipediaTitulo.value),
      longitudMetros: numero(form.longitudMetros.value),
      alturaMetros: numero(form.alturaMetros.value),
      pesoToneladas: numero(form.pesoToneladas.value),
      regionDescubrimiento: texto(form.regionDescubrimiento.value),
      anioDescubrimiento: numero(form.anioDescubrimiento.value),
      descubridor: texto(form.descubridor.value),
      descripcion: form.descripcion.value.trim(),
      caracteristicas,
      imagenes: imagenes.map(i => ({ url: i.url, descripcion: texto(i.descripcion || "") }))
    };

    // Validación en cliente (espejo de la del servidor)
    const err = [];
    if (datos.nombre.length < 2) err.push(["nombre", "El nombre debe tener al menos 2 caracteres"]);
    if (!CIENTIFICO.test(datos.nombreCientifico)) err.push(["nombreCientifico", "Usa nomenclatura binomial, p. ej. 'Tyrannosaurus rex'"]);
    if (!datos.periodo) err.push(["periodo", "Selecciona un periodo"]);
    if (!datos.dieta) err.push(["dieta", "Selecciona una dieta"]);
    const rango = (k, min, max, etiqueta) => {
      const v = datos[k];
      if (v !== null && (Number.isNaN(v) || v < min || v > max)) err.push([k, `${etiqueta} debe estar entre ${min} y ${max}`]);
    };
    rango("longitudMetros", 0.1, 60, "La longitud");
    rango("alturaMetros", 0.1, 25, "La altura");
    rango("pesoToneladas", 0.001, 100, "El peso");
    rango("anioDescubrimiento", 1676, new Date().getFullYear(), "El año");
    rango("velocidadKmh", 0.5, 120, "La velocidad");
    if (datos.curiosidades.length > 15) err.push(["curiosidades", "Máximo 15 curiosidades"]);
    if (datos.curiosidades.some(c => c.length > 300)) err.push(["curiosidades", "Cada curiosidad puede tener hasta 300 caracteres"]);
    if (datos.modelo3dUrl && !/^(https?:\/\/\S+|\/modelos\/[\w./-]+)\.(glb|gltf|fbx|obj)(\?\S*)?$/.test(datos.modelo3dUrl))
      err.push(["modelo3dUrl", "Debe ser un archivo .glb, .gltf, .fbx u .obj (URL http(s) o /modelos/archivo)"]);
    if (datos.descripcion.length < 30) err.push(["descripcion", "La descripción debe tener al menos 30 caracteres"]);
    if (caracteristicas.some(c => !c.nombre || !c.valor)) err.push(["caracteristicas", "Cada característica necesita nombre y valor"]);
    const nombres = caracteristicas.map(c => c.nombre.toLowerCase());
    if (new Set(nombres).size !== nombres.length) err.push(["caracteristicas", "Hay características repetidas"]);
    if (datos.imagenes.some(i => !URL_IMG.test(i.url))) err.push(["imagenes", "Alguna imagen tiene una URL inválida"]);

    if (err.length) {
      err.forEach(([c, m]) => marcarError(form, c, m));
      form.querySelector(".campo.invalido")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const boton = document.getElementById("guardar");
    boton.disabled = true;
    try {
      const r = await api(id ? `/dinosaurios/${encodeURIComponent(id)}` : "/dinosaurios", {
        metodo: id ? "PUT" : "POST",
        cuerpo: datos
      });
      toast(id ? "Cambios guardados ✨" : `${r.nombre} se unió al glosario 🦖`);
      setTimeout(() => (location.href = `/dinosaurio.html?id=${r.id}`), 800);
    } catch (ex) {
      mostrarErroresServidor(form, ex, alerta);
      alerta.scrollIntoView({ behavior: "smooth", block: "center" });
    } finally {
      boton.disabled = false;
    }
  });
});
