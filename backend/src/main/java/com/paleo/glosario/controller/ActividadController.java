package com.paleo.glosario.controller;

import com.paleo.glosario.dto.ActividadRequest;
import com.paleo.glosario.dto.PerfilResponse;
import com.paleo.glosario.security.Identidad;
import com.paleo.glosario.service.PerfilService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** Registro de actividad del visitante y recomendaciones personalizadas (con o sin sesión). */
@RestController
@RequestMapping("/api")
public class ActividadController {

    private final PerfilService perfiles;
    private final Identidad identidad;

    public ActividadController(PerfilService perfiles, Identidad identidad) {
        this.perfiles = perfiles;
        this.identidad = identidad;
    }

    @PostMapping("/actividad")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void registrar(@Valid @RequestBody ActividadRequest req,
                          @RequestHeader(value = Identidad.CABECERA, required = false) String visitante,
                          @AuthenticationPrincipal UserDetails principal) {
        perfiles.registrar(identidad.usuario(principal), Identidad.visitante(visitante),
                req.tipo(), req.dinosaurioId(), req.valor());
    }

    /** ?excluir=ID para no recomendar el dinosaurio que se está viendo; ?limite=N (1–12). */
    @GetMapping("/recomendaciones")
    public PerfilResponse recomendaciones(@RequestParam(required = false) Long excluir,
                                          @RequestParam(defaultValue = "4") int limite,
                                          @RequestHeader(value = Identidad.CABECERA, required = false) String visitante,
                                          @AuthenticationPrincipal UserDetails principal) {
        return perfiles.perfil(identidad.usuario(principal), Identidad.visitante(visitante), excluir, limite);
    }

    /** «Olvidar mis intereses»: borra toda la actividad de este usuario/navegador. */
    @DeleteMapping("/actividad")
    public Map<String, Integer> olvidar(@RequestHeader(value = Identidad.CABECERA, required = false) String visitante,
                                        @AuthenticationPrincipal UserDetails principal) {
        return Map.of("borradas", perfiles.olvidar(identidad.usuario(principal), Identidad.visitante(visitante)));
    }
}
