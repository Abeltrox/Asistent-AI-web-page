package com.paleo.glosario.dto;

import com.paleo.glosario.model.Dinosaurio;

import java.time.LocalDateTime;
import java.util.List;

public record DinosaurioResponse(
        Long id,
        String nombre,
        String nombreCientifico,
        String significadoNombre,
        String periodo,
        String periodoNombre,
        String periodoRango,
        String dieta,
        String dietaNombre,
        String grupo,
        String grupoNombre,
        String grupoDescripcion,
        Double longitudMetros,
        Double alturaMetros,
        Double pesoToneladas,
        Double velocidadKmh,
        String habitat,
        String regionDescubrimiento,
        Integer anioDescubrimiento,
        String descubridor,
        String descripcion,
        List<CaracteristicaDto> caracteristicas,
        List<String> curiosidades,
        List<ImagenDto> imagenes,
        String modelo3dUrl,
        String wikipediaTitulo,
        String registradoPor,
        String actualizadoPor,
        LocalDateTime fechaCreacion,
        LocalDateTime fechaActualizacion
) {
    public static DinosaurioResponse de(Dinosaurio d) {
        var g = d.getGrupo();
        return new DinosaurioResponse(
                d.getId(), d.getNombre(), d.getNombreCientifico(), d.getSignificadoNombre(),
                d.getPeriodo().name(), d.getPeriodo().getNombre(), d.getPeriodo().getRango(),
                d.getDieta().name(), d.getDieta().getNombre(),
                g != null ? g.name() : null, g != null ? g.getNombre() : null, g != null ? g.getDescripcion() : null,
                d.getLongitudMetros(), d.getAlturaMetros(), d.getPesoToneladas(), d.getVelocidadKmh(),
                d.getHabitat(), d.getRegionDescubrimiento(), d.getAnioDescubrimiento(), d.getDescubridor(),
                d.getDescripcion(),
                d.getCaracteristicas().stream().map(c -> new CaracteristicaDto(c.getNombre(), c.getValor())).toList(),
                List.copyOf(d.getCuriosidades()),
                d.getImagenes().stream().map(i -> new ImagenDto(i.getUrl(), i.getDescripcion())).toList(),
                d.getModelo3dUrl(), d.getWikipediaTitulo(),
                d.getRegistradoPor() != null ? d.getRegistradoPor().getNombre() : null,
                d.getActualizadoPor() != null ? d.getActualizadoPor().getNombre() : null,
                d.getFechaCreacion(), d.getFechaActualizacion());
    }
}
