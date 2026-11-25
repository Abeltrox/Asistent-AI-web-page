package com.paleo.glosario.controller;

import com.paleo.glosario.dto.ChatRequest;
import com.paleo.glosario.dto.ChatResponse;
import com.paleo.glosario.security.Identidad;
import com.paleo.glosario.service.AsistenteService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/asistente")
public class AsistenteController {

    private final AsistenteService asistente;
    private final Identidad identidad;

    public AsistenteController(AsistenteService asistente, Identidad identidad) {
        this.asistente = asistente;
        this.identidad = identidad;
    }

    @PostMapping("/chat")
    public ChatResponse chat(@Valid @RequestBody ChatRequest req,
                             @RequestHeader(value = Identidad.CABECERA, required = false) String visitante,
                             @AuthenticationPrincipal UserDetails principal) {
        return asistente.preguntar(req, identidad.usuario(principal), Identidad.visitante(visitante));
    }
}
