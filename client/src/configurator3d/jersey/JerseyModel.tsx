import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { splitJerseyMesh } from './meshSplit'
import { ZONE_IDS, type ZoneId } from './zones'
import { paintZone } from '../shared/paintZone'
import type { ZoneState } from '../shared/types'

const MODEL_URL = '/models/jersey-base.glb'
const TEX_SIZE = 1024

interface JerseyModelProps {
  zoneStates: Record<ZoneId, ZoneState>
}

// Matte receptuur uit de handschoen-configurator (scene3d.js) — voorkomt
// glansreflecties die geüploade logo's/tekst onleesbaar maken.
const MATERIAL_DEFAULTS = { roughness: 0.78, metalness: 0, clearcoat: 0, clearcoatRoughness: 1, envMapIntensity: 0.4 }

export default function JerseyModel({ zoneStates }: JerseyModelProps) {
  const { scene } = useGLTF(MODEL_URL)

  const geometries = useMemo(() => {
    const clone = scene.clone(true)
    return splitJerseyMesh(clone).geometries
  }, [scene])

  const canvases = useMemo(() => {
    const map = {} as Record<ZoneId, { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; texture: THREE.CanvasTexture }>
    ZONE_IDS.forEach((zone) => {
      const canvas = document.createElement('canvas')
      canvas.width = TEX_SIZE
      canvas.height = TEX_SIZE
      const ctx = canvas.getContext('2d')!
      const texture = new THREE.CanvasTexture(canvas)
      texture.colorSpace = THREE.SRGBColorSpace
      texture.flipY = false
      map[zone] = { canvas, ctx, texture }
    })
    return map
  }, [])

  useEffect(() => {
    ZONE_IDS.forEach((zone) => {
      const c = canvases[zone]
      paintZone(c.ctx, TEX_SIZE, TEX_SIZE, zoneStates[zone])
      c.texture.needsUpdate = true
    })
  }, [zoneStates, canvases])

  useEffect(() => () => {
    ZONE_IDS.forEach((zone) => canvases[zone].texture.dispose())
  }, [canvases])

  return (
    <group>
      {ZONE_IDS.map((zone) => (
        <mesh key={zone} geometry={geometries[zone]} castShadow receiveShadow>
          <meshPhysicalMaterial map={canvases[zone].texture} {...MATERIAL_DEFAULTS} />
        </mesh>
      ))}
    </group>
  )
}

useGLTF.preload(MODEL_URL)
