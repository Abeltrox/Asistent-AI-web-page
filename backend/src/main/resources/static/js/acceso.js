/* Inicio de sesión y registro con validación en el cliente (el servidor vuelve a validar todo) */
document.addEventListener("DOMContentLoaded", () => {
  const pestanas = document.querySelector(".pestanas");
  const formLogin = document.getElementById("formLogin");
  const formRegistro = document.getElementById("formRegistro");
  const camposPaleo = document.getElementById("camposPaleo");

  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,64}$/;
  const NOMBRE = /^[\p{L} .'-]{2,80}$/u;

  function activar(tab) {
    pestanas.dataset.activa = tab;
    pestanas.querySelectorAll("button").forEach(b => b.classList.toggle("activa", b.dataset.tab === tab));
    formLogin.classList.toggle("activo", tab === "login");
    formRegistro.classList.toggle("activo", tab === "registro");
  }
  pestanas.addEventListener("click", e => e.target.dataset.tab && activar(e.target.dataset.tab));
  if (location.hash === "#registro") activar("registro");

  formRegistro.addEventListener("change", e => {
    if (e.target.name === "rol") camposPaleo.classList.toggle("visible", e.target.value === "PALEONTOLOGO");
  });

  // Validación en vivo al salir de un campo
  [formLogin, formRegistro].forEach(f => f.addEventListener("input", e => {
    e.target.closest(".campo")?.classList.remove("invalido");
  }));

  function exito(datos, mensaje) {
    Sesion.guardar(datos);
    toast(mensaje);
    setTimeout(() => (location.href = datos.usuario.rol === "PALEONTOLOGO" ? "/panel.html" : "/#glosario"), 700);
  }

  async function enviar(form, ruta, cuerpo, mensaje) {
    const boton = form.querySelector("button[type=submit]");
    const alerta = form.querySelector(".alerta");
    boton.disabled = true;
    try {
      exito(await api(ruta, { metodo: "POST", cuerpo }), mensaje);
    } catch (e) {
      mostrarErroresServidor(form, e, alerta);
    } finally {
      boton.disabled = false;
    }
  }

  formLogin.addEventListener("submit", e => {
    e.preventDefault();
    limpiarErrores(formLogin);
    formLogin.querySelector(".alerta").classList.remove("visible");
    const email = formLogin.email.value.trim();
    const password = formLogin.password.value;
    let ok = true;
    if (!EMAIL.test(email)) ok = !marcarError(formLogin, "email", "Introduce un correo válido");
    if (!password) ok = !marcarError(formLogin, "password", "Introduce tu contraseña") && ok;
    if (!ok) return;
    enviar(formLogin, "/auth/login", { email, password }, "¡Bienvenido de vuelta! 🦕");
  });

  formRegistro.addEventListener("submit", e => {
    e.preventDefault();
    limpiarErrores(formRegistro);
    formRegistro.querySelector(".alerta").classList.remove("visible");
    const f = formRegistro;
    const datos = {
      nombre: f.nombre.value.trim(),
      email: f.email.value.trim(),
      password: f.password.value,
      rol: f.rol.value,
      institucion: f.institucion.value.trim() || null,
      especialidad: f.especialidad.value.trim() || null,
      codigoAcreditacion: f.codigoAcreditacion.value.trim() || null
    };
    const errores = [];
    if (!NOMBRE.test(datos.nombre)) errores.push(["nombre", "Nombre de 2 a 80 letras"]);
    if (!EMAIL.test(datos.email)) errores.push(["email", "Introduce un correo válido"]);
    if (!PASSWORD.test(datos.password)) errores.push(["password", "Mínimo 8 caracteres con mayúscula, minúscula y número"]);
    if (datos.password !== f.password2.value) errores.push(["password2", "Las contraseñas no coinciden"]);
    if (datos.rol === "PALEONTOLOGO") {
      if (!datos.institucion) errores.push(["institucion", "Indica tu institución"]);
      if (!datos.especialidad) errores.push(["especialidad", "Indica tu especialidad"]);
      if (!datos.codigoAcreditacion) errores.push(["codigoAcreditacion", "El código de acreditación es obligatorio"]);
    }
    if (errores.length) {
      errores.forEach(([c, m]) => marcarError(f, c, m));
      f.querySelector(".campo.invalido input")?.focus();
      return;
    }
    enviar(f, "/auth/registro", datos, "Cuenta creada con éxito ✨");
  });
});
