"""
Motor RAG (Retrieval-Augmented Generation) del asistente Braqui.

1. Indexa la base de conocimiento local (carpeta `conocimiento/*.md`, troceada por secciones).
2. Indexa los dinosaurios de la base de datos leyendo la API pública del backend Spring Boot.
3. Recupera los fragmentos más relevantes para cada pregunta con BM25 (sin dependencias externas).
"""
from __future__ import annotations

import logging
import math
import re
import threading
import time
import unicodedata
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path

import requests

log = logging.getLogger("rag")

STOPWORDS = set("""
a al algo algun alguna algunas alguno algunos ante antes como con contra cual cuales cuando de del desde donde
durante e el ella ellas ellos en entre era eran es esa esas ese eso esos esta estaba estan estar este esto estos
fue fueron ha han hasta hay la las le les lo los mas me mi mis mucho muy no nos o otra otro para pero poco por
porque que quien se sea ser si sin sobre son su sus tambien te tiene tienen tu tus un una uno unos y ya yo
puedo puede puedes quiero hacer hace como cual cuanto cuanta
""".split())


# Sinónimos para que el usuario no tenga que usar las mismas palabras que la documentación
SINONIMOS = {
    "foto": "imagenes fotos referencia", "fotos": "imagenes referencia", "imagen": "fotos",
    "entrar": "iniciar sesion", "login": "iniciar sesion", "loguear": "iniciar sesion",
    "cuenta": "registrarse crear cuenta", "agregar": "registrar nuevo", "añadir": "registrar nuevo",
    "crear": "registrar nuevo", "borrar": "eliminar", "modificar": "editar", "cambiar": "editar",
    "estudiar": "formacion academica", "estudios": "formacion academica", "carrera": "formacion academica",
    "grande": "records", "grandes": "records", "pequeño": "records", "extincion": "mesozoica asteroide",
}


def expandir(consulta: str) -> str:
    extra = [v for pal, v in SINONIMOS.items() if re.search(rf"\b{pal}\b", consulta.lower())]
    return consulta + " " + " ".join(extra)


def normalizar(texto: str) -> list[str]:
    """Minúsculas, sin tildes, sin signos y sin palabras vacías. Aplica un stemming muy ligero."""
    texto = unicodedata.normalize("NFD", texto.lower())
    texto = "".join(c for c in texto if unicodedata.category(c) != "Mn")
    tokens = re.findall(r"[a-z0-9]+", texto)
    resultado = []
    for t in tokens:
        if t in STOPWORDS or len(t) < 2:
            continue
        # stemming ligero para plural/conjugaciones frecuentes en español
        for suf in ("aciones", "acion", "mente", "es", "s"):
            if len(t) > len(suf) + 3 and t.endswith(suf):
                t = t[: -len(suf)]
                break
        # truncado a 5 letras: une "registro/registrar", "inicio/iniciar", "edito/editar"…
        if not t.isdigit():
            t = t[:5]
        resultado.append(t)
    return resultado


@dataclass
class Documento:
    titulo: str
    texto: str
    fuente: str
    tokens: list[str] = field(default_factory=list)


class IndiceBM25:
    def __init__(self, docs: list[Documento], k1: float = 1.2, b: float = 0.4):
        self.docs = docs
        self.k1, self.b = k1, b
        for d in docs:
            d.tokens = normalizar(" ".join([d.titulo] * 3) + " " + d.texto)  # el título pesa triple
        self.n = len(docs)
        self.longitud_media = sum(len(d.tokens) for d in docs) / max(self.n, 1)
        self.frecuencias = [Counter(d.tokens) for d in docs]
        df = Counter(t for f in self.frecuencias for t in f)
        self.idf = {t: math.log(1 + (self.n - n + 0.5) / (n + 0.5)) for t, n in df.items()}

    def buscar(self, consulta: str, k: int = 5) -> list[tuple[Documento, float]]:
        q = normalizar(expandir(consulta))
        puntuaciones = []
        for doc, frec in zip(self.docs, self.frecuencias):
            s = 0.0
            largo = len(doc.tokens)
            for t in q:
                if t not in frec:
                    continue
                f = frec[t]
                s += self.idf[t] * f * (self.k1 + 1) / (f + self.k1 * (1 - self.b + self.b * largo / self.longitud_media))
            if s > 0:
                puntuaciones.append((doc, s))
        puntuaciones.sort(key=lambda x: x[1], reverse=True)
        return puntuaciones[:k]


def cargar_conocimiento(carpeta: Path) -> list[Documento]:
    """Trocea cada Markdown por secciones '## ' para obtener fragmentos enfocados."""
    docs = []
    for archivo in sorted(carpeta.glob("*.md")):
        contenido = archivo.read_text(encoding="utf-8")
        titulo_doc = (re.search(r"^# (.+)$", contenido, re.M) or [None, archivo.stem])[1]
        for seccion in re.split(r"^## ", contenido, flags=re.M)[1:]:
            titulo, _, cuerpo = seccion.partition("\n")
            docs.append(Documento(f"{titulo_doc} — {titulo.strip()}", cuerpo.strip(), archivo.name))
    return docs


def _fmt(valor, sufijo=""):
    return "desconocido" if valor is None else f"{valor:g}{sufijo}" if isinstance(valor, (int, float)) else str(valor)


def dinosaurio_a_documento(d: dict) -> Documento:
    caracs = "; ".join(f"{c['nombre']}: {c['valor']}" for c in d.get("caracteristicas", []))
    texto = (
        f"{d['nombre']} ({d['nombreCientifico']}). Significado del nombre: {d.get('significadoNombre') or 'no indicado'}. "
        f"Periodo: {d['periodoNombre']} ({d['periodoRango']}). Dieta: {d['dietaNombre']}. "
        f"Grupo: {d.get('grupoNombre') or 'no indicado'}. Hábitat: {d.get('habitat') or 'no indicado'}. "
        f"Velocidad estimada: {_fmt(d.get('velocidadKmh'), ' km/h')}. "
        f"Longitud: {_fmt(d.get('longitudMetros'), ' m')}. Altura: {_fmt(d.get('alturaMetros'), ' m')}. "
        f"Peso: {_fmt(d.get('pesoToneladas'), ' toneladas')}. "
        f"Descubierto en {d.get('regionDescubrimiento') or 'lugar no indicado'} en {_fmt(d.get('anioDescubrimiento'))} "
        f"por {d.get('descubridor') or 'descubridor no indicado'}. "
        f"Descripción: {d['descripcion']} "
        f"Características: {caracs or 'ninguna registrada'}. "
        f"Curiosidades: {' '.join(d.get('curiosidades') or []) or 'ninguna registrada'} "
        f"Registrado en el glosario por {d.get('registradoPor') or 'desconocido'}. "
        f"Ficha en el glosario: /dinosaurio.html?id={d['id']} (id {d['id']})"
    )
    return Documento(f"Glosario — {d['nombre']} ({d['nombreCientifico']})", texto, "base de datos del glosario")


class MotorRAG:
    """Mantiene el índice actualizado combinando conocimiento estático + dinosaurios de la BD."""

    def __init__(self, carpeta: Path, backend_url: str, reindex_segundos: int = 60):
        self.carpeta = carpeta
        self.backend_url = backend_url.rstrip("/")
        self.reindex_segundos = reindex_segundos
        self.estaticos = cargar_conocimiento(carpeta)
        self.dinosaurios: list[dict] = []
        self._indice = IndiceBM25(list(self.estaticos))
        self._ultimo = 0.0
        self._lock = threading.Lock()

    def reindexar(self, forzar: bool = False) -> int:
        with self._lock:
            if not forzar and time.time() - self._ultimo < self.reindex_segundos:
                return len(self._indice.docs)
            try:
                r = requests.get(f"{self.backend_url}/api/dinosaurios", timeout=5)
                r.raise_for_status()
                self.dinosaurios = r.json()
            except (requests.RequestException, ValueError) as e:
                log.warning("No se pudieron leer los dinosaurios del backend: %s", e)
            docs = list(self.estaticos) + [dinosaurio_a_documento(d) for d in self.dinosaurios]
            self._indice = IndiceBM25(docs)
            self._ultimo = time.time()
            log.info("Índice RAG actualizado: %d fragmentos (%d dinosaurios)", len(docs), len(self.dinosaurios))
            return len(docs)

    def recuperar(self, consulta: str, k: int = 5) -> list[Documento]:
        self.reindexar()
        return [doc for doc, _ in self._indice.buscar(consulta, k)]

    def resumen_glosario(self) -> str:
        """Lista breve de todo el glosario para preguntas tipo '¿cuántos hay?' o '¿cuál es el más pesado?'."""
        if not self.dinosaurios:
            return "No hay dinosaurios disponibles en este momento."
        filas = [
            f"- [id {d['id']}] {d['nombre']} ({d['nombreCientifico']}): {d['periodoNombre']}, {d['dietaNombre']}, "
            f"{d.get('grupoNombre') or 'grupo no indicado'}, "
            f"{_fmt(d.get('longitudMetros'), ' m')}, {_fmt(d.get('pesoToneladas'), ' t')}"
            for d in self.dinosaurios
        ]
        return f"El glosario contiene {len(self.dinosaurios)} dinosaurios:\n" + "\n".join(filas)
