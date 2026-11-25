-- =====================================================================
--  DinoGlosario · Consultas útiles para explorar los datos en Navicat
--  Ejecuta en la base "dinoglosario" (después de arrancar el backend una vez).
-- =====================================================================

-- Catálogo de dinosaurios
SELECT id, nombre, nombre_cientifico, periodo, dieta, grupo, longitud_metros, peso_toneladas, velocidad_kmh
FROM dinosaurios
ORDER BY nombre;

-- Curiosidades de cada dinosaurio
SELECT d.nombre, c.orden, c.texto
FROM dinosaurio_curiosidades c
JOIN dinosaurios d ON d.id = c.dinosaurio_id
ORDER BY d.nombre, c.orden;

-- Usuarios (las contraseñas están cifradas con BCrypt)
SELECT id, nombre, email, rol, institucion, especialidad, fecha_registro
FROM usuarios;

-- Actividad reciente que alimenta las recomendaciones
SELECT i.fecha, i.tipo, COALESCE(u.email, 'anónimo ' || LEFT(i.visitante_id, 8)) AS quien,
       d.nombre AS dinosaurio, i.valor
FROM interacciones i
LEFT JOIN usuarios u ON u.id = i.usuario_id
LEFT JOIN dinosaurios d ON d.id = i.dinosaurio_id
ORDER BY i.fecha DESC
LIMIT 100;

-- Dinosaurios más vistos
SELECT d.nombre, COUNT(*) AS visitas
FROM interacciones i
JOIN dinosaurios d ON d.id = i.dinosaurio_id
WHERE i.tipo = 'VISTA'
GROUP BY d.nombre
ORDER BY visitas DESC;

-- Intereses que Braqui (la IA) ha detectado en las conversaciones
SELECT valor AS interes, COUNT(*) AS veces
FROM interacciones
WHERE tipo = 'INTERES'
GROUP BY valor
ORDER BY veces DESC;

-- Lo que más se busca en el glosario
SELECT LOWER(valor) AS busqueda, COUNT(*) AS veces
FROM interacciones
WHERE tipo = 'BUSQUEDA'
GROUP BY LOWER(valor)
ORDER BY veces DESC
LIMIT 30;
