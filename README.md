# 🦕 DinoGlosario

Glosario web de dinosaurios descubiertos. Los **paleontólogos** (administradores) registran, editan y eliminan
dinosaurios con sus características y fotos de referencia; los **usuarios** (exploradores) consultan el glosario.
Incluye a **Braqui**, un braquiosaurio de caricatura en la esquina inferior derecha que responde preguntas con
inteligencia artificial y RAG.

```
┌──────────────────────┐   /api/**    ┌──────────────────────────┐   /chat   ┌───────────────────────────┐
│ Frontend HTML/CSS/JS │ ───────────▶ │ Backend Spring Boot 3    │ ────────▶ │ Servicio RAG (Python)     │
│ (servido por Spring) │              │ JWT · JPA · Validaciones │ ◀──────── │ FastAPI · BM25 · OpenAI  │
└──────────────────────┘              └────────────┬─────────────┘  lee los  └───────────────────────────┘
                                                   │               dinosaurios por la API
                                            PostgreSQL (H2 opcional)
```

## Estructura

```
dinoglosario/
├── backend/                        Spring Boot (Java 21, Maven)
│   └── src/main/
│       ├── java/com/paleo/glosario/
│       │   ├── config/             Seguridad, recursos estáticos, datos de ejemplo
│       │   ├── controller/         REST: auth, dinosaurios, catálogos, archivos, asistente
│       │   ├── dto/                Peticiones/respuestas con validaciones (Jakarta Validation)
│       │   ├── exception/          Manejo global de errores (respuestas JSON en español)
│       │   ├── model/              Entidades JPA: Usuario, Dinosaurio, Característica, Imagen
│       │   ├── repository/         Spring Data JPA
│       │   ├── security/           JWT + filtro de autenticación
│       │   └── service/            Lógica de negocio
│       └── resources/
│           ├── static/             Frontend: index, dinosaurio, acceso, panel + css/js
│           ├── application.properties          (H2 por defecto)
│           ├── application-postgres.properties (perfil por defecto)
│           └── application-mysql.properties    (perfil MySQL)
├── rag-service/                    Python (FastAPI)
│   ├── conocimiento/*.md           Base de conocimiento del asistente (edítala libremente)
│   ├── rag.py                      Indexado y recuperación BM25 (docs + dinosaurios de la BD)
│   ├── llm.py                      Generación con la API de OpenAI
│   └── main.py                     API: POST /chat, POST /reindex, GET /salud
├── database/postgres/             Scripts SQL para Navicat
└── docker-compose.yml              PostgreSQL + backend + asistente
```

## Cómo ejecutarlo (local)

**Requisitos:** Java 21, Maven 3.9+, Python 3.11+ y PostgreSQL (probado con PostgreSQL 18).

### 1. Base de datos PostgreSQL (con Navicat)

1. En Navicat: **Conexión → PostgreSQL**. Host `localhost`, puerto `5432`, base inicial `postgres`,
   usuario `postgres` y la contraseña que pusiste al instalar PostgreSQL.
2. Abre la conexión, clic derecho en la base `postgres` → **Nueva consulta**, pega
   [`database/postgres/01_crear_base_datos.sql`](database/postgres/01_crear_base_datos.sql) y pulsa **Ejecutar**.
   Crea el usuario `dino` / `dino123` y la base `dinoglosario`.
3. (Opcional) Crea en Navicat una segunda conexión con usuario `dino` para ver la base `dinoglosario`.

Las **tablas no se crean a mano**: el backend (Hibernate) las crea al arrancar por primera vez y carga
29 dinosaurios y dos cuentas de demostración. Después puedes explorarlas en Navicat (esquema `public`) y usar
las consultas de [`database/postgres/02_consultas_utiles.sql`](database/postgres/02_consultas_utiles.sql).

> ¿Otro usuario/contraseña? Usa las variables `DB_USER`, `DB_PASSWORD` y `DB_URL`.
> ¿Sin PostgreSQL? `SPRING_PROFILES_ACTIVE=h2` usa una base H2 en archivo, sin instalar nada.

### 2. Backend (puerto 8080)

```bash
cd backend
mvn spring-boot:run
```

| Rol          | Correo                     | Contraseña    |
|--------------|----------------------------|---------------|
| Paleontólogo | `paleo@dinoglosario.com`   | `Paleo2026`   |
| Usuario      | `usuario@dinoglosario.com` | `Usuario2026` |

Código de acreditación para registrar nuevos paleontólogos: `PALEO-2026` (configurable con `CODIGO_PALEONTOLOGO`).

### 3. Asistente IA con OpenAI (puerto 8000)

```bash
cd rag-service
python -m venv .venv
.venv\Scripts\activate            # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env             # macOS/Linux: cp .env.example .env
# edita .env y pon tu OPENAI_API_KEY (https://platform.openai.com/api-keys)
uvicorn main:app --port 8000 --reload
```

Abre **http://localhost:8080**.

> Sin `OPENAI_API_KEY` el asistente funciona en **modo básico**: responde con el fragmento más relevante de la
> base de conocimiento y recomienda según el perfil, pero sin redactar con IA. Si el servicio Python está apagado,
> el backend responde con un mensaje amable y recomendaciones en lugar de fallar.

### Con Docker (PostgreSQL incluido)

```bash
cp .env.example .env    # pon tu OPENAI_API_KEY
docker compose up --build
```

## Experiencia inmersiva

- **Braqui personalizado:** el glosario aprende de lo que haces (fichas que abres, búsquedas, filtros, sonidos,
  modelos 3D y conversación). Braqui recibe ese perfil y la página que estás viendo, responde en contexto,
  recomienda dinosaurios como **tarjetas dentro del chat** y la IA (OpenAI) detecta y guarda tus intereses
  (salida estructurada JSON). Funciona sin cuenta (identificador anónimo del navegador) y se puede borrar con
  **Olvidar mis intereses**.
- **Recomendaciones:** «Elegidos para ti» en la portada y «Te puede interesar» en cada ficha
  (afinidad por periodo, dieta, grupo y términos buscados, con más peso a lo reciente).
- **Modelo 3D interactivo** (Three.js): generado según el grupo anatómico, con rasgos por género (gola y cuernos,
  placas, vela, cresta tubular, mazo…), animado, con una persona de 1,75 m a escala. Admite modelos `.glb` propios.
- **Sonidos recreados** con Web Audio según el grupo y el tamaño (rugidos, chillidos, bramidos, trompeta…).
- **Música de fondo** orquestal suave y original, generada en el navegador (botón **Música**). Para usar una pista
  propia con licencia, guárdala como `backend/src/main/resources/static/audio/fondo.mp3`.
- **Imágenes y resúmenes reales** de Wikipedia / Wikimedia Commons (con autor y licencia) cuando no hay fotos propias.
- **Catálogo ampliado:** 29 dinosaurios con grupo, hábitat, velocidad estimada y curiosidades.

## API REST

| Método | Ruta                          | Acceso        | Descripción |
|--------|-------------------------------|---------------|-------------|
| POST   | `/api/auth/registro`          | Público       | Crear cuenta (USUARIO o PALEONTOLOGO con código) |
| POST   | `/api/auth/login`             | Público       | Devuelve `{ token, usuario }` |
| GET    | `/api/auth/me`                | Autenticado   | Datos del usuario actual |
| GET    | `/api/dinosaurios?q=&periodo=&dieta=&grupo=` | Público | Listado con búsqueda y filtros |
| GET    | `/api/dinosaurios/{id}`       | Público       | Ficha completa |
| POST   | `/api/dinosaurios`            | Paleontólogo  | Crear |
| PUT    | `/api/dinosaurios/{id}`       | Paleontólogo  | Editar |
| DELETE | `/api/dinosaurios/{id}`       | Paleontólogo  | Eliminar |
| POST   | `/api/archivos/imagen`        | Paleontólogo  | Subir foto (multipart `archivo`) → `{ url }` |
| GET    | `/api/catalogos/periodos` · `/dietas` · `/grupos` | Público | Valores para los selects |
| POST   | `/api/asistente/chat`         | Público       | `{ mensaje, historial, contexto }` → `{ respuesta, fuentes, recomendaciones }` |
| POST   | `/api/actividad`              | Público       | Registra `{ tipo, dinosaurioId, valor }` (VISTA, BUSQUEDA, FILTRO, SONIDO, MODELO3D…) |
| GET    | `/api/recomendaciones?excluir=&limite=` | Público | Perfil de intereses + dinosaurios recomendados |
| DELETE | `/api/actividad`              | Público       | Olvidar los intereses de este usuario/navegador |

Autenticación: cabecera `Authorization: Bearer <token>`. Los errores llegan como
`{ estado, error, mensaje, campos: { campo: "mensaje" } }` y el frontend los muestra junto a cada campo.

## Validaciones

Se validan en el **cliente** (respuesta inmediata) y de nuevo en el **servidor** (la fuente de verdad):

- **Registro:** nombre solo con letras (2–80), correo válido y único, contraseña de 8–64 caracteres con
  mayúscula, minúscula y número, confirmación de contraseña; los paleontólogos también necesitan institución,
  especialidad y un código de acreditación válido.
- **Dinosaurio:** nombre único (2–80); nombre científico en nomenclatura binomial (`Tyrannosaurus rex`);
  periodo y dieta obligatorios; longitud 0.1–60 m, altura 0.1–25 m, peso 0.001–100 t; año entre 1676 y el
  actual; altura coherente con la longitud; descripción de 30–4000 caracteres; hasta 30 características sin
  nombres repetidos; hasta 12 imágenes con URL http(s) o subida al servidor.
- **Subida de imágenes:** solo JPG/PNG/WEBP/GIF de máximo 5 MB, comprobando también la firma binaria del
  archivo (no solo la extensión), con nombre aleatorio (UUID).
- **Seguridad:** contraseñas con BCrypt, JWT con expiración (8 h), rutas de escritura protegidas por rol,
  todo el texto se escapa antes de insertarlo en el HTML (protección XSS).

## El asistente Braqui (RAG)

1. **Indexa** `rag-service/conocimiento/*.md` (troceados por secciones `##`) y todos los dinosaurios de la base
   de datos (se refresca cada 60 s, o al instante con `POST /reindex`).
2. **Recupera** los 5 fragmentos más relevantes con BM25, con sinónimos y normalización del español.
3. **Genera** la respuesta con OpenAI (`gpt-5-mini` por defecto, cambiable con `OPENAI_MODEL`), con un máximo de
   12 000 tokens por respuesta (`OPENAI_MAX_TOKENS`), y muestra las fuentes bajo cada respuesta.

Para enseñarle cosas nuevas basta con añadir o editar archivos `.md` en `rag-service/conocimiento/` y reiniciar
el servicio.

## Pruebas

```bash
cd backend && mvn test
```

10 pruebas de integración cubren el listado y los filtros, las validaciones de registro y del dinosaurio,
el código de acreditación, el login incorrecto, los permisos por rol (401/403), el CRUD completo y el
asistente con el servicio de IA apagado, el aprendizaje de intereses y las recomendaciones, y el catálogo ampliado.
#   A s i s t e n t - A I - w e b - p a g e  
 