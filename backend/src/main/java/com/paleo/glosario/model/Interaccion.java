package com.paleo.glosario.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * Registro de actividad para personalizar las recomendaciones. Se guarda por usuario (si inició sesión)
 * y por identificador anónimo del navegador (visitanteId), así funciona también sin cuenta.
 * dinosaurioId es una columna simple (sin clave foránea) para que borrar un dinosaurio no falle.
 */
@Entity
@Table(name = "interacciones", indexes = {
        @Index(name = "idx_interaccion_usuario", columnList = "usuario_id, fecha"),
        @Index(name = "idx_interaccion_visitante", columnList = "visitante_id, fecha")
})
public class Interaccion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    @Column(name = "visitante_id", length = 64)
    private String visitanteId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoInteraccion tipo;

    @Column(name = "dinosaurio_id")
    private Long dinosaurioId;

    @Column(length = 300)
    private String valor;

    @Column(nullable = false)
    private LocalDateTime fecha;

    @PrePersist
    void alCrear() {
        if (fecha == null) fecha = LocalDateTime.now();
    }

    public Interaccion() {}

    public Interaccion(Usuario usuario, String visitanteId, TipoInteraccion tipo, Long dinosaurioId, String valor) {
        this.usuario = usuario;
        this.visitanteId = visitanteId;
        this.tipo = tipo;
        this.dinosaurioId = dinosaurioId;
        this.valor = valor;
    }

    public Long getId() { return id; }
    public Usuario getUsuario() { return usuario; }
    public String getVisitanteId() { return visitanteId; }
    public TipoInteraccion getTipo() { return tipo; }
    public Long getDinosaurioId() { return dinosaurioId; }
    public String getValor() { return valor; }
    public LocalDateTime getFecha() { return fecha; }
}
