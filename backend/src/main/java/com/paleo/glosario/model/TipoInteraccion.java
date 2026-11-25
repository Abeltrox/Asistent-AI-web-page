package com.paleo.glosario.model;

/** Acciones del visitante que alimentan su perfil de intereses. El peso indica cuánto revela cada una. */
public enum TipoInteraccion {
    VISTA(3.0),        // abrió la ficha de un dinosaurio
    MODELO3D(2.0),     // interactuó con el modelo 3D
    SONIDO(2.0),       // reprodujo el sonido
    BUSQUEDA(1.5),     // escribió en el buscador
    FILTRO(1.0),       // aplicó un filtro (valor = "periodo:CRETACICO")
    CHAT(1.0),         // preguntó algo a Braqui
    INTERES(2.5);      // interés detectado por la IA en la conversación

    private final double peso;

    TipoInteraccion(double peso) { this.peso = peso; }

    public double getPeso() { return peso; }
}
