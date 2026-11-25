package com.paleo.glosario.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.paleo.glosario.dto.ApiError;
import com.paleo.glosario.security.JwtAuthFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtFilter;
    private final ObjectMapper mapper;

    public SecurityConfig(JwtAuthFilter jwtFilter, ObjectMapper mapper) {
        this.jwtFilter = jwtFilter;
        this.mapper = mapper;
    }

    @Bean
    public SecurityFilterChain filtro(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable) // API stateless con JWT
                .headers(h -> h.frameOptions(f -> f.sameOrigin())) // consola H2
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/registro", "/api/auth/login").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/dinosaurios/**", "/api/catalogos/**").permitAll()
                        .requestMatchers("/api/asistente/**", "/api/actividad", "/api/recomendaciones").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/dinosaurios/**", "/api/archivos/**").hasRole("PALEONTOLOGO")
                        .requestMatchers(HttpMethod.PUT, "/api/dinosaurios/**").hasRole("PALEONTOLOGO")
                        .requestMatchers(HttpMethod.DELETE, "/api/dinosaurios/**").hasRole("PALEONTOLOGO")
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().permitAll() // páginas HTML, CSS, JS, imágenes, /uploads
                )
                .exceptionHandling(e -> e
                        .authenticationEntryPoint((req, res, ex) -> escribir(res, 401, "Unauthorized",
                                "Debes iniciar sesión para continuar"))
                        .accessDeniedHandler((req, res, ex) -> escribir(res, 403, "Forbidden",
                                "Solo los paleontólogos pueden realizar esta acción")))
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    private void escribir(jakarta.servlet.http.HttpServletResponse res, int estado, String error, String msg)
            throws java.io.IOException {
        res.setStatus(estado);
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        res.setCharacterEncoding("UTF-8");
        mapper.writeValue(res.getOutputStream(), ApiError.de(estado, error, msg, null));
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration cfg) throws Exception {
        return cfg.getAuthenticationManager();
    }
}
