package com.paleo.glosario.service;

import com.paleo.glosario.dto.*;
import com.paleo.glosario.exception.RecursoNoEncontradoException;
import com.paleo.glosario.exception.ReglaNegocioException;
import com.paleo.glosario.model.Rol;
import com.paleo.glosario.model.Usuario;
import com.paleo.glosario.repository.UsuarioRepository;
import com.paleo.glosario.security.JwtService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UsuarioRepository usuarios;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final AuthenticationManager authManager;
    private final String codigoAcreditacion;

    public AuthService(UsuarioRepository usuarios, PasswordEncoder encoder, JwtService jwt,
                       AuthenticationManager authManager,
                       @Value("${app.paleontologo.codigo-acreditacion}") String codigoAcreditacion) {
        this.usuarios = usuarios;
        this.encoder = encoder;
        this.jwt = jwt;
        this.authManager = authManager;
        this.codigoAcreditacion = codigoAcreditacion;
    }

    @Transactional
    public AuthResponse registrar(RegistroRequest r) {
        String email = r.email().trim().toLowerCase();
        if (usuarios.existsByEmailIgnoreCase(email)) {
            throw ReglaNegocioException.conflicto("email", "Ya existe una cuenta con ese correo");
        }
        if (r.rol() == Rol.PALEONTOLOGO) {
            if (esVacio(r.institucion())) {
                throw ReglaNegocioException.invalido("institucion", "Los paleontólogos deben indicar su institución");
            }
            if (esVacio(r.especialidad())) {
                throw ReglaNegocioException.invalido("especialidad", "Los paleontólogos deben indicar su especialidad");
            }
            if (esVacio(r.codigoAcreditacion()) || !codigoAcreditacion.equals(r.codigoAcreditacion().trim())) {
                throw ReglaNegocioException.invalido("codigoAcreditacion", "Código de acreditación inválido");
            }
        }

        Usuario u = new Usuario();
        u.setNombre(r.nombre().trim());
        u.setEmail(email);
        u.setPassword(encoder.encode(r.password()));
        u.setRol(r.rol());
        if (r.rol() == Rol.PALEONTOLOGO) {
            u.setInstitucion(r.institucion().trim());
            u.setEspecialidad(r.especialidad().trim());
        }
        usuarios.save(u);
        return new AuthResponse(jwt.generar(u), UsuarioResponse.de(u));
    }

    public AuthResponse login(LoginRequest r) {
        String email = r.email().trim().toLowerCase();
        authManager.authenticate(new UsernamePasswordAuthenticationToken(email, r.password()));
        Usuario u = buscarPorEmail(email);
        return new AuthResponse(jwt.generar(u), UsuarioResponse.de(u));
    }

    public Usuario buscarPorEmail(String email) {
        return usuarios.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado"));
    }

    private static boolean esVacio(String s) {
        return s == null || s.isBlank();
    }
}
