import { Group, BoxGeometry, Mesh, PlaneGeometry, EdgesGeometry, LineSegments, LineBasicMaterial, IcosahedronGeometry, MeshStandardMaterial, MeshPhysicalMaterial } from 'three';
import {
  createConcreteMaterial,
  createGlassMaterial,
  createWaterMaterial,
  createGardenLightMaterial,
} from './glowMaterial';

/**
 * Nocturne — Modelo procedural de la vivienda (low-poly, sin .glb externo)
 * Geometría: núcleo hormigón + volumen vidriado + voladizo + pileta + tiras LED
 *
 * Materials are created locally (factory functions) so disposal owns them and
 * remounts do not reuse disposed singletons.
 */
export function createHouseModel(): Group {
  const house = new Group();

  const concreteMat = createConcreteMaterial();
  const glassMat = createGlassMaterial();
  const waterMat = createWaterMaterial();
  const gardenLightMat = createGardenLightMaterial();

  // 1. Núcleo de hormigón (ancla vertical)
  const coreGeom = new BoxGeometry(4, 14, 6);
  const core = new Mesh(coreGeom, concreteMat);
  core.position.set(0, 7, 0);
  house.add(core);

  // 2. Planta baja vidriada (volumen principal)
  const glassBaseGeom = new BoxGeometry(14, 8, 12);
  const glassBase = new Mesh(glassBaseGeom, glassMat);
  glassBase.position.set(0, 4, 0);
  house.add(glassBase);

  // Carpintería del vidrio (perfiles negros)
  const edgesBase = new EdgesGeometry(glassBaseGeom);
  const linesBase = new LineSegments(edgesBase, new LineBasicMaterial({ color: 0x0a0c0d }));
  linesBase.position.set(0, 4, 0);
  house.add(linesBase);

  // 3. Voladizo superior (cantilever)
  const cantileverGeom = new BoxGeometry(16, 3, 14);
  const cantilever = new Mesh(cantileverGeom, concreteMat);
  cantilever.position.set(0, 15.5, 1);
  house.add(cantilever);

  // 4. Losa de techo
  const roofGeom = new BoxGeometry(14, 0.5, 12);
  const roof = new Mesh(roofGeom, concreteMat);
  roof.position.set(0, 17.25, 0);
  house.add(roof);

  // 5. Baranda de balcón (vidrio)
  const railingGeom = new BoxGeometry(14, 1.2, 0.1);
  const railing = new Mesh(railingGeom, glassMat);
  railing.position.set(0, 14.6, 7.05);
  house.add(railing);

  // 6. Terreno/plaza
  const groundGeom = new PlaneGeometry(80, 80);
  const ground = new Mesh(groundGeom, concreteMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.1;
  house.add(ground);

  // 7. Pileta
  const poolGeom = new BoxGeometry(10, 0.6, 4);
  const pool = new Mesh(poolGeom, waterMat);
  pool.position.set(6, 0.3, -8);
  house.add(pool);

  // 8. Tiras de luz de jardín
  const lightStripGeom = new BoxGeometry(0.3, 0.1, 18);
  for (let i = 0; i < 4; i++) {
    const strip = new Mesh(lightStripGeom, gardenLightMat);
    strip.position.set(-10 + i * 6, 0.15, -10);
    house.add(strip);
  }

  // 9. Vegetación
  for (let i = 0; i < 12; i++) {
    const vegGeom = new IcosahedronGeometry(0.8 + Math.random() * 0.6, 0);
    const veg = new Mesh(vegGeom, concreteMat);
    veg.position.set(
      (Math.random() - 0.5) * 60,
      0.5,
      (Math.random() - 0.5) * 60
    );
    veg.rotation.y = Math.random() * Math.PI;
    veg.scale.setScalar(0.8 + Math.random() * 0.4);
    house.add(veg);
  }

  return house;
}

export { Group, Mesh, BoxGeometry, PlaneGeometry, EdgesGeometry, LineSegments, LineBasicMaterial, IcosahedronGeometry, MeshStandardMaterial, MeshPhysicalMaterial } from 'three';
