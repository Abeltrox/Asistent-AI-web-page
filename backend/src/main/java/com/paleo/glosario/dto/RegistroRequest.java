package com.paleo.glosario.dto;

import com.paleo.glosario.model.Rol;
import jakarta.validation.constraints.*;

public record RegistroRequest(
        @NotBlank(message = "El nombre es obligatorio")
        @Size(min = 2, max = 80, message = "El nombre debe tener entre 2 y 80 caracteres")
        @Pattern(regexp = "^[\\p{L} .'-]+$", message = "El nombre solo puede contener letras, espacios, puntos, apóstrofos y guiones")
        String nombre,

        @NotBlank(message = "El correo es obligatorio")
        @Email(message = "El correo no tiene un formato válido")
        @Size(max = 120, message = "El correo no puede superar 120 caracteres")
        String email,

        @NotBlank(message = "La contraseña es obligatoria")
        @Size(min = 8, max = 64, message = "La contraseña debe tener entre 8 y 64 caracteres")
        @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$",
                message = "La contraseña debe incluir al menos una mayúscula, una minúscula y un número")
        String password,

        @NotNull(message = "Debes elegir un tipo de cuenta")
        Rol rol,

        @Size(max = 120, message = "La institución no puede superar 120 caracteres")
        String institucion,

        @Size(max = 120, message = "La especialidad no puede superar 120 caracteres")
        String especialidad,

        /* Requerido solo cuando rol = PALEONTOLOGO (se valida en el servicio) */
        @Size(max = 40)
        String codigoAcreditacion
) {}
