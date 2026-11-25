package com.paleo.glosario.service;

import com.paleo.glosario.dto.DinosaurioResumen;
import com.paleo.glosario.dto.PerfilResponse;
import com.paleo.glosario.model.*;
import com.paleo.glosario.repository.DinosaurioRepository;
import com.paleo.glosario.repository.InteraccionRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Aprende los intereses de cada visitante a partir de lo que hace en la página (fichas que abre, búsquedas,
 * filtros, sonidos, modelos 3D y conversación con Braqui) y recomienda dinosaurios afines que aún no ha visto.
 *
 * <p>Cada acción suma afinidad a un periodo, una dieta y un grupo, con un peso según el tipo de acción y una
 * caída exponencial con el tiempo (vida media de 14 días), de modo que los gustos recientes pesan más.
 */
@Service
public class PerfilService {

    private static final int MAX_INTERACCIONES = 400;
    private static final double VIDA_MEDIA_DIAS = 14.0;

    /** Palabras que delatan un interés aunque no se nombre a ningún dinosaurio concreto. */
    private static final Map<String, Enum<?>> PISTAS = Map.ofEntries(
            Map.entry("triasic", Periodo.TRIASICO), Map.entry("jurasic", Periodo.JURASICO),
            Map.entry("cretacic", Periodo.CRETACICO),
            Map.entry("carnivor", Dieta.CARNIVORO), Map.entry("depredador", Dieta.CARNIVORO),
            Map.entry("cazador", Dieta.CARNIVORO), Map.entry("herbivor", Dieta.HERBIVORO),
            Map.entry("plantas", Dieta.HERBIVORO), Map.entry("omnivor", Dieta.OMNIVORO),
            Map.entry("piscivor", Dieta.PISCIVORO), Map.entry("pesca", Dieta.PISCIVORO),
            Map.entry("peces", Dieta.PISCIVORO), Map.entry("acuatic", Grupo.ESPINOSAURIDO),
            Map.entry("nadar", Grupo.ESPINOSAURIDO), Map.entry("insectivor", Dieta.INSECTIVORO),
            Map.entry("raptor", Grupo.DROMEOSAURIO), Map.entry("pluma", Grupo.DROMEOSAURIO),
            Map.entry("garra", Grupo.DROMEOSAURIO), Map.entry("teropod", Grupo.TEROPODO),
            Map.entry("sauropod", Grupo.SAUROPODO), Map.entry("cuello", Grupo.SAUROPODO),
            Map.entry("gigante", Grupo.SAUROPODO), Map.entry("enorme", Grupo.SAUROPODO),
            Map.entry("cuerno", Grupo.CERATOPSIO), Map.entry("ceratop", Grupo.CERATOPSIO),
            Map.entry("placas", Grupo.ESTEGOSAURIO), Map.entry("armadura", Grupo.ANQUILOSAURIO),
            Map.entry("acoraz", Grupo.ANQUILOSAURIO), Map.entry("coraza", Grupo.ANQUILOSAURIO),
            Map.entry("cresta", Grupo.ORNITOPODO), Map.entry("hadrosaur", Grupo.ORNITOPODO),
            Map.entry("pico de pato", Grupo.ORNITOPODO), Map.entry("velocidad", Grupo.ORNITOMIMIDO),
            Map.entry("corredor", Grupo.ORNITOMIMIDO), Map.entry("rapido", Grupo.ORNITOMIMIDO),
            Map.entry("cupula", Grupo.PAQUICEFALOSAURIO), Map.entry("cabezazo", Grupo.PAQUICEFALOSAURIO));

    private static final Set<String> VACIAS = Set.of(
            "como", "cual", "cuales", "cuanto", "cuantos", "sobre", "tiene", "tenia", "tenian", "quiero", "saber",
            "porque", "donde", "cuando", "fueron", "eran", "esta", "este", "estos", "estas", "algun", "alguno",
            "alguna", "puedo", "puede", "hola", "gracias", "favor", "dime", "cuentame", "explica", "mucho", "muy",
            "para", "entre", "desde", "hasta", "habia", "existe", "existio", "otro", "otra", "todos", "todas",
            "mismo", "tambien", "aqui", "pagina", "glosario", "braqui", "ficha", "nuevo", "nueva", "mejor", "tipo");

    private final InteraccionRepository interacciones;
    private final DinosaurioRepository dinos;

    public PerfilService(InteraccionRepository interacciones, DinosaurioRepository dinos) {
        this.interacciones = interacciones;
        this.dinos = dinos;
    }

    @Transactional
    public void registrar(Usuario usuario, String visitanteId, TipoInteraccion tipo, Long dinosaurioId, String valor) {
        if (usuario == null && visitanteId == null) return; // sin identidad no hay perfil que alimentar
        String v = (valor == null || valor.isBlank()) ? null : valor.strip();
        if (v != null && v.length() > 300) v = v.substring(0, 300);
        interacciones.save(new Interaccion(usuario, visitanteId, tipo, dinosaurioId, v));
    }

    @Transactional
    public int olvidar(Usuario usuario, String visitanteId) {
        if (usuario == null && visitanteId == null) return 0;
        return interacciones.borrar(usuario != null ? usuario.getId() : null, visitanteId);
    }

    @Transactional(readOnly = true)
    public PerfilResponse perfil(Usuario usuario, String visitanteId, Long excluirId, int limite) {
        List<Dinosaurio> catalogo = dinos.findAll();
        Map<Long, Dinosaurio> porId = catalogo.stream().collect(Collectors.toMap(Dinosaurio::getId, Function.identity()));

        List<Interaccion> historial = (usuario == null && visitanteId == null) ? List.of()
                : interacciones.recientes(usuario != null ? usuario.getId() : null, visitanteId,
                PageRequest.of(0, MAX_INTERACCIONES));

        Afinidad a = calcular(historial, catalogo, porId);
        List<DinosaurioResumen> recs = recomendar(a, catalogo, excluirId, limite, usuario, visitanteId);
        return new PerfilResponse(historial.size(), etiquetas(a), resumen(a, porId, recs, historial.size()), recs);
    }

    /* ------------------------------------------------------------------ */

    private static final class Afinidad {
        final Map<Periodo, Double> periodos = new EnumMap<>(Periodo.class);
        final Map<Dieta, Double> dietas = new EnumMap<>(Dieta.class);
        final Map<Grupo, Double> grupos = new EnumMap<>(Grupo.class);
        final Map<Long, Integer> vistas = new LinkedHashMap<>();
        final Map<String, Double> terminos = new HashMap<>();
        final LinkedHashSet<String> busquedas = new LinkedHashSet<>();
        final LinkedHashSet<String> intereses = new LinkedHashSet<>();

        void sumar(Enum<?> clave, double w) {
            if (clave instanceof Periodo p) periodos.merge(p, w, Double::sum);
            else if (clave instanceof Dieta d) dietas.merge(d, w, Double::sum);
            else if (clave instanceof Grupo g) grupos.merge(g, w, Double::sum);
        }

        void sumar(Dinosaurio d, double w) {
            sumar(d.getPeriodo(), w);
            sumar(d.getDieta(), w);
            if (d.getGrupo() != null) sumar(d.getGrupo(), w);
        }
    }

    /**
     * Las respuestas del test de gustos llegan con el prefijo {@code test|}. Son preferencias declaradas a propósito,
     * así que pesan más que la navegación, no se interpretan como texto libre (para que «gigantesco» o «llanuras» no
     * cuelen grupos que el usuario no eligió) y, si repite el test, solo cuenta el último.
     * Formato del valor: {@code test|<sesión>|<dato>}; la sesión identifica cada vez que se hizo el test.
     */
    static final String PREFIJO_TEST = "test|";
    private static final double PESO_TEST = 4.0;

    private static String sesionTest(Interaccion i) {
        String v = i.getValor();
        if (v == null || !v.startsWith(PREFIJO_TEST)) return null;
        int fin = v.indexOf('|', PREFIJO_TEST.length());
        return fin < 0 ? null : v.substring(PREFIJO_TEST.length(), fin);
    }

    private Afinidad calcular(List<Interaccion> historial, List<Dinosaurio> catalogo, Map<Long, Dinosaurio> porId) {
        Afinidad a = new Afinidad();
        Afinidad test = new Afinidad(); // lo declarado en el último test, aparte para poder equilibrarlo
        LocalDateTime ahora = LocalDateTime.now();
        String ultimoTest = historial.stream().filter(i -> sesionTest(i) != null)
                .max(Comparator.comparing(Interaccion::getFecha).thenComparing(Interaccion::getId))
                .map(PerfilService::sesionTest).orElse(null);
        for (Interaccion i : historial) {
            double dias = Math.max(0, Duration.between(i.getFecha(), ahora).toHours() / 24.0);
            double w = i.getTipo().getPeso() * Math.pow(0.5, dias / VIDA_MEDIA_DIAS);

            String sesion = sesionTest(i);
            if (sesion != null) {
                if (!sesion.equals(ultimoTest)) continue; // respuestas de un test anterior
                String dato = i.getValor().substring(PREFIJO_TEST.length() + sesion.length() + 1);
                aplicarRespuestaTest(test, i.getTipo(), dato, w);
                continue;
            }

            Dinosaurio d = i.getDinosaurioId() != null ? porId.get(i.getDinosaurioId()) : null;
            if (d != null) {
                a.sumar(d, w);
                if (i.getTipo() == TipoInteraccion.VISTA) a.vistas.merge(d.getId(), 1, Integer::sum);
            }

            String valor = i.getValor();
            if (valor == null) continue;
            switch (i.getTipo()) {
                case FILTRO -> {
                    String[] kv = valor.split(":", 2);
                    if (kv.length == 2) aplicarFiltro(a, kv[0], kv[1], w);
                }
                case BUSQUEDA, CHAT, INTERES -> {
                    if (i.getTipo() == TipoInteraccion.BUSQUEDA && a.busquedas.size() < 6) a.busquedas.add(valor);
                    if (i.getTipo() == TipoInteraccion.INTERES && a.intereses.size() < 8) a.intereses.add(valor);
                    analizarTexto(a, valor, w, catalogo);
                }
                default -> { }
            }
        }
        mezclarTest(a, test);
        return a;
    }

    /**
     * Suma el último test al perfil escalado para que su rasgo favorito valga el doble que el máximo de la navegación:
     * así lo que el usuario acaba de declarar manda, pero lo que explora después sigue afinando las sugerencias.
     */
    private static void mezclarTest(Afinidad a, Afinidad test) {
        mezclar(a.periodos, test.periodos);
        mezclar(a.dietas, test.dietas);
        mezclar(a.grupos, test.grupos);
        test.terminos.forEach((k, v) -> a.terminos.merge(k, v, Double::sum));
        List<String> intereses = new ArrayList<>(test.intereses); // primero lo del test: son las etiquetas más claras
        intereses.addAll(a.intereses);
        a.intereses.clear();
        intereses.stream().limit(8).forEach(a.intereses::add);
    }

    private static <E extends Enum<E>> void mezclar(Map<E, Double> perfil, Map<E, Double> test) {
        double maxTest = max(test);
        if (maxTest == 0) return;
        double maxPerfil = max(perfil);
        double escala = maxPerfil == 0 ? 1 : 2 * maxPerfil / maxTest;
        test.forEach((k, v) -> perfil.merge(k, v * escala, Double::sum));
    }

    /**
     * FILTRO {@code [peso|]campo:VALOR} (peso 0–1: 1 = rasgo principal de la opción, menos = secundario),
     * INTERES = etiqueta legible, BUSQUEDA = término suave para desempatar (paisaje, región).
     */
    private static void aplicarRespuestaTest(Afinidad a, TipoInteraccion tipo, String valor, double w) {
        switch (tipo) {
            case FILTRO -> {
                double factor = 1.0;
                int barra = valor.indexOf('|');
                if (barra > 0) {
                    try { factor = Math.max(0, Math.min(1, Double.parseDouble(valor.substring(0, barra)))); }
                    catch (NumberFormatException ignorado) { /* peso inválido: se usa 1 */ }
                    valor = valor.substring(barra + 1);
                }
                String[] kv = valor.split(":", 2);
                if (kv.length == 2) aplicarFiltro(a, kv[0], kv[1], w * PESO_TEST * factor);
            }
            case INTERES -> { if (a.intereses.size() < 8) a.intereses.add(valor); }
            case BUSQUEDA -> {
                for (String palabra : normalizar(valor).split("[^a-z0-9]+")) {
                    if (palabra.length() >= 4) a.terminos.merge(palabra, w * 0.5, Double::sum);
                }
            }
            default -> { }
        }
    }

    private static void aplicarFiltro(Afinidad a, String campo, String valor, double w) {
        try {
            switch (campo) {
                case "periodo" -> a.sumar(Periodo.valueOf(valor), w);
                case "dieta" -> a.sumar(Dieta.valueOf(valor), w);
                case "grupo" -> a.sumar(Grupo.valueOf(valor), w);
                default -> { }
            }
        } catch (IllegalArgumentException ignorado) {
            // valor de filtro desconocido: se ignora
        }
    }

    /** Busca nombres de dinosaurios, pistas temáticas y términos libres (p. ej. «argentina», «plumas»). */
    private static void analizarTexto(Afinidad a, String texto, double w, List<Dinosaurio> catalogo) {
        String t = normalizar(texto);
        for (Dinosaurio d : catalogo) {
            String genero = normalizar(d.getNombreCientifico().split(" ")[0]);
            if (t.contains(normalizar(d.getNombre())) || t.contains(genero)) a.sumar(d, w);
        }
        PISTAS.forEach((pista, clave) -> {
            if (t.matches("(?s).*\\b" + pista + ".*")) a.sumar(clave, w * 0.8);
        });
        for (String palabra : t.split("[^a-z0-9]+")) {
            if (palabra.length() >= 5 && !VACIAS.contains(palabra) && !palabra.startsWith("dinosaur")) {
                a.terminos.merge(palabra, w, Double::sum);
            }
        }
    }

    private List<DinosaurioResumen> recomendar(Afinidad a, List<Dinosaurio> catalogo, Long excluirId, int limite,
                                               Usuario usuario, String visitanteId) {
        int n = Math.max(1, Math.min(limite, 12));
        // Desempate estable durante el día para cada visitante (no cambia en cada recarga)
        long semilla = Objects.hash(usuario != null ? usuario.getId() : null, visitanteId, LocalDate.now());
        Random azar = new Random(semilla);

        double maxP = max(a.periodos), maxD = max(a.dietas), maxG = max(a.grupos);
        boolean sinPerfil = maxP == 0 && maxD == 0 && maxG == 0 && a.terminos.isEmpty();

        record Candidato(Dinosaurio d, double puntos, String motivo) {}
        List<Candidato> candidatos = new ArrayList<>();

        for (Dinosaurio d : catalogo) {
            if (d.getId().equals(excluirId)) continue;
            double sp = maxP == 0 ? 0 : a.periodos.getOrDefault(d.getPeriodo(), 0.0) / maxP;
            double sd = maxD == 0 ? 0 : a.dietas.getOrDefault(d.getDieta(), 0.0) / maxD;
            double sg = (maxG == 0 || d.getGrupo() == null) ? 0 : a.grupos.getOrDefault(d.getGrupo(), 0.0) / maxG;

            String texto = textoBuscable(d);
            String mejorTermino = null;
            double st = 0, mejor = 0;
            for (var e : a.terminos.entrySet()) {
                if (texto.contains(e.getKey())) {
                    st += e.getValue();
                    if (e.getValue() > mejor) { mejor = e.getValue(); mejorTermino = e.getKey(); }
                }
            }
            st = Math.min(1.0, st / 6.0);

            double cp = 1.0 * sp, cd = 0.9 * sd, cg = 1.2 * sg, ct = 0.9 * st;
            double puntos = cp + cd + cg + ct + azar.nextDouble() * 0.08;
            if (a.vistas.containsKey(d.getId())) puntos *= 0.3; // priorizar lo que aún no conoce

            String motivo;
            if (sinPerfil) motivo = "Para empezar a explorar";
            else if (a.vistas.containsKey(d.getId())) motivo = "Uno de tus favoritos";
            else if (cg >= cp && cg >= cd && cg >= ct && cg > 0)
                motivo = "Porque te atrae el grupo «" + d.getGrupo().getNombre() + "»";
            else if (ct >= cp && ct >= cd && ct > 0)
                motivo = "Relacionado con lo que buscaste («" + mejorTermino + "»)";
            else if (cp >= cd && cp > 0) motivo = "Porque te interesa el " + d.getPeriodo().getNombre();
            else if (cd > 0) motivo = "Porque te interesan los " + d.getDieta().getNombre().toLowerCase() + "s";
            else motivo = "Para descubrir algo distinto";
            candidatos.add(new Candidato(d, puntos, motivo));
        }

        candidatos.sort(Comparator.comparingDouble(Candidato::puntos).reversed());

        // Sin perfil: variedad (un dinosaurio por grupo antes de repetir)
        if (sinPerfil) {
            List<Candidato> variados = new ArrayList<>();
            Set<Object> gruposUsados = new HashSet<>();
            for (Candidato c : candidatos) if (gruposUsados.add(c.d().getGrupo())) variados.add(c);
            for (Candidato c : candidatos) if (!variados.contains(c)) variados.add(c);
            candidatos = variados;
        }
        return candidatos.stream().limit(n).map(c -> DinosaurioResumen.de(c.d(), c.motivo())).toList();
    }

    private static List<String> etiquetas(Afinidad a) {
        List<String> r = new ArrayList<>();
        top(a.periodos, 2).forEach(p -> r.add(p.getNombre()));
        top(a.dietas, 1).forEach(d -> r.add(d.getNombre() + "s"));
        top(a.grupos, 2).forEach(g -> r.add(g.getNombre()));
        a.intereses.stream().limit(2).forEach(r::add);
        return r;
    }

    private static String resumen(Afinidad a, Map<Long, Dinosaurio> porId, List<DinosaurioResumen> recs, int total) {
        if (total == 0) {
            return "Visitante nuevo: todavía no hay actividad registrada. Ayúdale a descubrir qué le gusta "
                    + "(puedes preguntarle si prefiere grandes depredadores, gigantes de cuello largo, acorazados…).";
        }
        StringBuilder sb = new StringBuilder();
        sb.append("Interacciones registradas: ").append(total).append(".\n");
        linea(sb, "Afinidad por periodo", a.periodos, Periodo::getNombre);
        linea(sb, "Afinidad por dieta", a.dietas, Dieta::getNombre);
        linea(sb, "Afinidad por grupo", a.grupos, Grupo::getNombre);
        if (!a.vistas.isEmpty()) {
            sb.append("Fichas que más ha visitado: ").append(a.vistas.entrySet().stream()
                    .sorted(Map.Entry.<Long, Integer>comparingByValue().reversed()).limit(5)
                    .filter(e -> porId.containsKey(e.getKey()))
                    .map(e -> porId.get(e.getKey()).getNombre() + " (" + e.getValue() + ")")
                    .collect(Collectors.joining(", "))).append(".\n");
        }
        if (!a.busquedas.isEmpty()) {
            sb.append("Búsquedas recientes: ").append(a.busquedas.stream().map(s -> "«" + s + "»")
                    .collect(Collectors.joining(", "))).append(".\n");
        }
        if (!a.intereses.isEmpty()) {
            sb.append("Intereses que ha expresado antes en el chat: ").append(a.intereses.stream()
                    .map(s -> "«" + s + "»").collect(Collectors.joining(", "))).append(".\n");
        }
        if (!recs.isEmpty()) {
            sb.append("Sugerencias calculadas para él/ella: ").append(recs.stream()
                    .map(r -> r.nombre() + " [id " + r.id() + "] — " + r.motivo())
                    .collect(Collectors.joining("; "))).append(".");
        }
        return sb.toString();
    }

    /* ------------------------------ utilidades ------------------------------ */

    private static <E extends Enum<E>> void linea(StringBuilder sb, String titulo, Map<E, Double> mapa,
                                                  Function<E, String> nombre) {
        double total = mapa.values().stream().mapToDouble(Double::doubleValue).sum();
        if (total <= 0) return;
        sb.append(titulo).append(": ").append(mapa.entrySet().stream()
                .sorted(Map.Entry.<E, Double>comparingByValue().reversed()).limit(4)
                .map(e -> nombre.apply(e.getKey()) + " " + Math.round(100 * e.getValue() / total) + "%")
                .collect(Collectors.joining(", "))).append(".\n");
    }

    private static <E extends Enum<E>> List<E> top(Map<E, Double> mapa, int n) {
        double total = mapa.values().stream().mapToDouble(Double::doubleValue).sum();
        return mapa.entrySet().stream()
                .filter(e -> e.getValue() / total >= 0.25)
                .sorted(Map.Entry.<E, Double>comparingByValue().reversed())
                .limit(n).map(Map.Entry::getKey).toList();
    }

    private static double max(Map<?, Double> mapa) {
        return mapa.values().stream().mapToDouble(Double::doubleValue).max().orElse(0);
    }

    private static String textoBuscable(Dinosaurio d) {
        StringBuilder sb = new StringBuilder();
        sb.append(d.getNombre()).append(' ').append(d.getNombreCientifico()).append(' ')
                .append(Objects.toString(d.getRegionDescubrimiento(), "")).append(' ')
                .append(Objects.toString(d.getHabitat(), "")).append(' ')
                .append(d.getDescripcion()).append(' ');
        d.getCaracteristicas().forEach(c -> sb.append(c.getNombre()).append(' ').append(c.getValor()).append(' '));
        d.getCuriosidades().forEach(c -> sb.append(c).append(' '));
        return normalizar(sb.toString());
    }

    static String normalizar(String s) {
        return Normalizer.normalize(s.toLowerCase(Locale.ROOT), Normalizer.Form.NFD).replaceAll("\\p{M}", "");
    }
}
