package com.paleo.glosario.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record ChatRequest(
        @NotBlank(message = "Escribe una pregunta")
        @Size(max = 1000, message = "La pregunta no puede superar 1000 caracteres")
        String mensaje,

        @Size(max = 20, message = "Historial demasiado largo")
        List<@Valid MensajeChat> historial,

        @Valid
        ContextoChat contexto
) {}
