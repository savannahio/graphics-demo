import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const vert = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const frag = (STEPS) => /* glsl */`
precision highp float;
uniform float uTime; uniform vec2 uRes; uniform vec2 uRot; uniform float uZoom;
varying vec2 vUv;
#define STEPS ${STEPS}
float smin(float a, float b, float k){ float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float gyroid(vec3 p){ return dot(sin(p), cos(p.yzx)); }
float map(vec3 p){
  float t = uTime * 0.6;
  float d = length(p) - 1.1 + 0.08 * gyroid(p * 6.0 + t);
  for (int i = 0; i < 6; i++){
    float fi = float(i);
    vec3 c = vec3(sin(t * 0.9 + fi * 1.7), sin(t * 1.3 + fi * 2.3) * 0.8, cos(t * 0.7 + fi * 1.1)) * 1.7;
    d = smin(d, length(p - c) - (0.35 + 0.12 * sin(fi + t)), 0.6);
  }
  float floorD = p.y + 2.2 + 0.05 * sin(p.x * 2.0 + t) * sin(p.z * 2.0);
  return min(d, floorD);
}
vec3 normal(vec3 p){ vec2 e = vec2(0.0015, 0.0); return normalize(vec3(map(p + e.xyy) - map(p - e.xyy), map(p + e.yxy) - map(p - e.yxy), map(p + e.yyx) - map(p - e.yyx))); }
float shadow(vec3 ro, vec3 rd){ float res = 1.0, t = 0.05; for (int i = 0; i < 32; i++){ float h = map(ro + rd * t); res = min(res, 10.0 * h / t); t += clamp(h, 0.02, 0.3); if (h < 0.001 || t > 8.0) break; } return clamp(res, 0.0, 1.0); }
float ao(vec3 p, vec3 n){ float o = 0.0, s = 1.0; for (int i = 1; i <= 5; i++){ float h = 0.06 * float(i); o += (h - map(p + n * h)) * s; s *= 0.7; } return clamp(1.0 - 2.5 * o, 0.0, 1.0); }
vec3 sky(vec3 rd){ return mix(vec3(0.02, 0.01, 0.05), vec3(0.15, 0.05, 0.3), smoothstep(-0.2, 0.8, rd.y)) + vec3(1.0, 0.5, 0.2) * pow(max(dot(rd, normalize(vec3(0.6, 0.4, -0.5))), 0.0), 24.0); }
vec3 pal(float t){ return 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + t)); }
float march(vec3 ro, vec3 rd){ float t = 0.0; for (int i = 0; i < STEPS; i++){ float h = map(ro + rd * t); if (h < 0.0008 * t) break; t += h * 0.9; if (t > 30.0) break; } return t; }
vec3 shade(vec3 ro, vec3 rd, float t, out vec3 p, out vec3 n, out bool hit){
  hit = t < 30.0; if (!hit) return sky(rd);
  p = ro + rd * t; n = normal(p);
  vec3 L = normalize(vec3(0.6, 0.8, -0.4));
  float dif = max(dot(n, L), 0.0) * shadow(p + n * 0.01, L);
  float fre = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
  bool isFloor = p.y < -2.0;
  vec3 base = isFloor ? vec3(0.05) * (0.6 + 0.4 * step(0.0, sin(p.x * 3.0) * sin(p.z * 3.0))) : pal(dot(n, vec3(0.3, 0.6, 0.2)) + uTime * 0.05 + fre * 0.6);
  float a = ao(p, n);
  float spec = pow(max(dot(reflect(-L, n), -rd), 0.0), 64.0);
  vec3 col = base * (0.15 + 1.1 * dif) * a + spec * 1.5 + fre * pal(uTime * 0.1 + 0.5) * 0.8 * a;
  return mix(col, sky(rd), 1.0 - exp(-0.004 * t * t));
}
void main(){
  vec2 uv = (vUv * 2.0 - 1.0) * vec2(uRes.x / uRes.y, 1.0);
  vec3 ro = vec3(0.0, 0.6, uZoom);
  ro.yz *= rot(uRot.y); ro.xz *= rot(uRot.x);
  vec3 ta = vec3(0.0, -0.2, 0.0);
  vec3 f = normalize(ta - ro), r = normalize(cross(vec3(0.0, 1.0, 0.0), f)), u = cross(f, r);
  vec3 rd = normalize(f * 1.6 + uv.x * r + uv.y * u);
  vec3 p, n; bool hit;
  float t = march(ro, rd);
  vec3 col = shade(ro, rd, t, p, n, hit);
  if (hit) { // one reflection bounce
    vec3 rr = reflect(rd, n); vec3 p2, n2; bool h2;
    float t2 = march(p + n * 0.02, rr);
    vec3 rc = shade(p + n * 0.02, rr, t2, p2, n2, h2);
    float fre = pow(1.0 - max(dot(n, -rd), 0.0), 4.0);
    col = mix(col, rc, (p.y < -2.0 ? 0.35 : 0.15) + 0.5 * fre);
  }
  col = col / (1.0 + col * 0.6);           // soft tonemap
  col = pow(col, vec3(0.4545));
  gl_FragColor = vec4(col, 1.0);
}`;

export default function Raymarch({ quality }) {
  const { size, gl } = useThree();
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uRot: { value: new THREE.Vector2(0.5, 0.25) }, uZoom: { value: -6.5 } }), []);
  const fragment = useMemo(() => frag(quality === 'high' ? 140 : 70), [quality]);
  const drag = useRef(null), target = useRef(new THREE.Vector2(0.5, 0.25));
  useFrame((_, dt) => {
    uniforms.uTime.value += dt;
    uniforms.uRes.value.set(size.width, size.height);
    if (!drag.current) target.current.x += dt * 0.08;
    uniforms.uRot.value.lerp(target.current, 0.08);
  });
  useEffect(() => {
    const el = gl.domElement;
    const down = e => { drag.current = { x: e.clientX, y: e.clientY }; };
    const move = e => {
      if (!drag.current) return;
      target.current.x += (e.clientX - drag.current.x) * 0.006;
      target.current.y = Math.max(-0.3, Math.min(1.2, target.current.y + (e.clientY - drag.current.y) * 0.004));
      drag.current = { x: e.clientX, y: e.clientY };
    };
    const up = () => (drag.current = null);
    const wheel = e => { uniforms.uZoom.value = Math.max(-12, Math.min(-3.5, uniforms.uZoom.value - e.deltaY * 0.004)); };
    el.addEventListener('pointerdown', down); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    el.addEventListener('wheel', wheel, { passive: true });
    return () => { el.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); el.removeEventListener('wheel', wheel); };
  }, [gl, uniforms]);
  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial key={quality} vertexShader={vert} fragmentShader={fragment} uniforms={uniforms} depthTest={false} depthWrite={false} />
    </mesh>
  );
}
