package com.paleo.glosario.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "dinosaurios", uniqueConstraints = @UniqueConstraint(columnNames = "nombre"))
public class Dinosaurio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 80)
    private String nombre;

    @Column(nullable = false, length = 120)
    private String nombreCientifico;

    @Column(length = 200)
    private String significadoNombre;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Periodo periodo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Dieta dieta;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private Grupo grupo;

    @Column(length = 200)
    private String habitat;

    private Double velocidadKmh;

    /** URL opcional de un modelo 3D .glb/.gltf; si no hay, el frontend genera uno según el grupo. */
    @Column(length = 600)
    private String modelo3dUrl;

    /** Título del artículo de Wikipedia para traer imágenes y resumen (por defecto, el género). */
    @Column(length = 120)
    private String wikipediaTitulo;

    private Double longitudMetros;
    private Double alturaMetros;
    private Double pesoToneladas;

    @Column(length = 120)
    private String regionDescubrimiento;

    private Integer anioDescubrimiento;

    @Column(length = 120)
    private String descubridor;

    @Column(nullable = false, length = 4000)
    private String descripcion;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "dinosaurio_caracteristicas", joinColumns = @JoinColumn(name = "dinosaurio_id"))
    @OrderColumn(name = "orden")
    private List<Caracteristica> caracteristicas = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "dinosaurio_imagenes", joinColumns = @JoinColumn(name = "dinosaurio_id"))
    @OrderColumn(name = "orden")
    private List<ImagenReferencia> imagenes = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "dinosaurio_curiosidades", joinColumns = @JoinColumn(name = "dinosaurio_id"))
    @OrderColumn(name = "orden")
    @Column(name = "texto", nullable = false, length = 300)
    private List<String> curiosidades = new ArrayList<>();

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "registrado_por_id")
    private Usuario registradoPor;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "actualizado_por_id")
    private Usuario actualizadoPor;

    @Column(nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    private LocalDateTime fechaActualizacion;

    @PrePersist
    void alCrear() {
        fechaCreacion = LocalDateTime.now();
        fechaActualizacion = fechaCreacion;
    }

    @PreUpdate
    void alActualizar() {
        fechaActualizacion = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getNombreCientifico() { return nombreCientifico; }
    public void setNombreCientifico(String nombreCientifico) { this.nombreCientifico = nombreCientifico; }
    public String getSignificadoNombre() { return significadoNombre; }
    public void setSignificadoNombre(String significadoNombre) { this.significadoNombre = significadoNombre; }
    public Periodo getPeriodo() { return periodo; }
    public void setPeriodo(Periodo periodo) { this.periodo = periodo; }
    public Dieta getDieta() { return dieta; }
    public void setDieta(Dieta dieta) { this.dieta = dieta; }
    public Grupo getGrupo() { return grupo; }
    public void setGrupo(Grupo grupo) { this.grupo = grupo; }
    public String getHabitat() { return habitat; }
    public void setHabitat(String habitat) { this.habitat = habitat; }
    public Double getVelocidadKmh() { return velocidadKmh; }
    public void setVelocidadKmh(Double velocidadKmh) { this.velocidadKmh = velocidadKmh; }
    public String getModelo3dUrl() { return modelo3dUrl; }
    public void setModelo3dUrl(String modelo3dUrl) { this.modelo3dUrl = modelo3dUrl; }
    public String getWikipediaTitulo() { return wikipediaTitulo; }
    public void setWikipediaTitulo(String wikipediaTitulo) { this.wikipediaTitulo = wikipediaTitulo; }
    public List<String> getCuriosidades() { return curiosidades; }
    public void setCuriosidades(List<String> curiosidades) {
        this.curiosidades.clear();
        if (curiosidades != null) this.curiosidades.addAll(curiosidades);
    }
    public Double getLongitudMetros() { return longitudMetros; }
    public void setLongitudMetros(Double longitudMetros) { this.longitudMetros = longitudMetros; }
    public Double getAlturaMetros() { return alturaMetros; }
    public void setAlturaMetros(Double alturaMetros) { this.alturaMetros = alturaMetros; }
    public Double getPesoToneladas() { return pesoToneladas; }
    public void setPesoToneladas(Double pesoToneladas) { this.pesoToneladas = pesoToneladas; }
    public String getRegionDescubrimiento() { return regionDescubrimiento; }
    public void setRegionDescubrimiento(String regionDescubrimiento) { this.regionDescubrimiento = regionDescubrimiento; }
    public Integer getAnioDescubrimiento() { return anioDescubrimiento; }
    public void setAnioDescubrimiento(Integer anioDescubrimiento) { this.anioDescubrimiento = anioDescubrimiento; }
    public String getDescubridor() { return descubridor; }
    public void setDescubridor(String descubridor) { this.descubridor = descubridor; }
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    public List<Caracteristica> getCaracteristicas() { return caracteristicas; }
    public void setCaracteristicas(List<Caracteristica> caracteristicas) {
        this.caracteristicas.clear();
        if (caracteristicas != null) this.caracteristicas.addAll(caracteristicas);
    }
    public List<ImagenReferencia> getImagenes() { return imagenes; }
    public void setImagenes(List<ImagenReferencia> imagenes) {
        this.imagenes.clear();
        if (imagenes != null) this.imagenes.addAll(imagenes);
    }
    public Usuario getRegistradoPor() { return registradoPor; }
    public void setRegistradoPor(Usuario registradoPor) { this.registradoPor = registradoPor; }
    public Usuario getActualizadoPor() { return actualizadoPor; }
    public void setActualizadoPor(Usuario actualizadoPor) { this.actualizadoPor = actualizadoPor; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public LocalDateTime getFechaActualizacion() { return fechaActualizacion; }
}
