package com.paleo.glosario.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/** Característica libre que el paleontólogo agrega: p. ej. "Cresta" → "Ósea, en forma de abanico". */
@Embeddable
public class Caracteristica {

    @Column(name = "nombre", nullable = false, length = 60)
    private String nombre;

    @Column(name = "valor", nullable = false, length = 300)
    private String valor;

    public Caracteristica() {}

    public Caracteristica(String nombre, String valor) {
        this.nombre = nombre;
        this.valor = valor;
    }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getValor() { return valor; }
    public void setValor(String valor) { this.valor = valor; }
}
