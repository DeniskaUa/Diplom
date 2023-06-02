'use client';

import { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, Float } from '@react-three/drei';
import { gsap } from 'gsap';
import * as THREE from 'three';
import { GLTF } from 'three-stdlib';

type GLTFResult = GLTF & {
  nodes: {
    Cube009: THREE.Mesh;
    Cube009_1: THREE.Mesh;
  };
  materials: {
    m_Mac128k: THREE.MeshStandardMaterial;
    m_Outline: THREE.MeshStandardMaterial;
  };
};

useGLTF.preload('/Mac128k-light.glb');

const HappyMacModel = () => {
  const innerRef = useRef<THREE.Group>(null);
  const { nodes, materials } = useGLTF('/Mac128k-light.glb') as GLTFResult;

  return (
    <Float>
      <group dispose={null} scale={3.5} ref={innerRef}>
        <group position={[0, 0, 0]} rotation={[0.45, -0.51, -0.03]}>
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.Cube009.geometry}
            material={materials.m_Mac128k}
          />

          <mesh
            castShadow
            receiveShadow
            geometry={nodes.Cube009_1.geometry}
            material={materials.m_Outline}
          />
        </group>
      </group>
    </Float>
  );
};

export const HappyMacMachine = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  return (
    <Canvas
      camera={{ position: [0, 0, 10], fov: 35 }}
      onCreated={() => {
        gsap.set(canvasRef.current, {
          width: '100%',
          height: '100%'
        });

        gsap.to(canvasRef.current?.closest('[data-mac-canvas-container="true"]') || null, {
          opacity: 1,
          scale: 1,
          duration: 0.15
        });
      }}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      style={{ opacity: 0, scale: 0.9 }}
      ref={canvasRef}
      data-mac-canvas-container
    >
      <HappyMacModel />
    </Canvas>
  );
};
