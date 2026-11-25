package com.paleo.glosario.config;

import com.paleo.glosario.model.*;
import com.paleo.glosario.repository.DinosaurioRepository;
import com.paleo.glosario.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

import static com.paleo.glosario.model.Dieta.*;
import static com.paleo.glosario.model.Grupo.*;
import static com.paleo.glosario.model.Periodo.*;

/**
 * Carga datos iniciales: dos cuentas de demostración y un catálogo de dinosaurios.
 *
 * <p>Las imágenes de los dinosaurios nuevos no se guardan aquí: el frontend las trae de Wikipedia / Wikimedia
 * Commons a partir de {@code wikipediaTitulo}. Si la base ya tenía el catálogo antiguo (sin grupos), se completa
 * con los dinosaurios y datos nuevos una sola vez, sin tocar lo que hayan creado los paleontólogos.
 */
@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);
    private static final String WIKI = "https://commons.wikimedia.org/wiki/Special:FilePath/";

    private final UsuarioRepository usuarios;
    private final DinosaurioRepository dinos;
    private final PasswordEncoder encoder;
    private final boolean habilitado;

    public DataSeeder(UsuarioRepository usuarios, DinosaurioRepository dinos, PasswordEncoder encoder,
                      @Value("${app.seed.enabled:true}") boolean habilitado) {
        this.usuarios = usuarios;
        this.dinos = dinos;
        this.encoder = encoder;
        this.habilitado = habilitado;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (!habilitado) return;

        if (usuarios.count() == 0) crearCuentas();
        Usuario autor = usuarios.findByEmailIgnoreCase("paleo@dinoglosario.com")
                .orElseGet(() -> usuarios.findAll().stream().filter(u -> u.getRol() == Rol.PALEONTOLOGO)
                        .findFirst().orElse(null));

        // Si algún dinosaurio ya tiene grupo, el catálogo ampliado ya se cargó antes: no se repite
        // (así no reaparecen los que un paleontólogo haya borrado a propósito).
        boolean catalogoAmpliado = dinos.findAll().stream().anyMatch(d -> d.getGrupo() != null);
        if (catalogoAmpliado) return;

        int nuevos = 0, completados = 0;
        for (Semilla s : catalogo()) {
            var existente = dinos.findByNombreIgnoreCase(s.nombre);
            if (existente.isPresent()) {
                completar(existente.get(), s);
                completados++;
            } else {
                Dinosaurio d = new Dinosaurio();
                d.setNombre(s.nombre);
                d.setNombreCientifico(s.cientifico);
                d.setSignificadoNombre(s.significado);
                d.setPeriodo(s.periodo);
                d.setDieta(s.dieta);
                d.setLongitudMetros(s.largo);
                d.setAlturaMetros(s.alto);
                d.setPesoToneladas(s.peso);
                d.setRegionDescubrimiento(s.region);
                d.setAnioDescubrimiento(s.anio);
                d.setDescubridor(s.descubridor);
                d.setDescripcion(s.descripcion);
                d.setCaracteristicas(s.caracteristicas);
                d.setImagenes(s.imagenes);
                completar(d, s);
                d.setRegistradoPor(autor);
                d.setActualizadoPor(autor);
                nuevos++;
            }
        }
        log.info("🦕 Catálogo de ejemplo: {} dinosaurios nuevos, {} completados. Paleontólogo: paleo@dinoglosario.com / Paleo2026",
                nuevos, completados);
    }

    private void completar(Dinosaurio d, Semilla s) {
        d.setGrupo(s.grupo);
        d.setHabitat(s.habitat);
        d.setVelocidadKmh(s.velocidad);
        d.setCuriosidades(s.curiosidades);
        d.setWikipediaTitulo(s.wiki);
        dinos.save(d);
    }

    private void crearCuentas() {
        Usuario paleo = new Usuario();
        paleo.setNombre("Dra. Ana Fósil");
        paleo.setEmail("paleo@dinoglosario.com");
        paleo.setPassword(encoder.encode("Paleo2026"));
        paleo.setRol(Rol.PALEONTOLOGO);
        paleo.setInstitucion("Museo de Historia Natural");
        paleo.setEspecialidad("Saurópodos del Jurásico");
        usuarios.save(paleo);

        Usuario visitante = new Usuario();
        visitante.setNombre("Visitante Curioso");
        visitante.setEmail("usuario@dinoglosario.com");
        visitante.setPassword(encoder.encode("Usuario2026"));
        visitante.setRol(Rol.USUARIO);
        usuarios.save(visitante);
    }

    /* =========================== Catálogo =========================== */

    private static final class Semilla {
        String nombre, cientifico, significado, region, descubridor, descripcion, habitat, wiki;
        Periodo periodo;
        Dieta dieta;
        Grupo grupo;
        Double largo, alto, peso, velocidad;
        Integer anio;
        List<Caracteristica> caracteristicas = new ArrayList<>();
        List<String> curiosidades = new ArrayList<>();
        List<ImagenReferencia> imagenes = new ArrayList<>();

        Semilla carac(String nombre, String valor) { caracteristicas.add(new Caracteristica(nombre, valor)); return this; }
        Semilla dato(String texto) { curiosidades.add(texto); return this; }
        Semilla foto(String archivo) { imagenes.add(new ImagenReferencia(WIKI + archivo, "Reconstrucción en vida")); return this; }
    }

    private static Semilla dino(String nombre, String cientifico, String significado, Periodo periodo, Dieta dieta,
                                Grupo grupo, double largo, double alto, double peso, Double velocidad,
                                String region, int anio, String descubridor, String habitat, String descripcion) {
        Semilla s = new Semilla();
        s.nombre = nombre; s.cientifico = cientifico; s.significado = significado; s.periodo = periodo;
        s.dieta = dieta; s.grupo = grupo; s.largo = largo; s.alto = alto; s.peso = peso; s.velocidad = velocidad;
        s.region = region; s.anio = anio; s.descubridor = descubridor; s.habitat = habitat;
        s.descripcion = descripcion; s.wiki = cientifico.split(" ")[0];
        return s;
    }

    private static List<Semilla> catalogo() {
        return List.of(
                // ---------------- Terópodos ----------------
                dino("Tiranosaurio", "Tyrannosaurus rex", "Rey de los lagartos tiranos", CRETACICO, CARNIVORO, TEROPODO,
                        12.3, 4.0, 8.4, 27.0, "Montana, Estados Unidos", 1905, "Henry Fairfield Osborn",
                        "Llanuras costeras boscosas y templadas del oeste de Norteamérica",
                        "Uno de los mayores depredadores terrestres de todos los tiempos. Poseía un cráneo masivo de hasta 1.5 m, "
                                + "dientes aserrados del tamaño de un plátano y la mordida más potente conocida en un animal terrestre. "
                                + "Sus brazos eran cortos pero musculosos y su visión binocular le permitía calcular distancias con precisión.")
                        .carac("Fuerza de mordida", "Aprox. 35 000 newtons").carac("Dientes", "Hasta 60 dientes aserrados de 30 cm")
                        .carac("Locomoción", "Bípedo")
                        .dato("Su olfato era excepcional: los lóbulos olfativos de su cerebro eran enormes.")
                        .dato("«Sue», el ejemplar más completo, está en el Museo Field de Chicago y tiene un 90 % del esqueleto.")
                        .dato("Probablemente no podía correr de verdad: un adulto caminaba rápido, pero sin fase de vuelo.")
                        .foto("Tyrannosaurus_rex_mmartyniuk.png"),

                dino("Alosaurio", "Allosaurus fragilis", "Lagarto diferente", JURASICO, CARNIVORO, TEROPODO,
                        9.5, 3.5, 2.3, 32.0, "Colorado, Estados Unidos", 1877, "Othniel Charles Marsh",
                        "Llanuras semiáridas con ríos estacionales (Formación Morrison)",
                        "El gran depredador del Jurásico norteamericano. Tenía un cráneo ligero con crestas sobre los ojos y "
                                + "mandíbulas que podían abrirse muchísimo; se cree que atacaba como con un hacha, golpeando con la "
                                + "mandíbula superior. Convivió con Estegosaurios, Diplodocus y Apatosaurios.")
                        .carac("Crestas", "Pequeñas crestas óseas sobre los ojos").carac("Brazos", "Tres dedos con garras de hasta 25 cm")
                        .carac("Locomoción", "Bípedo")
                        .dato("Se han encontrado vértebras de Alosaurio perforadas por las púas de la cola de un Estegosaurio.")
                        .dato("«Big Al» tenía al menos 19 lesiones e infecciones óseas: la vida de depredador era dura."),

                dino("Giganotosaurio", "Giganotosaurus carolinii", "Lagarto gigante del sur", CRETACICO, CARNIVORO, TEROPODO,
                        12.5, 4.0, 7.0, 40.0, "Neuquén, Argentina", 1993, "Rubén D. Carolini",
                        "Llanuras fluviales y bosques de la Patagonia",
                        "Uno de los terópodos más grandes que existieron, rival en tamaño del Tiranosaurio aunque vivió unos "
                                + "30 millones de años antes y en otro continente. Su cráneo era largo y sus dientes, finos como cuchillas, "
                                + "estaban hechos para cortar carne más que para triturar hueso.")
                        .carac("Cráneo", "Unos 1.6 m de largo").carac("Dientes", "Aplanados y aserrados, como cuchillas")
                        .carac("Cerebro", "Del tamaño y forma de un plátano")
                        .dato("Lo descubrió en 1993 Rubén Carolini, un mecánico aficionado a buscar fósiles.")
                        .dato("Pudo haber cazado saurópodos gigantes como el Argentinosaurio."),

                dino("Carnotauro", "Carnotaurus sastrei", "Toro carnívoro", CRETACICO, CARNIVORO, TEROPODO,
                        8.0, 3.0, 1.35, 48.0, "Chubut, Argentina", 1984, "José Bonaparte",
                        "Llanuras costeras y estuarios de la Patagonia",
                        "Terópodo inconfundible por los dos cuernos sobre sus ojos, como un toro. Tenía los brazos más reducidos "
                                + "de cualquier gran depredador, más aún que el Tiranosaurio, pero sus patas largas y su cola musculosa lo "
                                + "convertían posiblemente en uno de los terópodos grandes más rápidos.")
                        .carac("Cuernos", "Dos cuernos gruesos sobre los ojos").carac("Piel", "Escamas con hileras de protuberancias cónicas")
                        .carac("Brazos", "Diminutos, casi sin antebrazo")
                        .dato("Es uno de los pocos dinosaurios del que se conservan grandes impresiones de piel.")
                        .dato("Sus cuernos pudieron servir para combates entre machos o para exhibirse."),

                dino("Dilofosaurio", "Dilophosaurus wetherilli", "Lagarto de dos crestas", JURASICO, CARNIVORO, TEROPODO,
                        7.0, 2.4, 0.4, 30.0, "Arizona, Estados Unidos", 1942, "Jesse Williams y Samuel P. Welles",
                        "Llanuras con ríos y dunas del Jurásico temprano",
                        "Uno de los primeros grandes depredadores del Jurásico. Lucía dos crestas finas y paralelas sobre el cráneo, "
                                + "probablemente para exhibición. Era un cazador ágil y esbelto, más grande de lo que muestran las películas.")
                        .carac("Crestas", "Dos crestas óseas delgadas en forma de media luna").carac("Hocico", "Con una muesca entre los dientes delanteros")
                        .carac("Locomoción", "Bípedo")
                        .dato("No hay pruebas de que escupiera veneno ni de que tuviera una gola desplegable: eso es ficción de cine.")
                        .dato("Medía unos 7 m, mucho más que la versión pequeña que aparece en el cine."),

                dino("Herrerasaurio", "Herrerasaurus ischigualastensis", "Lagarto de Herrera", TRIASICO, CARNIVORO, TEROPODO,
                        4.5, 1.1, 0.25, 30.0, "San Juan, Argentina", 1959, "Victorino Herrera",
                        "Valles fluviales con vegetación de helechos y coníferas (Ischigualasto)",
                        "Uno de los dinosaurios más antiguos conocidos, de hace unos 231 millones de años. Era un depredador bípedo "
                                + "de mandíbulas flexibles que le ayudaban a sujetar presas. En su época, los dinosaurios aún eran pocos y "
                                + "compartían el terreno con grandes reptiles parientes de los cocodrilos.")
                        .carac("Mandíbula", "Articulación flexible para sujetar presas").carac("Manos", "Tres dedos largos con garras")
                        .carac("Antigüedad", "Unos 231 millones de años")
                        .dato("Lo encontró un pastor de cabras de la zona, Victorino Herrera, que le dio nombre.")
                        .dato("El Valle de la Luna (Ischigualasto) es Patrimonio de la Humanidad por sus fósiles triásicos."),

                dino("Celofisis", "Coelophysis bauri", "Forma hueca", TRIASICO, CARNIVORO, TEROPODO,
                        3.0, 1.0, 0.02, 35.0, "Nuevo México, Estados Unidos", 1881, "David Baldwin",
                        "Llanuras áridas con ríos estacionales",
                        "Pequeño y esbelto cazador del Triásico, de huesos huecos y muy ligeros (de ahí su nombre). Probablemente "
                                + "cazaba lagartos, peces y pequeños animales. En Ghost Ranch se han hallado cientos de esqueletos juntos.")
                        .carac("Huesos", "Huecos y ligeros, como los de las aves").carac("Cuello", "Largo y flexible en forma de S")
                        .carac("Dientes", "Pequeños y aserrados")
                        .dato("En 1998 un cráneo de Celofisis viajó al espacio en el transbordador Endeavour.")
                        .dato("Es el fósil estatal de Nuevo México."),

                dino("Compsognato", "Compsognathus longipes", "Mandíbula elegante", JURASICO, CARNIVORO, TEROPODO,
                        1.0, 0.3, 0.003, 40.0, "Baviera, Alemania", 1859, "Johann A. Wagner",
                        "Islas tropicales áridas del archipiélago europeo jurásico",
                        "Uno de los dinosaurios más pequeños conocidos, del tamaño de un pavo. Era un cazador veloz de pequeños "
                                + "lagartos e insectos. Durante más de un siglo fue el dinosaurio más pequeño que se conocía.")
                        .carac("Tamaño", "Como un pavo").carac("Contenido estomacal", "Un lagarto completo en su interior")
                        .carac("Manos", "Dos dedos funcionales")
                        .dato("Uno de los esqueletos se conserva con su última comida: un lagarto Bavarisaurus.")
                        .dato("Vivía en las mismas lagunas que el Archaeopteryx."),

                // ---------------- Dromeosáuridos ----------------
                dino("Velocirraptor", "Velociraptor mongoliensis", "Ladrón veloz", CRETACICO, CARNIVORO, DROMEOSAURIO,
                        2.0, 0.5, 0.015, 40.0, "Desierto de Gobi, Mongolia", 1924, "Henry Fairfield Osborn",
                        "Desiertos y dunas de arena con oasis estacionales",
                        "Pequeño dromeosáurido emplumado del tamaño de un pavo. Poseía una garra en forma de hoz en cada pie "
                                + "que usaba para inmovilizar a sus presas. Las marcas de inserción de plumas en sus brazos confirman "
                                + "que estaba cubierto de plumas.")
                        .carac("Garra", "Garra retráctil en forma de hoz de 6.5 cm").carac("Plumaje", "Cubierto de plumas")
                        .carac("Inteligencia", "Cerebro grande en proporción a su cuerpo")
                        .dato("El fósil de los «dinosaurios peleando» muestra a un Velocirraptor trabado con un Protoceratops.")
                        .dato("Los raptores del cine están basados en realidad en el Deinonico, mucho más grande.")
                        .foto("Velociraptor_dinoguy2.jpg"),

                dino("Deinonico", "Deinonychus antirrhopus", "Garra terrible", CRETACICO, CARNIVORO, DROMEOSAURIO,
                        3.4, 0.9, 0.075, 40.0, "Montana, Estados Unidos", 1964, "John Ostrom",
                        "Llanuras de inundación y bosques húmedos",
                        "Dromeosáurido de tamaño medio cuyo descubrimiento cambió la paleontología: demostró que los dinosaurios "
                                + "podían ser animales activos y ágiles, emparentados con las aves. Tenía una garra en hoz de 13 cm.")
                        .carac("Garra", "Garra en hoz de unos 13 cm").carac("Cola", "Rígida, reforzada con varillas óseas para equilibrio")
                        .carac("Plumaje", "Probablemente cubierto de plumas")
                        .dato("Inspiró el «Renacimiento de los dinosaurios» de los años 60 y 70.")
                        .dato("Sus fósiles aparecen junto a herbívoros mucho mayores, lo que sugiere caza en grupo o carroñeo."),

                dino("Utahraptor", "Utahraptor ostrommaysi", "Ladrón de Utah", CRETACICO, CARNIVORO, DROMEOSAURIO,
                        6.0, 1.8, 0.5, 30.0, "Utah, Estados Unidos", 1991, "Carl Limoni y James Kirkland",
                        "Llanuras semiáridas con ríos y lagos",
                        "El mayor dromeosáurido conocido, un «raptor» del tamaño de un oso polar. Robusto y musculoso, tenía una "
                                + "garra en hoz de más de 20 cm y probablemente cazaba presas grandes como iguanodontes.")
                        .carac("Garra", "Garra en hoz de 22–24 cm").carac("Constitución", "Robusta, patas gruesas")
                        .carac("Plumaje", "Probablemente emplumado")
                        .dato("Un bloque de arenisca de Utah contiene varios Utahraptor de distintas edades atrapados en arenas movedizas.")
                        .dato("Su nombre de especie honra a John Ostrom y al artista Chris Mays."),

                dino("Microraptor", "Microraptor gui", "Pequeño ladrón", CRETACICO, CARNIVORO, DROMEOSAURIO,
                        0.8, 0.3, 0.001, null, "Liaoning, China", 2003, "Xu Xing",
                        "Bosques templados con lagos volcánicos",
                        "Diminuto dromeosáurido con plumas largas en brazos y piernas: tenía «cuatro alas» y podía planear entre "
                                + "los árboles. Gracias a la conservación excepcional se sabe que su plumaje era negro iridiscente, "
                                + "como el de un cuervo.")
                        .carac("Alas", "Cuatro: plumas de vuelo en brazos y piernas").carac("Color", "Negro con reflejos iridiscentes")
                        .carac("Peso", "Alrededor de 1 kg")
                        .dato("Se han encontrado restos de peces, aves y mamíferos en su estómago: era un cazador oportunista.")
                        .dato("Es una pieza clave para entender el origen del vuelo en las aves."),

                // ---------------- Espinosáuridos ----------------
                dino("Espinosaurio", "Spinosaurus aegyptiacus", "Lagarto espinoso de Egipto", CRETACICO, PISCIVORO, ESPINOSAURIDO,
                        15.0, 5.0, 7.4, null, "Egipto y Marruecos", 1915, "Ernst Stromer",
                        "Grandes sistemas fluviales y manglares del norte de África",
                        "El dinosaurio carnívoro más largo conocido. Tenía un hocico alargado parecido al de un cocodrilo, "
                                + "una gran vela dorsal sostenida por espinas neurales y una cola en forma de remo que sugiere un "
                                + "estilo de vida semiacuático especializado en la pesca.")
                        .carac("Vela dorsal", "Espinas neurales de hasta 1.65 m").carac("Hábitat", "Semiacuático, ríos del norte de África")
                        .carac("Hocico", "Alargado, con dientes cónicos")
                        .dato("El fósil original se destruyó en un bombardeo sobre Múnich en 1944; solo quedaron dibujos y fotos.")
                        .dato("Sus huesos eran densos, como los de pingüinos o hipopótamos, lo que ayuda a sumergirse.")
                        .foto("Spinosaurus_aegyptiacus.png"),

                dino("Barionix", "Baryonyx walkeri", "Garra pesada", CRETACICO, PISCIVORO, ESPINOSAURIDO,
                        9.0, 2.5, 1.5, null, "Surrey, Inglaterra", 1983, "William Walker",
                        "Llanuras pantanosas con ríos y lagunas",
                        "Espinosáurido de hocico estrecho como el de un cocodrilo y una enorme garra de 31 cm en el pulgar, "
                                + "probablemente para pescar. Fue la primera prueba clara de un dinosaurio que comía peces.")
                        .carac("Garra del pulgar", "Unos 31 cm").carac("Dientes", "Más de 90, finos y cónicos")
                        .carac("Hocico", "Largo y estrecho, como el de un gavial")
                        .dato("Lo descubrió un fontanero aficionado, William Walker, que encontró la garra en una cantera de arcilla.")
                        .dato("En su estómago había escamas del pez Scheenstia y huesos de un iguanodonte joven."),

                // ---------------- Ornitomímidos ----------------
                dino("Galimimo", "Gallimimus bullatus", "Imitador de gallina", CRETACICO, OMNIVORO, ORNITOMIMIDO,
                        6.0, 1.9, 0.44, 50.0, "Desierto de Gobi, Mongolia", 1963, "Expedición polaco-mongola",
                        "Llanuras con ríos y zonas semiáridas",
                        "El ornitomímido más grande conocido, con aspecto de avestruz gigante: cuello largo, cabeza pequeña con pico "
                                + "sin dientes y patas largas de corredor. Probablemente comía plantas, insectos y pequeños animales.")
                        .carac("Pico", "Sin dientes, con láminas córneas").carac("Patas", "Largas y esbeltas, de corredor")
                        .carac("Ojos", "Grandes, a los lados de la cabeza")
                        .dato("Fue descrito en 1972 por la paleontóloga polaca Halszka Osmólska y sus colegas.")
                        .dato("Pudo alcanzar unos 50 km/h, como un caballo al galope."),

                // ---------------- Sauropodomorfos ----------------
                dino("Plateosaurio", "Plateosaurus engelhardti", "Lagarto plano", TRIASICO, HERBIVORO, PROSAUROPODO,
                        7.5, 2.5, 1.0, null, "Baviera, Alemania", 1834, "Johann Friedrich Engelhardt",
                        "Llanuras áridas y estacionales de Pangea",
                        "Uno de los primeros dinosaurios grandes, antepasado lejano de los saurópodos. Caminaba sobre dos patas, "
                                + "tenía cuello largo y manos con un gran pulgar en garra. Es uno de los dinosaurios mejor conocidos "
                                + "gracias a decenas de esqueletos completos.")
                        .carac("Postura", "Bípedo, no podía apoyar las palmas de las manos").carac("Pulgar", "Con una gran garra curva")
                        .carac("Cuello", "Largo, con 10 vértebras")
                        .dato("Se han encontrado más de 100 esqueletos, muchos atrapados en barro.")
                        .dato("Su crecimiento dependía del ambiente: adultos del mismo tamaño podían tener edades muy distintas."),

                dino("Braquiosaurio", "Brachiosaurus altithorax", "Lagarto brazo", JURASICO, HERBIVORO, SAUROPODO,
                        22.0, 12.0, 40.0, 15.0, "Colorado, Estados Unidos", 1903, "Elmer S. Riggs",
                        "Llanuras con bosques de coníferas, helechos arborescentes y ginkgos",
                        "Saurópodo gigantesco cuyas patas delanteras eran más largas que las traseras, lo que le daba una postura "
                                + "inclinada similar a la de una jirafa. Su largo cuello le permitía alimentarse de las copas de "
                                + "coníferas y helechos arborescentes inalcanzables para otros herbívoros.")
                        .carac("Cuello", "Hasta 9 m de largo").carac("Postura", "Patas delanteras más largas que las traseras")
                        .carac("Locomoción", "Cuadrúpedo")
                        .dato("Podía comer unos 200 kg de plantas al día.")
                        .dato("Sus fosas nasales estaban en lo alto del hocico, no en la coronilla como se pensó durante décadas.")
                        .foto("Brachiosaurus_DB.jpg"),

                dino("Diplodocus", "Diplodocus carnegii", "Doble viga", JURASICO, HERBIVORO, SAUROPODO,
                        25.0, 5.0, 15.0, 15.0, "Wyoming, Estados Unidos", 1899, "Expedición del Museo Carnegie",
                        "Llanuras semiáridas con ríos y bosques de galería (Formación Morrison)",
                        "Saurópodo larguísimo y relativamente ligero, con un cuello horizontal y una cola en forma de látigo de "
                                + "unos 14 m. Arrancaba hojas con sus dientes en forma de lápiz, como un rastrillo.")
                        .carac("Cola", "Unas 80 vértebras, terminaba en látigo").carac("Dientes", "Finos, como lápices, solo en la parte delantera")
                        .carac("Cuello", "Unos 6 m, más horizontal que vertical")
                        .dato("Andrew Carnegie regaló réplicas de «Dippy» a museos de todo el mundo, incluido el de La Plata en Argentina.")
                        .dato("Su cola podría haber restallado como un látigo produciendo un fuerte chasquido."),

                dino("Apatosaurio", "Apatosaurus ajax", "Lagarto engañoso", JURASICO, HERBIVORO, SAUROPODO,
                        22.0, 4.5, 20.0, 12.0, "Colorado, Estados Unidos", 1877, "Othniel Charles Marsh",
                        "Llanuras con ríos estacionales y bosques abiertos",
                        "Saurópodo robusto de cuello grueso y fuerte, más pesado que su pariente Diplodocus. Durante décadas se "
                                + "le confundió con el «Brontosaurio», hasta que estudios recientes devolvieron a este su propio género.")
                        .carac("Cuello", "Muy grueso y profundo").carac("Cola", "Larga, terminada en látigo")
                        .carac("Patas", "Columnas gruesas como pilares")
                        .dato("Durante un siglo se exhibió con el cráneo equivocado (de un Camarasaurio).")
                        .dato("Su cuello pudo usarse en combates, empujándose como hacen las jirafas."),

                dino("Argentinosaurio", "Argentinosaurus huinculensis", "Lagarto de Argentina", CRETACICO, HERBIVORO, SAUROPODO,
                        35.0, 7.0, 70.0, 8.0, "Neuquén, Argentina", 1987, "Guillermo Heredia",
                        "Llanuras con bosques de coníferas de la Patagonia",
                        "Candidato a animal terrestre más grande de todos los tiempos. Solo se conocen algunas vértebras, costillas "
                                + "y un fémur, pero bastan para estimar unos 35 m de largo y entre 60 y 75 toneladas.")
                        .carac("Vértebras", "Más de 1.5 m de alto cada una").carac("Huevos", "Del tamaño de un balón de rugby")
                        .carac("Crecimiento", "Pasaba de 5 kg al nacer a más de 60 toneladas")
                        .dato("El primer hueso lo halló un ganadero, Guillermo Heredia, que creyó que era madera petrificada.")
                        .dato("Un adulto tardaba entre 15 y 40 años en alcanzar su tamaño máximo."),

                // ---------------- Tireóforos ----------------
                dino("Estegosaurio", "Stegosaurus stenops", "Lagarto con tejado", JURASICO, HERBIVORO, ESTEGOSAURIO,
                        9.0, 4.0, 5.0, 7.0, "Colorado, Estados Unidos", 1877, "Othniel Charles Marsh",
                        "Llanuras con helechos, cícadas y coníferas bajas",
                        "Herbívoro cuadrúpedo reconocible por la doble hilera de placas óseas en su espalda y las cuatro púas "
                                + "de su cola, llamadas «thagomizer», que usaba para defenderse de depredadores como el Alosaurio.")
                        .carac("Placas dorsales", "17 placas óseas alternas").carac("Cola", "Cuatro púas de hasta 90 cm")
                        .carac("Cerebro", "Del tamaño de una nuez")
                        .dato("El nombre «thagomizer» viene de una tira cómica de Gary Larson y los paleontólogos lo adoptaron.")
                        .dato("Sus placas tenían vasos sanguíneos: pudieron servir para exhibirse o regular la temperatura.")
                        .foto("Stegosaurus_BW.jpg"),

                dino("Kentrosaurio", "Kentrosaurus aethiopicus", "Lagarto puntiagudo", JURASICO, HERBIVORO, ESTEGOSAURIO,
                        4.5, 1.5, 1.0, 8.0, "Tendaguru, Tanzania", 1909, "Expedición alemana de Tendaguru",
                        "Llanuras costeras tropicales con estaciones secas",
                        "Pariente africano y más pequeño del Estegosaurio. Tenía placas en el cuello y la espalda que se convertían "
                                + "en largas púas hacia la cola, además de un par de púas en los hombros.")
                        .carac("Púas", "Hasta 7 pares en cadera y cola").carac("Púa del hombro", "Larga, apuntando hacia atrás")
                        .carac("Cola", "Muy flexible, podía barrer 180°")
                        .dato("Simulaciones por ordenador muestran que su cola podía golpear a más de 40 km/h.")
                        .dato("Muchos de sus fósiles se perdieron en la Segunda Guerra Mundial."),

                dino("Anquilosaurio", "Ankylosaurus magniventris", "Lagarto fusionado", CRETACICO, HERBIVORO, ANQUILOSAURIO,
                        8.0, 1.7, 6.0, 10.0, "Montana, Estados Unidos", 1906, "Barnum Brown",
                        "Llanuras costeras boscosas del oeste de Norteamérica",
                        "Un auténtico tanque viviente: estaba cubierto de placas óseas incrustadas en la piel (osteodermos) y "
                                + "terminaba en un mazo óseo en la cola capaz de romper huesos. Hasta sus párpados estaban acorazados.")
                        .carac("Armadura", "Osteodermos fusionados por todo el cuerpo").carac("Mazo de la cola", "Hasta 60 cm de ancho")
                        .carac("Cuernos", "Cuatro cuernos piramidales en el cráneo")
                        .dato("Convivió con el Tiranosaurio en sus últimos días antes de la extinción.")
                        .dato("Su vientre era ancho para digerir grandes cantidades de plantas por fermentación."),

                // ---------------- Marginocéfalos ----------------
                dino("Tricerátops", "Triceratops horridus", "Cara con tres cuernos", CRETACICO, HERBIVORO, CERATOPSIO,
                        9.0, 3.0, 9.0, 25.0, "Dakota del Sur, Estados Unidos", 1889, "Othniel Charles Marsh",
                        "Llanuras costeras con helechos, palmeras y plantas con flores",
                        "Ceratópsido robusto famoso por sus tres cuernos faciales y su enorme gola ósea. Convivió con el "
                                + "Tiranosaurio y se han encontrado fósiles con marcas de mordidas que sugieren enfrentamientos entre ambos.")
                        .carac("Cuernos", "Dos supraorbitales de 1 m y uno nasal").carac("Gola", "Escudo óseo sólido de hasta 2 m")
                        .carac("Pico", "Pico córneo similar al de un loro")
                        .dato("Su cráneo es uno de los más grandes de cualquier animal terrestre: hasta 2.5 m.")
                        .dato("Marsh creyó al principio que sus cuernos eran de un bisonte gigante.")
                        .foto("Triceratops_liveDB.jpg"),

                dino("Estiracosaurio", "Styracosaurus albertensis", "Lagarto con púas", CRETACICO, HERBIVORO, CERATOPSIO,
                        5.5, 1.8, 2.7, 30.0, "Alberta, Canadá", 1913, "Charles M. Sternberg",
                        "Llanuras costeras y deltas de ríos",
                        "Ceratópsido con un gran cuerno nasal de hasta 60 cm y una corona de 4 a 6 púas largas en el borde de su "
                                + "gola, que le daba un aspecto espectacular. Probablemente vivía en grandes manadas.")
                        .carac("Cuerno nasal", "Hasta 60 cm").carac("Gola", "Coronada por 4–6 púas largas")
                        .carac("Pico", "Estrecho, para seleccionar plantas")
                        .dato("Sus púas eran sobre todo para exhibirse ante otros de su especie.")
                        .dato("Se han hallado lechos con muchos ejemplares juntos, señal de vida en manada."),

                dino("Protoceratops", "Protoceratops andrewsi", "Primera cara con cuernos", CRETACICO, HERBIVORO, CERATOPSIO,
                        1.8, 0.6, 0.08, null, "Desierto de Gobi, Mongolia", 1922, "Walter Granger",
                        "Desiertos de dunas con oasis",
                        "Pequeño ceratopsio sin cuernos verdaderos, del tamaño de una oveja, con pico fuerte y una gola ósea. "
                                + "Es uno de los dinosaurios mejor conocidos: hay fósiles de todas las edades, desde crías hasta adultos.")
                        .carac("Gola", "Delgada, más grande en los machos").carac("Pico", "Fuerte, para cortar plantas duras")
                        .carac("Tamaño", "Como una oveja")
                        .dato("Sus cráneos en el desierto pudieron inspirar la leyenda del grifo, según la historiadora Adrienne Mayor.")
                        .dato("Fue protagonista del famoso fósil de los «dinosaurios peleando» con un Velocirraptor."),

                dino("Paquicefalosaurio", "Pachycephalosaurus wyomingensis", "Lagarto de cabeza gruesa", CRETACICO, HERBIVORO,
                        PAQUICEFALOSAURIO, 4.5, 1.5, 0.45, 30.0, "Montana, Estados Unidos", 1931, "Charles W. Gilmore",
                        "Bosques y llanuras de tierras altas",
                        "Herbívoro bípedo famoso por la cúpula de hueso macizo de hasta 25 cm de grosor en lo alto de su cabeza, "
                                + "rodeada de pequeños bultos y púas. Se debate si la usaba para embestir a rivales o solo para exhibirse.")
                        .carac("Cúpula craneal", "Hueso macizo de hasta 25 cm").carac("Adornos", "Bultos y púas óseas en el hocico y la nuca")
                        .carac("Locomoción", "Bípedo")
                        .dato("Se han hallado lesiones en sus cúpulas compatibles con choques de cabeza.")
                        .dato("Es uno de los últimos dinosaurios no avianos antes de la extinción."),

                // ---------------- Ornitópodos ----------------
                dino("Iguanodonte", "Iguanodon bernissartensis", "Diente de iguana", CRETACICO, HERBIVORO, ORNITOPODO,
                        10.0, 3.0, 3.5, 24.0, "Bernissart, Bélgica", 1878, "Mineros de Bernissart",
                        "Llanuras pantanosas con ríos y bosques de helechos",
                        "Gran herbívoro que podía caminar a dos o cuatro patas. Su rasgo más famoso es el pulgar en forma de púa, "
                                + "que al principio se colocó por error en su nariz como si fuera un cuerno.")
                        .carac("Pulgar", "Púa cónica de unos 15 cm").carac("Mano", "Dedo meñique prensil para agarrar plantas")
                        .carac("Locomoción", "Bípedo o cuadrúpedo según la ocasión")
                        .dato("Fue el segundo dinosaurio en recibir nombre, en 1825, por Gideon Mantell.")
                        .dato("En una mina de carbón de Bernissart se hallaron 38 esqueletos a 322 m de profundidad."),

                dino("Parasaurolofus", "Parasaurolophus walkeri", "Casi lagarto con cresta", CRETACICO, HERBIVORO, ORNITOPODO,
                        9.5, 3.0, 2.5, 40.0, "Alberta, Canadá", 1920, "William Parks",
                        "Llanuras de inundación boscosas y pantanos",
                        "Hadrosaurio de pico de pato con una espectacular cresta tubular hueca que salía hacia atrás de su cabeza "
                                + "y medía hasta 1 m. Por dentro, la cresta tenía conductos que funcionaban como una trompeta.")
                        .carac("Cresta", "Tubo hueco de hasta 1 m").carac("Pico", "Ancho, como de pato, con cientos de dientes detrás")
                        .carac("Locomoción", "Bípedo o cuadrúpedo")
                        .dato("En 1997 se recreó por ordenador el sonido de su cresta: un bramido grave y resonante.")
                        .dato("Tenía baterías dentales con cientos de dientes que se reemplazaban continuamente.")
        );
    }
}
