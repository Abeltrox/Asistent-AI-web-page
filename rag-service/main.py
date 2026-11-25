"""
Microservicio del asistente Braqui (FastAPI).

Ejecutar:
    pip install -r requirements.txt
    cp .env.example .env      # y coloca tu OPENAI_API_KEY
    uvicorn main:app --port 8000 --reload
"""
from __future__ import annotations

import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from pydantic import BaseModel, Field

load_dotenv()

import acciones as intenciones  # noqa: E402
from llm import GeneradorIA  # noqa: E402  (después de cargar .env)
from rag import MotorRAG  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s [%(name)s] %(message)s")

motor = MotorRAG(
    carpeta=Path(__file__).parent / "conocimiento",
    backend_url=os.getenv("BACKEND_URL", "http://localhost:8080"),
    reindex_segundos=int(os.getenv("REINDEX_SEGUNDOS", "60")),
)
generador = GeneradorIA()

app = FastAPI(title="Braqui · Asistente RAG de DinoGlosario", version="1.0.0")


class MensajeHistorial(BaseModel):
    rol: str = Field(pattern="^(user|assistant)$")
    contenido: str = Field(min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    mensaje: str = Field(min_length=1, max_length=1000)
    historial: list[MensajeHistorial] = Field(default_factory=list, max_length=20)
    perfil: str = Field(default="", max_length=6000)           # intereses del visitante (calculados en el backend)
    contexto: str = Field(default="", max_length=1000)          # página que está viendo
    usuario: str = Field(default="", max_length=80)             # nombre de pila si inició sesión
    dinosaurio_actual: str = Field(default="", max_length=80)   # ficha abierta, para mejorar la búsqueda


class ChatResponse(BaseModel):
    respuesta: str
    fuentes: list[str]
    recomendaciones: list[int] = Field(default_factory=list)   # ids de dinosaurios a mostrar como tarjetas
    intereses: list[str] = Field(default_factory=list)         # gustos detectados para guardar en el perfil
    acciones: list[dict] = Field(default_factory=list)         # órdenes que el navegador ejecuta (abrir, rugir…)


def respuesta_basica(docs) -> str:
    """Modo sin LLM: devuelve el fragmento más relevante tal cual."""
    if not docs:
        return ("No encontré información sobre eso en mi archivo 🦴. Prueba a preguntarme cómo iniciar sesión, "
                "cómo registrar un dinosaurio o qué se necesita para ser paleontólogo.")
    d = docs[0]
    texto = d.texto if len(d.texto) < 900 else d.texto[:900].rsplit(" ", 1)[0] + "…"
    return f"**{d.titulo.split(' — ')[-1]}**\n\n{texto}"


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest) -> ChatResponse:
    # Se añade la última pregunta del historial a la consulta para resolver referencias ("¿y cuánto pesa?")
    previa = next((m.contenido for m in reversed(req.historial) if m.rol == "user"), "")
    # y el dinosaurio de la ficha abierta ("¿y este qué comía?")
    docs = motor.recuperar(f"{req.mensaje} {previa} {req.dinosaurio_actual}", k=5)

    r = generador.responder(
        req.mensaje,
        [m.model_dump() for m in req.historial],
        docs,
        motor.resumen_glosario(),
        perfil=req.perfil,
        contexto=req.contexto,
        usuario=req.usuario,
    )
    fuentes = list(dict.fromkeys(d.titulo.split(" — ")[-1] for d in docs[:3]))
    if r is None:
        # Modo básico: aun sin IA, Braqui reconoce órdenes sencillas y las ejecuta
        texto, acciones = intenciones.detectar(req.mensaje, motor.dinosaurios, req.dinosaurio_actual)
        if acciones:
            return ChatResponse(respuesta=texto, fuentes=[], acciones=acciones)
        return ChatResponse(respuesta=respuesta_basica(docs), fuentes=fuentes)
    return ChatResponse(respuesta=r.texto, fuentes=fuentes, recomendaciones=r.recomendar_ids, intereses=r.intereses,
                        acciones=r.acciones)


@app.post("/reindex")
def reindex() -> dict:
    return {"fragmentos": motor.reindexar(forzar=True)}


@app.get("/salud")
def salud() -> dict:
    return {"estado": "ok", "llm": generador.habilitado, "modelo": generador.modelo,
            "max_tokens": generador.max_tokens,
            "dinosaurios_indexados": len(motor.dinosaurios)}
