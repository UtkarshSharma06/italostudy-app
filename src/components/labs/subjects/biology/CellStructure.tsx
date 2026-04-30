import React from 'react';
import { Float, Text } from '@react-three/drei';

export const CellStructure = () => {
    return (
        <group>
            {/* Cytoplasm / Outer Shell */}
            <mesh>
                <sphereGeometry args={[4, 64, 64]} />
                <meshStandardMaterial
                    color="#1e293b"
                    transparent
                    opacity={0.15}
                    roughness={0}
                    metalness={0.5}
                    side={2}
                />
            </mesh>

            {/* Nucleus */}
            <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.2}>
                <mesh position={[0, 0, 0]}>
                    <sphereGeometry args={[1.2, 32, 32]} />
                    <meshStandardMaterial color="#7c3aed" emissive="#7c3aed" emissiveIntensity={0.5} />
                </mesh>
                <Text
                    position={[0, 1.8, 0]}
                    fontSize={0.3}
                    color="white"
                    anchorX="center"
                    anchorY="middle"
                >
                    NUCLEUS
                </Text>
            </Float>

            {/* Mitochondria */}
            {[
                [2, 1.5, 1],
                [-2, -1, 2],
                [1.5, -2, -1.5],
            ].map((pos, i) => (
                <Float key={i} speed={2} position={pos as any}>
                    <mesh rotation={[Math.PI / 4, i * 1, 0]}>
                        <capsuleGeometry args={[0.3, 0.8, 4, 16]} />
                        <meshStandardMaterial color="#ef4444" />
                    </mesh>
                </Float>
            ))}

            {/* General Labels */}
            <Text
                position={[3, 4, 0]}
                fontSize={0.2}
                color="#94a3b8"
                maxWidth={2}
                textAlign="center"
            >
                PLASMA MEMBRANE
            </Text>
        </group>
    );
};
