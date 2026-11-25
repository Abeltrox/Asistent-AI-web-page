package com.paleo.glosario.service;

import com.paleo.glosario.dto.DinosaurioRequest;
import com.paleo.glosario.dto.DinosaurioResponse;
import com.paleo.glosario.exception.RecursoNoEncontradoException;
import com.paleo.glosario.exception.ReglaNegocioException;
import com.paleo.glosario.model.*;
import com.paleo.glosario.repository.DinosaurioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Year;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class DinosaurioService {

    private final DinosaurioRepository repo;

    public DinosaurioService(DinosaurioRepository repo) {
        this.repo = repo;
    }

    @Transactional(readOnly = true)
    public List<DinosaurioResponse> buscar(String texto, Periodo periodo, Dieta dieta, Grupo grupo) {
        String t = (texto == null || texto.isBlank()) ? "" : texto.trim();
        return repo.buscar(t, periodo, dieta, grupo).stream().map(DinosaurioResponse::de).toList();
    }

    @Transactional(readOnly = true)
    public DinosaurioResponse obtener(Long id) {
        return DinosaurioResponse.de(buscarEntidad(id));
    }

    @Transactional
    public DinosaurioResponse crear(DinosaurioRequest r, Usuario autor) {
        if (repo.existsByNombreIgnoreCase(r.nombre().trim())) {
            throw ReglaNegocioException.conflicto("nombre", "Ya existe un dinosaurio con ese nombre en el glosario");
        }
        validarReglas(r);
        Dinosaurio d = new Dinosaurio();
        aplicar(d, r);
        d.setRegistradoPor(autor);
        d.setActualizadoPor(autor);
        return DinosaurioResponse.de(repo.save(d));
    }

    @Transactional
    public DinosaurioResponse actualizar(Long id, DinosaurioRequest r, Usuario editor) {
        Dinosaurio d = buscarEntidad(id);
        if (repo.existsByNombreIgnoreCaseAndIdNot(r.nombre().trim(), id)) {
            throw ReglaNegocioException.conflicto("nombre", "Ya existe otro dinosaurio con ese nombre");
        }
        validarReglas(r);
        aplicar(d, r);
        d.setActualizadoPor(editor);
        return DinosaurioResponse.de(repo.save(d));
    }

    @Transactional
    public void eliminar(Long id) {
        repo.delete(buscarEntidad(id));
    }

    private Dinosaurio buscarEntidad(Long id) {
        return repo.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe el dinosaurio con id " + id));
    }

    /** Reglas que dependen de varios campos o del contexto (no expresables con anotaciones). */
    private void validarReglas(DinosaurioRequest r) {
        if (r.anioDescubrimiento() != null && r.anioDescubrimiento() > Year.now().getValue()) {
            throw ReglaNegocioException.invalido("anioDescubrimiento", "El año de descubrimiento no puede estar en el futuro");
        }
        if (r.alturaMetros() != null && r.longitudMetros() != null && r.alturaMetros() > r.longitudMetros() * 1.5) {
            throw ReglaNegocioException.invalido("alturaMetros", "La altura no parece coherente con la longitud indicada");
        }
        if (r.caracteristicas() != null) {
            Set<String> vistos = new HashSet<>();
            for (var c : r.caracteristicas()) {
                if (!vistos.add(c.nombre().trim().toLowerCase())) {
                    throw ReglaNegocioException.invalido("caracteristicas",
                            "La característica '" + c.nombre().trim() + "' está repetida");
                }
            }
        }
    }

    private void aplicar(Dinosaurio d, DinosaurioRequest r) {
        d.setNombre(r.nombre().trim());
        d.setNombreCientifico(r.nombreCientifico().trim());
        d.setSignificadoNombre(limpiar(r.significadoNombre()));
        d.setPeriodo(r.periodo());
        d.setDieta(r.dieta());
        d.setGrupo(r.grupo());
        d.setHabitat(limpiar(r.habitat()));
        d.setVelocidadKmh(r.velocidadKmh());
        d.setModelo3dUrl(limpiar(r.modelo3dUrl()));
        d.setWikipediaTitulo(limpiar(r.wikipediaTitulo()));
        d.setCuriosidades(r.curiosidades() == null ? List.of() : r.curiosidades().stream().map(String::trim).toList());
        d.setLongitudMetros(r.longitudMetros());
        d.setAlturaMetros(r.alturaMetros());
        d.setPesoToneladas(r.pesoToneladas());
        d.setRegionDescubrimiento(limpiar(r.regionDescubrimiento()));
        d.setAnioDescubrimiento(r.anioDescubrimiento());
        d.setDescubridor(limpiar(r.descubridor()));
        d.setDescripcion(r.descripcion().trim());
        d.setCaracteristicas(r.caracteristicas() == null ? List.of() : r.caracteristicas().stream()
                .map(c -> new Caracteristica(c.nombre().trim(), c.valor().trim())).toList());
        d.setImagenes(r.imagenes() == null ? List.of() : r.imagenes().stream()
                .map(i -> new ImagenReferencia(i.url().trim(), limpiar(i.descripcion()))).toList());
    }

    private static String limpiar(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }
}
