import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { SceneProps } from '../types';

interface GalaxyUniforms {
  [uniform: string]: THREE.IUniform;
  uTime: THREE.IUniform<number>;
  uAttract: THREE.IUniform<THREE.Vector3>;
  uPull: THREE.IUniform<number>;
  uSize: THREE.IUniform<number>;
}

const vert: string = /* glsl */ `
uniform float uTime; uniform vec3 uAttract; uniform float uPull; uniform float uSize;
attribute vec3 aSeed; attribute vec3 aColor;
varying vec3 vColor; varying float vGlow;
vec3 hash3(vec3 p){ p = fract(p * vec3(443.897, 441.423, 437.195)); p += dot(p, p.yxz + 19.19); return fract((p.xxy + p.yxx) * p.zyx); }
// cheap divergence-free-ish swirl from analytic noise gradients
vec3 curl(vec3 p){
  float t = uTime * 0.15;
  return vec3(sin(p.y * 1.3 + t) + cos(p.z * 1.7 - t), sin(p.z * 1.1 + t * 1.3) + cos(p.x * 1.5), sin(p.x * 1.2 - t) + cos(p.y * 1.9 + t)) * 0.5;
}
void main(){
  vec3 p = position;
  float r = length(p.xz);
  float ang = uTime * (0.9 / (0.6 + r)) + aSeed.x * 0.0;   // differential rotation
  float c = cos(ang), s = sin(ang);
  p.xz = mat2(c, -s, s, c) * p.xz;
  p += curl(p * 0.6 + aSeed) * (0.12 + 0.05 * r);
  vec3 d = uAttract - p; float dist = length(d);
  float f = uPull * 2.2 / (1.0 + dist * dist * 1.6);
  p += normalize(d + 1e-4) * min(f, dist * 0.9);
  // swirl around attractor
  p += cross(normalize(d + 1e-4), vec3(0.0, 1.0, 0.0)) * f * 0.6;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float tw = 0.65 + 0.35 * sin(uTime * 3.0 + aSeed.y * 40.0);
  gl_PointSize = uSize * (0.4 + aSeed.z * 1.6) * tw / -mv.z;
  vGlow = f;
  vColor = aColor * (1.0 + f * 1.5);
}`;
const frag: string = /* glsl */ `
varying vec3 vColor; varying float vGlow;
void main(){
  vec2 uv = gl_PointCoord - 0.5; float d = length(uv);
  float a = smoothstep(0.5, 0.0, d); a *= a;
  gl_FragColor = vec4(vColor * a, a);
}`;

export default function Galaxy({ quality }: SceneProps): JSX.Element {
  const count: number = quality === 'high' ? 120000 : 35000;
  const mat = useRef<THREE.ShaderMaterial>(null);
  const { gl, camera, pointer, raycaster } = useThree();
  const geo = useMemo<THREE.BufferGeometry>(() => {
    const pos = new Float32Array(count * 3),
      seed = new Float32Array(count * 3),
      col = new Float32Array(count * 3);
    const inner = new THREE.Color('#ffb36b'),
      mid = new THREE.Color('#ff3d9a'),
      outer = new THREE.Color('#3d6bff'),
      tmp = new THREE.Color();
    const arms = 4,
      radius = 7;
    for (let i = 0; i < count; i++) {
      const r = Math.pow(Math.random(), 1.6) * radius;
      const branch = ((i % arms) / arms) * Math.PI * 2;
      const spin = r * 0.9;
      const rnd = (): number => Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * (0.25 + r * 0.12);
      pos[i * 3] = Math.cos(branch + spin) * r + rnd();
      pos[i * 3 + 1] = rnd() * 0.6 * Math.exp(-r * 0.2);
      pos[i * 3 + 2] = Math.sin(branch + spin) * r + rnd();
      seed[i * 3] = Math.random();
      seed[i * 3 + 1] = Math.random();
      seed[i * 3 + 2] = Math.random();
      const t = r / radius;
      tmp
        .copy(inner)
        .lerp(mid, Math.min(1, t * 2))
        .lerp(outer, Math.max(0, t * 2 - 1));
      col[i * 3] = tmp.r;
      col[i * 3 + 1] = tmp.g;
      col[i * 3 + 2] = tmp.b;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    return g;
  }, [count]);
  const uniforms = useMemo<GalaxyUniforms>(
    () => ({
      uTime: { value: 0 },
      uAttract: { value: new THREE.Vector3(99, 0, 99) },
      uPull: { value: 0 },
      uSize: { value: 60 },
    }),
    [],
  );
  const plane = useMemo<THREE.Plane>(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const hit = useMemo<THREE.Vector3>(() => new THREE.Vector3(), []);
  const active = useRef<boolean>(false);
  useFrame((_state, dt: number) => {
    const u = uniforms;
    u.uTime.value += dt;
    u.uSize.value = 55 * gl.getPixelRatio();
    raycaster.setFromCamera(pointer, camera);
    if (raycaster.ray.intersectPlane(plane, hit) && hit.length() < 12) {
      u.uAttract.value.lerp(hit, 0.15);
      u.uPull.value += ((active.current ? 1 : 0.55) - u.uPull.value) * 0.08;
    } else u.uPull.value *= 0.95;
  });
  return (
    <>
      <color attach="background" args={['#020108']} />
      <points
        geometry={geo}
        frustumCulled={false}
        onPointerDown={(): void => {
          active.current = true;
        }}
        onPointerUp={(): void => {
          active.current = false;
        }}
      >
        <shaderMaterial
          ref={mat}
          vertexShader={vert}
          fragmentShader={frag}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <OrbitControls
        enablePan={false}
        minDistance={3}
        maxDistance={20}
        autoRotate
        autoRotateSpeed={0.3}
        enableDamping
      />
    </>
  );
}
