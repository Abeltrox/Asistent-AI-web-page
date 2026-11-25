package com.paleo.glosario.dto;

import com.paleo.glosario.model.TipoInteraccion;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record ActividadRequest(
        @NotNull(message = "El tipo de actividad es obligatorio")
        TipoInteraccion tipo,

        @Positive
        Long dinosaurioId,

        @Size(max = 300, message = "El valor no puede superar 300 caracteres")
        String valor
) {}
