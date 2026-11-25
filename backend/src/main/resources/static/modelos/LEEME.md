# Modelos 3D propios

Coloca aquí archivos **.glb**, **.gltf**, **.fbx** u **.obj** de dinosaurios.

## Forma automática (sin tocar la base de datos)
Nombra el archivo con el **género** del nombre científico, respetando mayúsculas:

| Dinosaurio | Archivo |
|---|---|
| Tiranosaurio (*Tyrannosaurus rex*) | `Tyrannosaurus.glb` |
| Braquiosaurio (*Brachiosaurus altithorax*) | `Brachiosaurus.glb` |
| Tricerátops (*Triceratops horridus*) | `Triceratops.glb` |

La ficha lo usará automáticamente en lugar del modelo generado. Se busca en este orden: `.glb`, `.gltf`, `.fbx`, `.obj`.

## Forma manual
En el panel del paleontólogo, campo **Modelo 3D**, escribe `/modelos/mi-archivo.glb`.

## Consejos
- Mejor **.glb** (un solo archivo con texturas incluidas). Puedes convertir FBX/OBJ/BLEND a GLB con
  Blender: *Archivo → Exportar → glTF 2.0 (.glb)*.
- El visor escala el modelo a la longitud real del dinosaurio y lo apoya en el suelo. Si sale de lado o boca
  abajo, corrige la orientación en Blender antes de exportar (el dinosaurio debe mirar hacia +X o −X, de pie sobre Y).
- Si el archivo trae animaciones, se reproduce la primera.
- Intenta que pese menos de ~20 MB para que cargue rápido.

## Licencias
Usa solo modelos cuya licencia permita **mostrarlos en una web** (el navegador descarga el archivo, así que queda
accesible). Buenas opciones: modelos con licencia **CC0** o **CC BY** (dando crédito al autor).
La licencia de TurboSquid **no** permite servir sus modelos como archivos abiertos (.glb/.fbx/.obj) en un visor web
sin autorización escrita de TurboSquid.
