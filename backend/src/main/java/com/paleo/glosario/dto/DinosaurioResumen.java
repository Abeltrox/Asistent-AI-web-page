package com.paleo.glosario.dto;

import com.paleo.glosario.model.Dinosaurio;

/** Versión corta de un dinosaurio para tarjetas de recomendación (página y chat). */
public record DinosaurioResumen(
        Long id,
        String nombre,
        String nombreCientifico,
        String periodoNombre,
        String dietaNombre,
        String grupoNombre,
        String imagen,
        String wikipediaTitulo,
        String motivo
) {
    public static DinosaurioResumen de(Dinosaurio d, String motivo) {
        return new DinosaurioResumen(d.getId(), d.getNombre(), d.getNombreCientifico(),
                d.getPeriodo().getNombre(), d.getDieta().getNombre(),
                d.getGrupo() != null ? d.getGrupo().getNombre() : null,
                d.getImagenes().isEmpty() ? null : d.getImagenes().get(0).getUrl(),
                d.getWikipediaTitulo(), motivo);
    }
}
