package com.paleo.glosario.security;

import com.paleo.glosario.model.Usuario;
import com.paleo.glosario.service.AuthService;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.util.regex.Pattern;

/**
 * Resuelve quién está navegando: el usuario con sesión (si hay token) y el identificador anónimo del
 * navegador (cabecera X-Visitante-Id, generado por el frontend y guardado en localStorage).
 */
@Component
public class Identidad {

    public static final String CABECERA = "X-Visitante-Id";
    private static final Pattern VISITANTE = Pattern.compile("^[A-Za-z0-9-]{8,64}$");

    private final AuthService auth;

    public Identidad(AuthService auth) {
        this.auth = auth;
    }

    public Usuario usuario(UserDetails principal) {
        if (principal == null) return null;
        try {
            return auth.buscarPorEmail(principal.getUsername());
        } catch (RuntimeException e) {
            return null;
        }
    }

    /** Devuelve el id del visitante solo si tiene un formato válido (evita guardar basura). */
    public static String visitante(String cabecera) {
        return (cabecera != null && VISITANTE.matcher(cabecera).matches()) ? cabecera : null;
    }
}
