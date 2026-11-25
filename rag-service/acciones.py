"""
Detector de intenciones sencillo (sin IA) para el modo básico.

Cuando no hay clave de OpenAI, Braqui sigue pudiendo ACTUAR: abrir un dinosaurio, hacerlo rugir, mostrarlo en 3D,
filtrar el glosario, poner música o abrir el formulario de acceso. Con IA, estas decisiones las toma el modelo.
"""
from __future__ import annotations

import re
import unicodedata


def _norm(t: str) -> str:
    t = unicodedata.normalize("NFD", t.lower())
    return "".join(c for c in t if unicodedata.category(c) != "Mn")


VERBOS_VER = r"\b(muestra|muestrame|ensena|ensename|abre|abreme|lleva|llevame|quiero ver|ver a|ver el|ver al|veamos|ir a|ir al|busca|buscame|dame|pon|ponme)"

# Adjetivos vagos → cómo elegir un dinosaurio del glosario
CRITERIOS = [
    (r"feroz|peligros|temible|aterrador|depredador|asesin|fuerte|mordida", "feroz"),
    (r"grande|enorme|gigante|largo|pesado", "grande"),
    (r"pequen|chiquit|diminut|mini", "pequeno"),
    (r"rapid|veloz|corredor", "rapido"),
    (r"cuerno", "cuernos"),
    (r"acoraz|armadura|tanque", "acorazado"),
    (r"acuatic|nadar|pesc|agua", "acuatico"),
    (r"pluma|ave|volar|vuela", "plumas"),
    (r"cuello", "cuello"),
]

GRUPOS = {"feroz": None, "cuernos": "CERATOPSIO", "acorazado": "ANQUILOSAURIO", "acuatico": "ESPINOSAURIDO",
          "plumas": "DROMEOSAURIO", "cuello": "SAUROPODO"}


def _elegir(criterio: str, dinos: list[dict]) -> dict | None:
    peso = lambda d: d.get("pesoToneladas") or 0
    if criterio == "feroz":
        carn = [d for d in dinos if d.get("dieta") == "CARNIVORO"]
        return max(carn, key=peso, default=None)
    if criterio == "grande":
        return max(dinos, key=lambda d: d.get("longitudMetros") or 0, default=None)
    if criterio == "pequeno":
        return min(dinos, key=lambda d: d.get("pesoToneladas") or 999, default=None)
    if criterio == "rapido":
        return max(dinos, key=lambda d: d.get("velocidadKmh") or 0, default=None)
    grupo = GRUPOS.get(criterio)
    candidatos = [d for d in dinos if d.get("grupo") == grupo]
    return max(candidatos, key=peso, default=None)


def _buscar_por_nombre(texto: str, dinos: list[dict]) -> dict | None:
    for d in dinos:
        nombres = {_norm(d["nombre"]), _norm(d["nombreCientifico"].split(" ")[0])}
        # tolera variantes («braquiosaurio» / «brachiosaurus», «t rex»)
        if any(n in texto or (len(n) > 6 and n[:-2] in texto) for n in nombres):
            return d
    if re.search(r"\bt\.? ?rex\b", texto):
        return next((d for d in dinos if d["nombreCientifico"].startswith("Tyrannosaurus")), None)
    return None


def detectar(mensaje: str, dinos: list[dict], dino_actual: str = "") -> tuple[str | None, list[dict]]:
    """Devuelve (texto de respuesta, acciones) o (None, []) si no reconoce ninguna orden."""
    t = _norm(mensaje)
    actual = next((d for d in dinos if _norm(d["nombre"]) == _norm(dino_actual)), None) if dino_actual else None

    # Música
    if re.search(r"musica|cancion", t):
        apagar = bool(re.search(r"quita|apaga|para|deten|silencio|sin musica|no quiero", t))
        return ("Listo, apago la música 🤫" if apagar else "¡Que suene la selva! 🎵 (Si no la oyes, toca cualquier parte de la página.)",
                [{"tipo": "musica", "encender": not apagar}])

    # Sesión
    if re.search(r"cerrar sesion|cierra (mi )?sesion|salir de mi cuenta|desconect", t):
        return "Cerrando tu sesión… ¡hasta la próxima era! 🦕", [{"tipo": "cerrar_sesion"}]
    if re.search(r"registr(ar)?me|crear (una |mi )?cuenta|crea(me)? (una |mi )?cuenta|darme de alta", t):
        rol = "PALEONTOLOGO" if "paleontolog" in t else "USUARIO"
        return ("¡Claro! Completa estos datos y creo tu cuenta al instante. La contraseña solo la ves tú. 🔒",
                [{"tipo": "formulario_acceso", "modo": "registro", "rol": rol}])
    if re.search(r"inicia(r)? sesion|iniciame|entrar|logue|login|acceder a mi cuenta|mete(me)? en mi cuenta", t):
        return ("¡Vamos! Escribe tu correo y contraseña aquí abajo y entro por ti. 🔒",
                [{"tipo": "formulario_acceso", "modo": "login"}])
    if re.search(r"(repetir|hacer|haz|otra vez).{0,20}(test|cuestionario|preguntas)", t):
        return "¡Claro! Vamos a repetir el test de gustos 🦕", [{"tipo": "ir_a", "pagina": "test"}]
    if re.search(r"olvida(r)? (mis )?intereses|borra(r)? (mis )?intereses", t):
        return "Hecho: olvidé tus intereses y empezamos de cero 🦴", [{"tipo": "olvidar_intereses"}]

    # Sonido / 3D del dinosaurio nombrado o del que está abierto
    nombrado = _buscar_por_nombre(t, dinos)
    objetivo = nombrado or actual
    if objetivo and re.search(r"rug|sonido|suena|sonaba|grit|escuch", t):
        return f"¡Atento! Así podría haber sonado el **{objetivo['nombre']}** 🔊", [{"tipo": "rugir", "dinosaurio_id": objetivo["id"]}]
    if objetivo and re.search(r"\b3d\b|modelo|girar|maqueta", t):
        return f"Aquí tienes al **{objetivo['nombre']}** en 3D: arrástralo para girarlo 🦖", [{"tipo": "ver_modelo3d", "dinosaurio_id": objetivo["id"]}]

    # Abrir un dinosaurio concreto o elegido por un adjetivo
    quiere_ver = re.search(VERBOS_VER, t) or re.search(r"\b(uno|un dinosaurio|algun dinosaurio)\b", t)
    if nombrado and (quiere_ver or len(t.split()) <= 3):
        return f"¡Vamos a ver al **{nombrado['nombre']}**! 🦕", [{"tipo": "abrir_dinosaurio", "dinosaurio_id": nombrado["id"]}]
    if quiere_ver:
        for patron, criterio in CRITERIOS:
            if re.search(patron, t):
                d = _elegir(criterio, dinos)
                if d:
                    frase = {"feroz": "el depredador más temible del glosario", "grande": "el más largo del glosario",
                             "pequeno": "el más pequeño del glosario", "rapido": "el más veloz del glosario",
                             "cuernos": "un experto en cuernos", "acorazado": "un auténtico tanque acorazado",
                             "acuatico": "un gran cazador de ríos", "plumas": "un dinosaurio con plumas",
                             "cuello": "un gigante de cuello larguísimo"}[criterio]
                    return (f"Te llevo con el **{d['nombre']}**, {frase} 🦖",
                            [{"tipo": "abrir_dinosaurio", "dinosaurio_id": d["id"]}])

    # Filtrar el glosario
    filtros = {}
    for clave, patron in [("periodo", {"TRIASICO": "triasic", "JURASICO": "jurasic", "CRETACICO": "cretacic"}),
                          ("dieta", {"CARNIVORO": "carnivor", "HERBIVORO": "herbivor", "OMNIVORO": "omnivor",
                                     "PISCIVORO": "piscivor"})]:
        for valor, raiz in patron.items():
            if raiz in t:
                filtros[clave] = valor
    if filtros and re.search(VERBOS_VER + r"|\blista|\bcuales|\btodos", t):
        return "Filtrando el glosario para ti 🔎", [{"tipo": "buscar", **filtros}]

    return None, []
