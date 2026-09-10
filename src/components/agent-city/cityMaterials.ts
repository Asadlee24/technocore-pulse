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
      color: isLight ? 0xE2E8F0 : 0x142030, // Readable graphite/navy value (18-22% brightness)
      roughness: isLight ? 0.4 : 0.62,
      metalness: isLight ? 0.2 : 0.45,
      emissive: isLight ? 0xF8FAFC : 0x0A131F,
      emissiveIntensity: isLight ? 0.1 : 0.25
    }),
    facadeActive: new THREE.MeshStandardMaterial({
      color: isLight ? 0xFFFFFF : 0x1A2B40,
      roughness: isLight ? 0.3 : 0.55,
      metalness: isLight ? 0.4 : 0.5,
      emissive: isLight ? 0x0284C7 : 0x1B385A,
      emissiveIntensity: isLight ? 0.15 : 0.35
    }),
    facadeSurge: new THREE.MeshStandardMaterial({
      color: isLight ? 0xFFFFFF : 0x1D3650,
      roughness: isLight ? 0.3 : 0.5,
      metalness: isLight ? 0.5 : 0.55,
      emissive: isLight ? 0x10B981 : 0x134832,
      emissiveIntensity: isLight ? 0.25 : 0.4
    }),
    facadeCutaway: new THREE.MeshStandardMaterial({
      color: isLight ? 0xF1F5F9 : 0x101D2C,
      roughness: 0.2,
      metalness: 0.8,
      transparent: true,
      opacity: isLight ? 0.22 : 0.2,
      depthWrite: false
    }),
    windowEmissive: new THREE.MeshBasicMaterial({
      color: isLight ? 0x0284C7 : 0xFDE68A, // Warm gold window light
      transparent: true,
      opacity: 0.85
    }),
    windowSigned: new THREE.MeshBasicMaterial({
      color: isLight ? 0x10B981 : 0x38BDF8, // Soft cyan
      transparent: true,
      opacity: 0.95
    }),
    edgeLine: new THREE.LineBasicMaterial({
      color: isLight ? 0x0284C7 : 0x2A405D, // Subtly readable structural silhouette
      transparent: true,
      opacity: isLight ? 0.85 : 0.6
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
