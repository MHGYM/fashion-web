import * as THREE from 'three'
import type { ZoneId } from './zones'

/**
 * Splitst de (ongesplitste) jersey-mesh in front/back/mouw-links/mouw-rechts,
 * puur op basis van wereld-positie — niet op de originele materialen/groepen
 * uit de GLB (die zijn er niet; het is één doorlopende mesh).
 *
 * Asrollen zijn empirisch bepaald (zie project-notities): in de glTF/Three.js-
 * ruimte van dít model is Y de hoogte-as, X links/rechts en Z voor/achter
 * (hoge Z = voorkant). Drempels zijn getuned en visueel geverifieerd via een
 * gelijkwaardige Blender-render van dezelfde classificatielogica — een kleine
 * naad op de zone-grens (bv. bij de schoudernaad) is net als bij een echt
 * kledingstuk en dus geen fout.
 */

const SLEEVE_X_FRACTION = 0.62
const HEM_Y_FRACTION = 0.15
const TARGET_HEIGHT = 1.09 // zelfde schaal als het vorige model, waar de camera/OrbitControls in JerseyScene.tsx op getuned zijn

export interface SplitResult {
  geometries: Record<ZoneId, THREE.BufferGeometry>
  height: number
}

function findAllMeshes(root: THREE.Object3D): THREE.Mesh[] {
  const found: THREE.Mesh[] = []
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) found.push(obj as THREE.Mesh)
  })
  return found
}

export function splitJerseyMesh(root: THREE.Object3D): SplitResult {
  root.updateMatrixWorld(true)
  const meshes = findAllMeshes(root)
  if (!meshes.length) throw new Error('Geen mesh gevonden in jersey-GLB')

  // Sommige GLB-exports (bv. Sketchfab) knippen één logische mesh op in
  // meerdere Object_N-nodes puur om onder de 16-bit index-limiet te blijven —
  // geen betekenisvolle onderverdeling. Alle meshes samenvoegen tot één
  // triangle-set vóór classificatie, zodat dat geen verschil maakt.
  const perMesh = meshes.map((mesh) => {
    const source = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry
    const posAttr = source.getAttribute('position')
    const normAttr = source.getAttribute('normal')
    const uvAttr = source.getAttribute('uv')
    const matrixWorld = mesh.matrixWorld
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrixWorld)

    const worldPositions = new Float32Array(posAttr.count * 3)
    const v = new THREE.Vector3()
    for (let i = 0; i < posAttr.count; i++) {
      v.fromBufferAttribute(posAttr, i).applyMatrix4(matrixWorld)
      worldPositions[i * 3] = v.x
      worldPositions[i * 3 + 1] = v.y
      worldPositions[i * 3 + 2] = v.z
    }
    const disposeSource = source !== mesh.geometry ? source : null
    return { posAttr, normAttr, uvAttr, worldPositions, normalMatrix, disposeSource }
  })

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity
  for (const { posAttr, worldPositions } of perMesh) {
    for (let i = 0; i < posAttr.count; i++) {
      const x = worldPositions[i * 3], y = worldPositions[i * 3 + 1], z = worldPositions[i * 3 + 2]
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
      if (z < minZ) minZ = z
      if (z > maxZ) maxZ = z
    }
  }
  const centerX = (minX + maxX) / 2
  const centerZ = (minZ + maxZ) / 2
  const halfWidthX = (maxX - minX) / 2
  const hemCutoffY = minY + HEM_Y_FRACTION * (maxY - minY)

  // Modellen komen niet allemaal in dezelfde eenheid aan (het vorige model
  // was al ~1.09 hoog in Three.js-units, dit model kan een heel andere raw
  // schaal hebben) — schalen naar een vaste hoogte houdt de camera/
  // OrbitControls-afstanden in JerseyScene.tsx ongewijzigd bruikbaar.
  const rawHeight = maxY - minY
  const scale = rawHeight > 0 ? TARGET_HEIGHT / rawHeight : 1

  const buckets: Record<ZoneId, { positions: number[]; normals: number[]; uvs: number[] }> = {
    front: { positions: [], normals: [], uvs: [] },
    back: { positions: [], normals: [], uvs: [] },
    sleeveLeft: { positions: [], normals: [], uvs: [] },
    sleeveRight: { positions: [], normals: [], uvs: [] },
  }

  const n = new THREE.Vector3()
  for (const { posAttr, normAttr, uvAttr, worldPositions, normalMatrix } of perMesh) {
    const triCount = posAttr.count / 3
    for (let t = 0; t < triCount; t++) {
      const i0 = t * 3, i1 = t * 3 + 1, i2 = t * 3 + 2
      const cx = (worldPositions[i0 * 3] + worldPositions[i1 * 3] + worldPositions[i2 * 3]) / 3
      const cy = (worldPositions[i0 * 3 + 1] + worldPositions[i1 * 3 + 1] + worldPositions[i2 * 3 + 1]) / 3
      const cz = (worldPositions[i0 * 3 + 2] + worldPositions[i1 * 3 + 2] + worldPositions[i2 * 3 + 2]) / 3

      const dx = cx - centerX
      let zone: ZoneId
      if (Math.abs(dx) > SLEEVE_X_FRACTION * halfWidthX && cy > hemCutoffY) {
        zone = dx < 0 ? 'sleeveLeft' : 'sleeveRight'
      } else {
        zone = cz > centerZ ? 'front' : 'back'
      }

      const bucket = buckets[zone]
      for (const i of [i0, i1, i2]) {
        // Gecentreerd op X/Z, vloer (min Y) op 0 — zelfde centreerconventie als
        // de handschoen-viewer, zodat OrbitControls-target (0, ~helft hoogte, 0) klopt.
        bucket.positions.push(
          (worldPositions[i * 3] - centerX) * scale,
          (worldPositions[i * 3 + 1] - minY) * scale,
          (worldPositions[i * 3 + 2] - centerZ) * scale,
        )
        if (normAttr) {
          n.fromBufferAttribute(normAttr, i).applyMatrix3(normalMatrix).normalize()
          bucket.normals.push(n.x, n.y, n.z)
        }
        if (uvAttr) {
          bucket.uvs.push(uvAttr.getX(i), uvAttr.getY(i))
        }
      }
    }
  }

  const geometries = {} as Record<ZoneId, THREE.BufferGeometry>
  ;(Object.keys(buckets) as ZoneId[]).forEach((zone) => {
    const g = new THREE.BufferGeometry()
    const b = buckets[zone]
    g.setAttribute('position', new THREE.Float32BufferAttribute(b.positions, 3))
    if (b.normals.length) g.setAttribute('normal', new THREE.Float32BufferAttribute(b.normals, 3))
    else g.computeVertexNormals()
    if (b.uvs.length) g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uvs, 2))
    geometries[zone] = g
  })

  perMesh.forEach(({ disposeSource }) => disposeSource?.dispose())

  return { geometries, height: rawHeight * scale }
}
