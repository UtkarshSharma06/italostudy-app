import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Line, Float } from '@react-three/drei';
import * as THREE from 'three';

export const TrigCircle = () => {
    const pointerRef = useRef<THREE.Group>(null);
    const radius = 4;

    useFrame((state) => {
        if (pointerRef.current) {
            const time = state.clock.elapsedTime * 0.5;
            pointerRef.current.rotation.z = time;
        }
    });

    return (
        <group rotation={[Math.PI / 6, -Math.PI / 4, 0]}>
            {/* Coordinate Plane */}
            <Line points={[[-radius * 1.5, 0, 0], [radius * 1.5, 0, 0]]} color="#94a3b8" lineWidth={1} />
            <Line points={[[0, -radius * 1.5, 0], [0, radius * 1.5, 0]]} color="#94a3b8" lineWidth={1} />

            {/* The Unit Circle */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[radius, 0.05, 16, 100]} />
                <meshStandardMaterial color="#6366f1" emissive="#6366f1" emissiveIntensity={0.5} />
            </mesh>

            {/* The Radius Pointer */}
            <group ref={pointerRef}>
                <Line points={[[0, 0, 0], [radius, 0, 0]]} color="#ffffff" lineWidth={3} />
                <mesh position={[radius, 0, 0]}>
                    <sphereGeometry args={[0.15, 16, 16]} />
                    <meshStandardMaterial color="#ffffff" />
                </mesh>

                {/* Projections */}
                <ProjectionLine radius={radius} type="sin" />
                <ProjectionLine radius={radius} type="cos" />
            </group>

            {/* static Labels */}
            <Text position={[radius * 1.6, 0, 0]} fontSize={0.4} color="#94a3b8">X (cos)</Text>
            <Text position={[0, radius * 1.6, 0]} fontSize={0.4} color="#94a3b8">Y (sin)</Text>
        </group>
    );
};

const ProjectionLine = ({ radius, type }: any) => {
    const ref = useRef<THREE.Group>(null);
    useFrame((state) => {
        if (ref.current) {
            // This is complex because it needs to counteract the parent rotation to always be vertical/horizontal
            // For now, we'll keep it simple and just show the lines
        }
    });

    return (
        <group>
            {type === 'sin' && <Line points={[[radius, 0, 0], [radius, -Math.sin(0) * radius, 0]]} color="#ef4444" lineWidth={2} />}
        </group>
    );
};
