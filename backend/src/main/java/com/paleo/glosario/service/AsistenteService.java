package com.paleo.glosario.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.paleo.glosario.dto.ChatRequest;
import com.paleo.glosario.dto.ChatResponse;
import com.paleo.glosario.dto.DinosaurioResumen;
import com.paleo.glosario.dto.PerfilResponse;
import com.paleo.glosario.model.Dinosaurio;
import com.paleo.glosario.model.TipoInteraccion;
import com.paleo.glosario.model.Usuario;
import com.paleo.glosario.repository.DinosaurioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Puente entre el frontend y el microservicio Python (RAG + OpenAI).
 *
 * <p>Antes de preguntar, adjunta el perfil de intereses del visitante y la página que está viendo, para que
 * Braqui responda de forma personalizada. Después guarda lo aprendido (la pregunta y los intereses que la IA
 * detectó) y convierte los dinosaurios que la IA recomienda en tarjetas para el chat.
 */
@Service
public class AsistenteService {

    private static final Logger log = LoggerFactory.getLogger(AsistenteService.class);
    private static final int MAX_RECOMENDACIONES = 3;
    private static final java.util.regex.Pattern PIDE_RECOMENDACION = java.util.regex.Pattern.compile(
            "recomien|recomend|sugier|suger|que (mas )?(puedo )?(ver|explorar)|me (va a )?gustar|parecido|similar");

    private final RestClient cliente;
    private final PerfilService perfiles;
    private final DinosaurioRepository dinos;

    public AsistenteService(@Value("${app.asistente.url}") String url, PerfilService perfiles,
                            DinosaurioRepository dinos) {
        var fabrica = new SimpleClientHttpRequestFactory();
        fabrica.setConnectTimeout(3_000);
        fabrica.setReadTimeout(120_000);
        this.cliente = RestClient.builder().baseUrl(url).requestFactory(fabrica).build();
        this.perfiles = perfiles;
        this.dinos = dinos;
    }

    /** Lo que devuelve el servicio Python. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    record RespuestaIa(String respuesta, List<String> fuentes, List<Long> recomendaciones, List<String> intereses,
                      List<Map<String, Object>> acciones) {}

    public ChatResponse preguntar(ChatRequest req, Usuario usuario, String visitanteId) {
        Long dinoActualId = req.contexto() != null ? req.contexto().dinosaurioId() : null;
        PerfilResponse perfil = perfiles.perfil(usuario, visitanteId, null, 5);

        // Se registra la pregunta: sus palabras también revelan intereses
        perfiles.registrar(usuario, visitanteId, TipoInteraccion.CHAT, dinoActualId, req.mensaje());

        try {
            var historial = req.historial() == null ? List.of() : req.historial().stream()
                    .map(m -> Map.of("rol", m.rol(), "contenido", m.contenido())).toList();

            Map<String, Object> cuerpo = new HashMap<>();
            cuerpo.put("mensaje", req.mensaje());
            cuerpo.put("historial", historial);
            cuerpo.put("perfil", perfil.resumen());
            cuerpo.put("contexto", describirContexto(req, dinoActualId));
            cuerpo.put("usuario", usuario != null ? primerNombre(usuario.getNombre()) : "");
            cuerpo.put("dinosaurio_actual", dinoActualId == null ? ""
                    : dinos.findById(dinoActualId).map(Dinosaurio::getNombre).orElse(""));

            RespuestaIa r = cliente.post().uri("/chat")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(cuerpo)
                    .retrieve()
                    .body(RespuestaIa.class);
            if (r == null || r.respuesta() == null) throw new RestClientException("Respuesta vacía");

            // La IA aprende: guarda los intereses que detectó en la conversación
            if (r.intereses() != null) {
                r.intereses().stream().filter(Objects::nonNull).map(String::strip).filter(s -> !s.isEmpty())
                        .distinct().limit(3)
                        .forEach(i -> perfiles.registrar(usuario, visitanteId, TipoInteraccion.INTERES, null, i));
            }
            List<Map<String, Object>> acciones = validarAcciones(r.acciones(), dinoActualId);
            Set<Long> abiertos = new HashSet<>();
            acciones.forEach(a -> { if (a.get("dinosaurio_id") instanceof Long id) abiertos.add(id); });
            List<DinosaurioResumen> recs = tarjetas(r.recomendaciones(), perfil, dinoActualId).stream()
                    .filter(d -> !abiertos.contains(d.id())).toList();
            // Modo básico (sin IA) o la IA no eligió: si pidió recomendaciones, se usan las del perfil
            if (recs.isEmpty() && PIDE_RECOMENDACION.matcher(PerfilService.normalizar(req.mensaje())).find()) {
                recs = perfil.recomendaciones().stream()
                        .filter(d -> !d.id().equals(dinoActualId)).limit(MAX_RECOMENDACIONES).toList();
            }
            return new ChatResponse(r.respuesta(), r.fuentes() == null ? List.of() : r.fuentes(), recs, acciones);

        } catch (RestClientException e) {
            log.warn("Asistente IA no disponible: {}", e.getMessage());
            List<DinosaurioResumen> recs = perfil.recomendaciones().stream()
                    .filter(d -> !d.id().equals(dinoActualId)).limit(MAX_RECOMENDACIONES).toList();
            return new ChatResponse(
                    "¡Uy! Mi cerebro jurásico está descansando 🦕. El servicio de IA no responde ahora mismo. "
                            + "Mientras tanto: para iniciar sesión usa el botón «Acceder» arriba a la derecha; "
                            + "para registrar un dinosaurio necesitas una cuenta de paleontólogo con código de "
                            + "acreditación. Y por lo que has explorado, creo que estos te van a gustar:",
                    List.of(), recs);
        }
    }

    /* ------------------------------ Acciones ------------------------------ */

    private static final Set<String> TIPOS = Set.of("abrir_dinosaurio", "rugir", "ver_modelo3d", "buscar", "ir_a",
            "musica", "formulario_acceso", "cerrar_sesion", "olvidar_intereses");
    private static final Map<String, Set<String>> VALORES = Map.of(
            "periodo", Set.of("TRIASICO", "JURASICO", "CRETACICO"),
            "dieta", Set.of("HERBIVORO", "CARNIVORO", "OMNIVORO", "PISCIVORO", "INSECTIVORO"),
            "grupo", Arrays.stream(com.paleo.glosario.model.Grupo.values()).map(Enum::name).collect(Collectors.toSet()),
            "pagina", Set.of("inicio", "eras", "panel", "acceso", "test"),
            "modo", Set.of("login", "registro"),
            "rol", Set.of("USUARIO", "PALEONTOLOGO"));
    private static final Set<String> TEXTOS = Set.of("texto", "nombre", "email", "institucion", "especialidad");

    /**
     * La IA propone acciones; aquí solo pasan las permitidas, con ids de dinosaurios que existen y valores conocidos.
     * El navegador nunca recibe nada que no esté en esta lista blanca.
     */
    private List<Map<String, Object>> validarAcciones(List<Map<String, Object>> propuestas, Long dinoActualId) {
        if (propuestas == null) return List.of();
        List<Map<String, Object>> validas = new ArrayList<>();
        for (Map<String, Object> p : propuestas) {
            if (p == null || validas.size() >= 3 || !(p.get("tipo") instanceof String tipo) || !TIPOS.contains(tipo)) continue;
            Map<String, Object> a = new LinkedHashMap<>();
            a.put("tipo", tipo);

            if (Set.of("abrir_dinosaurio", "rugir", "ver_modelo3d").contains(tipo)) {
                Long id = p.get("dinosaurio_id") instanceof Number n ? n.longValue() : dinoActualId;
                if (id == null || !dinos.existsById(id)) continue;
                a.put("dinosaurio_id", id);
            }
            VALORES.forEach((campo, permitidos) -> {
                if (p.get(campo) instanceof String v && permitidos.contains(v)) a.put(campo, v);
            });
            for (String campo : TEXTOS) {
                if (p.get(campo) instanceof String v && !v.isBlank()) a.put(campo, v.strip().substring(0, Math.min(v.strip().length(), 120)));
            }
            if (p.get("encender") instanceof Boolean b) a.put("encender", b);
            if (tipo.equals("ir_a") && !a.containsKey("pagina")) continue;
            if (tipo.equals("formulario_acceso") && !a.containsKey("modo")) a.put("modo", "login");
            validas.add(a);
        }
        return validas;
    }

    /** Convierte los ids que eligió la IA en tarjetas (solo ids existentes), conservando el motivo del perfil. */
    private List<DinosaurioResumen> tarjetas(List<Long> ids, PerfilResponse perfil, Long dinoActualId) {
        if (ids == null || ids.isEmpty()) return List.of();
        Map<Long, String> motivos = new HashMap<>();
        perfil.recomendaciones().forEach(r -> motivos.put(r.id(), r.motivo()));
        List<DinosaurioResumen> r = new ArrayList<>();
        for (Long id : new LinkedHashSet<>(ids)) {
            if (id == null || id.equals(dinoActualId) || r.size() >= MAX_RECOMENDACIONES) continue;
            dinos.findById(id).ifPresent(d -> r.add(DinosaurioResumen.de(d, motivos.getOrDefault(id, "Sugerido por Braqui"))));
        }
        return r;
    }

    private String describirContexto(ChatRequest req, Long dinoActualId) {
        String pagina = req.contexto() != null && req.contexto().pagina() != null ? req.contexto().pagina() : "otra";
        String base = switch (pagina) {
            case "inicio" -> "Está en la página principal del glosario (listado, buscador y filtros).";
            case "panel" -> "Está en el panel del paleontólogo (formulario para registrar o editar dinosaurios).";
            case "acceso" -> "Está en la página de inicio de sesión / registro.";
            case "dinosaurio" -> "Está viendo la ficha de un dinosaurio (con modelo 3D interactivo y sonido).";
            default -> "Página desconocida.";
        };
        if (dinoActualId != null) {
            Optional<Dinosaurio> d = dinos.findById(dinoActualId);
            if (d.isPresent()) {
                base += " Ficha abierta ahora mismo: " + d.get().getNombre() + " (" + d.get().getNombreCientifico()
                        + ", id " + d.get().getId() + "). Si pregunta «este», «él» o «este dinosaurio», se refiere a este.";
            }
        }
        return base;
    }

    private static String primerNombre(String nombre) {
        if (nombre == null) return "";
        String limpio = nombre.replaceFirst("^(Dra?\\.|Sr\\.|Sra\\.)\\s+", "").strip();
        return limpio.split("\\s+")[0];
    }
}
