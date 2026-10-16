import { useMemo } from 'react';
import { Vector2 } from 'three';
import { EffectComposer, Bloom, ChromaticAberration, Vignette, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

export default function Effects({ quality, scene }) {
  const offset = useMemo(() => new Vector2(0.0012, 0.0012), []);
  const zero = useMemo(() => new Vector2(0, 0), []);
  const high = quality === 'high';
  const bloom = scene === 'galaxy' ? 1.4 : scene === 'sdf' ? 0.9 : 0.6;
  return (
    <EffectComposer multisampling={high && scene === 'pbr' ? 4 : 0} disableNormalPass>
      <Bloom mipmapBlur intensity={bloom} luminanceThreshold={scene === 'galaxy' ? 0.05 : 0.6} luminanceSmoothing={0.3} levels={high ? 8 : 5} />
      <ChromaticAberration offset={high ? offset : zero} radialModulation modulationOffset={0.3} />
      <Noise opacity={0.035} blendFunction={BlendFunction.OVERLAY} />
      <Vignette eskil={false} offset={0.25} darkness={0.75} />
    </EffectComposer>
  );
}
