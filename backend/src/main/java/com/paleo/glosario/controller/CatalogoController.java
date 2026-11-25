package com.paleo.glosario.controller;

import com.paleo.glosario.model.Dieta;
import com.paleo.glosario.model.Grupo;
import com.paleo.glosario.model.Periodo;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

/** Catálogos para poblar los selects del frontend. */
@RestController
@RequestMapping("/api/catalogos")
public class CatalogoController {

    @GetMapping("/periodos")
    public List<Map<String, String>> periodos() {
        return Arrays.stream(Periodo.values())
                .map(p -> Map.of("valor", p.name(), "nombre", p.getNombre(), "rango", p.getRango()))
                .toList();
    }

    @GetMapping("/dietas")
    public List<Map<String, String>> dietas() {
        return Arrays.stream(Dieta.values())
                .map(d -> Map.of("valor", d.name(), "nombre", d.getNombre()))
                .toList();
    }

    @GetMapping("/grupos")
    public List<Map<String, String>> grupos() {
        return Arrays.stream(Grupo.values())
                .map(g -> Map.of("valor", g.name(), "nombre", g.getNombre(), "descripcion", g.getDescripcion()))
                .toList();
    }
}
