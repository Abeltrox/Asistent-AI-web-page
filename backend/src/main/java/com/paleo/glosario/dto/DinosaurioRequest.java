package com.paleo.glosario.dto;

import com.paleo.glosario.model.Dieta;
import com.paleo.glosario.model.Grupo;
import com.paleo.glosario.model.Periodo;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.util.List;

public record DinosaurioRequest(
        @NotBlank(message = "El nombre común es obligatorio")
        @Size(min = 2, max = 80, message = "El nombre debe tener entre 2 y 80 caracteres")
        String nombre,

        @NotBlank(message = "El nombre científico es obligatorio")
        @Size(max = 120)
        @Pattern(regexp = "^[A-Z][a-z]+( [a-z]+){0,2}$",
                message = "El nombre científico debe seguir la nomenclatura binomial, p. ej. 'Tyrannosaurus rex'")
        String nombreCientifico,

        @Size(max = 200, message = "El significado del nombre no puede superar 200 caracteres")
        String significadoNombre,

        @NotNull(message = "El periodo geológico es obligatorio")
        Periodo periodo,

        @NotNull(message = "La dieta es obligatoria")
        Dieta dieta,

        /** Opcional: decide la forma del modelo 3D y el sonido */
        Grupo grupo,

        @DecimalMin(value = "0.1", message = "La longitud mínima es 0.1 m")
        @DecimalMax(value = "60.0", message = "La longitud máxima permitida es 60 m")
        Double longitudMetros,

        @DecimalMin(value = "0.1", message = "La altura mínima es 0.1 m")
        @DecimalMax(value = "25.0", message = "La altura máxima permitida es 25 m")
        Double alturaMetros,

        @DecimalMin(value = "0.001", message = "El peso mínimo es 0.001 t")
        @DecimalMax(value = "100.0", message = "El peso máximo permitido es 100 t")
        Double pesoToneladas,

        @DecimalMin(value = "0.5", message = "La velocidad mínima es 0.5 km/h")
        @DecimalMax(value = "120.0", message = "La velocidad máxima permitida es 120 km/h")
        Double velocidadKmh,

        @Size(max = 200, message = "El hábitat no puede superar 200 caracteres")
        String habitat,

        @Size(max = 120, message = "La región no puede superar 120 caracteres")
        String regionDescubrimiento,

        @Min(value = 1676, message = "El primer fósil de dinosaurio documentado es de 1676")
        Integer anioDescubrimiento,

        @Size(max = 120, message = "El descubridor no puede superar 120 caracteres")
        String descubridor,

        @NotBlank(message = "La descripción es obligatoria")
        @Size(min = 30, max = 4000, message = "La descripción debe tener entre 30 y 4000 caracteres")
        String descripcion,

        @Size(max = 30, message = "Máximo 30 características por dinosaurio")
        List<@Valid CaracteristicaDto> caracteristicas,

        @Size(max = 15, message = "Máximo 15 curiosidades por dinosaurio")
        List<@NotBlank(message = "Las curiosidades no pueden estar vacías")
             @Size(max = 300, message = "Cada curiosidad puede tener hasta 300 caracteres") String> curiosidades,

        @Size(max = 12, message = "Máximo 12 imágenes por dinosaurio")
        List<@Valid ImagenDto> imagenes,

        @Size(max = 600, message = "La URL del modelo 3D es demasiado larga")
        @Pattern(regexp = "^(https?://\\S+|/modelos/[\\w./-]+)\\.(glb|gltf|fbx|obj)(\\?\\S*)?$",
                message = "El modelo 3D debe ser un archivo .glb, .gltf, .fbx u .obj (URL http(s) o /modelos/archivo)")
        String modelo3dUrl,

        @Size(max = 120, message = "El título de Wikipedia no puede superar 120 caracteres")
        String wikipediaTitulo
) {}
