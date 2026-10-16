# Graphics Demo

An interactive, fully client-side WebGL demo built with Vite, React, three.js, @react-three/fiber, drei and postprocessing.

**Live:** https://savannahio.github.io/graphics-demo/

## Scenes

- **Galaxy**: 120k GPU-animated particles (35k on low quality) with differential rotation, curl-style swirl, and a pointer attractor (press and hold to pull harder).
- **Raymarch**: a full-screen GLSL SDF scene with smooth-min metaballs and a gyroid surface, soft shadows, AO, reflections, and a fog/sky model. Drag to orbit, scroll to zoom.
- **Glass & Chrome**: a PBR showcase with a transmission-glass torus knot, metal/clearcoat orbs, a reflective floor and contact shadows, all lit by a procedural Lightformer environment.

Post effects: bloom (mipmap), chromatic aberration, film grain, vignette.
UI: scene switcher, FPS readout, HQ/LQ quality toggle (it drops to low automatically on mobile or when performance declines). Touch input is supported.

The app loads no external runtime assets; everything is generated procedurally.

## Develop

```bash
npm ci
npm run dev
npm run build   # outputs dist/ (base: /graphics-demo/)
```

Every push to `main` deploys to GitHub Pages through `.github/workflows/deploy.yml`.
