package com.paleo.glosario.dto;

import java.util.List;
import java.util.Map;

/**
 * Respuesta de Braqui: texto, fuentes del RAG, dinosaurios recomendados (tarjetas) y acciones que el navegador
 * ejecuta automáticamente (abrir un dinosaurio, hacerlo rugir, filtrar, abrir el formulario de acceso…).
 */
public record ChatResponse(String respuesta, List<String> fuentes, List<DinosaurioResumen> recomendaciones,
                           List<Map<String, Object>> acciones) {

    public ChatResponse(String respuesta, List<String> fuentes, List<DinosaurioResumen> recomendaciones) {
        this(respuesta, fuentes, recomendaciones, List.of());
    }
}
