package com.paleo.glosario.model;

public enum Dieta {
    HERBIVORO("Herbívoro"),
    CARNIVORO("Carnívoro"),
    OMNIVORO("Omnívoro"),
    PISCIVORO("Piscívoro"),
    INSECTIVORO("Insectívoro");

    private final String nombre;

    Dieta(String nombre) { this.nombre = nombre; }

    public String getNombre() { return nombre; }
}
