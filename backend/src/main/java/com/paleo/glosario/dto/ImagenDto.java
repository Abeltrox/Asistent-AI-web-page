package com.paleo.glosario.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ImagenDto(
        @NotBlank(message = "La URL de la imagen es obligatoria")
        @Size(max = 600, message = "La URL de la imagen es demasiado larga")
        @Pattern(regexp = "^(https?://\\S+|/uploads/[\\w.-]+|/img/[\\w./-]+)$",
                message = "La imagen debe ser una URL http(s) o un archivo subido al servidor")
        String url,

        @Size(max = 200, message = "La descripción de la imagen no puede superar 200 caracteres")
        String descripcion
) {}
