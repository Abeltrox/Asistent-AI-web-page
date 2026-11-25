package com.paleo.glosario.controller;

import com.paleo.glosario.dto.DinosaurioRequest;
import com.paleo.glosario.dto.DinosaurioResponse;
import com.paleo.glosario.model.Dieta;
import com.paleo.glosario.model.Grupo;
import com.paleo.glosario.model.Periodo;
import com.paleo.glosario.service.AuthService;
import com.paleo.glosario.service.DinosaurioService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/dinosaurios")
public class DinosaurioController {

    private final DinosaurioService servicio;
    private final AuthService auth;

    public DinosaurioController(DinosaurioService servicio, AuthService auth) {
        this.servicio = servicio;
        this.auth = auth;
    }

    /** Público: lista con filtros opcionales ?q=rex&periodo=CRETACICO&dieta=CARNIVORO&grupo=TEROPODO */
    @GetMapping
    public List<DinosaurioResponse> listar(@RequestParam(required = false) String q,
                                           @RequestParam(required = false) Periodo periodo,
                                           @RequestParam(required = false) Dieta dieta,
                                           @RequestParam(required = false) Grupo grupo) {
        return servicio.buscar(q, periodo, dieta, grupo);
    }

    @GetMapping("/{id}")
    public DinosaurioResponse obtener(@PathVariable Long id) {
        return servicio.obtener(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('PALEONTOLOGO')")
    public DinosaurioResponse crear(@Valid @RequestBody DinosaurioRequest req,
                                    @AuthenticationPrincipal UserDetails usuario) {
        return servicio.crear(req, auth.buscarPorEmail(usuario.getUsername()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('PALEONTOLOGO')")
    public DinosaurioResponse actualizar(@PathVariable Long id, @Valid @RequestBody DinosaurioRequest req,
                                         @AuthenticationPrincipal UserDetails usuario) {
        return servicio.actualizar(id, req, auth.buscarPorEmail(usuario.getUsername()));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('PALEONTOLOGO')")
    public void eliminar(@PathVariable Long id) {
        servicio.eliminar(id);
    }
}
