package com.paleo.glosario.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record MensajeChat(
        @NotBlank @Pattern(regexp = "user|assistant", message = "Rol de mensaje inválido") String rol,
        @NotBlank @Size(max = 4000) String contenido
) {}
