package com.paleo.glosario.model;

/**
 * Grupo anatómico del dinosaurio. Además de clasificar, el frontend lo usa para elegir
 * la forma del modelo 3D y el tipo de sonido recreado.
 */
public enum Grupo {
    TEROPODO("Terópodo", "Carnívoros bípedos de dientes afilados, como el Tiranosaurio."),
    DROMEOSAURIO("Dromeosáurido", "«Raptores» emplumados con una garra en forma de hoz en cada pie."),
    ESPINOSAURIDO("Espinosáurido", "Terópodos de hocico alargado, especializados en pescar."),
    ORNITOMIMIDO("Ornitomímido", "Corredores veloces con aspecto de avestruz y pico sin dientes."),
    PROSAUROPODO("Sauropodomorfo basal", "Antecesores de los saurópodos; de cuello largo y a menudo bípedos."),
    SAUROPODO("Saurópodo", "Gigantes cuadrúpedos de cuello y cola larguísimos."),
    ESTEGOSAURIO("Estegosaurio", "Herbívoros con placas óseas en la espalda y púas en la cola."),
    ANQUILOSAURIO("Anquilosaurio", "Herbívoros acorazados, algunos con un mazo óseo en la cola."),
    CERATOPSIO("Ceratopsio", "Herbívoros con pico, gola ósea y, a menudo, cuernos."),
    ORNITOPODO("Ornitópodo", "Herbívoros de pico de pato o iguanodontes; algunos con crestas huecas."),
    PAQUICEFALOSAURIO("Paquicefalosaurio", "Herbívoros bípedos con una cúpula craneal muy gruesa.");

    private final String nombre;
    private final String descripcion;

    Grupo(String nombre, String descripcion) {
        this.nombre = nombre;
        this.descripcion = descripcion;
    }

    public String getNombre() { return nombre; }
    public String getDescripcion() { return descripcion; }
}
