package com.paleo.glosario;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class ApiIntegracionTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;

    private String token(String email, String password) throws Exception {
        String json = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\",\"password\":\"%s\"}".formatted(email, password)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return mapper.readTree(json).get("token").asText();
    }

    private static final String DINO_VALIDO = """
            {"nombre":"Alosaurio%s","nombreCientifico":"Allosaurus fragilis","periodo":"JURASICO","dieta":"CARNIVORO",
             "longitudMetros":8.5,"alturaMetros":3,"pesoToneladas":2.3,"anioDescubrimiento":1877,
             "descripcion":"Gran terópodo del Jurásico superior de Norteamérica, depredador principal de su ecosistema.",
             "caracteristicas":[{"nombre":"Cuernos","valor":"Pequeñas crestas sobre los ojos"}],
             "imagenes":[{"url":"https://ejemplo.com/alosaurio.jpg","descripcion":"Esqueleto"}]}
            """;

    @Test
    void listadoPublicoConFiltros() throws Exception {
        mvc.perform(get("/api/dinosaurios")).andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(6))));
        mvc.perform(get("/api/dinosaurios").param("q", "rex"))
                .andExpect(jsonPath("$[0].nombreCientifico").value("Tyrannosaurus rex"));
        mvc.perform(get("/api/dinosaurios").param("periodo", "JURASICO"))
                .andExpect(jsonPath("$[*].periodo", everyItem(is("JURASICO"))));
        mvc.perform(get("/api/dinosaurios").param("periodo", "PALEOZOICO"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void registroValidaCampos() throws Exception {
        mvc.perform(post("/api/auth/registro").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nombre\":\"A\",\"email\":\"no-es-correo\",\"password\":\"corta\",\"rol\":\"USUARIO\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.nombre").exists())
                .andExpect(jsonPath("$.campos.email").exists())
                .andExpect(jsonPath("$.campos.password").exists());
    }

    @Test
    void paleontologoRequiereCodigoValido() throws Exception {
        mvc.perform(post("/api/auth/registro").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nombre":"Mary Anning","email":"mary@test.com","password":"Fosil2026","rol":"PALEONTOLOGO",
                                 "institucion":"Lyme Regis","especialidad":"Ictiosaurios","codigoAcreditacion":"MAL"}"""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.codigoAcreditacion").exists());

        mvc.perform(post("/api/auth/registro").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nombre":"Mary Anning","email":"mary@test.com","password":"Fosil2026","rol":"PALEONTOLOGO",
                                 "institucion":"Lyme Regis","especialidad":"Ictiosaurios","codigoAcreditacion":"PALEO-2026"}"""))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.usuario.rol").value("PALEONTOLOGO"))
                .andExpect(jsonPath("$.token").isNotEmpty());

        mvc.perform(post("/api/auth/registro").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nombre\":\"Otra\",\"email\":\"MARY@test.com\",\"password\":\"Fosil2026\",\"rol\":\"USUARIO\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void loginIncorrecto() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"paleo@dinoglosario.com\",\"password\":\"Mala1234\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void soloPaleontologoPuedeCrearEditarEliminar() throws Exception {
        String body = DINO_VALIDO.formatted("A");

        mvc.perform(post("/api/dinosaurios").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnauthorized());

        String usuario = token("usuario@dinoglosario.com", "Usuario2026");
        mvc.perform(post("/api/dinosaurios").header("Authorization", "Bearer " + usuario)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden());

        String paleo = token("paleo@dinoglosario.com", "Paleo2026");
        String creado = mvc.perform(post("/api/dinosaurios").header("Authorization", "Bearer " + paleo)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.registradoPor").value("Dra. Ana Fósil"))
                .andExpect(jsonPath("$.caracteristicas", hasSize(1)))
                .andReturn().getResponse().getContentAsString();
        JsonNode nodo = mapper.readTree(creado);
        long id = nodo.get("id").asLong();

        // nombre duplicado
        mvc.perform(post("/api/dinosaurios").header("Authorization", "Bearer " + paleo)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isConflict());

        // editar
        mvc.perform(put("/api/dinosaurios/" + id).header("Authorization", "Bearer " + paleo)
                        .contentType(MediaType.APPLICATION_JSON).content(DINO_VALIDO.formatted("A editado")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nombre").value("AlosaurioA editado"));

        mvc.perform(delete("/api/dinosaurios/" + id).header("Authorization", "Bearer " + usuario))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/api/dinosaurios/" + id).header("Authorization", "Bearer " + paleo))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/dinosaurios/" + id)).andExpect(status().isNotFound());
    }

    @Test
    void validacionesDelDinosaurio() throws Exception {
        String paleo = token("paleo@dinoglosario.com", "Paleo2026");
        mvc.perform(post("/api/dinosaurios").header("Authorization", "Bearer " + paleo)
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"nombre":"X","nombreCientifico":"allosaurus","periodo":"JURASICO","dieta":"CARNIVORO",
                                 "longitudMetros":-3,"descripcion":"corta",
                                 "imagenes":[{"url":"javascript:alert(1)"}]}"""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.nombre").exists())
                .andExpect(jsonPath("$.campos.nombreCientifico").exists())
                .andExpect(jsonPath("$.campos.longitudMetros").exists())
                .andExpect(jsonPath("$.campos.descripcion").exists())
                .andExpect(jsonPath("$.campos['imagenes[0].url']").exists());

        mvc.perform(post("/api/dinosaurios").header("Authorization", "Bearer " + paleo)
                        .contentType(MediaType.APPLICATION_JSON).content(DINO_VALIDO.formatted("B")
                                .replace("1877", "2999")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.anioDescubrimiento").exists());
    }

    @Test
    void asistenteResponde_aunqueElServicioIaEsteCaido() throws Exception {
        mvc.perform(post("/api/asistente/chat").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"mensaje\":\"¿Cómo inicio sesión?\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.respuesta").isNotEmpty())
                .andExpect(jsonPath("$.recomendaciones").isArray());
    }

    private long idDe(String nombreCientifico) throws Exception {
        String json = mvc.perform(get("/api/dinosaurios").param("q", nombreCientifico))
                .andReturn().getResponse().getContentAsString();
        return mapper.readTree(json).get(0).get("id").asLong();
    }

    @Test
    void recomendacionesAprendenDeLaActividad() throws Exception {
        String visitante = "test-visitante-" + System.nanoTime();

        // Visitante nuevo: recibe sugerencias variadas para empezar
        mvc.perform(get("/api/recomendaciones").header("X-Visitante-Id", visitante))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalInteracciones").value(0))
                .andExpect(jsonPath("$.recomendaciones", hasSize(4)))
                .andExpect(jsonPath("$.recomendaciones[0].motivo").value("Para empezar a explorar"));

        // Ve dos ceratopsios y filtra por herbívoros
        long trice = idDe("Triceratops horridus");
        for (String cuerpo : new String[]{
                "{\"tipo\":\"VISTA\",\"dinosaurioId\":" + trice + "}",
                "{\"tipo\":\"VISTA\",\"dinosaurioId\":" + idDe("Styracosaurus albertensis") + "}",
                "{\"tipo\":\"FILTRO\",\"valor\":\"dieta:HERBIVORO\"}"}) {
            mvc.perform(post("/api/actividad").header("X-Visitante-Id", visitante)
                            .contentType(MediaType.APPLICATION_JSON).content(cuerpo))
                    .andExpect(status().isNoContent());
        }

        // Ahora le interesan los ceratopsios y la primera sugerencia es uno que aún no vio (Protoceratops)
        mvc.perform(get("/api/recomendaciones").header("X-Visitante-Id", visitante).param("excluir", "" + trice))
                .andExpect(jsonPath("$.totalInteracciones").value(3))
                .andExpect(jsonPath("$.etiquetas", hasItem("Ceratopsio")))
                .andExpect(jsonPath("$.recomendaciones[0].nombre").value("Protoceratops"))
                .andExpect(jsonPath("$.recomendaciones[*].id", not(hasItem((int) trice))))
                .andExpect(jsonPath("$.resumen", containsString("Ceratopsio")));

        // «Olvidar mis intereses»
        mvc.perform(delete("/api/actividad").header("X-Visitante-Id", visitante))
                .andExpect(jsonPath("$.borradas").value(3));
        mvc.perform(get("/api/recomendaciones").header("X-Visitante-Id", visitante))
                .andExpect(jsonPath("$.totalInteracciones").value(0));
    }

    @Test
    void actividadInvalidaSeRechaza() throws Exception {
        mvc.perform(post("/api/actividad").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tipo\":\"HACKEAR\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void catalogoAmpliadoConGruposYCuriosidades() throws Exception {
        mvc.perform(get("/api/catalogos/grupos")).andExpect(jsonPath("$", hasSize(11)));
        mvc.perform(get("/api/dinosaurios").param("grupo", "SAUROPODO"))
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(4))))
                .andExpect(jsonPath("$[*].grupo", everyItem(is("SAUROPODO"))));
        mvc.perform(get("/api/dinosaurios").param("q", "Tyrannosaurus"))
                .andExpect(jsonPath("$[0].curiosidades", hasSize(greaterThanOrEqualTo(2))))
                .andExpect(jsonPath("$[0].wikipediaTitulo").value("Tyrannosaurus"));
    }
}
