import type { ComponentType } from 'react';

export type Quality = 'high' | 'low';
export type SceneId = 'galaxy' | 'sdf' | 'pbr';

export interface SceneProps {
  quality: Quality;
}

export interface SceneDef {
  id: SceneId;
  name: string;
  hint: string;
  C: ComponentType<SceneProps>;
}
