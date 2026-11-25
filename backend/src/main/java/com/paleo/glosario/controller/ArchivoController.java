package com.paleo.glosario.controller;

import com.paleo.glosario.service.ArchivoService;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/archivos")
public class ArchivoController {

    private final ArchivoService archivos;

    public ArchivoController(ArchivoService archivos) {
        this.archivos = archivos;
    }

    @PostMapping("/imagen")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('PALEONTOLOGO')")
    public Map<String, String> subir(@RequestParam("archivo") MultipartFile archivo) {
        return Map.of("url", archivos.guardarImagen(archivo));
    }
}
