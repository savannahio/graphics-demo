import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  OrbitControls,
  Environment,
  Lightformer,
  MeshTransmissionMaterial,
  ContactShadows,
  Float,
  MeshReflectorMaterial,
} from '@react-three/drei';
import * as THREE from 'three';
import type { SceneProps } from '../types';

interface KnotProps {
  high: boolean;
}

interface OrbDef {
  /** color */
  c: string;
  /** metalness */
  m: number;
  /** roughness */
  r: number;
  /** position */
  p: [number, number, number];
  /** sphere radius */
  s: number;
}

function Knot({ high }: KnotProps): JSX.Element {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_state, dt: number) => {
    if (!ref.current) return;
    ref.current.rotation.x += dt * 0.15;
    ref.current.rotation.y += dt * 0.25;
  });
  return (
    <mesh ref={ref} position={[0, 1.4, 0]} castShadow>
      <torusKnotGeometry args={[0.9, 0.32, high ? 300 : 140, high ? 48 : 24]} />
      <MeshTransmissionMaterial
        samples={high ? 8 : 3}
        resolution={high ? 1024 : 256}
        thickness={0.6}
        roughness={0.05}
        transmission={1}
        ior={1.4}
        chromaticAberration={0.08}
        anisotropy={0.2}
        distortion={0.3}
        distortionScale={0.4}
        temporalDistortion={0.15}
        backside={high}
        backsideThickness={0.3}
        color="#e9f1ff"
      />
    </mesh>
  );
}

function Orbs(): JSX.Element {
  const group = useRef<THREE.Group>(null);
  const items = useMemo<OrbDef[]>(
    () => [
      { c: '#ffd27a', m: 1, r: 0.12, p: [-2.6, 0.55, 0.8], s: 0.55 },
      { c: '#ffffff', m: 1, r: 0.02, p: [2.4, 0.5, -0.6], s: 0.5 },
      { c: '#ff3d7f', m: 0.2, r: 0.25, p: [1.6, 0.35, 1.9], s: 0.35 },
      { c: '#55e0ff', m: 0.9, r: 0.35, p: [-1.4, 0.3, -2.0], s: 0.3 },
    ],
    [],
  );
  useFrame(({ clock }) => {
    if (group.current) group.current.rotation.y = clock.elapsedTime * 0.1;
  });
  return (
    <group ref={group}>
      {items.map((o, i) => (
        <Float key={i} speed={1.5} rotationIntensity={0} floatIntensity={0.6} floatingRange={[0, 0.3]}>
          <mesh position={o.p}>
            <sphereGeometry args={[o.s, 64, 64]} />
            <meshPhysicalMaterial
              color={o.c}
              metalness={o.m}
              roughness={o.r}
              clearcoat={1}
              clearcoatRoughness={0.05}
              envMapIntensity={1.2}
            />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

function Rig(): JSX.Element {
  return (
    <Environment resolution={256} frames={1}>
      {/* Procedural studio lighting: no HDR files fetched at runtime */}
      <Lightformer form="rect" intensity={4} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[10, 4, 1]} />
      <Lightformer
        form="rect"
        intensity={2.5}
        color="#ff4fa3"
        position={[-6, 1, -2]}
        rotation-y={Math.PI / 2}
        scale={[8, 2, 1]}
      />
      <Lightformer
        form="rect"
        intensity={2.5}
        color="#4fb5ff"
        position={[6, 1, 2]}
        rotation-y={-Math.PI / 2}
        scale={[8, 2, 1]}
      />
      <Lightformer form="ring" intensity={3} color="#ffffff" position={[0, 2, -6]} scale={3} />
      <Lightformer form="circle" intensity={1.5} color="#ffd27a" position={[3, 3, 6]} scale={2} />
    </Environment>
  );
}

export default function Showcase({ quality }: SceneProps): JSX.Element {
  const high = quality === 'high';
  return (
    <>
      <color attach="background" args={['#0b0b12']} />
      <fog attach="fog" args={['#0b0b12', 10, 28]} />
      <Rig />
      <Knot high={high} />
      <Orbs />
      {high ? (
        <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
          <planeGeometry args={[60, 60]} />
          <MeshReflectorMaterial
            blur={[300, 80]}
            resolution={1024}
            mixBlur={1}
            mixStrength={2.5}
            roughness={0.85}
            depthScale={1.1}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.4}
            color="#101016"
            metalness={0.6}
            mirror={0.6}
          />
        </mesh>
      ) : (
        <mesh rotation-x={-Math.PI / 2}>
          <planeGeometry args={[60, 60]} />
          <meshStandardMaterial color="#101016" roughness={0.4} metalness={0.5} />
        </mesh>
      )}
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.7}
        scale={14}
        blur={2.4}
        far={4}
        resolution={high ? 1024 : 256}
      />
      <OrbitControls
        target={[0, 1, 0]}
        enablePan={false}
        minDistance={3.5}
        maxDistance={14}
        maxPolarAngle={Math.PI / 2.05}
        autoRotate
        autoRotateSpeed={0.5}
        enableDamping
      />
    </>
  );
}
