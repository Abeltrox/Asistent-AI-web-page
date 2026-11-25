package com.paleo.glosario.repository;

import com.paleo.glosario.model.Interaccion;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface InteraccionRepository extends JpaRepository<Interaccion, Long> {

    /** Actividad reciente del usuario con sesión y/o del navegador anónimo (se combinan). */
    @Query("""
            SELECT i FROM Interaccion i
            WHERE (:usuarioId IS NOT NULL AND i.usuario.id = :usuarioId)
               OR (:visitanteId IS NOT NULL AND i.visitanteId = :visitanteId)
            ORDER BY i.fecha DESC
            """)
    List<Interaccion> recientes(@Param("usuarioId") Long usuarioId,
                                @Param("visitanteId") String visitanteId,
                                Pageable pagina);

    @Modifying
    @Query("""
            DELETE FROM Interaccion i
            WHERE (:usuarioId IS NOT NULL AND i.usuario.id = :usuarioId)
               OR (:visitanteId IS NOT NULL AND i.visitanteId = :visitanteId)
            """)
    int borrar(@Param("usuarioId") Long usuarioId, @Param("visitanteId") String visitanteId);
}
