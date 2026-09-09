import * as THREE from 'three';

export interface CityMaterials {
  facadeBase: THREE.MeshStandardMaterial;
  facadeActive: THREE.MeshStandardMaterial;
  facadeSurge: THREE.MeshStandardMaterial;
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

export function createCityMaterials(): CityMaterials {
  return {
    facadeBase: new THREE.MeshStandardMaterial({
      color: 0x0B1320,
      roughness: 0.85,
      metalness: 0.35,
      emissive: 0x050A12,
      emissiveIntensity: 0.2
    }),
    facadeActive: new THREE.MeshStandardMaterial({
      color: 0x101A2A,
      roughness: 0.7,
      metalness: 0.5,
      emissive: 0x36D7E7,
      emissiveIntensity: 0.15
    }),
    facadeSurge: new THREE.MeshStandardMaterial({
      color: 0x152238,
      roughness: 0.6,
      metalness: 0.6,
      emissive: 0x2FD27F,
      emissiveIntensity: 0.25
    }),
    windowEmissive: new THREE.MeshBasicMaterial({
      color: 0x36D7E7,
      transparent: true,
      opacity: 0.85
    }),
    windowSigned: new THREE.MeshBasicMaterial({
      color: 0x2FD27F,
      transparent: true,
      opacity: 0.95
    }),
    edgeLine: new THREE.LineBasicMaterial({
      color: 0x1B2A3D,
      transparent: true,
      opacity: 0.6
    }),
    groundGrid: new THREE.LineBasicMaterial({
      color: 0x1B2A3D,
      transparent: true,
      opacity: 0.25
    }),
    roadMaterial: new THREE.LineBasicMaterial({
      color: 0x4DA3FF,
      transparent: true,
      opacity: 0.4
    }),
    beaconGlow: new THREE.MeshBasicMaterial({
      color: 0x36D7E7,
      transparent: true,
      opacity: 0.9
    }),
    coreColumn: new THREE.MeshStandardMaterial({
      color: 0x070E18,
      roughness: 0.4,
      metalness: 0.8,
      emissive: 0x36D7E7,
      emissiveIntensity: 0.4
    }),
    coreRing: new THREE.MeshBasicMaterial({
      color: 0x36D7E7,
      transparent: true,
      opacity: 0.75,
      wireframe: true
    }),
    pulseWave: new THREE.MeshBasicMaterial({
      color: 0x36D7E7,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    }),
    agentParticle: new THREE.MeshBasicMaterial({
      color: 0x2FD27F,
      transparent: true,
      opacity: 0.9
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
