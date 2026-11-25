package com.paleo.glosario.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class ImagenReferencia {

    @Column(name = "url", nullable = false, length = 600)
    private String url;

    @Column(name = "descripcion", length = 200)
    private String descripcion;

    public ImagenReferencia() {}

    public ImagenReferencia(String url, String descripcion) {
        this.url = url;
        this.descripcion = descripcion;
    }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
}
