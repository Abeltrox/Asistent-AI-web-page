-- =====================================================================
--  DinoGlosario · Creación de la base de datos en PostgreSQL
-- ---------------------------------------------------------------------
--  Cómo ejecutarlo en Navicat:
--    1. Conexión nueva → PostgreSQL
--         Host: localhost   Puerto: 5432
--         Base de datos inicial: postgres
--         Usuario: postgres  Contraseña: (la que pusiste al instalar PostgreSQL)
--    2. Abre la conexión, clic derecho sobre la base "postgres" → "Nueva consulta"
--    3. Pega este archivo completo y pulsa "Ejecutar".
--
--  Las tablas NO se crean aquí: las crea el backend (Hibernate) la primera
--  vez que arranca, y además carga los dinosaurios y cuentas de demostración.
--  Si cambias usuario o contraseña, cámbialos también en DB_USER / DB_PASSWORD.
-- =====================================================================

-- 1) Usuario propio de la aplicación (no uses "postgres" para la app)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dino') THEN
        CREATE ROLE dino WITH LOGIN PASSWORD 'dino123';
    END IF;
END
$$;

-- 2) Base de datos, propiedad del usuario de la aplicación
--    (si ya existe, PostgreSQL mostrará un aviso: puedes ignorarlo)
CREATE DATABASE dinoglosario
    WITH OWNER = dino
         ENCODING = 'UTF8'
         TEMPLATE = template0;

-- 3) Para ver el contenido en Navicat después de arrancar el backend:
--    abre la conexión → base "dinoglosario" → esquema "public" → Tablas.
--    Consultas útiles en 02_consultas_utiles.sql
