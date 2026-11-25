package com.paleo.glosario.dto;

import java.util.List;

/**
 * Perfil de intereses del visitante.
 *
 * @param etiquetas       intereses principales legibles ("Cretácico", "Terópodos"…)
 * @param resumen         descripción en texto del perfil (la usa el asistente de IA)
 * @param recomendaciones dinosaurios sugeridos con el motivo de cada uno
 */
public record PerfilResponse(
        int totalInteracciones,
        List<String> etiquetas,
        String resumen,
        List<DinosaurioResumen> recomendaciones
) {}
