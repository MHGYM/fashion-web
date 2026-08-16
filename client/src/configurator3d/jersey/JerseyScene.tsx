import { Suspense, useEffect, useRef } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import * as THREE from 'three'
import JerseyModel from './JerseyModel'
import type { ZoneId } from './zones'
import type { ZoneState } from '../shared/types'

const TARGET_Y = 0.45
const PRESETS: Record<'front' | 'back', THREE.Vector3> = {
  front: new THREE.Vector3(0, TARGET_Y + 0.05, 1.9),
  back: new THREE.Vector3(0, TARGET_Y + 0.05, -1.9),
}

function CameraRig({ side }: { side: 'front' | 'back' }) {
  const { camera, controls } = useThree() as any
  const animRef = useRef<{ from: THREE.Vector3; to: THREE.Vector3; t0: number } | null>(null)

  useEffect(() => {
    animRef.current = { from: camera.position.clone(), to: PRESETS[side], t0: performance.now() }
  }, [side, camera])

  useFrame(() => {
    const anim = animRef.current
    if (!anim) return
    const t = Math.min(1, (performance.now() - anim.t0) / 600)
    const eased = 1 - Math.pow(1 - t, 3)
    camera.position.lerpVectors(anim.from, anim.to, eased)
    if (controls) controls.update()
    if (t >= 1) animRef.current = null
  })

  return null
}

interface JerseySceneProps {
  zoneStates: Record<ZoneId, ZoneState>
  side: 'front' | 'back'
}

export default function JerseyScene({ zoneStates, side }: JerseySceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 0.5, 1.9], fov: 32, near: 0.01, far: 100 }}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      dpr={[1, 2]}
      style={{ width: '100%', height: '100%' }}
    >
      <Suspense fallback={null}>
        <JerseyModel zoneStates={zoneStates} />
        <Environment preset="city" environmentIntensity={0.4} />
      </Suspense>
      <directionalLight position={[3, 4, 3]} intensity={2.2} />
      <directionalLight position={[-4, 1.5, -3]} intensity={0.9} color="#9db8ff" />
      <ambientLight intensity={0.4} />
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={0.6}
        maxDistance={5}
        target={[0, TARGET_Y, 0]}
      />
      <CameraRig side={side} />
    </Canvas>
  )
}
