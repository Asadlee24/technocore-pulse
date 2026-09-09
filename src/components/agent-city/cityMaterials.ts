import * as THREE from 'three';

export interface CityMaterials {
  facadeBase: THREE.MeshStandardMaterial;
  facadeActive: THREE.MeshStandardMaterial;
  facadeSurge: THREE.MeshStandardMaterial;
  facadeCutaway: THREE.MeshStandardMaterial;
  windowEmissive: THREE.MeshBasicMaterial;
  windowSigned: THREE.MeshBasicMaterial;
  edgeLine: THREE.LineBasicMaterial;
  groundGrid: THREE.LineBasicMaterial;
  roadMaterial: THREE.LineBasicMaterial;
  beaconGlow: THREE.MeshBasicMaterial;
  coreColumn: THREE.MeshStandardMaterial;
  coreRing: THREE.MeshBasicMaterial;
  pulseWave: THREE.MeshBasicMaterial;
  agentParticle: THREE.MeshBasicMaterial;
}

export function createCityMaterials(theme: 'dark' | 'light' = 'dark'): CityMaterials {
  const isLight = theme === 'light';

  return {
    facadeBase: new THREE.MeshStandardMaterial({
      color: isLight ? 0xE2E8F0 : 0x16263D,
      roughness: isLight ? 0.4 : 0.45,
      metalness: isLight ? 0.2 : 0.6,
      emissive: isLight ? 0xF8FAFC : 0x0F1B2E,
      emissiveIntensity: isLight ? 0.1 : 0.35
    }),
    facadeActive: new THREE.MeshStandardMaterial({
      color: isLight ? 0xFFFFFF : 0x1E3554,
      roughness: isLight ? 0.3 : 0.35,
      metalness: isLight ? 0.4 : 0.65,
      emissive: isLight ? 0x0284C7 : 0x36D7E7,
      emissiveIntensity: isLight ? 0.15 : 0.25
    }),
    facadeSurge: new THREE.MeshStandardMaterial({
      color: isLight ? 0xFFFFFF : 0x234166,
      roughness: isLight ? 0.3 : 0.3,
      metalness: isLight ? 0.5 : 0.7,
      emissive: isLight ? 0x10B981 : 0x2FD27F,
      emissiveIntensity: isLight ? 0.25 : 0.35
    }),
    facadeCutaway: new THREE.MeshStandardMaterial({
      color: isLight ? 0xF1F5F9 : 0x0E1A2C,
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: isLight ? 0.22 : 0.18,
      depthWrite: false
    }),
    windowEmissive: new THREE.MeshBasicMaterial({
      color: isLight ? 0x0284C7 : 0x36D7E7,
      transparent: true,
      opacity: 0.85
    }),
    windowSigned: new THREE.MeshBasicMaterial({
      color: isLight ? 0x10B981 : 0x2FD27F,
      transparent: true,
      opacity: 0.95
    }),
    edgeLine: new THREE.LineBasicMaterial({
      color: isLight ? 0x0284C7 : 0x38BDF8,
      transparent: true,
      opacity: isLight ? 0.85 : 0.75
    }),
    groundGrid: new THREE.LineBasicMaterial({
      color: isLight ? 0xCBD5E1 : 0x1B2A3D,
      transparent: true,
      opacity: isLight ? 0.5 : 0.25
    }),
    roadMaterial: new THREE.LineBasicMaterial({
      color: isLight ? 0x0284C7 : 0x4DA3FF,
      transparent: true,
      opacity: 0.4
    }),
    beaconGlow: new THREE.MeshBasicMaterial({
      color: isLight ? 0x0284C7 : 0x36D7E7,
      transparent: true,
      opacity: 0.9
    }),
    coreColumn: new THREE.MeshStandardMaterial({
      color: isLight ? 0xF8FAFC : 0x070E18,
      roughness: 0.3,
      metalness: 0.8,
      emissive: isLight ? 0x0284C7 : 0x36D7E7,
      emissiveIntensity: isLight ? 0.35 : 0.4
    }),
    coreRing: new THREE.MeshBasicMaterial({
      color: isLight ? 0x0284C7 : 0x36D7E7,
      transparent: true,
      opacity: 0.85,
      wireframe: true
    }),
    pulseWave: new THREE.MeshBasicMaterial({
      color: isLight ? 0x0284C7 : 0x36D7E7,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    }),
    agentParticle: new THREE.MeshBasicMaterial({
      color: isLight ? 0x0284C7 : 0x36D7E7
    })
  };
}

export function disposeCityMaterials(materials: CityMaterials) {
  Object.values(materials).forEach((mat) => {
    if (mat && typeof mat.dispose === 'function') {
      mat.dispose();
    }
  });
}
