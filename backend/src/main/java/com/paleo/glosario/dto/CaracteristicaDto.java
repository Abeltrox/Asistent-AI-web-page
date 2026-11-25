package com.paleo.glosario.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CaracteristicaDto(
        @NotBlank(message = "El nombre de la característica es obligatorio")
        @Size(max = 60, message = "El nombre de la característica no puede superar 60 caracteres")
        String nombre,

        @NotBlank(message = "El valor de la característica es obligatorio")
        @Size(max = 300, message = "El valor de la característica no puede superar 300 caracteres")
        String valor
) {}
