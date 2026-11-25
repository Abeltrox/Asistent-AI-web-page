package com.paleo.glosario.exception;

import java.util.Map;

/** Error de validación de negocio (409/400) con campo opcional asociado. */
public class ReglaNegocioException extends RuntimeException {
    private final String campo;
    private final boolean conflicto;

    public ReglaNegocioException(String campo, String mensaje, boolean conflicto) {
        super(mensaje);
        this.campo = campo;
        this.conflicto = conflicto;
    }

    public static ReglaNegocioException conflicto(String campo, String mensaje) {
        return new ReglaNegocioException(campo, mensaje, true);
    }

    public static ReglaNegocioException invalido(String campo, String mensaje) {
        return new ReglaNegocioException(campo, mensaje, false);
    }

    public Map<String, String> campos() {
        return campo == null ? Map.of() : Map.of(campo, getMessage());
    }

    public boolean esConflicto() { return conflicto; }
}
