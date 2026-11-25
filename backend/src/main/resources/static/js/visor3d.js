/* =========================================================
   Visor 3D interactivo de dinosaurios (Three.js)
   ---------------------------------------------------------
   - Si el dinosaurio tiene `modelo3dUrl` (.glb/.gltf) se carga ese modelo.
   - Si no, se genera un modelo low-poly procedural según su grupo anatómico
     (terópodo, saurópodo, ceratopsio…) con rasgos propios de algunos géneros.
   - Animación de reposo (respiración, cola, mirada) y animación de rugido.
   - Silueta humana de 1,75 m para comparar tamaños, a escala real.
   ========================================================= */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/* ------------------------- Planos corporales ------------------------- */
// Medidas en unidades arbitrarias (se reescala a la longitud real al final)
const PLANES = {
  TEROPODO: {
    bipedo: true, color: 0x6b5a3c, vientre: 0xb59b6e, acento: 0x8a3b24,
    patas: { tras: 3.0, grosor: 0.42 }, brazos: { largo: 0.9, grosor: 0.12 },
    cuerpo: { largo: 3.4, alto: 1.9, ancho: 1.4 },
    cuello: { n: 3, largo: 1.1, r0: 0.55, r1: 0.42, angulo: 0.75 },
    cabeza: { largo: 1.6, alto: 0.75, ancho: 0.6 },
    cola: { n: 9, largo: 5.2, r0: 0.62, r1: 0.05, angulo: 0.08 },
    extras: []
  },
  DROMEOSAURIO: {
    bipedo: true, color: 0x6e4a2c, vientre: 0xc9a77a, acento: 0x1d3b5a,
    patas: { tras: 1.5, grosor: 0.16 }, brazos: { largo: 1.0, grosor: 0.09 },
    cuerpo: { largo: 1.5, alto: 0.8, ancho: 0.6 },
    cuello: { n: 3, largo: 0.8, r0: 0.2, r1: 0.15, angulo: 0.9 },
    cabeza: { largo: 0.7, alto: 0.28, ancho: 0.24 },
    cola: { n: 9, largo: 2.9, r0: 0.22, r1: 0.04, angulo: 0.12 },
    extras: ["plumas"]
  },
  ESPINOSAURIDO: {
    bipedo: true, color: 0x55654a, vientre: 0xb9b08a, acento: 0xa4472c,
    patas: { tras: 2.2, grosor: 0.4 }, brazos: { largo: 1.4, grosor: 0.16 },
    cuerpo: { largo: 4.0, alto: 1.7, ancho: 1.2 },
    cuello: { n: 4, largo: 1.6, r0: 0.45, r1: 0.32, angulo: 0.6 },
    cabeza: { largo: 2.0, alto: 0.48, ancho: 0.4 },
    cola: { n: 10, largo: 6.2, r0: 0.55, r1: 0.06, angulo: 0.05, aplanarZ: 0.45, aplanarY: 1.5 },
    extras: []
  },
  ORNITOMIMIDO: {
    bipedo: true, color: 0x9a8458, vientre: 0xe0d3b0, acento: 0x5b4a2e,
    patas: { tras: 2.6, grosor: 0.2 }, brazos: { largo: 1.0, grosor: 0.08 },
    cuerpo: { largo: 1.7, alto: 1.0, ancho: 0.8 },
    cuello: { n: 5, largo: 1.9, r0: 0.2, r1: 0.12, angulo: 1.05 },
    cabeza: { largo: 0.55, alto: 0.25, ancho: 0.22 },
    cola: { n: 9, largo: 2.8, r0: 0.3, r1: 0.04, angulo: 0.05 },
    extras: ["pico", "plumas"]
  },
  PROSAUROPODO: {
    bipedo: true, color: 0x7a7a52, vientre: 0xcfc39a, acento: 0x8a5a2c,
    patas: { tras: 2.2, grosor: 0.3 }, brazos: { largo: 1.5, grosor: 0.14 },
    cuerpo: { largo: 2.8, alto: 1.6, ancho: 1.2 },
    cuello: { n: 5, largo: 2.3, r0: 0.38, r1: 0.22, angulo: 0.55 },
    cabeza: { largo: 0.6, alto: 0.32, ancho: 0.28 },
    cola: { n: 10, largo: 4.0, r0: 0.5, r1: 0.05, angulo: 0.0 },
    extras: []
  },
  SAUROPODO: {
    bipedo: false, color: 0x6c7a62, vientre: 0xb8bfa4, acento: 0x4f5a45,
    patas: { tras: 3.6, del: 3.6, grosor: 0.7 },
    cuerpo: { largo: 5.0, alto: 2.8, ancho: 2.4 },
    cuello: { n: 8, largo: 7.0, r0: 0.85, r1: 0.32, angulo: 0.55 },
    cabeza: { largo: 0.95, alto: 0.48, ancho: 0.42 },
    cola: { n: 11, largo: 9.0, r0: 0.85, r1: 0.04, angulo: 0.0 },
    extras: []
  },
  ESTEGOSAURIO: {
    bipedo: false, color: 0x5d6b43, vientre: 0xb7b38a, acento: 0xb4643c,
    patas: { tras: 2.1, del: 1.2, grosor: 0.4 },
    cuerpo: { largo: 3.6, alto: 2.0, ancho: 1.6 },
    cuello: { n: 3, largo: 1.2, r0: 0.45, r1: 0.3, angulo: -0.25 },
    cabeza: { largo: 0.75, alto: 0.35, ancho: 0.32 },
    cola: { n: 8, largo: 3.8, r0: 0.55, r1: 0.08, angulo: 0.12 },
    extras: ["placas", "thagomizer"]
  },
  ANQUILOSAURIO: {
    bipedo: false, color: 0x7a6a4c, vientre: 0xb9a885, acento: 0x4e412c,
    patas: { tras: 1.1, del: 1.0, grosor: 0.4 },
    cuerpo: { largo: 3.9, alto: 1.5, ancho: 2.5 },
    cuello: { n: 2, largo: 0.6, r0: 0.55, r1: 0.45, angulo: -0.05 },
    cabeza: { largo: 1.0, alto: 0.6, ancho: 0.85 },
    cola: { n: 7, largo: 3.2, r0: 0.45, r1: 0.12, angulo: 0.08 },
    extras: ["armadura", "mazo"]
  },
  CERATOPSIO: {
    bipedo: false, color: 0x7b684f, vientre: 0xc2ae8c, acento: 0xa3553a,
    patas: { tras: 1.6, del: 1.35, grosor: 0.5 },
    cuerpo: { largo: 3.6, alto: 2.1, ancho: 2.0 },
    cuello: { n: 2, largo: 0.6, r0: 0.75, r1: 0.65, angulo: -0.1 },
    cabeza: { largo: 1.9, alto: 1.0, ancho: 0.9 },
    cola: { n: 7, largo: 2.8, r0: 0.55, r1: 0.06, angulo: 0.05 },
    extras: ["gola", "cuernos3"]
  },
  ORNITOPODO: {
    bipedo: false, color: 0x5d775a, vientre: 0xc3c39a, acento: 0xa3592f,
    patas: { tras: 2.8, del: 1.9, grosor: 0.42 },
    cuerpo: { largo: 3.5, alto: 1.9, ancho: 1.5 },
    cuello: { n: 3, largo: 1.5, r0: 0.45, r1: 0.34, angulo: 0.65 },
    cabeza: { largo: 1.3, alto: 0.6, ancho: 0.5 },
    cola: { n: 9, largo: 4.6, r0: 0.6, r1: 0.06, angulo: 0.05, aplanarZ: 0.7, aplanarY: 1.25 },
    extras: ["pico"]
  },
  PAQUICEFALOSAURIO: {
    bipedo: true, color: 0x8a6d48, vientre: 0xd6c19a, acento: 0x6e3c22,
    patas: { tras: 1.3, grosor: 0.2 }, brazos: { largo: 0.5, grosor: 0.07 },
    cuerpo: { largo: 1.6, alto: 1.0, ancho: 0.85 },
    cuello: { n: 2, largo: 0.55, r0: 0.25, r1: 0.22, angulo: 0.6 },
    cabeza: { largo: 0.7, alto: 0.5, ancho: 0.45 },
    cola: { n: 8, largo: 2.0, r0: 0.3, r1: 0.04, angulo: 0.05 },
    extras: ["cupula"]
  }
};

// Rasgos propios de algunos géneros
const AJUSTES_GENERO = {
  Brachiosaurus: { patas: { del: 4.6, tras: 3.4 }, cuello: { angulo: 1.1, largo: 8.5 }, cola: { largo: 6.5 } },
  Diplodocus: { cuello: { angulo: 0.18, r0: 0.7 }, cola: { largo: 12, n: 13 }, patas: { del: 3.0, tras: 3.6 } },
  Apatosaurus: { cuello: { angulo: 0.32, r0: 1.1, r1: 0.55 }, patas: { del: 3.1, tras: 3.6, grosor: 0.85 } },
  Argentinosaurus: { cuello: { angulo: 0.5 }, cuerpo: { alto: 3.2, ancho: 2.8 } },
  Spinosaurus: { extras: ["vela"] },
  Baryonyx: { cuerpo: { largo: 3.2 }, cabeza: { largo: 1.6 } },
  Parasaurolophus: { extras: ["pico", "cresta_tubo"] },
  Iguanodon: { cabeza: { largo: 1.1 }, extras: [] },
  Triceratops: { extras: ["gola", "cuernos3"] },
  Styracosaurus: { extras: ["gola_puas", "cuerno_nasal"] },
  Protoceratops: { extras: ["gola"], cabeza: { largo: 1.5, alto: 0.9 } },
  Dilophosaurus: { extras: ["crestas_dobles"], cuello: { r0: 0.4, r1: 0.3 }, cabeza: { alto: 0.6, ancho: 0.45 } },
  Carnotaurus: { extras: ["cuernos_toro"], brazos: { largo: 0.35 }, cabeza: { largo: 1.2, alto: 0.75 } },
  Allosaurus: { extras: ["crestas_ojos"] },
  Microraptor: { extras: ["plumas", "alas4"] },
  Kentrosaurus: { extras: ["placas_puas"] },
  Velociraptor: { cabeza: { largo: 0.8, alto: 0.25 } },
  Coelophysis: { cuello: { largo: 1.0, angulo: 1.0, r0: 0.16, r1: 0.12 }, cuerpo: { alto: 0.65, ancho: 0.5 },
                 patas: { grosor: 0.13 }, cabeza: { largo: 0.7, alto: 0.25, ancho: 0.2 } },
  Compsognathus: { cuello: { largo: 0.7, angulo: 1.0, r0: 0.14, r1: 0.11 }, cuerpo: { alto: 0.6, ancho: 0.5 },
                   patas: { grosor: 0.12 }, cabeza: { largo: 0.5, alto: 0.24, ancho: 0.2 } },
  Herrerasaurus: { cuerpo: { alto: 1.3, ancho: 1.0 }, patas: { grosor: 0.3 } }
};

const POR_DIETA = { CARNIVORO: "TEROPODO", PISCIVORO: "ESPINOSAURIDO", OMNIVORO: "ORNITOMIMIDO",
                    INSECTIVORO: "DROMEOSAURIO", HERBIVORO: "ORNITOPODO" };

function fusionar(base, extra) {
  const r = structuredClone(base);
  for (const [k, v] of Object.entries(extra || {})) {
    r[k] = v && typeof v === "object" && !Array.isArray(v) ? { ...r[k], ...v } : v;
  }
  return r;
}

/* ------------------------- Utilidades de geometría ------------------------- */
const material = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, flatShading: true, ...extra });

function malla(geo, mat) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function elipsoide(rx, ry, rz, mat, seg = 14) {
  const g = new THREE.SphereGeometry(1, seg, Math.max(6, Math.round(seg * 0.7)));
  g.scale(rx, ry, rz);
  return malla(g, mat);
}

function cono(radio, alto, mat, seg = 7) {
  return malla(new THREE.ConeGeometry(radio, alto, seg), mat);
}

/** Apunta el eje +Y local de un objeto hacia una dirección. */
function apuntar(obj, dir) {
  obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
}

/** Cadena articulada a lo largo de +X (cuello y cola): cada junta puede rotarse para animar. */
function cadena({ n, largo, r0, r1, aplanarY = 1, aplanarZ = 1 }, mat) {
  const raiz = new THREE.Group();
  const juntas = [];
  const ls = largo / n;
  let padre = raiz;
  for (let i = 0; i < n; i++) {
    const ra = r0 + (r1 - r0) * (i / n), rb = r0 + (r1 - r0) * ((i + 1) / n);
    const j = new THREE.Group();
    if (i > 0) j.position.x = ls;
    padre.add(j);
    juntas.push(j);
    const g = new THREE.CylinderGeometry(rb, ra, ls * 1.05, 9, 1);
    g.rotateZ(-Math.PI / 2);
    g.translate(ls / 2, 0, 0);
    g.scale(1, aplanarY, aplanarZ);
    j.add(malla(g, mat));
    j.add(elipsoide(ra, ra * aplanarY, ra * aplanarZ, mat, 9));
    j.userData = { radio: ra, largo: ls };
    padre = j;
  }
  const punta = new THREE.Group();
  punta.position.x = ls;
  padre.add(punta);
  return { raiz, juntas, punta, ls };
}

/** Pata de tres segmentos que cuelga desde su pivote; `angulos` absolutos de cada segmento. */
function pata(alto, grosor, mat, angulos) {
  const pesos = [0.42, 0.4, 0.18];
  const f = alto / pesos.reduce((s, p, i) => s + p * Math.cos(angulos[i]), 0);
  const raiz = new THREE.Group();
  let padre = raiz, previo = 0, r = grosor;
  pesos.forEach((p, i) => {
    const largo = p * f;
    const j = new THREE.Group();
    j.rotation.z = angulos[i] - previo;
    previo = angulos[i];
    if (i > 0) j.position.y = -pesos[i - 1] * f;
    padre.add(j);
    const g = new THREE.CylinderGeometry(r, r * 0.78, largo, 8);
    g.translate(0, -largo / 2, 0);
    j.add(malla(g, mat));
    j.add(elipsoide(r, r, r, mat, 8));
    r *= 0.78;
    padre = j;
  });
  const pie = new THREE.Group();
  pie.position.y = -pesos[2] * f;
  pie.rotation.z = -previo;
  padre.add(pie);
  const caja = malla(new THREE.BoxGeometry(grosor * 2.1, grosor * 0.45, grosor * 1.3), mat);
  caja.position.set(grosor * 0.55, -grosor * 0.12, 0);
  pie.add(caja);
  return raiz;
}

/* ------------------------- Constructor procedural ------------------------- */
function construirDino(d) {
  const grupo = PLANES[d.grupo] ? d.grupo : POR_DIETA[d.dieta] || "TEROPODO";
  const genero = String(d.nombreCientifico || "").split(" ")[0];
  const P = fusionar(PLANES[grupo], AJUSTES_GENERO[genero]);
  const extras = new Set(P.extras);

  const piel = material(P.color);
  const vientre = material(P.vientre);
  const acento = material(P.acento);
  const hueso = material(0xe6dcc3);
  const ojoMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 });

  const raiz = new THREE.Group();
  const C = P.cuerpo;

  // --- Posiciones de cadera, hombro y torso ---
  let cadera, hombro, inclinacion = 0, torsoPos;
  if (P.bipedo) {
    cadera = new THREE.Vector3(0, P.patas.tras, 0);
    torsoPos = new THREE.Vector3(C.largo * 0.22, P.patas.tras + C.alto * 0.12, 0);
    hombro = new THREE.Vector3(torsoPos.x + C.largo * 0.36, torsoPos.y - C.alto * 0.05, 0);
    inclinacion = 0.06;
  } else {
    cadera = new THREE.Vector3(-C.largo * 0.32, P.patas.tras, 0);
    hombro = new THREE.Vector3(C.largo * 0.32, P.patas.del, 0);
    inclinacion = Math.atan2(hombro.y - cadera.y, hombro.x - cadera.x);
    torsoPos = new THREE.Vector3(0, (cadera.y + hombro.y) / 2 + C.alto * 0.18, 0);
  }

  // --- Torso ---
  const torso = new THREE.Group();
  torso.position.copy(torsoPos);
  torso.rotation.z = inclinacion;
  raiz.add(torso);
  const cuerpo = elipsoide(C.largo / 2, C.alto / 2, C.ancho / 2, piel, 18);
  torso.add(cuerpo);
  const panza = elipsoide(C.largo * 0.42, C.alto * 0.32, C.ancho * 0.4, vientre, 14);
  panza.position.y = -C.alto * 0.2;
  torso.add(panza);
  const superficie = x => (C.alto / 2) * Math.sqrt(Math.max(0, 1 - (x / (C.largo / 2)) ** 2));

  // --- Patas ---
  const angTras = P.bipedo ? [0.4, -0.6, 0.35] : [0.08, -0.08, 0.05];
  [-1, 1].forEach(lado => {
    const pt = pata(P.patas.tras, P.patas.grosor, piel, angTras);
    pt.position.set(cadera.x, cadera.y, lado * C.ancho * 0.34);
    raiz.add(pt);
    // muslo voluminoso
    const muslo = elipsoide(P.patas.grosor * 1.8, P.patas.tras * 0.28, P.patas.grosor * 1.2, piel, 10);
    muslo.position.set(cadera.x + P.patas.grosor * 0.4, cadera.y - P.patas.tras * 0.12, lado * C.ancho * 0.34);
    raiz.add(muslo);
    if (!P.bipedo) {
      const pd = pata(P.patas.del, P.patas.grosor * 0.85, piel, [0.05, -0.05, 0]);
      pd.position.set(hombro.x, hombro.y, lado * C.ancho * 0.32);
      raiz.add(pd);
    } else if (P.brazos) {
      const br = pata(P.brazos.largo, P.brazos.grosor, piel, [0.9, 0.2, 0.6]);
      br.position.set(hombro.x, hombro.y, lado * C.ancho * 0.38);
      raiz.add(br);
      if (extras.has("plumas") || extras.has("alas4")) {
        const ala = elipsoide(P.brazos.largo * 0.55, P.brazos.largo * (extras.has("alas4") ? 0.5 : 0.28), 0.02, acento, 10);
        ala.position.set(hombro.x - P.brazos.largo * 0.2, hombro.y - P.brazos.largo * 0.3, lado * (C.ancho * 0.38 + 0.03));
        ala.rotation.z = 0.5;
        raiz.add(ala);
      }
      if (extras.has("alas4")) {
        const alaP = elipsoide(P.patas.tras * 0.35, P.patas.tras * 0.3, 0.02, acento, 10);
        alaP.position.set(cadera.x - P.patas.tras * 0.15, cadera.y - P.patas.tras * 0.35, lado * (C.ancho * 0.36 + 0.04));
        raiz.add(alaP);
      }
    }
  });

  // --- Cola ---
  const C1 = P.cola;
  const cola = cadena(C1, piel);
  cola.raiz.position.set(P.bipedo ? cadera.x - C.largo * 0.12 : -C.largo * 0.45, (P.bipedo ? cadera.y : cadera.y + C.alto * 0.25) + C.alto * 0.08, 0);
  cola.raiz.rotation.set(0, Math.PI, C1.angulo);
  raiz.add(cola.raiz);

  // --- Cuello y cabeza ---
  const CU = P.cuello;
  const cuello = cadena(CU, piel);
  const baseCuello = P.bipedo
    ? new THREE.Vector3(torsoPos.x + C.largo * 0.42, torsoPos.y + C.alto * 0.15, 0)
    : new THREE.Vector3(C.largo * 0.46, hombro.y + C.alto * 0.42, 0);
  cuello.raiz.position.copy(baseCuello);
  cuello.raiz.rotation.z = CU.angulo;
  raiz.add(cuello.raiz);

  const H = P.cabeza;
  const cabeza = new THREE.Group();
  cabeza.rotation.z = -CU.angulo * 0.9 - 0.08;
  cuello.punta.add(cabeza);
  const craneo = elipsoide(H.largo / 2, H.alto * 0.36, H.ancho / 2, piel, 12);
  craneo.position.set(H.largo * 0.42, H.alto * 0.08, 0);
  cabeza.add(craneo);
  const mandibula = new THREE.Group();
  mandibula.position.set(H.largo * 0.05, -H.alto * 0.08, 0);
  cabeza.add(mandibula);
  const mand = elipsoide(H.largo * 0.44, H.alto * 0.16, H.ancho * 0.42, vientre, 10);
  mand.position.x = H.largo * 0.4;
  mandibula.add(mand);
  [-1, 1].forEach(lado => {
    const ojo = elipsoide(H.alto * 0.09, H.alto * 0.09, H.alto * 0.05, ojoMat, 8);
    ojo.position.set(H.largo * 0.3, H.alto * 0.22, lado * H.ancho * 0.42);
    cabeza.add(ojo);
  });

  // --- Rasgos especiales ---
  const tamPlaca = C.alto * 0.42;
  if (extras.has("placas") || extras.has("placas_puas")) {
    const nPlacas = 7;
    for (let i = 0; i < nPlacas; i++) {
      const x = -C.largo * 0.42 + (i / (nPlacas - 1)) * C.largo * 0.8;
      const s = tamPlaca * (0.55 + 0.45 * Math.sin(Math.PI * (i + 0.5) / nPlacas));
      const espina = extras.has("placas_puas") && i < 3;
      const p = espina ? cono(s * 0.12, s * 1.1, acento) : malla(new THREE.OctahedronGeometry(1, 0), acento);
      if (!espina) p.scale.set(s * 0.55, s, s * 0.07);
      p.position.set(x, superficie(x) + s * 0.55, (i % 2 ? 1 : -1) * C.ancho * 0.07);
      torso.add(p);
    }
    cola.juntas.slice(0, 4).forEach((j, i) => {
      const s = tamPlaca * (0.6 - i * 0.12);
      const espina = extras.has("placas_puas");
      const p = espina ? cono(s * 0.15, s * 1.3, hueso) : malla(new THREE.OctahedronGeometry(1, 0), acento);
      if (!espina) p.scale.set(s * 0.5, s, s * 0.07);
      p.position.set(j.userData.largo * 0.5, j.userData.radio + s * 0.5, 0);
      j.add(p);
    });
  }
  if (extras.has("thagomizer") || extras.has("placas_puas")) {
    const j = cola.juntas[cola.juntas.length - 2];
    [[1, 1], [1, -1], [0.6, 1], [0.6, -1]].forEach(([f, lado], i) => {
      const c = cono(j.userData.radio * 0.5, C.alto * 0.45 * f + 0.2, hueso);
      c.position.set(j.userData.largo * (i < 2 ? 0.8 : 0.2), j.userData.radio * 0.5, lado * j.userData.radio);
      apuntar(c, new THREE.Vector3(0.15, 0.7, lado * 0.8));
      j.add(c);
    });
  }
  if (extras.has("armadura")) {
    for (let u = -0.8; u <= 0.81; u += 0.2) {
      for (let v = 0.2; v <= 1.01; v += 0.2) {
        [-1, 1].forEach(lado => {
          const phi = v * Math.PI / 2, k = Math.sqrt(1 - u * u);
          const pos = new THREE.Vector3(u * C.largo / 2, (C.alto / 2) * Math.sin(phi) * k, lado * (C.ancho / 2) * Math.cos(phi) * k);
          const normal = new THREE.Vector3(pos.x / (C.largo / 2) ** 2, pos.y / (C.alto / 2) ** 2, pos.z / (C.ancho / 2) ** 2);
          const c = cono(C.alto * 0.07, C.alto * (v < 0.3 ? 0.22 : 0.1), hueso, 5);
          c.position.copy(pos);
          apuntar(c, normal);
          torso.add(c);
        });
      }
    }
  }
  if (extras.has("mazo")) {
    const mazo = elipsoide(C1.r0 * 0.9, C1.r0 * 0.5, C1.r0 * 1.0, hueso, 10);
    mazo.position.x = cola.ls * 0.2;
    cola.punta.add(mazo);
  }
  if (extras.has("gola") || extras.has("gola_puas")) {
    const R = H.alto * (extras.has("gola_puas") ? 1.0 : 1.1);
    const gola = malla(new THREE.CylinderGeometry(R, R, R * 0.06, 22), acento);
    gola.position.set(H.largo * 0.02, H.alto * 0.4, 0);
    gola.rotation.z = 2.2;
    cabeza.add(gola);
    if (extras.has("gola_puas")) {
      for (let a = -1.1; a <= 1.11; a += 0.44) {
        const c = cono(R * 0.1, R * 0.8, hueso);
        c.position.set(R * Math.cos(a), 0, R * Math.sin(a));
        apuntar(c, new THREE.Vector3(Math.cos(a), 0, Math.sin(a)));
        gola.add(c);
      }
    }
  }
  if (extras.has("cuernos3")) {
    [-1, 1].forEach(lado => {
      const c = cono(H.alto * 0.1, H.largo * 0.6, hueso);
      c.position.set(H.largo * 0.32, H.alto * 0.42, lado * H.ancho * 0.28);
      apuntar(c, new THREE.Vector3(1, 0.75, lado * 0.12));
      cabeza.add(c);
    });
  }
  if (extras.has("cuernos3") || extras.has("cuerno_nasal")) {
    const grande = extras.has("cuerno_nasal");
    const c = cono(H.alto * (grande ? 0.13 : 0.08), H.largo * (grande ? 0.4 : 0.18), hueso);
    c.position.set(H.largo * 0.78, H.alto * 0.32, 0);
    apuntar(c, new THREE.Vector3(0.4, 1, 0));
    cabeza.add(c);
  }
  if (extras.has("cuernos_toro")) {
    [-1, 1].forEach(lado => {
      const c = cono(H.alto * 0.14, H.alto * 0.45, hueso);
      c.position.set(H.largo * 0.28, H.alto * 0.38, lado * H.ancho * 0.38);
      apuntar(c, new THREE.Vector3(0.1, 0.6, lado));
      cabeza.add(c);
    });
  }
  if (extras.has("crestas_dobles")) {
    [-1, 1].forEach(lado => {
      const cr = elipsoide(H.largo * 0.34, H.alto * 0.36, 0.025, acento, 12);
      cr.position.set(H.largo * 0.45, H.alto * 0.38, lado * H.ancho * 0.12);
      cabeza.add(cr);
    });
  }
  if (extras.has("crestas_ojos")) {
    [-1, 1].forEach(lado => {
      const cr = cono(H.alto * 0.08, H.alto * 0.25, acento, 5);
      cr.position.set(H.largo * 0.3, H.alto * 0.35, lado * H.ancho * 0.28);
      cabeza.add(cr);
    });
  }
  if (extras.has("cresta_tubo")) {
    const largo = H.largo * 1.15;
    const tubo = malla(new THREE.CylinderGeometry(H.alto * 0.12, H.alto * 0.16, largo, 8), acento);
    const dir = new THREE.Vector3(-0.92, 0.38, 0).normalize();
    tubo.position.set(H.largo * 0.45, H.alto * 0.35, 0).addScaledVector(dir, largo / 2);
    apuntar(tubo, dir);
    cabeza.add(tubo);
  }
  if (extras.has("cupula")) {
    const cup = elipsoide(H.largo * 0.3, H.alto * 0.42, H.ancho * 0.45, material(0xd8c49a), 12);
    cup.position.set(H.largo * 0.25, H.alto * 0.32, 0);
    cabeza.add(cup);
  }
  if (extras.has("pico")) {
    const pico = cono(H.alto * 0.2, H.largo * 0.22, material(0x3b3326), 6);
    pico.position.set(H.largo * 0.92, 0, 0);
    apuntar(pico, new THREE.Vector3(1, -0.1, 0));
    cabeza.add(pico);
  }
  if (extras.has("vela")) {
    const w = C.largo * 0.85, h = C.alto * 1.3;
    const forma = new THREE.Shape();
    forma.moveTo(-w / 2, 0);
    forma.quadraticCurveTo(-w * 0.15, h * 1.25, w * 0.15, h);
    forma.quadraticCurveTo(w * 0.42, h * 0.7, w / 2, 0);
    forma.lineTo(-w / 2, 0);
    const vela = malla(new THREE.ShapeGeometry(forma, 10), material(P.acento, { side: THREE.DoubleSide }));
    vela.position.set(-C.largo * 0.05, C.alto * 0.35, 0);
    torso.add(vela);
  }
  if (extras.has("plumas")) {
    const abanico = elipsoide(C1.largo * 0.16, C1.r0 * 0.25, C1.r0 * 1.6, acento, 10);
    abanico.position.x = cola.ls * 0.3;
    cola.punta.add(abanico);
    const penacho = cono(H.alto * 0.25, H.alto * 0.7, acento, 5);
    penacho.position.set(H.largo * 0.05, H.alto * 0.3, 0);
    apuntar(penacho, new THREE.Vector3(-1, 0.6, 0));
    cabeza.add(penacho);
  }

  return { raiz, torso, cola, cuello, cabeza, mandibula, grupo };
}

/* ------------------------- Silueta humana (1,75 m) ------------------------- */
function humano() {
  const g = new THREE.Group();
  const mat = material(0xe8cf8a, { transparent: true, opacity: 0.85 });
  [-1, 1].forEach(l => {
    const pierna = malla(new THREE.CylinderGeometry(0.075, 0.06, 0.85, 8), mat);
    pierna.position.set(0, 0.425, l * 0.1);
    g.add(pierna);
    const brazo = malla(new THREE.CylinderGeometry(0.05, 0.04, 0.65, 8), mat);
    brazo.position.set(0, 1.12, l * 0.26);
    brazo.rotation.x = l * 0.12;
    g.add(brazo);
  });
  const tronco = malla(new THREE.CapsuleGeometry(0.17, 0.42, 4, 10), mat);
  tronco.position.y = 1.18;
  g.add(tronco);
  const cabeza = malla(new THREE.SphereGeometry(0.115, 12, 10), mat);
  cabeza.position.y = 1.635;
  g.add(cabeza);
  return g;
}

/* ------------------------- Visor ------------------------- */
export function montarVisor(contenedor, dino, { alInteractuar } = {}) {
  const escena = new THREE.Scene();
  const render = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  render.setPixelRatio(Math.min(devicePixelRatio, 2));
  render.shadowMap.enabled = true;
  render.shadowMap.type = THREE.PCFSoftShadowMap;
  render.outputColorSpace = THREE.SRGBColorSpace;
  contenedor.appendChild(render.domElement);

  const camara = new THREE.PerspectiveCamera(38, 1, 0.05, 2000);
  const controles = new OrbitControls(camara, render.domElement);
  controles.enableDamping = true;
  controles.autoRotate = true;
  controles.autoRotateSpeed = 0.8;
  controles.maxPolarAngle = Math.PI * 0.495;

  escena.add(new THREE.HemisphereLight(0xdfeee2, 0x2b3a2e, 1.2));
  const sol = new THREE.DirectionalLight(0xffe2b0, 2.4);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  escena.add(sol, sol.target);

  const suelo = new THREE.Mesh(new THREE.CircleGeometry(1, 64),
    new THREE.MeshStandardMaterial({ color: 0x1a2f22, roughness: 1 }));
  suelo.rotation.x = -Math.PI / 2;
  suelo.receiveShadow = true;
  escena.add(suelo);
  const anillo = new THREE.Mesh(new THREE.RingGeometry(0.985, 1, 96),
    new THREE.MeshBasicMaterial({ color: 0xc9a24a, transparent: true, opacity: 0.5 }));
  anillo.rotation.x = -Math.PI / 2;
  anillo.position.y = 0.002;
  escena.add(anillo);

  const persona = humano();
  escena.add(persona);

  let modelo = null, partes = null, mezclador = null, rugido = 0;
  const reloj = new THREE.Clock();
  const longitud = Number(dino.longitudMetros) || 5;

  /* Busca la pata más visible (vértices junto al suelo, del lado de la cámara) para poner a la persona al lado */
  function posicionJuntoPata(caja, tam, centro) {
    modelo.updateMatrixWorld(true);
    const limiteY = caja.min.y + Math.max(0.15, tam.y * 0.06); // franja de los pies
    const v = new THREE.Vector3();
    let pie = null, mejor = -Infinity;
    modelo.traverse(o => {
      const pos = o.isMesh && o.visible && o.geometry?.attributes?.position;
      if (!pos) return;
      const paso = Math.max(1, Math.floor(pos.count / 6000)); // muestreo: rápido aunque el modelo sea pesado
      for (let i = 0; i < pos.count; i += paso) {
        if (o.getVertexPosition) o.getVertexPosition(i, v); else v.fromBufferAttribute(pos, i);
        o.localToWorld(v);
        if (v.y > limiteY) continue;
        const puntos = 0.35 * (v.x - centro.x) + 0.88 * (v.z - centro.z); // hacia donde mira la cámara
        if (puntos > mejor) { mejor = puntos; pie = v.clone(); }
      }
    });
    if (!pie) return new THREE.Vector3(centro.x + tam.x * 0.18, 0, caja.max.z + 0.6);
    // Un paso hacia fuera del cuerpo, para que quede al lado de la pata sin atravesarla
    const fuera = new THREE.Vector3(pie.x - centro.x, 0, pie.z - centro.z);
    if (fuera.lengthSq() < 1e-6) fuera.set(0, 0, 1);
    fuera.normalize().multiplyScalar(0.5 + Math.min(1.5, longitud * 0.02));
    return new THREE.Vector3(pie.x + fuera.x, 0, pie.z + fuera.z);
  }

  function encuadrar() {
    const caja = new THREE.Box3().setFromObject(modelo);
    const tam = caja.getSize(new THREE.Vector3());
    const centro = caja.getCenter(new THREE.Vector3());
    persona.position.copy(posicionJuntoPata(caja, tam, centro));
    const total = caja.union(new THREE.Box3().setFromObject(persona));
    const radio = total.getSize(new THREE.Vector3()).length() / 2;
    const c = total.getCenter(new THREE.Vector3());
    const dist = radio / Math.sin(THREE.MathUtils.degToRad(camara.fov / 2)) * 0.95;
    camara.position.set(c.x + dist * 0.35, c.y + dist * 0.3, c.z + dist * 0.88);
    camara.near = dist / 100; camara.far = dist * 20;
    camara.updateProjectionMatrix();
    controles.target.copy(c);
    controles.minDistance = radio * 0.6;
    controles.maxDistance = dist * 2.5;
    suelo.scale.setScalar(radio * 1.6);
    anillo.scale.setScalar(radio * 1.6);
    sol.position.set(c.x + radio * 1.5, radio * 3, c.z + radio * 1.2);
    sol.target.position.copy(c);
    const s = sol.shadow.camera;
    s.left = s.bottom = -radio * 1.6; s.right = s.top = radio * 1.6; s.near = 0.1; s.far = radio * 8;
    s.updateProjectionMatrix();
  }

  function colocar(obj) {
    // Escala a la longitud real (eje X) y apoya en el suelo, centrado
    const caja = new THREE.Box3().setFromObject(obj);
    const tam = caja.getSize(new THREE.Vector3());
    const largo = Math.max(tam.x, tam.z);
    obj.scale.multiplyScalar(longitud / largo);
    const caja2 = new THREE.Box3().setFromObject(obj);
    const centro = caja2.getCenter(new THREE.Vector3());
    obj.position.x -= centro.x;
    obj.position.z -= centro.z;
    obj.position.y -= caja2.min.y;
  }

  function usarProcedural() {
    partes = construirDino(dino);
    modelo = partes.raiz;
    escena.add(modelo);
    colocar(modelo);
    encuadrar();
  }

  /* Modelo propio: el indicado en la ficha o, si no hay, /modelos/<Género>.(glb|gltf|fbx|obj) si existe */
  async function buscarModeloPropio() {
    if (dino.modelo3dUrl) return dino.modelo3dUrl;
    const genero = String(dino.nombreCientifico || "").split(" ")[0];
    for (const ext of ["glb", "gltf", "fbx", "obj"]) {
      const url = `/modelos/${encodeURIComponent(genero)}.${ext}`;
      try { if ((await fetch(url, { method: "HEAD" })).ok) return url; } catch { /* sigue */ }
    }
    return null;
  }

  async function cargarArchivo(url) {
    const ext = url.split("?")[0].split(".").pop().toLowerCase();
    if (ext === "fbx") {
      const { FBXLoader } = await import("three/addons/loaders/FBXLoader.js");
      const obj = await new FBXLoader().loadAsync(url);
      return { escena: obj, animaciones: obj.animations };
    }
    if (ext === "obj") {
      const { OBJLoader } = await import("three/addons/loaders/OBJLoader.js");
      const obj = await new OBJLoader().loadAsync(url);
      obj.traverse(o => { if (o.isMesh && !o.material?.map) o.material = material(0x7a6a4c); });
      return { escena: obj, animaciones: [] };
    }
    const gltf = await new GLTFLoader().loadAsync(url);
    return { escena: gltf.scene, animaciones: gltf.animations };
  }

  buscarModeloPropio().then(async url => {
    if (!url) return usarProcedural();
    try {
      const { escena: obj, animaciones } = await cargarArchivo(url);
      modelo = obj;
      modelo.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      escena.add(modelo);
      colocar(modelo);
      encuadrar();
      if (animaciones?.length) {
        mezclador = new THREE.AnimationMixer(modelo);
        mezclador.clipAction(animaciones[0]).play();
      }
    } catch (e) {
      console.warn("No se pudo cargar el modelo 3D propio, se usa el generado:", e);
      usarProcedural();
    }
  });

  /* Animación */
  const base = new Map();
  const guardar = o => { if (!base.has(o)) base.set(o, o.rotation.clone()); return base.get(o); };

  function animar() {
    const dt = reloj.getDelta(), t = reloj.elapsedTime;
    mezclador?.update(dt);
    if (partes) {
      const { torso, cola, cuello, cabeza, mandibula } = partes;
      const rugir = rugido > 0 ? Math.sin(Math.PI * (1 - rugido)) : 0;
      if (rugido > 0) rugido = Math.max(0, rugido - dt / 1.8);

      torso.scale.y = 1 + Math.sin(t * 1.7) * 0.015;
      cola.juntas.forEach((j, i) => {
        const b = guardar(j);
        j.rotation.y = b.y + Math.sin(t * 1.1 - i * 0.45) * 0.05 * (1 + i * 0.12) + rugir * Math.sin(t * 9 - i) * 0.03;
        j.rotation.z = b.z + Math.sin(t * 0.8 - i * 0.3) * 0.01;
      });
      cuello.juntas.forEach((j, i) => {
        const b = guardar(j);
        j.rotation.z = b.z + Math.sin(t * 0.6 + i * 0.3) * 0.015 + rugir * 0.05;
        j.rotation.y = b.y + Math.sin(t * 0.35) * 0.035;
      });
      const bc = guardar(cabeza);
      cabeza.rotation.y = bc.y + Math.sin(t * 0.5) * 0.18 * (1 - rugir);
      cabeza.rotation.z = bc.z + rugir * 0.3;
      mandibula.rotation.z = -rugir * 0.55 - (Math.sin(t * 0.9) > 0.97 ? 0.05 : 0);
      modelo.userData.zBase ??= modelo.position.z;
      modelo.position.z = modelo.userData.zBase + rugir * Math.sin(t * 40) * 0.004 * longitud;
    }
    controles.update();
    render.render(escena, camara);
  }

  // Solo se dibuja cuando el visor está en pantalla (ahorra batería)
  let visible = true;
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    render.setAnimationLoop(visible ? animar : null);
  });
  io.observe(contenedor);

  const ajustar = () => {
    const { clientWidth: w, clientHeight: h } = contenedor;
    if (!w || !h) return;
    render.setSize(w, h, false);
    camara.aspect = w / h;
    camara.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(ajustar);
  ro.observe(contenedor);
  ajustar();

  let avisado = false;
  render.domElement.addEventListener("pointerdown", () => {
    controles.autoRotate = false;
    if (!avisado) { avisado = true; alInteractuar?.(); }
  });

  return {
    rugir() { rugido = 1; },
    alternarHumano() { persona.visible = !persona.visible; return persona.visible; },
    girar() { controles.autoRotate = !controles.autoRotate; return controles.autoRotate; },
    destruir() { render.setAnimationLoop(null); io.disconnect(); ro.disconnect(); render.dispose(); }
  };
}
