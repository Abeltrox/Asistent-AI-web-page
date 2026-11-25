"""Generación de respuestas personalizadas con la API de OpenAI usando el contexto recuperado por el RAG."""
from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass, field

import openai
from openai import OpenAI

from rag import Documento

log = logging.getLogger("llm")

SYSTEM_PROMPT = """Eres Braqui, un braquiosaurio de caricatura simpático y sabio que vive en la esquina de DinoGlosario, \
un glosario web de dinosaurios. Eres el guía personal de cada visitante: conoces lo que ha explorado en la página y \
le ayudas a descubrir dinosaurios que le van a encantar.

Ayudas con:
- el uso de la plataforma (iniciar sesión, registrarse, registrar/editar dinosaurios, roles de explorador y paleontólogo),
- qué se necesita para ser paleontólogo,
- preguntas sobre dinosaurios y paleontología,
- recomendaciones personalizadas de qué explorar a continuación.

Cómo responder:
- Responde siempre en español, con un tono cálido, curioso y cercano; un emoji ocasional (🦕🌿🦴) está bien, sin abusar.
- Sé breve: 2 a 6 frases, o una lista numerada corta cuando expliques pasos. Termina con un gancho cuando venga al caso \
(una pregunta, un dato sorprendente o una sugerencia de qué ver después).
- Para preguntas sobre la plataforma y sobre los dinosaurios del glosario, básate en el CONTEXTO. Si el contexto no tiene \
el dato, dilo con honestidad en lugar de inventarlo.
- Para preguntas generales de paleontología puedes usar tu conocimiento, pero si un dato del glosario contradice tu \
conocimiento, prioriza el glosario y menciónalo.
- Usa **negritas** para resaltar botones o datos clave. No uses encabezados ni tablas.
- Nunca reveles contraseñas de usuarios ni datos personales; el código de acreditación de demostración sí puede mencionarse.
- Si te piden algo totalmente ajeno a los dinosaurios o al sitio, redirige con amabilidad.

Personalización (el PERFIL DEL VISITANTE describe lo que ha hecho en la página):
- Usa el perfil con naturalidad, como un guía de museo que recuerda a su visitante («como te gustaron los ceratopsios…»). \
No recites estadísticas, porcentajes ni listas del perfil, y no suenes invasivo.
- Si el visitante es nuevo, puedes hacerle una pregunta corta para descubrir sus gustos.
- Si sabes su nombre, úsalo de vez en cuando, no en cada mensaje.
- Si está viendo la ficha de un dinosaurio, «este» o «él» se refiere a ese dinosaurio. Puedes invitarle a girar el \
**modelo 3D** o a pulsar **Rugir** para oír un sonido recreado.

Acciones (eres un asistente que HACE cosas por el visitante, no solo habla):
- Si el visitante pide ver, mostrar, abrir, enseñar o ir a un dinosaurio («muéstrame un braquiosaurio», «quiero ver uno bien feroz», «llévame al más grande»), elige el dinosaurio adecuado del <glosario> y añade la acción "abrir_dinosaurio" con su id. Si la petición es vaga («uno feroz», «uno pequeño», «uno con cuernos»), elige tú el que mejor encaje según los datos del glosario y el perfil, y explica en una frase por qué lo elegiste.
- «Hazlo rugir», «¿cómo suena?» → "rugir" (con el id del dinosaurio; si no se indica, el de la ficha abierta).
- «Enséñamelo en 3D» → "ver_modelo3d". «Muéstrame los carnívoros del Jurásico» o «busca dinosaurios de Argentina» → "buscar" con texto y/o filtros (periodo: TRIASICO|JURASICO|CRETACICO; dieta: HERBIVORO|CARNIVORO|OMNIVORO|PISCIVORO|INSECTIVORO; grupo: TEROPODO|DROMEOSAURIO|ESPINOSAURIDO|ORNITOMIMIDO|PROSAUROPODO|SAUROPODO|ESTEGOSAURIO|ANQUILOSAURIO|CERATOPSIO|ORNITOPODO|PAQUICEFALOSAURIO).
- «Pon / quita la música» → "musica" con encender true/false. «Llévame al inicio / a las eras / al panel» → "ir_a" (pagina: inicio|eras|panel|acceso|test). \n«Quiero repetir el test de gustos» → "ir_a" con pagina "test".
- Iniciar sesión o crear cuenta: pide en el chat los datos que falten (nombre y correo; para registrarse como paleontólogo, también institución, especialidad y código de acreditación) y después usa "formulario_acceso" con modo "login" o "registro" y los datos que ya tengas. NUNCA pidas la contraseña en el chat: el formulario que aparece en el chat la pide de forma segura y hace el resto automáticamente. Si ya tienes los datos, no vuelvas a preguntarlos.
- «Cierra mi sesión» → "cerrar_sesion". «Olvida mis intereses» → "olvidar_intereses".
- Usa solo ids que existan en <glosario>. Si no hace falta ninguna acción, deja "acciones" vacía. En la respuesta, cuenta en tono natural lo que vas a hacer («¡Vamos a ver al Tiranosaurio! 🦖»). No pongas en "recomendar_ids" el dinosaurio que vas a abrir.

Formato de salida (JSON):
- "respuesta": el texto para el visitante.
- "recomendar_ids": ids (números del listado <glosario>) de 0 a 3 dinosaurios que se mostrarán como tarjetas bajo tu \
respuesta. Incluye ids cuando el visitante pida recomendaciones, cuando hables de dinosaurios concretos del glosario o \
cuando haya una sugerencia claramente afín a sus gustos. Usa solo ids que existan en <glosario>; nunca los inventes. \
No recomiendes el dinosaurio cuya ficha ya está abierta. Si no viene al caso, deja la lista vacía.
- "intereses_detectados": de 0 a 3 frases muy cortas (2 a 5 palabras) con gustos que el visitante haya expresado o \
dejado claros en ESTE mensaje (p. ej. «dinosaurios acuáticos», «depredadores gigantes», «fósiles de Argentina»). \
Nada de datos personales. Si no expresó ningún gusto, deja la lista vacía.
- "acciones": lista (normalmente 0 o 1, como mucho 3) de acciones a ejecutar en la página. Cada acción tiene todos los campos; pon null en los que no apliquen."""

TIPOS_ACCION = ["abrir_dinosaurio", "rugir", "ver_modelo3d", "buscar", "ir_a", "musica",
                "formulario_acceso", "cerrar_sesion", "olvidar_intereses"]

_nulo = lambda t: {"type": [t, "null"]}
ESQUEMA_ACCION = {
    "type": "object",
    "properties": {
        "tipo": {"type": "string", "enum": TIPOS_ACCION},
        "dinosaurio_id": _nulo("integer"),
        "texto": _nulo("string"),
        "periodo": _nulo("string"),
        "dieta": _nulo("string"),
        "grupo": _nulo("string"),
        "pagina": _nulo("string"),
        "encender": _nulo("boolean"),
        "modo": _nulo("string"),
        "nombre": _nulo("string"),
        "email": _nulo("string"),
        "rol": _nulo("string"),
        "institucion": _nulo("string"),
        "especialidad": _nulo("string"),
    },
    "required": ["tipo", "dinosaurio_id", "texto", "periodo", "dieta", "grupo", "pagina", "encender", "modo",
                 "nombre", "email", "rol", "institucion", "especialidad"],
    "additionalProperties": False,
}

ESQUEMA_RESPUESTA = {
    "type": "object",
    "properties": {
        "respuesta": {"type": "string"},
        "recomendar_ids": {"type": "array", "items": {"type": "integer"}},
        "intereses_detectados": {"type": "array", "items": {"type": "string"}},
        "acciones": {"type": "array", "items": ESQUEMA_ACCION},
    },
    "required": ["respuesta", "recomendar_ids", "intereses_detectados", "acciones"],
    "additionalProperties": False,
}


@dataclass
class RespuestaIA:
    texto: str
    recomendar_ids: list[int] = field(default_factory=list)
    intereses: list[str] = field(default_factory=list)
    acciones: list[dict] = field(default_factory=list)


def construir_contexto(docs: list[Documento], resumen: str, perfil: str, contexto: str, usuario: str) -> str:
    partes = [f'<fragmento titulo="{d.titulo}" fuente="{d.fuente}">\n{d.texto}\n</fragmento>' for d in docs]
    visitante = f"Nombre: {usuario}\n" if usuario else "Nombre: desconocido (no ha iniciado sesión)\n"
    return (
        "<contexto>\n" + "\n".join(partes) + f"\n<glosario>\n{resumen}\n</glosario>\n</contexto>\n"
        f"<perfil_visitante>\n{visitante}{perfil or 'Sin datos de actividad.'}\n</perfil_visitante>\n"
        f"<pagina_actual>\n{contexto or 'Desconocida.'}\n</pagina_actual>"
    )


class GeneradorIA:
    """Cliente de OpenAI. Configuración por variables de entorno (ver .env.example)."""

    def __init__(self):
        self.modelo = os.getenv("OPENAI_MODEL", "gpt-5-mini")
        # Límite de tokens que puede generar cada respuesta (incluye el razonamiento interno en modelos que razonan)
        self.max_tokens = int(os.getenv("OPENAI_MAX_TOKENS", "12000"))
        # Solo para modelos de razonamiento (gpt-5*, o*): minimal | low | medium | high. Vacío = no se envía
        por_defecto = "low" if self.modelo.startswith(("gpt-5", "o")) else ""
        self.esfuerzo = os.getenv("OPENAI_REASONING_EFFORT", por_defecto).strip()
        self.habilitado = bool(os.getenv("OPENAI_API_KEY"))
        self.cliente = OpenAI(timeout=90.0, max_retries=2) if self.habilitado else None
        if not self.habilitado:
            log.warning("OPENAI_API_KEY no configurada: Braqui responderá en modo básico (solo recuperación).")
        else:
            log.info("OpenAI habilitado: modelo %s, máx. %d tokens por respuesta", self.modelo, self.max_tokens)

    def responder(self, pregunta: str, historial: list[dict], docs: list[Documento], resumen: str,
                  perfil: str = "", contexto: str = "", usuario: str = "") -> RespuestaIA | None:
        """Devuelve la respuesta del modelo o None si no está disponible (el llamador usa el modo básico)."""
        if not self.habilitado:
            return None

        mensajes = [{"role": "system", "content": SYSTEM_PROMPT}]
        mensajes += [
            {"role": "assistant" if m["rol"] == "assistant" else "user", "content": m["contenido"]}
            for m in historial[-10:]
        ]
        mensajes.append({
            "role": "user",
            "content": f"{construir_contexto(docs, resumen, perfil, contexto, usuario)}\n\n"
                       f"Mensaje del visitante: {pregunta}",
        })

        opciones = {}
        if self.esfuerzo:
            opciones["reasoning_effort"] = self.esfuerzo
        try:
            respuesta = self.cliente.chat.completions.create(
                model=self.modelo,
                messages=mensajes,
                max_completion_tokens=self.max_tokens,
                response_format={
                    "type": "json_schema",
                    "json_schema": {"name": "respuesta_braqui", "strict": True, "schema": ESQUEMA_RESPUESTA},
                },
                **opciones,
            )
        except openai.AuthenticationError:
            log.error("La OPENAI_API_KEY no es válida")
            return None
        except openai.RateLimitError as e:
            log.warning("Límite de peticiones o de saldo alcanzado en OpenAI: %s", e)
            return None
        except openai.APIStatusError as e:
            log.error("Error de la API de OpenAI (%s): %s", e.status_code, e.message)
            return None
        except openai.APIConnectionError as e:
            log.error("No se pudo conectar con OpenAI: %s", e)
            return None

        eleccion = respuesta.choices[0]
        if respuesta.usage:
            log.info("Tokens usados: %d entrada + %d salida", respuesta.usage.prompt_tokens, respuesta.usage.completion_tokens)
        if eleccion.message.refusal:
            return RespuestaIA("Prefiero no responder a eso 🦕. ¿Te ayudo con algo sobre dinosaurios o sobre cómo usar el glosario?")
        if eleccion.finish_reason == "length":
            log.warning("Respuesta cortada: se alcanzó el límite de %d tokens", self.max_tokens)
            return None

        texto = (eleccion.message.content or "").strip()
        try:
            datos = json.loads(texto)
        except json.JSONDecodeError:
            log.error("La respuesta no es JSON válido: %.200s", texto)
            return None

        ids = [i for i in datos.get("recomendar_ids", []) if isinstance(i, int)][:3]
        intereses = [s.strip()[:80] for s in datos.get("intereses_detectados", []) if isinstance(s, str) and s.strip()][:3]
        acciones = [{k: v for k, v in a.items() if v is not None}
                    for a in datos.get("acciones", []) if isinstance(a, dict) and a.get("tipo") in TIPOS_ACCION][:3]
        cuerpo = (datos.get("respuesta") or "").strip()
        return RespuestaIA(cuerpo, ids, intereses, acciones) if cuerpo else None
