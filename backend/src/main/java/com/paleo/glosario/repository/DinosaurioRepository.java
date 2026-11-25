package com.paleo.glosario.repository;

import com.paleo.glosario.model.Dieta;
import com.paleo.glosario.model.Dinosaurio;
import com.paleo.glosario.model.Grupo;
import com.paleo.glosario.model.Periodo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

/** texto vacío ('') = sin búsqueda. No se usa null: PostgreSQL no puede deducir el tipo de un parámetro nulo en LIKE. */
public interface DinosaurioRepository extends JpaRepository<Dinosaurio, Long> {

    boolean existsByNombreIgnoreCase(String nombre);

    boolean existsByNombreIgnoreCaseAndIdNot(String nombre, Long id);

    @Query("""
            SELECT d FROM Dinosaurio d
            WHERE (:texto = ''
                   OR LOWER(d.nombre) LIKE LOWER(CONCAT('%', :texto, '%'))
                   OR LOWER(d.nombreCientifico) LIKE LOWER(CONCAT('%', :texto, '%'))
                   OR LOWER(d.regionDescubrimiento) LIKE LOWER(CONCAT('%', :texto, '%'))
                   OR LOWER(d.habitat) LIKE LOWER(CONCAT('%', :texto, '%')))
              AND (:periodo IS NULL OR d.periodo = :periodo)
              AND (:dieta IS NULL OR d.dieta = :dieta)
              AND (:grupo IS NULL OR d.grupo = :grupo)
            ORDER BY d.nombre ASC
            """)
    List<Dinosaurio> buscar(@Param("texto") String texto,
                            @Param("periodo") Periodo periodo,
                            @Param("dieta") Dieta dieta,
                            @Param("grupo") Grupo grupo);

    java.util.Optional<Dinosaurio> findByNombreIgnoreCase(String nombre);
}
