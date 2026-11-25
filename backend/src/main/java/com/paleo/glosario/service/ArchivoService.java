package com.paleo.glosario.service;

import com.paleo.glosario.exception.ReglaNegocioException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.UUID;

@Service
public class ArchivoService {

    private static final Map<String, String> TIPOS = Map.of(
            "image/jpeg", "jpg",
            "image/png", "png",
            "image/webp", "webp",
            "image/gif", "gif");

    private final Path directorio;

    public ArchivoService(@Value("${app.uploads.dir}") String dir) throws IOException {
        this.directorio = Path.of(dir).toAbsolutePath().normalize();
        Files.createDirectories(directorio);
    }

    public String guardarImagen(MultipartFile archivo) {
        if (archivo == null || archivo.isEmpty()) {
            throw ReglaNegocioException.invalido("archivo", "Selecciona una imagen");
        }
        String ext = TIPOS.get(archivo.getContentType());
        if (ext == null) {
            throw ReglaNegocioException.invalido("archivo", "Formato no permitido. Usa JPG, PNG, WEBP o GIF");
        }
        try (InputStream in = archivo.getInputStream()) {
            byte[] cabecera = in.readNBytes(12);
            if (!esImagenReal(cabecera)) {
                throw ReglaNegocioException.invalido("archivo", "El archivo no es una imagen válida");
            }
        } catch (IOException e) {
            throw ReglaNegocioException.invalido("archivo", "No se pudo leer la imagen");
        }
        String nombre = UUID.randomUUID() + "." + ext;
        try (InputStream in = archivo.getInputStream()) {
            Files.copy(in, directorio.resolve(nombre), StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new IllegalStateException("No se pudo guardar la imagen", e);
        }
        return "/uploads/" + nombre;
    }

    /** Comprueba los "magic numbers" para no confiar solo en el Content-Type del cliente. */
    private static boolean esImagenReal(byte[] b) {
        if (b.length < 4) return false;
        boolean jpg = (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8;
        boolean png = (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G';
        boolean gif = b[0] == 'G' && b[1] == 'I' && b[2] == 'F';
        boolean webp = b.length >= 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P';
        return jpg || png || gif || webp;
    }
}
