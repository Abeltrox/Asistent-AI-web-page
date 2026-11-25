package com.paleo.glosario.model;

public enum Periodo {
    TRIASICO("Triásico", "252 – 201 millones de años"),
    JURASICO("Jurásico", "201 – 145 millones de años"),
    CRETACICO("Cretácico", "145 – 66 millones de años");

    private final String nombre;
    private final String rango;

    Periodo(String nombre, String rango) {
        this.nombre = nombre;
        this.rango = rango;
    }

    public String getNombre() { return nombre; }
    public String getRango() { return rango; }
}
