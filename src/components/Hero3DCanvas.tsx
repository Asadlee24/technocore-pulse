import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Hero3DCanvasProps {
  onPulseTrigger?: () => void;
}

export const Hero3DCanvas: React.FC<Hero3DCanvasProps> = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050A12, 0.022);

    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 32;
    camera.position.y = 4;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // Particle Lattice Geometry
    const particleCount = 450;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const scales = new Float32Array(particleCount);

    const cyanColor = new THREE.Color(0x36D7E7);
    const blueColor = new THREE.Color(0x4DA3FF);
    const amberColor = new THREE.Color(0xF0A824);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const radius = 18 + Math.random() * 20;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = (radius * Math.sin(phi) * Math.sin(theta)) * 0.45;
      positions[i3 + 2] = radius * Math.cos(phi);

      // Color assignment
      const rand = Math.random();
      const c = rand > 0.7 ? cyanColor : rand > 0.35 ? blueColor : amberColor;
      colors[i3] = c.r;
      colors[i3 + 1] = c.g;
      colors[i3 + 2] = c.b;

      scales[i] = Math.random() * 2 + 1;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Particle Material
    const pMaterial = new THREE.PointsMaterial({
      size: 0.55,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geometry, pMaterial);
    scene.add(particles);

    // Dynamic Connecting Lines
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x1B2A3D,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending
    });

    const lineGeo = new THREE.BufferGeometry();
    const linePositions = new Float32Array(180 * 2 * 3);
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    const lineSegments = new THREE.LineSegments(lineGeo, lineMaterial);
    scene.add(lineSegments);

    // Glowing Central Probe Ring
    const ringGeo = new THREE.RingGeometry(8, 8.15, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x36D7E7,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2.3;
    scene.add(ringMesh);

    // Outer Secondary Ring
    const outerRingGeo = new THREE.RingGeometry(14, 14.1, 64);
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: 0x4DA3FF,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending
    });
    const outerRingMesh = new THREE.Mesh(outerRingGeo, outerRingMat);
    outerRingMesh.rotation.x = Math.PI / 2.3;
    scene.add(outerRingMesh);

    // Mouse Tracking for Interactive Parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      mouseX = (x / rect.width - 0.5) * 2;
      mouseY = -(y / rect.height - 0.5) * 2;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Handle Resize
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Smooth camera parallax
      targetX += (mouseX * 4 - targetX) * 0.05;
      targetY += (mouseY * 2 - targetY) * 0.05;
      camera.position.x = targetX;
      camera.position.y = 4 + targetY;
      camera.lookAt(0, 0, 0);

      // Rotate particle cloud
      particles.rotation.y = elapsedTime * 0.035;
      particles.rotation.x = Math.sin(elapsedTime * 0.02) * 0.08;

      // Pulse rings
      ringMesh.rotation.z = elapsedTime * 0.06;
      ringMesh.scale.setScalar(1 + Math.sin(elapsedTime * 1.5) * 0.05);

      outerRingMesh.rotation.z = -elapsedTime * 0.04;
      outerRingMesh.scale.setScalar(1 + Math.cos(elapsedTime * 1.2) * 0.04);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      geometry.dispose();
      pMaterial.dispose();
      lineGeo.dispose();
      lineMaterial.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      outerRingGeo.dispose();
      outerRingMat.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-full min-h-[460px] pointer-events-none">
      <div ref={containerRef} className="absolute inset-0 w-full h-full pointer-events-auto" />
      {/* Decorative Radial Grid Vignette */}
      <div className="absolute inset-0 bg-radial-vignette pointer-events-none" />
    </div>
  );
};
