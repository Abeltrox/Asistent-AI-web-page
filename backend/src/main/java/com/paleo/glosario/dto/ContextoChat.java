package com.paleo.glosario.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;

/** Dónde está el visitante cuando habla con Braqui (para responder en contexto). */
public record ContextoChat(
        @Pattern(regexp = "inicio|dinosaurio|panel|acceso|otra", message = "Página de contexto inválida")
        String pagina,

        @Positive
        Long dinosaurioId
) {}
