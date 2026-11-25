package com.paleo.glosario.dto;

import com.paleo.glosario.model.Rol;
import com.paleo.glosario.model.Usuario;

public record UsuarioResponse(Long id, String nombre, String email, Rol rol,
                              String institucion, String especialidad) {
    public static UsuarioResponse de(Usuario u) {
        return new UsuarioResponse(u.getId(), u.getNombre(), u.getEmail(), u.getRol(),
                u.getInstitucion(), u.getEspecialidad());
    }
}
