import { Component, Suspense, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import Galaxy from './scenes/Galaxy.jsx';
import Raymarch from './scenes/Raymarch.jsx';
import Showcase from './scenes/Showcase.jsx';
import Effects from './Effects.jsx';

const SCENES = [
  { id: 'galaxy', name: 'Galaxy', hint: 'Drag to orbit · move the pointer to attract stars', C: Galaxy },
  { id: 'sdf', name: 'Raymarch', hint: 'Drag to orbit the raymarched SDF metaballs', C: Raymarch },
  { id: 'pbr', name: 'Glass & Chrome', hint: 'Drag to orbit · PBR, transmission & reflections', C: Showcase },
];

const isMobile = () => typeof window !== 'undefined' &&
  (window.matchMedia?.('(pointer: coarse)').matches || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || Math.min(innerWidth, innerHeight) < 600);

function webglOK() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

function Fps({ out }) {
  const acc = useRef({ t: 0, n: 0 });
  useFrame((_, dt) => {
    const a = acc.current; a.t += dt; a.n++;
    if (a.t >= 0.5) { if (out.current) out.current.textContent = `${Math.round(a.n / a.t)} FPS`; a.t = 0; a.n = 0; }
  });
  return null;
}

class Boundary extends Component {
  state = { err: null };
  static getDerivedStateFromError(err) { return { err }; }
  render() { return this.state.err ? <div className="fallback"><div><h2>Graphics unavailable</h2><p>{String(this.state.err.message || this.state.err)}</p></div></div> : this.props.children; }
}

export default function App() {
  const mobile = useMemo(isMobile, []);
  const [scene, setScene] = useState(0);
  const [quality, setQuality] = useState(mobile ? 'low' : 'high');
  const fpsRef = useRef(null);
  const supported = useMemo(webglOK, []);
  const high = quality === 'high';
  const S = SCENES[scene];

  if (!supported) return <div className="fallback"><div><h2>WebGL is not available</h2><p>This demo needs a browser with WebGL enabled.</p></div></div>;

  return (
    <Boundary>
      <Canvas key={S.id + quality} dpr={high ? [1, 2] : [0.6, 1]} gl={{ antialias: false, powerPreference: 'high-performance', alpha: false }}
        camera={{ position: [0, 4, 9], fov: 50, near: 0.1, far: 200 }}>
        <PerformanceMonitor onDecline={() => setQuality('low')} flipflops={1} />
        <Suspense fallback={null}>
          <S.C quality={quality} />
          <Effects quality={quality} scene={S.id} />
        </Suspense>
        <Fps out={fpsRef} />
      </Canvas>
      <div className="top">
        <div className="title">Graphics Demo<small>{S.hint}</small></div>
        <div className="fps"><span ref={fpsRef}>-- FPS</span><br />{high ? 'High' : 'Low'} quality</div>
      </div>
      <nav className="ui" data-testid="ui">
        {SCENES.map((s, i) => <button key={s.id} className={i === scene ? 'active' : ''} onClick={() => setScene(i)}>{s.name}</button>)}
        <span className="sep" />
        <button className={high ? 'active' : ''} onClick={() => setQuality(high ? 'low' : 'high')}>{high ? 'HQ' : 'LQ'}</button>
      </nav>
    </Boundary>
  );
}
