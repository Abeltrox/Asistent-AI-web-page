package com.paleo.glosario.dto;

import java.time.LocalDateTime;
import java.util.Map;

public record ApiError(int estado, String error, String mensaje, Map<String, String> campos, LocalDateTime fecha) {
    public static ApiError de(int estado, String error, String mensaje, Map<String, String> campos) {
        return new ApiError(estado, error, mensaje, campos, LocalDateTime.now());
    }
}
